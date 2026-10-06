import { test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { createRequire } from "node:module";

import {
  CoordinationQueueError,
  createRedisCoordinationQueue,
} from "../../gateway/src/core/coordination_queue.js";

const requireFromGateway = createRequire(
  new URL("../../gateway/package.json", import.meta.url),
);
const { createClient } = requireFromGateway("redis");

const FENCE = Object.freeze({
  participantId: "pt-a",
  leaseTokenHash: "a".repeat(64),
  scopeId: "project-v5",
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function fakeClient({
  initiallyOpen = false,
  connect = async () => {},
  sendCommand = async () => null,
} = {}) {
  let open = initiallyOpen;
  const listeners = new Map();
  const blocked = new Set();
  const client = {
    connectCalls: 0,
    destroyCalls: 0,
    commands: [],
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
    listenerCount(event) {
      return listeners.get(event)?.size ?? 0;
    },
    emit(event, value) {
      for (const listener of listeners.get(event) ?? []) listener(value);
    },
    async connect() {
      this.connectCalls += 1;
      await connect();
      open = true;
    },
    async sendCommand(command) {
      this.commands.push(structuredClone(command));
      return sendCommand(command, { blocked });
    },
    destroy() {
      if (!open && this.destroyCalls > 0) return;
      this.destroyCalls += 1;
      open = false;
      for (const operation of blocked) {
        operation.reject(new Error("sentinel client destroyed"));
      }
      blocked.clear();
    },
  };
  return client;
}

function redisLikeHandshakeClient({
  connectGate,
  connectStarted,
  ignoreDestroyWhileConnecting = false,
}) {
  let open = false;
  let ready = false;
  const listeners = new Map();
  return {
    connectCalls: 0,
    destroyCalls: 0,
    commands: [],
    get isOpen() {
      return open;
    },
    get isReady() {
      return ready;
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
    listenerCount(event) {
      return listeners.get(event)?.size ?? 0;
    },
    async connect() {
      this.connectCalls += 1;
      open = true;
      connectStarted.resolve();
      await connectGate.promise;
      ready = true;
    },
    async sendCommand(command) {
      this.commands.push(structuredClone(command));
      if (!ready) throw new Error("sentinel command before Redis ready");
      if (command[0] === "PING") return "PONG";
      return null;
    },
    destroy() {
      this.destroyCalls += 1;
      if (ignoreDestroyWhileConnecting && !ready) return;
      open = false;
      ready = false;
    },
  };
}

function expectUnavailable(promise) {
  return assert.rejects(
    promise,
    (err) =>
      err instanceof CoordinationQueueError
      && err.code === "COORDINATION_UNAVAILABLE"
      && !err.message.includes("sentinel"),
  );
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

function assertUnavailableSettlement(settlement) {
  assert.equal(settlement.status, "rejected");
  assert.ok(settlement.reason instanceof CoordinationQueueError);
  assert.equal(settlement.reason.code, "COORDINATION_UNAVAILABLE");
  assert.ok(!settlement.reason.message.includes("sentinel"));
}

function blockingRead(queue) {
  return queue.readInbox({
    participantId: "pt-a",
    consumerId: "consumer-a",
    count: 1,
    blockMs: 30_000,
    now: 1,
    fence: FENCE,
  });
}

test("concurrent lazy connect is coalesced and healthy commands reuse one owned client", async () => {
  const connectGate = deferred();
  const client = fakeClient({
    connect: () => connectGate.promise,
    sendCommand: async (command) =>
      command[0] === "PING"
        ? "PONG"
        : JSON.stringify({ participantId: command[1] }),
  });
  const factoryKinds = [];
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    clientFactory(options, context) {
      assert.equal(options.disableOfflineQueue, true);
      factoryKinds.push(context.kind);
      return client;
    },
  });

  const first = queue.getParticipant("pt-a");
  const second = queue.getParticipant("pt-b");
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(factoryKinds, ["command"]);
  assert.equal(client.connectCalls, 1);
  assert.equal(client.commands.length, 0);
  assert.equal(queue.lifecycle().command.state, "connecting");

  connectGate.resolve();
  assert.deepEqual(await Promise.all([first, second]), [
    { participantId: "agents:coord:v1:presence:pt-a" },
    { participantId: "agents:coord:v1:presence:pt-b" },
  ]);
  assert.equal(client.connectCalls, 1);
  assert.equal(client.destroyCalls, 0);
  assert.equal(client.listenerCount("error"), 1);
  assert.deepEqual(await queue.ping(), { status: "ready" });
  assert.equal(client.connectCalls, 1);

  assert.deepEqual(await queue.close(), { status: "closed" });
  assert.equal(client.destroyCalls, 1);
  assert.equal(client.listenerCount("error"), 0);
});

test("a dropped command is never retried and the next operation performs one reconnect", async () => {
  let firstAttempts = 0;
  const first = fakeClient({
    sendCommand: async () => {
      firstAttempts += 1;
      throw new Error("sentinel drop after command dispatch");
    },
  });
  const replacement = fakeClient({
    sendCommand: async () => null,
  });
  const clients = [first, replacement];
  let factoryCalls = 0;
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    clientFactory() {
      const client = clients[factoryCalls];
      factoryCalls += 1;
      return client;
    },
  });

  await expectUnavailable(queue.getParticipant("pt-a"));
  assert.equal(firstAttempts, 1);
  assert.equal(first.destroyCalls, 1);

  const reconnectWave = Array.from(
    { length: 8 },
    () => queue.getParticipant("pt-a"),
  );
  assert.deepEqual(await Promise.all(reconnectWave), Array(8).fill(null));
  assert.equal(factoryCalls, 2);
  assert.equal(replacement.connectCalls, 1);
  assert.equal(replacement.commands.length, 8);

  await queue.close();
});

test("command backpressure rejects excess work before the bounded queue grows", async () => {
  const firstGate = deferred();
  let sends = 0;
  const client = fakeClient({
    sendCommand: async () => {
      sends += 1;
      if (sends === 1) await firstGate.promise;
      return null;
    },
  });
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    maxCommandConcurrency: 1,
    maxCommandQueue: 1,
    clientFactory: () => client,
  });

  const first = queue.getParticipant("pt-a");
  await new Promise((resolve) => setImmediate(resolve));
  const second = queue.getParticipant("pt-b");
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(queue.lifecycle().command, {
    state: "ready",
    active: 1,
    queued: 1,
    capacity: 1,
    queueLimit: 1,
  });
  await expectUnavailable(queue.getParticipant("pt-c"));
  assert.equal(sends, 1);

  firstGate.resolve();
  assert.deepEqual(await Promise.all([first, second]), [null, null]);
  assert.equal(sends, 2);
  await queue.close();
});

