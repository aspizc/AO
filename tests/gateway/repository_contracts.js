import assert from "node:assert/strict";
import * as orchestrationRepo from "../../gateway/src/core/repositories/orchestration_repo.js";
import * as taskRepo from "../../gateway/src/core/repositories/task_repo.js";
import * as sessionRepo from "../../gateway/src/core/repositories/session_repo.js";
import * as artifactRepo from "../../gateway/src/core/repositories/artifact_repo.js";
import * as messageRepo from "../../gateway/src/core/repositories/message_repo.js";
import * as policyDecisionRepo from "../../gateway/src/core/repositories/policy_decision_repo.js";
import * as approvalRepo from "../../gateway/src/core/repositories/approval_repo.js";

export function installRepositoryContractTests({ test, name, fresh }) {
  test(`${name}: create and read repository aggregate`, () => {
    fresh();
    createTrace();

    taskRepo.createTask({
      taskId: "task-1",
      traceId: "trace-1",
      assignedAgent: "gemini-cli",
      assignedRole: "restricted-coder",
      repo: "cvision",
      status: "running",
      createdAt: "2026-01-01T00:00:01.000Z",
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
      startedAt: "2026-01-01T00:00:02.000Z",
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
      createdAt: "2026-01-01T00:00:03.000Z",
    });
    messageRepo.createMessage({
      messageId: "message-1",
      traceId: "trace-1",
      fromId: "orchestrator",
      toId: "session-1",
      body: "status?",
      createdAt: "2026-01-01T00:00:04.000Z",
    });
    approvalRepo.createApproval({
      approvalId: "approval-1",
      traceId: "trace-1",
      requestedBy: "orchestrator",
      action: "git.push",
      status: "pending",
      createdAt: "2026-01-01T00:00:05.000Z",
      decidedAt: null,
      decidedBy: null,
      payload: "{}",
    });

    assert.equal(orchestrationRepo.getOrchestrationByTraceId("trace-1").goal, "test goal");
    assert.equal(taskRepo.getTaskById("task-1").assigned_role, "restricted-coder");
    assert.equal(sessionRepo.listSessionsByTrace("trace-1")[0].tmux_target, "ag-1");
    assert.equal(artifactRepo.listArtifactsByTrace("trace-1")[0].path, "workspace/artifacts/a.diff");
    assert.equal(messageRepo.getMessageScopedToTrace("message-1", "trace-1").body, "status?");
    assert.equal(approvalRepo.listPendingApprovals("trace-1")[0].action, "git.push");
  });

  test(`${name}: status updates report one changed row`, () => {
    fresh();
    createTrace();

    taskRepo.createTask({
      taskId: "task-1",
      traceId: "trace-1",
      assignedAgent: "gemini-cli",
      assignedRole: "restricted-coder",
      repo: null,
      status: "pending",
      createdAt: "2026-01-01T00:00:01.000Z",
      closedAt: null,
    });

    orchestrationRepo.setOrchestrationStatus("orch-1", "completed");
    taskRepo.setTaskStatus("task-1", "completed", "2026-01-01T00:01:00.000Z");

    assert.equal(orchestrationRepo.getOrchestrationById("orch-1").status, "completed");
    assert.equal(taskRepo.getTaskById("task-1").closed_at, "2026-01-01T00:01:00.000Z");
  });

  test(`${name}: foreign key violation fails`, () => {
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

  test(`${name}: policy decisions are append only`, () => {
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
