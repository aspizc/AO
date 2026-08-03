import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { approvalBus, request, respond, waitForDecision } from "../../gateway/src/services/approval_service.js";
import { buildApprovalTools } from "../../gateway/src/tools/approval.js";
import { getToolRegistry } from "../../gateway/src/tools/index.js";

function fresh() {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "approval-wait-"));
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
}

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

async function waitUntilApprovalWaitIsListening(approvalId) {
  while (approvalBus.listenerCount(approvalId) === 0) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(approvalBus.listenerCount(approvalId), 1);
}

test("wait returns immediately when approval is already granted", async () => {
  fresh();
  const pending = request({ traceId: "tr-wait-granted", action: "git.push", requestedBy: "orchestrator" });
  respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "operator" });

  const result = await waitForDecision({ approvalId: pending.approvalId, timeoutMs: 1000, serverMaxMs: 1000 });

  assert.equal(result.status, "granted");
  assert.ok(result.decidedAt);
});

test("wait resolves when approval is granted later", async () => {
  fresh();
  const pending = request({ traceId: "tr-wait-later", action: "git.push", requestedBy: "orchestrator" });
  const waiting = waitForDecision({ approvalId: pending.approvalId, timeoutMs: 500, serverMaxMs: 500 });

  await waitUntilApprovalWaitIsListening(pending.approvalId);
  const decision = respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "operator" });
  const result = await waiting;

  assert.equal(decision.status, "granted");
  assert.equal(result.status, "granted");
});

test("wait resolves when approval is denied later", async () => {
  fresh();
  const pending = request({ traceId: "tr-wait-denied", action: "git.push", requestedBy: "orchestrator" });
  const waiting = waitForDecision({ approvalId: pending.approvalId, timeoutMs: 500, serverMaxMs: 500 });

  await waitUntilApprovalWaitIsListening(pending.approvalId);
  const decision = respond({ approvalId: pending.approvalId, decision: "denied", decidedBy: "operator" });
  const result = await waiting;

  assert.equal(decision.status, "denied");
  assert.equal(result.status, "denied");
});

test("wait returns pending after client timeout and audits timeout", async () => {
  fresh();
  const pending = request({ traceId: "tr-wait-client-timeout", action: "git.push", requestedBy: "orchestrator" });

  const result = await waitForDecision({ approvalId: pending.approvalId, timeoutMs: 120, serverMaxMs: 500 });
  const events = await query({ traceId: "tr-wait-client-timeout", type: "APPROVAL_WAIT_TIMEOUT" });

  assert.equal(result.status, "pending");
  assert.equal(events.length, 1);
  assert.equal(events[0].approvalId, pending.approvalId);
  assert.equal(events[0].timeoutMs, 120);
});

test("wait never exceeds server max timeout", async () => {
  fresh();
  const pending = request({ traceId: "tr-wait-server-cap", action: "git.push", requestedBy: "orchestrator" });
  const startedAt = Date.now();

  const result = await waitForDecision({ approvalId: pending.approvalId, timeoutMs: 10_000, serverMaxMs: 120 });
  const elapsedMs = Date.now() - startedAt;
  const events = await query({ traceId: "tr-wait-server-cap", type: "APPROVAL_WAIT_TIMEOUT" });

  assert.equal(result.status, "pending");
  assert.ok(elapsedMs < 1_200);
  assert.equal(events.length, 1);
  assert.equal(events[0].timeoutMs, 120);
});

test("concurrent waits are independent per approval id", async () => {
  fresh();
  const first = request({ traceId: "tr-wait-first", action: "git.push", requestedBy: "orchestrator" });
  const second = request({ traceId: "tr-wait-second", action: "git.push", requestedBy: "orchestrator" });
  const firstWait = waitForDecision({ approvalId: first.approvalId, timeoutMs: 500, serverMaxMs: 500 });
  const secondWait = waitForDecision({ approvalId: second.approvalId, timeoutMs: 120, serverMaxMs: 500 });

  await waitUntilApprovalWaitIsListening(first.approvalId);
  await waitUntilApprovalWaitIsListening(second.approvalId);
  const decision = respond({ approvalId: first.approvalId, decision: "granted", decidedBy: "operator" });

  assert.equal(decision.status, "granted");
  assert.deepEqual(
    (await Promise.all([firstWait, secondWait])).map((result) => result.status),
    ["granted", "pending"],
  );
});

test("approval wait tool is registered and bounded by config", async () => {
  fresh();
  const names = getToolRegistry({ config: { approvalMaxWaitMs: 125 } }).map((tool) => tool.name);
  const pending = request({ traceId: "tr-tool-wait", action: "git.push", requestedBy: "orchestrator" });
  const tools = Object.fromEntries(
    buildApprovalTools({ config: { approvalMaxWaitMs: 125 } }).map((tool) => [tool.name, tool]),
  );
  const startedAt = Date.now();

  const result = parseToolResult(
    await tools["approval.wait"].handler({ approvalId: pending.approvalId, timeoutMs: 10_000 }),
  );
  const elapsedMs = Date.now() - startedAt;
  const events = await query({ traceId: "tr-tool-wait", type: "APPROVAL_WAIT_TIMEOUT" });

  assert.ok(names.includes("approval.wait"));
  assert.equal(result.status, "pending");
  assert.ok(elapsedMs < 1_250);
  assert.equal(events.length, 1);
  assert.equal(events[0].timeoutMs, 125);
});
