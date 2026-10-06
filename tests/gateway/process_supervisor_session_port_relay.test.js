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
const TMUX_PACKAGE = new URL(
  "../../gateway/vendor/tmux-agents/",
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
const probePromises = new Map();

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

async function waitFor(predicate, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = predicate();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("fixture did not reach the expected state");
}

function relayRuntimeInventory(root = os.tmpdir()) {
  return fs.readdirSync(root)
    .filter((name) => name.startsWith("session-port-relay-"))
    .sort();
}

function nonDirectoryInventory(root) {
  if (!fs.existsSync(root)) return [];
  const result = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else {
        result.push(path.relative(root, absolute));
      }
    }
  };
  visit(root);
  return result.sort();
}

function defaultTmuxSocketPath(tmuxDirectory) {
  assert.equal(typeof process.geteuid, "function");
  return path.join(
    tmuxDirectory,
    `tmux-${process.geteuid()}`,
    "default",
  );
}

function assertAcceptedNamespacePreserved({
  workspace,
  tmuxDirectory,
  relayRuntimesBefore,
  runtimeEnvironment,
  tmuxOwnership,
}) {
  const relayRuntimesAfter = relayRuntimeInventory(workspace);
  const addedRuntimes = relayRuntimesAfter.filter(
    (name) => !relayRuntimesBefore.includes(name),
  );
  assert.equal(addedRuntimes.length, 1);
  assert.deepEqual(
    relayRuntimesAfter,
    [...relayRuntimesBefore, ...addedRuntimes].sort(),
  );
  const relayRuntime = path.join(workspace, addedRuntimes[0]);
  assert.equal(fs.lstatSync(relayRuntime).isDirectory(), true);
  assert.equal(fs.lstatSync(relayRuntime).mode & 0o777, 0o700);
  assert.deepEqual(fs.readdirSync(relayRuntime).sort(), ["relay.sock"]);
  const relaySocket = path.join(relayRuntime, "relay.sock");
  assert.equal(fs.lstatSync(relaySocket).isSocket(), true);
  assert.equal(fs.lstatSync(relaySocket).mode & 0o777, 0o600);
  assert.equal(fs.existsSync(path.join(relayRuntime, "relay.key")), false);
  const tmuxSocket = defaultTmuxSocketPath(tmuxDirectory);
  assert.equal(fs.lstatSync(tmuxSocket).isSocket(), true);
  assert.equal(tmuxOwnership.child.exitCode, null);
  assert.equal(tmuxOwnership.child.signalCode, null);
  assert.deepEqual(
    readLinuxProcessIdentity(tmuxOwnership.siblingIdentity.pid),
    tmuxOwnership.siblingIdentity,
  );
  const sibling = spawnSync(
    "tmux",
    ["-S", tmuxSocket, "has-session", "-t", tmuxOwnership.siblingSession],
    {
      encoding: "utf8",
      env: runtimeEnvironment,
      shell: false,
    },
  );
  assert.equal(sibling.status, 0, sibling.stderr);
  return { relayRuntime, relaySocket, tmuxSocket };
}

