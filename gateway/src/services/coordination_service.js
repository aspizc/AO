import crypto from "node:crypto";

import {
  COORDINATION_CONSUMER_GROUP,
  COORDINATION_PROTOCOL_VERSION,
  COORDINATION_SERVICE_LIMITS,
  DEFAULT_COORDINATION_ACK_TOMBSTONE_TTL_MS,
  DEFAULT_COORDINATION_DEDUPE_TTL_MS,
  DEFAULT_COORDINATION_LEASE_TTL_MS,
  MAX_COORDINATION_LEASE_TTL_MS,
  coordinationKeys,
  createCoordinationLeaseFence,
} from "../core/coordination_contract.js";

const PARTICIPANT_TYPES = new Set(["gateway", "orchestrator", "agent", "session"]);
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_METADATA_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const SAFE_AUDIT_TYPE = /^COORDINATION_[A-Z0-9_]{1,96}$/;
const LEASE_TOKEN = /^[A-Za-z0-9_-]{32,256}$/;
const SHA256_HEX = /^[a-f0-9]{64}$/;
const DELIVERY_ID = /^((?:0|[1-9][0-9]*))-((?:0|[1-9][0-9]*))$/;
const MAX_STREAM_ID_COMPONENT = (1n << 64n) - 1n;
const SECRET_TOKEN_PATTERN =
  /\b([Aa][Pp][Ii][_-]?[Kk][Ee][Yy]|[Tt][Oo][Kk][Ee][Nn]|[Ss][Ee][Cc][Rr][Ee][Tt])["']?\s*[:=]\s*["']?[A-Za-z0-9._-]{12,}/;
const REGISTRATION_ATTEMPTS = 8;
const DEFAULT_RECEIVE_COUNT = 10;
const MAX_RECEIVE_COUNT = 100;
const MAX_ACK_COUNT = 100;
const COORDINATION_MESSAGE_V1_MAX_BYTES = 65_536;
const PRIVATE_PARTICIPANT_FIELDS = new Set([
  "protocolVersion",
  "participantId",
  "participantType",
  "scopeId",
  "displayName",
  "capabilities",
  "metadata",
  "registeredAt",
  "lastHeartbeatAt",
  "leaseExpiresAt",
  "leaseTokenHash",
]);
const MESSAGE_FIELDS = new Set([
  "protocolVersion",
  "messageId",
  "fromParticipantId",
  "toParticipantId",
  "scopeId",
  "messageType",
  "classification",
  "body",
  "createdAt",
  "traceId",
  "correlationId",
  "replyToMessageId",
]);
const AUDIT_STRING_FIELDS = new Set([
  "type",
  "participantId",
  "participantType",
  "scopeId",
  "fromParticipantId",
  "toParticipantId",
  "messageId",
  "messageType",
  "classification",
  "deliveryId",
  "traceId",
]);
const AUDIT_INTEGER_FIELDS = new Set([
  "timestamp",
  "leaseTtlMs",
  "deliveryCount",
  "ackedCount",
  "participantCount",
]);
const AUDIT_BOOLEAN_FIELDS = new Set([
  "duplicate",
  "recovered",
  "unregistered",
]);
const AUDIT_STRING_ARRAY_FIELDS = new Set(["deliveryIds"]);

const DEFAULT_CONFIG = Object.freeze({
  coordinationLeaseDefaultMs: DEFAULT_COORDINATION_LEASE_TTL_MS,
  coordinationLeaseMaxMs: MAX_COORDINATION_LEASE_TTL_MS,
  coordinationMessageMaxBytes: 65_536,
  coordinationMaxBlockMs: 30_000,
  coordinationDedupeTtlMs: DEFAULT_COORDINATION_DEDUPE_TTL_MS,
  coordinationAckTombstoneTtlMs: DEFAULT_COORDINATION_ACK_TOMBSTONE_TTL_MS,
});

export class CoordinationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CoordinationError";
    this.code = code;
  }
}

function error(code, message) {
  return new CoordinationError(code, message);
}

function invalidInput(message = "invalid coordination input") {
  return error("COORDINATION_INVALID_INPUT", message);
}

function unavailable() {
  return error("COORDINATION_UNAVAILABLE", "coordination requires a reachable Redis service");
}

function internalError() {
  return error("COORDINATION_INTERNAL_ERROR", "coordination operation failed safely");
}

function idCollision() {
  return error("COORDINATION_ID_COLLISION", "could not allocate a coordination identity");
}

function authFailed() {
  return error("COORDINATION_AUTH_FAILED", "coordination authentication failed");
}

function leaseExpired() {
  return error("COORDINATION_LEASE_EXPIRED", "coordination lease has expired");
}

function leaseChanged() {
  return error("COORDINATION_LEASE_CHANGED", "coordination identity changed during operation");
}

function scopeMismatch(message = "coordination scope does not match") {
  return error("COORDINATION_SCOPE_MISMATCH", message);
}

function targetNotFound() {
  return error("COORDINATION_TARGET_NOT_FOUND", "coordination target is unavailable");
}

function classificationDenied() {
  return error("COORDINATION_CLASSIFICATION_DENIED", "coordination classification is denied");
}

function secretRejected() {
  return error("COORDINATION_SECRET_REJECTED", "coordination content was rejected");
}

