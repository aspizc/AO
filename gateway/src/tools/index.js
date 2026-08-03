import { ClaudeAdapter } from "../adapters/claude_adapter.js";
import { CodexAdapter } from "../adapters/codex_adapter.js";
import { GeminiAdapter } from "../adapters/gemini_adapter.js";
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

export function getToolRegistry({
  config,
  registries,
  coordinationFactory = createCoordination,
} = {}) {
  const adapters = createAdapterRegistry({ config, registries });
  adapters.register("gemini-cli", new GeminiAdapter({ config, registries }));
  adapters.register("claude-code", new ClaudeAdapter({ config, registries }));
  adapters.register("codex", new CodexAdapter({ config, registries }));
  const agentService = createAgentService({ adapters, registries, config });
  const coordination = coordinationFactory({ config });

  return assertCompleteToolBindings([
    ...buildOrchestrationTools({ config }),
    ...buildTaskTools({ registries }),
    ...buildAgentTools({ agentService }),
    ...buildArtifactTools({ registries }),
    ...buildApprovalTools({ config }),
    ...buildMessageTools({ config }),
    ...buildSessionTools(),
    ...buildCoordinationTools({ coordination }),
  ]);
}
