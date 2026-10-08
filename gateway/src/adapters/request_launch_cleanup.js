import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { readLinuxProcessIdentity } from "./process_supervisor.js";
import { withTmuxCreationObserver } from "./tmux_client.js";
import { revalidateRequestContextBinding } from "../core/request_context.js";
import { appendLocalOnly } from "../core/audit.js";

// Receipts never appear in the public adapter result, session rows or MCP input.
const receipts = new WeakMap();
const publications = new WeakMap();
function failure() {
  return Object.assign(new Error("adapter-owned launch cleanup could not be verified"), { code: "ADAPTER_CLEANUP_FAILED" });
}
function matches(identity) {
  if (!identity) throw failure();
  const current = readLinuxProcessIdentity(identity.pid);
  if (current) {
    if (current.startToken !== identity.startToken) return false;
    if (current.pgid !== identity.pgid || current.sid !== identity.sid) throw failure();
    return true;
  }
  // A null reader also means permission/parse failure. Only kernel absence
  // proves the retained identity has ended; ambiguity grants no cleanup.
  try { fs.statSync(`/proc/${identity.pid}`); throw failure(); }
  catch (error) { if (error.code !== "ENOENT") throw failure(); }
  try { process.kill(identity.pid, 0); throw failure(); }
  catch (error) { if (error.code !== "ESRCH") throw failure(); }
  return false;
}
function runner(env, socket = null) {
  return (args, timeout = 1000) => spawnSync("tmux", socket ? ["-S", socket, ...args] : args,
    { env, encoding: "utf8", timeout, maxBuffer: 8192 });
}
function panes(run, target) {
  const result = run(["list-panes", "-s", "-t", target, "-F", "#{session_id} #{pane_id} #{pane_pid}"]);
  if (result.status !== 0) throw failure();
  return result.stdout.trim().split("\n").map(line => {
    const [sessionId, paneId, pid] = line.split(" ");
    const identity = readLinuxProcessIdentity(Number(pid));
    if (!/^\$\d+$/.test(sessionId) || !/^%\d+$/.test(paneId) || !identity) throw failure();
    return { sessionId, paneId, identity };
  });
}
function descendants(identity, result, checkBudget) {
  checkBudget();
  if (!matches(identity) || result.length >= 100) throw failure();
  const children = new Set();
  for (const tid of fs.readdirSync(`/proc/${identity.pid}/task`)) {
    checkBudget();
    if (!matches(identity)) throw failure();
    // A disappearing task is ambiguous; it is never proof of no children.
    const observed = fs.readFileSync(`/proc/${identity.pid}/task/${tid}/children`, "utf8").trim();
    for (const pid of observed.split(/\s+/).filter(Boolean)) children.add(pid);
  }
  if (!matches(identity)) throw failure();
  for (const pid of children) {
    const child = readLinuxProcessIdentity(Number(pid));
    if (!child) throw failure();
    descendants(child, result, checkBudget);
    result.push(child);
  }
  return result;
}
async function reapDescendants(identity, checkBudget) {
  const children = descendants(identity, [], checkBudget);
  for (const child of children) {
    checkBudget();
    // Traversal is postorder. Keep each parent alive until it has reaped
    // this child; signalling the whole tree first strands adopted zombies.
    // An ancestor may also exit naturally after its own child settles.
    if (matches(child)) process.kill(child.pid, "SIGTERM");
    for (let attempt = 0; attempt < 50 && matches(child); attempt++) { checkBudget(); await delay(10); }
    checkBudget();
    if (matches(child)) throw failure();
  }
  checkBudget();
  if (children.some(matches)) throw failure();
}
async function cleanPanes(execute, observed) {
  const deadline = performance.now() + 5000;
  const checkBudget = () => { if (performance.now() >= deadline) throw failure(); };
  const run = args => {
    checkBudget();
    return execute(args, Math.max(1, Math.min(1000, Math.floor(deadline - performance.now()))));
  };
  for (const pane of observed) {
    checkBudget();
    // Immutable tmux IDs and the original kernel identity must BOTH still match.
    const current = panes(run, pane.sessionId);
    if (current.length !== 1 || current[0].paneId !== pane.paneId
      || current[0].identity.pid !== pane.identity.pid || !matches(pane.identity)) throw failure();
    await reapDescendants(pane.identity, checkBudget);
    if (!matches(pane.identity)) continue;
    const again = panes(run, pane.sessionId);
    if (again.length !== 1 || again[0].paneId !== pane.paneId
      || again[0].identity.pid !== pane.identity.pid || !matches(pane.identity)) throw failure();
    if (run(["kill-session", "-t", pane.sessionId]).status !== 0) throw failure();
    for (let attempt = 0; attempt < 50 && matches(pane.identity); attempt++) { checkBudget(); await delay(10); }
    checkBudget();
    if (matches(pane.identity)) throw failure();
  }
}
async function privateDelegateServer() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agents-delegate-"));
  const env = { ...process.env, TMUX_TMPDIR: directory };
  delete env.TMUX;
  const server = spawn("tmux", ["-D", "-f", "/dev/null"], { env, stdio: "ignore" });
  const exited = new Promise(resolve => { server.once("exit", resolve); server.once("error", resolve); });
  const socket = path.join(directory, `tmux-${process.getuid()}`, "default");
  const run = runner(env, socket);
  let identity = null;
  // Retain the audit target even if startup cannot establish server identity.
  const identityFile = path.join(directory, "server-identity.json");
  fs.writeFileSync(identityFile, JSON.stringify({ socket, identity: null }), { mode: 0o600 });
  function socketPid(execute = run) {
    const result = execute(["display-message", "-p", "#{pid}"]);
    if (result.status !== 0 || !/^[1-9]\d*\n$/.test(result.stdout)) throw failure();
    const pid = Number(result.stdout.trim());
    if (!Number.isSafeInteger(pid) || pid <= 1) throw failure();
    return pid;
  }
  function absent() {
    if (!identity) throw failure();
    try { fs.statSync(`/proc/${identity.pid}`); return false; }
    catch (error) { if (error.code !== "ENOENT") throw failure(); }
    try { process.kill(identity.pid, 0); throw failure(); }
    catch (error) { if (error.code !== "ESRCH") throw failure(); }
    return true;
  }
  async function close() {
    const deadline = performance.now() + 5000;
    const checkBudget = () => { if (performance.now() >= deadline) throw failure(); };
    const boundedRun = args => {
      checkBudget();
      return run(args, Math.max(1, Math.min(1000, Math.floor(deadline - performance.now()))));
    };
    if (!absent()) {
      // The direct child may be a PATH wrapper. Only the socket-observed,
      // start-bound actual server can authorize closing this private server.
      if (!matches(identity) || socketPid(boundedRun) !== identity.pid || !matches(identity)) throw failure();
      // This private server is wholly owned even when cleanPanes refuses.
      // Let it reap its observed descendants before ending their parent.
      await reapDescendants(identity, checkBudget);
      if (!matches(identity) || socketPid(boundedRun) !== identity.pid || !matches(identity)
        || descendants(identity, [], checkBudget).length !== 0) throw failure();
      process.kill(identity.pid, "SIGTERM");
    }
    for (let attempt = 0; attempt < 100 && !absent(); attempt++) { checkBudget(); await delay(10); }
    checkBudget();
    if (!absent()) throw failure();
    const done = await Promise.race([exited.then(() => true), delay(1000).then(() => false)]);
    if (!done) throw failure();
    fs.rmSync(directory, { recursive: true, force: true });
  }
  try {
    for (let attempt = 0; attempt < 100 && !fs.existsSync(socket); attempt++) {
      if (server.exitCode !== null || server.signalCode !== null) throw failure();
      await delay(10);
    }
    if (!fs.existsSync(socket)) throw failure();
    identity = readLinuxProcessIdentity(socketPid());
    if (!identity || !matches(identity) || socketPid() !== identity.pid || !matches(identity)) throw failure();
    identity = Object.freeze(identity);
    fs.writeFileSync(identityFile, JSON.stringify({ ...identity, socket }), { mode: 0o600 });
    return { env, run, close, identity };
  } catch (error) { await close(); throw error; }
}

