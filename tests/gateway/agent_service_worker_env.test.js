import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { configureAudit, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { ACTION_CATALOG_VERSION } from "../../gateway/src/core/policy_types.js";
import { createRequestContext, bindRequestContext } from "../../gateway/src/core/request_context.js";
import { createAgentService } from "../../gateway/src/services/agent_service.js";
import { ClaudeAdapter } from "../../gateway/src/adapters/claude_adapter.js";
import { createOrchestration } from "../../gateway/src/core/repositories/orchestration_repo.js";
import { createTask } from "../../gateway/src/core/repositories/task_repo.js";
import { getDb, initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";

function setup(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "ao-service-worker-")));
  resetAudit();
  resetState();
  initState({ stateDb: path.join(root, "state.db"), env: {} });
  configureAudit({ auditLog: path.join(root, "audit.jsonl") });
  t.after(() => { resetAudit(); resetState(); fs.rmSync(root, { recursive: true, force: true }); });
  const base = loadRegistries({ policiesDir: path.resolve("policies") });
  const registries = { ...base, getRepo: (id) => ({ ...base.getRepo(id), excludedPaths: [] }) };
  const config = { dryRun: true, repoRoots: [root], codexSandbox: "workspace-write" };
  const adapter = new ClaudeAdapter({ config, registries });
  let mutate = (value) => value;
  const service = createAgentService({ registries, config, adapters: { get: () => ({ spawn: async (args) => mutate(await adapter.spawn(args)) }) } });
  const args = { agent: "claude-code", role: "reviewer", repo: "agents-orchestrator", cwd: root, traceId: "tr-worker", taskId: null };
  createOrchestration({ sessionId: "os-test", traceId: args.traceId, callerAgent: "codex", callerRole: "orchestrator", status: "active", goal: "worker environment binding", createdAt: new Date().toISOString() });
  createTask({ taskId: "tk-worker", traceId: args.traceId, assignedAgent: args.agent, assignedRole: args.role, repo: args.repo, status: "pending", createdAt: new Date().toISOString(), closedAt: null });
  const context = createRequestContext({ principalId: "operator", agent: "codex", role: "orchestrator", audience: "agents-gateway", connectionId: "test", capabilities: ["agent.spawn"], repositoryBindings: { "agents-orchestrator": root }, lineage: { traces: [args.traceId], tasks: [{ taskId: "tk-worker", traceId: args.traceId, repositoryId: args.repo, targetAgent: args.agent, targetRole: args.role, targetAction: "agent.spawn" }] } });
  return { service, args, context, setMutation: (fn) => { mutate = fn; } };
}

for (const bound of [false, true]) {
  test(`marker-bearing spawn result is accepted and returned with newSessionArgv (${bound ? "bound" : "task-less"})`, async (t) => {
    const { service, args, context } = setup(t);
    const callArgs = { ...args, taskId: bound ? "tk-worker" : null };
    const binding = bound ? bindRequestContext(context, { action: "agent.spawn", args: callArgs, audience: "agents-gateway", connectionId: "test", actionCatalogVersion: ACTION_CATALOG_VERSION }) : null;
    const result = await service.spawn(callArgs, binding);
    assert.deepEqual(result.newSessionArgv, ["new-session", "-d", "-s", result.tmuxTarget, "-c", args.cwd,
      "-e", "AGENTS_WORKER_ROLE=reviewer", "-e", "AGENTS_WORKER_TRACE_ID=tr-worker", "-e", `AGENTS_WORKER_TASK_ID=${callArgs.taskId ?? ""}`]);
    assert.ok(Object.isFrozen(result.newSessionArgv));
  });
}

const corruptions = {
  missing: (result) => { delete result.newSessionArgv; },
  nonArray: (result) => { result.newSessionArgv = "new-session"; },
  nonString: (result) => { result.newSessionArgv[1] = 1; },
  wrongCommand: (result) => { result.newSessionArgv[0] = "kill-session"; },
  wrongTarget: (result) => { result.newSessionArgv[3] += "-other"; },
  missingTarget: (result) => { result.newSessionArgv.splice(2, 2); },
  duplicateTarget: (result) => { result.newSessionArgv.push("-s", result.tmuxTarget); },
};
for (const key of ["AGENTS_WORKER_ROLE", "AGENTS_WORKER_TRACE_ID", "AGENTS_WORKER_TASK_ID"]) {
  corruptions[`missing ${key}`] = (result) => { const index = result.newSessionArgv.indexOf(`${key}=${key === "AGENTS_WORKER_ROLE" ? "reviewer" : key === "AGENTS_WORKER_TRACE_ID" ? "tr-worker" : "tk-worker"}`); result.newSessionArgv.splice(index - 1, 2); };
  corruptions[`wrong ${key}`] = (result) => { const index = result.newSessionArgv.findIndex((value) => value.startsWith(`${key}=`)); result.newSessionArgv[index] += "x"; };
  corruptions[`duplicate ${key}`] = (result) => { result.newSessionArgv.push("-e", result.newSessionArgv.find((value) => value.startsWith(`${key}=`))); };
}
for (const [name, corrupt] of Object.entries(corruptions)) {
  test(`service rejects ${name} newSessionArgv against the server-owned binding`, async (t) => {
    const { service, args, context, setMutation } = setup(t);
    const callArgs = { ...args, taskId: "tk-worker" };
    const binding = bindRequestContext(context, { action: "agent.spawn", args: callArgs, audience: "agents-gateway", connectionId: "test", actionCatalogVersion: ACTION_CATALOG_VERSION });
    // First prove the same adapter/binding is accepted; malformed results cannot fail incidentally.
    const valid = await service.spawn(callArgs, binding);
    assert.ok(Array.isArray(valid.newSessionArgv));
    getDb().prepare("DELETE FROM sessions").run();
    setMutation((value) => {
      const result = { ...value, newSessionArgv: [...value.newSessionArgv] };
      corrupt(result);
      return result;
    });
    await assert.rejects(() => service.spawn(callArgs, binding), (err) => err.code === "POLICY_DENIED" && err.decision.selectionRejection.code === "EFFECTIVE_SELECTION_INVALID");
  });
}
