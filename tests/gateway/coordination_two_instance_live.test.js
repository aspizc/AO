import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";

import {
  createRedisCoordinationQueue,
} from "../../gateway/src/core/coordination_queue.js";
import { coordinationKeys } from "../../gateway/src/core/coordination_contract.js";
import {
  CoordinationError,
  createCoordinationService,
} from "../../gateway/src/services/coordination_service.js";

const redisUrl = process.env.AGENTS_TEST_REDIS_URL;
const requireFromGateway = createRequire(
  new URL("../../gateway/package.json", import.meta.url),
);
const { createClient } = requireFromGateway("redis");

function createClientTracker({ beforeAckEval = null } = {}) {
  let created = 0;
  let destroyed = 0;
  let open = 0;
  let hook = beforeAckEval;
  return {
    factory(options) {
      const inner = createClient(options);
      let countedOpen = false;
      created += 1;
      return {
        get isOpen() {
          return inner.isOpen;
        },
        on(event, listener) {
          inner.on(event, listener);
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
            && typeof command[1] === "string"
            && command[1].includes("'XPENDING'")
          ) {
            const currentHook = hook;
            hook = null;
            await currentHook();
          }
          return inner.sendCommand(command);
        },
        destroy() {
          if (countedOpen) {
            countedOpen = false;
            open -= 1;
          }
          destroyed += 1;
          inner.destroy();
        },
      };
    },
    snapshot() {
      return { created, destroyed, open };
    },
  };
}

