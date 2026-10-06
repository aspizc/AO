import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { PassThrough, Writable } from "node:stream";
import { test } from "node:test";
import { promisify } from "node:util";

import {
  PROCESS_SUPERVISOR_PROTOCOL,
  ProcessSupervisorError,
  createProcessSupervisor,
  validateFallbackLease,
} from "../../gateway/src/adapters/process_supervisor.js";

const EVENT_RACE_FIXTURE = new URL(
  "./process_supervisor_event_race_fixture.js",
  import.meta.url,
).pathname;
const execFileAsync = promisify(execFile);

const SUPERVISOR = Object.freeze({
  pid: 4100,
  startToken: "supervisor-start",
  pgid: 4100,
  sid: 4100,
});
const REAPER = Object.freeze({
  pid: 4101,
  startToken: "reaper-start",
  pgid: 4100,
  sid: 4100,
});
const UTILITY = Object.freeze({
  pid: 4102,
  startToken: "utility-start",
  pgid: 4102,
  sid: 4102,
});

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function observeWithin(promise, timeoutMs = 300) {
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

class FakeChild extends EventEmitter {
  constructor(pid = SUPERVISOR.pid, stdin = new PassThrough()) {
    super();
    this.pid = pid;
    this.stdin = stdin;
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

  emitExit(code = 0, signal = null) {
    this.emit("exit", code, signal);
  }

  closeTranscript() {
    this.stdout.end();
    this.stderr.end();
    this.transcript.end();
  }
}

function transcript(child, event) {
  child.transcript.write(`${JSON.stringify(event)}\n`);
}

function fakeScheduler() {
  const pending = [];
  return {
    pending,
    setTimeout(callback, delay) {
      const entry = { callback, delay, cleared: false };
      pending.push(entry);
      return entry;
    },
    clearTimeout(entry) {
      entry.cleared = true;
    },
    run(entry = pending.find((candidate) => !candidate.cleared)) {
      if (!entry || entry.cleared) return;
      entry.cleared = true;
      entry.callback();
    },
  };
}

function createFakeProcessOps({
  child = new FakeChild(),
  identityOverrides = new Map(),
  onCommand,
} = {}) {
  const spawnCalls = [];
  const signalCalls = [];
  const commands = [];
  let input = "";
  const identities = new Map([
    [SUPERVISOR.pid, SUPERVISOR],
    [REAPER.pid, REAPER],
    [UTILITY.pid, UTILITY],
    ...identityOverrides,
  ]);

  child.stdin.setEncoding("utf8");
  child.stdin.on("data", (chunk) => {
    input += chunk;
    while (input.includes("\n")) {
      const newline = input.indexOf("\n");
      const line = input.slice(0, newline);
      input = input.slice(newline + 1);
      const command = JSON.parse(line);
      commands.push(command);
      if (command.type === "launch") {
        queueMicrotask(() => {
          transcript(child, {
            type: "reaper_ready",
            protocol: PROCESS_SUPERVISOR_PROTOCOL,
            leaseDigest: digest(command.leaseNonce),
            bindingDigest: command.bindingDigest,
            platform: "linux",
            subreaper: true,
            supervisor: SUPERVISOR,
            reaper: REAPER,
          });
        });
      }
      onCommand?.(command, {
        child,
        emitUtilityReady(bindingDigest) {
          transcript(child, {
            type: "utility_ready",
            protocol: PROCESS_SUPERVISOR_PROTOCOL,
            bindingDigest,
            utility: UTILITY,
          });
        },
        emitTerminal(reason, fields = {}) {
          transcript(child, {
            type: "terminal",
            protocol: PROCESS_SUPERVISOR_PROTOCOL,
            reason,
            ...fields,
          });
        },
      });
    }
  });

  return {
    child,
    commands,
    identities,
    signalCalls,
    spawnCalls,
    ops: {
      spawn(executable, args, options) {
        spawnCalls.push({
          executable,
          args: structuredClone(args),
          options: {
            ...options,
            env: structuredClone(options.env),
            stdio: structuredClone(options.stdio),
          },
        });
        return child;
      },
      readIdentity(pid) {
        return identities.get(pid) ?? null;
      },
      signalGroup(pgid, signal) {
        signalCalls.push({ pgid, signal });
      },
    },
  };
}

class FailingControlStream extends PassThrough {
  constructor(failAtWrite) {
    super();
    this.failAtWrite = failAtWrite;
    this.writeCount = 0;
  }

  _transform(chunk, encoding, callback) {
    this.writeCount += 1;
    if (this.writeCount === this.failAtWrite) {
      const error = new Error("private control failure");
      error.code = "EPIPE";
      callback(error);
      return;
    }
    super._transform(chunk, encoding, callback);
  }
}

function baseLaunch(overrides = {}) {
  return {
    runtimePlan: {
      executable: "/configured/python-wrapper",
      args: ["--isolated", "--wrapper-argument"],
      env: {
        LANG: "C",
        PATH: "/no/ambient/python",
      },
    },
    argv: [
      "/opt/provider/bin/agent",
      "--literal",
      "$(touch /tmp/process-supervisor-shell-canary)",
    ],
    env: {
      AGENT_MODE: "test",
      PATH: "/provider/bin",
    },
    cwd: "/safe/repository",
    sessionId: "session-01",
    mode: "one-shot",
    deadlineAt: 10_000,
    ...overrides,
  };
}

for (const scenario of [
  "simultaneous-destination-errors",
  "reversed-destination-errors",
  "transcript-error-error",
  "transcript-close-error-error",
  "transcript-error-nexttick-error",
  "transcript-close-nexttick-error-nexttick-error",
  "blocked-sink-late-error",
  "blocked-sink-cancel-late-error",
  "blocked-sink-late-microtask-error",
  "blocked-sink-cancel-late-microtask-error",
]) {
  test(`process-level event guard contains ${scenario}`, async () => {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [EVENT_RACE_FIXTURE, scenario],
      {
        encoding: "utf8",
        timeout: 3_000,
      },
    );

    assert.equal(stderr, "");
    assert.deepEqual(JSON.parse(stdout), { scenario, ok: true });
  });
}

test("starts one configured runtime plan with immutable argv/env and shell disabled", async () => {
  const scheduler = fakeScheduler();
  const harness = createFakeProcessOps({
    onCommand(command, controls) {
      if (command.type === "release") {
        const launch = harness.commands[0];
        controls.emitUtilityReady(launch.bindingDigest);
      }
    },
  });
  const supervisor = createProcessSupervisor({
    processOps: harness.ops,
    clock: { now: () => 1_000 },
    scheduler,
    randomBytes: () => Buffer.alloc(32, 7),
    platform: "linux",
  });
  const launch = baseLaunch();

  const execution = await supervisor.start(launch);
  const utilityIdentity = await execution.utilityIdentity;

  assert.equal(harness.spawnCalls.length, 1);
  assert.equal(harness.spawnCalls[0].executable, launch.runtimePlan.executable);
  assert.deepEqual(
    harness.spawnCalls[0].args.slice(0, -1),
    launch.runtimePlan.args,
  );
  assert.match(
    harness.spawnCalls[0].args.at(-1),
    /process_supervisor_helper\.py$/,
  );
  assert.deepEqual(harness.spawnCalls[0].options.env, launch.runtimePlan.env);
  assert.equal(harness.spawnCalls[0].options.shell, false);
  assert.equal(harness.spawnCalls[0].options.detached, true);
  assert.deepEqual(harness.spawnCalls[0].options.stdio, [
    "pipe",
    "pipe",
    "pipe",
    "pipe",
  ]);

  assert.equal(harness.commands[0].type, "launch");
  assert.deepEqual(harness.commands[0].argv, launch.argv);
  assert.deepEqual(harness.commands[0].env, launch.env);
  assert.equal(harness.commands[0].cwd, launch.cwd);
  assert.equal(harness.commands[0].deadlineAt, launch.deadlineAt);
  assert.equal(harness.commands[1].type, "release");
  assert.equal(harness.commands[2].type, "continue");
  assert.equal(harness.commands.length, 3);
  assert.equal(scheduler.pending.length, 1);
  assert.equal(scheduler.pending[0].delay, 9_000);
  assert.deepEqual(utilityIdentity, {
    ...UTILITY,
    bindingDigest: execution.bindingDigest,
  });

  launch.argv[1] = "--mutated";
  launch.env.AGENT_MODE = "mutated";
  launch.runtimePlan.args[0] = "--mutated";
  assert.equal(harness.commands[0].argv[1], "--literal");
  assert.equal(harness.commands[0].env.AGENT_MODE, "test");
  assert.equal(harness.spawnCalls[0].args[0], "--isolated");
});

test("one-shot budget is absolute and persistent sessions arm no reasoning deadline", async () => {
  const expiredHarness = createFakeProcessOps();
  const expired = createProcessSupervisor({
    processOps: expiredHarness.ops,
    clock: { now: () => 5_001 },
    scheduler: fakeScheduler(),
    randomBytes: () => Buffer.alloc(32, 1),
    platform: "linux",
  });

  await assert.rejects(
    expired.start(baseLaunch({ deadlineAt: 5_000 })),
    (error) =>
      error instanceof ProcessSupervisorError
      && error.code === "PROCESS_BUDGET_EXHAUSTED"
      && !error.message.includes("/opt/provider"),
  );
  assert.equal(expiredHarness.spawnCalls.length, 0);

  const persistentScheduler = fakeScheduler();
  const persistentHarness = createFakeProcessOps();
  const persistent = createProcessSupervisor({
    processOps: persistentHarness.ops,
    clock: { now: () => 1_000 },
    scheduler: persistentScheduler,
    randomBytes: () => Buffer.alloc(32, 2),
    platform: "linux",
  });

  await assert.rejects(
    persistent.start(baseLaunch({
      mode: "persistent",
      deadlineAt: 2_000,
    })),
    (error) =>
      error instanceof ProcessSupervisorError
      && error.code === "PROCESS_INVALID_REQUEST",
  );
  assert.equal(persistentHarness.spawnCalls.length, 0);

  const execution = await persistent.start(baseLaunch({
    mode: "persistent",
    deadlineAt: undefined,
  }));
  assert.equal(execution.mode, "persistent");
  assert.equal(persistentScheduler.pending.length, 0);
});

test("invalid stream destinations fail before configured runtime creation", async () => {
  const harness = createFakeProcessOps();
  const supervisor = createProcessSupervisor({
    processOps: harness.ops,
    clock: { now: () => 1_000 },
    scheduler: fakeScheduler(),
    randomBytes: () => Buffer.alloc(32, 11),
    platform: "linux",
  });

  await assert.rejects(
    supervisor.start(baseLaunch({ stdout: {} })),
    {
      code: "PROCESS_INVALID_REQUEST",
    },
  );
  assert.equal(harness.spawnCalls.length, 0);
});

test("encoded launch limits reject oversized argv and environment before spawn", async () => {
  const harness = createFakeProcessOps();
  const supervisor = createProcessSupervisor({
    processOps: harness.ops,
    clock: { now: () => 1_000 },
    scheduler: fakeScheduler(),
    randomBytes: () => Buffer.alloc(32, 12),
    platform: "linux",
  });
  const requests = [
    baseLaunch({ env: { OVERSIZED: "x".repeat(1_100_000) } }),
    baseLaunch({ argv: ["/opt/provider/bin/agent", "€".repeat(400_000)] }),
    baseLaunch({
      env: Object.fromEntries(
        Array.from(
          { length: 8 },
          (_, index) => [`AGGREGATE_${index}`, "x".repeat(140_000)],
        ),
      ),
    }),
    baseLaunch({
      runtimePlan: {
        ...baseLaunch().runtimePlan,
        env: Object.fromEntries(
          Array.from(
            { length: 8 },
            (_, index) => [`RUNTIME_${index}`, "x".repeat(140_000)],
          ),
        ),
      },
    }),
    baseLaunch({
      argv: [
        "/opt/provider/bin/agent",
        ...Array.from({ length: 4_096 }, () => "bounded"),
      ],
    }),
  ];

  for (const request of requests) {
    await assert.rejects(supervisor.start(request), {
      code: "PROCESS_INVALID_REQUEST",
    });
  }
  assert.equal(harness.spawnCalls.length, 0);
});

test("stream source, destination error, and premature close each trigger one automatic teardown", async () => {
  const cases = [
    {
      name: "destination error",
      makeDestination() {
        return new Writable({
          write(_chunk, _encoding, callback) {
            callback(new Error("private destination failure"));
          },
        });
      },
      fail(harness) {
        harness.child.stdout.write("provider-output");
      },
    },
    {
      name: "destination close",
      makeDestination() {
        return new Writable({
          write(_chunk, _encoding, callback) {
            this.destroy();
            callback();
          },
        });
      },
      fail(harness) {
        harness.child.stdout.write("provider-output");
      },
    },
    {
      name: "source error",
      makeDestination() {
        return undefined;
      },
      fail(harness) {
        harness.child.stdout.destroy(new Error("private source failure"));
      },
    },
    {
      name: "source close",
      makeDestination() {
        return undefined;
      },
      fail(harness) {
        harness.child.stdout.emit("close");
      },
    },
  ];

  for (const fixture of cases) {
    let terminationCount = 0;
    const harness = createFakeProcessOps({
      onCommand(command, controls) {
        if (command.type === "release") {
          controls.emitUtilityReady(harness.commands[0].bindingDigest);
        }
        if (command.type === "continue") {
          queueMicrotask(() => fixture.fail(harness));
        }
        if (command.type === "terminate") {
          terminationCount += 1;
          queueMicrotask(() => {
            controls.emitTerminal("cancelled");
            harness.child.stdout.end();
            harness.child.stderr.end();
            harness.child.emitExit(0, null);
            harness.child.transcript.end();
          });
        }
      },
    });
    const supervisor = createProcessSupervisor({
      processOps: harness.ops,
      clock: { now: () => 1_000 },
      scheduler: fakeScheduler(),
      randomBytes: () => Buffer.alloc(32, 13),
      platform: "linux",
    });
    const execution = await supervisor.start(baseLaunch({
      mode: "persistent",
      deadlineAt: undefined,
      stdout: fixture.makeDestination(),
    }));

    const observed = await observeWithin(execution.completion);
    if (observed.type === "timeout") {
      void execution.cancel();
      await observeWithin(execution.completion);
    }
    assert.equal(observed.type, "rejected", fixture.name);
    assert.equal(
      observed.error.code,
      "PROCESS_STREAM_FAILED",
      fixture.name,
    );
    assert.equal(terminationCount, 1, fixture.name);
  }
});

test("stream, cancel, and deadline races preserve the first observed cause and settle once", async () => {
  const cases = [
    {
      name: "stream before cancel",
      expected: "stream_failed",
      race({ execution, sink }) {
        sink.emit("error", new Error("private sink race"));
        void execution.cancel();
      },
    },
    {
      name: "cancel before source error",
      expected: "cancelled",
      race({ execution, harness }) {
        void execution.cancel();
        harness.child.stdout.destroy(new Error("private source race"));
      },
    },
    {
      name: "stream before deadline",
      expected: "stream_failed",
      race({ scheduler, sink }) {
        sink.emit("error", new Error("private sink race"));
        scheduler.run();
      },
    },
    {
      name: "deadline before source error",
      expected: "timed_out",
      race({ scheduler, harness }) {
        scheduler.run();
        harness.child.stdout.destroy(new Error("private source race"));
      },
    },
  ];

  for (const fixture of cases) {
    const scheduler = fakeScheduler();
    const sink = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });
    const harness = createFakeProcessOps({
      onCommand(command, controls) {
        if (command.type !== "terminate") return;
        queueMicrotask(() => {
          controls.emitTerminal(command.reason);
          harness.child.stdout.end();
          harness.child.stderr.end();
          harness.child.emitExit(0, null);
          harness.child.transcript.end();
        });
      },
    });
    const execution = await createProcessSupervisor({
      processOps: harness.ops,
      clock: { now: () => 1_000 },
      scheduler,
      randomBytes: () => Buffer.alloc(32, 17),
      platform: "linux",
    }).start(baseLaunch({ stdout: sink }));

    fixture.race({ execution, harness, scheduler, sink });
    const observed = await observeWithin(execution.completion);
    await new Promise((resolve) => setImmediate(resolve));
    if (fixture.expected === "stream_failed") {
      assert.equal(observed.type, "rejected", fixture.name);
      assert.equal(
        observed.error.code,
        "PROCESS_STREAM_FAILED",
        fixture.name,
      );
    } else {
      assert.deepEqual(observed, {
        type: "resolved",
        value: { status: fixture.expected },
      }, fixture.name);
    }
    assert.equal(
      harness.commands.filter((command) => command.type === "terminate").length,
      1,
      fixture.name,
    );
  }
});

