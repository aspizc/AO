import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  CoordinationError,
  createCoordinationService,
} from "../../gateway/src/services/coordination_service.js";

const START = Date.parse("2026-07-25T10:00:00.000Z");
const MAX_STREAM_ID_COMPONENT = "18446744073709551615";
const TOKENS = [
  "ack-recipient-a-token-with-at-least-thirty-two-chars",
  "ack-recipient-b-token-with-at-least-thirty-two-chars",
];

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function fenceMatches(record, fence) {
  return Boolean(
    record
    && record.participantId === fence.participantId
    && record.scopeId === fence.scopeId
    && record.leaseTokenHash === fence.leaseTokenHash,
  );
}

class AckQueue {
  constructor({ now }) {
    this.enabled = true;
    this.now = now;
    this.participants = new Map();
    this.pending = new Map();
    this.tombstones = new Map();
    this.ackCalls = [];
    this.beforeAck = null;
    this.ackError = null;
    this.forcedResult = null;
  }

  describe() {
    return {
      enabled: true,
      prefix: "test:coord:v1",
      eventsStream: "test:coord:v1:events",
      consumerGroup: "coordination-v1",
    };
  }

  async putParticipant(record, { ifAbsent }) {
    if (!ifAbsent) throw new Error("unexpected lifecycle write");
    if (this.participants.has(record.participantId)) return { status: "exists" };
    this.participants.set(record.participantId, structuredClone(record));
    this.pending.set(record.participantId, new Set());
    return { status: "stored" };
  }

  async getParticipant(participantId) {
    return structuredClone(this.participants.get(participantId) ?? null);
  }

  addPending(participantId, ...deliveryIds) {
    for (const deliveryId of deliveryIds) {
      this.pending.get(participantId).add(deliveryId);
    }
  }

  tombstoneKey(participantId, deliveryId) {
    return `${participantId}\u0000${deliveryId}`;
  }

  async ackInbox(options) {
    this.ackCalls.push(structuredClone(options));
    if (this.ackError) throw this.ackError;
    this.beforeAck?.();
    this.beforeAck = null;
    if (!fenceMatches(this.participants.get(options.participantId), options.fence)) {
      return { status: "fence_mismatch" };
    }
    if (this.forcedResult) return structuredClone(this.forcedResult);

    const pending = this.pending.get(options.participantId);
    const newlyAcked = [];
    for (const deliveryId of options.deliveryIds) {
      const tombstoneExpiresAt = this.tombstones.get(
        this.tombstoneKey(options.participantId, deliveryId),
      );
      if (pending.has(deliveryId)) {
        newlyAcked.push(deliveryId);
      } else if (!(tombstoneExpiresAt > this.now())) {
        return { status: "delivery_not_found" };
      }
    }

    for (const deliveryId of newlyAcked) pending.delete(deliveryId);
    for (const deliveryId of options.deliveryIds) {
      this.tombstones.set(
        this.tombstoneKey(options.participantId, deliveryId),
        this.now() + options.tombstoneTtlMs,
      );
    }
    return { status: "acked", ackedCount: newlyAcked.length };
  }
}

function createHarness({ tombstoneTtlMs = 1_000 } = {}) {
  let now = START;
  const queue = new AckQueue({ now: () => now });
  const ids = ["recipient-a", "recipient-b"];
  const tokens = [...TOKENS];
  const audits = [];
  const service = createCoordinationService({
    queue,
    config: {
      coordinationLeaseDefaultMs: 30_000,
      coordinationLeaseMaxMs: 300_000,
      coordinationAckTombstoneTtlMs: tombstoneTtlMs,
    },
    clock: () => now,
    randomUUID: () => ids.shift(),
    randomToken: () => tokens.shift(),
    audit: (event) => audits.push(event),
  });

  return {
    audits,
    queue,
    service,
    advance(ms) {
      now += ms;
    },
    now: () => now,
    async register() {
      return service.register({
        participantType: "agent",
        scopeId: "project:v5",
        capabilities: ["coordination.v1"],
      });
    },
    resetObservations() {
      audits.length = 0;
      queue.ackCalls.length = 0;
    },
  };
}

function ackInput(recipient, deliveryIds, overrides = {}) {
  return {
    participantId: recipient.participantId,
    leaseToken: recipient.leaseToken,
    deliveryIds,
    ...overrides,
  };
}

async function expectCode(promise, code) {
  await assert.rejects(
    promise,
    (err) =>
      err instanceof CoordinationError
      && err.code === code
      && !err.message.includes("sentinel"),
  );
}

