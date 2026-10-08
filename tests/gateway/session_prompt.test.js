import { promptTransportFixture } from "./session_prompt_transport_fixture.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as codex from "../../gateway/src/adapters/codex_adapter.js";
import * as claude from "../../gateway/src/adapters/claude_adapter.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { configureAudit, query } from "../../gateway/src/core/audit.js";
import * as sessions from "../../gateway/src/core/repositories/session_repo.js";
import { createOrchestration } from "../../gateway/src/core/repositories/orchestration_repo.js";
import * as tasks from "../../gateway/src/core/repositories/task_repo.js";
import * as approvals from "../../gateway/src/core/repositories/approval_repo.js";
import { respond } from "../../gateway/src/services/approval_service.js";

// Reconstructed from the sheet's field evidence, not live acceptance captures.
const command = "Would you like to run the following command?\n\n  $ npm test\n\n› 1. Yes, proceed (y)\n  2. Yes, and don't ask again for this exact command (p)\n  3. No, and tell Codex what to do differently (esc)\n\nPress enter to confirm or esc to cancel";
const trust = "Do you trust the contents of this directory?\n\n  /tmp/a06-fixture\n\n› 1. Yes, proceed\n  2. No, quit\n\nPress enter to confirm or esc to cancel";
const permission = "Bash command\n\n  npm test\n  Run tests\n\nDo you want to proceed?\n❯ 1. Yes\n  2. Yes, and don't ask again for npm test commands\n  3. No\n\nEsc to cancel · Tab to amend";
const unknown = "Retry with a faster model?\n› 1. Switch model\n  2. Keep current model\nPress enter to confirm";

async function fresh({ scope = true, action = "test.run", role = "coder", auto = true, pane = command, guardResult = null } = {}) {
  resetState();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "a06-"));
  initState({ stateDb: path.join(directory, "state.db") });
  configureAudit({ auditLog: path.join(directory, "audit.jsonl") });
  createOrchestration({ sessionId: "orchestration", traceId: "trace", callerAgent: "claude-code", callerRole: "orchestrator", status: "active", goal: "prompt test", createdAt: new Date().toISOString() });
  tasks.createTask({ taskId: "task", traceId: "trace", assignedAgent: "codex", assignedRole: role, repo: "fixture", status: "running", createdAt: new Date().toISOString(), closedAt: null });
  tasks.setTaskStatus("task", "starting");
  tasks.setTaskStatus("task", "running");
  sessions.createSession({ sessionId: "session", taskId: "task", traceId: "trace", agent: "codex", role, tmuxTarget: "fixture", status: "running", startedAt: new Date().toISOString(), closedAt: null });
  const inputs = [];
  let current = { snapshot: pane, target: "%1", serverPid: "100", panePid: "200" };
  const adapter = {
    recognizePrompt: codex.recognizeCodexPrompt,
    capturePrompt: () => structuredClone(current),
    answerPrompt: null,
  };
  const { answerSessionPrompt } = await import("../../gateway/src/adapters/session_prompt.js");
  const transport = promptTransportFixture({ current: () => current, onInput: (byte) => inputs.push(byte), guardResult });
  adapter.answerPrompt = ({ permit }) => answerSessionPrompt({ permit, run: transport.run });
  const roleData = {
    allowActions: ["code.write", "test.run", "session.prompt.command"],
    denyActions: role === "reviewer" ? ["code.write", "test.run"] : [],
    sessionPromptScopes: scope ? [{ kind: "command", command: "npm test", action }] : [],
  };
  const registries = {
    getRole: () => roleData,
    getAgent: () => ({ allowedRoles: [role], allowedClassifications: ["internal"], requiresApprovalFor: [] }),
    getRepo: () => ({ classification: "internal", allowedAgents: ["codex"] }),
    getProtectedBranches: () => ["main"],
  };
  const { createSessionPromptWatcher } = await import("../../gateway/src/services/session_prompt_service.js");
  const watcher = createSessionPromptWatcher({ adapters: { get: () => adapter }, registries, config: { autoApproveScopes: auto ? ["session.prompt.command"] : [] } });
  return { watcher, inputs, roleData, change: (delta) => { current = { ...current, ...delta }; } };
}

