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

function participant(participantId, digest) {
  return {
    protocolVersion: 1,
    participantId,
    participantType: "orchestrator",
    scopeId: "project:v5",
    capabilities: ["coordination.v1"],
    metadata: {},
    registeredAt: "2026-07-25T10:00:00.000Z",
    lastHeartbeatAt: "2026-07-25T10:00:00.000Z",
    leaseExpiresAt: "2026-07-25T10:02:00.000Z",
    leaseTokenHash: digest,
  };
}

function message(messageId) {
  return {
    protocolVersion: 1,
    messageId,
    fromParticipantId: "pt-sender",
    toParticipantId: "pt-recipient",
    scopeId: "project:v5",
    messageType: "IMPACT_NOTICE",
    classification: "internal",
    body: `{"messageId":"${messageId}"}`,
    createdAt: "2026-07-25T10:01:00.000Z",
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

function raceClientFactory(controller, presenceKey, replacement) {
  return (options) => {
    const inner = createClient(options);
    let replaceAfterRead = true;
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
      },
      async sendCommand(command) {
        const reply = await inner.sendCommand(command);
        if (replaceAfterRead && command[0] === "XREADGROUP") {
          replaceAfterRead = false;
          await controller.sendCommand([
            "SET",
            presenceKey,
            JSON.stringify(replacement),
            "PX",
            "120000",
          ]);
        }
        return reply;
      },
      destroy() {
        inner.destroy();
      },
    };
  };
}

test(
  "Redis receive reclaims, post-fences blocking reads, and rejects deleted pending IDs",
  { skip: redisUrl ? false : "AGENTS_TEST_REDIS_URL is not set" },
  async () => {
    const prefix = `agents:test:v5:s03:${crypto.randomUUID()}`;
    const keys = coordinationKeys(prefix);
    const raw = createClient({
      url: redisUrl,
      RESP: 2,
      socket: { reconnectStrategy: false },
    });
    await raw.connect();
    let queue;
    let raceQueue;
    try {
      queue = createRedisCoordinationQueue({
        redisUrl,
        prefix,
        maxInboxLength: 20,
      });
      const sender = participant("pt-sender", "a".repeat(64));
      const recipient = participant("pt-recipient", "b".repeat(64));
      const senderFence = {
        participantId: sender.participantId,
        scopeId: sender.scopeId,
        leaseTokenHash: sender.leaseTokenHash,
      };
      const recipientFence = {
        participantId: recipient.participantId,
        scopeId: recipient.scopeId,
        leaseTokenHash: recipient.leaseTokenHash,
      };
      await queue.putParticipant(sender, {
        ttlMs: 120_000,
        ifAbsent: true,
      });
      await queue.putParticipant(recipient, {
        ttlMs: 120_000,
        ifAbsent: true,
      });

      const first = await queue.putMessage(message("cm-first"), {
        senderFence,
        recipientFence,
        dedupeTtlMs: 120_000,
      });
      const second = await queue.putMessage(message("cm-second"), {
        senderFence,
        recipientFence,
        dedupeTtlMs: 120_000,
      });
      assert.equal(first.status, "created");
      assert.equal(second.status, "created");

      assert.deepEqual(
        await queue.readInbox({
          participantId: "pt-recipient",
          consumerId: "consumer-a",
          count: 1,
          reclaimIdleMs: null,
          blockMs: 0,
          now: Date.now(),
          fence: recipientFence,
        }),
        {
          status: "read",
          deliveries: [{
            deliveryId: first.deliveryId,
            message: message("cm-first"),
            recovered: false,
          }],
        },
      );

      assert.deepEqual(
        await queue.readInbox({
          participantId: "pt-recipient",
          consumerId: "consumer-b",
          count: 2,
          reclaimIdleMs: 0,
          blockMs: 0,
          now: Date.now(),
          fence: recipientFence,
        }),
        {
          status: "read",
          deliveries: [
            {
              deliveryId: first.deliveryId,
              message: message("cm-first"),
              recovered: true,
            },
            {
              deliveryId: second.deliveryId,
              message: message("cm-second"),
              recovered: false,
            },
          ],
        },
      );

      const third = await queue.putMessage(message("cm-third"), {
        senderFence,
        recipientFence,
        dedupeTtlMs: 120_000,
      });
      assert.equal(third.status, "created");
      const replacement = participant("pt-recipient", "c".repeat(64));
      raceQueue = createRedisCoordinationQueue({
        redisUrl,
        prefix,
        maxInboxLength: 20,
        clientFactory: raceClientFactory(
          raw,
          keys.presence("pt-recipient"),
          replacement,
        ),
      });
      assert.deepEqual(
        await raceQueue.readInbox({
          participantId: "pt-recipient",
          consumerId: "consumer-race",
          count: 1,
          reclaimIdleMs: null,
          blockMs: 1_000,
          now: Date.now(),
          fence: recipientFence,
        }),
        { status: "fence_mismatch" },
      );
      const racedPending = await raw.sendCommand([
        "XPENDING",
        keys.inbox("pt-recipient"),
        "coordination-v1",
        third.deliveryId,
        third.deliveryId,
        "10",
      ]);
      assert.equal(racedPending.length, 1);
      assert.equal(racedPending[0][0], third.deliveryId);
      assert.equal(racedPending[0][1], "consumer-race");

      await raw.sendCommand([
        "SET",
        keys.presence("pt-recipient"),
        JSON.stringify(recipient),
        "PX",
        "120000",
      ]);
      assert.equal(
        await raw.sendCommand([
          "XDEL",
          keys.inbox("pt-recipient"),
          first.deliveryId,
        ]),
        1,
      );
      await assert.rejects(
        queue.readInbox({
          participantId: "pt-recipient",
          consumerId: "consumer-c",
          count: 20,
          reclaimIdleMs: 0,
          blockMs: 0,
          now: Date.now(),
          fence: recipientFence,
        }),
        (err) =>
          err instanceof CoordinationQueueError
          && err.code === "COORDINATION_INVALID_DATA",
      );
    } finally {
      await Promise.all([queue?.close(), raceQueue?.close()]);
      await exactPrefixCleanup(raw, prefix);
      if (raw.isOpen) raw.destroy();
    }
  },
);
