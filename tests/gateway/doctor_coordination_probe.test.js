import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

import * as coordinationModule from "../../gateway/src/coordination.js";

const PROJECTION = Object.freeze({
  coordinationRedisUrl: "redis://doctor:credential@coordination.invalid:6379/9",
  coordinationPrefix: "private:doctor:coord:v1",
  coordinationScopeId: "project:doctor-private-scope",
  coordinationShutdownTimeoutMs: 731,
});

const READY_MATCH = Object.freeze({
  coordination: "COORDINATION_READY",
  coordinationScope: "COORDINATION_SCOPE_MATCH",
});
const READY_MISMATCH = Object.freeze({
  coordination: "COORDINATION_READY",
  coordinationScope: "COORDINATION_SCOPE_MISMATCH",
});
const READY_SCOPE_ERROR = Object.freeze({
  coordination: "COORDINATION_READY",
  coordinationScope: "COORDINATION_SCOPE_PROBE_ERROR",
});
const UNAVAILABLE = Object.freeze({
  coordination: "COORDINATION_UNAVAILABLE",
  coordinationScope: "COORDINATION_SCOPE_PROBE_ERROR",
});
const PROBE_ERROR = Object.freeze({
  coordination: "COORDINATION_PROBE_ERROR",
  coordinationScope: "COORDINATION_SCOPE_PROBE_ERROR",
});

const RAW_CANARIES = Object.freeze([
  PROJECTION.coordinationRedisUrl,
  PROJECTION.coordinationPrefix,
  PROJECTION.coordinationScopeId,
  "tok_live_COORDINATION_CREDENTIAL_CANARY",
  "/home/coordination-owner/.config/private",
  "raw coordination diagnostic canary",
]);
const DOMAIN_OPERATIONS = Object.freeze([
  "ack",
  "discover",
  "heartbeat",
  "receive",
  "register",
  "send",
  "unregister",
]);

function bridge() {
  assert.equal(
    typeof coordinationModule.probeDoctorCoordination,
    "function",
    "the narrow Gateway Doctor coordination bridge is absent",
  );
  return coordinationModule.probeDoctorCoordination;
}

function readyStatus(scopeId = PROJECTION.coordinationScopeId) {
  return {
    protocolVersion: 1,
    status: "ready",
    scopeId,
    queue: {
      enabled: true,
      prefix: PROJECTION.coordinationPrefix,
      eventsStream: `${PROJECTION.coordinationPrefix}:events`,
      consumerGroup: "coordination-v1",
      redisUrl: PROJECTION.coordinationRedisUrl,
    },
    limits: {
      leaseDefaultMs: 900_000,
      leaseMaxMs: 3_600_000,
    },
    rawConfig: RAW_CANARIES[3],
    error: RAW_CANARIES[5],
    path: RAW_CANARIES[4],
  };
}

function strictFactory({
  statusResult = readyStatus(),
  statusError,
  closeError,
} = {}) {
  const calls = [];
  let factoryCalls = 0;

  function coordinationFactory(...args) {
    assert.equal(args.length, 1, "the factory receives one narrow projection");
    const [options] = args;
    factoryCalls += 1;
    assert.equal(factoryCalls, 1, "the bridge must own exactly one instance");
    calls.push(["factory", structuredClone(options)]);

    const instance = {
      async status(...statusArgs) {
        assert.equal(
          statusArgs.length,
          1,
          "status receives only the exact empty input, without a signal",
        );
        const [input] = statusArgs;
        calls.push(["status", structuredClone(input)]);
        if (statusError !== undefined) throw statusError;
        return statusResult;
      },
      async close(...closeArgs) {
        assert.equal(closeArgs.length, 0, "close receives no arguments");
        calls.push(["close"]);
        if (closeError !== undefined) throw closeError;
        return { status: "closed" };
      },
    };

    return new Proxy(instance, {
      get(target, property, receiver) {
        if (property !== "status" && property !== "close") {
          throw new Error(
            `forbidden coordination or managed-client behavior: ${String(property)}`,
          );
        }
        return Reflect.get(target, property, receiver);
      },
      ownKeys() {
        throw new Error(
          "register/discover/send/receive/ACK/heartbeat/restart/signal inspection is forbidden",
        );
      },
    });
  }

  return {
    calls,
    coordinationFactory,
    get factoryCalls() {
      return factoryCalls;
    },
  };
}

function expectedLifecycleCalls() {
  return [
    ["factory", { config: { ...PROJECTION } }],
    ["status", {}],
    ["close"],
  ];
}

