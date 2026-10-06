import { randomUUID } from "node:crypto";

import {
  LifecycleAction,
  issueLifecycleCommand,
} from "../lifecycle.js";
import { getDb } from "../state.js";
import { applyLifecycleCommand } from "./lifecycle_repo.js";

const actionByStatus = Object.freeze({
  starting: LifecycleAction.TASK_RESERVE_START,
  running: LifecycleAction.TASK_MARK_RUNNING,
  completed: LifecycleAction.TASK_COMPLETE,
  failed: LifecycleAction.TASK_FAIL,
  cancelled: LifecycleAction.TASK_CANCEL,
});

export function createTask(row) {
  getDb()
    .prepare(
      `INSERT INTO tasks
       (task_id, trace_id, assigned_agent, assigned_role, repo, status, created_at, closed_at)
       VALUES (@taskId, @traceId, @assignedAgent, @assignedRole, @repo, @status, @createdAt, @closedAt)`,
    )
    .run(row);
  return row;
}

export function getTaskById(taskId) {
  return canonicalRow(
    getDb().prepare("SELECT * FROM tasks WHERE task_id = ?").get(taskId),
  );
}

export function listTasksByTrace(traceId) {
  return getDb()
    .prepare(
      "SELECT * FROM tasks WHERE trace_id = ? ORDER BY created_at, task_id",
    )
    .all(traceId)
    .map(canonicalRow);
}

export function setTaskStatus(taskId, status, closedAt = null) {
  const row = getTaskById(taskId);
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
        "UPDATE tasks SET status = ?, closed_at = ? WHERE task_id = ?",
      )
      .run(status, closedAt, taskId);
    return;
  }
  return applyLifecycleCommand(
    issueLifecycleCommand(action, {
      entityType: "task",
      entityId: taskId,
      traceId: row.trace_id,
      taskId,
      expectedVersion: Number(row.lifecycle_version),
      idempotencyKey: `legacy-task-${randomUUID()}`,
      occurredAt: closedAt ?? new Date().toISOString(),
      evidence: { source: "legacy-task-repository" },
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
