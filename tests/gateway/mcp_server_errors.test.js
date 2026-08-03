import { test } from "node:test";
import assert from "node:assert/strict";

import { createCallToolHandler } from "../../gateway/src/mcp_server.js";

function request(name, args = {}) {
  return {
    params: {
      name,
      arguments: args,
    },
  };
}

function createSpan() {
  return {
    attributes: {},
    statuses: [],
    exceptions: [],
    ended: 0,
    setAttribute(key, value) {
      this.attributes[key] = value;
    },
    setAttributes(attributes) {
      Object.assign(this.attributes, attributes);
    },
    setStatus(status) {
      this.statuses.push(status);
    },
    recordException(error) {
      this.exceptions.push(error);
    },
    end() {
      this.ended += 1;
    },
  };
}

function fakeTelemetry(span) {
  return {
    starts: [],
    startSpan(name, options) {
      this.starts.push({ name, options });
      return span;
    },
  };
}

async function captureStderrDuring(callback) {
  const originalWrite = process.stderr.write;
  const chunks = [];
  process.stderr.write = function write(chunk, ...args) {
    chunks.push(String(chunk));
    return true;
  };

  try {
    const result = await callback();
    return { result, stderr: chunks.join("") };
  } finally {
    process.stderr.write = originalWrite;
  }
}

test("unknown tool rejects, records an ERROR span, and still appends audit", async () => {
  const span = createSpan();
  const telemetry = fakeTelemetry(span);
  const audits = [];
  const handler = createCallToolHandler({
    tools: [],
    telemetry,
    append: (event) => audits.push(event),
  });

  await assert.rejects(
    () => handler(request("demo.missing", { traceId: "tr-missing" })),
    /unknown tool/,
  );

  assert.equal(telemetry.starts[0].name, "mcp.tool.call");
  assert.equal(telemetry.starts[0].options.traceId, "tr-missing");
  assert.equal(span.statuses.at(-1).code, "ERROR");
  assert.equal(span.attributes["tool.name"], "demo.missing");
  assert.equal(span.attributes["result.status"], "error");
  assert.equal(span.exceptions.length, 1);
  assert.equal(span.ended, 1);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].traceId, "tr-missing");
  assert.equal(audits[0].toolName, "demo.missing");
  assert.equal(audits[0].status, "error");
});

test("tool handler exceptions propagate with recordException and span.end in finally", async () => {
  const span = createSpan();
  const thrown = new Error("tool failed");
  const handler = createCallToolHandler({
    tools: [
      {
        name: "demo.throw",
        handler: async () => {
          throw thrown;
        },
      },
    ],
    telemetry: fakeTelemetry(span),
    append: () => {},
  });

  await assert.rejects(() => handler(request("demo.throw", { traceId: "tr-throw" })), /tool failed/);

  assert.equal(span.statuses.at(-1).code, "ERROR");
  assert.equal(span.exceptions[0], thrown);
  assert.equal(span.ended, 1);
});

test("audit append failure emits a warning to stderr without affecting the tool response", async () => {
  const span = createSpan();
  const handler = createCallToolHandler({
    tools: [
      {
        name: "demo.ok",
        handler: async () => ({ content: [{ type: "text", text: JSON.stringify({ ok: true }) }] }),
      },
    ],
    telemetry: fakeTelemetry(span),
    append: () => {
      throw new Error("append failed");
    },
  });

  const { result, stderr } = await captureStderrDuring(() => handler(request("demo.ok", { traceId: "tr-append" })));

  assert.equal(JSON.parse(result.content[0].text).ok, true);
  assert.equal(span.statuses.at(-1).code, "OK");
  assert.equal(span.ended, 1);

  const lines = stderr.trim().split("\n").filter(Boolean);
  assert.equal(lines.length, 1);
  const warning = JSON.parse(lines[0]);
  assert.equal(warning.level, "warn");
  assert.equal(warning.component, "gateway");
  assert.equal(warning.msg, "tool call audit append failed");
  assert.match(warning.error, /append failed/);
});

test("tool error result extracts a top-level code and truncates it to 200 chars", async () => {
  const span = createSpan();
  const longCode = "E".repeat(250);
  const handler = createCallToolHandler({
    tools: [
      {
        name: "demo.error",
        contract: { publicErrorCodes: [longCode] },
        handler: async () => ({
          isError: true,
          content: [{ type: "text", text: JSON.stringify({ code: longCode }) }],
        }),
      },
    ],
    telemetry: fakeTelemetry(span),
    append: () => {},
  });

  await handler(request("demo.error", { traceId: "tr-error-code" }));

  assert.equal(span.statuses.at(-1).code, "ERROR");
  assert.equal(span.attributes["result.status"], "error");
  assert.equal(span.attributes["error.code"], "E".repeat(200));
  assert.equal(span.ended, 1);
});

test("tool error result with invalid JSON does not crash and omits error.code", async () => {
  const span = createSpan();
  const handler = createCallToolHandler({
    tools: [
      {
        name: "demo.invalid_json",
        handler: async () => ({
          isError: true,
          content: [{ type: "text", text: "{invalid-json" }],
        }),
      },
    ],
    telemetry: fakeTelemetry(span),
    append: () => {},
  });

  const result = await handler(request("demo.invalid_json", { traceId: "tr-invalid-json" }));

  assert.equal(result.isError, true);
  assert.equal(span.statuses.at(-1).code, "ERROR");
  assert.equal(span.attributes["error.code"], undefined);
  assert.equal(span.ended, 1);
});
