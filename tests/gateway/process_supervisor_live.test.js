import assert from "node:assert/strict";
import { execFile, execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough, Writable } from "node:stream";
import { test } from "node:test";
import { promisify } from "node:util";

import {
  ProcessSupervisorError,
  createProcessSupervisor,
  readLinuxProcessIdentity,
} from "../../gateway/src/adapters/process_supervisor.js";

const FIXTURE = new URL(
  "./process_supervisor_fixture_child.js",
  import.meta.url,
).pathname;
const CALLER_FIXTURE = new URL(
  "./process_supervisor_caller_fixture.js",
  import.meta.url,
).pathname;
const CALLER_HARNESS = new URL(
  "./process_supervisor_caller_harness.py",
  import.meta.url,
).pathname;
const execFileAsync = promisify(execFile);

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
    (candidate) => candidate && path.isAbsolute(candidate) && fs.existsSync(candidate),
  );
  if (!configured) throw new Error("absolute configured test Python unavailable");
  return fs.realpathSync(configured);
}

function makeWorkspace(t) {
  const workspace = fs.mkdtempSync(
    path.join(os.tmpdir(), "agents-process-supervisor-"),
  );
  t.after(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });
  return workspace;
}

function writeRuntimeWrapper(workspace) {
  const wrapper = path.join(workspace, "configured-python-wrapper");
  fs.writeFileSync(
    wrapper,
    [
      `#!${configuredPython()}`,
      "import runpy",
      "import sys",
      "script = sys.argv[1]",
      "sys.argv = sys.argv[1:]",
      "runpy.run_path(script, run_name='__main__')",
      "",
    ].join("\n"),
    { encoding: "utf8", mode: 0o700 },
  );
  return wrapper;
}

function runtimePlan(wrapper) {
  return {
    executable: wrapper,
    args: [],
    env: {
      LANG: "C",
      PATH: "/definitely/no/python",
      PYTHONIOENCODING: "utf-8",
    },
  };
}

function liveLaunch(wrapper, argv, overrides = {}) {
  return {
    runtimePlan: runtimePlan(wrapper),
    argv,
    env: {},
    cwd: path.dirname(FIXTURE),
    sessionId: "live-process-fixture",
    mode: "one-shot",
    deadlineAt: Date.now() + 10_000,
    ...overrides,
  };
}

function trackExecution(t, execution) {
  let settled = false;
  execution.completion.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  t.after(async () => {
    if (settled) return;
    const timeout = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("exact supervisor cleanup timed out"));
      }, 3_000);
      timer.unref();
    });
    await Promise.race([
      execution.cancel().catch(() => {}),
      timeout,
    ]);
  });
  return execution;
}

async function waitForFile(pathname, timeoutMs = 2_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (fs.existsSync(pathname)) {
      return JSON.parse(fs.readFileSync(pathname, "utf8"));
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`fixture marker not created: ${path.basename(pathname)}`);
}

async function waitUntilAbsent(identity, timeoutMs = 3_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const current = readLinuxProcessIdentity(identity.pid);
    if (!current || current.startToken !== identity.startToken) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(`owned identity ${identity.pid}/${identity.startToken} survived`);
}