function assertClosedSnapshot(actual, expected) {
  assert.deepEqual(actual, expected);
  assert.deepEqual(
    Object.keys(actual),
    ["coordination", "coordinationScope"],
  );
  assert.equal(Object.getPrototypeOf(actual), Object.prototype);
  assert.equal(Object.isFrozen(actual), true);

  const serialized = JSON.stringify(actual);
  for (const canary of RAW_CANARIES) {
    assert.equal(serialized.includes(canary), false);
  }
}

test("Doctor coordination bridge never reaches general loadConfig", () => {
  const source = readFileSync(
    new URL("../../gateway/src/coordination.js", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /\bloadConfig\b/u);
});

test("one owned instance yields one shared ready and matching-scope snapshot", async () => {
  const fake = strictFactory();

  const snapshot = await bridge()({
    projection: PROJECTION,
    coordinationFactory: fake.coordinationFactory,
  });

  assertClosedSnapshot(snapshot, READY_MATCH);
  assert.equal(fake.factoryCalls, 1);
  assert.deepEqual(fake.calls, expectedLifecycleCalls());
});

test("Doctor bridge uses the real factory without network or domain work", async () => {
  const queueCalls = [];
  const auditEvents = [];
  const domainCalls = [];
  const queue = {
    enabled: true,
    describe() {
      queueCalls.push("describe");
      return {
        enabled: true,
        prefix: PROJECTION.coordinationPrefix,
        eventsStream: `${PROJECTION.coordinationPrefix}:events`,
        consumerGroup: "coordination-v1",
      };
    },
    async ping() {
      queueCalls.push("ping");
      return { status: "ready" };
    },
    async close() {
      queueCalls.push("close");
      return { status: "closed" };
    },
  };

  function productionFactory({ config }) {
    const coordination = coordinationModule.createCoordination({
      config,
      queue,
      audit(event) {
        auditEvents.push(event);
      },
    });
    return new Proxy(coordination, {
      get(target, property, receiver) {
        const value = Reflect.get(target, property, receiver);
        if (!DOMAIN_OPERATIONS.includes(property)) return value;
        return (...args) => {
          domainCalls.push(property);
          return Reflect.apply(value, target, args);
        };
      },
    });
  }

  const snapshot = await bridge()({
    projection: PROJECTION,
    coordinationFactory: productionFactory,
  });

  assertClosedSnapshot(snapshot, READY_MATCH);
  assert.deepEqual(
    Object.entries(queue)
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name)
      .sort(),
    ["close", "describe", "ping"],
  );
  assert.deepEqual(queueCalls, ["describe", "ping", "close"]);
  assert.deepEqual(auditEvents, []);
  assert.deepEqual(domainCalls, []);
});

test("canonical scope comparison is exact and never coerces hostile values", async () => {
  const hostileCalls = [];
  const hostileScope = new Proxy(
    {},
    {
      get(_target, property) {
        hostileCalls.push(property);
        throw new Error(RAW_CANARIES[5]);
      },
    },
  );
  const throwingStatus = { status: "ready" };
  Object.defineProperty(throwingStatus, "scopeId", {
    get() {
      throw new Error(RAW_CANARIES[5]);
    },
  });
  const missingScope = readyStatus();
  delete missingScope.scopeId;
  const cases = [
    [readyStatus(PROJECTION.coordinationScopeId), READY_MATCH],
    [readyStatus(`${PROJECTION.coordinationScopeId} `), READY_MISMATCH],
    [readyStatus(PROJECTION.coordinationScopeId.toUpperCase()), READY_MISMATCH],
    [missingScope, READY_SCOPE_ERROR],
    [readyStatus(hostileScope), READY_SCOPE_ERROR],
    [throwingStatus, READY_SCOPE_ERROR],
  ];

  for (const [statusResult, expected] of cases) {
    const fake = strictFactory({ statusResult });
    const snapshot = await bridge()({
      projection: PROJECTION,
      coordinationFactory: fake.coordinationFactory,
    });

    assertClosedSnapshot(snapshot, expected);
    assert.deepEqual(fake.calls, expectedLifecycleCalls());
  }
  assert.deepEqual(hostileCalls, []);
});

test("disabled and unreachable status map only the static unavailable code", async () => {
  const unreachable = new Error(RAW_CANARIES[5]);
  unreachable.code = "COORDINATION_UNAVAILABLE";
  unreachable.redisUrl = PROJECTION.coordinationRedisUrl;

  const hostileUnavailable = {
    code: "COORDINATION_UNAVAILABLE",
    get message() {
      throw new Error(RAW_CANARIES[3]);
    },
    get stack() {
      throw new Error(RAW_CANARIES[4]);
    },
  };

  for (const statusError of [unreachable, hostileUnavailable]) {
    const fake = strictFactory({ statusError });
    const snapshot = await bridge()({
      projection: PROJECTION,
      coordinationFactory: fake.coordinationFactory,
    });

    assertClosedSnapshot(snapshot, UNAVAILABLE);
    assert.deepEqual(fake.calls, expectedLifecycleCalls());
  }
});

