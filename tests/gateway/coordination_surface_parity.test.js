import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createCoordination,
} from "../../gateway/src/coordination.js";
import {
  createCallToolHandler,
} from "../../gateway/src/mcp_server.js";
import {
  buildCoordinationTools,
} from "../../gateway/src/tools/coordination.js";
import {
  validateCatalogInput,
} from "../../gateway/src/tools/catalog.js";
import {
  MemoryCoordinationQueue,
} from "./helpers/memory_coordination_queue.js";

const FIXED_NOW = Date.parse("2026-07-25T14:00:00.000Z");
const LEASE_TOKENS = Object.freeze([
  "lease-token-recipient-0000000000000001",
  "lease-token-primary-000000000000000001",
  "lease-token-spare-0000000000000000001",
]);
const TRANSCRIPT_OPERATIONS = Object.freeze([
  "register",
  "heartbeat",
  "discover",
  "send",
  "receive",
  "ack",
  "unregister",
]);

function takeFixture(fixtures, name) {
  const value = fixtures.shift();
  if (value === undefined) throw new Error(`${name} fixture exhausted`);
  return value;
}

function createHarness({
  uuids = ["recipient", "primary", "message"],
  leaseTokens = LEASE_TOKENS,
  config = {},
} = {}) {
  const remainingUuids = [...uuids];
  const remainingTokens = [...leaseTokens];
  const domainAudit = [];
  const callAudit = [];
  const legacyAudit = [];
  const queue = new MemoryCoordinationQueue();
  const service = createCoordination({
    queue,
    config: {
      coordinationLeaseDefaultMs: 30_000,
      coordinationLeaseMaxMs: 300_000,
      coordinationMessageMaxBytes: 65_536,
      coordinationMaxBlockMs: 30_000,
      ...config,
    },
    clock: () => FIXED_NOW,
    randomUUID: () => takeFixture(remainingUuids, "UUID"),
    randomToken: () => takeFixture(remainingTokens, "lease token"),
    audit: (event) => domainAudit.push(structuredClone(event)),
  });

  return {
    queue,
    service,
    domainAudit,
    callAudit,
    legacyAudit,
  };
}

function mcpSurface(harness) {
  const tools = buildCoordinationTools({ coordination: harness.service });
  const handler = createCallToolHandler({
    tools,
    append: (event) => harness.legacyAudit.push(structuredClone(event)),
    appendLocalOnly: (event) => harness.callAudit.push(structuredClone(event)),
  });

  return async (operation, args) => {
    const result = await handler({
      params: {
        name: `coordination.${operation}`,
        arguments: args,
      },
    });
    assert.equal(result?.isError === true, false, `${operation} MCP call failed`);
    return JSON.parse(result.content[0].text);
  };
}

function directSurface(harness) {
  return (operation, args) => harness.service[operation](args);
}

function publicRegistration(result) {
  assert.equal(
    typeof result?.leaseToken === "string" && result.leaseToken.length >= 32,
    true,
    "registration returned an invalid lease token",
  );
  const { leaseToken: _leaseToken, ...publicResult } = result;
  return {
    ...publicResult,
    leaseToken: "<redacted>",
  };
}

function hasExactKey(value, forbiddenKey) {
  if (!value || typeof value !== "object") return false;
  if (Object.hasOwn(value, forbiddenKey)) return true;
  return Object.values(value).some((item) => hasExactKey(item, forbiddenKey));
}

function assertNoTokenPersistence(harness, leaseTokens = LEASE_TOKENS) {
  const queueState = harness.queue.snapshot();
  const auditState = {
    domain: harness.domainAudit,
    calls: harness.callAudit,
    legacy: harness.legacyAudit,
  };
  const serializedState = JSON.stringify({ queueState, auditState });
  const serializedAudit = JSON.stringify(auditState);

  assert.equal(
    leaseTokens.some((leaseToken) => serializedState.includes(leaseToken)),
    false,
    "a raw lease token persisted in the harness",
  );
  assert.equal(
    hasExactKey(queueState, "leaseToken"),
    false,
    "the queue persisted a raw lease token field",
  );
  for (const key of ["leaseToken", "leaseTokenHash", "body", "metadata"]) {
    assert.equal(
      serializedAudit.includes(`"${key}"`),
      false,
      `audit persisted forbidden ${key} material`,
    );
  }
  assert.deepEqual(
    harness.legacyAudit,
    [],
    "coordination calls must not use the legacy audit writer",
  );
}

