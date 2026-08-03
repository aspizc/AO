import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  CoordinationError,
  createCoordinationService,
} from "../../gateway/src/services/coordination_service.js";

const START = Date.parse("2026-07-25T10:00:00.000Z");
const TOKEN = "receive-lease-token-with-at-least-thirty-two-chars";

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

function message({
  messageId = "cm-receive",
  toParticipantId = "pt-recipient",
  scopeId = "project:v5",
} = {}) {
  return {
    protocolVersion: 1,
    messageId,
    fromParticipantId: "pt-sender",
    toParticipantId,
    scopeId,
    messageType: "IMPACT_NOTICE",
    classification: "internal",
    body: "Review the pending coordination change.",
    createdAt: "2026-07-25T09:59:59.000Z",
  };
}

class ReceiveQueue {
  constructor({ now }) {
    this.enabled = true;
    this.now = now;
    this.participants = new Map();
    this.inboxes = new Map();
    this.readCalls = [];
    this.beforeRead = null;
    this.afterRead = null;
    this.readError = null;
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
    this.inboxes.set(record.participantId, []);
    return { status: "stored" };
  }

  async getParticipant(participantId) {
    return structuredClone(this.participants.get(participantId) ?? null);
  }

  enqueue(participantId, deliveryId, envelope = message({ toParticipantId: participantId })) {
    this.inboxes.get(participantId).push({
      deliveryId,
      message: structuredClone(envelope),
      consumerId: null,
      deliveredAt: null,
    });
  }

  async readInbox(options) {
    this.readCalls.push(structuredClone(options));
    if (this.readError) throw this.readError;
    this.beforeRead?.();
    this.beforeRead = null;
    const participant = this.participants.get(options.participantId);
    if (!fenceMatches(participant, options.fence)) {
      return { status: "fence_mismatch" };
    }
    if (this.forcedResult) return structuredClone(this.forcedResult);

    const inbox = this.inboxes.get(options.participantId) ?? [];
    const deliveries = [];
    if (options.reclaimIdleMs !== null) {
      for (const delivery of inbox) {
        if (deliveries.length >= options.count) break;
        if (
          delivery.consumerId
          && this.now() - delivery.deliveredAt >= options.reclaimIdleMs
        ) {
          delivery.consumerId = options.consumerId;
          delivery.deliveredAt = this.now();
          deliveries.push({
            deliveryId: delivery.deliveryId,
            message: structuredClone(delivery.message),
            recovered: true,
          });
        }
      }
    }
    for (const delivery of inbox) {
      if (deliveries.length >= options.count) break;
      if (delivery.consumerId) continue;
      delivery.consumerId = options.consumerId;
      delivery.deliveredAt = this.now();
      deliveries.push({
        deliveryId: delivery.deliveryId,
        message: structuredClone(delivery.message),
        recovered: false,
      });
    }

    this.afterRead?.();
    this.afterRead = null;
    if (
      options.blockMs > 0
      && !fenceMatches(
        this.participants.get(options.participantId),
        options.fence,
      )
    ) {
      return { status: "fence_mismatch" };
    }
    return { status: "read", deliveries };
  }
}

async function createHarness() {
  let now = START;
  const queue = new ReceiveQueue({ now: () => now });
  const audits = [];
  const service = createCoordinationService({
    queue,
    config: {
      coordinationLeaseDefaultMs: 30_000,
      coordinationLeaseMaxMs: 300_000,
      coordinationMessageMaxBytes: 65_536,
      coordinationMaxBlockMs: 30_000,
    },
    clock: () => now,
    randomUUID: () => "recipient",
    randomToken: () => TOKEN,
    audit: (event) => audits.push(event),
  });
  const recipient = await service.register({
    participantType: "agent",
    scopeId: "project:v5",
    capabilities: ["coordination.v1"],
  });
  audits.length = 0;

  return {
    audits,
    queue,
    recipient,
    service,
    advance(ms) {
      now += ms;
    },
    now: () => now,
  };
}

