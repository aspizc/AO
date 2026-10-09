import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { initState, getDb, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { configureAudit, query } from "../../gateway/src/core/audit.js";
import { createOrchestration } from "../../gateway/src/core/repositories/orchestration_repo.js";
import * as tasks from "../../gateway/src/core/repositories/task_repo.js";
import * as sessions from "../../gateway/src/core/repositories/session_repo.js";
import * as approvals from "../../gateway/src/core/repositories/approval_repo.js";
import { createSessionPromptWatcher } from "../../gateway/src/services/session_prompt_service.js";
import { recognizeCodexPrompt } from "../../gateway/src/adapters/codex_adapter.js";
import { answerSessionPrompt, issuePromptAnswer } from "../../gateway/src/adapters/session_prompt.js";
import { promptTransportFixture } from "./session_prompt_transport_fixture.js";

const pane = fs.readFileSync(new URL("./fixtures/session_prompts/codex-0.162-command.txt", import.meta.url), "utf8");
function fresh(t, { intercept = null, beforeAuthorize = null, selectedPane = pane, geometry = {}, guardResult = null } = {}) {
  resetState();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "a06-diagnostics-"));
  initState({ stateDb: path.join(directory, "state.db") });
  configureAudit({ auditLog: path.join(directory, "audit.jsonl") });
  const now = new Date().toISOString();
  createOrchestration({ sessionId: "owner", traceId: "trace", callerAgent: "claude-code", callerRole: "orchestrator", status: "active", goal: "prompt diagnostic", createdAt: now });
  tasks.createTask({ taskId: "task", traceId: "trace", assignedAgent: "codex", assignedRole: "coder", repo: "fixture", status: "pending", createdAt: now, closedAt: null });
  sessions.createSession({ sessionId: "session", taskId: "task", traceId: "trace", agent: "codex", role: "coder", tmuxTarget: "fixture", status: "running", startedAt: now, closedAt: null });
  const capture = { snapshot: selectedPane, target: "%1", serverPid: "100", panePid: "200", ...geometry };
  const inputs = [];
  const transport = promptTransportFixture({ current: () => ({ ...capture, snapshot: selectedPane }), onInput: (byte) => inputs.push(byte), guardResult });
  const roleData = { allowActions: ["code.write", "session.prompt.command"], denyActions: [], sessionPromptScopes: [] };
  const registries = { getRole: () => roleData,
    getAgent: () => ({ allowedRoles: ["coder"], allowedClassifications: ["internal"], requiresApprovalFor: [] }),
    getRepo: () => ({ classification: "internal", allowedAgents: ["codex"] }), getProtectedBranches: () => [] };
  const fx = { inputs, transport, roleData, capture, directory, mock: t.mock };
  const run = (args, options) => {
    const result = transport.run(args, options);
    if (args[0] === "save-buffer") beforeAuthorize?.(fx);
    return intercept ? intercept(args, result, fx) : result;
  };
  fx.adapter = { capturePrompt: () => capture, recognizePrompt: recognizeCodexPrompt,
    answerPrompt: ({ permit }) => answerSessionPrompt({ permit, run }) };
  fx.watcher = createSessionPromptWatcher({ adapters: { get: () => fx.adapter }, registries });
  fx.pending = fx.watcher.observe({ sessionId: "session" });
  fx.id = fx.pending?.approvalId;
  if (fx.id) approvals.decideApproval(fx.id, "granted", "operator");
  t.after(() => { t.mock.restoreAll(); fx.watcher.close(); resetState(); fs.rmSync(directory, { recursive: true, force: true }); });
  return fx;
}
async function assertRefusal(fx, detail, reason = "guard_refused") {
  const answer = fx.watcher.answer({ approvalId: fx.id });
  assert.equal(answer.status, "not_answered");
  assert.equal(answer.outcome, "refused");
  assert.equal(answer.reason, reason);
  assert.equal(answer.detail, detail, "the fixed stage must reach the answer contract");
  assert.equal(approvals.promptAnswerResult(approvals.getApproval(fx.id)).detail, detail, "the stage must survive in durable state");
  const events = await query({ type: "SESSION_PROMPT_ANSWER_ATTEMPT" });
  assert.deepEqual(events.map((event) => [event.outcome, event.detail]), [["refused", detail]], "terminal audit must identify the same stage without an input attempt");
  assert.deepEqual(fx.inputs, []);
  assert.equal(fx.transport.calls.some((args) => args[0] === "agents-submit-v1" || args[0] === "send-keys"), false);
  assert.equal(fx.transport.buffers.size, 0);
  assert.equal((await query({ type: "SESSION_PROMPT_ANSWERED" })).length, 0);
  fx.watcher.answer({ approvalId: fx.id });
  assert.deepEqual(fx.inputs, [], "diagnostics must not rearm or retry authority");
}

