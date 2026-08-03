import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CoordinationError,
  createCoordinationAuditEvent,
  createCoordinationService,
} from "../../gateway/src/services/coordination_service.js";

function queue({ enabled = true } = {}) {
  return {
    enabled,
    async ping() {
      return { status: "ready" };
    },
    describe() {
      return {
        enabled,
        prefix: "test:coord:v1",
        eventsStream: "test:coord:v1:events",
        consumerGroup: "coordination-v1",
      };
    },
  };
}

async function expectCode(promise, code) {
  await assert.rejects(
    promise,
    (err) => err instanceof CoordinationError && err.code === code && !err.message.includes("sentinel"),
  );
}

test("coordination service exposes exactly the eight direct operations", () => {
  const service = createCoordinationService({ queue: queue() });

  assert.deepEqual(
    Object.keys(service).sort(),
    ["ack", "discover", "heartbeat", "receive", "register", "send", "status", "unregister"],
  );
  assert.ok(Object.values(service).every((operation) => typeof operation === "function"));
});

test("status proves transport readiness without registration or domain audit", async () => {
  const audits = [];
  let pingCalls = 0;
  const readyQueue = queue();
  readyQueue.ping = async () => {
    pingCalls += 1;
    return { status: "ready" };
  };
  const service = createCoordinationService({
    queue: readyQueue,
    config: {
      coordinationScopeId: "project:agents-orchestrator",
      coordinationLeaseDefaultMs: 900_000,
      coordinationLeaseMaxMs: 3_600_000,
    },
    audit: (event) => audits.push(event),
  });

  assert.deepEqual(await service.status({}), {
    protocolVersion: 1,
    status: "ready",
    scopeId: "project:agents-orchestrator",
    queue: {
      enabled: true,
      prefix: "test:coord:v1",
      eventsStream: "test:coord:v1:events",
      consumerGroup: "coordination-v1",
    },
    limits: {
      leaseDefaultMs: 900_000,
      leaseMaxMs: 3_600_000,
    },
  });
  assert.equal(pingCalls, 1);
  assert.deepEqual(audits, []);
});

test("status maps disabled or unreachable transport separately from invalid health data", async () => {
  const disabled = createCoordinationService({
    queue: queue({ enabled: false }),
  });
  await expectCode(disabled.status({}), "COORDINATION_UNAVAILABLE");

  const unreachableQueue = queue();
  unreachableQueue.ping = async () => {
    const err = new Error("sentinel Redis address");
    err.code = "COORDINATION_UNAVAILABLE";
    throw err;
  };
  const unreachable = createCoordinationService({ queue: unreachableQueue });
  await expectCode(unreachable.status({}), "COORDINATION_UNAVAILABLE");

  const invalidQueue = queue();
  invalidQueue.ping = async () => ({ status: "unexpected-sentinel" });
  const invalid = createCoordinationService({ queue: invalidQueue });
  await expectCode(invalid.status({}), "COORDINATION_INTERNAL_ERROR");
  await expectCode(
    invalid.status({ unexpected: "sentinel" }),
    "COORDINATION_INVALID_INPUT",
  );
});

test("direct service validates lease and canonical scope configuration at construction", () => {
  for (const config of [
    { coordinationLeaseDefaultMs: 0 },
    { coordinationLeaseMaxMs: 0 },
    { coordinationLeaseDefaultMs: 1.5 },
    { coordinationLeaseMaxMs: 1.5 },
    {
      coordinationLeaseDefaultMs: 3_600_001,
      coordinationLeaseMaxMs: 3_600_000,
    },
    { coordinationScopeId: "scope with spaces" },
  ]) {
    assert.throws(
      () => createCoordinationService({ queue: queue(), config }),
      TypeError,
    );
  }
});

test("service message byte limit cannot exceed the v1 envelope schema boundary", () => {
  assert.doesNotThrow(() =>
    createCoordinationService({
      queue: queue(),
      config: {
        coordinationMessageMaxBytes: 65_536,
      },
    }),
  );
  assert.throws(
    () =>
      createCoordinationService({
        queue: queue(),
        config: {
          coordinationMessageMaxBytes: 65_537,
        },
      }),
    /coordinationMessageMaxBytes must not exceed 65536/,
  );
});

test("disabled coordination fails explicitly without touching a queue operation", async () => {
  const service = createCoordinationService({ queue: queue({ enabled: false }) });

  await expectCode(
    service.register({
      participantType: "orchestrator",
      scopeId: "project:v5",
    }),
    "COORDINATION_UNAVAILABLE",
  );
});

test("direct service validation rejects unknown and malformed fields safely", async () => {
  const service = createCoordinationService({ queue: queue() });

  await expectCode(
    service.register({
      participantType: "orchestrator",
      scopeId: "project:v5",
      unexpected: "sentinel-sensitive-value",
    }),
    "COORDINATION_INVALID_INPUT",
  );
  await expectCode(
    service.register({
      participantType: "unknown",
      scopeId: "scope with spaces",
    }),
    "COORDINATION_INVALID_INPUT",
  );
});

test("coordination errors serialize a stable code without a cause or stack payload", () => {
  const err = new CoordinationError("COORDINATION_INVALID_INPUT", "invalid coordination input");

  assert.equal(err.name, "CoordinationError");
  assert.equal(err.code, "COORDINATION_INVALID_INPUT");
  assert.equal(JSON.stringify(err), JSON.stringify({ name: "CoordinationError", code: "COORDINATION_INVALID_INPUT" }));
});

test("coordination audit events are immutable allowlisted metadata projections", () => {
  const source = {
    type: "COORDINATION_MESSAGE_SENT",
    participantId: "pt-sender",
    toParticipantId: "pt-recipient",
    messageId: "msg-1",
    deliveryId: "1700000000000-0",
    duplicate: false,
    deliveryCount: 1,
    deliveryIds: ["1700000000000-0"],
    leaseToken: "sentinel-lease-token",
    leaseTokenHash: "sentinel-lease-hash",
    body: { secret: "sentinel-body" },
    metadata: { secret: "sentinel-metadata" },
    redisUrl: "redis://sentinel-credentials",
  };

  const event = createCoordinationAuditEvent(source);

  assert.deepEqual(event, {
    type: "COORDINATION_MESSAGE_SENT",
    participantId: "pt-sender",
    toParticipantId: "pt-recipient",
    messageId: "msg-1",
    deliveryId: "1700000000000-0",
    duplicate: false,
    deliveryCount: 1,
    deliveryIds: ["1700000000000-0"],
  });
  assert.ok(Object.isFrozen(event));
  assert.ok(Object.isFrozen(event.deliveryIds));
  assert.notStrictEqual(event.deliveryIds, source.deliveryIds);
  assert.doesNotMatch(JSON.stringify(event), /sentinel|leaseToken|body|metadata|redisUrl/);
});
