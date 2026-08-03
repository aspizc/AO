import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCallToolHandler } from "../../gateway/src/mcp_server.js";
import { GatewayTracer, InMemorySpanExporter } from "../../gateway/src/core/telemetry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SERVER = path.join(REPO_ROOT, "gateway", "src", "mcp_server.js");

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function telemetryHarness() {
  const exporter = new InMemorySpanExporter();
  const tracer = new GatewayTracer({ enabled: true, exporter, serviceName: "test-gateway" });
  const audits = [];
  return {
    exporter,
    audits,
    handler: createCallToolHandler({
      tools: [
        {
          name: "demo.ok",
          handler: async () => ({ content: [{ type: "text", text: JSON.stringify({ ok: true }) }] }),
        },
        {
          name: "demo.error_result",
          contract: { publicErrorCodes: ["DEMO_ERROR"] },
          handler: async () => ({
            isError: true,
            content: [{ type: "text", text: JSON.stringify({ error: "DEMO_ERROR", message: "redacted by tool" }) }],
          }),
        },
      ],
      telemetry: tracer,
      append: (event) => audits.push(event),
    }),
  };
}

function callRequest(name, args = {}, meta = undefined) {
  return {
    params: {
      name,
      arguments: args,
      ...(meta ? { _meta: meta } : {}),
    },
  };
}

function readJsonl(file) {
  return fs.readFileSync(file, "utf-8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function toolCallEvents(workspace) {
  const auditLog = path.join(workspace, "audit", "events.jsonl");
  return readJsonl(auditLog).filter((event) => event.type === "MCP_TOOL_CALL");
}

test("successful MCP tool call creates a safe OTel-compatible span", async () => {
  const { handler, exporter, audits } = telemetryHarness();

  await handler(
    callRequest("demo.ok", {
      traceId: "tr-incoming",
      sessionId: "ss-1",
      taskId: "ts-1",
      approvalMode: "manual",
      approvalScope: "code.apply",
      prompt: "must not be recorded",
    }),
  );

  assert.equal(exporter.spans.length, 1);
  assert.equal(exporter.spans[0].name, "mcp.tool.call");
  assert.equal(exporter.spans[0].traceId, "tr-incoming");
  assert.equal(exporter.spans[0].status.code, "OK");
  assert.deepEqual(exporter.spans[0].attributes, {
    "tool.name": "demo.ok",
    "trace.id": "tr-incoming",
    "session.id": "ss-1",
    "task.id": "ts-1",
    "approval.mode": "manual",
    "approval.scope": "code.apply",
    "result.status": "ok",
    "trace.source": "arguments",
  });
  assert.equal(audits[0].traceId, "tr-incoming");
  assert.equal(audits[0].status, "ok");
});

test("tool error result marks the span as error without recording payloads", async () => {
  const { handler, exporter } = telemetryHarness();

  await handler(callRequest("demo.error_result", { traceId: "tr-error", stderr: "must not be recorded" }));

  assert.equal(exporter.spans.length, 1);
  assert.equal(exporter.spans[0].status.code, "ERROR");
  assert.equal(exporter.spans[0].attributes["result.status"], "error");
  assert.equal(exporter.spans[0].attributes["error.code"], "DEMO_ERROR");
  assert.equal(exporter.spans[0].attributes.stderr, undefined);
  assert.deepEqual(exporter.spans[0].events, []);
});

test("unknown tool records an error span and exception event", async () => {
  const { handler, exporter, audits } = telemetryHarness();

  await assert.rejects(
    () => handler(callRequest("demo.missing", { trace_id: "tr-missing" })),
    /unknown tool/,
  );

  assert.equal(exporter.spans.length, 1);
  assert.equal(exporter.spans[0].traceId, "tr-missing");
  assert.equal(exporter.spans[0].status.code, "ERROR");
  assert.equal(exporter.spans[0].attributes["tool.name"], "demo.missing");
  assert.equal(exporter.spans[0].attributes["result.status"], "error");
  assert.equal(exporter.spans[0].events[0].name, "exception");
  assert.equal(exporter.spans[0].events[0].attributes["exception.type"], "Error");
  assert.equal(audits[0].traceId, "tr-missing");
});

test("incoming trace_id is preserved from metadata", async () => {
  const { handler, exporter } = telemetryHarness();

  await handler(callRequest("demo.ok", {}, { trace_id: "tr-meta" }));

  assert.equal(exporter.spans[0].traceId, "tr-meta");
  assert.equal(exporter.spans[0].attributes["trace.id"], "tr-meta");
  assert.equal(exporter.spans[0].attributes["trace.source"], "metadata");
});

test("trace source matches argument precedence when args and metadata both exist", async () => {
  const { handler, exporter } = telemetryHarness();

  await handler(callRequest("demo.ok", { traceId: "tr-args" }, { trace_id: "tr-meta" }));

  assert.equal(exporter.spans[0].traceId, "tr-args");
  assert.equal(exporter.spans[0].attributes["trace.id"], "tr-args");
  assert.equal(exporter.spans[0].attributes["trace.source"], "arguments");
});

test("tool calls without trace_id get a generated trace and stay compatible", async () => {
  const { handler, exporter, audits } = telemetryHarness();

  const result = await handler(callRequest("demo.ok"));

  assert.equal(JSON.parse(result.content[0].text).ok, true);
  assert.match(exporter.spans[0].traceId, /^tr-/);
  assert.equal(exporter.spans[0].attributes["trace.source"], "generated");
  assert.equal(audits[0].traceId, exporter.spans[0].traceId);
});

test("disabled telemetry still writes one safe MCP_TOOL_CALL audit event", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-audit-off-ws-"));
  const inputFile = path.join(workspace, "mcp-input.jsonl");
  const stdoutFile = path.join(workspace, "mcp-stdout.log");
  const stderrFile = path.join(workspace, "mcp-stderr.log");
  const requests = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "audit-off-smoke", version: "0" },
      },
    },
    {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    },
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "orchestration.create",
        arguments: {
          callerAgent: "claude-code",
          callerRole: "orchestrator",
          goal: "audit off smoke",
        },
        _meta: {
          trace_id: "tr-audit-off",
          prompt: "must not be audited",
          payload: { secret: "must not be audited" },
        },
      },
    },
  ];
  fs.writeFileSync(inputFile, `${requests.map((request) => JSON.stringify(request)).join("\n")}\n`);

  const command = [
    `AGENTS_WORKSPACE=${shellQuote(workspace)}`,
    "node",
    shellQuote(SERVER),
    "<",
    shellQuote(inputFile),
    ">",
    shellQuote(stdoutFile),
    "2>",
    shellQuote(stderrFile),
  ].join(" ");
  const result = spawnSync("bash", ["-lc", command], {
    stdio: "ignore",
    timeout: 2000,
  });

  assert.equal(result.status, 0);
  const toolResponse = readJsonl(stdoutFile).find((line) => line.id === 2);
  assert.equal(JSON.parse(toolResponse.result.content[0].text).goal, "audit off smoke");

  const events = toolCallEvents(workspace);
  assert.equal(events.length, 1);
  assert.equal(events[0].traceId, "tr-audit-off");
  assert.equal(events[0].toolName, "orchestration.create");
  assert.equal(events[0].status, "ok");
  assert.equal(events[0].prompt, undefined);
  assert.equal(events[0].payload, undefined);
  assert.equal(JSON.stringify(events[0]).includes("must not be audited"), false);
});

