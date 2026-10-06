import { randomUUID } from "node:crypto";

import {
  LifecycleAction,
  issueLifecycleCommand,
} from "../lifecycle.js";
import { getDb } from "../state.js";
import { applyLifecycleCommand } from "./lifecycle_repo.js";

const actionByStatus = Object.freeze({
  paused: LifecycleAction.ORCHESTRATION_PAUSE,
  active: LifecycleAction.ORCHESTRATION_RESUME,
  completed: LifecycleAction.ORCHESTRATION_COMPLETE,
  cancelled: LifecycleAction.ORCHESTRATION_CANCEL,
});

export function createOrchestration(row) {
  getDb()
    .prepare(
      `INSERT INTO orchestration_sessions
       (session_id, trace_id, caller_agent, caller_role, status, goal, created_at)
       VALUES (@sessionId, @traceId, @callerAgent, @callerRole, @status, @goal, @createdAt)`,
    )
    .run(row);
  return row;
}

export function getOrchestrationById(sessionId) {
  return canonicalRow(
    getDb()
      .prepare(
        "SELECT * FROM orchestration_sessions WHERE session_id = ?",
      )
      .get(sessionId),
  );
}

export function getOrchestrationByTraceId(traceId) {
  return canonicalRow(
    getDb()
      .prepare(
        "SELECT * FROM orchestration_sessions WHERE trace_id = ?",
      )
      .get(traceId),
  );
}

export function setOrchestrationStatus(
  sessionId,
  status,
  occurredAt = new Date().toISOString(),
) {
  const row = getOrchestrationById(sessionId);
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
  if (
    row.lifecycle_state === undefined ||
    row.lifecycle_version === undefined
  ) {
    getDb()
      .prepare(
        "UPDATE orchestration_sessions SET status = ? WHERE session_id = ?",
      )
      .run(status, sessionId);
    return;
  }
  return applyLifecycleCommand(
    issueLifecycleCommand(action, {
      entityType: "orchestration",
      entityId: sessionId,
      traceId: row.trace_id,
      taskId: null,
      expectedVersion: Number(row.lifecycle_version),
      idempotencyKey: `legacy-orchestration-${randomUUID()}`,
      occurredAt,
      evidence: { source: "legacy-orchestration-repository" },
    }),
  );
}

function canonicalRow(row) {
  if (!row) return null;
  return {
    ...row,
    status: row.lifecycle_state ?? row.status,
    lifecycle_version:
      row.lifecycle_version === undefined
        ? undefined
        : Number(row.lifecycle_version),
  };
}
