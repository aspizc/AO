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
    .run(status, decidedAt, decidedBy || null, note || null, approvalId);

  if (result.changes !== 1) {
    throw new ApprovalStateError("ALREADY_DECIDED", `approval ${approvalId} is no longer pending`);
  }

  return getApproval(approvalId);
}
