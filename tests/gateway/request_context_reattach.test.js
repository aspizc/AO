import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequestContext, bindRequestContext, revokeRequestContext, reattachRequestContextTrace, recordRequestContextResult } from "../../gateway/src/core/request_context.js";
import { LifecycleAction, issueLifecycleCommand } from "../../gateway/src/core/lifecycle.js";
import { applyLifecycleCommand } from "../../gateway/src/core/repositories/lifecycle_repo.js";
import * as bootstrap from "../../gateway/src/mcp_server.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { CodexAdapter } from "../../gateway/src/adapters/codex_adapter.js";
import { withRequestLaunchCleanup, settleRequestLaunch } from "../../gateway/src/adapters/request_launch_cleanup.js";
import { createAgentService } from "../../gateway/src/services/agent_service.js";
import { createLocalRecoveryIdentity } from "../../gateway/src/core/request_recovery_identity.js";
import { spawn, spawnSync } from "node:child_process";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { ownedTmuxFixture } from "./helpers/owned_tmux_fixture.js";
import { readLinuxProcessIdentity } from "../../gateway/src/adapters/process_supervisor.js";
import { createRequire } from "node:module";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { configureAudit, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { createCallToolHandler } from "../../gateway/src/mcp_server.js";
import { defineTool, z } from "../../gateway/src/tools/tool_helpers.js";
import { buildOrchestrationTools, buildRecoveryTools } from "../../gateway/src/tools/orchestration.js";
import { buildAgentTools } from "../../gateway/src/tools/agent.js";
import * as sessionRepo from "../../gateway/src/core/repositories/session_repo.js";
import { getToolRegistry } from "../../gateway/src/tools/index.js";
import { tmuxSync, buildNewSessionCmd } from "../../gateway/src/adapters/tmux_client.js";
import { TOOL_NAMES, validateCatalogInput } from "../../gateway/src/tools/catalog.js";


const api = await import("../../gateway/src/services/request_recovery_service.js").catch(() => ({}));
const NOW = "2026-10-07T12:00:00.000Z";
const EXPIRES = "2026-10-08T00:00:00.000Z";
const owner = { connectionId: "original", pid: 123, startToken: "456", bootId: "12345678-1234-1234-1234-123456789abc" };
const identity = { principalId: "linux-uid:1000", machineDigest: "a".repeat(64), statePath: "/private/state.db", verify: () => true };
const parse = (result) => JSON.parse(result.content[0].text);
const request = (name, args = {}) => ({ params: { name, arguments: args } });
function context(connectionId, extra = {}) {
  return createRequestContext({ principalId: identity.principalId, agent: "codex", role: "orchestrator",
    audience: "agents-gateway", connectionId, issuedAt: "2026-10-07T00:00:00.000Z", expiresAt: EXPIRES,
    capabilities: ["orchestration.create", "orchestration.view", "orchestration.complete", "agent.ask", "agent.view", "agent.kill"], ...extra });
}
function call(tools, ctx, extra = {}) {
  return createCallToolHandler({ tools, requestContext: ctx,
    transportBinding: { audience: ctx.audience, connectionId: ctx.connectionId }, now: () => NOW,
    append: null, appendLocalOnly: null, ...extra });
}
function denied(value) { assert.equal(value.error, "REQUEST_CONTEXT_DENIED"); assert.equal(value.message, "request context denied"); }

test("owned tmux fixture isolates denied-launch panes from caller shell startup", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "a05-shell-startup-"));
  const marker = path.join(directory, "startup-ran");
  const shell = path.join(directory, "caller-shell");
  fs.writeFileSync(shell, `#!/bin/sh
printf startup > '${marker}'
exec /bin/sh
`, { mode: 0o700 });
  const previous = process.env.SHELL;
  process.env.SHELL = shell;
  t.after(() => {
    if (previous === undefined) delete process.env.SHELL; else process.env.SHELL = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const tmux = await ownedTmuxFixture(t);
  const configured = tmux.run(["show-options", "-gv", "default-shell"]);
  const command = tmux.run(["show-options", "-gv", "default-command"]);
  assert.equal(command.status, 0);
  assert.equal(configured.status, 0);
  assert.equal(tmux.run(["new-session", "-d", "-s", "inert-startup"]).status, 0);
  const pane = tmux.run(["list-panes", "-t", "=inert-startup", "-F", "#{pane_pid}"]);
  assert.equal(pane.status, 0);
  const identity = readLinuxProcessIdentity(Number(pane.stdout.trim()));
  assert.ok(identity?.startToken);
  await delay(100);
  t.diagnostic(JSON.stringify({ shellStartup: { configured: configured.stdout.trim(),
    identity, startupRan: fs.existsSync(marker) } }));
  assert.equal(fs.existsSync(marker), false,
    "denial fixtures must not start uncontrolled profile descendants that their parent cannot reap");
  assert.equal(configured.stdout.trim(), "/bin/sh", "the emitted server setting must select the inert fixture shell");
  assert.equal(command.stdout.trim(), "exec /bin/sh", "panes must start a non-login shell without profile scripts");
});

test("durable write failure publishes neither success nor memory trace ownership", async () => {
  const ctx = context("new", { recovery: { record() { throw new Error("durable write failed"); } } });
  const tools = [defineTool({ name: "orchestration.create", handler: () => ({ traceId: "tr-one" }) })];
  assert.equal((await call(tools, ctx)(request("orchestration.create", { callerAgent: "codex", callerRole: "orchestrator" }))).isError, true);
  assert.throws(() => bindRequestContext(ctx, { action: "orchestration.view", actionCatalogVersion: 1,
    audience: ctx.audience, connectionId: ctx.connectionId, now: NOW, args: { traceId: "tr-one" } }), { code: "REQUEST_CONTEXT_DENIED" });
});

test("ordinary caught denial reaches private observer and observer failure preserves generic denial", async () => {
  const ctx = context("new");
  const events = [];
  const tools = [defineTool({ name: "agent.view", handler() { assert.fail("denied call reached service"); } })];
  const result = await call(tools, ctx, { denialObserver(event) { events.push(event); throw new Error("observer failure"); } })(request("agent.view", { sessionId: "foreign-secret" }));
  denied(parse(result));
  assert.deepEqual(events, [{ tool: "agent.view", reasonCode: "context.session_denied" }]);
  assert.doesNotMatch(JSON.stringify(events), /foreign-secret/);
});

test("private observer allowlists reason metadata even when a service error carries sensitive text", async () => {
  const ctx = context("new"); const events = [];
  const tools = [defineTool({ name: "orchestration.create", handler() {
    throw Object.assign(new Error("private"), { code: "REQUEST_CONTEXT_DENIED", reasonCode: "/private/secret-prompt" });
  } })];
  denied(parse(await call(tools, ctx, { denialObserver: (event) => events.push(event) })(request("orchestration.create", { callerAgent: "codex", callerRole: "orchestrator" }))));
  assert.deepEqual(events, [{ tool: "orchestration.create", reasonCode: "context.invalid" }]);
});

test("reattach is tool 34 with strict caller-independent input and optional strict discovery", () => {
  assert.equal(TOOL_NAMES.length, 34);
  assert.equal(TOOL_NAMES.at(-1), "orchestration.reattach");
  assert.equal(validateCatalogInput("orchestration.reattach", { traceId: "tr-one" }).success, true);
  for (const args of [{}, { traceId: "" }, { traceId: "tr-one", principalId: identity.principalId }]) {
    assert.equal(validateCatalogInput("orchestration.reattach", args).success, false);
  }
  assert.equal(validateCatalogInput("orchestration.view", {}).success, true);
  assert.equal(validateCatalogInput("orchestration.view", { traceId: "" }).success, false);
});

function fixture(t, options = {}) {
  resetState(); resetAudit();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "recovery-runtime-"));
  const app = path.join(root, "app"); const second = path.join(root, "second");
  fs.mkdirSync(app); fs.mkdirSync(second);
  const database = initState({ stateDb: path.join(root, "state.db"), env: {} });
  configureAudit({ auditLog: path.join(root, "audit.jsonl") });
  t.after(() => { resetState(); resetAudit(); fs.rmSync(root, { recursive: true, force: true }); });
  assert.equal(typeof api.createRequestRecoveryService, "function", "missing recovery service");
  let absent = true; let exists = true; const probes = []; const reached = [];
  const repositories = { app, second };
  const service = (current, changes = {}) => api.createRequestRecoveryService({ database, identity, owner: current,
    priorOwnerAbsent: () => absent, probeTarget(target, timeout) { probes.push({ target, timeout }); return exists; }, ...changes });
  const original = service(owner);
  const ctx = context(owner.connectionId, { recovery: original, repositoryBindings: repositories });
  const tools = [...buildOrchestrationTools(), ...buildRecoveryTools(), ...buildAgentTools({ agentService: {
    view({ sessionId }) { reached.push(sessionRepo.getSessionById(sessionId).tmux_target); return { snapshot: "same target" }; },
    ask({ sessionId }) { reached.push(sessionRepo.getSessionById(sessionId).tmux_target); return { snapshot: "asked same target" }; },
    kill({ sessionId }) { sessionRepo.setSessionStatus(sessionId, "closed", NOW); return { status: "killed" }; },
  } })];
  const oldCall = call(tools, ctx);
  function addTask(traceId, taskId = "ts-one", repo = "app") {
    database.prepare(`INSERT INTO tasks (task_id, trace_id, assigned_agent, assigned_role, repo, status, created_at, target_action)
      VALUES (?, ?, 'codex', 'coder', ?, 'pending', ?, 'code.read')`).run(taskId, traceId, repo, NOW);
    original.repository.mergeTask({ traceId, owner, task: { taskId, repositoryId: repo, canonicalRoot: repositories[repo], targetAgent: "codex", targetRole: "coder", targetAction: "code.read" } });
  }
  async function seed() {
    const { traceId } = parse(await oldCall(request("orchestration.create", { callerAgent: "codex", callerRole: "orchestrator" })));
    addTask(traceId);
    sessionRepo.createSession({ sessionId: "ss-one", traceId, taskId: "ts-one", agent: "codex", role: "coder", tmuxTarget: "child-one", status: "running", startedAt: NOW, closedAt: null });
    original.repository.mergeSession({ traceId, owner, session: { sessionId: "ss-one", taskId: "ts-one", tmuxTarget: "child-one", targetAgent: "codex", targetRole: "coder" } });
    return traceId;
  }
  function next(changes = {}, bindings = repositories, id = "new") {
    const recovery = service({ ...owner, connectionId: id, pid: 789 }, changes);
    const current = context(id, { recovery, repositoryBindings: bindings,
      capabilities: [...ctxCapabilities, "orchestration.reattach"], ...options });
    return { ctx: current, recovery, call: call(tools, current) };
  }
  const ctxCapabilities = ["orchestration.view", "orchestration.complete", "agent.ask", "agent.view", "agent.kill"];
  return { database, original, ctx, tools, oldCall, seed, next, addTask, repositories, probes, reached,
    setAbsent(value) { absent = value; }, setExists(value) { exists = value; } };
}

