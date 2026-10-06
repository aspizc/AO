import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";

import {
  createRedisCoordinationQueue,
} from "../../gateway/src/core/coordination_queue.js";
import {
  coordinationKeys,
} from "../../gateway/src/core/coordination_contract.js";
import {
  CoordinationError,
  createCoordinationService,
} from "../../gateway/src/services/coordination_service.js";

const redisUrl = process.env.AGENTS_TEST_REDIS_URL;
const requireFromGateway = createRequire(
  new URL("../../gateway/package.json", import.meta.url),
);
const { createClient } = requireFromGateway("redis");
const GROUP = "coordination-v1";
const CONCURRENT_CLIENTS = 4;
const RACE_REPETITIONS = 6;

function isSendScript(script) {
  return (
    typeof script === "string"
    && script.includes("local function same_message")
    && script.includes("redis.call('XLEN'")
  );
}

function isAckScript(script) {
  return (
    typeof script === "string"
    && script.includes("'XPENDING'")
    && script.includes("'XACK'")
    && script.includes("'XDEL'")
  );
}

function createClientTracker({ beforeEval = null } = {}) {
  let created = 0;
  let destroyed = 0;
  let open = 0;
  let hook = beforeEval;

  return {
    factory(options) {
      const inner = createClient(options);
      let countedOpen = false;
      let countedDestroyed = false;
      created += 1;

      const destroy = () => {
        if (countedDestroyed) return;
        countedDestroyed = true;
        if (countedOpen) {
          countedOpen = false;
          open -= 1;
        }
        destroyed += 1;
        inner.destroy();
      };

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
          if (!countedOpen) {
            countedOpen = true;
            open += 1;
          }
        },
        async sendCommand(command) {
          if (
            hook
            && command[0] === "EVAL"
            && hook.matches(command[1])
          ) {
            const currentHook = hook;
            hook = null;
            const result = await currentHook.run();
            if (result === "disconnect") {
              destroy();
              throw new Error("isolated injected connection loss");
            }
          }
          return inner.sendCommand(command);
        },
        destroy,
      };
    },
    snapshot() {
      return { created, destroyed, open };
    },
  };
}

function createTrackedService({
  prefix,
  maxInboxLength,
  uuids = [],
  beforeEval = null,
}) {
  const tracker = createClientTracker({ beforeEval });
  let uuidIndex = 0;
  const queue = createRedisCoordinationQueue({
    redisUrl,
    prefix,
    maxInboxLength,
    clientFactory: tracker.factory,
  });
  const service = createCoordinationService({
    queue,
    config: {
      coordinationScopeId: "project:v5:g00",
      coordinationLeaseDefaultMs: 120_000,
      coordinationLeaseMaxMs: 120_000,
      coordinationMessageMaxBytes: 4_096,
      coordinationMaxBlockMs: 1_000,
      coordinationDedupeTtlMs: 60_000,
      coordinationAckTombstoneTtlMs: 60_000,
    },
    randomUUID: () => uuids[uuidIndex++] ?? crypto.randomUUID(),
    randomToken: () => crypto.randomBytes(32).toString("base64url"),
  });
  return { service, tracker, queue };
}

function sendInput(sender, recipient, messageId, body) {
  return {
    participantId: sender.participantId,
    leaseToken: sender.leaseToken,
    toParticipantId: recipient.participantId,
    messageId,
    messageType: "IMPACT_NOTICE",
    classification: "internal",
    body,
    correlationId: `race-${messageId}`,
  };
}

function receiveInput(participant, consumerId, overrides = {}) {
  return {
    participantId: participant.participantId,
    leaseToken: participant.leaseToken,
    consumerId,
    count: 10,
    ...overrides,
  };
}

function ackInput(participant, deliveryIds) {
  return {
    participantId: participant.participantId,
    leaseToken: participant.leaseToken,
    deliveryIds,
  };
}

async function expectServiceCode(promise, code) {
  await assert.rejects(
    promise,
    (err) => err instanceof CoordinationError && err.code === code,
  );
}

async function scanExactKeys(client, prefix) {
  const found = [];
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
    for (const key of reply[1]) {
      assert.ok(key.startsWith(`${prefix}:`));
      found.push(key);
    }
  } while (cursor !== "0");
  return [...new Set(found)].sort();
}

async function exactPrefixCleanup(client, prefix) {
  while (true) {
    const keys = await scanExactKeys(client, prefix);
    if (keys.length === 0) return;
    await client.sendCommand(["DEL", ...keys]);
  }
}

