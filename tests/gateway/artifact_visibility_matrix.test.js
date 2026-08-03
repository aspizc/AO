import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configureArtifactStore, put } from "../../gateway/src/core/artifact_store.js";
import { configureAudit, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { configureSanitizer } from "../../gateway/src/core/sanitizer.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import * as artifactRepo from "../../gateway/src/core/repositories/artifact_repo.js";
import { shareArtifact } from "../../gateway/src/services/artifact_share_service.js";
import { VISIBILITY_MATRIX } from "../fixtures/artifact_visibility_matrix.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const registries = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });
const RULES_PATH = path.join(REPO_ROOT, "policies", "sanitization-rules.json");

function fresh() {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-visibility-"));
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
  configureArtifactStore({ artifactStoreRoot: path.join(workspace, "artifacts") });
  configureSanitizer({ rulesPath: RULES_PATH });
}

function createArtifact(row) {
  return put({
    traceId: row.traceId,
    kind: row.artifact.kind,
    classification: row.artifact.classification,
    producedBy: "visibility-matrix",
    content: row.artifact.content,
  });
}

test("visibility matrix has reusable coverage rows", () => {
  assert.ok(VISIBILITY_MATRIX.length >= 5);
});

for (const row of VISIBILITY_MATRIX) {
  test(`artifact visibility: ${row.name}`, () => {
    fresh();
    const artifact = createArtifact(row);

    const result = shareArtifact({
      artifactId: artifact.artifactId,
      requesterAgent: row.requester.agent,
      requesterRole: row.requester.role,
      traceId: row.traceId,
      registries,
    });

    if (row.expected === "deny") {
      assert.equal(result.error, "POLICY_DENIED");
      assert.equal(result.decision.decision, "deny");
      return;
    }

    assert.equal(result.decision, row.expected);
    if (row.expected === "allow") {
      assert.equal(result.sharedArtifactId, artifact.artifactId);
    }
    if (row.expected === "allow_with_sanitization") {
      const sanitized = artifactRepo.findSanitizedFor(artifact.artifactId);
      assert.ok(sanitized);
      assert.equal(result.sharedArtifactId, sanitized.artifact_id);
    }
  });
}
