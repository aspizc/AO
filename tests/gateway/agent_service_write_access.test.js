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
import { CodexAdapter } from "../../gateway/src/adapters/codex_adapter.js";
import { ClaudeAdapter } from "../../gateway/src/adapters/claude_adapter.js";
import { PiAdapter } from "../../gateway/src/adapters/pi_adapter.js";
import { OpencodeAdapter } from "../../gateway/src/adapters/opencode_adapter.js";
import { AntigravityAdapter } from "../../gateway/src/adapters/antigravity_adapter.js";
import { createOrchestration } from "../../gateway/src/core/repositories/orchestration_repo.js";
import { createTask } from "../../gateway/src/core/repositories/task_repo.js";
import { getDb, initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";

const base = loadRegistries({ policiesDir: path.resolve("policies") });
const providers = { codex: CodexAdapter, "claude-code": ClaudeAdapter, pi: PiAdapter, opencode: OpencodeAdapter, antigravity: AntigravityAdapter };

for (const [agent, Adapter] of Object.entries(providers)) {
  for (const operation of ["delegate", "spawn"]) {
    test(`${agent} ${operation} validates target writeAccess in bound and unbound calls`, async (t) => {
      const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "ao-service-access-")));
      resetAudit();
      resetState();
      initState({ stateDb: path.join(root, "state.db"), env: {} });
      configureAudit({ auditLog: path.join(root, "audit.jsonl") });
      t.after(() => { resetAudit(); resetState(); fs.rmSync(root, { recursive: true, force: true }); });
      let writable = true;
      const registries = {
        ...base,
        getRepo: (id) => ({ ...base.getRepo(id), excludedPaths: [] }),
        getAgent: (id) => ({ ...base.getAgent(id), allowedRoles: ["orchestrator", "reviewer"], requiresApprovalFor: [] }),
        getRole: (role) => ({ denyActions: role === "reviewer" && !writable ? ["code.write"] : [] }),
      };
      const config = { dryRun: true, codexEnabled: true, codexSandbox: "workspace-write", repoRoots: [root] };
      const adapter = new Adapter({ config, registries });
      let mutate = (value) => value;
      const service = createAgentService({ registries, config, adapters: { get: () => ({ [operation]: async (args) => mutate(await adapter[operation](args)) }) } });
      const args = { agent, role: "reviewer", repo: "agents-orchestrator", cwd: root, traceId: `tr-service-${agent}-${operation}`, taskId: null, prompt: "inspect" };
      createOrchestration({ sessionId: "os-test", traceId: args.traceId, callerAgent: "codex", callerRole: "orchestrator", status: "active", goal: "target access contract", createdAt: new Date().toISOString() });
      createTask({ taskId: "ts-test", traceId: args.traceId, assignedAgent: agent, assignedRole: args.role, repo: args.repo, status: "pending", createdAt: new Date().toISOString(), closedAt: null });
      const context = createRequestContext({ principalId: "operator", agent: "codex", role: "orchestrator", audience: "agents-gateway", connectionId: "test", capabilities: [`agent.${operation}`], repositoryBindings: { "agents-orchestrator": root }, lineage: { traces: [args.traceId], tasks: [{ taskId: "ts-test", traceId: args.traceId, repositoryId: args.repo, targetAgent: agent, targetRole: args.role, targetAction: `agent.${operation}` }] } });
      for (const bound of [false, true]) {
        const callArgs = { ...args, taskId: bound ? "ts-test" : null };
        const binding = bound ? bindRequestContext(context, { action: `agent.${operation}`, args: callArgs, audience: "agents-gateway", connectionId: "test", actionCatalogVersion: ACTION_CATALOG_VERSION }) : null;
        if (bound) {
          for (const allowed of [true, false]) {
            writable = allowed;
            mutate = (value) => value;
            getDb().prepare("DELETE FROM sessions").run();
            if (agent === "antigravity" && !allowed) await assert.rejects(() => service[operation](callArgs, binding), (err) => err.code === "POLICY_DENIED");
            else assert.equal((await service[operation](callArgs, binding)).writeAccess, allowed);
          }
          continue;
        }
        for (const allowed of [true, false]) {
          writable = allowed;
          mutate = (value) => value;
          if (agent === "antigravity" && !allowed) { await assert.rejects(() => service[operation](callArgs), (err) => err.code === "POLICY_DENIED"); continue; }
          assert.equal((await service[operation](callArgs)).writeAccess, allowed);
          for (const bad of [undefined, null, "false", 0, !allowed]) {
            mutate = (value) => {
              const result = { ...value, writeAccess: bad };
              if (bad === undefined) delete result.writeAccess;
              return result;
            };
            await assert.rejects(() => service[operation](callArgs), (err) => err.code === "POLICY_DENIED" && err.decision.selectionRejection.code === "EFFECTIVE_SELECTION_INVALID");
          }
          if (operation === "delegate") {
            mutate = (value) => ({ ...value, model: "wrong-model" });
            await assert.rejects(() => service.delegate(callArgs), (err) => err.code === "POLICY_DENIED");
            if (agent === "codex" && !allowed) {
              mutate = (value) => ({ ...value, sandbox: "workspace-write" });
              await assert.rejects(() => service.delegate(callArgs), (err) => err.code === "POLICY_DENIED");
            }
          }
        }
      }
    });
  }
}