async function assertRedis7Standalone(client) {
  const server = await client.sendCommand(["INFO", "server"]);
  const cluster = await client.sendCommand(["INFO", "cluster"]);
  const role = await client.sendCommand(["ROLE"]);

  assert.match(server, /^redis_version:7\./m);
  assert.match(server, /^redis_mode:standalone$/m);
  assert.match(cluster, /^cluster_enabled:0$/m);
  assert.equal(role[0], "master");
}

async function pendingIds(client, inboxKey) {
  const rows = await client.sendCommand([
    "XPENDING",
    inboxKey,
    GROUP,
    "-",
    "+",
    "100",
  ]);
  return rows.map((row) => row[0]).sort();
}

function assertTrackersClosed(trackers) {
  for (const tracker of trackers) {
    const snapshot = tracker.snapshot();
    assert.equal(snapshot.open, 0);
    assert.equal(snapshot.created, snapshot.destroyed);
    assert.equal(snapshot.created, 1);
  }
}

test(
  "required Redis 7 lane serializes repeated equal and conflicting sends",
  { skip: redisUrl ? false : "AGENTS_TEST_REDIS_URL is not set" },
  async () => {
    const prefix = `agents:test:v5:g00:send:${crypto.randomUUID()}`;
    const keys = coordinationKeys(prefix);
    const raw = createClient({
      url: redisUrl,
      RESP: 2,
      socket: { reconnectStrategy: false },
    });
    const trackers = [];
    const instances = [];
    await raw.connect();

    try {
      await assertRedis7Standalone(raw);
      const owner = createTrackedService({
        prefix,
        maxInboxLength: 4,
        uuids: ["g00-sender", "g00-recipient"],
      });
      instances.push(owner);
      trackers.push(owner.tracker);
      const sender = await owner.service.register({
        participantType: "orchestrator",
      });
      const recipient = await owner.service.register({
        participantType: "orchestrator",
      });

      const peers = Array.from(
        { length: CONCURRENT_CLIENTS },
        () => createTrackedService({ prefix, maxInboxLength: 4 }),
      );
      instances.push(...peers);
      trackers.push(...peers.map(({ tracker }) => tracker));

      for (let seed = 0; seed < RACE_REPETITIONS; seed += 1) {
        const equalId = `cm-equal-${seed}`;
        const equalInput = sendInput(
          sender,
          recipient,
          equalId,
          JSON.stringify({ seed, variant: "equal" }),
        );
        const equalResults = await Promise.all(
          peers.map(({ service }) => service.send(equalInput)),
        );
        assert.equal(
          equalResults.filter(({ duplicate }) => !duplicate).length,
          1,
        );
        assert.equal(
          equalResults.filter(({ duplicate }) => duplicate).length,
          CONCURRENT_CLIENTS - 1,
        );
        assert.equal(
          new Set(equalResults.map(({ deliveryId }) => deliveryId)).size,
          1,
        );

        const conflictId = `cm-conflict-${seed}`;
        const conflicting = await Promise.allSettled(
          peers.map(({ service }, index) => service.send(sendInput(
            sender,
            recipient,
            conflictId,
            JSON.stringify({ seed, winnerClass: index % 2 }),
          ))),
        );
        const fulfilled = conflicting.filter(
          ({ status }) => status === "fulfilled",
        );
        const rejected = conflicting.filter(
          ({ status }) => status === "rejected",
        );
        assert.equal(fulfilled.length, CONCURRENT_CLIENTS / 2);
        assert.equal(rejected.length, CONCURRENT_CLIENTS / 2);
        assert.equal(
          fulfilled.filter(({ value }) => !value.duplicate).length,
          1,
        );
        assert.equal(
          new Set(fulfilled.map(({ value }) => value.deliveryId)).size,
          1,
        );
        for (const result of rejected) {
          assert.equal(result.reason.code, "COORDINATION_MESSAGE_CONFLICT");
        }

        assert.equal(
          await raw.sendCommand([
            "XLEN",
            keys.inbox(recipient.participantId),
          ]),
          2,
        );
        const deliveries = await owner.service.receive(
          receiveInput(recipient, `consumer-${seed}`, { count: 2 }),
        );
        assert.equal(deliveries.length, 2);
        await owner.service.ack(ackInput(
          recipient,
          deliveries.map(({ deliveryId }) => deliveryId),
        ));
        assert.equal(
          await raw.sendCommand([
            "XLEN",
            keys.inbox(recipient.participantId),
          ]),
          0,
        );
      }

      await Promise.all(instances.map(({ queue }) => queue.close()));
      assertTrackersClosed(trackers);
    } finally {
      await Promise.all(instances.map(({ queue }) => queue.close()));
      await exactPrefixCleanup(raw, prefix);
      const leaked = await scanExactKeys(raw, prefix);
      if (raw.isOpen) raw.destroy();
      assert.deepEqual(leaked, []);
    }
  },
);