for (const [stage, options] of [
  ["transport_unavailable", { intercept: (args, result) => args.at(-1) === "#{version}" ? { ...result, stdout: "3.6\n" } : result }],
  ["target_unavailable", { intercept: (args, result) => args.at(-1)?.includes("pane_in_mode") ? { ...result, stdout: "100|%1|200|1|0|0\n" } : result }],
  ["geometry_unavailable", { intercept: (args, result) => args.at(-1)?.includes("pane_width") ? { ...result, stdout: "100|%1|200|80|40|81|10\n" } : result }],
  ["evidence_unavailable", { intercept: (args, result) => args[0] === "save-buffer" ? { ...result, stdout: Buffer.from([0xff]) } : result }],
  ["state_changed", { intercept: (args, result, fx) => args.at(-1)?.includes("pane_in_mode") && fx.transport.calls.filter((call) => call.at(-1)?.includes("pane_in_mode")).length === 2 ? { ...result, stdout: "101|%1|200|0|0|0\n" } : result }],
  ["capture_mismatch", { intercept: (args, result) => args[0] === "save-buffer" ? { ...result, stdout: Buffer.from(pane + "changed") } : result }],
  ["recognizer_mismatch", { beforeAuthorize: (fx) => { fx.adapter.recognizePrompt = () => null; } }],
  ["approval_not_granted", { beforeAuthorize: (fx) => { getDb().prepare("UPDATE approvals SET status = 'denied' WHERE approval_id = ?").run(fx.id); } }],
  ["approval_binding_mismatch", { beforeAuthorize: (fx) => { getDb().prepare("UPDATE approvals SET trace_id = NULL WHERE approval_id = ?").run(fx.id); } }],
  ["session_not_live", { beforeAuthorize: () => sessions.setSessionStatus("session", "closed") }],
  ["policy_denied", { beforeAuthorize: (fx) => { fx.roleData.denyActions.push("code.write"); } }],
  ["payload_mismatch", { beforeAuthorize: (fx) => { const row = approvals.getApproval(fx.id); getDb().prepare("UPDATE approvals SET payload = ? WHERE approval_id = ?").run(JSON.stringify({ ...JSON.parse(row.payload), command: "different" }), fx.id); } }],
  ["consume_lost", { beforeAuthorize: (fx) => {
    const db = getDb(), prepare = db.prepare.bind(db);
    fx.mock.method(db, "prepare", (sql) => {
      if (sql === "UPDATE approvals SET payload = ? WHERE approval_id = ? AND status = 'granted' AND payload = ?") return { run: () => ({ changes: 0 }) };
      return prepare(sql);
    });
  } }],
]) {
  test(`pre-attempt diagnostic ${stage} persists and audits the exact stage without input`, async (t) => {
    const fx = fresh(t, options);
    await assertRefusal(fx, stage);
  });
}

test("pre-attempt diagnostic audit_failed persists and audits the exact stage without input", async (t) => {
  const fx = fresh(t);
  const append = fs.appendFileSync;
  t.mock.method(fs, "appendFileSync", (file, data, ...options) => {
    const event = JSON.parse(String(data));
    if (event.type === "SESSION_PROMPT_ANSWER_ATTEMPT" && event.outcome === "attempting") throw new Error("sensitive arbitrary error ignored");
    return append(file, data, ...options);
  });
  await assertRefusal(fx, "audit_failed");
});

