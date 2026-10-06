import {
  COORDINATION_PROTOCOL_VERSION,
} from "./core/coordination_contract.js";
import {
  managedClientLineageBeginRejoin,
  managedClientLineageFault,
  managedClientLineageReady,
  managedClientLineageStopped,
  registerManagedClientLineage,
} from "./core/coordination_consumer_lineage.js";

const CLIENT_STATES = new Set([
  "starting",
  "ready",
  "degraded",
  "rejoining",
  "stopped",
]);
const INVOCABLE_OPERATIONS = new Set([
  "discover",
  "send",
  "receive",
  "ack",
]);
const LEASE_LOSS_CODES = new Set([
  "COORDINATION_AUTH_FAILED",
  "COORDINATION_LEASE_EXPIRED",
  "COORDINATION_LEASE_CHANGED",
  "COORDINATION_LEASE_NOT_FOUND",
]);
const TERMINAL_CLIENT_CODES = new Set([
  "COORDINATION_CLIENT_CLOCK_INVALID",
  "COORDINATION_CLIENT_CONTRACT_INVALID",
  "COORDINATION_CLIENT_RANDOM_INVALID",
]);
const SAFE_ERROR_CODE = /^[A-Z][A-Z0-9_]{1,127}$/;
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_DATE_MS = 8_640_000_000_000_000;
const REGISTRATION_FIELDS = new Set([
  "scopeId",
  "displayName",
  "capabilities",
  "metadata",
  "leaseTtlMs",
]);
const DEFAULT_HEARTBEAT_JITTER_RATIO = 0.1;
const DEFAULT_RETRY = Object.freeze({
  maxAttempts: 4,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
});
const DEFAULT_SCHEDULER = Object.freeze({
  setTimeout(callback, delayMs) {
    return globalThis.setTimeout(callback, delayMs);
  },
  clearTimeout(timer) {
    globalThis.clearTimeout(timer);
  },
});

class CoordinationClientError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CoordinationClientError";
    this.code = code;
  }
}

function clientError(code, message) {
  return new CoordinationClientError(code, message);
}

function contractInvalid() {
  return clientError(
    "COORDINATION_CLIENT_CONTRACT_INVALID",
    "coordination returned data outside the client contract",
  );
}

function assertPlainObject(value, label) {
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

function assertPositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }
  return value;
}

function normalizeRegistration(value) {
  const registration = assertPlainObject(value, "registration");
  for (const key of Object.keys(registration)) {
    if (!REGISTRATION_FIELDS.has(key)) {
      throw new TypeError(`registration contains unsupported field ${key}`);
    }
  }
  if (registration.leaseTtlMs !== undefined) {
    assertPositiveInteger(registration.leaseTtlMs, "registration.leaseTtlMs");
  }
  try {
    return structuredClone(registration);
  } catch {
    throw new TypeError("registration must contain cloneable values");
  }
}

function normalizeRetry(value) {
  const retry = assertPlainObject(value, "retry");
  for (const key of Object.keys(retry)) {
    if (!Object.hasOwn(DEFAULT_RETRY, key)) {
      throw new TypeError(`retry contains unsupported field ${key}`);
    }
  }
  const normalized = {
    ...DEFAULT_RETRY,
    ...retry,
  };
  assertPositiveInteger(normalized.maxAttempts, "retry.maxAttempts");
  assertPositiveInteger(normalized.baseDelayMs, "retry.baseDelayMs");
  assertPositiveInteger(normalized.maxDelayMs, "retry.maxDelayMs");
  if (normalized.baseDelayMs > normalized.maxDelayMs) {
    throw new TypeError("retry.baseDelayMs must not exceed retry.maxDelayMs");
  }
  return Object.freeze(normalized);
}