test("ack atomically acknowledges a recipient-scoped delivery batch", async () => {
  const harness = createHarness();
  const recipient = await harness.register();
  harness.queue.addPending(recipient.participantId, "1-0", "2-0");
  harness.resetObservations();

  const result = await harness.service.ack(
    ackInput(recipient, ["1-0", "2-0"]),
  );

  assert.deepEqual(result, {
    ackedCount: 2,
    deliveryIds: ["1-0", "2-0"],
  });
  assert.deepEqual(harness.queue.ackCalls, [{
    participantId: recipient.participantId,
    deliveryIds: ["1-0", "2-0"],
    tombstoneTtlMs: 1_000,
    timestamp: "2026-07-25T10:00:00.000Z",
    fence: {
      participantId: recipient.participantId,
      scopeId: recipient.scopeId,
      leaseTokenHash: tokenHash(TOKENS[0]),
    },
  }]);
  assert.deepEqual(harness.audits, [{
    type: "COORDINATION_MESSAGES_ACKNOWLEDGED",
    participantId: recipient.participantId,
    scopeId: recipient.scopeId,
    timestamp: harness.now(),
    ackedCount: 2,
    deliveryIds: ["1-0", "2-0"],
  }]);
  assert.doesNotMatch(JSON.stringify(harness.audits), /leaseToken|leaseTokenHash|body/);
});

test("ack requires one dense, unique, bounded batch of Redis delivery IDs", async () => {
  const sparse = Array(1);
  const duplicate = ["1-0", "1-0"];
  const tooMany = Array.from({ length: 101 }, (_, index) => `${index + 1}-0`);
  for (const deliveryIds of [
    [],
    sparse,
    duplicate,
    tooMany,
    ["sentinel-invalid"],
    ["01-0"],
    ["0-0"],
    ["18446744073709551616-0"],
    ["0-18446744073709551616"],
  ]) {
    const harness = createHarness();
    const recipient = await harness.register();
    harness.resetObservations();
    await expectCode(
      harness.service.ack(ackInput(recipient, deliveryIds)),
      "COORDINATION_INVALID_INPUT",
    );
    assert.equal(harness.queue.ackCalls.length, 0);
  }

  const harness = createHarness();
  const recipient = await harness.register();
  harness.resetObservations();
  await expectCode(
    harness.service.ack({
      ...ackInput(recipient, ["1-0"]),
      unexpected: "sentinel",
    }),
    "COORDINATION_INVALID_INPUT",
  );
  assert.equal(harness.queue.ackCalls.length, 0);
});

test("ack accepts the inclusive 100-item limit and unsigned 64-bit ID boundary", async () => {
  const harness = createHarness();
  const recipient = await harness.register();
  const deliveryIds = Array.from(
    { length: 99 },
    (_, index) => `${index + 1}-0`,
  );
  deliveryIds.push(`${MAX_STREAM_ID_COMPONENT}-${MAX_STREAM_ID_COMPONENT}`);
  harness.queue.addPending(recipient.participantId, ...deliveryIds);
  harness.resetObservations();

  assert.deepEqual(
    await harness.service.ack(ackInput(recipient, deliveryIds)),
    { ackedCount: 100, deliveryIds },
  );
  assert.equal(harness.queue.ackCalls.length, 1);
  assert.deepEqual(harness.queue.ackCalls[0].deliveryIds, deliveryIds);
});

test("ack rejects a mixed unknown batch without partially acknowledging valid IDs", async () => {
  const harness = createHarness();
  const recipient = await harness.register();
  harness.queue.addPending(recipient.participantId, "1-0");
  harness.resetObservations();

  await expectCode(
    harness.service.ack(ackInput(recipient, ["1-0", "999-0"])),
    "COORDINATION_DELIVERY_NOT_FOUND",
  );

  assert.deepEqual([...harness.queue.pending.get(recipient.participantId)], ["1-0"]);
  assert.equal(harness.queue.tombstones.size, 0);
  assert.deepEqual(harness.audits, []);
});

test("ack cannot acknowledge a delivery that belongs only to another inbox", async () => {
  const harness = createHarness();
  const recipientA = await harness.register();
  const recipientB = await harness.register();
  harness.queue.addPending(recipientB.participantId, "7-0");
  harness.resetObservations();

  await expectCode(
    harness.service.ack(ackInput(recipientA, ["7-0"])),
    "COORDINATION_DELIVERY_NOT_FOUND",
  );

  assert.ok(harness.queue.pending.get(recipientB.participantId).has("7-0"));
});