test("pre-attempt diagnostic service capture mismatch is independently classified", async (t) => {
  let reading = false, reads = 0;
  const fx = fresh(t, { beforeAuthorize: () => { reading = true; } });
  Object.defineProperty(fx.capture, "snapshot", { get: () => reading && ++reads > 2 ? pane + "changed" : pane });
  // The transport fixture reads a spread capture at each call; bypass its getter
  // outside the two consecutive approval-binding comparisons.
  const run = fx.transport.run;
  fx.adapter.answerPrompt = ({ permit }) => answerSessionPrompt({ permit, run: (args, options) => {
    reading = false;
    const result = run(args, options);
    if (args.at(-1)?.includes("pane_width") && fx.transport.calls.filter((call) => call.at(-1)?.includes("pane_width")).length === 2) { reading = true; reads = 0; }
    return result;
  } });
  await assertRefusal(fx, "capture_mismatch");
});

for (const [stage, response, authorize] of [
  ["invalid_response", "p", () => true],
  ["authorization_refused", "Enter", () => false],
]) test(`pre-attempt diagnostic ${stage} preserves the low-level refusal outcome`, () => {
  const capture = { snapshot: pane, target: "%1", serverPid: "100", panePid: "200" };
  const inputs = [], outcomes = [];
  const fx = promptTransportFixture({ current: () => capture, onInput: (byte) => inputs.push(byte) });
  const permit = issuePromptAnswer({ tmuxTarget: "fixture", expected: capture, response, authorize,
    onOutcome: (outcome, detail) => outcomes.push([outcome, detail]) });
  assert.equal(answerSessionPrompt({ permit, run: fx.run }), false);
  assert.deepEqual(outcomes, [["refused", stage]]);
  assert.deepEqual(inputs, []);
  assert.equal(fx.calls.some((args) => args[0] === "agents-submit-v1"), false);
});

test("successful answer receives no pre-attempt diagnostic", async (t) => {
  const fx = fresh(t);
  const answer = fx.watcher.answer({ approvalId: fx.id });
  assert.equal(answer.status, "answered");
  assert.equal(answer.outcome, "sent");
  assert.equal(Object.hasOwn(answer, "detail"), false);
  assert.deepEqual(fx.inputs, ["\r"]);
  assert.equal((await query({ type: "SESSION_PROMPT_ANSWER_ATTEMPT" })).every((event) => !Object.hasOwn(event, "detail")), true);
});

for (const [stage, options, reason] of [
  ["unknown_prompt", { selectedPane: "Retry with a faster model?\n› 1. Switch model\n  2. Keep current model\n" }, "human_intervention_required"],
  ["policy_denied", {}, "policy_denied"],
]) test(`initial refusal diagnostic ${stage} preserves its original reason`, async (t) => {
  const fx = fresh(t, options);
  if (stage === "policy_denied") fx.roleData.denyActions.push("code.write");
  await assertRefusal(fx, stage, reason);
});

test("attempted atomic guard refusal receives no pre-attempt diagnostic", async (t) => {
  const fx = fresh(t, { guardResult: () => ({ status: 1, stderr: "agents: guarded submit refused\n" }) });
  const answer = fx.watcher.answer({ approvalId: fx.id });
  assert.equal(answer.status, "not_answered");
  assert.equal(answer.outcome, "refused");
  assert.equal(answer.reason, "guard_refused");
  assert.equal(Object.hasOwn(answer, "detail"), false);
  assert.deepEqual(fx.inputs, []);
  assert.equal(fx.transport.calls.filter((args) => args[0] === "agents-submit-v1").length, 1);
  assert.deepEqual((await query({ type: "SESSION_PROMPT_ANSWER_ATTEMPT" })).map((event) => [event.outcome, Object.hasOwn(event, "detail")]), [["attempting", false], ["refused", false]]);
});

