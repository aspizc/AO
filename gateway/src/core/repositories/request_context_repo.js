import path from "node:path";
import { isCanonicalAction } from "../policy_types.js";
import { RequestContextError } from "../request_context.js";
import { getDb } from "../state.js";

const TASK_FIELDS = ["taskId", "repositoryId", "canonicalRoot", "targetAgent", "targetRole", "targetAction"];
const SESSION_FIELDS = ["sessionId", "taskId", "tmuxTarget", "targetAgent", "targetRole"];
const text = (value) => typeof value === "string" && value.length > 0;
const status = (row) => row?.lifecycle_state ?? row?.status;
const eligible = (row) => ["active", "paused"].includes(status(row));
function deny() { throw new RequestContextError("context.recovery_denied"); }

function validOwner(owner) {
  return owner && text(owner.connectionId) && Number.isSafeInteger(owner.pid) && owner.pid > 1
    && typeof owner.startToken === "string" && /^\d+$/.test(owner.startToken)
    && typeof owner.bootId === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(owner.bootId);
}

function sameOwner(left, right) {
  return validOwner(left) && validOwner(right) && left.connectionId === right.connectionId
    && left.pid === right.pid && left.startToken === right.startToken && left.bootId === right.bootId;
}

function validIdentity(value) {
  return value && typeof value.principalId === "string" && /^linux-uid:(0|[1-9]\d*)$/.test(value.principalId)
    && Number.isSafeInteger(Number(value.principalId.slice(10)))
    && typeof value.machineDigest === "string" && /^[0-9a-f]{64}$/.test(value.machineDigest)
    && typeof value.statePath === "string" && path.isAbsolute(value.statePath);
}

function validBinding(binding, fields) {
  return binding && typeof binding === "object" && !Array.isArray(binding)
    && Object.keys(binding).length === fields.length && fields.every((field) => text(binding[field]));
}

function payloadFrom(value) {
  let payload;
  try { payload = JSON.parse(value); } catch { deny(); }
  if (!payload || Object.keys(payload).length !== 2 || !Array.isArray(payload.tasks)
    || !Array.isArray(payload.sessions)) deny();
  const tasks = new Set();
  const sessions = new Set();
  for (const task of payload.tasks) {
    if (!validBinding(task, TASK_FIELDS) || !path.isAbsolute(task.canonicalRoot)
      || !isCanonicalAction(task.targetAction) || tasks.has(task.taskId)) deny();
    tasks.add(task.taskId);
  }
  for (const session of payload.sessions) {
    if (!validBinding(session, SESSION_FIELDS) || !tasks.has(session.taskId)
      || sessions.has(session.sessionId)) deny();
    sessions.add(session.sessionId);
  }
  return payload;
}

function decode(row) {
  if (!row) return null;
  const ownerFields = [row.owner_connection_id, row.owner_pid, row.owner_start_token, row.owner_boot_id];
  const owner = ownerFields.every((field) => field === null) ? null : {
    connectionId: row.owner_connection_id, pid: row.owner_pid,
    startToken: row.owner_start_token, bootId: row.owner_boot_id,
  };
  const record = {
    traceId: row.trace_id, schemaVersion: row.schema_version,
    principalId: row.principal_id, machineDigest: row.machine_digest,
    statePath: row.state_path, audience: row.audience, expiresAt: row.expires_at,
    owner, revision: row.revision, payload: payloadFrom(row.payload_json),
  };
  if (!text(record.traceId) || record.schemaVersion !== 1 || !validIdentity(record)
    || !text(record.audience) || !Number.isFinite(Date.parse(record.expiresAt))
    || !Number.isSafeInteger(record.revision) || record.revision < 0
    || (owner !== null && !validOwner(owner))) deny();
  return record;
}

function taskMatches(binding, row, traceId) {
  return row && row.trace_id === traceId && row.task_id === binding.taskId
    && row.repo === binding.repositoryId && row.assigned_agent === binding.targetAgent
    && row.assigned_role === binding.targetRole && row.target_action === binding.targetAction
    && isCanonicalAction(row.target_action);
}

function sessionMatches(binding, row, traceId) {
  return row && row.trace_id === traceId && row.task_id === binding.taskId
    && row.session_id === binding.sessionId && row.tmux_target === binding.tmuxTarget
    && row.agent === binding.targetAgent && row.role === binding.targetRole;
}

