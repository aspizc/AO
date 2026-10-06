import assert from "node:assert/strict";
import crypto from "node:crypto";
import { getEventListeners } from "node:events";
import test from "node:test";

import * as coordinationModule from "../../gateway/src/coordination.js";
import {
  createCoordination,
  createOrchestratorCoordinationClient,
} from "../../gateway/src/coordination.js";
import * as coordinationQueueModule
  from "../../gateway/src/core/coordination_queue.js";
import {
  createRedisCoordinationQueue,
} from "../../gateway/src/core/coordination_queue.js";
import {
  createSqliteCoordinationConsumerRepository,
} from "../../gateway/src/core/repositories/sqlite_coordination_consumer_repo.js";
import {
  createSqliteDisposableRuntimeProfile,
} from "../../gateway/src/core/coordination_consumer_runtime_test_profile.js";
import {
  createCoordinationService,
} from "../../gateway/src/services/coordination_service.js";

const runtimeModule = await import(
  "../../gateway/src/core/coordination_consumer_runtime.js"
).catch((error) => Object.freeze({ loadError: error }));

const ACK_RECONCILIATION_OPERATIONS = Object.freeze([
  "list",
  "claim",
  "renew",
  "commitTombstone",
  "commitOrphan",
  "defer",
  "markAckRecoveryRequired",
  "getAckReconciliationSummary",
]);
const runtimeProfiles = [];

test.after(async () => {
  for (const profile of runtimeProfiles.reverse()) {
    await profile.dispose();
  }
});

function createRuntimeProfile() {
  const profile = createSqliteDisposableRuntimeProfile();
  runtimeProfiles.push(profile);
  return profile;
}

const BASE_MESSAGE = Object.freeze({
  protocolVersion: 1,
  scopeId: "scope-a",
  messageId: "cm-runtime-1",
  fromParticipantId: "pt-sender",
  toParticipantId: "pt-runtime",
  messageType: "IMPACT_NOTICE",
  classification: "internal",
  body: "runtime payload",
  createdAt: "2026-07-27T10:00:00.000Z",
  traceId: "trace-runtime-1",
});

function createRuntime(options) {
  if (runtimeModule.loadError) throw runtimeModule.loadError;
  return runtimeModule.createCoordinationConsumerRuntime(options);
}

function abortError() {
  return Object.assign(new Error("aborted"), { name: "AbortError" });
}

function createTrackedScheduler() {
  let nextId = 1;
  const timers = new Map();
  return {
    timers,
    setTimeout(callback, delayMs) {
      const timer = Object.freeze({ id: nextId });
      nextId += 1;
      timers.set(timer, { callback, delayMs });
      return timer;
    },
    clearTimeout(timer) {
      timers.delete(timer);
    },
  };
}

function createManagedClient({
  scopeId = "scope-a",
  participantId = "pt-runtime",
  state = "ready",
  receive,
  ack,
} = {}) {
  const calls = [];
  const pending = new Set();
  let startCalls = 0;
  let stopCalls = 0;
  let closeCalls = 0;

  async function invoke(operation, input, options = {}) {
    calls.push({
      operation,
      input: structuredClone(input),
      signal: options.signal,
    });
    let operationPromise;
    if (operation === "receive") {
      operationPromise = receive
        ? Promise.resolve().then(() => receive(input, options))
        : new Promise((resolve, reject) => {
            if (options.signal?.aborted) {
              reject(abortError());
              return;
            }
            const onAbort = () => reject(abortError());
            options.signal?.addEventListener("abort", onAbort, { once: true });
          });
    } else if (operation === "ack") {
      operationPromise = ack
        ? Promise.resolve().then(() => ack(input, options))
        : Promise.resolve({
            ackedCount: input.deliveryIds.length,
            deliveryIds: [...input.deliveryIds],
          });
    } else {
      operationPromise = Promise.reject(
        new Error(`unexpected managed operation ${operation}`),
      );
    }
    pending.add(operationPromise);
    operationPromise.then(
      () => pending.delete(operationPromise),
      () => pending.delete(operationPromise),
    );
    return operationPromise;
  }

  return {
    calls,
    pending,
    get startCalls() {
      return startCalls;
    },
    get stopCalls() {
      return stopCalls;
    },
    get closeCalls() {
      return closeCalls;
    },
    getStatus() {
      return Object.freeze({
        state,
        participantId,
        participantType: "orchestrator",
        scopeId,
        leaseExpiresAt: "2026-07-27T10:01:00.000Z",
        retryAttempt: 0,
        recovery: "No recovery action is required.",
      });
    },
    invoke,
    async start() {
      startCalls += 1;
      return this.getStatus();
    },
    async stop() {
      stopCalls += 1;
      return { state: "stopped" };
    },
    async close() {
      closeCalls += 1;
      return { status: "closed" };
    },
  };
}

