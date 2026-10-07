#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { loadConfig } from "./config.js";
import { configureArtifactStore } from "./core/artifact_store.js";
import {
  append as auditAppend,
  appendLocalOnly as auditAppendLocalOnly,
  configureAudit,
} from "./core/audit.js";
import { loadRegistries } from "./core/registry.js";
import { configureSanitizer } from "./core/sanitizer.js";
import { createProcessTermination } from "./core/process_lifecycle.js";
import {
  createGatewayRequestContext,
  isRequestContextProtectedAction,
  revokeRequestContext,
  REQUEST_CONTEXT_ERROR,
} from "./core/request_context.js";
import { initState } from "./core/state.js";
import { createTelemetry, safeToolCallAttributes, traceIdForCall } from "./core/telemetry.js";
import { getToolContract } from "./tools/catalog.js";
import {
  closeToolRegistry,
  getToolRegistry,
} from "./tools/index.js";

const COORDINATION_TOOL_PREFIX = "coordination.";

function logErr(level, msg, extra = {}) {
  process.stderr.write(
    `${JSON.stringify({
      ts: new Date().toISOString(),
      level,
      component: "gateway",
      msg,
      ...extra,
    })}\n`,
  );
}

function publicErrorCode(toolName, candidate, contract) {
  if (typeof candidate !== "string") return undefined;
  const publicContract = contract || getToolContract(toolName);
  return publicContract?.publicErrorCodes.includes(candidate) ? candidate : undefined;
}

function parseToolErrorCode(result, tool) {
  if (!result?.isError) return undefined;
  const firstText = result.content?.find?.((item) => item?.type === "text")?.text;
  if (!firstText) return undefined;
  try {
    const parsed = JSON.parse(firstText);
    return publicErrorCode(
      tool?.name,
      parsed?.error || parsed?.code,
      tool?.contract,
    );
  } catch {
    return undefined;
  }
}

function isCoordinationToolName(value) {
  return typeof value === "string" && value.startsWith(COORDINATION_TOOL_PREFIX);
}

function coordinationAuditTraceId({ request, traceId, attributes }) {
  const source = attributes["trace.source"];
  if (source === "generated" || source === "metadata") return traceId;
  if (source !== "arguments" || attributes["tool.name"] !== "coordination.send") {
    return undefined;
  }

  const args = request?.params?.arguments;
  if (!args || typeof args !== "object" || Array.isArray(args)) return undefined;
  const supplied = args.traceId ?? args.trace_id;
  return typeof supplied === "string" && supplied.slice(0, 256) === traceId
    ? traceId
    : undefined;
}

function appendToolCallAudit({
  append,
  appendLocalOnly,
  request,
  traceId,
  attributes,
}) {
  const toolName = attributes["tool.name"];
  const coordination = isCoordinationToolName(toolName);
  const writer = coordination ? appendLocalOnly : append;
  if (!writer) return;

  try {
    if (coordination) {
      const safeTraceId = coordinationAuditTraceId({
        request,
        traceId,
        attributes,
      });
      const candidateErrorCode = attributes["error.code"];
      const errorCode = publicErrorCode(toolName, candidateErrorCode);
      writer({
        type: "MCP_TOOL_CALL",
        ...(safeTraceId === undefined ? {} : { traceId: safeTraceId }),
        toolName,
        status: attributes["result.status"],
        ...(errorCode === undefined ? {} : { errorCode }),
      });
      return;
    }

    writer({
      type: "MCP_TOOL_CALL",
      traceId,
      toolName,
      status: attributes["result.status"],
      sessionId: attributes["session.id"],
      taskId: attributes["task.id"],
      approvalMode: attributes["approval.mode"],
      approvalScope: attributes["approval.scope"],
    });
  } catch (err) {
    logErr("warn", "tool call audit append failed", { error: String(err?.message || err) });
  }
}

