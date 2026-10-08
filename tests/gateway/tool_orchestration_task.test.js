import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configureAudit, query as queryAudit, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { buildOrchestrationTools } from "../../gateway/src/tools/orchestration.js";
import { buildTaskTools } from "../../gateway/src/tools/task.js";
import { getToolRegistry } from "../../gateway/src/tools/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const registries = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });

function fresh() {
  resetState();
  resetAudit();
  initState({ stateDb: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "tool-state-")), "state.db") });
  configureAudit({ auditLog: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "tool-audit-")), "audit.jsonl") });
}

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

test("orchestration tools create and view sessions", async () => {
  fresh();
  const tools = buildOrchestrationTools();
  const createTool = tools.find((tool) => tool.name === "orchestration.create");
  const viewTool = tools.find((tool) => tool.name === "orchestration.view");

  const created = parseToolResult(
    await createTool.handler({ callerAgent: "claude-code", callerRole: "orchestrator", goal: "Refactor X" }),
  );
  const viewed = parseToolResult(await viewTool.handler({ traceId: created.traceId }));

  assert.match(created.traceId, /^tr-/);
  assert.match(created.messageAccessToken, /^[0-9a-f]{64}$/);
  assert.equal(viewed.session.session_id, created.sessionId);
});

test("orchestration lifecycle tools defer cancellation without an observed outcome", async () => {
  fresh();
  const tools = Object.fromEntries(buildOrchestrationTools().map((tool) => [tool.name, tool]));
  const created = parseToolResult(
    await tools["orchestration.create"].handler({ callerAgent: "claude-code", callerRole: "orchestrator" }),
  );

  assert.equal(parseToolResult(await tools["orchestration.pause"].handler({ traceId: created.traceId })).status, "paused");
  assert.equal(parseToolResult(await tools["orchestration.resume"].handler({ traceId: created.traceId })).status, "active");

  const cancelResult = await tools["orchestration.cancel"].handler({ traceId: created.traceId });
  assert.equal(cancelResult.isError, true);
  assert.deepEqual(parseToolResult(cancelResult), {
    error: "TOOL_ERROR",
    code: "TOOL_ERROR",
    message: "tool operation failed",
  });

  const viewed = parseToolResult(
    await tools["orchestration.view"].handler({ traceId: created.traceId }),
  );
  assert.equal(viewed.session.status, "active");

  const events = await queryAudit({ traceId: created.traceId });
  assert.deepEqual(
    events.map((event) => event.type),
    ["ORCHESTRATION_CREATED", "ORCHESTRATION_PAUSED", "ORCHESTRATION_RESUMED"],
  );
});

test("task assign tool delegates to service and preserves audit", async () => {
  fresh();
  const createTool = buildOrchestrationTools().find((tool) => tool.name === "orchestration.create");
  const assignTool = buildTaskTools({ registries }).find((tool) => tool.name === "task.assign");
  const created = parseToolResult(
    await createTool.handler({ callerAgent: "claude-code", callerRole: "orchestrator" }),
  );

  const task = parseToolResult(
    await assignTool.handler({
      traceId: created.traceId,
      caller: { agent: "claude-code", role: "orchestrator" },
      target: { role: "restricted-coder", action: "code.write" },
      repo: "cvision",
      brief: "Update X",
    }),
  );

  assert.equal(task.assignedAgent, "gemini-cli");
  const events = await queryAudit({ traceId: created.traceId });
  assert.ok(events.some((event) => event.type === "TASK_CREATED"));
});

test("invalid tool arguments return INVALID_INPUT", async () => {
  const createTool = buildOrchestrationTools().find((tool) => tool.name === "orchestration.create");

  const result = await createTool.handler({});
  const data = parseToolResult(result);

  assert.equal(result.isError, true);
  assert.equal(data.error, "INVALID_INPUT");
});

test("tool registry exposes orchestration and task tools", () => {
  const names = getToolRegistry({ registries }).map((tool) => tool.name);

  assert.deepEqual(names, [
    "orchestration.create",
    "orchestration.view",
    "orchestration.pause",
    "orchestration.resume",
    "orchestration.cancel",
    "orchestration.complete",
    "task.assign",
    "agent.delegate",
    "agent.spawn",
    "agent.ask",
    "agent.view",
    "agent.kill",
    "artifact.put",
    "artifact.get",
    "artifact.list",
    "artifact.share",
    "approval.request",
    "approval.respond",
    "approval.poll",
    "approval.wait",
    "message.send",
    "message.list",
    "message.reply",
    "session.attach_info",
    "session.intervention_note",
    "coordination.status",
    "coordination.register",
    "coordination.heartbeat",
    "coordination.discover",
    "coordination.unregister",
    "coordination.send",
    "coordination.receive",
    "coordination.ack",
    "orchestration.reattach",
  ]);
});
