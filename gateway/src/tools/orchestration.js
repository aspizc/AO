import * as orchestrationService from "../services/orchestration_service.js";
import { createTraceAccessToken } from "../core/trace_access.js";
import { bindCatalogTool } from "./tool_helpers.js";
import { discoverRequestContextTraces, reattachRequestContextTrace } from "../core/request_context.js";

export function buildOrchestrationTools({ config = {} } = {}) {
  return [
    bindCatalogTool(
      "orchestration.create",
      (args) => {
        const row = orchestrationService.createOrchestration(args);

        return { ...row, messageAccessToken: createTraceAccessToken(row.traceId, config) };
      },
    ),
    bindCatalogTool("orchestration.view", (args, effective) => args.traceId === undefined
      ? discoverRequestContextTraces(effective) : orchestrationService.viewOrchestration(args)),
    bindCatalogTool("orchestration.pause", orchestrationService.pauseOrchestration),
    bindCatalogTool("orchestration.resume", orchestrationService.resumeOrchestration),
    bindCatalogTool("orchestration.cancel", orchestrationService.cancelOrchestration),
    bindCatalogTool("orchestration.complete", orchestrationService.completeOrchestration),
  ];
}

export function buildRecoveryTools() {
  return [bindCatalogTool("orchestration.reattach", (_args, effective) => reattachRequestContextTrace(effective))];
}
