import { test } from "node:test";
import assert from "node:assert/strict";

import {
  InMemorySpanExporter,
  createTelemetry,
  safeToolCallAttributes,
  traceIdForCall,
} from "../../gateway/src/core/telemetry.js";

function captureStderrDuring(callback) {
  const originalWrite = process.stderr.write;
  const chunks = [];
  process.stderr.write = function write(chunk, ...args) {
    chunks.push(String(chunk));
    return true;
  };

  try {
    const result = callback();
    return { result, stderr: chunks.join("") };
  } finally {
    process.stderr.write = originalWrite;
  }
}

function request(name, args = {}, meta = undefined) {
  return {
    params: {
      name,
      arguments: args,
      ...(meta ? { _meta: meta } : {}),
    },
  };
}

test("disabled telemetry returns a tolerant no-op span", () => {
  const telemetry = createTelemetry({ telemetry: { enabled: false } });
  const span = telemetry.startSpan("mcp.tool.call", { traceId: "tr-disabled" });

  assert.doesNotThrow(() => {
    span.setAttribute("key", "value");
    span.setAttributes({ another: "value" });
    span.setStatus({ code: "ERROR" });
    span.recordException(new Error("ignored"));
    span.end();
    span.end();
  });
});

test("traceIdForCall extracts real request shapes with argument precedence", () => {
  assert.equal(traceIdForCall(request("demo", { traceId: "tr-arg-camel" })), "tr-arg-camel");
  assert.equal(traceIdForCall(request("demo", { trace_id: "tr-arg-snake" })), "tr-arg-snake");
  assert.equal(traceIdForCall(request("demo", { metadata: { traceId: "tr-metadata-camel" } })), "tr-metadata-camel");
  assert.equal(traceIdForCall(request("demo", { metadata: { trace_id: "tr-metadata-snake" } })), "tr-metadata-snake");
  assert.equal(traceIdForCall(request("demo", { context: { traceId: "tr-context-camel" } })), "tr-context-camel");
  assert.equal(traceIdForCall(request("demo", { context: { trace_id: "tr-context-snake" } })), "tr-context-snake");
  assert.equal(traceIdForCall(request("demo", {}, { trace_id: "tr-params-meta" })), "tr-params-meta");
  assert.equal(traceIdForCall(request("demo"), { _meta: { traceId: "tr-extra-meta" } }), "tr-extra-meta");

  assert.equal(traceIdForCall(request("demo", { traceId: "tr-args" }, { traceId: "tr-meta" })), "tr-args");
});

test("traceIdForCall generates a trace when none is supplied", () => {
  assert.match(traceIdForCall(request("demo")), /^tr-/);
});

test("safeToolCallAttributes records only allowlisted metadata and truncates values to 200 chars", () => {
  const longSession = "s".repeat(250);
  const attributes = safeToolCallAttributes({
    request: request("demo.tool", {
      traceId: "tr-safe",
      sessionId: longSession,
      taskId: "ts-1",
      approvalMode: "manual",
      approvalScope: "code.apply",
      prompt: "must not be recorded",
      payload: { secret: "must not be recorded" },
      command: "must not be recorded",
      args: ["must not be recorded"],
      stderr: "must not be recorded",
    }),
    traceId: "tr-safe",
    status: "ok",
  });

  assert.deepEqual(Object.keys(attributes).sort(), [
    "approval.mode",
    "approval.scope",
    "result.status",
    "session.id",
    "task.id",
    "tool.name",
    "trace.id",
    "trace.source",
  ]);
  assert.equal(attributes["session.id"], "s".repeat(200));
  assert.equal(JSON.stringify(attributes).includes("must not be recorded"), false);
});

test("safeToolCallAttributes marks metadata and generated trace sources", () => {
  const fromMeta = safeToolCallAttributes({
    request: request("demo.tool", {}, { trace_id: "tr-meta" }),
    traceId: "tr-meta",
  });
  const generated = safeToolCallAttributes({
    request: request("demo.tool"),
    traceId: "tr-generated",
  });

  assert.equal(fromMeta["trace.source"], "metadata");
  assert.equal(generated["trace.source"], "generated");
});

test("in-memory exporter receives one span at end", () => {
  const exporter = new InMemorySpanExporter();
  const telemetry = createTelemetry({
    telemetry: { enabled: true, exporterInstance: exporter, serviceName: "unit-gateway" },
  });
  const span = telemetry.startSpan("unit.span", { traceId: "tr-memory", attributes: { "tool.name": "demo" } });

  span.setStatus({ code: "OK" });
  span.end();
  span.end();

  assert.equal(exporter.spans.length, 1);
  assert.equal(exporter.spans[0].name, "unit.span");
  assert.equal(exporter.spans[0].traceId, "tr-memory");
  assert.equal(exporter.spans[0].resource["service.name"], "unit-gateway");
  assert.equal(exporter.spans[0].attributes["tool.name"], "demo");
  assert.equal(exporter.spans[0].status.code, "OK");
});

test("stderr exporter writes one JSON line per span end", () => {
  const { stderr } = captureStderrDuring(() => {
    const telemetry = createTelemetry({ telemetry: { enabled: true, serviceName: "stderr-gateway" } });
    const span = telemetry.startSpan("stderr.span", { traceId: "tr-stderr", attributes: { "tool.name": "demo" } });

    span.setStatus({ code: "OK" });
    span.end();
  });

  const lines = stderr.trim().split("\n").filter(Boolean);
  assert.equal(lines.length, 1);
  const parsed = JSON.parse(lines[0]);
  assert.equal(parsed.type, "otel_span");
  assert.equal(parsed.name, "stderr.span");
  assert.equal(parsed.traceId, "tr-stderr");
  assert.equal(parsed.resource["service.name"], "stderr-gateway");
  assert.equal(parsed.status.code, "OK");
});