test("codex command prompt is recognised with its exact command", () => {
  assert.deepEqual(codex.recognizeCodexPrompt(command), { kind: "command", command: "npm test", options: ["y", "p", "esc"] });
});
test("codex trust prompt is recognised", () => {
  assert.deepEqual(codex.recognizeCodexPrompt(trust), { kind: "trust", command: "/tmp/a06-fixture", options: ["1", "2"] });
});
test("claude permission dialog is recognised", () => {
  assert.deepEqual(claude.recognizeClaudePrompt(permission), { kind: "permission", command: "npm test", options: ["1", "2", "3"] });
});
test("an auto-approvable command is answered once by guarded Enter and audited", async () => {
  const fx = await fresh();
  const result = await fx.watcher.observe({ sessionId: "session" });
  await fx.watcher.observe({ sessionId: "session" });
  assert.equal(result.status, "answered");
  assert.deepEqual(fx.inputs, ["\r"]);
  const event = (await query({ type: "SESSION_PROMPT_ANSWERED" }))[0];
  assert.equal(event.command, "npm test");
  assert.equal(event.decidedBy, "operator-autonomous-mode");
  assert.equal(event.approvalId, result.approvalId);
  fx.watcher.close();
});
test("a NEVER_AUTO action is never answered", async () => {
  for (const action of ["dependency.change", "git.push.protected", "code.write.protected_branch"]) {
    const fx = await fresh({ action });
    assert.equal((await fx.watcher.observe({ sessionId: "session" })).status, "pending");
    assert.deepEqual(fx.inputs, []);
    fx.watcher.close();
  }
});
test("a command outside the role grant waits for approval_respond", async () => {
  const fx = await fresh({ role: "reviewer" });
  const pending = await fx.watcher.observe({ sessionId: "session" });
  assert.equal(pending.status, "pending");
  respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human" });
  await fx.watcher.answer({ approvalId: pending.approvalId });
  assert.deepEqual(fx.inputs, [], "human approval cannot remove a role deny");
  fx.watcher.close();
});
test("the p option is never sent", async () => {
  const fx = await fresh({ auto: false });
  const pending = await fx.watcher.observe({ sessionId: "session" });
  respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human", note: "choose p" });
  await fx.watcher.answer({ approvalId: pending.approvalId });
  assert.deepEqual(fx.inputs, ["\r"]);
  assert.equal((await query({ type: "SESSION_PROMPT_ANSWERED" }))[0].decidedBy, "human");
  fx.watcher.close();
});
test("an unknown prompt is surfaced, not answered", async () => {
  const fx = await fresh({ pane: unknown });
  const pending = await fx.watcher.observe({ sessionId: "session" });
  assert.equal(approvals.getApproval(pending.approvalId).action, "session.prompt.unknown");
  respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human" });
  await fx.watcher.answer({ approvalId: pending.approvalId });
  assert.deepEqual(fx.inputs, []);
  fx.watcher.close();
});
test("changed or disappeared approved prompt receives no keys", async () => {
  for (const delta of [{ snapshot: "working" }, { snapshot: command.replace("npm test", "npm install") }, { snapshot: command.replace("(y)", "(p)") }, { target: "%2" }, { panePid: "201" }, { serverPid: "101" }]) {
    const fx = await fresh({ auto: false });
    const pending = await fx.watcher.observe({ sessionId: "session" });
    fx.change(delta);
    respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human" });
    await fx.watcher.answer({ approvalId: pending.approvalId });
    assert.deepEqual(fx.inputs, []);
    fx.watcher.close();
  }
});
test("replayed approval does not send a second answer", async () => {
  const fx = await fresh({ auto: false });
  const pending = await fx.watcher.observe({ sessionId: "session" });
  respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human" });
  await Promise.all([fx.watcher.answer({ approvalId: pending.approvalId }), fx.watcher.answer({ approvalId: pending.approvalId })]);
  respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human" });
  await fx.watcher.answer({ approvalId: pending.approvalId });
  assert.deepEqual(fx.inputs, ["\r"]);
  fx.watcher.close();
});
test("default scopes are empty, duplicate observations reuse a pending request", async () => {
  const fx = await fresh({ scope: false });
  const first = await fx.watcher.observe({ sessionId: "session" });
  assert.equal(first.status, "pending");
  assert.equal((await fx.watcher.observe({ sessionId: "session" })).approvalId, first.approvalId);
  assert.deepEqual(fx.inputs, []);
  fx.watcher.close();
});
test("role or session mutation while awaiting approval prevents input", async () => {
  for (const mutate of [(fx) => fx.roleData.denyActions.push("test.run"), () => sessions.setSessionStatus("session", "closed")]) {
    const fx = await fresh({ auto: false });
    const pending = await fx.watcher.observe({ sessionId: "session" });
    mutate(fx);
    respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human" });
    await fx.watcher.answer({ approvalId: pending.approvalId });
    assert.deepEqual(fx.inputs, []);
    fx.watcher.close();
  }
});