test("deadline remains authoritative until delayed output callbacks settle", async () => {
  const scheduler = fakeScheduler();
  const callback = deferred();
  const sink = new Writable({
    write(_chunk, _encoding, done) {
      callback.promise.then(done);
    },
  });
  const harness = createFakeProcessOps({
    onCommand(command, controls) {
      if (command.type !== "release") return;
      harness.child.stdout.write("provider-output");
      controls.emitTerminal("exited", { exitCode: 0, signal: null });
      harness.child.stdout.end();
      harness.child.stderr.end();
      harness.child.emitExit(0, null);
      harness.child.transcript.end();
    },
  });
  const supervisor = createProcessSupervisor({
    processOps: harness.ops,
    clock: { now: () => 1_000 },
    scheduler,
    randomBytes: () => Buffer.alloc(32, 14),
    platform: "linux",
  });
  const execution = await supervisor.start(baseLaunch({ stdout: sink }));

  scheduler.run();
  const observed = await observeWithin(execution.completion);
  callback.resolve();

  assert.deepEqual(observed, {
    type: "resolved",
    value: { status: "timed_out" },
  });
  assert.equal(sink.destroyed, false);
  assert.equal(scheduler.pending[0].cleared, true);
});

test("transcript error, close, partial frame, and child-exit races terminate exactly once", async () => {
  const cases = [
    "error-before-exit",
    "exit-before-error",
    "partial-before-end",
    "duplicate-error-close-exit",
  ];

  for (const order of cases) {
    let terminationCount = 0;
    const harness = createFakeProcessOps({
      onCommand(command) {
        if (command.type === "terminate") terminationCount += 1;
      },
    });
    const supervisor = createProcessSupervisor({
      processOps: harness.ops,
      clock: { now: () => 1_000 },
      scheduler: fakeScheduler(),
      randomBytes: () => Buffer.alloc(32, 15),
      platform: "linux",
    });
    const execution = await supervisor.start(baseLaunch({
      mode: "persistent",
      deadlineAt: undefined,
    }));
    harness.child.stdout.end();
    harness.child.stderr.end();

    if (order === "exit-before-error") {
      harness.child.emitExit(1, null);
      harness.child.transcript.destroy(new Error("private transcript failure"));
    } else if (order === "partial-before-end") {
      harness.child.transcript.write('{"type":"terminal"');
      harness.child.transcript.end();
      harness.child.emitExit(1, null);
    } else {
      harness.child.transcript.destroy(new Error("private transcript failure"));
      harness.child.emitExit(1, null);
      if (order === "duplicate-error-close-exit") {
        harness.child.emitExit(1, null);
        harness.child.transcript.emit("close");
      }
    }

    const observed = await observeWithin(execution.completion);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(observed.type, "rejected", order);
    assert.equal(observed.error.code, "PROCESS_BOOTSTRAP_FAILED", order);
    assert.equal(
      terminationCount + harness.signalCalls.length,
      1,
      order,
    );
    for (const event of ["close", "data", "end", "error"]) {
      assert.equal(
        harness.child.transcript.listenerCount(event),
        0,
        `${order}:${event}`,
      );
    }
    assert.equal(harness.child.stdin.listenerCount("error"), 0, order);
    assert.equal(harness.child.stdin.listenerCount("close"), 0, order);
  }
});

