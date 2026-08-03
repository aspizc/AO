import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { initState, _resetForTests } from "../../gateway/src/core/state.js";
import * as orchestrationRepo from "../../gateway/src/core/repositories/orchestration_repo.js";
import * as taskRepo from "../../gateway/src/core/repositories/task_repo.js";
import * as sessionRepo from "../../gateway/src/core/repositories/session_repo.js";
import * as artifactRepo from "../../gateway/src/core/repositories/artifact_repo.js";
import * as messageRepo from "../../gateway/src/core/repositories/message_repo.js";
import * as policyDecisionRepo from "../../gateway/src/core/repositories/policy_decision_repo.js";
import * as approvalRepo from "../../gateway/src/core/repositories/approval_repo.js";
import { installRepositoryContractTests } from "./repository_contracts.js";

function fresh() {
  _resetForTests();
  initState({ stateDb: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "repo-test-")), "state.db"), env: {} });
}

function createTrace() {
  orchestrationRepo.createOrchestration({
    sessionId: "orch-1",
    traceId: "trace-1",
    callerAgent: "claude-code",
    callerRole: "orchestrator",
    status: "active",
    goal: "test goal",
    createdAt: "2026-01-01T00:00:00.000Z",
  });
}

test("all_repository_modules_expose_expected_create_functions", () => {
  assert.equal(typeof orchestrationRepo.createOrchestration, "function");
  assert.equal(typeof taskRepo.createTask, "function");
  assert.equal(typeof sessionRepo.createSession, "function");
  assert.equal(typeof artifactRepo.createArtifact, "function");
  assert.equal(typeof messageRepo.createMessage, "function");
  assert.equal(typeof policyDecisionRepo.insertDecision, "function");
  assert.equal(typeof approvalRepo.createApproval, "function");
});

test("create_and_get_orchestration", () => {
  fresh();
  createTrace();

  const got = orchestrationRepo.getOrchestrationByTraceId("trace-1");

  assert.equal(got.session_id, "orch-1");
  assert.equal(got.goal, "test goal");
});

test("create_task_under_trace", () => {
  fresh();
  createTrace();

  taskRepo.createTask({
    taskId: "task-1",
    traceId: "trace-1",
    assignedAgent: "gemini-cli",
    assignedRole: "restricted-coder",
    repo: "cvision",
    status: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
  });

  assert.equal(taskRepo.listTasksByTrace("trace-1").length, 1);
  assert.equal(taskRepo.getTaskById("task-1").assigned_role, "restricted-coder");
});

test("foreign_key_violation_fails", () => {
  fresh();

  assert.throws(() =>
    taskRepo.createTask({
      taskId: "task-1",
      traceId: "missing",
      assignedAgent: "gemini-cli",
      assignedRole: "restricted-coder",
      repo: null,
      status: "pending",
      createdAt: "2026-01-01T00:00:00.000Z",
      closedAt: null,
    }),
  );
});

test("create_session_artifact_message_and_approval", () => {
  fresh();
  createTrace();
  taskRepo.createTask({
    taskId: "task-1",
    traceId: "trace-1",
    assignedAgent: "gemini-cli",
    assignedRole: "restricted-coder",
    repo: "cvision",
    status: "running",
    createdAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
  });

  sessionRepo.createSession({
    sessionId: "session-1",
    taskId: "task-1",
    traceId: "trace-1",
    agent: "gemini-cli",
    role: "restricted-coder",
    tmuxTarget: "ag-1",
    status: "running",
    startedAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
  });
  artifactRepo.createArtifact({
    artifactId: "artifact-1",
    traceId: "trace-1",
    kind: "raw_diff",
    classification: "restricted",
    producedBy: "session-1",
    path: "workspace/artifacts/a.diff",
    sanitizedFrom: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  messageRepo.createMessage({
    messageId: "message-1",
    traceId: "trace-1",
    fromId: "orchestrator",
    toId: "session-1",
    body: "status?",
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  approvalRepo.createApproval({
    approvalId: "approval-1",
    traceId: "trace-1",
    requestedBy: "orchestrator",
    action: "git.push",
    status: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
    decidedAt: null,
    decidedBy: null,
    payload: "{}",
  });

  assert.equal(sessionRepo.listSessionsByTrace("trace-1").length, 1);
  assert.equal(artifactRepo.listArtifactsByTrace("trace-1").length, 1);
  assert.equal(messageRepo.listMessagesByTrace("trace-1").length, 1);
  assert.equal(approvalRepo.listApprovalsByTrace("trace-1").length, 1);
});

test("insert_policy_decision_is_append_only", () => {
  fresh();
  policyDecisionRepo.insertDecision({
    decisionId: "decision-1",
    traceId: "trace-1",
    context: "{}",
    decision: "allow",
    reasonCode: "ok",
    decidedAt: "2026-01-01T00:00:00.000Z",
  });

  assert.equal(policyDecisionRepo.listDecisionsByTrace("trace-1").length, 1);
  assert.equal(typeof policyDecisionRepo.updateDecision, "undefined");
});

installRepositoryContractTests({ test, name: "sqlite repository contract", fresh });