function createHarness({
  profile = createRuntimeProfile(),
  pair = profile.createStore(),
  repository: providedRepository,
  coordinationClient = createManagedClient(),
  scheduler = createTrackedScheduler(),
  handler,
  acquireAckRecovery,
  reconciliationIntervalMs = 60_000,
  consumerConfig = {},
  reconciliationConfig = {},
} = {}) {
  const portReads = [];
  const database = pair.database;
  const repository = providedRepository
    ?? createSqliteCoordinationConsumerRepository({ database });
  const recoveryFacet = Object.freeze({
    async inspectAckTombstone() {
      return { status: "absent" };
    },
    async finalizeOrphanAck() {
      return { status: "transport_state_unknown" };
    },
  });
  let recoveryAcquisitions = 0;
  const acquire = acquireAckRecovery ?? (() => {
    recoveryAcquisitions += 1;
    return recoveryFacet;
  });
  const quarantineStore = Object.freeze({
    async put() {
      return { locator: "runtime-vault-1" };
    },
    async get() {
      return null;
    },
  });
  profile.admitTestManagedClient(coordinationClient);
  const provision = profile.provisionRuntime({
    database,
    originCapability: pair.originCapability,
    repository,
    coordinationClient,
    acquireAckRecovery: acquire,
  });
  const runtime = createRuntime({
    provision,
    quarantineStore,
    handler: handler ?? (async () => ({
      status: "committed",
      commitId: "runtime-effect-1",
    })),
    clock: () => Date.parse("2026-07-27T10:00:00.000Z"),
    scheduler,
    reconciliationIntervalMs,
    consumerConfig: {
      scopeId: "scope-a",
      consumerId: "runtime-consumer",
      ownerId: "runtime-consumer-owner",
      claimLeaseMs: 100,
      maxAttempts: 1,
      baseDelayMs: 1,
      maxDelayMs: 1,
      quarantineStoreMaxAttempts: 1,
      idleDelayMs: 1,
      receiveCount: 1,
      reclaimIdleMs: 0,
      blockMs: 1,
      ...consumerConfig,
    },
    reconciliationConfig: {
      ownerId: "runtime-reconciler-owner",
      claimLeaseMs: 100,
      deferMs: 1,
      tombstoneTtlMs: 60_000,
      limit: 1,
      ...reconciliationConfig,
    },
  });
  return {
    runtime,
    profile,
    pair,
    provision,
    database,
    repository,
    baseRepository: repository,
    coordinationClient,
    scheduler,
    recoveryFacet,
    acquire,
    portReads,
    recoveryAcquisitions: () => recoveryAcquisitions,
  };
}

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }
  assert.fail(message);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function settlementWithin(promise, timeoutMs = 250) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ status: "timeout" });
    }, timeoutMs);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve({ status: "fulfilled", value });
      },
      (reason) => {
        clearTimeout(timer);
        resolve({ status: "rejected", reason });
      },
    );
  });
}

function createAbortableBlockingClient() {
  let open = false;
  const listeners = new Map();
  const pending = new Set();
  const blockStarted = deferred();
  return {
    blockStarted: blockStarted.promise,
    commands: [],
    destroyCalls: 0,
    pending,
    get isOpen() {
      return open;
    },
    on(event, listener) {
      const eventListeners = listeners.get(event) ?? new Set();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
      return this;
    },
    off(event, listener) {
      listeners.get(event)?.delete(listener);
      if (listeners.get(event)?.size === 0) listeners.delete(event);
      return this;
    },
    async connect() {
      open = true;
    },
    sendCommand(command, options) {
      this.commands.push({
        command: structuredClone(command),
        signal: options?.abortSignal,
      });
      if (command[0] === "EVAL") {
        return Promise.resolve(
          command[1].includes("XAUTOCLAIM")
            ? [0, ["0-0", [], []]]
            : 0,
        );
      }
      if (command[0] !== "XREADGROUP") {
        return Promise.reject(new Error("unexpected blocking command"));
      }
      const operation = deferred();
      pending.add(operation);
      blockStarted.resolve();
      return operation.promise.finally(() => {
        pending.delete(operation);
      });
    },
    destroy() {
      this.destroyCalls += 1;
      open = false;
      for (const operation of pending) {
        operation.reject(new Error("blocking Redis operation cancelled"));
      }
    },
  };
}

function createPendingParticipantClient() {
  let open = false;
  const listeners = new Map();
  const pending = new Set();
  const participantLookupStarted = deferred();
  return {
    participantLookupStarted: participantLookupStarted.promise,
    commands: [],
    destroyCalls: 0,
    pending,
    get isOpen() {
      return open;
    },
    on(event, listener) {
      const eventListeners = listeners.get(event) ?? new Set();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
      return this;
    },
    off(event, listener) {
      listeners.get(event)?.delete(listener);
      if (listeners.get(event)?.size === 0) listeners.delete(event);
      return this;
    },
    async connect() {
      open = true;
    },
    sendCommand(command, options) {
      this.commands.push({
        command: structuredClone(command),
        signal: options?.abortSignal,
      });
      if (command[0] !== "GET") {
        return Promise.reject(new Error("unexpected participant command"));
      }
      const operation = deferred();
      pending.add(operation);
      participantLookupStarted.resolve();
      return operation.promise.finally(() => {
        pending.delete(operation);
      });
    },
    destroy() {
      this.destroyCalls += 1;
      open = false;
      for (const operation of pending) {
        operation.reject(new Error("participant lookup cancelled"));
      }
    },
  };
}

function runtimeParticipant(now, leaseToken) {
  return Object.freeze({
    protocolVersion: 1,
    participantId: "pt-runtime",
    participantType: "orchestrator",
    scopeId: "scope-a",
    capabilities: Object.freeze(["coordination.v1"]),
    metadata: Object.freeze({}),
    registeredAt: new Date(now).toISOString(),
    lastHeartbeatAt: new Date(now).toISOString(),
    leaseExpiresAt: new Date(now + 60_000).toISOString(),
    leaseTokenHash: crypto
      .createHash("sha256")
      .update(leaseToken)
      .digest("hex"),
  });
}

