import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CoordinationError,
} from "../../gateway/src/coordination.js";
import {
  buildCoordinationTools,
} from "../../gateway/src/tools/coordination.js";

const LEASE_TOKEN = "lease-token-with-at-least-32-characters";
const CASES = [
  ["status", {}],
  ["register", {
    participantType: "orchestrator",
    scopeId: "project:v5",
    displayName: "Primary orchestrator",
    capabilities: ["coordination.v1", "task.review"],
    metadata: {
      version: "5",
      retries: 2,
      ready: true,
      parent: null,
    },
    leaseTtlMs: 30_000,
  }],
  ["heartbeat", {
    participantId: "pt-primary",
    leaseToken: LEASE_TOKEN,
    leaseTtlMs: 45_000,
  }],
  ["discover", {
    participantId: "pt-primary",
    leaseToken: LEASE_TOKEN,
    scopeId: "project:v5",
    participantType: "agent",
    capability: "task.review",
  }],
  ["unregister", {
    participantId: "pt-primary",
    leaseToken: LEASE_TOKEN,
  }],
  ["send", {
    participantId: "pt-primary",
    leaseToken: LEASE_TOKEN,
    toParticipantId: "pt-reviewer",
    messageId: "cm-request-1",
    messageType: "CHANGE_REQUEST",
    classification: "internal",
    body: "{\"path\":\"gateway/src/tools/coordination.js\"}",
    traceId: "trace-1",
    correlationId: "review-1",
    replyToMessageId: "cm-parent-1",
  }],
  ["receive", {
    participantId: "pt-reviewer",
    leaseToken: LEASE_TOKEN,
    consumerId: "reviewer-process",
    count: 10,
    reclaimIdleMs: 0,
    blockMs: 1_000,
  }],
  ["ack", {
    participantId: "pt-reviewer",
    leaseToken: LEASE_TOKEN,
    deliveryIds: ["1-0", "2-0"],
  }],
];

const REQUIRED = {
  status: [],
  register: ["participantType"],
  heartbeat: ["participantId", "leaseToken"],
  discover: ["participantId", "leaseToken"],
  unregister: ["participantId", "leaseToken"],
  send: [
    "participantId",
    "leaseToken",
    "toParticipantId",
    "messageType",
    "classification",
    "body",
  ],
  receive: ["participantId", "leaseToken", "consumerId"],
  ack: ["participantId", "leaseToken", "deliveryIds"],
};

function createService(handler = async (operation, args) => ({ operation, args })) {
  return Object.fromEntries(
    CASES.map(([operation]) => [
      operation,
      (args) => handler(operation, args),
    ]),
  );
}

function toolMap(coordination) {
  return Object.fromEntries(
    buildCoordinationTools({ coordination }).map((tool) => [tool.name, tool]),
  );
}

function parseResult(result) {
  return JSON.parse(result.content[0].text);
}

test("builder exposes exactly eight strict coordination tool schemas in protocol order", () => {
  const tools = buildCoordinationTools({
    coordination: createService(),
  });

  assert.deepEqual(
    tools.map(({ name }) => name),
    CASES.map(([operation]) => `coordination.${operation}`),
  );
  for (const tool of tools) {
    const operation = tool.name.slice("coordination.".length);
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.deepEqual(tool.inputSchema.required, REQUIRED[operation]);
  }
});

test("registration schema advertises the lease ceiling and optional canonical scope", () => {
  const register = toolMap(createService())["coordination.register"];

  assert.equal(register.inputSchema.properties.scopeId.type, "string");
  assert.equal(register.inputSchema.required.includes("scopeId"), false);
  assert.deepEqual(register.inputSchema.properties.capabilities, {
    type: "array",
    items: {
      type: "string",
      minLength: 1,
      maxLength: 128,
      pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$",
    },
    maxItems: 64,
    uniqueItems: true,
  });
  assert.deepEqual(register.inputSchema.properties.leaseTtlMs, {
    type: "integer",
    minimum: 1,
    maximum: 259_200_000,
  });
});