async function observeWithin(promise, timeoutMs = 1_500) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ type: "timeout" }), timeoutMs);
  });
  try {
    return await Promise.race([
      promise.then(
        (value) => ({ type: "resolved", value }),
        (error) => ({ type: "rejected", error }),
      ),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function assertOwnedAbsent(execution, utility) {
  await waitUntilAbsent(execution.supervisor);
  await waitUntilAbsent(execution.reaper);
  await waitUntilAbsent(utility);
}

function sourceFaultProcessOps() {
  return {
    spawn(executable, args, options) {
      const child = spawn(executable, args, options);
      const rawStdout = child.stdout;
      const faultingStdout = new PassThrough();
      rawStdout.pipe(faultingStdout);
      faultingStdout.once("data", () => {
        queueMicrotask(() => {
          rawStdout.unpipe(faultingStdout);
          rawStdout.resume();
          faultingStdout.destroy(new Error("private source failure"));
        });
      });
      child.stdout = faultingStdout;
      return child;
    },
    readIdentity: readLinuxProcessIdentity,
    signalGroup(pgid, signal) {
      process.kill(-pgid, signal);
    },
  };
}

test("configured shebang wrapper works with PATH containing no Python and direct execve preserves argv/env", {
  skip: process.platform !== "linux",
}, async (t) => {
  const workspace = makeWorkspace(t);
  const wrapper = writeRuntimeWrapper(workspace);
  const marker = path.join(workspace, "argv-env.json");
  const shellCanary = path.join(workspace, "shell-canary");
  const supervisor = createProcessSupervisor();
  const literal = `$(touch ${shellCanary})`;
  const execution = trackExecution(t, await supervisor.start(liveLaunch(
    wrapper,
    [process.execPath, FIXTURE, "argv-env", marker, literal, "two words"],
    {
      env: {
        EXACT_VALUE: "configured-environment",
        PATH: "/definitely/no/provider/path",
      },
    },
  )));

  assert.deepEqual(await execution.completion, {
    status: "exited",
    exitCode: 0,
    signal: null,
  });
  const captured = await waitForFile(marker);
  assert.deepEqual(captured.argv, [literal, "two words"]);
  assert.deepEqual(captured.env, {
    EXACT_VALUE: "configured-environment",
    PATH: "/definitely/no/provider/path",
  });
  assert.equal(fs.existsSync(shellCanary), false);
});

test("ENOEXEC is a safe direct-exec failure and never falls back to a shell", {
  skip: process.platform !== "linux",
}, async (t) => {
  const workspace = makeWorkspace(t);
  const wrapper = writeRuntimeWrapper(workspace);
  const canary = path.join(workspace, "enoexec-shell-canary");
  const utility = path.join(workspace, "no-shebang-utility");
  fs.writeFileSync(utility, `touch ${canary}\n`, {
    encoding: "utf8",
    mode: 0o700,
  });
  const execution = trackExecution(t, await createProcessSupervisor().start(
    liveLaunch(wrapper, [utility]),
  ));

  await assert.rejects(
    execution.completion,
    (error) =>
      error instanceof ProcessSupervisorError
      && error.code === "PROCESS_EXEC_FAILED"
      && !error.message.includes(utility),
  );
  assert.equal(fs.existsSync(canary), false);
});

test("large streamed output honors slow-sink backpressure while the event loop remains responsive", {
  skip: process.platform !== "linux",
}, async (t) => {
  const workspace = makeWorkspace(t);
  const wrapper = writeRuntimeWrapper(workspace);
  const expectedBytes = 8 * 1024 * 1024;
  let receivedBytes = 0;
  let ticks = 0;
  const slowSink = new Writable({
    highWaterMark: 1024,
    write(chunk, _encoding, callback) {
      receivedBytes += chunk.length;
      setImmediate(callback);
    },
  });
  const interval = setInterval(() => {
    ticks += 1;
  }, 1);
  t.after(() => clearInterval(interval));
  const execution = trackExecution(t, await createProcessSupervisor().start(liveLaunch(
    wrapper,
    [process.execPath, FIXTURE, "large-output", String(expectedBytes)],
    { stdout: slowSink },
  )));

  assert.deepEqual(await execution.completion, {
    status: "exited",
    exitCode: 0,
    signal: null,
  });
  clearInterval(interval);
  assert.equal(receivedBytes, expectedBytes);
  assert.ok(ticks >= 5, `expected responsive timer ticks, received ${ticks}`);
});

for (const streamFailure of ["sink-error", "sink-close", "source-error"]) {
  test(`persistent ${streamFailure} triggers authenticated cleanup before stream failure settlement`, {
    skip: process.platform !== "linux",
  }, async (t) => {
    const workspace = makeWorkspace(t);
    const wrapper = writeRuntimeWrapper(workspace);
    const marker = path.join(workspace, `${streamFailure}.json`);
    let stdout;
    let processOps;
    if (streamFailure === "sink-error") {
      stdout = new Writable({
        write(_chunk, _encoding, callback) {
          callback(new Error("private sink failure"));
        },
      });
    } else if (streamFailure === "sink-close") {
      stdout = new Writable({
        write(_chunk, _encoding, callback) {
          this.destroy();
          callback();
        },
      });
    } else {
      processOps = sourceFaultProcessOps();
    }
    const supervisor = createProcessSupervisor(
      processOps ? { processOps } : {},
    );
    const execution = trackExecution(t, await supervisor.start(liveLaunch(
      wrapper,
      [
        process.execPath,
        FIXTURE,
        "persistent-output",
        marker,
        "150",
      ],
      {
        mode: "persistent",
        deadlineAt: undefined,
        terminationGraceMs: 80,
        stdout,
      },
    )));
    const utility = await execution.utilityIdentity;
    const markerValue = await waitForFile(marker);
    assert.deepEqual(markerValue.identity, {
      pid: utility.pid,
      startToken: utility.startToken,
      pgid: utility.pgid,
      sid: utility.sid,
    });

    const observed = await observeWithin(execution.completion);
    if (observed.type === "timeout") {
      void execution.cancel();
      await assertOwnedAbsent(execution, utility);
    }
    assert.equal(observed.type, "rejected");
    assert.equal(observed.error.code, "PROCESS_STREAM_FAILED");
    await assertOwnedAbsent(execution, utility);
  });
}

test("one-shot deadline includes delayed output finalization without destroying the caller sink", {
  skip: process.platform !== "linux",
}, async (t) => {
  const workspace = makeWorkspace(t);
  const wrapper = writeRuntimeWrapper(workspace);
  let writeCallback;
  const sink = new Writable({
    autoDestroy: false,
    write(_chunk, _encoding, callback) {
      writeCallback = callback;
    },
  });
  const releaseWrite = () => {
    const callback = writeCallback;
    writeCallback = undefined;
    callback?.();
  };
  t.after(releaseWrite);
  const deadlineAt = Date.now() + 500;
  const execution = trackExecution(t, await createProcessSupervisor().start(
    liveLaunch(
      wrapper,
      [process.execPath, FIXTURE, "large-output", "1024"],
      { deadlineAt, stdout: sink, terminationGraceMs: 80 },
    ),
  ));
  const utility = await execution.utilityIdentity;

  const observed = await observeWithin(execution.completion, 1_000);
  assert.deepEqual(observed, {
    type: "resolved",
    value: { status: "timed_out" },
  });
  assert.ok(Date.now() - deadlineAt < 500);
  assert.equal(sink.destroyed, false);
  assert.equal(sink.writableEnded, false);
  await assertOwnedAbsent(execution, utility);
  assert.equal(typeof writeCallback, "function");
  assert.equal(sink.listenerCount("error"), 0);
  assert.equal(sink.listenerCount("close"), 0);

  const callback = writeCallback;
  writeCallback = undefined;
  callback?.(new Error("late private sink callback failure"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sink.listenerCount("error"), 0);
  assert.equal(sink.listenerCount("close"), 0);
  assert.equal(sink.destroyed, false);
  assert.equal(sink.writableEnded, false);
});

test("absolute timeout kills and reaps TERM-resistant same-group and adopted descendants", {
  skip: process.platform !== "linux",
}, async (t) => {
  for (const mode of ["same-group-tree", "escaped-tree"]) {
    const workspace = makeWorkspace(t);
    const wrapper = writeRuntimeWrapper(workspace);
    const marker = path.join(workspace, `${mode}.json`);
    const supervisor = createProcessSupervisor();
    const execution = trackExecution(t, await supervisor.start(liveLaunch(
      wrapper,
      [process.execPath, FIXTURE, mode, marker],
      {
        deadlineAt: Date.now() + 500,
        terminationGraceMs: 80,
      },
    )));
    const utility = await execution.utilityIdentity;
    const descendant = await waitForFile(marker);
    const leader = await waitForFile(`${marker}.leader`);

    assert.deepEqual(await execution.completion, { status: "timed_out" });
    await waitUntilAbsent(utility);
    await waitUntilAbsent(leader.identity);
    await waitUntilAbsent(descendant.identity);
  }
});

test("persistent sessions have no reasoning deadline and idempotent cancel reaps their tree", {
  skip: process.platform !== "linux",
}, async (t) => {
  const workspace = makeWorkspace(t);
  const wrapper = writeRuntimeWrapper(workspace);
  const marker = path.join(workspace, "persistent-cancel.json");
  const execution = trackExecution(t, await createProcessSupervisor().start(liveLaunch(
    wrapper,
    [process.execPath, FIXTURE, "escaped-tree", marker],
    {
      mode: "persistent",
      deadlineAt: undefined,
      terminationGraceMs: 80,
    },
  )));
  const utility = await execution.utilityIdentity;
  const descendant = await waitForFile(marker);
  const leader = await waitForFile(`${marker}.leader`);
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.deepEqual(readLinuxProcessIdentity(utility.pid), {
    pid: utility.pid,
    startToken: utility.startToken,
    pgid: utility.pgid,
    sid: utility.sid,
  });
  assert.deepEqual(
    readLinuxProcessIdentity(descendant.identity.pid),
    descendant.identity,
  );

  const first = execution.cancel();
  const second = execution.cancel();
  assert.deepEqual(await first, { status: "cancelled" });
  assert.deepEqual(await second, { status: "cancelled" });
  await waitUntilAbsent(utility);
  await waitUntilAbsent(leader.identity);
  await waitUntilAbsent(descendant.identity);
});

test("abrupt supervisor SIGKILL leaves the persistent reaper to clean the exact utility tree", {
  skip: process.platform !== "linux",
}, async (t) => {
  const workspace = makeWorkspace(t);
  const wrapper = writeRuntimeWrapper(workspace);
  const { stdout, stderr } = await execFileAsync(
    configuredPython(),
    [
      CALLER_HARNESS,
      process.execPath,
      CALLER_FIXTURE,
      "supervisor-loss",
      workspace,
      wrapper,
    ],
    {
      encoding: "utf8",
      env: {
        LANG: "C",
        PATH: "/definitely/no/python",
      },
      shell: false,
      timeout: 12_000,
    },
  );
  assert.equal(stderr, "");
  const result = JSON.parse(stdout);
  assert.equal(result.ok, true, stdout);
  assert.equal(result.gate, "supervisor-loss");
  assert.equal(result.completionCode, "PROCESS_SUPERVISOR_LOST");
  assert.deepEqual(result.signalledSupervisor, result.supervisor);
  assert.deepEqual(result.adoptedChildren, [result.reaper]);
  assert.deepEqual(result.reapedChild, result.reaper);
  assert.equal(result.reaperExitCode, 0);
  assert.equal(result.postSigkillBoundMs, 4_000);
  assert.equal(result.callerExitBoundMs, 2_000);
  assert.equal(result.survivors.length, 0);
  assert.equal(result.sentinelPreserved, true);
  assert.equal(result.owned.length, 5);
  for (const owned of result.owned) {
    assert.equal(readLinuxProcessIdentity(owned.pid), null);
  }
  assert.equal(readLinuxProcessIdentity(result.sentinel.pid), null);
});

test("abrupt external caller SIGKILL is contained at pre-release, pre-exec, and post-exec gates", {
  skip: process.platform !== "linux",
}, async (t) => {
  for (const gate of ["before-release", "before-exec", "after-exec"]) {
    const workspace = makeWorkspace(t);
    const wrapper = writeRuntimeWrapper(workspace);
    const { stdout, stderr } = await execFileAsync(
      configuredPython(),
      [
        CALLER_HARNESS,
        process.execPath,
        CALLER_FIXTURE,
        gate,
        workspace,
        wrapper,
      ],
      {
        encoding: "utf8",
        env: {
          LANG: "C",
          PATH: "/definitely/no/python",
        },
        shell: false,
        timeout: 8_000,
      },
    );
    assert.equal(stderr, "", gate);
    const result = JSON.parse(stdout);
    assert.equal(result.ok, true, `${gate}: ${stdout}`);
    assert.equal(result.gate, gate);
    assert.equal(result.survivors.length, 0);
    assert.equal(result.sentinelPreserved, true);
    for (const owned of result.owned) {
      assert.equal(readLinuxProcessIdentity(owned.pid), null, gate);
    }
  }
});

test("the pipe-only design rejects FIFO options and never invokes or opens hostile FIFO paths", {
  skip: process.platform !== "linux",
}, async (t) => {
  const workspace = makeWorkspace(t);
  const wrapper = writeRuntimeWrapper(workspace);
  const fifo = path.join(workspace, "hostile.fifo");
  const invoked = path.join(workspace, "hostile-invoked");
  const hostileUtility = path.join(workspace, "hostile-mkfifo");
  execFileSync("/usr/bin/mkfifo", [fifo]);
  fs.chmodSync(fifo, 0o000);
  fs.writeFileSync(
    hostileUtility,
    `#!/bin/sh\n: > "${invoked}"\nexit 99\n`,
    { encoding: "utf8", mode: 0o700 },
  );
  const before = fs.lstatSync(fifo, { bigint: true });
  const supervisor = createProcessSupervisor();

  await assert.rejects(
    supervisor.start({
      ...liveLaunch(wrapper, [process.execPath, FIXTURE, "exit", "0"]),
      fifoPath: fifo,
    }),
    { code: "PROCESS_INVALID_REQUEST" },
  );

  const execution = trackExecution(t, await supervisor.start(liveLaunch(
    wrapper,
    [process.execPath, FIXTURE, "exit", "0"],
    {
      runtimePlan: {
        ...runtimePlan(wrapper),
        env: {
          ...runtimePlan(wrapper).env,
          AGENTS_MKFIFO_BIN: hostileUtility,
          AGENTS_PROCESS_FIFO: fifo,
        },
      },
      env: {
        AGENTS_MKFIFO_BIN: hostileUtility,
        AGENTS_PROCESS_FIFO: fifo,
      },
    },
  )));
  assert.deepEqual(await execution.completion, {
    status: "exited",
    exitCode: 0,
    signal: null,
  });
  const after = fs.lstatSync(fifo, { bigint: true });
  assert.equal(fs.existsSync(invoked), false);
  assert.equal(after.ino, before.ino);
  assert.equal(after.mode, before.mode);
  assert.equal(after.mtimeNs, before.mtimeNs);
});
