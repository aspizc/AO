import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  CoordinationError,
  createCoordination,
} from "../../gateway/src/coordination.js";
import {
  CoordinationError as ServiceCoordinationError,
} from "../../gateway/src/services/coordination_service.js";

const METHODS = [
  "ack",
  "discover",
  "heartbeat",
  "receive",
  "register",
  "send",
  "status",
  "unregister",
];

function createRecordingQueue(label = "queue") {
  const records = [];
  return {
    enabled: true,
    label,
    records,
    describe() {
      return {
        enabled: true,
        prefix: `test:${label}:v1`,
        eventsStream: `test:${label}:v1:events`,
        consumerGroup: "coordination-v1",
      };
    },
    async putParticipant(record, options) {
      records.push({
        record: structuredClone(record),
        options: structuredClone(options),
      });
      return { status: "stored" };
    },
  };
}

test("direct entry point exposes the shared error and exactly eight operations", () => {
  const coordination = createCoordination({
    queue: createRecordingQueue(),
  });

  assert.equal(CoordinationError, ServiceCoordinationError);
  assert.deepEqual(Object.keys(coordination).sort(), METHODS);
  for (const method of METHODS) {
    assert.equal(typeof coordination[method], "function");
  }
});

test("factory maps only coordination config into a fresh lazy Redis queue", () => {
  const calls = [];
  const queueFactory = (options) => {
    calls.push(structuredClone(options));
    return createRecordingQueue(`queue-${calls.length}`);
  };
  const config = {
    coordinationRedisUrl: "redis://isolated.invalid:6379/4",
    coordinationPrefix: "agents:custom:v1",
    coordinationInboxMaxLen: 77,
    coordinationOrphanInboxTtlMs: 88_000,
    coordinationLeaseDefaultMs: 11_000,
    coordinationLeaseMaxMs: 22_000,
    coordinationMessageMaxBytes: 333,
    coordinationMaxBlockMs: 444,
    coordinationDedupeTtlMs: 55_000,
    coordinationAckTombstoneTtlMs: 66_000,
    messageAccessSecret: "must-not-be-forwarded",
    redisStream: "agents:events",
  };

  const first = createCoordination({ config, queueFactory });
  const second = createCoordination({ config, queueFactory });

  assert.notEqual(first, second);
  assert.deepEqual(calls, [
    {
      redisUrl: "redis://isolated.invalid:6379/4",
      prefix: "agents:custom:v1",
      maxInboxLength: 77,
      orphanInboxTtlMs: 88_000,
    },
    {
      redisUrl: "redis://isolated.invalid:6379/4",
      prefix: "agents:custom:v1",
      maxInboxLength: 77,
      orphanInboxTtlMs: 88_000,
    },
  ]);
});

test("factory rejects a prefix that aliases agents:events before queue construction", () => {
  let queueFactoryCalls = 0;

  assert.throws(
    () =>
      createCoordination({
        config: {
          coordinationPrefix: "agents",
        },
        queueFactory: () => {
          queueFactoryCalls += 1;
          return createRecordingQueue("unsafe");
        },
      }),
    /legacy audit stream/i,
  );
  assert.equal(queueFactoryCalls, 0);
});

test("factory accepts the contract maximum prefix through service operations", async () => {
  const prefix = `p${"a".repeat(255)}`;
  assert.equal(prefix.length, 256);

  const coordination = createCoordination({
    config: { coordinationPrefix: prefix },
    queueFactory(options) {
      return {
        enabled: true,
        describe() {
          return {
            enabled: true,
            prefix: options.prefix,
            eventsStream: `${options.prefix}:events`,
            consumerGroup: "coordination-v1",
          };
        },
        async putParticipant() {
          return { status: "stored" };
        },
      };
    },
  });

  const registered = await coordination.register({
    participantType: "orchestrator",
    scopeId: "project:v5",
  });

  assert.equal(registered.queue.prefix, prefix);
  assert.equal(registered.queue.eventsStream, `${prefix}:events`);
});

test("an injected queue cannot publish coordination metadata to agents:events", async () => {
  let writes = 0;
  const coordination = createCoordination({
    queue: {
      enabled: true,
      describe() {
        return {
          enabled: true,
          prefix: "agents",
          eventsStream: "agents:events",
          consumerGroup: "coordination-v1",
        };
      },
      async putParticipant() {
        writes += 1;
        return { status: "stored" };
      },
    },
  });

  await assert.rejects(
    coordination.register({
      participantType: "orchestrator",
      scopeId: "project:v5",
    }),
    (err) =>
      err instanceof CoordinationError
      && err.code === "COORDINATION_INTERNAL_ERROR",
  );
  assert.equal(writes, 0);
});

