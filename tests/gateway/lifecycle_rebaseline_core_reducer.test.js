import assert from "node:assert/strict";
import { test } from "node:test";

const NOW = "2026-07-27T08:00:00.000Z";

async function lifecycleModule() {
  return import("../../gateway/src/core/lifecycle.js");
}

function state(entityType, status, version = 0, overrides = {}) {
  return Object.freeze({
    entityType,
    entityId: `${entityType}-1`,
    traceId: "trace-1",
    taskId: entityType === "orchestration" ? null : "task-1",
    status,
    version,
    closedAt: null,
    ...overrides,
  });
}

function commandInput(entityType, expectedVersion, overrides = {}) {
  return {
    entityType,
    entityId: `${entityType}-1`,
    traceId: "trace-1",
    taskId: entityType === "orchestration" ? null : "task-1",
    expectedVersion,
    idempotencyKey: `idem-${entityType}-${expectedVersion}`,
    occurredAt: NOW,
    evidence: { source: "rebaseline-red" },
    ...overrides,
  };
}

test("the lifecycle reducer implements the complete server-owned transition table", async () => {
  const {
    LifecycleAction,
    issueLifecycleCommand,
    reduceLifecycle,
  } = await lifecycleModule();
  const cases = [
    [LifecycleAction.ORCHESTRATION_PAUSE, state("orchestration", "active"), "paused"],
    [LifecycleAction.ORCHESTRATION_RESUME, state("orchestration", "paused"), "active"],
    [LifecycleAction.ORCHESTRATION_COMPLETE, state("orchestration", "active"), "completed"],
    [LifecycleAction.ORCHESTRATION_CANCEL, state("orchestration", "paused"), "cancelled"],
    [LifecycleAction.TASK_RESERVE_START, state("task", "pending"), "starting"],
    [LifecycleAction.TASK_MARK_RUNNING, state("task", "starting"), "running"],
    [LifecycleAction.TASK_COMPLETE, state("task", "running"), "completed"],
    [LifecycleAction.TASK_FAIL, state("task", "starting"), "failed"],
    [LifecycleAction.TASK_CANCEL, state("task", "pending"), "cancelled"],
    [LifecycleAction.SESSION_MARK_RUNNING, state("session", "starting"), "running"],
    [LifecycleAction.SESSION_CLOSE, state("session", "running"), "closed"],
    [LifecycleAction.SESSION_FAIL, state("session", "starting"), "error"],
  ];

  for (const [action, current, expectedStatus] of cases) {
    const issued = issueLifecycleCommand(
      action,
      commandInput(current.entityType, current.version, {
        entityId: current.entityId,
        idempotencyKey: `idem-${action}`,
      }),
    );
    const next = reduceLifecycle(current, issued);

    assert.equal(next.status, expectedStatus, action);
    assert.equal(next.version, current.version + 1, action);
    assert.equal(Object.isFrozen(next), true, action);
  }
});

test("SESSION_RESERVE is the only creation transition and starts at version zero", async () => {
  const {
    LifecycleAction,
    issueLifecycleCommand,
    reduceLifecycle,
  } = await lifecycleModule();
  const reservation = issueLifecycleCommand(
    LifecycleAction.SESSION_RESERVE,
    commandInput("session", null, {
      idempotencyKey: "idem-session-reserve",
    }),
  );

  assert.deepEqual(reduceLifecycle(null, reservation), {
    entityType: "session",
    entityId: "session-1",
    traceId: "trace-1",
    taskId: "task-1",
    status: "starting",
    version: 0,
    closedAt: null,
  });

  const nonCreation = issueLifecycleCommand(
    LifecycleAction.TASK_RESERVE_START,
    commandInput("task", 0),
  );
  assert.throws(
    () => reduceLifecycle(null, nonCreation),
    { code: "LIFECYCLE_INVALID_TRANSITION" },
  );
});

test("untrusted commands and caller-supplied effective state have no authority", async () => {
  const {
    LifecycleAction,
    issueLifecycleCommand,
    reduceLifecycle,
  } = await lifecycleModule();

  assert.throws(
    () =>
      reduceLifecycle(state("task", "pending"), {
        action: LifecycleAction.TASK_COMPLETE,
      }),
    { code: "LIFECYCLE_COMMAND_UNTRUSTED" },
  );
  assert.throws(
    () =>
      issueLifecycleCommand(
        LifecycleAction.TASK_COMPLETE,
        commandInput("task", 0, { status: "completed" }),
      ),
    {
      code: "LIFECYCLE_CALLER_STATE_DENIED",
      message: "caller-supplied lifecycle state denied",
    },
  );
});

