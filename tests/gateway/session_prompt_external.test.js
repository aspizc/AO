import { spawn } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initState, getDb, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { configureAudit, query } from "../../gateway/src/core/audit.js";
import { createOrchestration } from "../../gateway/src/core/repositories/orchestration_repo.js";
import * as tasks from "../../gateway/src/core/repositories/task_repo.js";
import * as sessions from "../../gateway/src/core/repositories/session_repo.js";
import * as approvals from "../../gateway/src/core/repositories/approval_repo.js";
import { request } from "../../gateway/src/services/approval_service.js";
import { createSessionPromptWatcher } from "../../gateway/src/services/session_prompt_service.js";
import { recognizeCodexPrompt } from "../../gateway/src/adapters/codex_adapter.js";
import { answerSessionPrompt } from "../../gateway/src/adapters/session_prompt.js";
import { promptTransportFixture } from "./session_prompt_transport_fixture.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const command = "Would you like to run the following command?\n\n  $ npm test\n\n› 1. Yes, proceed (y)\n  2. Yes, and don't ask again for this exact command (p)\n  3. No, and tell Codex what to do differently (esc)\n\nPress enter to confirm or esc to cancel";
function fresh(t) {
  resetState();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "a06-external-"));
  initState({ stateDb: path.join(directory, "state.db") });
  configureAudit({ auditLog: path.join(directory, "audit.jsonl") });
  const now = new Date().toISOString();
  createOrchestration({ sessionId: "owner", traceId: "trace", callerAgent: "claude-code", callerRole: "orchestrator", status: "active", goal: "external fixture", createdAt: now });
  tasks.createTask({ taskId: "task", traceId: "trace", assignedAgent: "codex", assignedRole: "coder", repo: "fixture", status: "pending", createdAt: now, closedAt: null });
  sessions.createSession({ sessionId: "session", taskId: "task", traceId: "trace", agent: "codex", role: "coder", tmuxTarget: "fixture", status: "running", startedAt: now, closedAt: null });
  let capture = { snapshot: command, target: "%1", serverPid: "100", panePid: "200" };
  const inputs = [];
  const transport = promptTransportFixture({ current: () => capture, onInput: (byte) => inputs.push(byte) });
  const role = { allowActions: ["code.write", "test.run", "session.prompt.command"], denyActions: [], sessionPromptScopes: [] };
  const adapter = { recognizePrompt: recognizeCodexPrompt, capturePrompt: () => structuredClone(capture), answerPrompt: ({ permit }) => answerSessionPrompt({ permit, run: transport.run }) };
  const registries = { getRole: () => role, getAgent: () => ({ allowedRoles: ["coder"], allowedClassifications: ["internal"], requiresApprovalFor: [] }), getRepo: () => ({ classification: "internal", allowedAgents: ["codex"] }), getProtectedBranches: () => [] };
  const makeWatcher = () => createSessionPromptWatcher({ adapters: { get: () => adapter }, registries });
  const watcher = makeWatcher();
  t.after(() => { watcher.close(); resetState(); fs.rmSync(directory, { recursive: true, force: true }); });
  const env = { ...process.env, PYTHONPATH: path.join(root, "cli/src"), AGENTS_WORKSPACE: directory, AGENTS_STATE_DB: path.join(directory, "state.db"), AGENTS_AUDIT_LOG: path.join(directory, "audit.jsonl") };
  return { watcher, makeWatcher, inputs, role, adapter, transport, env, change: (delta) => { capture = { ...capture, ...delta }; } };
}
function run(executable, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { env, cwd: root });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}
const cli = (fx, id, json = true, decision = "granted") => run("agent-run", ["approve", id, "--decision", decision, ...(json ? ["--json"] : [])], fx.env);
const script = (fx, id, extra = []) => run("node", ["gateway/scripts/approval-respond.mjs", "--approval-id", id, "--decision", "granted", ...extra], fx.env);