function messageTooLarge() {
  return error("COORDINATION_MESSAGE_TOO_LARGE", "coordination message exceeds its byte limit");
}

function messageConflict() {
  return error("COORDINATION_MESSAGE_CONFLICT", "coordination message ID conflicts");
}

function inboxFull() {
  return error("COORDINATION_INBOX_FULL", "coordination target inbox is full");
}

function deliveryNotFound() {
  return error("COORDINATION_DELIVERY_NOT_FOUND", "coordination delivery was not found");
}

function assertPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalidInput();
  return value;
}

function assertKnownKeys(value, allowed) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw invalidInput();
  }
}

function assertString(value, { min = 1, max, pattern } = {}) {
  if (typeof value !== "string" || value.length < min || (max && value.length > max)) {
    throw invalidInput();
  }
  if (pattern && !pattern.test(value)) throw invalidInput();
  return value;
}

function assertOptionalString(value, options) {
  return value === undefined ? undefined : assertString(value, options);
}

function assertPositiveInteger(value, { max, field } = {}) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw invalidInput(
      field ? `${field} must be a positive safe integer` : undefined,
    );
  }
  if (max !== undefined && value > max) {
    throw invalidInput(
      field ? `${field} exceeds maximum ${max}` : undefined,
    );
  }
  return value;
}

function assertNonNegativeInteger(value, { max } = {}) {
  if (
    !Number.isSafeInteger(value)
    || value < 0
    || (max !== undefined && value > max)
  ) {
    throw invalidInput();
  }
  return value;
}

function isDenseArray(value) {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) return false;
  }
  return true;
}

function validateCapabilities(value = []) {
  if (!Array.isArray(value) || value.length > 64) throw invalidInput();
  const capabilities = value.map((item) =>
    assertString(item, { max: 128, pattern: SAFE_IDENTIFIER }),
  );
  if (new Set(capabilities).size !== capabilities.length) throw invalidInput();
  return capabilities;
}

function validateMetadata(value = {}) {
  const metadata = assertPlainObject(value);
  if (Object.keys(metadata).length > 32) throw invalidInput();
  for (const [key, item] of Object.entries(metadata)) {
    assertString(key, { max: 64, pattern: SAFE_METADATA_KEY });
    if (item === null || typeof item === "boolean") continue;
    if (typeof item === "number" && Number.isFinite(item)) continue;
    if (typeof item === "string" && item.length <= 2_048) continue;
    throw invalidInput();
  }
  return structuredClone(metadata);
}

function validateRegisterInput(input, config) {
  const value = assertPlainObject(input);
  assertKnownKeys(
    value,
    new Set([
      "participantType",
      "scopeId",
      "displayName",
      "capabilities",
      "metadata",
      "leaseTtlMs",
    ]),
  );
  if (!PARTICIPANT_TYPES.has(value.participantType)) throw invalidInput();
  const leaseTtlMs =
    value.leaseTtlMs === undefined
      ? config.coordinationLeaseDefaultMs
      : assertPositiveInteger(value.leaseTtlMs, {
          max: config.coordinationLeaseMaxMs,
          field: "leaseTtlMs",
        });
  const requestedScopeId =
    value.scopeId === undefined
      ? undefined
      : assertString(value.scopeId, {
          max: 128,
          pattern: SAFE_IDENTIFIER,
        });
  let scopeId = requestedScopeId;
  if (config.coordinationScopeId !== undefined) {
    if (
      requestedScopeId !== undefined
      && requestedScopeId !== config.coordinationScopeId
    ) {
      throw scopeMismatch(
        "scopeId must match configured coordination scope",
      );
    }
    scopeId = config.coordinationScopeId;
  }
  if (scopeId === undefined) throw invalidInput();

  return {
    participantType: value.participantType,
    scopeId,
    displayName: assertOptionalString(value.displayName, { max: 256 }),
    capabilities: validateCapabilities(value.capabilities),
    metadata: validateMetadata(value.metadata),
    leaseTtlMs,
  };
}

function validateCredentialInput(input, { leaseTtl = false } = {}) {
  const value = assertPlainObject(input);
  const allowed = new Set(["participantId", "leaseToken"]);
  if (leaseTtl) allowed.add("leaseTtlMs");
  assertKnownKeys(value, allowed);
  return {
    participantId: assertString(value.participantId, {
      max: 128,
      pattern: SAFE_IDENTIFIER,
    }),
    leaseToken: assertString(value.leaseToken, {
      min: 32,
      max: 256,
      pattern: LEASE_TOKEN,
    }),
    ...(leaseTtl
      ? {
          leaseTtlMs: value.leaseTtlMs,
        }
      : {}),
  };
}

function validateHeartbeatInput(input, config) {
  const value = validateCredentialInput(input, { leaseTtl: true });
  return {
    participantId: value.participantId,
    leaseToken: value.leaseToken,
    leaseTtlMs:
      value.leaseTtlMs === undefined
        ? config.coordinationLeaseDefaultMs
        : assertPositiveInteger(value.leaseTtlMs, {
            max: config.coordinationLeaseMaxMs,
            field: "leaseTtlMs",
          }),
  };
}

