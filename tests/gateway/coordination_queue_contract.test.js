import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CoordinationQueueError,
  coordinationKeys,
  createRedisCoordinationQueue,
} from "../../gateway/src/core/coordination_queue.js";
import {
  COORDINATION_CONSUMER_GROUP,
  coordinationKeys as frozenCoordinationKeys,
} from "../../gateway/src/core/coordination_contract.js";

function createFakeClient({
  initiallyOpen = false,
  responses = [],
  sendError = null,
  connectError = null,
} = {}) {
  let open = initiallyOpen;
  const commands = [];
  const listeners = new Map();
  let connectCalls = 0;
  let destroyCalls = 0;
  return {
    get isOpen() {
      return open;
    },
    commands,
    listeners,
    get connectCalls() {
      return connectCalls;
    },
    get destroyCalls() {
      return destroyCalls;
    },
    on(event, listener) {
      listeners.set(event, listener);
      return this;
    },
    off(event, listener) {
      if (listeners.get(event) === listener) listeners.delete(event);
      return this;
    },
    async connect() {
      connectCalls += 1;
      if (connectError) throw connectError;
      open = true;
    },
    async sendCommand(command) {
      commands.push(structuredClone(command));
      if (sendError) throw sendError;
      return responses.shift() ?? null;
    },
    destroy() {
      destroyCalls += 1;
      open = false;
    },
  };
}

function expectQueueCode(promise, code) {
  return assert.rejects(
    promise,
    (err) =>
      err instanceof CoordinationQueueError
      && err.code === code
      && !err.message.includes("sentinel"),
  );
}

test("adapter consumes the frozen percent-encoded key layout and group", () => {
  const keys = coordinationKeys("agents:coord:v1");
  const frozenKeys = frozenCoordinationKeys("agents:coord:v1");

  assert.equal(keys.participants, frozenKeys.participants);
  assert.equal(keys.events, frozenKeys.events);
  assert.equal(keys.presence("pt:a"), "agents:coord:v1:presence:pt%3Aa");
  assert.equal(keys.inbox("pt:a"), "agents:coord:v1:inbox:pt%3Aa");
  assert.equal(
    keys.dedupe("pt:a", "cm:a"),
    "agents:coord:v1:dedupe:pt%3Aa:cm%3Aa",
  );
  assert.equal(
    keys.acked("pt:a", "1-0"),
    "agents:coord:v1:acked:pt%3Aa:1-0",
  );

  const queue = createRedisCoordinationQueue({ redisUrl: "redis://isolated.invalid" });
  assert.deepEqual(queue.describe(), {
    enabled: true,
    prefix: "agents:coord:v1",
    eventsStream: "agents:coord:v1:events",
    consumerGroup: COORDINATION_CONSUMER_GROUP,
  });
  assert.notEqual(queue.describe().eventsStream, "agents:events");
});

test("construction and description are lazy and never open Redis", () => {
  let factoryCalls = 0;
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    clientFactory() {
      factoryCalls += 1;
      throw new Error("sentinel factory must stay lazy");
    },
  });

  assert.equal(queue.enabled, true);
  assert.equal(queue.describe().consumerGroup, "coordination-v1");
  assert.equal(factoryCalls, 0);
});

test("health probe is lazy, read-only, and retains its owned client until close", async () => {
  const client = createFakeClient({ responses: ["PONG"] });
  let factoryCalls = 0;
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    clientFactory() {
      factoryCalls += 1;
      return client;
    },
  });

  assert.equal(factoryCalls, 0);
  assert.deepEqual(await queue.ping(), { status: "ready" });
  assert.equal(factoryCalls, 1);
  assert.deepEqual(client.commands, [["PING"]]);
  assert.equal(client.connectCalls, 1);
  assert.equal(client.destroyCalls, 0);
  assert.deepEqual(await queue.close(), { status: "closed" });
  assert.equal(client.destroyCalls, 1);
  assert.equal(client.listeners.size, 0);
});