async function registerRecipient(service) {
  return service.register({
    participantType: "agent",
    scopeId: "project:v5",
    displayName: "Review agent",
    capabilities: ["coordination.v1", "task.review"],
  });
}

async function runTranscript(kind) {
  const harness = createHarness();
  const recipient = await registerRecipient(harness.service);
  const invoke = kind === "mcp" ? mcpSurface(harness) : directSurface(harness);
  const transcript = [];

  const registered = await invoke("register", {
    participantType: "orchestrator",
    scopeId: "project:v5",
    displayName: "Primary orchestrator",
    capabilities: ["coordination.v1"],
    metadata: {
      generation: 5,
      ready: true,
    },
    leaseTtlMs: 30_000,
  });
  transcript.push({
    operation: "register",
    result: publicRegistration(registered),
  });

  const credentials = {
    participantId: registered.participantId,
    leaseToken: registered.leaseToken,
  };
  transcript.push({
    operation: "heartbeat",
    result: await invoke("heartbeat", {
      ...credentials,
      leaseTtlMs: 45_000,
    }),
  });
  transcript.push({
    operation: "discover",
    result: await invoke("discover", {
      ...credentials,
      scopeId: "project:v5",
      participantType: "agent",
      capability: "task.review",
    }),
  });

  const sent = await invoke("send", {
    ...credentials,
    toParticipantId: recipient.participantId,
    messageId: "cm-parity-request",
    messageType: "CHANGE_REQUEST",
    classification: "internal",
    body: "{\"path\":\"plan/PROJECT_V5\"}",
    traceId: "trace-parity",
    correlationId: "review-parity",
  });
  transcript.push({
    operation: "send",
    result: sent,
  });

  const deliveries = await invoke("receive", {
    participantId: recipient.participantId,
    leaseToken: recipient.leaseToken,
    consumerId: "parity-reviewer",
    count: 10,
    reclaimIdleMs: 0,
    blockMs: 0,
  });
  transcript.push({
    operation: "receive",
    result: deliveries,
  });
  transcript.push({
    operation: "ack",
    result: await invoke("ack", {
      participantId: recipient.participantId,
      leaseToken: recipient.leaseToken,
      deliveryIds: [deliveries[0].deliveryId],
    }),
  });
  transcript.push({
    operation: "unregister",
    result: await invoke("unregister", credentials),
  });

  return { harness, transcript };
}

async function mcpErrorCode(invoke, operation, args) {
  const result = await invoke(operation, args);
  assert.equal(result?.isError, true, `${operation} MCP call unexpectedly succeeded`);
  return JSON.parse(result.content[0].text).error;
}

async function directErrorCode(service, operation, args) {
  let code;
  try {
    await service[operation](args);
  } catch (error) {
    code = error?.code;
  }
  assert.equal(typeof code, "string", `${operation} direct call unexpectedly succeeded`);
  return code;
}

function rawMcpSurface(harness) {
  const tools = buildCoordinationTools({ coordination: harness.service });
  const handler = createCallToolHandler({
    tools,
    append: (event) => harness.legacyAudit.push(structuredClone(event)),
    appendLocalOnly: (event) => harness.callAudit.push(structuredClone(event)),
  });
  return (operation, args) =>
    handler({
      params: {
        name: `coordination.${operation}`,
        arguments: args,
      },
    });
}