async function createRealManagedReceiveRuntime({
  queue,
  now,
  participant,
  leaseToken,
}) {
  const service = createCoordinationService({
    queue,
    config: {
      coordinationScopeId: "scope-a",
      coordinationLeaseDefaultMs: 60_000,
      coordinationLeaseMaxMs: 60_000,
      coordinationMessageMaxBytes: 65_536,
      coordinationMaxBlockMs: 30_000,
    },
    clock: () => now,
  });
  const receiveSignals = [];
  const managedScheduler = createTrackedScheduler();
  const coordinationClient = createOrchestratorCoordinationClient({
    coordination: managedReceiveCoordination({
      service,
      receiveSignals,
      now: () => now,
      participant,
      leaseToken,
    }),
    registration: {
      scopeId: "scope-a",
      capabilities: ["coordination.v1"],
    },
    clock: () => now,
    scheduler: managedScheduler,
    random: () => 0.5,
  });
  await coordinationClient.start();
  const harness = createHarness({
    coordinationClient,
    consumerConfig: { blockMs: 30_000 },
  });
  return {
    coordinationClient,
    harness,
    managedScheduler,
    receiveSignals,
  };
}

function managedReceiveCoordination({
  service,
  receiveSignals,
  now,
  participant,
  leaseToken,
}) {
  const publicParticipant = {
    protocolVersion: participant.protocolVersion,
    participantId: participant.participantId,
    participantType: participant.participantType,
    scopeId: participant.scopeId,
    capabilities: [...participant.capabilities],
    metadata: { ...participant.metadata },
    registeredAt: participant.registeredAt,
    lastHeartbeatAt: participant.lastHeartbeatAt,
    leaseExpiresAt: participant.leaseExpiresAt,
  };
  return {
    async status() {
      return {
        protocolVersion: 1,
        status: "ready",
        scopeId: participant.scopeId,
        limits: {
          leaseDefaultMs: 60_000,
          leaseMaxMs: 60_000,
        },
      };
    },
    async register() {
      return {
        ...publicParticipant,
        leaseToken,
      };
    },
    async heartbeat() {
      return {
        ...publicParticipant,
        lastHeartbeatAt: new Date(now()).toISOString(),
      };
    },
    async discover() {
      return [];
    },
    async send() {
      return { deliveryId: "1-0", duplicate: false };
    },
    receive(input, options) {
      receiveSignals.push(options?.signal);
      return service.receive(input, options);
    },
    async ack(input) {
      return {
        ackedCount: input.deliveryIds.length,
        deliveryIds: [...input.deliveryIds],
      };
    },
    async unregister(input) {
      return {
        participantId: input.participantId,
        unregistered: true,
      };
    },
  };
}

function propertyPath(parent, key) {
  return `${parent}.${typeof key === "symbol"
    ? `[${String(key)}]`
    : String(key)}`;
}

function reachableDataGraph(roots, limit = 1_024) {
  const pending = roots.map(({ path, value }) => ({ path, value }));
  const visited = new Set();
  const values = [];
  while (pending.length > 0) {
    const current = pending.shift();
    const isReference = current.value !== null && (
      typeof current.value === "object"
      || typeof current.value === "function"
    );
    if (!isReference || visited.has(current.value)) continue;
    visited.add(current.value);
    if (visited.size > limit) {
      throw new Error("reachable runtime graph exceeded its test bound");
    }
    for (const key of Reflect.ownKeys(current.value)) {
      const descriptor = Object.getOwnPropertyDescriptor(current.value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) continue;
      const path = propertyPath(current.path, key);
      values.push({ path, value: descriptor.value });
      if (
        descriptor.value !== null
        && (
          typeof descriptor.value === "object"
          || typeof descriptor.value === "function"
        )
      ) {
        pending.push({ path, value: descriptor.value });
      }
    }
    const prototype = Object.getPrototypeOf(current.value);
    if (
      prototype
      && prototype !== Object.prototype
      && prototype !== Function.prototype
    ) {
      pending.push({
        path: `${current.path}.<prototype>`,
        value: prototype,
      });
    }
  }
  return values;
}

function createPassiveQueue(label) {
  let pingCalls = 0;
  return {
    enabled: true,
    get pingCalls() {
      return pingCalls;
    },
    describe() {
      return {
        enabled: true,
        prefix: `runtime:${label}:v1`,
        eventsStream: `runtime:${label}:v1:events`,
        consumerGroup: "coordination-v1",
      };
    },
    async ping() {
      pingCalls += 1;
      return { status: "ready" };
    },
  };
}

test("runtime module exports the explicit lifecycle factory without auto-starting", async () => {
  assert.ifError(runtimeModule.loadError);
  assert.equal(
    typeof runtimeModule.createCoordinationConsumerRuntime,
    "function",
  );
  assert.equal(
    coordinationModule.createCoordinationConsumerRuntime,
    runtimeModule.createCoordinationConsumerRuntime,
  );

  const harness = createHarness();
  const queues = [createPassiveQueue("proxy-a"), createPassiveQueue("proxy-b")];
  const services = queues.map((queue) => createCoordination({ queue }));
  const statuses = await Promise.all(
    services.map((service) => service.status({})),
  );

  assert.deepEqual(
    statuses.map(({ status }) => status),
    ["ready", "ready"],
  );
  assert.deepEqual(
    queues.map(({ pingCalls }) => pingCalls),
    [1, 1],
  );
  assert.deepEqual(harness.runtime.getStatus(), {
    state: "idle",
    generation: 0,
  });
  assert.equal(harness.recoveryAcquisitions(), 0);
  assert.deepEqual(harness.coordinationClient.calls, []);
  assert.equal(harness.database.open, true);
  assert.equal(
    harness.database.prepare(
      "SELECT count(*) AS count "
      + "FROM main.coordination_consumer_runtime_owners",
    ).get().count,
    0,
  );
});

