import { bindCatalogTool } from "./tool_helpers.js";

export function buildAgentTools({ agentService }) {
  return [
    bindCatalogTool("agent.delegate", (args) => agentService.delegate(args)),
    bindCatalogTool("agent.spawn", (args) => agentService.spawn(args)),
    bindCatalogTool("agent.ask", (args) => agentService.ask(args)),
    bindCatalogTool("agent.view", (args) => agentService.view(args)),
    bindCatalogTool("agent.kill", (args) => agentService.kill(args)),
  ];
}
