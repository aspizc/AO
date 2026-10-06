import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import * as orchestrationRepo from "../../gateway/src/core/repositories/orchestration_repo.js";
import * as sessionRepo from "../../gateway/src/core/repositories/session_repo.js";
import * as taskRepo from "../../gateway/src/core/repositories/task_repo.js";
import {
  _resetForTests,
  getDb,
  initState,
} from "../../gateway/src/core/state.js";
import { createLifecycleRebaselinePostgresFake } from "./lifecycle_rebaseline_postgres_fake.js";

const NOW = "2026-07-27T09:00:00.000Z";
const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const SQLITE_MIGRATION = path.join(
  REPO_ROOT,
  "gateway",
  "migrations",
  "002_lifecycle.sql",
);
const POSTGRES_MIGRATION = path.join(
  REPO_ROOT,
  "gateway",
  "migrations",
  "postgres",
  "002_lifecycle.sql",
);

async function lifecycleModules() {
  const [lifecycle, lifecycleRepo] = await Promise.all([
    import("../../gateway/src/core/lifecycle.js"),
    import("../../gateway/src/core/repositories/lifecycle_repo.js"),
  ]);
  return { lifecycle, lifecycleRepo };
}

function freshSqlite(t) {
  _resetForTests();
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "lifecycle-core2-sqlite-"),
  );
  initState({ stateDb: path.join(directory, "state.db"), env: {} });
  t.after(() => {
    _resetForTests();
    fs.rmSync(directory, { recursive: true, force: true });
  });
}

function freshFakePostgres(t) {
  _resetForTests();
  const executor = createLifecycleRebaselinePostgresFake();
  initState({
    stateDb: "/unused/state.db",
    env: { AGENTS_DB_URL: "postgres://offline/lifecycle" },
    postgresExecutor: executor,
  });
  t.after(() => _resetForTests());
  return executor;
}

function seedParent() {
  orchestrationRepo.createOrchestration({
    sessionId: "orchestration-1",
    traceId: "trace-1",
    callerAgent: "codex",
    callerRole: "orchestrator",
    status: "active",
    goal: "lifecycle trial 2",
    createdAt: NOW,
  });
  taskRepo.createTask({
    taskId: "task-1",
    traceId: "trace-1",
    assignedAgent: "codex",
    assignedRole: "coder",
    repo: "agents-orchestrator",
    status: "pending",
    createdAt: NOW,
    closedAt: null,
  });
}

function command(lifecycle, action, overrides = {}) {
  const entityType = action.split(".")[0];
  return lifecycle.issueLifecycleCommand(action, {
    entityType,
    entityId:
      entityType === "orchestration"
        ? "orchestration-1"
        : entityType === "session"
          ? "session-1"
          : "task-1",
    traceId: "trace-1",
    taskId: entityType === "orchestration" ? null : "task-1",
    expectedVersion:
      action === lifecycle.LifecycleAction.SESSION_RESERVE ? null : 0,
    idempotencyKey: `idem-${action}`,
    occurredAt: NOW,
    evidence: { source: "rebaseline-core2" },
    ...overrides,
  });
}

function reservation() {
  return {
    reservation: {
      agent: "codex",
      role: "coder",
      startedAt: NOW,
    },
  };
}

test("the SQLite migration leaves legacy sessions nullable and bounds lifecycle versions", (t) => {
  freshSqlite(t);
  const sqliteSql = fs.readFileSync(SQLITE_MIGRATION, "utf8");
  const sessionColumns = Object.fromEntries(
    getDb()
      .prepare("PRAGMA table_info(sessions)")
      .all()
      .map((column) => [column.name, column]),
  );

  assert.equal(sessionColumns.lifecycle_state.notnull, 0);
  assert.equal(sessionColumns.lifecycle_state.dflt_value, null);
  assert.equal(sessionColumns.lifecycle_version.notnull, 0);
  assert.equal(sessionColumns.lifecycle_version.dflt_value, null);
  assert.match(sqliteSql, /lifecycle_version\s+INTEGER[\s\S]+9007199254740991/i);
  assert.match(sqliteSql, /lifecycle_state[\s\S]+starting[\s\S]+running[\s\S]+closed[\s\S]+error/i);
});

