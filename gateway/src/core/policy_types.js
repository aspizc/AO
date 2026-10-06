export const Decision = Object.freeze({
  ALLOW: "allow",
  DENY: "deny",
  REQUIRE_APPROVAL: "require_approval",
  ALLOW_WITH_SANITIZATION: "allow_with_sanitization",
});

export const ACTION_CATALOG_VERSION = 1;

export const Actions = Object.freeze([
  "orchestration.create",
  "orchestration.view",
  "orchestration.pause",
  "orchestration.resume",
  "orchestration.cancel",
  "orchestration.complete",
  "task.assign",
  "agent.delegate",
  "agent.spawn",
  "agent.ask",
  "agent.view",
  "agent.kill",
  "code.read",
  "code.read.raw_restricted",
  "code.write",
  "code.write.file",
  "code.write.protected_branch",
  "code.apply",
  "plan.apply",
  "git.push",
  "git.push.protected",
  "dependency.change",
  "artifact.put",
  "artifact.put.doc",
  "artifact.put.plan",
  "artifact.put.raw_restricted",
  "artifact.put.review_notes",
  "artifact.put.security_finding",
  "artifact.put.test_report",
  "artifact.get",
  "artifact.get.raw_restricted",
  "artifact.get.sanitized",
  "artifact.get.sanitized.raw_restricted",
  "artifact.list",
  "artifact.share",
  "artifact.share.cross_classification",
  "approval.request",
  "approval.respond",
  "approval.poll",
  "approval.wait",
  "policy.check",
  "session.attach_info",
  "session.intervention_note",
  "test.run",
  "message.send",
  "message.list",
  "message.reply",
  "coordination.status",
  "coordination.register",
  "coordination.heartbeat",
  "coordination.discover",
  "coordination.unregister",
  "coordination.send",
  "coordination.receive",
  "coordination.ack",
]);

const CANONICAL_ACTIONS = new Set(Actions);
const REPOSITORY_AFFECTING_ACTION_PREFIXES = Object.freeze([
  "code.",
  "plan.",
  "git.",
  "dependency.",
  "test.",
]);
const RAW_ARTIFACT_KINDS = new Set(["raw_diff", "raw_code", "raw_stacktrace"]);

export function isCanonicalAction(value) {
  return typeof value === "string" && CANONICAL_ACTIONS.has(value);
}

export function isRepositoryAffectingAction(value) {
  return (
    isCanonicalAction(value)
    && REPOSITORY_AFFECTING_ACTION_PREFIXES.some((prefix) => value.startsWith(prefix))
  );
}

export function isRawKind(kind) {
  return RAW_ARTIFACT_KINDS.has(kind);
}

export function normalizePolicyContext(ctx) {
  if (!ctx || typeof ctx !== "object") {
    throw new TypeError("policy context must be an object");
  }

  const out = {
    agent: String(ctx.agent ?? ""),
    role: String(ctx.role ?? ""),
    repo: ctx.repo ? String(ctx.repo) : null,
    action: String(ctx.action ?? ""),
    path: ctx.path ?? null,
    artifactKind: ctx.artifactKind ?? null,
    artifactClassification: ctx.artifactClassification ?? null,
    targetAgent: ctx.targetAgent ?? null,
    targetRole: ctx.targetRole ?? null,
    targetBranch: ctx.targetBranch ?? null,
    model: ctx.model ?? null,
    reasoningEffort: ctx.reasoningEffort ?? null,
    serviceTier: ctx.serviceTier ?? null,
  };
  Object.defineProperty(out, "effectiveSelection", {
    value: ctx.effectiveSelection ?? null,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  if (!out.agent || !out.role) {
    throw new TypeError("policy context requires agent and role");
  }

  return Object.freeze(out);
}
