import { getDb } from "../state.js";

export function createMessage(row) {
  getDb()
    .prepare(
      `INSERT INTO messages
       (message_id, trace_id, from_id, to_id, body, created_at)
       VALUES (@messageId, @traceId, @fromId, @toId, @body, @createdAt)`,
    )
    .run(row);
  return row;
}

export function getMessageById(messageId) {
  return getDb().prepare("SELECT * FROM messages WHERE message_id = ?").get(messageId) || null;
}

export function getMessageScopedToTrace(messageId, traceId) {
  return (
    getDb()
      .prepare("SELECT * FROM messages WHERE message_id = ? AND trace_id = ?")
      .get(messageId, traceId) || null
  );
}

export function listMessagesByTrace(traceId) {
  return getDb().prepare("SELECT * FROM messages WHERE trace_id = ? ORDER BY created_at, rowid").all(traceId);
}
