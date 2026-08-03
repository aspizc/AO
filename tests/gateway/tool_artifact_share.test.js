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
import { buildArtifactTools } from "../../gateway/src/tools/artifact.js";
import { getToolRegistry } from "../../gateway/src/tools/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const registries = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });
const RULES_PATH = path.join(REPO_ROOT, "policies", "sanitization-rules.json");

function fresh() {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-share-tool-"));
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
  configureArtifactStore({ artifactStoreRoot: path.join(workspace, "artifacts") });
  configureSanitizer({ rulesPath: RULES_PATH });
}

function artifactTools() {
  return Object.fromEntries(buildArtifactTools({ registries }).map((tool) => [tool.name, tool]));
}

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

test("artifact share tool returns decision and original ID for allowed artifacts", async () => {
  fresh();
  const artifact = put({
    traceId: "tr-share-tool",
    kind: "review_notes",
    classification: "internal",
    producedBy: "task-1",
    content: "review notes",
  });

  const result = parseToolResult(
    await artifactTools()["artifact.share"].handler({
      artifactId: artifact.artifactId,
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
      traceId: "tr-share-tool",
    }),
  );

  assert.equal(result.decision, "allow");
  assert.equal(result.sharedArtifactId, artifact.artifactId);
});

test("artifact share tool returns sanitized ID for allow_with_sanitization", async () => {
  fresh();
  const raw = put({
    traceId: "tr-share-tool",
    kind: "raw_diff",
    classification: "restricted",
    producedBy: "task-1",
    content: "api_key=abcdef1234567890",
  });
  const sanitized = artifactRepo.findSanitizedFor(raw.artifactId);

  const result = parseToolResult(
    await artifactTools()["artifact.share"].handler({
      artifactId: raw.artifactId,
      requesterAgent: "claude-code",
      requesterRole: "reviewer",
      traceId: "tr-share-tool",
    }),
  );

  assert.equal(result.decision, "allow_with_sanitization");
  assert.equal(result.sharedArtifactId, sanitized.artifact_id);
});

test("tool registry exposes artifact share", () => {
  const names = getToolRegistry({ registries }).map((tool) => tool.name);

  assert.ok(names.includes("artifact.share"));
});