test("one SQLite store and scope has one owner, then stop releases it cleanly", async () => {
  const profile = createRuntimeProfile();
  const pair = profile.createStore();
  const first = createHarness({ profile, pair });
  const second = createHarness({ profile, pair });

  const firstStart = await first.runtime.start();
  assert.deepEqual(firstStart, {
    status: "started",
    generation: 1,
    scopeId: "scope-a",
    participantId: "pt-runtime",
  });
  await waitFor(
    () => first.coordinationClient.calls.some(
      ({ operation }) => operation === "receive",
    ),
    "first owner did not enter its receive loop",
  );

  await assert.rejects(
    first.runtime.start(),
    (error) => (
      error.code === "COORDINATION_CONSUMER_RUNTIME_ALREADY_RUNNING"
    ),
  );
  await assert.rejects(
    second.runtime.start(),
    (error) => (
      error.code === "COORDINATION_CONSUMER_RUNTIME_STORE_OWNED"
    ),
  );
  assert.deepEqual(second.coordinationClient.calls, []);

  assert.deepEqual(await first.runtime.stop(), {
    status: "stopped",
    generation: 1,
  });
  assert.deepEqual(await second.runtime.start(), {
    status: "started",
    generation: 1,
    scopeId: "scope-a",
    participantId: "pt-runtime",
  });
  await second.runtime.stop();

  assert.deepEqual(await first.runtime.start(), {
    status: "started",
    generation: 2,
    scopeId: "scope-a",
    participantId: "pt-runtime",
  });
  await first.runtime.stop();
  assert.deepEqual(first.runtime.getStatus(), {
    state: "stopped",
    generation: 2,
  });
});

test("two handles for one SQLite file share one owner and release it for replacement", async () => {
  const profile = createRuntimeProfile();
  const pairs = [
    profile.createStore(),
  ];
  pairs.push(profile.openHandle(pairs[0].storeOrigin));
  const harnesses = pairs.map((pair) => createHarness({ profile, pair }));
  const starts = await Promise.allSettled(
    harnesses.map(({ runtime }) => runtime.start()),
  );
  const startedIndexes = starts.flatMap((result, index) =>
    result.status === "fulfilled" ? [index] : []);
  const rejected = starts.filter((result) => result.status === "rejected");

  assert.equal(startedIndexes.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(
    rejected[0].reason?.code,
    "COORDINATION_CONSUMER_RUNTIME_STORE_OWNED",
  );

  const ownerIndex = startedIndexes[0];
  const replacementIndex = ownerIndex === 0 ? 1 : 0;
  await waitFor(
    () => harnesses[ownerIndex].coordinationClient.calls.some(
      ({ operation }) => operation === "receive",
    ),
    "the store-backed SQLite owner did not enter its receive loop",
  );
  await harnesses[ownerIndex].runtime.stop();

  assert.deepEqual(await harnesses[replacementIndex].runtime.start(), {
    status: "started",
    generation: 1,
    scopeId: "scope-a",
    participantId: "pt-runtime",
  });
  await harnesses[replacementIndex].runtime.stop();
  assert.deepEqual(
    pairs.map(({ database }) =>
      database.prepare("SELECT 42 AS value").get().value),
    [42, 42],
  );
});

test("profile capability cannot be transferred to another same-store handle", () => {
  const profile = createRuntimeProfile();
  const first = profile.createStore();
  const second = profile.openHandle(first.storeOrigin);
  const repository = createSqliteCoordinationConsumerRepository({
    database: second.database,
  });

  assert.throws(
    () => profile.provisionRuntime({
      database: second.database,
      originCapability: first.originCapability,
      repository,
      coordinationClient: createManagedClient(),
    }),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_PROFILE_INVALID"
    ),
  );
});

test("repository binding rejects a different SQLite store before ownership", () => {
  const profile = createRuntimeProfile();
  const first = profile.createStore();
  const second = profile.createStore();
  const repository = createSqliteCoordinationConsumerRepository({
    database: first.database,
  });

  assert.throws(
    () => createHarness({
      profile,
      pair: second,
      repository,
    }),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_MISMATCH"
    ),
  );
});

test("the runtime borrows an exact SQLite database and rejects PostgreSQL", async () => {
  const sqlite = createHarness();
  await sqlite.runtime.start();
  await sqlite.runtime.stop();

  assert.equal(sqlite.database.open, true);
  assert.equal(sqlite.database.prepare("SELECT 42 AS value").get().value, 42);
  assert.equal(sqlite.coordinationClient.startCalls, 0);
  assert.equal(sqlite.coordinationClient.stopCalls, 0);
  assert.equal(sqlite.coordinationClient.closeCalls, 0);

  for (const database of [
    {
      backend: "postgres",
      memory: false,
      prepare() {},
      transaction() {},
      pragma() {},
    },
    {
      backend: "mysql",
      memory: false,
      prepare() {},
      transaction() {},
      pragma() {},
    },
    { backend: "sqlite" },
  ]) {
    assert.throws(
      () => sqlite.profile.probeUnsupportedBackend(database),
      /SQLite backend is required; PostgreSQL is deferred to Project V5 I\/0\/05/,
    );
  }
});

