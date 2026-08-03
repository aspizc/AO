import { append as auditAppend } from "../core/audit.js";
import { evaluate } from "../core/policy_engine.js";
import { POLICY_RULE } from "../core/policy_rules.js";
import * as artifactRepo from "../core/repositories/artifact_repo.js";

function denyDecision(reason, ruleId) {
  return { decision: "deny", reason, ruleId };
}

function auditDenied({ traceId, artifactId, requesterAgent, requesterRole, decision }) {
  auditAppend({
    type: "ARTIFACT_SHARE_DENIED",
    traceId,
    artifactId,
    requesterAgent,
    requesterRole,
    decision,
  });
}

function visibilityContext({ artifact, requesterAgent, requesterRole }) {
  return {
    agent: requesterAgent,
    role: requesterRole,
    action: "artifact.get",
    artifactKind: artifact.kind,
    artifactClassification: artifact.classification,
  };
}

export function shareArtifact({ artifactId, requesterAgent, requesterRole, traceId, registries }) {
  const artifact = artifactRepo.getArtifactById(artifactId);
  if (!artifact) return { error: "NOT_FOUND" };

  if (artifact.trace_id !== traceId) {
    const decision = denyDecision(
      "cross-trace share",
      POLICY_RULE.SHARE_CROSS_TRACE,
    );
    auditDenied({ traceId, artifactId, requesterAgent, requesterRole, decision });
    return { error: "POLICY_DENIED", decision };
  }

  const decision = evaluate(visibilityContext({ artifact, requesterAgent, requesterRole }), registries);
  let sharedArtifactId;

  if (decision.decision === "allow") {
    sharedArtifactId = artifactId;
  } else if (decision.decision === "allow_with_sanitization") {
    const sanitized = artifactRepo.findSanitizedFor(artifactId);
    if (!sanitized) {
      const missingDecision = denyDecision(
        "sanitized version missing",
        POLICY_RULE.SHARE_SANITIZATION_MISSING,
      );
      auditDenied({ traceId, artifactId, requesterAgent, requesterRole, decision: missingDecision });
      return { error: "SANITIZATION_MISSING", decision: missingDecision };
    }
    sharedArtifactId = sanitized.artifact_id;
  } else {
    auditDenied({ traceId, artifactId, requesterAgent, requesterRole, decision });
    return { error: "POLICY_DENIED", decision };
  }

  auditAppend({
    type: "ARTIFACT_SHARED",
    traceId,
    sourceArtifactId: artifactId,
    sharedArtifactId,
    requesterAgent,
    requesterRole,
    decision: decision.decision,
  });
  return { decision: decision.decision, sharedArtifactId };
}
