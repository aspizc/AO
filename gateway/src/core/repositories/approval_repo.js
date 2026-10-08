import { getDb } from "../state.js";

const VALID_TARGET_STATUSES = new Set(["granted", "denied", "expired"]);

export class ApprovalStateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ApprovalStateError";
    this.code = code;
  }
}

export function createPendingApproval(row) {
  const pending = {
    ...row,
    status: "pending",
    decidedAt: null,
    decidedBy: null,
  };
  getDb()
    .prepare(
      `INSERT INTO approvals
       (approval_id, trace_id, requested_by, action, status, created_at, decided_at, decided_by, payload)
       VALUES (@approvalId, @traceId, @requestedBy, @action, 'pending', @createdAt, @decidedAt, @decidedBy, @payload)`,
    )
    .run(pending);
  return pending;
}

export function createApproval(row) {
  if (row.status && row.status !== "pending") {
    throw new ApprovalStateError("INVALID_STATUS", `approval must be created pending, got ${row.status}`);
  }
  return createPendingApproval(row);
}

export function getApproval(approvalId) {
  return getDb().prepare("SELECT * FROM approvals WHERE approval_id = ?").get(approvalId) || null;
}

export const getApprovalById = getApproval;

export function listApprovalsByTrace(traceId) {
  return getDb().prepare("SELECT * FROM approvals WHERE trace_id = ? ORDER BY created_at, approval_id").all(traceId);
}

export function listPendingApprovals(traceId = null) {
  return getDb()
    .prepare(
      `SELECT * FROM approvals
       WHERE status = 'pending' AND (trace_id = ? OR ? IS NULL)
       ORDER BY created_at, approval_id`,
    )
    .all(traceId, traceId);
}

export function decideApproval(approvalId, status, decidedBy = null, note = null) {
  if (!VALID_TARGET_STATUSES.has(status)) {
    throw new ApprovalStateError("INVALID_STATUS", `invalid target status ${status}`);
  }

  const row = getApproval(approvalId);
  if (!row) throw new ApprovalStateError("NOT_FOUND", `approval ${approvalId} not found`);
  if (row.status !== "pending") {
    throw new ApprovalStateError("ALREADY_DECIDED", `approval ${approvalId} is ${row.status}`);
  }

  const decidedAt = new Date().toISOString();
  const result = getDb()
    .prepare(
      `UPDATE approvals
       SET status = ?, decided_at = ?, decided_by = ?, payload = COALESCE(?, payload)
       WHERE approval_id = ? AND status = 'pending'`,
    )
    .run(status, decidedAt, decidedBy || null, row.action.startsWith("session.prompt.") ? null : note || null, approvalId);

  if (result.changes !== 1) {
    throw new ApprovalStateError("ALREADY_DECIDED", `approval ${approvalId} is no longer pending`);
  }

  return getApproval(approvalId);
}

// The same CAS consumes authority and persists the attempt before any input.
// Its exact payload is the token required to finalize this attempt.
export function consumePromptApproval(approvalId, payload, attempt) {
  let context;
  try { context = JSON.parse(payload); } catch (_error) { return false; }
  if (!context || context.consumed || context.promptAnswer
    || attempt?.status !== "in_flight" || attempt.outcome !== "attempting"
    || attempt.response !== "Enter" || typeof attempt.target !== "string"
    || typeof attempt.attemptedAt !== "string") return false;
  const inFlightPayload = JSON.stringify({ ...context, consumed: true, promptAnswer: attempt });
  const changed = getDb().prepare(
    "UPDATE approvals SET payload = ? WHERE approval_id = ? AND status = 'granted' AND payload = ?",
  ).run(inFlightPayload, approvalId, payload).changes === 1;
  return changed ? inFlightPayload : false;
}

export function hasUnfinishedPromptAttempt(row) {
  if (!row?.action.startsWith("session.prompt.")) return false;
  try {
    const context = JSON.parse(row.payload);
    return context?.promptAnswer?.status === "in_flight" || (!!context?.consumed && !context.promptAnswer);
  } catch (_error) { return false; }
}

// Pending invalidations expire; granted decisions retain their history. A
// terminal transport result can replace only its exact in-flight CAS token.
export function recordPromptAnswer(approvalId, promptAnswer, inFlightPayload = null) {
  const row = getApproval(approvalId);
  if (!row?.action.startsWith("session.prompt.")) return false;
  let context;
  try { context = JSON.parse(row.payload); } catch (_error) { context = null; }
  context ||= {};
  if (inFlightPayload !== null) {
    if (row.payload !== inFlightPayload || row.status !== "granted"
      || context.promptAnswer?.status !== "in_flight") return false;
  } else {
    if (context.promptAnswer && context.promptAnswer.status !== "in_flight") return false;
    if (hasUnfinishedPromptAttempt(row)) {
      promptAnswer = { status: "not_answered", outcome: "uncertain", reason: "transport_uncertain_after_restart" };
    }
  }
  const result = { ...(context.promptAnswer || {}), ...promptAnswer };
  return getDb().prepare(
    `UPDATE approvals SET payload = ?,
     status = CASE WHEN status = 'pending' THEN 'expired' ELSE status END,
     decided_at = COALESCE(decided_at, ?), decided_by = COALESCE(decided_by, ?)
     WHERE approval_id = ? AND status = ? AND (payload = ? OR (payload IS NULL AND ? IS NULL))`,
  ).run(JSON.stringify({ ...context, consumed: true, promptAnswer: result }), new Date().toISOString(),
    "session-prompt-watcher", approvalId, row.status, row.payload, row.payload).changes === 1;
}

export function promptAnswerResult(row) {
  if (!row?.action.startsWith("session.prompt.")) return null;
  try { return JSON.parse(row.payload)?.promptAnswer || null; } catch (_error) { return null; }
}
