import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  createHash,
  createHmac,
} from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { test } from "node:test";

import {
  PROCESS_SUPERVISOR_PROTOCOL,
  createProcessSupervisorSessionPortFactory,
  readLinuxProcessIdentity,
} from "../../gateway/src/adapters/process_supervisor.js";

const HELPER = new URL(
  "../../gateway/src/adapters/process_supervisor_helper.py",
  import.meta.url,
).pathname;
const FIXTURE = new URL(
  "./process_supervisor_session_port_fixture.py",
  import.meta.url,
).pathname;
const BINDING_DOMAIN = Buffer.from(
  "agents.process-supervisor.session-port.binding-tag.v1\0",
  "ascii",
);
const LEASE_KEY = Buffer.alloc(32, 0x41);
const TERMINAL_NONCE = Buffer.alloc(32, 0x62);
const TERMINAL_NONCE_DIGEST = createHash("sha256")
  .update(TERMINAL_NONCE)
  .digest("hex");

function configuredPython() {
  const candidates = [
    process.env.PROCESS_SUPERVISOR_TEST_PYTHON,
    process.env.CONDA_PREFIX
      ? path.join(process.env.CONDA_PREFIX, "bin", "python")
      : null,
    process.env.VIRTUAL_ENV
      ? path.join(process.env.VIRTUAL_ENV, "bin", "python")
      : null,
    "/usr/bin/python3",
  ];
  const configured = candidates.find(
    (candidate) => candidate
      && path.isAbsolute(candidate)
      && fs.existsSync(candidate),
  );
  if (!configured) {
    throw new Error("absolute configured test Python unavailable");
  }
  return fs.realpathSync(configured);
}

function configuredTmuxPath() {
  const configured = process.env.D007C_TEST_TMUX_PATH;
  return configured ? `${configured}:/usr/bin:/bin` : "/usr/bin:/bin";
}