test("a dedicated blocking client does not starve command health and close cancels it boundedly", async () => {
  const blockingStarted = deferred();
  const blockingClient = fakeClient({
    sendCommand: async (command, { blocked }) => {
      if (command[0] === "EVAL") return 0;
      if (command[0] !== "XREADGROUP") {
        throw new Error("sentinel unexpected blocking command");
      }
      const operation = deferred();
      blocked.add(operation);
      blockingStarted.resolve();
      return operation.promise;
    },
  });
  const commandClient = fakeClient({
    sendCommand: async () => "PONG",
  });
  const created = [];
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    shutdownTimeoutMs: 20,
    clientFactory(_options, { kind }) {
      created.push(kind);
      return kind === "blocking" ? blockingClient : commandClient;
    },
  });

  const receive = blockingRead(queue);
  await blockingStarted.promise;
  assert.deepEqual(await queue.ping(), { status: "ready" });
  assert.deepEqual(created, ["blocking", "command"]);

  const startedAt = Date.now();
  const closeResult = await queue.close();
  const elapsedMs = Date.now() - startedAt;
  assert.deepEqual(closeResult, { status: "closed" });
  assert.ok(elapsedMs < 500, `shutdown exceeded bound: ${elapsedMs}ms`);
  await expectUnavailable(receive);
  assert.equal(blockingClient.destroyCalls, 1);
  assert.equal(commandClient.destroyCalls, 1);
  assert.equal(blockingClient.listenerCount("error"), 0);
  assert.equal(commandClient.listenerCount("error"), 0);
});

