import * as approvalService from "../services/approval_service.js";
import { bindCatalogTool } from "./tool_helpers.js";

export function buildApprovalTools({ config = {} } = {}) {
  const approvalMaxWaitMs = config.approvalMaxWaitMs || 60_000;
  return [
    bindCatalogTool(
      "approval.request",
      (args) => approvalService.request({ ...args, config }),
    ),
    bindCatalogTool("approval.respond", approvalService.respond),
    bindCatalogTool("approval.poll", approvalService.poll),
    bindCatalogTool(
      "approval.wait",
      ({ approvalId, timeoutMs }) =>
        approvalService.waitForDecision({ approvalId, timeoutMs, serverMaxMs: approvalMaxWaitMs }),
    ),
  ];
}
