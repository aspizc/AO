import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { initState, _resetForTests as resetState, getDb } from "../../gateway/src/core/state.js";
import { configureAudit, query } from "../../gateway/src/core/audit.js";
import * as approvals from "../../gateway/src/core/repositories/approval_repo.js";
import { request, respond, poll, invalidatePromptApproval } from "../../gateway/src/services/approval_service.js";
import { createSessionPromptWatcher } from "../../gateway/src/services/session_prompt_service.js";

const crashFixture = fileURLToPath(new URL("./session_prompt_crash_fixture.mjs", import.meta.url));
function fresh() {
  resetState();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "a06-crash-"));
  initState({ stateDb: path.join(directory, "state.db") });
  configureAudit({ auditLog: path.join(directory, "audit.jsonl") });
  return directory;
}
function approval(context = {}) {
  return request({ traceId: "trace", action: "session.prompt.command", requestedBy: "codex", context: { command: "npm test", target: "%1", ...context }, config: { autoApproveScopes: ["session.prompt.command"] } });
}

test("process crash after delivered CR leaves a write-ahead attempt and recovery reports uncertain without replay", async (t) => {
  resetState();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "a06-process-crash-"));
  const crashed = spawnSync(process.execPath, [crashFixture, directory], { encoding: "utf8", timeout: 5000 });
  assert.equal(crashed.status, 75, crashed.stderr);
  assert.deepEqual(fs.readFileSync(path.join(directory, "child_received")), Buffer.from("\r"));
  initState({ stateDb: path.join(directory, "state.db") });
  configureAudit({ auditLog: path.join(directory, "audit.jsonl") });
  const approvalId = fs.readFileSync(path.join(directory, "approval_id"), "utf8");
  const attemptsBeforeRecovery = await query({ type: "SESSION_PROMPT_ANSWER_ATTEMPT" });
  const stateBeforeRecovery = JSON.parse(approvals.getApproval(approvalId).payload);
  const writes = [];
  const watcher = createSessionPromptWatcher({ adapters: { get() { writes.push("unexpected adapter lookup"); throw new Error("an orphan cannot reach transport"); } }, registries: {} });
  try {
    const response = respond({ approvalId, decision: "granted", decidedBy: "human-after-restart" });
    const responseAgain = respond({ approvalId, decision: "granted", decidedBy: "human-after-restart" });
    const observed = poll({ approvalId });
    const watcherResult = watcher.answer({ approvalId });
    t.diagnostic(JSON.stringify({ receivedHex: fs.readFileSync(path.join(directory, "child_received")).toString("hex"),
      beforeRecovery: stateBeforeRecovery, attemptOutcomesBeforeRecovery: attemptsBeforeRecovery.map((event) => event.outcome),
      recovered: response.promptAnswer, replayInputs: writes.length, answeredEvents: (await query({ type: "SESSION_PROMPT_ANSWERED" })).length }));
    assert.ok(attemptsBeforeRecovery.some((event) => event.outcome === "attempting" && event.approvalId === approvalId), "an attempt audit must precede the received CR and process death");
    assert.equal(stateBeforeRecovery.consumed, true);
    assert.equal(stateBeforeRecovery.promptAnswer.status, "in_flight");
    assert.equal(stateBeforeRecovery.promptAnswer.outcome, "attempting");
    for (const result of [response.promptAnswer, responseAgain.promptAnswer, observed.promptAnswer, watcherResult]) {
      assert.equal(result.status, "not_answered");
      assert.equal(result.outcome, "uncertain");
      assert.equal(result.reason, "transport_uncertain_after_restart");
    }
    assert.equal((await query({ type: "SESSION_PROMPT_ANSWERED" })).length, 0);
    assert.ok((await query({ type: "SESSION_PROMPT_INVALIDATED" })).some((event) => event.outcome === "uncertain"));
    assert.deepEqual(writes, []);
    assert.deepEqual(fs.readFileSync(path.join(directory, "child_received")), Buffer.from("\r"));
  } finally { watcher.close(); }
});

test("consume CAS writes an in-flight marker and terminal CAS cannot overwrite a recovered result", () => {
  fresh();
  const pending = approval();
  const before = approvals.getApproval(pending.approvalId);
  const marker = { status: "in_flight", outcome: "attempting", response: "Enter", target: "%1", attemptedAt: new Date().toISOString() };
  const token = approvals.consumePromptApproval(pending.approvalId, before.payload, marker);
  const consumed = approvals.getApproval(pending.approvalId);
  assert.equal(JSON.parse(consumed.payload).promptAnswer.status, "in_flight");
  assert.equal(approvals.consumePromptApproval(pending.approvalId, before.payload, marker), false);
  const recovered = invalidatePromptApproval(pending.approvalId);
  assert.equal(recovered.outcome, "uncertain");
  assert.equal(approvals.recordPromptAnswer(pending.approvalId, { status: "answered", outcome: "sent" }, token), false);
  assert.equal(poll(pending).promptAnswer.outcome, "uncertain");
});

test("legacy consumed rows and in-flight rows are uncertain through every invalidation entry point", async () => {
  for (const inFlight of [false, true]) {
    for (const route of ["respond", "watcher", "invalidate"]) {
      fresh();
      const pending = approval();
      const row = approvals.getApproval(pending.approvalId);
      const context = { ...JSON.parse(row.payload), consumed: true, ...(inFlight ? { promptAnswer: { status: "in_flight", outcome: "attempting" } } : {}) };
      getDb().prepare("UPDATE approvals SET payload = ? WHERE approval_id = ?").run(JSON.stringify(context), pending.approvalId);
      const watcher = createSessionPromptWatcher({ adapters: {}, registries: {} });
      try {
        if (route === "respond") respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human" });
        else if (route === "watcher") watcher.answer(pending);
        else invalidatePromptApproval(pending.approvalId, "session_stopped");
        assert.equal(poll(pending).promptAnswer.outcome, "uncertain", `${route}, inFlight=${inFlight}`);
        assert.equal(poll(pending).promptAnswer.reason, "transport_uncertain_after_restart");
        assert.equal((await query({ type: "SESSION_PROMPT_INVALIDATED" }))[0].outcome, "uncertain");
      } finally { watcher.close(); }
    }
  }
});
