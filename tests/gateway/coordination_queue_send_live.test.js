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
    leaseExpiresAt: "2026-07-25T10:01:00.000Z",
    leaseTokenHash: digest,
  };
}

function message(messageId, overrides = {}) {
  return {
    protocolVersion: 1,
    messageId,
    fromParticipantId: "pt-sender",
    toParticipantId: "pt-recipient",
    scopeId: "project:v5",
    messageType: "IMPACT_NOTICE",
    classification: "internal",
    body: "{\"path\":\"gateway/src/tools/index.js\"}",
    createdAt: "2026-07-25T10:01:00.000Z",
    ...overrides,
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
  "Redis send preserves dedupe, backpressure, and best-effort metadata",
  { skip: redisUrl ? false : "AGENTS_TEST_REDIS_URL is not set" },
  async () => {
    const prefix = `agents:test:v5:s02:${crypto.randomUUID()}`;
    const keys = coordinationKeys(prefix);
    const raw = createClient({
      url: redisUrl,
      RESP: 2,
      socket: { reconnectStrategy: false },
    });
    await raw.connect();
    let queue;
    try {
      queue = createRedisCoordinationQueue({
        redisUrl,
        prefix,
        maxInboxLength: 3,
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
      const options = {
        senderFence,
        recipientFence,
        dedupeTtlMs: 60_000,
      };
      await queue.putParticipant(sender, { ttlMs: 60_000, ifAbsent: true });
      await queue.putParticipant(recipient, { ttlMs: 60_000, ifAbsent: true });

      const firstMessage = message("cm-first");
      const first = await queue.putMessage(firstMessage, options);
      assert.equal(first.status, "created");
      assert.equal(
        await raw.sendCommand(["XLEN", keys.inbox("pt-recipient")]),
        1,
      );
      const storedDedupe = JSON.parse(await raw.sendCommand([
        "GET",
        keys.dedupe("pt-sender", "cm-first"),
      ]));
      assert.deepEqual(storedDedupe, {
        envelope: firstMessage,
        deliveryId: first.deliveryId,
      });
      assert.ok(
        await raw.sendCommand([
          "PTTL",
          keys.dedupe("pt-sender", "cm-first"),
        ]) > 0,
      );

      await raw.sendCommand([
        "PEXPIRE",
        keys.dedupe("pt-sender", "cm-first"),
        "5000",
      ]);
      const beforeRenewal = await raw.sendCommand([
        "PTTL",
        keys.dedupe("pt-sender", "cm-first"),
      ]);
      const duplicate = await queue.putMessage(message("cm-first", {
        createdAt: "2026-07-25T10:01:01.000Z",
      }), options);
      assert.deepEqual(duplicate, {
        status: "duplicate",
        deliveryId: first.deliveryId,
        envelope: firstMessage,
      });
      assert.equal(
        await raw.sendCommand(["XLEN", keys.inbox("pt-recipient")]),
        1,
      );
      assert.ok(
        await raw.sendCommand([
          "PTTL",
          keys.dedupe("pt-sender", "cm-first"),
        ]) > beforeRenewal + 40_000,
      );

      await raw.sendCommand([
        "PEXPIRE",
        keys.dedupe("pt-sender", "cm-first"),
        "5000",
      ]);
      const beforeConflict = await raw.sendCommand([
        "PTTL",
        keys.dedupe("pt-sender", "cm-first"),
      ]);
      assert.deepEqual(
        await queue.putMessage(message("cm-first", { body: "changed" }), options),
        { status: "conflict" },
      );
      const afterConflict = await raw.sendCommand([
        "PTTL",
        keys.dedupe("pt-sender", "cm-first"),
      ]);
      assert.ok(afterConflict > 0 && afterConflict <= beforeConflict);

      const corruptEnvelope = message("cm-corrupt", {
        createdAt: "not-an-iso-time",
      });
      await raw.sendCommand([
        "SET",
        keys.dedupe("pt-sender", "cm-corrupt"),
        JSON.stringify({
          envelope: corruptEnvelope,
          deliveryId: "1-0",
        }),
        "PX",
        "5000",
      ]);
      const corruptTtlBefore = await raw.sendCommand([
        "PTTL",
        keys.dedupe("pt-sender", "cm-corrupt"),
      ]);
      const corruptEventsBefore = await raw.sendCommand([
        "XLEN",
        keys.events,
      ]);
      await assert.rejects(
        queue.putMessage(message("cm-corrupt"), options),
        (err) =>
          err instanceof CoordinationQueueError
          && err.code === "COORDINATION_INVALID_DATA",
      );
      const corruptTtlAfter = await raw.sendCommand([
        "PTTL",
        keys.dedupe("pt-sender", "cm-corrupt"),
      ]);
      assert.ok(corruptTtlAfter > 0 && corruptTtlAfter <= corruptTtlBefore);
      assert.equal(
        await raw.sendCommand(["XLEN", keys.events]),
        corruptEventsBefore,
      );

      await raw.sendCommand([
        "DEL",
        keys.dedupe("pt-sender", "cm-first"),
      ]);
      const redelivered = await queue.putMessage(message("cm-first", {
        createdAt: "2026-07-25T10:01:02.000Z",
      }), options);
      assert.equal(redelivered.status, "created");
      assert.notEqual(redelivered.deliveryId, first.deliveryId);
      assert.equal(
        await raw.sendCommand(["XLEN", keys.inbox("pt-recipient")]),
        2,
      );

      const eventRows = await raw.sendCommand([
        "XRANGE",
        keys.events,
        "-",
        "+",
      ]);
      const serializedEvents = JSON.stringify(eventRows);
      assert.doesNotMatch(
        serializedEvents,
        /gateway\/src|leaseToken|leaseTokenHash|a{64}|b{64}/,
      );

      await raw.sendCommand(["DEL", keys.events]);
      await raw.sendCommand([
        "XADD",
        keys.events,
        MAX_STREAM_ID,
        "event",
        "{}",
      ]);
      const second = await queue.putMessage(message("cm-second"), options);
      assert.equal(second.status, "created");
      assert.equal(
        await raw.sendCommand(["XLEN", keys.inbox("pt-recipient")]),
        3,
      );
      assert.ok(await raw.sendCommand([
        "GET",
        keys.dedupe("pt-sender", "cm-second"),
      ]));

      assert.deepEqual(
        await queue.putMessage(message("cm-third"), options),
        { status: "inbox_full" },
      );
      assert.equal(
        await raw.sendCommand([
          "EXISTS",
          keys.dedupe("pt-sender", "cm-third"),
        ]),
        0,
      );
    } finally {
      await queue?.close();
      await exactPrefixCleanup(raw, prefix);
      raw.destroy();
    }
  },
);
