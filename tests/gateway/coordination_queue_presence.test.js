import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CoordinationQueueError,
  createRedisCoordinationQueue,
} from "../../gateway/src/core/coordination_queue.js";

const DIGEST = "a".repeat(64);
const REPLACEMENT_DIGEST = "b".repeat(64);

function participant(overrides = {}) {
  return {
    protocolVersion: 1,
    participantId: "pt:owner",
    participantType: "orchestrator",
    scopeId: "project:v5",
    displayName: "Owner",
    capabilities: ["coordination.v1"],
    metadata: { protocol: "KYA" },
    registeredAt: "2026-07-25T10:00:00.000Z",
    lastHeartbeatAt: "2026-07-25T10:00:00.000Z",
    leaseExpiresAt: "2026-07-25T10:00:30.000Z",
    leaseTokenHash: DIGEST,
    ...overrides,
  };
}

function fence(overrides = {}) {
  return {
    participantId: "pt:owner",
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
    orphanInboxTtlMs: 7_000,
    ...options,
  });
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

function evalParts(command) {
  assert.equal(command[0], "EVAL");
  const keyCount = Number(command[2]);
  return {
    script: command[1],
    keys: command.slice(3, 3 + keyCount),
    args: command.slice(3 + keyCount),
  };
}

test("register atomically creates a leased presence, registry row, group, and safe event", async () => {
  const client = createScriptedClient({ responses: [1] });
  const queue = createQueue(client);
  const record = participant();

  assert.deepEqual(
    await queue.putParticipant(record, { ttlMs: 30_000, ifAbsent: true }),
    { status: "stored" },
  );

  const { script, keys, args } = evalParts(client.commands[0]);
  assert.deepEqual(keys, [
    "agents:coord:v1:presence:pt%3Aowner",
    "agents:coord:v1:participants",
    "agents:coord:v1:inbox:pt%3Aowner",
    "agents:coord:v1:events",
  ]);
  assert.equal(args[0], JSON.stringify(record));
  assert.equal(args[1], "30000");
  assert.equal(args[2], "pt:owner");
  assert.equal(args[3], "coordination-v1");
  assert.deepEqual(JSON.parse(args[4]), {
    protocolVersion: 1,
    eventType: "participant.joined",
    participantId: "pt:owner",
    participantType: "orchestrator",
    scopeId: "project:v5",
    timestamp: "2026-07-25T10:00:00.000Z",
  });
  assert.doesNotMatch(args[4], /leaseToken|leaseTokenHash|body|KYA/);
  assert.match(script, /XGROUP/);
  assert.match(script, /BUSYGROUP/);
  assert.match(script, /PERSIST/);
  assert.match(script, /XADD/);
  assert.doesNotMatch(script, /agents:events|MAXLEN/);
  assert.ok(
    script.indexOf("redis.call('XADD'") < script.indexOf("redis.call('SET'"),
    "metadata append must fail before authoritative register writes",
  );
});

test("register maps collision and rejects corrupt or unexpected script results", async () => {
  const collision = createQueue(createScriptedClient({ responses: [2] }));
  assert.deepEqual(
    await collision.putParticipant(participant(), {
      ttlMs: 30_000,
      ifAbsent: true,
    }),
    { status: "exists" },
  );

  for (const response of [3, 4, 0, "1", null, [], [1]]) {
    const queue = createQueue(createScriptedClient({ responses: [response] }));
    await expectQueueCode(
      queue.putParticipant(participant(), {
        ttlMs: 30_000,
        ifAbsent: true,
      }),
      "COORDINATION_INVALID_DATA",
    );
  }
});

test("heartbeat atomically compares digest and scope before renewing presence", async () => {
  const renewed = participant({
    lastHeartbeatAt: "2026-07-25T10:00:10.000Z",
    leaseExpiresAt: "2026-07-25T10:01:10.000Z",
  });
  const client = createScriptedClient({ responses: [1] });
  const queue = createQueue(client);

  assert.deepEqual(
    await queue.putParticipant(renewed, {
      ttlMs: 60_000,
      ifAbsent: false,
      fence: fence(),
    }),
    { status: "stored" },
  );

  const { script, keys, args } = evalParts(client.commands[0]);
  assert.equal(keys[0], "agents:coord:v1:presence:pt%3Aowner");
  assert.deepEqual(args.slice(0, 7), [
    JSON.stringify(renewed),
    "60000",
    "pt:owner",
    DIGEST,
    "project:v5",
    "coordination-v1",
    JSON.stringify({
      protocolVersion: 1,
      eventType: "participant.heartbeat",
      participantId: "pt:owner",
      participantType: "orchestrator",
      scopeId: "project:v5",
      timestamp: "2026-07-25T10:00:10.000Z",
    }),
  ]);
  assert.match(script, /leaseTokenHash/);
  assert.match(script, /scopeId/);
  assert.match(script, /PERSIST/);
  assert.ok(
    script.indexOf("redis.call('XADD'") < script.indexOf("redis.call('SET'"),
    "metadata append must fail before authoritative heartbeat writes",
  );
});