test("health probe distinguishes unavailable transport from invalid Redis replies", async () => {
  const disabled = createRedisCoordinationQueue({ redisUrl: "" });
  await expectQueueCode(disabled.ping(), "COORDINATION_UNAVAILABLE");

  for (const response of [null, "OK", 1]) {
    const queue = createRedisCoordinationQueue({
      redisUrl: "redis://isolated.invalid",
      clientFactory: () => createFakeClient({ responses: [response] }),
    });
    await expectQueueCode(queue.ping(), "COORDINATION_INVALID_DATA");
  }
});

test("disabled adapter fails explicitly without constructing a client", async () => {
  let factoryCalls = 0;
  const queue = createRedisCoordinationQueue({
    redisUrl: "",
    clientFactory() {
      factoryCalls += 1;
      throw new Error("sentinel factory must not run");
    },
  });

  assert.equal(queue.enabled, false);
  await expectQueueCode(
    queue.getParticipant("pt-a"),
    "COORDINATION_UNAVAILABLE",
  );
  assert.equal(factoryCalls, 0);
});

test("healthy operations reuse one owned RESP2 client until explicit close", async () => {
  const client = createFakeClient({
    responses: [JSON.stringify({ participantId: "pt:a" }), null],
  });
  const factoryOptions = [];
  const factoryContexts = [];
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://127.0.0.1:6399/15",
    connectTimeoutMs: 321,
    clientFactory(options, context) {
      factoryOptions.push(structuredClone(options));
      factoryContexts.push(context);
      return client;
    },
  });

  assert.deepEqual(await queue.getParticipant("pt:a"), { participantId: "pt:a" });
  assert.equal(await queue.getParticipant("pt:b"), null);
  assert.equal(client.connectCalls, 1);
  assert.equal(client.destroyCalls, 0);
  assert.deepEqual(client.commands, [
    ["GET", "agents:coord:v1:presence:pt%3Aa"],
    ["GET", "agents:coord:v1:presence:pt%3Ab"],
  ]);
  assert.deepEqual(factoryOptions, [{
    url: "redis://127.0.0.1:6399/15",
    RESP: 2,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: 321,
      reconnectStrategy: false,
    },
  }]);
  assert.deepEqual(factoryContexts, [{ kind: "command" }]);
  await queue.close();
  assert.equal(client.destroyCalls, 1);
});

test("an already-open injected client is owned without reconnect and closes explicitly", async () => {
  const client = createFakeClient({
    initiallyOpen: true,
    responses: [JSON.stringify({ participantId: "pt-a" })],
  });
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    clientFactory: () => client,
  });

  assert.deepEqual(await queue.getParticipant("pt-a"), { participantId: "pt-a" });
  assert.equal(client.connectCalls, 0);
  assert.equal(client.destroyCalls, 0);
  await queue.close();
  assert.equal(client.destroyCalls, 1);
});

test("consumer-group creation uses the frozen group and suppresses only BUSYGROUP", async () => {
  const createdClient = createFakeClient({ responses: ["OK"] });
  const createdQueue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    clientFactory: () => createdClient,
  });
  assert.deepEqual(
    await createdQueue.ensureInboxGroup("pt:a"),
    { status: "created" },
  );
  assert.deepEqual(createdClient.commands, [[
    "XGROUP",
    "CREATE",
    "agents:coord:v1:inbox:pt%3Aa",
    "coordination-v1",
    "0",
    "MKSTREAM",
  ]]);

  const busyError = new Error("BUSYGROUP Consumer Group name already exists");
  const existingClient = createFakeClient({ sendError: busyError });
  const existingQueue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    clientFactory: () => existingClient,
  });
  assert.deepEqual(
    await existingQueue.ensureInboxGroup("pt-a"),
    { status: "exists" },
  );

  for (const err of [
    new Error("NOPERM BUSYGROUP text is not an error code"),
    new Error("ERR sentinel group failure"),
  ]) {
    const client = createFakeClient({ sendError: err });
    const queue = createRedisCoordinationQueue({
      redisUrl: "redis://isolated.invalid",
      clientFactory: () => client,
    });
    await expectQueueCode(
      queue.ensureInboxGroup("pt-a"),
      "COORDINATION_UNAVAILABLE",
    );
  }
});

