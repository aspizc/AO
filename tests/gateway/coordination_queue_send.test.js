import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CoordinationQueueError,
  createRedisCoordinationQueue,
} from "../../gateway/src/core/coordination_queue.js";

const SENDER_DIGEST = "a".repeat(64);
const RECIPIENT_DIGEST = "b".repeat(64);

function envelope(overrides = {}) {
  return {
    protocolVersion: 1,
    messageId: "cm:request-1",
    fromParticipantId: "pt:sender",
    toParticipantId: "pt:recipient",
    scopeId: "project:v5",
    messageType: "IMPACT_NOTICE",
    classification: "internal",
    body: "{\"path\":\"gateway/src/tools/index.js\"}",
    createdAt: "2026-07-25T10:01:00.000Z",
    traceId: "trace-1",
    correlationId: "change-1",
    replyToMessageId: "cm:parent",
    ...overrides,
  };
}

function senderFence(overrides = {}) {
  return {
    participantId: "pt:sender",
    scopeId: "project:v5",
    leaseTokenHash: SENDER_DIGEST,
    ...overrides,
  };
}

function recipientFence(overrides = {}) {
  return {
    participantId: "pt:recipient",
    scopeId: "project:v5",
    leaseTokenHash: RECIPIENT_DIGEST,
    ...overrides,
  };
}

function createScriptedClient({ responses = [], sendError = null } = {}) {
  let open = false;
  const commands = [];
  return {
    get isOpen() {
      return open;
    },
    commands,
    on() {
      return this;
    },
    async connect() {
      open = true;
    },
    async sendCommand(command) {
      commands.push(structuredClone(command));
      if (sendError) throw sendError;
      return responses.shift();
    },
    destroy() {
      open = false;
    },
  };
}

function createQueue(client, options = {}) {
  return createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    clientFactory: () => client,
    maxInboxLength: 2,
    ...options,
  });
}

function sendOptions(overrides = {}) {
  return {
    senderFence: senderFence(),
    recipientFence: recipientFence(),
    dedupeTtlMs: 60_000,
    ...overrides,
  };
}

function evalParts(command) {
  assert.equal(command[0], "EVAL");
  const keyCount = Number(command[2]);
  return {
    script: command[1],
    keys: command.slice(3, 3 + keyCount),
    args: command.slice(3 + keyCount),
  };
}

function expectQueueCode(promise, code) {
  return assert.rejects(
    promise,
    (err) =>
      err instanceof CoordinationQueueError
      && err.code === code
      && !err.message.includes("sentinel"),
  );
}