async function startIsolatedTmuxServer(
  runtimeEnvironment,
  tmuxDirectory,
  siblingSession,
  hooks = {},
) {
  const stderr = [];
  const child = spawn(
    "tmux",
    ["-D"],
    {
      env: runtimeEnvironment,
      shell: false,
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
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
  const tmuxSocket = defaultTmuxSocketPath(tmuxDirectory);
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
    hooks.afterPidBinding?.(tmuxOwnership);
    const sibling = spawnSync(
      "tmux",
      [
        "-S",
        tmuxSocket,
        "new-session",
        "-d",
        "-s",
        siblingSession,
        "/bin/sleep 3600",
      ],
      {
        encoding: "utf8",
        env: runtimeEnvironment,
        shell: false,
      },
    );
    assert.equal(
      sibling.status,
      0,
      sibling.stderr || Buffer.concat(stderr).toString("utf8"),
    );
    const siblingPidResult = spawnSync(
      "tmux",
      [
        "-S",
        tmuxSocket,
        "display-message",
        "-p",
        "-t",
        siblingSession,
        "#{pane_pid}",
      ],
      {
        encoding: "utf8",
        env: runtimeEnvironment,
        shell: false,
      },
    );
    assert.equal(siblingPidResult.status, 0, siblingPidResult.stderr);
    const siblingPid = Number.parseInt(siblingPidResult.stdout.trim(), 10);
    const siblingIdentity = readLinuxProcessIdentity(siblingPid);
    assert.notEqual(siblingIdentity, null);
    return {
      ...tmuxOwnership,
      siblingIdentity,
      siblingSession,
    };
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
  let killResult = null;
  if (fs.existsSync(tmuxSocket)) {
    killResult = spawnSync(
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
  return {
    status: killResult?.status ?? null,
    stderr: killResult?.stderr ?? "",
    serverExitCode: serverExit.code,
  };
}

async function cleanIsolatedTestWorkspace(
  workspace,
  runtimeEnvironment,
  tmuxDirectory,
  tmuxOwnership,
  { paneWaitTimeoutMs = 5_000 } = {},
) {
  const tmuxSocket = defaultTmuxSocketPath(tmuxDirectory);
  const socketFound = fs.existsSync(tmuxSocket);
  let failure;
  const capture = (error) => {
    failure ??= error;
  };
  const siblingResult = socketFound
    ? spawnSync(
      "tmux",
      ["-S", tmuxSocket, "kill-session", "-t", tmuxOwnership.siblingSession],
      {
        encoding: "utf8",
        env: runtimeEnvironment,
        shell: false,
      },
    )
    : null;
  if (siblingResult) {
    try {
      assert.equal(siblingResult.status, 0, siblingResult.stderr);
      await waitFor(
        () => readLinuxProcessIdentity(
          tmuxOwnership.siblingIdentity.pid,
        ) === null,
        paneWaitTimeoutMs,
      );
    } catch (error) {
      capture(error);
    }
  }
  let serverResult;
  try {
    serverResult = await stopOwnedTmuxServer(
      tmuxSocket,
      runtimeEnvironment,
      tmuxOwnership,
    );
  } catch (error) {
    capture(error);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
  if (failure) throw failure;
  return { socketFound, ...serverResult };
}

test(
  "owned tmux cleanup waits the exact server after kill-server failure",
  { skip: process.platform !== "linux" },
  async () => {
    const workspace = fs.mkdtempSync(
      path.join(os.tmpdir(), "d007c-kill-server-fault-"),
    );
    const tmuxDirectory = path.join(workspace, "tmux");
    const tmuxSocket = defaultTmuxSocketPath(tmuxDirectory);
    fs.mkdirSync(path.dirname(tmuxSocket), {
      recursive: true,
      mode: 0o700,
    });
    fs.writeFileSync(tmuxSocket, "");
    const child = spawn("/bin/sleep", ["3600"], {
      shell: false,
      stdio: "ignore",
    });
    const exit = new Promise((resolve) => {
      child.once("error", (error) => resolve({ error }));
      child.once("exit", (code, signal) => resolve({ code, signal }));
    });
    const serverIdentity = await waitFor(
      () => readLinuxProcessIdentity(child.pid),
    );
    try {
      await assert.rejects(
        stopOwnedTmuxServer(
          tmuxSocket,
          { LANG: "C", PATH: configuredTmuxPath() },
          { child, exit, serverIdentity },
        ),
      );
      assert.equal(readLinuxProcessIdentity(serverIdentity.pid), null);
    } finally {
      if (readLinuxProcessIdentity(serverIdentity.pid) !== null) {
        child.kill("SIGKILL");
        await exit;
      }
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  },
);

test(
  "owned tmux pane-wait failure still shuts down and waits the exact server",
  { skip: process.platform !== "linux" },
  async () => {
    const workspace = fs.mkdtempSync(
      path.join(os.tmpdir(), "d007c-pane-wait-fault-"),
    );
    const tmuxDirectory = path.join(workspace, "tmux");
    fs.mkdirSync(tmuxDirectory, { mode: 0o700 });
    const runtimeEnvironment = {
      LANG: "C",
      PATH: configuredTmuxPath(),
      TMPDIR: workspace,
      TMUX_TMPDIR: tmuxDirectory,
    };
    const tmuxOwnership = await startIsolatedTmuxServer(
      runtimeEnvironment,
      tmuxDirectory,
      "d007c-pane-wait-sibling",
    );
    const blocker = spawn("/bin/sleep", ["3600"], {
      shell: false,
      stdio: "ignore",
    });
    const blockerExit = new Promise((resolve) => {
      blocker.once("error", (error) => resolve({ error }));
      blocker.once("exit", (code, signal) => resolve({ code, signal }));
    });
    const blockerIdentity = await waitFor(
      () => readLinuxProcessIdentity(blocker.pid),
    );
    try {
      await assert.rejects(
        cleanIsolatedTestWorkspace(
          workspace,
          runtimeEnvironment,
          tmuxDirectory,
          { ...tmuxOwnership, siblingIdentity: blockerIdentity },
          { paneWaitTimeoutMs: 25 },
        ),
        /fixture did not reach the expected state/,
      );
      assert.equal(
        readLinuxProcessIdentity(tmuxOwnership.serverIdentity.pid),
        null,
      );
    } finally {
      if (readLinuxProcessIdentity(blockerIdentity.pid) !== null) {
        blocker.kill("SIGKILL");
        await blockerExit;
      }
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  },
);

test(
  "owned tmux startup assertion still shuts down and waits the exact server",
  { skip: process.platform !== "linux" },
  async () => {
    const workspace = fs.mkdtempSync(
      path.join(os.tmpdir(), "d007c-startup-fault-"),
    );
    const tmuxDirectory = path.join(workspace, "tmux");
    fs.mkdirSync(tmuxDirectory, { mode: 0o700 });
    const runtimeEnvironment = {
      LANG: "C",
      PATH: configuredTmuxPath(),
      TMPDIR: workspace,
      TMUX_TMPDIR: tmuxDirectory,
    };
    let serverIdentity;
    await assert.rejects(
      startIsolatedTmuxServer(
        runtimeEnvironment,
        tmuxDirectory,
        "d007c-startup-fault-sibling",
        {
          afterPidBinding(ownership) {
            serverIdentity = ownership.serverIdentity;
            throw new Error("injected startup assertion");
          },
        },
      ),
      /injected startup assertion/,
    );
    assert.notEqual(serverIdentity, undefined);
    assert.equal(readLinuxProcessIdentity(serverIdentity.pid), null);
    assert.equal(fs.existsSync(workspace), false);
  },
);

test(
  "Python owned tmux cleanup preserves pane and kill failures after bounded wait",
  async () => {
    assert.deepEqual(
      await runFixtureProbe("owned-tmux-cleanup-fault-probe"),
      {
        killError:
          "owned tmux kill-server failed: injected kill-server failure",
        killEvents: [
          "kill-server",
          "wait",
          "terminate",
          "wait",
          "communicate",
        ],
        paneError: "injected pane wait failure",
        paneEvents: [
          "pane-wait",
          "server-stop",
          "workspace-cleanup",
        ],
      },
    );
  },
);

function runFixtureProbe(mode) {
  if (probePromises.has(mode)) return probePromises.get(mode);
  const workspace = fs.mkdtempSync(
    path.join(os.tmpdir(), `d007c-${mode}-`),
  );
  const tmuxDirectory = path.join(workspace, "tmux");
  fs.mkdirSync(tmuxDirectory, { mode: 0o700 });
  const result = new Promise((resolve, reject) => {
    const childEnv = {
      LANG: "C",
      PATH: configuredTmuxPath(),
      TMPDIR: workspace,
      TMUX_TMPDIR: tmuxDirectory,
    };
    if (process.env.D007C_TMUX_SOCKET_NAME) {
      childEnv.AGENTS_TMUX_SOCKET_NAME = process.env.D007C_TMUX_SOCKET_NAME;
    }
    const child = spawn(
      configuredPython(),
      ["-I", FIXTURE, mode, HELPER],
      {
        env: childEnv,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.once("error", (error) => {
      fs.rmSync(workspace, { recursive: true, force: true });
      reject(error);
    });
    child.once("exit", (code, signal) => {
      const errorText = Buffer.concat(stderr).toString("utf8");
      try {
        if (code !== 0) {
          reject(new Error(
            `fixture probe ${mode} failed (${code ?? signal}): ${errorText}`,
          ));
          return;
        }
        if (errorText !== "") {
          reject(new Error(
            `fixture probe ${mode} wrote stderr: ${errorText}`,
          ));
          return;
        }
        resolve(JSON.parse(Buffer.concat(stdout).toString("utf8")));
      } catch (error) {
        reject(error);
      } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
      }
    });
  });
  probePromises.set(mode, result);
  return result;
}

const SUPERVISOR = Object.freeze({
  pid: 7100,
  startToken: "supervisor-relay-start",
  pgid: 7100,
  sid: 7100,
});
const REAPER = Object.freeze({
  pid: 7101,
  startToken: "reaper-relay-start",
  pgid: 7100,
  sid: 7100,
});
const UTILITY = Object.freeze({
  pid: 7102,
  startToken: "utility-relay-start",
  pgid: 7102,
  sid: 7102,
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
  const identities = new Map([
    [SUPERVISOR.pid, SUPERVISOR],
    [REAPER.pid, REAPER],
    [UTILITY.pid, UTILITY],
  ]);
  let launch;
  let buffered = "";
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
  return {
    ops: {
      spawn() {
        return child;
      },
      readIdentity(pid) {
        return identities.get(pid) ?? null;
      },
      signalGroup() {},
    },
    settle() {
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

function inspectAsp1ErrorFrame(frame, bindingTag) {
  if (!Buffer.isBuffer(frame)) return null;
  return {
    bindingTagMatches: frame.subarray(16, 48).equals(bindingTag),
    errorId: frame.readUInt16BE(48),
    magic: frame.subarray(0, 4).toString("ascii"),
    opcode: frame[5],
    phaseId: frame[50],
    sequence: frame.readUInt32BE(8),
    version: frame[4],
  };
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

function assertPortCode(code, phase) {
  return (error) => {
    assert.equal(error?.name, "ProcessSupervisorSessionPortError");
    assert.equal(error?.code, code);
    assert.equal(error?.phase, phase);
    assert.equal("cause" in error, false);
    return true;
  };
}

async function createFrozenPositiveRealHarness(t) {
  assert.equal(process.platform, "linux");
  const workspace = fs.mkdtempSync(
    path.join(os.tmpdir(), "d007c-frozen-positive-"),
  );
  const tmuxDirectory = path.join(workspace, "tmux");
  const resultPath = path.join(workspace, "provider-ready");
  const relayRuntimesBefore = relayRuntimeInventory(workspace);
  fs.mkdirSync(tmuxDirectory, { mode: 0o700 });
  const children = [];
  const runtimeEnvironment = {
    LANG: "C",
    PATH: configuredTmuxPath(),
    TMPDIR: workspace,
    TMUX_TMPDIR: tmuxDirectory,
  };
  const tmuxOwnership = await startIsolatedTmuxServer(
    runtimeEnvironment,
    tmuxDirectory,
    "d007c-frozen-positive-sibling",
  );
  let execution;
  let utility;
  let cleanupPromise;
  const cleanup = () => {
    cleanupPromise ??= (async () => {
      let cleanupResult;
      try {
        if (execution) {
          void execution.cancel();
          await Promise.allSettled([execution.completion]);
        }
        if (utility) {
          await waitFor(
            () => readLinuxProcessIdentity(utility.pid) === null,
          );
          await waitFor(
            () => readLinuxProcessIdentity(
              execution.supervisor.pid,
            ) === null,
          );
          assert.equal(children.length, 1);
          assertAcceptedNamespacePreserved({
            workspace,
            tmuxDirectory,
            relayRuntimesBefore,
            runtimeEnvironment,
            tmuxOwnership,
          });
        }
      } finally {
        cleanupResult = await cleanIsolatedTestWorkspace(
          workspace,
          runtimeEnvironment,
          tmuxDirectory,
          tmuxOwnership,
        );
      }
      assert.equal(cleanupResult.socketFound, true);
      assert.equal(cleanupResult.status, 0, cleanupResult.stderr);
      assert.equal(cleanupResult.serverExitCode, 0);
    })();
    return cleanupPromise;
  };
  t.after(cleanup);
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
      SESSION_PORT_FIXTURE_MODE: "frozen-positive-snapshot",
      SESSION_PORT_FIXTURE_RESULT: resultPath,
    },
    cwd: workspace,
    sessionId: "ag-red-port-codex-coder",
    mode: "persistent",
    terminationGraceMs: 100,
  });
  utility = await execution.utilityIdentity;
  const issued = await factory.sessionPortIssuer.claim({ execution });
  await waitFor(() => fs.existsSync(resultPath));
  return { cleanup, issued };
}

async function createPositiveHarness(t, snapshot) {
  const processFake = createFakeProcessOps();
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
            control?.onDispatchStart();
            control?.onDispatched();
            assert.equal(frame[5], 0x02);
            assert.equal(frame.readUInt32BE(12), 0);
            return encodeFrame(
              0x82,
              frame.readUInt32BE(8),
              Buffer.from(snapshot, "utf8"),
              bindingTag,
            );
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
    sessionId: "ag-red-port-codex-coder",
    mode: "persistent",
  });
  t.after(async () => {
    processFake.settle();
    await Promise.allSettled([execution.completion]);
  });
  return {
    issued: await factory.sessionPortIssuer.claim({ execution }),
  };
}

async function createComposedWriteDriftHarness(t, {
  loseResponse = false,
} = {}) {
  const processFake = createFakeProcessOps();
  let bindingTag;
  let channel;
  let fixtureChild;
  let fixtureResult;
  let fd5Frame = null;
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
        bindingTag = deriveBindingTag(binding);
        fixtureChild = spawn(
          configuredPython(),
          [
            "-I",
            FIXTURE,
            "composed-write-rejection-helper",
            HELPER,
          ],
          {
            env: {
              LANG: "C",
              PATH: "/usr/bin:/bin",
              SESSION_PORT_COMPOSED_BINDING: JSON.stringify(binding),
              SESSION_PORT_COMPOSED_LOSE_RESPONSE: loseResponse ? "1" : "0",
            },
            shell: false,
            stdio: ["ignore", "pipe", "pipe", "ignore", "pipe", "pipe"],
          },
        );
        const stdout = [];
        const stderr = [];
        fixtureChild.stdout.on(
          "data",
          (chunk) => stdout.push(Buffer.from(chunk)),
        );
        fixtureChild.stderr.on(
          "data",
          (chunk) => stderr.push(Buffer.from(chunk)),
        );
        fixtureResult = new Promise((resolve, reject) => {
          fixtureChild.once("error", reject);
          fixtureChild.once("exit", (code, signal) => {
            const errorText = Buffer.concat(stderr).toString("utf8");
            if (code !== 0 || errorText !== "") {
              reject(new Error(
                `composed helper failed (${code ?? signal}): ${errorText}`,
              ));
              return;
            }
            try {
              resolve(JSON.parse(
                Buffer.concat(stdout).toString("utf8"),
              ));
            } catch (error) {
              reject(error);
            }
          });
        });
        fixtureResult.catch(() => {});

        let buffered = Buffer.alloc(0);
        const response = new Promise((resolve, reject) => {
          const responseStream = fixtureChild.stdio[5];
          responseStream.on("data", (chunk) => {
            const previous = buffered;
            buffered = Buffer.concat([buffered, Buffer.from(chunk)]);
            previous.fill(0);
            if (buffered.length < 48) return;
            const frameLength = 48 + buffered.readUInt32BE(12);
            if (buffered.length < frameLength) return;
            fd5Frame = Buffer.from(buffered.subarray(0, frameLength));
            buffered.fill(0);
            buffered = Buffer.alloc(0);
            resolve(Buffer.from(fd5Frame));
          });
          responseStream.once("error", reject);
          responseStream.once("end", () => {
            if (fd5Frame === null) {
              reject(new Error("composed fd 5 response was lost"));
            }
          });
        });
        response.catch(() => {});

        let retired = false;
        channel = {
          bindingDigest: binding.bindingDigest,
          leaseDigest: binding.leaseDigest,
          terminalNonceDigest: TERMINAL_NONCE_DIGEST,
          async exchange(frame, control) {
            control?.onDispatchStart();
            await new Promise((resolve, reject) => {
              fixtureChild.stdio[4].write(frame, (error) => {
                if (error) {
                  reject(error);
                  return;
                }
                resolve();
              });
            });
            control?.onDispatched();
            return response;
          },
          retire() {
            if (retired) return;
            retired = true;
            fixtureChild.stdio[4].end();
          },
        };
        return channel;
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
    sessionId: "ag-composed-write-drift",
    mode: "persistent",
  });
  t.after(async () => {
    channel?.retire();
    processFake.settle();
    await Promise.allSettled([
      execution.completion,
      fixtureResult,
    ]);
    if (fixtureChild?.exitCode === null) {
      fixtureChild.kill("SIGTERM");
    }
  });
  const issued = await factory.sessionPortIssuer.claim({ execution });
  return {
    execution,
    fixtureResult,
    get bindingTag() {
      return bindingTag;
    },
    get fd5Frame() {
      return fd5Frame;
    },
    issued,
  };
}

function assertRejectedCase(value, rejectId, publicCode) {
  assert.deepEqual(value, {
    accepted: false,
    cleanup: ["retired"],
    comparisons: value.comparisons,
    publicCode,
    queuedOperatorHex: "",
    rejectId,
    revoke: true,
    tornDown: true,
  });
}

test(
  "preserves the authenticated pre-F write rejection before generation cleanup",
  async (t) => {
    const harness = await createComposedWriteDriftHarness(t);
    const publicError = await harness.issued.port.writePrompt({
      prompt: "status",
    }).then(
      () => null,
      (error) => error,
    );
    const fixture = await harness.fixtureResult;

    assert.equal(
      publicError?.code,
      "SESSION_PORT_TERMINAL_CHANGED",
    );
    assert.notEqual(publicError?.code, "SESSION_PORT_WRITE_ABORTED");
    assert.equal(publicError?.phase, "identity");
    assert.equal(fixture.ptyHex, "");
    assert.deepEqual(
      inspectAsp1ErrorFrame(harness.fd5Frame, harness.bindingTag),
      {
        bindingTagMatches: true,
        errorId: 0x0009,
        magic: "ASP1",
        opcode: 0xff,
        phaseId: 0x03,
        sequence: 1,
        version: 1,
      },
    );
    assert.equal(
      fixture.responseAttemptHex,
      harness.fd5Frame.toString("hex"),
    );
    assert.equal(fixture.driftAfterDispatch, true);
    assert.equal(fixture.generationState, "REVOKED");
    assert.equal(fixture.runResult, "cancelled");

    const responseIndex = fixture.events.indexOf(
      "fd5-response-delivered:ACTIVE",
    );
    const revokeIndex = fixture.events.indexOf(
      "generation-revoked:REVOKING",
    );
    const parentSettlementIndex = fixture.events.indexOf(
      "parent-request-channel-retired",
    );
    assert.ok(responseIndex >= 0);
    assert.ok(revokeIndex > responseIndex);
    assert.ok(parentSettlementIndex > revokeIndex);
    for (const event of [
      "runtime-cleanup:REVOKING",
      "pty-cleanup",
      "utility-cleanup:REVOKING",
    ]) {
      assert.ok(
        fixture.events.indexOf(event) > parentSettlementIndex,
        event,
      );
    }
  },
);

test(
  "keeps post-dispatch fd 5 loss mapped to write aborted",
  async (t) => {
    const harness = await createComposedWriteDriftHarness(t, {
      loseResponse: true,
    });
    const publicError = await harness.issued.port.writePrompt({
      prompt: "status",
    }).then(
      () => null,
      (error) => error,
    );
    const fixture = await harness.fixtureResult;

    assert.equal(publicError?.code, "SESSION_PORT_WRITE_ABORTED");
    assert.equal(publicError?.phase, "write");
    assert.equal(harness.fd5Frame, null);
    assert.equal(fixture.lostResponseFd, true);
    assert.equal(fixture.ptyHex, "");
    assert.equal(fixture.driftAfterDispatch, true);
    assert.equal(fixture.generationState, "REVOKED");
    assert.equal(fixture.runResult, "supervisor_lost");
  },
);

test(
  "authenticates the exact relay instance and returns the canonical 24-byte pane snapshot",
  async (t) => {
    const relay = await runFixtureProbe("relay-auth-probe");
    const snapshot = await runFixtureProbe("snapshot-probe");
    assert.equal(relay.acceptLinux.accepted, true);
    assert.equal(
      relay.relayKeyHex,
      "a9750248dcb6e43d5712a0ae41082a397cf6b757e56313a9bc50e98fae85623f",
    );
    assert.equal(
      process.platform === "linux"
        ? relay.realKernel?.accepted
        : relay.acceptDarwin.accepted,
      true,
    );
    assert.deepEqual(snapshot.exact, {
      snapshot: "ready\nstatus\nack:status\n",
      snapshotBytes: 24,
      truncated: false,
    });
    assert.deepEqual(snapshot.deterministicTrace, [
      snapshot.identityArgv,
      snapshot.historyLimitArgv,
      "barrier",
      snapshot.metadataArgv,
      snapshot.captureArgv,
    ]);
    const portPathTmuxOperations = snapshot.portPathTmuxOperations;
    const { cleanup, issued } = await createFrozenPositiveRealHarness(t);

    assert.deepEqual(await issued.port.snapshot({}), {
      sequence: 1,
      snapshot: "ready\nstatus\nack:status\n",
      snapshotBytes: 24,
      truncated: false,
    });
    assert.deepEqual(issued.observation, {
      sessionId: "ag-red-port-codex-coder",
      tmuxTarget: "ag-red-port-codex-coder",
      attachCommand: "tmux attach -t ag-red-port-codex-coder",
    });
    assert.equal(
      portPathTmuxOperations.includes("send-keys"),
      false,
    );
    await cleanup();
  },
);

test(
  "default real helper returns the rendered 24-byte snapshot through the authenticated relay",
  { skip: process.platform !== "linux" },
  async (t) => {
    const workspace = fs.mkdtempSync(
      path.join(os.tmpdir(), "d007c-real-helper-"),
    );
    const tmuxDirectory = path.join(workspace, "tmux");
    const resultPath = path.join(workspace, "provider-result.json");
    const relayRuntimesBefore = relayRuntimeInventory(workspace);
    fs.mkdirSync(tmuxDirectory, { mode: 0o700 });
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
    const sessionId = `d007c-real-helper-${process.pid}`;
    const runtimeEnvironment = {
      LANG: "C",
      PATH: configuredTmuxPath(),
      TMPDIR: workspace,
      TMUX_TMPDIR: tmuxDirectory,
    };
    const tmuxOwnership = await startIsolatedTmuxServer(
      runtimeEnvironment,
      tmuxDirectory,
      "d007c-real-helper-sibling",
    );
    let execution;
    let workspaceCleanup;
    const cleanupWorkspace = () => {
      workspaceCleanup ??= cleanIsolatedTestWorkspace(
        workspace,
        runtimeEnvironment,
        tmuxDirectory,
        tmuxOwnership,
      );
      return workspaceCleanup;
    };
    t.after(async () => {
      if (execution) {
        void execution.cancel();
        await Promise.allSettled([execution.completion]);
      }
      await cleanupWorkspace();
    });
    execution = await factory.supervisor.start({
      runtimePlan: {
        executable: python,
        args: ["-I"],
        env: runtimeEnvironment,
      },
      argv: [
        python,
        FIXTURE,
        "--literal",
        "$(touch /tmp/never)",
      ],
      env: {
        LANG: "C",
        PATH: "/definitely/no/provider",
        SESSION_PORT_FIXTURE_RESULT: resultPath,
      },
      cwd: workspace,
      sessionId,
      mode: "persistent",
      terminationGraceMs: 100,
    });
    const utility = await execution.utilityIdentity;

    const issued = await factory.sessionPortIssuer.claim({ execution });
    assert.deepEqual(
      await issued.port.writePrompt({ prompt: "status" }),
      { sequence: 1, acceptedBytes: 6 },
    );
    await waitFor(() => fs.existsSync(resultPath));
    assert.deepEqual(await issued.port.snapshot({}), {
      sequence: 2,
      snapshot: "fixture-terminal-secret\n",
      snapshotBytes: 24,
      truncated: false,
    });
    assert.deepEqual(issued.observation, {
      sessionId,
      tmuxTarget: sessionId,
      attachCommand: `tmux attach -t ${sessionId}`,
    });

    assert.deepEqual(await execution.cancel(), { status: "cancelled" });
    await waitFor(() => readLinuxProcessIdentity(utility.pid) === null);
    await waitFor(
      () => readLinuxProcessIdentity(execution.supervisor.pid) === null,
    );
    assert.equal(children.length, 1);
    assertAcceptedNamespacePreserved({
      workspace,
      tmuxDirectory,
      relayRuntimesBefore,
      runtimeEnvironment,
      tmuxOwnership,
    });
    const cleanupResult = await cleanupWorkspace();
    assert.equal(cleanupResult.socketFound, true);
    assert.equal(cleanupResult.status, 0, cleanupResult.stderr);
    assert.equal(cleanupResult.serverExitCode, 0);
  },
);

test(
  "default real helper retires the bound port after real tmux identity drift",
  { skip: process.platform !== "linux" },
  async (t) => {
    const workspace = fs.mkdtempSync(
      path.join(os.tmpdir(), "d007c-real-helper-reject-"),
    );
    const tmuxDirectory = path.join(workspace, "tmux");
    const resultPath = path.join(workspace, "provider-result.json");
    const relayRuntimesBefore = relayRuntimeInventory(workspace);
    fs.mkdirSync(tmuxDirectory, { mode: 0o700 });
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
    const sessionId = `d007c-real-reject-${process.pid}`;
    const runtimeEnvironment = {
      LANG: "C",
      PATH: configuredTmuxPath(),
      TMPDIR: workspace,
      TMUX_TMPDIR: tmuxDirectory,
    };
    const tmuxOwnership = await startIsolatedTmuxServer(
      runtimeEnvironment,
      tmuxDirectory,
      "d007c-real-reject-sibling",
    );
    let execution;
    let workspaceCleanup;
    const cleanupWorkspace = () => {
      workspaceCleanup ??= cleanIsolatedTestWorkspace(
        workspace,
        runtimeEnvironment,
        tmuxDirectory,
        tmuxOwnership,
      );
      return workspaceCleanup;
    };
    t.after(async () => {
      if (execution) {
        void execution.cancel();
        await Promise.allSettled([execution.completion]);
      }
      await cleanupWorkspace();
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
        SESSION_PORT_FIXTURE_RESULT: resultPath,
      },
      cwd: workspace,
      sessionId,
      mode: "persistent",
      terminationGraceMs: 100,
    });
    const utility = await execution.utilityIdentity;

    const issued = await factory.sessionPortIssuer.claim({ execution });
    const resize = spawnSync(
      "tmux",
      [
        "resize-window",
        "-t",
        sessionId,
        "-x",
        "121",
        "-y",
        "40",
      ],
      {
        encoding: "utf8",
        env: runtimeEnvironment,
        shell: false,
      },
    );
    assert.equal(resize.status, 0, resize.stderr);
    await assert.rejects(
      issued.port.snapshot({}),
      assertPortCode("SESSION_PORT_TERMINAL_CHANGED", "identity"),
    );
    await waitFor(() => readLinuxProcessIdentity(utility.pid) === null);
    await waitFor(
      () => readLinuxProcessIdentity(execution.supervisor.pid) === null,
    );
    await Promise.allSettled([execution.completion]);
    assert.equal(children.length, 1);
    assertAcceptedNamespacePreserved({
      workspace,
      tmuxDirectory,
      relayRuntimesBefore,
      runtimeEnvironment,
      tmuxOwnership,
    });
    const cleanupResult = await cleanupWorkspace();
    assert.equal(cleanupResult.socketFound, true);
    assert.equal(cleanupResult.status, 0, cleanupResult.stderr);
    assert.equal(cleanupResult.serverExitCode, 0);
  },
);

test(
  "orders retained readiness sideband workload settlement and cleanup against one accepted generation",
  async () => {
    assert.deepEqual(
      await runFixtureProbe("accepted-generation-probe"),
      {
        cleanupBeforeV: 0,
        events: ["ready", "response"],
        postRevokeEffects: [],
        readiness: "READY-G",
        replacementOpen: true,
        response: "RESULT-G",
        revivalRejected: true,
        settlementRejected: true,
        state: "REVOKED",
        targetStates: {
          readiness: "RETIRED",
          response: "RETIRED",
        },
        workloadRejected: true,
      },
    );
  },
);

test(
  "uses only retained socket ranges after ACCEPT and never selects a replacement endpoint",
  async () => {
    assert.deepEqual(
      await runFixtureProbe("retained-socket-generation-probe"),
      {
        acceptedMessageType: 0x01,
        acceptedPayload: "accepted-socket-only",
        generationState: "REVOKED",
        queued: "operator-range",
        receivedMessageType: 0x02,
        rejectedAfterRevoke: true,
        replacementPayloadHex: "",
        sameAcceptedSocket: true,
      },
    );
  },
);

test(
  "accepts one read-time retained-PTY range without inventing producer foreground time or binding provenance",
  async () => {
    assert.deepEqual(
      await runFixtureProbe("retained-pty-generation-probe"),
      {
        acceptedRange: "before-accept|second-producer",
        candidateRange: "before-accept|second-producer",
        delivered: "prompt-after-diagnostic",
        generationBound: true,
        postRevokeReadCalls: [],
        postRevokeRejected: true,
        producerEvidencePresent: false,
        settlementRejected: true,
        state: "REVOKED",
        written: 23,
      },
    );
  },
);

test(
  "accepts capture only from one field-exact agents-capture-v1 record on the retained tmux connection",
  async () => {
    const value = await runFixtureProbe(
      "atomic-capture-generation-probe",
    );
    assert.deepEqual(value, {
      barrierCalls: ["barrier"],
      captureCalls: 1,
      captureOperation: "agents-capture-v1",
      producerEvidencePresent: false,
      retireBeforeRevocation: 0,
      retireCalls: [{
        generationId: "61".repeat(32),
        paneId: "%2",
        sessionId: "$1",
      }],
      snapshot: "ready\nstatus\nack:status\n",
      snapshotBytes: 24,
      stockAuthorityCalls: [],
      wrongGenerationCaptureCalls: 1,
      wrongGenerationRejected: true,
    });
  },
);

test(
  "preserves the accepted relay socket entry and runtime directory after descriptor cleanup",
  async () => {
    assert.deepEqual(
      await runFixtureProbe("namespace-preservation-probe"),
      {
        first: {
          directoryPresent: true,
          keyPresent: false,
          keyRetired: true,
          ledger: {
            relayKey: "RETIRED",
            relaySocket: "PRESERVED",
            runtimeDirectory: "PRESERVED",
          },
          socketPresent: true,
        },
        second: {
          directoryPresent: true,
          ledger: {
            relayKey: "RETIRED",
            relaySocket: "PRESERVED",
            runtimeDirectory: "PRESERVED",
          },
          socketPresent: true,
        },
      },
    );
  },
);

test(
  "signals only the sealed original utility group before reap and preserves it when the ownership anchor is lost",
  async () => {
    assert.deepEqual(
      await runFixtureProbe("sealed-process-cleanup-probe"),
      {
        anchorHeld: {
          diagnostics: [],
          reaps: [8100],
          signals: [
            [8100, "SIGTERM"],
            [8100, "SIGKILL"],
          ],
          state: "RETIRED",
        },
        anchorLost: {
          reaps: [],
          signals: [],
          state: "PRESERVED",
        },
        outsideGroupSignalCalls: [],
        relaySignalCalls: [],
      },
    );
  },
);

test(
  "uses one retained tmux control channel and rejects replacement clients for capture or cleanup",
  async () => {
    assert.deepEqual(
      await runFixtureProbe("retained-tmux-control-probe"),
      {
        capture: "ready\nstatus\nack:status\n\n",
        captureCalls: [[
          "agents-capture-v1",
          "-g",
          "91".repeat(32),
          "-r",
          "8300",
          "-s",
          "$7",
          "-p",
          "8301",
          "-x",
          "120",
          "-y",
          "40",
          "-H",
          "400",
          "-t",
          "%8",
        ]],
        closeCalls: 1,
        postRetireCalls: 0,
        postRetireRejected: true,
        retireCalls: [
          ["kill-pane", "-t", "%8"],
          ["kill-session", "-t", "$7"],
        ],
        retired: {
          pane: "RETIRED",
          session: "RETIRED",
        },
        wrongGenerationCalls: 0,
        wrongGenerationRejected: true,
      },
    );
  },
);

test(
  "rejects a retained atomic capture when revocation linearizes before validation settles",
  async () => {
    assert.deepEqual(
      await runFixtureProbe("atomic-capture-revocation-race-probe"),
      {
        captureCalls: 1,
        generationState: "REVOKED",
        rejected: true,
        retireCalls: 1,
        snapshotSettled: false,
      },
    );
  },
);

test(
  "wires retained PTY and bounded utility cleanup into the real session-port path",
  () => {
    const helperSource = fs.readFileSync(HELPER, "utf8");
    assert.match(helperSource, /pty_authority = RetainedPtyAuthority\(/);
    assert.match(
      helperSource,
      /cleanup_sealed_utility_group\(\s*target/s,
    );
    assert.match(
      helperSource,
      /_bounded_session_port_utility_cleanup\(\s*utility/s,
    );
    assert.match(
      helperSource,
      /_open_retained_tmux_connection\(/,
    );
    assert.match(
      helperSource,
      /if pty is not None:\s*clean = bool\(session_port_cleanup/s,
    );
    assert.doesNotMatch(
      helperSource,
      /capture_bound_tmux_snapshot[\s\S]{0,5000}_run_tmux_direct/s,
    );
  },
);

test(
  "emits retained PTY, acceptance connection, and bounded cleanup behavior on the configured session-port path",
  async () => {
    assert.deepEqual(
      await runFixtureProbe("session-port-runtime-authority-probe"),
      {
        events: [
          "retained-pty-authority",
          "retained-connection-at-acceptance",
          "retained-pty-close",
          "bounded-utility-cleanup",
        ],
        outcome: { clean: true, status: "RETIRED" },
        result: "exec_error",
      },
    );
  },
);

test(
  "pins the custom tmux source patch and offline builder without package-manager or network access",
  () => {
    const manifestPath = path.join(TMUX_PACKAGE, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert.deepEqual(manifest, {
      schemaVersion: 1,
      productVersion: "3.6a-agents.1",
      source: {
        archive: "tmux-3.6a.tar.gz",
        sha256:
          "b6d8d9c76585db8ef5fa00d4931902fa4b8cbe8166f528f44fc403961a3f3759",
        version: "3.6a",
      },
      patch: {
        file: "tmux-3.6a-agents.1.patch",
        sha256: manifest.patch.sha256,
      },
      extensionSource: {
        file: "cmd-agents-capture.c",
        sha256: manifest.extensionSource.sha256,
      },
      offlineLinuxBuilder: {
        image:
          "node@sha256:0625f79a0c9f5005e31dba1761260b9f66ea8a3293e5f645eb4550a4c7dcdbb9",
        platform: "linux/amd64",
      },
      offlineDarwinBuilder: {
        source: "same-pinned-source-and-patch",
        platforms: ["darwin/amd64", "darwin/arm64"],
        toolchain: "preprovisioned-clang",
        network: "disabled",
        packageManager: "none",
        builder: "build-offline-darwin.sh",
        outputs: [
          "darwin/amd64/tmux-3.6a-agents.1",
          "darwin/arm64/tmux-3.6a-agents.1",
        ],
      },
    });
    assert.match(manifest.patch.sha256, /^[a-f0-9]{64}$/);
    assert.match(manifest.extensionSource.sha256, /^[a-f0-9]{64}$/);

    const patchBytes = fs.readFileSync(
      path.join(TMUX_PACKAGE, manifest.patch.file),
    );
    assert.equal(
      createHash("sha256").update(patchBytes).digest("hex"),
      manifest.patch.sha256,
    );
    const patchText = patchBytes.toString("utf8");
    assert.match(patchText, /cmd-agents-capture\.c/);
    assert.match(
      patchText,
      /^-\t  \.default_num = 1,\n^\+\t  \.default_num = 0,$/m,
    );
    const extensionBytes = fs.readFileSync(
      path.join(TMUX_PACKAGE, manifest.extensionSource.file),
    );
    assert.equal(
      createHash("sha256").update(extensionBytes).digest("hex"),
      manifest.extensionSource.sha256,
    );
    const extensionText = extensionBytes.toString("utf8");
    assert.match(extensionText, /agents-capture-v1/);
    assert.match(extensionText, /CLIENT_CONTROL/);
    assert.match(extensionText, /width != 120 \|\| height != 40/);
    assert.match(extensionText, /AGENTS_CAPTURE_HISTORY 400/);

    const builder = fs.readFileSync(
      path.join(TMUX_PACKAGE, "build-offline.sh"),
      "utf8",
    );
    assert.match(builder, /--network none/);
    assert.match(builder, /node@sha256:0625f79a0c9f5005e31dba1761260b9f/);
    assert.match(builder, new RegExp(manifest.patch.sha256));
    assert.match(builder, new RegExp(manifest.extensionSource.sha256));
    assert.match(builder, /patch --fuzz=0/);
    assert.match(builder, /parser_before=.*sha256sum cmd-parse\.c/);
    assert.match(builder, /parser_after=.*sha256sum cmd-parse\.c/);
    assert.match(
      fs.readFileSync(
        path.join(
          path.dirname(HELPER),
          "process_supervisor_helper.py",
        ),
        "utf8",
      ),
      /reported_version != "3\.6a-agents\.1"/,
    );
    assert.match(builder, /parser_before.*parser_after/s);
    assert.doesNotMatch(
      builder,
      /\b(?:apt|apt-get|apk|brew|curl|wget|npm|pnpm|yarn)\b/,
    );
  },
);

test("gate RED: patch whitespace is clean", () => {
  const patchText = fs.readFileSync(
    path.join(TMUX_PACKAGE, "tmux-3.6a-agents.1.patch"),
    "utf8",
  );
  assert.doesNotMatch(patchText, /^.* +\t.*$/m);
  assert.doesNotMatch(patchText, /^.*[ \t]+$/m);
  assert.doesNotMatch(patchText, /^ /m);
  assert.equal(patchText.match(/^diff --git /gm)?.length, 5);
  assert.equal(patchText.match(/^@@ /gm)?.length, 9);
});

test("gate RED: runtime production path emits retained authorities", async () => {
  assert.deepEqual(
    await runFixtureProbe("session-port-runtime-authority-probe"),
    {
      events: [
        "retained-pty-authority",
        "retained-connection-at-acceptance",
        "retained-pty-close",
        "bounded-utility-cleanup",
      ],
      outcome: { clean: true, status: "RETIRED" },
      result: "exec_error",
    },
  );
});

test("gate RED: same retained connection rejects replacement clients", async () => {
  const result = await runFixtureProbe("retained-tmux-control-probe");
  assert.equal(result.postRetireCalls, 0);
  assert.equal(result.postRetireRejected, true);
});

test("gate RED: exact custom runtime version and protocol are required", () => {
  const helperSource = fs.readFileSync(HELPER, "utf8");
  assert.doesNotMatch(helperSource, /["']-CC["']/);
  assert.match(helperSource, /["']-C["']/);
  assert.match(
    helperSource,
    /\["refresh-client", "-f", "no-detach-on-destroy"\]/,
  );
  assert.match(helperSource, /reported_version != "3\.6a-agents\.1"/);
  assert.match(helperSource, /agents-capture-v1/);
});

test("gate RED: Linux and Darwin offline build contracts are checked in", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(TMUX_PACKAGE, "manifest.json"), "utf8"),
  );
  assert.equal(manifest.offlineLinuxBuilder.platform, "linux/amd64");
  const darwinBuilder = path.join(TMUX_PACKAGE, "build-offline-darwin.sh");
  assert.equal(fs.existsSync(darwinBuilder), true);
  const darwinBuilderText = fs.readFileSync(darwinBuilder, "utf8");
  assert.deepEqual(manifest.offlineDarwinBuilder.outputs, [
    "darwin/amd64/tmux-3.6a-agents.1",
    "darwin/arm64/tmux-3.6a-agents.1",
  ]);
  assert.match(darwinBuilderText, /test "\$\(uname -s\)" = Darwin/);
  assert.match(darwinBuilderText, /darwin\/amd64\).*expected_arch=x86_64/);
  assert.match(darwinBuilderText, /darwin\/arm64\).*expected_arch=arm64/);
  assert.match(darwinBuilderText, /TMUX_AGENTS_NO_NETWORK:-1/);
  assert.match(darwinBuilderText, /TMUX_AGENTS_PACKAGE_MANAGER:-none/);
  assert.match(darwinBuilderText, new RegExp(manifest.patch.sha256));
  assert.match(darwinBuilderText, new RegExp(manifest.extensionSource.sha256));
  assert.match(
    darwinBuilderText,
    /cp .*cmd-agents-capture\.c[\s\S]*patch --fuzz=0/,
  );
  assert.match(darwinBuilderText, /YACC=true \.\/configure --disable-static/);
  assert.match(darwinBuilderText, /parser_before=.*cmd-parse\.c/);
  assert.match(darwinBuilderText, /parser_after=.*cmd-parse\.c/);
  assert.match(darwinBuilderText, /test "\$parser_before" = "\$parser_after"/);
  assert.match(darwinBuilderText, /test "\$\(.*tmux -V.*\)"/);
  assert.match(darwinBuilderText, /install -m 0755 .*output_name/);
});

test(
  "runs the pinned custom tmux retained-channel probe under the exact isolated label",
  { skip: process.env.D007C_RUN_REAL_TMUX_PROBE !== "1" },
  async () => {
    const result = await runFixtureProbe("retained-tmux-real-probe");
    assert.equal(result.captureVersion, 1);
    assert.equal(result.generationId, "a3".repeat(32));
    assert.match(result.identity.sessionId, /^\$\d+$/);
    assert.match(result.identity.paneId, /^%\d+$/);
    assert.equal(result.movedPaneObserved, true);
    assert.equal(result.retired.pane, "RETIRED");
    assert.equal(result.retired.session, "RETIRED");
    assert.equal(result.serverPreserved, true);
    assert.equal(result.siblingSurvived, true);
  },
);

test(
  "revalidates the accepted socket and live relay identity before broker input",
  async () => {
    const binding = await runFixtureProbe("bound-relay-probe");
    assert.deepEqual(binding.postAcceptIdentity, {
      accepted: true,
      changedField: "cwd",
      disposition: "SESSION_PORT_TERMINAL_CHANGED",
      queuedOperatorHex: "",
      revoked: true,
      sameSocket: true,
    });
    const rejected = {
      disposition: "SESSION_PORT_TERMINAL_CHANGED",
      queuedOperatorHex: "",
      revoked: true,
      sameSocket: true,
    };
    assert.deepEqual(binding.postAcceptGuards, {
      historyChanged: rejected,
      historyUnavailable: rejected,
      peerChanged: rejected,
      peerUnavailable: rejected,
      processUnavailable: rejected,
      queueRebound: rejected,
      revokedBinding: rejected,
      tmuxChanged: rejected,
      tmuxUnavailable: rejected,
    });
    assert.deepEqual(binding.revokedRevalidation, {
      disposition: "SESSION_PORT_TERMINAL_CHANGED",
      readerCalls: [],
      revoked: true,
    });
  },
);

test(
  "revalidates the accepted binding before forwarding provider PTY output",
  async () => {
    assert.deepEqual(
      await runFixtureProbe("bound-relay-output-probe"),
      {
        changedField: "cwd",
        disposition: "SESSION_PORT_TERMINAL_CHANGED",
        forwardedHex: "",
        revoked: true,
        sameSocket: true,
      },
    );
  },
);

test(
  "validates only safe configured-runtime relay launch fields",
  async () => {
    assert.deepEqual(
      await runFixtureProbe("relay-launch-validation-probe"),
      {
        disabledFieldsAccepted: false,
        invalidArgumentsAccepted: false,
        invalidRuntimeAccepted: false,
        invalidTargetAccepted: false,
        validAccepted: true,
      },
    );
  },
);

test(
  "revalidates real-helper relay binding before publishing session port readiness",
  async () => {
    assert.deepEqual(
      await runFixtureProbe("default-relay-binding-probe"),
      {
        calls: [
          "accept",
          "listener-close",
          "tmux-retire",
          "runtime-close",
        ],
        disposition: "SESSION_PORT_TERMINAL_CHANGED",
        revalidationCalls: 1,
      },
    );
  },
);

test(
  "rejects and revokes a relay flush for a different barrier token",
  async () => {
    assert.deepEqual(
      await runFixtureProbe("barrier-token-probe"),
      {
        disposition: "SESSION_PORT_SNAPSHOT_FAILED",
        receivedInput: [],
        revoked: true,
      },
    );
  },
);

test(
  "rejects before the barrier when the retained atomic tmux channel is unavailable",
  async () => {
    const binding = await runFixtureProbe("bound-relay-probe");
    assert.deepEqual(binding.tmuxReplacement, {
      barrierCalls: 0,
      captureCalls: 0,
      disposition: "SESSION_PORT_TERMINAL_CHANGED",
      revoked: true,
    });
    assert.deepEqual(binding.tmuxReplacementAfterBarrier, {
      barrierCalls: 0,
      captureCalls: 0,
      disposition: "SESSION_PORT_TERMINAL_CHANGED",
      revoked: true,
    });
  },
);

test(
  "guards owned tmux socket retirement to the exact serverless socket inode",
  async () => {
    assert.deepEqual(
      await runFixtureProbe("owned-socket-guard-probe"),
      {
        identity: {
          disposition: "REJECTED",
          preserved: true,
        },
        liveServer: {
          disposition: "REJECTED",
          preserved: true,
        },
        path: {
          disposition: "REJECTED",
          preserved: true,
        },
        serverlessRemoved: true,
      },
    );
  },
);

test(
  "rejects real outer pane width drift before capture",
  async () => {
    const binding = await runFixtureProbe("bound-relay-host-probe");
    assert.equal(binding.version, "tmux 3.6a-agents.1");
    assert.match(binding.socketName, /^d007c-bound-/);
    assert.deepEqual(binding.widthDrift, {
      dimensions: "121\t40",
      disposition: "SESSION_PORT_TERMINAL_CHANGED",
      snapshot: null,
    });
  },
);

test(
  "rejects real history-limit drift before capture",
  async () => {
    const binding = await runFixtureProbe("bound-relay-host-probe");
    assert.deepEqual(binding.historyDrift, {
      historyLimit: "401",
      disposition: "SESSION_PORT_TERMINAL_CHANGED",
      snapshot: null,
    });
  },
);

test(
  "retires real rejected relay tmux and runtime resources without a socket inode",
  async () => {
    const binding = await runFixtureProbe("bound-relay-host-probe");
    assert.deepEqual(binding.postAcceptCleanup, {
      accepted: true,
      brokerQueueHex: "",
      changedField: "paneWidth",
      disposition: "SESSION_PORT_TERMINAL_CHANGED",
      keyRemoved: true,
      observedPaneWidth: 121,
      paneRemoved: true,
      relayExited: true,
      relaySocketRemoved: true,
      revoked: true,
      runtimeRemoved: true,
      sameSocket: true,
    });
    assert.deepEqual(binding.cleanup, {
      ownedSocketAbsent: true,
      processes: [],
      runtimeDirectories: [],
      targets: [],
    });
  },
);

test(
  "accepts the exact Linux relay peer and nonce proof before operator input",
  async () => {
    const relay = await runFixtureProbe("relay-auth-probe");
    assert.deepEqual(relay.acceptLinux, {
      accepted: true,
      calls: ["getsockopt:SOL_SOCKET:SO_PEERCRED"],
      comparisons: ["hmac.compare_digest"],
      publicCode: null,
      rejectId: null,
      revoke: false,
    });
    if (process.platform === "linux") {
      assert.equal(relay.realKernel.accepted, true);
      assert.deepEqual(relay.realKernel.preAcceptReadable, [false]);
      assert.equal(
        relay.realKernel.operatorHex,
        Buffer.from("operator\r").toString("hex"),
      );
      assert.equal(relay.realKernel.messageType, 0x02);
      assert.equal(relay.realKernel.barrierType, 0x04);
      assert.equal(
        relay.realKernel.barrierHex,
        Buffer.from("\0\0\0\0\0\0\0\x01", "binary").toString("hex"),
      );
      assert.equal(
        relay.realKernel.renderedHex,
        Buffer.from("ready\n").toString("hex"),
      );
      assert.deepEqual(relay.realKernel.runtimeModes, {
        directory: 0o700,
        keyRemoved: true,
        socket: 0o600,
      });
      assert.equal(relay.realKernel.runtimeRemoved, true);
    }
    assert.deepEqual(relay.keyFiles, {
      nonRegular: true,
      reportedNonRegular: true,
      reportedWrongSize: true,
      shortRead: true,
      symlink: true,
      valid: {
        keyHex: relay.relayKeyHex,
        removed: true,
      },
      wrongMode: true,
      wrongOwner: true,
      wrongSize: true,
    });
    assert.deepEqual(relay.dataFrames, {
      boundary: {
        messageType: 0x01,
        payloadBytes: 65536,
      },
      invalidHeaders: {
        magic: true,
        overCap: true,
        reserved: true,
        version: true,
      },
      overCapRejected: true,
    });
  },
);

test(
  "accepts the exact Darwin relay peer and nonce proof before operator input",
  async () => {
    const relay = await runFixtureProbe("relay-auth-probe");
    assert.deepEqual(relay.acceptDarwin, {
      accepted: true,
      calls: [
        "getpeereid",
        "getsockopt:SOL_LOCAL:LOCAL_PEERPID",
      ],
      comparisons: ["hmac.compare_digest"],
      publicCode: null,
      rejectId: null,
      revoke: false,
    });
  },
);

test("rejects relay when Linux peer evidence is unavailable", async () => {
  const { cases } = await runFixtureProbe("relay-auth-probe");
  for (const name of ["linuxUnavailable", "malformedPeer"]) {
    assertRejectedCase(
      cases[name],
      0x0002,
      "SESSION_PORT_UNAUTHORIZED",
    );
  }
});

test("rejects relay when Darwin peer evidence is unavailable", async () => {
  const { cases } = await runFixtureProbe("relay-auth-probe");
  assertRejectedCase(
    cases.darwinUnavailable,
    0x0002,
    "SESSION_PORT_UNAUTHORIZED",
  );
});

test("rejects relay with a different kernel uid or gid", async () => {
  const { cases } = await runFixtureProbe("relay-auth-probe");
  for (const name of ["wrongUid", "wrongGid"]) {
    assertRejectedCase(
      cases[name],
      0x0003,
      "SESSION_PORT_UNAUTHORIZED",
    );
  }
});

test("rejects same-user relay with the wrong kernel peer pid", async () => {
  const { cases } = await runFixtureProbe("relay-auth-probe");
  assertRejectedCase(
    cases.wrongPeerPid,
    0x0004,
    "SESSION_PORT_UNAUTHORIZED",
  );
});

test("rejects relay whose live pane identity changed", async () => {
  const { cases } = await runFixtureProbe("relay-auth-probe");
  for (const name of [
    "changedPid",
    "changedStart",
    "changedPgid",
    "changedSid",
    "changedExecutable",
    "changedArgv",
    "changedCwd",
  ]) {
    assertRejectedCase(
      cases[name],
      0x0005,
      "SESSION_PORT_TERMINAL_CHANGED",
    );
  }
});

test(
  "rejects malformed or out-of-order relay proof before operator input",
  async () => {
    const { cases } = await runFixtureProbe("relay-auth-probe");
    for (const name of [
      "malformedMagic",
      "malformedType",
      "malformedVersion",
      "malformedReserved",
      "malformedLength",
      "malformedTrailing",
    ]) {
      assertRejectedCase(
        cases[name],
        0x0001,
        "SESSION_PORT_UNAUTHORIZED",
      );
    }
  },
);

test("rejects relay with the wrong nonce proof", async () => {
  const { cases } = await runFixtureProbe("relay-auth-probe");
  for (const name of ["badProof", "wrongProofPid"]) {
    assertRejectedCase(
      cases[name],
      0x0006,
      "SESSION_PORT_UNAUTHORIZED",
    );
  }
  assert.deepEqual(cases.badProof.comparisons, ["hmac.compare_digest"]);
});

test("rejects relay handshake timeout before operator input", async () => {
  const { cases } = await runFixtureProbe("relay-auth-probe");
  assertRejectedCase(
    cases.timeout,
    0x0008,
    "SESSION_PORT_TERMINAL_CLOSED",
  );
});

test("rejects replayed relay proof", async () => {
  const { cases } = await runFixtureProbe("relay-auth-probe");
  assertRejectedCase(
    cases.replay,
    0x0007,
    "SESSION_PORT_UNAUTHORIZED",
  );
});

test("rejects a duplicate relay connection", async () => {
  const { cases } = await runFixtureProbe("relay-auth-probe");
  assertRejectedCase(
    cases.duplicate,
    0x0007,
    "SESSION_PORT_UNAUTHORIZED",
  );
});

test("canonicalizes an untouched 120x40 pane to zero bytes", async () => {
  const snapshot = await runFixtureProbe("snapshot-probe");
  assert.deepEqual(snapshot.untouched, {
    snapshot: "",
    snapshotBytes: 0,
    truncated: false,
  });
});

test(
  "preserves the exact 24-byte rendered snapshot and one final LF",
  async () => {
    const snapshot = await runFixtureProbe("snapshot-probe");
    assert.deepEqual(snapshot.exact, {
      snapshot: "ready\nstatus\nack:status\n",
      snapshotBytes: 24,
      truncated: false,
    });
  },
);

test("preserves completed blank rows above the cursor", async () => {
  const snapshot = await runFixtureProbe("snapshot-probe");
  assert.deepEqual(snapshot.completedBlank, {
    snapshot: "A\n\n",
    snapshotBytes: 3,
    truncated: false,
  });
});

test(
  "preserves blank history and nonempty content below the cursor",
  async () => {
    const snapshot = await runFixtureProbe("snapshot-probe");
    assert.deepEqual(snapshot.historyAndBelow, {
      snapshot: "\nhistory\ntop\n\nbelow\n",
      snapshotBytes: 20,
      truncated: false,
    });
  },
);

test("preserves emitted row-end spaces and tabs byte for byte", async () => {
  const snapshot = await runFixtureProbe("snapshot-probe");
  assert.deepEqual(snapshot.rowEnd, {
    snapshot: "edge  \ntab\t\n",
    snapshotBytes: 12,
    truncated: false,
  });
});

test(
  "rejects capture metadata or physical-row-count drift instead of guessing",
  async () => {
    const snapshot = await runFixtureProbe("snapshot-probe");
    assert.deepEqual(snapshot.invalidCases, {
      invalidUtf8: true,
      metadataCursor: true,
      metadataFields: true,
      metadataFinalLf: true,
      metadataHeight: true,
      metadataNegative: true,
      metadataOverflow: true,
      metadataSign: true,
      metadataWhitespace: true,
      missingFinalLf: true,
      nul: true,
      rowCount: true,
    });
    assert.deepEqual(snapshot.captureFailures, {
      barrier: true,
      captureExit: true,
      captureStderr: true,
      metadataExit: true,
      metadataStderr: true,
    });
  },
);

test(
  "normalizes split UTF-8 with one replacement and returns no ANSI control bytes",
  async () => {
    const snapshot = await runFixtureProbe("snapshot-probe");
    assert.equal(snapshot.normalized, "A€�B");
    assert.equal(snapshot.normalizedBytes, 8);
    const host = await runFixtureProbe("host-tmux-probe");
    assert.deepEqual(
      {
        snapshot: host.cases.ansi.snapshot,
        snapshotBytes: host.cases.ansi.snapshotBytes,
        truncated: host.cases.ansi.truncated,
      },
      {
        snapshot: "ABC\n",
        snapshotBytes: 4,
        truncated: false,
      },
    );
    assert.equal(host.cases.ansi.snapshot.includes("\u001b"), false);
  },
);

test("rejects resize before capture and returns no partial snapshot", async () => {
  const snapshot = await runFixtureProbe("snapshot-probe");
  assert.deepEqual(snapshot.dimensionsRejected, {
    columns: true,
    history: true,
    rows: true,
  });
});

test("caps snapshots and truncates only the oldest prefix", async () => {
  const snapshot = await runFixtureProbe("snapshot-probe");
  assert.equal(snapshot.exactlyCapped.snapshotBytes, 65536);
  assert.equal(snapshot.exactlyCapped.truncated, false);
  assert.equal(snapshot.exactlyCapped.snapshot, "A".repeat(65535) + "\n");
  assert.equal(snapshot.truncated.snapshotBytes, 65536);
  assert.equal(snapshot.truncated.truncated, true);
  assert.equal(
    snapshot.truncated.snapshot,
    "[... older terminal content truncated ...]\n"
      + "B".repeat(65492)
      + "\n",
  );
  assert.equal(snapshot.unicodeTruncated.snapshotBytes, 65534);
  assert.equal(snapshot.unicodeTruncated.truncated, true);
  assert.equal(
    snapshot.unicodeTruncated.snapshot,
    "[... older terminal content truncated ...]\n"
      + "B".repeat(65490)
      + "\n",
  );
});

test(
  "rejects noncanonical helper snapshot payloads without returning partial data",
  async (t) => {
    for (const [name, payload] of [
      ["missing-final-lf", "partial"],
      ["embedded-nul", "partial\0\n"],
    ]) {
      await t.test(name, async (t) => {
        const { issued } = await createPositiveHarness(t, payload);
        await assert.rejects(
          issued.port.snapshot({}),
          assertPortCode("SESSION_PORT_SNAPSHOT_FAILED", "snapshot"),
        );
      });
    }
  },
);

test(
  "preserves two rendered row-end spaces through real tmux capture-pane -N -T",
  async () => {
    const host = await runFixtureProbe("host-tmux-probe");
    assert.equal(host.version, "tmux 3.6a-agents.1");
    assert.match(host.socketName, /^d007c-/);
    assert.equal(host.cases.untouched.rawBytes, 40);
    assert.deepEqual(
      {
        snapshot: host.cases.untouched.snapshot,
        snapshotBytes: host.cases.untouched.snapshotBytes,
        truncated: host.cases.untouched.truncated,
      },
      { snapshot: "", snapshotBytes: 0, truncated: false },
    );
    assert.equal(host.cases.exact.rawBytes, 61);
    assert.deepEqual(
      {
        snapshot: host.cases.exact.snapshot,
        snapshotBytes: host.cases.exact.snapshotBytes,
        truncated: host.cases.exact.truncated,
      },
      {
        snapshot: "ready\nstatus\nack:status\n",
        snapshotBytes: 24,
        truncated: false,
      },
    );
    assert.equal(host.cases.spaces.rawBytes, 50);
    assert.equal(host.cases.spaces.authenticated, true);
    assert.equal(host.cases.spaces.livePid, host.cases.spaces.panePid);
    assert.deepEqual(
      {
        snapshot: host.cases.spaces.snapshot,
        snapshotBytes: host.cases.spaces.snapshotBytes,
        truncated: host.cases.spaces.truncated,
      },
      {
        snapshot: "edge  \nnext\n",
        snapshotBytes: 12,
        truncated: false,
      },
    );
    for (const value of Object.values(host.cases)) {
      assert.deepEqual(value.captureArgv.slice(0, 7), [
        "capture-pane",
        "-p",
        "-N",
        "-T",
        "-t",
        value.target,
        "-S",
      ]);
      assert.equal(value.captureArgv[7], "-400");
      assert.doesNotMatch(value.target, /^ag-/);
    }
    assert.equal(host.ownedSocketAbsent, true);
  },
);

test("uses only fixed direct tmux argv for relay barrier and capture", async () => {
  const snapshot = await runFixtureProbe("snapshot-probe");
  assert.deepEqual(snapshot.captureArgv, [
    "capture-pane",
    "-p",
    "-N",
    "-T",
    "-t",
    "ag-red-port-codex-coder",
    "-S",
    "-400",
  ]);
  assert.deepEqual(snapshot.metadataArgv, [
    "display-message",
    "-p",
    "-t",
    "ag-red-port-codex-coder",
    "#{history_size}\t#{pane_height}\t#{cursor_y}",
  ]);
  assert.deepEqual(snapshot.identityArgv, [
    "display-message",
    "-p",
    "-t",
    "ag-red-port-codex-coder",
    "#{pid}\t#{session_id}\t#{pane_id}\t#{pane_pid}"
      + "\t#{pane_width}\t#{pane_height}",
  ]);
  assert.deepEqual(snapshot.historyLimitArgv, [
    "show-options",
    "-v",
    "-t",
    "ag-red-port-codex-coder",
    "history-limit",
  ]);
  assert.deepEqual(snapshot.relayLaunchTrace, snapshot.relayCommands);
  assert.deepEqual(snapshot.relayIdentity, {
    paneHeight: 40,
    paneId: "%2",
    panePid: 7123,
    paneWidth: 120,
    serverPid: 8000,
    sessionId: "$1",
  });
  assert.deepEqual(snapshot.relayIdentityParser, {
    shapeMapped: true,
  });
  assert.deepEqual(snapshot.relayLaunchFailures, {
    exit: { killed: true, rejected: true },
    identityId: { killed: true, rejected: true },
    identityShape: { killed: true, rejected: true },
    stderr: { killed: true, rejected: true },
  });
  assert.equal(snapshot.portPathTmuxOperations.includes("send-keys"), false);
  assert.equal(snapshot.portPathTmuxOperations.includes("-e"), false);
  assert.equal(snapshot.portPathTmuxOperations.includes("-J"), false);
  const source = [
    fs.readFileSync(HELPER, "utf8"),
    fs.readFileSync(
      new URL(
        "../../gateway/src/adapters/process_supervisor.js",
        import.meta.url,
      ),
      "utf8",
    ),
  ].join("\n");
  assert.doesNotMatch(source, /send-keys/);
  assert.doesNotMatch(source, /shell\s*=\s*True/);
});