test("control callback EPIPE is contained and falls back through authenticated identity", async () => {
  const child = new FakeChild(
    SUPERVISOR.pid,
    new FailingControlStream(3),
  );
  const harness = createFakeProcessOps({
    child,
    onCommand(command, controls) {
      if (command.type === "release") {
        controls.emitUtilityReady(harness.commands[0].bindingDigest);
      }
    },
  });
  child.stdin.once("close", () => {
    child.stdout.end();
    child.stderr.end();
    child.emitExit(1, null);
    child.transcript.end();
  });
  const supervisor = createProcessSupervisor({
    processOps: harness.ops,
    clock: { now: () => 1_000 },
    scheduler: fakeScheduler(),
    randomBytes: () => Buffer.alloc(32, 16),
    platform: "linux",
  });
  const execution = await supervisor.start(baseLaunch({
    mode: "persistent",
    deadlineAt: undefined,
  }));
  await execution.utilityIdentity;

  const observed = await observeWithin(execution.completion);
  assert.equal(observed.type, "rejected");
  assert.equal(observed.error.code, "PROCESS_BOOTSTRAP_FAILED");
  assert.equal(observed.error.phase, "control");
  assert.ok(!observed.error.message.includes("private control failure"));
  assert.deepEqual(harness.signalCalls, [{
    pgid: SUPERVISOR.pgid,
    signal: "SIGTERM",
  }]);
  assert.equal(child.stdin.listenerCount("error"), 0);
  assert.equal(child.stdin.listenerCount("close"), 0);
});