async function startIsolatedTmuxServer(
  runtimeEnvironment,
  tmuxDirectory,
) {
  const stderr = [];
  const child = spawn("tmux", ["-D"], {
    env: runtimeEnvironment,
    shell: false,
    stdio: ["ignore", "ignore", "pipe"],
  });
  child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
  const exit = new Promise((resolve) => {
    child.once("error", (error) => resolve({ error }));
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  const tmuxOwnership = {
    child,
    exit,
    serverIdentity: readLinuxProcessIdentity(child.pid),
    stderr,
  };
  const tmuxSocket = path.join(
    tmuxDirectory,
    `tmux-${process.geteuid()}`,
    "default",
  );
  try {
    assert.notEqual(tmuxOwnership.serverIdentity, null);
    await waitFor(
      () => fs.existsSync(tmuxSocket)
        || child.exitCode !== null
        || child.signalCode !== null,
    );
    assert.equal(child.exitCode, null);
    assert.equal(child.signalCode, null);
    const serverPidResult = spawnSync(
      "tmux",
      ["-S", tmuxSocket, "display-message", "-p", "#{pid}"],
      {
        encoding: "utf8",
        env: runtimeEnvironment,
        shell: false,
      },
    );
    assert.equal(serverPidResult.status, 0, serverPidResult.stderr);
    assert.equal(
      Number.parseInt(serverPidResult.stdout.trim(), 10),
      child.pid,
    );
    assert.deepEqual(
      readLinuxProcessIdentity(child.pid),
      tmuxOwnership.serverIdentity,
    );
    return tmuxOwnership;
  } catch (error) {
    try {
      await stopOwnedTmuxServer(
        tmuxSocket,
        runtimeEnvironment,
        tmuxOwnership,
      );
    } catch {
      // Preserve the startup failure after exact bounded cleanup.
    }
    fs.rmSync(path.dirname(tmuxDirectory), {
      recursive: true,
      force: true,
    });
    throw error;
  }
}

async function waitForOwnedServerExit(tmuxOwnership, timeoutMs) {
  let timer;
  const timeout = Symbol("owned tmux wait timeout");
  try {
    return await Promise.race([
      tmuxOwnership.exit,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(timeout), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function stopOwnedTmuxServer(
  tmuxSocket,
  runtimeEnvironment,
  tmuxOwnership,
) {
  let failure;
  const capture = (error) => {
    failure ??= error;
  };
  if (fs.existsSync(tmuxSocket)) {
    const killResult = spawnSync(
      "tmux",
      ["-S", tmuxSocket, "kill-server"],
      {
        encoding: "utf8",
        env: runtimeEnvironment,
        shell: false,
      },
    );
    try {
      assert.equal(killResult.status, 0, killResult.stderr);
    } catch (error) {
      capture(error);
    }
  }
  let serverExit = await waitForOwnedServerExit(tmuxOwnership, 500);
  if (typeof serverExit === "symbol") {
    try {
      if (tmuxOwnership.serverIdentity !== null) {
        assert.deepEqual(
          readLinuxProcessIdentity(tmuxOwnership.serverIdentity.pid),
          tmuxOwnership.serverIdentity,
        );
      }
      assert.equal(tmuxOwnership.child.kill("SIGTERM"), true);
    } catch (error) {
      capture(error);
    }
    serverExit = await waitForOwnedServerExit(tmuxOwnership, 250);
  }
  if (typeof serverExit === "symbol") {
    try {
      if (tmuxOwnership.serverIdentity !== null) {
        assert.deepEqual(
          readLinuxProcessIdentity(tmuxOwnership.serverIdentity.pid),
          tmuxOwnership.serverIdentity,
        );
      }
      assert.equal(tmuxOwnership.child.kill("SIGKILL"), true);
    } catch (error) {
      capture(error);
    }
    serverExit = await waitForOwnedServerExit(tmuxOwnership, 2_000);
  }
  try {
    assert.notEqual(typeof serverExit, "symbol");
    assert.equal(serverExit.error, undefined);
    if (!failure) {
      assert.equal(serverExit.code, 0);
      assert.equal(serverExit.signal, null);
    }
    if (tmuxOwnership.serverIdentity !== null) {
      await waitFor(
        () => readLinuxProcessIdentity(
          tmuxOwnership.serverIdentity.pid,
        ) === null,
        2_000,
      );
    }
  } catch (error) {
    capture(error);
  }
  if (failure) throw failure;
}

async function cleanIsolatedTmuxWorkspace(
  workspace,
  tmuxDirectory,
  runtimeEnvironment,
  tmuxOwnership,
) {
  const tmuxSocket = path.join(
    tmuxDirectory,
    `tmux-${process.geteuid()}`,
    "default",
  );
  try {
    await stopOwnedTmuxServer(
      tmuxSocket,
      runtimeEnvironment,
      tmuxOwnership,
    );
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

async function waitFor(predicate, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = predicate();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("fixture did not reach the expected state");
}

function assertPortCode(code, phase) {
  return (error) => {
    assert.equal(error?.name, "ProcessSupervisorSessionPortError");
    assert.equal(error?.code, code);
    assert.equal(error?.phase, phase);
    assert.equal("cause" in error, false);
    return true;
  };
}

test(
  "authorized session port writes one carriage-return frame to the exact foreground PTY",
  { skip: process.platform !== "linux" },
  async (t) => {
    const workspace = fs.mkdtempSync(
      path.join(os.tmpdir(), "agents-session-port-pty-"),
    );
    const tmuxDirectory = path.join(workspace, "tmux");
    fs.mkdirSync(tmuxDirectory, { mode: 0o700 });
    const resultPath = path.join(workspace, "provider-result.json");
    const transcript = [];
    const helperStdout = [];
    const helperStderr = [];
    const children = [];

    const processOps = {
      spawn(...arguments_) {
        const child = spawn(...arguments_);
        children.push(child);
        child.stdout.on("data", (chunk) => helperStdout.push(Buffer.from(chunk)));
        child.stderr.on("data", (chunk) => helperStderr.push(Buffer.from(chunk)));
        child.stdio[3].on("data", (chunk) => transcript.push(Buffer.from(chunk)));
        return child;
      },
      readIdentity: readLinuxProcessIdentity,
      signalGroup(pgid, signal) {
        process.kill(-pgid, signal);
      },
    };
    const factory = createProcessSupervisorSessionPortFactory({
      processOps,
      platform: "linux",
    });
    const python = configuredPython();
    const runtimeEnvironment = {
      LANG: "C",
      PATH: configuredTmuxPath(),
      TMPDIR: workspace,
      TMUX_TMPDIR: tmuxDirectory,
    };
    const tmuxOwnership = await startIsolatedTmuxServer(
      runtimeEnvironment,
      tmuxDirectory,
    );
    let execution;
    t.after(async () => {
      if (execution) {
        void execution.cancel();
        await Promise.allSettled([execution.completion]);
      }
      await cleanIsolatedTmuxWorkspace(
        workspace,
        tmuxDirectory,
        runtimeEnvironment,
        tmuxOwnership,
      );
    });
    const expectedArgv = [
      python,
      FIXTURE,
      "--literal",
      "$(touch /tmp/never)",
    ];
    execution = await factory.supervisor.start({
      runtimePlan: {
        executable: python,
        args: ["-I"],
        env: runtimeEnvironment,
      },
      argv: expectedArgv,
      env: {
        LANG: "C",
        PATH: "/definitely/no/provider",
        SESSION_PORT_FIXTURE_RESULT: resultPath,
      },
      cwd: workspace,
      sessionId: "ag-pty-session",
      mode: "persistent",
      terminationGraceMs: 100,
    });
    const utility = await execution.utilityIdentity;

    const issued = await factory.sessionPortIssuer.claim({ execution });
    assert.deepEqual(
      await issued.port.writePrompt({ prompt: "status" }),
      { sequence: 1, acceptedBytes: 6 },
    );
    const metadata = await waitFor(() => {
      if (!fs.existsSync(resultPath)) return null;
      return JSON.parse(fs.readFileSync(resultPath, "utf8"));
    });

    assert.deepEqual(
      metadata.argvHex.map((value) => Buffer.from(value, "hex").toString()),
      expectedArgv,
    );
    assert.equal(metadata.executable, python);
    assert.equal(metadata.receivedHex, Buffer.from("status\r").toString("hex"));
    assert.equal(metadata.pid, utility.pid);
    assert.equal(metadata.pgid, metadata.pid);
    assert.equal(metadata.sid, metadata.pid);
    assert.equal(metadata.foregroundPgid, metadata.pid);
    assert.equal(metadata.columns, 120);
    assert.equal(metadata.rows, 40);
    assert.deepEqual(metadata.stdoutTerminal, metadata.stdinTerminal);
    assert.deepEqual(metadata.stderrTerminal, metadata.stdinTerminal);

    assert.deepEqual(await execution.cancel(), { status: "cancelled" });
    await waitFor(() => readLinuxProcessIdentity(utility.pid) === null);
    assert.equal(children.length, 1);
    assert.equal(readLinuxProcessIdentity(execution.supervisor.pid), null);
    const providerFreeBoundaries = Buffer.concat([
      ...transcript,
      ...helperStdout,
      ...helperStderr,
    ]).toString("utf8");
    assert.equal(providerFreeBoundaries.includes("status"), false);
    assert.equal(
      providerFreeBoundaries.includes("fixture-terminal-secret"),
      false,
    );
  },
);

test(
  "real helper rejects a fresh foreground-group change with zero PTY bytes",
  { skip: process.platform !== "linux" },
  async (t) => {
    const workspace = fs.mkdtempSync(
      path.join(os.tmpdir(), "agents-session-port-foreground-"),
    );
    const tmuxDirectory = path.join(workspace, "tmux");
    fs.mkdirSync(tmuxDirectory, { mode: 0o700 });
    const triggerPath = path.join(workspace, "change-foreground");
    const readyPath = path.join(workspace, "foreground-ready");
    const resultPath = path.join(workspace, "foreground-received.hex");
    const children = [];

    const processOps = {
      spawn(...arguments_) {
        const child = spawn(...arguments_);
        children.push(child);
        return child;
      },
      readIdentity: readLinuxProcessIdentity,
      signalGroup(pgid, signal) {
        process.kill(-pgid, signal);
      },
    };
    const factory = createProcessSupervisorSessionPortFactory({
      processOps,
      platform: "linux",
    });
    const python = configuredPython();
    const runtimeEnvironment = {
      LANG: "C",
      PATH: configuredTmuxPath(),
      TMPDIR: workspace,
      TMUX_TMPDIR: tmuxDirectory,
    };
    const tmuxOwnership = await startIsolatedTmuxServer(
      runtimeEnvironment,
      tmuxDirectory,
    );
    let execution;
    t.after(async () => {
      if (execution) {
        void execution.cancel();
        await Promise.allSettled([execution.completion]);
      }
      await cleanIsolatedTmuxWorkspace(
        workspace,
        tmuxDirectory,
        runtimeEnvironment,
        tmuxOwnership,
      );
    });
    execution = await factory.supervisor.start({
      runtimePlan: {
        executable: python,
        args: ["-I"],
        env: runtimeEnvironment,
      },
      argv: [python, FIXTURE],
      env: {
        LANG: "C",
        PATH: "/definitely/no/provider",
        SESSION_PORT_FIXTURE_MODE: "foreground-change",
        SESSION_PORT_FIXTURE_FOREGROUND_TRIGGER: triggerPath,
        SESSION_PORT_FIXTURE_FOREGROUND_READY: readyPath,
        SESSION_PORT_FIXTURE_RESULT: resultPath,
      },
      cwd: workspace,
      sessionId: "ag-pty-foreground-change",
      mode: "persistent",
      terminationGraceMs: 100,
    });
    const utility = await execution.utilityIdentity;

    const issued = await factory.sessionPortIssuer.claim({ execution });
    fs.writeFileSync(triggerPath, "");
    await waitFor(() => fs.existsSync(readyPath));

    await assert.rejects(
      issued.port.writePrompt({ prompt: "status" }),
      assertPortCode("SESSION_PORT_NOT_FOREGROUND", "identity"),
    );
    await waitFor(() => readLinuxProcessIdentity(utility.pid) === null);
    await waitFor(
      () => readLinuxProcessIdentity(execution.supervisor.pid) === null,
    );
    assert.equal(fs.readFileSync(resultPath, "ascii"), "");
    assert.equal(children.length, 1);
    assert.equal(readLinuxProcessIdentity(execution.supervisor.pid), null);
  },
);

async function runFixtureProbe(mode) {
  const python = configuredPython();
  const result = await new Promise((resolve, reject) => {
    const child = spawn(python, ["-I", FIXTURE, mode, HELPER], {
      env: {
        LANG: "C",
        PATH: "/definitely/no/python",
      },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code !== 0) {
        reject(new Error(
          `fixture probe failed (${code ?? signal}): ${
            Buffer.concat(stderr).toString("utf8")
          }`,
        ));
        return;
      }
      resolve({
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });
  });
  assert.equal(result.stderr, "");
  return JSON.parse(result.stdout);
}

test("direct provider execve preserves the literal argv vector without interpretation", async () => {
  assert.deepEqual(await runFixtureProbe("direct-execve-probe"), {
    argv: [
      "/fixture/session-port-agent",
      "--literal",
      "$(touch /tmp/never)",
    ],
    env: { AGENT_MODE: "test" },
    executable: "/fixture/session-port-agent",
  });
});

test(
  "interrupted pre-release bootstrap reaps the exact unpublished PTY authority",
  { skip: process.platform !== "linux" },
  async () => {
    const result = await runFixtureProbe(
      "interrupted-pre-release-bootstrap-probe",
    );
    assert.equal(result.reason, "timed_out");
    assert.equal(result.utilityReturned, false);
    assert.deepEqual(result.directChildren, []);
    assert.equal(result.authorityRemaining, false);
    assert.equal(Number.isSafeInteger(result.authorityPid), true);
    assert.equal(typeof result.authorityStartToken, "string");
    assert.notEqual(result.authorityStartToken, "");
  },
);

test(
  "identity publication failure retains and reaps the exact PTY authority",
  { skip: process.platform !== "linux" },
  async () => {
    assert.deepEqual(
      await runFixtureProbe("identity-publication-failure-probe"),
      {
        authorityRemaining: false,
        directChildren: [],
        utilityExitCode: 126,
        utilityExited: true,
      },
    );
  },
);

test(
  "lost pre-release wait ownership closes the observer and never signals a fresh identity",
  async () => {
    const result = await runFixtureProbe(
      "pre-release-ownership-lost-probe",
    );
    assert.equal(result.waitOutcome, "ownership_lost");
    assert.equal(result.observerCloseCount, 1);
    assert.equal(result.observerClosedBeforeEveryWait, true);
    assert.equal(result.freshIdentityLookups, 0);
    assert.deepEqual(result.signalCalls, []);
    assert.deepEqual(result.groupCleanupCalls, []);
    assert.equal(result.abortClean, false);
    assert.equal(result.publicReason, "supervisor_lost");
    assert.equal(result.utilityReturned, false);
  },
);

test(
  "maximum pre-release grace completes child-owned cleanup before bounded parent settlement",
  async () => {
    const result = await runFixtureProbe(
      "pre-release-maximum-grace-probe",
    );
    assert.equal(result.waitOutcome, "reaped");
    assert.equal(result.elapsedSeconds >= 4.0, true);
    assert.equal(result.elapsedSeconds <= 4.25, true);
    assert.equal(result.observerCloseCount, 1);
    assert.equal(result.observerClosedBeforeEveryWait, true);
    assert.equal(result.freshIdentityLookups, 0);
    assert.deepEqual(result.signalCalls, []);
    assert.deepEqual(result.groupCleanupCalls, []);
    assert.equal(result.abortClean, true);
    assert.equal(result.publicReason, "timed_out");
    assert.equal(result.utilityReturned, false);
  },
);

test(
  "expired pre-release cleanup fails closed without parent group fallback",
  async () => {
    const result = await runFixtureProbe(
      "pre-release-expired-probe",
    );
    assert.equal(result.waitOutcome, "running");
    assert.equal(result.elapsedSeconds >= 4.25, true);
    assert.equal(result.elapsedSeconds <= 4.5, true);
    assert.equal(result.observerCloseCount, 1);
    assert.equal(result.observerClosedBeforeEveryWait, true);
    assert.equal(result.freshIdentityLookups, 0);
    assert.deepEqual(result.signalCalls, []);
    assert.deepEqual(result.groupCleanupCalls, []);
    assert.equal(result.abortClean, false);
    assert.equal(result.publicReason, "supervisor_lost");
    assert.equal(result.utilityReturned, false);
  },
);

test(
  "foreground identity reader calls tcgetpgrp on the retained slave fd never the master",
  async () => {
    assert.deepEqual(
      await runFixtureProbe("retained-slave-foreground-probe"),
      {
        calls: [
          "fstat:92",
          "ioctl:92",
          "tcgetpgrp:92",
        ],
        identity: {
          columns: 120,
          dev: 7,
          foregroundPgid: 6102,
          ino: 8,
          rdev: 9,
          rows: 40,
        },
      },
    );
    const helperSource = fs.readFileSync(HELPER, "utf8");
    assert.equal(/foreground_fd/.test(helperSource), false);
    assert.equal(
      /_run_pty_identity_authority\(\s*pty\.slave_fd,/.test(helperSource),
      true,
    );
    assert.equal(
      /_run_pty_identity_authority\(\s*pty\.master_fd,/.test(helperSource),
      false,
    );
  },
);

test(
  "verified writes recheck the complete authority before first retry and short writes",
  async () => {
    const results = await runFixtureProbe("write-probe");
    const prewriteErrors = new Map([
      ["identity", 0x0007],
      ["foreground", 0x0008],
      ["terminal", 0x0009],
      ["close_precheck", 0x000a],
      ["cancel_precheck", 0x0005],
      ["closed_write", 0x000a],
    ]);
    for (const [name, errorId] of prewriteErrors) {
      assert.equal(results[name].errorId, errorId, name);
      assert.equal(results[name].acceptedBytes, 0, name);
      assert.equal(results[name].acceptedHex, "", name);
      assert.equal(
        results[name].trace.filter((item) => item.startsWith("write:")).length,
        name === "closed_write" ? 1 : 0,
        name,
      );
    }
    assert.deepEqual(results.short.trace, [
      "check",
      `write:${Buffer.from("status\r").toString("hex")}`,
      "check",
      `write:${Buffer.from("atus\r").toString("hex")}`,
    ]);
    assert.equal(results.short.status, "ok");
    assert.equal(results.short.acceptedHex, Buffer.from("status\r").toString("hex"));
    assert.deepEqual(results.eintr.trace, [
      "check",
      `write:${Buffer.from("status\r").toString("hex")}`,
      "check",
      `write:${Buffer.from("status\r").toString("hex")}`,
    ]);
    assert.deepEqual(results.eagain.trace, [
      "check",
      `write:${Buffer.from("status\r").toString("hex")}`,
      "wait",
      "check",
      `write:${Buffer.from("status\r").toString("hex")}`,
    ]);
    for (const name of ["changed_after_partial", "cancelled_after_partial"]) {
      assert.equal(results[name].errorId, 0x000b, name);
      assert.equal(results[name].acceptedHex, Buffer.from("st").toString("hex"));
      assert.deepEqual(results[name].trace, [
        "check",
        `write:${Buffer.from("status\r").toString("hex")}`,
        "check",
      ]);
    }
  },
);

const SUPERVISOR = Object.freeze({
  pid: 6100,
  startToken: "supervisor-pty-start",
  pgid: 6100,
  sid: 6100,
});
const REAPER = Object.freeze({
  pid: 6101,
  startToken: "reaper-pty-start",
  pgid: 6100,
  sid: 6100,
});
const UTILITY = Object.freeze({
  pid: 6102,
  startToken: "utility-pty-start",
  pgid: 6102,
  sid: 6102,
});

class FakeChild extends EventEmitter {
  constructor() {
    super();
    this.pid = SUPERVISOR.pid;
    this.stdin = new PassThrough();
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();
    this.transcript = new PassThrough();
    this.stdio = [
      this.stdin,
      this.stdout,
      this.stderr,
      this.transcript,
    ];
  }
}

function emitTranscript(child, event) {
  child.transcript.write(`${JSON.stringify(event)}\n`);
}

function createFakeProcessOps() {
  const child = new FakeChild();
  let buffered = "";
  let launch;
  let settled = false;
  child.stdin.setEncoding("utf8");
  child.stdin.on("data", (chunk) => {
    buffered += chunk;
    while (buffered.includes("\n")) {
      const newline = buffered.indexOf("\n");
      const command = JSON.parse(buffered.slice(0, newline));
      buffered = buffered.slice(newline + 1);
      if (command.type === "launch") {
        launch = command;
        queueMicrotask(() => emitTranscript(child, {
          type: "reaper_ready",
          protocol: PROCESS_SUPERVISOR_PROTOCOL,
          leaseDigest: createHash("sha256")
            .update(command.leaseNonce)
            .digest("hex"),
          bindingDigest: command.bindingDigest,
          platform: "linux",
          subreaper: true,
          supervisor: SUPERVISOR,
          reaper: REAPER,
        }));
      } else if (command.type === "release") {
        queueMicrotask(() => emitTranscript(child, {
          type: "utility_ready",
          protocol: PROCESS_SUPERVISOR_PROTOCOL,
          bindingDigest: launch.bindingDigest,
          utility: UTILITY,
        }));
      } else if (command.type === "continue") {
        queueMicrotask(() => emitTranscript(child, {
          type: "utility_exec",
          protocol: PROCESS_SUPERVISOR_PROTOCOL,
        }));
      }
    }
  });
  const settle = () => {
    if (settled) return;
    settled = true;
    emitTranscript(child, {
      type: "terminal",
      protocol: PROCESS_SUPERVISOR_PROTOCOL,
      reason: "cancelled",
    });
    child.stdout.end();
    child.stderr.end();
    child.transcript.end();
    child.emit("exit", 0, null);
  };
  const identities = new Map([
    [SUPERVISOR.pid, SUPERVISOR],
    [REAPER.pid, REAPER],
    [UTILITY.pid, UTILITY],
  ]);
  return {
    settle,
    get settled() {
      return settled;
    },
    ops: {
      spawn() {
        return child;
      },
      readIdentity(pid) {
        return identities.get(pid) ?? null;
      },
      signalGroup() {},
    },
  };
}

function deriveBindingTag(binding) {
  return createHmac("sha256", Buffer.from(binding.leaseNonce, "hex"))
    .update(BINDING_DOMAIN)
    .update(Buffer.from(binding.bindingDigest, "hex"))
    .update(Buffer.from(binding.leaseDigest, "hex"))
    .update(Buffer.from(TERMINAL_NONCE_DIGEST, "hex"))
    .digest();
}

function encodeFrame(opcode, sequence, payload, bindingTag) {
  const frame = Buffer.alloc(48 + payload.length);
  frame.write("ASP1", 0, "ascii");
  frame[4] = 1;
  frame[5] = opcode;
  frame.writeUInt32BE(sequence, 8);
  frame.writeUInt32BE(payload.length, 12);
  bindingTag.copy(frame, 16);
  payload.copy(frame, 48);
  return frame;
}

function writeOk(frame, bindingTag) {
  const payload = Buffer.alloc(4);
  payload.writeUInt32BE(frame.length - 49);
  return encodeFrame(0x81, frame.readUInt32BE(8), payload, bindingTag);
}

function cancelled(frame, bindingTag) {
  return encodeFrame(
    0xff,
    frame.readUInt32BE(8),
    Buffer.from([0x00, 0x05, 0x06, 0x00]),
    bindingTag,
  );
}

async function createScriptedHarness(t, exchange) {
  const processFake = createFakeProcessOps();
  const calls = [];
  const factory = createProcessSupervisorSessionPortFactory({
    processOps: processFake.ops,
    platform: "linux",
    randomBytes: () => Buffer.from(LEASE_KEY),
    clock: { now: () => 1_000 },
    scheduler: {
      setTimeout() {
        throw new Error("persistent execution must not arm a deadline");
      },
      clearTimeout() {},
    },
    sessionPortOps: {
      async open(binding) {
        const bindingTag = deriveBindingTag(binding);
        return {
          bindingDigest: binding.bindingDigest,
          leaseDigest: binding.leaseDigest,
          terminalNonceDigest: TERMINAL_NONCE_DIGEST,
          async exchange(frame, control) {
            calls.push(Buffer.from(frame));
            return exchange({
              bindingTag,
              control,
              frame: Buffer.from(frame),
            });
          },
          retire() {},
        };
      },
    },
  });
  const execution = await factory.supervisor.start({
    runtimePlan: {
      executable: "/configured/python",
      args: [],
      env: { LANG: "C" },
    },
    argv: ["/fixture/session-port-agent"],
    env: { LANG: "C" },
    cwd: "/safe/repository",
    sessionId: "ag-pty-script",
    mode: "persistent",
  });
  const issued = await factory.sessionPortIssuer.claim({ execution });
  t.after(async () => {
    processFake.settle();
    await Promise.allSettled([execution.completion]);
  });
  return { calls, execution, issued, processFake };
}

test(
  "post-dispatch cancel commits only from an authenticated zero-byte helper response",
  async (t) => {
    const entered = deferred();
    const release = deferred();
    const harness = await createScriptedHarness(t, async ({
      bindingTag,
      control,
      frame,
    }) => {
      control?.onDispatchStart();
      control?.onDispatched();
      entered.resolve(control);
      await release.promise;
      return cancelled(frame, bindingTag);
    });
    const write = harness.issued.port.writePrompt({ prompt: "status" });
    const control = await entered.promise;
    assert.equal(typeof control?.onDispatchStart, "function");
    assert.equal(typeof control?.onDispatched, "function");
    assert.equal(typeof control?.isCancellationRequested, "function");
    void harness.execution.cancel();
    assert.equal(control.isCancellationRequested(), true);
    release.resolve();
    await assert.rejects(
      write,
      assertPortCode("SESSION_PORT_CANCELLED", "lifecycle"),
    );
    assert.equal(harness.calls.length, 1);
  },
);

test(
  "request-stream loss before complete dispatch returns terminal closed once",
  async (t) => {
    const harness = await createScriptedHarness(t, async ({ control }) => {
      control?.onDispatchStart();
      throw new Error("request stream closed before complete dispatch");
    });
    await assert.rejects(
      harness.issued.port.writePrompt({ prompt: "status" }),
      assertPortCode("SESSION_PORT_TERMINAL_CLOSED", "lifecycle"),
    );
    assert.equal(harness.calls.length, 1);
    await assert.rejects(
      harness.issued.port.writePrompt({ prompt: "again" }),
      assertPortCode("SESSION_PORT_REVOKED", "lifecycle"),
    );
    assert.equal(harness.calls.length, 1);
  },
);

test(
  "response loss after complete dispatch is write aborted once for zero partial or full writes",
  async (t) => {
    for (const acceptedBytes of [0, 2, 7]) {
      await t.test(`accepted terminal bytes: ${acceptedBytes}`, async (t) => {
        const entered = deferred();
        const release = deferred();
        const harness = await createScriptedHarness(t, async ({ control }) => {
          control?.onDispatchStart();
          control?.onDispatched();
          entered.resolve(control);
          await release.promise;
          throw new Error(`lost after ${acceptedBytes} terminal bytes`);
        });
        const write = harness.issued.port.writePrompt({ prompt: "status" });
        const control = await entered.promise;
        if (acceptedBytes === 0) void harness.execution.cancel();
        release.resolve();
        await assert.rejects(
          write,
          assertPortCode("SESSION_PORT_WRITE_ABORTED", "write"),
        );
        assert.equal(harness.calls.length, 1);
        await assert.rejects(
          harness.issued.port.writePrompt({ prompt: "again" }),
          assertPortCode("SESSION_PORT_REVOKED", "lifecycle"),
        );
        assert.equal(harness.calls.length, 1);
        assert.equal(
          typeof control?.isCancellationRequested,
          "function",
        );
        assert.equal(
          control.isCancellationRequested(),
          acceptedBytes === 0,
        );
      });
    }
  },
);

test("a validated WRITE_OK wins before a later pending cancel is retired", async (t) => {
  const entered = deferred();
  const release = deferred();
  const harness = await createScriptedHarness(t, async ({
    bindingTag,
    control,
    frame,
  }) => {
    control?.onDispatchStart();
    control?.onDispatched();
    entered.resolve(control);
    await release.promise;
    return writeOk(frame, bindingTag);
  });
  const write = harness.issued.port.writePrompt({ prompt: "status" });
  const control = await entered.promise;
  void harness.execution.cancel();
  assert.equal(control?.isCancellationRequested(), true);
  release.resolve();
  assert.deepEqual(await write, { sequence: 1, acceptedBytes: 6 });
  await assert.rejects(
    harness.issued.port.writePrompt({ prompt: "again" }),
    assertPortCode("SESSION_PORT_REVOKED", "lifecycle"),
  );
});

test("the PTY leaf contains no tmux relay or shell write path", () => {
  const sources = [
    fs.readFileSync(HELPER, "utf8"),
    fs.readFileSync(
      new URL(
        "../../gateway/src/adapters/process_supervisor.js",
        import.meta.url,
      ),
      "utf8",
    ),
  ].join("\n");
  assert.doesNotMatch(sources, /send-keys/);
  assert.match(
    sources,
    /os\.execve\(launch\["argv"\]\[0\], launch\["argv"\], launch\["env"\]\)/,
  );
});
