import crypto from "node:crypto";

const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const SAFE_CODE = /^[A-Z][A-Z0-9_]{1,127}$/;
const CONSUME_KEY = /^coord-consume-v1-[a-f0-9]{64}$/;
const DELIVERY_ID = /^(?:0|[1-9][0-9]*)-(?:0|[1-9][0-9]*)$/;
const RETRYABLE_CODES = new Set([
  "COORDINATION_UNAVAILABLE",
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);
const PUBLIC_EXTERNAL_ERROR_CODES = new Set([
  "COORDINATION_UNAVAILABLE",
  "COORDINATION_AUTH_FAILED",
  "COORDINATION_LEASE_EXPIRED",
  "COORDINATION_LEASE_CHANGED",
  "COORDINATION_DELIVERY_NOT_FOUND",
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);
const INTERNAL_ERROR_CODES = new Set([
  "COORDINATION_CONSUMER_ACK_CONTRACT_INVALID",
  "COORDINATION_CONSUMER_ACK_FAILED",
  "COORDINATION_CONSUMER_ACK_INTENT_BUSY",
  "COORDINATION_CONSUMER_ACK_RECOVERY_REQUIRED",
  "COORDINATION_CONSUMER_ALREADY_RUNNING",
  "COORDINATION_CONSUMER_CLOCK_INVALID",
  "COORDINATION_CONSUMER_DELIVERY_FAILED",
  "COORDINATION_CONSUMER_DELIVERY_INVALID",
  "COORDINATION_CONSUMER_FAILED",
  "COORDINATION_CONSUMER_FAULT",
  "COORDINATION_CONSUMER_HANDLER_CONTRACT_INVALID",
  "COORDINATION_CONSUMER_QUARANTINE_STORE_INVALID",
  "COORDINATION_CONSUMER_RECEIVE_FAILED",
  "COORDINATION_CONSUMER_REPLAY_CONFLICT",
  "COORDINATION_CONSUMER_REPLAY_DENIED",
  "COORDINATION_CONSUMER_REPLAY_FAILED",
  "COORDINATION_CONSUMER_REPLAY_HANDLER_FAILED",
  "COORDINATION_CONSUMER_REPLAY_MISMATCH",
  "COORDINATION_CONSUMER_REPLAY_NOT_FOUND",
  "COORDINATION_CONSUMER_REPLAY_SOURCE_UNAVAILABLE",
  "COORDINATION_CONSUMER_REPOSITORY_CONTRACT_INVALID",
  "COORDINATION_CONSUMER_RETRY_CONTRACT_INVALID",
  "COORDINATION_CONSUMER_SLEEP_FAILED",
]);
const QUARANTINE_REASON_CODES = new Set([
  "CONTEXT_MISMATCH",
  "HANDLER_TERMINAL",
  "MALFORMED_ENVELOPE",
  "RETRY_EXHAUSTED",
]);
const INTERNAL_ERRORS = new WeakSet();
const OPERATIONAL_LIMITS = Object.freeze({
  maxAttempts: 32,
  quarantineStoreMaxAttempts: 8,
  baseDelayMs: 300_000,
  maxDelayMs: 300_000,
  claimLeaseMs: 3_600_000,
  idleDelayMs: 30_000,
  blockMs: 30_000,
  reclaimIdleMs: 86_400_000,
  maxConsumedRecoveryIdsPerReceipt: 8,
});
const MESSAGE_FIELDS = new Set([
  "protocolVersion",
  "scopeId",
  "messageId",
  "fromParticipantId",
  "toParticipantId",
  "messageType",
  "classification",
  "body",
  "createdAt",
  "traceId",
  "correlationId",
  "replyToMessageId",
]);
const OPTIONAL_MESSAGE_FIELDS = [
  "traceId",
  "correlationId",
  "replyToMessageId",
];
const DEFAULT_CONFIG = Object.freeze({
  scopeId: undefined,
  participantId: undefined,
  consumerId: "coordination-consumer",
  ownerId: "coordination-consumer",
  claimLeaseMs: 30_000,
  maxAttempts: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
  quarantineStoreMaxAttempts: 2,
  idleDelayMs: 250,
  receiveCount: 1,
  reclaimIdleMs: 30_000,
  blockMs: 1_000,
  quarantineRecoveryId: null,
  maxConsumedRecoveryIdsPerReceipt: 4,
});

export class CoordinationConsumerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CoordinationConsumerError";
    this.code = code;
  }
}

