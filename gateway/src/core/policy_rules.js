export const POLICY_RULE = Object.freeze({
  ACTION_UNKNOWN: "action.unknown",
  AGENT_MODEL_ALLOWED: "agent.model.allowed",
  AGENT_REASONING_EFFORT_ALLOWED: "agent.reasoning_effort.allowed",
  AGENT_SERVICE_TIER_ALLOWED: "agent.service_tier.allowed",
  AGENT_UNKNOWN: "agent.unknown",
  APPROVAL_AGENT_REQUIRED: "approval.agent_required",
  APPROVAL_GIT_PUSH_PROTECTED: "approval.git_push_protected",
  CLASSIFICATION_AGENT_NOT_ALLOWED: "classification.agent_not_allowed",
  CLASSIFICATION_EXCLUDED_PATH: "classification.excluded_path",
  CLASSIFICATION_REPO_NOT_ALLOWED: "classification.repo_not_allowed",
  OK: "ok",
  REPO_UNKNOWN: "repo.unknown",
  ROLE_AGENT_NOT_ALLOWED_FOR_ROLE: "role.agent_not_allowed_for_role",
  ROLE_DENY_ACTION: "role.deny_action",
  ROLE_TASK_ASSIGN_MISSING_TARGET: "role.task_assign_missing_target",
  ROLE_TASK_ASSIGN_ONLY_ORCHESTRATOR: "role.task_assign_only_orchestrator",
  ROLE_TASK_ASSIGN_TARGET_ROLE_NOT_ALLOWED:
    "role.task_assign_target_role_not_allowed",
  ROLE_TASK_ASSIGN_UNKNOWN_TARGET: "role.task_assign_unknown_target",
  ROLE_UNKNOWN: "role.unknown",
  SANITIZATION_MISSING: "sanitization.missing",
  SANITIZATION_ORCHESTRATOR_RAW: "sanitization.orchestrator_raw",
  SANITIZATION_REQUIRED: "sanitization.required",
  SANITIZATION_ROLE_DENIES_SANITIZED_RAW_RESTRICTED:
    "sanitization.role_denies_sanitized_raw_restricted",
  SHARE_CROSS_TRACE: "share.cross_trace",
  SHARE_SANITIZATION_MISSING: "share.sanitization_missing",
});

const CANONICAL_POLICY_RULE_IDS = new Set(Object.values(POLICY_RULE));

export function isCanonicalPolicyRuleId(value) {
  return (
    typeof value === "string"
    && CANONICAL_POLICY_RULE_IDS.has(value)
  );
}