test("anomalous status and ordinary status throws fail closed after one close", async () => {
  const anomalousStatuses = [
    null,
    [],
    "ready",
    { status: "disabled", scopeId: PROJECTION.coordinationScopeId },
    { status: 1, scopeId: PROJECTION.coordinationScopeId },
  ];
  const throwingStatus = {};
  Object.defineProperty(throwingStatus, "status", {
    get() {
      throw new Error(RAW_CANARIES[5]);
    },
  });
  anomalousStatuses.push(throwingStatus);

  for (const statusResult of anomalousStatuses) {
    const fake = strictFactory({ statusResult });
    const snapshot = await bridge()({
      projection: PROJECTION,
      coordinationFactory: fake.coordinationFactory,
    });

    assertClosedSnapshot(snapshot, PROBE_ERROR);
    assert.deepEqual(fake.calls, expectedLifecycleCalls());
  }

  const statusError = new Error(RAW_CANARIES[5]);
  statusError.config = { ...PROJECTION };
  const fake = strictFactory({ statusError });
  const snapshot = await bridge()({
    projection: PROJECTION,
    coordinationFactory: fake.coordinationFactory,
  });

  assertClosedSnapshot(snapshot, PROBE_ERROR);
  assert.deepEqual(fake.calls, expectedLifecycleCalls());

  const primitiveThrow = strictFactory({
    statusError: Symbol("coordination-control-flow-canary"),
  });
  const primitiveSnapshot = await bridge()({
    projection: PROJECTION,
    coordinationFactory: primitiveThrow.coordinationFactory,
  });

  assertClosedSnapshot(primitiveSnapshot, PROBE_ERROR);
  assert.deepEqual(primitiveThrow.calls, expectedLifecycleCalls());
});

test("close failure replaces a successful status with one closed probe error snapshot", async () => {
  const closeError = new Error(RAW_CANARIES[5]);
  closeError.credential = RAW_CANARIES[3];
  closeError.path = RAW_CANARIES[4];
  const fake = strictFactory({ closeError });

  const snapshot = await bridge()({
    projection: PROJECTION,
    coordinationFactory: fake.coordinationFactory,
  });

  assertClosedSnapshot(snapshot, PROBE_ERROR);
  assert.deepEqual(fake.calls, expectedLifecycleCalls());
});

test("invalid pure projections fail before construction and never leak raw fields", async () => {
  const invalidProjections = [
    null,
    [],
    {},
    { ...PROJECTION, coordinationShutdownTimeoutMs: 0 },
    { ...PROJECTION, coordinationScopeId: "scope with spaces" },
    { ...PROJECTION, coordinationRedisUrl: 7 },
    { ...PROJECTION, rawConfig: RAW_CANARIES[3] },
  ];

  for (const projection of invalidProjections) {
    const fake = strictFactory();
    const snapshot = await bridge()({
      projection,
      coordinationFactory: fake.coordinationFactory,
    });

    assertClosedSnapshot(snapshot, PROBE_ERROR);
    assert.equal(fake.factoryCalls, 0);
    assert.deepEqual(fake.calls, []);
  }
});

test("invalid or throwing factories produce only a static error snapshot", async () => {
  for (const coordinationFactory of [undefined, null, {}, "createCoordination"]) {
    const snapshot = await bridge()({
      projection: PROJECTION,
      coordinationFactory,
    });
    assertClosedSnapshot(snapshot, PROBE_ERROR);
  }

  const calls = [];
  const snapshot = await bridge()({
    projection: PROJECTION,
    coordinationFactory() {
      calls.push("factory");
      const error = new Error(RAW_CANARIES[5]);
      error.rawConfig = { ...PROJECTION };
      throw error;
    },
  });

  assertClosedSnapshot(snapshot, PROBE_ERROR);
  assert.deepEqual(calls, ["factory"]);
});

test("an invalid owned instance is closed once when closure is available", async () => {
  const calls = [];
  const snapshot = await bridge()({
    projection: PROJECTION,
    coordinationFactory(options) {
      calls.push(["factory", structuredClone(options)]);
      return {
        status: RAW_CANARIES[5],
        async close() {
          calls.push(["close"]);
        },
        register() {
          throw new Error("managed orchestration is forbidden");
        },
      };
    },
  });

  assertClosedSnapshot(snapshot, PROBE_ERROR);
  assert.deepEqual(calls, [
    ["factory", { config: { ...PROJECTION } }],
    ["close"],
  ]);
});
