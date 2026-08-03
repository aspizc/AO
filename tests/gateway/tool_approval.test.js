import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { buildApprovalTools } from "../../gateway/src/tools/approval.js";
import { getToolRegistry } from "../../gateway/src/tools/index.js";

function fresh() {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "tool-approval-"));
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
}

function approvalTools() {
  return Object.fromEntries(buildApprovalTools().map((tool) => [tool.name, tool]));
}

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

test("tool registry exposes approval tools", () => {
  const names = getToolRegistry().map((tool) => tool.name);

  assert.ok(names.includes("approval.request"));
  assert.ok(names.includes("approval.respond"));
  assert.ok(names.includes("approval.poll"));
  assert.ok(names.includes("approval.wait"));
});

test("approval request tool returns pending without blocking", async () => {
  fresh();
  const startedAt = Date.now();
  const result = parseToolResult(
    await approvalTools()["approval.request"].handler({
      traceId: "tr-tool-request",
      action: "git.push",
      requestedBy: "orchestrator",
      context: { branch: "main" },
    }),
  );
  const elapsedMs = Date.now() - startedAt;
  const events = await query({ traceId: "tr-tool-request" });

  assert.equal(result.status, "pending");
  assert.match(result.approvalId, /^apr-/);
  assert.ok(elapsedMs < 100);
  assert.ok(events.some((event) => event.type === "APPROVAL_REQUIRED"));
});

test("approval respond and poll tools return current status", async () => {
  fresh();
  const tools = approvalTools();
  const pending = parseToolResult(
    await tools["approval.request"].handler({
      traceId: "tr-tool-respond",
      action: "dependency.change",
      requestedBy: "coder",
    }),
  );

  const granted = parseToolResult(
    await tools["approval.respond"].handler({
      approvalId: pending.approvalId,
      decision: "granted",
      decidedBy: "operator",
      note: "ok",
    }),
  );
  const polled = parseToolResult(await tools["approval.poll"].handler({ approvalId: pending.approvalId }));
  const events = await query({ traceId: "tr-tool-respond" });

  assert.equal(granted.status, "granted");
  assert.equal(polled.status, "granted");
  assert.ok(events.some((event) => event.type === "APPROVAL_GRANTED"));
});

test("approval respond tool supports denied decisions", async () => {
  fresh();
  const tools = approvalTools();
  const pending = parseToolResult(
    await tools["approval.request"].handler({
      traceId: "tr-tool-denied",
      action: "git.push",
      requestedBy: "orchestrator",
    }),
  );

  const denied = parseToolResult(
    await tools["approval.respond"].handler({
      approvalId: pending.approvalId,
      decision: "denied",
      decidedBy: "operator",
      note: "no",
    }),
  );
  const events = await query({ traceId: "tr-tool-denied" });

  assert.equal(denied.status, "denied");
  assert.ok(events.some((event) => event.type === "APPROVAL_DENIED"));
});

test("approval respond returns the catalogued safe code for a missing approval", async () => {
  fresh();
  const tools = approvalTools();
  const result = await tools["approval.respond"].handler({
    approvalId: "apr-missing",
    decision: "granted",
    decidedBy: "operator",
  });

  assert.equal(result.isError, true);
  assert.deepEqual(parseToolResult(result), {
    error: "NOT_FOUND",
    code: "NOT_FOUND",
    message: "resource not found",
  });
});
