import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.js";
import { getToolRegistry } from "../src/tools/index.js";

test("loadConfig returns required fields", () => {
  const c = loadConfig({ AGENTS_WORKSPACE: "/tmp/aw" });
  assert.equal(c.workspace, "/tmp/aw");
  assert.ok(c.stateDb.includes("state.db"));
  assert.ok(c.auditLog.includes("events.jsonl"));
});

test("loadConfig defaults are local to repo workspace", () => {
  const c = loadConfig({});
  assert.ok(c.workspace.endsWith("/workspace"));
});

test("tool registry exposes orchestration and task tools", () => {
  assert.deepEqual(
    getToolRegistry().map((tool) => tool.name),
    [
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
    ],
  );
});