export function createCallToolHandler({
  tools,
  telemetry = createTelemetry({ telemetry: { enabled: false } }),
  append = auditAppend,
  appendLocalOnly = auditAppendLocalOnly,
  requestContext,
  transportBinding,
  now = () => new Date().toISOString(),
}) {
  return async (request, extra = {}) => {
    const traceId = traceIdForCall(request, extra);
    const initialAttributes = safeToolCallAttributes({ request, extra, traceId });
    const span = telemetry.startSpan("mcp.tool.call", {
      traceId,
      attributes: initialAttributes,
    });

    try {
      const tool = tools.find((candidate) => candidate.name === request.params.name);
      if (!tool) throw new Error("unknown tool");

      const protectedAction = isRequestContextProtectedAction(tool.name);
      if (protectedAction && tool.requestContextBoundary !== true) {
        throw new Error("protected tool is missing its request context boundary");
      }
      const invocation = protectedAction
        ? {
            requestContext,
            actionCatalogVersion: tool.actionCatalogVersion,
            audience: transportBinding?.audience,
            connectionId: transportBinding?.connectionId,
            now: now(),
          }
        : null;
      const result = await tool.handler(
        request.params.arguments || {},
        invocation,
      );
      const status = result?.isError ? "error" : "ok";
      const attributes = safeToolCallAttributes({ request, extra, traceId, status });
      const errorCode = parseToolErrorCode(result, tool);
      if (errorCode) attributes["error.code"] = String(errorCode).slice(0, 200);

      span.setAttributes(attributes);
      span.setStatus({ code: result?.isError ? "ERROR" : "OK" });
      appendToolCallAudit({
        append,
        appendLocalOnly,
        request,
        traceId,
        attributes,
      });
      return result;
    } catch (err) {
      const attributes = safeToolCallAttributes({ request, extra, traceId, status: "error" });
      // WHY A REFUSAL WAS REFUSED — IN THE OPERATOR'S LOG ONLY.
      //
      // `deny(reasonCode)` throws a RequestContextError carrying the exact check that fired —
      // trace_denied, capability_denied, expired, connection_mismatch and sixteen others — and
      // nothing recorded it anywhere. The client is deliberately told only
      // REQUEST_CONTEXT_DENIED, which is the right call for a sanitized surface; the cost was
      // that the OPERATOR could not see it either. Twenty distinct causes behind one
      // indistinguishable message.
      //
      // Two orchestrator sessions spent an afternoon doing black-box argument search against a
      // check that knew the answer and would not say it, and produced two confident wrong
      // diagnoses on the way. This changes NOT ONE BYTE of what the client receives; it writes
      // the reason where the person debugging can read it.
      if (err?.code === REQUEST_CONTEXT_ERROR && typeof err?.reasonCode === "string") {
        attributes["request_context.reason_code"] = err.reasonCode.slice(0, 120);
      }
      span.setAttributes(attributes);
      span.setStatus({ code: "ERROR" });
      span.recordException(err);
      appendToolCallAudit({
        append,
        appendLocalOnly,
        request,
        traceId,
        attributes,
      });
      throw err;
    } finally {
      span.end();
    }
  };
}

async function main() {
  const config = loadConfig();
  const registries = loadRegistries({
    policiesDir: config.policiesDir,
    repositoriesOverlay: config.repositoriesOverlay,
  });
  initState({ stateDb: config.stateDb });
  configureAudit({
    auditLog: config.auditLog,
    redisUrl: config.redisUrl,
    redisStream: config.redisStream,
  });
  configureArtifactStore({ artifactStoreRoot: config.artifactStoreRoot });
  configureSanitizer({ rulesPath: path.join(config.policiesDir, "sanitization-rules.json") });
  auditAppend({ type: "GATEWAY_BOOT", workspace: config.workspace });

  const server = new Server(
    { name: "agents-gateway", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  const tools = getToolRegistry({ config, registries });
  const telemetry = createTelemetry(config);
  const transportBinding = {
    audience: "agents-gateway",
    connectionId: crypto.randomUUID(),
  };
  const requestContext = createGatewayRequestContext({
    config,
    registries,
    actionCatalogVersion: tools[0]?.actionCatalogVersion,
    connectionId: transportBinding.connectionId,
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  }));

  server.setRequestHandler(
    CallToolRequestSchema,
    createCallToolHandler({
      tools,
      telemetry,
      append: auditAppend,
      appendLocalOnly: auditAppendLocalOnly,
      requestContext,
      transportBinding,
    }),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logErr("info", "gateway connected", { tools: tools.length, workspace: config.workspace });
  const termination = createProcessTermination({
    input: process.stdin,
    signals: process,
  });
  let stopped;
  try {
    process.stdin.resume();
    stopped = await termination.wait;
  } finally {
    termination.dispose();
    revokeRequestContext(requestContext);
    try {
      await closeToolRegistry(tools);
    } finally {
      try {
        await server.close();
      } catch (err) {
        logErr("warn", "gateway transport close failed", {
          error: String(err?.message || err),
        });
      } finally {
        process.stdin.pause();
      }
    }
  }
  logErr("info", "gateway stopped", stopped);
  if (stopped.signal === "SIGINT") process.exitCode = 130;
  if (stopped.signal === "SIGTERM") process.exitCode = 143;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    logErr("error", "gateway boot failed", { error: String(err), stack: err?.stack });
    process.exit(1);
  });
}
