import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { createAdapterRegistry } from "../../gateway/src/adapters/index.js";
import { ClaudeAdapter } from "../../gateway/src/adapters/claude_adapter.js";
import { createAgentService, PolicyDeniedError } from "../../gateway/src/services/agent_service.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function fresh() {
  resetState();
  resetAudit();
  initState({ stateDb: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "claude-policy-state-")), "state.db") });
  configureAudit({ auditLog: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "claude-policy-audit-")), "audit.jsonl") });
  return { root: fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "claude-policy-root-"))) };
}

function buildService(root) {
  const registries = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });
  const config = { dryRun: true, repoRoots: [root] };
  const adapters = createAdapterRegistry({ config, registries });
  adapters.register("claude-code", new ClaudeAdapter({ config, registries }));
  return createAgentService({ adapters, registries });
}

test("claude spawn on restricted repo is denied before adapter starts session", async () => {
  const { root } = fresh();
  const service = buildService(root);

  await assert.rejects(
    () =>
      service.spawn({
        agent: "claude-code",
        role: "coder",
        repo: "cvision",
        cwd: root,
        traceId: "tr-claude-restricted",
        taskId: null,
      }),
    PolicyDeniedError,
  );
  const events = await query({ traceId: "tr-claude-restricted" });

  assert.ok(!events.some((event) => event.type === "SESSION_STARTED"));
});

test("claude delegate on unrestricted repo works in dry run", async () => {
  const { root } = fresh();
  const service = buildService(root);

  const result = await service.delegate({
    agent: "claude-code",
    role: "coder",
    repo: "sample-apps",
    cwd: root,
    prompt: "hello",
    traceId: "tr-claude-unrestricted",
    taskId: null,
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.dryRun, true);
  assert.match(result.stdout, /^\[dry-run claude model=claude-fable-5 effort=max\]/);
});