test("cancel and absolute-deadline races send one termination request and settle once", async () => {
  const scheduler = fakeScheduler();
  let terminalEvents = 0;
  const harness = createFakeProcessOps({
    onCommand(command, controls) {
      if (command.type === "terminate") {
        terminalEvents += 1;
        queueMicrotask(() => {
          controls.emitTerminal(command.reason);
          harness.child.emitExit(0, null);
          harness.child.closeTranscript();
        });
      }
    },
  });
  const supervisor = createProcessSupervisor({
    processOps: harness.ops,
    clock: { now: () => 1_000 },
    scheduler,
    randomBytes: () => Buffer.alloc(32, 3),
    platform: "linux",
  });
  const execution = await supervisor.start(baseLaunch());

  const firstCancel = execution.cancel();
  const secondCancel = execution.cancel();
  scheduler.run();
  const [first, second, completion] = await Promise.all([
    firstCancel,
    secondCancel,
    execution.completion,
  ]);

  assert.deepEqual(first, { status: "cancelled" });
  assert.deepEqual(second, first);
  assert.deepEqual(completion, first);
  assert.equal(terminalEvents, 1);
  assert.equal(
    harness.commands.filter((command) => command.type === "terminate").length,
    1,
  );
});

test("deadline wins a simultaneous cancel without duplicate cleanup or settlement", async () => {
  const scheduler = fakeScheduler();
  const harness = createFakeProcessOps({
    onCommand(command, controls) {
      if (command.type !== "terminate") return;
      queueMicrotask(() => {
        controls.emitTerminal(command.reason);
        harness.child.emitExit(0, null);
        harness.child.closeTranscript();
      });
    },
  });
  const supervisor = createProcessSupervisor({
    processOps: harness.ops,
    clock: { now: () => 1_000 },
    scheduler,
    randomBytes: () => Buffer.alloc(32, 4),
    platform: "linux",
  });
  const execution = await supervisor.start(baseLaunch());

  scheduler.run();
  const cancelResult = execution.cancel();
  assert.deepEqual(await execution.completion, { status: "timed_out" });
  assert.deepEqual(await cancelResult, { status: "timed_out" });
  assert.deepEqual(
    harness.commands
      .filter((command) => command.type === "terminate")
      .map((command) => command.reason),
    ["timed_out"],
  );
});