function consumerError(code, message) {
  if (
    !INTERNAL_ERROR_CODES.has(code)
    && !PUBLIC_EXTERNAL_ERROR_CODES.has(code)
  ) {
    throw new TypeError("coordination consumer internal error code is invalid");
  }
  const error = new CoordinationConsumerError(code, message);
  INTERNAL_ERRORS.add(error);
  return error;
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

function safeIdentifier(value, label, { max = 256 } = {}) {
  if (
    typeof value !== "string"
    || value.length > max
    || !SAFE_IDENTIFIER.test(value)
  ) {
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

function safeNow(clock) {
  const now = clock();
  if (!Number.isSafeInteger(now) || now < 0) {
    throw consumerError(
      "COORDINATION_CONSUMER_CLOCK_INVALID",
      "coordination consumer clock returned an invalid value",
    );
  }
  return now;
}

function safeErrorCode(error, fallback = "COORDINATION_CONSUMER_FAILED") {
  const code = error?.code;
  return (
    typeof code === "string"
    && SAFE_CODE.test(code)
    && (
      (
        INTERNAL_ERRORS.has(error)
        && (
          INTERNAL_ERROR_CODES.has(code)
          || PUBLIC_EXTERNAL_ERROR_CODES.has(code)
        )
      )
      || PUBLIC_EXTERNAL_ERROR_CODES.has(code)
    )
  )
    ? code
    : fallback;
}

function safeFailure(error, fallback = "COORDINATION_CONSUMER_FAILED") {
  return consumerError(
    safeErrorCode(error, fallback),
    "coordination consumer operation failed safely",
  );
}

function isAbort(error, signal) {
  return signal?.aborted === true || error?.name === "AbortError";
}

function digest(parts) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(parts), "utf8")
    .digest("hex");
}

function canonicalIdentity(message) {
  const value = plainObject(message, "message");
  if (
    value.protocolVersion !== 1
    || typeof value.scopeId !== "string"
    || !SAFE_IDENTIFIER.test(value.scopeId)
    || typeof value.fromParticipantId !== "string"
    || !SAFE_IDENTIFIER.test(value.fromParticipantId)
    || typeof value.toParticipantId !== "string"
    || !SAFE_IDENTIFIER.test(value.toParticipantId)
    || typeof value.messageId !== "string"
    || !SAFE_IDENTIFIER.test(value.messageId)
  ) {
    throw new TypeError("message does not have a canonical consume identity");
  }
  return [
    1,
    value.scopeId,
    value.fromParticipantId,
    value.toParticipantId,
    value.messageId,
  ];
}

export function coordinationConsumeKey(message) {
  return `coord-consume-v1-${digest(canonicalIdentity(message))}`;
}

function fallbackConsumeKey(deliveryId, message) {
  const source = message && typeof message === "object" && !Array.isArray(message)
    ? message
    : {};
  const safePart = (value) => (
    typeof value === "string" && SAFE_IDENTIFIER.test(value) ? value : ""
  );
  return `coord-consume-v1-${digest([
    "malformed",
    deliveryId,
    safePart(source.scopeId),
    safePart(source.fromParticipantId),
    safePart(source.toParticipantId),
    safePart(source.messageId),
  ])}`;
}

function safeMetadata(message, malformed) {
  const source = message && typeof message === "object" && !Array.isArray(message)
    ? message
    : {};
  const safePart = (value, fallback) => (
    typeof value === "string" && SAFE_IDENTIFIER.test(value) ? value : fallback
  );
  const result = {
    protocolVersion: Number.isSafeInteger(source.protocolVersion)
      ? source.protocolVersion
      : 0,
    scopeId: safePart(source.scopeId, "invalid-scope"),
    messageId: safePart(source.messageId, "invalid-message"),
    fromParticipantId: safePart(source.fromParticipantId, "invalid-sender"),
    toParticipantId: safePart(source.toParticipantId, "invalid-recipient"),
    messageType: safePart(source.messageType, "invalid-type"),
    classification: safePart(source.classification, "invalid-classification"),
    createdAt: (
      typeof source.createdAt === "string"
      && source.createdAt.length <= 64
      && Number.isFinite(Date.parse(source.createdAt))
    )
      ? source.createdAt
      : "1970-01-01T00:00:00.000Z",
    ...(malformed ? { malformed: true } : {}),
  };
  for (const field of OPTIONAL_MESSAGE_FIELDS) {
    if (
      typeof source[field] === "string"
      && source[field].length <= 128
      && SAFE_IDENTIFIER.test(source[field])
    ) {
      result[field] = source[field];
    }
  }
  return Object.freeze(result);
}

function normalizeDelivery(value) {
  const source = plainObject(value, "delivery");
  if (
    typeof source.deliveryId !== "string"
    || source.deliveryId.length > 128
    || !DELIVERY_ID.test(source.deliveryId)
  ) {
    throw consumerError(
      "COORDINATION_CONSUMER_DELIVERY_INVALID",
      "coordination consumer delivery is invalid",
    );
  }
  if (typeof source.recovered !== "boolean") {
    throw consumerError(
      "COORDINATION_CONSUMER_DELIVERY_INVALID",
      "coordination consumer delivery is invalid",
    );
  }
  const message = source.message;
  let malformed = false;
  try {
    const candidate = plainObject(message, "message");
    if (
      Object.keys(candidate).some((field) => !MESSAGE_FIELDS.has(field))
      || candidate.protocolVersion !== 1
      || typeof candidate.messageType !== "string"
      || !SAFE_IDENTIFIER.test(candidate.messageType)
      || !["unrestricted", "internal"].includes(candidate.classification)
      || typeof candidate.body !== "string"
      || typeof candidate.createdAt !== "string"
      || !Number.isFinite(Date.parse(candidate.createdAt))
      || OPTIONAL_MESSAGE_FIELDS.some((field) => (
        candidate[field] !== undefined
        && (
          typeof candidate[field] !== "string"
          || candidate[field].length > 128
          || !SAFE_IDENTIFIER.test(candidate[field])
        )
      ))
    ) {
      malformed = true;
    }
    canonicalIdentity(candidate);
  } catch {
    malformed = true;
  }
  let clonedMessage = null;
  try {
    clonedMessage = structuredClone(message);
  } catch {
    malformed = true;
  }
  let resolvedConsumeKey;
  if (malformed) {
    resolvedConsumeKey = fallbackConsumeKey(source.deliveryId, message);
  } else {
    resolvedConsumeKey = coordinationConsumeKey(message);
  }
  return Object.freeze({
    deliveryId: source.deliveryId,
    recovered: source.recovered,
    consumeKey: resolvedConsumeKey,
    metadata: safeMetadata(message, malformed),
    body: typeof message?.body === "string" ? message.body : null,
    message: clonedMessage,
    malformed,
  });
}

function assertDependencies({
  transport,
  repository,
  handler,
  quarantineStore,
  authorizeReplay,
  clock,
  sleep,
  audit,
  metrics,
  fault,
}) {
  for (const operation of ["receive", "ack"]) {
    if (typeof transport?.[operation] !== "function") {
      throw new TypeError(`transport.${operation} must be a function`);
    }
  }
  for (const operation of [
    "claim",
    "recordAttempt",
    "commitEffect",
    "commitQuarantine",
    "blockQuarantine",
    "claimBlockedQuarantine",
    "releaseClaim",
    "prepareAck",
    "getQuarantine",
    "beginReplay",
    "commitReplay",
    "failReplay",
  ]) {
    if (typeof repository?.[operation] !== "function") {
      throw new TypeError(`repository.${operation} must be a function`);
    }
  }
  for (const operation of ["claim", "commit", "defer"]) {
    if (typeof repository?.directAck?.[operation] !== "function") {
      throw new TypeError(
        `repository.directAck.${operation} must be a function`,
      );
    }
  }
  if (typeof handler !== "function") throw new TypeError("handler must be a function");
  for (const operation of ["put", "get"]) {
    if (typeof quarantineStore?.[operation] !== "function") {
      throw new TypeError(`quarantineStore.${operation} must be a function`);
    }
  }
  if (authorizeReplay !== undefined && typeof authorizeReplay !== "function") {
    throw new TypeError("authorizeReplay must be a function");
  }
  for (const [name, dependency] of [
    ["clock", clock],
    ["sleep", sleep],
    ["audit", audit],
    ["metrics", metrics],
    ["fault", fault],
  ]) {
    if (typeof dependency !== "function") {
      throw new TypeError(`${name} must be a function`);
    }
  }
}

function normalizeConfig(provided) {
  const value = { ...DEFAULT_CONFIG, ...plainObject(provided, "config") };
  const known = new Set(Object.keys(DEFAULT_CONFIG));
  for (const key of Object.keys(provided)) {
    if (!known.has(key)) throw new TypeError(`config contains unsupported field ${key}`);
  }
  safeIdentifier(value.scopeId, "config.scopeId", { max: 128 });
  safeIdentifier(value.participantId, "config.participantId", { max: 128 });
  safeIdentifier(value.consumerId, "config.consumerId", { max: 128 });
  safeIdentifier(value.ownerId, "config.ownerId", { max: 128 });
  if (value.quarantineRecoveryId !== null) {
    safeIdentifier(
      value.quarantineRecoveryId,
      "config.quarantineRecoveryId",
      { max: 128 },
    );
  }
  for (const key of [
    "claimLeaseMs",
    "maxAttempts",
    "baseDelayMs",
    "maxDelayMs",
    "quarantineStoreMaxAttempts",
    "idleDelayMs",
    "receiveCount",
    "blockMs",
    "maxConsumedRecoveryIdsPerReceipt",
  ]) {
    positiveInteger(value[key], `config.${key}`);
  }
  nonNegativeInteger(value.reclaimIdleMs, "config.reclaimIdleMs");
  if (value.baseDelayMs > value.maxDelayMs) {
    throw new TypeError("config.baseDelayMs must not exceed config.maxDelayMs");
  }
  if (value.receiveCount > 100) {
    throw new TypeError("config.receiveCount must not exceed 100");
  }
  for (const [key, maximum] of Object.entries(OPERATIONAL_LIMITS)) {
    if (value[key] > maximum) {
      throw new TypeError(`config.${key} must not exceed ${maximum}`);
    }
  }
  return Object.freeze(value);
}

function retryDelay(config, failedAttempt) {
  const exponent = Math.min(failedAttempt - 1, 52);
  return Math.min(
    config.maxDelayMs,
    config.baseDelayMs * (2 ** exponent),
  );
}

function classifyRetry(error) {
  return RETRYABLE_CODES.has(safeErrorCode(error)) ? "retryable" : "permanent";
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function defaultSleep(delayMs, { signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
      return;
    }
    let timer = null;
    const cleanup = () => {
      if (timer !== null) globalThis.clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    timer = globalThis.setTimeout(() => {
      cleanup();
      resolve();
    }, delayMs);
  });
}

function safeObservation(projector, event) {
  let observation;
  try {
    observation = projector(deepFreeze(structuredClone(event)));
  } catch {
    // Observability is body-free, best effort, and never authoritative.
    return;
  }
  if (
    observation === null
    || (
      typeof observation !== "object"
      && typeof observation !== "function"
    )
  ) {
    return;
  }
  try {
    const consumed = new Promise((resolve) => {
      resolve(observation);
    });
    void consumed.then(undefined, () => {});
  } catch {
    // Hostile thenables cannot affect the authoritative operation.
  }
}

function committedHandlerResult(value) {
  const result = plainObject(value, "handler result");
  if (
    result.status !== "committed"
    || typeof result.commitId !== "string"
    || !SAFE_IDENTIFIER.test(result.commitId)
  ) {
    throw consumerError(
      "COORDINATION_CONSUMER_HANDLER_CONTRACT_INVALID",
      "coordination consumer handler returned an invalid result",
    );
  }
  return Object.freeze({
    status: "committed",
    commitId: result.commitId,
  });
}

function safeLocator(value) {
  const result = plainObject(value, "quarantine store result");
  const keys = Object.keys(result);
  if (
    keys.length !== 1
    || keys[0] !== "locator"
    || typeof result.locator !== "string"
    || !SAFE_IDENTIFIER.test(result.locator)
  ) {
    throw consumerError(
      "COORDINATION_CONSUMER_QUARANTINE_STORE_INVALID",
      "coordination consumer quarantine store returned an invalid locator",
    );
  }
  return result.locator;
}

function quarantineIdFor(consumeKey) {
  return `coord-quarantine-${digest(["quarantine", consumeKey])}`;
}

export function createCoordinationConsumer({
  transport,
  repository,
  handler,
  quarantineStore,
  authorizeReplay,
  clock = () => Date.now(),
  sleep = defaultSleep,
  audit = () => {},
  metrics = () => {},
  fault = () => {},
  retryClassifier = classifyRetry,
  config: providedConfig = {},
} = {}) {
  assertDependencies({
    transport,
    repository,
    handler,
    quarantineStore,
    authorizeReplay,
    clock,
    sleep,
    audit,
    metrics,
    fault,
  });
  if (typeof retryClassifier !== "function") {
    throw new TypeError("retryClassifier must be a function");
  }
  const config = normalizeConfig(providedConfig);
  const counters = {
    processed: 0,
    duplicates: 0,
    quarantined: 0,
    retries: 0,
    acked: 0,
    blocked: 0,
    failures: 0,
    replayed: 0,
  };
  let state = "idle";
  let inFlight = false;
  let lastError = null;
  let running = false;

  function setLastError(error, fallback) {
    lastError = Object.freeze({
      code: safeErrorCode(error, fallback),
    });
  }

  function getStatus() {
    return deepFreeze({
      state,
      inFlight,
      lastError,
      counters: { ...counters },
    });
  }

  function incrementCounter(name) {
    counters[name] = Math.min(
      Number.MAX_SAFE_INTEGER,
      counters[name] + 1,
    );
  }

  function injectFault(point, context) {
    try {
      fault(point, deepFreeze(structuredClone(context)));
    } catch (error) {
      throw safeFailure(error, "COORDINATION_CONSUMER_FAULT");
    }
  }

  async function releaseClaim(consumeKey, claimToken) {
    try {
      await repository.releaseClaim({
        consumeKey,
        ownerId: config.ownerId,
        claimToken,
        now: safeNow(clock),
      });
    } catch {
      // A replacement claim is authoritative; stale cleanup cannot change it.
    }
  }

  async function acknowledge(resolved, status) {
    const prepared = await repository.prepareAck({
      consumeKey: resolved.consumeKey,
      deliveryId: resolved.deliveryId,
      now: safeNow(clock),
    });
    if (prepared?.status === "acked") return;
    if (prepared?.status === "recovery_required") {
      throw consumerError(
        "COORDINATION_CONSUMER_ACK_RECOVERY_REQUIRED",
        "coordination consumer ACK requires explicit recovery",
      );
    }
    if (prepared?.status !== "pending") {
      throw consumerError(
        "COORDINATION_CONSUMER_REPOSITORY_CONTRACT_INVALID",
        "coordination consumer repository returned an invalid ACK intent",
      );
    }
    const ackClaim = await repository.directAck.claim({
      consumeKey: resolved.consumeKey,
      deliveryId: resolved.deliveryId,
      ownerId: config.ownerId,
      now: safeNow(clock),
      leaseMs: config.claimLeaseMs,
    });
    if (ackClaim?.status === "committed") return;
    if (ackClaim?.status === "busy") {
      throw consumerError(
        "COORDINATION_CONSUMER_ACK_INTENT_BUSY",
        "coordination consumer ACK intent is already claimed",
      );
    }
    if (ackClaim?.status === "recovery_required") {
      throw consumerError(
        "COORDINATION_CONSUMER_ACK_RECOVERY_REQUIRED",
        "coordination consumer ACK requires explicit recovery",
      );
    }
    if (
      ackClaim?.status !== "claimed"
      || typeof ackClaim.claimToken !== "string"
      || !SAFE_IDENTIFIER.test(ackClaim.claimToken)
    ) {
      throw consumerError(
        "COORDINATION_CONSUMER_REPOSITORY_CONTRACT_INVALID",
        "coordination consumer repository returned an invalid ACK claim",
      );
    }
    const ackClaimToken = ackClaim.claimToken;
    const deferAck = async (reasonCode) => {
      const now = safeNow(clock);
      const retryAt = now + config.baseDelayMs;
      if (!Number.isSafeInteger(retryAt)) {
        throw consumerError(
          "COORDINATION_CONSUMER_CLOCK_INVALID",
          "coordination consumer ACK retry time is invalid",
        );
      }
      await repository.directAck.defer({
        consumeKey: resolved.consumeKey,
        deliveryId: resolved.deliveryId,
        ownerId: config.ownerId,
        claimToken: ackClaimToken,
        reasonCode,
        retryAt,
        now,
      });
    };
    injectFault("beforeAck", {
      consumeKey: resolved.consumeKey,
      deliveryId: resolved.deliveryId,
    });
    let result;
    try {
      result = await transport.ack({
        deliveryIds: [resolved.deliveryId],
      });
    } catch (error) {
      await deferAck("ACK_TRANSPORT_FAILED");
      incrementCounter("failures");
      setLastError(error, "COORDINATION_CONSUMER_ACK_FAILED");
      throw safeFailure(error, "COORDINATION_CONSUMER_ACK_FAILED");
    }
    if (
      !result
      || typeof result !== "object"
      || !Number.isSafeInteger(result.ackedCount)
      || result.ackedCount < 0
      || result.ackedCount > 1
      || !Array.isArray(result.deliveryIds)
      || result.deliveryIds.length !== 1
      || result.deliveryIds[0] !== resolved.deliveryId
    ) {
      await deferAck("ACK_CONTRACT_INVALID");
      throw consumerError(
        "COORDINATION_CONSUMER_ACK_CONTRACT_INVALID",
        "coordination consumer transport returned an invalid ACK",
      );
    }
    injectFault("afterAck", {
      consumeKey: resolved.consumeKey,
      deliveryId: resolved.deliveryId,
    });
    const committed = await repository.directAck.commit({
      consumeKey: resolved.consumeKey,
      deliveryId: resolved.deliveryId,
      ownerId: config.ownerId,
      claimToken: ackClaimToken,
      now: safeNow(clock),
    });
    if (committed?.status !== "committed") {
      throw consumerError(
        "COORDINATION_CONSUMER_REPOSITORY_CONTRACT_INVALID",
        "coordination consumer repository rejected ACK confirmation",
      );
    }
    incrementCounter("acked");
    safeObservation(audit, {
      type: "COORDINATION_CONSUMER_ACKED",
      consumeKey: resolved.consumeKey,
      deliveryId: resolved.deliveryId,
      outcome: status,
    });
  }

  function pausedQuarantine(resolved) {
    state = "degraded";
    lastError = Object.freeze({
      code: "COORDINATION_CONSUMER_QUARANTINE_BLOCKED",
    });
    return Object.freeze({
      status: "paused",
      consumeKey: resolved.consumeKey,
    });
  }

  async function blockQuarantine(resolved, claimToken, reasonCode) {
    await repository.blockQuarantine({
      consumeKey: resolved.consumeKey,
      ownerId: config.ownerId,
      claimToken,
      reasonCode,
      now: safeNow(clock),
    });
    incrementCounter("blocked");
    incrementCounter("failures");
    safeObservation(audit, {
      type: "COORDINATION_CONSUMER_QUARANTINE_BLOCKED",
      consumeKey: resolved.consumeKey,
      deliveryId: resolved.deliveryId,
      reasonCode: "QUARANTINE_STORE_UNAVAILABLE",
    });
    safeObservation(metrics, {
      type: "COORDINATION_CONSUMER_QUARANTINE_BLOCKED",
      count: 1,
    });
    return pausedQuarantine(resolved);
  }

  async function quarantine(resolved, claimToken, reasonCode, { signal } = {}) {
    let locator = null;
    for (
      let storageAttempt = 1;
      storageAttempt <= config.quarantineStoreMaxAttempts;
      storageAttempt += 1
    ) {
      if (signal?.aborted) {
        await releaseClaim(resolved.consumeKey, claimToken);
        state = "stopped";
        return Object.freeze({
          status: "stopped",
          consumeKey: resolved.consumeKey,
        });
      }
      try {
        locator = safeLocator(await quarantineStore.put({
          consumeKey: resolved.consumeKey,
          body: resolved.body,
        }));
        break;
      } catch (_error) {
        if (storageAttempt === config.quarantineStoreMaxAttempts) {
          return blockQuarantine(resolved, claimToken, reasonCode);
        }
        try {
          await sleep(retryDelay(config, storageAttempt), { signal });
        } catch (sleepError) {
          if (isAbort(sleepError, signal)) {
            await releaseClaim(resolved.consumeKey, claimToken);
            state = "stopped";
            return Object.freeze({
              status: "stopped",
              consumeKey: resolved.consumeKey,
            });
          }
          return blockQuarantine(resolved, claimToken, reasonCode);
        }
      }
    }
    const quarantineId = quarantineIdFor(resolved.consumeKey);
    await repository.commitQuarantine({
      consumeKey: resolved.consumeKey,
      ownerId: config.ownerId,
      claimToken,
      quarantineId,
      locator,
      reasonCode,
      now: safeNow(clock),
    });
    injectFault("afterReceipt", {
      consumeKey: resolved.consumeKey,
      deliveryId: resolved.deliveryId,
      outcome: "quarantine",
    });
    await acknowledge(resolved, "quarantined");
    incrementCounter("quarantined");
    safeObservation(audit, {
      type: "COORDINATION_CONSUMER_QUARANTINED",
      consumeKey: resolved.consumeKey,
      deliveryId: resolved.deliveryId,
      quarantineId,
      reasonCode,
    });
    safeObservation(metrics, {
      type: "COORDINATION_CONSUMER_QUARANTINED",
      count: 1,
      reasonCode,
    });
    return Object.freeze({
      status: "quarantined",
      consumeKey: resolved.consumeKey,
      quarantineId,
    });
  }

  async function processDelivery(rawDelivery, { signal } = {}) {
    const resolved = normalizeDelivery(rawDelivery);
    if (signal?.aborted) {
      state = "stopped";
      return Object.freeze({
        status: "stopped",
        consumeKey: resolved.consumeKey,
      });
    }
    inFlight = true;
    try {
      const claimed = await repository.claim({
        consumeKey: resolved.consumeKey,
        deliveryId: resolved.deliveryId,
        recovered: resolved.recovered,
        metadata: resolved.metadata,
        ownerId: config.ownerId,
        now: safeNow(clock),
        leaseMs: config.claimLeaseMs,
        maxConsumedRecoveryIdsPerReceipt:
          config.maxConsumedRecoveryIdsPerReceipt,
      });
      if (claimed?.status === "blocked") {
        if (config.quarantineRecoveryId === null) {
          return pausedQuarantine(resolved);
        }
        const recoveryClaim = await repository.claimBlockedQuarantine({
          consumeKey: resolved.consumeKey,
          ownerId: config.ownerId,
          recoveryId: config.quarantineRecoveryId,
          now: safeNow(clock),
          leaseMs: config.claimLeaseMs,
        });
        if (
          recoveryClaim?.status === "committed"
          || recoveryClaim?.status === "quarantined"
        ) {
          await acknowledge(resolved, recoveryClaim.status);
          incrementCounter("duplicates");
          return Object.freeze({
            status: "duplicate",
            consumeKey: resolved.consumeKey,
          });
        }
        if (
          recoveryClaim?.status === "blocked"
          || recoveryClaim?.status === "busy"
        ) {
          return pausedQuarantine(resolved);
        }
        const recoveryReasonCode =
          recoveryClaim?.receipt?.quarantine?.reasonCode;
        if (
          recoveryClaim?.status !== "claimed"
          || typeof recoveryClaim.claimToken !== "string"
          || !SAFE_IDENTIFIER.test(recoveryClaim.claimToken)
          || !QUARANTINE_REASON_CODES.has(recoveryReasonCode)
        ) {
          throw consumerError(
            "COORDINATION_CONSUMER_REPOSITORY_CONTRACT_INVALID",
            "coordination consumer repository returned an invalid recovery claim",
          );
        }
        return await quarantine(
          resolved,
          recoveryClaim.claimToken,
          recoveryReasonCode,
          { signal },
        );
      }
      if (claimed?.status === "busy") {
        return Object.freeze({
          status: "busy",
          consumeKey: resolved.consumeKey,
        });
      }
      if (
        claimed?.status === "committed"
        || claimed?.status === "quarantined"
      ) {
        await acknowledge(resolved, claimed.status);
        incrementCounter("duplicates");
        return Object.freeze({
          status: "duplicate",
          consumeKey: resolved.consumeKey,
        });
      }
      if (
        claimed?.status !== "claimed"
        || typeof claimed.claimToken !== "string"
        || !SAFE_IDENTIFIER.test(claimed.claimToken)
      ) {
        throw consumerError(
          "COORDINATION_CONSUMER_REPOSITORY_CONTRACT_INVALID",
          "coordination consumer repository returned an invalid claim",
        );
      }
      const claimToken = claimed.claimToken;
      injectFault("afterClaim", {
        consumeKey: resolved.consumeKey,
        deliveryId: resolved.deliveryId,
      });
      if (
        resolved.malformed
        || resolved.metadata.scopeId !== config.scopeId
        || resolved.metadata.toParticipantId !== config.participantId
      ) {
        return await quarantine(
          resolved,
          claimToken,
          resolved.malformed ? "MALFORMED_ENVELOPE" : "CONTEXT_MISMATCH",
          { signal },
        );
      }

      let attempt = claimed.receipt.attempts;
      while (attempt < config.maxAttempts) {
        attempt += 1;
        await repository.recordAttempt({
          consumeKey: resolved.consumeKey,
          ownerId: config.ownerId,
          claimToken,
          now: safeNow(clock),
          leaseMs: config.claimLeaseMs,
        });
        if (signal?.aborted) {
          await releaseClaim(resolved.consumeKey, claimToken);
          state = "stopped";
          return Object.freeze({
            status: "stopped",
            consumeKey: resolved.consumeKey,
          });
        }
        injectFault("beforeEffect", {
          consumeKey: resolved.consumeKey,
          deliveryId: resolved.deliveryId,
          attempt,
        });
        let result;
        try {
          result = committedHandlerResult(await handler({
            consumeKey: resolved.consumeKey,
            message: structuredClone(resolved.message),
            signal,
          }));
        } catch (error) {
          if (isAbort(error, signal)) {
            await releaseClaim(resolved.consumeKey, claimToken);
            state = "stopped";
            return Object.freeze({
              status: "stopped",
              consumeKey: resolved.consumeKey,
            });
          }
          const classification = retryClassifier(error);
          if (!["retryable", "permanent"].includes(classification)) {
            await releaseClaim(resolved.consumeKey, claimToken);
            throw consumerError(
              "COORDINATION_CONSUMER_RETRY_CONTRACT_INVALID",
              "coordination consumer retry classifier returned an invalid result",
            );
          }
          if (classification === "retryable" && attempt < config.maxAttempts) {
            incrementCounter("retries");
            const delayMs = retryDelay(config, attempt);
            safeObservation(metrics, {
              type: "COORDINATION_CONSUMER_RETRY",
              count: 1,
              attempt,
              delayMs,
              reasonCode: safeErrorCode(error),
            });
            try {
              await sleep(delayMs, { signal });
            } catch (sleepError) {
              if (isAbort(sleepError, signal)) {
                await releaseClaim(resolved.consumeKey, claimToken);
                state = "stopped";
                return Object.freeze({
                  status: "stopped",
                  consumeKey: resolved.consumeKey,
                });
              }
              await releaseClaim(resolved.consumeKey, claimToken);
              throw safeFailure(
                sleepError,
                "COORDINATION_CONSUMER_SLEEP_FAILED",
              );
            }
            continue;
          }
          return await quarantine(
            resolved,
            claimToken,
            classification === "retryable"
              ? "RETRY_EXHAUSTED"
              : "HANDLER_TERMINAL",
            { signal },
          );
        }
        injectFault("afterEffect", {
          consumeKey: resolved.consumeKey,
          deliveryId: resolved.deliveryId,
          attempt,
          commitId: result.commitId,
        });
        await repository.commitEffect({
          consumeKey: resolved.consumeKey,
          ownerId: config.ownerId,
          claimToken,
          commitId: result.commitId,
          now: safeNow(clock),
        });
        injectFault("afterReceipt", {
          consumeKey: resolved.consumeKey,
          deliveryId: resolved.deliveryId,
          outcome: "effect",
        });
        await acknowledge(resolved, "committed");
        incrementCounter("processed");
        safeObservation(audit, {
          type: "COORDINATION_CONSUMER_PROCESSED",
          consumeKey: resolved.consumeKey,
          deliveryId: resolved.deliveryId,
          attempts: attempt,
        });
        safeObservation(metrics, {
          type: "COORDINATION_CONSUMER_PROCESSED",
          count: 1,
        });
        return Object.freeze({
          status: "processed",
          consumeKey: resolved.consumeKey,
        });
      }
      return await quarantine(
        resolved,
        claimToken,
        "RETRY_EXHAUSTED",
        { signal },
      );
    } catch (error) {
      throw safeFailure(
        error,
        "COORDINATION_CONSUMER_DELIVERY_FAILED",
      );
    } finally {
      inFlight = false;
    }
  }

  async function run({ signal } = {}) {
    if (running) {
      throw consumerError(
        "COORDINATION_CONSUMER_ALREADY_RUNNING",
        "coordination consumer runner is already active",
      );
    }
    if (signal?.aborted) {
      state = "stopped";
      return getStatus();
    }
    running = true;
    state = "running";
    lastError = null;
    try {
      while (!signal?.aborted) {
        let deliveries;
        try {
          deliveries = await transport.receive({
            consumerId: config.consumerId,
            count: config.receiveCount,
            reclaimIdleMs: config.reclaimIdleMs,
            blockMs: config.blockMs,
          }, { signal });
        } catch (error) {
          if (isAbort(error, signal)) {
            state = "stopped";
            return getStatus();
          }
          incrementCounter("failures");
          setLastError(error, "COORDINATION_CONSUMER_RECEIVE_FAILED");
          state = "degraded";
          return getStatus();
        }
        if (
          !Array.isArray(deliveries)
          || deliveries.length > config.receiveCount
        ) {
          incrementCounter("failures");
          lastError = Object.freeze({
            code: "COORDINATION_CONSUMER_RECEIVE_CONTRACT_INVALID",
          });
          state = "degraded";
          return getStatus();
        }
        if (deliveries.length === 0) {
          try {
            await sleep(config.idleDelayMs, { signal });
          } catch (error) {
            if (isAbort(error, signal)) {
              state = "stopped";
              return getStatus();
            }
            incrementCounter("failures");
            setLastError(error, "COORDINATION_CONSUMER_SLEEP_FAILED");
            state = "degraded";
            return getStatus();
          }
          continue;
        }
        for (const item of deliveries) {
          let result;
          try {
            result = await processDelivery(item, { signal });
          } catch (error) {
            if (isAbort(error, signal)) {
              state = "stopped";
              return getStatus();
            }
            incrementCounter("failures");
            setLastError(error, "COORDINATION_CONSUMER_DELIVERY_FAILED");
            state = "degraded";
            return getStatus();
          }
          if (result.status === "paused") {
            state = "degraded";
            return getStatus();
          }
          if (result.status === "stopped") {
            state = "stopped";
            return getStatus();
          }
          if (result.status === "busy") {
            try {
              await sleep(config.idleDelayMs, { signal });
            } catch (error) {
              if (isAbort(error, signal)) {
                state = "stopped";
                return getStatus();
              }
              incrementCounter("failures");
              setLastError(error, "COORDINATION_CONSUMER_SLEEP_FAILED");
              state = "degraded";
              return getStatus();
            }
          }
        }
      }
      state = "stopped";
      return getStatus();
    } finally {
      running = false;
      inFlight = false;
    }
  }

  async function replay(rawCommand) {
    try {
      const source = plainObject(rawCommand, "replay command");
      const command = Object.freeze({
      commandId: safeIdentifier(source.commandId, "command.commandId"),
      quarantineId: safeIdentifier(
        source.quarantineId,
        "command.quarantineId",
      ),
      expectedConsumeKey: (
        typeof source.expectedConsumeKey === "string"
        && CONSUME_KEY.test(source.expectedConsumeKey)
      )
        ? source.expectedConsumeKey
        : (() => {
            throw consumerError(
              "COORDINATION_CONSUMER_REPLAY_MISMATCH",
              "coordination consumer replay does not match quarantine",
            );
          })(),
    });
    if (typeof authorizeReplay !== "function") {
      throw consumerError(
        "COORDINATION_CONSUMER_REPLAY_DENIED",
        "coordination consumer replay was not authorized",
      );
    }
    const quarantineRecord = await repository.getQuarantine(command.quarantineId);
    if (!quarantineRecord) {
      throw consumerError(
        "COORDINATION_CONSUMER_REPLAY_NOT_FOUND",
        "coordination consumer quarantine was not found",
      );
    }
    if (quarantineRecord.consumeKey !== command.expectedConsumeKey) {
      throw consumerError(
        "COORDINATION_CONSUMER_REPLAY_MISMATCH",
        "coordination consumer replay does not match quarantine",
      );
    }
    const authorizationQuarantine = deepFreeze({
      quarantineId: quarantineRecord.quarantineId,
      consumeKey: quarantineRecord.consumeKey,
      metadata: structuredClone(quarantineRecord.metadata),
      reasonCode: quarantineRecord.reasonCode,
      committedAt: quarantineRecord.committedAt,
    });
    let decision;
    try {
      decision = await authorizeReplay({
        command,
        quarantine: authorizationQuarantine,
      });
    } catch {
      throw consumerError(
        "COORDINATION_CONSUMER_REPLAY_DENIED",
        "coordination consumer replay was not authorized",
      );
    }
    const allowed = (
      decision
      && typeof decision === "object"
      && !Array.isArray(decision)
      && decision.allowed === true
      && decision.commandId === command.commandId
      && decision.quarantineId === command.quarantineId
      && decision.consumeKey === quarantineRecord.consumeKey
      && typeof decision.decisionId === "string"
      && SAFE_IDENTIFIER.test(decision.decisionId)
      && typeof decision.principalId === "string"
      && SAFE_IDENTIFIER.test(decision.principalId)
    );
    if (!allowed) {
      throw consumerError(
        "COORDINATION_CONSUMER_REPLAY_DENIED",
        "coordination consumer replay was not authorized",
      );
    }
    safeObservation(audit, {
      type: "COORDINATION_CONSUMER_REPLAY_AUTHORIZED",
      commandId: command.commandId,
      quarantineId: command.quarantineId,
      consumeKey: quarantineRecord.consumeKey,
      decisionId: decision.decisionId,
      principalId: decision.principalId,
    });
    if (
      quarantineRecord.metadata.malformed === true
      || quarantineRecord.metadata.protocolVersion !== 1
      || quarantineRecord.metadata.scopeId !== config.scopeId
      || quarantineRecord.metadata.toParticipantId !== config.participantId
    ) {
      throw consumerError(
        "COORDINATION_CONSUMER_REPLAY_MISMATCH",
        "coordination consumer replay context does not match",
      );
    }
    const replayClaim = await repository.beginReplay({
      quarantineId: command.quarantineId,
      commandId: command.commandId,
      decisionId: decision.decisionId,
      principalId: decision.principalId,
      ownerId: config.ownerId,
      now: safeNow(clock),
      leaseMs: config.claimLeaseMs,
    });
    if (replayClaim?.status === "duplicate") {
      return Object.freeze({
        status: "duplicate",
        consumeKey: quarantineRecord.consumeKey,
        commitId: replayClaim.receipt.replay.commitId,
      });
    }
    if (
      replayClaim?.status !== "claimed"
      || typeof replayClaim.replayClaimToken !== "string"
      || !SAFE_IDENTIFIER.test(replayClaim.replayClaimToken)
    ) {
      throw consumerError(
        "COORDINATION_CONSUMER_REPLAY_CONFLICT",
        "coordination consumer replay conflicts with existing state",
      );
    }
    const replayClaimToken = replayClaim.replayClaimToken;

    let loaded;
    try {
      loaded = await quarantineStore.get({
        locator: quarantineRecord.locator,
      });
    } catch {
      loaded = null;
    }
    if (
      !loaded
      || typeof loaded !== "object"
      || Array.isArray(loaded)
      || Object.keys(loaded).length !== 1
      || typeof loaded.body !== "string"
    ) {
      await repository.failReplay({
        quarantineId: command.quarantineId,
        commandId: command.commandId,
        ownerId: config.ownerId,
        replayClaimToken,
        failureCode: "REPLAY_SOURCE_UNAVAILABLE",
        now: safeNow(clock),
      });
      throw consumerError(
        "COORDINATION_CONSUMER_REPLAY_SOURCE_UNAVAILABLE",
        "coordination consumer replay source is unavailable",
      );
    }
    const replayMessage = {
      ...structuredClone(quarantineRecord.metadata),
      body: loaded.body,
    };
    delete replayMessage.malformed;
    let replayConsumeKey;
    try {
      replayConsumeKey = coordinationConsumeKey(replayMessage);
    } catch {
      replayConsumeKey = null;
    }
    if (replayConsumeKey !== quarantineRecord.consumeKey) {
      await repository.failReplay({
        quarantineId: command.quarantineId,
        commandId: command.commandId,
        ownerId: config.ownerId,
        replayClaimToken,
        failureCode: "REPLAY_SOURCE_MISMATCH",
        now: safeNow(clock),
      });
      throw consumerError(
        "COORDINATION_CONSUMER_REPLAY_MISMATCH",
        "coordination consumer replay source does not match quarantine",
      );
    }
    let result;
    try {
      result = committedHandlerResult(await handler({
        consumeKey: replayConsumeKey,
        message: replayMessage,
      }));
    } catch (error) {
      await repository.failReplay({
        quarantineId: command.quarantineId,
        commandId: command.commandId,
        ownerId: config.ownerId,
        replayClaimToken,
        failureCode: safeErrorCode(
          error,
          "COORDINATION_CONSUMER_REPLAY_HANDLER_FAILED",
        ),
        now: safeNow(clock),
      });
      throw safeFailure(
        error,
        "COORDINATION_CONSUMER_REPLAY_HANDLER_FAILED",
      );
    }
    await repository.commitReplay({
      quarantineId: command.quarantineId,
      commandId: command.commandId,
      ownerId: config.ownerId,
      replayClaimToken,
      commitId: result.commitId,
      now: safeNow(clock),
    });
    incrementCounter("replayed");
    safeObservation(audit, {
      type: "COORDINATION_CONSUMER_REPLAYED",
      commandId: command.commandId,
      quarantineId: command.quarantineId,
      consumeKey: replayConsumeKey,
      decisionId: decision.decisionId,
      principalId: decision.principalId,
    });
      return Object.freeze({
        status: "replayed",
        consumeKey: replayConsumeKey,
        commitId: result.commitId,
      });
    } catch (error) {
      throw safeFailure(error, "COORDINATION_CONSUMER_REPLAY_FAILED");
    }
  }

  return Object.freeze({
    run,
    processDelivery,
    replay,
    getStatus,
  });
}
