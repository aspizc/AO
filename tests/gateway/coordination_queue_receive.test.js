import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CoordinationQueueError,
  createRedisCoordinationQueue,
} from "../../gateway/src/core/coordination_queue.js";

const DIGEST = "a".repeat(64);
const INBOX = "agents:coord:v1:inbox:pt%3Arecipient";

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
    ...overrides,
  };
}

function fence(overrides = {}) {
  return {
    participantId: "pt:recipient",
    scopeId: "project:v5",
    leaseTokenHash: DIGEST,
    ...overrides,
  };
}

function entry(deliveryId, message = envelope()) {
  return [deliveryId, ["envelope", JSON.stringify(message)]];
}

function readReply(entries, inbox = INBOX) {
  return [[inbox, entries]];
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
    maxInboxLength: 8,
    ...options,
  });
}

function options(overrides = {}) {
  return {
    participantId: "pt:recipient",
    consumerId: "consumer-a",
    count: 3,
    reclaimIdleMs: null,
    blockMs: 0,
    now: 1_753_438_860_000,
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

test("nonblocking receive atomically fences and reads the addressed inbox", async () => {
  const message = envelope();
  const client = createScriptedClient({
    responses: [[0, readReply([entry("100-0", message)])]],
  });
  const queue = createQueue(client);

  assert.deepEqual(
    await queue.readInbox(options()),
    {
      status: "read",
      deliveries: [{
        deliveryId: "100-0",
        message,
        recovered: false,
      }],
    },
  );

  assert.equal(client.commands.length, 1);
  const { script, keys, args } = evalParts(client.commands[0]);
  assert.deepEqual(keys, [
    "agents:coord:v1:presence:pt%3Arecipient",
    INBOX,
  ]);
  assert.deepEqual(args, [
    "pt:recipient",
    DIGEST,
    "project:v5",
    "coordination-v1",
    "consumer-a",
    "3",
  ]);
  assert.match(script, /XREADGROUP/);
  assert.match(script, /leaseTokenHash/);
  assert.match(script, /scopeId/);
  assert.doesNotMatch(script, /BLOCK|agents:events/);
});

test("reclaim follows empty cursor pages and returns recovered work first", async () => {
  const recovered = envelope({ messageId: "cm:recovered" });
  const fresh = envelope({ messageId: "cm:fresh" });
  const client = createScriptedClient({
    responses: [
      [0, ["7-0", [], []]],
      [0, ["0-0", [entry("100-0", recovered)], []]],
      [0, readReply([entry("101-0", fresh)])],
    ],
  });
  const queue = createQueue(client);

  assert.deepEqual(
    await queue.readInbox(options({ reclaimIdleMs: 5_000 })),
    {
      status: "read",
      deliveries: [
        {
          deliveryId: "100-0",
          message: recovered,
          recovered: true,
        },
        {
          deliveryId: "101-0",
          message: fresh,
          recovered: false,
        },
      ],
    },
  );

  assert.equal(client.commands.length, 3);
  const first = evalParts(client.commands[0]);
  const second = evalParts(client.commands[1]);
  const third = evalParts(client.commands[2]);
  assert.match(first.script, /XAUTOCLAIM/);
  assert.deepEqual(first.args, [
    "pt:recipient",
    DIGEST,
    "project:v5",
    "coordination-v1",
    "consumer-a",
    "5000",
    "0-0",
    "3",
  ]);
  assert.deepEqual(second.args.slice(-2), ["7-0", "3"]);
  assert.match(third.script, /XREADGROUP/);
  assert.deepEqual(third.args.slice(-2), ["consumer-a", "2"]);
});

test("blocking receive checks the fence before and after XREADGROUP", async () => {
  const client = createScriptedClient({
    responses: [
      0,
      readReply([entry("100-0")]),
      4,
    ],
  });
  const queue = createQueue(client);

  assert.deepEqual(
    await queue.readInbox(options({ blockMs: 250 })),
    { status: "fence_mismatch" },
  );

  assert.equal(client.commands.length, 3);
  const before = evalParts(client.commands[0]);
  assert.match(before.script, /fence_matches/);
  assert.doesNotMatch(before.script, /XREADGROUP|XAUTOCLAIM/);
  assert.deepEqual(client.commands[1], [
    "XREADGROUP",
    "GROUP",
    "coordination-v1",
    "consumer-a",
    "COUNT",
    "3",
    "BLOCK",
    "250",
    "STREAMS",
    INBOX,
    ">",
  ]);
  const after = evalParts(client.commands[2]);
  assert.equal(after.script, before.script);
});

test("blocking timeout is post-fenced and returns an empty read", async () => {
  const client = createScriptedClient({ responses: [0, null, 0] });
  const queue = createQueue(client);

  assert.deepEqual(
    await queue.readInbox(options({ blockMs: 10 })),
    { status: "read", deliveries: [] },
  );
  assert.equal(client.commands.length, 3);
});

test("a replacement during a multipage reclaim discloses no claimed entry", async () => {
  const client = createScriptedClient({
    responses: [
      [0, ["7-0", [entry("100-0")], []]],
      [4],
    ],
  });
  const queue = createQueue(client);

  assert.deepEqual(
    await queue.readInbox(options({
      count: 2,
      reclaimIdleMs: 0,
    })),
    { status: "fence_mismatch" },
  );
  assert.equal(client.commands.length, 2);
});

test("reclaim stops at the requested count without reading new work", async () => {
  const client = createScriptedClient({
    responses: [[0, ["9-0", [
      entry("100-0"),
      entry("101-0", envelope({ messageId: "cm:second" })),
    ], []]]],
  });
  const queue = createQueue(client);

  const result = await queue.readInbox(options({
    count: 2,
    reclaimIdleMs: 0,
  }));
  assert.equal(result.status, "read");
  assert.equal(result.deliveries.length, 2);
  assert.ok(result.deliveries.every(({ recovered }) => recovered));
  assert.equal(client.commands.length, 1);
});

test("receive validates identifiers, bounds, clock evidence, and fence relation", async () => {
  const invalidCases = [
    { participantId: "unsafe/id" },
    { consumerId: "unsafe/id" },
    { count: 0 },
    { count: 101 },
    { count: 1.5 },
    { reclaimIdleMs: -1 },
    { reclaimIdleMs: 1.5 },
    { blockMs: -1 },
    { blockMs: 1.5 },
    { now: -1 },
    { now: 1.5 },
    { fence: fence({ participantId: "pt:other" }) },
  ];

  for (const overrides of invalidCases) {
    const client = createScriptedClient();
    const queue = createQueue(client);
    await assert.rejects(queue.readInbox(options(overrides)), TypeError);
    assert.equal(client.commands.length, 0);
  }
});

test("receive fails closed on malformed stream, envelope, and duplicate data", async () => {
  const sparseRead = Array(1);
  const sparseEntryFields = Array(2);
  sparseEntryFields[0] = "envelope";
  const malformedReplies = [
    null,
    [],
    [0],
    ["0", null],
    [0, "not-a-read-reply"],
    [0, []],
    [0, [[INBOX, []], [INBOX, []]]],
    [0, readReply([], "agents:coord:v1:inbox:other")],
    [0, readReply([["0-0", ["envelope", JSON.stringify(envelope())]]])],
    [0, readReply([["01-0", ["envelope", JSON.stringify(envelope())]]])],
    [0, readReply([["100-0", []]])],
    [0, sparseRead],
    [0, readReply([["100-0", sparseEntryFields]])],
    [0, readReply([["100-0", ["other", JSON.stringify(envelope())]]])],
    [0, readReply([["100-0", ["envelope", "{"]]])],
    [0, readReply([entry("100-0", envelope({
      toParticipantId: "pt:other",
    }))])],
    [0, readReply([entry("100-0", envelope({ scopeId: "other:scope" }))])],
    [0, readReply([
      entry("100-0"),
      entry("100-0"),
    ])],
    [0, readReply([
      entry("100-0"),
      entry("101-0"),
      entry("102-0"),
      entry("103-0"),
    ])],
    [5],
    [6],
    [99],
  ];

  for (const response of malformedReplies) {
    const queue = createQueue(createScriptedClient({ responses: [response] }));
    await expectQueueCode(
      queue.readInbox(options()),
      "COORDINATION_INVALID_DATA",
    );
  }
});

test("receive rejects duplicate IDs across reclaim and new-read pages", async () => {
  const client = createScriptedClient({
    responses: [
      [0, ["0-0", [entry("100-0")], []]],
      [0, readReply([entry("100-0")])],
    ],
  });
  const queue = createQueue(client);
  await expectQueueCode(
    queue.readInbox(options({ reclaimIdleMs: 0 })),
    "COORDINATION_INVALID_DATA",
  );
});

test("reclaim rejects deleted IDs, malformed cursors, and non-progress", async () => {
  const scenarios = [
    [[0, ["0-0", [], ["100-0"]]]],
    [[0, ["bad-cursor", [], []]]],
    [[0, ["18446744073709551616-0", [], []]]],
    [
      [0, ["7-0", [], []]],
      [0, ["7-0", [], []]],
    ],
    [
      [0, ["7-0", [], []]],
      [0, ["6-0", [], []]],
    ],
    [[0, ["0-0", [
      entry("100-0"),
      entry("101-0"),
      entry("102-0"),
      entry("103-0"),
    ], []]]],
  ];

  for (const responses of scenarios) {
    const queue = createQueue(createScriptedClient({ responses }));
    await expectQueueCode(
      queue.readInbox(options({ reclaimIdleMs: 0 })),
      "COORDINATION_INVALID_DATA",
    );
  }
});

test("fence status and exact NOGROUP errors fail closed without group repair", async () => {
  const replaced = createScriptedClient({ responses: [[4]] });
  assert.deepEqual(
    await createQueue(replaced).readInbox(options()),
    { status: "fence_mismatch" },
  );

  const missingBeforeBlock = createScriptedClient({ responses: [4] });
  assert.deepEqual(
    await createQueue(missingBeforeBlock).readInbox(options({ blockMs: 10 })),
    { status: "fence_mismatch" },
  );
  assert.equal(missingBeforeBlock.commands.length, 1);

  const noGroup = createScriptedClient({
    responses: [0, new Error("NOGROUP sentinel")],
  });
  await expectQueueCode(
    createQueue(noGroup).readInbox(options({ blockMs: 10 })),
    "COORDINATION_INVALID_DATA",
  );
  assert.equal(
    noGroup.commands.some((command) => command[0] === "XGROUP"),
    false,
  );
});

test("unexpected Redis failures stay unavailable without recreating groups", async () => {
  for (const response of [
    new Error("ERR sentinel"),
    new Error("NOPERM mentions NOGROUP sentinel"),
  ]) {
    const client = createScriptedClient({ responses: [response] });
    const queue = createQueue(client);
    await expectQueueCode(
      queue.readInbox(options()),
      "COORDINATION_UNAVAILABLE",
    );
    assert.equal(client.commands.length, 1);
    assert.equal(
      client.commands.some((command) => command[0] === "XGROUP"),
      false,
    );
  }
});