function sessionTaskMatches(binding, tasks) {
  const task = tasks.find((entry) => entry.taskId === binding.taskId);
  return task && task.targetAgent === binding.targetAgent && task.targetRole === binding.targetRole;
}

// Internal SQLite persistence only. The service supplies synchronous validation
// of fresh repository roots, prior-owner liveness and bounded target probes.
// Its staged memory bindings must be published only after claimTrace returns.
export function createRequestContextRepository({ database = getDb() } = {}) {
  if (database.backend !== "sqlite" || typeof database.transaction !== "function") return null;
  function immediate(operation) {
    try { return database.transaction(operation).immediate(); }
    catch (error) {
      if (["SQLITE_BUSY", "SQLITE_LOCKED"].includes(error?.code)) deny();
      throw error;
    }
  }
  function getTrace(traceId) {
    return decode(database.prepare("SELECT * FROM request_context_lineage WHERE trace_id = ?").get(traceId));
  }
  function authority(traceId) {
    return {
      orchestration: database.prepare("SELECT * FROM orchestration_sessions WHERE trace_id = ?").get(traceId),
      tasks: database.prepare("SELECT * FROM tasks WHERE trace_id = ? ORDER BY task_id").all(traceId),
      sessions: database.prepare("SELECT * FROM sessions WHERE trace_id = ? ORDER BY session_id").all(traceId),
    };
  }
  function owned(traceId, owner) {
    const record = getTrace(traceId);
    if (!record || !sameOwner(record.owner, owner) || !eligible(authority(traceId).orchestration)) deny();
    return record;
  }
  function write(record, previousRevision) {
    if (!Number.isSafeInteger(previousRevision + 1)) deny();
    record.revision = previousRevision + 1;
    const result = database.prepare(`UPDATE request_context_lineage SET
      owner_connection_id = @connectionId, owner_pid = @pid,
      owner_start_token = @startToken, owner_boot_id = @bootId,
      revision = @revision, payload_json = @payload
      WHERE trace_id = @traceId AND revision = @previousRevision`).run({
      traceId: record.traceId, previousRevision, revision: record.revision,
      connectionId: record.owner?.connectionId ?? null, pid: record.owner?.pid ?? null,
      startToken: record.owner?.startToken ?? null, bootId: record.owner?.bootId ?? null,
      payload: JSON.stringify(record.payload),
    });
    if (result.changes !== 1) deny();
  }
  function merge(traceId, owner, binding, kind) {
    return immediate(() => {
      const record = owned(traceId, owner);
      const rows = authority(traceId);
      const task = kind === "tasks";
      const id = task ? "taskId" : "sessionId";
      if (!validBinding(binding, task ? TASK_FIELDS : SESSION_FIELDS)) deny();
      if (task) {
        if (!path.isAbsolute(binding.canonicalRoot) || !taskMatches(binding,
          rows.tasks.find((row) => row.task_id === binding.taskId), traceId)) deny();
      } else if (!sessionTaskMatches(binding, record.payload.tasks)
        || !sessionMatches(binding, rows.sessions.find((row) => row.session_id === binding.sessionId), traceId)) deny();
      const previous = record.payload[kind].find((entry) => entry[id] === binding[id]);
      if (previous && (task ? TASK_FIELDS : SESSION_FIELDS).some((field) => previous[field] !== binding[field])) deny();
      if (!previous) {
        record.payload[kind].push({ ...binding });
        record.payload[kind].sort((left, right) => left[id].localeCompare(right[id]));
        write(record, record.revision);
      }
      return record;
    });
  }
  function validated({ traceId, identity, audience, now }) {
    const record = getTrace(traceId);
    const rows = authority(traceId);
    if (!record || !validIdentity(identity) || identity.verify?.() !== true
      || record.principalId !== identity.principalId || record.machineDigest !== identity.machineDigest
      || record.statePath !== identity.statePath || record.audience !== audience
      || !Number.isFinite(Date.parse(now)) || Date.parse(now) >= Date.parse(record.expiresAt)
      || !eligible(rows.orchestration) || record.payload.tasks.length === 0
      || record.payload.tasks.length !== rows.tasks.length
      || record.payload.tasks.some((task) => !taskMatches(task, rows.tasks.find((row) => row.task_id === task.taskId), traceId))
      || record.payload.sessions.some((session) => !sessionTaskMatches(session, record.payload.tasks)
        || !sessionMatches(session, rows.sessions.find((row) => row.session_id === session.sessionId), traceId))
      || rows.sessions.some((session) => text(session.tmux_target) && ["starting", "running"].includes(status(session))
        && !record.payload.sessions.some((entry) => entry.sessionId === session.session_id))) deny();
    return { ...record, ...rows };
  }
  function validateSync(record, validate) {
    if (typeof validate !== "function" || validate.constructor?.name === "AsyncFunction") deny();
    const result = validate(record);
    if (!result || typeof result !== "object" || typeof result.then === "function") deny();
    return result;
  }
  return {
    getTrace,
    listTraceIds() {
      return database.prepare("SELECT trace_id FROM request_context_lineage ORDER BY trace_id").all().map((row) => row.trace_id);
    },
    createTrace({ traceId, identity, audience, expiresAt, owner }) {
      return immediate(() => {
        if (!text(traceId) || !validIdentity(identity) || identity.verify?.() !== true
          || !text(audience) || !Number.isFinite(Date.parse(expiresAt)) || !validOwner(owner)
          || !eligible(authority(traceId).orchestration)) deny();
        database.prepare(`INSERT INTO request_context_lineage
          (trace_id, schema_version, principal_id, machine_digest, state_path, audience,
           expires_at, owner_connection_id, owner_pid, owner_start_token, owner_boot_id, revision, payload_json)
          VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`).run(
          traceId, identity.principalId, identity.machineDigest, identity.statePath, audience, expiresAt,
          owner.connectionId, owner.pid, owner.startToken, owner.bootId, '{"tasks":[],"sessions":[]}',
        );
        return getTrace(traceId);
      });
    },
    mergeTask({ traceId, owner, task }) { return merge(traceId, owner, task, "tasks"); },
    mergeSession({ traceId, owner, session }) { return merge(traceId, owner, session, "sessions"); },
    claimTrace({ traceId, identity, audience, now, owner, validate }) {
      return immediate(() => {
        const record = validated({ traceId, identity, audience, now });
        if (!validOwner(owner)) deny();
        if (record.owner?.connectionId === owner.connectionId && !sameOwner(record.owner, owner)) deny();
        const result = validateSync(record, validate);
        if (!sameOwner(record.owner, owner)) {
          record.owner = { ...owner };
          write(record, record.revision);
        }
        return result;
      });
    },
    inspectTrace({ validate, ...args }) {
      return immediate(() => validateSync(validated(args), validate));
    },
    checkOwner({ owner, sessionId, validate, ...args }) {
      return immediate(() => {
        const record = validated(args);
        if (!sameOwner(record.owner, owner)) deny();
        if (sessionId && (!record.payload.sessions.some((entry) => entry.sessionId === sessionId)
          || !["starting", "running"].includes(status(record.sessions.find((row) => row.session_id === sessionId))))) deny();
        return validateSync(record, validate);
      });
    },
    releaseOwner(owner) {
      if (!validOwner(owner)) deny();
      return immediate(() => {
        for (const row of database.prepare("SELECT * FROM request_context_lineage WHERE owner_connection_id = ?").all(owner.connectionId)) {
          const record = decode(row);
          if (sameOwner(record.owner, owner)) { record.owner = null; write(record, record.revision); }
        }
      });
    },
    removeTerminalTrace(traceId) {
      return immediate(() => {
        if (!["completed", "cancelled"].includes(status(authority(traceId).orchestration))) deny();
        database.prepare("DELETE FROM request_context_lineage WHERE trace_id = ?").run(traceId);
      });
    },
    removeTerminalSession({ traceId, sessionId }) {
      return immediate(() => {
        const record = getTrace(traceId);
        const session = authority(traceId).sessions.find((row) => row.session_id === sessionId);
        if (!session || !["closed", "error"].includes(status(session))) deny();
        if (record && record.payload.sessions.some((entry) => entry.sessionId === sessionId)) {
          record.payload.sessions = record.payload.sessions.filter((entry) => entry.sessionId !== sessionId);
          write(record, record.revision);
        }
      });
    },
  };
}
