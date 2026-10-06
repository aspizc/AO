import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import * as orchestrationRepo from "../../gateway/src/core/repositories/orchestration_repo.js";
import * as taskRepo from "../../gateway/src/core/repositories/task_repo.js";
import {
  _resetForTests,
  initState,
} from "../../gateway/src/core/state.js";

const NOW = "2026-07-27T10:00:00.000Z";
const SERVICE_PATH = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "gateway",
  "src",
  "services",
  "lifecycle_service.js",
);

async function serviceModule() {
  return import("../../gateway/src/services/lifecycle_service.js");
}

function fresh(t) {
  _resetForTests();
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "lifecycle-core2-service-"),
  );
  initState({ stateDb: path.join(directory, "state.db"), env: {} });
  orchestrationRepo.createOrchestration({
    sessionId: "orchestration-1",
    traceId: "trace-1",
    callerAgent: "codex",
    callerRole: "orchestrator",
    status: "active",
    goal: "stable lifecycle requests",
    createdAt: NOW,
  });
  taskRepo.createTask({
    taskId: "task-1",
    traceId: "trace-1",
    assignedAgent: "codex",
    assignedRole: "coder",
    repo: "agents-orchestrator",
    status: "pending",
    createdAt: NOW,
    closedAt: null,
  });
  t.after(() => {
    _resetForTests();
    fs.rmSync(directory, { recursive: true, force: true });
  });
}

test("the action-specific lifecycle port requires a caller-stable idempotency key", async (t) => {
  fresh(t);
  const { createLifecycleService } = await serviceModule();
  const service = createLifecycleService({ clock: () => NOW });

  assert.throws(
    () =>
      service.reserveTaskStart({
        taskId: "task-1",
        traceId: "trace-1",
        evidence: { source: "missing-key" },
      }),
    {
      code: "LIFECYCLE_IDEMPOTENCY_REQUIRED",
      message: "lifecycle idempotency key required",
    },
  );

  const source = fs.readFileSync(SERVICE_PATH, "utf8");
  assert.doesNotMatch(source, /\brandomUUID\b/);
  assert.doesNotMatch(source, /\bnewIdempotencyKey\b/);
});

test("a lost response retry through the action port returns the original transition", async (t) => {
  fresh(t);
  const { createLifecycleService } = await serviceModule();
  const times = [
    "2026-07-27T10:00:00.000Z",
    "2026-07-27T10:00:05.000Z",
  ];
  const service = createLifecycleService({ clock: () => times.shift() });
  const request = {
    taskId: "task-1",
    traceId: "trace-1",
    idempotencyKey: "request-task-start-1",
    evidence: { source: "public-splice-ready" },
  };

  const original = service.reserveTaskStart(request);
  const retryAfterLostResponse = service.reserveTaskStart(request);

  assert.equal(original.idempotent, false);
  assert.equal(retryAfterLostResponse.idempotent, true);
  assert.deepEqual(retryAfterLostResponse.state, original.state);
  assert.equal(
    retryAfterLostResponse.transition.idempotency_key,
    "request-task-start-1",
  );
  assert.equal(
    retryAfterLostResponse.transition.occurred_at,
    "2026-07-27T10:00:00.000Z",
  );
});

test("the action port rejects caller state and revalidates trace binding", async (t) => {
  fresh(t);
  const { createLifecycleService } = await serviceModule();
  const service = createLifecycleService({ clock: () => NOW });

  assert.throws(
    () =>
      service.completeTask({
        taskId: "task-1",
        traceId: "trace-1",
        idempotencyKey: "request-caller-state",
        status: "completed",
      }),
    {
      code: "LIFECYCLE_CALLER_STATE_DENIED",
      message: "caller-supplied lifecycle state denied",
    },
  );
  assert.throws(
    () =>
      service.reserveTaskStart({
        taskId: "task-1",
        traceId: "trace-other",
        idempotencyKey: "request-cross-trace",
        evidence: {},
      }),
    {
      code: "LIFECYCLE_TARGET_MISMATCH",
      message: "lifecycle target mismatch",
    },
  );
});

test("the CORE port exposes state actions but no caller-facing cancellation service", async (t) => {
  fresh(t);
  const { createLifecycleService } = await serviceModule();
  const service = createLifecycleService({ clock: () => NOW });

  assert.equal(Object.isFrozen(service), true);
  assert.deepEqual(
    Object.keys(service).filter((name) => /cancel/i.test(name)),
    [],
  );
  for (const name of [
    "pauseOrchestration",
    "resumeOrchestration",
    "completeOrchestration",
    "reserveTaskStart",
    "markTaskRunning",
    "completeTask",
    "failTask",
    "reserveSession",
    "markSessionRunning",
    "closeSession",
    "failSession",
  ]) {
    assert.equal(typeof service[name], "function", name);
  }
});

test("SESSION_RESERVE also converges through the stable action-port request identity", async (t) => {
  fresh(t);
  const { createLifecycleService } = await serviceModule();
  const service = createLifecycleService({ clock: () => NOW });
  const request = {
    sessionId: "session-1",
    taskId: "task-1",
    traceId: "trace-1",
    agent: "codex",
    role: "coder",
    idempotencyKey: "request-session-reserve-1",
    evidence: { source: "before-launch" },
  };

  const first = service.reserveSession(request);
  const retry = service.reserveSession(request);

  assert.equal(first.state.status, "starting");
  assert.equal(first.state.version, 0);
  assert.equal(retry.idempotent, true);
  assert.deepEqual(retry.state, first.state);
});
