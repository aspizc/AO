export const COORDINATION_PROTOCOL_VERSION = 1;
export const DEFAULT_COORDINATION_PREFIX = "agents:coord:v1";
export const COORDINATION_CONSUMER_GROUP = "coordination-v1";
export const DEFAULT_COORDINATION_SCOPE_ID = "agents-orchestrator";
export const DEFAULT_COORDINATION_LEASE_TTL_MS = 900_000;
export const MAX_COORDINATION_LEASE_TTL_MS = 3_600_000;
export const COORDINATION_SERVICE_LIMITS = Symbol(
  "agents-orchestrator.coordination.service-limits",
);
export const DEFAULT_COORDINATION_DEDUPE_TTL_MS = 86_400_000;
export const DEFAULT_COORDINATION_ACK_TOMBSTONE_TTL_MS = 86_400_000;
export const DEFAULT_COORDINATION_ORPHAN_INBOX_TTL_MS = 86_400_000;

const SAFE_KEY_PART = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_PREFIX = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,255}$/;
const SHA256_HEX = /^[a-f0-9]{64}$/;

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

export const COORDINATION_WIRE_CONTRACT = deepFreeze({
  authorization: {
    fenceFields: ["leaseTokenHash", "scopeId"],
    nonBlockingCheck: "atomic",
    blockingCheck: ["before", "after"],
    blockingFailure: "leave-pending-and-return-no-data",
    replacementError: "COORDINATION_LEASE_CHANGED",
  },
  dedupe: {
    scope: ["fromParticipantId", "messageId"],
    value: ["envelope", "deliveryId"],
    equalRetry: "return-original-and-renew-window",
    changedRetryError: "COORDINATION_MESSAGE_CONFLICT",
    afterWindow: "at-least-once-redelivery-allowed",
  },
  ack: {
    scope: "recipient-inbox",
    mutation: ["validate-complete-batch", "XACK", "XDEL", "write-tombstones"],
    retryWithinWindow: "zero-newly-acked",
    unknownError: "COORDINATION_DELIVERY_NOT_FOUND",
    afterWindow: "unknown",
  },
  inbox: {
    capacityCheck: "XLEN",
    append: "XADD-without-MAXLEN",
    fullError: "COORDINATION_INBOX_FULL",
    removal: "validated-ACK-only",
  },
  deployment: {
    redisMajor: 7,
    topology: "standalone-or-one-shard",
  },
  legacyIsolation: {
    auditStream: "agents:events",
    coordinationPublishesToAuditStream: false,
    messageToolsChanged: false,
  },
});

function assertSafeIdentifier(value, label) {
  const normalized = typeof value === "string" ? value : "";
  if (!SAFE_KEY_PART.test(normalized)) {
    throw new TypeError(`${label} must be a safe coordination identifier`);
  }
  return normalized;
}

export function encodeCoordinationKeyPart(value, label = "key part") {
  return encodeURIComponent(assertSafeIdentifier(value, label));
}

export function coordinationKeys(prefix = DEFAULT_COORDINATION_PREFIX) {
  const normalized = typeof prefix === "string" ? prefix : "";
  if (!SAFE_PREFIX.test(normalized) || normalized.endsWith(":")) {
    throw new TypeError("coordination prefix must contain only safe Redis key characters");
  }
  if (`${normalized}:events` === COORDINATION_WIRE_CONTRACT.legacyIsolation.auditStream) {
    throw new TypeError("coordination prefix must not alias the legacy audit stream");
  }

  return Object.freeze({
    prefix: normalized,
    participants: `${normalized}:participants`,
    events: `${normalized}:events`,
    presence: (participantId) =>
      `${normalized}:presence:${encodeCoordinationKeyPart(participantId, "participantId")}`,
    inbox: (participantId) =>
      `${normalized}:inbox:${encodeCoordinationKeyPart(participantId, "participantId")}`,
    dedupe: (fromParticipantId, messageId) =>
      `${normalized}:dedupe:${encodeCoordinationKeyPart(
        fromParticipantId,
        "fromParticipantId",
      )}:${encodeCoordinationKeyPart(messageId, "messageId")}`,
    acked: (participantId, deliveryId) =>
      `${normalized}:acked:${encodeCoordinationKeyPart(
        participantId,
        "participantId",
      )}:${encodeCoordinationKeyPart(deliveryId, "deliveryId")}`,
  });
}

export function createCoordinationLeaseFence({
  participantId,
  scopeId,
  leaseTokenHash,
} = {}) {
  const normalizedHash = typeof leaseTokenHash === "string" ? leaseTokenHash : "";
  if (!SHA256_HEX.test(normalizedHash)) {
    throw new TypeError("leaseTokenHash must be a SHA-256 hex digest");
  }

  return Object.freeze({
    participantId: assertSafeIdentifier(participantId, "participantId"),
    scopeId: assertSafeIdentifier(scopeId, "scopeId"),
    leaseTokenHash: normalizedHash,
  });
}