for (const provider of ["claude-code", "antigravity", "pi", "opencode"]) for (const method of ["spawn", "delegate"]) test(
  `${provider} registry launch reaps its observed child ${method === "spawn" ? "when durable publication fails" : "after headless success"}`, async (t) => {
  const f = fixture(t); const traceId = await f.seed();
  await ownedTmuxFixture(t);
  const previous = { PATH: process.env.PATH, AGENTS_DRY_RUN: process.env.AGENTS_DRY_RUN };
  delete process.env.AGENTS_DRY_RUN;
  t.after(() => { for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  } });
  f.database.prepare("UPDATE tasks SET repo = 'sample-apps', assigned_agent = ?").run(provider);
  f.database.prepare("UPDATE sessions SET agent = ?").run(provider);
  const payload = f.original.repository.getTrace(traceId).payload;
  payload.tasks[0].repositoryId = "sample-apps"; payload.tasks[0].targetAgent = provider;
  payload.sessions[0].targetAgent = provider;
  f.database.prepare("UPDATE request_context_lineage SET payload_json = ?").run(JSON.stringify(payload));
  const repositories = { "sample-apps": f.repositories.app };
  const n = f.next({}, repositories);
  const ctx = context("new", { recovery: n.recovery, repositoryBindings: repositories,
    capabilities: ["orchestration.reattach", `agent.${method}`] });
  assert.equal((await call(f.tools, ctx)(request("orchestration.reattach", { traceId }))).isError, undefined);
  const marker = path.join(f.repositories.app, "provider-witness.json");
  const executable = path.join(f.repositories.app, "disposable-provider");
  fs.writeFileSync(executable, `#!/usr/bin/env node
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
let pid = process.pid; let server = null;
if (${JSON.stringify(method)} === "delegate") {
  const create = spawnSync("tmux", ["new-session", "-d", "-s", "other-headless-child", "sleep", "60"]);
  if (create.status !== 0) process.exit(2);
  const pane = spawnSync("tmux", ["list-panes", "-t", "=other-headless-child", "-F", "#{pane_pid}"], { encoding: "utf8" });
  pid = Number(pane.stdout.trim());
  const observed = spawnSync("tmux", ["display-message", "-p", "#{pid}"], { encoding: "utf8" });
  const serverPid = Number(observed.stdout.trim());
  const serverStat = fs.readFileSync("/proc/" + serverPid + "/stat", "utf8").split(") ").at(-1).split(" ");
  server = { pid: serverPid, startToken: serverStat[19], pgid: Number(serverStat[2]), sid: Number(serverStat[3]), directory: process.env.TMUX_TMPDIR };
}
const stat = fs.readFileSync("/proc/" + pid + "/stat", "utf8").split(") ").at(-1).split(" ");
fs.writeFileSync(${JSON.stringify(marker)}, JSON.stringify({ pid, startToken: stat[19], server }));
if (${JSON.stringify(method)} === "spawn") setInterval(() => {}, 1000);
`, { mode: 0o700 });
  const realTmux = spawnSync("sh", ["-c", "command -v tmux"], { encoding: "utf8" }).stdout.trim();
  const shim = path.join(f.repositories.app, "bin"); fs.mkdirSync(shim);
  fs.writeFileSync(path.join(shim, "tmux"), `#!/usr/bin/env node
const fs = require("node:fs"); const { spawnSync } = require("node:child_process");
const args = process.argv.slice(2);
const result = spawnSync(${JSON.stringify(realTmux)}, args, { stdio: "inherit" });
if (args[0] === "send-keys" && result.status === 0) {
  for (let i = 0; i < 100 && !fs.existsSync(${JSON.stringify(marker)}); i++)
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
  if (!fs.existsSync(${JSON.stringify(marker)})) process.exit(2);
}
process.exit(result.status ?? 2);
`, { mode: 0o700 });
  process.env.PATH = `${shim}:${previous.PATH}`;
  const registries = loadRegistries({ policiesDir: new URL("../../policies", import.meta.url).pathname });
  const config = { dryRun: false, repoRoots: [f.repositories.app], claudeBin: executable,
    antigravityBin: executable, piBin: executable, opencodeBin: executable };
  const tools = getToolRegistry({ config, registries, coordinationFactory: () => ({}) });
  if (method === "spawn") f.database.exec(`CREATE TRIGGER reject_other_launch_lineage BEFORE UPDATE ON request_context_lineage BEGIN SELECT RAISE(ABORT, 'forced durable launch failure'); END`);
  t.after(async () => {
    if (method !== "delegate" || !fs.existsSync(marker)) return;
    const witness = JSON.parse(fs.readFileSync(marker, "utf8")).server;
    await fixtureServerCleanup(witness);
  });
  const result = await call(tools, ctx)(request(`agent.${method}`, {
    traceId, taskId: "ts-one", agent: provider, role: "coder", repo: "sample-apps", cwd: f.repositories.app,
    ...(method === "delegate" ? { prompt: "disposable owned headless child" } : {}) }));
  assert.equal(result.isError, method === "spawn" ? true : undefined);
  assert.ok(fs.existsSync(marker), "the real registry adapter must reach the disposable executable before the publication error");
  const child = JSON.parse(fs.readFileSync(marker, "utf8"));
  if (method === "delegate") assert.equal(fs.existsSync(`/proc/${child.server.pid}`), false,
    "the actual socket-observed private server must be absent before fixture teardown, including a non-exec PATH wrapper");
  assert.equal(n.recovery.repository.getTrace(traceId).payload.sessions.length, 1,
    "failed publication grants no new recovery lineage");
  assert.notEqual(readLinuxProcessIdentity(child.pid)?.startToken, child.startToken,
    "every executable provider must settle its retained owned child before returning the final outcome");
});


function terminal(f, traceId, action = LifecycleAction.ORCHESTRATION_CANCEL) {
  const row = f.database.prepare("SELECT * FROM orchestration_sessions WHERE trace_id = ?").get(traceId);
  return applyLifecycleCommand(issueLifecycleCommand(action, { entityType: "orchestration",
    entityId: row.session_id, traceId, expectedVersion: row.lifecycle_version,
    idempotencyKey: `terminal-${traceId}`, occurredAt: NOW, evidence: { source: "server-owned-test-outcome" } }));
}

async function fixtureServerCleanup(witness) {
  if (!witness) return;
  function matches(retained) {
    if (!fs.existsSync(`/proc/${retained.pid}`)) {
      assert.throws(() => process.kill(retained.pid, 0), { code: "ESRCH" });
      return false;
    }
    assert.deepEqual(readLinuxProcessIdentity(retained.pid), {
      pid: retained.pid, startToken: retained.startToken, pgid: retained.pgid, sid: retained.sid,
    }, "fixture ambiguity retains the socket rather than guessing cleanup authority");
    return true;
  }
  if (matches(witness)) {
    const socket = path.join(witness.directory, `tmux-${process.getuid()}`, "default");
    const run = argv => spawnSync("tmux", ["-S", socket, ...argv], { encoding: "utf8", timeout: 1000 });
    const server = run(["display-message", "-p", "#{pid}"]);
    assert.equal(server.status, 0);
    assert.equal(server.stdout, `${witness.pid}\n`);
    assert.equal(matches(witness), true);
    const listed = run(["list-panes", "-a", "-F", "#{session_id} #{pane_id} #{pane_pid}"]);
    assert.equal(listed.status, 0);
    const panes = listed.stdout.trim().split("\n").filter(Boolean).map(row => {
      const [sessionId, paneId, pid] = row.split(" ");
      assert.match(sessionId, /^\$\d+$/); assert.match(paneId, /^%\d+$/);
      const identity = readLinuxProcessIdentity(Number(pid));
      assert.ok(identity?.startToken);
      const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8").split(") ").at(-1).split(" ");
      assert.equal(Number(stat[1]), witness.pid, "fixture panes must belong to the verified private server");
      return { sessionId, paneId, identity };
    });
    for (const pane of panes) {
      assert.equal(matches(witness), true);
      if (!matches(pane.identity)) continue;
      const current = run(["display-message", "-p", "-t", pane.paneId, "#{session_id} #{pane_id} #{pane_pid}"]);
      assert.equal(current.status, 0);
      assert.equal(current.stdout, `${pane.sessionId} ${pane.paneId} ${pane.identity.pid}\n`);
      assert.equal(matches(pane.identity), true);
      process.kill(pane.identity.pid, "SIGTERM");
      for (let i = 0; i < 100 && matches(pane.identity); i++) await delay(10);
      assert.equal(matches(pane.identity), false, "fixture parent must reap each pane before closing");
    }
    assert.equal(matches(witness), true);
    const again = run(["display-message", "-p", "#{pid}"]);
    assert.equal(again.status, 0); assert.equal(again.stdout, `${witness.pid}\n`);
    assert.equal(matches(witness), true);
    process.kill(witness.pid, "SIGTERM");
  }
  for (let i = 0; i < 100 && matches(witness); i++) await delay(10);
  // A failed non-exec shim may leave its own server to the CI subreaper.
  // Retain evidence; this fixture is never production absence proof.
  if (matches(witness)) return;
  if (fs.existsSync(witness.directory)) fs.rmSync(witness.directory, { recursive: true, force: true });
}

async function launchContext(t, method) {
  const f = fixture(t); const traceId = await f.seed();
  f.database.exec("UPDATE tasks SET repo = 'sample-apps'");
  const payload = f.original.repository.getTrace(traceId).payload;
  payload.tasks[0].repositoryId = "sample-apps";
  f.database.prepare("UPDATE request_context_lineage SET payload_json = ?").run(JSON.stringify(payload));
  const repositories = { "sample-apps": f.repositories.app };
  const n = f.next({}, repositories);
  const ctx = context("new", { recovery: n.recovery, repositoryBindings: repositories,
    capabilities: ["orchestration.reattach", `agent.${method}`] });
  await call(f.tools, ctx)(request("orchestration.reattach", { traceId }));
  const args = { traceId, taskId: "ts-one", agent: "codex", role: "coder",
    repo: "sample-apps", cwd: f.repositories.app, ...(method === "delegate" ? { prompt: "fixture" } : {}) };
  const binding = bindRequestContext(ctx, { action: `agent.${method}`, actionCatalogVersion: 1,
    audience: ctx.audience, connectionId: ctx.connectionId, now: NOW, args });
  const dry = process.env.AGENTS_DRY_RUN; delete process.env.AGENTS_DRY_RUN;
  t.after(() => { if (dry === undefined) delete process.env.AGENTS_DRY_RUN; else process.env.AGENTS_DRY_RUN = dry; });
  return { f, ctx, args, binding };
}

for (const ambiguous of [false, true]) test(`delegate refusal ${ambiguous ? "retains ambiguous identity and socket" : "closes verified wholly-owned server"}`, async (t) => {
  const { binding, args } = await launchContext(t, "delegate");
  let witness; let restore = () => {}; let retainedPanes; const ambiguousSignals = [];
  const observe = retained => {
    let stat;
    try { stat = fs.readFileSync(`/proc/${retained.pid}/stat`, "utf8"); } catch (error) { stat = error.code; }
    let killZero = "live";
    try { process.kill(retained.pid, 0); } catch (error) { killZero = error.code; }
    return { retained, stat, killZero };
  };
  t.after(async () => {
    restore(); await fixtureServerCleanup(witness);
    t.diagnostic(JSON.stringify({ refusalAfterFixture: retainedPanes.map(observe) }));
    for (const pane of retainedPanes) {
      assert.throws(() => fs.statSync(`/proc/${pane.pid}`), { code: "ENOENT" },
        "fixture teardown must let the verified private server reap its panes");
      assert.throws(() => process.kill(pane.pid, 0), { code: "ESRCH" });
    }
  });
  const adapter = withRequestLaunchCleanup({ config: {}, delegate() {
    const env = { ...process.env };
    const run = argv => spawnSync("tmux", argv, { env, encoding: "utf8" });
    assert.equal(run(["new-session", "-d", "-s", "owned", "sleep", "60"]).status, 0);
    const pid = Number(run(["display-message", "-p", "#{pid}"]).stdout.trim());
    witness = { ...readLinuxProcessIdentity(pid), directory: env.TMUX_TMPDIR };
    assert.ok(witness.startToken);
    // Two initial panes in one session are observed, so cleanPanes refuses.
    assert.equal(run(["split-window", "-d", "-t", run(["list-panes", "-t", "=owned", "-F", "#{pane_id}"]).stdout.trim(), "sleep", "60"]).status, 0);
    assert.equal(run(["list-panes", "-s", "-t", "=owned", "-F", "#{pane_id}"]).stdout.trim().split("\n").length, 2, "the actual two-pane mutation must precede cleanup");
    retainedPanes = run(["list-panes", "-s", "-t", "=owned", "-F", "#{pane_pid}"]).stdout.trim().split("\n")
      .map(pid => readLinuxProcessIdentity(Number(pid)));
    assert.equal(retainedPanes.length, 2);
    for (const pane of retainedPanes) {
      assert.ok(pane?.startToken);
      assert.equal(Number(observe(pane).stat.split(") ").at(-1).split(" ")[1]), witness.pid,
        "the retained panes must be direct children of the exact socket-observed server");
    }
    t.diagnostic(JSON.stringify({ refusalBefore: { server: observe(witness), panes: retainedPanes.map(observe) } }));
    return Promise.resolve({ exitCode: 0 });
  } });
  const result = await adapter.delegate({ ...args, requestBinding: binding });
  if (ambiguous) {
    const kill = process.kill;
    process.kill = function(pid, signal) {
      if (signal !== 0) ambiguousSignals.push({ pid, signal });
      return kill.call(this, pid, signal);
    };
    const read = fs.readFileSync;
    fs.readFileSync = function(file, ...rest) {
      if (String(file) === `/proc/${witness.pid}/stat`) throw Object.assign(new Error("ambiguous"), { code: "EACCES" });
      return read.call(this, file, ...rest);
    };
    restore = () => { fs.readFileSync = read; process.kill = kill; };
  }
  await assert.rejects(settleRequestLaunch(result, true), { code: "ADAPTER_CLEANUP_FAILED" });
  restore();
  t.diagnostic(JSON.stringify({ refusalAfterProduction: { server: observe(witness), panes: retainedPanes.map(observe) } }));
  if (!ambiguous) for (const pane of retainedPanes) {
    assert.throws(() => fs.statSync(`/proc/${pane.pid}`), { code: "ENOENT" },
      "private-server closure must reap every pane before returning, including after pane refusal");
    assert.throws(() => process.kill(pane.pid, 0), { code: "ESRCH" });
  }
  if (ambiguous) {
    assert.deepEqual(ambiguousSignals, [], "server identity ambiguity grants no descendant or server signal");
    for (const pane of retainedPanes) assert.deepEqual(readLinuxProcessIdentity(pane.pid), pane,
      "ambiguous production closure must preserve each live pane until separate fixture teardown");
    assert.equal(readLinuxProcessIdentity(witness.pid)?.startToken, witness.startToken);
    assert.ok(fs.existsSync(path.join(witness.directory, `tmux-${process.getuid()}`, "default")),
      "ambiguity must retain the reachable private socket for audit");
    const retained = JSON.parse(fs.readFileSync(path.join(witness.directory, "server-identity.json"), "utf8"));
    assert.equal(retained.pid, witness.pid);
    assert.equal(retained.startToken, witness.startToken);
  } else assert.equal(fs.existsSync(`/proc/${witness.pid}`), false,
    "pane refusal must still close and reap the exact verified private server before teardown");
});

