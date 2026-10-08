import { createRequire } from "node:module";
import { createRequestRecoveryService } from "../../../gateway/src/services/request_recovery_service.js";
import { createLocalRecoveryOwner, priorGatewayOwnerAbsent } from "../../../gateway/src/adapters/request_recovery_observations.js";
import { createRequestContext, bindRequestContext } from "../../../gateway/src/core/request_context.js";
import { createCallToolHandler } from "../../../gateway/src/mcp_server.js";
import { buildRecoveryTools } from "../../../gateway/src/tools/orchestration.js";
import { defineTool } from "../../../gateway/src/tools/tool_helpers.js";

const require = createRequire(new URL("../../../gateway/package.json", import.meta.url));
process.once("message", (input) => {
  const database = new (require("better-sqlite3"))(input.stateDb);
  database.backend = "sqlite";
  const owner = createLocalRecoveryOwner(input.connectionId);
  const recovery = createRequestRecoveryService({ database, identity: { ...input.identity, verify: () => true }, owner,
    // The original fixture owner is synthetic; competing owners are observed by the real production helper.
    priorOwnerAbsent: (previous) => previous?.connectionId === "original" || priorGatewayOwnerAbsent(previous), probeTarget: () => true });
  const ctx = createRequestContext({ principalId: input.identity.principalId, agent: "codex", role: "orchestrator",
    audience: "agents-gateway", connectionId: input.connectionId, issuedAt: "2026-10-07T00:00:00.000Z",
    expiresAt: input.expiresAt, repositoryBindings: input.repositories, recovery,
    capabilities: ["orchestration.reattach", "orchestration.view", "agent.view", "agent.spawn"] });
  const tools = [...buildRecoveryTools(), defineTool({ name: "agent.view", handler: () => ({ snapshot: "winner" }) }),
    defineTool({ name: "orchestration.view", handler: () => ({ status: "owned" }) })];
  const call = createCallToolHandler({ tools, requestContext: ctx, transportBinding: { audience: ctx.audience, connectionId: ctx.connectionId },
    now: () => input.now, append: null, appendLocalOnly: null, denialObserver: () => {} });
  const invoke = (name, args) => call({ params: { name, arguments: args } });
  process.once("message", async () => {
    const claim = await invoke("orchestration.reattach", { traceId: input.traceId });
    const session = await invoke("agent.view", { sessionId: "ss-one" });
    const trace = await invoke("orchestration.view", { traceId: input.traceId });
    let taskOwned = false;
    try {
      bindRequestContext(ctx, { action: "agent.spawn", actionCatalogVersion: 1, audience: ctx.audience, connectionId: ctx.connectionId,
        now: input.now, args: { traceId: input.traceId, taskId: "ts-one", agent: "codex", role: "coder", repo: "app", cwd: input.repositories.app } });
      taskOwned = true;
    } catch { /* A losing claim must have no task authority. */ }
    process.send({ claim, session, trace, taskOwned, connectionId: input.connectionId });
    process.once("message", () => { database.close(); process.disconnect(); });
  });
  process.send("ready");
});