test("fallback lease validation fails closed for absent, malformed, stale, and reused identities", () => {
  const validLease = {
    protocol: PROCESS_SUPERVISOR_PROTOCOL,
    leaseDigest: "a".repeat(64),
    bindingDigest: "b".repeat(64),
    supervisor: SUPERVISOR,
    anchor: REAPER,
  };
  const validIdentities = new Map([
    [SUPERVISOR.pid, SUPERVISOR],
    [REAPER.pid, REAPER],
  ]);
  const readValid = (pid) => validIdentities.get(pid) ?? null;

  assert.equal(validateFallbackLease(null, readValid), false);
  assert.equal(validateFallbackLease({}, readValid), false);
  assert.equal(
    validateFallbackLease(validLease, (pid) =>
      pid === REAPER.pid ? null : readValid(pid)),
    false,
  );
  assert.equal(
    validateFallbackLease(validLease, (pid) => {
      const identity = readValid(pid);
      return pid === REAPER.pid
        ? { ...identity, startToken: "reused-pid-start" }
        : identity;
    }),
    false,
  );
  assert.equal(
    validateFallbackLease(validLease, (pid) => {
      const identity = readValid(pid);
      return pid === REAPER.pid
        ? { ...identity, pgid: 9999 }
        : identity;
    }),
    false,
  );
  assert.equal(
    validateFallbackLease(validLease, () => {
      throw new Error("identity reader failed");
    }),
    false,
  );
  assert.equal(validateFallbackLease(validLease, readValid), true);
});