test("cross-process agent-run approve delivers once through the live owner and reports JSON and text", async (t) => {
  const fx = fresh(t);
  const pending = fx.watcher.observe({ sessionId: "session" });
  fx.watcher.watch("session");
  const result = await cli(fx, pending.approvalId);
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(fx.inputs, ["\r"]);
  const data = JSON.parse(result.stdout);
  assert.equal(data.isSessionPrompt, true);
  assert.equal(data.promptAnswer.status, "answered");
  assert.equal(data.promptAnswer.outcome, "sent");
  assert.equal(approvals.promptAnswerResult(approvals.getApproval(pending.approvalId)).outcome, "sent");
  const text = await cli(fx, pending.approvalId, false);
  assert.equal(text.code, 0);
  assert.match(text.stdout, /answered\/sent/);
  assert.deepEqual(fx.inputs, ["\r"]);
  assert.equal((await query({ type: "SESSION_PROMPT_ANSWERED" })).length, 1);
  assert.equal((await query({ type: "SESSION_PROMPT_INVALIDATED" })).length, 0);
});
test("dead-owner CLI grant exits nonzero and reports not_answered rather than a bare grant", async (t) => {
  const fx = fresh(t);
  const orphan = request({ traceId: "trace", action: "session.prompt.command", requestedBy: "codex", context: { sessionId: "session", command: "npm test" } });
  const result = await cli(fx, orphan.approvalId);
  assert.equal(result.code, 1);
  assert.equal(JSON.parse(result.stdout).promptAnswer.status, "not_answered");
  assert.equal(approvals.getApproval(orphan.approvalId).status, "granted");
  const text = await cli(fx, orphan.approvalId, false);
  assert.equal(text.code, 1);
  assert.match(text.stdout, /not_answered.*prompt_no_longer_bound/);
  assert.deepEqual(fx.inputs, []);
  const nodeResult = await script(fx, orphan.approvalId);
  assert.equal(JSON.parse(nodeResult.stdout).promptAnswer.status, "not_answered");
  assert.equal(nodeResult.code, 1, "the Node script itself must reject undelivered grants");
});
test("Node script rejects answered status unless the stored outcome is sent", async (t) => {
  const fx = fresh(t);
  const pending = fx.watcher.observe({ sessionId: "session" });
  const row = approvals.decideApproval(pending.approvalId, "granted", "operator");
  const promptAnswer = { status: "answered", outcome: "refused" };
  getDb().prepare("UPDATE approvals SET payload = ? WHERE approval_id = ?")
    .run(JSON.stringify({ ...JSON.parse(row.payload), promptAnswer }), pending.approvalId);
  const result = await script(fx, pending.approvalId);
  assert.deepEqual(JSON.parse(result.stdout).promptAnswer, promptAnswer);
  assert.equal(result.code, 1, "answered alone is not proof of delivery");
});
test("reserved decider is rejected before any DB change", async (t) => {
  const fx = fresh(t);
  const pending = fx.watcher.observe({ sessionId: "session" });
  for (const decider of ["operator-autonomous-mode", "session-prompt-watcher"]) {
    const before = getDb().prepare("SELECT * FROM approvals").all();
    const result = await script(fx, pending.approvalId, ["--decided-by", decider]);
    assert.equal(result.code, 1);
    assert.match(JSON.parse(result.stdout).error, /reserved/);
    assert.deepEqual(getDb().prepare("SELECT * FROM approvals").all(), before);
  }
});

test("external grant cannot answer a changed prompt, stopped owner, restarted owner or role denial", async (t) => {
  for (const mode of ["changed", "stopped", "restart", "policy", "target", "session"]) {
    const fx = fresh(t);
    const pending = fx.watcher.observe({ sessionId: "session" });
    approvals.decideApproval(pending.approvalId, "granted", "operator");
    if (mode === "changed") fx.change({ snapshot: command.replace("npm test", "npm install") });
    if (mode === "target") fx.change({ target: "%2" });
    if (mode === "session") sessions.setSessionStatus("session", "closed");
    if (mode === "policy") fx.role.denyActions.push("code.write");
    if (["stopped", "restart"].includes(mode)) fx.watcher.stop("session");
    if (mode === "restart") {
      const restarted = fx.makeWatcher();
      restarted.observe({ sessionId: "session" });
      restarted.close();
    } else fx.watcher.observe({ sessionId: "session" });
    assert.deepEqual(fx.inputs, [], mode);
    assert.notEqual(approvals.promptAnswerResult(approvals.getApproval(pending.approvalId))?.outcome, "sent", mode);
    fx.watcher.close();
  }
});

test("explicit external denial exits zero and never sends or rearms", async (t) => {
  const fx = fresh(t);
  const pending = fx.watcher.observe({ sessionId: "session" });
  const result = await cli(fx, pending.approvalId, true, "denied");
  assert.equal(result.code, 0);
  assert.equal(JSON.parse(result.stdout).status, "denied");
  assert.equal(JSON.parse(result.stdout).isSessionPrompt, true);
  assert.equal(fx.watcher.observe({ sessionId: "session" }).approvalId, pending.approvalId);
  assert.deepEqual(fx.inputs, []);
});