test("low-level prompt answer rejects caller-supplied authorization and keys", async () => {
  const { answerSessionPrompt } = await import("../../gateway/src/adapters/session_prompt.js");
  const inputs = [];
  const result = answerSessionPrompt({ tmuxTarget: "fixture", expected: { snapshot: command, target: "%1", serverPid: "100", panePid: "200" }, authorize: () => true, response: "y", run: (args) => {
    if (args[0] === "display-message") return { status: 0, stdout: "100|%1|200|0|0|0\n" };
    if (args[0] === "capture-pane") return { status: 0, stdout: command };
    inputs.push(args); return { status: 0, stdout: "" };
  } });
  assert.equal(result, false);
  assert.deepEqual(inputs, []);
});
test("denied approvals and paused orchestrations never produce input", async () => {
  const { setOrchestrationStatus } = await import("../../gateway/src/core/repositories/orchestration_repo.js");
  for (const paused of [false, true]) {
    const fx = await fresh({ auto: false });
    const pending = await fx.watcher.observe({ sessionId: "session" });
    if (paused) setOrchestrationStatus("orchestration", "paused");
    respond({ approvalId: pending.approvalId, decision: paused ? "granted" : "denied", decidedBy: "human" });
    await fx.watcher.answer(pending);
    assert.deepEqual(fx.inputs, []);
    fx.watcher.close();
  }
});
test("human response answers asynchronously without another view and consumes durable context", async () => {
  const fx = await fresh({ auto: false });
  const pending = await fx.watcher.observe({ sessionId: "session" });
  respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human", note: "approve once" });
  assert.deepEqual(fx.inputs, ["\r"]);
  const context = JSON.parse(approvals.getApproval(pending.approvalId).payload);
  assert.equal(context.command, "npm test");
  assert.equal(context.consumed, true);
  fx.watcher.close();
});

test("agent view surfaces an unknown approval id and exact pane to its human", async () => {
  const fx = await fresh({ pane: unknown });
  const { createAgentService } = await import("../../gateway/src/services/agent_service.js");
  const service = createAgentService({ config: {}, registries: { getRole: () => ({ allowActions: [], denyActions: [] }), getAgent: () => ({ allowedRoles: ["coder"], allowedClassifications: ["internal"], requiresApprovalFor: [] }), getRepo: () => ({ classification: "internal", allowedAgents: ["codex"] }), getProtectedBranches: () => [] }, adapters: { get: () => ({ recognizePrompt: codex.recognizeCodexPrompt, capturePrompt: () => ({ snapshot: unknown, target: "%1", serverPid: "100", panePid: "200" }), view: async () => ({ snapshot: unknown, dryRun: false }) }) } });
  try {
    const viewed = await service.view({ sessionId: "session" });
    assert.equal(viewed.promptApproval.kind, "unknown");
    assert.match(viewed.promptApproval.approvalId, /^apr-/);
    assert.equal(viewed.promptApproval.command, unknown);
  } finally { service.close(); fx.watcher.close(); }
});

test("observing a vanished prompt invalidates approval even if the same text returns", async () => {
  const fx = await fresh({ auto: false });
  const pending = await fx.watcher.observe({ sessionId: "session" });
  fx.change({ snapshot: "working" });
  await fx.watcher.observe({ sessionId: "session" });
  fx.change({ snapshot: command });
  respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human" });
  assert.deepEqual(fx.inputs, []);
  fx.watcher.close();
});

