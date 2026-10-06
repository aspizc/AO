import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import * as orchestrationRepo from "../../gateway/src/core/repositories/orchestration_repo.js";
import * as taskRepo from "../../gateway/src/core/repositories/task_repo.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { createAdapterRegistry } from "../../gateway/src/adapters/index.js";
import { createAgentService } from "../../gateway/src/services/agent_service.js";
import { buildAgentTools } from "../../gateway/src/tools/agent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const registries = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });

function fresh() {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "tool-agent-model-"));
  const repoRoot = path.join(workspace, "repos", "sample-apps");
  fs.mkdirSync(repoRoot, { recursive: true });
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
  return { repoRoot };
}

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

function createTask({ traceId, taskId, agent = "codex", role = "coder" }) {
  orchestrationRepo.createOrchestration({
    sessionId: `os-${taskId}`,
    traceId,
    callerAgent: "claude-code",
    callerRole: "orchestrator",
    status: "active",
    goal: "model plumbing test",
    createdAt: "2026-05-24T00:00:00.000Z",
  });
  taskRepo.createTask({
    taskId,
    traceId,
    assignedAgent: agent,
    assignedRole: role,
    repo: "sample-apps",
    status: "pending",
    createdAt: "2026-05-24T00:00:00.000Z",
    closedAt: null,
  });
}

function buildSubject({ repoRoot }) {
  const calls = [];
  const adapter = {
    async delegate(args) {
      calls.push({ method: "delegate", args });
      return {
        stdout: "ok",
        stderr: "",
        exitCode: 0,
        dryRun: true,
        model: args.effectiveSelection.model,
        reasoningEffort: args.effectiveSelection.reasoningEffort,
        effectiveSelection: args.effectiveSelection,
        ...(args.effectiveSelection.provider === "codex"
          ? {
              serviceTier: args.effectiveSelection.serviceTier,
              sandbox: "workspace-write",
            }
          : {}),
      };
    },
    async spawn(args) {
      calls.push({ method: "spawn", args });
      return {
        sessionId: "tmux-fake",
        tmuxTarget: "tmux-fake",
        attachCommand: "tmux attach -t tmux-fake",
        launchCommand: "fake launch",
        dryRun: true,
        effectiveSelection: args.effectiveSelection,
      };
    },
  };
  const adapters = createAdapterRegistry({ config: { repoRoots: [repoRoot] }, registries });
  adapters.register("codex", adapter);
  adapters.register("claude-code", adapter);
  adapters.register("antigravity", adapter);
  adapters.register("pi", adapter);
  adapters.register("opencode", adapter);
  const service = createAgentService({
    adapters,
    registries,
    config: { repoRoots: [repoRoot], agentTimeoutMs: 1000 },
  });
  const tools = Object.fromEntries(buildAgentTools({ agentService: service }).map((tool) => [tool.name, tool]));

  return { calls, tools };
}

test("agent tools expose optional model fields", () => {
  const service = {
    delegate: async (args) => args,
    spawn: async (args) => args,
    ask: async (args) => args,
    view: async (args) => args,
    kill: async (args) => args,
  };
  const tools = Object.fromEntries(buildAgentTools({ agentService: service }).map((tool) => [tool.name, tool]));

  assert.equal(tools["agent.delegate"].inputSchema.properties.model.type, "string");
  assert.equal(tools["agent.delegate"].inputSchema.properties.reasoningEffort.type, "string");
  assert.equal(tools["agent.delegate"].inputSchema.properties.serviceTier.type, "string");
  assert.equal(tools["agent.spawn"].inputSchema.properties.model.type, "string");
  assert.equal(tools["agent.spawn"].inputSchema.properties.reasoningEffort.type, "string");
  assert.equal(tools["agent.spawn"].inputSchema.properties.serviceTier.type, "string");
});

test("delegate without model uses canonical defaults and audits them", async () => {
  const { repoRoot } = fresh();
  const { calls, tools } = buildSubject({ repoRoot });
  createTask({ traceId: "tr-model-default", taskId: "ts-model-default" });

  const result = parseToolResult(
    await tools["agent.delegate"].handler({
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      cwd: repoRoot,
      prompt: "implement",
      traceId: "tr-model-default",
      taskId: "ts-model-default",
    }),
  );
  const events = await query({ traceId: "tr-model-default", type: "AGENT_MODEL_RESOLVED" });

  assert.equal(result.exitCode, 0);
  assert.equal(Object.hasOwn(calls[0].args, "model"), false);
  assert.equal(Object.hasOwn(calls[0].args, "reasoningEffort"), false);
  assert.equal(Object.hasOwn(calls[0].args, "serviceTier"), false);
  assert.equal(calls[0].args.effectiveSelection.model, "gpt-6.1-sol");
  assert.equal(calls[0].args.effectiveSelection.reasoningEffort, "max");
  assert.equal(calls[0].args.effectiveSelection.serviceTier, "priority");
  assert.equal(events.length, 1);
  assert.equal(events[0].model, "gpt-6.1-sol");
  assert.equal(events[0].reasoningEffort, "max");
  assert.equal(events[0].serviceTier, "priority");
});

