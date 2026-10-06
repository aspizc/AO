import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ClaudeAdapter } from "../../gateway/src/adapters/claude_adapter.js";
import { CodexAdapter } from "../../gateway/src/adapters/codex_adapter.js";
import { GeminiAdapter } from "../../gateway/src/adapters/gemini_adapter.js";
import {
  configureAudit,
  query as queryAudit,
  _resetForTests as resetAudit,
} from "../../gateway/src/core/audit.js";
import {
  bindRequestContext,
  createRequestContext,
} from "../../gateway/src/core/request_context.js";
import { ACTION_CATALOG_VERSION } from "../../gateway/src/core/policy_types.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import * as orchestrationRepo from "../../gateway/src/core/repositories/orchestration_repo.js";
import * as taskRepo from "../../gateway/src/core/repositories/task_repo.js";
import { getDb, initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { createAgentService } from "../../gateway/src/services/agent_service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const registries = loadRegistries({ policiesDir: path.join(ROOT, "policies") });
const NOW = "2026-07-26T08:30:00.000Z";

function fixture(t) {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "execution-binding-"));
  const repositoriesRoot = path.join(workspace, "repos");
  const sampleRepository = path.join(repositoriesRoot, "sample-apps");
  const developerRepository = path.join(repositoriesRoot, "developer-tools");
  const canonicalCwd = path.join(sampleRepository, "work");
  const otherCwd = path.join(sampleRepository, "other");
  const cwdAlias = path.join(sampleRepository, "work-alias");
  fs.mkdirSync(canonicalCwd, { recursive: true });
  fs.mkdirSync(otherCwd, { recursive: true });
  fs.mkdirSync(developerRepository, { recursive: true });
  fs.symlinkSync(canonicalCwd, cwdAlias, "dir");
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });

  const counters = {
    gets: 0,
    invocations: 0,
  };
  const config = {
    dryRun: true,
    repoRoots: [repositoriesRoot],
    tmuxPrefix: "binding-test-",
  };
  const actualAdapters = new Map([
    ["claude-code", new ClaudeAdapter({ config, registries })],
    ["codex", new CodexAdapter({ config, registries })],
    ["gemini-cli", new GeminiAdapter({ config, registries })],
  ]);
  const adapters = {
    get(agentId) {
      counters.gets += 1;
      const actual = actualAdapters.get(agentId);
      if (!actual) throw new Error(`unexpected adapter ${agentId}`);
      return {
        async delegate(args) {
          counters.invocations += 1;
          return actual.delegate(args);
        },
        async spawn(args) {
          counters.invocations += 1;
          return actual.spawn(args);
        },
      };
    },
  };
  const service = createAgentService({
    adapters,
    registries,
    config: { ...config, agentTimeoutMs: 1_000 },
  });

  t.after(() => {
    resetState();
    resetAudit();
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  return {
    actualAdapters,
    canonicalCwd: fs.realpathSync(canonicalCwd),
    counters,
    cwdAlias,
    developerRepository: fs.realpathSync(developerRepository),
    otherCwd: fs.realpathSync(otherCwd),
    repositoryBindings: {
      "sample-apps": {
        root: sampleRepository,
        classification: "unrestricted",
      },
      "developer-tools": {
        root: developerRepository,
        classification: "internal",
      },
    },
    service,
  };
}

function executionBinding(value, {
  action = "agent.spawn",
  agent = "codex",
  role = "coder",
  repositoryId = "sample-apps",
  cwd = value.canonicalCwd,
  traceId = "tr-owned",
  taskId = "ts-owned",
  targetAction = "code.write",
} = {}) {
  const context = createRequestContext({
    principalId: "local-operator",
    agent: "claude-code",
    role: "orchestrator",
    audience: "agents-gateway:test",
    connectionId: `connection-${action}-${agent}-${role}-${traceId}-${taskId}`,
    capabilities: [action],
    repositoryBindings: value.repositoryBindings,
    lineage: {
      traces: [{ traceId }],
      tasks: [{
        taskId,
        traceId,
        repositoryId,
        targetAgent: agent,
        targetRole: role,
        targetAction,
      }],
    },
    issuedAt: "2026-07-26T08:00:00.000Z",
    expiresAt: "2026-07-26T09:00:00.000Z",
  });
  return bindRequestContext(context, {
    action,
    actionCatalogVersion: ACTION_CATALOG_VERSION,
    audience: "agents-gateway:test",
    connectionId: `connection-${action}-${agent}-${role}-${traceId}-${taskId}`,
    args: {
      agent,
      role,
      repo: repositoryId,
      cwd,
      traceId,
      taskId,
    },
    now: NOW,
  });
}

function serviceArgs(value, method, overrides = {}) {
  return {
    agent: "codex",
    role: "coder",
    repo: "sample-apps",
    cwd: value.canonicalCwd,
    traceId: "tr-owned",
    taskId: "ts-owned",
    ...(method === "delegate" ? { prompt: "implement the assigned task" } : {}),
    ...overrides,
  };
}

async function assertNoLaunchSideEffects(value) {
  assert.equal(value.counters.gets, 0, "adapter lookup must not run");
  assert.equal(value.counters.invocations, 0, "adapter method must not run");
  assert.equal(
    getDb().prepare("SELECT COUNT(*) AS count FROM sessions").get().count,
    0,
    "session persistence must not run",
  );
  assert.equal((await queryAudit({ type: "SESSION_STARTED" })).length, 0);
  assert.equal((await queryAudit({ type: "AGENT_MODEL_RESOLVED" })).length, 0);
}

async function assertNoPreAuthorityAudit() {
  assert.equal(
    (await queryAudit({ limit: 1_000 })).length,
    0,
    "binding denial must not audit caller-controlled lineage",
  );
}

function assertRequestContextDenied(error) {
  assert.equal(error.code, "REQUEST_CONTEXT_DENIED");
  return true;
}

for (const method of ["spawn", "delegate"]) {
  test(`agent service ${method} denies every non-matching execution-binding tuple before effects`, async (t) => {
    const cases = [
      {
        name: "control action",
        binding: (value) => executionBinding(value, {
          action: method === "spawn" ? "agent.delegate" : "agent.spawn",
        }),
      },
      {
        name: "target agent",
        args: { agent: "gemini-cli" },
      },
      {
        name: "target role",
        args: { role: "tester" },
      },
      {
        name: "repository id",
        args: { repo: "developer-tools" },
      },
      {
        name: "trace",
        args: { traceId: "tr-replayed" },
      },
      {
        name: "task omission",
        args: { taskId: null },
      },
      {
        name: "canonical cwd",
        args: (value) => ({ cwd: value.otherCwd }),
      },
      {
        name: "object clone",
        binding: (value, binding) => ({ ...binding }),
      },
      {
        name: "non-object non-null binding",
        binding: () => false,
      },
    ];

    for (const mutation of cases) {
      await t.test(mutation.name, async (st) => {
        const value = fixture(st);
        const baseBinding = executionBinding(value, {
          action: `agent.${method}`,
        });
        const requestBinding = mutation.binding
          ? mutation.binding(value, baseBinding)
          : baseBinding;
        const overrides = typeof mutation.args === "function"
          ? mutation.args(value)
          : mutation.args || {};

        await assert.rejects(
          () => value.service[method](
            serviceArgs(value, method, overrides),
            requestBinding,
          ),
          assertRequestContextDenied,
        );
        await assertNoLaunchSideEffects(value);
        await assertNoPreAuthorityAudit();
      });
    }
  });
}

const adapterCases = [
  ["claude-code", "codex"],
  ["codex", "gemini-cli"],
  ["gemini-cli", "codex"],
];

for (const [agentId, otherAgentId] of adapterCases) {
  for (const method of ["spawn", "delegate"]) {
    test(`${agentId} ${method} fails closed for every invalid non-null binding`, async (t) => {
      const cases = [
        {
          name: "control action",
          binding: (value) => executionBinding(value, {
            action: method === "spawn" ? "agent.delegate" : "agent.spawn",
            agent: agentId,
          }),
        },
        {
          name: "target agent",
          binding: (value) => executionBinding(value, {
            action: `agent.${method}`,
            agent: otherAgentId,
          }),
        },
        {
          name: "assigned target action",
          args: { targetAction: "code.read" },
        },
        {
          name: "target role",
          args: { role: "tester" },
        },
        {
          name: "repository id",
          args: { repo: "developer-tools" },
        },
        {
          name: "trace",
          args: { traceId: "tr-replayed" },
        },
        {
          name: "task omission",
          args: { taskId: null },
        },
        {
          name: "canonical cwd",
          args: (value) => ({ cwd: value.otherCwd }),
        },
        {
          name: "object clone",
          binding: (_value, binding) => ({ ...binding }),
        },
        {
          name: "non-object non-null binding",
          binding: () => false,
        },
      ];

      for (const mutation of cases) {
        await t.test(mutation.name, async (st) => {
          const value = fixture(st);
          const baseBinding = executionBinding(value, {
            action: `agent.${method}`,
            agent: agentId,
          });
          const requestBinding = mutation.binding
            ? mutation.binding(value, baseBinding)
            : baseBinding;
          const overrides = typeof mutation.args === "function"
            ? mutation.args(value)
            : mutation.args || {};
          const args = {
            cwd: value.canonicalCwd,
            traceId: "tr-owned",
            taskId: "ts-owned",
            targetAction: "code.write",
            role: "coder",
            repo: "sample-apps",
            requestBinding,
            ...(method === "delegate" ? { prompt: "implement" } : {}),
            ...overrides,
          };

          await assert.rejects(
            () => value.actualAdapters.get(agentId)[method](args),
            assertRequestContextDenied,
          );
          assert.equal((await queryAudit({ type: "SESSION_STARTED" })).length, 0);
          assert.equal((await queryAudit({ type: "AGENT_MODEL_RESOLVED" })).length, 0);
          await assertNoPreAuthorityAudit();
          assert.equal(
            getDb().prepare("SELECT COUNT(*) AS count FROM sessions").get().count,
            0,
          );
        });
      }
    });
  }
}

test("canonical cwd aliases preserve the orchestrator to assigned planner launch", async (t) => {
  const value = fixture(t);
  const binding = executionBinding(value, {
    action: "agent.spawn",
    agent: "claude-code",
    role: "planner",
    cwd: value.cwdAlias,
    traceId: "tr-planner",
    taskId: "ts-planner",
    targetAction: "code.read",
  });
  orchestrationRepo.createOrchestration({
    sessionId: "os-planner",
    traceId: "tr-planner",
    callerAgent: "claude-code",
    callerRole: "orchestrator",
    status: "active",
    goal: "launch the assigned planner",
    createdAt: NOW,
  });
  taskRepo.createTask({
    taskId: "ts-planner",
    traceId: "tr-planner",
    assignedAgent: "claude-code",
    assignedRole: "planner",
    repo: "sample-apps",
    status: "pending",
    createdAt: NOW,
    closedAt: null,
  });

  const result = await value.service.spawn({
    agent: "claude-code",
    role: "planner",
    repo: "sample-apps",
    cwd: value.canonicalCwd,
    traceId: "tr-planner",
    taskId: "ts-planner",
  }, binding);

  assert.equal(result.dryRun, true);
  assert.equal(value.counters.gets, 1);
  assert.equal(value.counters.invocations, 1);
  assert.equal(
    getDb().prepare("SELECT COUNT(*) AS count FROM sessions").get().count,
    1,
  );
  assert.equal((await queryAudit({ type: "SESSION_STARTED" })).length, 1);
  assert.equal((await queryAudit({ type: "AGENT_MODEL_RESOLVED" })).length, 1);
});

test("the server-owned target action remains the target-policy authority", async (t) => {
  const value = fixture(t);
  const binding = executionBinding(value, {
    action: "agent.spawn",
    agent: "claude-code",
    role: "planner",
    traceId: "tr-planner-write",
    taskId: "ts-planner-write",
    targetAction: "code.write",
  });

  await assert.rejects(
    () => value.service.spawn({
      agent: "claude-code",
      role: "planner",
      repo: "sample-apps",
      cwd: value.canonicalCwd,
      traceId: "tr-planner-write",
      taskId: "ts-planner-write",
    }, binding),
    (error) => {
      assert.equal(error.code, "POLICY_DENIED");
      return true;
    },
  );
  await assertNoLaunchSideEffects(value);
  assert.equal((await queryAudit({ type: "ERROR" })).length, 1);
});
