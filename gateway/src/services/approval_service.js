import { EventEmitter } from "node:events";
import { append as auditAppend } from "../core/audit.js";
import { newApprovalId } from "../core/ids.js";
import {
  isCanonicalAction,
  isRepositoryAffectingAction,
} from "../core/policy_types.js";
import * as repo from "../core/repositories/approval_repo.js";

export const approvalBus = new EventEmitter();
export const NEVER_AUTO = new Set([
  "git.push.protected",
  "dependency.change",
  "code.write.protected_branch",
]);

function noteSummary(note) {
  return String(note || "").slice(0, 500);
}

function notFound(message) {
  const error = new Error(message);
  error.code = "NOT_FOUND";
  return error;
}

function restrictedContext(context) {
  if (!context || typeof context !== "object") return false;
  return [context.classification, context.repoClassification, context.repositoryClassification].includes("restricted");
}

function hasRepositoryAuthority(action, context) {
  if (!isRepositoryAffectingAction(action)) return true;
  return (
    typeof context?.taskId === "string"
    && context.taskId.length > 0
    && typeof context?.repo === "string"
    && context.repo.length > 0
    && ["unrestricted", "internal", "restricted"].includes(
      context?.classification,
    )
  );
}

function isAutoApprovable(action, context, config = {}) {
  const scopes = new Set(config.autoApproveScopes || []);
  return (
    isCanonicalAction(action)
    && scopes.has(action)
    && !NEVER_AUTO.has(action)
    && hasRepositoryAuthority(action, context)
    && !restrictedContext(context)
  );
}

function autoGrantApproval({ approvalId, traceId, action, requestedBy, context }) {
  const decidedBy = "operator-autonomous-mode";
  const updated = repo.decideApproval(approvalId, "granted", decidedBy, null);
  const result = {
    approvalId,
    status: "granted",
    decidedAt: updated.decided_at,
    decidedBy: updated.decided_by,
    auto: true,
  };
  auditAppend({
    type: "APPROVAL_AUTO_GRANTED",
    traceId,
    approvalId,
    action,
    scope: action,
    requestedBy,
    decidedBy,
    context: context || null,
  });
  approvalBus.emit(approvalId, result);
  return result;
}

export function request({ traceId, action, requestedBy, context = null, config = {} }) {
  const approvalId = newApprovalId();
  repo.createPendingApproval({
    approvalId,
    traceId: traceId || null,
    action,
    requestedBy,
    createdAt: new Date().toISOString(),
    payload: context ? JSON.stringify(context) : null,
  });
  auditAppend({
    type: "APPROVAL_REQUIRED",
    traceId,
    approvalId,
    action,
    requestedBy,
  });
  if (isAutoApprovable(action, context, config)) {
    return autoGrantApproval({ approvalId, traceId, action, requestedBy, context });
  }
  return { approvalId, status: "pending" };
}

export function respond({ approvalId, decision, decidedBy = null, note = null }) {
  if (!["granted", "denied"].includes(decision)) {
    throw new Error(`invalid decision ${decision}`);
  }

  const row = repo.getApproval(approvalId);
  if (!row) throw notFound(`approval ${approvalId} not found`);
  if (row.status !== "pending") {
    return { approvalId, status: row.status, decidedAt: row.decided_at, decidedBy: row.decided_by };
  }

  const updated = repo.decideApproval(approvalId, decision, decidedBy, note);
  auditAppend({
    type: decision === "granted" ? "APPROVAL_GRANTED" : "APPROVAL_DENIED",
    traceId: row.trace_id,
    approvalId,
    decidedBy,
    note: noteSummary(note),
  });
  const result = {
    approvalId,
    status: decision,
    decidedAt: updated.decided_at,
    decidedBy: updated.decided_by,
  };
  approvalBus.emit(approvalId, result);
  return result;
}

export function poll({ approvalId }) {
  const row = repo.getApproval(approvalId);
  if (!row) return { error: "NOT_FOUND" };
  return {
    approvalId,
    status: row.status,
    decidedAt: row.decided_at,
    decidedBy: row.decided_by,
  };
}

export async function waitForDecision({ approvalId, timeoutMs = null, serverMaxMs }) {
  const maxMs = Math.max(0, Number(serverMaxMs ?? 60_000));
  const requestedMs = timeoutMs === null || timeoutMs === undefined ? maxMs : Number(timeoutMs);
  const capMs = Math.max(0, Math.min(requestedMs, maxMs));
  const current = poll({ approvalId });
  if (current.error) return current;
  if (current.status !== "pending") return current;

  return await new Promise((resolve) => {
    let settled = false;
    let timer = null;
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      approvalBus.off(approvalId, onChange);
    };
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(payload);
    };
    const onChange = (payload) => finish(payload);

    timer = setTimeout(() => {
      const latest = poll({ approvalId });
      const row = repo.getApproval(approvalId);
      auditAppend({
        type: "APPROVAL_WAIT_TIMEOUT",
        traceId: row?.trace_id || null,
        approvalId,
        timeoutMs: capMs,
      });
      finish(latest.error ? { approvalId, status: "pending" } : latest);
    }, capMs);
    approvalBus.on(approvalId, onChange);
  });
}