test("caller fallback sends one exact group TERM only after authenticated pre-exec readiness", async () => {
  const validHarness = createFakeProcessOps();
  const valid = createProcessSupervisor({
    processOps: validHarness.ops,
    clock: { now: () => 1_000 },
    scheduler: fakeScheduler(),
    randomBytes: () => Buffer.alloc(32, 5),
    platform: "linux",
  });
  const validExecution = await valid.start(baseLaunch());
  validHarness.child.emitExit(null, "SIGKILL");
  validHarness.child.closeTranscript();

  await assert.rejects(
    validExecution.completion,
    (error) =>
      error instanceof ProcessSupervisorError
      && error.code === "PROCESS_SUPERVISOR_LOST",
  );
  assert.deepEqual(validHarness.signalCalls, [{
    pgid: SUPERVISOR.pgid,
    signal: "SIGTERM",
  }]);

  const staleHarness = createFakeProcessOps();
  const stale = createProcessSupervisor({
    processOps: staleHarness.ops,
    clock: { now: () => 1_000 },
    scheduler: fakeScheduler(),
    randomBytes: () => Buffer.alloc(32, 6),
    platform: "linux",
  });
  const staleExecution = await stale.start(baseLaunch());
  staleHarness.identities.set(REAPER.pid, {
    ...REAPER,
    startToken: "reused-anchor",
  });
  staleHarness.child.emitExit(null, "SIGKILL");
  staleHarness.child.closeTranscript();
  await assert.rejects(staleExecution.completion, {
    code: "PROCESS_SUPERVISOR_LOST",
  });
  assert.deepEqual(staleHarness.signalCalls, []);
});