test("revoked spawn cleanup failure preserves denial observer and private cleanup audit", async (t) => {
  const { f, ctx, args, binding } = await launchContext(t, "spawn");
  const tmux = await ownedTmuxFixture(t);
  const adapter = withRequestLaunchCleanup({ config: {}, async spawn() {
    assert.equal(tmuxSync(buildNewSessionCmd({ target: "denial-cleanup", cwd: args.cwd })).status, 0);
    return { sessionId: "ss-denial", tmuxTarget: "denial-cleanup" };
  } });
  const launched = await adapter.spawn({ ...args, requestBinding: binding });
  assert.equal(tmux.run(["split-window", "-d", "-t", tmux.run(["list-panes", "-t", "=denial-cleanup", "-F", "#{pane_id}"]).stdout.trim(), "sleep", "60"]).status, 0);
    assert.equal(tmux.run(["list-panes", "-s", "-t", "=denial-cleanup", "-F", "#{pane_id}"]).stdout.trim().split("\n").length, 2, "the actual two-pane mutation must precede cleanup");
  const events = [];
  const tools = [defineTool({ name: "agent.spawn", handler() { revokeRequestContext(ctx); return launched; } })];
  const result = await call(tools, ctx, { denialObserver: event => events.push(event) })(request("agent.spawn", args));
  denied(parse(result));
  assert.deepEqual(events, [{ tool: "agent.spawn", reasonCode: "context.recovery_denied" }]);
  const audit = fs.readFileSync(path.join(path.dirname(f.repositories.app), "audit.jsonl"), "utf8");
  assert.match(audit, /tool.launch.cleanup/);
  assert.doesNotMatch(audit, /denial-cleanup/);
});

test("adapter post-await denial survives its own cleanup refusal", async (t) => {
  const { ctx, args } = await launchContext(t, "spawn");
  const tmux = await ownedTmuxFixture(t);
  const events = [];
  const adapter = withRequestLaunchCleanup({ config: {}, async spawn() {
    assert.equal(tmuxSync(buildNewSessionCmd({ target: "adapter-denial", cwd: args.cwd })).status, 0);
    const pane = tmux.run(["list-panes", "-t", "=adapter-denial", "-F", "#{pane_id}"]).stdout.trim();
    assert.equal(tmux.run(["split-window", "-d", "-t", pane, "sleep", "60"]).status, 0);
    assert.equal(tmux.run(["list-panes", "-s", "-t", "=adapter-denial", "-F", "#{pane_id}"]).stdout.trim().split("\n").length, 2);
    revokeRequestContext(ctx);
    return { sessionId: "ss-adapter-denial", tmuxTarget: "adapter-denial" };
  } });
  const tools = [defineTool({ name: "agent.spawn", handler(input, binding) {
    return adapter.spawn({ ...input, requestBinding: binding });
  } })];
  const result = await call(tools, ctx, { denialObserver: event => events.push(event) })(request("agent.spawn", args));
  denied(parse(result));
  assert.equal(events.length, 1);
});

test("ordered descendant cleanup lets each parent reap before signalling that parent", async (t) => {
  const { f, ctx, args, binding } = await launchContext(t, "spawn");
  const tmux = await ownedTmuxFixture(t);
  // Avoid interactive profile descendants: this fixture supplies its own tree.
  assert.equal(tmux.run(["set-option", "-g", "default-shell", "/bin/sh"]).status, 0);
  const marker = path.join(f.repositories.app, "ordered-ready.json");
  const reaped = path.join(f.repositories.app, "ordered-reaped");
  const signalled = path.join(f.repositories.app, "ordered-parent-signal.json");
  const executable = path.join(f.repositories.app, "ordered-provider.py");
  fs.writeFileSync(executable, `import os, sys, json, signal, subprocess, time
marker, reaped, signalled = ${JSON.stringify([marker, reaped, signalled])}
if len(sys.argv) > 1 and sys.argv[1] == "leaf":
    def finish(sig, frame):
        time.sleep(.15)
        raise SystemExit(0)
    signal.signal(signal.SIGTERM, finish)
    open(marker + ".leaf", "w").write(str(os.getpid()))
    while True: time.sleep(.01)
elif len(sys.argv) > 1 and sys.argv[1] == "parent":
    child = subprocess.Popen([sys.executable, __file__, "leaf"])
    def finish(sig, frame):
        open(signalled, "w").write(json.dumps(dict(reaped=os.path.exists(reaped))))
        raise SystemExit(0)
    signal.signal(signal.SIGTERM, finish)
    while not os.path.exists(marker + ".leaf"): time.sleep(.01)
    open(marker, "w").write(json.dumps(dict(root=os.getppid(), parent=os.getpid(), leaf=child.pid)))
    child.wait()
    open(reaped, "w").write(str(child.returncode))
    while True: time.sleep(.01)
else:
    child = subprocess.Popen([sys.executable, __file__, "parent"])
    child.wait()
    while True: time.sleep(.01)
`);
  let witness; let replacement;
  const adapter = withRequestLaunchCleanup({ config: {}, async spawn() {
    assert.equal(tmuxSync(buildNewSessionCmd({ target: "ordered-provider", cwd: args.cwd })).status, 0);
    const tuple = tmux.run(["list-panes", "-s", "-t", "=ordered-provider", "-F", "#{session_id} #{pane_id} #{pane_pid}"]).stdout.trim().split(" ");
    assert.equal(tmux.run(["send-keys", "-t", tuple[1], `exec python3 ${executable}`, "Enter"]).status, 0);
    for (let i = 0; i < 200 && !fs.existsSync(marker); i++) await delay(10);
    const tree = JSON.parse(fs.readFileSync(marker, "utf8"));
    witness = Object.fromEntries(Object.entries(tree).map(([name, pid]) => [name, readLinuxProcessIdentity(pid)]));
    assert.equal(tree.root, Number(tuple[2]));
    for (const name of ["root", "parent", "leaf"]) assert.ok(witness[name]?.startToken);
    for (const [name, parent] of [["parent", "root"], ["leaf", "parent"]]) {
      const stat = fs.readFileSync(`/proc/${tree[name]}/stat`, "utf8").split(") ").at(-1).split(" ");
      assert.equal(Number(stat[1]), tree[parent], "fixture must have the actual two-level ancestry");
      assert.notEqual(stat[0], "Z");
    }
    assert.equal(fs.existsSync(reaped), false, "leaf must still require its parent's wait");
    assert.equal(tmux.run(["rename-session", "-t", tuple[0], "ordered-retained"]).status, 0);
    assert.equal(tmux.run(["new-session", "-d", "-s", "ordered-provider", "sleep", "60"]).status, 0);
    replacement = readLinuxProcessIdentity(Number(tmux.run(["list-panes", "-t", "=ordered-provider", "-F", "#{pane_pid}"]).stdout.trim()));
    assert.ok(replacement?.startToken);
    t.diagnostic(JSON.stringify({ orderedBefore: witness, tuple, replacement }));
    return { sessionId: "ss-ordered", tmuxTarget: "ordered-provider" };
  } });
  const launched = await adapter.spawn({ ...args, requestBinding: binding });
  revokeRequestContext(ctx);
  let cleanupError;
  try { await settleRequestLaunch(launched, false); } catch (error) { cleanupError = error; }
  const residue = Object.fromEntries(Object.entries(witness).map(([name, retained]) => {
    let stat;
    try { stat = fs.readFileSync(`/proc/${retained.pid}/stat`, "utf8"); } catch (error) { stat = error.code; }
    let killZero = "live";
    try { process.kill(retained.pid, 0); } catch (error) { killZero = error.code; }
    return [name, { retained, stat, killZero }];
  }));
  t.diagnostic(JSON.stringify({ orderedAfter: residue, cleanupError: cleanupError?.code,
    parentSignal: fs.existsSync(signalled) ? JSON.parse(fs.readFileSync(signalled, "utf8")) : null }));
  assert.equal(cleanupError, undefined, "cleanup must let the intermediate parent reap its delayed leaf");
  assert.deepEqual(JSON.parse(fs.readFileSync(signalled, "utf8")), { reaped: true });
  assert.equal(fs.readFileSync(reaped, "utf8"), "0");
  for (const name of ["root", "parent", "leaf"]) {
    assert.equal(residue[name].stat, "ENOENT", "kernel absence must precede fixture teardown");
    assert.equal(residue[name].killZero, "ESRCH", "a zombie cannot count as reaped");
  }
  assert.deepEqual(readLinuxProcessIdentity(replacement.pid), replacement,
    "a new session using the old name must retain its live identity");
});

test("thread-owned descendant is reaped before closing the retained provider pane", async (t) => {
  const { f, ctx, args, binding } = await launchContext(t, "spawn");
  const tmux = await ownedTmuxFixture(t);
  const marker = path.join(f.repositories.app, "thread.json");
  const executable = path.join(f.repositories.app, "thread-provider.py");
  fs.writeFileSync(executable, `import os, json, threading, subprocess, signal, time
child = None
def worker():
    global child
    child = subprocess.Popen(["sleep", "60"], start_new_session=True)
    stat = open("/proc/%s/stat" % child.pid).read().rsplit(") ", 1)[1].split()
    open(${JSON.stringify(marker)}, "w").write(json.dumps(dict(pid=child.pid, startToken=stat[19], tid=threading.get_native_id(), parent=os.getpid())))
    child.wait()
thread = threading.Thread(target=worker)
thread.start()
def finish(sig, frame):
    if child.poll() is None: child.terminate()
    thread.join()
    raise SystemExit(0)
signal.signal(signal.SIGINT, finish)
signal.signal(signal.SIGTERM, finish)
while True: time.sleep(.01)
`);
  let witness;
  t.after(() => {
    if (witness && readLinuxProcessIdentity(witness.pid)?.startToken === witness.startToken)
      process.kill(witness.pid, "SIGTERM");
  });
  const adapter = withRequestLaunchCleanup({ config: {}, async spawn() {
    assert.equal(tmuxSync(buildNewSessionCmd({ target: "thread-provider", cwd: args.cwd })).status, 0);
    assert.equal(tmux.run(["send-keys", "-t", tmux.run(["list-panes", "-t", "=thread-provider", "-F", "#{pane_id}"]).stdout.trim(), `exec python3 ${executable}`, "Enter"]).status, 0);
    for (let i = 0; i < 200 && !fs.existsSync(marker); i++) await delay(10);
    witness = JSON.parse(fs.readFileSync(marker, "utf8"));
    assert.notEqual(witness.tid, witness.parent);
    assert.equal(fs.readFileSync(`/proc/${witness.parent}/task/${witness.parent}/children`, "utf8").trim(), "");
    assert.ok(fs.readFileSync(`/proc/${witness.parent}/task/${witness.tid}/children`, "utf8").includes(String(witness.pid)));
    return { sessionId: "ss-thread", tmuxTarget: "thread-provider" };
  } });
  const launched = await adapter.spawn({ ...args, requestBinding: binding });
  revokeRequestContext(ctx);
  await settleRequestLaunch(launched, false);
  assert.equal(fs.existsSync(`/proc/${witness.pid}`), false,
    "a child forked by a non-main task must be reaped before its provider is closed");
});

