#!/usr/bin/env node
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
import { initState } from "./core/state.js";
import { createTelemetry, safeToolCallAttributes, traceIdForCall } from "./core/telemetry.js";
import { getToolContract } from "./tools/catalog.js";
import { getToolRegistry } from "./tools/index.js";

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

      const result = await tool.handler(request.params.arguments || {});
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
  const registries = loadRegistries({ policiesDir: config.policiesDir });
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
    }),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logErr("info", "gateway connected", { tools: tools.length, workspace: config.workspace });
  process.stdin.resume();
  await new Promise((resolve) => process.stdin.on("end", resolve));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    logErr("error", "gateway boot failed", { error: String(err), stack: err?.stack });
    process.exit(1);
  });
}