function validateDiscoverInput(input) {
  const value = assertPlainObject(input);
  assertKnownKeys(
    value,
    new Set([
      "participantId",
      "leaseToken",
      "scopeId",
      "participantType",
      "capability",
    ]),
  );
  const participantType = value.participantType;
  if (participantType !== undefined && !PARTICIPANT_TYPES.has(participantType)) {
    throw invalidInput();
  }
  return {
    participantId: assertString(value.participantId, {
      max: 128,
      pattern: SAFE_IDENTIFIER,
    }),
    leaseToken: assertString(value.leaseToken, {
      min: 32,
      max: 256,
      pattern: LEASE_TOKEN,
    }),
    scopeId: assertOptionalString(value.scopeId, {
      max: 128,
      pattern: SAFE_IDENTIFIER,
    }),
    participantType,
    capability: assertOptionalString(value.capability, {
      max: 128,
      pattern: SAFE_IDENTIFIER,
    }),
  };
}

function validateSendInput(input, config) {
  const value = assertPlainObject(input);
  assertKnownKeys(
    value,
    new Set([
      "participantId",
      "leaseToken",
      "toParticipantId",
      "messageId",
      "messageType",
      "classification",
      "body",
      "traceId",
      "correlationId",
      "replyToMessageId",
    ]),
  );
  const classification = assertString(value.classification, { max: 32 });
  if (classification === "restricted") throw classificationDenied();
  if (classification !== "unrestricted" && classification !== "internal") {
    throw invalidInput();
  }
  const body = assertString(value.body);
  if (SECRET_TOKEN_PATTERN.test(body)) throw secretRejected();
  if (Buffer.byteLength(body, "utf8") > config.coordinationMessageMaxBytes) {
    throw messageTooLarge();
  }

  return {
    participantId: assertString(value.participantId, {
      max: 128,
      pattern: SAFE_IDENTIFIER,
    }),
    leaseToken: assertString(value.leaseToken, {
      min: 32,
      max: 256,
      pattern: LEASE_TOKEN,
    }),
    toParticipantId: assertString(value.toParticipantId, {
      max: 128,
      pattern: SAFE_IDENTIFIER,
    }),
    messageId: assertOptionalString(value.messageId, {
      max: 128,
      pattern: SAFE_IDENTIFIER,
    }),
    messageType: assertString(value.messageType, {
      max: 128,
      pattern: SAFE_IDENTIFIER,
    }),
    classification,
    body,
    traceId: assertOptionalString(value.traceId, { max: 128 }),
    correlationId: assertOptionalString(value.correlationId, { max: 128 }),
    replyToMessageId: assertOptionalString(value.replyToMessageId, {
      max: 128,
      pattern: SAFE_IDENTIFIER,
    }),
  };
}

function validateReceiveInput(input, config) {
  const value = assertPlainObject(input);
  assertKnownKeys(
    value,
    new Set([
      "participantId",
      "leaseToken",
      "consumerId",
      "count",
      "reclaimIdleMs",
      "blockMs",
    ]),
  );
  return {
    participantId: assertString(value.participantId, {
      max: 128,
      pattern: SAFE_IDENTIFIER,
    }),
    leaseToken: assertString(value.leaseToken, {
      min: 32,
      max: 256,
      pattern: LEASE_TOKEN,
    }),
    consumerId: assertString(value.consumerId, {
      max: 128,
      pattern: SAFE_IDENTIFIER,
    }),
    count:
      value.count === undefined
        ? DEFAULT_RECEIVE_COUNT
        : assertPositiveInteger(value.count, { max: MAX_RECEIVE_COUNT }),
    reclaimIdleMs:
      value.reclaimIdleMs === undefined
        ? null
        : assertNonNegativeInteger(value.reclaimIdleMs),
    blockMs:
      value.blockMs === undefined
        ? 0
        : assertNonNegativeInteger(value.blockMs, {
            max: config.coordinationMaxBlockMs,
          }),
  };
}

function validateAckInput(input) {
  const value = assertPlainObject(input);
  assertKnownKeys(
    value,
    new Set(["participantId", "leaseToken", "deliveryIds"]),
  );
  if (
    !isDenseArray(value.deliveryIds)
    || value.deliveryIds.length === 0
    || value.deliveryIds.length > MAX_ACK_COUNT
  ) {
    throw invalidInput();
  }
  const deliveryIds = value.deliveryIds.map((deliveryId) => {
    if (
      typeof deliveryId !== "string"
      || deliveryId.length > 128
      || !isCanonicalDeliveryId(deliveryId)
    ) {
      throw invalidInput();
    }
    return deliveryId;
  });
  if (new Set(deliveryIds).size !== deliveryIds.length) throw invalidInput();
  return {
    participantId: assertString(value.participantId, {
      max: 128,
      pattern: SAFE_IDENTIFIER,
    }),
    leaseToken: assertString(value.leaseToken, {
      min: 32,
      max: 256,
      pattern: LEASE_TOKEN,
    }),
    deliveryIds,
  };
}

function isCanonicalDeliveryId(value) {
  const match = DELIVERY_ID.exec(value);
  if (!match) return false;
  const timestamp = BigInt(match[1]);
  const sequence = BigInt(match[2]);
  return (
    (timestamp > 0n || sequence > 0n)
    && timestamp <= MAX_STREAM_ID_COMPONENT
    && sequence <= MAX_STREAM_ID_COMPONENT
  );
}