for (const rejection of [false, true]) test(`delegate late cleanup failure audit observes ${rejection ? "post-timeout adapter rejection" : "late result settlement refusal"}`, async (t) => {
  const { f, ctx, args } = await launchContext(t, "delegate");
  const registries = loadRegistries({ policiesDir: new URL("../../policies", import.meta.url).pathname });
  let witness; let finished;
  const done = new Promise(resolve => { finished = resolve; });
  t.after(async () => { await done; await fixtureServerCleanup(witness); });
  const adapter = withRequestLaunchCleanup({ config: {}, async delegate() {
    const env = { ...process.env };
    const run = argv => spawnSync("tmux", argv, { env, encoding: "utf8" });
    assert.equal(run(["new-session", "-d", "-s", "late-refusal", "sleep", "60"]).status, 0);
    const pid = Number(run(["display-message", "-p", "#{pid}"]).stdout.trim());
    witness = { ...readLinuxProcessIdentity(pid), directory: env.TMUX_TMPDIR };
    assert.equal(run(["split-window", "-d", "-t", run(["list-panes", "-t", "=late-refusal", "-F", "#{pane_id}"]).stdout.trim(), "sleep", "60"]).status, 0);
    assert.equal(run(["list-panes", "-s", "-t", "=late-refusal", "-F", "#{pane_id}"]).stdout.trim().split("\n").length, 2, "the actual two-pane mutation must precede cleanup");
    await delay(150);
    if (rejection) throw Object.assign(new Error("late cleanup could not be verified"), { code: "ADAPTER_CLEANUP_FAILED" });
    return { exitCode: 0 };
  } });
  const service = createAgentService({ config: { agentTimeoutMs: 25, repoRoots: [args.cwd] }, registries,
    adapters: new Map([["codex", { delegate(input) {
      return adapter.delegate(input).finally(finished);
    } }]]) });
  const result = await call(buildAgentTools({ agentService: service }), ctx)(request("agent.delegate", args));
  assert.equal(parse(result).error, "TIMEOUT", "request must time out before the actual adapter settles");
  await done; await delay(200);
  const events = fs.readFileSync(path.join(path.dirname(f.repositories.app), "audit.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(events.filter(event => event.where === "agent.delegate.late_cleanup").length, 1,
    "late cleanup failure must be observed exactly once even when the adapter rejects after timeout");
  assert.equal(fs.existsSync(`/proc/${witness.pid}`), false,
    "late cleanup refusal must close the verified private server before fixture teardown");
  assert.equal(sessionRepo.listSessionsByTrace(args.traceId).length, 1);
});

test("canonical cancellation removes durable and hydrated lineage; refused cancel retains it", async (t) => {
  const f = fixture(t); const traceId = await f.seed(); const n = f.next();
  await n.call(request("orchestration.reattach", { traceId }));
  const cancelling = context("new", { recovery: n.recovery, repositoryBindings: f.repositories,
    capabilities: ["orchestration.reattach", "orchestration.cancel", "agent.view"] });
  const invoke = call(f.tools, cancelling);
  await invoke(request("orchestration.reattach", { traceId }));
  assert.equal((await invoke(request("orchestration.cancel", { traceId }))).isError, true);
  assert.ok(f.original.repository.getTrace(traceId));
  assert.equal((await n.call(request("agent.view", { sessionId: "ss-one" }))).isError, undefined);
  assert.equal(terminal(f, traceId).state.status, "cancelled");
  assert.equal(f.original.repository.getTrace(traceId), null, "canonical transition must clean durable recovery state");
  assert.throws(() => bindRequestContext(n.ctx, { action: "agent.view", actionCatalogVersion: 1,
    audience: n.ctx.audience, connectionId: n.ctx.connectionId, now: NOW, args: { sessionId: "ss-one" } }),
  { reasonCode: "context.session_denied" }, "hydrated session must be forgotten, not merely fail a durable check");
});

test("shutdown release failure still closes registry and transport after revocation", async () => {
  const order = [];
  const ctx = context("shutdown", { recovery: { release() { order.push("release"); throw new Error("storage failed"); } } });
  assert.equal(typeof bootstrap.shutdownGateway, "function");
  await assert.rejects(bootstrap.shutdownGateway({ requestContext: ctx,
    tools: [], closeRegistry: async () => { order.push("registry"); },
    server: { async close() { order.push("transport"); } }, input: { pause() { order.push("pause"); } } }), /storage failed/);
  assert.deepEqual(order, ["release", "registry", "transport", "pause"]);
  assert.throws(() => bindRequestContext(ctx, { action: "orchestration.view", actionCatalogVersion: 1,
    audience: ctx.audience, connectionId: ctx.connectionId, now: NOW, args: {} }), { reasonCode: "context.revoked" });
});

test("canonical session closure atomically removes durable and hydrated session bindings", async (t) => {
  const f = fixture(t); const traceId = await f.seed();
  f.database.exec("UPDATE sessions SET lifecycle_state = 'running', lifecycle_version = 1 WHERE session_id = 'ss-one'");
  const n = f.next(); await n.call(request("orchestration.reattach", { traceId }));
  sessionRepo.setSessionStatus("ss-one", "closed", NOW);
  assert.deepEqual(f.original.repository.getTrace(traceId).payload.sessions, []);
  assert.throws(() => bindRequestContext(n.ctx, { action: "agent.view", actionCatalogVersion: 1,
    audience: n.ctx.audience, connectionId: n.ctx.connectionId, now: NOW, args: { sessionId: "ss-one" } }), { reasonCode: "context.session_denied" });
});

test("failed terminal cleanup rolls back canonical cancellation and preserves hydrated lineage", async (t) => {
  const f = fixture(t); const traceId = await f.seed(); const n = f.next();
  await n.call(request("orchestration.reattach", { traceId }));
  f.database.exec("CREATE TRIGGER fail_cleanup BEFORE DELETE ON request_context_lineage BEGIN SELECT RAISE(ABORT, 'cleanup failed'); END");
  assert.throws(() => terminal(f, traceId), { code: "LIFECYCLE_REPOSITORY_CONFLICT" });
  assert.equal(f.database.prepare("SELECT lifecycle_state FROM orchestration_sessions WHERE trace_id = ?").get(traceId).lifecycle_state, "active");
  assert.ok(f.original.repository.getTrace(traceId));
  assert.equal((await n.call(request("agent.view", { sessionId: "ss-one" }))).isError, undefined);
});

for (const change of ["complete", "cancel", "kill", "owner", "revoke"]) test(`ask refuses ${change} racing its pre-send provider observation`, async (t) => {
  const f = fixture(t); const traceId = await f.seed(); const n = f.next();
  await n.call(request("orchestration.reattach", { traceId }));
  let sends = 0; let observations = 0;
  const service = createAgentService({ config: {}, registries: {}, adapters: new Map([["codex", {
    async view() {
      observations++;
      if (change === "complete" || change === "cancel") terminal(f, traceId,
        change === "complete" ? LifecycleAction.ORCHESTRATION_COMPLETE : LifecycleAction.ORCHESTRATION_CANCEL);
      if (change === "kill") f.database.exec("UPDATE sessions SET status = 'closed'");
      if (change === "owner") f.database.exec("UPDATE request_context_lineage SET owner_connection_id = 'other'");
      if (change === "revoke") revokeRequestContext(n.ctx);
      return { snapshot: "before" };
    },
    async ask() { sends++; return { snapshot: "sent" }; },
  }]]) });
  denied(parse(await call(buildAgentTools({ agentService: service }), n.ctx)(request("agent.ask", { traceId, sessionId: "ss-one", prompt: "never send this" }))));
  assert.equal(observations, 1); assert.equal(sends, 0, "no provider input may be sent after ownership/state changed at the await boundary");
});

for (const backend of ["Darwin", "PostgreSQL"]) test(`${backend} recovery fails closed while ordinary creation remains available`, async () => {
  const recovery = backend === "Darwin" ? createLocalRecoveryIdentity({ host: { platform: "darwin" }, backend: "sqlite" })
    : api.createRequestRecoveryService({ database: { backend: "postgres" }, identity, owner });
  assert.equal(recovery, null);
  const ctx = context("unsupported", { recovery, capabilities: ["orchestration.create", "orchestration.reattach", "orchestration.view"] });
  const tools = [...buildRecoveryTools(), defineTool({ name: "orchestration.create", handler: () => ({ traceId: "tr-normal" }) }),
    ...buildOrchestrationTools().filter((tool) => tool.name === "orchestration.view")];
  const invoke = call(tools, ctx);
  assert.equal((await invoke(request("orchestration.create", { callerAgent: "codex", callerRole: "orchestrator" }))).isError, undefined);
  denied(parse(await invoke(request("orchestration.reattach", { traceId: "tr-normal" }))));
  assert.deepEqual(parse(await invoke(request("orchestration.view"))), { reattachableTraces: [], truncated: false });
});

test("two actual processes race over separate SQLite handles and only winner hydrates", { timeout: 15000 }, async (t) => {
  const f = fixture(t); const traceId = await f.seed();
  const input = { stateDb: f.database.name, traceId, repositories: f.repositories, identity: { ...identity, verify: undefined }, now: NOW, expiresAt: EXPIRES };
  const children = [];
  t.after(() => { for (const child of children) if (child.exitCode === null) child.kill("SIGKILL"); });
  function participant(connectionId) {
    const child = spawn(process.execPath, [new URL("./helpers/reattach_race_worker.js", import.meta.url).pathname], { stdio: ["pipe", "pipe", "pipe", "ipc"] });
    children.push(child);
    let stderr = ""; child.stderr.on("data", (data) => { stderr += data; });
    return new Promise((resolve, reject) => {
      child.on("error", reject); child.on("exit", (code) => { if (code !== 0) reject(new Error(`race worker ${code}: ${stderr}`)); });
      child.once("message", () => resolve({ child, result: new Promise((done) => child.once("message", done)) }));
      child.send({ ...input, connectionId });
    });
  }
  const ready = await Promise.all([participant("race-a"), participant("race-b")]);
  for (const { child } of ready) child.send("go");
  const results = await Promise.all(ready.map(({ result }) => result));
  assert.equal(results.filter(({ claim }) => !claim.isError).length, 1, "exactly one real process commits ownership");
  const loser = results.find(({ claim }) => claim.isError);
  denied(parse(loser.claim)); denied(parse(loser.session)); denied(parse(loser.trace));
  assert.equal(loser.taskOwned, false, "loser must acquire neither task nor session nor trace memory");
  const winner = results.find(({ claim }) => !claim.isError);
  assert.equal(winner.taskOwned, true); assert.equal(winner.session.isError, undefined);
  assert.equal(f.original.repository.getTrace(traceId).owner.connectionId, winner.connectionId);
  for (const { child } of ready) child.send("stop");
  await Promise.all(ready.map(({ child }) => new Promise((resolve) => child.once("exit", resolve))));
});

for (const [name, change] of [
  ["wrong repository registry ID", (f) => ({ renamed: f.repositories.app })],
  ["same registry ID changed canonical root", (f) => ({ app: f.repositories.second })],
]) test(`${name} refuses the whole trace without probes or hydration`, async (t) => {
  const f = fixture(t); const traceId = await f.seed(); const n = f.next({}, change(f));
  denied(parse(await n.call(request("orchestration.reattach", { traceId }))));
  assert.deepEqual(parse(await n.call(request("orchestration.view"))), { reattachableTraces: [], truncated: false });
  assert.equal(f.probes.length, 0);
  denied(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))));
});

for (const [name, sql] of [
  ["taskless", "DELETE FROM sessions; DELETE FROM tasks; UPDATE request_context_lineage SET payload_json = '{\"tasks\":[],\"sessions\":[]}'"],
  ["legacy task action", "UPDATE tasks SET target_action = NULL"],
  ["tampered task action", "UPDATE tasks SET target_action = 'code.write'"],
  ["tampered task role", "UPDATE tasks SET assigned_role = 'reviewer'"],
  ["tampered task agent", "UPDATE tasks SET assigned_agent = 'pi'"],
  ["tampered session target", "UPDATE sessions SET tmux_target = 'child-one-extra'"],
  ["incomplete task binding", "UPDATE request_context_lineage SET payload_json = '{\"tasks\":[],\"sessions\":[]}'"],
  ["unknown metadata version", "UPDATE request_context_lineage SET schema_version = 2"],
  ["original exact expiry", `UPDATE request_context_lineage SET expires_at = '${NOW}'`],
]) test(`${name} recovery denies generically without discovery leakage`, async (t) => {
  const f = fixture(t); const traceId = await f.seed(); f.database.exec(sql); const n = f.next();
  assert.deepEqual(parse(await n.call(request("orchestration.view"))), { reattachableTraces: [], truncated: false });
  denied(parse(await n.call(request("orchestration.reattach", { traceId }))));
  assert.deepEqual(f.probes, []);
  denied(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))));
});

test("closed sessions are skipped and renewed current context never extends original expiry", async (t) => {
  const f = fixture(t); const traceId = await f.seed();
  f.database.exec("UPDATE sessions SET status = 'closed'");
  const n = f.next();
  const renewed = context("new", { expiresAt: "2026-10-09T00:00:00.000Z", recovery: n.recovery, repositoryBindings: f.repositories, capabilities: ["orchestration.reattach", "agent.view"] });
  n.ctx = renewed; n.call = call(f.tools, renewed);
  assert.deepEqual(parse(await n.call(request("orchestration.reattach", { traceId }))).skippedSessions,
    [{ sessionId: "ss-one", reason: "session_closed" }]);
  assert.deepEqual(f.probes, []);
  assert.equal(f.original.repository.getTrace(traceId).expiresAt, EXPIRES);
  denied(parse(await call(f.tools, n.ctx, { now: () => EXPIRES })(request("orchestration.reattach", { traceId }))));
});

test("overall five-second probe budget refuses atomically without partial hydration", async (t) => {
  const f = fixture(t); const traceId = await f.seed(); const readings = [0, 0, 5000];
  const n = f.next({ clock: () => readings.shift(), probeTarget: () => true });
  denied(parse(await n.call(request("orchestration.reattach", { traceId }))));
  assert.equal(f.original.repository.getTrace(traceId).owner.connectionId, "original");
  denied(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))));
});

test("expired current context denies recovery even while original context is valid", async (t) => {
  const f = fixture(t); const traceId = await f.seed();
  const n = f.next();
  const expired = context("new", { expiresAt: NOW, recovery: n.recovery, repositoryBindings: f.repositories,
    capabilities: ["orchestration.reattach"] });
  denied(parse(await call(f.tools, expired)(request("orchestration.reattach", { traceId }))));
  assert.equal(f.original.repository.getTrace(traceId).owner.connectionId, "original");
});