function assertCoordination(value) {
  if (!value || typeof value !== "object") {
    throw new TypeError("coordination must be an object");
  }
  for (const operation of [
    "status",
    "register",
    "heartbeat",
    "discover",
    "send",
    "receive",
    "ack",
    "unregister",
  ]) {
    if (typeof value[operation] !== "function") {
      throw new TypeError(`coordination.${operation} must be a function`);
    }
  }
  return value;
}

function assertScheduler(value) {
  if (
    !value
    || typeof value !== "object"
    || typeof value.setTimeout !== "function"
    || typeof value.clearTimeout !== "function"
  ) {
    throw new TypeError(
      "scheduler must provide setTimeout and clearTimeout functions",
    );
  }
  return value;
}

function safeErrorCode(error) {
  return (
    typeof error?.code === "string"
    && SAFE_ERROR_CODE.test(error.code)
  )
    ? error.code
    : "COORDINATION_CLIENT_OPERATION_FAILED";
}

function safeFailure(error) {
  return clientError(
    safeErrorCode(error),
    "coordination client operation failed safely",
  );
}

function safeLastError(error) {
  return Object.freeze({
    code: safeErrorCode(error),
  });
}

function safeNow(clock) {
  const value = clock();
  if (
    !Number.isSafeInteger(value)
    || value < -MAX_DATE_MS
    || value > MAX_DATE_MS
  ) {
    throw clientError(
      "COORDINATION_CLIENT_CLOCK_INVALID",
      "coordination client clock returned an invalid value",
    );
  }
  return value;
}

function safeScheduledTime(clock, delayMs) {
  const now = safeNow(clock);
  const scheduledAt = now + delayMs;
  if (
    !Number.isSafeInteger(scheduledAt)
    || scheduledAt < -MAX_DATE_MS
    || scheduledAt > MAX_DATE_MS
  ) {
    throw clientError(
      "COORDINATION_CLIENT_CLOCK_INVALID",
      "coordination client schedule exceeds the supported clock range",
    );
  }
  return scheduledAt;
}

function safeIsoTimestamp(value) {
  if (
    !Number.isSafeInteger(value)
    || value < -MAX_DATE_MS
    || value > MAX_DATE_MS
  ) {
    throw clientError(
      "COORDINATION_CLIENT_CLOCK_INVALID",
      "coordination client timestamp is outside the supported range",
    );
  }
  try {
    return new Date(value).toISOString();
  } catch {
    throw clientError(
      "COORDINATION_CLIENT_CLOCK_INVALID",
      "coordination client timestamp is outside the supported range",
    );
  }
}

function safeParticipant(value, {
  expectedParticipantId,
  expectedScopeId,
} = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw contractInvalid();
  }
  if (
    value.protocolVersion !== COORDINATION_PROTOCOL_VERSION
    || typeof value.participantId !== "string"
    || !SAFE_IDENTIFIER.test(value.participantId)
    || value.participantType !== "orchestrator"
    || typeof value.scopeId !== "string"
    || !SAFE_IDENTIFIER.test(value.scopeId)
    || typeof value.leaseExpiresAt !== "string"
    || (
      expectedParticipantId !== undefined
      && value.participantId !== expectedParticipantId
    )
    || (
      expectedScopeId !== undefined
      && value.scopeId !== expectedScopeId
    )
  ) {
    throw contractInvalid();
  }
  const leaseExpiresAt = Date.parse(value.leaseExpiresAt);
  if (!Number.isFinite(leaseExpiresAt)) {
    throw contractInvalid();
  }
  return Object.freeze({
    participantId: value.participantId,
    participantType: value.participantType,
    scopeId: value.scopeId,
    leaseExpiresAt: value.leaseExpiresAt,
  });
}

function registrationCredentials(value, expectedScopeId) {
  const participant = safeParticipant(value, { expectedScopeId });
  if (typeof value.leaseToken !== "string" || value.leaseToken.length < 32) {
    throw contractInvalid();
  }
  return {
    participant,
    credentials: Object.freeze({
      participantId: participant.participantId,
      leaseToken: value.leaseToken,
    }),
  };
}