function receiveInput(recipient, overrides = {}) {
  return {
    participantId: recipient.participantId,
    leaseToken: recipient.leaseToken,
    consumerId: "consumer-a",
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

test("receive returns bounded public deliveries through the recipient fence", async () => {
  const { audits, queue, recipient, service, now } = await createHarness();
  queue.enqueue(recipient.participantId, "1-0");

  const deliveries = await service.receive(receiveInput(recipient));

  assert.deepEqual(deliveries, [{
    deliveryId: "1-0",
    message: message({ toParticipantId: recipient.participantId }),
    recovered: false,
  }]);
  assert.deepEqual(queue.readCalls, [{
    participantId: recipient.participantId,
    consumerId: "consumer-a",
    count: 10,
    reclaimIdleMs: null,
    blockMs: 0,
    now: START,
    fence: {
      participantId: recipient.participantId,
      scopeId: recipient.scopeId,
      leaseTokenHash: tokenHash(TOKEN),
    },
  }]);
  assert.deepEqual(audits, [{
    type: "COORDINATION_MESSAGES_RECEIVED",
    participantId: recipient.participantId,
    scopeId: recipient.scopeId,
    timestamp: now(),
    deliveryCount: 1,
    deliveryIds: ["1-0"],
  }]);
  assert.doesNotMatch(JSON.stringify(audits), /pending coordination change|body|leaseToken/);
});

test("receive returns an empty poll without emitting an audit event", async () => {
  const { audits, recipient, service } = await createHarness();

  const deliveries = await service.receive(receiveInput(recipient));

  assert.deepEqual(deliveries, []);
  assert.deepEqual(audits, []);
});

test("receive reclaims an abandoned delivery before reading new work", async () => {
  const { queue, recipient, service, advance } = await createHarness();
  queue.enqueue(recipient.participantId, "1-0");
  queue.enqueue(recipient.participantId, "2-0", message({
    messageId: "cm-new",
    toParticipantId: recipient.participantId,
  }));

  const first = await service.receive(receiveInput(recipient, {
    count: 1,
  }));
  assert.equal(first[0].recovered, false);
  assert.equal(first[0].deliveryId, "1-0");

  advance(5_000);
  const second = await service.receive(receiveInput(recipient, {
    consumerId: "consumer-b",
    count: 2,
    reclaimIdleMs: 5_000,
  }));

  assert.deepEqual(
    second.map(({ deliveryId, recovered }) => ({ deliveryId, recovered })),
    [
      { deliveryId: "1-0", recovered: true },
      { deliveryId: "2-0", recovered: false },
    ],
  );
});

test("receive strictly validates consumer, count, reclaim, block, and unknown fields", async () => {
  const invalid = [
    { consumerId: "unsafe consumer" },
    { count: 0 },
    { count: 101 },
    { count: 1.5 },
    { reclaimIdleMs: -1 },
    { reclaimIdleMs: 1.5 },
    { blockMs: -1 },
    { blockMs: 30_001 },
    { blockMs: 1.5 },
    { unexpected: "sentinel" },
  ];
  for (const overrides of invalid) {
    const { queue, recipient, service } = await createHarness();
    await expectCode(
      service.receive(receiveInput(recipient, overrides)),
      "COORDINATION_INVALID_INPUT",
    );
    assert.equal(queue.readCalls.length, 0);
  }
});

test("receive accepts zero reclaim idle and the inclusive block maximum", async () => {
  const { queue, recipient, service } = await createHarness();

  assert.deepEqual(
    await service.receive(receiveInput(recipient, {
      count: 100,
      reclaimIdleMs: 0,
      blockMs: 30_000,
    })),
    [],
  );
  assert.equal(queue.readCalls[0].count, 100);
  assert.equal(queue.readCalls[0].reclaimIdleMs, 0);
  assert.equal(queue.readCalls[0].blockMs, 30_000);
});

test("receive rejects missing, wrong, and expired recipient credentials", async () => {
  const wrong = await createHarness();
  await expectCode(
    wrong.service.receive(receiveInput(wrong.recipient, {
      leaseToken: "wrong-receive-token-with-at-least-thirty-two-chars",
    })),
    "COORDINATION_AUTH_FAILED",
  );

  const expired = await createHarness();
  expired.queue.participants.get(expired.recipient.participantId).leaseExpiresAt =
    "2026-07-25T10:00:00.000Z";
  await expectCode(
    expired.service.receive(receiveInput(expired.recipient)),
    "COORDINATION_LEASE_EXPIRED",
  );

  const missing = await createHarness();
  missing.queue.participants.delete(missing.recipient.participantId);
  await expectCode(
    missing.service.receive(receiveInput(missing.recipient)),
    "COORDINATION_AUTH_FAILED",
  );
});

test("receive discloses nothing on nonblocking and blocking replacement races", async () => {
  const nonblocking = await createHarness();
  nonblocking.queue.enqueue(nonblocking.recipient.participantId, "1-0");
  nonblocking.queue.beforeRead = () => {
    nonblocking.queue.participants.get(
      nonblocking.recipient.participantId,
    ).leaseTokenHash = tokenHash(
      "replacement-receive-token-with-at-least-thirty-two-chars",
    );
  };
  await expectCode(
    nonblocking.service.receive(receiveInput(nonblocking.recipient)),
    "COORDINATION_LEASE_CHANGED",
  );
  assert.equal(
    nonblocking.queue.inboxes.get(nonblocking.recipient.participantId)[0].consumerId,
    null,
  );

  const blocking = await createHarness();
  blocking.queue.enqueue(blocking.recipient.participantId, "1-0");
  blocking.queue.afterRead = () => {
    blocking.queue.participants.get(
      blocking.recipient.participantId,
    ).leaseTokenHash = tokenHash(
      "replacement-receive-token-with-at-least-thirty-two-chars",
    );
  };
  await expectCode(
    blocking.service.receive(receiveInput(blocking.recipient, {
      blockMs: 1_000,
    })),
    "COORDINATION_LEASE_CHANGED",
  );
  assert.equal(
    blocking.queue.inboxes.get(blocking.recipient.participantId)[0].consumerId,
    "consumer-a",
  );
  assert.deepEqual(blocking.audits, []);
});

test("receive rejects cross-inbox, oversized, duplicate, and malformed queue deliveries", async () => {
  const cases = [
    {
      status: "read",
      deliveries: Array(1),
    },
    {
      status: "read",
      deliveries: [{
        deliveryId: "1-0",
        message: message({ toParticipantId: "pt-other" }),
        recovered: false,
      }],
    },
    {
      status: "read",
      deliveries: Array.from({ length: 11 }, (_, index) => ({
        deliveryId: `${index + 1}-0`,
        message: message({
          messageId: `cm-${index}`,
          toParticipantId: "pt-recipient",
        }),
        recovered: false,
      })),
    },
    {
      status: "read",
      deliveries: [
        {
          deliveryId: "1-0",
          message: message({ toParticipantId: "pt-recipient" }),
          recovered: false,
        },
        {
          deliveryId: "1-0",
          message: message({ toParticipantId: "pt-recipient" }),
          recovered: true,
        },
      ],
    },
    {
      status: "read",
      deliveries: [{
        deliveryId: "sentinel-invalid",
        message: message({ toParticipantId: "pt-recipient" }),
        recovered: false,
      }],
    },
  ];

  for (const forcedResult of cases) {
    const { queue, recipient, service } = await createHarness();
    queue.forcedResult = forcedResult;
    await expectCode(
      service.receive(receiveInput(recipient)),
      "COORDINATION_INTERNAL_ERROR",
    );
  }
});

test("receive maps unavailable and unknown queue results to safe errors", async () => {
  const unavailable = await createHarness();
  unavailable.queue.readError = new CoordinationError(
    "COORDINATION_UNAVAILABLE",
    "sentinel Redis credentials",
  );
  await expectCode(
    unavailable.service.receive(receiveInput(unavailable.recipient)),
    "COORDINATION_UNAVAILABLE",
  );

  const unknown = await createHarness();
  unknown.queue.forcedResult = { status: "sentinel_unknown", deliveries: [] };
  await expectCode(
    unknown.service.receive(receiveInput(unknown.recipient)),
    "COORDINATION_INTERNAL_ERROR",
  );
});
