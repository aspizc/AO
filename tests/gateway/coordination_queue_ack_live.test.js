import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";

import {
  CoordinationQueueError,
  createRedisCoordinationQueue,
} from "../../gateway/src/core/coordination_queue.js";
import { coordinationKeys } from "../../gateway/src/core/coordination_contract.js";
import {
  createCoordinationService,
} from "../../gateway/src/services/coordination_service.js";

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
    leaseExpiresAt: "2026-07-25T10:03:00.000Z",
    leaseTokenHash: digest,
  };
}

function message(messageId, toParticipantId = "pt-recipient-a") {
  return {
    protocolVersion: 1,
    messageId,
    fromParticipantId: "pt-sender",
    toParticipantId,
    scopeId: "project:v5",
    messageType: "IMPACT_NOTICE",
    classification: "internal",
    body: `{"messageId":"${messageId}"}`,
    createdAt: "2026-07-25T10:01:00.000Z",
  };
}

function fence(record) {
  return {
    participantId: record.participantId,
    scopeId: record.scopeId,
    leaseTokenHash: record.leaseTokenHash,
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

async function expectQueueCode(promise, code) {
  await assert.rejects(
    promise,
    (err) =>
      err instanceof CoordinationQueueError
      && err.code === code,
  );
}

test(
  "Redis ACK is atomic, retry-bounded, recipient-scoped, and frees capacity",
  { skip: redisUrl ? false : "AGENTS_TEST_REDIS_URL is not set" },
  async () => {
    const prefix = `agents:test:v5:s04:${crypto.randomUUID()}`;
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
        maxInboxLength: 1,
      });
      const sender = participant("pt-sender", "a".repeat(64));
      const recipientA = participant("pt-recipient-a", "b".repeat(64));
      const recipientB = participant("pt-recipient-b", "c".repeat(64));
      for (const record of [sender, recipientA, recipientB]) {
        assert.deepEqual(
          await queue.putParticipant(record, {
            ttlMs: 180_000,
            ifAbsent: true,
          }),
          { status: "stored" },
        );
      }
      const senderFence = fence(sender);
      const recipientAFence = fence(recipientA);
      const sendToA = {
        senderFence,
        recipientFence: recipientAFence,
        dedupeTtlMs: 120_000,
      };
      const ackA = (deliveryIds) => queue.ackInbox({
        participantId: recipientA.participantId,
        deliveryIds,
        tombstoneTtlMs: 60_000,
        timestamp: "2026-07-25T10:02:00.000Z",
        fence: recipientAFence,
      });
      const receiveA = () => queue.readInbox({
        participantId: recipientA.participantId,
        consumerId: "consumer-a",
        count: 1,
        reclaimIdleMs: null,
        blockMs: 0,
        now: Date.now(),
        fence: recipientAFence,
      });

      const first = await queue.putMessage(message("cm-first"), sendToA);
      assert.equal(first.status, "created");
      assert.equal((await receiveA()).deliveries[0].deliveryId, first.deliveryId);
      assert.deepEqual(
        await queue.putMessage(message("cm-full"), sendToA),
        { status: "inbox_full" },
      );

      assert.deepEqual(
        await ackA([first.deliveryId]),
        { status: "acked", ackedCount: 1 },
      );
      assert.equal(
        await raw.sendCommand(["XLEN", keys.inbox(recipientA.participantId)]),
        0,
      );
      assert.equal(
        await raw.sendCommand([
          "GET",
          keys.acked(recipientA.participantId, first.deliveryId),
        ]),
        "1",
      );

      const second = await queue.putMessage(message("cm-second"), sendToA);
      assert.equal(second.status, "created");
      assert.equal((await receiveA()).deliveries[0].deliveryId, second.deliveryId);

      const firstTombstone = keys.acked(
        recipientA.participantId,
        first.deliveryId,
      );
      await raw.sendCommand(["PEXPIRE", firstTombstone, "5000"]);
      const retryTtlBefore = await raw.sendCommand(["PTTL", firstTombstone]);
      assert.deepEqual(
        await ackA([first.deliveryId]),
        { status: "acked", ackedCount: 0 },
      );
      assert.ok(
        await raw.sendCommand(["PTTL", firstTombstone])
          > retryTtlBefore + 40_000,
      );

      await raw.sendCommand(["PEXPIRE", firstTombstone, "5000"]);
      const mixedTtlBefore = await raw.sendCommand(["PTTL", firstTombstone]);
      const unknownId = "9999999999998-0";
      assert.deepEqual(
        await ackA([first.deliveryId, second.deliveryId, unknownId]),
        { status: "delivery_not_found" },
      );
      assert.equal(
        await raw.sendCommand([
          "GET",
          keys.acked(recipientA.participantId, second.deliveryId),
        ]),
        null,
      );
      assert.ok(
        await raw.sendCommand(["PTTL", firstTombstone]) <= mixedTtlBefore,
      );
      assert.equal(
        (await raw.sendCommand([
          "XPENDING",
          keys.inbox(recipientA.participantId),
          "coordination-v1",
          second.deliveryId,
          second.deliveryId,
          "10",
        ])).length,
        1,
      );

      const replacement = participant("pt-recipient-a", "d".repeat(64));
      await raw.sendCommand([
        "SET",
        keys.presence(recipientA.participantId),
        JSON.stringify(replacement),
        "PX",
        "180000",
      ]);
      assert.deepEqual(
        await ackA([second.deliveryId]),
        { status: "fence_mismatch" },
      );
      assert.equal(
        await raw.sendCommand([
          "GET",
          keys.acked(recipientA.participantId, second.deliveryId),
        ]),
        null,
      );
      await raw.sendCommand([
        "SET",
        keys.presence(recipientA.participantId),
        JSON.stringify(recipientA),
        "PX",
        "180000",
      ]);

      assert.deepEqual(
        await ackA([first.deliveryId, second.deliveryId]),
        { status: "acked", ackedCount: 1 },
      );
      assert.equal(
        await raw.sendCommand(["XLEN", keys.inbox(recipientA.participantId)]),
        0,
      );
      assert.equal(
        await raw.sendCommand([
          "GET",
          keys.acked(recipientA.participantId, second.deliveryId),
        ]),
        "1",
      );
      await raw.sendCommand(["DEL", firstTombstone]);
      assert.deepEqual(
        await ackA([first.deliveryId]),
        { status: "delivery_not_found" },
      );

      const third = await queue.putMessage(message("cm-third"), sendToA);
      assert.equal(third.status, "created");
      assert.equal((await receiveA()).deliveries[0].deliveryId, third.deliveryId);
      const thirdTombstone = keys.acked(
        recipientA.participantId,
        third.deliveryId,
      );
      await raw.sendCommand(["SET", thirdTombstone, "corrupt"]);
      await expectQueueCode(
        ackA([third.deliveryId]),
        "COORDINATION_INVALID_DATA",
      );
      assert.equal(
        (await raw.sendCommand([
          "XPENDING",
          keys.inbox(recipientA.participantId),
          "coordination-v1",
          third.deliveryId,
          third.deliveryId,
          "10",
        ])).length,
        1,
      );
      await raw.sendCommand(["DEL", thirdTombstone]);

      assert.deepEqual(
        await ackA([third.deliveryId]),
        { status: "acked", ackedCount: 1 },
      );
      assert.equal(
        await raw.sendCommand(["XLEN", keys.inbox(recipientA.participantId)]),
        0,
      );

      const eventRows = await raw.sendCommand([
        "XRANGE",
        keys.events,
        "-",
        "+",
      ]);
      const ackEvents = eventRows
        .map((row) => JSON.parse(row[1][1]))
        .filter(({ eventType }) => eventType === "message.acked");
      assert.equal(ackEvents.length, 3);
      for (const event of ackEvents) {
        assert.equal(Object.hasOwn(event, "body"), false);
        assert.equal(Object.hasOwn(event, "messageId"), false);
        assert.equal(Object.hasOwn(event, "leaseToken"), false);
        assert.equal(Object.hasOwn(event, "leaseTokenHash"), false);
      }
      assert.doesNotMatch(JSON.stringify(ackEvents), /a{64}|b{64}/);

      const corruptCases = [
        [
          "9999999999995-0",
          JSON.stringify({
            toParticipantId: recipientA.participantId,
            scopeId: recipientA.scopeId,
          }),
        ],
        ["9999999999996-0", "{"],
        [
          "9999999999997-0",
          JSON.stringify(message("cm-foreign", recipientB.participantId)),
        ],
      ];
      for (let index = 0; index < corruptCases.length; index += 1) {
        const [deliveryId, serializedEnvelope] = corruptCases[index];
        await raw.sendCommand([
          "XADD",
          keys.inbox(recipientA.participantId),
          deliveryId,
          "envelope",
          serializedEnvelope,
        ]);
        await expectQueueCode(
          queue.readInbox({
            participantId: recipientA.participantId,
            consumerId: `consumer-corrupt-${index}`,
            count: 1,
            reclaimIdleMs: null,
            blockMs: 0,
            now: Date.now(),
            fence: recipientAFence,
          }),
          "COORDINATION_INVALID_DATA",
        );
        const corruptTombstone = keys.acked(
          recipientA.participantId,
          deliveryId,
        );
        const eventCountBefore = await raw.sendCommand(["XLEN", keys.events]);
        await expectQueueCode(
          ackA([deliveryId]),
          "COORDINATION_INVALID_DATA",
        );
        assert.equal(
          (await raw.sendCommand([
            "XPENDING",
            keys.inbox(recipientA.participantId),
            "coordination-v1",
            deliveryId,
            deliveryId,
            "10",
          ])).length,
          1,
        );
        assert.equal(
          (await raw.sendCommand([
            "XRANGE",
            keys.inbox(recipientA.participantId),
            deliveryId,
            deliveryId,
          ])).length,
          1,
        );
        assert.equal(
          await raw.sendCommand(["GET", corruptTombstone]),
          null,
        );
        assert.equal(
          await raw.sendCommand(["XLEN", keys.events]),
          eventCountBefore,
        );
        await raw.sendCommand([
          "XACK",
          keys.inbox(recipientA.participantId),
          "coordination-v1",
          deliveryId,
        ]);
        await raw.sendCommand([
          "XDEL",
          keys.inbox(recipientA.participantId),
          deliveryId,
        ]);
      }

      const fourth = await queue.putMessage(message("cm-fourth"), sendToA);
      assert.equal(fourth.status, "created");
      assert.equal(
        (await receiveA()).deliveries[0].deliveryId,
        fourth.deliveryId,
      );
      await raw.sendCommand(["DEL", keys.events]);
      await raw.sendCommand([
        "XADD",
        keys.events,
        MAX_STREAM_ID,
        "event",
        "{}",
      ]);
      assert.deepEqual(
        await ackA([fourth.deliveryId]),
        { status: "acked", ackedCount: 1 },
      );
      assert.equal(
        await raw.sendCommand(["XLEN", keys.inbox(recipientA.participantId)]),
        0,
      );

      const crossId = "9999999999999-0";
      await raw.sendCommand([
        "XADD",
        keys.inbox(recipientB.participantId),
        crossId,
        "envelope",
        JSON.stringify(message("cm-cross", recipientB.participantId)),
      ]);
      const recipientBFence = fence(recipientB);
      assert.equal(
        (await queue.readInbox({
          participantId: recipientB.participantId,
          consumerId: "consumer-b",
          count: 1,
          reclaimIdleMs: null,
          blockMs: 0,
          now: Date.now(),
          fence: recipientBFence,
        })).deliveries[0].deliveryId,
        crossId,
      );
      assert.deepEqual(
        await ackA([crossId]),
        { status: "delivery_not_found" },
      );
      assert.equal(
        (await raw.sendCommand([
          "XPENDING",
          keys.inbox(recipientB.participantId),
          "coordination-v1",
          crossId,
          crossId,
          "10",
        ])).length,
        1,
      );

      assert.equal(
        await raw.sendCommand([
          "XGROUP",
          "DESTROY",
          keys.inbox(recipientB.participantId),
          "coordination-v1",
        ]),
        1,
      );
      await expectQueueCode(
        queue.ackInbox({
          participantId: recipientB.participantId,
          deliveryIds: [crossId],
          tombstoneTtlMs: 60_000,
          timestamp: "2026-07-25T10:02:00.000Z",
          fence: recipientBFence,
        }),
        "COORDINATION_INVALID_DATA",
      );
      assert.deepEqual(
        await raw.sendCommand([
          "XINFO",
          "GROUPS",
          keys.inbox(recipientB.participantId),
        ]),
        [],
      );
    } finally {
      await queue?.close();
      await exactPrefixCleanup(raw, prefix);
      if (raw.isOpen) raw.destroy();
    }
  },
);

