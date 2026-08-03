import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  CoordinationError,
  createCoordinationService,
} from "../../gateway/src/services/coordination_service.js";

const START = Date.parse("2026-07-25T10:00:00.000Z");
const TOKENS = [
  "sender-lease-token-with-at-least-thirty-two-chars",
  "recipient-lease-token-with-at-least-thirty-two-chars",
  "second-sender-token-with-at-least-thirty-two-chars",
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

function semanticEnvelope(envelope) {
  const { createdAt, ...semantic } = envelope;
  return semantic;
}

class SendQueue {
  constructor({ now }) {
    this.enabled = true;
    this.now = now;
    this.participants = new Map();
    this.dedupe = new Map();
    this.putMessageCalls = [];
    this.nextDelivery = 1;
    this.beforePutMessage = null;
    this.forcedStatus = null;
    this.forcedResult = null;
    this.putMessageError = null;
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
    return { status: "stored" };
  }

  async getParticipant(participantId) {
    return structuredClone(this.participants.get(participantId) ?? null);
  }

  async putMessage(envelope, options) {
    this.putMessageCalls.push({
      envelope: structuredClone(envelope),
      options: structuredClone(options),
    });
    if (this.putMessageError) throw this.putMessageError;
    this.beforePutMessage?.();
    this.beforePutMessage = null;
    if (this.forcedResult) return structuredClone(this.forcedResult);
    if (this.forcedStatus) return { status: this.forcedStatus };

    const sender = this.participants.get(options.senderFence.participantId);
    if (!fenceMatches(sender, options.senderFence)) {
      return { status: "sender_fence_mismatch" };
    }
    const recipient = this.participants.get(envelope.toParticipantId);
    if (!recipient) return { status: "target_missing" };
    if (!fenceMatches(recipient, options.recipientFence)) {
      return { status: "recipient_fence_mismatch" };
    }

    const dedupeKey = `${envelope.fromParticipantId}\u0000${envelope.messageId}`;
    const existing = this.dedupe.get(dedupeKey);
    if (existing && existing.expiresAt > this.now()) {
      if (
        JSON.stringify(semanticEnvelope(existing.envelope))
        !== JSON.stringify(semanticEnvelope(envelope))
      ) {
        return { status: "conflict" };
      }
      existing.expiresAt = this.now() + options.dedupeTtlMs;
      return {
        status: "duplicate",
        envelope: structuredClone(existing.envelope),
        deliveryId: existing.deliveryId,
      };
    }

    const deliveryId = `${this.nextDelivery++}-0`;
    this.dedupe.set(dedupeKey, {
      envelope: structuredClone(envelope),
      deliveryId,
      expiresAt: this.now() + options.dedupeTtlMs,
    });
    return { status: "created", deliveryId };
  }
}

function createHarness({
  messageMaxBytes = 65_536,
  dedupeTtlMs = 1_000,
} = {}) {
  let now = START;
  const queue = new SendQueue({ now: () => now });
  const audits = [];
  const ids = ["sender", "recipient", "second-sender", "generated-message"];
  const tokens = [...TOKENS];
  const service = createCoordinationService({
    queue,
    config: {
      coordinationLeaseDefaultMs: 30_000,
      coordinationLeaseMaxMs: 300_000,
      coordinationMessageMaxBytes: messageMaxBytes,
      coordinationDedupeTtlMs: dedupeTtlMs,
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
    async register(overrides = {}) {
      return service.register({
        participantType: "orchestrator",
        scopeId: "project:v5",
        capabilities: ["coordination.v1"],
        ...overrides,
      });
    },
    resetObservations() {
      audits.length = 0;
      queue.putMessageCalls.length = 0;
    },
  };
}

function sendInput(sender, recipient, overrides = {}) {
  return {
    participantId: sender.participantId,
    leaseToken: sender.leaseToken,
    toParticipantId: recipient.participantId,
    messageType: "IMPACT_NOTICE",
    classification: "internal",
    body: "Review the coordination contract change.",
    traceId: "tr-send",
    correlationId: "change-send",
    ...overrides,
  };
}

async function expectCode(promise, code) {
  await assert.rejects(
    promise,
    (err) =>
      err instanceof CoordinationError
      && err.code === code
      && !err.message.includes("sentinel")
      && !err.message.includes("api_key"),
  );
}

test("send creates one canonical envelope through sender and recipient fences", async () => {
  const harness = createHarness();
  const sender = await harness.register();
  const recipient = await harness.register({ participantType: "agent" });
  harness.resetObservations();

  const result = await harness.service.send(sendInput(sender, recipient));
  const expectedMessage = {
    protocolVersion: 1,
    scopeId: "project:v5",
    messageId: "cm-second-sender",
    fromParticipantId: sender.participantId,
    toParticipantId: recipient.participantId,
    messageType: "IMPACT_NOTICE",
    classification: "internal",
    body: "Review the coordination contract change.",
    createdAt: "2026-07-25T10:00:00.000Z",
    traceId: "tr-send",
    correlationId: "change-send",
  };

  assert.deepEqual(result, {
    message: expectedMessage,
    deliveryId: "1-0",
    duplicate: false,
  });
  assert.deepEqual(harness.queue.putMessageCalls, [{
    envelope: expectedMessage,
    options: {
      senderFence: {
        participantId: sender.participantId,
        scopeId: sender.scopeId,
        leaseTokenHash: tokenHash(TOKENS[0]),
      },
      recipientFence: {
        participantId: recipient.participantId,
        scopeId: recipient.scopeId,
        leaseTokenHash: tokenHash(TOKENS[1]),
      },
      dedupeTtlMs: 1_000,
    },
  }]);
  assert.deepEqual(harness.audits, [{
    type: "COORDINATION_MESSAGE_SENT",
    participantId: sender.participantId,
    fromParticipantId: sender.participantId,
    toParticipantId: recipient.participantId,
    scopeId: sender.scopeId,
    messageId: "cm-second-sender",
    messageType: "IMPACT_NOTICE",
    classification: "internal",
    deliveryId: "1-0",
    timestamp: START,
    duplicate: false,
  }]);
  assert.doesNotMatch(
    JSON.stringify(harness.audits),
    /coordination contract change|lease-token|body/,
  );
});

test("send rejects restricted, secret-bearing, and oversized UTF-8 bodies before the queue", async () => {
  const restricted = createHarness();
  const restrictedSender = await restricted.register();
  const restrictedRecipient = await restricted.register();
  restricted.resetObservations();
  await expectCode(
    restricted.service.send(sendInput(restrictedSender, restrictedRecipient, {
      classification: "restricted",
      body: "sentinel restricted body",
    })),
    "COORDINATION_CLASSIFICATION_DENIED",
  );
  await expectCode(
    restricted.service.send(sendInput(restrictedSender, restrictedRecipient, {
      body: `api_key=${"a".repeat(24)}`,
    })),
    "COORDINATION_SECRET_REJECTED",
  );
  assert.equal(restricted.queue.putMessageCalls.length, 0);

  const oversized = createHarness({ messageMaxBytes: 7 });
  const oversizedSender = await oversized.register();
  const oversizedRecipient = await oversized.register();
  oversized.resetObservations();
  await expectCode(
    oversized.service.send(sendInput(oversizedSender, oversizedRecipient, {
      body: "éééé",
    })),
    "COORDINATION_MESSAGE_TOO_LARGE",
  );
  assert.equal(oversized.queue.putMessageCalls.length, 0);

  const exact = createHarness({ messageMaxBytes: 8 });
  const exactSender = await exact.register();
  const exactRecipient = await exact.register();
  exact.resetObservations();
  const accepted = await exact.service.send(sendInput(exactSender, exactRecipient, {
    body: "éééé",
  }));
  assert.equal(accepted.message.body, "éééé");
});

test("send secret detection matches the canonical secret.token policy", async () => {
  const policy = JSON.parse(
    fs.readFileSync(
      new URL("../../policies/sanitization-rules.json", import.meta.url),
      "utf8",
    ),
  );
  const rule = policy.rules.find(({ id }) => id === "secret.token");
  assert.ok(rule);
  const canonical = new RegExp(rule.pattern);
  const samples = [
    `api_key=${"a".repeat(24)}`,
    `TOKEN: ${"b".repeat(12)}`,
    `secret='${"c".repeat(16)}'`,
    "token=abc+def/ghi=jkl",
    "credential=abcdefghijklmnop",
    "api_key=short",
  ];

  for (const body of samples) {
    const harness = createHarness();
    const sender = await harness.register();
    const recipient = await harness.register();
    harness.resetObservations();
    if (canonical.test(body)) {
      await expectCode(
        harness.service.send(sendInput(sender, recipient, { body })),
        "COORDINATION_SECRET_REJECTED",
      );
      assert.equal(harness.queue.putMessageCalls.length, 0);
    } else {
      const result = await harness.service.send(sendInput(sender, recipient, { body }));
      assert.equal(result.message.body, body);
    }
    canonical.lastIndex = 0;
  }
});

test("send strictly validates caller-controlled envelope fields", async () => {
  for (const overrides of [
    { messageType: "unsafe type" },
    { messageId: "unsafe/id" },
    { replyToMessageId: "unsafe/id" },
    { classification: "unknown" },
    { body: "" },
    { createdAt: "sentinel" },
  ]) {
    const harness = createHarness();
    const sender = await harness.register();
    const recipient = await harness.register();
    harness.resetObservations();
    await expectCode(
      harness.service.send(sendInput(sender, recipient, overrides)),
      "COORDINATION_INVALID_INPUT",
    );
    assert.equal(harness.queue.putMessageCalls.length, 0);
  }
});

test("send rejects invalid senders and missing, expired, or cross-scope recipients", async () => {
  const harness = createHarness();
  const sender = await harness.register();
  const recipient = await harness.register();
  harness.resetObservations();

  await expectCode(
    harness.service.send(sendInput(sender, recipient, {
      leaseToken: "wrong-sender-token-with-at-least-thirty-two-chars",
    })),
    "COORDINATION_AUTH_FAILED",
  );
  await expectCode(
    harness.service.send(sendInput(sender, {
      participantId: "pt-missing",
    })),
    "COORDINATION_TARGET_NOT_FOUND",
  );

  harness.queue.participants.get(recipient.participantId).leaseExpiresAt =
    "2026-07-25T10:00:00.000Z";
  await expectCode(
    harness.service.send(sendInput(sender, recipient)),
    "COORDINATION_TARGET_NOT_FOUND",
  );

  harness.queue.participants.get(recipient.participantId).leaseExpiresAt =
    "2026-07-25T10:01:00.000Z";
  harness.queue.participants.get(recipient.participantId).scopeId = "other:scope";
  await expectCode(
    harness.service.send(sendInput(sender, recipient)),
    "COORDINATION_SCOPE_MISMATCH",
  );
  assert.equal(harness.queue.putMessageCalls.length, 0);
});

test("send fails closed on sender/recipient replacement and queue backpressure", async () => {
  for (const replaced of ["sender", "recipient"]) {
    const harness = createHarness();
    const sender = await harness.register();
    const recipient = await harness.register();
    harness.resetObservations();
    harness.queue.beforePutMessage = () => {
      const participantId =
        replaced === "sender" ? sender.participantId : recipient.participantId;
      harness.queue.participants.get(participantId).leaseTokenHash =
        tokenHash("replacement-token-with-at-least-thirty-two-chars");
    };
    await expectCode(
      harness.service.send(sendInput(sender, recipient)),
      "COORDINATION_LEASE_CHANGED",
    );
    assert.deepEqual(harness.audits, []);
  }

  const removed = createHarness();
  const removedSender = await removed.register();
  const removedRecipient = await removed.register();
  removed.resetObservations();
  removed.queue.beforePutMessage = () => {
    removed.queue.participants.delete(removedRecipient.participantId);
  };
  await expectCode(
    removed.service.send(sendInput(removedSender, removedRecipient)),
    "COORDINATION_TARGET_NOT_FOUND",
  );
  assert.deepEqual(removed.audits, []);

  const full = createHarness();
  const sender = await full.register();
  const recipient = await full.register();
  full.resetObservations();
  full.queue.forcedStatus = "inbox_full";
  await expectCode(
    full.service.send(sendInput(sender, recipient)),
    "COORDINATION_INBOX_FULL",
  );
  assert.deepEqual(full.audits, []);
});

test("send reuses the original delivery for equal retries and renews the dedupe window", async () => {
  const harness = createHarness({ dedupeTtlMs: 1_000 });
  const sender = await harness.register();
  const recipient = await harness.register();
  const otherRecipient = await harness.register({ participantType: "agent" });
  harness.resetObservations();
  const args = sendInput(sender, recipient, {
    messageId: "cm-stable",
    replyToMessageId: "cm-parent",
  });

  const first = await harness.service.send(args);
  harness.advance(500);
  const duplicate = await harness.service.send(args);

  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.deliveryId, first.deliveryId);
  assert.deepEqual(duplicate.message, first.message);
  assert.equal(
    harness.queue.dedupe.get(`${sender.participantId}\u0000cm-stable`).expiresAt,
    START + 1_500,
  );

  for (const changed of [
    { body: "Changed semantic body." },
    { toParticipantId: otherRecipient.participantId },
    { messageType: "RESPONSE" },
    { classification: "unrestricted" },
    { traceId: "tr-changed" },
    { correlationId: "change-changed" },
    { replyToMessageId: "cm-other-parent" },
    { traceId: undefined },
    { correlationId: undefined },
    { replyToMessageId: undefined },
  ]) {
    await expectCode(
      harness.service.send({ ...args, ...changed }),
      "COORDINATION_MESSAGE_CONFLICT",
    );
  }

  harness.advance(1_001);
  const afterWindow = await harness.service.send(args);
  assert.equal(afterWindow.duplicate, false);
  assert.notEqual(afterWindow.deliveryId, first.deliveryId);
  assert.equal(afterWindow.message.createdAt, "2026-07-25T10:00:01.501Z");
});

test("send scopes the same message ID independently per sender", async () => {
  const harness = createHarness();
  const firstSender = await harness.register();
  const recipient = await harness.register();
  const secondSender = await harness.register();
  harness.resetObservations();

  const first = await harness.service.send(sendInput(firstSender, recipient, {
    messageId: "cm-shared",
  }));
  const second = await harness.service.send(sendInput(secondSender, recipient, {
    messageId: "cm-shared",
  }));

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, false);
  assert.notEqual(first.deliveryId, second.deliveryId);
  assert.equal(harness.queue.dedupe.size, 2);
});

test("send maps dependency errors and unexpected statuses without exposing payloads", async () => {
  const unavailable = createHarness();
  const sender = await unavailable.register();
  const recipient = await unavailable.register();
  unavailable.resetObservations();
  unavailable.queue.putMessageError = new CoordinationError(
    "COORDINATION_UNAVAILABLE",
    "sentinel Redis credentials and body",
  );
  await expectCode(
    unavailable.service.send(sendInput(sender, recipient)),
    "COORDINATION_UNAVAILABLE",
  );

  const unexpected = createHarness();
  const unexpectedSender = await unexpected.register();
  const unexpectedRecipient = await unexpected.register();
  unexpected.resetObservations();
  unexpected.queue.forcedStatus = "sentinel_unknown";
  await expectCode(
    unexpected.service.send(sendInput(unexpectedSender, unexpectedRecipient)),
    "COORDINATION_INTERNAL_ERROR",
  );

  const malformed = createHarness();
  const malformedSender = await malformed.register();
  const malformedRecipient = await malformed.register();
  malformed.resetObservations();
  malformed.queue.forcedResult = {
    status: "created",
    deliveryId: "sentinel-invalid-delivery",
  };
  await expectCode(
    malformed.service.send(sendInput(malformedSender, malformedRecipient)),
    "COORDINATION_INTERNAL_ERROR",
  );

  malformed.queue.forcedResult = {
    status: "duplicate",
    deliveryId: "1-0",
    envelope: {
      protocolVersion: 1,
      messageId: "cm-sentinel",
      fromParticipantId: malformedSender.participantId,
      toParticipantId: malformedRecipient.participantId,
      scopeId: malformedSender.scopeId,
      messageType: "NOTICE",
      classification: "internal",
      body: "sentinel arbitrary queue body",
      createdAt: "2026-07-25T10:00:00.000Z",
    },
  };
  await expectCode(
    malformed.service.send(sendInput(malformedSender, malformedRecipient)),
    "COORDINATION_INTERNAL_ERROR",
  );
});
