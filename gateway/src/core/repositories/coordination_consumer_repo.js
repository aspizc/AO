import crypto from "node:crypto";

const CONSUME_KEY = /^coord-consume-v1-[a-f0-9]{64}$/;
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const SAFE_CODE = /^[A-Z][A-Z0-9_]{1,127}$/;
const DELIVERY_ID = /^(?:0|[1-9][0-9]*)-(?:0|[1-9][0-9]*)$/;
const ACK_INTENT_CURSOR =
  /^coord-consume-v1-[a-f0-9]{64}:(?:0|[1-9][0-9]*)-(?:0|[1-9][0-9]*)$/;
const MAX_ACK_INTENT_PAGE_SIZE = 100;
const ACK_PROOF_PRODUCERS = Object.freeze({
  DIRECT_ACK: Object.freeze(Object.create(null)),
  ACK_TOMBSTONE: Object.freeze(Object.create(null)),
  ORPHAN_ACK: Object.freeze(Object.create(null)),
});
const ACK_PROOF_CODES = new WeakMap([
  [ACK_PROOF_PRODUCERS.DIRECT_ACK, "DIRECT_ACK"],
  [ACK_PROOF_PRODUCERS.ACK_TOMBSTONE, "ACK_TOMBSTONE"],
  [ACK_PROOF_PRODUCERS.ORPHAN_ACK, "ORPHAN_ACK"],
]);
const ACK_PROOF_EVIDENCE = new WeakMap();
const ACK_DEFER_REASONS = new Set([
  "ACK_CONTRACT_INVALID",
  "ACK_TRANSPORT_FAILED",
  "OLD_PARTICIPANT_PRESENT",
  "TRANSPORT_UNAVAILABLE",
]);
const ACK_RECOVERY_REASONS = new Set([
  "TRANSPORT_STATE_UNKNOWN",
]);
const ACK_CLAIM_FAMILY = Object.freeze({
  DIRECT: "direct",
  RECONCILIATION: "reconciliation",
});
const ACK_LIST_FIELDS = new Set(["cursor", "limit", "now"]);
const ACK_CLAIM_FIELDS = new Set([
  "consumeKey",
  "deliveryId",
  "ownerId",
  "now",
  "leaseMs",
]);
const ACK_OWNED_FIELDS = new Set([
  "consumeKey",
  "deliveryId",
  "ownerId",
  "claimToken",
  "now",
]);
const ACK_RENEW_FIELDS = new Set([
  ...ACK_OWNED_FIELDS,
  "leaseMs",
]);
const ACK_COMMIT_FIELDS = new Set([
  ...ACK_OWNED_FIELDS,
]);
const ACK_DEFER_FIELDS = new Set([
  ...ACK_OWNED_FIELDS,
  "reasonCode",
  "retryAt",
]);
const ACK_RECOVERY_FIELDS = new Set([
  ...ACK_OWNED_FIELDS,
  "reasonCode",
]);
const METADATA_FIELDS = new Set([
  "protocolVersion",
  "scopeId",
  "messageId",
  "fromParticipantId",
  "toParticipantId",
  "messageType",
  "classification",
  "createdAt",
  "traceId",
  "correlationId",
  "replyToMessageId",
  "malformed",
]);

export const COORDINATION_CONSUMER_REPOSITORY_CONTRACT = Object.freeze({
  durable: false,
  atomicWithBusinessEffect: false,
  bodyStorage: false,
  purpose: "deterministic-conformance-only",
  maxConsumedRecoveryIdsPerReceipt: 8,
});

export function coordinationAckProofCode(evidence) {
  const record = ACK_PROOF_EVIDENCE.get(evidence);
  if (!record) {
    throw new TypeError("ACK proof evidence is invalid");
  }
  return record.code;
}

function mintAckProofEvidence(producer, intent, family) {
  const code = ACK_PROOF_CODES.get(producer);
  if (!code) {
    throw new TypeError("ACK proof producer is invalid");
  }
  const evidence = Object.freeze(Object.create(null));
  ACK_PROOF_EVIDENCE.set(evidence, Object.freeze({
    code,
    consumeKey: intent.consumeKey,
    deliveryId: intent.deliveryId,
    claimEpoch: intent.claimEpoch,
    family,
  }));
  return evidence;
}

function plainObject(value, label) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`${label} must be a plain object`);
  }
  return value;
}

