import { bindCatalogTool } from "./tool_helpers.js";

export function buildAgentTools({ agentService }) {
  return [
    bindCatalogTool(
      "agent.delegate",
      (args, requestBinding) => agentService.delegate(args, requestBinding),
    ),
    bindCatalogTool(
      "agent.spawn",
      (args, requestBinding) => agentService.spawn(args, requestBinding),
    ),
    bindCatalogTool("agent.ask", (args) => agentService.ask(args)),
    bindCatalogTool("agent.view", (args) => agentService.view(args)),
    bindCatalogTool("agent.kill", (args) => agentService.kill(args)),
  ];
}