// Codex's launch methods perform their subprocess work synchronously before
// returning their Promise. Scope only that synchronous invocation's environment;
// restore it before any await, so unrelated concurrent work never inherits it.
function invokeDelegate(adapter, args, env) {
  const previous = { TMUX_TMPDIR: process.env.TMUX_TMPDIR, TMUX: process.env.TMUX };
  try {
    process.env.TMUX_TMPDIR = env.TMUX_TMPDIR;
    delete process.env.TMUX;
    return adapter.delegate(args);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

export function withRequestLaunchCleanup(adapter) {
  return new Proxy(adapter, { get(target, property) {
    if (!["spawn", "delegate"].includes(property)) {
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    }
    return async (args) => {
      if (!args.requestBinding || target.config?.dryRun || process.env.AGENTS_DRY_RUN === "1"
        || process.platform !== "linux") return target[property](args);
      let scope = null;
      let receipt = null;
      try {
        if (property === "delegate") scope = await privateDelegateServer();
        revalidateRequestContextBinding(args.requestBinding);
        const run = scope?.run ?? runner({ ...process.env });
        const created = [];
        const result = await (scope ? invokeDelegate(target, args, scope.env)
          : withTmuxCreationObserver(observed => {
              created.push(observed);
              // Retain cleanup before the next adapter command can fail.
              receipt ??= { clean: () => cleanPanes(run, created), headless: false };
            }, () => target.spawn(args)));
        const observed = scope
          ? (() => {
              const listed = run(["list-sessions", "-F", "#{session_id}"]);
              if (listed.status === 1 && !listed.stdout.trim()) return [];
              if (listed.status !== 0) throw failure();
              return listed.stdout.trim().split("\n").flatMap(id => panes(run, id));
            })()
          : created;
        if (!scope && !receipt) throw failure();
        receipt ??= { async clean() {
          // Root decision: pane refusal does not bypass verified private-server
          // settlement. A server identity ambiguity still retains its socket.
          try { await cleanPanes(run, observed); }
          finally { if (scope) await scope.close(); }
        }, headless: Boolean(scope) };
        receipts.set(result, receipt);
        revalidateRequestContextBinding(args.requestBinding);
        return result;
      } catch (error) {
        try {
          if (receipt) await receipt.clean();
          else if (scope) await scope.close();
        } catch (cleanupError) {
          try { appendLocalOnly({ type: "ERROR", where: "adapter.launch.cleanup", error: "ADAPTER_CLEANUP_FAILED" }); }
          catch { /* Private audit cannot replace the original authorization denial. */ }
          if (error?.code !== "REQUEST_CONTEXT_DENIED") throw cleanupError;
        }
        throw error;
      }
    };
  } });
}

export async function settleRequestLaunch(result, accepted) {
  const receipt = result && receipts.get(result);
  const publish = result && publications.get(result);
  if (result) publications.delete(result);
  if (!receipt) {
    if (accepted) publish?.();
    return;
  }
  // Headless results never transfer a supervised child to the business layer.
  if (!accepted || receipt.headless) {
    // Service timeout settlement and a later observer must share one cleanup.
    receipt.settlement ??= receipt.clean();
    await receipt.settlement;
  }
  receipts.delete(result);
  if (accepted && !receipt.headless) publish?.();
}

export function transferRequestLaunch(result, published, onPublished) {
  const receipt = receipts.get(result);
  if (receipt) {
    receipts.set(published, receipt);
    receipts.delete(result);
  }
  if (onPublished) publications.set(published, onPublished);
  return published;
}