function ensureAvailable(queue) {
  if (!queue || queue.enabled !== true) throw unavailable();
  return safeQueueDescription(queue);
}

function safeQueueDescription(queue) {
  try {
    const source = queue.describe?.();
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw internalError();
    }

    const { prefix, eventsStream, consumerGroup } = source;
    const keys = coordinationKeys(prefix);
    if (
      source.enabled !== true
      || eventsStream !== keys.events
      || consumerGroup !== COORDINATION_CONSUMER_GROUP
    ) {
      throw internalError();
    }

    return {
      enabled: true,
      prefix,
      eventsStream,
      consumerGroup,
    };
  } catch {
    throw internalError();
  }
}

function safeLeaseTimes(clock, leaseTtlMs) {
  try {
    const now = clock();
    const expiresAt = now + leaseTtlMs;
    if (
      !Number.isSafeInteger(now)
      || now < 0
      || !Number.isSafeInteger(expiresAt)
    ) {
      throw internalError();
    }
    return {
      now,
      registeredAt: new Date(now).toISOString(),
      leaseExpiresAt: new Date(expiresAt).toISOString(),
    };
  } catch {
    throw internalError();
  }
}

function safeCurrentTime(clock) {
  try {
    const now = clock();
    if (!Number.isSafeInteger(now) || now < 0) throw internalError();
    return {
      now,
      timestamp: new Date(now).toISOString(),
    };
  } catch {
    throw internalError();
  }
}

function generatedParticipantId(randomUUID) {
  try {
    const uuid = randomUUID();
    const participantId = typeof uuid === "string" ? `pt-${uuid}` : "";
    if (!SAFE_IDENTIFIER.test(participantId)) throw internalError();
    return participantId;
  } catch {
    throw internalError();
  }
}

function generatedLeaseToken(randomToken) {
  try {
    const leaseToken = randomToken();
    if (typeof leaseToken !== "string" || !LEASE_TOKEN.test(leaseToken)) {
      throw internalError();
    }
    return leaseToken;
  } catch {
    throw internalError();
  }
}

function generatedMessageId(randomUUID) {
  try {
    const uuid = randomUUID();
    const messageId = typeof uuid === "string" ? `cm-${uuid}` : "";
    if (!SAFE_IDENTIFIER.test(messageId)) throw internalError();
    return messageId;
  } catch {
    throw internalError();
  }
}

function leaseTokenHash(leaseToken) {
  return crypto.createHash("sha256").update(leaseToken, "utf8").digest("hex");
}

function publicParticipant(record) {
  return {
    protocolVersion: record.protocolVersion,
    participantId: record.participantId,
    participantType: record.participantType,
    scopeId: record.scopeId,
    ...(record.displayName === undefined ? {} : { displayName: record.displayName }),
    capabilities: [...record.capabilities],
    metadata: structuredClone(record.metadata),
    registeredAt: record.registeredAt,
    lastHeartbeatAt: record.lastHeartbeatAt,
    leaseExpiresAt: record.leaseExpiresAt,
  };
}

function mapQueueError(err) {
  if (err?.code === "COORDINATION_UNAVAILABLE") return unavailable();
  if (err?.code === "COORDINATION_LEASE_CHANGED") return leaseChanged();
  if (err?.code === "COORDINATION_LEASE_EXPIRED") return leaseExpired();
  if (err?.code === "COORDINATION_TARGET_NOT_FOUND") return targetNotFound();
  if (err?.code === "COORDINATION_MESSAGE_CONFLICT") return messageConflict();
  if (err?.code === "COORDINATION_INBOX_FULL") return inboxFull();
  if (err?.code === "COORDINATION_DELIVERY_NOT_FOUND") return deliveryNotFound();
  return internalError();
}

function storedParticipant(raw, participantId) {
  try {
    const value = assertPlainObject(raw);
    assertKnownKeys(value, PRIVATE_PARTICIPANT_FIELDS);
    if (value.protocolVersion !== COORDINATION_PROTOCOL_VERSION) throw internalError();
    if (value.participantId !== participantId) throw internalError();
    if (!PARTICIPANT_TYPES.has(value.participantType)) throw internalError();
    const record = {
      protocolVersion: value.protocolVersion,
      participantId: assertString(value.participantId, {
        max: 128,
        pattern: SAFE_IDENTIFIER,
      }),
      participantType: value.participantType,
      scopeId: assertString(value.scopeId, {
        max: 128,
        pattern: SAFE_IDENTIFIER,
      }),
      ...(value.displayName === undefined
        ? {}
        : { displayName: assertString(value.displayName, { max: 256 }) }),
      capabilities: validateCapabilities(value.capabilities),
      metadata: validateMetadata(value.metadata),
      registeredAt: assertString(value.registeredAt, { max: 64 }),
      lastHeartbeatAt: assertString(value.lastHeartbeatAt, { max: 64 }),
      leaseExpiresAt: assertString(value.leaseExpiresAt, { max: 64 }),
      leaseTokenHash: assertString(value.leaseTokenHash, {
        min: 64,
        max: 64,
        pattern: SHA256_HEX,
      }),
    };
    for (const field of ["registeredAt", "lastHeartbeatAt", "leaseExpiresAt"]) {
      const millis = Date.parse(record[field]);
      if (!Number.isSafeInteger(millis)) throw internalError();
    }
    return record;
  } catch {
    throw internalError();
  }
}

