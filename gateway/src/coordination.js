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

const SERVICE_CONFIG_KEYS = Object.freeze([
  "coordinationScopeId",
  "coordinationLeaseDefaultMs",
  "coordinationLeaseMaxMs",
  "coordinationMessageMaxBytes",
  "coordinationMaxBlockMs",
  "coordinationDedupeTtlMs",
  "coordinationAckTombstoneTtlMs",
]);

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
  ]);
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

  return createCoordinationService({
    queue: resolvedQueue,
    config: serviceConfig(config),
    clock,
    randomUUID,
    randomToken,
    audit,
  });
}