test("runtime lifecycle bounds reject invalid scope, interval, and scheduler", () => {
  assert.throws(
    () => createHarness({
      consumerConfig: { scopeId: "unsafe scope" },
    }),
    /consumerConfig\.scopeId must be a safe identifier/,
  );
  for (const reconciliationIntervalMs of [
    0,
    -1,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    assert.throws(
      () => createHarness({ reconciliationIntervalMs }),
      /reconciliationIntervalMs must be a positive safe integer/,
    );
  }
  assert.throws(
    () => createHarness({ scheduler: {} }),
    /scheduler must provide setTimeout and clearTimeout functions/,
  );
});

test("managed client readiness and exact scope fail closed before ownership", async () => {
  for (const coordinationClient of [
    createManagedClient({ state: "stopped" }),
    createManagedClient({ scopeId: "scope-other" }),
    createManagedClient({ participantId: "unsafe participant" }),
  ]) {
    const profile = createRuntimeProfile();
    const pair = profile.createStore();
    let rejected;
    try {
      rejected = createHarness({
        profile,
        pair,
        coordinationClient,
      });
    } catch (error) {
      assert.equal(
        error.code,
        "COORDINATION_CONSUMER_RUNTIME_CLIENT_NOT_READY",
      );
    }
    if (rejected) {
      await assert.rejects(
        rejected.runtime.start(),
        (error) => (
          error.code === "COORDINATION_CONSUMER_RUNTIME_CLIENT_NOT_READY"
        ),
      );
    }

    const replacement = createHarness({ profile, pair });
    await replacement.runtime.start();
    await replacement.runtime.stop();
    assert.deepEqual(coordinationClient.calls, []);
  }
});

test("managed client and ACK recovery authorities are reused once and unreachable", async () => {
  let rawClientFactoryCalls = 0;
  const rawManagedClient = Object.freeze({
    async connect() {},
    async sendCommand() {
      throw new Error("raw managed client must remain unreachable");
    },
    destroy() {},
  });
  const rawClientFactory = () => {
    rawClientFactoryCalls += 1;
    return rawManagedClient;
  };
  const redisUrl = "redis://runtime-authority-sentinel.invalid";
  const queue = createRedisCoordinationQueue({
    redisUrl,
    clientFactory: rawClientFactory,
  });
  const service = createCoordination({ queue });
  const harness = createHarness();

  await harness.runtime.start();
  await waitFor(
    () => harness.scheduler.timers.size === 1,
    "reconciliation loop did not consume the frozen repository port",
  );
  await harness.runtime.stop();
  await harness.runtime.start();
  await harness.runtime.stop();

  const graph = reachableDataGraph([
    { path: "queue", value: queue },
    { path: "service", value: service },
    { path: "runtime", value: harness.runtime },
    { path: "runtimeModule", value: runtimeModule },
    { path: "coordinationModule", value: coordinationModule },
    { path: "queueModule", value: coordinationQueueModule },
  ]);
  const forbiddenPaths = graph
    .map(({ path }) => path)
    .filter((path) =>
      /clientFactory|clientOptions|redisUrl|commandLane|blockingLane|executor|recoveryFacet|acquireAckRecovery/i
        .test(path),
    )
    .sort();

  assert.deepEqual({
    rawClientFactoryCalls,
    recoveryAcquisitions: harness.recoveryAcquisitions(),
    recoveryFacetReachable: graph.some(
      ({ value }) => value === harness.recoveryFacet,
    ),
    recoveryAcquirerReachable: graph.some(
      ({ value }) => value === harness.acquire,
    ),
    rawManagedClientReachable: graph.some(
      ({ value }) => value === rawManagedClient,
    ),
    rawClientFactoryReachable: graph.some(
      ({ value }) => value === rawClientFactory,
    ),
    redisUrlReachable: graph.some(({ value }) => value === redisUrl),
    forbiddenPaths,
    runtimeOwnKeys: Reflect.ownKeys(harness.runtime).map(String).sort(),
    runtimeModuleRecoveryExports: Reflect.ownKeys(runtimeModule)
      .map(String)
      .filter((key) => /tombstone|orphan|recovery/i.test(key))
      .sort(),
  }, {
    rawClientFactoryCalls: 0,
    recoveryAcquisitions: 1,
    recoveryFacetReachable: false,
    recoveryAcquirerReachable: false,
    rawManagedClientReachable: false,
    rawClientFactoryReachable: false,
    redisUrlReachable: false,
    forbiddenPaths: [],
    runtimeOwnKeys: ["getStatus", "start", "stop"],
    runtimeModuleRecoveryExports: [],
  });
  assert.deepEqual(
    Object.keys(harness.repository.ackReconciliation).sort(),
    [...ACK_RECONCILIATION_OPERATIONS].sort(),
  );
  await queue.close();
});

test("recovery acquisition accepts only an exact own-data facet", async () => {
  let getterCalls = 0;
  const accessorFacet = {};
  Object.defineProperty(accessorFacet, "inspectAckTombstone", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return async () => ({ status: "absent" });
    },
  });
  Object.defineProperty(accessorFacet, "finalizeOrphanAck", {
    enumerable: true,
    value: async () => ({ status: "transport_state_unknown" }),
  });
  const harness = createHarness({
    acquireAckRecovery: () => accessorFacet,
  });

  await assert.rejects(
    harness.runtime.start(),
    (error) => (
      error.code === "COORDINATION_CONSUMER_RUNTIME_RECOVERY_INVALID"
    ),
  );
  assert.equal(getterCalls, 0);
  assert.deepEqual(harness.coordinationClient.calls, []);
});

