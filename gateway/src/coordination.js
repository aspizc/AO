import {
  createRedisCoordinationQueue,
} from "./core/coordination_queue.js";
import {
  coordinationKeys,
} from "./core/coordination_contract.js";
import {
  appendLocalOnly,
} from "./core/audit.js";
import {
  CoordinationError,
  createCoordinationService,
} from "./services/coordination_service.js";

export {
  createOrchestratorCoordinationClient,
} from "./coordination_client.js";
export {
  createCoordinationConsumerRuntime,
} from "./core/coordination_consumer_runtime.js";

const SERVICE_CONFIG_KEYS = Object.freeze([
  "coordinationScopeId",
  "coordinationLeaseDefaultMs",
  "coordinationLeaseMaxMs",
  "coordinationMessageMaxBytes",
  "coordinationMaxBlockMs",
  "coordinationDedupeTtlMs",
  "coordinationAckTombstoneTtlMs",
]);

const DOCTOR_PROJECTION_KEYS = Object.freeze([
  "coordinationRedisUrl",
  "coordinationPrefix",
  "coordinationScopeId",
  "coordinationShutdownTimeoutMs",
]);
const SAFE_COORDINATION_PREFIX = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,255}$/u;
const SAFE_COORDINATION_SCOPE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const DOCTOR_READY_MATCH = Object.freeze({
  coordination: "COORDINATION_READY",
  coordinationScope: "COORDINATION_SCOPE_MATCH",
});
const DOCTOR_READY_MISMATCH = Object.freeze({
  coordination: "COORDINATION_READY",
  coordinationScope: "COORDINATION_SCOPE_MISMATCH",
});
const DOCTOR_READY_SCOPE_ERROR = Object.freeze({
  coordination: "COORDINATION_READY",
  coordinationScope: "COORDINATION_SCOPE_PROBE_ERROR",
});
const DOCTOR_UNAVAILABLE = Object.freeze({
  coordination: "COORDINATION_UNAVAILABLE",
  coordinationScope: "COORDINATION_SCOPE_PROBE_ERROR",
});
const DOCTOR_PROBE_ERROR = Object.freeze({
  coordination: "COORDINATION_PROBE_ERROR",
  coordinationScope: "COORDINATION_SCOPE_PROBE_ERROR",
});

function assertConfig(value) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError("config must be a plain object");
  }
  return value;
}

function definedEntries(entries) {
  return Object.fromEntries(
    entries.filter(([, value]) => value !== undefined),
  );
}

function serviceConfig(config) {
  return definedEntries(
    SERVICE_CONFIG_KEYS.map((key) => [key, config[key]]),
  );
}

function queueConfig(config) {
  return definedEntries([
    ["redisUrl", config.coordinationRedisUrl],
    ["prefix", config.coordinationPrefix],
    ["maxInboxLength", config.coordinationInboxMaxLen],
    ["orphanInboxTtlMs", config.coordinationOrphanInboxTtlMs],
    ["maxCommandConcurrency", config.coordinationCommandConcurrency],
    ["maxCommandQueue", config.coordinationCommandQueueMax],
    ["maxBlockingQueue", config.coordinationBlockingQueueMax],
    ["shutdownTimeoutMs", config.coordinationShutdownTimeoutMs],
  ]);
}

function ownDataValue(value, key) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !Object.hasOwn(descriptor, "value")) {
    return { found: false };
  }
  return { found: true, value: descriptor.value };
}

function doctorProjection(value) {
  try {
    if (
      !value
      || typeof value !== "object"
      || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype
    ) {
      return null;
    }
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== DOCTOR_PROJECTION_KEYS.length
      || keys.some(
        (key) => typeof key !== "string" || !DOCTOR_PROJECTION_KEYS.includes(key),
      )
    ) {
      return null;
    }

    const fields = Object.fromEntries(
      DOCTOR_PROJECTION_KEYS.map((key) => [key, ownDataValue(value, key)]),
    );
    if (Object.values(fields).some(({ found }) => !found)) return null;

    const coordinationRedisUrl = fields.coordinationRedisUrl.value;
    const coordinationPrefix = fields.coordinationPrefix.value;
    const coordinationScopeId = fields.coordinationScopeId.value;
    const coordinationShutdownTimeoutMs =
      fields.coordinationShutdownTimeoutMs.value;
    if (
      typeof coordinationRedisUrl !== "string"
      || typeof coordinationPrefix !== "string"
      || !SAFE_COORDINATION_PREFIX.test(coordinationPrefix)
      || coordinationPrefix.endsWith(":")
      || coordinationPrefix === "agents"
      || typeof coordinationScopeId !== "string"
      || !SAFE_COORDINATION_SCOPE_ID.test(coordinationScopeId)
      || !Number.isSafeInteger(coordinationShutdownTimeoutMs)
      || coordinationShutdownTimeoutMs <= 0
    ) {
      return null;
    }
    return {
      coordinationRedisUrl,
      coordinationPrefix,
      coordinationScopeId,
      coordinationShutdownTimeoutMs,
    };
  } catch {
    return null;
  }
}