function cleanupCredentials(value) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || typeof value.participantId !== "string"
    || typeof value.leaseToken !== "string"
  ) {
    return null;
  }
  return Object.freeze({
    participantId: value.participantId,
    leaseToken: value.leaseToken,
  });
}

function coordinationStatusContract(value) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || value.protocolVersion !== COORDINATION_PROTOCOL_VERSION
    || value.status !== "ready"
    || typeof value.scopeId !== "string"
    || !SAFE_IDENTIFIER.test(value.scopeId)
    || !value.limits
    || typeof value.limits !== "object"
    || Array.isArray(value.limits)
    || !Number.isSafeInteger(value.limits.leaseDefaultMs)
    || value.limits.leaseDefaultMs <= 0
    || !Number.isSafeInteger(value.limits.leaseMaxMs)
    || value.limits.leaseMaxMs <= 0
    || value.limits.leaseDefaultMs > value.limits.leaseMaxMs
  ) {
    throw contractInvalid();
  }
  return Object.freeze({
    scopeId: value.scopeId,
    leaseDefaultMs: value.limits.leaseDefaultMs,
    leaseMaxMs: value.limits.leaseMaxMs,
  });
}

function effectiveLeaseTtl(value, fallbackMs) {
  const start = Date.parse(value.lastHeartbeatAt ?? value.registeredAt);
  const expiry = Date.parse(value.leaseExpiresAt);
  const observed = expiry - start;
  if (Number.isSafeInteger(observed) && observed > 0) return observed;
  return fallbackMs;
}

function checkedRandom(random) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw clientError(
      "COORDINATION_CLIENT_RANDOM_INVALID",
      "coordination client random source returned an invalid value",
    );
  }
  return value;
}

