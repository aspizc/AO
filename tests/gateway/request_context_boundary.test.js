import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  configureAudit,
  query as queryAudit,
  _resetForTests as resetAudit,
} from "../../gateway/src/core/audit.js";
import { configureArtifactStore } from "../../gateway/src/core/artifact_store.js";
import { getDb } from "../../gateway/src/core/state.js";
import {
  createRequestContext,
  revokeRequestContext,
} from "../../gateway/src/core/request_context.js";
import { ACTION_CATALOG_VERSION } from "../../gateway/src/core/policy_types.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { createCallToolHandler } from "../../gateway/src/mcp_server.js";
import { getToolRegistry } from "../../gateway/src/tools/index.js";
import { defineTool, z } from "../../gateway/src/tools/tool_helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const registries = loadRegistries({ policiesDir: path.join(ROOT, "policies") });
const NOW = "2026-07-26T08:30:00.000Z";

function parse(result) {
  return JSON.parse(result.content[0].text);
}

function request(name, args) {
  return { params: { name, arguments: args } };
}

function createContext(repositories, connectionId, overrides = {}) {
  return createRequestContext({
    principalId: "local-operator",
    agent: "claude-code",
    role: "orchestrator",
    audience: "agents-gateway:test",
    connectionId,
    capabilities: [
      "orchestration.create",
      "orchestration.view",
      "orchestration.pause",
      "task.assign",
      "agent.spawn",
      "agent.ask",
      "agent.view",
      "agent.kill",
      "artifact.put",
      "approval.request",
    ],
    repositoryBindings: repositories,
    issuedAt: "2026-07-26T08:00:00.000Z",
    expiresAt: "2026-07-26T09:00:00.000Z",
    ...overrides,
  });
}

