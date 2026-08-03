export const Decision = Object.freeze({
  ALLOW: "allow",
  DENY: "deny",
  REQUIRE_APPROVAL: "require_approval",
  ALLOW_WITH_SANITIZATION: "allow_with_sanitization",
});

export const Actions = Object.freeze([
  "task.assign",
  "agent.delegate",
  "agent.spawn",
  "agent.ask",
  "agent.view",
  "agent.kill",
  "code.read",
  "code.read.raw_restricted",
  "code.write",
  "code.write.protected_branch",
  "git.push",
  "git.push.protected",
  "dependency.change",
  "artifact.put",
  "artifact.get",
  "artifact.list",
  "artifact.share",
  "approval.request",
  "approval.respond",
  "approval.poll",
  "approval.wait",
  "policy.check",
  "session.attach_info",
  "session.intervention_note",
  "test.run",
]);

const RAW_ARTIFACT_KINDS = new Set(["raw_diff", "raw_code", "raw_stacktrace"]);

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

  if (!out.agent || !out.role || !out.action) {
    throw new TypeError("policy context requires agent, role and action");
  }

  return Object.freeze(out);
}