// Operator live attempt 2: 80 columns, 24 rows, pending-wrap x=80, y=23.
// Pane state carries the real observed pending-wrap coordinates, not display interception.
test("live Codex 0.162 pending-wrap geometry 80|24|80|23 delivers the approved captured command", async (t) => {
  const selectedPane = fs.readFileSync(new URL("./fixtures/session_prompts/codex-0.162-pending-wrap-command.txt", import.meta.url), "utf8");
  const fx = fresh(t, { selectedPane, geometry: { width: "80", height: "24", cursorX: "80", cursorY: "23" } });
  assert.equal(fx.pending.kind, "command");
  assert.equal(fx.pending.command, "touch ~/a06m");
  const answer = fx.watcher.answer({ approvalId: fx.id });
  assert.deepEqual({ status: answer.status, outcome: answer.outcome, detail: answer.detail },
    { status: "answered", outcome: "sent", detail: undefined }, "pending-wrap cursor must remain bound to guarded delivery");
  assert.deepEqual(fx.inputs, ["\r"]);
  assert.deepEqual((await query({ type: "SESSION_PROMPT_ANSWER_ATTEMPT" })).map((event) => event.outcome), ["attempting", "sent"]);
});

for (const [x, y] of [["81", "23"], ["80", "24"]]) test(`invalid prompt boundary ${x}|${y} refuses at geometry before attempting`, async (t) => {
  const fx = fresh(t, { geometry: { width: "80", height: "24", cursorX: x, cursorY: y } });
  await assertRefusal(fx, "geometry_unavailable");
});
for (const x of ["79", "80"]) test(`bound prompt cursor ${x} forwards observed geometry unchanged`, async (t) => {
  const fx = fresh(t, { geometry: { width: "80", height: "24", cursorX: x, cursorY: "23" } });
  assert.equal(fx.watcher.answer({ approvalId: fx.id }).status, "answered");
  const args = fx.transport.calls.find((call) => call[0] === "agents-submit-v1");
  assert.equal(args[args.indexOf("-c") + 1], x);
  assert.equal(args[args.indexOf("-l") + 1], "23");
  assert.deepEqual(fx.inputs, ["\r"]);
});
for (const version of ["3.6a-agents.3", "3.6a", "3.6a-agents.40"]) test(`prompt refuses incompatible runtime ${version} before input`, async (t) => {
  const fx = fresh(t, { intercept: (args, result) => args.at(-1) === "#{version}" ? { ...result, stdout: version + "\n" } : result });
  await assertRefusal(fx, "transport_unavailable");
});
test("pending-wrap geometry cannot authorize a nonprompt pane", async (t) => {
  const fx = fresh(t, { selectedPane: "shell ready $\n", geometry: { width: "80", cursorX: "80" } });
  assert.equal(fx.pending, null);
  assert.deepEqual(fx.inputs, []);
  assert.equal(fx.transport.calls.length, 0);
});


test("pending-wrap unknown menu remains human-only without input", async (t) => {
  const fx = fresh(t, {
    selectedPane: "Retry with a faster model?\n› 1. Switch model\n  2. Keep current model\n",
    geometry: { width: "80", height: "24", cursorX: "80", cursorY: "23" },
  });
  assert.equal(fx.pending.kind, "unknown");
  await assertRefusal(fx, "unknown_prompt", "human_intervention_required");
});

test("pending-wrap approved capture replaced by nonprompt refuses at capture binding", async (t) => {
  const selectedPane = fs.readFileSync(new URL("./fixtures/session_prompts/codex-0.162-pending-wrap-command.txt", import.meta.url), "utf8");
  const fx = fresh(t, {
    selectedPane,
    geometry: { width: "80", height: "24", cursorX: "80", cursorY: "23" },
    intercept: (args, result) => args[0] === "save-buffer"
      ? { ...result, stdout: Buffer.from("shell ready $\n") } : result,
  });
  assert.equal(fx.pending.kind, "command");
  await assertRefusal(fx, "capture_mismatch");
});
