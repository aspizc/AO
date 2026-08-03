import { getDb } from "../state.js";

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
  return getDb().prepare("SELECT * FROM tasks WHERE task_id = ?").get(taskId) || null;
}

export function listTasksByTrace(traceId) {
  return getDb().prepare("SELECT * FROM tasks WHERE trace_id = ? ORDER BY created_at, task_id").all(traceId);
}

export function setTaskStatus(taskId, status, closedAt = null) {
  getDb().prepare("UPDATE tasks SET status = ?, closed_at = ? WHERE task_id = ?").run(status, closedAt, taskId);
}