test("a dropped blocking read is not replayed and its next call reconnects once", async () => {
  let firstBlockAttempts = 0;
  const failed = fakeClient({
    sendCommand: async (command) => {
      if (command[0] === "EVAL") return 0;
      firstBlockAttempts += 1;
      throw new Error("sentinel block transport drop");
    },
  });
  const replacement = fakeClient({
    sendCommand: async (command) => {
      if (command[0] === "EVAL") return 0;
      return null;
    },
  });
  const clients = [failed, replacement];
  let factoryCalls = 0;
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    clientFactory(_options, { kind }) {
      assert.equal(kind, "blocking");
      const client = clients[factoryCalls];
      factoryCalls += 1;
      return client;
    },
  });

  await expectUnavailable(blockingRead(queue));
  assert.equal(firstBlockAttempts, 1);
  assert.equal(failed.destroyCalls, 1);
  assert.deepEqual(await blockingRead(queue), {
    status: "read",
    deliveries: [],
  });
  assert.equal(factoryCalls, 2);
  assert.equal(replacement.connectCalls, 1);
  assert.equal(
    replacement.commands.filter(([command]) => command === "XREADGROUP").length,
    1,
  );
  await queue.close();
});

test("an asynchronous connection error creates one replacement for a reconnect storm", async () => {
  const first = fakeClient({
    sendCommand: async () => "PONG",
  });
  const reconnectGate = deferred();
  const replacement = fakeClient({
    connect: () => reconnectGate.promise,
    sendCommand: async () => "PONG",
  });
  const clients = [first, replacement];
  let factoryCalls = 0;
  let observedErrors = 0;
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    onError() {
      observedErrors += 1;
    },
    clientFactory() {
      const client = clients[factoryCalls];
      factoryCalls += 1;
      return client;
    },
  });

  assert.deepEqual(await queue.ping(), { status: "ready" });
  first.emit("error", new Error("sentinel asynchronous disconnect"));
  assert.equal(observedErrors, 1);
  assert.equal(first.destroyCalls, 1);

  const reconnects = Array.from({ length: 12 }, () => queue.ping());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(factoryCalls, 2);
  assert.equal(replacement.connectCalls, 1);
  reconnectGate.resolve();
  assert.deepEqual(
    await Promise.all(reconnects),
    Array.from({ length: 12 }, () => ({ status: "ready" })),
  );

  await queue.close();
});

test("double close is idempotent, rejects queued work, and leaves no client listeners", async () => {
  const activeGate = deferred();
  const client = fakeClient({
    sendCommand: async (_command, { blocked }) => {
      blocked.add(activeGate);
      return activeGate.promise;
    },
  });
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    maxCommandConcurrency: 1,
    maxCommandQueue: 2,
    shutdownTimeoutMs: 10,
    clientFactory: () => client,
  });

  const active = queue.getParticipant("pt-a");
  await new Promise((resolve) => setImmediate(resolve));
  const queued = queue.getParticipant("pt-b");
  const firstClose = queue.close();
  const secondClose = queue.close();

  await expectUnavailable(queued);
  assert.deepEqual(await Promise.all([firstClose, secondClose]), [
    { status: "closed" },
    { status: "closed" },
  ]);
  await expectUnavailable(active);
  await expectUnavailable(queue.ping());
  assert.equal(client.destroyCalls, 1);
  assert.equal(client.listenerCount("error"), 0);
  assert.deepEqual(queue.lifecycle(), {
    state: "closed",
    command: {
      state: "closed",
      active: 0,
      queued: 0,
      capacity: 1,
      queueLimit: 2,
    },
    blocking: {
      state: "closed",
      active: 0,
      queued: 0,
      capacity: 1,
      queueLimit: 32,
    },
  });
});

