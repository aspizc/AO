import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configureArtifactStore, put } from "../../gateway/src/core/artifact_store.js";
import { configureAudit, query as queryAudit, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { configureSanitizer } from "../../gateway/src/core/sanitizer.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import * as artifactRepo from "../../gateway/src/core/repositories/artifact_repo.js";
import { shareArtifact } from "../../gateway/src/services/artifact_share_service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const registries = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });
const RULES_PATH = path.join(REPO_ROOT, "policies", "sanitization-rules.json");

function fresh() {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-share-"));
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
  configureArtifactStore({ artifactStoreRoot: path.join(workspace, "artifacts") });
  configureSanitizer({ rulesPath: RULES_PATH });
}

function putRawRestricted(traceId = "tr-share") {
  return put({
    traceId,
    kind: "raw_diff",
    classification: "restricted",
    producedBy: "task-1",
    content: "api_key=abcdef1234567890",
  });
}

test("raw restricted share to reviewer returns sanitized artifact", async () => {
  fresh();
  const raw = putRawRestricted();
  const sanitized = artifactRepo.findSanitizedFor(raw.artifactId);

  const result = shareArtifact({
    artifactId: raw.artifactId,
    requesterAgent: "claude-code",
    requesterRole: "reviewer",
    traceId: "tr-share",
    registries,
  });

  assert.equal(result.decision, "allow_with_sanitization");
  assert.equal(result.sharedArtifactId, sanitized.artifact_id);

  const events = await queryAudit({ traceId: "tr-share", type: "ARTIFACT_SHARED" });
  assert.equal(events.length, 1);
  assert.equal(events[0].sourceArtifactId, raw.artifactId);
  assert.equal(events[0].sharedArtifactId, sanitized.artifact_id);
});

test("raw restricted share to orchestrator is denied", async () => {
  fresh();
  const raw = putRawRestricted();

  const result = shareArtifact({
    artifactId: raw.artifactId,
    requesterAgent: "claude-code",
    requesterRole: "orchestrator",
    traceId: "tr-share",
    registries,
  });

  assert.equal(result.error, "POLICY_DENIED");
  assert.equal(result.decision.decision, "deny");

  const events = await queryAudit({ traceId: "tr-share", type: "ARTIFACT_SHARE_DENIED" });
  assert.equal(events.length, 1);
  assert.equal(events[0].artifactId, raw.artifactId);
});

test("non-raw internal share is allowed as original artifact", async () => {
  fresh();
  const artifact = put({
    traceId: "tr-share",
    kind: "review_notes",
    classification: "internal",
    producedBy: "task-1",
    content: "review notes",
  });

  const result = shareArtifact({
    artifactId: artifact.artifactId,
    requesterAgent: "claude-code",
    requesterRole: "reviewer",
    traceId: "tr-share",
    registries,
  });

  assert.equal(result.decision, "allow");
  assert.equal(result.sharedArtifactId, artifact.artifactId);
});

test("cross-trace share is denied and audited", async () => {
  fresh();
  const artifact = putRawRestricted("tr-source");

  const result = shareArtifact({
    artifactId: artifact.artifactId,
    requesterAgent: "claude-code",
    requesterRole: "reviewer",
    traceId: "tr-other",
    registries,
  });

  assert.equal(result.error, "POLICY_DENIED");
  assert.equal(result.decision.ruleId, "share.cross_trace");

  const events = await queryAudit({ traceId: "tr-other", type: "ARTIFACT_SHARE_DENIED" });
  assert.equal(events.length, 1);
  assert.equal(events[0].decision.ruleId, "share.cross_trace");
});
