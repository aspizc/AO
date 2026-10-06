import crypto from "node:crypto";

import {
  bindSqliteCoordinationRepositoryToMain,
} from "../sqlite_coordination_repository_binding.js";

const CONSUME_KEY = /^coord-consume-v1-[a-f0-9]{64}$/;
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const SAFE_CODE = /^[A-Z][A-Z0-9_]{1,127}$/;
const DELIVERY_ID = /^(?:0|[1-9][0-9]*)-(?:0|[1-9][0-9]*)$/;
const RECEIPT_STATES = new Set([
  "processing",
  "effect_committed",
  "quarantine_blocked",
  "quarantined",
  "completed",
  "replay_committed",
]);
const REPLAY_STATES = new Set(["processing", "committed", "failed"]);
const ACK_STATES = new Set(["pending", "acknowledging", "acked"]);
const ACK_INTENT_STATES = new Set([
  "pending",
  "claimed",
  "deferred",
  "committed",
  "recovery_required",
]);
const ACK_PROOFS = new Set([
  "DIRECT_ACK",
  "ACK_TOMBSTONE",
  "ORPHAN_ACK",
]);
const ACK_DEFER_REASONS = new Set([
  "ACK_CONTRACT_INVALID",
  "ACK_TRANSPORT_FAILED",
  "OLD_PARTICIPANT_PRESENT",
  "TRANSPORT_UNAVAILABLE",
]);
const ACK_RECOVERY_REASONS = new Set(["TRANSPORT_STATE_UNKNOWN"]);
const ACK_CLAIM_FAMILY = Object.freeze({
  DIRECT: "direct",
  RECONCILIATION: "reconciliation",
});

function ackProofMatchesClaimFamily(family, proof) {
  return (
    (family === ACK_CLAIM_FAMILY.DIRECT && proof === "DIRECT_ACK")
    || (
      family === ACK_CLAIM_FAMILY.RECONCILIATION
      && (proof === "ACK_TOMBSTONE" || proof === "ORPHAN_ACK")
    )
  );
}

const ACK_INTENT_CURSOR =
  /^ack-v1:(0|[1-9][0-9]{0,15}):(coord-consume-v1-[a-f0-9]{64}):((?:0|[1-9][0-9]*)-(?:0|[1-9][0-9]*))$/;
const MAX_ACK_INTENT_PAGE_SIZE = 100;
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
const ACK_RENEW_FIELDS = new Set([...ACK_OWNED_FIELDS, "leaseMs"]);
const ACK_COMMIT_FIELDS = new Set(ACK_OWNED_FIELDS);
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
const MAX_RECOVERY_IDS = 8;

export const SQLITE_COORDINATION_CONSUMER_REPOSITORY_CONTRACT = Object.freeze({
  durable: true,
  atomicWithBusinessEffect: false,
  bodyStorage: false,
  backend: "sqlite",
  purpose: "durable-coordination-consumer-baseline",
  maxConsumedRecoveryIdsPerReceipt: MAX_RECOVERY_IDS,
});

export class SqliteCoordinationConsumerStoreError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SqliteCoordinationConsumerStoreError";
    this.code = code;
  }
}

function storeError(scope, code, message) {
  return scope.control(
    new SqliteCoordinationConsumerStoreError(code, message),
  );
}

function corruptStore(scope) {
  return storeError(
    scope,
    "COORDINATION_CONSUMER_STORE_CORRUPT",
    "coordination consumer store state is invalid",
  );
}

function failedStore() {
  return new SqliteCoordinationConsumerStoreError(
    "COORDINATION_CONSUMER_STORE_FAILED",
    "coordination consumer store operation failed safely",
  );
}

function notOwned(scope, kind = "receipt") {
  return storeError(
    scope,
    kind === "replay"
      ? "COORDINATION_CONSUMER_REPLAY_NOT_OWNED"
      : "COORDINATION_CONSUMER_RECEIPT_NOT_OWNED",
    kind === "replay"
      ? "coordination consumer replay is not owned"
      : "coordination consumer receipt is not owned",
  );
}

function ackNotOwned(scope) {
  return storeError(
    scope,
    "COORDINATION_CONSUMER_ACK_INTENT_NOT_OWNED",
    "coordination ACK reconciliation intent is not owned",
  );
}

function notFound(scope) {
  return storeError(
    scope,
    "COORDINATION_CONSUMER_RECEIPT_NOT_FOUND",
    "coordination consumer receipt was not found",
  );
}

function validationError(scope, message) {
  return scope.validation(
    new TypeError(message),
  );
}

function plainObject(scope, value, label) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw validationError(scope, `${label} must be a plain object`);
  }
  return value;
}