function listedParticipant(raw) {
  try {
    const participantId = raw?.participantId;
    if (typeof participantId !== "string") throw internalError();
    return storedParticipant(raw, participantId);
  } catch {
    throw internalError();
  }
}

function storedMessage(raw, config) {
  try {
    const value = assertPlainObject(raw);
    assertKnownKeys(value, MESSAGE_FIELDS);
    if (value.protocolVersion !== COORDINATION_PROTOCOL_VERSION) throw internalError();
    const classification = assertString(value.classification, { max: 32 });
    if (classification !== "unrestricted" && classification !== "internal") {
      throw internalError();
    }
    const body = assertString(value.body);
    if (
      SECRET_TOKEN_PATTERN.test(body)
      || Buffer.byteLength(body, "utf8") > config.coordinationMessageMaxBytes
    ) {
      throw internalError();
    }
    const message = {
      protocolVersion: value.protocolVersion,
      messageId: assertString(value.messageId, {
        max: 128,
        pattern: SAFE_IDENTIFIER,
      }),
      fromParticipantId: assertString(value.fromParticipantId, {
        max: 128,
        pattern: SAFE_IDENTIFIER,
      }),
      toParticipantId: assertString(value.toParticipantId, {
        max: 128,
        pattern: SAFE_IDENTIFIER,
      }),
      scopeId: assertString(value.scopeId, {
        max: 128,
        pattern: SAFE_IDENTIFIER,
      }),
      messageType: assertString(value.messageType, {
        max: 128,
        pattern: SAFE_IDENTIFIER,
      }),
      classification,
      body,
      createdAt: assertString(value.createdAt, { max: 64 }),
      ...(value.traceId === undefined
        ? {}
        : { traceId: assertString(value.traceId, { max: 128 }) }),
      ...(value.correlationId === undefined
        ? {}
        : { correlationId: assertString(value.correlationId, { max: 128 }) }),
      ...(value.replyToMessageId === undefined
        ? {}
        : {
            replyToMessageId: assertString(value.replyToMessageId, {
              max: 128,
              pattern: SAFE_IDENTIFIER,
            }),
          }),
    };
    if (!Number.isSafeInteger(Date.parse(message.createdAt))) throw internalError();
    return message;
  } catch {
    throw internalError();
  }
}

function sameSemanticMessage(left, right) {
  const fields = [
    "protocolVersion",
    "messageId",
    "fromParticipantId",
    "toParticipantId",
    "scopeId",
    "messageType",
    "classification",
    "body",
    "traceId",
    "correlationId",
    "replyToMessageId",
  ];
  return fields.every(
    (field) =>
      Object.hasOwn(left, field) === Object.hasOwn(right, field)
      && left[field] === right[field],
  );
}

function validatedDeliveryId(value) {
  if (
    typeof value !== "string"
    || value.length > 128
    || !isCanonicalDeliveryId(value)
  ) {
    throw internalError();
  }
  return value;
}

function validatedDelivery(raw, { participant, config }) {
  try {
    const value = assertPlainObject(raw);
    assertKnownKeys(value, new Set(["deliveryId", "message", "recovered"]));
    if (typeof value.recovered !== "boolean") throw internalError();
    const deliveryId = validatedDeliveryId(value.deliveryId);
    const envelope = storedMessage(value.message, config);
    if (
      envelope.toParticipantId !== participant.participantId
      || envelope.scopeId !== participant.scopeId
    ) {
      throw internalError();
    }
    return {
      deliveryId,
      message: envelope,
      recovered: value.recovered,
    };
  } catch {
    throw internalError();
  }
}

async function readParticipant(queue, participantId, { signal } = {}) {
  let raw;
  try {
    raw = await queue.getParticipant(
      participantId,
      // MUTATION_GUARD: participant-lookup-signal
      { signal },
    );
  } catch (err) {
    throw mapQueueError(err);
  }
  return raw === null ? null : storedParticipant(raw, participantId);
}

function authenticateParticipant(record, leaseToken, now) {
  const supplied = Buffer.from(leaseTokenHash(leaseToken), "hex");
  const expected = Buffer.from(record.leaseTokenHash, "hex");
  if (
    supplied.length !== expected.length
    || !crypto.timingSafeEqual(supplied, expected)
  ) {
    throw authFailed();
  }
  if (Date.parse(record.leaseExpiresAt) <= now) throw leaseExpired();
  return createCoordinationLeaseFence(record);
}

export function createCoordinationAuditEvent(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return Object.freeze({});
  }

  const event = {};
  for (const [key, value] of Object.entries(source)) {
    if (AUDIT_STRING_FIELDS.has(key)) {
      if (typeof value !== "string") continue;
      if (key === "type" && !SAFE_AUDIT_TYPE.test(value)) continue;
      event[key] = value;
      continue;
    }
    if (AUDIT_INTEGER_FIELDS.has(key) && Number.isSafeInteger(value) && value >= 0) {
      event[key] = value;
      continue;
    }
    if (AUDIT_BOOLEAN_FIELDS.has(key) && typeof value === "boolean") {
      event[key] = value;
      continue;
    }
    if (
      AUDIT_STRING_ARRAY_FIELDS.has(key)
      && Array.isArray(value)
      && value.every((item) => typeof item === "string")
    ) {
      event[key] = Object.freeze([...value]);
    }
  }
  return Object.freeze(event);
}