function exactObject(value, label, fields) {
  const source = plainObject(value, label);
  const snapshot = {};
  for (const field of Reflect.ownKeys(source)) {
    if (typeof field !== "string" || !fields.has(field)) {
      throw new TypeError(`${label} contains an unsupported field`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(source, field);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label} must contain own data fields`);
    }
    snapshot[field] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function safeIdentifier(value, label) {
  if (typeof value !== "string" || !SAFE_IDENTIFIER.test(value)) {
    throw new TypeError(`${label} must be a safe identifier`);
  }
  return value;
}

function safeCode(value, label) {
  if (typeof value !== "string" || !SAFE_CODE.test(value)) {
    throw new TypeError(`${label} must be a safe code`);
  }
  return value;
}

function safeInteger(value, label, { positive = false } = {}) {
  if (
    !Number.isSafeInteger(value)
    || value < 0
    || (positive && value === 0)
  ) {
    throw new TypeError(`${label} must be a ${positive ? "positive " : ""}safe integer`);
  }
  return value;
}

function safeExpiry(now, leaseMs) {
  const expiresAt = now + leaseMs;
  if (!Number.isSafeInteger(expiresAt)) {
    throw new TypeError("claim expiry exceeds the safe integer range");
  }
  return expiresAt;
}

function consumeKey(value) {
  if (typeof value !== "string" || !CONSUME_KEY.test(value)) {
    throw new TypeError("consumeKey must be canonical");
  }
  return value;
}

function deliveryId(value) {
  if (typeof value !== "string" || value.length > 128 || !DELIVERY_ID.test(value)) {
    throw new TypeError("deliveryId must be canonical");
  }
  return value;
}

function ackIntentKey(rawConsumeKey, rawDeliveryId) {
  return `${consumeKey(rawConsumeKey)}:${deliveryId(rawDeliveryId)}`;
}

function ackClaimToken(intent, ownerId, epoch, family) {
  return `ack-${crypto
    .createHash("sha256")
    .update(JSON.stringify([
      "ack-claim",
      family,
      intent.consumeKey,
      intent.deliveryId,
      ownerId,
      epoch,
    ]), "utf8")
    .digest("hex")}`;
}

function metadata(value) {
  const source = plainObject(value, "metadata");
  if (Object.hasOwn(source, "body")) {
    throw new TypeError("metadata must not contain a message body");
  }
  for (const key of Object.keys(source)) {
    if (!METADATA_FIELDS.has(key)) {
      throw new TypeError(`metadata contains unsupported field ${key}`);
    }
  }
  const malformed = source.malformed === true;
  if (
    !Number.isSafeInteger(source.protocolVersion)
    || source.protocolVersion < 0
    || source.protocolVersion > 255
    || (!malformed && source.protocolVersion !== 1)
  ) {
    throw new TypeError("metadata.protocolVersion is invalid");
  }
  for (const field of [
    "scopeId",
    "messageId",
    "fromParticipantId",
    "toParticipantId",
    "messageType",
    "classification",
  ]) {
    safeIdentifier(source[field], `metadata.${field}`);
    if (source[field].length > 128) {
      throw new TypeError(`metadata.${field} exceeds its limit`);
    }
  }
  if (
    !malformed
    && !["unrestricted", "internal"].includes(source.classification)
  ) {
    throw new TypeError("metadata.classification is invalid");
  }
  if (
    typeof source.createdAt !== "string"
    || source.createdAt.length > 64
    || !Number.isFinite(Date.parse(source.createdAt))
  ) {
    throw new TypeError("metadata.createdAt is invalid");
  }
  for (const field of ["traceId", "correlationId", "replyToMessageId"]) {
    if (source[field] === undefined) continue;
    safeIdentifier(source[field], `metadata.${field}`);
    if (source[field].length > 128) {
      throw new TypeError(`metadata.${field} exceeds its limit`);
    }
  }
  if (
    source.malformed !== undefined
    && typeof source.malformed !== "boolean"
  ) {
    throw new TypeError("metadata.malformed must be a boolean");
  }
  const copy = structuredClone(source);
  if (JSON.stringify(copy).length > 4096) {
    throw new TypeError("metadata exceeds its bounded representation");
  }
  return Object.freeze(copy);
}

function assertOwned(
  receipt,
  ownerId,
  claimToken,
  states = ["processing"],
) {
  if (
    !states.includes(receipt.state)
    || receipt.lease?.ownerId !== ownerId
    || receipt.lease?.claimToken !== claimToken
  ) {
    throw new Error("coordination consumer receipt is not owned");
  }
}

function publicDelivery(value) {
  return {
    deliveryId: value.deliveryId,
    recovered: value.recovered,
    observedAt: value.observedAt,
    ackState: value.ackState,
    ...(value.ackedAt === null ? {} : { ackedAt: value.ackedAt }),
  };
}

function publicReceipt(receipt) {
  return structuredClone({
    consumeKey: receipt.consumeKey,
    metadata: receipt.metadata,
    state: receipt.state,
    attempts: receipt.attempts,
    lease: receipt.lease === null
      ? null
      : {
          ownerId: receipt.lease.ownerId,
          expiresAt: receipt.lease.expiresAt,
        },
    deliveries: [...receipt.deliveries.values()].map(publicDelivery),
    effect: receipt.effect === null ? null : { ...receipt.effect },
    quarantine: receipt.quarantine === null
      ? null
      : {
          quarantineId: receipt.quarantine.quarantineId,
          reasonCode: receipt.quarantine.reasonCode,
          committedAt: receipt.quarantine.committedAt,
        },
    replay: receipt.replay === null
      ? null
      : {
          commandId: receipt.replay.commandId,
          decisionId: receipt.replay.decisionId,
          principalId: receipt.replay.principalId,
          state: receipt.replay.state,
          lease: receipt.replay.lease === null
            ? null
            : {
                ownerId: receipt.replay.lease.ownerId,
                expiresAt: receipt.replay.lease.expiresAt,
              },
          commitId: receipt.replay.commitId,
          committedAt: receipt.replay.committedAt,
          failureCode: receipt.replay.failureCode,
        },
    createdAt: receipt.createdAt,
    updatedAt: receipt.updatedAt,
  });
}

function publicAckIntent(intent, receipt) {
  return Object.freeze({
    consumeKey: intent.consumeKey,
    deliveryId: intent.deliveryId,
    scopeId: receipt.metadata.scopeId,
    fromParticipantId: receipt.metadata.fromParticipantId,
    oldParticipantId: receipt.metadata.toParticipantId,
    messageId: receipt.metadata.messageId,
    state: intent.state,
    dueAt: intent.dueAt,
    claimEpoch: intent.claimEpoch,
    proof: intent.proof,
    reasonCode: intent.reasonCode,
    createdAt: intent.createdAt,
    updatedAt: intent.updatedAt,
  });
}

function observeDelivery(receipt, {
  deliveryId: observedDeliveryId,
  recovered,
  now,
}) {
  const existing = receipt.deliveries.get(observedDeliveryId);
  if (existing) {
    if (recovered) existing.recovered = true;
    return;
  }
  receipt.deliveries.set(observedDeliveryId, {
    deliveryId: observedDeliveryId,
    recovered,
    observedAt: now,
    ackState: "pending",
    ackedAt: null,
  });
}

function completedOutcome(receipt) {
  if (receipt.effect !== null || receipt.replay?.state === "committed") {
    return "committed";
  }
  if (
    receipt.quarantine?.quarantineId
    && receipt.quarantine.locator
    && receipt.quarantine.committedAt !== null
  ) {
    return "quarantined";
  }
  throw new Error("coordination consumer receipt has no committed outcome");
}

export function createInMemoryCoordinationConsumerRepository() {
  const receipts = new Map();
  const quarantineIndex = new Map();
  const ackIntents = new Map();

  async function claim(input) {
    const value = plainObject(input, "claim");
    const key = consumeKey(value.consumeKey);
    const observedDeliveryId = deliveryId(value.deliveryId);
    const ownerId = safeIdentifier(value.ownerId, "ownerId");
    const now = safeInteger(value.now, "now");
    const leaseMs = safeInteger(value.leaseMs, "leaseMs", { positive: true });
    const safeMetadata = metadata(value.metadata);
    const maxConsumedRecoveryIdsPerReceipt = value
      .maxConsumedRecoveryIdsPerReceipt === undefined
      ? COORDINATION_CONSUMER_REPOSITORY_CONTRACT
        .maxConsumedRecoveryIdsPerReceipt
      : safeInteger(
          value.maxConsumedRecoveryIdsPerReceipt,
          "maxConsumedRecoveryIdsPerReceipt",
          { positive: true },
        );
    if (
      maxConsumedRecoveryIdsPerReceipt
      > COORDINATION_CONSUMER_REPOSITORY_CONTRACT
        .maxConsumedRecoveryIdsPerReceipt
    ) {
      throw new TypeError(
        "maxConsumedRecoveryIdsPerReceipt exceeds the repository contract",
      );
    }
    if (typeof value.recovered !== "boolean") {
      throw new TypeError("recovered must be a boolean");
    }

    let receipt = receipts.get(key);
    if (!receipt) {
      receipt = {
        consumeKey: key,
        metadata: safeMetadata,
        state: "processing",
        attempts: 0,
        claimEpoch: 1,
        lease: {
          ownerId,
          claimToken: "claim-1",
          expiresAt: safeExpiry(now, leaseMs),
        },
        deliveries: new Map(),
        effect: null,
        quarantine: null,
        replay: null,
        replayEpoch: 0,
        consumedRecoveryIds: [],
        maxConsumedRecoveryIdsPerReceipt,
        createdAt: now,
        updatedAt: now,
      };
      observeDelivery(receipt, {
        deliveryId: observedDeliveryId,
        recovered: value.recovered,
        now,
      });
      receipts.set(key, receipt);
      return {
        status: "claimed",
        stale: false,
        claimToken: receipt.lease.claimToken,
        receipt: publicReceipt(receipt),
      };
    }

    observeDelivery(receipt, {
      deliveryId: observedDeliveryId,
      recovered: value.recovered,
      now,
    });
    receipt.updatedAt = now;
    if (receipt.state === "quarantine_blocked") {
      return { status: "blocked", receipt: publicReceipt(receipt) };
    }
    if (
      receipt.state === "effect_committed"
      || receipt.state === "quarantined"
      || receipt.state === "completed"
      || receipt.state === "replay_committed"
    ) {
      return {
        status: completedOutcome(receipt),
        receipt: publicReceipt(receipt),
      };
    }
    if (receipt.state !== "processing") {
      throw new Error("coordination consumer receipt has an invalid state");
    }
    const stale = receipt.lease === null || receipt.lease.expiresAt <= now;
    if (!stale) {
      return { status: "busy", receipt: publicReceipt(receipt) };
    }
    receipt.claimEpoch += 1;
    receipt.lease = {
      ownerId,
      claimToken: `claim-${receipt.claimEpoch}`,
      expiresAt: safeExpiry(now, leaseMs),
    };
    return {
      status: "claimed",
      stale,
      claimToken: receipt.lease.claimToken,
      receipt: publicReceipt(receipt),
    };
  }

  async function claimBlockedQuarantine({
    consumeKey: rawConsumeKey,
    ownerId: rawOwnerId,
    recoveryId: rawRecoveryId,
    now: rawNow,
    leaseMs: rawLeaseMs,
  }) {
    const key = consumeKey(rawConsumeKey);
    const ownerId = safeIdentifier(rawOwnerId, "ownerId");
    const recoveryId = safeIdentifier(rawRecoveryId, "recoveryId");
    const now = safeInteger(rawNow, "now");
    const leaseMs = safeInteger(rawLeaseMs, "leaseMs", { positive: true });
    const receipt = receipts.get(key);
    if (!receipt) throw new Error("coordination consumer receipt was not found");
    if (
      receipt.state === "effect_committed"
      || receipt.state === "quarantined"
      || receipt.state === "completed"
      || receipt.state === "replay_committed"
    ) {
      return {
        status: completedOutcome(receipt),
        receipt: publicReceipt(receipt),
      };
    }
    if (receipt.state !== "quarantine_blocked") {
      throw new Error("coordination consumer receipt is not blocked");
    }
    if (
      receipt.consumedRecoveryIds.includes(recoveryId)
      || receipt.consumedRecoveryIds.length
        >= receipt.maxConsumedRecoveryIdsPerReceipt
    ) {
      return { status: "blocked", receipt: publicReceipt(receipt) };
    }
    if (receipt.lease !== null && receipt.lease.expiresAt > now) {
      return { status: "busy", receipt: publicReceipt(receipt) };
    }
    const expiresAt = safeExpiry(now, leaseMs);
    const claimEpoch = safeInteger(
      receipt.claimEpoch + 1,
      "claimEpoch",
      { positive: true },
    );
    const claimToken = `claim-${claimEpoch}`;
    const lease = { ownerId, claimToken, expiresAt };

    receipt.consumedRecoveryIds.push(recoveryId);
    receipt.claimEpoch = claimEpoch;
    receipt.lease = lease;
    receipt.updatedAt = now;
    return {
      status: "claimed",
      claimToken,
      receipt: publicReceipt(receipt),
    };
  }

  async function recordAttempt({
    consumeKey: rawConsumeKey,
    ownerId: rawOwnerId,
    claimToken: rawClaimToken,
    now: rawNow,
    leaseMs: rawLeaseMs,
  }) {
    const key = consumeKey(rawConsumeKey);
    const ownerId = safeIdentifier(rawOwnerId, "ownerId");
    const claimToken = safeIdentifier(rawClaimToken, "claimToken");
    const now = safeInteger(rawNow, "now");
    const leaseMs = safeInteger(rawLeaseMs, "leaseMs", { positive: true });
    const receipt = receipts.get(key);
    if (!receipt) throw new Error("coordination consumer receipt was not found");
    assertOwned(receipt, ownerId, claimToken);
    receipt.attempts += 1;
    receipt.lease.expiresAt = safeExpiry(now, leaseMs);
    receipt.updatedAt = now;
    return publicReceipt(receipt);
  }

  async function commitEffect({
    consumeKey: rawConsumeKey,
    ownerId: rawOwnerId,
    claimToken: rawClaimToken,
    commitId: rawCommitId,
    now: rawNow,
  }) {
    const key = consumeKey(rawConsumeKey);
    const ownerId = safeIdentifier(rawOwnerId, "ownerId");
    const claimToken = safeIdentifier(rawClaimToken, "claimToken");
    const commitId = safeIdentifier(rawCommitId, "commitId");
    const now = safeInteger(rawNow, "now");
    const receipt = receipts.get(key);
    if (!receipt) throw new Error("coordination consumer receipt was not found");
    assertOwned(receipt, ownerId, claimToken);
    receipt.effect = { commitId, committedAt: now };
    receipt.state = "effect_committed";
    receipt.lease = null;
    receipt.updatedAt = now;
    return publicReceipt(receipt);
  }

  async function commitQuarantine({
    consumeKey: rawConsumeKey,
    ownerId: rawOwnerId,
    claimToken: rawClaimToken,
    quarantineId: rawQuarantineId,
    locator: rawLocator,
    reasonCode: rawReasonCode,
    now: rawNow,
  }) {
    const key = consumeKey(rawConsumeKey);
    const ownerId = safeIdentifier(rawOwnerId, "ownerId");
    const claimToken = safeIdentifier(rawClaimToken, "claimToken");
    const quarantineId = safeIdentifier(rawQuarantineId, "quarantineId");
    const locator = safeIdentifier(rawLocator, "locator");
    const reasonCode = safeCode(rawReasonCode, "reasonCode");
    const now = safeInteger(rawNow, "now");
    const receipt = receipts.get(key);
    if (!receipt) throw new Error("coordination consumer receipt was not found");
    assertOwned(
      receipt,
      ownerId,
      claimToken,
      ["processing", "quarantine_blocked"],
    );
    receipt.quarantine = {
      quarantineId,
      locator,
      reasonCode,
      committedAt: now,
    };
    receipt.state = "quarantined";
    receipt.lease = null;
    receipt.updatedAt = now;
    quarantineIndex.set(quarantineId, key);
    return publicReceipt(receipt);
  }

  async function blockQuarantine({
    consumeKey: rawConsumeKey,
    ownerId: rawOwnerId,
    claimToken: rawClaimToken,
    reasonCode: rawReasonCode,
    now: rawNow,
  }) {
    const key = consumeKey(rawConsumeKey);
    const ownerId = safeIdentifier(rawOwnerId, "ownerId");
    const claimToken = safeIdentifier(rawClaimToken, "claimToken");
    const reasonCode = safeCode(rawReasonCode, "reasonCode");
    const now = safeInteger(rawNow, "now");
    const receipt = receipts.get(key);
    if (!receipt) throw new Error("coordination consumer receipt was not found");
    assertOwned(
      receipt,
      ownerId,
      claimToken,
      ["processing", "quarantine_blocked"],
    );
    receipt.state = "quarantine_blocked";
    receipt.lease = null;
    receipt.quarantine = {
      quarantineId: null,
      locator: null,
      reasonCode,
      committedAt: null,
    };
    receipt.updatedAt = now;
    return publicReceipt(receipt);
  }

  async function releaseClaim({
    consumeKey: rawConsumeKey,
    ownerId: rawOwnerId,
    claimToken: rawClaimToken,
    now: rawNow,
  }) {
    const key = consumeKey(rawConsumeKey);
    const ownerId = safeIdentifier(rawOwnerId, "ownerId");
    const claimToken = safeIdentifier(rawClaimToken, "claimToken");
    const now = safeInteger(rawNow, "now");
    const receipt = receipts.get(key);
    if (
      !receipt
      || !["processing", "quarantine_blocked"].includes(receipt.state)
    ) {
      return null;
    }
    if (
      receipt.lease?.ownerId !== ownerId
      || receipt.lease?.claimToken !== claimToken
    ) {
      return publicReceipt(receipt);
    }
    receipt.lease.expiresAt = now;
    receipt.updatedAt = now;
    return publicReceipt(receipt);
  }

  async function prepareAck({
    consumeKey: rawConsumeKey,
    deliveryId: rawDeliveryId,
    now: rawNow,
  }) {
    const key = consumeKey(rawConsumeKey);
    const observedDeliveryId = deliveryId(rawDeliveryId);
    const now = safeInteger(rawNow, "now");
    const receipt = receipts.get(key);
    if (!receipt) throw new Error("coordination consumer receipt was not found");
    completedOutcome(receipt);
    const observed = receipt.deliveries.get(observedDeliveryId);
    if (!observed) throw new Error("coordination consumer delivery was not observed");
    if (observed.ackState === "acked") {
      return { status: "acked", receipt: publicReceipt(receipt) };
    }
    const intentKey = ackIntentKey(key, observedDeliveryId);
    const existing = ackIntents.get(intentKey);
    if (existing?.state === "recovery_required") {
      return {
        status: "recovery_required",
        receipt: publicReceipt(receipt),
      };
    }
    if (!existing) {
      ackIntents.set(intentKey, {
        intentKey,
        consumeKey: key,
        deliveryId: observedDeliveryId,
        state: "pending",
        dueAt: now,
        claimEpoch: 0,
        claim: null,
        proof: null,
        reasonCode: null,
        committedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    } else if (existing.state === "deferred") {
      existing.state = "pending";
      existing.dueAt = now;
      existing.reasonCode = null;
      existing.updatedAt = now;
    }
    observed.ackState = "acknowledging";
    receipt.updatedAt = now;
    return { status: "pending", receipt: publicReceipt(receipt) };
  }

  function getAckIntent(rawConsumeKey, rawDeliveryId) {
    const key = consumeKey(rawConsumeKey);
    const observedDeliveryId = deliveryId(rawDeliveryId);
    const intent = ackIntents.get(
      ackIntentKey(key, observedDeliveryId),
    );
    const receipt = receipts.get(key);
    if (!intent || !receipt) {
      throw new Error("coordination ACK reconciliation intent was not found");
    }
    return { intent, receipt };
  }

  function assertAckOwned(intent, ownerId, claimToken, family) {
    if (
      intent.state !== "claimed"
      || intent.claim?.ownerId !== ownerId
      || intent.claim?.claimToken !== claimToken
      || intent.claim?.family !== family
    ) {
      throw new Error("coordination ACK reconciliation intent is not owned");
    }
  }

  async function listAckIntents(input) {
    const value = exactObject(input, "ACK intent list", ACK_LIST_FIELDS);
    const cursor = value.cursor;
    if (
      cursor !== null
      && (
        typeof cursor !== "string"
        || !ACK_INTENT_CURSOR.test(cursor)
      )
    ) {
      throw new TypeError("ACK intent cursor is invalid");
    }
    const limit = safeInteger(value.limit, "limit", { positive: true });
    if (limit > MAX_ACK_INTENT_PAGE_SIZE) {
      throw new TypeError("ACK intent list limit exceeds its bound");
    }
    const now = safeInteger(value.now, "now");
    const eligible = [...ackIntents.values()]
      .sort((left, right) => {
        if (left.intentKey < right.intentKey) return -1;
        if (left.intentKey > right.intentKey) return 1;
        return 0;
      })
      .filter((intent) => (
        (cursor === null || intent.intentKey > cursor)
        && intent.dueAt <= now
        && (
          intent.state === "pending"
          || intent.state === "deferred"
          || (
            intent.state === "claimed"
            && intent.claim.expiresAt <= now
          )
        )
      ));
    const selected = eligible.slice(0, limit);
    return {
      intents: selected.map((intent) => publicAckIntent(
        intent,
        receipts.get(intent.consumeKey),
      )),
      nextCursor: eligible.length > limit
        ? selected[selected.length - 1].intentKey
        : null,
    };
  }

  async function claimAckIntent(input, family) {
    const value = exactObject(input, "ACK intent claim", ACK_CLAIM_FIELDS);
    const ownerId = safeIdentifier(value.ownerId, "ownerId");
    const now = safeInteger(value.now, "now");
    const leaseMs = safeInteger(value.leaseMs, "leaseMs", { positive: true });
    const { intent, receipt } = getAckIntent(
      value.consumeKey,
      value.deliveryId,
    );
    if (intent.state === "committed") {
      return {
        status: "committed",
        intent: publicAckIntent(intent, receipt),
      };
    }
    if (intent.state === "recovery_required") {
      return {
        status: "recovery_required",
        intent: publicAckIntent(intent, receipt),
      };
    }
    if (
      !["pending", "claimed", "deferred"].includes(intent.state)
    ) {
      throw new Error("coordination ACK reconciliation intent is invalid");
    }
    if (intent.dueAt > now) {
      return {
        status: "not_due",
        intent: publicAckIntent(intent, receipt),
      };
    }
    if (
      intent.state === "claimed"
      && intent.claim.expiresAt > now
    ) {
      return {
        status: "busy",
        intent: publicAckIntent(intent, receipt),
      };
    }
    const expiresAt = safeExpiry(now, leaseMs);
    const claimEpoch = safeInteger(
      intent.claimEpoch + 1,
      "claimEpoch",
      { positive: true },
    );
    const claimToken = ackClaimToken(intent, ownerId, claimEpoch, family);
    intent.state = "claimed";
    intent.claimEpoch = claimEpoch;
    intent.claim = {
      family,
      ownerId,
      claimToken,
      expiresAt,
    };
    intent.reasonCode = null;
    intent.updatedAt = now;
    return {
      status: "claimed",
      claimToken,
      intent: publicAckIntent(intent, receipt),
    };
  }

  async function renewAckIntent(input) {
    const value = exactObject(input, "ACK intent renewal", ACK_RENEW_FIELDS);
    const ownerId = safeIdentifier(value.ownerId, "ownerId");
    const claimToken = safeIdentifier(value.claimToken, "claimToken");
    const now = safeInteger(value.now, "now");
    const leaseMs = safeInteger(value.leaseMs, "leaseMs", { positive: true });
    const expiresAt = safeExpiry(now, leaseMs);
    const { intent, receipt } = getAckIntent(
      value.consumeKey,
      value.deliveryId,
    );
    assertAckOwned(
      intent,
      ownerId,
      claimToken,
      ACK_CLAIM_FAMILY.RECONCILIATION,
    );
    intent.claim.expiresAt = expiresAt;
    intent.updatedAt = now;
    return {
      status: "renewed",
      claimToken,
      intent: publicAckIntent(intent, receipt),
    };
  }

  async function commitAckIntent(input, producer, family) {
    const value = exactObject(input, "ACK intent commit", ACK_COMMIT_FIELDS);
    const ownerId = safeIdentifier(value.ownerId, "ownerId");
    const claimToken = safeIdentifier(value.claimToken, "claimToken");
    const now = safeInteger(value.now, "now");
    const { intent, receipt } = getAckIntent(
      value.consumeKey,
      value.deliveryId,
    );
    completedOutcome(receipt);
    const observed = receipt.deliveries.get(intent.deliveryId);
    if (!observed) {
      throw new Error("coordination consumer delivery was not observed");
    }
    assertAckOwned(intent, ownerId, claimToken, family);
    const evidence = mintAckProofEvidence(producer, intent, family);

    observed.ackState = "acked";
    observed.ackedAt = now;
    receipt.state = "completed";
    receipt.updatedAt = now;
    intent.state = "committed";
    intent.dueAt = null;
    intent.claim = null;
    intent.proof = evidence;
    intent.reasonCode = null;
    intent.committedAt = now;
    intent.updatedAt = now;
    return { status: "committed" };
  }

  async function commitDirectAckIntent(input) {
    return commitAckIntent(
      input,
      ACK_PROOF_PRODUCERS.DIRECT_ACK,
      ACK_CLAIM_FAMILY.DIRECT,
    );
  }

  async function commitTombstoneAckIntent(input) {
    return commitAckIntent(
      input,
      ACK_PROOF_PRODUCERS.ACK_TOMBSTONE,
      ACK_CLAIM_FAMILY.RECONCILIATION,
    );
  }

  async function commitOrphanAckIntent(input) {
    return commitAckIntent(
      input,
      ACK_PROOF_PRODUCERS.ORPHAN_ACK,
      ACK_CLAIM_FAMILY.RECONCILIATION,
    );
  }

  async function deferAckIntent(input, family) {
    const value = exactObject(input, "ACK intent defer", ACK_DEFER_FIELDS);
    const ownerId = safeIdentifier(value.ownerId, "ownerId");
    const claimToken = safeIdentifier(value.claimToken, "claimToken");
    if (!ACK_DEFER_REASONS.has(value.reasonCode)) {
      throw new TypeError("ACK intent defer reason is invalid");
    }
    const retryAt = safeInteger(value.retryAt, "retryAt");
    const now = safeInteger(value.now, "now");
    if (retryAt <= now) {
      throw new TypeError("ACK intent retryAt must be in the future");
    }
    const { intent } = getAckIntent(
      value.consumeKey,
      value.deliveryId,
    );
    assertAckOwned(intent, ownerId, claimToken, family);
    intent.state = "deferred";
    intent.dueAt = retryAt;
    intent.claim = null;
    intent.reasonCode = value.reasonCode;
    intent.updatedAt = now;
    return { status: "deferred" };
  }

  async function markAckRecoveryRequired(input) {
    const value = exactObject(
      input,
      "ACK intent recovery",
      ACK_RECOVERY_FIELDS,
    );
    const ownerId = safeIdentifier(value.ownerId, "ownerId");
    const claimToken = safeIdentifier(value.claimToken, "claimToken");
    if (!ACK_RECOVERY_REASONS.has(value.reasonCode)) {
      throw new TypeError("ACK intent recovery reason is invalid");
    }
    const now = safeInteger(value.now, "now");
    const { intent, receipt } = getAckIntent(
      value.consumeKey,
      value.deliveryId,
    );
    assertAckOwned(
      intent,
      ownerId,
      claimToken,
      ACK_CLAIM_FAMILY.RECONCILIATION,
    );
    intent.state = "recovery_required";
    intent.dueAt = null;
    intent.claim = null;
    intent.reasonCode = value.reasonCode;
    intent.updatedAt = now;
    receipt.updatedAt = now;
    return { status: "recovery_required" };
  }

  async function getAckReconciliationSummary() {
    const summary = {
      total: ackIntents.size,
      pending: 0,
      claimed: 0,
      deferred: 0,
      committed: 0,
      recoveryRequired: 0,
      proofs: {
        DIRECT_ACK: 0,
        ACK_TOMBSTONE: 0,
        ORPHAN_ACK: 0,
      },
    };
    for (const intent of ackIntents.values()) {
      if (intent.state === "recovery_required") {
        summary.recoveryRequired += 1;
      } else {
        summary[intent.state] += 1;
      }
      if (intent.proof !== null) {
        summary.proofs[coordinationAckProofCode(intent.proof)] += 1;
      }
    }
    return structuredClone(summary);
  }

  async function getReceipt(rawConsumeKey) {
    const receipt = receipts.get(consumeKey(rawConsumeKey));
    return receipt ? publicReceipt(receipt) : null;
  }

  async function getQuarantine(rawQuarantineId) {
    const quarantineId = safeIdentifier(rawQuarantineId, "quarantineId");
    const key = quarantineIndex.get(quarantineId);
    if (!key) return null;
    const receipt = receipts.get(key);
    if (!receipt?.quarantine || receipt.quarantine.quarantineId !== quarantineId) {
      return null;
    }
    return structuredClone({
      quarantineId,
      consumeKey: receipt.consumeKey,
      metadata: receipt.metadata,
      locator: receipt.quarantine.locator,
      reasonCode: receipt.quarantine.reasonCode,
      committedAt: receipt.quarantine.committedAt,
    });
  }

  async function beginReplay({
    quarantineId: rawQuarantineId,
    commandId: rawCommandId,
    decisionId: rawDecisionId,
    principalId: rawPrincipalId,
    ownerId: rawOwnerId,
    now: rawNow,
    leaseMs: rawLeaseMs,
  }) {
    const quarantineId = safeIdentifier(rawQuarantineId, "quarantineId");
    const commandId = safeIdentifier(rawCommandId, "commandId");
    const decisionId = safeIdentifier(rawDecisionId, "decisionId");
    const principalId = safeIdentifier(rawPrincipalId, "principalId");
    const ownerId = safeIdentifier(rawOwnerId, "ownerId");
    const now = safeInteger(rawNow, "now");
    const leaseMs = safeInteger(rawLeaseMs, "leaseMs", { positive: true });
    const key = quarantineIndex.get(quarantineId);
    const receipt = key ? receipts.get(key) : null;
    if (!receipt?.quarantine) return { status: "not_found" };

    if (receipt.replay) {
      if (receipt.replay.state === "committed") {
        return { status: "duplicate", receipt: publicReceipt(receipt) };
      }
      const exact = (
        receipt.replay.commandId === commandId
        && receipt.replay.decisionId === decisionId
        && receipt.replay.principalId === principalId
      );
      if (!exact) return { status: "conflict", receipt: publicReceipt(receipt) };
      if (
        receipt.replay.state === "processing"
        && receipt.replay.lease.expiresAt > now
      ) {
        return { status: "busy", receipt: publicReceipt(receipt) };
      }
    }
    receipt.replayEpoch += 1;
    const replayClaimToken = `replay-claim-${receipt.replayEpoch}`;
    receipt.replay = {
      commandId,
      decisionId,
      principalId,
      state: "processing",
      lease: {
        ownerId,
        replayClaimToken,
        expiresAt: safeExpiry(now, leaseMs),
      },
      commitId: null,
      committedAt: null,
      failureCode: null,
    };
    receipt.updatedAt = now;
    return {
      status: "claimed",
      replayClaimToken,
      receipt: publicReceipt(receipt),
    };
  }

  async function commitReplay({
    quarantineId: rawQuarantineId,
    commandId: rawCommandId,
    ownerId: rawOwnerId,
    replayClaimToken: rawReplayClaimToken,
    commitId: rawCommitId,
    now: rawNow,
  }) {
    const quarantineId = safeIdentifier(rawQuarantineId, "quarantineId");
    const commandId = safeIdentifier(rawCommandId, "commandId");
    const ownerId = safeIdentifier(rawOwnerId, "ownerId");
    const replayClaimToken = safeIdentifier(
      rawReplayClaimToken,
      "replayClaimToken",
    );
    const commitId = safeIdentifier(rawCommitId, "commitId");
    const now = safeInteger(rawNow, "now");
    const key = quarantineIndex.get(quarantineId);
    const receipt = key ? receipts.get(key) : null;
    if (
      !receipt?.replay
      || receipt.replay.commandId !== commandId
      || receipt.replay.state !== "processing"
      || receipt.replay.lease.ownerId !== ownerId
      || receipt.replay.lease.replayClaimToken !== replayClaimToken
    ) {
      throw new Error("coordination consumer replay is not owned");
    }
    receipt.replay = {
      ...receipt.replay,
      state: "committed",
      lease: null,
      commitId,
      committedAt: now,
      failureCode: null,
    };
    receipt.state = "replay_committed";
    receipt.updatedAt = now;
    return publicReceipt(receipt);
  }

  async function failReplay({
    quarantineId: rawQuarantineId,
    commandId: rawCommandId,
    ownerId: rawOwnerId,
    replayClaimToken: rawReplayClaimToken,
    failureCode: rawFailureCode,
    now: rawNow,
  }) {
    const quarantineId = safeIdentifier(rawQuarantineId, "quarantineId");
    const commandId = safeIdentifier(rawCommandId, "commandId");
    const ownerId = safeIdentifier(rawOwnerId, "ownerId");
    const replayClaimToken = safeIdentifier(
      rawReplayClaimToken,
      "replayClaimToken",
    );
    const failureCode = safeCode(rawFailureCode, "failureCode");
    const now = safeInteger(rawNow, "now");
    const key = quarantineIndex.get(quarantineId);
    const receipt = key ? receipts.get(key) : null;
    if (
      !receipt?.replay
      || receipt.replay.commandId !== commandId
      || receipt.replay.state !== "processing"
      || receipt.replay.lease.ownerId !== ownerId
      || receipt.replay.lease.replayClaimToken !== replayClaimToken
    ) {
      throw new Error("coordination consumer replay is not owned");
    }
    receipt.replay = {
      ...receipt.replay,
      state: "failed",
      lease: null,
      failureCode,
    };
    receipt.state = "completed";
    receipt.updatedAt = now;
    return publicReceipt(receipt);
  }

  return Object.freeze({
    claim,
    claimBlockedQuarantine,
    recordAttempt,
    commitEffect,
    commitQuarantine,
    blockQuarantine,
    releaseClaim,
    prepareAck,
    directAck: Object.freeze({
      claim: (input) => claimAckIntent(
        input,
        ACK_CLAIM_FAMILY.DIRECT,
      ),
      commit: commitDirectAckIntent,
      defer: (input) => deferAckIntent(
        input,
        ACK_CLAIM_FAMILY.DIRECT,
      ),
    }),
    ackReconciliation: Object.freeze({
      list: listAckIntents,
      claim: (input) => claimAckIntent(
        input,
        ACK_CLAIM_FAMILY.RECONCILIATION,
      ),
      renew: renewAckIntent,
      commitTombstone: commitTombstoneAckIntent,
      commitOrphan: commitOrphanAckIntent,
      defer: (input) => deferAckIntent(
        input,
        ACK_CLAIM_FAMILY.RECONCILIATION,
      ),
      markAckRecoveryRequired,
      getAckReconciliationSummary,
    }),
    getReceipt,
    getQuarantine,
    beginReplay,
    commitReplay,
    failReplay,
  });
}
