import { createHash } from "node:crypto";

import {
  LifecycleAction,
  assertIssuedLifecycleCommand,
  lifecycleCommandFingerprint,
  reduceLifecycle,
} from "../lifecycle.js";
import { getDb } from "../state.js";
import { createRequestContextRepository } from "./request_context_repo.js";

const terminalObservers = new WeakMap();
const pendingTerminals = new WeakMap();

// Nested savepoints cannot publish memory invalidation. Before the next
// protected call, check the committed business row; outer rollbacks vanish.
export function flushLifecycleTerminals(database) {
  if (database.inTransaction) return;
  const pending = pendingTerminals.get(database);
  pendingTerminals.delete(database);
  for (const state of pending?.values() ?? []) {
    const config = entityConfig[state.entityType];
    const row = database.prepare(`SELECT * FROM ${config.table} WHERE ${config.idColumn} = ?`).get(state.entityId);
    const committed = stateFromRow(state.entityType, row);
    if (committed && isRecoveryTerminal(committed)) {
      for (const observer of terminalObservers.get(database) ?? []) observer(committed);
    }
  }
}

export function subscribeLifecycleTerminal(database, observer) {
  let observers = terminalObservers.get(database);
  if (!observers) terminalObservers.set(database, observers = new Set());
  observers.add(observer);
  return () => observers.delete(observer);
}

function isRecoveryTerminal(state) {
  return (state.entityType === "orchestration" && ["completed", "cancelled"].includes(state.status))
    || (state.entityType === "session" && ["closed", "error"].includes(state.status));
}

const entityConfig = Object.freeze({
  orchestration: Object.freeze({
    table: "orchestration_sessions",
    idColumn: "session_id",
  }),
  task: Object.freeze({
    table: "tasks",
    idColumn: "task_id",
  }),
  session: Object.freeze({
    table: "sessions",
    idColumn: "session_id",
  }),
});

const reservationFields = new Set(["agent", "role", "startedAt"]);

function codedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])]),
  );
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function normalizeReservation(command, options) {
  const reservation = options?.reservation;
  if (command.action !== LifecycleAction.SESSION_RESERVE) {
    if (reservation !== undefined) {
      throw codedError(
        "LIFECYCLE_RESERVATION_INVALID",
        "invalid lifecycle reservation",
      );
    }
    return null;
  }
  if (
    !reservation ||
    typeof reservation !== "object" ||
    Array.isArray(reservation) ||
    Object.keys(reservation).some((field) => !reservationFields.has(field)) ||
    typeof reservation.agent !== "string" ||
    reservation.agent.length === 0 ||
    typeof reservation.role !== "string" ||
    reservation.role.length === 0 ||
    typeof reservation.startedAt !== "string" ||
    reservation.startedAt.length === 0
  ) {
    throw codedError(
      "LIFECYCLE_RESERVATION_INVALID",
      "invalid lifecycle reservation",
    );
  }
  return Object.freeze({
    agent: reservation.agent,
    role: reservation.role,
    startedAt: reservation.startedAt,
  });
}

function commandDigest(command, reservation) {
  const reservationIdentity = reservation
    ? { agent: reservation.agent, role: reservation.role }
    : null;
  return createHash("sha256")
    .update(
      stableStringify({
        command: lifecycleCommandFingerprint(command),
        reservation: reservationIdentity,
      }),
    )
    .digest("hex");
}

function stateFromRow(entityType, row) {
  if (!row) return null;
  if (
    entityType === "session" &&
    (row.lifecycle_state === null ||
      row.lifecycle_state === undefined ||
      row.lifecycle_version === null ||
      row.lifecycle_version === undefined)
  ) {
    return null;
  }
  const entityId =
    entityType === "task" ? row.task_id : row.session_id;
  return Object.freeze({
    entityType,
    entityId,
    traceId: row.trace_id,
    taskId: entityType === "orchestration" ? null : row.task_id,
    status: row.lifecycle_state,
    version: Number(row.lifecycle_version),
    closedAt: row.closed_at ?? null,
  });
}

function stateFromTransition(row) {
  return Object.freeze({
    entityType: row.entity_type,
    entityId: row.entity_id,
    traceId: row.trace_id,
    taskId: row.task_id ?? null,
    status: row.to_status,
    version: Number(row.to_version),
    closedAt: isTerminalStatus(row.entity_type, row.to_status)
      ? row.occurred_at
      : null,
  });
}

function isTerminalStatus(entityType, status) {
  if (entityType === "orchestration") {
    return status === "completed" || status === "cancelled";
  }
  if (entityType === "task") {
    return ["completed", "failed", "cancelled"].includes(status);
  }
  return status === "closed" || status === "error";
}

function loadState(db, command) {
  const config = entityConfig[command.entityType];
  const row = db
    .prepare(
      `SELECT * FROM ${config.table} WHERE ${config.idColumn} = ?`,
    )
    .get(command.entityId);
  return {
    row,
    state: stateFromRow(command.entityType, row),
  };
}

