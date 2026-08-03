import { once } from "node:events";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { approvalBus, poll, request, respond } from "../../gateway/src/services/approval_service.js";
import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";

function fresh() {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "approval-service-"));
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
}

test("request returns pending immediately and audits required", async () => {
  fresh();

  const result = request({
    traceId: "tr-request",
    action: "git.push",
    requestedBy: "orchestrator",
    context: { branch: "main" },
  });
  const events = await query({ traceId: "tr-request" });

  assert.match(result.approvalId, /^apr-/);
  assert.equal(result.status, "pending");
  assert.equal(poll({ approvalId: result.approvalId }).status, "pending");
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "APPROVAL_REQUIRED");
  assert.equal(events[0].approvalId, result.approvalId);
});

test("respond grants pending approval, audits, and emits", async () => {
  fresh();
  const pending = request({ traceId: "tr-grant", action: "git.push", requestedBy: "orchestrator" });
  const emitted = once(approvalBus, pending.approvalId);

  const result = respond({
    approvalId: pending.approvalId,
    decision: "granted",
    decidedBy: "operator",
    note: "go",
  });
  const [event] = await emitted;
  const events = await query({ traceId: "tr-grant" });

  assert.equal(result.status, "granted");
  assert.equal(result.decidedBy, "operator");
  assert.equal(event.status, "granted");
  assert.equal(poll({ approvalId: pending.approvalId }).status, "granted");
  assert.ok(events.some((item) => item.type === "APPROVAL_GRANTED"));
});

test("respond denies pending approval", async () => {
  fresh();
  const pending = request({ traceId: "tr-deny", action: "dependency.change", requestedBy: "coder" });

  const result = respond({
    approvalId: pending.approvalId,
    decision: "denied",
    decidedBy: "operator",
    note: "no",
  });
  const events = await query({ traceId: "tr-deny" });

  assert.equal(result.status, "denied");
  assert.equal(poll({ approvalId: pending.approvalId }).status, "denied");
  assert.ok(events.some((item) => item.type === "APPROVAL_DENIED"));
});

test("respond is idempotent after approval is decided", () => {
  fresh();
  const pending = request({ traceId: "tr-twice", action: "git.push", requestedBy: "orchestrator" });

  respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "operator" });
  const second = respond({ approvalId: pending.approvalId, decision: "denied", decidedBy: "operator" });

  assert.equal(second.status, "granted");
});

test("poll returns not found for missing approval", () => {
  fresh();

  assert.deepEqual(poll({ approvalId: "apr-missing" }), { error: "NOT_FOUND" });
});

test("respond rejects invalid decision", () => {
  fresh();
  const pending = request({ traceId: "tr-invalid", action: "git.push", requestedBy: "orchestrator" });

  assert.throws(() => respond({ approvalId: pending.approvalId, decision: "expired" }), /invalid decision expired/);
});

test("respond rejects missing approval", () => {
  fresh();

  assert.throws(
    () => respond({ approvalId: "apr-missing", decision: "granted", decidedBy: "operator" }),
    /approval apr-missing not found/,
  );
});