test("discovery cap counts eligible traces only and explicit trace beyond cap remains usable", async (t) => {
  const f = fixture(t); const source = await f.seed();
  const payload = JSON.parse(f.database.prepare("SELECT payload_json FROM request_context_lineage WHERE trace_id = ?").get(source).payload_json);
  f.database.exec("DELETE FROM sessions; DELETE FROM tasks; DELETE FROM request_context_lineage; DELETE FROM orchestration_sessions");
  for (let i = 0; i < 103; i++) {
    const traceId = `tr-${String(i).padStart(3, "0")}`; const taskId = `ts-${i}`;
    f.database.prepare("INSERT INTO orchestration_sessions (session_id,trace_id,caller_agent,caller_role,status,created_at) VALUES (?,?, 'codex','orchestrator','active',?)").run(`os-${i}`, traceId, NOW);
    f.database.prepare("INSERT INTO tasks (task_id,trace_id,assigned_agent,assigned_role,repo,status,created_at,target_action) VALUES (?,?, 'codex','coder','app','pending',?,'code.read')").run(taskId, traceId, NOW);
    const task = { ...payload.tasks[0], taskId };
    f.original.repository.createTrace({ traceId, identity, owner, audience: "agents-gateway", expiresAt: EXPIRES });
    f.original.repository.mergeTask({ traceId, owner, task });
  }
  f.database.exec("UPDATE request_context_lineage SET principal_id = 'linux-uid:9999' WHERE trace_id = 'tr-000'; UPDATE request_context_lineage SET expires_at = '2026-10-07T12:00:00.000Z' WHERE trace_id = 'tr-001'");
  const n = f.next(); const result = parse(await n.call(request("orchestration.view")));
  assert.equal(result.truncated, true); assert.equal(result.reattachableTraces.length, 100);
  assert.equal(result.reattachableTraces[0].traceId, "tr-002"); assert.equal(result.reattachableTraces.at(-1).traceId, "tr-101");
  assert.doesNotMatch(JSON.stringify(result), /canonicalRoot|statePath|linux-uid|child-one|tr-000|tr-001/);
  denied(parse(await n.call(request("orchestration.view", { traceId: "tr-102" }))));
  assert.equal(f.original.repository.getTrace("tr-102").owner.connectionId, "original");
  assert.equal((await n.call(request("orchestration.reattach", { traceId: "tr-102" }))).isError, undefined);
  f.database.exec("UPDATE request_context_lineage SET principal_id = 'linux-uid:9999' WHERE trace_id = 'tr-102'");
  assert.equal(parse(await n.call(request("orchestration.view"))).truncated, false, "foreign entries must not inflate truncation");
});

for (const action of ["task.assign", "agent.spawn"]) test(`${action} durable write failure never publishes a memory binding`, async (t) => {
  const f = fixture(t); const traceId = await f.seed();
  const capable = context(owner.connectionId, { recovery: f.original, repositoryBindings: f.repositories,
    lineage: { traces: [{ traceId }], tasks: [{ taskId: "ts-one", traceId, repositoryId: "app", targetAgent: "codex", targetRole: "coder", targetAction: "code.read" }] },
    capabilities: [action, "agent.view", "agent.spawn"] });
  const tools = [defineTool({ name: action, handler() {
    if (action === "task.assign") {
      f.database.prepare("INSERT INTO tasks (task_id,trace_id,assigned_agent,assigned_role,repo,status,created_at,target_action) VALUES ('ts-failed',?,'codex','coder','app','pending',?,'code.read')").run(traceId, NOW);
      return { taskId: "ts-failed", assignedAgent: "codex", assignedRole: "coder" };
    }
    sessionRepo.createSession({ sessionId: "ss-failed", taskId: "ts-one", traceId, agent: "codex", role: "coder", tmuxTarget: "failed-child", status: "running", startedAt: NOW, closedAt: null });
    return { sessionId: "ss-failed", tmuxTarget: "failed-child" };
  } })];
  f.database.exec("CREATE TRIGGER fail_merge BEFORE UPDATE ON request_context_lineage BEGIN SELECT RAISE(ABORT, 'metadata failed'); END");
  const args = action === "task.assign" ? { traceId, caller: { agent: "codex", role: "orchestrator" }, target: { agent: "codex", role: "coder", action: "code.read" }, repo: "app" }
    : { traceId, taskId: "ts-one", agent: "codex", role: "coder", repo: "app", cwd: f.repositories.app };
  assert.equal((await call(tools, capable)(request(action, args))).isError, true);
  assert.ok(f.database.prepare(action === "task.assign" ? "SELECT task_id FROM tasks WHERE task_id = 'ts-failed'"
    : "SELECT session_id FROM sessions WHERE session_id = 'ss-failed'").get(), "the real result-recording path must reach the business write before the metadata failure");
  const probe = action === "task.assign" ? { action: "agent.spawn", args: { ...args, taskId: "ts-failed", agent: "codex", role: "coder", cwd: f.repositories.app } }
    : { action: "agent.view", args: { sessionId: "ss-failed" } };
  assert.throws(() => bindRequestContext(capable, { ...probe, actionCatalogVersion: 1, audience: capable.audience,
    connectionId: capable.connectionId, now: NOW }), { code: "REQUEST_CONTEXT_DENIED" });
  assert.equal(f.original.repository.getTrace(traceId).payload[action === "task.assign" ? "tasks" : "sessions"].length, 1);
});

test("same OS principal machine state and every repo reattach after restart without implicit ownership", async (t) => {
  const f = fixture(t); const traceId = await f.seed(); const n = f.next();
  denied(parse(await n.call(request("orchestration.view", { traceId }))));
  assert.deepEqual(parse(await n.call(request("orchestration.view"))), { reattachableTraces: [{ traceId, status: "active", expiresAt: EXPIRES }], truncated: false });
  denied(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))));
  assert.equal(f.probes.length, 0, "discovery and denial must not probe targets");
  assert.deepEqual(parse(await n.call(request("orchestration.reattach", { traceId }))), { traceId, reattachedTaskIds: ["ts-one"], reattachedSessionIds: ["ss-one"], skippedSessions: [] });
  assert.equal(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))).snapshot, "same target");
  assert.equal(parse(await n.call(request("agent.ask", { sessionId: "ss-one", prompt: "literal", traceId }))).snapshot, "asked same target");
  assert.deepEqual(f.reached, ["child-one", "child-one"]);
  assert.deepEqual(f.probes, [{ target: "child-one", timeout: 1000 }]);
  assert.equal(f.original.repository.getTrace(traceId).expiresAt, EXPIRES);
});

test("ordinary session denial logs trace_reattachable through wrapper without caller trace or ownership", async (t) => {
  const f = fixture(t); const traceId = await f.seed(); const n = f.next(); const events = [];
  const observed = call(f.tools, n.ctx, { denialObserver: (event) => events.push(event) });
  denied(parse(await observed(request("agent.view", { sessionId: "ss-one" }))));
  assert.deepEqual(events, [{ tool: "agent.view", reasonCode: "context.trace_reattachable" }]);
  assert.equal(f.original.repository.getTrace(traceId).owner.connectionId, "original");
  assert.equal(f.probes.length, 0);
});

for (const [name, changes] of [
  ["different UID refuses", { identity: { ...identity, principalId: "linux-uid:1001" } }],
  ["same UID different machine digest refuses", { identity: { ...identity, machineDigest: "b".repeat(64) } }],
  ["copied DB at different canonical state path refuses", { identity: { ...identity, statePath: "/other/state.db" } }],
  ["credentials changed since startup refuse", { identity: { ...identity, verify: () => false } }],
  ["live prior Gateway owner cannot be stolen", { priorOwnerAbsent: () => false }],
  ["ambiguous prior-owner observation refuses", { priorOwnerAbsent: () => null }],
  ["ambiguous tmux target observation refuses", { probeTarget: () => null }],
]) test(name, async (t) => {
  const f = fixture(t); const traceId = await f.seed(); const n = f.next(changes);
  denied(parse(await n.call(request("orchestration.reattach", { traceId }))));
  denied(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))));
  assert.equal(f.original.repository.getTrace(traceId).owner.connectionId, "original");
});

test("second repo mismatch denies the entire multi-repo trace before target probes", async (t) => {
  const f = fixture(t); const traceId = await f.seed(); f.addTask(traceId, "ts-two", "second");
  const n = f.next({}, { app: f.repositories.app });
  assert.deepEqual(parse(await n.call(request("orchestration.view"))), { reattachableTraces: [], truncated: false });
  denied(parse(await n.call(request("orchestration.reattach", { traceId }))));
  assert.equal(f.probes.length, 0);
});

test("failed transaction grants no memory ownership and one competing connection wins", async (t) => {
  const f = fixture(t); const traceId = await f.seed(); const n = f.next();
  f.database.exec("CREATE TRIGGER fail_claim BEFORE UPDATE ON request_context_lineage BEGIN SELECT RAISE(ABORT, 'write failed'); END");
  assert.equal((await n.call(request("orchestration.reattach", { traceId }))).isError, true);
  denied(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))));
  f.database.exec("DROP TRIGGER fail_claim");
  const loser = f.next({ priorOwnerAbsent: (previous) => previous.connectionId === "original" }, f.repositories, "loser");
  const winner = f.next({ priorOwnerAbsent: (previous) => previous.connectionId === "original" });
  const outcomes = await Promise.all([winner.call(request("orchestration.reattach", { traceId })), loser.call(request("orchestration.reattach", { traceId }))]);
  assert.equal(outcomes.filter((r) => !r.isError).length, 1);
  denied(parse(outcomes[1]));
  const revision = f.original.repository.getTrace(traceId).revision;
  assert.equal((await winner.call(request("orchestration.reattach", { traceId }))).isError, undefined);
  assert.equal(f.original.repository.getTrace(traceId).revision, revision);
});

test("gone target is reported without session rebinding and successful kill removes durable and memory bindings", async (t) => {
  const f = fixture(t); const traceId = await f.seed(); f.setExists(false); const n = f.next();
  assert.deepEqual(parse(await n.call(request("orchestration.reattach", { traceId }))).skippedSessions, [{ sessionId: "ss-one", reason: "target_gone" }]);
  denied(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))));
  f.setExists(true); await n.call(request("orchestration.reattach", { traceId }));
  await n.call(request("agent.kill", { sessionId: "ss-one", traceId }));
  assert.deepEqual(f.original.repository.getTrace(traceId).payload.sessions, []);
  denied(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))));
});

test("terminal state expiry and durable owner changes defeat already hydrated bindings", async (t) => {
  const f = fixture(t); const traceId = await f.seed(); const n = f.next();
  await n.call(request("orchestration.reattach", { traceId }));
  f.database.prepare("UPDATE request_context_lineage SET owner_connection_id = 'other' WHERE trace_id = ?").run(traceId);
  denied(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))));
  f.database.prepare("UPDATE request_context_lineage SET owner_connection_id = 'new', expires_at = ? WHERE trace_id = ?").run(NOW, traceId);
  denied(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))));
  f.database.prepare("UPDATE request_context_lineage SET expires_at = ? WHERE trace_id = ?").run(EXPIRES, traceId);
  f.database.prepare("UPDATE orchestration_sessions SET lifecycle_state = 'cancelled' WHERE trace_id = ?").run(traceId);
  denied(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))));
  assert.deepEqual(f.reached, []);
});

test("successful completion removes durable trace and all hydrated children", async (t) => {
  const f = fixture(t); const traceId = await f.seed(); const n = f.next();
  await n.call(request("orchestration.reattach", { traceId }));
  assert.equal((await n.call(request("orchestration.complete", { traceId }))).isError, undefined);
  assert.equal(f.original.repository.getTrace(traceId), null);
  denied(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))));
});

for (const method of ["view", "kill", "ask"]) for (const change of ["complete", "owner", "expiry"]) test(`${method} refuses ${change} after awaited adapter work`, async (t) => {
  const f = fixture(t); const traceId = await f.seed(); const n = f.next();
  await n.call(request("orchestration.reattach", { traceId }));
  let reached = 0;
  const adapter = { async view() { return { snapshot: "before" }; } };
  adapter[method] = async () => {
    reached++;
    if (change === "complete") terminal(f, traceId, LifecycleAction.ORCHESTRATION_COMPLETE);
    if (change === "owner") f.database.exec("UPDATE request_context_lineage SET owner_connection_id = 'other'");
    if (change === "expiry") f.database.prepare("UPDATE request_context_lineage SET expires_at = ?").run(NOW);
    return { snapshot: "private pane output", status: "killed" };
  };
  const service = createAgentService({ config: {}, registries: {}, adapters: new Map([["codex", adapter]]) });
  const result = await call(buildAgentTools({ agentService: service }), n.ctx)(request(`agent.${method}`, { traceId, sessionId: "ss-one", ...(method === "ask" ? { prompt: "owned input" } : {}) }));
  denied(parse(result)); assert.equal(reached, 1); assert.doesNotMatch(JSON.stringify(result), /private pane/);
  if (method === "kill") assert.equal(sessionRepo.getSessionById("ss-one").status, "running", "stale completion must not close the business row");
});

