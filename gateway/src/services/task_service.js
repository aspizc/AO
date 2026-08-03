import { append as auditAppend } from "../core/audit.js";
import { newChildTaskId } from "../core/ids.js";
import { evaluate } from "../core/policy_engine.js";
import * as orchestrationRepo from "../core/repositories/orchestration_repo.js";
import * as taskRepo from "../core/repositories/task_repo.js";

const ALLOWED_TARGET_DECISIONS = new Set(["allow", "allow_with_sanitization"]);

export class PolicyDeniedError extends Error {
  constructor(decision) {
    super(decision.reason);
    this.name = "PolicyDeniedError";
    this.code = "POLICY_DENIED";
    this.decision = decision;
  }
}

function codedError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function nowIso() {
  return new Date().toISOString();
}

function selectAgentForRole({ role, registries }) {
  if (role === "restricted-coder") return "gemini-cli";
  if (registries.getAgent("claude-code")) return "claude-code";
  return "gemini-cli";
}

function auditPolicyDecision({ traceId, scope, context, decision }) {
  auditAppend({
    type: "POLICY_DECIDED",
    traceId,
    scope,
    decision: decision.decision,
    reason: decision.reason,
    ruleId: decision.ruleId,
    context,
  });
}

function assertTraceExists(traceId) {
  if (!traceId || !orchestrationRepo.getOrchestrationByTraceId(traceId)) {
    throw codedError(`unknown traceId ${traceId}`, "ORCHESTRATION_NOT_FOUND");
  }
}

export function assignTask({ caller, target, repo = null, brief = "", traceId, registries }) {
  assertTraceExists(traceId);

  const targetAgent = target.agent || selectAgentForRole({ role: target.role, repo, registries });
  const callerContext = {
    agent: caller.agent,
    role: caller.role,
    action: "task.assign",
    targetAgent,
    targetRole: target.role,
  };
  const callerDecision = evaluate(callerContext, registries);
  auditPolicyDecision({ traceId, scope: "caller", context: callerContext, decision: callerDecision });
  if (callerDecision.decision !== "allow") {
    throw new PolicyDeniedError(callerDecision);
  }

  const targetContext = {
    agent: targetAgent,
    role: target.role,
    action: target.action || "code.read",
    repo,
  };
  const targetDecision = evaluate(targetContext, registries);
  auditPolicyDecision({ traceId, scope: "target", context: targetContext, decision: targetDecision });
  if (!ALLOWED_TARGET_DECISIONS.has(targetDecision.decision)) {
    throw new PolicyDeniedError(targetDecision);
  }

  const row = {
    taskId: newChildTaskId(),
    traceId,
    assignedAgent: targetAgent,
    assignedRole: target.role,
    repo,
    status: "pending",
    createdAt: nowIso(),
    closedAt: null,
  };
  taskRepo.createTask(row);
  auditAppend({
    type: "TASK_CREATED",
    traceId,
    taskId: row.taskId,
    callerAgent: caller.agent,
    callerRole: caller.role,
    assignedAgent: targetAgent,
    assignedRole: target.role,
    repo,
    brief: String(brief || "").slice(0, 500),
  });

  return row;
}