test("direct and MCP surfaces return the same public transcript for all seven operations", async () => {
  const direct = await runTranscript("direct");
  const mcp = await runTranscript("mcp");

  assert.deepEqual(
    direct.transcript.map(({ operation }) => operation),
    TRANSCRIPT_OPERATIONS,
  );
  assert.deepEqual(mcp.transcript, direct.transcript);
  assertNoTokenPersistence(direct.harness);
  assertNoTokenPersistence(mcp.harness);
});

test("direct and MCP status and canonical registration expose the same orchestrator contract", async () => {
  const config = {
    coordinationScopeId: "agents-orchestrator",
    coordinationLeaseDefaultMs: 900_000,
    coordinationLeaseMaxMs: 3_600_000,
  };
  const directHarness = createHarness({ config });
  const mcpHarness = createHarness({ config });
  const invokeMcp = mcpSurface(mcpHarness);

  assert.deepEqual(
    await invokeMcp("status", {}),
    await directHarness.service.status({}),
  );

  const input = {
    participantType: "orchestrator",
    capabilities: ["v1.6"],
    leaseTtlMs: 3_600_000,
  };
  const direct = await directHarness.service.register(input);
  const mcp = await invokeMcp("register", input);
  assert.deepEqual(mcp, direct);
  assert.equal(direct.scopeId, "agents-orchestrator");
  assert.deepEqual(direct.capabilities, ["v1.6"]);
  assert.equal(direct.leaseExpiresAt, "2026-07-25T15:00:00.000Z");
});

test("direct and MCP preserve the configured lease field and maximum error", async () => {
  for (const leaseTtlMs of [300_001, 3_600_001]) {
    const harness = createHarness();
    const input = {
      participantType: "orchestrator",
      scopeId: "project:v5",
      leaseTtlMs,
    };
    let direct;
    try {
      await harness.service.register(input);
    } catch (err) {
      direct = {
        error: err.code,
        message: err.message,
        code: err.code,
      };
    }
    const mcpResult = await rawMcpSurface(harness)("register", input);
    const mcp = JSON.parse(mcpResult.content[0].text);

    assert.equal(mcpResult.isError, true);
    assert.deepEqual(direct, {
      error: "COORDINATION_INVALID_INPUT",
      message: "leaseTtlMs exceeds maximum 300000",
      code: "COORDINATION_INVALID_INPUT",
    });
    assert.deepEqual(mcp, direct);
  }
});

test("MCP and direct calls exchange and acknowledge messages through one shared service state", async () => {
  const harness = createHarness({
    uuids: ["sender", "recipient"],
  });
  const sender = await harness.service.register({
    participantType: "orchestrator",
    scopeId: "project:v5",
    capabilities: ["coordination.v1"],
  });
  const recipient = await registerRecipient(harness.service);
  const invokeMcp = mcpSurface(harness);

  const mcpSent = await invokeMcp("send", {
    participantId: sender.participantId,
    leaseToken: sender.leaseToken,
    toParticipantId: recipient.participantId,
    messageId: "cm-mcp-to-direct",
    messageType: "IMPACT_NOTICE",
    classification: "internal",
    body: "MCP message for a direct receiver.",
  });
  const receivedDirectly = await harness.service.receive({
    participantId: recipient.participantId,
    leaseToken: recipient.leaseToken,
    consumerId: "direct-consumer",
  });
  const acknowledgedDirectly = await harness.service.ack({
    participantId: recipient.participantId,
    leaseToken: recipient.leaseToken,
    deliveryIds: [receivedDirectly[0].deliveryId],
  });

  assert.equal(mcpSent.message.messageId, "cm-mcp-to-direct");
  assert.equal(receivedDirectly[0].message.messageId, "cm-mcp-to-direct");
  assert.deepEqual(acknowledgedDirectly, {
    ackedCount: 1,
    deliveryIds: [receivedDirectly[0].deliveryId],
  });

  const sentDirectly = await harness.service.send({
    participantId: sender.participantId,
    leaseToken: sender.leaseToken,
    toParticipantId: recipient.participantId,
    messageId: "cm-direct-to-mcp",
    messageType: "RESPONSE",
    classification: "internal",
    body: "Direct message for an MCP receiver.",
    replyToMessageId: "cm-mcp-to-direct",
  });
  const receivedThroughMcp = await invokeMcp("receive", {
    participantId: recipient.participantId,
    leaseToken: recipient.leaseToken,
    consumerId: "mcp-consumer",
  });
  const acknowledgedThroughMcp = await invokeMcp("ack", {
    participantId: recipient.participantId,
    leaseToken: recipient.leaseToken,
    deliveryIds: [receivedThroughMcp[0].deliveryId],
  });

  assert.equal(sentDirectly.message.messageId, "cm-direct-to-mcp");
  assert.equal(receivedThroughMcp[0].message.messageId, "cm-direct-to-mcp");
  assert.deepEqual(acknowledgedThroughMcp, {
    ackedCount: 1,
    deliveryIds: [receivedThroughMcp[0].deliveryId],
  });
  assertNoTokenPersistence(harness);
});

