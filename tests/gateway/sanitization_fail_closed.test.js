import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  configureArtifactStore,
  put,
  _resetSanitizeForTests,
  _setSanitizeForTests,
} from "../../gateway/src/core/artifact_store.js";
import { configureAudit, query as queryAudit, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { configureSanitizer } from "../../gateway/src/core/sanitizer.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import * as artifactRepo from "../../gateway/src/core/repositories/artifact_repo.js";
import { buildArtifactTools } from "../../gateway/src/tools/artifact.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const GOOD_RULES_PATH = path.join(REPO_ROOT, "policies", "sanitization-rules.json");
const registries = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });

function fresh({ rulesPath = GOOD_RULES_PATH } = {}) {
  resetState();
  resetAudit();
  _resetSanitizeForTests();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "sanitize-fail-"));
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
  configureArtifactStore({ artifactStoreRoot: path.join(workspace, "artifacts") });
  configureSanitizer({ rulesPath: typeof rulesPath === "function" ? rulesPath(workspace) : rulesPath });
  return workspace;
}

function artifactTools() {
  return Object.fromEntries(buildArtifactTools({ registries }).map((tool) => [tool.name, tool]));
}

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

function putRawRestricted(content = "api_key=abcdef1234567890") {
  return put({
    traceId: "tr-fail-closed",
    kind: "raw_diff",
    classification: "restricted",
    producedBy: "task-1",
    content,
  });
}

function putRawRestrictedWithSanitizerFailure(content = "raw secret should not leak") {
  _setSanitizeForTests(() => {
    throw new Error("synthetic sanitizer failure");
  });
  try {
    return putRawRestricted(content);
  } finally {
    _resetSanitizeForTests();
  }
}

test("sanitizer failure stores raw but does not create sanitized artifact", async () => {
  fresh();

  const raw = putRawRestrictedWithSanitizerFailure();
  const artifacts = artifactRepo.listArtifactsByTrace("tr-fail-closed");

  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].artifact_id, raw.artifactId);

  const failedEvents = await queryAudit({ traceId: "tr-fail-closed", type: "SANITIZATION_FAILED" });
  assert.equal(failedEvents.length, 1);
  assert.equal(failedEvents[0].sourceArtifactId, raw.artifactId);
  assert.equal(failedEvents[0].error, "synthetic sanitizer failure");
});

test("cross-boundary get without sanitized artifact denies and does not leak raw", async () => {
  fresh();
  const raw = putRawRestrictedWithSanitizerFailure("raw secret should not leak");
  const tools = artifactTools();

  const result = parseToolResult(
    await tools["artifact.get"].handler({
      artifactId: raw.artifactId,
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
    }),
  );

  assert.equal(result.error, "POLICY_DENIED");
  assert.equal(result.content, undefined);
  assert.equal(JSON.stringify(result).includes("raw secret should not leak"), false);
  assert.equal(result.decision.ruleId, "sanitization.missing");

  const missingEvents = await queryAudit({ traceId: "tr-fail-closed", type: "SANITIZATION_MISSING_DENY" });
  assert.equal(missingEvents.length, 1);
  assert.equal(missingEvents[0].sourceArtifactId, raw.artifactId);
});

test("cross-boundary get returns sanitized artifact when available", async () => {
  fresh();
  const raw = putRawRestricted("api_key=abcdef1234567890");
  const tools = artifactTools();

  const result = parseToolResult(
    await tools["artifact.get"].handler({
      artifactId: raw.artifactId,
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
    }),
  );

  assert.equal(result.error, undefined);
  assert.equal(result.kind, "raw_diff_sanitized");
  assert.equal(result.classification, "internal");
  assert.equal(result.sanitized_from, raw.artifactId);
  assert.equal(result.content, "api_key=<REDACTED-SECRET>");
});
