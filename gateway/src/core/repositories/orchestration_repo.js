import { getDb } from "../state.js";

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
  return getDb().prepare("SELECT * FROM orchestration_sessions WHERE session_id = ?").get(sessionId) || null;
}

export function getOrchestrationByTraceId(traceId) {
  return getDb().prepare("SELECT * FROM orchestration_sessions WHERE trace_id = ?").get(traceId) || null;
}

export function setOrchestrationStatus(sessionId, status) {
  getDb().prepare("UPDATE orchestration_sessions SET status = ? WHERE session_id = ?").run(status, sessionId);
}