test("heartbeat maps missing and replacement fences without weakening statuses", async () => {
  for (const [response, status] of [
    [3, "missing"],
    [4, "fence_mismatch"],
  ]) {
    const queue = createQueue(createScriptedClient({ responses: [response] }));
    assert.deepEqual(
      await queue.putParticipant(participant(), {
        ttlMs: 30_000,
        ifAbsent: false,
        fence: fence(),
      }),
      { status },
    );
  }

  const corrupt = createQueue(createScriptedClient({ responses: [5] }));
  await expectQueueCode(
    corrupt.putParticipant(participant(), {
      ttlMs: 30_000,
      ifAbsent: false,
      fence: fence(),
    }),
    "COORDINATION_INVALID_DATA",
  );
});

test("unregister is fenced, derives event identity from Redis, and orphans the inbox", async () => {
  const client = createScriptedClient({ responses: [1] });
  const queue = createQueue(client);

  assert.deepEqual(
    await queue.deleteParticipant("pt:owner", {
      fence: fence(),
      participantType: "sentinel-untrusted",
      scopeId: "sentinel:untrusted",
      timestamp: "2026-07-25T10:00:20.000Z",
    }),
    { status: "deleted" },
  );

  const { script, keys, args } = evalParts(client.commands[0]);
  assert.deepEqual(keys, [
    "agents:coord:v1:presence:pt%3Aowner",
    "agents:coord:v1:participants",
    "agents:coord:v1:inbox:pt%3Aowner",
    "agents:coord:v1:events",
  ]);
  assert.deepEqual(args, [
    "pt:owner",
    DIGEST,
    "project:v5",
    "7000",
    "2026-07-25T10:00:20.000Z",
  ]);
  assert.match(script, /PEXPIRE/);
  assert.match(script, /participant\.left/);
  assert.doesNotMatch(args.join(" "), /sentinel-untrusted/);
  assert.ok(
    script.indexOf("redis.call('XADD'") < script.indexOf("redis.call('DEL'"),
    "metadata append must fail before authoritative unregister writes",
  );

  for (const [response, status] of [
    [3, "missing"],
    [4, "fence_mismatch"],
  ]) {
    const statusQueue = createQueue(
      createScriptedClient({ responses: [response] }),
    );
    assert.deepEqual(
      await statusQueue.deleteParticipant("pt:owner", {
        fence: fence(),
        timestamp: "2026-07-25T10:00:20.000Z",
      }),
      { status },
    );
  }
});

test("lifecycle validates records, fences, TTLs, and timestamps before Redis", async () => {
  for (const [record, options] of [
    [{ ...participant(), leaseToken: "sentinel-plaintext" }, {
      ttlMs: 30_000,
      ifAbsent: true,
    }],
    [{ ...participant(), body: "sentinel body" }, {
      ttlMs: 30_000,
      ifAbsent: true,
    }],
    [{ ...participant(), leaseTokenHash: "not-a-digest" }, {
      ttlMs: 30_000,
      ifAbsent: true,
    }],
    [participant(), { ttlMs: 0, ifAbsent: true }],
    [participant(), {
      ttlMs: 30_000,
      ifAbsent: false,
      fence: fence({ leaseTokenHash: "not-a-digest" }),
    }],
  ]) {
    const client = createScriptedClient();
    const queue = createQueue(client);
    await assert.rejects(
      queue.putParticipant(record, options),
      TypeError,
    );
    assert.equal(client.commands.length, 0);
  }

  const client = createScriptedClient();
  const queue = createQueue(client);
  await assert.rejects(
    queue.deleteParticipant("pt:owner", {
      fence: fence(),
      timestamp: "not-a-time",
    }),
    TypeError,
  );
  assert.equal(client.commands.length, 0);
});