test("view refuses original expiry elapsing during await despite later current expiry", async (t) => {
  const f = fixture(t); const traceId = await f.seed(); const n = f.next();
  const soon = new Date(Date.parse(NOW) + 80).toISOString();
  f.database.prepare("UPDATE request_context_lineage SET expires_at = ?").run(soon);
  await n.call(request("orchestration.reattach", { traceId }));
  let observed = 0;
  const service = createAgentService({ config: {}, registries: {}, adapters: new Map([["codex", { async view() {
    observed++; await new Promise(resolve => setTimeout(resolve, 100)); return { snapshot: "expired output" };
  } }]]) });
  denied(parse(await call(buildAgentTools({ agentService: service }), n.ctx)(request("agent.view", { sessionId: "ss-one" }))));
  assert.equal(observed, 1);
});

for (const rollback of [false, true]) test(`outer lifecycle transaction ${rollback ? "rollback retains" : "commit revokes"} hydrated memory without premature publication`, async (t) => {
  const f = fixture(t); const traceId = await f.seed(); const n = f.next();
  await n.call(request("orchestration.reattach", { traceId }));
  let publications = 0;
  const unsubscribe = n.recovery.subscribeTerminal(() => publications++); t.after(unsubscribe);
  try { f.database.transaction(() => {
    terminal(f, traceId);
    assert.equal(publications, 0, "a nested savepoint is not an outer commit");
    if (rollback) throw new Error("outer rollback");
  })(); } catch (error) { if (!rollback) throw error; assert.equal(error.message, "outer rollback"); }
  const result = await n.call(request("agent.view", { sessionId: "ss-one" }));
  if (rollback) { assert.equal(result.isError, undefined); assert.equal(publications, 0); assert.ok(f.original.repository.getTrace(traceId)); }
  else { denied(parse(result)); assert.equal(publications, 1); assert.equal(f.original.repository.getTrace(traceId), null); }
});

test("reattach inside an outer transaction refuses without publishing a savepoint claim", async (t) => {
  const f = fixture(t); const traceId = await f.seed(); const n = f.next();
  let error;
  f.database.transaction(() => {
    try {
      const effective = bindRequestContext(n.ctx, { action: "orchestration.reattach", actionCatalogVersion: 1, audience: n.ctx.audience, connectionId: n.ctx.connectionId, now: NOW, args: { traceId } });
      // The actual tool calls this synchronous publication path.
      reattachRequestContextTrace(effective);
    } catch (caught) { error = caught; }
  })();
  assert.equal(error?.code, "REQUEST_CONTEXT_DENIED");
  assert.equal(f.original.repository.getTrace(traceId).owner.connectionId, "original");
  denied(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))));
});

for (const method of ["spawn", "delegate"]) for (const change of ["complete", "owner", "expiry", "revoke"]) test(`${method} refuses ${change} before post-await business persistence`, async (t) => {
  const f = fixture(t); const traceId = await f.seed();
  // Use the real configured repository ID and real dry-run result contract.
  f.database.exec("UPDATE tasks SET repo = 'sample-apps'");
  const payload = f.original.repository.getTrace(traceId).payload;
  payload.tasks[0].repositoryId = "sample-apps";
  f.database.prepare("UPDATE request_context_lineage SET payload_json = ?").run(JSON.stringify(payload));
  const repositories = { "sample-apps": f.repositories.app };
  const n = f.next({}, repositories);
  const ctx = context("new", { recovery: n.recovery, repositoryBindings: repositories,
    capabilities: ["orchestration.reattach", `agent.${method}`] });
  await call(f.tools, ctx)(request("orchestration.reattach", { traceId }));
  const registries = loadRegistries({ policiesDir: new URL("../../policies", import.meta.url).pathname });
  const config = { dryRun: true, repoRoots: [f.repositories.app], agentTimeoutMs: 1000 };
  const actual = new CodexAdapter({ config, registries }); let reached = 0;
  const adapter = { async [method](args) {
    reached++; const result = await actual[method](args);
    if (change === "complete") terminal(f, traceId, LifecycleAction.ORCHESTRATION_COMPLETE);
    if (change === "owner") f.database.exec("UPDATE request_context_lineage SET owner_connection_id = 'other'");
    if (change === "expiry") f.database.prepare("UPDATE request_context_lineage SET expires_at = ?").run(NOW);
    if (change === "revoke") revokeRequestContext(ctx);
    return result;
  } };
  const service = createAgentService({ config, registries, adapters: new Map([["codex", adapter]]) });
  const result = await call(buildAgentTools({ agentService: service }), ctx)(request(`agent.${method}`, {
    traceId, taskId: "ts-one", agent: "codex", role: "coder", repo: "sample-apps", cwd: f.repositories.app,
    ...(method === "delegate" ? { prompt: "dry-run only" } : {}) }));
  denied(parse(result)); assert.equal(reached, 1, "must reach the real selection contract and adapter await");
  assert.equal(f.database.prepare("SELECT count(*) AS n FROM sessions").get().n, 1, "expired work must not create any new business session");
});

for (const sql of [
  "UPDATE sessions SET task_id = 'ts-two'", "UPDATE sessions SET agent = 'pi'", "UPDATE sessions SET role = 'reviewer'",
  "UPDATE request_context_lineage SET principal_id = 'linux-uid:01'",
  "UPDATE request_context_lineage SET machine_digest = 'not-a-digest'",
  "UPDATE request_context_lineage SET state_path = 'relative'",
  "UPDATE request_context_lineage SET owner_start_token = 'malformed'",
]) test(`runtime binding refuses malformed or mismatched stored conjunction: ${sql}`, async (t) => {
  const f = fixture(t); const traceId = await f.seed(); f.addTask(traceId, "ts-two"); f.database.exec(sql); const n = f.next();
  denied(parse(await n.call(request("orchestration.reattach", { traceId }))));
  assert.deepEqual(parse(await n.call(request("orchestration.view"))), { reattachableTraces: [], truncated: false });
  assert.equal(f.probes.length, 0); denied(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))));
});

for (const event of ["complete", "kill"]) for (const ordering of ["terminal-first", "claim-first", "lock-held"]) test(`${event} versus recovery on independent SQLite handles: ${ordering}`, async (t) => {
  const f = fixture(t); const traceId = await f.seed();
  f.database.exec("UPDATE sessions SET lifecycle_state = 'running', lifecycle_version = 1 WHERE session_id = 'ss-one'");
  const require = createRequire(new URL("../../gateway/package.json", import.meta.url));
  const other = new (require("better-sqlite3"))(f.database.name, { timeout: 25 }); other.backend = "sqlite"; t.after(() => other.close());
  const n = f.next({ database: other });
  let residue = f.database.prepare("SELECT * FROM request_context_lineage WHERE trace_id = ?").get(traceId);
  const close = () => event === "complete" ? terminal(f, traceId, LifecycleAction.ORCHESTRATION_COMPLETE) : sessionRepo.setSessionStatus("ss-one", "closed", NOW);
  if (ordering === "claim-first") {
    assert.equal((await n.call(request("orchestration.reattach", { traceId }))).isError, undefined);
    residue = f.database.prepare("SELECT * FROM request_context_lineage WHERE trace_id = ?").get(traceId);
  }
  if (ordering === "lock-held") {
    f.database.exec("BEGIN IMMEDIATE");
    try {
      close();
      denied(parse(await n.call(request("orchestration.reattach", { traceId }))));
      assert.equal(other.inTransaction, false, "losing claim releases its lock");
    } finally { f.database.exec("COMMIT"); }
  } else close();
  // Restore the pre-terminal row to model interrupted cleanup, across the other handle.
  f.database.prepare(`INSERT OR REPLACE INTO request_context_lineage (${Object.keys(residue).join(",")}) VALUES (${Object.keys(residue).map(() => "?").join(",")})`).run(...Object.values(residue));
  assert.ok(f.original.repository.getTrace(traceId));
  // Deliberate interrupted-cleanup residue cannot defeat authoritative terminal rows.
  if (event === "complete") {
    denied(parse(await n.call(request("orchestration.reattach", { traceId }))));
  } else {
    assert.deepEqual(parse(await n.call(request("orchestration.reattach", { traceId }))).reattachedSessionIds, []);
  }
  denied(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))));
});

test("expiry elapsing during bounded synchronous target probe refuses before claim publication", async (t) => {
  const f = fixture(t); const traceId = await f.seed();
  f.database.prepare("UPDATE request_context_lineage SET expires_at = ?").run(new Date(Date.parse(NOW) + 50).toISOString());
  const readings = [0, 0, 100]; const n = f.next({ clock: () => readings.shift(), probeTarget: () => true });
  denied(parse(await n.call(request("orchestration.reattach", { traceId }))));
  assert.equal(f.original.repository.getTrace(traceId).owner.connectionId, "original");
  denied(parse(await n.call(request("agent.view", { sessionId: "ss-one" }))));
});

test("second repository changed root refuses the entire trace with first repository matching", async (t) => {
  const f = fixture(t); const traceId = await f.seed(); f.addTask(traceId, "ts-two", "second");
  const changed = path.join(path.dirname(f.repositories.app), "changed-second"); fs.mkdirSync(changed);
  const n = f.next({}, { app: f.repositories.app, second: changed });
  denied(parse(await n.call(request("orchestration.reattach", { traceId })))); assert.equal(f.probes.length, 0);
  assert.deepEqual(parse(await n.call(request("orchestration.view"))), { reattachableTraces: [], truncated: false });
});

for (const rollback of [false, true]) test(`outer session closure ${rollback ? "rollback retains" : "commit revokes"} hydrated session after durable outcome`, async (t) => {
  const f = fixture(t); const traceId = await f.seed();
  f.database.exec("UPDATE sessions SET lifecycle_state = 'running', lifecycle_version = 1 WHERE session_id = 'ss-one'");
  const n = f.next(); await n.call(request("orchestration.reattach", { traceId }));
  let publications = 0; t.after(n.recovery.subscribeTerminal(() => publications++));
  try { f.database.transaction(() => {
    sessionRepo.setSessionStatus("ss-one", "closed", NOW);
    assert.equal(publications, 0, "savepoint closure must not publish memory changes");
    if (rollback) throw new Error("outer rollback");
  })(); } catch (error) { if (!rollback) throw error; assert.equal(error.message, "outer rollback"); }
  const result = await n.call(request("agent.view", { sessionId: "ss-one" }));
  if (rollback) { assert.equal(result.isError, undefined); assert.equal(publications, 0); }
  else { denied(parse(result)); assert.equal(publications, 1); }
});

test("durable result recording refuses publication from an uncommitted outer transaction", async (t) => {
  const f = fixture(t);
  const effective = bindRequestContext(f.ctx, { action: "orchestration.create", actionCatalogVersion: 1,
    audience: f.ctx.audience, connectionId: f.ctx.connectionId, now: NOW, args: { callerAgent: "codex", callerRole: "orchestrator" } });
  f.database.transaction(() => {
    f.database.prepare("INSERT INTO orchestration_sessions (session_id,trace_id,caller_agent,caller_role,status,created_at) VALUES ('os-savepoint','tr-savepoint','codex','orchestrator','active',?)").run(NOW);
    assert.throws(() => recordRequestContextResult(f.ctx, effective, { traceId: "tr-savepoint" }), { code: "REQUEST_CONTEXT_DENIED" });
  })();
  assert.equal(f.original.repository.getTrace("tr-savepoint"), null);
  denied(parse(await f.oldCall(request("orchestration.view", { traceId: "tr-savepoint" }))));
});

test("current context expiry elapsing during await refuses while original durable expiry remains valid", async (t) => {
  const f = fixture(t); const traceId = await f.seed(); const n = f.next();
  const ctx = context("new", { expiresAt: new Date(Date.parse(NOW) + 80).toISOString(), recovery: n.recovery,
    repositoryBindings: f.repositories, capabilities: ["orchestration.reattach", "agent.view"] });
  await call(f.tools, ctx)(request("orchestration.reattach", { traceId }));
  let observed = 0; const service = createAgentService({ config: {}, registries: {}, adapters: new Map([["codex", { async view() {
    observed++; await new Promise(resolve => setTimeout(resolve, 100)); return { snapshot: "expired context" };
  } }]]) });
  denied(parse(await call(buildAgentTools({ agentService: service }), ctx)(request("agent.view", { sessionId: "ss-one" }))));
  assert.equal(observed, 1); assert.equal(f.original.repository.getTrace(traceId).expiresAt, EXPIRES);
});