test("send appends through sender-scoped dedupe and exact dual-fence keys", async () => {
  const client = createScriptedClient({ responses: [[1, "123-0"]] });
  const queue = createQueue(client);
  const message = envelope();

  assert.deepEqual(
    await queue.putMessage(message, sendOptions()),
    { status: "created", deliveryId: "123-0" },
  );

  const { script, keys, args } = evalParts(client.commands[0]);
  assert.deepEqual(keys, [
    "agents:coord:v1:presence:pt%3Asender",
    "agents:coord:v1:presence:pt%3Arecipient",
    "agents:coord:v1:inbox:pt%3Arecipient",
    "agents:coord:v1:dedupe:pt%3Asender:cm%3Arequest-1",
    "agents:coord:v1:events",
  ]);
  assert.deepEqual(args, [
    JSON.stringify(message),
    "pt:sender",
    SENDER_DIGEST,
    "project:v5",
    "pt:recipient",
    RECIPIENT_DIGEST,
    "project:v5",
    "cm:request-1",
    "60000",
    "2",
  ]);
  assert.match(script, /XLEN/);
  assert.match(script, /leaseTokenHash/);
  assert.match(script, /scopeId/);
  assert.match(script, /PEXPIRE/);
  assert.match(script, /message\.sent/);
  assert.match(script, /redis\.pcall\(\s*'XADD'/);
  assert.doesNotMatch(script, /MAXLEN|agents:events/);
});

test("equal retry returns the original envelope and delivery ID", async () => {
  const original = envelope({
    createdAt: "2026-07-25T10:00:59.000Z",
  });
  const retry = envelope({
    createdAt: "2026-07-25T10:01:01.000Z",
  });
  const client = createScriptedClient({
    responses: [[2, "123-0", JSON.stringify(original)]],
  });
  const queue = createQueue(client);

  assert.deepEqual(
    await queue.putMessage(retry, sendOptions()),
    {
      status: "duplicate",
      deliveryId: "123-0",
      envelope: original,
    },
  );
});

test("send maps every fenced, conflict, and capacity result exactly", async () => {
  for (const [code, status] of [
    [3, "sender_fence_mismatch"],
    [4, "target_missing"],
    [5, "recipient_fence_mismatch"],
    [6, "conflict"],
    [7, "inbox_full"],
  ]) {
    const queue = createQueue(
      createScriptedClient({ responses: [[code]] }),
    );
    assert.deepEqual(
      await queue.putMessage(envelope(), sendOptions()),
      { status },
    );
  }
});

test("send rejects malformed script results and corrupt duplicate records", async () => {
  const sparse = Array(2);
  sparse[0] = 1;
  const changed = envelope({ body: "changed" });
  for (const response of [
    null,
    [],
    sparse,
    ["1", "123-0"],
    [1],
    [1, "0-0"],
    [1, "01-0"],
    [1, "18446744073709551616-0"],
    [1, "123-0", "extra"],
    [2, "123-0"],
    [2, "123-0", "{"],
    [2, "123-0", "[]"],
    [2, "123-0", JSON.stringify(changed)],
    [2, "123-0", JSON.stringify(envelope({ createdAt: "not-a-time" }))],
    [3, "extra"],
    [8],
    [99],
  ]) {
    const queue = createQueue(
      createScriptedClient({ responses: [response] }),
    );
    await expectQueueCode(
      queue.putMessage(envelope(), sendOptions()),
      "COORDINATION_INVALID_DATA",
    );
  }
});

test("send validates exact envelope and fence relationships before Redis", async () => {
  const invalidCases = [
    [envelope({ unexpected: "sentinel" }), sendOptions()],
    [envelope({ protocolVersion: 2 }), sendOptions()],
    [envelope({ messageId: "unsafe/id" }), sendOptions()],
    [envelope({ classification: "restricted" }), sendOptions()],
    [envelope({ createdAt: "not-a-time" }), sendOptions()],
    [envelope({ traceId: null }), sendOptions()],
    [envelope({ traceId: undefined }), sendOptions()],
    [envelope(), sendOptions({ dedupeTtlMs: 0 })],
    [envelope(), sendOptions({
      senderFence: senderFence({ participantId: "pt:other" }),
    })],
    [envelope(), sendOptions({
      recipientFence: recipientFence({ participantId: "pt:other" }),
    })],
    [envelope(), sendOptions({
      recipientFence: recipientFence({ scopeId: "other:scope" }),
    })],
  ];

  for (const [message, options] of invalidCases) {
    const client = createScriptedClient();
    const queue = createQueue(client);
    await assert.rejects(
      queue.putMessage(message, options),
      TypeError,
    );
    assert.equal(client.commands.length, 0);
  }
});

test("Lua compares every semantic field except createdAt before capacity", async () => {
  const client = createScriptedClient({ responses: [[6]] });
  const queue = createQueue(client);
  await queue.putMessage(envelope(), sendOptions());
  const { script } = evalParts(client.commands[0]);
  const equalityBody = script.slice(
    script.indexOf("local function same_message"),
    script.indexOf("local function", script.indexOf("local function same_message") + 1),
  );

  for (const field of [
    "protocolVersion",
    "messageId",
    "fromParticipantId",
    "toParticipantId",
    "scopeId",
    "messageType",
    "classification",
    "body",
    "traceId",
    "correlationId",
    "replyToMessageId",
  ]) {
    assert.match(equalityBody, new RegExp(field));
  }
  assert.doesNotMatch(equalityBody, /createdAt/);
  assert.ok(
    script.indexOf("same_message") < script.indexOf("XLEN"),
    "dedupe conflict must resolve before capacity",
  );
});

test("the same message ID uses independent dedupe keys for different senders", async () => {
  const firstClient = createScriptedClient({ responses: [[1, "1-0"]] });
  const secondClient = createScriptedClient({ responses: [[1, "2-0"]] });
  const firstQueue = createQueue(firstClient);
  const secondQueue = createQueue(secondClient);

  await firstQueue.putMessage(envelope(), sendOptions());
  await secondQueue.putMessage(
    envelope({ fromParticipantId: "pt:sender-two" }),
    sendOptions({
      senderFence: senderFence({ participantId: "pt:sender-two" }),
    }),
  );

  assert.equal(
    evalParts(firstClient.commands[0]).keys[3],
    "agents:coord:v1:dedupe:pt%3Asender:cm%3Arequest-1",
  );
  assert.equal(
    evalParts(secondClient.commands[0]).keys[3],
    "agents:coord:v1:dedupe:pt%3Asender-two:cm%3Arequest-1",
  );
});

test("foreign Redis failures remain safe and never reflect message bodies", async () => {
  const client = createScriptedClient({
    sendError: new Error("sentinel endpoint credential and body"),
  });
  const queue = createQueue(client);
  await expectQueueCode(
    queue.putMessage(envelope(), sendOptions()),
    "COORDINATION_UNAVAILABLE",
  );
});
