import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { configureAudit, query as queryAudit, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import * as artifactRepo from "../../gateway/src/core/repositories/artifact_repo.js";
import * as taskRepo from "../../gateway/src/core/repositories/task_repo.js";
import * as svc from "../../gateway/src/services/orchestration_service.js";

function fresh() {
  resetState();
  resetAudit();
  initState({ stateDb: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "orch-state-")), "state.db") });
  configureAudit({ auditLog: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "orch-audit-")), "audit.jsonl") });
}

test("create persists orchestration with trace ID and emits audit event", async () => {
  fresh();

  const created = svc.createOrchestration({
    callerAgent: "claude-code",
    callerRole: "orchestrator",
    goal: "Refactor module X",
    prefix: "Refactor module X",
  });

  assert.match(created.traceId, /^tr-refactor-module-x-/);
  assert.match(created.sessionId, /^os-/);
  assert.equal(created.status, "active");

  const view = svc.viewOrchestration({ traceId: created.traceId });
  assert.equal(view.session.session_id, created.sessionId);
  assert.equal(view.session.goal, "Refactor module X");
  assert.deepEqual(view.tasks, []);
  assert.deepEqual(view.artifacts, []);

  const events = await queryAudit({ traceId: created.traceId });
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "ORCHESTRATION_CREATED");
  assert.equal(events[0].sessionId, created.sessionId);
});

test("non-orchestrator roles cannot create orchestrations", () => {
  fresh();

  assert.throws(
    () => svc.createOrchestration({ callerAgent: "gemini-cli", callerRole: "coder" }),
    { code: "ROLE_FORBIDDEN" },
  );
});

test("view aggregates child tasks and artifacts", () => {
  fresh();
  const created = svc.createOrchestration({ callerAgent: "claude-code", callerRole: "orchestrator" });

  taskRepo.createTask({
    taskId: "task-1",
    traceId: created.traceId,
    assignedAgent: "gemini-cli",
    assignedRole: "restricted-coder",
    repo: "cvision",
    status: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
  });
  artifactRepo.createArtifact({
    artifactId: "artifact-1",
    traceId: created.traceId,
    kind: "raw_diff",
    classification: "restricted",
    producedBy: "task-1",
    path: "workspace/artifacts/a.diff",
    sanitizedFrom: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  });

  const view = svc.viewOrchestration({ traceId: created.traceId });

  assert.equal(view.tasks.length, 1);
  assert.equal(view.tasks[0].task_id, "task-1");
  assert.equal(view.artifacts.length, 1);
  assert.equal(view.artifacts[0].artifact_id, "artifact-1");
});

test("pause and resume update status and audit", async () => {
  fresh();
  const created = svc.createOrchestration({ callerAgent: "claude-code", callerRole: "orchestrator" });

  const paused = svc.pauseOrchestration({ traceId: created.traceId });
  assert.equal(paused.status, "paused");
  assert.equal(svc.viewOrchestration({ traceId: created.traceId }).session.status, "paused");

  const resumed = svc.resumeOrchestration({ traceId: created.traceId });
  assert.equal(resumed.status, "active");
  assert.equal(svc.viewOrchestration({ traceId: created.traceId }).session.status, "active");

  const events = await queryAudit({ traceId: created.traceId });
  assert.deepEqual(
    events.map((event) => event.type),
    ["ORCHESTRATION_CREATED", "ORCHESTRATION_PAUSED", "ORCHESTRATION_RESUMED"],
  );
});

test("cancel requires a lifecycle outcome while complete updates status and audit", async () => {
  fresh();
  const cancelled = svc.createOrchestration({ callerAgent: "claude-code", callerRole: "orchestrator" });
  const completed = svc.createOrchestration({ callerAgent: "claude-code", callerRole: "orchestrator" });

  assert.throws(
    () => svc.cancelOrchestration({ traceId: cancelled.traceId }),
    { code: "LIFECYCLE_OUTCOME_REQUIRED" },
  );
  assert.equal(svc.completeOrchestration({ traceId: completed.traceId }).status, "completed");

  assert.equal(svc.viewOrchestration({ traceId: cancelled.traceId }).session.status, "active");
  assert.equal(svc.viewOrchestration({ traceId: completed.traceId }).session.status, "completed");

  const cancelEvents = await queryAudit({ traceId: cancelled.traceId });
  assert.deepEqual(
    cancelEvents.map((event) => event.type),
    ["ORCHESTRATION_CREATED"],
  );

  const completeEvents = await queryAudit({ traceId: completed.traceId });
  assert.deepEqual(
    completeEvents.map((event) => event.type),
    ["ORCHESTRATION_CREATED", "ORCHESTRATION_COMPLETED"],
  );
});

test("status changes reject unknown trace IDs", () => {
  fresh();

  assert.throws(() => svc.pauseOrchestration({ traceId: "tr-missing" }), { code: "ORCHESTRATION_NOT_FOUND" });
});
