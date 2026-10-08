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
    bindCatalogTool("agent.ask", (args, requestBinding) => agentService.ask(args, requestBinding)),
    bindCatalogTool("agent.view", (args, requestBinding) => agentService.view(args, requestBinding)),
    bindCatalogTool("agent.kill", (args, requestBinding) => agentService.kill(args, requestBinding)),
  ];
}