test("shutdown fences an ignored blocking destroy and consumes its late rejection", async () => {
  const blockingStarted = deferred();
  const lateBlock = deferred();
  const unhandled = [];
  const onUnhandled = (error) => unhandled.push(error);
  process.on("unhandledRejection", onUnhandled);
  const client = fakeClient({
    sendCommand: async (command) => {
      if (command[0] === "EVAL") return 0;
      if (command[0] !== "XREADGROUP") {
        throw new Error("sentinel unexpected command");
      }
      blockingStarted.resolve();
      return lateBlock.promise;
    },
  });
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    shutdownTimeoutMs: 10,
    clientFactory: () => client,
  });

  const receive = blockingRead(queue);
  try {
    await blockingStarted.promise;
    const startedAt = Date.now();
    assert.deepEqual(await queue.close(), { status: "closed" });
    assert.ok(Date.now() - startedAt < 250);
    assertUnavailableSettlement(await settlementWithin(receive));
    assert.deepEqual(queue.lifecycle().blocking, {
      state: "closed",
      active: 0,
      queued: 0,
      capacity: 1,
      queueLimit: 32,
    });
    assert.equal(client.isOpen, false);
    assert.equal(client.destroyCalls, 1);
    assert.equal(client.listenerCount("error"), 0);

    lateBlock.reject(new Error("sentinel late blocking rejection"));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(unhandled, []);
    assert.deepEqual(queue.lifecycle().blocking, {
      state: "closed",
      active: 0,
      queued: 0,
      capacity: 1,
      queueLimit: 32,
    });
  } finally {
    process.off("unhandledRejection", onUnhandled);
    lateBlock.resolve(null);
    await queue.close();
  }
});

test("a connect completed after close is destroyed again in its open state", async () => {
  const connectStarted = deferred();
  const connectGate = deferred();
  const client = fakeClient({
    connect: async () => {
      connectStarted.resolve();
      await connectGate.promise;
    },
    sendCommand: async () => "PONG",
  });
  const originalDestroy = client.destroy.bind(client);
  client.destroy = function destroyOnlyWhenOpen() {
    this.destroyCalls += 1;
    if (this.isOpen) {
      this.destroyCalls -= 1;
      originalDestroy();
    }
  };
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    shutdownTimeoutMs: 10,
    clientFactory: () => client,
  });

  const ping = queue.ping();
  try {
    await connectStarted.promise;
    assert.deepEqual(await queue.close(), { status: "closed" });
    assertUnavailableSettlement(await settlementWithin(ping));
    assert.equal(client.destroyCalls, 1);

    connectGate.resolve();
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(client.isOpen, false);
    assert.equal(client.destroyCalls, 2);
    assert.equal(client.listenerCount("error"), 0);
    assert.deepEqual(queue.lifecycle().command, {
      state: "closed",
      active: 0,
      queued: 0,
      capacity: 64,
      queueLimit: 256,
    });
  } finally {
    connectGate.resolve();
    await Promise.allSettled([ping, queue.close()]);
  }
});

test("a command result after the close deadline cannot cross the shutdown fence", async () => {
  const commandStarted = deferred();
  const lateResult = deferred();
  const client = fakeClient({
    sendCommand: async (command) => {
      assert.equal(command[0], "GET");
      commandStarted.resolve();
      return lateResult.promise;
    },
  });
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    shutdownTimeoutMs: 10,
    clientFactory: () => client,
  });

  const participant = queue.getParticipant("pt-late-success");
  try {
    await commandStarted.promise;
    assert.deepEqual(await queue.close(), { status: "closed" });
    assertUnavailableSettlement(await settlementWithin(participant));
    assert.deepEqual(queue.lifecycle().command, {
      state: "closed",
      active: 0,
      queued: 0,
      capacity: 64,
      queueLimit: 256,
    });

    lateResult.resolve(JSON.stringify({
      participantId: "pt-late-success",
    }));
    await new Promise((resolve) => setImmediate(resolve));
    await expectUnavailable(participant);
    assert.equal(client.commands.length, 1);
    assert.equal(client.isOpen, false);
    assert.equal(client.destroyCalls, 1);
    assert.equal(client.listenerCount("error"), 0);
  } finally {
    lateResult.resolve(null);
    await Promise.allSettled([participant, queue.close()]);
  }
});

