import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { PassThrough, Writable } from "node:stream";

import {
  PROCESS_SUPERVISOR_PROTOCOL,
  createProcessSupervisor,
} from "../../gateway/src/adapters/process_supervisor.js";

const SUPERVISOR = Object.freeze({
  pid: 5100,
  startToken: "supervisor-start",
  pgid: 5100,
  sid: 5100,
});
const REAPER = Object.freeze({
  pid: 5101,
  startToken: "reaper-start",
  pgid: 5100,
  sid: 5100,
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

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function emitTranscript(child, event) {
  child.transcript.write(`${JSON.stringify(event)}\n`);
}

function createScheduler() {
  const pending = [];
  return {
    pending,
    setTimeout(callback) {
      const entry = { callback, cleared: false };
      pending.push(entry);
      return entry;
    },
    clearTimeout(entry) {
      entry.cleared = true;
    },
    run() {
      const entry = pending.find((candidate) => !candidate.cleared);
      assert.ok(entry, "deadline timer was not armed");
      entry.cleared = true;
      entry.callback();
    },
  };
}

function createHarness({ onRelease } = {}) {
  const child = new FakeChild();
  const commands = [];
  let input = "";
  let identitiesLive = true;
  let signalCount = 0;
  let terminationCount = 0;

  child.stdin.setEncoding("utf8");
  child.stdin.on("data", (chunk) => {
    input += chunk;
    while (input.includes("\n")) {
      const newline = input.indexOf("\n");
      const command = JSON.parse(input.slice(0, newline));
      input = input.slice(newline + 1);
      commands.push(command);
      if (command.type === "launch") {
        queueMicrotask(() => {
          emitTranscript(child, {
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
      } else if (command.type === "release") {
        onRelease?.(child);
      } else if (command.type === "terminate") {
        terminationCount += 1;
        queueMicrotask(() => {
          emitTranscript(child, {
            type: "terminal",
            protocol: PROCESS_SUPERVISOR_PROTOCOL,
            reason: command.reason,
          });
          child.stdout.end();
          child.stderr.end();
          identitiesLive = false;
          child.emit("exit", 0, null);
          child.transcript.end();
        });
      }
    }
  });

  return {
    child,
    commands,
    get terminationCount() {
      return terminationCount;
    },
    get signalCount() {
      return signalCount;
    },
    processOps: {
      spawn() {
        return child;
      },
      readIdentity(pid) {
        if (!identitiesLive) return null;
        if (pid === SUPERVISOR.pid) return SUPERVISOR;
        if (pid === REAPER.pid) return REAPER;
        return null;
      },
      signalGroup() {
        signalCount += 1;
      },
    },
  };
}

function launchRequest(overrides = {}) {
  return {
    runtimePlan: {
      executable: "/configured/python-wrapper",
      args: [],
      env: { LANG: "C" },
    },
    argv: ["/provider/agent"],
    env: {},
    cwd: "/safe/repository",
    sessionId: "event-race-fixture",
    mode: "persistent",
    ...overrides,
  };
}

function listenerCounts(stream) {
  return Object.fromEntries(
    ["close", "data", "drain", "end", "error"].map((event) => [
      event,
      stream.listenerCount(event),
    ]),
  );
}

async function expectFailure(completion, code) {
  const observed = await completion.then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  assert.equal(observed.error?.code, code);
}

function waitForCheckPhase() {
  return new Promise((resolve) => setImmediate(resolve));
}

async function expectSingleFailureAtBoundary(completion, code) {
  let settlements = 0;
  let observed;
  completion.then(
    (value) => ({ value }),
    (error) => ({ error }),
  ).then((value) => {
    settlements += 1;
    observed = value;
  });

  await waitForCheckPhase();
  assert.equal(settlements, 1, "completion did not settle at the check boundary");
  assert.equal(observed.error?.code, code);
  await waitForCheckPhase();
  assert.equal(settlements, 1, "completion settled more than once");
}

async function runSimultaneousDestinationErrors({ reversed = false } = {}) {
  const stdout = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const stderr = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const harness = createHarness();
  const execution = await createProcessSupervisor({
    processOps: harness.processOps,
    randomBytes: () => Buffer.alloc(32, 21),
    platform: "linux",
  }).start(launchRequest({ stdout, stderr }));

  if (reversed) {
    stderr.emit("error", new Error("first private destination failure"));
    stdout.emit("error", new Error("racing private destination failure"));
    process.nextTick(() => {
      stderr.emit("error", new Error("nextTick destination duplicate"));
    });
    queueMicrotask(() => {
      stdout.emit("error", new Error("microtask destination duplicate"));
    });
  } else {
    stdout.emit("error", new Error("first private destination failure"));
    stderr.emit("error", new Error("racing private destination failure"));
    stdout.emit("error", new Error("duplicate private destination failure"));
  }

  await expectFailure(execution.completion, "PROCESS_STREAM_FAILED");
  assert.equal(harness.terminationCount, 1);
  assert.equal(harness.signalCount, 0);
  assert.deepEqual(listenerCounts(stdout), {
    close: 0,
    data: 0,
    drain: 0,
    end: 0,
    error: 0,
  });
  assert.deepEqual(listenerCounts(stderr), {
    close: 0,
    data: 0,
    drain: 0,
    end: 0,
    error: 0,
  });
  assert.equal(harness.child.stdin.listenerCount("error"), 0);
  assert.equal(harness.child.stdin.listenerCount("close"), 0);
}

async function primeTerminalChildAndOutputs(harness) {
  emitTranscript(harness.child, {
    type: "terminal",
    protocol: PROCESS_SUPERVISOR_PROTOCOL,
    reason: "exited",
    exitCode: 0,
    signal: null,
  });
  harness.child.stdout.end();
  harness.child.stderr.end();
  harness.child.emit("exit", 0, null);
  await waitForCheckPhase();
}

async function runTranscriptErrors(order) {
  const harness = createHarness();
  const execution = await createProcessSupervisor({
    processOps: harness.processOps,
    randomBytes: () => Buffer.alloc(32, 22),
    platform: "linux",
  }).start(launchRequest());
  harness.child.stdout.end();
  harness.child.stderr.end();

  if (order === "error-error") {
    harness.child.transcript.emit(
      "error",
      new Error("first private transcript failure"),
    );
  } else {
    harness.child.transcript.emit("close");
    harness.child.transcript.emit(
      "error",
      new Error("first post-close transcript failure"),
    );
  }
  harness.child.transcript.emit(
    "error",
    new Error("duplicate private transcript failure"),
  );

  await expectFailure(execution.completion, "PROCESS_BOOTSTRAP_FAILED");
  assert.equal(harness.terminationCount, 1);
  assert.equal(harness.signalCount, 0);
  assert.deepEqual(listenerCounts(harness.child.transcript), {
    close: 0,
    data: 0,
    drain: 0,
    end: 0,
    error: 0,
  });
  assert.equal(harness.child.stdin.listenerCount("error"), 0);
  assert.equal(harness.child.stdin.listenerCount("close"), 0);
}

async function runDeferredTranscriptErrors(order) {
  const harness = createHarness();
  const execution = await createProcessSupervisor({
    processOps: harness.processOps,
    randomBytes: () => Buffer.alloc(32, 24),
    platform: "linux",
  }).start(launchRequest());
  await primeTerminalChildAndOutputs(harness);

  if (order === "error-nexttick-error") {
    harness.child.transcript.emit(
      "error",
      new Error("first private transcript failure"),
    );
    process.nextTick(() => {
      harness.child.transcript.emit(
        "error",
        new Error("nextTick private transcript duplicate"),
      );
    });
  } else {
    harness.child.transcript.emit("close");
    process.nextTick(() => {
      harness.child.transcript.emit(
        "error",
        new Error("first nextTick post-close transcript failure"),
      );
      process.nextTick(() => {
        harness.child.transcript.emit(
          "error",
          new Error("second nextTick post-close transcript failure"),
        );
      });
    });
  }

  await expectSingleFailureAtBoundary(
    execution.completion,
    "PROCESS_BOOTSTRAP_FAILED",
  );
  assert.equal(harness.terminationCount, 0);
  assert.equal(harness.signalCount, 0);
  assert.deepEqual(listenerCounts(harness.child.transcript), {
    close: 0,
    data: 0,
    drain: 0,
    end: 0,
    error: 0,
  });
  assert.equal(harness.child.stdin.listenerCount("error"), 0);
  assert.equal(harness.child.stdin.listenerCount("close"), 0);
}

async function runBlockedSinkLateError(cause, { microtask = false } = {}) {
  let releaseWrite;
  const sink = new Writable({
    autoDestroy: false,
    write(_chunk, _encoding, callback) {
      releaseWrite = callback;
    },
  });
  const scheduler = createScheduler();
  const harness = createHarness({
    onRelease(child) {
      child.stdout.write("provider-output");
    },
  });
  const execution = await createProcessSupervisor({
    processOps: harness.processOps,
    clock: { now: () => 1_000 },
    scheduler,
    randomBytes: () => Buffer.alloc(32, 23),
    platform: "linux",
  }).start(launchRequest(
    cause === "deadline"
      ? {
        mode: "one-shot",
        deadlineAt: 2_000,
        stdout: sink,
      }
      : { stdout: sink },
  ));
  assert.equal(typeof releaseWrite, "function");

  if (cause === "deadline") {
    scheduler.run();
  } else {
    void execution.cancel();
  }
  assert.deepEqual(
    await execution.completion,
    { status: cause === "deadline" ? "timed_out" : "cancelled" },
  );
  assert.equal(harness.terminationCount, 1);
  assert.equal(harness.signalCount, 0);
  assert.equal(sink.destroyed, false);
  assert.equal(sink.writableEnded, false);
  assert.equal(sink.listenerCount("error"), 0);
  assert.equal(sink.listenerCount("close"), 0);
  assert.equal(harness.child.stdin.listenerCount("error"), 0);
  assert.equal(harness.child.stdin.listenerCount("close"), 0);

  releaseWrite(new Error("late private write failure"));
  if (microtask) {
    assert.equal(sink.listenerCount("error"), 1);
    queueMicrotask(() => {
      sink.emit("error", new Error("microtask late private write duplicate"));
    });
  } else {
    sink.emit("error", new Error("duplicate late private write failure"));
  }
  await waitForCheckPhase();
  assert.equal(sink.destroyed, false);
  assert.equal(sink.writableEnded, false);
  assert.equal(sink.listenerCount("error"), 0);
  assert.equal(sink.listenerCount("close"), 0);
}

const scenario = process.argv[2];
switch (scenario) {
  case "simultaneous-destination-errors":
    await runSimultaneousDestinationErrors();
    break;
  case "reversed-destination-errors":
    await runSimultaneousDestinationErrors({ reversed: true });
    break;
  case "transcript-error-error":
    await runTranscriptErrors("error-error");
    break;
  case "transcript-close-error-error":
    await runTranscriptErrors("close-error-error");
    break;
  case "transcript-error-nexttick-error":
    await runDeferredTranscriptErrors("error-nexttick-error");
    break;
  case "transcript-close-nexttick-error-nexttick-error":
    await runDeferredTranscriptErrors("close-nexttick-error-nexttick-error");
    break;
  case "blocked-sink-late-error":
    await runBlockedSinkLateError("deadline");
    break;
  case "blocked-sink-cancel-late-error":
    await runBlockedSinkLateError("cancel");
    break;
  case "blocked-sink-late-microtask-error":
    await runBlockedSinkLateError("deadline", { microtask: true });
    break;
  case "blocked-sink-cancel-late-microtask-error":
    await runBlockedSinkLateError("cancel", { microtask: true });
    break;
  default:
    throw new Error("unknown process supervisor event-race fixture scenario");
}

process.stdout.write(`${JSON.stringify({ scenario, ok: true })}\n`);
