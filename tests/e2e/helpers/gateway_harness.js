import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GeminiAdapter } from "../../../gateway/src/adapters/gemini_adapter.js";
import { ClaudeAdapter } from "../../../gateway/src/adapters/claude_adapter.js";
import { CodexAdapter } from "../../../gateway/src/adapters/codex_adapter.js";
import { AntigravityAdapter } from "../../../gateway/src/adapters/antigravity_adapter.js";
import { createAdapterRegistry } from "../../../gateway/src/adapters/index.js";
import * as artifactStore from "../../../gateway/src/core/artifact_store.js";
import * as audit from "../../../gateway/src/core/audit.js";
import { loadRegistries } from "../../../gateway/src/core/registry.js";
import { configureSanitizer } from "../../../gateway/src/core/sanitizer.js";
import { initState, _resetForTests as resetState } from "../../../gateway/src/core/state.js";
import * as approval from "../../../gateway/src/services/approval_service.js";
import { shareArtifact } from "../../../gateway/src/services/artifact_share_service.js";
import { createAgentService } from "../../../gateway/src/services/agent_service.js";
import * as orchestration from "../../../gateway/src/services/orchestration_service.js";
import * as task from "../../../gateway/src/services/task_service.js";
import { buildArtifactTools } from "../../../gateway/src/tools/artifact.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

function mkdirp(target) {
  fs.mkdirSync(target, { recursive: true });
  return fs.realpathSync(target);
}

export function startHarness() {
  resetState();
  audit._resetForTests();

  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "ag-e2e-"));
  const reposRoot = mkdirp(path.join(workspace, "repos"));
  const cvisionRepo = mkdirp(path.join(reposRoot, "cvision"));
  mkdirp(path.join(reposRoot, "sample-apps"));

  const registries = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });
  const config = {
    dryRun: true,
    repoRoots: [reposRoot],
    tmuxPrefix: "ag-",
  };
  const adapters = createAdapterRegistry({ config, registries });
  adapters.register("gemini-cli", new GeminiAdapter({ config, registries }));
  adapters.register("claude-code", new ClaudeAdapter({ config, registries }));
  adapters.register("codex", new CodexAdapter({ config, registries }));
  adapters.register("antigravity", new AntigravityAdapter({ config, registries }));
  const agent = createAgentService({ adapters, registries });

  initState({ stateDb: path.join(workspace, "state", "state.db") });
  audit.configureAudit({ auditLog: path.join(workspace, "audit", "events.jsonl") });
  artifactStore.configureArtifactStore({ artifactStoreRoot: path.join(workspace, "artifacts") });
  configureSanitizer({ rulesPath: path.join(REPO_ROOT, "policies", "sanitization-rules.json") });

  const artifactTools = Object.fromEntries(buildArtifactTools({ registries }).map((tool) => [tool.name, tool]));

  return {
    workspace,
    paths: {
      reposRoot,
      cvisionRepo,
      auditLog: path.join(workspace, "audit", "events.jsonl"),
    },
    services: {
      registries,
      orchestration,
      task,
      agent,
      approval,
      audit,
      artifacts: {
        put: artifactStore.put,
        get: async (args) => parseToolResult(await artifactTools["artifact.get"].handler(args)),
        list: artifactStore.list,
        share: (args) => shareArtifact({ ...args, registries }),
      },
    },
    cleanup() {
      resetState();
      audit._resetForTests();
      fs.rmSync(workspace, { recursive: true, force: true });
    },
  };
}
