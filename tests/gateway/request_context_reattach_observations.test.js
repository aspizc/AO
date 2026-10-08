import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ownedTmuxFixture } from "./helpers/owned_tmux_fixture.js";
import { spawn, spawnSync } from "node:child_process";
import { createLocalRecoveryOwner, priorGatewayOwnerAbsent, probeExactTmuxTarget, readKernelBootId } from "../../gateway/src/adapters/request_recovery_observations.js";
import { readLinuxProcessIdentity } from "../../gateway/src/adapters/process_supervisor.js";

test("production owner probe observes live identity PID reuse changed boot and confirmed process exit", async (t) => {
  const owner = createLocalRecoveryOwner("probe");
  assert.ok(owner); assert.equal(owner.pid, process.pid);
  assert.equal(owner.startToken, readLinuxProcessIdentity(process.pid).startToken);
  assert.equal(owner.bootId, readKernelBootId());
  assert.equal(priorGatewayOwnerAbsent(owner), false);
  assert.equal(priorGatewayOwnerAbsent({ ...owner, startToken: String(BigInt(owner.startToken) + 1n) }), true);
  assert.equal(priorGatewayOwnerAbsent({ ...owner, bootId: `${owner.bootId[0] === "0" ? "1" : "0"}${owner.bootId.slice(1)}` }), true);
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); });
  const prior = { ...owner, ...readLinuxProcessIdentity(child.pid), connectionId: "child" };
  assert.ok(prior.startToken); assert.equal(priorGatewayOwnerAbsent(prior), false);
  const exited = new Promise((resolve) => child.once("exit", resolve)); child.kill("SIGTERM"); await exited;
  assert.equal(priorGatewayOwnerAbsent(prior), true);
});

test("production unreadable and malformed process observations never establish owner absence", (t) => {
  const owner = createLocalRecoveryOwner("probe"); const read = fs.readFileSync;
  const stub = t.mock.method(fs, "readFileSync", (file, ...args) => {
    if (file === `/proc/${process.pid}/stat`) throw Object.assign(new Error("permission denied"), { code: "EACCES" });
    return read(file, ...args);
  });
  assert.equal(priorGatewayOwnerAbsent(owner), false);
  stub.mock.restore();
  t.mock.method(fs, "readFileSync", (file, ...args) => file === `/proc/${process.pid}/stat` ? "malformed" : read(file, ...args));
  assert.equal(priorGatewayOwnerAbsent(owner), false);
});

test("production exact tmux probe distinguishes a live prefix from a gone exact target", async (t) => {
  await ownedTmuxFixture(t);
  const created = spawnSync("tmux", ["new-session", "-d", "-s", "a05-exact-long", "sleep", "15"], { encoding: "utf8", timeout: 2000 });
  assert.equal(created.status, 0, `isolated tmux fixture failed: ${created.stderr}`);
  assert.equal(probeExactTmuxTarget("a05-exact-long", 1000), true);
  assert.equal(probeExactTmuxTarget("a05-exact", 1000), false, "tmux prefix matching must grant no recovery authority");
  const sentinel = spawnSync("tmux", ["new-session", "-d", "-s", "a05-sentinel", "sleep", "15"], { encoding: "utf8", timeout: 2000 });
  assert.equal(sentinel.status, 0, sentinel.stderr);
  const killed = spawnSync("tmux", ["kill-session", "-t", "=a05-exact-long"], { timeout: 1000 });
  assert.equal(killed.status, 0, "owned exact target was killed");
  assert.equal(probeExactTmuxTarget("a05-sentinel", 1000), true, "server remains alive through the target-removal observation");
  assert.equal(probeExactTmuxTarget("a05-exact-long", 1000), false);
});

test("production tmux command failure and one-second timeout are ambiguous denials", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "a05-probe-bin-")); const priorPath = process.env.PATH;
  process.env.PATH = `${directory}:${priorPath}`;
  t.after(() => { process.env.PATH = priorPath; fs.rmSync(directory, { recursive: true, force: true }); });
  const executable = path.join(directory, "tmux");
  fs.writeFileSync(executable, "#!/bin/sh\nprintf 'unexpected local failure\\n' >&2\nexit 2\n", { mode: 0o700 });
  assert.equal(probeExactTmuxTarget("literal-target", 1000), null);
  fs.writeFileSync(executable, "#!/bin/sh\nprintf 'server exited unexpectedly\\n' >&2\nexit 1\n", { mode: 0o700 });
  assert.equal(probeExactTmuxTarget("literal-target", 1000), null, "shutdown ambiguity is not confirmed absence");
  fs.writeFileSync(executable, "#!/bin/sh\nexec sleep 2\n", { mode: 0o700 });
  const started = performance.now();
  assert.equal(probeExactTmuxTarget("literal-target", 1000), null);
  assert.ok(performance.now() - started >= 900); assert.ok(performance.now() - started < 1800, "synchronous probe exceeded its one-second timeout tolerance");
});
