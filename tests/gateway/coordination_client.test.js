import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createOrchestratorCoordinationClient,
} from "../../gateway/src/coordination.js";

const START = Date.parse("2026-07-26T08:00:00.000Z");
const LEASE_TTL_MS = 1_000;
const MAX_DATE_MS = 8_640_000_000_000_000;

function testLeaseToken(index) {
  return `test-lease-${String(index + 1).padStart(32, "0")}`;
}

function coordinationError(code, message = "safe coordination failure") {
  return Object.assign(new Error(message), { code });
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

async function settle() {
  for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
}

class FakeScheduler {
  constructor() {
    this.now = START;
    this.nextId = 1;
    this.timers = new Map();
  }

  setTimeout(callback, delayMs) {
    const id = this.nextId;
    this.nextId += 1;
    this.timers.set(id, {
      callback,
      dueAt: this.now + delayMs,
    });
    return id;
  }

  clearTimeout(id) {
    this.timers.delete(id);
  }

  delays() {
    return [...this.timers.values()]
      .map(({ dueAt }) => dueAt - this.now)
      .sort((left, right) => left - right);
  }

  async advanceBy(durationMs) {
    const target = this.now + durationMs;
    while (true) {
      const next = [...this.timers.entries()]
        .filter(([, timer]) => timer.dueAt <= target)
        .sort((left, right) => {
          if (left[1].dueAt !== right[1].dueAt) {
            return left[1].dueAt - right[1].dueAt;
          }
          return left[0] - right[0];
        })[0];
      if (!next) break;
      const [id, timer] = next;
      this.timers.delete(id);
      this.now = timer.dueAt;
      await timer.callback();
      await settle();
    }
    this.now = target;
    await settle();
  }

  fireNext() {
    const next = [...this.timers.entries()]
      .sort((left, right) => {
        if (left[1].dueAt !== right[1].dueAt) {
          return left[1].dueAt - right[1].dueAt;
        }
        return left[0] - right[0];
      })[0];
    if (!next) throw new Error("no scheduled timer");
    const [id, timer] = next;
    this.timers.delete(id);
    this.now = timer.dueAt;
    return timer.callback();
  }
}

class FakeCoordination {
  constructor(scheduler) {
    this.scheduler = scheduler;
    this.calls = {
      status: [],
      register: [],
      heartbeat: [],
      discover: [],
      send: [],
      receive: [],
      ack: [],
      unregister: [],
    };
    this.statusHook = null;
    this.registerHook = null;
    this.heartbeatHook = null;
    this.unregisterHook = null;
    this.operationHooks = {};
  }

  async status(input) {
    this.calls.status.push(structuredClone(input));
    if (this.statusHook) {
      return this.statusHook(
        structuredClone(input),
        this.calls.status.length - 1,
      );
    }
    return this.statusResult();
  }

  statusResult() {
    return {
      protocolVersion: 1,
      status: "ready",
      scopeId: "agents-orchestrator",
      queue: {
        enabled: true,
        prefix: "test:coord:v1",
        eventsStream: "test:coord:v1:events",
        consumerGroup: "coordination-v1",
      },
      limits: {
        leaseDefaultMs: LEASE_TTL_MS,
        leaseMaxMs: 10_000,
      },
    };
  }

  registration(input, index = this.calls.register.length - 1) {
    const participantId = `pt-client-${index + 1}`;
    const timestamp = new Date(this.scheduler.now).toISOString();
    return {
      protocolVersion: 1,
      participantId,
      participantType: "orchestrator",
      scopeId: "agents-orchestrator",
      capabilities: [...(input.capabilities ?? [])],
      metadata: structuredClone(input.metadata ?? {}),
      registeredAt: timestamp,
      lastHeartbeatAt: timestamp,
      leaseExpiresAt: new Date(
        this.scheduler.now + input.leaseTtlMs,
      ).toISOString(),
      leaseToken: testLeaseToken(index),
      queue: {
        enabled: true,
        prefix: "test:coord:v1",
        eventsStream: "test:coord:v1:events",
        consumerGroup: "coordination-v1",
      },
    };
  }

  async register(input) {
    this.calls.register.push(structuredClone(input));
    if (this.registerHook) {
      return this.registerHook(
        structuredClone(input),
        this.calls.register.length - 1,
      );
    }
    return this.registration(input);
  }

  async heartbeat(input) {
    this.calls.heartbeat.push(structuredClone(input));
    if (this.heartbeatHook) {
      return this.heartbeatHook(
        structuredClone(input),
        this.calls.heartbeat.length - 1,
      );
    }
    return this.heartbeatResult(input);
  }

  heartbeatResult(input) {
    const timestamp = new Date(this.scheduler.now).toISOString();
    return {
      protocolVersion: 1,
      participantId: input.participantId,
      participantType: "orchestrator",
      scopeId: "agents-orchestrator",
      capabilities: ["coordination.v1"],
      metadata: {},
      registeredAt: new Date(START).toISOString(),
      lastHeartbeatAt: timestamp,
      leaseExpiresAt: new Date(
        this.scheduler.now + input.leaseTtlMs,
      ).toISOString(),
    };
  }

  async invokeOperation(operation, input) {
    this.calls[operation].push(structuredClone(input));
    if (this.operationHooks[operation]) {
      return this.operationHooks[operation](
        structuredClone(input),
        this.calls[operation].length - 1,
      );
    }
    return { operation, ok: true };
  }

  discover(input) {
    return this.invokeOperation("discover", input);
  }

  send(input) {
    return this.invokeOperation("send", input);
  }

  receive(input) {
    return this.invokeOperation("receive", input);
  }

  ack(input) {
    return this.invokeOperation("ack", input);
  }

  async unregister(input) {
    this.calls.unregister.push(structuredClone(input));
    if (this.unregisterHook) {
      return this.unregisterHook(
        structuredClone(input),
        this.calls.unregister.length - 1,
      );
    }
    return {
      participantId: input.participantId,
      unregistered: true,
    };
  }
}

function createHarness({
  random = () => 0.5,
  retry,
  registration = {},
  clock,
} = {}) {
  const scheduler = new FakeScheduler();
  const coordination = new FakeCoordination(scheduler);
  const client = createOrchestratorCoordinationClient({
    coordination,
    registration: {
      capabilities: ["coordination.v1"],
      ...registration,
    },
    clock: clock ?? (() => scheduler.now),
    scheduler,
    random,
    retry,
  });
  return { client, coordination, scheduler };
}

function assertNoToken(value) {
  const serialized = JSON.stringify(value);
  for (let index = 0; index < 4; index += 1) {
    const token = testLeaseToken(index);
    assert.equal(
      serialized.includes(token),
      false,
      "the public client surface exposed a lease token",
    );
  }
  assert.equal(serialized.includes("leaseToken"), false);
}

async function settlementWithinMicrotasks(promise, turns = 12) {
  let state = "pending";
  Promise.resolve(promise).then(
    () => {
      state = "fulfilled";
    },
    () => {
      state = "rejected";
    },
  );
  for (let turn = 0; turn < turns; turn += 1) await Promise.resolve();
  return state;
}

test("start checks readiness, registers an orchestrator, and renews around half the lease", async () => {
  const { client, coordination, scheduler } = createHarness({
    random: () => 0.5,
  });

  const started = await client.start();

  assert.deepEqual(coordination.calls.status, [{}]);
  assert.deepEqual(coordination.calls.register, [{
    participantType: "orchestrator",
    scopeId: "agents-orchestrator",
    capabilities: ["coordination.v1"],
    leaseTtlMs: LEASE_TTL_MS,
  }]);
  assert.equal(started.state, "ready");
  assert.equal(started.participantId, "pt-client-1");
  assert.equal(started.scopeId, "agents-orchestrator");
  assert.deepEqual(scheduler.delays(), [500]);
  assertNoToken(started);
  assertNoToken(client.getStatus());
  assertNoToken(client);

  await scheduler.advanceBy(500);

  assert.equal(coordination.calls.heartbeat.length, 1);
  assert.deepEqual(coordination.calls.heartbeat[0], {
    participantId: "pt-client-1",
    leaseToken: testLeaseToken(0),
    leaseTtlMs: LEASE_TTL_MS,
  });
  assert.equal(client.getStatus().state, "ready");
  assert.deepEqual(scheduler.delays(), [500]);

  await client.stop();
});

test("start rejects unsupported status protocol and contradictory requested scope", async () => {
  {
    const { client, coordination } = createHarness();
    coordination.statusHook = () => ({
      ...coordination.statusResult(),
      protocolVersion: 999,
    });

    await assert.rejects(
      client.start(),
      (error) => error.code === "COORDINATION_CLIENT_CONTRACT_INVALID",
    );
    assert.equal(coordination.calls.register.length, 0);
    assert.equal(client.getStatus().state, "degraded");
    assert.equal(
      client.getStatus().lastError.code,
      "COORDINATION_CLIENT_CONTRACT_INVALID",
    );
  }

  {
    const { client, coordination } = createHarness({
      registration: { scopeId: "different-scope" },
    });

    await assert.rejects(
      client.start(),
      (error) => error.code === "COORDINATION_CLIENT_CONTRACT_INVALID",
    );
    assert.equal(coordination.calls.register.length, 0);
    assert.equal(client.getStatus().state, "degraded");
  }
});

test("registration cannot make a non-orchestrator or cross-scope identity ready", async () => {
  for (const mutate of [
    (registered) => {
      registered.participantType = "agent";
    },
    (registered) => {
      registered.scopeId = "different-scope";
    },
  ]) {
    const { client, coordination } = createHarness();
    coordination.registerHook = (input, index) => {
      const registered = coordination.registration(input, index);
      mutate(registered);
      return registered;
    };

    await assert.rejects(
      client.start(),
      (error) => error.code === "COORDINATION_CLIENT_CONTRACT_INVALID",
    );
    await settle();

    assert.equal(client.getStatus().state, "degraded");
    assert.equal(
      client.getStatus().lastError.code,
      "COORDINATION_CLIENT_CONTRACT_INVALID",
    );
    assert.equal(coordination.calls.unregister.length, 1);
    assert.deepEqual(coordination.calls.unregister[0], {
      participantId: "pt-client-1",
      leaseToken: testLeaseToken(0),
    });
    assertNoToken(client.getStatus());
  }
});

test("heartbeat cannot change the owned participant id, type, or canonical scope", async () => {
  for (const mutate of [
    (renewed) => {
      renewed.participantId = "pt-other";
    },
    (renewed) => {
      renewed.participantType = "agent";
    },
    (renewed) => {
      renewed.scopeId = "different-scope";
    },
  ]) {
    const { client, coordination, scheduler } = createHarness();
    coordination.heartbeatHook = (input) => {
      const renewed = coordination.heartbeatResult(input);
      mutate(renewed);
      return renewed;
    };
    await client.start();

    await scheduler.advanceBy(500);

    assert.equal(client.getStatus().state, "degraded");
    assert.equal(
      client.getStatus().lastError.code,
      "COORDINATION_CLIENT_CONTRACT_INVALID",
    );
    assert.deepEqual(scheduler.delays(), []);
    assertNoToken(client.getStatus());
    await client.stop();
  }
});

test("heartbeat jitter remains inside the documented 40-60 percent lease window", async () => {
  const lower = createHarness({ random: () => 0 });
  const upper = createHarness({ random: () => 0.999_999 });

  await lower.client.start();
  await upper.client.start();

  assert.deepEqual(lower.scheduler.delays(), [400]);
  assert.deepEqual(upper.scheduler.delays(), [600]);

  await lower.client.stop();
  await upper.client.stop();
});

test("invoke injects owned credentials, permits only actions, and never retries an action", async () => {
  const { client, coordination } = createHarness();
  await client.start();

  const discovered = await client.invoke("discover", {
    participantId: "caller-supplied-id",
    leaseToken: "<overridden>",
    capability: "task.review",
  });
  assert.deepEqual(discovered, { operation: "discover", ok: true });
  assert.deepEqual(coordination.calls.discover, [{
    participantId: "pt-client-1",
    leaseToken: testLeaseToken(0),
    capability: "task.review",
  }]);

  coordination.operationHooks.send = () => {
    throw coordinationError("COORDINATION_UNAVAILABLE");
  };
  await assert.rejects(
    client.invoke("send", {
      toParticipantId: "pt-reviewer",
      messageType: "CHANGE_REQUEST",
      classification: "internal",
      body: "{}",
    }),
    (error) => error.code === "COORDINATION_UNAVAILABLE",
  );
  assert.equal(coordination.calls.send.length, 1);
  assert.equal(client.getStatus().state, "ready");

  for (const forbidden of [
    "status",
    "register",
    "heartbeat",
    "unregister",
    "unknown",
  ]) {
    await assert.rejects(
      client.invoke(forbidden, {}),
      (error) => error.code === "COORDINATION_CLIENT_INVALID_OPERATION",
    );
  }

  await client.stop();
});

test("concurrent lease-loss signals create only one replacement identity and do not replay actions", async () => {
  const { client, coordination } = createHarness();
  await client.start();
  coordination.operationHooks.discover = () => {
    throw coordinationError("COORDINATION_LEASE_CHANGED");
  };
  coordination.operationHooks.receive = () => {
    throw coordinationError("COORDINATION_AUTH_FAILED");
  };

  const outcomes = await Promise.allSettled([
    client.invoke("discover", {}),
    client.invoke("receive", {
      consumerId: "orchestrator-client",
      blockMs: 0,
    }),
  ]);
  await settle();

  assert.deepEqual(
    outcomes.map(({ status }) => status),
    ["rejected", "rejected"],
  );
  assert.equal(coordination.calls.discover.length, 1);
  assert.equal(coordination.calls.receive.length, 1);
  assert.equal(coordination.calls.register.length, 2);
  assert.equal(client.getStatus().state, "ready");
  assert.equal(client.getStatus().participantId, "pt-client-2");
  assertNoToken(client.getStatus());

  await client.stop();
});

test("transient heartbeat failure uses finite exponential backoff and degrades after exhaustion", async () => {
  const { client, coordination, scheduler } = createHarness({
    retry: {
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 1_000,
    },
  });
  coordination.heartbeatHook = () => {
    throw coordinationError("COORDINATION_UNAVAILABLE");
  };
  await client.start();

  await scheduler.advanceBy(500);
  assert.equal(client.getStatus().state, "degraded");
  assert.equal(client.getStatus().retryAttempt, 1);
  assert.deepEqual(scheduler.delays(), [100]);

  await scheduler.advanceBy(100);
  assert.equal(client.getStatus().retryAttempt, 2);
  assert.deepEqual(scheduler.delays(), [200]);

  await scheduler.advanceBy(200);
  assert.equal(coordination.calls.heartbeat.length, 3);
  assert.equal(client.getStatus().state, "degraded");
  assert.equal(client.getStatus().retryAttempt, 3);
  assert.equal(client.getStatus().lastError.code, "COORDINATION_UNAVAILABLE");
  assert.match(client.getStatus().recovery, /new client/i);
  assert.deepEqual(scheduler.delays(), []);
  assertNoToken(client.getStatus());

  await client.stop();
});

test("lease loss bounds re-registration attempts and never leaks an error message", async () => {
  const { client, coordination, scheduler } = createHarness({
    retry: {
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 1_000,
    },
  });
  coordination.heartbeatHook = () => {
    throw coordinationError(
      "COORDINATION_LEASE_EXPIRED",
      `expired credential ${testLeaseToken(0)}`,
    );
  };
  coordination.registerHook = (input, index) => {
    if (index === 0) return coordination.registration(input, index);
    throw coordinationError(
      "COORDINATION_UNAVAILABLE",
      `registration failed with ${testLeaseToken(index)}`,
    );
  };
  await client.start();

  await scheduler.advanceBy(500);
  assert.equal(client.getStatus().state, "rejoining");
  assert.equal(coordination.calls.register.length, 2);
  assert.deepEqual(scheduler.delays(), [100]);

  await scheduler.advanceBy(100);
  assert.equal(coordination.calls.register.length, 3);
  assert.deepEqual(scheduler.delays(), [200]);

  await scheduler.advanceBy(200);
  assert.equal(coordination.calls.register.length, 4);
  assert.equal(client.getStatus().state, "degraded");
  assert.equal(client.getStatus().retryAttempt, 3);
  assert.deepEqual(scheduler.delays(), []);
  assertNoToken(client.getStatus());

  await client.stop();
});

test("an invalid replacement result degrades without creating duplicate replacements", async () => {
  const { client, coordination, scheduler } = createHarness({
    retry: {
      maxAttempts: 2,
      baseDelayMs: 100,
      maxDelayMs: 1_000,
    },
  });
  coordination.heartbeatHook = () => {
    throw coordinationError("COORDINATION_LEASE_CHANGED");
  };
  coordination.registerHook = (input, index) => {
    if (index === 0) return coordination.registration(input, index);
    const replacement = coordination.registration(input, index);
    delete replacement.leaseToken;
    return replacement;
  };
  await client.start();

  await scheduler.advanceBy(500);
  assert.equal(client.getStatus().state, "degraded");
  assert.equal(coordination.calls.register.length, 2);
  assert.equal(
    client.getStatus().lastError.code,
    "COORDINATION_CLIENT_CONTRACT_INVALID",
  );
  assert.deepEqual(scheduler.delays(), []);

  await client.stop();
});

test("stop is bounded while readiness is pending and fences a late status result", async () => {
  const { client, coordination } = createHarness();
  const lateStatus = deferred();
  coordination.statusHook = () => lateStatus.promise;

  const starting = client.start();
  await settle();
  const stopping = client.stop();
  const stopSettlement = await settlementWithinMicrotasks(stopping);

  lateStatus.resolve(coordination.statusResult());
  const [started, stopped] = await Promise.all([starting, stopping]);

  assert.equal(stopSettlement, "fulfilled");
  assert.equal(started.state, "stopped");
  assert.equal(stopped.state, "stopped");
  assert.equal(coordination.calls.register.length, 0);
  assert.equal(client.getStatus().state, "stopped");
});

test("stop is bounded during register and late cleanup cannot block or revive the client", async () => {
  const { client, coordination } = createHarness();
  const lateRegistration = deferred();
  const lateUnregister = deferred();
  const unhandled = [];
  const onUnhandled = (error) => unhandled.push(error);
  process.on("unhandledRejection", onUnhandled);
  coordination.registerHook = () => lateRegistration.promise;
  coordination.unregisterHook = () => lateUnregister.promise;

  try {
    const starting = client.start();
    await settle();
    assert.equal(coordination.calls.register.length, 1);

    const stopping = client.stop();
    const stopSettlement = await settlementWithinMicrotasks(stopping);
    lateRegistration.resolve(coordination.registration({
      participantType: "orchestrator",
      scopeId: "agents-orchestrator",
      capabilities: ["coordination.v1"],
      leaseTtlMs: LEASE_TTL_MS,
    }, 0));
    await settle();
    const startSettlement = await settlementWithinMicrotasks(starting);

    assert.equal(stopSettlement, "fulfilled");
    assert.equal(startSettlement, "fulfilled");
    assert.equal(coordination.calls.unregister.length, 1);
    assert.equal(client.getStatus().state, "stopped");
    assert.deepEqual(client.getStatus().nextAction, undefined);

    lateUnregister.reject(new Error("late unregister sentinel"));
    await Promise.allSettled([starting, stopping]);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }
});

test("stop is bounded during heartbeat and suppresses late success, lease loss, and rejection", async () => {
  for (const completion of ["success", "lease-loss", "rejection"]) {
    const { client, coordination, scheduler } = createHarness();
    const lateHeartbeat = deferred();
    const unhandled = [];
    const onUnhandled = (error) => unhandled.push(error);
    process.on("unhandledRejection", onUnhandled);
    coordination.heartbeatHook = () => lateHeartbeat.promise;

    try {
      await client.start();
      scheduler.fireNext();
      await settle();
      assert.equal(coordination.calls.heartbeat.length, 1);

      const stopping = client.stop();
      const stopSettlement = await settlementWithinMicrotasks(stopping);
      if (completion === "success") {
        lateHeartbeat.resolve(coordination.heartbeatResult({
          participantId: "pt-client-1",
          leaseTtlMs: LEASE_TTL_MS,
        }));
      } else if (completion === "lease-loss") {
        lateHeartbeat.reject(coordinationError("COORDINATION_LEASE_CHANGED"));
      } else {
        lateHeartbeat.reject(new Error("late heartbeat sentinel"));
      }
      await stopping;
      await new Promise((resolve) => setImmediate(resolve));

      assert.equal(stopSettlement, "fulfilled");
      assert.equal(client.getStatus().state, "stopped");
      assert.equal(coordination.calls.register.length, 1);
      assert.deepEqual(scheduler.delays(), []);
      assert.deepEqual(unhandled, []);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  }
});

test("stop is bounded when authenticated unregister never settles", async () => {
  const { client, coordination, scheduler } = createHarness();
  const lateUnregister = deferred();
  const unhandled = [];
  const onUnhandled = (error) => unhandled.push(error);
  process.on("unhandledRejection", onUnhandled);
  coordination.unregisterHook = () => lateUnregister.promise;

  try {
    await client.start();
    const firstStop = client.stop();
    const secondStop = client.stop();
    const stopSettlement = await settlementWithinMicrotasks(firstStop);

    assert.equal(stopSettlement, "fulfilled");
    assert.deepEqual(await secondStop, await firstStop);
    assert.equal(coordination.calls.unregister.length, 1);
    assert.deepEqual(scheduler.delays(), []);

    lateUnregister.reject(new Error("unregister sentinel"));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }
});

test("stop is idempotent and cleans up both current and late rejoin registrations", async () => {
  const { client, coordination, scheduler } = createHarness();
  const lateRegistration = deferred();
  coordination.heartbeatHook = () => {
    throw coordinationError("COORDINATION_LEASE_CHANGED");
  };
  coordination.registerHook = (input, index) => {
    if (index === 0) return coordination.registration(input, index);
    return lateRegistration.promise;
  };
  await client.start();

  await scheduler.advanceBy(500);
  assert.equal(client.getStatus().state, "rejoining");
  assert.equal(coordination.calls.register.length, 2);

  const firstStop = client.stop();
  const secondStop = client.stop();
  assert.equal(client.getStatus().state, "stopped");
  const stopSettlement = await settlementWithinMicrotasks(firstStop);

  lateRegistration.resolve(coordination.registration({
    participantType: "orchestrator",
    capabilities: ["coordination.v1"],
    leaseTtlMs: LEASE_TTL_MS,
  }, 1));
  const [firstResult, secondResult] = await Promise.all([
    firstStop,
    secondStop,
  ]);

  assert.equal(stopSettlement, "fulfilled");
  assert.equal(firstResult.state, "stopped");
  assert.deepEqual(secondResult, firstResult);
  assert.deepEqual(
    coordination.calls.unregister.map(({ participantId }) => participantId),
    ["pt-client-1", "pt-client-2"],
  );
  assert.deepEqual(scheduler.delays(), []);
  assertNoToken(firstResult);
  assertNoToken(client.getStatus());
});

test("out-of-range clocks and scheduling overflow leave a safe status projection", async () => {
  for (const now of [
    Number.MAX_VALUE,
    MAX_DATE_MS - 100,
  ]) {
    const { client, coordination, scheduler } = createHarness({
      clock: () => now,
    });

    await assert.rejects(
      client.start(),
      (error) => error.code === "COORDINATION_CLIENT_CLOCK_INVALID",
    );
    await settle();

    const status = client.getStatus();
    assert.equal(Object.isFrozen(status), true);
    assert.equal(status.state, "degraded");
    assert.equal(
      status.lastError.code,
      "COORDINATION_CLIENT_CLOCK_INVALID",
    );
    assert.equal(status.nextActionAt, undefined);
    assert.equal(status.nextAction, undefined);
    assert.deepEqual(scheduler.delays(), []);
    assert.equal(coordination.calls.unregister.length, 1);
    assertNoToken(status);
  }
});

test("construction and lifecycle reject unsafe configuration without contacting coordination", async () => {
  const scheduler = new FakeScheduler();
  const coordination = new FakeCoordination(scheduler);

  assert.throws(
    () => createOrchestratorCoordinationClient({
      coordination,
      scheduler,
      heartbeatJitterRatio: 0.5,
    }),
    /heartbeatJitterRatio/,
  );
  assert.deepEqual(coordination.calls.status, []);

  const client = createOrchestratorCoordinationClient({
    coordination,
    scheduler,
    clock: () => scheduler.now,
  });
  await assert.rejects(
    client.invoke("discover", {}),
    (error) => error.code === "COORDINATION_CLIENT_NOT_READY",
  );
  const stopped = await client.stop();
  assert.match(stopped.recovery, /new client/i);
  await assert.rejects(
    client.start(),
    (error) => error.code === "COORDINATION_CLIENT_STOPPED",
  );
});