for (const method of ["spawn", "delegate"]) for (const outcome of method === "spawn" ? ["revoke", "adapter-failure", "adapter-failure-name-reused", "adapter-failure-before-response", "adapter-failure-response-timeout", "record-failure", "name-reused", "multipane", "multiwindow", "ambiguous", "ambiguous-after-signal", "resistant", "detached-descendant", "bounded", "accepted"] : ["revoke", "late", "accepted"]) test(
  outcome === "revoke" ? `${method} post-await denial must leave no untracked real child`
    : `${method} ${outcome} settles only its observed child after durable publication`, async (t) => {
  const f = fixture(t); const traceId = await f.seed();
  const tmux = await ownedTmuxFixture(t);
  const oldDryRun = process.env.AGENTS_DRY_RUN;
  delete process.env.AGENTS_DRY_RUN;
  t.after(() => { if (oldDryRun === undefined) delete process.env.AGENTS_DRY_RUN; else process.env.AGENTS_DRY_RUN = oldDryRun; });
  f.database.exec("UPDATE tasks SET repo = 'sample-apps'");
  const payload = f.original.repository.getTrace(traceId).payload;
  payload.tasks[0].repositoryId = "sample-apps";
  f.database.prepare("UPDATE request_context_lineage SET payload_json = ?").run(JSON.stringify(payload));
  const repositories = { "sample-apps": f.repositories.app };
  const n = f.next({}, repositories);
  const ctx = context("new", { recovery: n.recovery, repositoryBindings: repositories,
    capabilities: ["orchestration.reattach", `agent.${method}`, "agent.view"] });
  await call(f.tools, ctx)(request("orchestration.reattach", { traceId }));
  const marker = path.join(f.repositories.app, "child-ready");
  const detachedMarker = marker + ".descendant";
  const executable = path.join(f.repositories.app, "owned-provider");
  // Use the production adapter with a disposable executable, never a real provider.
  fs.writeFileSync(executable, `#!/usr/bin/env node
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
if (process.argv[2] === "exec") {
  const result = spawnSync("tmux", ["new-session", "-d", "-s", "a05-delegate-descendant", "sleep", "60"]);
  if (result.status !== 0) process.exit(2);
} else {
  if (${JSON.stringify(outcome)} === "resistant") process.on("SIGTERM", () => {});
  if (${JSON.stringify(outcome)} === "detached-descendant") {
    const { spawn } = require("node:child_process");
    const leaf = spawn(process.execPath, ["-e", ${JSON.stringify(`const fs = require("node:fs"); const stat = fs.readFileSync("/proc/self/stat", "utf8").split(") ").at(-1).split(" "); fs.writeFileSync(${JSON.stringify(detachedMarker)}, JSON.stringify({ pid: process.pid, startToken: stat[19], pgid: Number(stat[2]), sid: Number(stat[3]) })); setInterval(() => {}, 1000);`)}], { detached: true, stdio: "ignore" });
    let ended = false; leaf.once("exit", () => { ended = true; });
    const finish = () => { if (ended) process.exit(0); else leaf.once("exit", () => process.exit(0)); };
    process.on("SIGTERM", finish);
    process.on("SIGINT", () => { leaf.kill("SIGTERM"); finish(); });
    const ready = setInterval(() => {
      if (fs.existsSync(${JSON.stringify(detachedMarker)})) {
        clearInterval(ready); fs.writeFileSync(${JSON.stringify(marker)}, String(process.pid));
      }
    }, 10);
  } else fs.writeFileSync(${JSON.stringify(marker)}, String(process.pid));
  setInterval(() => {}, 1000);
}
`, { mode: 0o700 });
  const registries = loadRegistries({ policiesDir: new URL("../../policies", import.meta.url).pathname });
  const config = { dryRun: false, codexBin: executable, repoRoots: [f.repositories.app], adapterTimeoutMs: 2000,
    ...(outcome === "late" ? { agentTimeoutMs: 25 } : {}) };
  const witness = path.join(f.repositories.app, "creation-witness.json");
  const beforeResponse = ["adapter-failure-before-response", "adapter-failure-response-timeout"].includes(outcome);
  const creationCommands = [];
  const signalledChildren = [];
  if (beforeResponse) {
    const kill = process.kill;
    process.kill = function(pid, signal) {
      if (signal === "SIGTERM") signalledChildren.push({ identity: readLinuxProcessIdentity(pid),
        stat: fs.readFileSync(`/proc/${pid}/stat`, "utf8") });
      return kill.call(this, pid, signal);
    };
    t.after(() => { process.kill = kill; });
    const original = childProcess.spawnSync;
    childProcess.spawnSync = function(command, args, options) {
      const result = original(command, args, options);
      if (command === "tmux" && args[0] === "new-session") creationCommands.push({
        args, status: result.status, signal: result.signal, error: result.error?.code,
        stdout: result.stdout, stderr: result.stderr, timeout: options?.timeout,
      });
      return result;
    };
    syncBuiltinESMExports();
    t.after(() => { childProcess.spawnSync = original; syncBuiltinESMExports(); });
  }
  const cleanupStarted = witness + ".cleanup-started";
  if (outcome === "bounded") {
    const realTmux = spawnSync("sh", ["-c", "command -v tmux"], { encoding: "utf8" }).stdout.trim();
    const shim = path.join(f.repositories.app, "bounded-bin"); fs.mkdirSync(shim);
    fs.writeFileSync(path.join(shim, "tmux"), `#!/usr/bin/env node
const fs = require("node:fs"); const { spawnSync } = require("node:child_process");
const args = process.argv.slice(2);
if (args[0] === "list-panes" && fs.existsSync(${JSON.stringify(cleanupStarted)}))
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 700);
const result = spawnSync(${JSON.stringify(realTmux)}, args, { stdio: "inherit" });
process.exit(result.status ?? 2);
`, { mode: 0o700 });
    const previous = process.env.PATH; process.env.PATH = `${shim}:${previous}`;
    t.after(() => { process.env.PATH = previous; });
  }
  if (outcome.startsWith("adapter-failure")) {
    const realTmux = spawnSync("sh", ["-c", "command -v tmux"], { encoding: "utf8" }).stdout.trim();
    const shimDirectory = path.join(f.repositories.app, "tmux-shim");
    fs.mkdirSync(shimDirectory);
    fs.writeFileSync(path.join(shimDirectory, "tmux"), `#!/usr/bin/env node
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const args = process.argv.slice(2);
if (${JSON.stringify(beforeResponse)} && args[0] === "send-keys") process.exit(1);
if (${JSON.stringify(beforeResponse)} && args[0] === "new-session") {
  const run = argv => spawnSync(${JSON.stringify(realTmux)}, argv, { encoding: "utf8" });
  const created = run(args);
  if (created.status !== 0) process.exit(created.status ?? 2);
  const target = args[args.indexOf("-s") + 1];
  const tuple = run(["list-panes", "-t", "=" + target, "-F", "#{session_id} #{pane_id} #{pane_pid}"]).stdout.trim();
  const pid = Number(tuple.split(" ")[2]);
  const startToken = fs.readFileSync("/proc/" + pid + "/stat", "utf8").split(") ").at(-1).split(" ")[19];
  if (run(["rename-session", "-t", "=" + target, "retained-before-response"]).status !== 0) process.exit(2);
  if (run(["new-session", "-d", "-s", target, "sleep", "60"]).status !== 0) process.exit(2);
  const replacementPid = Number(run(["list-panes", "-t", "=" + target, "-F", "#{pane_pid}"]).stdout.trim());
  fs.writeFileSync(${JSON.stringify(witness)}, JSON.stringify({ target, tuple, pid, startToken, replacementPid,
    creation: { status: created.status, signal: created.signal, error: created.error?.code, stdout: created.stdout, stderr: created.stderr } }));
  fs.writeSync(1, created.stdout);
  if (${JSON.stringify(outcome)} === "adapter-failure-response-timeout")
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);
  process.exit(0);
}
const result = spawnSync(${JSON.stringify(realTmux)}, args, { stdio: "inherit" });
if (args[0] === "send-keys" && result.status === 0) {
  for (let i = 0; i < 100 && !fs.existsSync(${JSON.stringify(marker)}); i++)
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
  process.exit(1);
}
process.exit(result.status ?? 2);
`, { mode: 0o700 });
    const originalPath = process.env.PATH;
    process.env.PATH = `${shimDirectory}:${originalPath}`;
    t.after(() => { process.env.PATH = originalPath; });
  }
  const actual = new CodexAdapter({ config, registries });
  let target; let child; let mutatedPanes = false; let extraChild; let ambiguousSignal = false; let cleanupClock;
  const adapter = withRequestLaunchCleanup({ config, async [method](args) {
    const launchEnv = { ...process.env };
    const run = (argv) => spawnSync("tmux", argv, { env: launchEnv, encoding: "utf8", timeout: 1000 });
    let result; let adapterError;
    try { result = await actual[method](args); } catch (error) {
      if (!outcome.startsWith("adapter-failure")) {
        t.diagnostic(JSON.stringify({ launchFailure: error.code, message: error.message }));
        throw error;
      }
      adapterError = error;
      t.diagnostic(JSON.stringify({ originatingAdapterError: { code: error.code, message: error.message, stack: error.stack } }));
    }
    if (beforeResponse) {
      assert.ok(adapterError, "actual adapter must reject before returning a result");
      assert.equal(result, undefined);
      const observed = JSON.parse(fs.readFileSync(witness, "utf8"));
      target = observed.target;
      child = { pid: observed.pid, startToken: observed.startToken };
      t.diagnostic(JSON.stringify({ creationWitness: observed, beforeCleanup: readLinuxProcessIdentity(child.pid) }));
      replacement = readLinuxProcessIdentity(observed.replacementPid);
      assert.ok(replacement?.startToken, "replacement is a real live child before cleanup");
      throw adapterError;
    }
    target = outcome.startsWith("adapter-failure")
      ? run(["list-sessions", "-F", "#{session_name}"]).stdout.trim()
      : method === "spawn" ? result.tmuxTarget : "a05-delegate-descendant";
    for (let attempt = 0; method === "spawn" && attempt < 200 && !fs.existsSync(marker); attempt++) await delay(10);
    assert.equal(run(["has-session", "-t", `=${target}`]).status, 0, "provider created the exact disposable target");
    const observed = run(["list-panes", "-t", `${target}:0`, "-F", "#{pane_pid}"]);
    assert.equal(observed.status, 0);
    if (method === "spawn" && !fs.existsSync(marker)) t.diagnostic(JSON.stringify({ fixturePane: run(["capture-pane", "-p", "-t", `${target}:0.0`]).stdout }));
    if (method === "spawn") assert.ok(fs.existsSync(marker), "the disposable provider actually started");
    const pid = method === "spawn" ? Number(fs.readFileSync(marker, "utf8")) : Number(observed.stdout.trim());
    child = readLinuxProcessIdentity(pid);

    assert.ok(child?.startToken, "observe a real live process before invalidating authority");
    if (outcome === "bounded") {
      for (let i = 0; i < 4; i++) assert.equal(tmuxSync(buildNewSessionCmd({
        target: `bounded-child-${i}`, cwd: f.repositories.app })).status, 0);
      assert.equal(run(["list-sessions", "-F", "#{session_id}"]).stdout.trim().split("\n").length, 5,
        "all five creations must be observed before measuring the one cleanup budget");
      fs.writeFileSync(cleanupStarted, "ready");
      cleanupClock = performance.now(); revokeRequestContext(ctx);
    }
    if (outcome === "detached-descendant") {
      extraChild = JSON.parse(fs.readFileSync(detachedMarker, "utf8"));
      assert.equal(readLinuxProcessIdentity(extraChild.pid)?.startToken, extraChild.startToken);
      assert.equal(extraChild.pgid, extraChild.pid);
      assert.equal(extraChild.sid, extraChild.pid, "the descendant has actually detached from the pane's process session");
      revokeRequestContext(ctx);
    }
    if (outcome === "late") await delay(100);
    if (outcome === "resistant") revokeRequestContext(ctx);
    if (["multipane", "multiwindow"].includes(outcome)) {
      const paneId = run(["list-panes", "-t", `=${target}`, "-F", "#{pane_id}"]).stdout.trim();
      const sessionId = run(["list-panes", "-t", `=${target}`, "-F", "#{session_id}"]).stdout.trim();
      assert.equal(run([outcome === "multipane" ? "split-window" : "new-window", "-d", "-t",
        outcome === "multipane" ? paneId : sessionId, "sleep", "60"]).status, 0);
      const rows = run(["list-panes", "-s", "-t", sessionId, "-F", "#{pane_id} #{pane_pid}"]).stdout.trim().split("\n");
      mutatedPanes = rows.length === 2;
      extraChild = readLinuxProcessIdentity(Number(rows.find(row => !row.startsWith(paneId + " ")).split(" ")[1]));
      assert.equal(mutatedPanes, true);
      assert.ok(extraChild?.startToken);
      revokeRequestContext(ctx);
    }
    if (["ambiguous", "ambiguous-after-signal"].includes(outcome)) {
      const read = fs.readFileSync;
      const kill = process.kill;
      fs.readFileSync = function(file, ...rest) {
        if (String(file) === `/proc/${child.pid}/stat` && (outcome === "ambiguous" || ambiguousSignal))
          throw Object.assign(new Error("ambiguous process observation"), { code: "EACCES" });
        return read.call(this, file, ...rest);
      };
      if (outcome === "ambiguous-after-signal") process.kill = function(pid, signal) {
        if (pid === child.pid && signal === "SIGTERM") { ambiguousSignal = true; return true; }
        return kill.call(this, pid, signal);
      };
      t.after(() => { fs.readFileSync = read; process.kill = kill; });
      revokeRequestContext(ctx);
    }
    if (outcome.startsWith("adapter-failure")) {
      assert.ok(adapterError, "the actual adapter failed before returning any launch result");
      assert.equal(result, undefined);
      if (outcome === "adapter-failure-name-reused") {
        assert.equal(run(["rename-session", "-t", `=${target}`, "retained-pre-result-child"]).status, 0);
        assert.equal(run(["new-session", "-d", "-s", target, "sleep", "60"]).status, 0);
        const observed = run(["list-panes", "-t", `=${target}`, "-F", "#{pane_pid}"]);
        replacement = readLinuxProcessIdentity(Number(observed.stdout.trim()));
        assert.ok(replacement?.startToken);
      }
      throw adapterError;
    }
    if (outcome === "revoke") revokeRequestContext(ctx);
    if (outcome === "record-failure" && method === "spawn") f.database.exec(`CREATE TRIGGER reject_launch_lineage BEFORE UPDATE ON request_context_lineage BEGIN SELECT RAISE(ABORT, 'forced launch metadata failure'); END`);
    return result;
  } });
  let replacement;
  let latePromise;
  if (outcome === "late") t.after(async () => {
    // Fixture-only settlement after the safety assertion; never credit teardown.
    await settleRequestLaunch(await latePromise, false);
  });
  const serviceAdapter = outcome === "late" ? { delegate(args) {
    latePromise = adapter.delegate(args); return latePromise;
  } } : outcome === "detached-descendant" ? { spawn(args) {
    return adapter.spawn(args).catch(error => {
      t.diagnostic(JSON.stringify({ cleanupFailure: error.code, stack: error.stack })); throw error;
    });
  } } : beforeResponse ? { spawn(args) {
    return adapter.spawn(args).catch(error => {
      t.diagnostic(JSON.stringify({ emittedAdapterError: { code: error.code, message: error.message, stack: error.stack } }));
      throw error;
    });
  } } : adapter;
  const service = createAgentService({ config, registries, adapters: new Map([["codex", serviceAdapter]]),
    selectionObservers: { audit() {
      if (outcome !== "name-reused") return;
      assert.equal(tmux.run(["rename-session", "-t", `=${target}`, "retained-owned-child"]).status, 0);
      assert.equal(tmux.run(["new-session", "-d", "-s", target, "sleep", "60"]).status, 0);
      const observed = tmux.run(["list-panes", "-t", `=${target}`, "-F", "#{pane_pid}"]);
      replacement = readLinuxProcessIdentity(Number(observed.stdout.trim()));
      assert.ok(replacement?.startToken);
      throw new Error("force post-launch failure after target name reuse");
    } } });
  const result = await call(buildAgentTools({ agentService: service }), ctx)(request(`agent.${method}`, {
    traceId, taskId: "ts-one", agent: "codex", role: "coder", repo: "sample-apps", cwd: f.repositories.app,
    ...(method === "delegate" ? { prompt: "owned disposable descendant" } : {}) }));
  const returned = parse(result);
  t.diagnostic(JSON.stringify({ returned: { error: returned.error, sessionId: returned.sessionId,
    exitCode: returned.exitCode, isError: result.isError } }));
  if (outcome === "bounded") {
    assert.ok(cleanupClock, "the cleanup budget must start after actual owned creation");
    assert.equal(result.isError, true);
    assert.equal(n.recovery.repository.getTrace(traceId).payload.sessions.some(row => row.tmuxTarget === target), false);
    const elapsed = performance.now() - cleanupClock;
    t.diagnostic(JSON.stringify({ cleanupElapsedMs: elapsed }));
    assert.ok(elapsed <= 5500, "all identity probes and owned-pane settlement must share one five-second cleanup budget");
    return;
  }
  if (outcome === "late") {
    assert.equal(result.isError, true, "the service timeout must reject before the late adapter settles");
    await latePromise;
    for (let attempt = 0; attempt < 100 && readLinuxProcessIdentity(child.pid)?.startToken === child.startToken; attempt++) await delay(10);
    assert.equal(sessionRepo.listSessionsByTrace(traceId).some(row => row.tmux_target === target), false);
    assert.notEqual(readLinuxProcessIdentity(child.pid)?.startToken, child.startToken,
      "a late headless launch result must be settled even after the service timeout returns");
    return;
  }
  if (outcome === "detached-descendant") {
    denied(parse(result));
    assert.equal(n.recovery.repository.getTrace(traceId).payload.sessions.some(row => row.tmuxTarget === target), false);
    assert.notEqual(readLinuxProcessIdentity(child.pid)?.startToken, child.startToken,
      "denial must reap the observed provider parent");
    assert.notEqual(readLinuxProcessIdentity(extraChild.pid)?.startToken, extraChild.startToken,
      "a setsid descendant still bound by observed ancestry must be settled before teardown");
    return;
  }
  if (["multipane", "multiwindow", "ambiguous", "ambiguous-after-signal", "resistant"].includes(outcome)) {
    assert.equal(result.isError, true, "ambiguous cleanup must fail explicitly without success publication");
    assert.equal(n.recovery.repository.getTrace(traceId).payload.sessions.some(row => row.tmuxTarget === target), false);
    if (["multipane", "multiwindow"].includes(outcome)) {
      assert.equal(mutatedPanes, true, "the intended multipane mutation must occur before the tool error");
      assert.equal(readLinuxProcessIdentity(child.pid)?.startToken, child.startToken,
      "a second pane must refuse cleanup rather than kill an unobserved process");
      assert.equal(readLinuxProcessIdentity(extraChild.pid)?.startToken, extraChild.startToken,
        "cleanup must preserve the unobserved pane in any window of the owned session");
    } else if (outcome === "resistant") assert.equal(readLinuxProcessIdentity(child.pid)?.startToken, child.startToken,
      "a resistant descendant must fail cleanup explicitly instead of recording confirmed absence");
    else {
      if (outcome === "ambiguous-after-signal") assert.equal(ambiguousSignal, true,
        "the unreadable observation must occur after the attempted descendant signal");
      assert.equal(fs.existsSync(`/proc/${child.pid}`), true,
        "unreadable identity must never count as confirmed absence or authorize closing its parent");
    }
    return;
  }
  if (outcome.startsWith("adapter-failure")) {
    t.diagnostic(JSON.stringify({ beforeTeardown: { child: readLinuxProcessIdentity(child.pid), replacement: replacement && readLinuxProcessIdentity(replacement.pid), panes: tmux.run(["list-panes", "-a", "-F", "#{session_id} #{pane_id} #{pane_pid}"]) } }));
    if (beforeResponse) {
      t.diagnostic(JSON.stringify({ creationCommands }));
      t.diagnostic(JSON.stringify({ signalledChildren: signalledChildren.map(value => ({ ...value,
        beforeTeardown: (() => { try { return fs.readFileSync(`/proc/${value.identity.pid}/stat`, "utf8"); }
          catch (error) { return error.code; } })() })) }));
      assert.equal(creationCommands.length, 1, "observe the actual creation command result exactly once");
      assert.equal(creationCommands[0].timeout, 1000);
      if (outcome === "adapter-failure-response-timeout") {
        assert.equal(creationCommands[0].error, "ETIMEDOUT");
        assert.equal(creationCommands[0].status, null);
        assert.match(creationCommands[0].stdout, /^a05-create-v1 \$\d+ %\d+ \d+\n$/);
      }
    }
    assert.equal(result.isError, true);
    assert.equal(sessionRepo.listSessionsByTrace(traceId).some(row => row.tmux_target === target), false);
    assert.equal(n.recovery.repository.getTrace(traceId).payload.sessions.some(row => row.tmuxTarget === target), false);
    assert.notEqual(readLinuxProcessIdentity(child.pid)?.startToken, child.startToken,
      "adapter failure before result receipt must reap the actually started untracked child");
    if (beforeResponse) {
      assert.throws(() => fs.statSync(`/proc/${child.pid}`), { code: "ENOENT" });
      assert.throws(() => process.kill(child.pid, 0), { code: "ESRCH" });
    }
    if (outcome === "adapter-failure-name-reused" || beforeResponse) assert.equal(
      readLinuxProcessIdentity(replacement.pid)?.startToken, replacement.startToken,
      "pre-result cleanup must not kill a different child reusing the target name");
    return;
  }
  if (outcome === "name-reused") {
    assert.equal(result.isError, true);
    assert.notEqual(readLinuxProcessIdentity(child.pid)?.startToken, child.startToken,
      "cleanup must follow the retained immutable session and observed pane identity");
    assert.equal(readLinuxProcessIdentity(replacement.pid)?.startToken, replacement.startToken,
      "a replacement under the original target name grants no cleanup authority");
    return;
  }
  if (outcome === "accepted") {
    assert.equal(result.isError, undefined);
    assert.equal(readLinuxProcessIdentity(child.pid)?.startToken === child.startToken, method === "spawn",
      "supervised success transfers the live child; headless success reaps its descendants");
    if (method === "spawn") {
      const value = parse(result);
      assert.ok(sessionRepo.getSessionById(value.sessionId));
      assert.ok(n.recovery.repository.getTrace(traceId).payload.sessions.some(row => row.sessionId === value.sessionId));
    }
    return;
  }
  if (outcome === "record-failure") {
    assert.equal(result.isError, true);
    assert.equal(n.recovery.repository.getTrace(traceId).payload.sessions.some(row => row.tmuxTarget === target), false);
    assert.notEqual(readLinuxProcessIdentity(child.pid)?.startToken, child.startToken,
      "failed durable publication must retain the receipt and reap the child");
    return;
  }
  denied(parse(result));
  assert.equal(f.database.prepare("SELECT count(*) AS n FROM sessions").get().n, 1);
  assert.equal(sessionRepo.listSessionsByTrace(traceId).some((row) => row.tmux_target === target), false);
  assert.equal(n.recovery.repository.getTrace(traceId).payload.sessions.some((row) => row.tmuxTarget === target), false);
  denied(parse(await call(buildAgentTools({ agentService: service }), ctx)(request("agent.view", { sessionId: target }))));
  const remaining = readLinuxProcessIdentity(child.pid);
  t.diagnostic(JSON.stringify({ method, target, child, remaining, denied: true, businessSessionCount: 1, trackedChild: false }));
  // This required safety assertion deliberately stays RED if cleanup cannot be proved.
  assert.notEqual(remaining?.startToken, child.startToken, "authority denial must not orphan the observed owned child");
});

