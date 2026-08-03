import {
  COORDINATION_SERVICE_LIMITS,
} from "../core/coordination_contract.js";
import { bindCatalogTool } from "./tool_helpers.js";

export function buildCoordinationTools({ coordination }) {
  const leaseMaxMs =
    coordination?.[COORDINATION_SERVICE_LIMITS]?.leaseMaxMs
    ?? undefined;
  const validationOptions = { validationContext: { leaseMaxMs } };

  return [
    bindCatalogTool("coordination.status", (args) => coordination.status(args)),
    bindCatalogTool(
      "coordination.register",
      (args) => coordination.register(args),
      validationOptions,
    ),
    bindCatalogTool(
      "coordination.heartbeat",
      (args) => coordination.heartbeat(args),
      validationOptions,
    ),
    bindCatalogTool("coordination.discover", (args) => coordination.discover(args)),
    bindCatalogTool("coordination.unregister", (args) => coordination.unregister(args)),
    bindCatalogTool("coordination.send", (args) => coordination.send(args)),
    bindCatalogTool("coordination.receive", (args) => coordination.receive(args)),
    bindCatalogTool("coordination.ack", (args) => coordination.ack(args)),
  ];
}