test(
  "public service ACK accepts multibyte optional IDs at the UTF-16 boundary",
  { skip: redisUrl ? false : "AGENTS_TEST_REDIS_URL is not set" },
  async () => {
    const prefix = `agents:test:v5:s04:unicode:${crypto.randomUUID()}`;
    const raw = createClient({
      url: redisUrl,
      RESP: 2,
      socket: { reconnectStrategy: false },
    });
    await raw.connect();
    let queue;
    try {
      queue = createRedisCoordinationQueue({ redisUrl, prefix });
      const generatedIds = ["unicode-sender", "unicode-recipient"];
      const service = createCoordinationService({
        queue,
        config: {
          coordinationLeaseDefaultMs: 120_000,
          coordinationLeaseMaxMs: 120_000,
          coordinationMessageMaxBytes: 1_024,
          coordinationMaxBlockMs: 1_000,
          coordinationDedupeTtlMs: 60_000,
          coordinationAckTombstoneTtlMs: 60_000,
        },
        randomUUID: () => generatedIds.shift(),
        randomToken: () => crypto.randomBytes(32).toString("base64url"),
      });
      const sender = await service.register({
        participantType: "orchestrator",
        scopeId: "project:v5",
        capabilities: ["coordination.v1"],
      });
      const recipient = await service.register({
        participantType: "orchestrator",
        scopeId: "project:v5",
        capabilities: ["coordination.v1"],
      });
      const traceId = "é".repeat(128);
      const correlationId = "😀".repeat(64);
      assert.equal(traceId.length, 128);
      assert.equal(correlationId.length, 128);

      const sent = await service.send({
        participantId: sender.participantId,
        leaseToken: sender.leaseToken,
        toParticipantId: recipient.participantId,
        messageId: "cm-unicode-boundary",
        messageType: "IMPACT_NOTICE",
        classification: "internal",
        body: "{\"kind\":\"unicode-boundary\"}",
        traceId,
        correlationId,
      });
      assert.equal(sent.message.traceId, traceId);
      assert.equal(sent.message.correlationId, correlationId);
      const [delivery] = await service.receive({
        participantId: recipient.participantId,
        leaseToken: recipient.leaseToken,
        consumerId: "consumer-unicode",
        count: 1,
      });
      assert.equal(delivery.deliveryId, sent.deliveryId);
      assert.equal(delivery.message.traceId, traceId);
      assert.equal(delivery.message.correlationId, correlationId);
      assert.deepEqual(
        await service.ack({
          participantId: recipient.participantId,
          leaseToken: recipient.leaseToken,
          deliveryIds: [delivery.deliveryId],
        }),
        {
          ackedCount: 1,
          deliveryIds: [delivery.deliveryId],
        },
      );
    } finally {
      await queue?.close();
      await exactPrefixCleanup(raw, prefix);
      if (raw.isOpen) raw.destroy();
    }
  },
);