test("all catalog-valid domain rejections preserve their error code through MCP", async () => {
  const harness = createHarness();
  const invokeMcp = rawMcpSurface(harness);
  const validUnknownCredentials = {
    participantId: "pt-unknown",
    leaseToken: LEASE_TOKENS[0],
  };
  const cases = [
    ["heartbeat", validUnknownCredentials, "COORDINATION_AUTH_FAILED"],
    ["discover", validUnknownCredentials, "COORDINATION_AUTH_FAILED"],
    ["send", {
      ...validUnknownCredentials,
      toParticipantId: "pt-recipient",
      messageType: "NOTICE",
      classification: "restricted",
      body: "metadata only",
    }, "COORDINATION_CLASSIFICATION_DENIED"],
  ];

  for (const [operation, args, expectedCode] of cases) {
    assert.equal(
      validateCatalogInput(`coordination.${operation}`, args).success,
      true,
      `${operation} must reach the domain boundary`,
    );
    const directCode = await directErrorCode(
      harness.service,
      operation,
      args,
    );
    const mcpCode = await mcpErrorCode(
      invokeMcp,
      operation,
      args,
    );
    assert.equal(directCode, expectedCode, `${operation} direct error code`);
    assert.equal(mcpCode, expectedCode, `${operation} MCP error code`);
    assert.equal(mcpCode, directCode, `${operation} surface error parity`);
  }

  assert.deepEqual(
    cases.map(([operation]) => operation),
    [
      "heartbeat",
      "discover",
      "send",
    ],
  );
  assertNoTokenPersistence(harness);
});

test("catalog-invalid coordination inputs fail safely before the domain boundary", async () => {
  const harness = createHarness();
  const invokeMcp = rawMcpSurface(harness);
  const validUnknownCredentials = {
    participantId: "pt-unknown",
    leaseToken: LEASE_TOKENS[0],
  };
  const cases = [
    ["register", {
      participantType: "worker",
      scopeId: "project:v5",
    }],
    ["unregister", {
      participantId: "not a valid participant id",
      leaseToken: LEASE_TOKENS[0],
    }],
    ["receive", {
      ...validUnknownCredentials,
      consumerId: "consumer",
      count: 0,
    }],
    ["ack", {
      ...validUnknownCredentials,
      deliveryIds: [],
    }],
  ];

  for (const [operation, args] of cases) {
    assert.equal(
      validateCatalogInput(`coordination.${operation}`, args).success,
      false,
      `${operation} must be rejected by the public catalog`,
    );
    assert.equal(
      await directErrorCode(harness.service, operation, args),
      "COORDINATION_INVALID_INPUT",
      `${operation} direct domain code`,
    );
    assert.equal(
      await mcpErrorCode(invokeMcp, operation, args),
      "INVALID_INPUT",
      `${operation} safe catalog validation code`,
    );
  }

  assertNoTokenPersistence(harness);
});