test("ack exact retry is a zero-count no-op that renews its tombstone window", async () => {
  const harness = createHarness({ tombstoneTtlMs: 1_000 });
  const recipient = await harness.register();
  harness.queue.addPending(recipient.participantId, "1-0");
  harness.resetObservations();

  assert.equal(
    (await harness.service.ack(ackInput(recipient, ["1-0"]))).ackedCount,
    1,
  );
  assert.equal(harness.audits.length, 1);
  harness.advance(500);
  assert.deepEqual(
    await harness.service.ack(ackInput(recipient, ["1-0"])),
    { ackedCount: 0, deliveryIds: ["1-0"] },
  );
  assert.equal(harness.audits.length, 1);
  assert.equal(
    harness.queue.tombstones.get(
      harness.queue.tombstoneKey(recipient.participantId, "1-0"),
    ),
    START + 1_500,
  );

  harness.queue.addPending(recipient.participantId, "2-0");
  assert.deepEqual(
    await harness.service.ack(ackInput(recipient, ["1-0", "2-0"])),
    { ackedCount: 1, deliveryIds: ["1-0", "2-0"] },
  );
  assert.equal(harness.audits.length, 2);

  harness.advance(1_001);
  await expectCode(
    harness.service.ack(ackInput(recipient, ["1-0"])),
    "COORDINATION_DELIVERY_NOT_FOUND",
  );
});

test("ack rejects wrong, expired, missing, and replacement credentials", async () => {
  const wrong = createHarness();
  const wrongRecipient = await wrong.register();
  wrong.queue.addPending(wrongRecipient.participantId, "1-0");
  await expectCode(
    wrong.service.ack(ackInput(wrongRecipient, ["1-0"], {
      leaseToken: "wrong-ack-token-with-at-least-thirty-two-characters",
    })),
    "COORDINATION_AUTH_FAILED",
  );

  const expired = createHarness();
  const expiredRecipient = await expired.register();
  expired.queue.addPending(expiredRecipient.participantId, "1-0");
  expired.queue.participants.get(expiredRecipient.participantId).leaseExpiresAt =
    "2026-07-25T10:00:00.000Z";
  await expectCode(
    expired.service.ack(ackInput(expiredRecipient, ["1-0"])),
    "COORDINATION_LEASE_EXPIRED",
  );

  const missing = createHarness();
  const missingRecipient = await missing.register();
  missing.queue.participants.delete(missingRecipient.participantId);
  await expectCode(
    missing.service.ack(ackInput(missingRecipient, ["1-0"])),
    "COORDINATION_AUTH_FAILED",
  );

  const replaced = createHarness();
  const replacedRecipient = await replaced.register();
  replaced.queue.addPending(replacedRecipient.participantId, "1-0");
  replaced.resetObservations();
  replaced.queue.beforeAck = () => {
    replaced.queue.participants.get(
      replacedRecipient.participantId,
    ).leaseTokenHash = tokenHash(
      "replacement-ack-token-with-at-least-thirty-two-chars",
    );
  };
  await expectCode(
    replaced.service.ack(ackInput(replacedRecipient, ["1-0"])),
    "COORDINATION_LEASE_CHANGED",
  );
  assert.ok(replaced.queue.pending.get(replacedRecipient.participantId).has("1-0"));
  assert.deepEqual(replaced.audits, []);
});

test("ack validates queue results and maps dependency failures safely", async () => {
  for (const forcedResult of [
    { status: "acked", ackedCount: -1 },
    { status: "acked", ackedCount: 2 },
    { status: "acked", ackedCount: 0.5 },
    { status: "sentinel_unknown", ackedCount: 0 },
  ]) {
    const harness = createHarness();
    const recipient = await harness.register();
    harness.queue.addPending(recipient.participantId, "1-0");
    harness.resetObservations();
    harness.queue.forcedResult = forcedResult;
    await expectCode(
      harness.service.ack(ackInput(recipient, ["1-0"])),
      "COORDINATION_INTERNAL_ERROR",
    );
  }

  const unavailable = createHarness();
  const recipient = await unavailable.register();
  unavailable.queue.addPending(recipient.participantId, "1-0");
  unavailable.resetObservations();
  unavailable.queue.ackError = new CoordinationError(
    "COORDINATION_UNAVAILABLE",
    "sentinel Redis credentials",
  );
  await expectCode(
    unavailable.service.ack(ackInput(recipient, ["1-0"])),
    "COORDINATION_UNAVAILABLE",
  );
});
