import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  _resetForTests as resetAudit,
  configureAudit,
} from "../../gateway/src/core/audit.js";
import {
  createCoordination,
} from "../../gateway/src/coordination.js";
import {
  createCallToolHandler,
} from "../../gateway/src/mcp_server.js";

const TOKEN_SENTINEL = "lease-token-never-audit-1234567890abcdef";
const BODY_SENTINEL = "body-never-audit-4f6fbdbe";
const METADATA_SENTINEL = "metadata-never-audit-975c6c20";
const ERROR_SENTINEL = "error-never-audit-f57e4888";

function workspace(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "coordination-audit-"));
  t.after(() => {
    resetAudit();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return {
    auditLog: path.join(directory, "audit", "events.jsonl"),
  };
}

function readEvents(auditLog) {
  if (!fs.existsSync(auditLog)) return [];
  return fs
    .readFileSync(auditLog, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function assertNoSensitiveAuditMaterial(value) {
  const serialized = JSON.stringify(value);
  for (const sentinel of [
    TOKEN_SENTINEL,
    BODY_SENTINEL,
    METADATA_SENTINEL,
    ERROR_SENTINEL,
  ]) {
    assert.equal(serialized.includes(sentinel), false, sentinel);
  }
  for (const key of [
    "body",
    "metadata",
    "leaseToken",
    "leaseTokenHash",
    "digest",
    "redisUrl",
  ]) {
    assert.equal(serialized.includes(`\"${key}\"`), false, key);
  }
}

test("default direct coordination audit is metadata-only JSONL and never Redis", async (t) => {
  resetAudit();
  const { auditLog } = workspace(t);
  const published = [];
  const stored = [];
  configureAudit({
    auditLog,
    redisPublisher: (entry) => published.push(entry),
  });
  const coordination = createCoordination({
    queue: {
      enabled: true,
      describe() {
        return {
          enabled: true,
          prefix: "test:coord:audit:v1",
          eventsStream: "test:coord:audit:v1:events",
          consumerGroup: "coordination-v1",
        };
      },
      async putParticipant(record) {
        stored.push(structuredClone(record));
        return { status: "stored" };
      },
    },
    clock: () => Date.parse("2026-07-25T12:00:00.000Z"),
    randomUUID: () => "audit-participant",
    randomToken: () => TOKEN_SENTINEL,
  });

  const registered = await coordination.register({
    participantType: "orchestrator",
    scopeId: "project:v5",
    metadata: {
      note: METADATA_SENTINEL,
    },
  });
  const events = readEvents(auditLog);

  assert.equal(registered.leaseToken, TOKEN_SENTINEL);
  assert.equal(stored.length, 1);
  assert.notEqual(stored[0].leaseTokenHash, TOKEN_SENTINEL);
  assert.equal(published.length, 0);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "COORDINATION_PARTICIPANT_REGISTERED");
  assert.equal(events[0].participantId, registered.participantId);
  assertNoSensitiveAuditMaterial(events);
});

test("coordination MCP-call audit stays local and minimally projected", async (t) => {
  resetAudit();
  const { auditLog } = workspace(t);
  const published = [];
  configureAudit({
    auditLog,
    redisPublisher: (entry) => published.push(entry),
  });
  const result = (payload, isError = false) => ({
    content: [{ type: "text", text: JSON.stringify(payload) }],
    ...(isError ? { isError: true } : {}),
  });
  const tools = [
    {
      name: "coordination.register",
      handler: async () => result({ status: "registered" }),
    },
    {
      name: "coordination.send",
      handler: async () =>
        result(
          {
            error: "COORDINATION_AUTH_FAILED",
            code: "COORDINATION_AUTH_FAILED",
            message: ERROR_SENTINEL,
            body: BODY_SENTINEL,
            leaseToken: TOKEN_SENTINEL,
          },
          true,
        ),
    },
    {
      name: "coordination.receive",
      handler: async () =>
        result(
          {
            error: ERROR_SENTINEL,
            code: ERROR_SENTINEL,
            message: ERROR_SENTINEL,
          },
          true,
        ),
    },
    {
      name: "demo.ok",
      handler: async () => result({ ok: true }),
    },
  ];
  const handler = createCallToolHandler({ tools });

  await handler({
    params: {
      name: "coordination.register",
      arguments: {
        metadata: {
          traceId: METADATA_SENTINEL,
          sessionId: METADATA_SENTINEL,
          taskId: METADATA_SENTINEL,
        },
        leaseToken: TOKEN_SENTINEL,
      },
    },
  });
  await handler({
    params: {
      name: "coordination.send",
      arguments: {
        traceId: "tr-safe-coordination-send",
        leaseToken: TOKEN_SENTINEL,
        body: BODY_SENTINEL,
      },
    },
  });
  await handler({
    params: {
      name: "coordination.receive",
      arguments: {
        leaseToken: TOKEN_SENTINEL,
      },
    },
  });
  await handler({
    params: {
      name: "demo.ok",
      arguments: {
        traceId: "tr-legacy-tool",
        sessionId: "ss-legacy",
        taskId: "ts-legacy",
        approvalMode: "manual",
        approvalScope: "code.apply",
      },
    },
  });
  await assert.rejects(
    handler({
      params: {
        name: "coordination.missing",
        arguments: {
          body: BODY_SENTINEL,
          leaseToken: TOKEN_SENTINEL,
        },
        _meta: {
          trace_id: "tr-safe-missing",
        },
      },
    }),
    /unknown tool/,
  );

  const events = readEvents(auditLog);
  const coordinationEvents = events.filter(({ toolName }) =>
    toolName?.startsWith("coordination."));
  const legacyEvent = events.find(({ toolName }) => toolName === "demo.ok");

  assert.equal(coordinationEvents.length, 4);
  assert.deepEqual(
    coordinationEvents.map(({ toolName, status }) => ({ toolName, status })),
    [
      { toolName: "coordination.register", status: "ok" },
      { toolName: "coordination.send", status: "error" },
      { toolName: "coordination.receive", status: "error" },
      { toolName: "coordination.missing", status: "error" },
    ],
  );
  assert.equal(
    coordinationEvents.find(({ toolName }) => toolName === "coordination.register").traceId,
    undefined,
  );
  assert.equal(
    coordinationEvents.find(({ toolName }) => toolName === "coordination.send").traceId,
    "tr-safe-coordination-send",
  );
  assert.equal(
    coordinationEvents.find(({ toolName }) => toolName === "coordination.send").errorCode,
    "COORDINATION_AUTH_FAILED",
  );
  assert.equal(
    coordinationEvents.find(({ toolName }) => toolName === "coordination.receive").errorCode,
    undefined,
  );
  assert.equal(
    coordinationEvents.find(({ toolName }) => toolName === "coordination.missing").traceId,
    "tr-safe-missing",
  );
  for (const event of coordinationEvents) {
    assert.deepEqual(
      Object.keys(event).sort(),
      [
        "errorCode",
        "eventId",
        "status",
        "timestamp",
        "toolName",
        "traceId",
        "type",
      ].filter((key) => event[key] !== undefined).sort(),
    );
  }
  assert.equal(legacyEvent.traceId, "tr-legacy-tool");
  assert.equal(legacyEvent.sessionId, "ss-legacy");
  assert.equal(legacyEvent.taskId, "ts-legacy");
  assert.equal(legacyEvent.approvalMode, "manual");
  assert.equal(legacyEvent.approvalScope, "code.apply");

  assert.equal(published.length, 1);
  assert.equal(published[0].stream, "agents:events");
  assert.equal(published[0].envelope.event_type, "MCP_TOOL_CALL");
  assert.equal(published[0].envelope.tool_name, "demo.ok");
  assertNoSensitiveAuditMaterial(coordinationEvents);
});

test("disabled MCP-call audit disables both legacy and coordination writers", async (t) => {
  resetAudit();
  const { auditLog } = workspace(t);
  const published = [];
  configureAudit({
    auditLog,
    redisPublisher: (entry) => published.push(entry),
  });
  const tools = [
    {
      name: "coordination.register",
      handler: async () => ({
        content: [{ type: "text", text: "{\"ok\":true}" }],
      }),
    },
    {
      name: "demo.ok",
      handler: async () => ({
        content: [{ type: "text", text: "{\"ok\":true}" }],
      }),
    },
  ];
  const handler = createCallToolHandler({
    tools,
    append: null,
    appendLocalOnly: null,
  });

  await handler({
    params: {
      name: "coordination.register",
      arguments: {},
    },
  });
  await handler({
    params: {
      name: "demo.ok",
      arguments: {},
    },
  });

  assert.deepEqual(readEvents(auditLog), []);
  assert.deepEqual(published, []);
});