test("external timeout retires both owner maps and rearms exactly one ID without input", async (t) => {
  const fx = fresh(t);
  const pending = fx.watcher.observe({ sessionId: "session" });
  const { respondExternal, respond } = await import("../../gateway/src/services/approval_service.js");
  // Simulate a different process with a durable grant, bypassing no watcher guards.
  approvals.decideApproval(pending.approvalId, "granted", "operator");
  const result = await respondExternal({ approvalId: pending.approvalId, decision: "granted" }, { timeoutMs: 0 });
  assert.equal(result.promptAnswer.detail, "external_response_timeout");
  assert.equal(JSON.parse(approvals.getApproval(pending.approvalId).payload).consumed, undefined);
  const freshId = fx.watcher.observe({ sessionId: "session" }).approvalId;
  assert.notEqual(freshId, pending.approvalId);
  assert.equal(fx.watcher.observe({ sessionId: "session" }).approvalId, freshId);
  assert.equal(approvals.listPendingApprovals("trace").length, 1);
  respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "operator" });
  assert.deepEqual(fx.inputs, []);
  assert.equal(fx.watcher.observe({ sessionId: "session" }).approvalId, freshId);
});

test("each rearm guard excludes terminal or attempted timeout lookalikes", async (t) => {
  for (const delta of [
    { status: "answered" }, { status: "uncertain" }, { detail: "session_stopped" },
    { attemptedAt: "2026-10-09T00:00:00Z" }, { response: "Enter" }, { target: "%1" }, { consumed: true },
  ]) {
    const fx = fresh(t);
    const pending = fx.watcher.observe({ sessionId: "session" });
    const row = approvals.decideApproval(pending.approvalId, "granted", "operator");
    const context = JSON.parse(row.payload);
    const { consumed, ...answerDelta } = delta;
    getDb().prepare("UPDATE approvals SET payload = ? WHERE approval_id = ?").run(JSON.stringify({ ...context,
      ...(consumed ? { consumed } : {}), promptAnswer: { status: "not_answered", detail: "external_response_timeout", ...answerDelta } }), pending.approvalId);
    assert.equal(fx.watcher.observe({ sessionId: "session" }).approvalId, pending.approvalId, JSON.stringify(delta));
    assert.equal(approvals.listApprovalsByTrace("trace").length, 1);
    assert.deepEqual(fx.inputs, []);
    fx.watcher.close();
  }
});

test("timeout CAS rejects every non-grant or attempted payload and stale exact payload", async (t) => {
  const fx = fresh(t);
  for (const [action, status, payload] of [
    ["git.push", "granted", {}], ["session.prompt.command", "pending", {}],
    ["session.prompt.command", "denied", {}], ["session.prompt.command", "granted", null],
    ["session.prompt.command", "granted", "malformed"],
    ["session.prompt.command", "granted", { consumed: true }],
    ["session.prompt.command", "granted", { promptAnswer: { status: "in_flight" } }],
    ["session.prompt.command", "granted", { promptAnswer: { status: "answered", outcome: "sent" } }],
  ]) {
    const pending = request({ traceId: "trace", action, requestedBy: "codex", context: {} });
    if (status !== "pending") approvals.decideApproval(pending.approvalId, status, "operator");
    getDb().prepare("UPDATE approvals SET payload = ? WHERE approval_id = ?").run(payload === "malformed" ? payload : JSON.stringify(payload), pending.approvalId);
    const row = approvals.getApproval(pending.approvalId);
    assert.equal(approvals.timeoutUnattemptedPrompt(row), false, JSON.stringify([action, status, payload]));
    assert.deepEqual(approvals.getApproval(pending.approvalId), row);
  }
  assert.equal(approvals.timeoutUnattemptedPrompt(null), false);
  const pending = fx.watcher.observe({ sessionId: "session" });
  const row = approvals.decideApproval(pending.approvalId, "granted", "operator");
  getDb().prepare("UPDATE approvals SET payload = ? WHERE approval_id = ?").run(JSON.stringify({ ...JSON.parse(row.payload), changed: true }), pending.approvalId);
  assert.equal(approvals.timeoutUnattemptedPrompt(row), false);
  const latest = approvals.getApproval(pending.approvalId);
  approvals.consumePromptApproval(pending.approvalId, latest.payload, { status: "in_flight", outcome: "attempting", response: "Enter", target: "%1", attemptedAt: new Date().toISOString() });
  assert.equal(approvals.timeoutUnattemptedPrompt(latest), false, "owner won the payload race");
});

