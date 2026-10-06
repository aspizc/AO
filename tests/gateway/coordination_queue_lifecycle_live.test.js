import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";

import {
  CoordinationQueueError,
  createRedisCoordinationQueue,
} from "../../gateway/src/core/coordination_queue.js";

const redisUrl = process.env.AGENTS_TEST_REDIS_URL;
const requireFromGateway = createRequire(
  new URL("../../gateway/package.json", import.meta.url),
);
const { createClient } = requireFromGateway("redis");

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function participant() {
  return {
    protocolVersion: 1,
    participantId: "pt-lifecycle",
    participantType: "orchestrator",
    scopeId: "project:v5",
    capabilities: ["coordination.v1"],
    metadata: {},
    registeredAt: "2026-07-26T08:00:00.000Z",
    lastHeartbeatAt: "2026-07-26T08:00:00.000Z",
    leaseExpiresAt: "2026-07-26T09:00:00.000Z",
    leaseTokenHash: "a".repeat(64),
  };
}

function tracker(blockingStarted) {
  const counts = {
    command: { created: 0, destroyed: 0, open: 0 },
    blocking: { created: 0, destroyed: 0, open: 0 },
  };
  return {
    counts,
    factory(options, { kind }) {
      const inner = createClient(options);
      let open = false;
      let destroyed = false;
      counts[kind].created += 1;
      return {
        get isOpen() {
          return inner.isOpen;
        },
        on(event, listener) {
          inner.on(event, listener);
          return this;
        },
        off(event, listener) {
          inner.off(event, listener);
          return this;
        },
        async connect() {
          await inner.connect();
          if (!open) {
            open = true;
            counts[kind].open += 1;
          }
        },
        async sendCommand(command) {
          if (command[0] === "XREADGROUP") blockingStarted.resolve();
          return inner.sendCommand(command);
        },
        destroy() {
          if (destroyed) return;
          destroyed = true;
          if (open) {
            open = false;
            counts[kind].open -= 1;
          }
          counts[kind].destroyed += 1;
          inner.destroy();
        },
      };
    },
  };
}

async function exactPrefixCleanup(client, prefix) {
  let cursor = "0";
  do {
    const [next, keys] = await client.sendCommand([
      "SCAN",
      cursor,
      "MATCH",
      `${prefix}:*`,
      "COUNT",
      "100",
    ]);
    cursor = next;
    if (keys.length > 0) await client.sendCommand(["DEL", ...keys]);
  } while (cursor !== "0");
}

test(
  "persistent Redis lanes reuse connections and bounded close cancels a live block",
  { skip: redisUrl ? false : "AGENTS_TEST_REDIS_URL is not set" },
  async () => {
    const prefix = `agents:test:v5:g01:${crypto.randomUUID()}`;
    const raw = createClient({
      url: redisUrl,
      RESP: 2,
      socket: { reconnectStrategy: false },
    });
    const blockingStarted = deferred();
    const clients = tracker(blockingStarted);
    const queue = createRedisCoordinationQueue({
      redisUrl,
      prefix,
      shutdownTimeoutMs: 25,
      clientFactory: clients.factory,
    });
    await raw.connect();

    try {
      assert.deepEqual(await queue.ping(), { status: "ready" });
      assert.deepEqual(await queue.ping(), { status: "ready" });
      await queue.putParticipant(participant(), {
        ttlMs: 3_600_000,
        ifAbsent: true,
      });
      assert.deepEqual(clients.counts.command, {
        created: 1,
        destroyed: 0,
        open: 1,
      });

      const receive = queue.readInbox({
        participantId: "pt-lifecycle",
        consumerId: "consumer-lifecycle",
        count: 1,
        blockMs: 30_000,
        now: Date.now(),
        fence: {
          participantId: "pt-lifecycle",
          scopeId: "project:v5",
          leaseTokenHash: "a".repeat(64),
        },
      });
      await blockingStarted.promise;

      const startedAt = Date.now();
      assert.deepEqual(await queue.close(), { status: "closed" });
      const elapsedMs = Date.now() - startedAt;
      assert.ok(elapsedMs < 1_000, `close took ${elapsedMs}ms`);
      await assert.rejects(
        receive,
        (err) =>
          err instanceof CoordinationQueueError
          && err.code === "COORDINATION_UNAVAILABLE",
      );
      assert.deepEqual(clients.counts, {
        command: { created: 1, destroyed: 1, open: 0 },
        blocking: { created: 1, destroyed: 1, open: 0 },
      });
    } finally {
      await queue.close();
      await exactPrefixCleanup(raw, prefix);
      if (raw.isOpen) raw.destroy();
    }
  },
);
