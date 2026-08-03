import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import * as orchestrationRepo from "../../gateway/src/core/repositories/orchestration_repo.js";
import * as sessionRepo from "../../gateway/src/core/repositories/session_repo.js";
import * as taskRepo from "../../gateway/src/core/repositories/task_repo.js";
import { buildSessionTools } from "../../gateway/src/tools/session.js";
import { getToolRegistry } from "../../gateway/src/tools/index.js";

function fresh() {
  resetState();
  initState({ stateDb: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "session-tools-")), "state.db") });
  orchestrationRepo.createOrchestration({
    sessionId: "orch-1",
    traceId: "trace-1",
    callerAgent: "claude-code",
    callerRole: "orchestrator",
    status: "active",
    goal: "test",
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  taskRepo.createTask({
    taskId: "task-1",
    traceId: "trace-1",
    assignedAgent: "gemini-cli",
    assignedRole: "coder",
    repo: null,
    status: "running",
    createdAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
  });
}

function sessionTools() {
  return Object.fromEntries(buildSessionTools().map((tool) => [tool.name, tool]));
}

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

test("attach info returns tmux target and attach command", async () => {
  fresh();
  sessionRepo.createSession({
    sessionId: "session-1",
    taskId: "task-1",
    traceId: "trace-1",
    agent: "gemini-cli",
    role: "coder",
    tmuxTarget: "ag-tr1-gemini-coder",
    status: "running",
    startedAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
  });

  const result = parseToolResult(await sessionTools()["session.attach_info"].handler({ sessionId: "session-1" }));

  assert.equal(result.sessionId, "session-1");
  assert.equal(result.tmuxTarget, "ag-tr1-gemini-coder");
  assert.equal(result.attachCommand, "tmux attach -t ag-tr1-gemini-coder");
});

test("unknown session returns not found", async () => {
  fresh();

  const result = parseToolResult(await sessionTools()["session.attach_info"].handler({ sessionId: "missing" }));

  assert.deepEqual(result, {
    error: "NOT_FOUND",
    code: "NOT_FOUND",
    message: "resource not found",
  });
});

test("non supervised session returns not supervised", async () => {
  fresh();
  sessionRepo.createSession({
    sessionId: "session-1",
    taskId: "task-1",
    traceId: "trace-1",
    agent: "gemini-cli",
    role: "coder",
    tmuxTarget: null,
    status: "closed",
    startedAt: "2026-01-01T00:00:00.000Z",
    closedAt: "2026-01-01T00:01:00.000Z",
  });

  const result = parseToolResult(await sessionTools()["session.attach_info"].handler({ sessionId: "session-1" }));

  assert.deepEqual(result, {
    error: "NOT_SUPERVISED",
    code: "NOT_SUPERVISED",
    message: "session is not supervised",
  });
});

test("tool registry exposes session attach info", () => {
  const names = getToolRegistry().map((tool) => tool.name);

  assert.ok(names.includes("session.attach_info"));
});