test("CLI timeout leaves owner in_flight token untouched and owner later commits sent exactly once", async (t) => {
  const fx = fresh(t);
  const pending = fx.watcher.observe({ sessionId: "session" });
  // The separate owner blocks after guarded input, before committing its result.
  fx.watcher.close();
  resetState();
  const child = spawn("node", ["tests/gateway/session_prompt_external_owner.mjs", fx.env.AGENTS_WORKSPACE], { env: fx.env, cwd: root, stdio: ["ignore", "pipe", "pipe", "ipc"] });
  child.stdout.resume();
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const exited = new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal })));
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await exited;
  });
  const next = () => new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      child.off("message", onMessage);
      child.off("exit", onExit);
      child.off("error", onError);
    };
    const onMessage = (message) => { cleanup(); resolve(message); };
    const onExit = (code, signal) => { cleanup(); reject(new Error(`owner exited before IPC: ${code}/${signal}: ${stderr}`)); };
    const onError = (error) => { cleanup(); reject(error); };
    const timer = setTimeout(() => { cleanup(); reject(new Error(`owner IPC timeout: ${stderr}`)); }, 15_000);
    child.once("message", onMessage);
    child.once("exit", onExit);
    child.once("error", onError);
    if (child.exitCode !== null || child.signalCode !== null) onExit(child.exitCode, child.signalCode);
  });
  const ready = await next();
  assert.ok(ready.approvalId);
  const cliRun = cli(fx, ready.approvalId);
  const attempted = await next();
  assert.equal(attempted.status, "in_flight");
  const result = await cliRun;
  assert.equal(result.code, 1);
  assert.equal(JSON.parse(result.stdout).promptAnswer.status, "uncertain");
  initState({ stateDb: fx.env.AGENTS_STATE_DB });
  const token = approvals.getApproval(ready.approvalId).payload;
  assert.equal(token, attempted.payload);
  assert.equal(JSON.parse(token).promptAnswer.status, "in_flight");
  const finalize = next();
  fs.writeFileSync(path.join(fx.env.AGENTS_WORKSPACE, "finish"), "finish");
  const done = await finalize;
  assert.equal(done.inputs, 1);
  assert.equal(done.answer.status, "answered");
  assert.equal(done.answer.outcome, "sent");
  assert.equal((await query({ type: "SESSION_PROMPT_ANSWERED" })).length, 1);
  assert.equal(approvals.promptAnswerResult(approvals.getApproval(ready.approvalId)).outcome, "sent");
  assert.deepEqual(await exited, { code: 0, signal: null });
});

test("external mode cannot enter MCP schema or default request context and orchestrator deny remains", async () => {
  const { validateCatalogInput } = await import("../../gateway/src/tools/catalog.js");
  const { createGatewayRequestContext, bindRequestContext } = await import("../../gateway/src/core/request_context.js");
  const args = { approvalId: "apr-test", decision: "granted", decidedBy: "operator" };
  assert.equal(validateCatalogInput("approval.respond", { ...args, external: true }).success, false);
  assert.equal(validateCatalogInput("approval.respond", { ...args, externalResponse: true }).success, false);
  const context = createGatewayRequestContext({ connectionId: "external-test" });
  assert.throws(() => bindRequestContext(context, { action: "approval.respond", args, audience: context.audience, connectionId: context.connectionId, actionCatalogVersion: context.actionCatalogVersion }), (error) => error.reasonCode === "context.capability_denied");
  const orchestrator = JSON.parse(fs.readFileSync(path.join(root, "policies/roles.json"), "utf8"));
  assert.ok(orchestrator.roles.orchestrator.denyActions.includes("approval.respond"));
});

test("consumed without terminal answer is uncertain and external timeout makes no write", async (t) => {
  const fx = fresh(t);
  const pending = fx.watcher.observe({ sessionId: "session" });
  const row = approvals.decideApproval(pending.approvalId, "granted", "operator");
  const payload = JSON.stringify({ ...JSON.parse(row.payload), consumed: true });
  getDb().prepare("UPDATE approvals SET payload = ? WHERE approval_id = ?").run(payload, pending.approvalId);
  const { respondExternal } = await import("../../gateway/src/services/approval_service.js");
  const result = await respondExternal({ approvalId: pending.approvalId, decision: "granted" }, { timeoutMs: 0 });
  assert.equal(result.promptAnswer.status, "uncertain");
  assert.equal(approvals.getApproval(pending.approvalId).payload, payload);
  assert.deepEqual(fx.inputs, []);
});

