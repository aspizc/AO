import * as artifactStore from "../core/artifact_store.js";
import {
  append as auditAppend,
  appendLocalOnly as auditAppendLocalOnly,
} from "../core/audit.js";
import { evaluate } from "../core/policy_engine.js";
import { POLICY_RULE } from "../core/policy_rules.js";
import * as artifactRepo from "../core/repositories/artifact_repo.js";
import { shareArtifact } from "../services/artifact_share_service.js";
import { bindCatalogTool } from "./tool_helpers.js";

function withoutPath(row) {
  if (!row) return row;
  const { path: _path, ...publicRow } = row;
  return publicRow;
}

function policyContext({ artifact, requesterAgent, requesterRole }) {
  return {
    agent: requesterAgent,
    role: requesterRole,
    action: "artifact.get",
    artifactKind: artifact.kind,
    artifactClassification: artifact.classification,
  };
}

function missingSanitizationDecision() {
  return {
    decision: "deny",
    reason: "sanitization missing or failed",
    ruleId: POLICY_RULE.SANITIZATION_MISSING,
  };
}

export function buildArtifactTools({ registries } = {}) {
  return [
    bindCatalogTool(
      "artifact.put",
      async (args) =>
        withoutPath(
          artifactStore.put({
            ...args,
            content: Buffer.from(args.content, "utf-8"),
            sanitizedFrom: args.sanitizedFrom ?? null,
          }),
        ),
    ),
    bindCatalogTool(
      "artifact.get",
      async ({ artifactId, requesterAgent, requesterRole }) => {
        const artifact = artifactStore.get({ artifactId });
        if (!artifact) return { error: "NOT_FOUND" };
        const context = policyContext({ artifact, requesterAgent, requesterRole });
        const decision = evaluate(context, registries);
        auditAppend({
          type: "POLICY_DECIDED",
          traceId: artifact.trace_id,
          context,
          decision: decision.decision,
          reason: decision.reason,
          ruleId: decision.ruleId,
        });
        if (decision.decision === "allow_with_sanitization") {
          const sanitizedRow = artifactRepo.findSanitizedFor(artifact.artifact_id);
          if (!sanitizedRow) {
            const denyDecision = missingSanitizationDecision();
            auditAppend({
              type: "SANITIZATION_MISSING_DENY",
              traceId: artifact.trace_id,
              sourceArtifactId: artifact.artifact_id,
              decision: denyDecision.decision,
              reason: denyDecision.reason,
              ruleId: denyDecision.ruleId,
            });
            return { error: "POLICY_DENIED", decision: denyDecision };
          }

          const sanitizedArtifact = artifactStore.get({ artifactId: sanitizedRow.artifact_id });
          return withoutPath({ ...sanitizedArtifact, content: sanitizedArtifact.content.toString("utf-8") });
        }

        if (decision.decision !== "allow") {
          return { error: "POLICY_DENIED", decision };
        }
        return withoutPath({ ...artifact, content: artifact.content.toString("utf-8") });
      },
    ),
    bindCatalogTool(
      "artifact.list",
      async ({ traceId, requesterAgent, requesterRole }) => {
        const context = {
          agent: requesterAgent,
          role: requesterRole,
          action: "artifact.list",
        };
        const decision = evaluate(context, registries);
        auditAppendLocalOnly({
          type: "POLICY_DECIDED",
          traceId,
          context,
          decision: decision.decision,
          reason: decision.reason,
          ruleId: decision.ruleId,
        });
        if (decision.decision !== "allow") {
          return { error: "POLICY_DENIED", decision };
        }
        return artifactStore.list({ traceId }).map(withoutPath);
      },
    ),
    bindCatalogTool(
      "artifact.share",
      async (args) => shareArtifact({ ...args, registries }),
    ),
  ];
}