export function createOrchestratorCoordinationClient({
  coordination: providedCoordination,
  registration: providedRegistration = {},
  clock = () => Date.now(),
  scheduler: providedScheduler = DEFAULT_SCHEDULER,
  random = () => Math.random(),
  heartbeatJitterRatio = DEFAULT_HEARTBEAT_JITTER_RATIO,
  retry: providedRetry = {},
} = {}) {
  const coordination = assertCoordination(providedCoordination);
  const registration = normalizeRegistration(providedRegistration);
  const scheduler = assertScheduler(providedScheduler);
  const retry = normalizeRetry(providedRetry);
  if (typeof clock !== "function") throw new TypeError("clock must be a function");
  if (typeof random !== "function") {
    throw new TypeError("random must be a function");
  }
  if (
    !Number.isFinite(heartbeatJitterRatio)
    || heartbeatJitterRatio < 0
    || heartbeatJitterRatio > 0.25
  ) {
    throw new TypeError(
      "heartbeatJitterRatio must be between 0 and 0.25",
    );
  }

  let state = "stopped";
  let hasStarted = false;
  let permanentlyStopped = false;
  let epoch = 0;
  let credentials = null;
  let participant = null;
  let leaseTtlMs = null;
  let scheduledTimer = null;
  let nextAction = null;
  let nextActionAt = null;
  let retryAttempt = 0;
  let lastError = null;
  let startFlight = null;
  let rejoinActive = false;
  let stopFlight = null;
  let canonicalScopeId = null;
  let managedClient = null;
  const lifecycleController = new AbortController();

  function detach(promise) {
    Promise.resolve(promise).then(
      () => {},
      () => {},
    );
  }

  function recoveryGuidance() {
    if (state === "starting") return "Wait for start() to finish.";
    if (state === "ready") return "No recovery action is required.";
    if (state === "rejoining") {
      return "Wait for the bounded re-registration attempt to finish.";
    }
    if (state === "degraded") {
      return "Call stop() and create a new client to retry safely.";
    }
    if (permanentlyStopped || hasStarted) {
      return "Create a new client before coordinating again.";
    }
    return "Call start() before coordinating.";
  }

  function getStatus() {
    if (!CLIENT_STATES.has(state)) {
      throw clientError(
        "COORDINATION_CLIENT_STATE_INVALID",
        "coordination client entered an invalid state",
      );
    }
    return Object.freeze({
      state,
      ...(participant === null
        ? {}
        : {
            participantId: participant.participantId,
            participantType: participant.participantType,
            scopeId: participant.scopeId,
            leaseExpiresAt: participant.leaseExpiresAt,
          }),
      retryAttempt,
      ...(nextAction === null ? {} : { nextAction }),
      ...(nextActionAt === null
        ? {}
        : { nextActionAt: safeIsoTimestamp(nextActionAt) }),
      ...(lastError === null ? {} : { lastError }),
      recovery: recoveryGuidance(),
    });
  }

  function clearScheduledTimer() {
    if (scheduledTimer !== null) {
      scheduler.clearTimeout(scheduledTimer);
      scheduledTimer = null;
    }
    nextAction = null;
    nextActionAt = null;
  }

  function schedule(action, delayMs, expectedEpoch, callback) {
    clearScheduledTimer();
    const scheduledAt = safeScheduledTime(clock, delayMs);
    const timer = scheduler.setTimeout(() => {
      scheduledTimer = null;
      nextAction = null;
      nextActionAt = null;
      if (
        lifecycleController.signal.aborted
        || state === "stopped"
        || epoch !== expectedEpoch
      ) {
        return;
      }
      try {
        detach(callback());
      } catch {
        // Scheduled lifecycle work reports failures through client state.
      }
    }, delayMs);
    scheduledTimer = timer;
    nextAction = action;
    nextActionAt = scheduledAt;
  }

  function heartbeatDelay() {
    const randomValue = checkedRandom(random);
    const ratio = 0.5
      + ((randomValue * 2) - 1) * heartbeatJitterRatio;
    return Math.max(
      1,
      Math.min(leaseTtlMs - 1, Math.round(leaseTtlMs * ratio)),
    );
  }

  function retryDelay(failedAttempt) {
    const exponent = Math.min(failedAttempt - 1, 52);
    return Math.min(
      retry.maxDelayMs,
      retry.baseDelayMs * (2 ** exponent),
    );
  }

  function scheduleHeartbeat(expectedEpoch) {
    schedule(
      "heartbeat",
      heartbeatDelay(),
      expectedEpoch,
      () => performHeartbeat(expectedEpoch, 1),
    );
  }

  function bestEffortUnregister(ownedCredentials) {
    if (!ownedCredentials) return;
    try {
      detach(coordination.unregister({
        participantId: ownedCredentials.participantId,
        leaseToken: ownedCredentials.leaseToken,
      }));
    } catch {
      // The lease may already be gone. Stop and stale-epoch cleanup stay safe.
    }
  }

  function installRegistration(result) {
    const installed = registrationCredentials(result, canonicalScopeId);
    credentials = installed.credentials;
    participant = installed.participant;
    leaseTtlMs = effectiveLeaseTtl(result, leaseTtlMs);
  }

  function handleRejoinFailure(error, expectedEpoch, attempt) {
    if (state === "stopped" || epoch !== expectedEpoch) return;
    lastError = safeLastError(error);
    if (TERMINAL_CLIENT_CODES.has(safeErrorCode(error))) {
      clearScheduledTimer();
      rejoinActive = false;
      state = "degraded";
      managedClientLineageFault(managedClient);
      return;
    }
    if (attempt < retry.maxAttempts) {
      try {
        schedule(
          "rejoin",
          retryDelay(attempt),
          expectedEpoch,
          () => attemptRejoin(expectedEpoch, attempt + 1),
        );
        return;
      } catch (scheduleError) {
        lastError = safeLastError(scheduleError);
      }
    }
    rejoinActive = false;
    state = "degraded";
    managedClientLineageFault(managedClient);
  }

  async function attemptRejoin(expectedEpoch, attempt) {
    retryAttempt = attempt;
    let registered;
    try {
      registered = await coordination.register({
        ...structuredClone(registration),
        participantType: "orchestrator",
        scopeId: canonicalScopeId,
        leaseTtlMs,
      });
    } catch (error) {
      handleRejoinFailure(error, expectedEpoch, attempt);
      return;
    }

    if (state === "stopped" || epoch !== expectedEpoch) {
      bestEffortUnregister(cleanupCredentials(registered));
      return;
    }

    try {
      installRegistration(registered);
    } catch (error) {
      bestEffortUnregister(cleanupCredentials(registered));
      handleRejoinFailure(error, expectedEpoch, attempt);
      return;
    }
    rejoinActive = false;
    retryAttempt = 0;
    lastError = null;
    state = "ready";
    registerManagedClientLineage(managedClient, {
      configuredScopeId: canonicalScopeId,
    });
    managedClientLineageReady(managedClient, getStatus());
    try {
      scheduleHeartbeat(expectedEpoch);
    } catch (error) {
      state = "degraded";
      lastError = safeLastError(error);
    }
  }

  function beginRejoin(error, expectedEpoch) {
    if (
      rejoinActive
      || lifecycleController.signal.aborted
      || state === "stopped"
      || epoch !== expectedEpoch
    ) {
      return;
    }
    clearScheduledTimer();
    rejoinActive = true;
    state = "rejoining";
    retryAttempt = 0;
    lastError = safeLastError(error);
    const rejoinEpoch = epoch + 1;
    epoch = rejoinEpoch;
    managedClientLineageBeginRejoin(managedClient);
    detach(attemptRejoin(rejoinEpoch, 1));
  }

  async function performHeartbeat(expectedEpoch, attempt) {
    if (
      lifecycleController.signal.aborted
      || state === "stopped"
      || epoch !== expectedEpoch
      || credentials === null
    ) {
      return;
    }
    const ownedCredentials = credentials;
    try {
      const renewed = await coordination.heartbeat({
        participantId: ownedCredentials.participantId,
        leaseToken: ownedCredentials.leaseToken,
        leaseTtlMs,
      });
      if (state === "stopped" || epoch !== expectedEpoch) return;
      participant = safeParticipant(renewed, {
        expectedParticipantId: ownedCredentials.participantId,
        expectedScopeId: canonicalScopeId,
      });
      leaseTtlMs = effectiveLeaseTtl(renewed, leaseTtlMs);
      state = "ready";
      retryAttempt = 0;
      lastError = null;
      scheduleHeartbeat(expectedEpoch);
    } catch (error) {
      if (state === "stopped" || epoch !== expectedEpoch) return;
      lastError = safeLastError(error);
      if (LEASE_LOSS_CODES.has(safeErrorCode(error))) {
        beginRejoin(error, expectedEpoch);
        return;
      }
      state = "degraded";
      retryAttempt = attempt;
      if (TERMINAL_CLIENT_CODES.has(safeErrorCode(error))) {
        clearScheduledTimer();
        return;
      }
      if (attempt < retry.maxAttempts) {
        schedule(
          "heartbeat-retry",
          retryDelay(attempt),
          expectedEpoch,
          () => performHeartbeat(expectedEpoch, attempt + 1),
        );
      }
    }
  }

  function start() {
    if (permanentlyStopped || (hasStarted && state === "stopped")) {
      return Promise.reject(clientError(
        "COORDINATION_CLIENT_STOPPED",
        "a stopped coordination client cannot be restarted",
      ));
    }
    if (startFlight !== null) return startFlight;
    if (hasStarted) return Promise.resolve(getStatus());

    hasStarted = true;
    state = "starting";
    lastError = null;
    retryAttempt = 0;
    const startEpoch = epoch + 1;
    epoch = startEpoch;

    const operation = (async () => {
      let returnedRegistration = null;
      try {
        const rawStatus = await coordination.status({});
        if (
          lifecycleController.signal.aborted
          || state === "stopped"
          || epoch !== startEpoch
        ) {
          return getStatus();
        }
        const status = coordinationStatusContract(rawStatus);
        if (
          registration.scopeId !== undefined
          && registration.scopeId !== status.scopeId
        ) {
          throw contractInvalid();
        }
        canonicalScopeId = status.scopeId;
        const requestedLeaseTtlMs =
          registration.leaseTtlMs ?? status.leaseDefaultMs;
        if (requestedLeaseTtlMs > status.leaseMaxMs) {
          throw clientError(
            "COORDINATION_CLIENT_LEASE_INVALID",
            "requested lease exceeds the advertised maximum",
          );
        }
        leaseTtlMs = requestedLeaseTtlMs;

        returnedRegistration = await coordination.register({
          ...structuredClone(registration),
          participantType: "orchestrator",
          scopeId: canonicalScopeId,
          leaseTtlMs,
        });
        if (
          lifecycleController.signal.aborted
          || state === "stopped"
          || epoch !== startEpoch
        ) {
          bestEffortUnregister(cleanupCredentials(returnedRegistration));
          return getStatus();
        }

        installRegistration(returnedRegistration);
        state = "ready";
        managedClientLineageReady(managedClient, getStatus());
        scheduleHeartbeat(startEpoch);
        return getStatus();
      } catch (error) {
        if (
          lifecycleController.signal.aborted
          || state === "stopped"
          || epoch !== startEpoch
        ) {
          return getStatus();
        }
        clearScheduledTimer();
        bestEffortUnregister(
          credentials ?? cleanupCredentials(returnedRegistration),
        );
        credentials = null;
        participant = null;
        leaseTtlMs = null;
        state = "degraded";
        lastError = safeLastError(error);
        throw safeFailure(error);
      }
    })();
    startFlight = operation;
    startFlight.then(
      () => {
        startFlight = null;
      },
      () => {
        startFlight = null;
      },
    );
    return startFlight;
  }

  async function invoke(operation, input = {}, { signal } = {}) {
    if (!INVOCABLE_OPERATIONS.has(operation)) {
      throw clientError(
        "COORDINATION_CLIENT_INVALID_OPERATION",
        "coordination client operation is not allowed",
      );
    }
    const value = assertPlainObject(input, "input");
    if (state !== "ready" || credentials === null) {
      throw clientError(
        "COORDINATION_CLIENT_NOT_READY",
        "coordination client is not ready",
      );
    }
    const callEpoch = epoch;
    const ownedCredentials = credentials;
    try {
      return await coordination[operation](
        {
          ...structuredClone(value),
          participantId: ownedCredentials.participantId,
          leaseToken: ownedCredentials.leaseToken,
        },
        // MUTATION_GUARD: managed-operation-signal
        { signal },
      );
    } catch (error) {
      if (
        LEASE_LOSS_CODES.has(safeErrorCode(error))
        && state !== "stopped"
        && epoch === callEpoch
      ) {
        beginRejoin(error, callEpoch);
      }
      throw safeFailure(error);
    }
  }

  function stop() {
    if (stopFlight !== null) return stopFlight;
    const ownedCredentials = credentials;
    permanentlyStopped = true;
    state = "stopped";
    epoch += 1;
    lifecycleController.abort();
    clearScheduledTimer();
    rejoinActive = false;
    credentials = null;
    participant = null;
    leaseTtlMs = null;
    retryAttempt = 0;
    lastError = null;
    managedClientLineageStopped(managedClient);

    bestEffortUnregister(ownedCredentials);
    stopFlight = Promise.resolve(getStatus());
    return stopFlight;
  }

  managedClient = Object.freeze({
    start,
    invoke,
    getStatus,
    stop,
  });
  registerManagedClientLineage(managedClient, {
    configuredScopeId: registration.scopeId,
  });
  return managedClient;
}