test(
  "required Redis 7 lane fences replacement, failure, reclaim, and ACK races",
  { skip: redisUrl ? false : "AGENTS_TEST_REDIS_URL is not set" },
  async () => {
    const prefix = `agents:test:v5:g00:fence:${crypto.randomUUID()}`;
    const keys = coordinationKeys(prefix);
    const raw = createClient({
      url: redisUrl,
      RESP: 2,
      socket: { reconnectStrategy: false },
    });
    const trackers = [];
    const instances = [];
    await raw.connect();

    try {
      await assertRedis7Standalone(raw);
      const owner = createTrackedService({
        prefix,
        maxInboxLength: 2,
        uuids: ["g00-race-sender", "g00-race-recipient"],
      });
      const peer = createTrackedService({ prefix, maxInboxLength: 2 });
      instances.push(owner, peer);
      trackers.push(owner.tracker, peer.tracker);
      const sender = await owner.service.register({
        participantType: "orchestrator",
      });
      const recipient = await owner.service.register({
        participantType: "orchestrator",
      });
      const inboxKey = keys.inbox(recipient.participantId);

      const pendingOne = await owner.service.send(sendInput(
        sender,
        recipient,
        "cm-pending-one",
        "{\"pending\":1}",
      ));
      const pendingTwo = await peer.service.send(sendInput(
        sender,
        recipient,
        "cm-pending-two",
        "{\"pending\":2}",
      ));
      const [abandoned] = await owner.service.receive(
        receiveInput(recipient, "consumer-lost", { count: 1 }),
      );
      assert.equal(abandoned.deliveryId, pendingOne.deliveryId);

      const overflowInputs = [
        sendInput(
          sender,
          recipient,
          "cm-overflow-a",
          "{\"overflow\":\"a\"}",
        ),
        sendInput(
          sender,
          recipient,
          "cm-overflow-b",
          "{\"overflow\":\"b\"}",
        ),
      ];
      const overflow = await Promise.allSettled([
        owner.service.send(overflowInputs[0]),
        peer.service.send(overflowInputs[1]),
      ]);
      for (const result of overflow) {
        assert.equal(result.status, "rejected");
        assert.equal(result.reason.code, "COORDINATION_INBOX_FULL");
      }
      assert.equal(await raw.sendCommand(["XLEN", inboxKey]), 2);
      assert.deepEqual(await pendingIds(raw, inboxKey), [pendingOne.deliveryId]);
      for (const messageId of ["cm-overflow-a", "cm-overflow-b"]) {
        assert.equal(
          await raw.sendCommand([
            "GET",
            keys.dedupe(sender.participantId, messageId),
          ]),
          null,
        );
      }

      assert.deepEqual(
        await raw.sendCommand([
          "XCLAIM",
          inboxKey,
          GROUP,
          "consumer-lost",
          "0",
          pendingOne.deliveryId,
          "IDLE",
          "120000",
          "JUSTID",
        ]),
        [pendingOne.deliveryId],
      );
      const recovered = await peer.service.receive(
        receiveInput(recipient, "consumer-recovery", {
          count: 2,
          reclaimIdleMs: 60_000,
        }),
      );
      assert.deepEqual(
        recovered.map(({ deliveryId }) => deliveryId).sort(),
        [pendingOne.deliveryId, pendingTwo.deliveryId].sort(),
      );
      assert.equal(
        recovered.find(
          ({ deliveryId }) => deliveryId === pendingOne.deliveryId,
        ).recovered,
        true,
      );
      assert.equal(
        recovered.find(
          ({ deliveryId }) => deliveryId === pendingTwo.deliveryId,
        ).recovered,
        false,
      );

      const unknownDeliveryId = "1-1";
      await expectServiceCode(
        owner.service.ack(ackInput(recipient, [
          pendingOne.deliveryId,
          unknownDeliveryId,
          pendingTwo.deliveryId,
        ])),
        "COORDINATION_DELIVERY_NOT_FOUND",
      );
      assert.deepEqual(
        await pendingIds(raw, inboxKey),
        [pendingOne.deliveryId, pendingTwo.deliveryId].sort(),
      );
      for (const deliveryId of [pendingOne.deliveryId, pendingTwo.deliveryId]) {
        assert.equal(
          await raw.sendCommand([
            "GET",
            keys.acked(recipient.participantId, deliveryId),
          ]),
          null,
        );
      }

      const deliveryIds = [pendingOne.deliveryId, pendingTwo.deliveryId];
      assert.deepEqual(
        await peer.service.ack(ackInput(recipient, deliveryIds)),
        { ackedCount: 2, deliveryIds },
      );
      assert.deepEqual(
        await owner.service.ack(ackInput(recipient, deliveryIds)),
        { ackedCount: 0, deliveryIds },
      );
      assert.deepEqual(await pendingIds(raw, inboxKey), []);
      assert.equal(await raw.sendCommand(["XLEN", inboxKey]), 0);

      const replacementMessage = await owner.service.send(sendInput(
        sender,
        recipient,
        "cm-replacement-ack",
        "{\"race\":\"replacement\"}",
      ));
      const [replacementPending] = await peer.service.receive(
        receiveInput(recipient, "consumer-replaced", { count: 1 }),
      );
      assert.equal(
        replacementPending.deliveryId,
        replacementMessage.deliveryId,
      );

      let replacement;
      const replacementOwner = createTrackedService({
        prefix,
        maxInboxLength: 2,
        uuids: ["g00-race-recipient"],
      });
      const staleAck = createTrackedService({
        prefix,
        maxInboxLength: 2,
        beforeEval: {
          matches: isAckScript,
          run: async () => {
            await raw.sendCommand([
              "DEL",
              keys.presence(recipient.participantId),
            ]);
            replacement = await replacementOwner.service.register({
              participantType: "orchestrator",
            });
          },
        },
      });
      instances.push(replacementOwner, staleAck);
      trackers.push(replacementOwner.tracker, staleAck.tracker);
      await expectServiceCode(
        staleAck.service.ack(ackInput(
          recipient,
          [replacementMessage.deliveryId],
        )),
        "COORDINATION_LEASE_CHANGED",
      );
      assert.equal(replacement.participantId, recipient.participantId);
      assert.deepEqual(
        await pendingIds(raw, inboxKey),
        [replacementMessage.deliveryId],
      );
      assert.equal(
        await raw.sendCommand([
          "GET",
          keys.acked(recipient.participantId, replacementMessage.deliveryId),
        ]),
        null,
      );
      const [replacementRecovered] = await replacementOwner.service.receive(
        receiveInput(replacement, "consumer-replacement", {
          count: 1,
          reclaimIdleMs: 0,
        }),
      );
      assert.equal(
        replacementRecovered.deliveryId,
        replacementMessage.deliveryId,
      );
      assert.equal(replacementRecovered.recovered, true);
      await replacementOwner.service.ack(ackInput(
        replacement,
        [replacementRecovered.deliveryId],
      ));

      const failureInput = sendInput(
        sender,
        replacement,
        "cm-connection-failure",
        "{\"race\":\"connection\"}",
      );
      const failingSender = createTrackedService({
        prefix,
        maxInboxLength: 2,
        beforeEval: {
          matches: isSendScript,
          run: async () => "disconnect",
        },
      });
      instances.push(failingSender);
      trackers.push(failingSender.tracker);
      await expectServiceCode(
        failingSender.service.send(failureInput),
        "COORDINATION_UNAVAILABLE",
      );
      assert.equal(
        await raw.sendCommand([
          "GET",
          keys.dedupe(sender.participantId, failureInput.messageId),
        ]),
        null,
      );
      assert.equal(await raw.sendCommand(["XLEN", inboxKey]), 0);

      const afterFailure = await peer.service.send(failureInput);
      const [afterFailureDelivery] = await replacementOwner.service.receive(
        receiveInput(replacement, "consumer-after-failure", { count: 1 }),
      );
      assert.equal(afterFailureDelivery.deliveryId, afterFailure.deliveryId);
      await replacementOwner.service.ack(ackInput(
        replacement,
        [afterFailureDelivery.deliveryId],
      ));

      const expiryInput = sendInput(
        sender,
        replacement,
        "cm-expiry-boundary",
        "{\"race\":\"expiry\"}",
      );
      const expiringSender = createTrackedService({
        prefix,
        maxInboxLength: 2,
        beforeEval: {
          matches: isSendScript,
          run: async () => {
            await raw.sendCommand([
              "DEL",
              keys.presence(sender.participantId),
            ]);
          },
        },
      });
      instances.push(expiringSender);
      trackers.push(expiringSender.tracker);
      await expectServiceCode(
        expiringSender.service.send(expiryInput),
        "COORDINATION_LEASE_CHANGED",
      );
      assert.equal(
        await raw.sendCommand([
          "GET",
          keys.dedupe(sender.participantId, expiryInput.messageId),
        ]),
        null,
      );
      assert.equal(await raw.sendCommand(["XLEN", inboxKey]), 0);

      await Promise.all(instances.map(({ queue }) => queue.close()));
      assertTrackersClosed(trackers);
    } finally {
      await Promise.all(instances.map(({ queue }) => queue.close()));
      await exactPrefixCleanup(raw, prefix);
      const leaked = await scanExactKeys(raw, prefix);
      if (raw.isOpen) raw.destroy();
      assert.deepEqual(leaked, []);
    }
  },
);
