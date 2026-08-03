import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { buildSessionTools } from "../../gateway/src/tools/session.js";
import { getToolRegistry } from "../../gateway/src/tools/index.js";

function fresh() {
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "session-note-"));
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
}

function sessionTools() {
  return Object.fromEntries(buildSessionTools().map((tool) => [tool.name, tool]));
}

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

test("intervention note records audit and returns ok", async () => {
  fresh();

  const result = parseToolResult(
    await sessionTools()["session.intervention_note"].handler({
      sessionId: "session-1",
      traceId: "trace-1",
      note: "operator fixed shell prompt",
      by: "alice",
    }),
  );
  const events = await query({ traceId: "trace-1", type: "HUMAN_TMUX_INTERVENTION_NOTE" });

  assert.deepEqual(result, { ok: true });
  assert.equal(events.length, 1);
  assert.equal(events[0].sessionId, "session-1");
  assert.equal(events[0].by, "alice");
  assert.equal(events[0].note, "operator fixed shell prompt");
});

test("intervention note defaults by and truncates long notes", async () => {
  fresh();

  parseToolResult(
    await sessionTools()["session.intervention_note"].handler({
      sessionId: "session-1",
      traceId: "trace-1",
      note: "x".repeat(5000),
    }),
  );
  const events = await query({ traceId: "trace-1", type: "HUMAN_TMUX_INTERVENTION_NOTE" });

  assert.equal(events[0].by, "operator");
  assert.equal(events[0].note.length, 4000);
});

test("intervention note rejects empty notes", async () => {
  fresh();

  const result = await sessionTools()["session.intervention_note"].handler({
    sessionId: "session-1",
    traceId: "trace-1",
    note: "",
  });
  const data = parseToolResult(result);

  assert.equal(result.isError, true);
  assert.equal(data.error, "INVALID_INPUT");
});

test("tool registry exposes session intervention note", () => {
  const names = getToolRegistry().map((tool) => tool.name);

  assert.ok(names.includes("session.intervention_note"));
});