test("discovery scans in bounded batches and fences every returned page", async () => {
  const ids = Array.from({ length: 130 }, (_, index) => `pt-${index}`);
  const records = new Map(ids.map((participantId) => [
    participantId,
    participant({ participantId, displayName: participantId }),
  ]));
  const client = createScriptedClient({
    handler(command) {
      if (command[0] === "SSCAN") return ["0", ids];
      const { keys, args } = evalParts(command);
      const batchIds = args.slice(4);
      assert.ok(batchIds.length <= 128);
      assert.equal(keys.length, 2 + (batchIds.length * 2));
      assert.deepEqual(args.slice(0, 4), [
        "pt:owner",
        DIGEST,
        "project:v5",
        "7000",
      ]);
      return [
        0,
        ...batchIds.flatMap((participantId) => [
          participantId,
          JSON.stringify(records.get(participantId)),
        ]),
      ];
    },
  });
  const queue = createQueue(client);

  const result = await queue.listParticipants({ fence: fence() });

  assert.equal(result.status, "listed");
  assert.equal(result.participants.length, 130);
  assert.equal(client.commands.filter(([name]) => name === "SSCAN").length, 1);
  assert.equal(client.commands.filter(([name]) => name === "EVAL").length, 3);
  const firstEval = evalParts(client.commands[1]);
  assert.equal(firstEval.keys[0], "agents:coord:v1:presence:pt%3Aowner");
  assert.match(firstEval.script, /SISMEMBER/);
  assert.match(firstEval.script, /SREM/);
  assert.match(firstEval.script, /PEXPIRE/);
});

test("discovery follows SSCAN cursors, deduplicates IDs, and fences an empty set", async () => {
  let scanCall = 0;
  let evalCall = 0;
  const owner = participant();
  const client = createScriptedClient({
    handler(command) {
      if (command[0] === "SSCAN") {
        scanCall += 1;
        return scanCall === 1
          ? ["7", ["pt:owner"]]
          : ["0", ["pt:owner"]];
      }
      evalCall += 1;
      return evalCall === 1
        ? [0, "pt:owner", JSON.stringify(owner)]
        : [0];
    },
  });
  const queue = createQueue(client);
  assert.deepEqual(
    await queue.listParticipants({ fence: fence() }),
    { status: "listed", participants: [owner] },
  );
  assert.equal(scanCall, 2);
  assert.equal(evalCall, 2);

  const emptyClient = createScriptedClient({ responses: [["0", []], [0]] });
  const emptyQueue = createQueue(emptyClient);
  assert.deepEqual(
    await emptyQueue.listParticipants({ fence: fence() }),
    { status: "listed", participants: [] },
  );
  assert.deepEqual(emptyClient.commands.map(([name]) => name), ["SSCAN", "EVAL"]);
});

test("discovery discards accumulated rows on a later fence mismatch", async () => {
  const first = participant({ participantId: "pt-0", displayName: "pt-0" });
  let evalCalls = 0;
  const client = createScriptedClient({
    handler(command) {
      if (command[0] === "SSCAN") {
        return ["0", Array.from({ length: 129 }, (_, index) => `pt-${index}`)];
      }
      evalCalls += 1;
      return evalCalls === 1
        ? [0, "pt-0", JSON.stringify(first)]
        : [4];
    },
  });
  const queue = createQueue(client);

  assert.deepEqual(
    await queue.listParticipants({ fence: fence() }),
    { status: "fence_mismatch" },
  );
});

test("discovery fails closed on malformed cursors, IDs, rows, and script statuses", async () => {
  const cases = [
    [["not-a-cursor", []]],
    [["0", "not-an-array"]],
    [["0", [1]]],
    [["0", ["unsafe/id"]]],
    [["0", ["pt:owner"]], [0, "pt:owner"]],
    [["0", ["pt:owner"]], [0, "other", JSON.stringify(participant())]],
    [["0", ["pt:owner"]], [0, "pt:owner", "{"]],
    [["0", []], [5]],
    [["0", []], [99]],
  ];

  for (const responses of cases) {
    const queue = createQueue(createScriptedClient({ responses }));
    await expectQueueCode(
      queue.listParticipants({ fence: fence() }),
      "COORDINATION_INVALID_DATA",
    );
  }

  const repeatedCursor = createQueue(createScriptedClient({
    responses: [["7", []], ["7", []]],
  }));
  await expectQueueCode(
    repeatedCursor.listParticipants({ fence: fence() }),
    "COORDINATION_INVALID_DATA",
  );
});

test("foreign coordination-looking dependency errors are still mapped safely", async () => {
  const foreign = new Error("sentinel forged dependency details");
  foreign.code = "COORDINATION_AUTH_FAILED";
  const client = createScriptedClient({ responses: [foreign] });
  const queue = createQueue(client);
  await expectQueueCode(
    queue.putParticipant(participant(), { ttlMs: 30_000, ifAbsent: true }),
    "COORDINATION_UNAVAILABLE",
  );
});

test("replacement digest is never accepted merely because participant ID matches", async () => {
  const client = createScriptedClient({ responses: [4] });
  const queue = createQueue(client);
  assert.deepEqual(
    await queue.putParticipant(participant({
      leaseTokenHash: REPLACEMENT_DIGEST,
    }), {
      ttlMs: 30_000,
      ifAbsent: false,
      fence: fence(),
    }),
    { status: "fence_mismatch" },
  );
});
