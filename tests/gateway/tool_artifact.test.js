import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configureArtifactStore } from "../../gateway/src/core/artifact_store.js";
import {
  configureAudit,
  query as queryAudit,
  _resetForTests as resetAudit,
} from "../../gateway/src/core/audit.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { buildArtifactTools } from "../../gateway/src/tools/artifact.js";
import { getToolRegistry } from "../../gateway/src/tools/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const registries = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });

function fresh({ redisPublisher = null } = {}) {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-tool-"));
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({
    auditLog: path.join(workspace, "audit.jsonl"),
    redisPublisher,
  });
  configureArtifactStore({ artifactStoreRoot: path.join(workspace, "artifacts") });
}

function toolMap() {
  return Object.fromEntries(buildArtifactTools({ registries }).map((tool) => [tool.name, tool]));
}

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

test("artifact put and get return the same content without exposing path", async () => {
  fresh();
  const tools = toolMap();

  const created = parseToolResult(
    await tools["artifact.put"].handler({
      traceId: "tr-artifact",
      kind: "report",
      classification: "internal",
      producedBy: "task-1",
      content: "artifact body",
    }),
  );
  const loaded = parseToolResult(
    await tools["artifact.get"].handler({
      artifactId: created.artifactId,
      requesterAgent: "claude-code",
      requesterRole: "coder",
    }),
  );

  assert.match(created.artifactId, /^art-/);
  assert.equal(created.path, undefined);
  assert.equal(loaded.path, undefined);
  assert.equal(loaded.content, "artifact body");
});

test("artifact list returns only artifacts for the requested trace without paths", async () => {
  fresh();
  const tools = toolMap();

  await tools["artifact.put"].handler({
    traceId: "tr-a",
    kind: "report",
    classification: "internal",
    producedBy: "task-1",
    content: "a",
  });
  await tools["artifact.put"].handler({
    traceId: "tr-b",
    kind: "report",
    classification: "internal",
    producedBy: "task-1",
    content: "b",
  });

  const artifacts = parseToolResult(await tools["artifact.list"].handler({
    traceId: "tr-a",
    requesterAgent: "claude-code",
    requesterRole: "coder",
  }));

  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].trace_id, "tr-a");
  assert.equal(artifacts[0].path, undefined);
  const decisions = await queryAudit({ traceId: "tr-a", type: "POLICY_DECIDED" });
  assert.ok(decisions.some((event) => event.context?.action === "artifact.list"));
});

test("artifact list requires requester identity and denies unknown principals", async () => {
  fresh();
  const tools = toolMap();

  for (const args of [
    { traceId: "tr-a" },
    { traceId: "tr-a", requesterAgent: "claude-code" },
    { traceId: "tr-a", requesterRole: "coder" },
  ]) {
    const missing = await tools["artifact.list"].handler(args);
    assert.equal(missing.isError, true);
    assert.equal(parseToolResult(missing).error, "INVALID_INPUT");
  }

  const denied = parseToolResult(await tools["artifact.list"].handler({
    traceId: "tr-a",
    requesterAgent: "unknown-agent",
    requesterRole: "unknown-role",
  }));
  assert.equal(denied.error, "POLICY_DENIED");
});

test("artifact list policy audit stays local and does not change agents:events", async () => {
  const published = [];
  fresh({ redisPublisher: (entry) => published.push(entry) });
  const tools = toolMap();

  const listed = parseToolResult(await tools["artifact.list"].handler({
    traceId: "tr-local-list-audit",
    requesterAgent: "claude-code",
    requesterRole: "coder",
  }));
  const decisions = await queryAudit({
    traceId: "tr-local-list-audit",
    type: "POLICY_DECIDED",
  });

  assert.deepEqual(listed, []);
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].context?.action, "artifact.list");
  assert.deepEqual(published, []);
});

test("artifact tools validate input", async () => {
  const tools = toolMap();

  const result = await tools["artifact.put"].handler({ traceId: "tr-missing" });
  const data = parseToolResult(result);

  assert.equal(result.isError, true);
  assert.equal(data.error, "INVALID_INPUT");
});

test("tool registry exposes artifact tools", () => {
  const names = getToolRegistry().map((tool) => tool.name);

  assert.ok(names.includes("artifact.put"));
  assert.ok(names.includes("artifact.get"));
  assert.ok(names.includes("artifact.list"));
});
