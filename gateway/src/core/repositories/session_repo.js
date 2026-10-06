import { randomUUID } from "node:crypto";

import {
  LifecycleAction,
  issueLifecycleCommand,
} from "../lifecycle.js";
import { getDb } from "../state.js";
import { applyLifecycleCommand } from "./lifecycle_repo.js";

const actionByStatus = Object.freeze({
  running: LifecycleAction.SESSION_MARK_RUNNING,
  closed: LifecycleAction.SESSION_CLOSE,
  error: LifecycleAction.SESSION_FAIL,
});

export function createSession(row) {
  getDb()
    .prepare(
      `INSERT INTO sessions
       (session_id, task_id, trace_id, agent, role, tmux_target, status, started_at, closed_at)
       VALUES (@sessionId, @taskId, @traceId, @agent, @role, @tmuxTarget, @status, @startedAt, @closedAt)`,
    )
    .run(row);
  return row;
}

export function getSessionById(sessionId) {
  return canonicalRow(
    getDb()
      .prepare("SELECT * FROM sessions WHERE session_id = ?")
      .get(sessionId),
  );
}

export function listSessionsByTrace(traceId) {
  return getDb()
    .prepare(
      "SELECT * FROM sessions WHERE trace_id = ? ORDER BY started_at, session_id",
    )
    .all(traceId)
    .map(canonicalRow);
}

export function setSessionStatus(sessionId, status, closedAt = null) {
  const row = getSessionById(sessionId);
  const action = actionByStatus[status];
  if (!row) {
    const error = new Error("lifecycle entity not found");
    error.code = "LIFECYCLE_NOT_FOUND";
    throw error;
  }
  if (!action) {
    const error = new Error("invalid lifecycle command");
    error.code = "LIFECYCLE_COMMAND_INVALID";
    throw error;
  }
  if (row.lifecycle_state === null || row.lifecycle_version === null) {
    getDb()
      .prepare(
        "UPDATE sessions SET status = ?, closed_at = ? WHERE session_id = ?",
      )
      .run(status, closedAt, sessionId);
    return;
  }
  return applyLifecycleCommand(
    issueLifecycleCommand(action, {
      entityType: "session",
      entityId: sessionId,
      traceId: row.trace_id,
      taskId: row.task_id,
      expectedVersion: Number(row.lifecycle_version),
      idempotencyKey: `legacy-session-${randomUUID()}`,
      occurredAt: closedAt ?? new Date().toISOString(),
      evidence: { source: "legacy-session-repository" },
    }),
  );
}

function canonicalRow(row) {
  if (!row) return null;
  const canonical =
    row.lifecycle_state !== null &&
    row.lifecycle_state !== undefined &&
    row.lifecycle_version !== null &&
    row.lifecycle_version !== undefined;
  return {
    ...row,
    status: canonical ? row.lifecycle_state : row.status,
    lifecycle_state: canonical ? row.lifecycle_state : null,
    lifecycle_version: canonical ? Number(row.lifecycle_version) : null,
  };
}
