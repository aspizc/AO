import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configureArtifactStore } from "../../gateway/src/core/artifact_store.js";
import { configureAudit, query as queryAudit, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { configureSanitizer } from "../../gateway/src/core/sanitizer.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { buildArtifactTools } from "../../gateway/src/tools/artifact.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const registries = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });
const RULES_PATH = path.join(REPO_ROOT, "policies", "sanitization-rules.json");

function fresh() {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-policy-"));
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
  configureArtifactStore({ artifactStoreRoot: path.join(workspace, "artifacts") });
  configureSanitizer({ rulesPath: RULES_PATH });
}

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

function artifactTools() {
  return Object.fromEntries(buildArtifactTools({ registries }).map((tool) => [tool.name, tool]));
}

async function putArtifact(tools, overrides = {}) {
  return parseToolResult(
    await tools["artifact.put"].handler({
      traceId: "tr-policy",
      kind: "raw_diff",
      classification: "restricted",
      producedBy: "task-1",
      content: "restricted diff",
      ...overrides,
    }),
  );
}

test("artifact get requires requester identity", async () => {
  fresh();
  const tools = artifactTools();
  const artifact = await putArtifact(tools);

  const result = await tools["artifact.get"].handler({ artifactId: artifact.artifactId });
  const data = parseToolResult(result);

  assert.equal(result.isError, true);
  assert.equal(data.error, "INVALID_INPUT");
});

test("Claude orchestrator is denied raw restricted artifacts without content", async () => {
  fresh();
  const tools = artifactTools();
  const artifact = await putArtifact(tools);

  const result = parseToolResult(
    await tools["artifact.get"].handler({
      artifactId: artifact.artifactId,
      requesterAgent: "claude-code",
      requesterRole: "orchestrator",
    }),
  );

  assert.equal(result.error, "POLICY_DENIED");
  assert.equal(result.content, undefined);
  assert.equal(result.decision.decision, "deny");

  const events = await queryAudit({ traceId: "tr-policy", type: "POLICY_DECIDED" });
  assert.equal(events.length, 1);
  assert.equal(events[0].decision, "deny");
  assert.equal(events[0].ruleId, "sanitization.orchestrator_raw");
});

test("Gemini restricted coder is allowed to read raw restricted artifacts", async () => {
  fresh();
  const tools = artifactTools();
  const artifact = await putArtifact(tools);

  const result = parseToolResult(
    await tools["artifact.get"].handler({
      artifactId: artifact.artifactId,
      requesterAgent: "gemini-cli",
      requesterRole: "restricted-coder",
    }),
  );

  assert.equal(result.error, undefined);
  assert.equal(result.content, "restricted diff");
});

test("non-raw internal artifacts can be read by allowed roles", async () => {
  fresh();
  const tools = artifactTools();
  const artifact = await putArtifact(tools, {
    kind: "review_notes",
    classification: "internal",
    content: "review notes",
  });

  const result = parseToolResult(
    await tools["artifact.get"].handler({
      artifactId: artifact.artifactId,
      requesterAgent: "claude-code",
      requesterRole: "coder",
    }),
  );

  assert.equal(result.content, "review notes");
});