function harness(t, configOverrides = {}) {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "request-boundary-"));
  const repositoriesRoot = path.join(workspace, "repos");
  const repository = path.join(repositoriesRoot, "sample-apps");
  const developerTools = path.join(repositoriesRoot, "developer-tools");
  const restrictedRepository = path.join(repositoriesRoot, "cvision");
  const outside = path.join(workspace, "outside");
  fs.mkdirSync(repository, { recursive: true });
  fs.mkdirSync(developerTools, { recursive: true });
  fs.mkdirSync(restrictedRepository, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  fs.symlinkSync(outside, path.join(repository, "escape"), "dir");
  initState({ stateDb: path.join(workspace, "state.db") });
  const auditLog = path.join(workspace, "audit.jsonl");
  const artifactStoreRoot = path.join(workspace, "artifacts");
  configureAudit({ auditLog });
  configureArtifactStore({ artifactStoreRoot });
  t.after(() => {
    resetState();
    resetAudit();
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  const tools = getToolRegistry({
    config: {
      dryRun: true,
      tmuxPrefix: "ag-",
      repoRoots: [repositoriesRoot],
      messageAccessSecret: "request-context-test-secret",
      artifactStoreRoot,
      ...configOverrides,
    },
    registries,
  });
  const repositoryBindings = {
    "sample-apps": {
      root: repository,
      classification: "unrestricted",
    },
    "developer-tools": {
      root: developerTools,
      classification: "internal",
    },
    cvision: {
      root: restrictedRepository,
      classification: "restricted",
    },
  };
  const contextA = createContext(repositoryBindings, "connection-a");
  const contextB = createContext(repositoryBindings, "connection-b");
  const handler = (requestContext, connectionId) => createCallToolHandler({
    tools,
    requestContext,
    transportBinding: {
      audience: "agents-gateway:test",
      connectionId,
    },
    now: () => NOW,
    append: null,
    appendLocalOnly: null,
  });

  return {
    auditLog,
    artifactStoreRoot,
    contextA,
    contextB,
    repositoryBindings,
    repository: fs.realpathSync(repository),
    developerTools: fs.realpathSync(developerTools),
    restrictedRepository: fs.realpathSync(restrictedRepository),
    tools,
    callWith: handler,
    callA: handler(contextA, "connection-a"),
    callB: handler(contextB, "connection-b"),
  };
}

async function createOwnedTask(call, overrides = {}) {
  const orchestration = parse(await call(request("orchestration.create", {
    callerAgent: "claude-code",
    callerRole: "orchestrator",
    goal: "exercise request ownership",
  })));
  const task = parse(await call(request("task.assign", {
    traceId: orchestration.traceId,
    caller: { agent: "claude-code", role: "orchestrator" },
    target: { agent: "codex", role: "coder", action: "code.write" },
    repo: "sample-apps",
    brief: "exercise request ownership",
    ...overrides,
  })));
  return { orchestration, task };
}

test("schema validation precedes context denial and spoofing never persists", async (t) => {
  const value = harness(t);

  const invalid = await value.callA(request("orchestration.create", {}));
  assert.equal(invalid.isError, true);
  assert.equal(parse(invalid).code, "INVALID_INPUT");

  const spoofed = await value.callA(request("orchestration.create", {
    callerAgent: "codex",
    callerRole: "coder",
  }));
  assert.equal(spoofed.isError, true);
  assert.equal(parse(spoofed).code, "REQUEST_CONTEXT_DENIED");
  assert.equal(
    getDb().prepare("SELECT COUNT(*) AS count FROM orchestration_sessions").get().count,
    0,
  );
});

test("server actor is persisted and internal capabilities never enter the response", async (t) => {
  const value = harness(t);

  const created = parse(await value.callA(request("orchestration.create", {
    callerAgent: "claude-code",
    callerRole: "orchestrator",
  })));
  const row = getDb()
    .prepare("SELECT * FROM orchestration_sessions WHERE trace_id = ?")
    .get(created.traceId);

  assert.equal(row.caller_agent, "claude-code");
  assert.equal(row.caller_role, "orchestrator");
  assert.doesNotMatch(JSON.stringify(created), /capabilit|agent\\.spawn/);
});

test("trace ownership is connection-local and fails before lifecycle mutation", async (t) => {
  const value = harness(t);
  const created = parse(await value.callA(request("orchestration.create", {
    callerAgent: "claude-code",
    callerRole: "orchestrator",
  })));

  const replay = await value.callB(request("orchestration.pause", {
    traceId: created.traceId,
  }));
  assert.equal(replay.isError, true);
  assert.equal(parse(replay).code, "REQUEST_CONTEXT_DENIED");
  assert.equal(
    getDb()
      .prepare("SELECT status FROM orchestration_sessions WHERE trace_id = ?")
      .get(created.traceId)
      .status,
    "active",
  );
});

test("task target action is mandatory and closed before task persistence", async (t) => {
  const value = harness(t);
  const orchestration = parse(await value.callA(request("orchestration.create", {
    callerAgent: "claude-code",
    callerRole: "orchestrator",
  })));
  const base = {
    traceId: orchestration.traceId,
    caller: { agent: "claude-code", role: "orchestrator" },
    repo: "sample-apps",
  };

  for (const target of [
    { agent: "codex", role: "coder" },
    { agent: "codex", role: "coder", action: "code.wrtie" },
  ]) {
    const result = await value.callA(request("task.assign", {
      ...base,
      target,
    }));
    assert.equal(result.isError, true);
    assert.equal(parse(result).code, "REQUEST_CONTEXT_DENIED");
  }
  assert.equal(getDb().prepare("SELECT COUNT(*) AS count FROM tasks").get().count, 0);
});

test("task target, trace, repository, and canonical cwd bind before launch", async (t) => {
  const value = harness(t);
  const { orchestration, task } = await createOwnedTask(value.callA);
  const sessionCount = () => getDb().prepare("SELECT COUNT(*) AS count FROM sessions").get().count;

  for (const overrides of [
    { traceId: "tr-other" },
    { taskId: "ts-other" },
    { agent: "gemini-cli" },
    { role: "reviewer" },
    { repo: "developer-tools" },
    { cwd: path.join(value.repository, "escape") },
  ]) {
    const result = await value.callA(request("agent.spawn", {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      cwd: value.repository,
      traceId: orchestration.traceId,
      taskId: task.taskId,
      ...overrides,
    }));
    assert.equal(result.isError, true, JSON.stringify(overrides));
    assert.equal(parse(result).code, "REQUEST_CONTEXT_DENIED");
    assert.equal(sessionCount(), 0);
  }

  const spawned = parse(await value.callA(request("agent.spawn", {
    agent: "codex",
    role: "coder",
    repo: "sample-apps",
    cwd: value.repository,
    traceId: orchestration.traceId,
    taskId: task.taskId,
  })));
  assert.equal(spawned.dryRun, true);
  assert.equal(sessionCount(), 1);

  const crossConnection = await value.callB(request("agent.view", {
    sessionId: spawned.sessionId,
    traceId: orchestration.traceId,
  }));
  assert.equal(crossConnection.isError, true);
  assert.equal(parse(crossConnection).code, "REQUEST_CONTEXT_DENIED");

  const wrongTrace = await value.callA(request("agent.ask", {
    sessionId: spawned.sessionId,
    prompt: "status",
    traceId: "tr-other",
  }));
  assert.equal(wrongTrace.isError, true);
  assert.equal(parse(wrongTrace).code, "REQUEST_CONTEXT_DENIED");
});

test("revocation is enforced at the MCP boundary before a state read", async (t) => {
  const value = harness(t);
  const created = parse(await value.callA(request("orchestration.create", {
    callerAgent: "claude-code",
    callerRole: "orchestrator",
  })));
  revokeRequestContext(value.contextA, { now: NOW });

  const denied = await value.callA(request("orchestration.view", {
    traceId: created.traceId,
  }));
  assert.equal(denied.isError, true);
  assert.equal(parse(denied).code, "REQUEST_CONTEXT_DENIED");
});

test("approval repository and task lineage are derived before persistence", async (t) => {
  const value = harness(t);
  const { orchestration, task } = await createOwnedTask(value.callA);
  const approvalCount = () =>
    getDb().prepare("SELECT COUNT(*) AS count FROM approvals").get().count;

  for (const overrides of [
    { requestedBy: "other-principal" },
    { context: { taskId: "ts-other", repo: "sample-apps" } },
    { context: { taskId: task.taskId, repo: "developer-tools" } },
    {
      context: {
        taskId: task.taskId,
        repo: "sample-apps",
        classification: "restricted",
      },
    },
  ]) {
    const result = await value.callA(request("approval.request", {
      traceId: orchestration.traceId,
      action: "code.apply",
      requestedBy: "claude-code",
      context: { taskId: task.taskId, repo: "sample-apps" },
      ...overrides,
    }));
    assert.equal(result.isError, true);
    assert.equal(parse(result).code, "REQUEST_CONTEXT_DENIED");
    assert.equal(approvalCount(), 0);
  }

  const created = parse(await value.callA(request("approval.request", {
    traceId: orchestration.traceId,
    action: "code.apply",
    requestedBy: "claude-code",
    context: {
      taskId: task.taskId,
      repo: "sample-apps",
    },
  })));
  const row = getDb()
    .prepare("SELECT * FROM approvals WHERE approval_id = ?")
    .get(created.approvalId);
  assert.equal(created.status, "pending");
  assert.deepEqual(JSON.parse(row.payload), {
    taskId: task.taskId,
    repo: "sample-apps",
    classification: "unrestricted",
  });
});

test("repository-affecting approvals fail closed without one server-owned task", async (t) => {
  const value = harness(t, { autoApproveScopes: ["code.apply"] });
  const orchestration = parse(await value.callA(request("orchestration.create", {
    callerAgent: "claude-code",
    callerRole: "orchestrator",
  })));

  const missingTask = await value.callA(request("approval.request", {
    traceId: orchestration.traceId,
    action: "code.apply",
    requestedBy: "claude-code",
  }));

  assert.equal(missingTask.isError, true);
  assert.equal(parse(missingTask).code, "REQUEST_CONTEXT_DENIED");
  assert.equal(getDb().prepare("SELECT COUNT(*) AS count FROM approvals").get().count, 0);
  assert.equal(
    (await queryAudit({
      traceId: orchestration.traceId,
      type: "APPROVAL_AUTO_GRANTED",
    })).length,
    0,
  );

  await value.callA(request("task.assign", {
    traceId: orchestration.traceId,
    caller: { agent: "claude-code", role: "orchestrator" },
    target: { agent: "codex", role: "coder", action: "code.write" },
    repo: "sample-apps",
  }));
  await value.callA(request("task.assign", {
    traceId: orchestration.traceId,
    caller: { agent: "claude-code", role: "orchestrator" },
    target: { agent: "codex", role: "coder", action: "code.write" },
    repo: "developer-tools",
  }));

  const ambiguous = await value.callA(request("approval.request", {
    traceId: orchestration.traceId,
    action: "code.apply",
    requestedBy: "claude-code",
  }));
  assert.equal(ambiguous.isError, true);
  assert.equal(parse(ambiguous).code, "REQUEST_CONTEXT_DENIED");
  assert.equal(getDb().prepare("SELECT COUNT(*) AS count FROM approvals").get().count, 0);
});

test("restricted approval lineage remains pending when the task assertion is omitted", async (t) => {
  const value = harness(t, { autoApproveScopes: ["code.apply"] });
  const { orchestration } = await createOwnedTask(value.callA, {
    target: {
      agent: "codex",
      role: "restricted-coder",
      action: "code.write",
    },
    repo: "cvision",
  });

  const result = parse(await value.callA(request("approval.request", {
    traceId: orchestration.traceId,
    action: "code.apply",
    requestedBy: "claude-code",
  })));
  const row = getDb()
    .prepare("SELECT status, payload FROM approvals WHERE approval_id = ?")
    .get(result.approvalId);

  assert.equal(result.status, "pending");
  assert.equal(row.status, "pending");
  assert.equal(JSON.parse(row.payload).classification, "restricted");
  assert.equal(
    (await queryAudit({
      traceId: orchestration.traceId,
      type: "APPROVAL_AUTO_GRANTED",
    })).length,
    0,
  );
});

test("control-plane actor is distinct from the assigned launch target", async (t) => {
  const value = harness(t);
  const { orchestration, task } = await createOwnedTask(value.callA, {
    target: {
      agent: "claude-code",
      role: "planner",
      action: "code.read",
    },
  });

  const launched = await value.callA(request("agent.spawn", {
    agent: "claude-code",
    role: "planner",
    repo: "sample-apps",
    cwd: value.repository,
    traceId: orchestration.traceId,
    taskId: task.taskId,
  }));
  assert.equal(launched.isError, undefined, JSON.stringify(parse(launched)));

  const child = await createOwnedTask(value.callA);
  const plannerContext = createContext(
    value.repositoryBindings,
    "connection-planner",
    {
      principalId: "planner-principal",
      role: "planner",
      capabilities: ["agent.spawn", "task.assign"],
      lineage: {
        traces: [{ traceId: child.orchestration.traceId }],
        tasks: [{
          taskId: child.task.taskId,
          traceId: child.orchestration.traceId,
          repositoryId: "sample-apps",
          targetAgent: "codex",
          targetRole: "coder",
          targetAction: "code.write",
        }],
      },
    },
  );
  const callPlanner = value.callWith(plannerContext, "connection-planner");
  const tasksBefore = getDb()
    .prepare("SELECT COUNT(*) AS count FROM tasks")
    .get()
    .count;
  const assignDenied = await callPlanner(request("task.assign", {
    traceId: child.orchestration.traceId,
    caller: { agent: "claude-code", role: "planner" },
    target: { agent: "codex", role: "coder", action: "code.write" },
    repo: "sample-apps",
  }));
  assert.equal(assignDenied.isError, true);
  assert.equal(parse(assignDenied).code, "POLICY_DENIED");
  assert.equal(
    getDb().prepare("SELECT COUNT(*) AS count FROM tasks").get().count,
    tasksBefore,
  );

  const sessionsBefore = getDb()
    .prepare("SELECT COUNT(*) AS count FROM sessions")
    .get()
    .count;
  const adapterStartsBefore = (await queryAudit({
    traceId: child.orchestration.traceId,
    type: "SESSION_STARTED",
  })).length;
  const denied = await callPlanner(request("agent.spawn", {
    agent: "codex",
    role: "coder",
    repo: "sample-apps",
    cwd: value.repository,
    traceId: child.orchestration.traceId,
    taskId: child.task.taskId,
  }));

  assert.equal(denied.isError, true);
  assert.equal(parse(denied).code, "POLICY_DENIED");
  assert.equal(
    getDb().prepare("SELECT COUNT(*) AS count FROM sessions").get().count,
    sessionsBefore,
  );
  assert.equal(
    (await queryAudit({
      traceId: child.orchestration.traceId,
      type: "SESSION_STARTED",
    })).length,
    adapterStartsBefore,
  );
});

test("artifact sanitizer lineage cannot cross connection, trace, or repository", async (t) => {
  const value = harness(t);
  const sourceTrace = parse(await value.callB(request("orchestration.create", {
    callerAgent: "claude-code",
    callerRole: "orchestrator",
  })));
  const source = parse(await value.callB(request("artifact.put", {
    traceId: sourceTrace.traceId,
    kind: "review_notes",
    classification: "internal",
    producedBy: "claude-code",
    content: "source",
  })));
  const ownTrace = parse(await value.callA(request("orchestration.create", {
    callerAgent: "claude-code",
    callerRole: "orchestrator",
  })));

  const crossConnectionAuditBefore = (await queryAudit({ limit: 1_000 })).length;
  const crossConnection = await value.callA(request("artifact.put", {
    traceId: ownTrace.traceId,
    kind: "review_notes",
    classification: "internal",
    producedBy: "claude-code",
    content: "forged",
    sanitizedFrom: source.artifactId,
  }));
  assert.equal(crossConnection.isError, true);
  assert.equal(parse(crossConnection).code, "REQUEST_CONTEXT_DENIED");
  assert.equal(
    (await queryAudit({ limit: 1_000 })).length,
    crossConnectionAuditBefore,
  );

  const sameConnectionSource = parse(await value.callA(request("artifact.put", {
    traceId: ownTrace.traceId,
    kind: "review_notes",
    classification: "internal",
    producedBy: "claude-code",
    content: "own source",
  })));
  const secondTrace = parse(await value.callA(request("orchestration.create", {
    callerAgent: "claude-code",
    callerRole: "orchestrator",
  })));
  const crossTraceAuditBefore = (await queryAudit({ limit: 1_000 })).length;
  const crossTrace = await value.callA(request("artifact.put", {
    traceId: secondTrace.traceId,
    kind: "review_notes",
    classification: "internal",
    producedBy: "claude-code",
    content: "forged",
    sanitizedFrom: sameConnectionSource.artifactId,
  }));
  assert.equal(crossTrace.isError, true);
  assert.equal(parse(crossTrace).code, "REQUEST_CONTEXT_DENIED");
  assert.equal(
    (await queryAudit({ limit: 1_000 })).length,
    crossTraceAuditBefore,
  );

  const sample = await createOwnedTask(value.callA);
  const sampleSession = parse(await value.callA(request("agent.spawn", {
    agent: "codex",
    role: "coder",
    repo: "sample-apps",
    cwd: value.repository,
    traceId: sample.orchestration.traceId,
    taskId: sample.task.taskId,
  })));
  const developerTask = parse(await value.callA(request("task.assign", {
    traceId: sample.orchestration.traceId,
    caller: { agent: "claude-code", role: "orchestrator" },
    target: { agent: "codex", role: "tester", action: "test.run" },
    repo: "developer-tools",
  })));
  const developerSession = parse(await value.callA(request("agent.spawn", {
    agent: "codex",
    role: "tester",
    repo: "developer-tools",
    cwd: value.developerTools,
    traceId: sample.orchestration.traceId,
    taskId: developerTask.taskId,
  })));
  assert.ok(sampleSession.sessionId, JSON.stringify(sampleSession));
  assert.ok(developerTask.taskId, JSON.stringify(developerTask));
  assert.ok(developerSession.sessionId, JSON.stringify(developerSession));
  const repositorySource = parse(await value.callA(request("artifact.put", {
    traceId: sample.orchestration.traceId,
    kind: "review_notes",
    classification: "internal",
    producedBy: sampleSession.sessionId,
    content: "sample source",
  })));
  assert.ok(repositorySource.artifactId, JSON.stringify(repositorySource));
  const crossRepositoryAuditBefore = (await queryAudit({ limit: 1_000 })).length;
  const crossRepository = await value.callA(request("artifact.put", {
    traceId: sample.orchestration.traceId,
    kind: "review_notes",
    classification: "internal",
    producedBy: developerSession.sessionId,
    content: "forged",
    sanitizedFrom: repositorySource.artifactId,
  }));
  assert.equal(crossRepository.isError, true);
  assert.equal(parse(crossRepository).code, "REQUEST_CONTEXT_DENIED");
  assert.equal(
    (await queryAudit({ limit: 1_000 })).length,
    crossRepositoryAuditBefore,
  );

  const rows = getDb()
    .prepare("SELECT COUNT(*) AS count FROM artifacts WHERE sanitized_from IS NOT NULL")
    .get()
    .count;
  const artifactFiles = fs.existsSync(value.artifactStoreRoot)
    ? fs.readdirSync(value.artifactStoreRoot, { recursive: true })
      .filter((entry) => fs.statSync(path.join(value.artifactStoreRoot, entry)).isFile())
    : [];
  assert.equal(rows, 0);
  assert.equal(artifactFiles.length, 3);
  assert.equal(
    (await queryAudit({ type: "ARTIFACT_CREATED" }))
      .filter((event) => event.sanitizedFrom !== null)
      .length,
    0,
  );
});

test("unknown protected namespaces and catalog skew stop before handlers", async (t) => {
  const value = harness(t);
  let sideEffects = 0;
  const future = defineTool({
    name: "agent.future",
    description: "Exercise a future protected action.",
    schema: z.object({}).strict(),
    handler: async () => {
      sideEffects += 1;
      return { ok: true };
    },
  });
  const futureCall = createCallToolHandler({
    tools: [future],
    requestContext: value.contextA,
    transportBinding: {
      audience: "agents-gateway:test",
      connectionId: "connection-a",
    },
    now: () => NOW,
    append: null,
    appendLocalOnly: null,
  });
  const unknown = await futureCall(request("agent.future", {}));
  assert.equal(unknown.isError, true);
  assert.equal(parse(unknown).code, "REQUEST_CONTEXT_DENIED");
  assert.equal(sideEffects, 0);

  const create = value.tools.find((tool) => tool.name === "orchestration.create");
  const skewedCall = createCallToolHandler({
    tools: [{
      ...create,
      actionCatalogVersion: ACTION_CATALOG_VERSION + 1,
    }],
    requestContext: value.contextA,
    transportBinding: {
      audience: "agents-gateway:test",
      connectionId: "connection-a",
    },
    now: () => NOW,
    append: null,
    appendLocalOnly: null,
  });
  const before = getDb()
    .prepare("SELECT COUNT(*) AS count FROM orchestration_sessions")
    .get()
    .count;
  const skewed = await skewedCall(request("orchestration.create", {
    callerAgent: "claude-code",
    callerRole: "orchestrator",
  }));
  assert.equal(skewed.isError, true);
  assert.equal(parse(skewed).code, "REQUEST_CONTEXT_DENIED");
  assert.equal(
    getDb().prepare("SELECT COUNT(*) AS count FROM orchestration_sessions").get().count,
    before,
  );
});
