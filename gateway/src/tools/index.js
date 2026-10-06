import { AntigravityAdapter } from "../adapters/antigravity_adapter.js";
import { ClaudeAdapter } from "../adapters/claude_adapter.js";
import { CodexAdapter } from "../adapters/codex_adapter.js";
import { GeminiAdapter } from "../adapters/gemini_adapter.js";
import { OpencodeAdapter } from "../adapters/opencode_adapter.js";
import { PiAdapter } from "../adapters/pi_adapter.js";
import { createAdapterRegistry } from "../adapters/index.js";
import { createCoordination } from "../coordination.js";
import { createAgentService } from "../services/agent_service.js";
import { assertCompleteToolBindings } from "./catalog.js";
import { buildAgentTools } from "./agent.js";
import { buildApprovalTools } from "./approval.js";
import { buildArtifactTools } from "./artifact.js";
import { buildCoordinationTools } from "./coordination.js";
import { buildMessageTools } from "./message.js";
import { buildOrchestrationTools } from "./orchestration.js";
import { buildSessionTools } from "./session.js";
import { buildTaskTools } from "./task.js";

const REGISTRY_CLOSE = Symbol("agents.gateway.registry.close");

export function closeToolRegistry(registry) {
  if (!Array.isArray(registry)) {
    throw new TypeError("tool registry must be an array");
  }
  const close = registry[REGISTRY_CLOSE];
  return typeof close === "function"
    ? close()
    : Promise.resolve({ status: "closed" });
}

export function getToolRegistry({
  config,
  registries,
  coordinationFactory = createCoordination,
} = {}) {
  const adapters = createAdapterRegistry({ config, registries });
  adapters.register("gemini-cli", new GeminiAdapter({ config, registries }));
  adapters.register("claude-code", new ClaudeAdapter({ config, registries }));
  adapters.register("codex", new CodexAdapter({ config, registries }));
  adapters.register("antigravity", new AntigravityAdapter({ config, registries }));
  adapters.register("pi", new PiAdapter({ config, registries }));
  adapters.register("opencode", new OpencodeAdapter({ config, registries }));
  const agentService = createAgentService({ adapters, registries, config });
  const coordination = coordinationFactory({ config });

  const tools = assertCompleteToolBindings([
    ...buildOrchestrationTools({ config }),
    ...buildTaskTools({ registries }),
    ...buildAgentTools({ agentService }),
    ...buildArtifactTools({ registries }),
    ...buildApprovalTools({ config }),
    ...buildMessageTools({ config }),
    ...buildSessionTools(),
    ...buildCoordinationTools({ coordination }),
  ]);
  let closePromise = null;
  Object.defineProperty(tools, REGISTRY_CLOSE, {
    value() {
      if (!closePromise) {
        closePromise = Promise.resolve().then(async () => {
          if (typeof coordination?.close === "function") {
            await coordination.close();
          }
          return { status: "closed" };
        });
      }
      return closePromise;
    },
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return tools;
}