test("the PostgreSQL migration uses BIGINT plus the same bounded states and versions", () => {
  const postgresSql = fs.readFileSync(POSTGRES_MIGRATION, "utf8");
  assert.match(postgresSql, /lifecycle_version\s+BIGINT/gi);
  assert.match(postgresSql, /lifecycle_version[\s\S]+9007199254740991/i);
  for (const status of [
    "active",
    "paused",
    "completed",
    "cancelled",
    "pending",
    "starting",
    "running",
    "failed",
    "closed",
    "error",
  ]) {
    assert.match(postgresSql, new RegExp(`'${status}'`));
  }
  assert.doesNotMatch(postgresSql, /PRAGMA/i);
});

test("legacy direct sessions remain legacy-only and SESSION_RESERVE is the sole canonical creation", async (t) => {
  freshSqlite(t);
  seedParent();
  const { lifecycle, lifecycleRepo } = await lifecycleModules();

  sessionRepo.createSession({
    sessionId: "legacy-session",
    taskId: "task-1",
    traceId: "trace-1",
    agent: "codex",
    role: "coder",
    tmuxTarget: "legacy-only",
    status: "running",
    startedAt: NOW,
    closedAt: null,
  });
  let legacy = getDb()
    .prepare("SELECT * FROM sessions WHERE session_id = ?")
    .get("legacy-session");
  assert.equal(legacy.status, "running");
  assert.equal(legacy.lifecycle_state, null);
  assert.equal(legacy.lifecycle_version, null);
  assert.equal(
    getDb()
      .prepare(
        "SELECT * FROM lifecycle_transitions WHERE entity_id = ?",
      )
      .all("legacy-session").length,
    0,
  );

  assert.throws(
    () =>
      lifecycleRepo.applyLifecycleCommand(
        command(lifecycle, lifecycle.LifecycleAction.SESSION_MARK_RUNNING, {
          entityId: "legacy-session",
          idempotencyKey: "idem-legacy-cannot-promote",
        }),
      ),
    {
      code: "LIFECYCLE_LEGACY_SESSION",
      message: "legacy session is outside canonical lifecycle",
    },
  );

  sessionRepo.setSessionStatus("legacy-session", "closed", NOW);
  legacy = getDb()
    .prepare("SELECT * FROM sessions WHERE session_id = ?")
    .get("legacy-session");
  assert.equal(legacy.status, "closed");
  assert.equal(legacy.lifecycle_state, null);
  assert.equal(legacy.lifecycle_version, null);

  const canonical = lifecycleRepo.applyLifecycleCommand(
    command(lifecycle, lifecycle.LifecycleAction.SESSION_RESERVE, {
      entityId: "session-1",
      idempotencyKey: "idem-canonical-reserve",
    }),
    reservation(),
  );
  const stored = getDb()
    .prepare("SELECT * FROM sessions WHERE session_id = ?")
    .get("session-1");
  assert.equal(canonical.state.status, "starting");
  assert.equal(stored.lifecycle_state, "starting");
  assert.equal(stored.lifecycle_version, 0);
  assert.equal(
    lifecycleRepo.listLifecycleTransitions({
      entityType: "session",
      entityId: "session-1",
    }).length,
    1,
  );
});