function safeAudit(audit, event) {
  try {
    audit?.(createCoordinationAuditEvent(event));
  } catch {
    // Audit is best effort and cannot change an authoritative operation result.
  }
}

export function createCoordinationService({
  queue,
  config: providedConfig = {},
  clock = () => Date.now(),
  randomUUID = () => crypto.randomUUID(),
  randomToken = () => crypto.randomBytes(32).toString("base64url"),
  audit = () => {},
} = {}) {
  const config = { ...DEFAULT_CONFIG, ...providedConfig };
  for (const [name, value] of [
    ["coordinationLeaseDefaultMs", config.coordinationLeaseDefaultMs],
    ["coordinationLeaseMaxMs", config.coordinationLeaseMaxMs],
  ]) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new TypeError(`${name} must be a positive safe integer`);
    }
  }
  if (config.coordinationLeaseMaxMs > MAX_COORDINATION_LEASE_TTL_MS) {
    throw new TypeError(
      `coordinationLeaseMaxMs must not exceed ${MAX_COORDINATION_LEASE_TTL_MS}`,
    );
  }
  if (config.coordinationLeaseDefaultMs > config.coordinationLeaseMaxMs) {
    throw new TypeError(
      "coordinationLeaseDefaultMs must not exceed coordinationLeaseMaxMs",
    );
  }
  if (
    config.coordinationScopeId !== undefined
    && (
      typeof config.coordinationScopeId !== "string"
      || !SAFE_IDENTIFIER.test(config.coordinationScopeId)
    )
  ) {
    throw new TypeError(
      "coordinationScopeId must be a safe coordination identifier",
    );
  }
  if (
    !Number.isSafeInteger(config.coordinationMessageMaxBytes)
    || config.coordinationMessageMaxBytes <= 0
  ) {
    throw new TypeError(
      "coordinationMessageMaxBytes must be a positive safe integer",
    );
  }
  if (config.coordinationMessageMaxBytes > COORDINATION_MESSAGE_V1_MAX_BYTES) {
    throw new TypeError(
      `coordinationMessageMaxBytes must not exceed ${COORDINATION_MESSAGE_V1_MAX_BYTES}`,
    );
  }

  const service = {
    async status(input) {
      const value = assertPlainObject(input);
      assertKnownKeys(value, new Set());
      const queueDescription = ensureAvailable(queue);
      let result;
      try {
        result = await queue.ping();
      } catch (err) {
        throw mapQueueError(err);
      }
      if (result?.status !== "ready") throw internalError();
      return {
        protocolVersion: COORDINATION_PROTOCOL_VERSION,
        status: "ready",
        ...(config.coordinationScopeId === undefined
          ? {}
          : { scopeId: config.coordinationScopeId }),
        queue: queueDescription,
        limits: {
          leaseDefaultMs: config.coordinationLeaseDefaultMs,
          leaseMaxMs: config.coordinationLeaseMaxMs,
        },
      };
    },
    async register(input) {
      const queueDescription = ensureAvailable(queue);
      const validated = validateRegisterInput(input, config);
      const {
        now,
        registeredAt: timestamp,
        leaseExpiresAt,
      } = safeLeaseTimes(clock, validated.leaseTtlMs);
      const leaseToken = generatedLeaseToken(randomToken);
      const digest = leaseTokenHash(leaseToken);

      for (let attempt = 0; attempt < REGISTRATION_ATTEMPTS; attempt += 1) {
        const participantId = generatedParticipantId(randomUUID);
        const privateRecord = {
          protocolVersion: COORDINATION_PROTOCOL_VERSION,
          participantId,
          participantType: validated.participantType,
          scopeId: validated.scopeId,
          ...(validated.displayName === undefined
            ? {}
            : { displayName: validated.displayName }),
          capabilities: [...validated.capabilities],
          metadata: structuredClone(validated.metadata),
          registeredAt: timestamp,
          lastHeartbeatAt: timestamp,
          leaseExpiresAt,
          leaseTokenHash: digest,
        };

        let stored;
        try {
          stored = await queue.putParticipant(privateRecord, {
            ttlMs: validated.leaseTtlMs,
            ifAbsent: true,
          });
        } catch (err) {
          throw mapQueueError(err);
        }

        if (stored?.status === "exists") continue;
        if (stored?.status !== "stored") throw internalError();

        safeAudit(audit, {
          type: "COORDINATION_PARTICIPANT_REGISTERED",
          participantId,
          participantType: validated.participantType,
          scopeId: validated.scopeId,
          timestamp: now,
          leaseTtlMs: validated.leaseTtlMs,
        });

        return {
          ...publicParticipant(privateRecord),
          leaseToken,
          queue: queueDescription,
        };
      }

      throw idCollision();
    },
    async heartbeat(input) {
      ensureAvailable(queue);
      const validated = validateHeartbeatInput(input, config);
      const current = await readParticipant(queue, validated.participantId);
      if (!current) throw authFailed();
      const {
        now,
        registeredAt: lastHeartbeatAt,
        leaseExpiresAt,
      } = safeLeaseTimes(clock, validated.leaseTtlMs);
      const fence = authenticateParticipant(current, validated.leaseToken, now);
      const renewed = {
        ...current,
        capabilities: [...current.capabilities],
        metadata: structuredClone(current.metadata),
        lastHeartbeatAt,
        leaseExpiresAt,
      };

      let stored;
      try {
        stored = await queue.putParticipant(renewed, {
          ttlMs: validated.leaseTtlMs,
          ifAbsent: false,
          fence,
        });
      } catch (err) {
        throw mapQueueError(err);
      }
      if (stored?.status === "missing" || stored?.status === "fence_mismatch") {
        throw leaseChanged();
      }
      if (stored?.status !== "stored") throw internalError();

      safeAudit(audit, {
        type: "COORDINATION_PARTICIPANT_HEARTBEAT",
        participantId: renewed.participantId,
        participantType: renewed.participantType,
        scopeId: renewed.scopeId,
        timestamp: now,
        leaseTtlMs: validated.leaseTtlMs,
      });
      return publicParticipant(renewed);
    },
    async discover(input) {
      ensureAvailable(queue);
      const validated = validateDiscoverInput(input);
      const caller = await readParticipant(queue, validated.participantId);
      if (!caller) throw authFailed();
      const { now } = safeCurrentTime(clock);
      const fence = authenticateParticipant(caller, validated.leaseToken, now);
      if (validated.scopeId !== undefined && validated.scopeId !== caller.scopeId) {
        throw scopeMismatch();
      }

      let listed;
      try {
        listed = await queue.listParticipants({ fence });
      } catch (err) {
        throw mapQueueError(err);
      }
      if (listed?.status === "fence_mismatch") throw leaseChanged();
      if (listed?.status !== "listed" || !Array.isArray(listed.participants)) {
        throw internalError();
      }

      const seen = new Set();
      const participants = listed.participants
        .map((raw) => listedParticipant(raw))
        .filter((participant) => {
          if (seen.has(participant.participantId)) throw internalError();
          seen.add(participant.participantId);
          return (
            Date.parse(participant.leaseExpiresAt) > now
            && participant.scopeId === caller.scopeId
            && (
              validated.participantType === undefined
              || participant.participantType === validated.participantType
            )
            && (
              validated.capability === undefined
              || participant.capabilities.includes(validated.capability)
            )
          );
        })
        .map((participant) => publicParticipant(participant))
        .sort((left, right) => {
          if (left.participantId < right.participantId) return -1;
          if (left.participantId > right.participantId) return 1;
          return 0;
        });

      safeAudit(audit, {
        type: "COORDINATION_PARTICIPANTS_DISCOVERED",
        participantId: caller.participantId,
        scopeId: caller.scopeId,
        timestamp: now,
        participantCount: participants.length,
      });
      return participants;
    },
    async unregister(input) {
      ensureAvailable(queue);
      const validated = validateCredentialInput(input);
      const current = await readParticipant(queue, validated.participantId);
      if (!current) {
        return {
          participantId: validated.participantId,
          unregistered: false,
        };
      }
      const { now, timestamp } = safeCurrentTime(clock);
      const fence = authenticateParticipant(current, validated.leaseToken, now);

      let deleted;
      try {
        deleted = await queue.deleteParticipant(validated.participantId, {
          fence,
          participantType: current.participantType,
          scopeId: current.scopeId,
          timestamp,
        });
      } catch (err) {
        throw mapQueueError(err);
      }
      if (deleted?.status === "fence_mismatch") throw leaseChanged();
      if (deleted?.status !== "deleted" && deleted?.status !== "missing") {
        throw internalError();
      }

      const unregistered = deleted.status === "deleted";
      if (unregistered) {
        safeAudit(audit, {
          type: "COORDINATION_PARTICIPANT_UNREGISTERED",
          participantId: current.participantId,
          participantType: current.participantType,
          scopeId: current.scopeId,
          timestamp: now,
          unregistered,
        });
      }
      return {
        participantId: validated.participantId,
        unregistered,
      };
    },
    async send(input) {
      ensureAvailable(queue);
      const validated = validateSendInput(input, config);
      const sender = await readParticipant(queue, validated.participantId);
      if (!sender) throw authFailed();
      const { now, timestamp: createdAt } = safeCurrentTime(clock);
      const senderFence = authenticateParticipant(
        sender,
        validated.leaseToken,
        now,
      );
      const recipient = await readParticipant(queue, validated.toParticipantId);
      if (
        !recipient
        || Date.parse(recipient.leaseExpiresAt) <= now
      ) {
        throw targetNotFound();
      }
      if (recipient.scopeId !== sender.scopeId) throw scopeMismatch();
      const recipientFence = createCoordinationLeaseFence(recipient);
      const messageId = validated.messageId ?? generatedMessageId(randomUUID);
      const envelope = {
        protocolVersion: COORDINATION_PROTOCOL_VERSION,
        messageId,
        fromParticipantId: sender.participantId,
        toParticipantId: recipient.participantId,
        scopeId: sender.scopeId,
        messageType: validated.messageType,
        classification: validated.classification,
        body: validated.body,
        createdAt,
        ...(validated.traceId === undefined
          ? {}
          : { traceId: validated.traceId }),
        ...(validated.correlationId === undefined
          ? {}
          : { correlationId: validated.correlationId }),
        ...(validated.replyToMessageId === undefined
          ? {}
          : { replyToMessageId: validated.replyToMessageId }),
      };

      let sent;
      try {
        sent = await queue.putMessage(envelope, {
          senderFence,
          recipientFence,
          dedupeTtlMs: config.coordinationDedupeTtlMs,
        });
      } catch (err) {
        throw mapQueueError(err);
      }

      if (sent?.status === "sender_fence_mismatch") throw leaseChanged();
      if (sent?.status === "target_missing") throw targetNotFound();
      if (sent?.status === "recipient_fence_mismatch") throw leaseChanged();
      if (sent?.status === "conflict") throw messageConflict();
      if (sent?.status === "inbox_full") throw inboxFull();

      let message;
      let duplicate;
      if (sent?.status === "created") {
        message = envelope;
        duplicate = false;
      } else if (sent?.status === "duplicate") {
        message = storedMessage(sent.envelope, config);
        if (!sameSemanticMessage(message, envelope)) throw internalError();
        duplicate = true;
      } else {
        throw internalError();
      }
      const deliveryId = validatedDeliveryId(sent.deliveryId);

      safeAudit(audit, {
        type: "COORDINATION_MESSAGE_SENT",
        participantId: sender.participantId,
        fromParticipantId: sender.participantId,
        toParticipantId: recipient.participantId,
        scopeId: sender.scopeId,
        messageId: message.messageId,
        messageType: message.messageType,
        classification: message.classification,
        deliveryId,
        timestamp: now,
        duplicate,
      });
      return {
        message,
        deliveryId,
        duplicate,
      };
    },
    async receive(input, { signal } = {}) {
      ensureAvailable(queue);
      const validated = validateReceiveInput(input, config);
      const participant = await readParticipant(
        queue,
        validated.participantId,
        { signal },
      );
      if (!participant) throw authFailed();
      const { now } = safeCurrentTime(clock);
      const fence = authenticateParticipant(
        participant,
        validated.leaseToken,
        now,
      );

      let read;
      try {
        read = await queue.readInbox(
          {
            participantId: participant.participantId,
            consumerId: validated.consumerId,
            count: validated.count,
            reclaimIdleMs: validated.reclaimIdleMs,
            blockMs: validated.blockMs,
            now,
            fence,
          },
          // MUTATION_GUARD: service-receive-signal
          { signal },
        );
      } catch (err) {
        throw mapQueueError(err);
      }
      if (read?.status === "fence_mismatch") throw leaseChanged();
      if (
        read?.status !== "read"
        || !isDenseArray(read.deliveries)
        || read.deliveries.length > validated.count
      ) {
        throw internalError();
      }

      const seen = new Set();
      const deliveries = read.deliveries.map((raw) => {
        const delivery = validatedDelivery(raw, { participant, config });
        if (seen.has(delivery.deliveryId)) throw internalError();
        seen.add(delivery.deliveryId);
        return delivery;
      });
      if (deliveries.length > 0) {
        safeAudit(audit, {
          type: "COORDINATION_MESSAGES_RECEIVED",
          participantId: participant.participantId,
          scopeId: participant.scopeId,
          timestamp: now,
          deliveryCount: deliveries.length,
          deliveryIds: deliveries.map(({ deliveryId }) => deliveryId),
        });
      }
      return deliveries;
    },
    async ack(input) {
      ensureAvailable(queue);
      const validated = validateAckInput(input);
      const participant = await readParticipant(queue, validated.participantId);
      if (!participant) throw authFailed();
      const { now, timestamp } = safeCurrentTime(clock);
      const fence = authenticateParticipant(
        participant,
        validated.leaseToken,
        now,
      );

      let acknowledged;
      try {
        acknowledged = await queue.ackInbox({
          participantId: participant.participantId,
          deliveryIds: [...validated.deliveryIds],
          tombstoneTtlMs: config.coordinationAckTombstoneTtlMs,
          timestamp,
          fence,
        });
      } catch (err) {
        throw mapQueueError(err);
      }
      if (acknowledged?.status === "fence_mismatch") throw leaseChanged();
      if (acknowledged?.status === "delivery_not_found") throw deliveryNotFound();
      if (
        acknowledged?.status !== "acked"
        || !Number.isSafeInteger(acknowledged.ackedCount)
        || acknowledged.ackedCount < 0
        || acknowledged.ackedCount > validated.deliveryIds.length
      ) {
        throw internalError();
      }

      if (acknowledged.ackedCount > 0) {
        safeAudit(audit, {
          type: "COORDINATION_MESSAGES_ACKNOWLEDGED",
          participantId: participant.participantId,
          scopeId: participant.scopeId,
          timestamp: now,
          ackedCount: acknowledged.ackedCount,
          deliveryIds: validated.deliveryIds,
        });
      }
      return {
        ackedCount: acknowledged.ackedCount,
        deliveryIds: [...validated.deliveryIds],
      };
    },
  };
  Object.defineProperty(service, COORDINATION_SERVICE_LIMITS, {
    value: Object.freeze({
      leaseDefaultMs: config.coordinationLeaseDefaultMs,
      leaseMaxMs: config.coordinationLeaseMaxMs,
    }),
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return service;
}