test("audit append failure does not break the tool response", async () => {
  const handler = createCallToolHandler({
    tools: [
      {
        name: "demo.ok",
        handler: async () => ({ content: [{ type: "text", text: JSON.stringify({ ok: true }) }] }),
      },
    ],
    append: () => {
      throw new Error("append failed");
    },
  });

  const result = await handler(callRequest("demo.ok", { traceId: "tr-append-failure" }));

  assert.equal(JSON.parse(result.content[0].text).ok, true);
});

test("enabled stderr exporter does not pollute MCP stdout", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-otel-ws-"));
  const inputFile = path.join(workspace, "mcp-input.jsonl");
  const stdoutFile = path.join(workspace, "mcp-stdout.log");
  const stderrFile = path.join(workspace, "mcp-stderr.log");
  const requests = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "otel-smoke", version: "0" },
      },
    },
    {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    },
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "orchestration.create",
        arguments: {
          callerAgent: "claude-code",
          callerRole: "orchestrator",
          goal: "otel smoke",
        },
        _meta: {
          prompt: "must not be audited",
          payload: { secret: "must not be audited" },
        },
      },
    },
  ];
  fs.writeFileSync(inputFile, `${requests.map((request) => JSON.stringify(request)).join("\n")}\n`);

  const command = [
    `AGENTS_WORKSPACE=${shellQuote(workspace)}`,
    "AGENTS_OTEL_ENABLED=1",
    "node",
    shellQuote(SERVER),
    "<",
    shellQuote(inputFile),
    ">",
    shellQuote(stdoutFile),
    "2>",
    shellQuote(stderrFile),
  ].join(" ");
  const result = spawnSync("bash", ["-lc", command], {
    stdio: "ignore",
    timeout: 2000,
  });

  assert.equal(result.status, 0);
  const stdoutLines = fs.readFileSync(stdoutFile, "utf-8").trim().split("\n").filter(Boolean);
  assert.ok(stdoutLines.length >= 2);
  const parsedStdout = stdoutLines.map((line) => JSON.parse(line));
  const toolResponse = parsedStdout.find((line) => line.id === 2);
  assert.equal(JSON.parse(toolResponse.result.content[0].text).goal, "otel smoke");

  const stderr = fs.readFileSync(stderrFile, "utf-8");
  const spanLine = stderr
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .find((line) => line.type === "otel_span");
  assert.equal(spanLine.name, "mcp.tool.call");
  assert.equal(spanLine.attributes["tool.name"], "orchestration.create");
  assert.equal(spanLine.status.code, "OK");

  const events = toolCallEvents(workspace);
  assert.equal(events.length, 1);
  const toolCallEvent = events[0];
  assert.equal(toolCallEvent.toolName, "orchestration.create");
  assert.equal(toolCallEvent.status, "ok");
  assert.equal(toolCallEvent.prompt, undefined);
  assert.equal(toolCallEvent.payload, undefined);
  assert.equal(JSON.stringify(toolCallEvent).includes("must not be audited"), false);
});
