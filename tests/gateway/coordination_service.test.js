import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  CoordinationError,
  createCoordination,
} from "../../gateway/src/coordination.js";
import {
  MemoryCoordinationQueue,
} from "./helpers/memory_coordination_queue.js";

function harness({ enabled = true } = {}) {
  let now = Date.parse("2026-07-25T10:00:00.000Z");
  const uuids = ["participant-a", "participant-b", "message-a", "message-b"];
  const tokens = ["lease-token-a-with-sufficient-entropy", "lease-token-b-with-sufficient-entropy"];
  const queue = new MemoryCoordinationQueue({ enabled, now: () => now });
  const service = createCoordination({
    queue,
    config: {
      coordinationLeaseDefaultMs: 30_000,
      coordinationLeaseMaxMs: 300_000,
      coordinationMessageMaxBytes: 65_536,
      coordinationMaxBlockMs: 30_000,
    },
    clock: () => now,
    randomUUID: () => uuids.shift(),
    randomToken: () => tokens.shift(),
  });

  return {
    queue,
    service,
    advance(ms) {
      now += ms;
    },
  };
}

async function register(service, overrides = {}) {
  return service.register({
    participantType: "orchestrator",
    scopeId: "kya:v1.5-v1.6",
    displayName: "KYA orchestrator",
    capabilities: ["coordination.v1", "task.review"],
    metadata: {
      version: "1.5",
      baseSha: "abc1234",
      ownedScope: "plans/v1.5",
    },
    ...overrides,
  });
}

async function expectCode(promise, code) {
  await assert.rejects(promise, (err) => err instanceof CoordinationError && err.code === code);
}

test("register creates a leased public identity and stores only a token digest", async () => {
  const { queue, service } = harness();

  const registered = await register(service);
  const stored = queue.participants.get(registered.participantId);

  assert.equal(registered.protocolVersion, 1);
  assert.equal(registered.participantId, "pt-participant-a");
  assert.equal(registered.participantType, "orchestrator");
  assert.equal(registered.scopeId, "kya:v1.5-v1.6");
  assert.deepEqual(registered.capabilities, ["coordination.v1", "task.review"]);
  assert.equal(registered.leaseToken, "lease-token-a-with-sufficient-entropy");
  assert.equal(registered.leaseExpiresAt, "2026-07-25T10:00:30.000Z");
  assert.equal(registered.queue.prefix, "test:coord:v1");
  assert.equal(stored.leaseToken, undefined);
  assert.equal(stored.leaseTokenHash, crypto.createHash("sha256").update(registered.leaseToken).digest("hex"));
});

test("discover requires an active lease and filters by scope, type, and capability", async () => {
  const { service, advance } = harness();
  const first = await register(service);
  const second = await register(service, {
    participantType: "agent",
    scopeId: "kya:v1.5-v1.6",
    displayName: "Reviewer",
    capabilities: ["task.review"],
  });

  const visible = await service.discover({
    participantId: first.participantId,
    leaseToken: first.leaseToken,
    scopeId: "kya:v1.5-v1.6",
    participantType: "agent",
    capability: "task.review",
  });

  assert.deepEqual(visible.map((participant) => participant.participantId), [second.participantId]);
  assert.ok(visible.every((participant) => participant.leaseTokenHash === undefined));

  advance(30_001);
  await expectCode(
    service.discover({
      participantId: first.participantId,
      leaseToken: first.leaseToken,
    }),
    "COORDINATION_LEASE_EXPIRED",
  );
});

test("heartbeat renews a lease and rejects the wrong token or an expired lease", async () => {
  const { service, advance } = harness();
  const registered = await register(service);

  await expectCode(
    service.heartbeat({
      participantId: registered.participantId,
      leaseToken: "wrong-token-with-sufficient-entropy",
    }),
    "COORDINATION_AUTH_FAILED",
  );

  advance(10_000);
  const renewed = await service.heartbeat({
    participantId: registered.participantId,
    leaseToken: registered.leaseToken,
    leaseTtlMs: 60_000,
  });
  assert.equal(renewed.lastHeartbeatAt, "2026-07-25T10:00:10.000Z");
  assert.equal(renewed.leaseExpiresAt, "2026-07-25T10:01:10.000Z");

  advance(60_001);
  await expectCode(
    service.heartbeat({
      participantId: registered.participantId,
      leaseToken: registered.leaseToken,
    }),
    "COORDINATION_LEASE_EXPIRED",
  );
});