const recorded = (name) => fs.readFileSync(new URL(`./fixtures/session_prompts/${name}.txt`, import.meta.url), "utf8");
test("recorded Codex command retains Environment Reason multiline command and optional p", () => {
  const pane = recorded("codex-command");
  const result = codex.recognizeCodexPrompt(pane);
  assert.equal(result.kind, "command");
  assert.equal(result.command, pane.split("\n").slice(13, 18).map((row, index) => row.trimEnd().slice(index === 0 ? 4 : 2)).join("\n"));
  assert.deepEqual(result.options, ["y", "esc"]);
  assert.equal(codex.recognizeCodexPrompt(pane.replace("(y)", "(p)")), null);
});
test("recorded Codex Folder access trust binds the exact sanitized path", () => {
  const pane = recorded("codex-trust");
  const result = codex.recognizeCodexPrompt(pane);
  assert.equal(result.kind, "trust");
  assert.equal(result.command, pane.split("\n").find((row) => row.trim().startsWith("/tmp/" )).trim());
  assert.deepEqual(result.options, ["1", "2"]);
});
test("recorded Claude four-choice permission preserves command and excludes auto-mode choices", () => {
  const pane = recorded("claude-permission");
  assert.deepEqual(claude.recognizeClaudePrompt(pane), { kind: "permission", command: "printf A06 > permission-probe.txt", options: ["1", "2", "3", "4"] });
  assert.equal(claude.recognizeClaudePrompt(pane.replace("❯ 1. Yes", "  1. Yes").replace("   3. Yes", " ❯ 3. Yes")), null);
});
test("trust and Claude permission use only one Enter on the rechecked selected one-time choice", async () => {
  for (const [provider, pane] of [["codex", recorded("codex-trust")], ["claude-code", recorded("claude-permission")]]) {
    const fx = await fresh({ auto: false, pane });
    const { getDb } = await import("../../gateway/src/core/state.js");
    getDb().prepare("UPDATE tasks SET assigned_agent = ? WHERE task_id = 'task'").run(provider);
    getDb().prepare("UPDATE sessions SET agent = ? WHERE session_id = 'session'").run(provider);
    const { answerSessionPrompt } = await import("../../gateway/src/adapters/session_prompt.js");
    const transport = promptTransportFixture({ current: () => ({ snapshot: pane, target: "%1", serverPid: "100", panePid: "200" }), onInput: (_byte, args) => fx.inputs.push(args) });
    const adapter = { recognizePrompt: provider === "codex" ? codex.recognizeCodexPrompt : claude.recognizeClaudePrompt, capturePrompt: () => ({ snapshot: pane, target: "%1", serverPid: "100", panePid: "200" }), answerPrompt: ({ permit }) => answerSessionPrompt({ permit, run: transport.run }) };
    const { createSessionPromptWatcher } = await import("../../gateway/src/services/session_prompt_service.js");
    const watcher = createSessionPromptWatcher({ adapters: { get: () => adapter }, registries: { getRole: () => fx.roleData, getAgent: () => ({ allowedRoles: ["coder"], allowedClassifications: ["internal"], requiresApprovalFor: [] }), getRepo: () => ({ classification: "internal", allowedAgents: [provider] }), getProtectedBranches: () => [] } });
    try {
      const pending = await watcher.observe({ sessionId: "session" });
      respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human" });
      assert.equal(fx.inputs.length, 1);
      assert.equal(fx.inputs[0][0], "agents-submit-v1");
    } finally { watcher.close(); fx.watcher.close(); }
  }
});

test("supervised sessions watch assigned pending tasks without requiring a separate task start", async () => {
  const fx = await fresh();
  const { getDb } = await import("../../gateway/src/core/state.js");
  getDb().prepare("UPDATE tasks SET lifecycle_state = 'pending' WHERE task_id = 'task'").run();
  const result = await fx.watcher.observe({ sessionId: "session" });
  assert.equal(result?.status, "answered");
  assert.deepEqual(fx.inputs, ["\r"]);
  fx.watcher.close();
});

test("invalidated prompt approvals expire durably and a stale grant reports no live binding", async () => {
  const fx = await fresh({ auto: false });
  const pending = await fx.watcher.observe({ sessionId: "session" });
  fx.change({ snapshot: "working" });
  await fx.watcher.observe({ sessionId: "session" });
  assert.equal(approvals.getApproval(pending.approvalId).status, "expired");
  const response = respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human" });
  assert.equal(response.promptAnswer.status, "not_answered");
  assert.equal(response.promptAnswer.reason, "prompt_no_longer_bound");
  assert.deepEqual(fx.inputs, []);
  assert.equal((await query({ type: "SESSION_PROMPT_INVALIDATED" }))[0].approvalId, pending.approvalId);
  fx.watcher.close();
});
test("stopping a watcher makes its pending decisions durably non-grantable", async () => {
  const fx = await fresh({ auto: false });
  const pending = await fx.watcher.observe({ sessionId: "session" });
  fx.watcher.close();
  const { poll } = await import("../../gateway/src/services/approval_service.js");
  assert.equal(poll(pending).status, "expired");
  assert.equal(poll(pending).promptAnswer.reason, "prompt_no_longer_bound");
  assert.deepEqual(fx.inputs, []);
});
test("restart orphan approvals have explicit durable response and poll outcomes", async () => {
  const fx = await fresh({ auto: false });
  const { request, poll } = await import("../../gateway/src/services/approval_service.js");
  const orphan = request({ traceId: "trace", action: "session.prompt.command", requestedBy: "codex", context: { sessionId: "session", command: "npm test", target: "%1", options: ["y", "esc"] } });
  // A new watcher cannot inherit a previous process's in-memory approval binding.
  const outcome = await fx.watcher.answer(orphan);
  assert.equal(outcome.reason, "prompt_no_longer_bound");
  const response = respond({ approvalId: orphan.approvalId, decision: "granted", decidedBy: "human" });
  assert.equal(response.promptAnswer.reason, "prompt_no_longer_bound");
  assert.equal(poll(orphan).status, "expired");
  assert.deepEqual(fx.inputs, []);
  fx.watcher.close();
});
test("approval respond alone rejects a restart orphan even with an approval wait listener", async () => {
  const fx = await fresh({ auto: false });
  const { request, poll, waitForDecision } = await import("../../gateway/src/services/approval_service.js");
  const orphan = request({ traceId: "trace", action: "session.prompt.command", requestedBy: "codex", context: { sessionId: "session", command: "npm test" } });
  const waited = waitForDecision({ approvalId: orphan.approvalId, serverMaxMs: 100 });
  const response = respond({ approvalId: orphan.approvalId, decision: "granted", decidedBy: "human" });
  assert.equal(response.status, "expired");
  assert.equal(response.promptAnswer.reason, "prompt_no_longer_bound");
  assert.equal((await waited).status, "expired");
  assert.deepEqual(poll(orphan).promptAnswer, response.promptAnswer);
  fx.watcher.close();
});