test("Redis-like open-before-ready handshakes coalesce every operation until ready", async () => {
  const connectGate = deferred();
  const connectStarted = deferred();
  const client = redisLikeHandshakeClient({
    connectGate,
    connectStarted,
    ignoreDestroyWhileConnecting: true,
  });
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    shutdownTimeoutMs: 10,
    clientFactory: () => client,
  });

  const first = queue.ping();
  let second;
  try {
    await connectStarted.promise;
    assert.equal(client.isOpen, true);
    assert.equal(client.isReady, false);

    second = queue.ping();
    assert.deepEqual(await settlementWithin(second, 25), {
      status: "timeout",
    });
    assert.equal(client.connectCalls, 1);
    assert.equal(client.commands.length, 0);

    connectGate.resolve();
    assert.deepEqual(await Promise.all([first, second]), [
      { status: "ready" },
      { status: "ready" },
    ]);
    assert.equal(client.connectCalls, 1);
    assert.equal(client.commands.length, 2);
  } finally {
    connectGate.resolve();
    await Promise.allSettled([first, second, queue.close()]);
  }
});

test("close retries destroy after an ignored Redis-like handshake attempt", async () => {
  const connectGate = deferred();
  const connectStarted = deferred();
  const unhandled = [];
  const onUnhandled = (error) => unhandled.push(error);
  process.on("unhandledRejection", onUnhandled);
  const client = redisLikeHandshakeClient({
    connectGate,
    connectStarted,
    ignoreDestroyWhileConnecting: true,
  });
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    shutdownTimeoutMs: 10,
    clientFactory: () => client,
  });

  const ping = queue.ping();
  try {
    await connectStarted.promise;
    assert.equal(client.isOpen, true);
    assert.equal(client.isReady, false);
    assert.deepEqual(await queue.close(), { status: "closed" });
    assertUnavailableSettlement(await settlementWithin(ping));
    assert.equal(client.destroyCalls, 1);

    connectGate.resolve();
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(client.destroyCalls, 2);
    assert.equal(client.isOpen, false);
    assert.equal(client.isReady, false);
    assert.equal(client.listenerCount("error"), 0);
    assert.deepEqual(unhandled, []);
    assert.deepEqual(queue.lifecycle().command, {
      state: "closed",
      active: 0,
      queued: 0,
      capacity: 64,
      queueLimit: 256,
    });
  } finally {
    process.off("unhandledRejection", onUnhandled);
    connectGate.resolve();
    await Promise.allSettled([ping, queue.close()]);
  }
});

test("locked node-redis coalesces while a loopback RESP handshake is stalled", async () => {
  const sockets = new Set();
  const handshakeStarted = deferred();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("data", () => handshakeStarted.resolve());
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");

  let client;
  const queue = createRedisCoordinationQueue({
    redisUrl: `redis://127.0.0.1:${address.port}/15`,
    connectTimeoutMs: 1_000,
    shutdownTimeoutMs: 10,
    clientFactory(options) {
      client = createClient(options);
      return client;
    },
  });
  const first = queue.ping();
  let second;

  try {
    await handshakeStarted.promise;
    assert.equal(client.isOpen, true);
    assert.equal(client.isReady, false);

    second = queue.ping();
    assert.deepEqual(await settlementWithin(second, 25), {
      status: "timeout",
    });
    assert.equal(client.isOpen, true);
    assert.equal(client.isReady, false);

    assert.deepEqual(await queue.close(), { status: "closed" });
    await expectUnavailable(first);
    await expectUnavailable(second);
    assert.equal(client.isOpen, false);
    assert.equal(client.isReady, false);
    assert.equal(client.listenerCount("error"), 0);
  } finally {
    await Promise.allSettled([first, second, queue.close()]);
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  }
});