test("abortable idempotent stop settles in-flight work and leaks nothing", async () => {
  const handlesBefore = new Set(process._getActiveHandles());
  const requestsBefore = new Set(process._getActiveRequests());
  let handlerEntered;
  const enteredHandler = new Promise((resolve) => {
    handlerEntered = resolve;
  });
  let handlerPending = 0;
  let handlerSignal;
  let receiveCount = 0;
  const coordinationClient = createManagedClient({
    receive: async (_input, { signal }) => {
      receiveCount += 1;
      if (receiveCount === 1) {
        return [{
          deliveryId: "100-0",
          recovered: false,
          message: { ...BASE_MESSAGE },
        }];
      }
      await new Promise((resolve, reject) => {
        if (signal.aborted) {
          reject(abortError());
          return;
        }
        signal.addEventListener("abort", () => reject(abortError()), {
          once: true,
        });
      });
      return [];
    },
  });
  const harness = createHarness({
    coordinationClient,
    handler: async ({ signal }) => {
      handlerPending += 1;
      handlerSignal = signal;
      handlerEntered();
      try {
        await new Promise((resolve, reject) => {
          if (signal.aborted) {
            reject(abortError());
            return;
          }
          signal.addEventListener("abort", () => reject(abortError()), {
            once: true,
          });
        });
      } finally {
        handlerPending -= 1;
      }
      return { status: "committed", commitId: "must-not-commit" };
    },
  });

  await harness.runtime.start();
  await enteredHandler;
  await waitFor(
    () => harness.scheduler.timers.size === 1,
    "reconciliation interval timer was not installed",
  );
  const firstStop = harness.runtime.stop();
  const secondStop = harness.runtime.stop();

  assert.equal(firstStop, secondStop);
  assert.deepEqual(await firstStop, {
    status: "stopped",
    generation: 1,
  });
  assert.equal(handlerSignal.aborted, true);
  assert.equal(handlerPending, 0);
  assert.equal(coordinationClient.pending.size, 0);
  assert.equal(harness.scheduler.timers.size, 0);
  assert.equal(getEventListeners(handlerSignal, "abort").length, 0);
  assert.equal(
    coordinationClient.calls.some(({ operation }) => operation === "ack"),
    false,
  );
  assert.deepEqual(harness.runtime.getStatus(), {
    state: "stopped",
    generation: 1,
  });
  assert.equal(harness.runtime.stop(), firstStop);
  await new Promise((resolve) => {
    setImmediate(resolve);
  });
  assert.deepEqual(
    process._getActiveHandles().filter((handle) => !handlesBefore.has(handle)),
    [],
  );
  assert.deepEqual(
    process._getActiveRequests().filter(
      (request) => !requestsBefore.has(request),
    ),
    [],
  );
});

test("the real managed client aborts and settles its blocking Redis receive", async () => {
  const now = Date.parse("2026-07-27T10:00:00.000Z");
  const leaseToken = "runtime-managed-cancellation-token-0001";
  const participant = Object.freeze({
    protocolVersion: 1,
    participantId: "pt-runtime",
    participantType: "orchestrator",
    scopeId: "scope-a",
    capabilities: Object.freeze(["coordination.v1"]),
    metadata: Object.freeze({}),
    registeredAt: new Date(now).toISOString(),
    lastHeartbeatAt: new Date(now).toISOString(),
    leaseExpiresAt: new Date(now + 60_000).toISOString(),
    leaseTokenHash: crypto
      .createHash("sha256")
      .update(leaseToken)
      .digest("hex"),
  });
  const rawClient = createAbortableBlockingClient();
  const redisQueue = createRedisCoordinationQueue({
    redisUrl: "redis://runtime-cancellation.invalid",
    shutdownTimeoutMs: 10,
    clientFactory(_options, { kind }) {
      assert.equal(kind, "blocking");
      return rawClient;
    },
  });
  const queueSignals = [];
  const service = createCoordinationService({
    queue: {
      enabled: true,
      describe() {
        return redisQueue.describe();
      },
      async getParticipant(participantId) {
        assert.equal(participantId, participant.participantId);
        return structuredClone(participant);
      },
      readInbox(input, options) {
        queueSignals.push(options?.signal);
        return redisQueue.readInbox(input, options);
      },
    },
    config: {
      coordinationScopeId: "scope-a",
      coordinationLeaseDefaultMs: 60_000,
      coordinationLeaseMaxMs: 60_000,
      coordinationMessageMaxBytes: 65_536,
      coordinationMaxBlockMs: 30_000,
    },
    clock: () => now,
  });
  const receiveSignals = [];
  const managedScheduler = createTrackedScheduler();
  const coordinationClient = createOrchestratorCoordinationClient({
    coordination: managedReceiveCoordination({
      service,
      receiveSignals,
      now: () => now,
      participant,
      leaseToken,
    }),
    registration: {
      scopeId: "scope-a",
      capabilities: ["coordination.v1"],
    },
    clock: () => now,
    scheduler: managedScheduler,
    random: () => 0.5,
  });
  let harness;
  let stopFlight;

  try {
    await coordinationClient.start();
    harness = createHarness({
      coordinationClient,
      consumerConfig: { blockMs: 30_000 },
    });
    await harness.runtime.start();
    await rawClient.blockStarted;

    stopFlight = harness.runtime.stop();
    assert.deepEqual(await settlementWithin(stopFlight), {
      status: "fulfilled",
      value: {
        status: "stopped",
        generation: 1,
      },
    });

    const blockingCommand = rawClient.commands.find(
      ({ command }) => command[0] === "XREADGROUP",
    );
    assert.equal(receiveSignals.length, 1);
    assert.equal(queueSignals.length, 1);
    assert.equal(receiveSignals[0], queueSignals[0]);
    assert.equal(blockingCommand.signal, receiveSignals[0]);
    assert.equal(receiveSignals[0].aborted, true);
    assert.equal(getEventListeners(receiveSignals[0], "abort").length, 0);
    assert.equal(rawClient.pending.size, 0);
    assert.equal(rawClient.destroyCalls, 1);
    assert.equal(coordinationClient.getStatus().state, "ready");
  } finally {
    await redisQueue.close();
    if (stopFlight) await Promise.allSettled([stopFlight]);
    await coordinationClient.stop();
    assert.equal(managedScheduler.timers.size, 0);
  }
});