function doctorBridgeInput(value) {
  try {
    if (
      !value
      || typeof value !== "object"
      || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype
    ) {
      return null;
    }
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== 2
      || !keys.every(
        (key) => key === "projection" || key === "coordinationFactory",
      )
    ) {
      return null;
    }
    const projection = ownDataValue(value, "projection");
    const coordinationFactory = ownDataValue(value, "coordinationFactory");
    if (!projection.found || !coordinationFactory.found) return null;
    return {
      projection: projection.value,
      coordinationFactory: coordinationFactory.value,
    };
  } catch {
    return null;
  }
}

function doctorStatusSnapshot(value, canonicalScopeId) {
  try {
    if (
      !value
      || typeof value !== "object"
      || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype
    ) {
      return DOCTOR_PROBE_ERROR;
    }
    const status = ownDataValue(value, "status");
    if (!status.found || status.value !== "ready") return DOCTOR_PROBE_ERROR;

    const scopeId = ownDataValue(value, "scopeId");
    if (!scopeId.found || typeof scopeId.value !== "string") {
      return DOCTOR_READY_SCOPE_ERROR;
    }
    return scopeId.value === canonicalScopeId
      ? DOCTOR_READY_MATCH
      : DOCTOR_READY_MISMATCH;
  } catch {
    return DOCTOR_PROBE_ERROR;
  }
}

function isDoctorUnavailableError(value) {
  try {
    if (
      value === null
      || (typeof value !== "object" && typeof value !== "function")
    ) {
      return false;
    }
    const code = ownDataValue(value, "code");
    return code.found && code.value === "COORDINATION_UNAVAILABLE";
  } catch {
    return false;
  }
}

export { CoordinationError };

export function createCoordination({
  config: providedConfig = {},
  queue,
  queueFactory = createRedisCoordinationQueue,
  clock,
  randomUUID,
  randomToken,
  audit = appendLocalOnly,
} = {}) {
  const config = assertConfig(providedConfig);
  let resolvedQueue = queue;
  if (resolvedQueue === undefined) {
    if (typeof queueFactory !== "function") {
      throw new TypeError("queueFactory must be a function");
    }
    const options = queueConfig(config);
    coordinationKeys(options.prefix);
    resolvedQueue = queueFactory(options);
  }

  const service = createCoordinationService({
    queue: resolvedQueue,
    config: serviceConfig(config),
    clock,
    randomUUID,
    randomToken,
    audit,
  });
  let closePromise = null;
  Object.defineProperty(service, "close", {
    value() {
      if (!closePromise) {
        closePromise = Promise.resolve().then(async () => {
          if (typeof resolvedQueue?.close === "function") {
            await resolvedQueue.close();
          }
          return { status: "closed" };
        });
      }
      return closePromise;
    },
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return service;
}

export async function probeDoctorCoordination(input) {
  const bridgeInput = doctorBridgeInput(input);
  if (!bridgeInput || typeof bridgeInput.coordinationFactory !== "function") {
    return DOCTOR_PROBE_ERROR;
  }
  const projection = doctorProjection(bridgeInput.projection);
  if (!projection) return DOCTOR_PROBE_ERROR;

  let instance;
  try {
    instance = bridgeInput.coordinationFactory({ config: { ...projection } });
  } catch {
    return DOCTOR_PROBE_ERROR;
  }

  let close;
  let status;
  let validInstance = false;
  try {
    if (
      instance !== null
      && (typeof instance === "object" || typeof instance === "function")
    ) {
      close = instance.close;
      status = instance.status;
      validInstance = (
        typeof close === "function"
        && typeof status === "function"
        && Object.getPrototypeOf(instance) === Object.prototype
      );
    }
  } catch {
    validInstance = false;
  }

  let snapshot = DOCTOR_PROBE_ERROR;
  if (validInstance) {
    try {
      const result = await Reflect.apply(status, instance, [{}]);
      snapshot = doctorStatusSnapshot(
        result,
        projection.coordinationScopeId,
      );
    } catch (error) {
      snapshot = isDoctorUnavailableError(error)
        ? DOCTOR_UNAVAILABLE
        : DOCTOR_PROBE_ERROR;
    }
  }

  if (typeof close !== "function") return DOCTOR_PROBE_ERROR;
  try {
    await Reflect.apply(close, instance, []);
  } catch {
    return DOCTOR_PROBE_ERROR;
  }
  return snapshot;
}