test("every canonical session command rechecks its durable task and trace parent", async (t) => {
  freshSqlite(t);
  seedParent();
  const { lifecycle, lifecycleRepo } = await lifecycleModules();
  getDb()
    .prepare(
      `INSERT INTO sessions
       (session_id, task_id, trace_id, agent, role, status, started_at,
        closed_at, lifecycle_state, lifecycle_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "session-cross-trace",
      "task-1",
      "trace-other",
      "codex",
      "coder",
      "starting",
      NOW,
      null,
      "starting",
      0,
    );

  assert.throws(
    () =>
      lifecycleRepo.applyLifecycleCommand(
        command(lifecycle, lifecycle.LifecycleAction.SESSION_MARK_RUNNING, {
          entityId: "session-cross-trace",
          traceId: "trace-other",
          idempotencyKey: "idem-cross-trace-row",
        }),
      ),
    {
      code: "LIFECYCLE_TARGET_MISMATCH",
      message: "lifecycle target mismatch",
    },
  );
  assert.equal(
    lifecycleRepo.getTransitionByIdempotencyKey("idem-cross-trace-row"),
    null,
  );
});

test("SQLite persists state and evidence atomically and exact retries return the original", async (t) => {
  freshSqlite(t);
  seedParent();
  const { lifecycle, lifecycleRepo } = await lifecycleModules();
  const firstCommand = command(
    lifecycle,
    lifecycle.LifecycleAction.TASK_RESERVE_START,
    { idempotencyKey: "idem-sqlite-exact" },
  );
  const first = lifecycleRepo.applyLifecycleCommand(firstCommand);
  const retry = lifecycleRepo.applyLifecycleCommand(
    command(lifecycle, lifecycle.LifecycleAction.TASK_RESERVE_START, {
      idempotencyKey: "idem-sqlite-exact",
      occurredAt: "2026-07-27T09:00:01.000Z",
    }),
  );

  assert.equal(first.idempotent, false);
  assert.equal(retry.idempotent, true);
  assert.deepEqual(retry.state, first.state);
  assert.equal(retry.transition.occurred_at, first.transition.occurred_at);
  assert.throws(
    () =>
      lifecycleRepo.applyLifecycleCommand(
        command(lifecycle, lifecycle.LifecycleAction.TASK_RESERVE_START, {
          idempotencyKey: "idem-sqlite-exact",
          evidence: { source: "different-request" },
        }),
      ),
    { code: "LIFECYCLE_IDEMPOTENCY_CONFLICT" },
  );

  getDb()
    .prepare(
      `INSERT INTO lifecycle_transitions
       (idempotency_key, command_digest, command_version, action, entity_type,
        entity_id, trace_id, task_id, from_status, to_status, from_version,
        to_version, evidence, occurred_at, created_at)
       VALUES (?, ?, 1, ?, 'task', 'task-rollback', 'trace-1',
               'task-rollback', 'pending', 'starting', 0, 1, '{}', ?, ?)`,
    )
    .run(
      "idem-existing-version",
      "different-digest",
      lifecycle.LifecycleAction.TASK_RESERVE_START,
      NOW,
      NOW,
    );
  taskRepo.createTask({
    taskId: "task-rollback",
    traceId: "trace-1",
    assignedAgent: "codex",
    assignedRole: "coder",
    repo: null,
    status: "pending",
    createdAt: NOW,
    closedAt: null,
  });
  assert.throws(
    () =>
      lifecycleRepo.applyLifecycleCommand(
        command(lifecycle, lifecycle.LifecycleAction.TASK_RESERVE_START, {
          entityId: "task-rollback",
          taskId: "task-rollback",
          idempotencyKey: "idem-rollback",
        }),
      ),
    {
      code: "LIFECYCLE_REPOSITORY_CONFLICT",
      message: "lifecycle transition could not be persisted",
    },
  );
  const rolledBack = getDb()
    .prepare("SELECT * FROM tasks WHERE task_id = ?")
    .get("task-rollback");
  assert.equal(rolledBack.lifecycle_state, "pending");
  assert.equal(rolledBack.lifecycle_version, 0);
});

test("PostgreSQL lifecycle DML stays top-level and ignores invented adapter row counts", async (t) => {
  const executor = freshFakePostgres(t);
  seedParent();
  const { lifecycle, lifecycleRepo } = await lifecycleModules();
  const result = lifecycleRepo.applyLifecycleCommand(
    command(lifecycle, lifecycle.LifecycleAction.TASK_RESERVE_START, {
      idempotencyKey: "idem-pg-top-level",
    }),
  );
  const lifecycleCalls = executor.calls.filter((sql) =>
    /lifecycle_(?:changed|created)/i.test(sql),
  );

  assert.equal(result.state.status, "starting");
  assert.equal(result.idempotent, false);
  assert.equal(result.transition.idempotency_key, "idem-pg-top-level");
  assert.ok(lifecycleCalls.length >= 1);
  assert.equal(
    lifecycleCalls.every((sql) => /^WITH lifecycle_(?:changed|created)/i.test(sql)),
    true,
  );
  assert.equal(
    lifecycleCalls.some((sql) => /^SELECT COALESCE[\s\S]+WITH lifecycle_/i.test(sql)),
    false,
  );

  executor.armLifecycleVersionRace();
  assert.throws(
    () =>
      lifecycleRepo.applyLifecycleCommand(
        command(lifecycle, lifecycle.LifecycleAction.TASK_COMPLETE, {
          expectedVersion: 1,
          idempotencyKey: "idem-pg-zero-cas",
        }),
      ),
    {
      code: "LIFECYCLE_VERSION_CONFLICT",
      message: "lifecycle version conflict",
    },
  );
  assert.equal(
    lifecycleRepo.getTransitionByIdempotencyKey("idem-pg-zero-cas"),
    null,
  );
});

test("SQLite accepts the exact maximum lifecycle version and rejects overflow", (t) => {
  freshSqlite(t);
  seedParent();
  const maximum = Number.MAX_SAFE_INTEGER;
  getDb()
    .prepare("UPDATE tasks SET lifecycle_version = ? WHERE task_id = ?")
    .run(maximum, "task-1");
  assert.equal(
    getDb()
      .prepare("SELECT * FROM tasks WHERE task_id = ?")
      .get("task-1").lifecycle_version,
    maximum,
  );
  assert.throws(() =>
    getDb()
      .prepare("UPDATE tasks SET lifecycle_version = ? WHERE task_id = ?")
      .run(maximum + 1, "task-1"),
  );
});

test("the PostgreSQL fake accepts the exact maximum lifecycle version and rejects overflow", (t) => {
  const executor = freshFakePostgres(t);
  seedParent();
  const maximum = Number.MAX_SAFE_INTEGER;
  executor(
    `UPDATE tasks SET lifecycle_version = ${maximum} ` +
      "WHERE task_id = 'task-1'",
  );
  assert.equal(executor.rows("tasks")[0].lifecycle_version, maximum);
  assert.throws(
    () =>
      executor(
        `UPDATE tasks SET lifecycle_version = ${maximum + 1} ` +
          "WHERE task_id = 'task-1'",
      ),
    { code: "FAKE_POSTGRES_CHECK_VIOLATION" },
  );
});

test("concurrent exact SESSION_RESERVE converges while a different conflict stays closed", async (t) => {
  const executor = freshFakePostgres(t);
  seedParent();
  const { lifecycle, lifecycleRepo } = await lifecycleModules();
  executor.armSessionReservationRace("exact");
  const exact = lifecycleRepo.applyLifecycleCommand(
    command(lifecycle, lifecycle.LifecycleAction.SESSION_RESERVE, {
      idempotencyKey: "idem-concurrent-exact",
    }),
    reservation(),
  );

  assert.equal(exact.idempotent, true);
  assert.equal(exact.state.status, "starting");
  assert.equal(
    executor
      .rows("lifecycle_transitions")
      .filter((row) => row.idempotency_key === "idem-concurrent-exact").length,
    1,
  );

  _resetForTests();
  const conflictingExecutor = freshFakePostgres(t);
  seedParent();
  conflictingExecutor.armSessionReservationRace("different");
  assert.throws(
    () =>
      lifecycleRepo.applyLifecycleCommand(
        command(lifecycle, lifecycle.LifecycleAction.SESSION_RESERVE, {
          idempotencyKey: "idem-concurrent-different",
        }),
        reservation(),
      ),
    {
      code: "LIFECYCLE_REPOSITORY_CONFLICT",
      message: "lifecycle transition could not be persisted",
    },
  );
  assert.equal(
    lifecycleRepo.getTransitionByIdempotencyKey(
      "idem-concurrent-different",
    ),
    null,
  );
});

test("the three legacy status writers retain their bounded compatibility behavior", async (t) => {
  freshSqlite(t);
  seedParent();
  const { lifecycleRepo } = await lifecycleModules();
  sessionRepo.createSession({
    sessionId: "legacy-session",
    taskId: "task-1",
    traceId: "trace-1",
    agent: "codex",
    role: "coder",
    tmuxTarget: "legacy-only",
    status: "running",
    startedAt: NOW,
    closedAt: null,
  });

  orchestrationRepo.setOrchestrationStatus(
    "orchestration-1",
    "paused",
    NOW,
  );
  taskRepo.setTaskStatus("task-1", "completed", NOW);
  sessionRepo.setSessionStatus("legacy-session", "closed", NOW);

  assert.equal(
    orchestrationRepo.getOrchestrationById("orchestration-1").status,
    "paused",
  );
  assert.equal(taskRepo.getTaskById("task-1").status, "completed");
  assert.equal(sessionRepo.getSessionById("legacy-session").status, "closed");
  assert.equal(
    lifecycleRepo.listLifecycleTransitions({
      entityType: "orchestration",
      entityId: "orchestration-1",
    }).length,
    1,
  );
  assert.equal(
    lifecycleRepo.listLifecycleTransitions({
      entityType: "task",
      entityId: "task-1",
    }).length,
    1,
  );
  assert.equal(
    lifecycleRepo.listLifecycleTransitions({
      entityType: "session",
      entityId: "legacy-session",
    }).length,
    0,
  );
});