test("stop removes and settles a real managed receive queued behind unrelated blocking work", async () => {
  const now = Date.parse("2026-07-27T10:00:00.000Z");
  const leaseToken = "runtime-managed-queued-token-0001";
  const participant = runtimeParticipant(now, leaseToken);
  const rawClient = createAbortableBlockingClient();
  const redisQueue = createRedisCoordinationQueue({
    redisUrl: "redis://runtime-queued-cancellation.invalid",
    shutdownTimeoutMs: 10,
    clientFactory(_options, { kind }) {
      assert.equal(kind, "blocking");
      return rawClient;
    },
  });
  const participantSignals = [];
  const queueSignals = [];
  const managed = await createRealManagedReceiveRuntime({
    queue: {
      enabled: true,
      describe() {
        return redisQueue.describe();
      },
      async getParticipant(participantId, options) {
        assert.equal(participantId, participant.participantId);
        participantSignals.push(options?.signal);
        return structuredClone(participant);
      },
      readInbox(input, options) {
        queueSignals.push(options?.signal);
        return redisQueue.readInbox(input, options);
      },
    },
    now,
    participant,
    leaseToken,
  });
  const unrelatedRead = redisQueue.readInbox({
    participantId: participant.participantId,
    consumerId: "unrelated-consumer",
    count: 1,
    reclaimIdleMs: 0,
    blockMs: 30_000,
    now,
    fence: {
      participantId: participant.participantId,
      leaseTokenHash: participant.leaseTokenHash,
      scopeId: participant.scopeId,
    },
  });
  let stopFlight;

  try {
    await rawClient.blockStarted;
    await managed.coordinationClient.start();
    await managed.harness.runtime.start();
    await waitFor(
      () => redisQueue.lifecycle().blocking.queued === 1,
      "the managed receive did not queue behind the unrelated blocker",
    );

    stopFlight = managed.harness.runtime.stop();
    assert.deepEqual(await settlementWithin(stopFlight), {
      status: "fulfilled",
      value: {
        status: "stopped",
        generation: 1,
      },
    });

    assert.equal(managed.receiveSignals.length, 1);
    assert.equal(participantSignals.length, 1);
    assert.equal(queueSignals.length, 1);
    assert.equal(participantSignals[0], managed.receiveSignals[0]);
    assert.equal(queueSignals[0], managed.receiveSignals[0]);
    assert.equal(managed.receiveSignals[0].aborted, true);
    assert.equal(
      getEventListeners(managed.receiveSignals[0], "abort").length,
      0,
    );
    assert.deepEqual(redisQueue.lifecycle().blocking, {
      state: "ready",
      active: 1,
      queued: 0,
      capacity: 1,
      queueLimit: 32,
    });
    assert.equal(rawClient.pending.size, 1);
    assert.equal(rawClient.destroyCalls, 0);
    assert.deepEqual(await settlementWithin(unrelatedRead, 20), {
      status: "timeout",
    });
    assert.equal(managed.coordinationClient.getStatus().state, "ready");
  } finally {
    await redisQueue.close();
    await Promise.allSettled([
      unrelatedRead,
      ...(stopFlight ? [stopFlight] : []),
    ]);
    await managed.coordinationClient.stop();
    assert.equal(managed.managedScheduler.timers.size, 0);
  }
});

test("stop aborts and settles a real managed receive pending in participant lookup", async () => {
  const now = Date.parse("2026-07-27T10:00:00.000Z");
  const leaseToken = "runtime-managed-lookup-token-0001";
  const participant = runtimeParticipant(now, leaseToken);
  const rawClient = createPendingParticipantClient();
  const redisQueue = createRedisCoordinationQueue({
    redisUrl: "redis://runtime-lookup-cancellation.invalid",
    shutdownTimeoutMs: 10,
    clientFactory(_options, { kind }) {
      assert.equal(kind, "command");
      return rawClient;
    },
  });
  const managed = await createRealManagedReceiveRuntime({
    queue: redisQueue,
    now,
    participant,
    leaseToken,
  });
  let stopFlight;

  try {
    await managed.coordinationClient.start();
    await managed.harness.runtime.start();
    await rawClient.participantLookupStarted;

    stopFlight = managed.harness.runtime.stop();
    assert.deepEqual(await settlementWithin(stopFlight), {
      status: "fulfilled",
      value: {
        status: "stopped",
        generation: 1,
      },
    });

    assert.equal(managed.receiveSignals.length, 1);
    assert.equal(rawClient.commands.length, 1);
    assert.equal(rawClient.commands[0].command[0], "GET");
    assert.equal(rawClient.commands[0].signal, managed.receiveSignals[0]);
    assert.equal(managed.receiveSignals[0].aborted, true);
    assert.equal(
      getEventListeners(managed.receiveSignals[0], "abort").length,
      0,
    );
    assert.equal(rawClient.pending.size, 0);
    assert.equal(rawClient.destroyCalls, 1);
    assert.deepEqual(redisQueue.lifecycle().blocking, {
      state: "idle",
      active: 0,
      queued: 0,
      capacity: 1,
      queueLimit: 32,
    });
    assert.equal(managed.coordinationClient.getStatus().state, "ready");
  } finally {
    await redisQueue.close();
    if (stopFlight) await Promise.allSettled([stopFlight]);
    await managed.coordinationClient.stop();
    assert.equal(managed.managedScheduler.timers.size, 0);
  }
});

