import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CoordinationQueueError,
  createRedisCoordinationQueue,
} from "../../gateway/src/core/coordination_queue.js";

const DIGEST = "a".repeat(64);
const MAX_STREAM_COMPONENT = "18446744073709551615";

function fence(overrides = {}) {
  return {
    participantId: "pt:recipient",
    scopeId: "project:v5",
    leaseTokenHash: DIGEST,
    ...overrides,
  };
}

function createScriptedClient({ responses = [], handler = null } = {}) {
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
      if (handler) return handler(command, commands.length - 1);
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response;
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
    ...options,
  });
}

function options(overrides = {}) {
  return {
    participantId: "pt:recipient",
    deliveryIds: ["100-0", "101-0"],
    tombstoneTtlMs: 60_000,
    timestamp: "2026-07-25T10:02:00.000Z",
    fence: fence(),
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

test("ack atomically validates pending IDs and writes recipient tombstones", async () => {
  const client = createScriptedClient({ responses: [[1, 2]] });
  const queue = createQueue(client);

  assert.deepEqual(
    await queue.ackInbox(options()),
    { status: "acked", ackedCount: 2 },
  );

  assert.equal(client.commands.length, 1);
  const { script, keys, args } = evalParts(client.commands[0]);
  assert.deepEqual(keys, [
    "agents:coord:v1:presence:pt%3Arecipient",
    "agents:coord:v1:inbox:pt%3Arecipient",
    "agents:coord:v1:events",
    "agents:coord:v1:acked:pt%3Arecipient:100-0",
    "agents:coord:v1:acked:pt%3Arecipient:101-0",
  ]);
  assert.deepEqual(args, [
    "pt:recipient",
    DIGEST,
    "project:v5",
    "coordination-v1",
    "60000",
    "2026-07-25T10:02:00.000Z",
    "2",
    "100-0",
    "101-0",
  ]);
  assert.match(script, /XPENDING/);
  assert.match(script, /XRANGE/);
  assert.match(script, /valid_stored_envelope/);
  assert.match(script, /allowed_message_fields/);
  assert.match(script, /utf16_length/);
  assert.match(script, /classification/);
  assert.match(script, /createdAt/);
  assert.match(script, /XACK/);
  assert.match(script, /XDEL/);
  assert.match(script, /SET[\s\S]*PX/);
  assert.match(script, /message\.acked/);
  assert.match(script, /redis\.pcall\(\s*'XADD'/);
  assert.ok(
    script.lastIndexOf("'XPENDING'") < script.indexOf("'XACK',"),
  );
  assert.ok(
    script.lastIndexOf("'XRANGE'") < script.indexOf("'XACK',"),
  );
  assert.doesNotMatch(script, /MAXLEN|agents:events/);
});

test("ack maps replacement, unknown delivery, and exact retry results", async () => {
  for (const [response, expected] of [
    [[4], { status: "fence_mismatch" }],
    [[6], { status: "delivery_not_found" }],
    [[1, 0], { status: "acked", ackedCount: 0 }],
    [[1, 1], { status: "acked", ackedCount: 1 }],
  ]) {
    const queue = createQueue(
      createScriptedClient({ responses: [response] }),
    );
    assert.deepEqual(await queue.ackInbox(options()), expected);
  }
});

test("ack rejects malformed Lua results and invalid Redis state", async () => {
  const sparse = Array(2);
  sparse[0] = 1;
  for (const response of [
    null,
    [],
    sparse,
    ["1", 2],
    [1],
    [1, -1],
    [1, 3],
    [1, 0.5],
    [1, 1, "extra"],
    [4, "extra"],
    [5],
    [7],
    [99],
  ]) {
    const queue = createQueue(
      createScriptedClient({ responses: [response] }),
    );
    await expectQueueCode(
      queue.ackInbox(options()),
      "COORDINATION_INVALID_DATA",
    );
  }
});

test("ack validates a dense unique bounded batch before Redis", async () => {
  const sparse = Array(1);
  const tooMany = Array.from(
    { length: 101 },
    (_, index) => `${index + 1}-0`,
  );
  const invalidCases = [
    { deliveryIds: [] },
    { deliveryIds: sparse },
    { deliveryIds: ["100-0", "100-0"] },
    { deliveryIds: tooMany },
    { deliveryIds: ["0-0"] },
    { deliveryIds: ["01-0"] },
    { deliveryIds: ["100"] },
    { deliveryIds: ["18446744073709551616-0"] },
    { deliveryIds: ["0-18446744073709551616"] },
    { tombstoneTtlMs: 0 },
    { tombstoneTtlMs: 1.5 },
    { timestamp: "not-a-time" },
    { participantId: "unsafe/id" },
    { fence: fence({ participantId: "pt:other" }) },
  ];

  for (const overrides of invalidCases) {
    const client = createScriptedClient();
    const queue = createQueue(client);
    await assert.rejects(queue.ackInbox(options(overrides)), TypeError);
    assert.equal(client.commands.length, 0);
  }
});

test("ack accepts 100 IDs and the inclusive uint64 boundary", async () => {
  const deliveryIds = Array.from(
    { length: 99 },
    (_, index) => `${index + 1}-0`,
  );
  deliveryIds.push(`${MAX_STREAM_COMPONENT}-${MAX_STREAM_COMPONENT}`);
  const client = createScriptedClient({ responses: [[1, 100]] });
  const queue = createQueue(client);

  assert.deepEqual(
    await queue.ackInbox(options({ deliveryIds })),
    { status: "acked", ackedCount: 100 },
  );
  const { keys, args } = evalParts(client.commands[0]);
  assert.equal(keys.length, 103);
  assert.equal(args[6], "100");
  assert.deepEqual(args.slice(7), deliveryIds);
});

test("the same delivery ID uses independent tombstones for each recipient", async () => {
  const firstClient = createScriptedClient({ responses: [[1, 1]] });
  const secondClient = createScriptedClient({ responses: [[1, 1]] });
  await createQueue(firstClient).ackInbox(options({
    deliveryIds: ["100-0"],
  }));
  await createQueue(secondClient).ackInbox(options({
    participantId: "pt:other",
    deliveryIds: ["100-0"],
    fence: fence({ participantId: "pt:other" }),
  }));

  assert.equal(
    evalParts(firstClient.commands[0]).keys[3],
    "agents:coord:v1:acked:pt%3Arecipient:100-0",
  );
  assert.equal(
    evalParts(secondClient.commands[0]).keys[3],
    "agents:coord:v1:acked:pt%3Aother:100-0",
  );
});

test("foreign Redis errors remain unavailable and do not leak delivery IDs", async () => {
  const queue = createQueue(createScriptedClient({
    responses: [new Error("ERR sentinel 100-0")],
  }));
  await expectQueueCode(
    queue.ackInbox(options()),
    "COORDINATION_UNAVAILABLE",
  );
});