test("consumer-group creation rejects unexpected RESP replies", async () => {
  for (const response of [null, 1, [], "NOT_OK"]) {
    const client = createFakeClient({ responses: [response] });
    const queue = createRedisCoordinationQueue({
      redisUrl: "redis://isolated.invalid",
      clientFactory: () => client,
    });
    await expectQueueCode(
      queue.ensureInboxGroup("pt-a"),
      "COORDINATION_INVALID_DATA",
    );
  }
});

test("participant decoding accepts only JSON objects or null", async () => {
  for (const response of [
    "{",
    "[]",
    "\"scalar\"",
    "1",
    "true",
    Buffer.from("{}"),
    { participantId: "pt-a" },
  ]) {
    const client = createFakeClient({ responses: [response] });
    const queue = createRedisCoordinationQueue({
      redisUrl: "redis://isolated.invalid",
      clientFactory: () => client,
    });
    await expectQueueCode(
      queue.getParticipant("pt-a"),
      "COORDINATION_INVALID_DATA",
    );
    await queue.close();
    assert.equal(client.destroyCalls, 1);
  }
});

test("dependency failures map to one safe unavailable error and cleanup stays best effort", async () => {
  const sendFailure = createFakeClient({
    sendError: new Error("sentinel redis credential and host"),
  });
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    clientFactory: () => sendFailure,
  });
  await expectQueueCode(
    queue.getParticipant("pt-a"),
    "COORDINATION_UNAVAILABLE",
  );
  assert.equal(sendFailure.destroyCalls, 1);

  const connectFailure = createFakeClient({
    connectError: new Error("sentinel connect details"),
  });
  const unavailableQueue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    clientFactory: () => connectFailure,
  });
  await expectQueueCode(
    unavailableQueue.getParticipant("pt-a"),
    "COORDINATION_UNAVAILABLE",
  );
});

test("client error observers stay safe while the failed connection is replaced", async () => {
  const failed = createFakeClient({
    responses: [JSON.stringify({ participantId: "pt-a" })],
  });
  const replacement = createFakeClient({
    responses: [JSON.stringify({ participantId: "pt-a" })],
  });
  const clients = [failed, replacement];
  let factoryCalls = 0;
  let observerCalls = 0;
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    clientFactory: () => {
      const client = clients[factoryCalls];
      factoryCalls += 1;
      return client;
    },
    onError() {
      observerCalls += 1;
      throw new Error("sentinel observer failure");
    },
  });

  const operation = queue.getParticipant("pt-a");
  failed.listeners.get("error")?.(new Error("sentinel async client error"));
  await expectQueueCode(operation, "COORDINATION_UNAVAILABLE");
  assert.equal(observerCalls, 1);
  assert.deepEqual(
    await queue.getParticipant("pt-a"),
    { participantId: "pt-a" },
  );
  assert.equal(factoryCalls, 2);
  await queue.close();
});

test("constructor rejects invalid prefixes, client hooks, and numeric limits", () => {
  for (const options of [
    { prefix: "agents:coord:*" },
    { clientFactory: null },
    { onError: null },
    { connectTimeoutMs: 0 },
    { connectTimeoutMs: 1.5 },
    { maxInboxLength: 0 },
    { orphanInboxTtlMs: Number.MAX_SAFE_INTEGER + 1 },
    { maxCommandConcurrency: 0 },
    { maxCommandQueue: 0 },
    { maxBlockingQueue: 0 },
    { shutdownTimeoutMs: 0 },
  ]) {
    assert.throws(
      () => createRedisCoordinationQueue(options),
      TypeError,
    );
  }
});
