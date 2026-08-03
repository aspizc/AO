import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { configureAudit, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { getToolRegistry } from "../../gateway/src/tools/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const registries = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

function fresh() {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "tool-agent-"));
  const reposRoot = path.join(workspace, "repos");
  fs.mkdirSync(path.join(reposRoot, "cvision"), { recursive: true });
  fs.mkdirSync(path.join(reposRoot, "sample-apps"), { recursive: true });
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
  return { workspace, reposRoot };
}

function toolMap(config = {}, selectedRegistries = registries) {
  return Object.fromEntries(
    getToolRegistry({
      config: { dryRun: true, tmuxPrefix: "ag-", ...config },
      registries: selectedRegistries,
    }).map((tool) => [tool.name, tool]),
  );
}

function copiedRegistries(workspace, name, mutate) {
  const copiedPoliciesDir = path.join(workspace, name);
  fs.mkdirSync(copiedPoliciesDir, { recursive: true });
  for (const file of fs.readdirSync(path.join(REPO_ROOT, "policies"))) {
    if (!file.endsWith(".json")) continue;
    fs.copyFileSync(
      path.join(REPO_ROOT, "policies", file),
      path.join(copiedPoliciesDir, file),
    );
  }
  mutate(copiedPoliciesDir);
  return loadRegistries({ policiesDir: copiedPoliciesDir });
}

async function createTraceAndTask(tools, target) {
  const { repo, ...taskTarget } = target;
  const orchestration = parseToolResult(
    await tools["orchestration.create"].handler({
      callerAgent: "claude-code",
      callerRole: "orchestrator",
      goal: "exercise agent MCP tools",
    }),
  );
  const task = parseToolResult(
    await tools["task.assign"].handler({
      traceId: orchestration.traceId,
      caller: { agent: "claude-code", role: "orchestrator" },
      target: taskTarget,
      repo,
      brief: "exercise child agent",
    }),
  );
  return { traceId: orchestration.traceId, task };
}

test("agent tools are registered by the gateway tool registry", () => {
  const tools = toolMap();

  for (const name of ["agent.delegate", "agent.spawn", "agent.ask", "agent.view", "agent.kill"]) {
    assert.ok(tools[name], `${name} should be registered`);
  }
});

test("agent spawn requires taskId to avoid orphan sessions", async () => {
  const { reposRoot } = fresh();
  const tools = toolMap({ repoRoots: [reposRoot] });
  const { traceId } = await createTraceAndTask(tools, {
    agent: "gemini-cli",
    role: "restricted-coder",
    action: "code.write",
    repo: "cvision",
  });

  const result = await tools["agent.spawn"].handler({
    agent: "gemini-cli",
    role: "restricted-coder",
    repo: "cvision",
    cwd: path.join(reposRoot, "cvision"),
    traceId,
  });

  assert.equal(result.isError, true);
  assert.equal(parseToolResult(result).error, "INVALID_INPUT");
});

test("unknown persistent agent sessions return the catalogued safe code", async () => {
  const tools = toolMap();
  const result = await tools["agent.ask"].handler({
    sessionId: "missing-session",
    prompt: "status",
    traceId: "tr-missing-session",
  });

  assert.equal(result.isError, true);
  assert.deepEqual(parseToolResult(result), {
    error: "NOT_FOUND",
    code: "NOT_FOUND",
    message: "resource not found",
  });
});

test("dry-run spawn ask view kill cycle works through tools", async () => {
  const { reposRoot } = fresh();
  const tools = toolMap({ repoRoots: [reposRoot] });
  const { traceId, task } = await createTraceAndTask(tools, {
    agent: "gemini-cli",
    role: "restricted-coder",
    action: "code.write",
    repo: "cvision",
  });

  const spawned = parseToolResult(
    await tools["agent.spawn"].handler({
      agent: "gemini-cli",
      role: "restricted-coder",
      repo: "cvision",
      cwd: path.join(reposRoot, "cvision"),
      traceId,
      taskId: task.taskId,
    }),
  );
  const asked = parseToolResult(
    await tools["agent.ask"].handler({
      sessionId: spawned.sessionId,
      prompt: "summarize current task",
      traceId,
    }),
  );
  const viewed = parseToolResult(await tools["agent.view"].handler({ sessionId: spawned.sessionId, traceId }));
  const killed = parseToolResult(await tools["agent.kill"].handler({ sessionId: spawned.sessionId, traceId }));

  assert.equal(spawned.dryRun, true);
  assert.ok(spawned.tmuxTarget);
  assert.ok(spawned.attachCommand.includes("tmux attach"));
  assert.equal(asked.dryRun, true);
  assert.equal(viewed.dryRun, true);
  assert.equal(killed.closed, true);
});