test("a pre-aborted queued Redis operation is rejected without retaining a slot", async () => {
  const rawClient = createAbortableBlockingClient();
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://runtime-pre-aborted.invalid",
    shutdownTimeoutMs: 10,
    clientFactory(_options, { kind }) {
      assert.equal(kind, "blocking");
      return rawClient;
    },
  });
  const fence = {
    participantId: "pt-runtime",
    leaseTokenHash: "a".repeat(64),
    scopeId: "scope-a",
  };
  const first = queue.readInbox({
    participantId: "pt-runtime",
    consumerId: "first-consumer",
    count: 1,
    blockMs: 30_000,
    now: 1,
    fence,
  });
  void first.catch(() => {});
  const controller = new AbortController();
  controller.abort();
  let second;

  try {
    await rawClient.blockStarted;
    second = queue.readInbox({
      participantId: "pt-runtime",
      consumerId: "second-consumer",
      count: 1,
      blockMs: 30_000,
      now: 1,
      fence,
    }, { signal: controller.signal });
    void second.catch(() => {});

    const settlement = await settlementWithin(second);
    assert.equal(settlement.status, "rejected");
    assert.equal(queue.lifecycle().blocking.queued, 0);
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
    assert.equal(rawClient.pending.size, 1);
    assert.equal(rawClient.destroyCalls, 0);
  } finally {
    await queue.close();
    await Promise.allSettled([first, ...(second ? [second] : [])]);
  }
});

test("a queued Redis abort listener is replaced, not retained, when the entry drains", async () => {
  const rawClient = createAbortableBlockingClient();
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://runtime-drain-cleanup.invalid",
    shutdownTimeoutMs: 10,
    clientFactory(_options, { kind }) {
      assert.equal(kind, "blocking");
      return rawClient;
    },
  });
  const fence = {
    participantId: "pt-runtime",
    leaseTokenHash: "b".repeat(64),
    scopeId: "scope-a",
  };
  const first = queue.readInbox({
    participantId: "pt-runtime",
    consumerId: "first-consumer",
    count: 1,
    blockMs: 30_000,
    now: 1,
    fence,
  });
  void first.catch(() => {});
  const controller = new AbortController();
  let second;

  try {
    await rawClient.blockStarted;
    second = queue.readInbox({
      participantId: "pt-runtime",
      consumerId: "second-consumer",
      count: 1,
      blockMs: 30_000,
      now: 1,
      fence,
    }, { signal: controller.signal });
    void second.catch(() => {});
    await waitFor(
      () => queue.lifecycle().blocking.queued === 1,
      "the second Redis operation did not queue",
    );
    assert.equal(getEventListeners(controller.signal, "abort").length, 1);

    [...rawClient.pending][0].resolve(null);
    await first;
    await waitFor(
      () => rawClient.commands.filter(
        ({ command }) => command[0] === "XREADGROUP",
      ).length === 2,
      "the queued Redis operation did not drain",
    );
    assert.equal(getEventListeners(controller.signal, "abort").length, 1);

    controller.abort();
    const settlement = await settlementWithin(second);
    assert.equal(settlement.status, "rejected");
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  } finally {
    await queue.close();
    await Promise.allSettled([first, ...(second ? [second] : [])]);
  }
});

test("closing a Redis lane removes every queued abort listener", async () => {
  const rawClient = createAbortableBlockingClient();
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://runtime-close-cleanup.invalid",
    shutdownTimeoutMs: 10,
    clientFactory(_options, { kind }) {
      assert.equal(kind, "blocking");
      return rawClient;
    },
  });
  const fence = {
    participantId: "pt-runtime",
    leaseTokenHash: "c".repeat(64),
    scopeId: "scope-a",
  };
  const first = queue.readInbox({
    participantId: "pt-runtime",
    consumerId: "first-consumer",
    count: 1,
    blockMs: 30_000,
    now: 1,
    fence,
  });
  void first.catch(() => {});
  const controller = new AbortController();
  let second;

  try {
    await rawClient.blockStarted;
    second = queue.readInbox({
      participantId: "pt-runtime",
      consumerId: "second-consumer",
      count: 1,
      blockMs: 30_000,
      now: 1,
      fence,
    }, { signal: controller.signal });
    void second.catch(() => {});
    await waitFor(
      () => queue.lifecycle().blocking.queued === 1,
      "the close-cleanup Redis operation did not queue",
    );
    assert.equal(getEventListeners(controller.signal, "abort").length, 1);

    await queue.close();
    const settlement = await settlementWithin(second);
    assert.equal(settlement.status, "rejected");
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  } finally {
    await queue.close();
    await Promise.allSettled([first, ...(second ? [second] : [])]);
  }
});

test("an abort immediately before idle delay settles without a timer", async () => {
  let runtime;
  let stopFromReceive;
  const coordinationClient = createManagedClient({
    receive: async () => {
      stopFromReceive = runtime.stop();
      return [];
    },
  });
  const harness = createHarness({ coordinationClient });
  runtime = harness.runtime;

  await runtime.start();
  await waitFor(
    () => stopFromReceive !== undefined,
    "managed receive did not trigger the stop race",
  );
  let deadline;
  let stopped;
  try {
    stopped = await Promise.race([
      stopFromReceive,
      new Promise((_, reject) => {
        deadline = setTimeout(
          () => reject(new Error("pre-aborted delay did not settle")),
          100,
        );
      }),
    ]);
  } finally {
    clearTimeout(deadline);
  }

  assert.deepEqual(stopped, {
    status: "stopped",
    generation: 1,
  });
  assert.equal(harness.scheduler.timers.size, 0);
  assert.equal(coordinationClient.pending.size, 0);
});

test("stop before start is idempotent and allocates no authority or work", async () => {
  const harness = createHarness();
  const first = harness.runtime.stop();
  const second = harness.runtime.stop();

  assert.equal(first, second);
  assert.deepEqual(await first, {
    status: "stopped",
    generation: 0,
  });
  assert.equal(harness.recoveryAcquisitions(), 0);
  assert.deepEqual(harness.coordinationClient.calls, []);
  assert.equal(harness.scheduler.timers.size, 0);
  assert.deepEqual(harness.runtime.getStatus(), {
    state: "stopped",
    generation: 0,
  });
});
