import {
  coordinationAckProofCode,
} from "./repositories/coordination_consumer_repo.js";

const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const CONSUME_KEY = /^coord-consume-v1-[a-f0-9]{64}$/;
const DELIVERY_ID = /^(?:0|[1-9][0-9]*)-(?:0|[1-9][0-9]*)$/;
const DEFAULT_CONFIG = Object.freeze({
  ownerId: "coordination-ack-reconciler",
  claimLeaseMs: 30_000,
  deferMs: 1_000,
  tombstoneTtlMs: 86_400_000,
  limit: 32,
});
const MAX_LIMIT = 100;
const CONFIG_FIELDS = new Set(Object.keys(DEFAULT_CONFIG));
const RECONCILE_FIELDS = new Set(["cursor"]);
const INTENT_FIELDS = new Set([
  "consumeKey",
  "deliveryId",
  "scopeId",
  "fromParticipantId",
  "oldParticipantId",
  "messageId",
  "state",
  "dueAt",
  "claimEpoch",
  "proof",
  "reasonCode",
  "createdAt",
  "updatedAt",
]);
const SUMMARY_FIELDS = new Set([
  "total",
  "pending",
  "claimed",
  "deferred",
  "committed",
  "recoveryRequired",
  "proofs",
]);
const PROOF_FIELDS = new Set([
  "DIRECT_ACK",
  "ACK_TOMBSTONE",
  "ORPHAN_ACK",
]);
const ACK_PROOFS = new Set(PROOF_FIELDS);
const ACK_DEFER_REASONS = new Set([
  "ACK_CONTRACT_INVALID",
  "ACK_TRANSPORT_FAILED",
  "OLD_PARTICIPANT_PRESENT",
  "TRANSPORT_UNAVAILABLE",
]);
const BUSY_CLAIM_FIELDS = new Set(["status", "intent"]);
const CLAIMED_CLAIM_FIELDS = new Set([
  "status",
  "claimToken",
  "intent",
]);
const CLOSED_CLAIM_FIELDS = new Set(["status", "intent"]);
const CLAIM_RESULT_FIELDS = new Set([
  "status",
  "claimToken",
  "intent",
]);
const RENEWAL_FIELDS = new Set([
  "status",
  "claimToken",
  "intent",
]);

export class CoordinationAckReconcilerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CoordinationAckReconcilerError";
    this.code = code;
  }
}

function reconciliationError(code) {
  return new CoordinationAckReconcilerError(
    code,
    "coordination ACK reconciliation failed safely",
  );
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

function exactSnapshotFields(value, fields, label) {
  const keys = Object.keys(value);
  if (
    keys.length !== fields.size
    || keys.some((field) => !fields.has(field))
  ) {
    throw new TypeError(`${label} has an invalid shape`);
  }
}

function denseArraySnapshot(value, label, maximum) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array`);
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    !lengthDescriptor
    || !Object.hasOwn(lengthDescriptor, "value")
    || !Number.isSafeInteger(lengthDescriptor.value)
    || lengthDescriptor.value < 0
    || lengthDescriptor.value > maximum
  ) {
    throw new TypeError(`${label} has an invalid length`);
  }
  const length = lengthDescriptor.value;
  const snapshot = new Array(length);
  const expectedKeys = new Set([
    "length",
    ...Array.from({ length }, (_, index) => String(index)),
  ]);
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== expectedKeys.size
    || keys.some((key) => (
      typeof key !== "string" || !expectedKeys.has(key)
    ))
  ) {
    throw new TypeError(`${label} must be dense and closed`);
  }
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label} must contain own data entries`);
    }
    snapshot[index] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function safeIdentifier(value, label) {
  if (typeof value !== "string" || !SAFE_IDENTIFIER.test(value)) {
    throw new TypeError(`${label} must be a safe identifier`);
  }
  return value;
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }
  return value;
}

function nonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer`);
  }
  return value;
}

function validAckProofEvidence(value) {
  try {
    return ACK_PROOFS.has(coordinationAckProofCode(value));
  } catch {
    return false;
  }
}

function safeNow(clock) {
  let now;
  try {
    now = clock();
  } catch {
    throw reconciliationError("COORDINATION_ACK_RECONCILIATION_CLOCK_INVALID");
  }
  if (!Number.isSafeInteger(now) || now < 0) {
    throw reconciliationError("COORDINATION_ACK_RECONCILIATION_CLOCK_INVALID");
  }
  return now;
}

function safeFuture(now, delayMs) {
  const result = now + delayMs;
  if (!Number.isSafeInteger(result)) {
    throw reconciliationError("COORDINATION_ACK_RECONCILIATION_CLOCK_INVALID");
  }
  return result;
}

function isDependencyContractFailure(error) {
  return error instanceof TypeError;
}

function normalizeConfig(provided) {
  const source = exactObject(provided, "config", CONFIG_FIELDS);
  const value = { ...DEFAULT_CONFIG, ...source };
  safeIdentifier(value.ownerId, "config.ownerId");
  positiveInteger(value.claimLeaseMs, "config.claimLeaseMs");
  positiveInteger(value.deferMs, "config.deferMs");
  positiveInteger(value.tombstoneTtlMs, "config.tombstoneTtlMs");
  positiveInteger(value.limit, "config.limit");
  if (value.limit > MAX_LIMIT) {
    throw new TypeError(`config.limit must not exceed ${MAX_LIMIT}`);
  }
  return Object.freeze(value);
}

function assertDependencies({ repository, transport, clock, fault }) {
  for (const operation of [
    "list",
    "claim",
    "renew",
    "commitTombstone",
    "commitOrphan",
    "defer",
    "markAckRecoveryRequired",
    "getAckReconciliationSummary",
  ]) {
    if (typeof repository?.[operation] !== "function") {
      throw new TypeError(`repository.${operation} must be a function`);
    }
  }
  for (const operation of [
    "inspectAckTombstone",
    "finalizeOrphanAck",
  ]) {
    if (typeof transport?.[operation] !== "function") {
      throw new TypeError(`transport.${operation} must be a function`);
    }
  }
  if (typeof clock !== "function") {
    throw new TypeError("clock must be a function");
  }
  if (typeof fault !== "function") {
    throw new TypeError("fault must be a function");
  }
}

function normalizeIntent(value, {
  reconcilableOnly = false,
  allowRedactedProof = false,
} = {}) {
  const intent = exactObject(value, "ACK intent", INTENT_FIELDS);
  if (typeof intent.consumeKey !== "string" || !CONSUME_KEY.test(intent.consumeKey)) {
    throw new TypeError("ACK intent consumeKey is invalid");
  }
  if (typeof intent.deliveryId !== "string" || !DELIVERY_ID.test(intent.deliveryId)) {
    throw new TypeError("ACK intent deliveryId is invalid");
  }
  for (const field of [
    "scopeId",
    "fromParticipantId",
    "oldParticipantId",
    "messageId",
  ]) {
    safeIdentifier(intent[field], `ACK intent ${field}`);
  }
  const states = [
    "pending",
    "claimed",
    "deferred",
    "committed",
    "recovery_required",
  ];
  if (
    !states.includes(intent.state)
    || (
      reconcilableOnly
      && !["pending", "claimed", "deferred"].includes(intent.state)
    )
  ) {
    throw new TypeError("ACK intent state is not reconcilable");
  }
  nonNegativeInteger(intent.claimEpoch, "ACK intent claimEpoch");
  nonNegativeInteger(intent.createdAt, "ACK intent createdAt");
  nonNegativeInteger(intent.updatedAt, "ACK intent updatedAt");
  if (["pending", "claimed", "deferred"].includes(intent.state)) {
    nonNegativeInteger(intent.dueAt, "ACK intent dueAt");
    if (intent.proof !== null) {
      throw new TypeError("open ACK intent cannot contain proof");
    }
    if (
      (intent.state === "deferred"
        && !ACK_DEFER_REASONS.has(intent.reasonCode))
      || (
        intent.state !== "deferred"
        && intent.reasonCode !== null
      )
    ) {
      throw new TypeError("open ACK intent reasonCode is invalid");
    }
  } else if (
    intent.state === "committed"
    && (
      intent.dueAt !== null
      || (
        intent.proof !== null
        && !validAckProofEvidence(intent.proof)
      )
      || (intent.proof === null && !allowRedactedProof)
      || intent.reasonCode !== null
    )
  ) {
    throw new TypeError("committed ACK intent is invalid");
  } else if (
    intent.state === "recovery_required"
    && (
      intent.dueAt !== null
      || intent.proof !== null
      || intent.reasonCode !== "TRANSPORT_STATE_UNKNOWN"
    )
  ) {
    throw new TypeError("recovery ACK intent is invalid");
  }
  return intent;
}

function transportIdentity(intent) {
  return Object.freeze({
    consumeKey: intent.consumeKey,
    deliveryId: intent.deliveryId,
    scopeId: intent.scopeId,
    fromParticipantId: intent.fromParticipantId,
    oldParticipantId: intent.oldParticipantId,
    messageId: intent.messageId,
  });
}

function normalizePage(value, requestedLimit) {
  const page = exactObject(
    value,
    "ACK intent page",
    new Set(["intents", "nextCursor"]),
  );
  exactSnapshotFields(
    page,
    new Set(["intents", "nextCursor"]),
    "ACK intent page",
  );
  const intents = denseArraySnapshot(
    page.intents,
    "ACK intent page intents",
    requestedLimit,
  );
  if (
    page.nextCursor !== null
    && (
      typeof page.nextCursor !== "string"
      || page.nextCursor.length > 256
    )
  ) {
    throw new TypeError("ACK intent page cursor is invalid");
  }
  return Object.freeze({
    intents: Object.freeze(intents.map((intent) =>
      normalizeIntent(intent, { reconcilableOnly: true }))),
    nextCursor: page.nextCursor,
  });
}

function sameIntentIdentity(left, right) {
  return [
    "consumeKey",
    "deliveryId",
    "scopeId",
    "fromParticipantId",
    "oldParticipantId",
    "messageId",
  ].every((field) => left[field] === right[field]);
}

function normalizeClaim(value, expectedIntent) {
  const source = exactObject(
    value,
    "ACK intent claim result",
    CLAIM_RESULT_FIELDS,
  );
  if (![
    "busy",
    "claimed",
    "not_due",
    "committed",
    "recovery_required",
  ].includes(source.status)) {
    throw new TypeError("ACK intent claim result is invalid");
  }
  const expectedFields = source.status === "claimed"
    ? CLAIMED_CLAIM_FIELDS
    : source.status === "busy"
      ? BUSY_CLAIM_FIELDS
      : CLOSED_CLAIM_FIELDS;
  exactSnapshotFields(
    source,
    expectedFields,
    "ACK intent claim result",
  );
  const claimedIntent = normalizeIntent(source.intent, {
    allowRedactedProof: source.status === "committed",
  });
  if (
    !sameIntentIdentity(claimedIntent, expectedIntent)
  ) {
    throw new TypeError("ACK intent claim result is invalid");
  }
  const expectedStates = new Map([
    ["busy", new Set(["claimed"])],
    ["claimed", new Set(["claimed"])],
    ["not_due", new Set(["pending", "deferred"])],
    ["committed", new Set(["committed"])],
    ["recovery_required", new Set(["recovery_required"])],
  ]);
  if (!expectedStates.get(source.status).has(claimedIntent.state)) {
    throw new TypeError("ACK intent claim result is invalid");
  }
  if (source.status !== "claimed") {
    return Object.freeze({
      status: source.status,
      intent: claimedIntent,
    });
  }
  if (
    typeof source.claimToken !== "string"
    || !SAFE_IDENTIFIER.test(source.claimToken)
  ) {
    throw new TypeError("ACK intent claim result is invalid");
  }
  return Object.freeze({
    status: "claimed",
    claimToken: source.claimToken,
    intent: claimedIntent,
  });
}

function normalizeRenewal(value, claimToken, expectedIntent) {
  const renewal = exactObject(
    value,
    "ACK intent renewal result",
    RENEWAL_FIELDS,
  );
  exactSnapshotFields(
    renewal,
    RENEWAL_FIELDS,
    "ACK intent renewal result",
  );
  const renewedIntent = normalizeIntent(renewal.intent);
  if (
    renewal.status !== "renewed"
    || renewal.claimToken !== claimToken
    || renewedIntent.state !== "claimed"
    || !sameIntentIdentity(renewedIntent, expectedIntent)
  ) {
    throw new TypeError("ACK intent renewal result is invalid");
  }
  return Object.freeze({
    status: "renewed",
    claimToken,
    intent: renewedIntent,
  });
}

function normalizeStatus(value, allowed, label) {
  const result = exactObject(value, label, new Set(["status"]));
  exactSnapshotFields(result, new Set(["status"]), label);
  if (!allowed.has(result.status)) {
    throw new TypeError(`${label} is invalid`);
  }
  return result.status;
}

function normalizeSummary(value) {
  const summary = exactObject(
    value,
    "ACK reconciliation summary",
    SUMMARY_FIELDS,
  );
  exactSnapshotFields(
    summary,
    SUMMARY_FIELDS,
    "ACK reconciliation summary",
  );
  for (const field of [
    "total",
    "pending",
    "claimed",
    "deferred",
    "committed",
    "recoveryRequired",
  ]) {
    nonNegativeInteger(summary[field], `summary.${field}`);
  }
  const proofs = exactObject(
    summary.proofs,
    "ACK reconciliation proof summary",
    PROOF_FIELDS,
  );
  exactSnapshotFields(
    proofs,
    PROOF_FIELDS,
    "ACK reconciliation proof summary",
  );
  for (const field of PROOF_FIELDS) {
    nonNegativeInteger(proofs[field], `summary.proofs.${field}`);
  }
  return Object.freeze({
    total: summary.total,
    pending: summary.pending,
    claimed: summary.claimed,
    deferred: summary.deferred,
    committed: summary.committed,
    recoveryRequired: summary.recoveryRequired,
    proofs: Object.freeze({
      DIRECT_ACK: proofs.DIRECT_ACK,
      ACK_TOMBSTONE: proofs.ACK_TOMBSTONE,
      ORPHAN_ACK: proofs.ORPHAN_ACK,
    }),
  });
}

export function createCoordinationAckReconciler({
  repository,
  transport,
  clock = () => Date.now(),
  fault = () => {},
  config: providedConfig = {},
} = {}) {
  assertDependencies({
    repository,
    transport,
    clock,
    fault,
  });
  const config = normalizeConfig(providedConfig);

  function ownedInput(intent, claimToken, now) {
    return {
      consumeKey: intent.consumeKey,
      deliveryId: intent.deliveryId,
      ownerId: config.ownerId,
      claimToken,
      now,
    };
  }

  function injectFault(point, intent, outcome) {
    try {
      fault(point, Object.freeze({
        consumeKey: intent.consumeKey,
        deliveryId: intent.deliveryId,
        outcome,
      }));
    } catch {
      throw reconciliationError("COORDINATION_ACK_RECONCILIATION_FAULT");
    }
  }

  async function commit(intent, claimToken, operation) {
    const now = safeNow(clock);
    try {
      const result = await repository[operation]({
        ...ownedInput(intent, claimToken, now),
      });
      normalizeStatus(
        result,
        new Set(["committed"]),
        "ACK intent commit result",
      );
    } catch {
      throw reconciliationError("COORDINATION_ACK_RECONCILIATION_FAILED");
    }
  }

  async function defer(intent, claimToken, reasonCode) {
    const now = safeNow(clock);
    const retryAt = safeFuture(now, config.deferMs);
    try {
      const result = await repository.defer({
        ...ownedInput(intent, claimToken, now),
        reasonCode,
        retryAt,
      });
      normalizeStatus(
        result,
        new Set(["deferred"]),
        "ACK intent defer result",
      );
    } catch {
      throw reconciliationError("COORDINATION_ACK_RECONCILIATION_FAILED");
    }
  }

  async function markRecoveryRequired(intent, claimToken) {
    const now = safeNow(clock);
    try {
      const result = await repository.markAckRecoveryRequired({
        ...ownedInput(intent, claimToken, now),
        reasonCode: "TRANSPORT_STATE_UNKNOWN",
      });
      normalizeStatus(
        result,
        new Set(["recovery_required"]),
        "ACK intent recovery result",
      );
    } catch {
      throw reconciliationError("COORDINATION_ACK_RECONCILIATION_FAILED");
    }
  }

  async function reconcile(rawOptions = {}) {
    let options;
    try {
      options = exactObject(
        rawOptions,
        "reconciliation options",
        RECONCILE_FIELDS,
      );
    } catch {
      throw reconciliationError("COORDINATION_ACK_RECONCILIATION_INVALID");
    }
    const cursor = options.cursor ?? null;
    if (
      cursor !== null
      && (
        typeof cursor !== "string"
        || cursor.length > 256
      )
    ) {
      throw reconciliationError("COORDINATION_ACK_RECONCILIATION_INVALID");
    }
    const listNow = safeNow(clock);
    let page;
    try {
      page = normalizePage(await repository.list({
        cursor,
        limit: config.limit,
        now: listNow,
      }), config.limit);
    } catch {
      throw reconciliationError("COORDINATION_ACK_RECONCILIATION_FAILED");
    }
    const counters = {
      inspected: page.intents.length,
      claimed: 0,
      busy: 0,
      committed: 0,
      deferred: 0,
      recoveryRequired: 0,
    };

    for (const intent of page.intents) {
      const claimNow = safeNow(clock);
      let claim;
      try {
        claim = normalizeClaim(
          await repository.claim({
            consumeKey: intent.consumeKey,
            deliveryId: intent.deliveryId,
            ownerId: config.ownerId,
            now: claimNow,
            leaseMs: config.claimLeaseMs,
          }),
          intent,
        );
      } catch {
        throw reconciliationError("COORDINATION_ACK_RECONCILIATION_FAILED");
      }
      if (claim.status === "busy") {
        counters.busy += 1;
        continue;
      }
      if ([
        "not_due",
        "committed",
        "recovery_required",
      ].includes(claim.status)) {
        continue;
      }
      counters.claimed += 1;
      const claimToken = claim.claimToken;
      const identity = transportIdentity(intent);
      let tombstoneResult;
      try {
        tombstoneResult = await transport.inspectAckTombstone(identity);
      } catch (error) {
        if (isDependencyContractFailure(error)) {
          throw reconciliationError(
            "COORDINATION_ACK_RECONCILIATION_FAILED",
          );
        }
        await defer(intent, claimToken, "TRANSPORT_UNAVAILABLE");
        counters.deferred += 1;
        continue;
      }
      let tombstoneStatus;
      try {
        tombstoneStatus = normalizeStatus(
          tombstoneResult,
          new Set([
            "ack_tombstone",
            "absent",
            "transport_state_unknown",
          ]),
          "ACK tombstone inspection result",
        );
      } catch {
        throw reconciliationError("COORDINATION_ACK_RECONCILIATION_FAILED");
      }
      if (tombstoneStatus === "ack_tombstone") {
        await commit(intent, claimToken, "commitTombstone");
        counters.committed += 1;
        continue;
      }
      if (tombstoneStatus === "transport_state_unknown") {
        await markRecoveryRequired(intent, claimToken);
        counters.recoveryRequired += 1;
        continue;
      }

      const renewalNow = safeNow(clock);
      try {
        const renewal = await repository.renew({
          ...ownedInput(intent, claimToken, renewalNow),
          leaseMs: config.claimLeaseMs,
        });
        normalizeRenewal(renewal, claimToken, claim.intent);
      } catch {
        throw reconciliationError("COORDINATION_ACK_RECONCILIATION_FAILED");
      }
      let finalResult;
      try {
        finalResult = await transport.finalizeOrphanAck({
          ...identity,
          tombstoneTtlMs: config.tombstoneTtlMs,
        });
      } catch (error) {
        if (isDependencyContractFailure(error)) {
          throw reconciliationError(
            "COORDINATION_ACK_RECONCILIATION_FAILED",
          );
        }
        await defer(intent, claimToken, "TRANSPORT_UNAVAILABLE");
        counters.deferred += 1;
        continue;
      }
      let finalStatus;
      try {
        finalStatus = normalizeStatus(
          finalResult,
          new Set([
            "ack_tombstone",
            "old_participant_present",
            "orphan_acked",
            "transport_state_unknown",
          ]),
          "orphan ACK finalization result",
        );
      } catch {
        throw reconciliationError("COORDINATION_ACK_RECONCILIATION_FAILED");
      }
      injectFault("afterFinalize", intent, finalStatus);
      if (finalStatus === "ack_tombstone") {
        await commit(intent, claimToken, "commitTombstone");
        counters.committed += 1;
      } else if (finalStatus === "orphan_acked") {
        await commit(intent, claimToken, "commitOrphan");
        counters.committed += 1;
      } else if (finalStatus === "old_participant_present") {
        await defer(intent, claimToken, "OLD_PARTICIPANT_PRESENT");
        counters.deferred += 1;
      } else {
        await markRecoveryRequired(intent, claimToken);
        counters.recoveryRequired += 1;
      }
    }

    return Object.freeze({
      status: counters.recoveryRequired > 0
        ? "recovery_required"
        : "reconciled",
      ...counters,
      nextCursor: page.nextCursor,
    });
  }

  async function getSummary() {
    try {
      return normalizeSummary(
        await repository.getAckReconciliationSummary(),
      );
    } catch {
      throw reconciliationError("COORDINATION_ACK_RECONCILIATION_FAILED");
    }
  }

  return Object.freeze({
    reconcile,
    getSummary,
  });
}