test("delegate passes one resolved selection to the adapter", async () => {
  const { repoRoot } = fresh();
  const { calls, tools } = buildSubject({ repoRoot });
  createTask({ traceId: "tr-model-allowed", taskId: "ts-model-allowed" });

  await tools["agent.delegate"].handler({
    agent: "codex",
    role: "coder",
    repo: "sample-apps",
    cwd: repoRoot,
    prompt: "implement",
    traceId: "tr-model-allowed",
    taskId: "ts-model-allowed",
    model: "gpt-5-codex",
    reasoningEffort: "high",
  });

  assert.equal(Object.hasOwn(calls[0].args, "model"), false);
  assert.equal(Object.hasOwn(calls[0].args, "reasoningEffort"), false);
  assert.equal(Object.hasOwn(calls[0].args, "serviceTier"), false);
  assert.equal(calls[0].args.effectiveSelection.model, "gpt-5-codex");
  assert.equal(calls[0].args.effectiveSelection.reasoningEffort, "high");
  assert.equal(calls[0].args.effectiveSelection.serviceTier, "priority");
});

test("delegate with disallowed model is denied before adapter", async () => {
  const { repoRoot } = fresh();
  const { calls, tools } = buildSubject({ repoRoot });
  createTask({ traceId: "tr-model-denied", taskId: "ts-model-denied" });

  const result = await tools["agent.delegate"].handler({
    agent: "codex",
    role: "coder",
    repo: "sample-apps",
    cwd: repoRoot,
    prompt: "implement",
    traceId: "tr-model-denied",
    taskId: "ts-model-denied",
    model: "claude-opus-4-8",
  });
  const body = parseToolResult(result);

  assert.equal(result.isError, true);
  assert.equal(body.error, "POLICY_DENIED");
  assert.equal(body.decision.ruleId, "agent.model.allowed");
  assert.equal(calls.length, 0);
});

test("spawn passes one resolved selection to the adapter", async () => {
  const { repoRoot } = fresh();
  const { calls, tools } = buildSubject({ repoRoot });
  createTask({ traceId: "tr-model-spawn", taskId: "ts-model-spawn" });

  await tools["agent.spawn"].handler({
    agent: "codex",
    role: "coder",
    repo: "sample-apps",
    cwd: repoRoot,
    traceId: "tr-model-spawn",
    taskId: "ts-model-spawn",
    model: "gpt-5.6-terra",
    reasoningEffort: "low",
    serviceTier: "priority",
  });

  assert.equal(calls[0].method, "spawn");
  assert.equal(Object.hasOwn(calls[0].args, "model"), false);
  assert.equal(Object.hasOwn(calls[0].args, "reasoningEffort"), false);
  assert.equal(Object.hasOwn(calls[0].args, "serviceTier"), false);
  assert.equal(calls[0].args.effectiveSelection.model, "gpt-5.6-terra");
  assert.equal(calls[0].args.effectiveSelection.reasoningEffort, "low");
  assert.equal(calls[0].args.effectiveSelection.serviceTier, "priority");
});

test("every executable provider can spawn through the gateway", async () => {
  for (const [agent, role, model, effort] of [
    ["antigravity", "reviewer", "gemini-3.8-flash-high", "high"],
    ["pi", "coder", "ollama/qwen3.8:27b", "medium"],
    ["opencode", "coder", "ollama/qwen3.8:27b", null],
  ]) {
    const { repoRoot } = fresh();
    const { calls, tools } = buildSubject({ repoRoot });
    createTask({ traceId: `tr-spawn-${agent}`, taskId: `ts-spawn-${agent}`, agent, role });

    const result = await tools["agent.spawn"].handler({
      agent,
      role,
      repo: "sample-apps",
      cwd: repoRoot,
      traceId: `tr-spawn-${agent}`,
      taskId: `ts-spawn-${agent}`,
    });
    const body = parseToolResult(result);

    assert.notEqual(result.isError, true, `${agent} spawn must not be rejected`);
    assert.equal(body.sessionId, "tmux-fake");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "spawn");
    assert.equal(calls[0].args.effectiveSelection.model, model);
    assert.equal(calls[0].args.effectiveSelection.reasoningEffort, effort);
  }
});

test("a provider with no adapter result contract is rejected before the adapter runs", async () => {
  const { repoRoot } = fresh();
  const { calls, tools } = buildSubject({ repoRoot });
  createTask({ traceId: "tr-spawn-gemini", taskId: "ts-spawn-gemini", agent: "gemini-cli", role: "coder" });

  const result = await tools["agent.spawn"].handler({
    agent: "gemini-cli",
    role: "coder",
    repo: "sample-apps",
    cwd: repoRoot,
    traceId: "tr-spawn-gemini",
    taskId: "ts-spawn-gemini",
  });

  assert.equal(result.isError, true);
  assert.equal(calls.length, 0);
});

test("claude defaults to Opus 5.5 max without a Codex service tier", async () => {
  const { repoRoot } = fresh();
  const { calls, tools } = buildSubject({ repoRoot });
  createTask({ traceId: "tr-model-claude", taskId: "ts-model-claude", agent: "claude-code", role: "reviewer" });

  await tools["agent.delegate"].handler({
    agent: "claude-code",
    role: "reviewer",
    repo: "sample-apps",
    cwd: repoRoot,
    prompt: "review",
    traceId: "tr-model-claude",
    taskId: "ts-model-claude",
  });

  assert.equal(Object.hasOwn(calls[0].args, "model"), false);
  assert.equal(Object.hasOwn(calls[0].args, "reasoningEffort"), false);
  assert.equal(Object.hasOwn(calls[0].args, "serviceTier"), false);
  assert.equal(calls[0].args.effectiveSelection.model, "claude-opus-5-5");
  assert.equal(calls[0].args.effectiveSelection.reasoningEffort, "max");
  assert.equal(calls[0].args.effectiveSelection.serviceTier, null);
});