test("malformed or unauthenticated readiness never arms a numeric fallback", async () => {
  const cases = [
    {
      name: "missing lease",
      mutate(event) {
        delete event.leaseDigest;
      },
    },
    {
      name: "lease mismatch",
      mutate(event) {
        event.leaseDigest = "f".repeat(64);
      },
    },
    {
      name: "binding mismatch",
      mutate(event) {
        event.bindingDigest = "e".repeat(64);
      },
    },
    {
      name: "supervisor identity mismatch",
      mutate(event) {
        event.supervisor = { ...SUPERVISOR, startToken: "wrong" };
      },
    },
    {
      name: "anchor is not in stable supervisor group",
      mutate(event) {
        event.reaper = { ...REAPER, pgid: REAPER.pid, sid: REAPER.pid };
      },
    },
  ];

  for (const fixture of cases) {
    const harness = createFakeProcessOps();
    harness.child.stdin.removeAllListeners("data");
    let input = "";
    harness.child.stdin.setEncoding("utf8");
    harness.child.stdin.on("data", (chunk) => {
      input += chunk;
      if (!input.includes("\n")) return;
      const launch = JSON.parse(input.slice(0, input.indexOf("\n")));
      const event = {
        type: "reaper_ready",
        protocol: PROCESS_SUPERVISOR_PROTOCOL,
        leaseDigest: digest(launch.leaseNonce),
        bindingDigest: launch.bindingDigest,
        platform: "linux",
        subreaper: true,
        supervisor: { ...SUPERVISOR },
        reaper: { ...REAPER },
      };
      fixture.mutate(event);
      transcript(harness.child, event);
      harness.child.emitExit(1, null);
      harness.child.closeTranscript();
    });
    const supervisor = createProcessSupervisor({
      processOps: harness.ops,
      clock: { now: () => 1_000 },
      scheduler: fakeScheduler(),
      randomBytes: () => Buffer.alloc(32, 8),
      platform: "linux",
    });

    await assert.rejects(
      supervisor.start(baseLaunch()),
      (error) =>
        error instanceof ProcessSupervisorError
        && error.code === "PROCESS_BOOTSTRAP_FAILED",
      fixture.name,
    );
    assert.deepEqual(harness.signalCalls, [], fixture.name);
  }
});

