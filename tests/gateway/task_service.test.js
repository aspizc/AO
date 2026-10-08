import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configureAudit, query as queryAudit, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import * as taskRepo from "../../gateway/src/core/repositories/task_repo.js";
import * as orchestrationService from "../../gateway/src/services/orchestration_service.js";
import { assignTask, PolicyDeniedError } from "../../gateway/src/services/task_service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const registries = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });

function fresh() {
  resetState();
  resetAudit();
  initState({ stateDb: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "task-state-")), "state.db") });
  configureAudit({ auditLog: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "task-audit-")), "audit.jsonl") });
}

function createTrace() {
  return orchestrationService.createOrchestration({
    callerAgent: "claude-code",
    callerRole: "orchestrator",
    goal: "assign work",
  }).traceId;
}

for (const action of ["code.read", "code.write"]) {
  test(`new task persists authoritative ${action} instead of inferring authority from its role`, () => {
    fresh();
    const task = assignTask({
      caller: { agent: "claude-code", role: "orchestrator" },
      target: { agent: "codex", role: "restricted-coder", action },
      repo: "cvision",
      traceId: createTrace(),
      registries,
    });
    assert.equal(taskRepo.getTaskById(task.taskId).target_action, action,
      "recovery must compare the server's resolved action with an authoritative business row");
  });
}

test("ordinary PostgreSQL task creation does not require the SQLite recovery column", () => {
  resetState();
  const statements = [];
  try {
    initState({
      env: { AGENTS_DB_URL: "postgres://fixture" },
      postgresExecutor(sql) { statements.push(sql); return []; },
    });
    taskRepo.createTask({
      taskId: "ts-postgres", traceId: "tr-postgres", assignedAgent: "codex",
      assignedRole: "coder", targetAction: "code.write", repo: "app",
      status: "pending", createdAt: "2026-10-07T00:00:00.000Z", closedAt: null,
    });
    const insert = statements.find((sql) => /^INSERT INTO tasks/.test(sql));
    assert.ok(insert, "ordinary task insertion must still reach the PostgreSQL adapter");
    assert.doesNotMatch(insert, /target_action|code\.write/);
  } finally { resetState(); }
});

test("orchestrator can assign restricted coder to Gemini and emits policy audit", async () => {
  fresh();
  const traceId = createTrace();

  const task = assignTask({
    caller: { agent: "claude-code", role: "orchestrator" },
    target: { role: "restricted-coder", action: "code.write" },
    repo: "cvision",
    brief: "Update X",
    traceId,
    registries,
  });

  assert.match(task.taskId, /^ts-/);
  assert.equal(task.assignedAgent, "gemini-cli");
  assert.equal(task.assignedRole, "restricted-coder");
  assert.equal(task.status, "pending");
  assert.equal(taskRepo.listTasksByTrace(traceId).length, 1);

  const events = await queryAudit({ traceId });
  assert.deepEqual(
    events.map((event) => event.type),
    ["ORCHESTRATION_CREATED", "POLICY_DECIDED", "POLICY_DECIDED", "TASK_CREATED"],
  );
  assert.equal(events[1].scope, "caller");
  assert.equal(events[1].decision, "allow");
  assert.equal(events[2].scope, "target");
  assert.equal(events[2].decision, "allow");
  assert.equal(events[3].brief, "Update X");
});

test("orchestrator can explicitly assign restricted coder to Codex", async () => {
  fresh();
  const traceId = createTrace();

  const task = assignTask({
    caller: { agent: "claude-code", role: "orchestrator" },
    target: { agent: "codex", role: "restricted-coder", action: "code.write" },
    repo: "cvision",
    brief: "Update restricted code",
    traceId,
    registries,
  });

  assert.match(task.taskId, /^ts-/);
  assert.equal(task.assignedAgent, "codex");
  assert.equal(task.assignedRole, "restricted-coder");
  assert.equal(task.status, "pending");
});

test("non-orchestrator callers cannot assign tasks", () => {
  fresh();
  const traceId = createTrace();

  assert.throws(
    () =>
      assignTask({
        caller: { agent: "claude-code", role: "coder" },
        target: { agent: "gemini-cli", role: "coder", action: "code.read" },
        repo: "sample-apps",
        brief: "Read code",
        traceId,
        registries,
      }),
    PolicyDeniedError,
  );
  assert.equal(taskRepo.listTasksByTrace(traceId).length, 0);
});

test("agent is selected automatically when omitted", () => {
  fresh();
  const traceId = createTrace();

  const task = assignTask({
    caller: { agent: "claude-code", role: "orchestrator" },
    target: { role: "coder", action: "code.write" },
    repo: "sample-apps",
    brief: "Update public sample",
    traceId,
    registries,
  });

  assert.ok(["claude-code", "gemini-cli"].includes(task.assignedAgent));
});

test("invalid target role for target agent is denied before persistence", () => {
  fresh();
  const traceId = createTrace();

  assert.throws(
    () =>
      assignTask({
        caller: { agent: "claude-code", role: "orchestrator" },
        target: { agent: "claude-code", role: "restricted-coder", action: "code.write" },
        repo: "cvision",
        brief: "Write restricted code",
        traceId,
        registries,
      }),
    PolicyDeniedError,
  );
  assert.equal(taskRepo.listTasksByTrace(traceId).length, 0);
});

test("unknown trace ID is rejected before policy or persistence", async () => {
  fresh();

  assert.throws(
    () =>
      assignTask({
        caller: { agent: "claude-code", role: "orchestrator" },
        target: { agent: "gemini-cli", role: "restricted-coder", action: "code.write" },
        repo: "cvision",
        brief: "Update X",
        traceId: "tr-missing",
        registries,
      }),
    { code: "ORCHESTRATION_NOT_FOUND" },
  );
  assert.deepEqual(await queryAudit({ traceId: "tr-missing" }), []);
});