function assertSessionParent(db, command) {
  const task = db
    .prepare("SELECT * FROM tasks WHERE task_id = ?")
    .get(command.taskId);
  if (!task) {
    throw codedError("LIFECYCLE_NOT_FOUND", "lifecycle entity not found");
  }
  if (task.trace_id !== command.traceId) {
    throw codedError(
      "LIFECYCLE_TARGET_MISMATCH",
      "lifecycle target mismatch",
    );
  }
}

function legacyStatus(entityType, currentRow, nextState) {
  if (entityType === "task" && nextState.status === "starting") {
    return currentRow.status;
  }
  return nextState.status;
}

function transitionValues({
  command,
  currentState,
  nextState,
  digest,
}) {
  return [
    command.idempotencyKey,
    digest,
    command.commandVersion,
    command.action,
    command.entityType,
    command.entityId,
    command.traceId,
    command.taskId,
    currentState?.status ?? null,
    nextState.status,
    currentState?.version ?? null,
    nextState.version,
    stableStringify(command.evidence),
    command.occurredAt,
    command.occurredAt,
  ];
}

const transitionColumns = `
  (idempotency_key, command_digest, command_version, action, entity_type,
   entity_id, trace_id, task_id, from_status, to_status, from_version,
   to_version, evidence, occurred_at, created_at)`;