test("stream callbacks remain external to provider-free transcripts and errors", async () => {
  const stdoutChunks = [];
  const stderrChunks = [];
  const harness = createFakeProcessOps({
    onCommand(command, controls) {
      if (command.type !== "release") return;
      harness.child.stdout.write("stdout-provider-sentinel");
      harness.child.stderr.write("stderr-provider-sentinel");
      harness.child.stdout.end();
      harness.child.stderr.end();
      controls.emitTerminal("exited", { exitCode: 0, signal: null });
      harness.child.emitExit(0, null);
      harness.child.closeTranscript();
    },
  });
  const supervisor = createProcessSupervisor({
    processOps: harness.ops,
    clock: { now: () => 1_000 },
    scheduler: fakeScheduler(),
    randomBytes: () => Buffer.alloc(32, 9),
    platform: "linux",
  });
  const execution = await supervisor.start(baseLaunch({
    stdout: new PassThrough().on("data", (chunk) => stdoutChunks.push(chunk)),
    stderr: new PassThrough().on("data", (chunk) => stderrChunks.push(chunk)),
  }));

  assert.deepEqual(await execution.completion, {
    status: "exited",
    exitCode: 0,
    signal: null,
  });
  assert.equal(Buffer.concat(stdoutChunks).toString(), "stdout-provider-sentinel");
  assert.equal(Buffer.concat(stderrChunks).toString(), "stderr-provider-sentinel");
  assert.ok(
    !JSON.stringify(harness.commands.slice(1)).includes("provider-sentinel"),
  );
  assert.equal(harness.child.stdin.listenerCount("error"), 0);
  assert.equal(harness.child.stdin.listenerCount("close"), 0);
});

test("a pre-release caller gate can abort without releasing utility execution", async () => {
  const gate = deferred();
  const reached = deferred();
  const harness = createFakeProcessOps();
  const supervisor = createProcessSupervisor({
    processOps: harness.ops,
    clock: { now: () => 1_000 },
    scheduler: fakeScheduler(),
    randomBytes: () => Buffer.alloc(32, 10),
    platform: "linux",
    async beforeRelease() {
      reached.resolve();
      await gate.promise;
    },
  });

  const start = supervisor.start(baseLaunch());
  await reached.promise;
  assert.deepEqual(
    harness.commands.map((command) => command.type),
    ["launch"],
  );
  gate.reject(new Error("caller gate closed"));
  await assert.rejects(start, {
    code: "PROCESS_BOOTSTRAP_FAILED",
  });
  assert.deepEqual(
    harness.commands.map((command) => command.type),
    ["launch", "terminate"],
  );
});