test("every direct operation rejects a reserved injected stream before queue access", async () => {
  const now = Date.parse("2026-07-25T12:00:00.000Z");
  const leaseToken = "lease-token-with-at-least-32-characters";
  const participant = {
    protocolVersion: 1,
    participantId: "pt-existing",
    participantType: "orchestrator",
    scopeId: "project:v5",
    capabilities: ["coordination.v1"],
    metadata: {},
    registeredAt: "2026-07-25T11:59:00.000Z",
    lastHeartbeatAt: "2026-07-25T11:59:00.000Z",
    leaseExpiresAt: "2026-07-25T12:01:00.000Z",
    leaseTokenHash: crypto
      .createHash("sha256")
      .update(leaseToken)
      .digest("hex"),
  };
  const cases = [
    ["register", {
      participantType: "orchestrator",
      scopeId: "project:v5",
    }],
    ["heartbeat", {
      participantId: participant.participantId,
      leaseToken,
    }],
    ["discover", {
      participantId: participant.participantId,
      leaseToken,
    }],
    ["unregister", {
      participantId: participant.participantId,
      leaseToken,
    }],
    ["send", {
      participantId: participant.participantId,
      leaseToken,
      toParticipantId: participant.participantId,
      messageType: "NOTICE",
      classification: "internal",
      body: "safe metadata",
    }],
    ["receive", {
      participantId: participant.participantId,
      leaseToken,
      consumerId: "consumer-a",
    }],
    ["ack", {
      participantId: participant.participantId,
      leaseToken,
      deliveryIds: ["1-0"],
    }],
  ];

  for (const [method, input] of cases) {
    const queueCalls = [];
    const queue = {
      enabled: true,
      describe() {
        return {
          enabled: true,
          prefix: "agents",
          eventsStream: "agents:events",
          consumerGroup: "coordination-v1",
        };
      },
      async getParticipant() {
        queueCalls.push("getParticipant");
        return structuredClone(participant);
      },
      async putParticipant() {
        queueCalls.push("putParticipant");
        return { status: "stored" };
      },
      async listParticipants() {
        queueCalls.push("listParticipants");
        return { status: "listed", participants: [structuredClone(participant)] };
      },
      async deleteParticipant() {
        queueCalls.push("deleteParticipant");
        return { status: "deleted" };
      },
      async putMessage() {
        queueCalls.push("putMessage");
        return { status: "created", deliveryId: "1-0" };
      },
      async readInbox() {
        queueCalls.push("readInbox");
        return { status: "read", deliveries: [] };
      },
      async ackInbox() {
        queueCalls.push("ackInbox");
        return { status: "acked", ackedCount: 0 };
      },
    };
    const coordination = createCoordination({
      queue,
      clock: () => now,
    });

    await assert.rejects(
      coordination[method](input),
      (err) =>
        err instanceof CoordinationError
        && err.code === "COORDINATION_INTERNAL_ERROR",
      method,
    );
    assert.deepEqual(queueCalls, [], method);
  }
});

test("an injected queue bypasses queue construction and receives service dependencies", async () => {
  const queue = createRecordingQueue("injected");
  let queueFactoryCalls = 0;
  const audits = [];
  const now = Date.parse("2026-07-25T12:00:00.000Z");
  const token = crypto.randomBytes(32).toString("base64url");
  const coordination = createCoordination({
    config: {
      coordinationScopeId: "project:v5",
      coordinationLeaseDefaultMs: 12_000,
      coordinationLeaseMaxMs: 24_000,
    },
    queue,
    queueFactory: () => {
      queueFactoryCalls += 1;
      throw new Error("queue factory must not run");
    },
    clock: () => now,
    randomUUID: () => "factory-participant",
    randomToken: () => token,
    audit: (event) => audits.push(event),
  });

  const registered = await coordination.register({
    participantType: "orchestrator",
    capabilities: ["coordination.v1"],
  });

  assert.equal(queueFactoryCalls, 0);
  assert.equal(registered.participantId, "pt-factory-participant");
  assert.equal(registered.scopeId, "project:v5");
  assert.equal(registered.leaseToken, token);
  assert.equal(queue.records.length, 1);
  assert.deepEqual(queue.records[0].options, {
    ttlMs: 12_000,
    ifAbsent: true,
  });
  assert.equal(
    queue.records[0].record.leaseExpiresAt,
    "2026-07-25T12:00:12.000Z",
  );
  assert.equal(audits.length, 1);
  assert.equal(Object.hasOwn(audits[0], "leaseToken"), false);
});

test("service config is snapshotted and does not share mutable instance state", async () => {
  const queues = [
    createRecordingQueue("first"),
    createRecordingQueue("second"),
  ];
  const config = {
    coordinationLeaseDefaultMs: 10_000,
    coordinationLeaseMaxMs: 20_000,
  };
  const first = createCoordination({
    config,
    queueFactory: () => queues.shift(),
    clock: () => Date.parse("2026-07-25T12:00:00.000Z"),
    randomUUID: () => "first",
    randomToken: () => crypto.randomBytes(32).toString("base64url"),
  });
  config.coordinationLeaseDefaultMs = 19_000;
  const second = createCoordination({
    config,
    queueFactory: () => queues.shift(),
    clock: () => Date.parse("2026-07-25T12:00:00.000Z"),
    randomUUID: () => "second",
    randomToken: () => crypto.randomBytes(32).toString("base64url"),
  });

  const firstRegistration = await first.register({
    participantType: "orchestrator",
    scopeId: "project:v5",
  });
  const secondRegistration = await second.register({
    participantType: "orchestrator",
    scopeId: "project:v5",
  });

  assert.equal(
    firstRegistration.leaseExpiresAt,
    "2026-07-25T12:00:10.000Z",
  );
  assert.equal(
    secondRegistration.leaseExpiresAt,
    "2026-07-25T12:00:19.000Z",
  );
});

test("default construction is side-effect free even for an unreachable URL", async () => {
  const coordination = createCoordination({
    config: {
      coordinationRedisUrl: "redis://127.0.0.1:1",
    },
  });
  assert.deepEqual(Object.keys(coordination).sort(), METHODS);

  await assert.rejects(
    coordination.register({
      participantType: "orchestrator",
      scopeId: "project:v5",
    }),
    (err) =>
      err instanceof CoordinationError
      && err.code === "COORDINATION_UNAVAILABLE",
  );
});
