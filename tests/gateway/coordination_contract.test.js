import { test } from "node:test";
import assert from "node:assert/strict";

import {
  COORDINATION_CONSUMER_GROUP,
  COORDINATION_PROTOCOL_VERSION,
  DEFAULT_COORDINATION_ACK_TOMBSTONE_TTL_MS,
  DEFAULT_COORDINATION_DEDUPE_TTL_MS,
  DEFAULT_COORDINATION_ORPHAN_INBOX_TTL_MS,
  DEFAULT_COORDINATION_PREFIX,
  COORDINATION_WIRE_CONTRACT,
  coordinationKeys,
  createCoordinationLeaseFence,
  encodeCoordinationKeyPart,
} from "../../gateway/src/core/coordination_contract.js";

test("coordination v1 constants freeze the prefix, group, and retention windows", () => {
  assert.equal(COORDINATION_PROTOCOL_VERSION, 1);
  assert.equal(DEFAULT_COORDINATION_PREFIX, "agents:coord:v1");
  assert.equal(COORDINATION_CONSUMER_GROUP, "coordination-v1");
  assert.equal(DEFAULT_COORDINATION_DEDUPE_TTL_MS, 86_400_000);
  assert.equal(DEFAULT_COORDINATION_ACK_TOMBSTONE_TTL_MS, 86_400_000);
  assert.equal(DEFAULT_COORDINATION_ORPHAN_INBOX_TTL_MS, 86_400_000);
});

test("dynamic Redis key components use unambiguous percent encoding", () => {
  assert.equal(encodeCoordinationKeyPart("pt-owner:one", "participantId"), "pt-owner%3Aone");
  assert.equal(encodeCoordinationKeyPart("cm.request:one", "messageId"), "cm.request%3Aone");
  assert.throws(
    () => encodeCoordinationKeyPart("pt-owner%3Aone", "participantId"),
    /participantId/,
  );
  assert.throws(() => encodeCoordinationKeyPart("pt/owner", "participantId"), /participantId/);
  assert.throws(() => encodeCoordinationKeyPart("", "participantId"), /participantId/);
});

test("coordination key layout is versioned, addressed, and separate from legacy audit", () => {
  const keys = coordinationKeys();

  assert.deepEqual(
    {
      participants: keys.participants,
      presence: keys.presence("pt-a:1"),
      inbox: keys.inbox("pt-a:1"),
      dedupe: keys.dedupe("pt-a:1", "cm-request:1"),
      acked: keys.acked("pt-a:1", "123-0"),
      events: keys.events,
    },
    {
      participants: "agents:coord:v1:participants",
      presence: "agents:coord:v1:presence:pt-a%3A1",
      inbox: "agents:coord:v1:inbox:pt-a%3A1",
      dedupe: "agents:coord:v1:dedupe:pt-a%3A1:cm-request%3A1",
      acked: "agents:coord:v1:acked:pt-a%3A1:123-0",
      events: "agents:coord:v1:events",
    },
  );
  assert.notEqual(keys.events, "agents:events");
});

test("coordination prefix rejects ambiguous or wildcard syntax", () => {
  for (const prefix of ["", "agents coord", "agents:coord:*", "agents:coord:v1:"]) {
    assert.throws(() => coordinationKeys(prefix), /coordination prefix/i);
  }
});

test("coordination prefix cannot alias the reserved legacy audit stream", () => {
  assert.throws(
    () => coordinationKeys("agents"),
    /legacy audit stream/i,
  );
});

test("lease fences require the authenticated digest and scope", () => {
  const fence = createCoordinationLeaseFence({
    participantId: "pt-a",
    scopeId: "project:v5",
    leaseTokenHash: "a".repeat(64),
  });

  assert.deepEqual(fence, {
    participantId: "pt-a",
    scopeId: "project:v5",
    leaseTokenHash: "a".repeat(64),
  });
  assert.equal(Object.isFrozen(fence), true);
  assert.throws(
    () =>
      createCoordinationLeaseFence({
        participantId: "pt-a",
        scopeId: "project:v5",
        leaseTokenHash: "not-a-digest",
      }),
    /leaseTokenHash/,
  );
  assert.throws(
    () =>
      createCoordinationLeaseFence({
        participantId: "pt-a",
        scopeId: "other scope",
        leaseTokenHash: "a".repeat(64),
      }),
    /scopeId/,
  );
});

test("wire contract freezes stale-lease and blocking-receive fences", () => {
  assert.deepEqual(COORDINATION_WIRE_CONTRACT.authorization, {
    fenceFields: ["leaseTokenHash", "scopeId"],
    nonBlockingCheck: "atomic",
    blockingCheck: ["before", "after"],
    blockingFailure: "leave-pending-and-return-no-data",
    replacementError: "COORDINATION_LEASE_CHANGED",
  });
});

test("wire contract freezes bounded dedupe and ACK retry semantics", () => {
  assert.deepEqual(COORDINATION_WIRE_CONTRACT.dedupe, {
    scope: ["fromParticipantId", "messageId"],
    value: ["envelope", "deliveryId"],
    equalRetry: "return-original-and-renew-window",
    changedRetryError: "COORDINATION_MESSAGE_CONFLICT",
    afterWindow: "at-least-once-redelivery-allowed",
  });
  assert.deepEqual(COORDINATION_WIRE_CONTRACT.ack, {
    scope: "recipient-inbox",
    mutation: ["validate-complete-batch", "XACK", "XDEL", "write-tombstones"],
    retryWithinWindow: "zero-newly-acked",
    unknownError: "COORDINATION_DELIVERY_NOT_FOUND",
    afterWindow: "unknown",
  });
});

test("wire contract forbids blind trimming and preserves legacy surfaces", () => {
  assert.deepEqual(COORDINATION_WIRE_CONTRACT.inbox, {
    capacityCheck: "XLEN",
    append: "XADD-without-MAXLEN",
    fullError: "COORDINATION_INBOX_FULL",
    removal: "validated-ACK-only",
  });
  assert.deepEqual(COORDINATION_WIRE_CONTRACT.deployment, {
    redisMajor: 7,
    topology: "standalone-or-one-shard",
  });
  assert.deepEqual(COORDINATION_WIRE_CONTRACT.legacyIsolation, {
    auditStream: "agents:events",
    coordinationPublishesToAuditStream: false,
    messageToolsChanged: false,
  });
  assert.equal(Object.isFrozen(COORDINATION_WIRE_CONTRACT), true);
  assert.equal(Object.isFrozen(COORDINATION_WIRE_CONTRACT.authorization.fenceFields), true);
});