test("timeout SQL status CAS rejects a grant whose status changed after the read", async (t) => {
  const fx = fresh(t);
  const pending = fx.watcher.observe({ sessionId: "session" });
  const row = approvals.decideApproval(pending.approvalId, "granted", "operator");
  getDb().prepare("UPDATE approvals SET status = 'denied' WHERE approval_id = ?").run(pending.approvalId);
  assert.equal(approvals.timeoutUnattemptedPrompt(row), false);
  assert.equal(approvals.getApproval(pending.approvalId).payload, row.payload);
});

test("timeout CAS changes only the requested ID even when another grant has identical payload", async (t) => {
  fresh(t);
  const ids = [0, 1].map(() => request({ traceId: "trace", action: "session.prompt.command", requestedBy: "codex", context: { command: "npm test" } }).approvalId);
  const rows = ids.map((id) => approvals.decideApproval(id, "granted", "operator"));
  assert.equal(rows[0].payload, rows[1].payload);
  assert.equal(approvals.timeoutUnattemptedPrompt(rows[0]), true);
  assert.equal(approvals.promptAnswerResult(approvals.getApproval(ids[0])).detail, "external_response_timeout");
  assert.deepEqual(approvals.getApproval(ids[1]), rows[1]);
});

test("external timeout rereads after losing CAS to an owner attempt and returns uncertain without overwriting", async (t) => {
  const fx = fresh(t);
  const pending = fx.watcher.observe({ sessionId: "session" });
  const row = approvals.decideApproval(pending.approvalId, "granted", "operator");
  const db = getDb();
  const prepare = db.prepare;
  let token;
  db.prepare = function(sql) {
    const statement = prepare.call(this, sql);
    if (sql === "UPDATE approvals SET payload = ? WHERE approval_id = ? AND status = 'granted' AND payload = ?") {
      return { run(...args) {
        db.prepare = prepare;
        token = approvals.consumePromptApproval(pending.approvalId, row.payload, { status: "in_flight", outcome: "attempting", response: "Enter", target: "%1", attemptedAt: new Date().toISOString() });
        return statement.run(...args);
      } };
    }
    return statement;
  };
  try {
    const { respondExternal } = await import("../../gateway/src/services/approval_service.js");
    const result = await respondExternal({ approvalId: pending.approvalId, decision: "granted" }, { timeoutMs: 0 });
    assert.equal(result.promptAnswer.status, "uncertain");
    assert.equal(approvals.getApproval(pending.approvalId).payload, token);
    assert.equal(approvals.recordPromptAnswer(pending.approvalId, { status: "answered", outcome: "sent" }, token), true);
  } finally { db.prepare = prepare; }
});

test("external timeout rereads after losing CAS to an owner finalized answer and reports the stored delivery", async (t) => {
  const fx = fresh(t);
  const pending = fx.watcher.observe({ sessionId: "session" });
  const row = approvals.decideApproval(pending.approvalId, "granted", "operator");
  const db = getDb();
  const prepare = db.prepare;
  let changes;
  db.prepare = function(sql) {
    const statement = prepare.call(this, sql);
    if (sql === "UPDATE approvals SET payload = ? WHERE approval_id = ? AND status = 'granted' AND payload = ?") {
      return { run(...args) {
        db.prepare = prepare;
        const token = approvals.consumePromptApproval(pending.approvalId, row.payload, { status: "in_flight", outcome: "attempting", response: "Enter", target: "%1", attemptedAt: new Date().toISOString() });
        assert.ok(token);
        assert.equal(approvals.recordPromptAnswer(pending.approvalId, { status: "answered", outcome: "sent" }, token), true);
        const result = statement.run(...args);
        changes = result.changes;
        return result;
      } };
    }
    return statement;
  };
  try {
    const { respondExternal } = await import("../../gateway/src/services/approval_service.js");
    const result = await respondExternal({ approvalId: pending.approvalId, decision: "granted" }, { timeoutMs: 0 });
    assert.equal(changes, 0, "the owner finalized before the CLI timeout CAS");
    assert.equal(result.promptAnswer.status, "answered");
    assert.equal(result.promptAnswer.outcome, "sent");
    assert.deepEqual(result.promptAnswer, approvals.promptAnswerResult(approvals.getApproval(pending.approvalId)));
  } finally { db.prepare = prepare; }
});