test("real kill denial retains stale business state but fresh recovery grants no dead target", async (t) => {
  const f = fixture(t); const traceId = await f.seed();
  const tmux = await ownedTmuxFixture(t);
  assert.equal(tmux.run(["new-session", "-d", "-s", "child-one", "sleep", "60"]).status, 0);
  const observed = tmux.run(["list-panes", "-t", "child-one:0", "-F", "#{pane_pid}"]);
  const child = readLinuxProcessIdentity(Number(observed.stdout.trim()));
  assert.ok(child?.startToken);
  const n = f.next(); await n.call(request("orchestration.reattach", { traceId }));
  const oldDryRun = process.env.AGENTS_DRY_RUN; delete process.env.AGENTS_DRY_RUN;
  t.after(() => { if (oldDryRun === undefined) delete process.env.AGENTS_DRY_RUN; else process.env.AGENTS_DRY_RUN = oldDryRun; });
  const registries = loadRegistries({ policiesDir: new URL("../../policies", import.meta.url).pathname });
  const actual = new CodexAdapter({ config: { dryRun: false }, registries });
  const adapter = { async kill(args) {
    const result = await actual.kill(args);
    revokeRequestContext(n.ctx);
    return result;
  } };
  const service = createAgentService({ adapters: new Map([["codex", adapter]]), registries });
  denied(parse(await call(buildAgentTools({ agentService: service }), n.ctx)(request("agent.kill", { sessionId: "ss-one", traceId }))));
  for (let attempt = 0; attempt < 100 && readLinuxProcessIdentity(child.pid); attempt++) await delay(10);
  assert.equal(readLinuxProcessIdentity(child.pid), null, "the real killed pane must have exited and been reaped");
  assert.equal(sessionRepo.getSessionById("ss-one").status, "running", "observe the existing stale business state, without claiming reconciliation");
  const fresh = f.next({ probeTarget: () => tmux.run(["has-session", "-t", "=child-one"]).status === 0 }, f.repositories, "fresh");
  const recovered = parse(await fresh.call(request("orchestration.reattach", { traceId })));
  assert.deepEqual(recovered.reattachedSessionIds, []);
  assert.deepEqual(recovered.skippedSessions, [{ sessionId: "ss-one", reason: "target_gone" }]);
  denied(parse(await fresh.call(request("agent.view", { sessionId: "ss-one" }))));
});
