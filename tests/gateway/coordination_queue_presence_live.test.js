import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";

import {
  CoordinationQueueError,
  createRedisCoordinationQueue,
} from "../../gateway/src/core/coordination_queue.js";
import { coordinationKeys } from "../../gateway/src/core/coordination_contract.js";

const redisUrl = process.env.AGENTS_TEST_REDIS_URL;
const requireFromGateway = createRequire(
  new URL("../../gateway/package.json", import.meta.url),
);
const { createClient } = requireFromGateway("redis");
const MAX_STREAM_ID = "18446744073709551615-18446744073709551615";

function participant(participantId) {
  return {
    protocolVersion: 1,
    participantId,
    participantType: "orchestrator",
    scopeId: "project:v5",
    capabilities: ["coordination.v1"],
    metadata: {},
    registeredAt: "2026-07-25T10:00:00.000Z",
    lastHeartbeatAt: "2026-07-25T10:00:00.000Z",
    leaseExpiresAt: "2026-07-25T10:01:00.000Z",
    leaseTokenHash: "a".repeat(64),
  };
}

async function exactPrefixCleanup(client, prefix) {
  let cursor = "0";
  do {
    const reply = await client.sendCommand([
      "SCAN",
      cursor,
      "MATCH",
      `${prefix}:*`,
      "COUNT",
      "100",
    ]);
    cursor = reply[0];
    if (reply[1].length > 0) {
      await client.sendCommand(["DEL", ...reply[1]]);
    }
  } while (cursor !== "0");
}

test(
  "late metadata XADD failure cannot partially register or unregister presence",
  { skip: redisUrl ? false : "AGENTS_TEST_REDIS_URL is not set" },
  async () => {
    const prefix = `agents:test:v5:s01:${crypto.randomUUID()}`;
    const keys = coordinationKeys(prefix);
    const raw = createClient({
      url: redisUrl,
      RESP: 2,
      socket: { reconnectStrategy: false },
    });
    await raw.connect();
    let queue;
    try {
      queue = createRedisCoordinationQueue({ redisUrl, prefix });
      const registerRecord = participant("pt-register");
      await raw.sendCommand([
        "XADD",
        keys.events,
        MAX_STREAM_ID,
        "event",
        "{}",
      ]);

      await assert.rejects(
        queue.putParticipant(registerRecord, {
          ttlMs: 60_000,
          ifAbsent: true,
        }),
        (err) =>
          err instanceof CoordinationQueueError
          && err.code === "COORDINATION_UNAVAILABLE",
      );
      assert.equal(
        await raw.sendCommand(["EXISTS", keys.presence("pt-register")]),
        0,
      );
      assert.equal(
        await raw.sendCommand([
          "SISMEMBER",
          keys.participants,
          "pt-register",
        ]),
        0,
      );

      await raw.sendCommand(["DEL", keys.events]);
      const unregisterRecord = participant("pt-unregister");
      assert.deepEqual(
        await queue.putParticipant(unregisterRecord, {
          ttlMs: 60_000,
          ifAbsent: true,
        }),
        { status: "stored" },
      );
      await raw.sendCommand(["DEL", keys.events]);
      await raw.sendCommand([
        "XADD",
        keys.events,
        MAX_STREAM_ID,
        "event",
        "{}",
      ]);

      await assert.rejects(
        queue.deleteParticipant("pt-unregister", {
          fence: {
            participantId: "pt-unregister",
            scopeId: "project:v5",
            leaseTokenHash: "a".repeat(64),
          },
          timestamp: "2026-07-25T10:00:20.000Z",
        }),
        (err) =>
          err instanceof CoordinationQueueError
          && err.code === "COORDINATION_UNAVAILABLE",
      );
      assert.equal(
        await raw.sendCommand(["EXISTS", keys.presence("pt-unregister")]),
        1,
      );
      assert.equal(
        await raw.sendCommand([
          "SISMEMBER",
          keys.participants,
          "pt-unregister",
        ]),
        1,
      );
      assert.equal(
        await raw.sendCommand(["PTTL", keys.inbox("pt-unregister")]),
        -1,
      );
    } finally {
      await queue?.close();
      await exactPrefixCleanup(raw, prefix);
      raw.destroy();
    }
  },
);