test("a granted restart orphan retains decision history and records that it cannot be answered", async () => {
  const fx = await fresh({ auto: false });
  const { request, poll } = await import("../../gateway/src/services/approval_service.js");
  const orphan = request({ traceId: "trace", action: "session.prompt.command", requestedBy: "codex", context: { sessionId: "session", command: "npm test" }, config: { autoApproveScopes: ["session.prompt.command"] } });
  assert.equal(orphan.status, "granted");
  const outcome = fx.watcher.answer(orphan);
  assert.equal(outcome.status, "not_answered");
  assert.equal(outcome.reason, "prompt_no_longer_bound");
  assert.equal(poll(orphan).status, "granted", "a voided answer must preserve the original granted decision history");
  assert.equal(poll(orphan).promptAnswer.reason, "prompt_no_longer_bound");
  assert.deepEqual(fx.inputs, []);
  fx.watcher.close();
});
test("uncertain watcher delivery returns a durable result and audits uncertainty without answered", async () => {
  const fx = await fresh({ auto: false, guardResult: () => ({ status: 0, error: new Error("timeout after possible write"), stderr: "" }) });
  const pending = fx.watcher.observe({ sessionId: "session" });
  const response = respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human" });
  assert.equal(response.promptAnswer.status, "not_answered");
  assert.equal(response.promptAnswer.outcome, "uncertain");
  assert.equal((await query({ type: "SESSION_PROMPT_ANSWERED" })).length, 0);
  const attempts = await query({ type: "SESSION_PROMPT_ANSWER_ATTEMPT" });
  assert.deepEqual(attempts.map((attempt) => attempt.outcome), ["attempting", "uncertain"]);
  fx.watcher.answer(pending);
  assert.deepEqual(fx.inputs, []);
  fx.watcher.close();
});

test("failed write-ahead attempt audit prevents any guard or input", async (t) => {
  const fx = await fresh({ auto: false });
  const pending = fx.watcher.observe({ sessionId: "session" });
  const append = fs.appendFileSync;
  t.mock.method(fs, "appendFileSync", (file, data, ...options) => {
    const event = JSON.parse(String(data));
    if (event.type === "SESSION_PROMPT_ANSWER_ATTEMPT" && event.outcome === "attempting") throw new Error("attempt audit unavailable");
    return append(file, data, ...options);
  });
  try {
    const response = respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human" });
    assert.deepEqual(fx.inputs, [], "a decision without write-ahead audit must not reach transport");
    assert.equal(response.promptAnswer.outcome, "refused");
    assert.equal((await query({ type: "SESSION_PROMPT_ANSWERED" })).length, 0);
  } finally { t.mock.restoreAll(); fx.watcher.close(); }
});
test("lost in-flight terminal CAS after watcher stop cannot emit answered", async () => {
  let fx;
  fx = await fresh({ auto: false, guardResult: () => {
    fx.inputs.push("\r");
    fx.watcher.close();
    return { status: 0, stdout: "", stderr: "" };
  } });
  const pending = fx.watcher.observe({ sessionId: "session" });
  const response = respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human" });
  assert.equal((await query({ type: "SESSION_PROMPT_ANSWERED" })).length, 0, "success requires this attempt's terminal CAS to commit");
  assert.equal(response.promptAnswer.outcome, "uncertain");
  assert.equal(response.promptAnswer.reason, "transport_uncertain_after_restart");
  fx.watcher.answer(pending);
  assert.deepEqual(fx.inputs, ["\r"]);
});
