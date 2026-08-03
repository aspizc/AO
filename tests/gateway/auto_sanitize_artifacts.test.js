import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configureArtifactStore, put } from "../../gateway/src/core/artifact_store.js";
import { configureAudit, query as queryAudit, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { configureSanitizer } from "../../gateway/src/core/sanitizer.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import * as artifactRepo from "../../gateway/src/core/repositories/artifact_repo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const RULES_PATH = path.join(REPO_ROOT, "policies", "sanitization-rules.json");

function fresh() {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "auto-sanitize-"));
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
  configureArtifactStore({ artifactStoreRoot: path.join(workspace, "artifacts") });
  configureSanitizer({ rulesPath: RULES_PATH });
}

test("put raw restricted creates sanitized artifact", () => {
  fresh();

  const raw = put({
    traceId: "tr-sanitize",
    kind: "raw_diff",
    classification: "restricted",
    producedBy: "task-1",
    content: "api_key=abcdef1234567890",
  });
  const artifacts = artifactRepo.listArtifactsByTrace("tr-sanitize");

  assert.equal(artifacts.length, 2);
  assert.equal(artifacts[0].artifact_id, raw.artifactId);
  assert.equal(artifacts[1].kind, "raw_diff_sanitized");
  assert.equal(artifacts[1].classification, "internal");
});

test("sanitized artifact links to raw and contains sanitized content", () => {
  fresh();

  const raw = put({
    traceId: "tr-sanitize",
    kind: "raw_diff",
    classification: "restricted",
    producedBy: "task-1",
    content: "api_key=abcdef1234567890",
  });
  const sanitized = artifactRepo
    .listArtifactsByTrace("tr-sanitize")
    .find((artifact) => artifact.sanitized_from === raw.artifactId);

  assert.ok(sanitized);
  const sanitizedContent = fs.readFileSync(sanitized.path, "utf-8");
  assert.equal(sanitizedContent, "api_key=<REDACTED-SECRET>");
});

test("sanitization event is audited", async () => {
  fresh();

  const raw = put({
    traceId: "tr-sanitize",
    kind: "raw_diff",
    classification: "restricted",
    producedBy: "task-1",
    content: "api_key=abcdef1234567890",
  });

  const events = await queryAudit({ traceId: "tr-sanitize", type: "SANITIZATION_APPLIED" });

  assert.equal(events.length, 1);
  assert.equal(events[0].sourceArtifactId, raw.artifactId);
  assert.match(events[0].sanitizedArtifactId, /^art-/);
  assert.deepEqual(events[0].appliedRuleIds, ["secret.token"]);
});

test("put non-raw or non-restricted artifacts does not generate sanitized artifact", () => {
  fresh();

  put({
    traceId: "tr-non-raw",
    kind: "review_notes",
    classification: "restricted",
    producedBy: "task-1",
    content: "api_key=abcdef1234567890",
  });
  put({
    traceId: "tr-non-restricted",
    kind: "raw_diff",
    classification: "internal",
    producedBy: "task-1",
    content: "api_key=abcdef1234567890",
  });

  assert.equal(artifactRepo.listArtifactsByTrace("tr-non-raw").length, 1);
  assert.equal(artifactRepo.listArtifactsByTrace("tr-non-restricted").length, 1);
});