function createService({
  queue,
  uuid,
  audits,
  randomToken = () => crypto.randomBytes(32).toString("base64url"),
}) {
  return createCoordinationService({
    queue,
    config: {
      coordinationScopeId: "agents-orchestrator",
      coordinationLeaseDefaultMs: 900_000,
      coordinationLeaseMaxMs: 3_600_000,
      coordinationMessageMaxBytes: 4_096,
      coordinationMaxBlockMs: 1_000,
      coordinationDedupeTtlMs: 60_000,
      coordinationAckTombstoneTtlMs: 60_000,
    },
    randomUUID: () => uuid,
    randomToken,
    audit: (event) => audits.push(event),
  });
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
    traceId: `trace-${messageId}`,
    correlationId: "change-v5",
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
    (err) =>
      err instanceof CoordinationError
      && err.code === code,
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

async function serializedKeyValue(client, key) {
  const type = await client.sendCommand(["TYPE", key]);
  if (type === "string") {
    return JSON.stringify(await client.sendCommand(["GET", key]));
  }
  if (type === "set") {
    return JSON.stringify(await client.sendCommand(["SMEMBERS", key]));
  }
  if (type === "stream") {
    return JSON.stringify(await client.sendCommand(["XRANGE", key, "-", "+"]));
  }
  throw new Error(`unexpected isolated coordination key type: ${type}`);
}

test(
  "two independent services coordinate end to end through Redis 7",
  { skip: redisUrl ? false : "AGENTS_TEST_REDIS_URL is not set" },
  async () => {
    const prefix = `agents:test:v5:s05:${crypto.randomUUID()}`;
    const keys = coordinationKeys(prefix);
    const raw = createClient({
      url: redisUrl,
      RESP: 2,
      socket: { reconnectStrategy: false },
    });
    await raw.connect();
    const trackerA = createClientTracker();
    const trackerB = createClientTracker();
    const auditsA = [];
    const auditsB = [];
    const queueA = createRedisCoordinationQueue({
      redisUrl,
      prefix,
      maxInboxLength: 2,
      clientFactory: trackerA.factory,
    });
    const queueB = createRedisCoordinationQueue({
      redisUrl,
      prefix,
      maxInboxLength: 2,
      clientFactory: trackerB.factory,
    });
    const serviceA = createService({
      queue: queueA,
      uuid: "instance:a",
      audits: auditsA,
    });
    const serviceB = createService({
      queue: queueB,
      uuid: "instance:b",
      audits: auditsB,
    });

    try {
      const serverInfo = await raw.sendCommand(["INFO", "server"]);
      const version = /^redis_version:([0-9]+)\./m.exec(serverInfo);
      assert.equal(Number(version?.[1]), 7);

      for (const service of [serviceA, serviceB]) {
        const status = await service.status({});
        assert.equal(status.status, "ready");
        assert.equal(status.scopeId, "agents-orchestrator");
        assert.deepEqual(status.limits, {
          leaseDefaultMs: 900_000,
          leaseMaxMs: 3_600_000,
        });
        assert.equal(status.queue.prefix, prefix);
      }

      const participantA = await serviceA.register({
        participantType: "orchestrator",
        displayName: "Instance A",
        capabilities: ["coordination.v1", "review"],
      });
      const participantB = await serviceB.register({
        participantType: "orchestrator",
        displayName: "Instance B",
        capabilities: ["coordination.v1", "review"],
      });
      assert.equal(participantA.participantId, "pt-instance:a");
      assert.equal(participantB.participantId, "pt-instance:b");
      assert.ok(
        (await scanExactKeys(raw, prefix)).includes(
          `${prefix}:presence:pt-instance%3Aa`,
        ),
      );

      for (const [service, caller] of [
        [serviceA, participantA],
        [serviceB, participantB],
      ]) {
        const discovered = await service.discover({
          participantId: caller.participantId,
          leaseToken: caller.leaseToken,
          capability: "coordination.v1",
        });
        assert.deepEqual(
          discovered.map(({ participantId }) => participantId),
          [participantA.participantId, participantB.participantId],
        );
      }

      const initialInput = sendInput(
        participantA,
        participantB,
        "cm-two-instance",
        "{\"step\":\"initial\"}",
      );
      const initial = await serviceA.send(initialInput);
      assert.equal(initial.duplicate, false);
      const dedupeKey = keys.dedupe(
        participantA.participantId,
        initial.message.messageId,
      );
      await raw.sendCommand(["PEXPIRE", dedupeKey, "5000"]);
      const dedupeTtlBefore = await raw.sendCommand(["PTTL", dedupeKey]);
      const duplicate = await serviceB.send(initialInput);
      assert.equal(duplicate.duplicate, true);
      assert.equal(duplicate.deliveryId, initial.deliveryId);
      assert.ok(
        await raw.sendCommand(["PTTL", dedupeKey])
          > dedupeTtlBefore + 40_000,
      );

      await raw.sendCommand(["PEXPIRE", dedupeKey, "5000"]);
      const conflictTtlBefore = await raw.sendCommand(["PTTL", dedupeKey]);
      await expectServiceCode(
        serviceB.send({ ...initialInput, body: "{\"step\":\"changed\"}" }),
        "COORDINATION_MESSAGE_CONFLICT",
      );
      assert.ok(
        await raw.sendCommand(["PTTL", dedupeKey]) <= conflictTtlBefore,
      );

      const [initialDelivery] = await serviceB.receive(
        receiveInput(participantB, "consumer-b-lost", { count: 1 }),
      );
      assert.equal(initialDelivery.deliveryId, initial.deliveryId);
      await expectServiceCode(
        serviceA.ack(ackInput(participantA, [initial.deliveryId])),
        "COORDINATION_DELIVERY_NOT_FOUND",
      );
      assert.equal(
        await raw.sendCommand([
          "GET",
          keys.acked(participantA.participantId, initial.deliveryId),
        ]),
        null,
      );
      assert.equal(
        (await raw.sendCommand([
          "XPENDING",
          keys.inbox(participantB.participantId),
          "coordination-v1",
          initial.deliveryId,
          initial.deliveryId,
          "10",
        ])).length,
        1,
      );
      assert.deepEqual(
        await serviceB.ack(ackInput(participantB, [initial.deliveryId])),
        { ackedCount: 1, deliveryIds: [initial.deliveryId] },
      );
      assert.deepEqual(
        await serviceA.ack(ackInput(participantB, [initial.deliveryId])),
        { ackedCount: 0, deliveryIds: [initial.deliveryId] },
      );

      const capacityOne = await serviceA.send(sendInput(
        participantA,
        participantB,
        "cm-capacity-1",
        "{\"slot\":1}",
      ));
      const capacityTwo = await serviceB.send(sendInput(
        participantA,
        participantB,
        "cm-capacity-2",
        "{\"slot\":2}",
      ));
      const capacityThreeInput = sendInput(
        participantA,
        participantB,
        "cm-capacity-3",
        "{\"slot\":3}",
      );
      await expectServiceCode(
        serviceA.send(capacityThreeInput),
        "COORDINATION_INBOX_FULL",
      );
      assert.equal(
        await raw.sendCommand([
          "GET",
          keys.dedupe(participantA.participantId, "cm-capacity-3"),
        ]),
        null,
      );
      const capacityDeliveries = await serviceB.receive(
        receiveInput(participantB, "consumer-capacity", { count: 2 }),
      );
      assert.deepEqual(
        capacityDeliveries.map(({ deliveryId }) => deliveryId),
        [capacityOne.deliveryId, capacityTwo.deliveryId],
      );
      assert.deepEqual(
        await serviceB.ack(ackInput(
          participantB,
          capacityDeliveries.map(({ deliveryId }) => deliveryId),
        )),
        {
          ackedCount: 2,
          deliveryIds: capacityDeliveries.map(({ deliveryId }) => deliveryId),
        },
      );
      const capacityThree = await serviceA.send(capacityThreeInput);
      assert.equal(capacityThree.duplicate, false);
      const [capacityThreeDelivery] = await serviceB.receive(
        receiveInput(participantB, "consumer-capacity", { count: 1 }),
      );
      await serviceB.ack(ackInput(
        participantB,
        [capacityThreeDelivery.deliveryId],
      ));

      const reverse = await serviceB.send(sendInput(
        participantB,
        participantA,
        "cm-reverse",
        "{\"direction\":\"b-to-a\"}",
      ));
      const [reverseDelivery] = await serviceA.receive(
        receiveInput(participantA, "consumer-a", { count: 1 }),
      );
      assert.equal(reverseDelivery.deliveryId, reverse.deliveryId);
      await serviceA.ack(ackInput(participantA, [reverse.deliveryId]));

      const recoverable = await serviceA.send(sendInput(
        participantA,
        participantB,
        "cm-recover",
        "{\"recover\":true}",
      ));
      const [abandoned] = await serviceB.receive(
        receiveInput(participantB, "consumer-abandoned", { count: 1 }),
      );
      assert.equal(abandoned.deliveryId, recoverable.deliveryId);
      assert.deepEqual(
        await raw.sendCommand([
          "XCLAIM",
          keys.inbox(participantB.participantId),
          "coordination-v1",
          "consumer-abandoned",
          "0",
          recoverable.deliveryId,
          "IDLE",
          "120000",
          "JUSTID",
        ]),
        [recoverable.deliveryId],
      );
      const [recovered] = await serviceA.receive(
        receiveInput(participantB, "consumer-recovery", {
          count: 1,
          reclaimIdleMs: 60_000,
        }),
      );
      assert.equal(recovered.deliveryId, recoverable.deliveryId);
      assert.equal(recovered.recovered, true);
      await serviceB.ack(ackInput(participantB, [recovered.deliveryId]));

      const raceMessage = await serviceB.send(sendInput(
        participantB,
        participantA,
        "cm-replacement-race",
        "{\"race\":\"ack\"}",
      ));
      const [raceDelivery] = await serviceA.receive(
        receiveInput(participantA, "consumer-race", { count: 1 }),
      );
      assert.equal(raceDelivery.deliveryId, raceMessage.deliveryId);

      const replacementAudits = [];
      const replacementQueue = createRedisCoordinationQueue({
        redisUrl,
        prefix,
        maxInboxLength: 2,
      });
      const replacementService = createService({
        queue: replacementQueue,
        uuid: "instance:a",
        audits: replacementAudits,
      });
      let replacementParticipant;
      const raceTracker = createClientTracker({
        beforeAckEval: async () => {
          await raw.sendCommand([
            "DEL",
            keys.presence(participantA.participantId),
          ]);
          replacementParticipant = await replacementService.register({
            participantType: "orchestrator",
            displayName: "Instance A replacement",
            capabilities: ["coordination.v1", "review"],
          });
        },
      });
      const raceService = createService({
        queue: createRedisCoordinationQueue({
          redisUrl,
          prefix,
          maxInboxLength: 2,
          clientFactory: raceTracker.factory,
        }),
        uuid: "unused",
        audits: [],
      });
      await expectServiceCode(
        raceService.ack(ackInput(participantA, [raceDelivery.deliveryId])),
        "COORDINATION_LEASE_CHANGED",
      );
      assert.equal(replacementParticipant.participantId, participantA.participantId);
      assert.equal(
        await raw.sendCommand([
          "GET",
          keys.acked(participantA.participantId, raceDelivery.deliveryId),
        ]),
        null,
      );
      assert.equal(
        (await raw.sendCommand([
          "XPENDING",
          keys.inbox(participantA.participantId),
          "coordination-v1",
          raceDelivery.deliveryId,
          raceDelivery.deliveryId,
          "10",
        ])).length,
        1,
      );
      const [replacementRecovered] = await serviceB.receive(
        receiveInput(replacementParticipant, "consumer-replacement", {
          count: 1,
          reclaimIdleMs: 0,
        }),
      );
      assert.equal(replacementRecovered.deliveryId, raceDelivery.deliveryId);
      assert.equal(replacementRecovered.recovered, true);
      await serviceB.ack(ackInput(
        replacementParticipant,
        [replacementRecovered.deliveryId],
      ));
      await expectServiceCode(
        serviceA.discover({
          participantId: participantA.participantId,
          leaseToken: participantA.leaseToken,
        }),
        "COORDINATION_AUTH_FAILED",
      );

      const eventRows = await raw.sendCommand([
        "XRANGE",
        keys.events,
        "-",
        "+",
      ]);
      for (const row of eventRows) {
        const event = JSON.parse(row[1][1]);
        assert.equal(Object.hasOwn(event, "body"), false);
        assert.equal(Object.hasOwn(event, "leaseToken"), false);
        assert.equal(Object.hasOwn(event, "leaseTokenHash"), false);
      }
      const serializedEvents = JSON.stringify(eventRows);
      for (const body of [
        "{\"step\":\"initial\"}",
        "{\"direction\":\"b-to-a\"}",
        "{\"recover\":true}",
        "{\"race\":\"ack\"}",
      ]) {
        assert.equal(serializedEvents.includes(body), false);
      }
      for (const participant of [
        participantA,
        participantB,
        replacementParticipant,
      ]) {
        assert.equal(serializedEvents.includes(participant.leaseToken), false);
      }

      const namespaceKeys = await scanExactKeys(raw, prefix);
      for (const key of namespaceKeys) {
        const serialized = await serializedKeyValue(raw, key);
        for (const participant of [
          participantA,
          participantB,
          replacementParticipant,
        ]) {
          assert.equal(serialized.includes(participant.leaseToken), false);
        }
      }
      assert.doesNotMatch(
        JSON.stringify([...auditsA, ...auditsB, ...replacementAudits]),
        /leaseToken|leaseTokenHash|body/,
      );

      for (const tracker of [trackerA, trackerB, raceTracker]) {
        const snapshot = tracker.snapshot();
        assert.equal(snapshot.open, 0);
        assert.equal(snapshot.created, snapshot.destroyed);
        assert.ok(snapshot.created > 0);
      }
    } finally {
      await exactPrefixCleanup(raw, prefix);
      if (raw.isOpen) raw.destroy();
    }
  },
);