test("enabled codex delegates through MCP in dry run", async () => {
  const { reposRoot } = fresh();
  const tools = toolMap({ repoRoots: [reposRoot] });
  const { traceId, task } = await createTraceAndTask(tools, {
    agent: "codex",
    role: "coder",
    action: "code.write",
    repo: "sample-apps",
  });

  const result = await tools["agent.delegate"].handler({
    agent: "codex",
    role: "coder",
    repo: "sample-apps",
    cwd: path.join(reposRoot, "sample-apps"),
    prompt: "change a string",
    traceId,
    taskId: task.taskId,
  });
  const body = parseToolResult(result);

  assert.equal(result.isError, undefined);
  assert.equal(body.dryRun, true);
  assert.equal(body.exitCode, 0);
});

test("disabled codex returns a structured adapter error through MCP", async () => {
  const { workspace, reposRoot } = fresh();

  const disabledRegistries = copiedRegistries(
    workspace,
    "policies-codex-disabled",
    (policiesDir) => {
      const capabilitiesPath = path.join(policiesDir, "agent-capabilities.json");
      const capabilities = JSON.parse(fs.readFileSync(capabilitiesPath, "utf-8"));
      capabilities.agents.codex.enabled = false;
      fs.writeFileSync(capabilitiesPath, JSON.stringify(capabilities, null, 2));
    },
  );
  const tools = toolMap({ repoRoots: [reposRoot] }, disabledRegistries);
  const { traceId, task } = await createTraceAndTask(tools, {
    agent: "codex",
    role: "coder",
    action: "code.write",
    repo: "sample-apps",
  });

  const result = await tools["agent.delegate"].handler({
    agent: "codex",
    role: "coder",
    repo: "sample-apps",
    cwd: path.join(reposRoot, "sample-apps"),
    prompt: "change a string",
    traceId,
    taskId: task.taskId,
  });
  const body = parseToolResult(result);

  assert.equal(result.isError, true);
  assert.equal(body.code, "ADAPTER_DISABLED");
});

test("disabled codex returns ADAPTER_DISABLED from ask, view, and kill", async () => {
  const { workspace, reposRoot } = fresh();
  const enabledTools = toolMap({ repoRoots: [reposRoot] });
  const { traceId, task } = await createTraceAndTask(enabledTools, {
    agent: "codex",
    role: "coder",
    action: "code.write",
    repo: "sample-apps",
  });
  const spawned = parseToolResult(
    await enabledTools["agent.spawn"].handler({
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      cwd: path.join(reposRoot, "sample-apps"),
      traceId,
      taskId: task.taskId,
    }),
  );
  const disabledRegistries = copiedRegistries(
    workspace,
    "policies-codex-disabled-control",
    (policiesDir) => {
      const capabilitiesPath = path.join(policiesDir, "agent-capabilities.json");
      const capabilities = JSON.parse(fs.readFileSync(capabilitiesPath, "utf-8"));
      capabilities.agents.codex.enabled = false;
      fs.writeFileSync(capabilitiesPath, JSON.stringify(capabilities, null, 2));
    },
  );
  const disabledTools = toolMap(
    { repoRoots: [reposRoot] },
    disabledRegistries,
  );
  const calls = [
    ["agent.ask", {
      sessionId: spawned.sessionId,
      prompt: "report status",
      traceId,
    }],
    ["agent.view", { sessionId: spawned.sessionId, traceId }],
    ["agent.kill", { sessionId: spawned.sessionId, traceId }],
  ];

  for (const [name, args] of calls) {
    const result = await disabledTools[name].handler(args);
    assert.equal(result.isError, true, name);
    assert.deepEqual(parseToolResult(result), {
      error: "ADAPTER_DISABLED",
      code: "ADAPTER_DISABLED",
      message: "adapter disabled",
    }, name);
  }
});

test("agent.ask exposes a safe POLICY_DENIED error when adapter preflight denies it", async () => {
  const { workspace, reposRoot } = fresh();
  const enabledTools = toolMap({ repoRoots: [reposRoot] });
  const { traceId, task } = await createTraceAndTask(enabledTools, {
    agent: "codex",
    role: "coder",
    action: "code.write",
    repo: "sample-apps",
  });
  const spawned = parseToolResult(
    await enabledTools["agent.spawn"].handler({
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      cwd: path.join(reposRoot, "sample-apps"),
      traceId,
      taskId: task.taskId,
    }),
  );
  const deniedRegistries = copiedRegistries(
    workspace,
    "policies-codex-ask-denied",
    (policiesDir) => {
      const rolesPath = path.join(policiesDir, "roles.json");
      const roles = JSON.parse(fs.readFileSync(rolesPath, "utf-8"));
      roles.roles.coder.denyActions.push("agent.ask");
      fs.writeFileSync(rolesPath, JSON.stringify(roles, null, 2));
    },
  );
  const deniedTools = toolMap({ repoRoots: [reposRoot] }, deniedRegistries);

  const result = await deniedTools["agent.ask"].handler({
    sessionId: spawned.sessionId,
    prompt: "report status",
    traceId,
  });

  assert.equal(result.isError, true);
  assert.deepEqual(parseToolResult(result), {
    error: "POLICY_DENIED",
    code: "POLICY_DENIED",
    message: "request denied by policy",
    decision: {
      decision: "deny",
      ruleId: "role.deny_action",
    },
  });
});
