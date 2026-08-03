import { getDb } from "../state.js";

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
  return getDb().prepare("SELECT * FROM sessions WHERE session_id = ?").get(sessionId) || null;
}

export function listSessionsByTrace(traceId) {
  return getDb().prepare("SELECT * FROM sessions WHERE trace_id = ? ORDER BY started_at, session_id").all(traceId);
}

export function setSessionStatus(sessionId, status, closedAt = null) {
  getDb().prepare("UPDATE sessions SET status = ?, closed_at = ? WHERE session_id = ?").run(status, closedAt, sessionId);
}