test("target bindings, order, optimistic version, and terminal monotonicity fail closed", async () => {
  const {
    LifecycleAction,
    issueLifecycleCommand,
    reduceLifecycle,
  } = await lifecycleModule();

  const launchBeforeReserve = issueLifecycleCommand(
    LifecycleAction.TASK_MARK_RUNNING,
    commandInput("task", 0),
  );
  assert.throws(
    () => reduceLifecycle(state("task", "pending"), launchBeforeReserve),
    { code: "LIFECYCLE_INVALID_TRANSITION" },
  );

  const stale = issueLifecycleCommand(
    LifecycleAction.TASK_COMPLETE,
    commandInput("task", 0),
  );
  assert.throws(
    () => reduceLifecycle(state("task", "running", 2), stale),
    { code: "LIFECYCLE_VERSION_CONFLICT" },
  );

  const crossed = issueLifecycleCommand(
    LifecycleAction.SESSION_MARK_RUNNING,
    commandInput("session", 0, { traceId: "trace-other" }),
  );
  assert.throws(
    () => reduceLifecycle(state("session", "starting"), crossed),
    { code: "LIFECYCLE_TARGET_MISMATCH" },
  );

  const reopen = issueLifecycleCommand(
    LifecycleAction.TASK_RESERVE_START,
    commandInput("task", 4, { idempotencyKey: "idem-reopen" }),
  );
  assert.throws(
    () =>
      reduceLifecycle(
        state("task", "completed", 4, { closedAt: NOW }),
        reopen,
      ),
    { code: "LIFECYCLE_TERMINAL" },
  );
});

test("one safe integer version domain is monotonic at its exact maximum", async () => {
  const {
    LifecycleAction,
    MAX_LIFECYCLE_VERSION,
    issueLifecycleCommand,
    reduceLifecycle,
  } = await lifecycleModule();
  assert.equal(MAX_LIFECYCLE_VERSION, Number.MAX_SAFE_INTEGER);

  const last = issueLifecycleCommand(
    LifecycleAction.TASK_COMPLETE,
    commandInput("task", MAX_LIFECYCLE_VERSION - 1, {
      idempotencyKey: "idem-last-version",
    }),
  );
  const terminal = reduceLifecycle(
    state("task", "running", MAX_LIFECYCLE_VERSION - 1),
    last,
  );
  assert.equal(terminal.version, MAX_LIFECYCLE_VERSION);
  assert.ok(terminal.version > MAX_LIFECYCLE_VERSION - 1);

  const exhausted = issueLifecycleCommand(
    LifecycleAction.TASK_COMPLETE,
    commandInput("task", MAX_LIFECYCLE_VERSION, {
      idempotencyKey: "idem-exhausted-version",
    }),
  );
  assert.throws(
    () =>
      reduceLifecycle(
        state("task", "running", MAX_LIFECYCLE_VERSION),
        exhausted,
      ),
    {
      code: "LIFECYCLE_VERSION_EXHAUSTED",
      message: "lifecycle version exhausted",
    },
  );
  assert.throws(
    () =>
      issueLifecycleCommand(
        LifecycleAction.TASK_COMPLETE,
        commandInput("task", MAX_LIFECYCLE_VERSION + 1),
      ),
    { code: "LIFECYCLE_COMMAND_INVALID" },
  );
});

test("server cancellation is a state-only reducer outcome", async () => {
  const {
    LifecycleAction,
    issueLifecycleCommand,
    reduceLifecycle,
  } = await lifecycleModule();
  const cancelled = reduceLifecycle(
    state("task", "running", 2),
    issueLifecycleCommand(
      LifecycleAction.TASK_CANCEL,
      commandInput("task", 2, {
        idempotencyKey: "idem-confirmed-cancel",
        evidence: { source: "confirmed-D-outcome" },
      }),
    ),
  );

  assert.deepEqual(Object.keys(cancelled).sort(), [
    "closedAt",
    "entityId",
    "entityType",
    "status",
    "taskId",
    "traceId",
    "version",
  ]);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.closedAt, NOW);
});