function insertTransitionSqlite(db, values) {
  db.prepare(
    `INSERT INTO lifecycle_transitions ${transitionColumns}
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(...values);
}

function updateExistingSqlite(db, currentRow, currentState, nextState) {
  const config = entityConfig[nextState.entityType];
  const result = db
    .prepare(
      `UPDATE ${config.table}
       SET lifecycle_state = ?, lifecycle_version = ?, closed_at = ?, status = ?
       WHERE ${config.idColumn} = ? AND lifecycle_version = ?`,
    )
    .run(
      nextState.status,
      nextState.version,
      nextState.closedAt,
      legacyStatus(nextState.entityType, currentRow, nextState),
      nextState.entityId,
      currentState.version,
    );
  if (result.changes !== 1) {
    throw codedError(
      "LIFECYCLE_VERSION_CONFLICT",
      "lifecycle version conflict",
    );
  }
}

function createSessionSqlite(db, command, nextState, reservation) {
  db.prepare(
    `INSERT INTO sessions
      (session_id, task_id, trace_id, agent, role, status, started_at,
       closed_at, lifecycle_state, lifecycle_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    command.entityId,
    command.taskId,
    command.traceId,
    reservation.agent,
    reservation.role,
    nextState.status,
    reservation.startedAt,
    null,
    nextState.status,
    nextState.version,
  );
}

function persistSqlite({
  db,
  command,
  currentRow,
  currentState,
  nextState,
  reservation,
  digest,
}) {
  const persist = db.transaction(() => {
    if (command.action === LifecycleAction.SESSION_RESERVE) {
      createSessionSqlite(db, command, nextState, reservation);
    } else {
      updateExistingSqlite(db, currentRow, currentState, nextState);
    }
    insertTransitionSqlite(
      db,
      transitionValues({ command, currentState, nextState, digest }),
    );
    if (isRecoveryTerminal(nextState)
      && db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'request_context_lineage'").get()) {
      const recovery = createRequestContextRepository({ database: db });
      if (nextState.entityType === "orchestration") recovery.removeTerminalTrace(command.traceId);
      else recovery.removeTerminalSession({ traceId: command.traceId, sessionId: command.entityId });
    }
  });
  persist.immediate();
}

function postgresUpdateSql(command) {
  const config = entityConfig[command.entityType];
  return `
    WITH lifecycle_changed AS (
      UPDATE ${config.table}
      SET lifecycle_state = ?, lifecycle_version = ?, closed_at = ?, status = ?
      WHERE ${config.idColumn} = ? AND lifecycle_version = ?
      RETURNING 1
    ),
    lifecycle_recorded AS (
      INSERT INTO lifecycle_transitions ${transitionColumns}
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      FROM lifecycle_changed
      RETURNING 1
    )
    SELECT
      (SELECT COUNT(*) FROM lifecycle_changed)::int AS state_changes,
      (SELECT COUNT(*) FROM lifecycle_recorded)::int AS transition_changes
  `;
}

function postgresSessionCreateSql() {
  return `
    WITH lifecycle_created AS (
      INSERT INTO sessions
        (session_id, task_id, trace_id, agent, role, status, started_at,
         closed_at, lifecycle_state, lifecycle_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING 1
    ),
    lifecycle_recorded AS (
      INSERT INTO lifecycle_transitions ${transitionColumns}
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      FROM lifecycle_created
      RETURNING 1
    )
    SELECT
      (SELECT COUNT(*) FROM lifecycle_created)::int AS state_changes,
      (SELECT COUNT(*) FROM lifecycle_recorded)::int AS transition_changes
  `;
}

function persistPostgres({
  db,
  command,
  currentRow,
  currentState,
  nextState,
  reservation,
  digest,
}) {
  const values = transitionValues({
    command,
    currentState,
    nextState,
    digest,
  });
  if (command.action === LifecycleAction.SESSION_RESERVE) {
    db.prepare(postgresSessionCreateSql()).run(
      command.entityId,
      command.taskId,
      command.traceId,
      reservation.agent,
      reservation.role,
      nextState.status,
      reservation.startedAt,
      null,
      nextState.status,
      nextState.version,
      ...values,
    );
  } else {
    db.prepare(postgresUpdateSql(command)).run(
      nextState.status,
      nextState.version,
      nextState.closedAt,
      legacyStatus(command.entityType, currentRow, nextState),
      command.entityId,
      currentState.version,
      ...values,
    );
  }

  const durable = getTransitionByIdempotencyKey(command.idempotencyKey);
  if (!durable) {
    throw codedError(
      "LIFECYCLE_VERSION_CONFLICT",
      "lifecycle version conflict",
    );
  }
  if (durable.command_digest !== digest) {
    throw codedError(
      "LIFECYCLE_IDEMPOTENCY_CONFLICT",
      "lifecycle idempotency conflict",
    );
  }
}

function isLifecycleError(error) {
  return (
    error &&
    typeof error.code === "string" &&
    error.code.startsWith("LIFECYCLE_")
  );
}

function existingRetry(idempotencyKey, digest) {
  const existing = getTransitionByIdempotencyKey(idempotencyKey);
  if (!existing) return null;
  if (existing.command_digest !== digest) {
    throw codedError(
      "LIFECYCLE_IDEMPOTENCY_CONFLICT",
      "lifecycle idempotency conflict",
    );
  }
  return {
    state: stateFromTransition(existing),
    transition: existing,
    idempotent: true,
  };
}

export function getTransitionByIdempotencyKey(idempotencyKey) {
  return (
    getDb()
      .prepare(
        "SELECT * FROM lifecycle_transitions WHERE idempotency_key = ?",
      )
      .get(idempotencyKey) || null
  );
}

export function listLifecycleTransitions({ entityType, entityId }) {
  return getDb()
    .prepare(
      `SELECT * FROM lifecycle_transitions
       WHERE entity_type = ? AND entity_id = ?
       ORDER BY to_version, idempotency_key`,
    )
    .all(entityType, entityId);
}

export function applyLifecycleCommand(command, options = {}) {
  assertIssuedLifecycleCommand(command);
  const reservation = normalizeReservation(command, options);
  const digest = commandDigest(command, reservation);
  const retry = existingRetry(command.idempotencyKey, digest);
  if (retry) return retry;

  const db = getDb();
  if (command.entityType === "session") {
    assertSessionParent(db, command);
  }
  const { row: currentRow, state: currentState } = loadState(db, command);
  if (
    command.entityType === "session" &&
    command.action !== LifecycleAction.SESSION_RESERVE &&
    currentRow &&
    currentState === null
  ) {
    throw codedError(
      "LIFECYCLE_LEGACY_SESSION",
      "legacy session is outside canonical lifecycle",
    );
  }
  if (command.action !== LifecycleAction.SESSION_RESERVE && !currentState) {
    throw codedError("LIFECYCLE_NOT_FOUND", "lifecycle entity not found");
  }
  if (command.action === LifecycleAction.SESSION_RESERVE && currentRow) {
    throw codedError(
      "LIFECYCLE_INVALID_TRANSITION",
      "invalid lifecycle transition",
    );
  }
  const nextState = reduceLifecycle(currentState, command);

  try {
    const persist = db.backend === "postgres" ? persistPostgres : persistSqlite;
    persist({
      db,
      command,
      currentRow,
      currentState,
      nextState,
      reservation,
      digest,
    });
  } catch (error) {
    const racedRetry = existingRetry(command.idempotencyKey, digest);
    if (racedRetry) return racedRetry;
    if (isLifecycleError(error)) throw error;
    throw codedError(
      "LIFECYCLE_REPOSITORY_CONFLICT",
      "lifecycle transition could not be persisted",
    );
  }

  if (isRecoveryTerminal(nextState)) {
    if (db.inTransaction) {
      let pending = pendingTerminals.get(db);
      if (!pending) pendingTerminals.set(db, pending = new Map());
      pending.set(`${nextState.entityType}:${nextState.entityId}`, nextState);
    } else {
      flushLifecycleTerminals(db);
      for (const observer of terminalObservers.get(db) ?? []) observer(nextState);
    }
  }
  return {
    state: nextState,
    transition: getTransitionByIdempotencyKey(command.idempotencyKey),
    idempotent: false,
  };
}