test("registration and heartbeat report lease validation with the domain code and exact limit", async () => {
  const calls = [];
  const tools = toolMap(
    createService(async (operation, args) => {
      calls.push({ operation, args });
      return {};
    }),
  );

  for (const operation of ["register", "heartbeat"]) {
    const base =
      operation === "register"
        ? { participantType: "orchestrator" }
        : {
            participantId: "pt-primary",
            leaseToken: LEASE_TOKEN,
          };
    const result = await tools[`coordination.${operation}`].handler({
      ...base,
      leaseTtlMs: 259_200_001,
    });

    assert.equal(result.isError, true);
    assert.deepEqual(parseResult(result), {
      error: "COORDINATION_INVALID_INPUT",
      message: "leaseTtlMs exceeds maximum 259200000",
      code: "COORDINATION_INVALID_INPUT",
    });
  }
  assert.deepEqual(calls, []);
});

test("all coordination handlers forward parsed arguments and results unchanged", async () => {
  const calls = [];
  const coordination = createService(async (operation, args) => {
    calls.push({
      operation,
      args: structuredClone(args),
    });
    return {
      operation,
      value: structuredClone(args),
    };
  });
  const tools = toolMap(coordination);

  for (const [operation, args] of CASES) {
    const result = await tools[`coordination.${operation}`].handler(args);
    assert.equal(result.isError, undefined);
    assert.deepEqual(parseResult(result), {
      operation,
      value: args,
    });
  }
  assert.deepEqual(
    calls,
    CASES.map(([operation, args]) => ({ operation, args })),
  );
});

test("every coordination schema rejects unknown root input before its service call", async () => {
  const calls = [];
  const tools = toolMap(
    createService(async (operation, args) => {
      calls.push({ operation, args });
      return {};
    }),
  );

  for (const [operation, args] of CASES) {
    const result = await tools[`coordination.${operation}`].handler({
      ...args,
      unexpected: "must-not-be-stripped",
    });
    const payload = parseResult(result);

    assert.equal(result.isError, true, operation);
    assert.equal(payload.error, "INVALID_INPUT", operation);
    assert.ok(payload.issues.some(({ code }) => code === "unrecognized_keys"));
  }
  assert.deepEqual(calls, []);
});

test("send preserves restricted and UTF-8 byte-limit service errors", async () => {
  const calls = [];
  const coordination = createService(async (operation, args) => {
    calls.push({
      operation,
      args: structuredClone(args),
    });
    if (args.classification === "restricted") {
      throw new CoordinationError(
        "COORDINATION_CLASSIFICATION_DENIED",
        "coordination classification is denied",
      );
    }
    if (Buffer.byteLength(args.body, "utf8") > 7) {
      throw new CoordinationError(
        "COORDINATION_MESSAGE_TOO_LARGE",
        "coordination message exceeds its byte limit",
      );
    }
    return {};
  });
  const send = toolMap(coordination)["coordination.send"];
  const base = {
    participantId: "pt-primary",
    leaseToken: LEASE_TOKEN,
    toParticipantId: "pt-reviewer",
    messageType: "NOTICE",
  };

  const restricted = await send.handler({
    ...base,
    classification: "restricted",
    body: "metadata only",
  });
  assert.equal(restricted.isError, true);
  assert.deepEqual(parseResult(restricted), {
    error: "COORDINATION_CLASSIFICATION_DENIED",
    message: "coordination classification is denied",
    code: "COORDINATION_CLASSIFICATION_DENIED",
  });

  const oversized = await send.handler({
    ...base,
    classification: "internal",
    body: "éééé",
  });
  assert.equal(oversized.isError, true);
  assert.deepEqual(parseResult(oversized), {
    error: "COORDINATION_MESSAGE_TOO_LARGE",
    message: "coordination message exceeds its byte limit",
    code: "COORDINATION_MESSAGE_TOO_LARGE",
  });

  assert.deepEqual(
    calls.map(({ operation, args }) => ({
      operation,
      classification: args.classification,
      body: args.body,
    })),
    [
      {
        operation: "send",
        classification: "restricted",
        body: "metadata only",
      },
      {
        operation: "send",
        classification: "internal",
        body: "éééé",
      },
    ],
  );
});