test("send, receive, and transport ack use an addressed inbox", async () => {
  const { service } = harness();
  const sender = await register(service);
  const recipient = await register(service, {
    participantType: "agent",
    displayName: "Reviewer",
  });

  const sent = await service.send({
    participantId: sender.participantId,
    leaseToken: sender.leaseToken,
    toParticipantId: recipient.participantId,
    messageType: "CHANGE_REQUEST",
    classification: "internal",
    body: JSON.stringify({ paths: ["plans/v1.6/task.md"], action: "reconcile dependency" }),
    correlationId: "kya-change-1",
  });
  const deliveries = await service.receive({
    participantId: recipient.participantId,
    leaseToken: recipient.leaseToken,
    consumerId: "reviewer-process",
    count: 10,
  });
  const ack = await service.ack({
    participantId: recipient.participantId,
    leaseToken: recipient.leaseToken,
    deliveryIds: [deliveries[0].deliveryId],
  });

  assert.equal(sent.message.protocolVersion, 1);
  assert.equal(sent.message.messageId, "cm-message-a");
  assert.equal(sent.message.scopeId, sender.scopeId);
  assert.equal(sent.duplicate, false);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].message.messageType, "CHANGE_REQUEST");
  assert.equal(deliveries[0].recovered, false);
  assert.deepEqual(ack, { ackedCount: 1, deliveryIds: [deliveries[0].deliveryId] });
  assert.deepEqual(
    await service.receive({
      participantId: recipient.participantId,
      leaseToken: recipient.leaseToken,
      consumerId: "reviewer-process",
    }),
    [],
  );
});

test("an unacknowledged delivery can be reclaimed by another consumer", async () => {
  const { service, advance } = harness();
  const sender = await register(service);
  const recipient = await register(service, { participantType: "session" });
  await service.send({
    participantId: sender.participantId,
    leaseToken: sender.leaseToken,
    toParticipantId: recipient.participantId,
    messageType: "IMPACT_NOTICE",
    classification: "internal",
    body: "Version 1.6 changes a dependency owned by version 1.5.",
  });
  await service.receive({
    participantId: recipient.participantId,
    leaseToken: recipient.leaseToken,
    consumerId: "consumer-before-crash",
  });

  advance(5_000);
  const recovered = await service.receive({
    participantId: recipient.participantId,
    leaseToken: recipient.leaseToken,
    consumerId: "consumer-after-crash",
    reclaimIdleMs: 5_000,
  });

  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].recovered, true);
});

test("send rejects unknown recipients and participants from another scope", async () => {
  const { service } = harness();
  const sender = await register(service);
  const otherScope = await register(service, { scopeId: "another-project" });

  await expectCode(
    service.send({
      participantId: sender.participantId,
      leaseToken: sender.leaseToken,
      toParticipantId: "pt-missing",
      messageType: "NOTICE",
      classification: "internal",
      body: "hello",
    }),
    "COORDINATION_TARGET_NOT_FOUND",
  );
  await expectCode(
    service.send({
      participantId: sender.participantId,
      leaseToken: sender.leaseToken,
      toParticipantId: otherScope.participantId,
      messageType: "NOTICE",
      classification: "internal",
      body: "hello",
    }),
    "COORDINATION_SCOPE_MISMATCH",
  );
});

test("send rejects restricted, oversized, and secret-bearing material", async () => {
  const { service } = harness();
  const sender = await register(service);
  const recipient = await register(service);
  const base = {
    participantId: sender.participantId,
    leaseToken: sender.leaseToken,
    toParticipantId: recipient.participantId,
    messageType: "NOTICE",
  };

  await expectCode(
    service.send({ ...base, classification: "restricted", body: "raw secret" }),
    "COORDINATION_CLASSIFICATION_DENIED",
  );
  await expectCode(
    service.send({
      ...base,
      classification: "internal",
      body: `api_key=${"a".repeat(24)}`,
    }),
    "COORDINATION_SECRET_REJECTED",
  );
  await expectCode(
    service.send({
      ...base,
      classification: "internal",
      body: "x".repeat(65_537),
    }),
    "COORDINATION_MESSAGE_TOO_LARGE",
  );
});

test("a caller-provided messageId is idempotent and conflicts fail closed", async () => {
  const { service } = harness();
  const sender = await register(service);
  const recipient = await register(service);
  const args = {
    participantId: sender.participantId,
    leaseToken: sender.leaseToken,
    toParticipantId: recipient.participantId,
    messageId: "cm-stable-request",
    messageType: "RESPONSE",
    classification: "internal",
    body: "accepted",
    correlationId: "request-1",
  };

  const first = await service.send(args);
  const duplicate = await service.send(args);
  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.message.messageId, first.message.messageId);

  await expectCode(
    service.send({ ...args, body: "different response" }),
    "COORDINATION_MESSAGE_CONFLICT",
  );
});

test("unregister is authenticated and then idempotent", async () => {
  const { service } = harness();
  const participant = await register(service);

  await expectCode(
    service.unregister({
      participantId: participant.participantId,
      leaseToken: "wrong-token-with-sufficient-entropy",
    }),
    "COORDINATION_AUTH_FAILED",
  );
  assert.deepEqual(
    await service.unregister({
      participantId: participant.participantId,
      leaseToken: participant.leaseToken,
    }),
    { participantId: participant.participantId, unregistered: true },
  );
  assert.deepEqual(
    await service.unregister({
      participantId: participant.participantId,
      leaseToken: participant.leaseToken,
    }),
    { participantId: participant.participantId, unregistered: false },
  );
});

test("disabled coordination fails explicitly", async () => {
  const { service } = harness({ enabled: false });
  await expectCode(register(service), "COORDINATION_UNAVAILABLE");
});