function exactObject(scope, value, label, fields) {
  const source = plainObject(scope, value, label);
  const snapshot = {};
  for (const field of Reflect.ownKeys(source)) {
    if (typeof field !== "string" || !fields.has(field)) {
      throw validationError(scope, `${label} contains an unsupported field`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(source, field);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) {
      throw validationError(scope, `${label} must contain own data fields`);
    }
    snapshot[field] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function safeIdentifier(scope, value, label) {
  if (typeof value !== "string" || !SAFE_IDENTIFIER.test(value)) {
    throw validationError(scope, `${label} must be a safe identifier`);
  }
  return value;
}

function safeCode(scope, value, label) {
  if (typeof value !== "string" || !SAFE_CODE.test(value)) {
    throw validationError(scope, `${label} must be a safe code`);
  }
  return value;
}

function safeInteger(scope, value, label, { positive = false } = {}) {
  if (
    !Number.isSafeInteger(value)
    || value < 0
    || (positive && value === 0)
  ) {
    throw validationError(
      scope,
      `${label} must be a ${positive ? "positive " : ""}safe integer`,
    );
  }
  return value;
}

function safeExpiry(scope, now, leaseMs) {
  const expiresAt = now + leaseMs;
  if (!Number.isSafeInteger(expiresAt)) {
    throw scope.operation(
      new TypeError("claim expiry exceeds the safe integer range"),
    );
  }
  return expiresAt;
}

function consumeKey(scope, value) {
  if (typeof value !== "string" || !CONSUME_KEY.test(value)) {
    throw validationError(scope, "consumeKey must be canonical");
  }
  return value;
}

function deliveryId(scope, value) {
  if (
    typeof value !== "string"
    || value.length > 128
    || !DELIVERY_ID.test(value)
  ) {
    throw validationError(scope, "deliveryId must be canonical");
  }
  return value;
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

function metadata(scope, value) {
  const source = plainObject(scope, value, "metadata");
  if (Object.hasOwn(source, "body")) {
    throw validationError(scope, "metadata must not contain a message body");
  }
  if (Object.keys(source).some((key) => !METADATA_FIELDS.has(key))) {
    throw validationError(scope, "metadata contains an unsupported field");
  }
  const malformed = source.malformed === true;
  if (
    !Number.isSafeInteger(source.protocolVersion)
    || source.protocolVersion < 0
    || source.protocolVersion > 255
    || (!malformed && source.protocolVersion !== 1)
  ) {
    throw validationError(scope, "metadata.protocolVersion is invalid");
  }
  for (const field of [
    "scopeId",
    "messageId",
    "fromParticipantId",
    "toParticipantId",
    "messageType",
    "classification",
  ]) {
    safeIdentifier(scope, source[field], `metadata.${field}`);
    if (source[field].length > 128) {
      throw validationError(scope, `metadata.${field} exceeds its limit`);
    }
  }
  if (
    !malformed
    && !["unrestricted", "internal"].includes(source.classification)
  ) {
    throw validationError(scope, "metadata.classification is invalid");
  }
  if (
    typeof source.createdAt !== "string"
    || source.createdAt.length > 64
    || !Number.isFinite(Date.parse(source.createdAt))
  ) {
    throw validationError(scope, "metadata.createdAt is invalid");
  }
  for (const field of ["traceId", "correlationId", "replyToMessageId"]) {
    if (source[field] === undefined) continue;
    safeIdentifier(scope, source[field], `metadata.${field}`);
    if (source[field].length > 128) {
      throw validationError(scope, `metadata.${field} exceeds its limit`);
    }
  }
  if (
    source.malformed !== undefined
    && typeof source.malformed !== "boolean"
  ) {
    throw validationError(scope, "metadata.malformed must be a boolean");
  }
  const copy = structuredClone(source);
  if (JSON.stringify(copy).length > 4096) {
    throw validationError(scope, "metadata exceeds its bounded representation");
  }
  return Object.freeze(copy);
}

function assertSqlite(database) {
  if (
    database?.backend === "postgres"
    || (
      database?.backend !== undefined
      && database.backend !== "sqlite"
    )
    || typeof database?.prepare !== "function"
    || typeof database?.transaction !== "function"
    || typeof database?.pragma !== "function"
  ) {
    throw new TypeError(
      "SQLite backend is required; PostgreSQL is deferred to Project V5 I/0/05",
    );
  }
}

function clonePublic(value) {
  return structuredClone(value);
}

function metadataParameters(value) {
  return {
    metadataProtocolVersion: value.protocolVersion,
    metadataScopeId: value.scopeId,
    metadataMessageId: value.messageId,
    metadataFromParticipantId: value.fromParticipantId,
    metadataToParticipantId: value.toParticipantId,
    metadataMessageType: value.messageType,
    metadataClassification: value.classification,
    metadataCreatedAt: value.createdAt,
    metadataTraceId: value.traceId ?? null,
    metadataCorrelationId: value.correlationId ?? null,
    metadataReplyToMessageId: value.replyToMessageId ?? null,
    metadataMalformed: value.malformed === undefined
      ? null
      : Number(value.malformed),
  };
}

function storedMetadata(scope, row) {
  if (![null, 0, 1].includes(row.metadata_malformed)) {
    throw corruptStore(scope);
  }
  const source = {
    protocolVersion: row.metadata_protocol_version,
    scopeId: row.metadata_scope_id,
    messageId: row.metadata_message_id,
    fromParticipantId: row.metadata_from_participant_id,
    toParticipantId: row.metadata_to_participant_id,
    messageType: row.metadata_message_type,
    classification: row.metadata_classification,
    createdAt: row.metadata_created_at,
    ...(row.metadata_trace_id === null
      ? {}
      : { traceId: row.metadata_trace_id }),
    ...(row.metadata_correlation_id === null
      ? {}
      : { correlationId: row.metadata_correlation_id }),
    ...(row.metadata_reply_to_message_id === null
      ? {}
      : { replyToMessageId: row.metadata_reply_to_message_id }),
    ...(row.metadata_malformed === null
      ? {}
      : { malformed: row.metadata_malformed === 1 }),
  };
  return metadata(scope, source);
}

function allNull(values) {
  return values.every((value) => value === null);
}

function allPresent(values) {
  return values.every((value) => value !== null);
}

function validateLease(scope, row, claimEpoch) {
  const fields = [
    row.lease_owner_id,
    row.lease_claim_token,
    row.lease_expires_at,
  ];
  if (allNull(fields)) return null;
  if (!allPresent(fields)) throw corruptStore(scope);
  const ownerId = safeIdentifier(
    scope,
    row.lease_owner_id,
    "stored lease owner",
  );
  const claimToken = safeIdentifier(
    scope,
    row.lease_claim_token,
    "stored claim token",
  );
  const expiresAt = safeInteger(
    scope,
    row.lease_expires_at,
    "stored lease expiry",
  );
  if (claimToken !== `claim-${claimEpoch}`) throw corruptStore(scope);
  return { ownerId, claimToken, expiresAt };
}

function validateEffect(scope, row) {
  const fields = [row.effect_commit_id, row.effect_committed_at];
  if (allNull(fields)) return null;
  if (!allPresent(fields)) throw corruptStore(scope);
  return {
    commitId: safeIdentifier(
      scope,
      row.effect_commit_id,
      "stored effect commit",
    ),
    committedAt: safeInteger(
      scope,
      row.effect_committed_at,
      "stored effect commit time",
    ),
  };
}

function validateQuarantine(scope, row, privateRow) {
  const fields = [
    row.quarantine_id,
    row.quarantine_reason_code,
    row.quarantine_committed_at,
  ];
  if (allNull(fields)) {
    if (privateRow !== undefined) throw corruptStore(scope);
    return { quarantine: null, locator: null };
  }
  const reasonCode = safeCode(
    scope,
    row.quarantine_reason_code,
    "stored quarantine reason",
  );
  if (row.quarantine_id === null && row.quarantine_committed_at === null) {
    if (privateRow !== undefined) throw corruptStore(scope);
    return {
      quarantine: {
        quarantineId: null,
        reasonCode,
        committedAt: null,
      },
      locator: null,
    };
  }
  if (!allPresent(fields) || privateRow === undefined) {
    throw corruptStore(scope);
  }
  const quarantineId = safeIdentifier(
    scope,
    row.quarantine_id,
    "stored quarantine identifier",
  );
  if (
    privateRow.consume_key !== row.consume_key
    || privateRow.quarantine_id !== quarantineId
  ) {
    throw corruptStore(scope);
  }
  return {
    quarantine: {
      quarantineId,
      reasonCode,
      committedAt: safeInteger(
        scope,
        row.quarantine_committed_at,
        "stored quarantine commit time",
      ),
    },
    locator: safeIdentifier(
      scope,
      privateRow.locator,
      "stored quarantine locator",
    ),
  };
}

function validateDeliveries(scope, rows, key) {
  return rows.map((row, index) => {
    if (
      row.consume_key !== key
      || row.observed_order !== index + 1
      || ![0, 1].includes(row.recovered)
      || !ACK_STATES.has(row.ack_state)
    ) {
      throw corruptStore(scope);
    }
    const ackedAt = row.acked_at === null
      ? null
      : safeInteger(scope, row.acked_at, "stored ACK time");
    if (
      (row.ack_state === "acked" && ackedAt === null)
      || (row.ack_state !== "acked" && ackedAt !== null)
    ) {
      throw corruptStore(scope);
    }
    return {
      deliveryId: deliveryId(scope, row.delivery_id),
      recovered: row.recovered === 1,
      observedAt: safeInteger(
        scope,
        row.observed_at,
        "stored observation time",
      ),
      ackState: row.ack_state,
      ...(ackedAt === null ? {} : { ackedAt }),
    };
  });
}

function validateRecoveryHistory(scope, rows, key, maximum) {
  if (rows.length > maximum) throw corruptStore(scope);
  return rows.map((row, index) => {
    if (
      row.consume_key !== key
      || row.recovery_order !== index + 1
    ) {
      throw corruptStore(scope);
    }
    return safeIdentifier(
      scope,
      row.recovery_id,
      "stored recovery identifier",
    );
  });
}

function validateReplay(scope, replayRow, {
  key,
  quarantineId,
  replayEpoch,
}) {
  if (replayRow === undefined) {
    if (replayEpoch !== 0) throw corruptStore(scope);
    return null;
  }
  if (
    replayRow.consume_key !== key
    || replayRow.quarantine_id !== quarantineId
    || !REPLAY_STATES.has(replayRow.state)
    || replayEpoch < 1
  ) {
    throw corruptStore(scope);
  }
  const commandId = safeIdentifier(
    scope,
    replayRow.command_id,
    "stored replay command",
  );
  const decisionId = safeIdentifier(
    scope,
    replayRow.decision_id,
    "stored replay decision",
  );
  const principalId = safeIdentifier(
    scope,
    replayRow.principal_id,
    "stored replay principal",
  );
  const leaseFields = [
    replayRow.lease_owner_id,
    replayRow.lease_replay_claim_token,
    replayRow.lease_expires_at,
  ];
  let lease = null;
  if (!allNull(leaseFields)) {
    if (!allPresent(leaseFields)) throw corruptStore(scope);
    const replayClaimToken = safeIdentifier(
      scope,
      replayRow.lease_replay_claim_token,
      "stored replay claim token",
    );
    if (replayClaimToken !== `replay-claim-${replayEpoch}`) {
      throw corruptStore(scope);
    }
    lease = {
      ownerId: safeIdentifier(
        scope,
        replayRow.lease_owner_id,
        "stored replay owner",
      ),
      replayClaimToken,
      expiresAt: safeInteger(
        scope,
        replayRow.lease_expires_at,
        "stored replay expiry",
      ),
    };
  }
  const commitFields = [replayRow.commit_id, replayRow.committed_at];
  let commitId = null;
  let committedAt = null;
  if (!allNull(commitFields)) {
    if (!allPresent(commitFields)) throw corruptStore(scope);
    commitId = safeIdentifier(
      scope,
      replayRow.commit_id,
      "stored replay commit",
    );
    committedAt = safeInteger(
      scope,
      replayRow.committed_at,
      "stored replay commit time",
    );
  }
  const failureCode = replayRow.failure_code === null
    ? null
    : safeCode(scope, replayRow.failure_code, "stored replay failure");
  if (
    (replayRow.state === "processing"
      && (lease === null || commitId !== null || failureCode !== null))
    || (replayRow.state === "committed"
      && (lease !== null || commitId === null || failureCode !== null))
    || (replayRow.state === "failed"
      && (lease !== null || commitId !== null || failureCode === null))
  ) {
    throw corruptStore(scope);
  }
  return {
    commandId,
    decisionId,
    principalId,
    state: replayRow.state,
    lease,
    commitId,
    committedAt,
    failureCode,
  };
}

function validateBundle(scope, bundle) {
  const row = bundle.row;
  let key;
  let safeStoredMetadata;
  let state;
  let attempts;
  let claimEpoch;
  let replayEpoch;
  let maximum;
  let createdAt;
  let updatedAt;
  try {
    key = consumeKey(scope, row.consume_key);
    safeStoredMetadata = storedMetadata(scope, row);
    state = row.state;
    if (!RECEIPT_STATES.has(state)) throw corruptStore(scope);
    attempts = safeInteger(scope, row.attempts, "stored attempt count");
    claimEpoch = safeInteger(
      scope,
      row.claim_epoch,
      "stored claim epoch",
      { positive: true },
    );
    replayEpoch = safeInteger(
      scope,
      row.replay_epoch,
      "stored replay epoch",
    );
    maximum = safeInteger(
      scope,
      row.max_consumed_recovery_ids,
      "stored recovery history capacity",
      { positive: true },
    );
    if (maximum > MAX_RECOVERY_IDS) throw corruptStore(scope);
    createdAt = safeInteger(scope, row.created_at, "stored creation time");
    updatedAt = safeInteger(scope, row.updated_at, "stored update time");
  } catch (error) {
    if (scope.isControl(error)) throw error;
    if (!scope.isValidation(error)) throw error;
    throw corruptStore(scope);
  }

  let lease;
  let effect;
  let quarantineResult;
  let deliveries;
  let recoveryIds;
  let replay;
  try {
    lease = validateLease(scope, row, claimEpoch);
    effect = validateEffect(scope, row);
    quarantineResult = validateQuarantine(scope, row, bundle.privateRow);
    deliveries = validateDeliveries(scope, bundle.deliveryRows, key);
    recoveryIds = validateRecoveryHistory(
      scope,
      bundle.recoveryRows,
      key,
      maximum,
    );
    replay = validateReplay(scope, bundle.replayRow, {
      key,
      quarantineId: quarantineResult.quarantine?.quarantineId ?? null,
      replayEpoch,
    });
  } catch (error) {
    if (scope.isControl(error)) throw error;
    if (!scope.isValidation(error)) throw error;
    throw corruptStore(scope);
  }

  const quarantine = quarantineResult.quarantine;
  const committedQuarantine = (
    quarantine?.quarantineId !== null
    && quarantine?.committedAt !== null
    && quarantineResult.locator !== null
  );
  const blockedQuarantine = (
    quarantine !== null
    && quarantine.quarantineId === null
    && quarantine.committedAt === null
  );
  const allPending = deliveries.every(
    (delivery) => delivery.ackState === "pending",
  );
  const hasAcked = deliveries.some(
    (delivery) => delivery.ackState === "acked",
  );
  if (
    deliveries.length === 0
    || (effect !== null && quarantine !== null)
    || (replay !== null && !committedQuarantine)
  ) {
    throw corruptStore(scope);
  }
  if (state === "processing") {
    if (
      lease === null
      || effect !== null
      || quarantine !== null
      || replay !== null
      || recoveryIds.length !== 0
      || !allPending
    ) {
      throw corruptStore(scope);
    }
  } else if (state === "effect_committed") {
    if (
      lease !== null
      || effect === null
      || quarantine !== null
      || replay !== null
      || recoveryIds.length !== 0
      || hasAcked
    ) {
      throw corruptStore(scope);
    }
  } else if (state === "quarantine_blocked") {
    if (
      effect !== null
      || !blockedQuarantine
      || replay !== null
      || !allPending
      || (lease !== null && recoveryIds.length === 0)
    ) {
      throw corruptStore(scope);
    }
  } else if (state === "quarantined") {
    if (
      lease !== null
      || effect !== null
      || !committedQuarantine
      || (replay !== null && replay.state !== "processing")
      || hasAcked
    ) {
      throw corruptStore(scope);
    }
  } else if (state === "completed") {
    if (lease !== null) throw corruptStore(scope);
    if (effect !== null) {
      if (
        quarantine !== null
        || replay !== null
        || recoveryIds.length !== 0
        || !hasAcked
      ) {
        throw corruptStore(scope);
      }
    } else if (
      !committedQuarantine
      || (replay?.state !== "failed" && !hasAcked)
    ) {
      throw corruptStore(scope);
    }
  } else if (
    state === "replay_committed"
    && (
      lease !== null
      || effect !== null
      || !committedQuarantine
      || replay?.state !== "committed"
    )
  ) {
    throw corruptStore(scope);
  }

  return {
    receipt: {
      consumeKey: key,
      metadata: safeStoredMetadata,
      state,
      attempts,
      lease: lease === null
        ? null
        : {
            ownerId: lease.ownerId,
            expiresAt: lease.expiresAt,
          },
      deliveries,
      effect,
      quarantine,
      replay: replay === null
        ? null
        : {
            commandId: replay.commandId,
            decisionId: replay.decisionId,
            principalId: replay.principalId,
            state: replay.state,
            lease: replay.lease === null
              ? null
              : {
                  ownerId: replay.lease.ownerId,
                  expiresAt: replay.lease.expiresAt,
                },
            commitId: replay.commitId,
            committedAt: replay.committedAt,
            failureCode: replay.failureCode,
          },
      createdAt,
      updatedAt,
    },
    claimToken: lease?.claimToken ?? null,
    replayClaimToken: replay?.lease?.replayClaimToken ?? null,
    privateLocator: quarantineResult.locator,
    recoveryIds,
    claimEpoch,
    replayEpoch,
    maximum,
    rawReplay: replay,
  };
}

function validateAckIntent(scope, row) {
  const key = consumeKey(scope, row.consume_key);
  const observedDeliveryId = deliveryId(scope, row.delivery_id);
  const state = row.state;
  if (!ACK_INTENT_STATES.has(state)) {
    throw validationError(scope, "stored ACK intent state is invalid");
  }
  const dueAt = row.due_at === null
    ? null
    : safeInteger(scope, row.due_at, "stored ACK intent due time");
  const claimEpoch = safeInteger(
    scope,
    row.claim_epoch,
    "stored ACK intent claim epoch",
  );
  const family = row.claim_family;
  if (family !== null && !Object.values(ACK_CLAIM_FAMILY).includes(family)) {
    throw validationError(scope, "stored ACK intent claim family is invalid");
  }
  const ownerId = row.claim_owner_id === null
    ? null
    : safeIdentifier(
        scope,
        row.claim_owner_id,
        "stored ACK intent claim owner",
      );
  const claimToken = row.claim_token === null
    ? null
    : safeIdentifier(
        scope,
        row.claim_token,
        "stored ACK intent claim token",
      );
  const expiresAt = row.claim_expires_at === null
    ? null
    : safeInteger(
        scope,
        row.claim_expires_at,
        "stored ACK intent claim expiry",
      );
  const proof = row.proof;
  if (proof !== null && !ACK_PROOFS.has(proof)) {
    throw validationError(scope, "stored ACK intent proof is invalid");
  }
  const reasonCode = row.reason_code === null
    ? null
    : safeCode(
        scope,
        row.reason_code,
        "stored ACK intent reason",
      );
  const committedAt = row.committed_at === null
    ? null
    : safeInteger(
        scope,
        row.committed_at,
        "stored ACK intent commit time",
      );
  const createdAt = safeInteger(
    scope,
    row.created_at,
    "stored ACK intent creation time",
  );
  const updatedAt = safeInteger(
    scope,
    row.updated_at,
    "stored ACK intent update time",
  );
  const claimFields = [family, ownerId, claimToken];
  const noClaim = allNull(claimFields) && expiresAt === null;
  const activeClaim = allPresent(claimFields) && expiresAt !== null;
  const terminalClaim = allPresent(claimFields) && expiresAt === null;
  if (
    (activeClaim || terminalClaim)
    && (
      claimEpoch < 1
      || claimToken !== ackClaimToken(
        {
          consumeKey: key,
          deliveryId: observedDeliveryId,
        },
        ownerId,
        claimEpoch,
        family,
      )
    )
  ) {
    throw validationError(scope, "stored ACK intent claim is invalid");
  }
  if (
    (state === "pending"
      && (
        dueAt === null
        || !noClaim
        || proof !== null
        || reasonCode !== null
        || committedAt !== null
      ))
    || (state === "claimed"
      && (
        dueAt === null
        || !activeClaim
        || proof !== null
        || reasonCode !== null
        || committedAt !== null
      ))
    || (state === "deferred"
      && (
        dueAt === null
        || !noClaim
        || proof !== null
        || !ACK_DEFER_REASONS.has(reasonCode)
        || committedAt !== null
      ))
    || (state === "committed"
      && (
        dueAt !== null
        || !terminalClaim
        || !ackProofMatchesClaimFamily(family, proof)
        || reasonCode !== null
        || committedAt === null
      ))
    || (state === "recovery_required"
      && (
        dueAt !== null
        || (!noClaim && !terminalClaim)
        || proof !== null
        || !ACK_RECOVERY_REASONS.has(reasonCode)
        || committedAt !== null
      ))
  ) {
    throw validationError(scope, "stored ACK intent is invalid");
  }
  return {
    consumeKey: key,
    deliveryId: observedDeliveryId,
    state,
    dueAt,
    claimEpoch,
    family,
    ownerId,
    claimToken,
    expiresAt,
    proof,
    reasonCode,
    committedAt,
    createdAt,
    updatedAt,
  };
}

function publicAckIntent(intent, receipt) {
  return {
    consumeKey: intent.consumeKey,
    deliveryId: intent.deliveryId,
    scopeId: receipt.metadata.scopeId,
    fromParticipantId: receipt.metadata.fromParticipantId,
    oldParticipantId: receipt.metadata.toParticipantId,
    messageId: receipt.metadata.messageId,
    state: intent.state,
    dueAt: intent.dueAt,
    claimEpoch: intent.claimEpoch,
    // Persistent proof codes stay inside the validated store boundary. A
    // terminal claim is a closed no-op and does not project proof authority.
    proof: null,
    reasonCode: intent.reasonCode,
    createdAt: intent.createdAt,
    updatedAt: intent.updatedAt,
  };
}

function decodeAckCursor(scope, value) {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw validationError(scope, "ACK intent cursor is invalid");
  }
  const match = ACK_INTENT_CURSOR.exec(value);
  if (!match) {
    throw validationError(scope, "ACK intent cursor is invalid");
  }
  return {
    eligibleAt: safeInteger(
      scope,
      Number(match[1]),
      "ACK intent cursor eligibility",
    ),
    consumeKey: match[2],
    deliveryId: match[3],
  };
}

function encodeAckCursor(scope, row) {
  const eligibleAt = safeInteger(
    scope,
    row.eligible_at,
    "stored ACK intent eligibility",
  );
  const key = consumeKey(scope, row.consume_key);
  const observedDeliveryId = deliveryId(scope, row.delivery_id);
  return `ack-v1:${eligibleAt}:${key}:${observedDeliveryId}`;
}

function completedOutcome(scope, decoded) {
  if (
    decoded.receipt.effect !== null
    || decoded.receipt.replay?.state === "committed"
  ) {
    return "committed";
  }
  if (
    decoded.receipt.quarantine?.quarantineId
    && decoded.privateLocator
    && decoded.receipt.quarantine.committedAt !== null
  ) {
    return "quarantined";
  }
  throw corruptStore(scope);
}

function assertOwned(
  scope,
  decoded,
  ownerId,
  claimToken,
  states = ["processing"],
) {
  if (
    !states.includes(decoded.receipt.state)
    || decoded.receipt.lease?.ownerId !== ownerId
    || decoded.claimToken !== claimToken
  ) {
    throw notOwned(scope);
  }
}

function assertChanged(scope, result) {
  if (result.changes !== 1) throw corruptStore(scope);
}

export function createSqliteCoordinationConsumerRepository({ database } = {}) {
  assertSqlite(database);

  function loadBundle(key) {
    const row = database
      .prepare(
        "SELECT * FROM main.coordination_consumer_receipts WHERE consume_key = ?",
      )
      .get(key);
    if (!row) return null;
    return {
      row,
      deliveryRows: database
        .prepare(
          "SELECT * FROM main.coordination_consumer_deliveries "
          + "WHERE consume_key = ? ORDER BY observed_order",
        )
        .all(key),
      recoveryRows: database
        .prepare(
          "SELECT * FROM main.coordination_consumer_recovery_history "
          + "WHERE consume_key = ? ORDER BY recovery_order",
        )
        .all(key),
      privateRow: database
        .prepare(
          "SELECT * FROM main.coordination_consumer_quarantine_private "
          + "WHERE consume_key = ?",
        )
        .get(key),
      replayRow: database
        .prepare(
          "SELECT * FROM main.coordination_consumer_replays WHERE consume_key = ?",
        )
        .get(key),
    };
  }

  function decodedReceipt(scope, key) {
    const bundle = loadBundle(key);
    return bundle ? validateBundle(scope, bundle) : null;
  }

  function publicReceipt(scope, key) {
    const decoded = decodedReceipt(scope, key);
    if (!decoded) throw notFound(scope);
    return clonePublic(decoded.receipt);
  }

  function loadAckIntentRow(key, observedDeliveryId) {
    return database
      .prepare(
        "SELECT * FROM main.coordination_consumer_ack_intents "
        + "WHERE consume_key = ? AND delivery_id = ?",
      )
      .get(key, observedDeliveryId);
  }

  function ackIntentProjection(scope, row) {
    const intent = validateAckIntent(scope, row);
    const decoded = decodedReceipt(scope, intent.consumeKey);
    if (!decoded) throw corruptStore(scope);
    completedOutcome(scope, decoded);
    const observed = decoded.receipt.deliveries.find(
      (delivery) => delivery.deliveryId === intent.deliveryId,
    );
    if (
      !observed
      || (
        intent.state === "committed"
        && (
          observed.ackState !== "acked"
          || decoded.receipt.state !== "completed"
        )
      )
      || (
        intent.state !== "committed"
        && (
          observed.ackState !== "acknowledging"
          || !["effect_committed", "quarantined"].includes(
            decoded.receipt.state,
          )
        )
      )
    ) {
      throw validationError(scope, "stored ACK intent receipt is invalid");
    }
    return {
      intent,
      publicIntent: publicAckIntent(intent, decoded.receipt),
    };
  }

  function forceAckRecoveryRequired(
    scope,
    key,
    observedDeliveryId,
    now,
  ) {
    assertChanged(
      scope,
      database
        .prepare(
          "UPDATE main.coordination_consumer_ack_intents SET "
          + "state = 'recovery_required', due_at = NULL, "
          + "claim_epoch = CASE "
          + "WHEN typeof(claim_epoch) = 'integer' "
          + "AND claim_epoch BETWEEN 0 AND 9007199254740991 "
          + "THEN claim_epoch ELSE 0 END, "
          + "claim_family = NULL, claim_owner_id = NULL, "
          + "claim_token = NULL, claim_expires_at = NULL, "
          + "proof = NULL, reason_code = 'TRANSPORT_STATE_UNKNOWN', "
          + "committed_at = NULL, "
          + "created_at = CASE "
          + "WHEN typeof(created_at) = 'integer' "
          + "AND created_at BETWEEN 0 AND 9007199254740991 "
          + "THEN created_at ELSE ? END, updated_at = ? "
          + "WHERE consume_key = ? AND delivery_id = ?",
        )
        .run(now, now, key, observedDeliveryId),
    );
    assertChanged(
      scope,
      database
        .prepare(
          "UPDATE main.coordination_consumer_deliveries SET "
          + "ack_state = 'acknowledging', acked_at = NULL "
          + "WHERE consume_key = ? AND delivery_id = ?",
        )
        .run(key, observedDeliveryId),
    );
    assertChanged(
      scope,
      database
        .prepare(
          "UPDATE main.coordination_consumer_receipts SET "
          + "state = CASE "
          + "WHEN effect_commit_id IS NOT NULL THEN 'effect_committed' "
          + "WHEN quarantine_id IS NOT NULL "
          + "AND quarantine_committed_at IS NOT NULL THEN 'quarantined' "
          + "ELSE state END, updated_at = ? WHERE consume_key = ?",
        )
        .run(now, key),
    );
    return ackIntentProjection(
      scope,
      loadAckIntentRow(key, observedDeliveryId),
    );
  }

  function observeDelivery(scope, key, {
    observedDeliveryId,
    recovered,
    now,
  }) {
    const existing = database
      .prepare(
        "SELECT recovered FROM main.coordination_consumer_deliveries "
        + "WHERE consume_key = ? AND delivery_id = ?",
      )
      .get(key, observedDeliveryId);
    if (existing) {
      if (recovered && existing.recovered !== 1) {
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_deliveries SET recovered = 1 "
              + "WHERE consume_key = ? AND delivery_id = ?",
            )
            .run(key, observedDeliveryId),
        );
      }
      return;
    }
    const next = database
      .prepare(
        "SELECT COALESCE(MAX(observed_order), 0) + 1 AS next_order "
        + "FROM main.coordination_consumer_deliveries WHERE consume_key = ?",
      )
      .get(key)
      .next_order;
    safeInteger(
      scope,
      next,
      "delivery observation order",
      { positive: true },
    );
    database
      .prepare(
        "INSERT INTO main.coordination_consumer_deliveries "
        + "(consume_key, delivery_id, recovered, observed_at, "
        + "observed_order, ack_state, acked_at) "
        + "VALUES (?, ?, ?, ?, ?, 'pending', NULL)",
      )
      .run(key, observedDeliveryId, Number(recovered), now, next);
  }

  function safely(action) {
    const controlErrors = new Set();
    const operationErrors = new Set();
    const validationErrors = new Set();
    const scope = Object.freeze({
      control(error) {
        controlErrors.add(error);
        return error;
      },
      isControl(error) {
        return controlErrors.has(error);
      },
      isOperation(error) {
        return operationErrors.has(error);
      },
      isValidation(error) {
        return validationErrors.has(error);
      },
      operation(error) {
        operationErrors.add(error);
        return error;
      },
      validation(error) {
        validationErrors.add(error);
        return error;
      },
    });
    try {
      return action(scope);
    } catch (error) {
      if (
        scope.isControl(error)
        || scope.isValidation(error)
        || scope.isOperation(error)
      ) {
        throw error;
      }
      throw failedStore();
    } finally {
      controlErrors.clear();
      operationErrors.clear();
      validationErrors.clear();
    }
  }

  function write(scope, action) {
    try {
      return database.transaction(action).immediate();
    } catch (error) {
      if (scope.isValidation(error)) {
        throw corruptStore(scope);
      }
      throw error;
    }
  }

  function read(scope, action) {
    try {
      return database.transaction(action).deferred();
    } catch (error) {
      if (scope.isValidation(error)) {
        throw corruptStore(scope);
      }
      throw error;
    }
  }

  async function claim(input) {
    return safely((scope) => {
      const value = plainObject(scope, input, "claim");
      const key = consumeKey(scope, value.consumeKey);
      const observedDeliveryId = deliveryId(scope, value.deliveryId);
      const ownerId = safeIdentifier(scope, value.ownerId, "ownerId");
      const now = safeInteger(scope, value.now, "now");
      const leaseMs = safeInteger(scope, value.leaseMs, "leaseMs", {
        positive: true,
      });
      const safeMetadata = metadata(scope, value.metadata);
      const maximum = value.maxConsumedRecoveryIdsPerReceipt === undefined
        ? MAX_RECOVERY_IDS
        : safeInteger(
            scope,
            value.maxConsumedRecoveryIdsPerReceipt,
            "maxConsumedRecoveryIdsPerReceipt",
            { positive: true },
          );
      if (maximum > MAX_RECOVERY_IDS) {
        throw validationError(
          scope,
          "maxConsumedRecoveryIdsPerReceipt exceeds the repository contract",
        );
      }
      if (typeof value.recovered !== "boolean") {
        throw validationError(scope, "recovered must be a boolean");
      }

      return write(scope, () => {
        let decoded = decodedReceipt(scope, key);
        if (!decoded) {
          const expiresAt = safeExpiry(scope, now, leaseMs);
          database
            .prepare(
              `INSERT INTO main.coordination_consumer_receipts (
                consume_key,
                metadata_protocol_version,
                metadata_scope_id,
                metadata_message_id,
                metadata_from_participant_id,
                metadata_to_participant_id,
                metadata_message_type,
                metadata_classification,
                metadata_created_at,
                metadata_trace_id,
                metadata_correlation_id,
                metadata_reply_to_message_id,
                metadata_malformed,
                state,
                attempts,
                claim_epoch,
                lease_owner_id,
                lease_claim_token,
                lease_expires_at,
                effect_commit_id,
                effect_committed_at,
                quarantine_id,
                quarantine_reason_code,
                quarantine_committed_at,
                replay_epoch,
                max_consumed_recovery_ids,
                created_at,
                updated_at
              ) VALUES (
                @consumeKey,
                @metadataProtocolVersion,
                @metadataScopeId,
                @metadataMessageId,
                @metadataFromParticipantId,
                @metadataToParticipantId,
                @metadataMessageType,
                @metadataClassification,
                @metadataCreatedAt,
                @metadataTraceId,
                @metadataCorrelationId,
                @metadataReplyToMessageId,
                @metadataMalformed,
                'processing',
                0,
                1,
                @ownerId,
                'claim-1',
                @expiresAt,
                NULL,
                NULL,
                NULL,
                NULL,
                NULL,
                0,
                @maximum,
                @now,
                @now
              )`,
            )
            .run({
              consumeKey: key,
              ...metadataParameters(safeMetadata),
              ownerId,
              expiresAt,
              maximum,
              now,
            });
          observeDelivery(scope, key, {
            observedDeliveryId,
            recovered: value.recovered,
            now,
          });
          decoded = decodedReceipt(scope, key);
          return {
            status: "claimed",
            stale: false,
            claimToken: decoded.claimToken,
            receipt: clonePublic(decoded.receipt),
          };
        }

        const stale = (
          decoded.receipt.state === "processing"
          && (
            decoded.receipt.lease === null
            || decoded.receipt.lease.expiresAt <= now
          )
        );
        const expiresAt = stale ? safeExpiry(scope, now, leaseMs) : null;
        observeDelivery(scope, key, {
          observedDeliveryId,
          recovered: value.recovered,
          now,
        });
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_receipts SET updated_at = ? "
              + "WHERE consume_key = ?",
            )
            .run(now, key),
        );
        decoded = decodedReceipt(scope, key);
        if (decoded.receipt.state === "quarantine_blocked") {
          return {
            status: "blocked",
            receipt: clonePublic(decoded.receipt),
          };
        }
        if ([
          "effect_committed",
          "quarantined",
          "completed",
          "replay_committed",
        ].includes(decoded.receipt.state)) {
          return {
            status: completedOutcome(scope, decoded),
            receipt: clonePublic(decoded.receipt),
          };
        }
        if (decoded.receipt.state !== "processing") {
          throw corruptStore(scope);
        }
        if (!stale) {
          return {
            status: "busy",
            receipt: clonePublic(decoded.receipt),
          };
        }
        const claimEpoch = safeInteger(
          scope,
          decoded.claimEpoch + 1,
          "claimEpoch",
          { positive: true },
        );
        const claimToken = `claim-${claimEpoch}`;
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_receipts SET "
              + "claim_epoch = ?, lease_owner_id = ?, "
              + "lease_claim_token = ?, lease_expires_at = ? "
              + "WHERE consume_key = ?",
            )
            .run(claimEpoch, ownerId, claimToken, expiresAt, key),
        );
        return {
          status: "claimed",
          stale,
          claimToken,
          receipt: publicReceipt(scope, key),
        };
      });
    });
  }

  async function claimBlockedQuarantine({
    consumeKey: rawConsumeKey,
    ownerId: rawOwnerId,
    recoveryId: rawRecoveryId,
    now: rawNow,
    leaseMs: rawLeaseMs,
  }) {
    return safely((scope) => {
      const key = consumeKey(scope, rawConsumeKey);
      const ownerId = safeIdentifier(scope, rawOwnerId, "ownerId");
      const recoveryId = safeIdentifier(scope, rawRecoveryId, "recoveryId");
      const now = safeInteger(scope, rawNow, "now");
      const leaseMs = safeInteger(
        scope,
        rawLeaseMs,
        "leaseMs",
        { positive: true },
      );
      return write(scope, () => {
        const decoded = decodedReceipt(scope, key);
        if (!decoded) throw notFound(scope);
        if ([
          "effect_committed",
          "quarantined",
          "completed",
          "replay_committed",
        ].includes(decoded.receipt.state)) {
          return {
            status: completedOutcome(scope, decoded),
            receipt: clonePublic(decoded.receipt),
          };
        }
        if (decoded.receipt.state !== "quarantine_blocked") {
          throw storeError(
            scope,
            "COORDINATION_CONSUMER_RECEIPT_NOT_BLOCKED",
            "coordination consumer receipt is not blocked",
          );
        }
        if (
          decoded.recoveryIds.includes(recoveryId)
          || decoded.recoveryIds.length >= decoded.maximum
        ) {
          return {
            status: "blocked",
            receipt: clonePublic(decoded.receipt),
          };
        }
        if (
          decoded.receipt.lease !== null
          && decoded.receipt.lease.expiresAt > now
        ) {
          return {
            status: "busy",
            receipt: clonePublic(decoded.receipt),
          };
        }
        const claimEpoch = safeInteger(
          scope,
          decoded.claimEpoch + 1,
          "claimEpoch",
          { positive: true },
        );
        const claimToken = `claim-${claimEpoch}`;
        const recoveryOrder = decoded.recoveryIds.length + 1;
        const expiresAt = safeExpiry(scope, now, leaseMs);
        database
          .prepare(
            "INSERT INTO main.coordination_consumer_recovery_history "
            + "(consume_key, recovery_id, recovery_order) VALUES (?, ?, ?)",
          )
          .run(key, recoveryId, recoveryOrder);
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_receipts SET "
              + "claim_epoch = ?, lease_owner_id = ?, "
              + "lease_claim_token = ?, lease_expires_at = ?, "
              + "updated_at = ? WHERE consume_key = ?",
            )
            .run(
              claimEpoch,
              ownerId,
              claimToken,
              expiresAt,
              now,
              key,
            ),
        );
        return {
          status: "claimed",
          claimToken,
          receipt: publicReceipt(scope, key),
        };
      });
    });
  }

  async function recordAttempt({
    consumeKey: rawConsumeKey,
    ownerId: rawOwnerId,
    claimToken: rawClaimToken,
    now: rawNow,
    leaseMs: rawLeaseMs,
  }) {
    return safely((scope) => {
      const key = consumeKey(scope, rawConsumeKey);
      const ownerId = safeIdentifier(scope, rawOwnerId, "ownerId");
      const claimToken = safeIdentifier(
        scope,
        rawClaimToken,
        "claimToken",
      );
      const now = safeInteger(scope, rawNow, "now");
      const leaseMs = safeInteger(
        scope,
        rawLeaseMs,
        "leaseMs",
        { positive: true },
      );
      return write(scope, () => {
        const decoded = decodedReceipt(scope, key);
        if (!decoded) throw notFound(scope);
        assertOwned(scope, decoded, ownerId, claimToken);
        const attempts = safeInteger(
          scope,
          decoded.receipt.attempts + 1,
          "attempts",
        );
        const expiresAt = safeExpiry(scope, now, leaseMs);
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_receipts SET "
              + "attempts = ?, lease_expires_at = ?, updated_at = ? "
              + "WHERE consume_key = ?",
            )
            .run(attempts, expiresAt, now, key),
        );
        return publicReceipt(scope, key);
      });
    });
  }

  async function commitEffect({
    consumeKey: rawConsumeKey,
    ownerId: rawOwnerId,
    claimToken: rawClaimToken,
    commitId: rawCommitId,
    now: rawNow,
  }) {
    return safely((scope) => {
      const key = consumeKey(scope, rawConsumeKey);
      const ownerId = safeIdentifier(scope, rawOwnerId, "ownerId");
      const claimToken = safeIdentifier(
        scope,
        rawClaimToken,
        "claimToken",
      );
      const commitId = safeIdentifier(scope, rawCommitId, "commitId");
      const now = safeInteger(scope, rawNow, "now");
      return write(scope, () => {
        const decoded = decodedReceipt(scope, key);
        if (!decoded) throw notFound(scope);
        assertOwned(scope, decoded, ownerId, claimToken);
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_receipts SET "
              + "effect_commit_id = ?, effect_committed_at = ?, "
              + "state = 'effect_committed', lease_owner_id = NULL, "
              + "lease_claim_token = NULL, lease_expires_at = NULL, "
              + "updated_at = ? WHERE consume_key = ?",
            )
            .run(commitId, now, now, key),
        );
        return publicReceipt(scope, key);
      });
    });
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
    return safely((scope) => {
      const key = consumeKey(scope, rawConsumeKey);
      const ownerId = safeIdentifier(scope, rawOwnerId, "ownerId");
      const claimToken = safeIdentifier(
        scope,
        rawClaimToken,
        "claimToken",
      );
      const quarantineId = safeIdentifier(
        scope,
        rawQuarantineId,
        "quarantineId",
      );
      const locator = safeIdentifier(scope, rawLocator, "locator");
      const reasonCode = safeCode(scope, rawReasonCode, "reasonCode");
      const now = safeInteger(scope, rawNow, "now");
      return write(scope, () => {
        const decoded = decodedReceipt(scope, key);
        if (!decoded) throw notFound(scope);
        assertOwned(
          scope,
          decoded,
          ownerId,
          claimToken,
          ["processing", "quarantine_blocked"],
        );
        database
          .prepare(
            "INSERT INTO main.coordination_consumer_quarantine_private "
            + "(consume_key, quarantine_id, locator) VALUES (?, ?, ?)",
          )
          .run(key, quarantineId, locator);
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_receipts SET "
              + "quarantine_id = ?, quarantine_reason_code = ?, "
              + "quarantine_committed_at = ?, state = 'quarantined', "
              + "lease_owner_id = NULL, lease_claim_token = NULL, "
              + "lease_expires_at = NULL, updated_at = ? "
              + "WHERE consume_key = ?",
            )
            .run(quarantineId, reasonCode, now, now, key),
        );
        return publicReceipt(scope, key);
      });
    });
  }

  async function blockQuarantine({
    consumeKey: rawConsumeKey,
    ownerId: rawOwnerId,
    claimToken: rawClaimToken,
    reasonCode: rawReasonCode,
    now: rawNow,
  }) {
    return safely((scope) => {
      const key = consumeKey(scope, rawConsumeKey);
      const ownerId = safeIdentifier(scope, rawOwnerId, "ownerId");
      const claimToken = safeIdentifier(
        scope,
        rawClaimToken,
        "claimToken",
      );
      const reasonCode = safeCode(scope, rawReasonCode, "reasonCode");
      const now = safeInteger(scope, rawNow, "now");
      return write(scope, () => {
        const decoded = decodedReceipt(scope, key);
        if (!decoded) throw notFound(scope);
        assertOwned(
          scope,
          decoded,
          ownerId,
          claimToken,
          ["processing", "quarantine_blocked"],
        );
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_receipts SET "
              + "state = 'quarantine_blocked', lease_owner_id = NULL, "
              + "lease_claim_token = NULL, lease_expires_at = NULL, "
              + "quarantine_id = NULL, quarantine_reason_code = ?, "
              + "quarantine_committed_at = NULL, updated_at = ? "
              + "WHERE consume_key = ?",
            )
            .run(reasonCode, now, key),
        );
        return publicReceipt(scope, key);
      });
    });
  }

  async function releaseClaim({
    consumeKey: rawConsumeKey,
    ownerId: rawOwnerId,
    claimToken: rawClaimToken,
    now: rawNow,
  }) {
    return safely((scope) => {
      const key = consumeKey(scope, rawConsumeKey);
      const ownerId = safeIdentifier(scope, rawOwnerId, "ownerId");
      const claimToken = safeIdentifier(
        scope,
        rawClaimToken,
        "claimToken",
      );
      const now = safeInteger(scope, rawNow, "now");
      return write(scope, () => {
        const decoded = decodedReceipt(scope, key);
        if (!decoded) return null;
        if (!["processing", "quarantine_blocked"].includes(
          decoded.receipt.state,
        )) {
          return null;
        }
        if (
          decoded.receipt.lease?.ownerId !== ownerId
          || decoded.claimToken !== claimToken
        ) {
          return clonePublic(decoded.receipt);
        }
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_receipts SET "
              + "lease_expires_at = ?, updated_at = ? "
              + "WHERE consume_key = ?",
            )
            .run(now, now, key),
        );
        return publicReceipt(scope, key);
      });
    });
  }

  async function prepareAck({
    consumeKey: rawConsumeKey,
    deliveryId: rawDeliveryId,
    now: rawNow,
  }) {
    return safely((scope) => {
      const key = consumeKey(scope, rawConsumeKey);
      const observedDeliveryId = deliveryId(scope, rawDeliveryId);
      const now = safeInteger(scope, rawNow, "now");
      return write(scope, () => {
        const decoded = decodedReceipt(scope, key);
        if (!decoded) throw notFound(scope);
        completedOutcome(scope, decoded);
        const observed = decoded.receipt.deliveries.find(
          (item) => item.deliveryId === observedDeliveryId,
        );
        if (!observed) {
          throw storeError(
            scope,
            "COORDINATION_CONSUMER_DELIVERY_NOT_OBSERVED",
            "coordination consumer delivery was not observed",
          );
        }
        if (observed.ackState === "acked") {
          return {
            status: "acked",
            receipt: clonePublic(decoded.receipt),
          };
        }
        const existingRow = loadAckIntentRow(key, observedDeliveryId);
        if (existingRow) {
          let existing;
          try {
            existing = ackIntentProjection(scope, existingRow);
          } catch (error) {
            if (!scope.isValidation(error)) throw error;
            forceAckRecoveryRequired(
              scope,
              key,
              observedDeliveryId,
              now,
            );
            return {
              status: "recovery_required",
              receipt: publicReceipt(scope, key),
            };
          }
          if (existing.intent.state === "recovery_required") {
            return {
              status: "recovery_required",
              receipt: clonePublic(decoded.receipt),
            };
          }
          if (existing.intent.state === "deferred") {
            assertChanged(
              scope,
              database
                .prepare(
                  "UPDATE main.coordination_consumer_ack_intents SET "
                  + "state = 'pending', due_at = ?, "
                  + "reason_code = NULL, updated_at = ? "
                  + "WHERE consume_key = ? AND delivery_id = ?",
                )
                .run(now, now, key, observedDeliveryId),
            );
          }
        } else {
          database
            .prepare(
              `INSERT INTO main.coordination_consumer_ack_intents (
                consume_key,
                delivery_id,
                state,
                due_at,
                claim_epoch,
                claim_family,
                claim_owner_id,
                claim_token,
                claim_expires_at,
                proof,
                reason_code,
                committed_at,
                created_at,
                updated_at
              ) VALUES (
                ?, ?, 'pending', ?, 0, NULL, NULL, NULL, NULL,
                NULL, NULL, NULL, ?, ?
              )`,
            )
            .run(key, observedDeliveryId, now, now, now);
        }
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_deliveries SET "
              + "ack_state = 'acknowledging', acked_at = NULL "
              + "WHERE consume_key = ? AND delivery_id = ?",
            )
            .run(key, observedDeliveryId),
        );
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_receipts SET updated_at = ? "
              + "WHERE consume_key = ?",
            )
            .run(now, key),
        );
        return {
          status: "pending",
          receipt: publicReceipt(scope, key),
        };
      });
    });
  }

  async function listAckIntents(input) {
    return safely((scope) => {
      const value = exactObject(
        scope,
        input,
        "ACK intent list",
        ACK_LIST_FIELDS,
      );
      const cursor = decodeAckCursor(scope, value.cursor);
      const limit = safeInteger(
        scope,
        value.limit,
        "limit",
        { positive: true },
      );
      if (limit > MAX_ACK_INTENT_PAGE_SIZE) {
        throw validationError(
          scope,
          "ACK intent list limit exceeds its bound",
        );
      }
      const now = safeInteger(scope, value.now, "now");
      return write(scope, () => {
        const cursorPredicate = cursor === null
          ? ""
          : `AND (eligible_at, consume_key, delivery_id) >
               (@cursorEligibleAt, @cursorConsumeKey, @cursorDeliveryId)`;
        const rows = database.prepare(
          `SELECT *
           FROM main.coordination_consumer_ack_intents
             INDEXED BY idx_coord_consumer_ack_outbox_due_cursor
           WHERE state IN ('pending', 'claimed', 'deferred')
             AND eligible_at <= @now
             ${cursorPredicate}
           ORDER BY eligible_at, consume_key, delivery_id
           LIMIT @fetchLimit`,
        );
        const bindings = {
          now,
          fetchLimit: limit + 1,
          ...(cursor === null
            ? {}
            : {
                cursorEligibleAt: cursor.eligibleAt,
                cursorConsumeKey: cursor.consumeKey,
                cursorDeliveryId: cursor.deliveryId,
              }),
        };
        const rawPage = rows.all(bindings);
        const workPage = rawPage.slice(0, limit);
        const projected = [];
        for (const row of workPage) {
          try {
            projected.push(ackIntentProjection(scope, row));
          } catch (error) {
            if (!scope.isValidation(error)) throw error;
            forceAckRecoveryRequired(
              scope,
              row.consume_key,
              row.delivery_id,
              now,
            );
          }
        }
        return {
          intents: projected.map(({ publicIntent }) => publicIntent),
          nextCursor: rawPage.length > limit
            ? encodeAckCursor(scope, workPage[workPage.length - 1])
            : null,
        };
      });
    });
  }

  async function claimAckIntent(input, family) {
    return safely((scope) => {
      const value = exactObject(
        scope,
        input,
        "ACK intent claim",
        ACK_CLAIM_FIELDS,
      );
      const key = consumeKey(scope, value.consumeKey);
      const observedDeliveryId = deliveryId(scope, value.deliveryId);
      const ownerId = safeIdentifier(scope, value.ownerId, "ownerId");
      const now = safeInteger(scope, value.now, "now");
      const leaseMs = safeInteger(
        scope,
        value.leaseMs,
        "leaseMs",
        { positive: true },
      );
      const expiresAt = safeExpiry(scope, now, leaseMs);
      return write(scope, () => {
        let claimedRow = database
          .prepare(
            `UPDATE main.coordination_consumer_ack_intents
             SET
               state = 'claimed',
               claim_epoch = claim_epoch + 1,
               claim_family = @family,
               claim_owner_id = @ownerId,
               claim_token =
                 'ack-' || @family || '-' || CAST(claim_epoch + 1 AS TEXT),
               claim_expires_at = @expiresAt,
               reason_code = NULL,
               updated_at = @now
             WHERE consume_key = @consumeKey
               AND delivery_id = @deliveryId
               AND due_at <= @now
               AND proof IS NULL
               AND committed_at IS NULL
               AND (
                 (
                   state = 'pending'
                   AND claim_family IS NULL
                   AND claim_owner_id IS NULL
                   AND claim_token IS NULL
                   AND claim_expires_at IS NULL
                   AND reason_code IS NULL
                 )
                 OR (
                   state = 'deferred'
                   AND claim_family IS NULL
                   AND claim_owner_id IS NULL
                   AND claim_token IS NULL
                   AND claim_expires_at IS NULL
                   AND reason_code IN (
                     'ACK_CONTRACT_INVALID',
                     'ACK_TRANSPORT_FAILED',
                     'OLD_PARTICIPANT_PRESENT',
                     'TRANSPORT_UNAVAILABLE'
                   )
                 )
                 OR (
                   state = 'claimed'
                   AND claim_family IS NOT NULL
                   AND claim_owner_id IS NOT NULL
                   AND claim_token IS NOT NULL
                   AND claim_expires_at <= @now
                   AND reason_code IS NULL
                 )
               )
             RETURNING *`,
          )
          .get({
            family,
            ownerId,
            expiresAt,
            now,
            consumeKey: key,
            deliveryId: observedDeliveryId,
          });
        if (claimedRow) {
          const finalClaimToken = ackClaimToken(
            {
              consumeKey: key,
              deliveryId: observedDeliveryId,
            },
            ownerId,
            claimedRow.claim_epoch,
            family,
          );
          assertChanged(
            scope,
            database
              .prepare(
                "UPDATE main.coordination_consumer_ack_intents SET "
                + "claim_token = ? "
                + "WHERE consume_key = ? AND delivery_id = ? "
                + "AND state = 'claimed' AND claim_epoch = ? "
                + "AND claim_family = ? AND claim_owner_id = ? "
                + "AND claim_token = ?",
              )
              .run(
                finalClaimToken,
                key,
                observedDeliveryId,
                claimedRow.claim_epoch,
                family,
                ownerId,
                claimedRow.claim_token,
              ),
          );
          claimedRow = loadAckIntentRow(key, observedDeliveryId);
          const claimed = ackIntentProjection(scope, claimedRow);
          return {
            status: "claimed",
            claimToken: claimed.intent.claimToken,
            intent: claimed.publicIntent,
          };
        }
        const row = loadAckIntentRow(key, observedDeliveryId);
        if (!row) throw notFound(scope);
        let current;
        try {
          current = ackIntentProjection(scope, row);
        } catch (error) {
          if (!scope.isValidation(error)) throw error;
          const recovered = forceAckRecoveryRequired(
            scope,
            key,
            observedDeliveryId,
            now,
          );
          return {
            status: "recovery_required",
            intent: recovered.publicIntent,
          };
        }
        if (current.intent.state === "committed") {
          return {
            status: "committed",
            intent: current.publicIntent,
          };
        }
        if (current.intent.state === "recovery_required") {
          return {
            status: "recovery_required",
            intent: current.publicIntent,
          };
        }
        if (current.intent.dueAt > now) {
          return {
            status: "not_due",
            intent: current.publicIntent,
          };
        }
        if (
          current.intent.state === "claimed"
          && current.intent.expiresAt > now
        ) {
          return {
            status: "busy",
            intent: current.publicIntent,
          };
        }
        throw corruptStore(scope);
      });
    });
  }

  async function renewAckIntent(input) {
    return safely((scope) => {
      const value = exactObject(
        scope,
        input,
        "ACK intent renewal",
        ACK_RENEW_FIELDS,
      );
      const key = consumeKey(scope, value.consumeKey);
      const observedDeliveryId = deliveryId(scope, value.deliveryId);
      const ownerId = safeIdentifier(scope, value.ownerId, "ownerId");
      const claimToken = safeIdentifier(
        scope,
        value.claimToken,
        "claimToken",
      );
      const now = safeInteger(scope, value.now, "now");
      const leaseMs = safeInteger(
        scope,
        value.leaseMs,
        "leaseMs",
        { positive: true },
      );
      const expiresAt = safeExpiry(scope, now, leaseMs);
      return write(scope, () => {
        const row = database
          .prepare(
            "UPDATE main.coordination_consumer_ack_intents SET "
            + "claim_expires_at = ?, updated_at = ? "
            + "WHERE consume_key = ? AND delivery_id = ? "
            + "AND state = 'claimed' "
            + "AND claim_family = 'reconciliation' "
            + "AND claim_owner_id = ? AND claim_token = ? "
            + "RETURNING *",
          )
          .get(
            expiresAt,
            now,
            key,
            observedDeliveryId,
            ownerId,
            claimToken,
          );
        if (!row) throw ackNotOwned(scope);
        const renewed = ackIntentProjection(scope, row);
        return {
          status: "renewed",
          claimToken,
          intent: renewed.publicIntent,
        };
      });
    });
  }

  async function commitAckIntent(input, proof, family) {
    return safely((scope) => {
      const value = exactObject(
        scope,
        input,
        "ACK intent commit",
        ACK_COMMIT_FIELDS,
      );
      const key = consumeKey(scope, value.consumeKey);
      const observedDeliveryId = deliveryId(scope, value.deliveryId);
      const ownerId = safeIdentifier(scope, value.ownerId, "ownerId");
      const claimToken = safeIdentifier(
        scope,
        value.claimToken,
        "claimToken",
      );
      const now = safeInteger(scope, value.now, "now");
      return write(scope, () => {
        const settled = database
          .prepare(
            "UPDATE main.coordination_consumer_ack_intents SET "
            + "state = 'committed', due_at = NULL, "
            + "claim_expires_at = NULL, proof = ?, reason_code = NULL, "
            + "committed_at = ?, updated_at = ? "
            + "WHERE consume_key = ? AND delivery_id = ? "
            + "AND state = 'claimed' AND claim_family = ? "
            + "AND claim_owner_id = ? AND claim_token = ? "
            + "AND proof IS NULL AND reason_code IS NULL "
            + "AND committed_at IS NULL RETURNING *",
          )
          .get(
            proof,
            now,
            now,
            key,
            observedDeliveryId,
            family,
            ownerId,
            claimToken,
          );
        if (!settled) {
          const row = loadAckIntentRow(key, observedDeliveryId);
          if (!row) throw notFound(scope);
          const current = ackIntentProjection(scope, row);
          if (
            current.intent.state === "committed"
            && current.intent.family === family
            && current.intent.ownerId === ownerId
            && current.intent.claimToken === claimToken
            && current.intent.proof === proof
          ) {
            return { status: "committed" };
          }
          throw ackNotOwned(scope);
        }
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_deliveries SET "
              + "ack_state = 'acked', acked_at = ? "
              + "WHERE consume_key = ? AND delivery_id = ? "
              + "AND ack_state = 'acknowledging' AND acked_at IS NULL",
            )
            .run(now, key, observedDeliveryId),
        );
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_receipts SET "
              + "state = 'completed', updated_at = ? "
              + "WHERE consume_key = ? "
              + "AND state IN ('effect_committed', 'quarantined')",
            )
            .run(now, key),
        );
        ackIntentProjection(scope, settled);
        publicReceipt(scope, key);
        return { status: "committed" };
      });
    });
  }

  async function deferAckIntent(input, family) {
    return safely((scope) => {
      const value = exactObject(
        scope,
        input,
        "ACK intent defer",
        ACK_DEFER_FIELDS,
      );
      const key = consumeKey(scope, value.consumeKey);
      const observedDeliveryId = deliveryId(scope, value.deliveryId);
      const ownerId = safeIdentifier(scope, value.ownerId, "ownerId");
      const claimToken = safeIdentifier(
        scope,
        value.claimToken,
        "claimToken",
      );
      if (!ACK_DEFER_REASONS.has(value.reasonCode)) {
        throw validationError(scope, "ACK intent defer reason is invalid");
      }
      const retryAt = safeInteger(scope, value.retryAt, "retryAt");
      const now = safeInteger(scope, value.now, "now");
      if (retryAt <= now) {
        throw validationError(
          scope,
          "ACK intent retryAt must be in the future",
        );
      }
      return write(scope, () => {
        const result = database
          .prepare(
            "UPDATE main.coordination_consumer_ack_intents SET "
            + "state = 'deferred', due_at = ?, claim_family = NULL, "
            + "claim_owner_id = NULL, claim_token = NULL, "
            + "claim_expires_at = NULL, reason_code = ?, updated_at = ? "
            + "WHERE consume_key = ? AND delivery_id = ? "
            + "AND state = 'claimed' AND claim_family = ? "
            + "AND claim_owner_id = ? AND claim_token = ?",
          )
          .run(
            retryAt,
            value.reasonCode,
            now,
            key,
            observedDeliveryId,
            family,
            ownerId,
            claimToken,
          );
        if (result.changes !== 1) throw ackNotOwned(scope);
        return { status: "deferred" };
      });
    });
  }

  async function markAckRecoveryRequired(input) {
    return safely((scope) => {
      const value = exactObject(
        scope,
        input,
        "ACK intent recovery",
        ACK_RECOVERY_FIELDS,
      );
      const key = consumeKey(scope, value.consumeKey);
      const observedDeliveryId = deliveryId(scope, value.deliveryId);
      const ownerId = safeIdentifier(scope, value.ownerId, "ownerId");
      const claimToken = safeIdentifier(
        scope,
        value.claimToken,
        "claimToken",
      );
      if (!ACK_RECOVERY_REASONS.has(value.reasonCode)) {
        throw validationError(scope, "ACK intent recovery reason is invalid");
      }
      const now = safeInteger(scope, value.now, "now");
      return write(scope, () => {
        const result = database
          .prepare(
            "UPDATE main.coordination_consumer_ack_intents SET "
            + "state = 'recovery_required', due_at = NULL, "
            + "claim_expires_at = NULL, proof = NULL, "
            + "reason_code = ?, committed_at = NULL, updated_at = ? "
            + "WHERE consume_key = ? AND delivery_id = ? "
            + "AND state = 'claimed' "
            + "AND claim_family = 'reconciliation' "
            + "AND claim_owner_id = ? AND claim_token = ?",
          )
          .run(
            value.reasonCode,
            now,
            key,
            observedDeliveryId,
            ownerId,
            claimToken,
          );
        if (result.changes === 1) {
          assertChanged(
            scope,
            database
              .prepare(
                "UPDATE main.coordination_consumer_receipts SET updated_at = ? "
                + "WHERE consume_key = ?",
              )
              .run(now, key),
          );
          return { status: "recovery_required" };
        }
        const row = loadAckIntentRow(key, observedDeliveryId);
        if (!row) throw notFound(scope);
        const current = ackIntentProjection(scope, row);
        if (
          current.intent.state === "recovery_required"
          && current.intent.family === ACK_CLAIM_FAMILY.RECONCILIATION
          && current.intent.ownerId === ownerId
          && current.intent.claimToken === claimToken
          && current.intent.reasonCode === value.reasonCode
        ) {
          return { status: "recovery_required" };
        }
        throw ackNotOwned(scope);
      });
    });
  }

  async function getAckReconciliationSummary() {
    return safely((scope) => read(scope, () => {
      const intents = database
        .prepare(
          "SELECT * FROM main.coordination_consumer_ack_intents",
        )
        .all();
      for (const intent of intents) {
        ackIntentProjection(scope, intent);
      }
      const rows = database
        .prepare(
          "SELECT state, proof, COUNT(*) AS count "
          + "FROM main.coordination_consumer_ack_intents "
          + "GROUP BY state, proof",
        )
        .all();
      const summary = {
        total: 0,
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
      for (const row of rows) {
        if (!ACK_INTENT_STATES.has(row.state)) throw corruptStore(scope);
        const count = safeInteger(scope, row.count, "ACK intent count");
        summary.total += count;
        if (!Number.isSafeInteger(summary.total)) throw corruptStore(scope);
        if (row.state === "recovery_required") {
          summary.recoveryRequired += count;
        } else {
          summary[row.state] += count;
        }
        if (row.proof !== null) {
          if (!ACK_PROOFS.has(row.proof)) throw corruptStore(scope);
          summary.proofs[row.proof] += count;
        }
      }
      return summary;
    }));
  }

  async function getReceipt(rawConsumeKey) {
    return safely((scope) => {
      const key = consumeKey(scope, rawConsumeKey);
      return read(scope, () => {
        const decoded = decodedReceipt(scope, key);
        return decoded ? clonePublic(decoded.receipt) : null;
      });
    });
  }

  async function getQuarantine(rawQuarantineId) {
    return safely((scope) => {
      const quarantineId = safeIdentifier(
        scope,
        rawQuarantineId,
        "quarantineId",
      );
      return read(scope, () => {
        const privateRow = database
          .prepare(
            "SELECT * FROM main.coordination_consumer_quarantine_private "
            + "WHERE quarantine_id = ?",
          )
          .get(quarantineId);
        if (!privateRow) return null;
        const decoded = decodedReceipt(scope, privateRow.consume_key);
        if (
          !decoded
          || decoded.receipt.quarantine?.quarantineId !== quarantineId
          || decoded.privateLocator === null
        ) {
          throw corruptStore(scope);
        }
        return clonePublic({
          quarantineId,
          consumeKey: decoded.receipt.consumeKey,
          metadata: decoded.receipt.metadata,
          locator: decoded.privateLocator,
          reasonCode: decoded.receipt.quarantine.reasonCode,
          committedAt: decoded.receipt.quarantine.committedAt,
        });
      });
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
    return safely((scope) => {
      const quarantineId = safeIdentifier(
        scope,
        rawQuarantineId,
        "quarantineId",
      );
      const commandId = safeIdentifier(scope, rawCommandId, "commandId");
      const decisionId = safeIdentifier(scope, rawDecisionId, "decisionId");
      const principalId = safeIdentifier(
        scope,
        rawPrincipalId,
        "principalId",
      );
      const ownerId = safeIdentifier(scope, rawOwnerId, "ownerId");
      const now = safeInteger(scope, rawNow, "now");
      const leaseMs = safeInteger(
        scope,
        rawLeaseMs,
        "leaseMs",
        { positive: true },
      );
      return write(scope, () => {
        const privateRow = database
          .prepare(
            "SELECT * FROM main.coordination_consumer_quarantine_private "
            + "WHERE quarantine_id = ?",
          )
          .get(quarantineId);
        if (!privateRow) return { status: "not_found" };
        const decoded = decodedReceipt(scope, privateRow.consume_key);
        if (!decoded) throw corruptStore(scope);
        const existing = decoded.rawReplay;
        if (existing) {
          if (existing.state === "committed") {
            return {
              status: "duplicate",
              receipt: clonePublic(decoded.receipt),
            };
          }
          const exact = (
            existing.commandId === commandId
            && existing.decisionId === decisionId
            && existing.principalId === principalId
          );
          if (!exact) {
            return {
              status: "conflict",
              receipt: clonePublic(decoded.receipt),
            };
          }
          if (
            existing.state === "processing"
            && existing.lease.expiresAt > now
          ) {
            return {
              status: "busy",
              receipt: clonePublic(decoded.receipt),
            };
          }
        }
        const replayEpoch = safeInteger(
          scope,
          decoded.replayEpoch + 1,
          "replayEpoch",
          { positive: true },
        );
        const replayClaimToken = `replay-claim-${replayEpoch}`;
        const expiresAt = safeExpiry(scope, now, leaseMs);
        database
          .prepare(
            `INSERT INTO main.coordination_consumer_replays (
              consume_key,
              quarantine_id,
              command_id,
              decision_id,
              principal_id,
              state,
              lease_owner_id,
              lease_replay_claim_token,
              lease_expires_at,
              commit_id,
              committed_at,
              failure_code
            ) VALUES (?, ?, ?, ?, ?, 'processing', ?, ?, ?, NULL, NULL, NULL)
            ON CONFLICT(consume_key) DO UPDATE SET
              quarantine_id = excluded.quarantine_id,
              command_id = excluded.command_id,
              decision_id = excluded.decision_id,
              principal_id = excluded.principal_id,
              state = 'processing',
              lease_owner_id = excluded.lease_owner_id,
              lease_replay_claim_token =
                excluded.lease_replay_claim_token,
              lease_expires_at = excluded.lease_expires_at,
              commit_id = NULL,
              committed_at = NULL,
              failure_code = NULL`,
          )
          .run(
            decoded.receipt.consumeKey,
            quarantineId,
            commandId,
            decisionId,
            principalId,
            ownerId,
            replayClaimToken,
            expiresAt,
          );
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_receipts SET "
              + "replay_epoch = ?, updated_at = ? WHERE consume_key = ?",
            )
            .run(replayEpoch, now, decoded.receipt.consumeKey),
        );
        return {
          status: "claimed",
          replayClaimToken,
          receipt: publicReceipt(scope, decoded.receipt.consumeKey),
        };
      });
    });
  }

  async function commitReplay({
    quarantineId: rawQuarantineId,
    commandId: rawCommandId,
    ownerId: rawOwnerId,
    replayClaimToken: rawReplayClaimToken,
    commitId: rawCommitId,
    now: rawNow,
  }) {
    return safely((scope) => {
      const quarantineId = safeIdentifier(
        scope,
        rawQuarantineId,
        "quarantineId",
      );
      const commandId = safeIdentifier(scope, rawCommandId, "commandId");
      const ownerId = safeIdentifier(scope, rawOwnerId, "ownerId");
      const replayClaimToken = safeIdentifier(
        scope,
        rawReplayClaimToken,
        "replayClaimToken",
      );
      const commitId = safeIdentifier(scope, rawCommitId, "commitId");
      const now = safeInteger(scope, rawNow, "now");
      return write(scope, () => {
        const privateRow = database
          .prepare(
            "SELECT * FROM main.coordination_consumer_quarantine_private "
            + "WHERE quarantine_id = ?",
          )
          .get(quarantineId);
        const decoded = privateRow
          ? decodedReceipt(scope, privateRow.consume_key)
          : null;
        const replay = decoded?.rawReplay;
        if (
          !replay
          || replay.commandId !== commandId
          || replay.state !== "processing"
          || replay.lease.ownerId !== ownerId
          || decoded.replayClaimToken !== replayClaimToken
        ) {
          throw notOwned(scope, "replay");
        }
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_replays SET "
              + "state = 'committed', lease_owner_id = NULL, "
              + "lease_replay_claim_token = NULL, "
              + "lease_expires_at = NULL, commit_id = ?, "
              + "committed_at = ?, failure_code = NULL "
              + "WHERE consume_key = ?",
            )
            .run(commitId, now, decoded.receipt.consumeKey),
        );
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_receipts SET "
              + "state = 'replay_committed', updated_at = ? "
              + "WHERE consume_key = ?",
            )
            .run(now, decoded.receipt.consumeKey),
        );
        return publicReceipt(scope, decoded.receipt.consumeKey);
      });
    });
  }

  async function failReplay({
    quarantineId: rawQuarantineId,
    commandId: rawCommandId,
    ownerId: rawOwnerId,
    replayClaimToken: rawReplayClaimToken,
    failureCode: rawFailureCode,
    now: rawNow,
  }) {
    return safely((scope) => {
      const quarantineId = safeIdentifier(
        scope,
        rawQuarantineId,
        "quarantineId",
      );
      const commandId = safeIdentifier(scope, rawCommandId, "commandId");
      const ownerId = safeIdentifier(scope, rawOwnerId, "ownerId");
      const replayClaimToken = safeIdentifier(
        scope,
        rawReplayClaimToken,
        "replayClaimToken",
      );
      const failureCode = safeCode(scope, rawFailureCode, "failureCode");
      const now = safeInteger(scope, rawNow, "now");
      return write(scope, () => {
        const privateRow = database
          .prepare(
            "SELECT * FROM main.coordination_consumer_quarantine_private "
            + "WHERE quarantine_id = ?",
          )
          .get(quarantineId);
        const decoded = privateRow
          ? decodedReceipt(scope, privateRow.consume_key)
          : null;
        const replay = decoded?.rawReplay;
        if (
          !replay
          || replay.commandId !== commandId
          || replay.state !== "processing"
          || replay.lease.ownerId !== ownerId
          || decoded.replayClaimToken !== replayClaimToken
        ) {
          throw notOwned(scope, "replay");
        }
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_replays SET "
              + "state = 'failed', lease_owner_id = NULL, "
              + "lease_replay_claim_token = NULL, "
              + "lease_expires_at = NULL, commit_id = NULL, "
              + "committed_at = NULL, failure_code = ? "
              + "WHERE consume_key = ?",
            )
            .run(failureCode, decoded.receipt.consumeKey),
        );
        assertChanged(
          scope,
          database
            .prepare(
              "UPDATE main.coordination_consumer_receipts SET "
              + "state = 'completed', updated_at = ? "
              + "WHERE consume_key = ?",
            )
            .run(now, decoded.receipt.consumeKey),
        );
        return publicReceipt(scope, decoded.receipt.consumeKey);
      });
    });
  }

  const repository = Object.freeze({
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
      commit: (input) => commitAckIntent(
        input,
        "DIRECT_ACK",
        ACK_CLAIM_FAMILY.DIRECT,
      ),
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
      commitTombstone: (input) => commitAckIntent(
        input,
        "ACK_TOMBSTONE",
        ACK_CLAIM_FAMILY.RECONCILIATION,
      ),
      commitOrphan: (input) => commitAckIntent(
        input,
        "ORPHAN_ACK",
        ACK_CLAIM_FAMILY.RECONCILIATION,
      ),
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
  // MUTATION_GUARD: consumer-repository-targets-main
  return bindSqliteCoordinationRepositoryToMain(repository, database);
}
