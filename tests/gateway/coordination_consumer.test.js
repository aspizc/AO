import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import test from "node:test";

import {
  CoordinationConsumerError,
  coordinationConsumeKey,
  createCoordinationConsumer,
} from "../../gateway/src/core/coordination_consumer.js";
import {
  COORDINATION_CONSUMER_REPOSITORY_CONTRACT,
  createInMemoryCoordinationConsumerRepository,
} from "../../gateway/src/core/repositories/coordination_consumer_repo.js";

const BASE_MESSAGE = Object.freeze({
  protocolVersion: 1,
  scopeId: "scope-a",
  messageId: "cm-1",
  fromParticipantId: "pt-sender",
  toParticipantId: "pt-recipient",
  messageType: "IMPACT_NOTICE",
  classification: "internal",
  body: "review artifact ar-1",
  createdAt: "2026-07-26T08:00:00.000Z",
  traceId: "trace-1",
});

function delivery(overrides = {}) {
  const {
    deliveryId = "100-0",
    recovered = false,
    message: messageOverrides = {},
  } = overrides;
  return {
    deliveryId,
    recovered,
    message: {
      ...BASE_MESSAGE,
      ...messageOverrides,
    },
  };
}

function receiptMetadata(overrides = {}) {
  return {
    protocolVersion: 1,
    scopeId: "scope-a",
    messageId: "cm-1",
    fromParticipantId: "pt-sender",
    toParticipantId: "pt-recipient",
    messageType: "IMPACT_NOTICE",
    classification: "internal",
    createdAt: BASE_MESSAGE.createdAt,
    traceId: "trace-1",
    ...overrides,
  };
}

function codedError(code, message = "unsafe raw token=top-secret-value") {
  return Object.assign(new Error(message), { code });
}

function createHarness({
  handler,
  authorizeReplay,
  fault,
  quarantinePut,
  quarantineGet,
  receive,
  ack,
  sleep,
  auditSink,
  metricsSink,
  repository: providedRepository,
  useDefaultSleep = false,
  config = {},
} = {}) {
  let now = Date.parse("2026-07-26T08:00:00.000Z");
  const sleeps = [];
  const acknowledgements = [];
  const audit = [];
  const metrics = [];
  const storedBodies = new Map();
  let nextLocator = 1;
  const repository = providedRepository
    ?? createInMemoryCoordinationConsumerRepository();
  const transport = {
    receive: receive ?? (async () => []),
    ack: ack ?? (async ({ deliveryIds }) => {
      acknowledgements.push([...deliveryIds]);
      return { ackedCount: deliveryIds.length, deliveryIds: [...deliveryIds] };
    }),
  };
  const quarantineStore = {
    put: quarantinePut ?? (async ({ consumeKey, body }) => {
      const locator = `opaque-${nextLocator}`;
      nextLocator += 1;
      storedBodies.set(locator, { consumeKey, body });
      return { locator };
    }),
    get: quarantineGet ?? (async ({ locator }) => {
      const stored = storedBodies.get(locator);
      return stored ? { body: stored.body } : null;
    }),
  };
  const consumerOptions = {
    transport,
    repository,
    handler: handler ?? (async ({ consumeKey }) => ({
      status: "committed",
      commitId: `effect-${consumeKey.slice(-12)}`,
    })),
    quarantineStore,
    authorizeReplay,
    clock: () => now,
    audit: auditSink ?? ((event) => audit.push(event)),
    metrics: metricsSink ?? ((event) => metrics.push(event)),
    fault,
    config: {
      scopeId: "scope-a",
      participantId: "pt-recipient",
      consumerId: "consumer-a",
      ownerId: "worker-a",
      claimLeaseMs: 100,
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 40,
      quarantineStoreMaxAttempts: 2,
      idleDelayMs: 5,
      ...config,
    },
  };
  if (!useDefaultSleep) {
    consumerOptions.sleep = sleep ?? (async (delayMs, { signal } = {}) => {
      if (signal?.aborted) {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }
      sleeps.push(delayMs);
      now += delayMs;
    });
  }
  const consumer = createCoordinationConsumer(consumerOptions);
  return {
    consumer,
    repository,
    transport,
    quarantineStore,
    acknowledgements,
    sleeps,
    audit,
    metrics,
    storedBodies,
    now: () => now,
    advance(ms) {
      now += ms;
    },
  };
}

async function createBlockedReceipt(
  repository,
  { maxConsumedRecoveryIdsPerReceipt = 4 } = {},
) {
  const consumeKey = coordinationConsumeKey(BASE_MESSAGE);
  const claimed = await repository.claim({
    consumeKey,
    deliveryId: "100-0",
    recovered: false,
    metadata: receiptMetadata(),
    ownerId: "worker-a",
    now: 1000,
    leaseMs: 100,
    maxConsumedRecoveryIdsPerReceipt,
  });
  await repository.blockQuarantine({
    consumeKey,
    ownerId: "worker-a",
    claimToken: claimed.claimToken,
    reasonCode: "HANDLER_TERMINAL",
    now: 1001,
  });
  return consumeKey;
}

test("consume keys are canonical, bounded, body-free, and stable across deliveries", () => {
  const first = coordinationConsumeKey(BASE_MESSAGE);
  const changedBody = coordinationConsumeKey({
    ...BASE_MESSAGE,
    body: "a completely different body with token=not-key-material",
  });
  const changedDelivery = coordinationConsumeKey({ ...BASE_MESSAGE });

  assert.match(first, /^coord-consume-v1-[a-f0-9]{64}$/);
  assert.equal(first.length, 81);
  assert.equal(changedBody, first);
  assert.equal(changedDelivery, first);
  assert.notEqual(
    coordinationConsumeKey({ ...BASE_MESSAGE, messageId: "cm-2" }),
    first,
  );
  assert.doesNotMatch(first, /review|artifact|token|secret/);
});

test("the in-memory repository advertises conformance without durable or atomic claims", () => {
  assert.deepEqual(COORDINATION_CONSUMER_REPOSITORY_CONTRACT, {
    durable: false,
    atomicWithBusinessEffect: false,
    bodyStorage: false,
    purpose: "deterministic-conformance-only",
    maxConsumedRecoveryIdsPerReceipt: 8,
  });
  assert.equal(Object.isFrozen(COORDINATION_CONSUMER_REPOSITORY_CONTRACT), true);
});

test("repository metadata is a closed body-free scalar projection", async () => {
  const invalidMetadata = [
    { ...receiptMetadata(), body: "never persist this" },
    { ...receiptMetadata(), traceId: { token: "nested-secret" } },
    { ...receiptMetadata(), createdAt: "not-a-timestamp" },
    { ...receiptMetadata(), protocolVersion: "1" },
    { ...receiptMetadata(), malformed: "yes" },
    { ...receiptMetadata(), unknown: "field" },
  ];

  for (const [index, metadata] of invalidMetadata.entries()) {
    const repository = createInMemoryCoordinationConsumerRepository();
    await assert.rejects(
      repository.claim({
        consumeKey: coordinationConsumeKey({
          ...BASE_MESSAGE,
          messageId: `cm-invalid-${index}`,
        }),
        deliveryId: `${index + 1}-0`,
        recovered: false,
        metadata,
        ownerId: "worker-a",
        now: 1000,
        leaseMs: 100,
      }),
      TypeError,
    );
  }
});

test("transient handler failures use deterministic capped backoff and commit once before ACK", async () => {
  let calls = 0;
  const effects = new Set();
  const harness = createHarness({
    handler: async ({ consumeKey }) => {
      calls += 1;
      if (calls < 3) throw codedError("COORDINATION_UNAVAILABLE");
      effects.add(consumeKey);
      return { status: "committed", commitId: "effect-1" };
    },
  });

  const result = await harness.consumer.processDelivery(delivery());

  assert.equal(result.status, "processed");
  assert.equal(calls, 3);
  assert.equal(effects.size, 1);
  assert.deepEqual(harness.sleeps, [10, 20]);
  assert.deepEqual(harness.acknowledgements, [["100-0"]]);
  const receipt = await harness.repository.getReceipt(result.consumeKey);
  assert.equal(receipt.state, "completed");
  assert.equal(receipt.attempts, 3);
  assert.equal(receipt.effect.commitId, "effect-1");
  assert.equal(
    (await harness.repository.ackReconciliation
      .getAckReconciliationSummary()).proofs.DIRECT_ACK,
    1,
  );
});

test("a crash after the effect reuses the consume key and the idempotent handler does not repeat it", async () => {
  const effects = new Map();
  let crash = true;
  const harness = createHarness({
    handler: async ({ consumeKey }) => {
      if (!effects.has(consumeKey)) effects.set(consumeKey, `effect-${effects.size + 1}`);
      return { status: "committed", commitId: effects.get(consumeKey) };
    },
    fault(point) {
      if (point === "afterEffect" && crash) {
        crash = false;
        throw codedError("COORDINATION_CONSUMER_TEST_CRASH_AFTER_EFFECT");
      }
    },
  });

  await assert.rejects(
    harness.consumer.processDelivery(delivery()),
    (error) => (
      error.code === "COORDINATION_CONSUMER_FAULT"
    ),
  );
  assert.equal(effects.size, 1);
  assert.deepEqual(harness.acknowledgements, []);

  harness.advance(101);
  const recovered = await harness.consumer.processDelivery(
    delivery({ recovered: true }),
  );

  assert.equal(recovered.status, "processed");
  assert.equal(effects.size, 1);
  assert.deepEqual(harness.acknowledgements, [["100-0"]]);
});

test("crashes after receipt commit or transport ACK never repeat the business effect", async () => {
  for (const crashPoint of ["afterReceipt", "beforeAck", "afterAck"]) {
    let effects = 0;
    let crash = true;
    const harness = createHarness({
      handler: async () => {
        effects += 1;
        return { status: "committed", commitId: `effect-${crashPoint}` };
      },
      fault(point) {
        if (point === crashPoint && crash) {
          crash = false;
          throw codedError(
            `COORDINATION_CONSUMER_TEST_CRASH_${crashPoint.toUpperCase()}`,
          );
        }
      },
    });

    await assert.rejects(
      harness.consumer.processDelivery(delivery()),
      (error) => (
        error.code === "COORDINATION_CONSUMER_FAULT"
      ),
    );
    harness.advance(101);
    const duplicate = await harness.consumer.processDelivery(
      delivery({ recovered: true }),
    );

    assert.equal(duplicate.status, "duplicate");
    assert.equal(effects, 1);
    assert.ok(harness.acknowledgements.length >= 1);
  }
});

test("after-claim and before-effect crash seams expose no effect or ACK", async () => {
  for (const crashPoint of ["afterClaim", "beforeEffect"]) {
    let effects = 0;
    let crash = true;
    const harness = createHarness({
      handler: async () => {
        effects += 1;
        return { status: "committed", commitId: "effect-1" };
      },
      fault(point) {
        if (point === crashPoint && crash) {
          crash = false;
          throw codedError(
            `COORDINATION_CONSUMER_TEST_CRASH_${crashPoint.toUpperCase()}`,
          );
        }
      },
    });

    await assert.rejects(
      harness.consumer.processDelivery(delivery()),
      (error) => (
        error.code === "COORDINATION_CONSUMER_FAULT"
      ),
    );
    assert.equal(effects, 0);
    assert.deepEqual(harness.acknowledgements, []);
  }
});

test("ACK failure leaves the committed receipt recoverable without another handler call", async () => {
  let effects = 0;
  let ackCalls = 0;
  const harness = createHarness({
    handler: async () => {
      effects += 1;
      return { status: "committed", commitId: "effect-1" };
    },
    ack: async ({ deliveryIds }) => {
      ackCalls += 1;
      if (ackCalls === 1) throw codedError("COORDINATION_UNAVAILABLE");
      harness.acknowledgements.push([...deliveryIds]);
      return { ackedCount: 1, deliveryIds: [...deliveryIds] };
    },
  });

  await assert.rejects(
    harness.consumer.processDelivery(delivery()),
    (error) => {
      assert.equal(error.code, "COORDINATION_UNAVAILABLE");
      assert.equal(
        error.message,
        "coordination consumer operation failed safely",
      );
      assert.doesNotMatch(error.message, /unsafe raw|token=|top-secret/);
      return true;
    },
  );
  assert.equal(
    (await harness.repository.getReceipt(coordinationConsumeKey(BASE_MESSAGE))).state,
    "effect_committed",
  );
  assert.equal(
    (await harness.repository.ackReconciliation
      .getAckReconciliationSummary()).deferred,
    1,
  );

  const recovered = await harness.consumer.processDelivery(
    delivery({ recovered: true }),
  );
  assert.equal(recovered.status, "duplicate");
  assert.equal(effects, 1);
  assert.equal(ackCalls, 2);
});

test("bound ACK accepts zero only as the faithful tombstone retry after a prior ACK", async () => {
  const tombstones = new Set();
  const ackCounts = [];
  let effects = 0;
  let crash = true;
  const harness = createHarness({
    handler: async () => {
      effects += 1;
      return { status: "committed", commitId: "effect-1" };
    },
    ack: async ({ deliveryIds }) => {
      const [deliveryId] = deliveryIds;
      const ackedCount = tombstones.has(deliveryId) ? 0 : 1;
      tombstones.add(deliveryId);
      ackCounts.push(ackedCount);
      return { ackedCount, deliveryIds: [...deliveryIds] };
    },
    fault(point) {
      if (point === "afterAck" && crash) {
        crash = false;
        throw codedError("COORDINATION_CONSUMER_TEST_CRASH_AFTER_ACK");
      }
    },
  });

  await assert.rejects(
    harness.consumer.processDelivery(delivery()),
    (error) => error.code === "COORDINATION_CONSUMER_FAULT",
  );
  harness.advance(101);
  const recovered = await harness.consumer.processDelivery(
    delivery({ recovered: true }),
  );

  assert.equal(recovered.status, "duplicate");
  assert.equal(effects, 1);
  assert.deepEqual(ackCounts, [1, 0]);

  const unknown = createHarness({
    ack: async () => {
      throw codedError("COORDINATION_DELIVERY_NOT_FOUND");
    },
  });
  await assert.rejects(
    unknown.consumer.processDelivery(delivery()),
    (error) => error.code === "COORDINATION_DELIVERY_NOT_FOUND",
  );
  assert.equal(
    (await unknown.repository.getReceipt(coordinationConsumeKey(BASE_MESSAGE))).state,
    "effect_committed",
  );
});

test("duplicate message IDs with a later transport delivery are ACKed without another effect", async () => {
  let effects = 0;
  const harness = createHarness({
    handler: async () => {
      effects += 1;
      return { status: "committed", commitId: "effect-1" };
    },
  });

  const first = await harness.consumer.processDelivery(delivery());
  const duplicate = await harness.consumer.processDelivery(
    delivery({ deliveryId: "200-0", recovered: true }),
  );

  assert.equal(first.status, "processed");
  assert.equal(duplicate.status, "duplicate");
  assert.equal(effects, 1);
  assert.deepEqual(harness.acknowledgements, [["100-0"], ["200-0"]]);
});

test("poison at the attempt cap is quarantined before ACK without observable body or raw error", async () => {
  const unsafeBody = "operator note token=super-secret-value";
  const harness = createHarness({
    handler: async () => {
      throw codedError("COORDINATION_UNAVAILABLE");
    },
  });

  const result = await harness.consumer.processDelivery(
    delivery({ message: { body: unsafeBody } }),
  );

  assert.equal(result.status, "quarantined");
  assert.deepEqual(harness.sleeps, [10, 20]);
  assert.deepEqual(harness.acknowledgements, [["100-0"]]);
  assert.equal([...harness.storedBodies.values()][0].body, unsafeBody);

  const receipt = await harness.repository.getReceipt(result.consumeKey);
  assert.equal(receipt.state, "completed");
  assert.equal(Object.hasOwn(receipt.quarantine, "locator"), false);
  assert.equal(receipt.quarantine.reasonCode, "RETRY_EXHAUSTED");

  const observable = JSON.stringify({
    receipt,
    audit: harness.audit,
    metrics: harness.metrics,
    status: harness.consumer.getStatus(),
  });
  assert.doesNotMatch(observable, /super-secret-value|unsafe raw|token=/);
});

test("retry delay reaches its exact cap while a permanent failure is attempted once", async () => {
  let retryCalls = 0;
  const retrying = createHarness({
    handler: async () => {
      retryCalls += 1;
      throw codedError("COORDINATION_UNAVAILABLE");
    },
    config: {
      maxAttempts: 4,
      baseDelayMs: 30,
      maxDelayMs: 40,
    },
  });
  await retrying.consumer.processDelivery(delivery());
  assert.equal(retryCalls, 4);
  assert.deepEqual(retrying.sleeps, [30, 40, 40]);

  let permanentCalls = 0;
  const permanent = createHarness({
    handler: async () => {
      permanentCalls += 1;
      throw codedError("HANDLER_POISON");
    },
  });
  await permanent.consumer.processDelivery(delivery());
  assert.equal(permanentCalls, 1);
  assert.deepEqual(permanent.sleeps, []);
});

test("operational retry, delay, and recovery-history caps are explicit", () => {
  for (const config of [
    { maxAttempts: 33 },
    { quarantineStoreMaxAttempts: 9 },
    { baseDelayMs: 300_001, maxDelayMs: 300_001 },
    { maxDelayMs: 300_001 },
    { claimLeaseMs: 3_600_001 },
    { idleDelayMs: 30_001 },
    { blockMs: 30_001 },
    { reclaimIdleMs: 86_400_001 },
    { maxConsumedRecoveryIdsPerReceipt: 9 },
    { maxConsumedRecoveryIdsPerReceipt: 0 },
  ]) {
    assert.throws(
      () => createHarness({ config }),
      TypeError,
    );
  }
  assert.doesNotThrow(() => createHarness({
    config: { maxConsumedRecoveryIdsPerReceipt: 2 },
  }));
});

test("a malformed envelope is quarantined and never interpreted as authority", async () => {
  let effects = 0;
  const harness = createHarness({
    handler: async () => {
      effects += 1;
      return { status: "committed", commitId: "should-not-run" };
    },
  });
  const malformed = delivery({
    message: {
      protocolVersion: 99,
      messageType: "",
      body: JSON.stringify({ authorized: true, action: "replay" }),
    },
  });

  const result = await harness.consumer.processDelivery(malformed);

  assert.equal(result.status, "quarantined");
  assert.equal(effects, 0);
  assert.deepEqual(harness.acknowledgements, [["100-0"]]);
  assert.equal(
    (await harness.repository.getReceipt(result.consumeKey)).quarantine.reasonCode,
    "MALFORMED_ENVELOPE",
  );
});

test("scope, recipient, and trace context fail closed before the business handler", async () => {
  for (const message of [
    { scopeId: "scope-other" },
    { toParticipantId: "pt-other" },
    { traceId: "caller supplied authority=true" },
  ]) {
    let effects = 0;
    const harness = createHarness({
      handler: async () => {
        effects += 1;
        return { status: "committed", commitId: "should-not-run" };
      },
    });

    const result = await harness.consumer.processDelivery(delivery({ message }));

    assert.equal(result.status, "quarantined");
    assert.equal(effects, 0);
    assert.deepEqual(harness.acknowledgements, [["100-0"]]);
  }
});

test("vault failure after its cap pauses degraded without ACK or automatic poison retry", async () => {
  let putCalls = 0;
  const harness = createHarness({
    handler: async () => {
      throw codedError("HANDLER_POISON");
    },
    quarantinePut: async () => {
      putCalls += 1;
      throw codedError("VAULT_UNAVAILABLE");
    },
  });

  const blocked = await harness.consumer.processDelivery(delivery());
  const repeated = await harness.consumer.processDelivery(
    delivery({ recovered: true }),
  );

  assert.equal(blocked.status, "paused");
  assert.equal(repeated.status, "paused");
  assert.equal(putCalls, 2);
  assert.deepEqual(harness.acknowledgements, []);
  assert.equal(harness.consumer.getStatus().state, "degraded");
  assert.equal(
    (await harness.repository.getReceipt(blocked.consumeKey)).state,
    "quarantine_blocked",
  );
});

test("an explicit replacement incarnation resumes only blocked quarantine storage", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  let handlerCalls = 0;
  let putCalls = 0;
  const initial = createHarness({
    repository,
    handler: async () => {
      handlerCalls += 1;
      throw codedError("HANDLER_POISON");
    },
    quarantinePut: async () => {
      putCalls += 1;
      throw codedError("VAULT_UNAVAILABLE");
    },
  });

  const blocked = await initial.consumer.processDelivery(delivery());
  const sameIncarnation = await initial.consumer.processDelivery(
    delivery({ recovered: true }),
  );
  assert.equal(blocked.status, "paused");
  assert.equal(sameIncarnation.status, "paused");
  assert.equal(handlerCalls, 1);
  assert.equal(putCalls, 2);
  assert.deepEqual(initial.acknowledgements, []);

  const unhealthyRestart = createHarness({
    repository,
    config: { ownerId: "worker-b" },
    handler: async () => {
      assert.fail("a known poison outcome must not re-enter the handler");
    },
    quarantinePut: async () => {
      putCalls += 1;
      throw codedError("VAULT_STILL_UNAVAILABLE");
    },
  });
  assert.equal(
    (await unhealthyRestart.consumer.processDelivery(
      delivery({ recovered: true }),
    )).status,
    "paused",
  );
  assert.equal(putCalls, 2);
  assert.deepEqual(unhealthyRestart.acknowledgements, []);

  const repairedRestart = createHarness({
    repository,
    config: {
      ownerId: "worker-c",
      quarantineRecoveryId: "vault-repair-1",
    },
    handler: async () => {
      assert.fail("quarantine recovery must not execute the poison handler");
    },
    quarantinePut: async () => {
      putCalls += 1;
      return { locator: "opaque-recovered-1" };
    },
  });
  const recovered = await repairedRestart.consumer.processDelivery(
    delivery({ recovered: true }),
  );
  const duplicate = await repairedRestart.consumer.processDelivery(
    delivery({ recovered: true }),
  );

  assert.equal(recovered.status, "quarantined");
  assert.equal(duplicate.status, "duplicate");
  assert.equal(handlerCalls, 1);
  assert.equal(putCalls, 3);
  assert.deepEqual(repairedRestart.acknowledgements, [["100-0"]]);
  const receipt = await repository.getReceipt(blocked.consumeKey);
  assert.equal(receipt.state, "completed");
  assert.equal(receipt.quarantine.reasonCode, "HANDLER_TERMINAL");
  assert.equal(Object.hasOwn(receipt, "blockedRecoveryId"), false);
});

test("blocked-quarantine recovery IDs remain consumed across A to B to A failures", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  const consumeKey = await createBlockedReceipt(repository);

  const first = await repository.claimBlockedQuarantine({
    consumeKey,
    ownerId: "worker-b",
    recoveryId: "vault-repair-A",
    now: 1002,
    leaseMs: 100,
  });
  assert.equal(first.status, "claimed");
  await repository.blockQuarantine({
    consumeKey,
    ownerId: "worker-b",
    claimToken: first.claimToken,
    reasonCode: "HANDLER_TERMINAL",
    now: 1003,
  });

  const second = await repository.claimBlockedQuarantine({
    consumeKey,
    ownerId: "worker-c",
    recoveryId: "vault-repair-B",
    now: 1004,
    leaseMs: 100,
  });
  assert.equal(second.status, "claimed");
  await repository.blockQuarantine({
    consumeKey,
    ownerId: "worker-c",
    claimToken: second.claimToken,
    reasonCode: "HANDLER_TERMINAL",
    now: 1005,
  });

  for (const recoveryId of ["vault-repair-A", "vault-repair-B"]) {
    assert.equal(
      (await repository.claimBlockedQuarantine({
        consumeKey,
        ownerId: "worker-d",
        recoveryId,
        now: 1006,
        leaseMs: 100,
      })).status,
      "blocked",
    );
  }

  const third = await repository.claimBlockedQuarantine({
    consumeKey,
    ownerId: "worker-d",
    recoveryId: "vault-repair-C",
    now: 1006,
    leaseMs: 100,
  });
  assert.equal(third.status, "claimed");
  assert.notEqual(first.claimToken, second.claimToken);
  assert.notEqual(second.claimToken, third.claimToken);

  for (const stale of [
    { ownerId: "worker-b", claimToken: first.claimToken },
    { ownerId: "worker-c", claimToken: second.claimToken },
  ]) {
    await assert.rejects(
      repository.commitQuarantine({
        consumeKey,
        ...stale,
        quarantineId: "quarantine-1",
        locator: "opaque-stale",
        reasonCode: "HANDLER_TERMINAL",
        now: 1007,
      }),
      /not owned/,
    );
    await assert.rejects(
      repository.blockQuarantine({
        consumeKey,
        ...stale,
        reasonCode: "HANDLER_TERMINAL",
        now: 1007,
      }),
      /not owned/,
    );
  }

  const committed = await repository.commitQuarantine({
    consumeKey,
    ownerId: "worker-d",
    claimToken: third.claimToken,
    quarantineId: "quarantine-1",
    locator: "opaque-current",
    reasonCode: "HANDLER_TERMINAL",
    now: 1007,
  });
  assert.equal(committed.state, "quarantined");
  assert.doesNotMatch(
    JSON.stringify(await repository.getReceipt(consumeKey)),
    /vault-repair-[ABC]/,
  );
});

test("rejected blocked-quarantine claims preserve recovery capacity and epoch", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  const consumeKey = await createBlockedReceipt(repository, {
    maxConsumedRecoveryIdsPerReceipt: 2,
  });
  const blockedReceipt = await repository.getReceipt(consumeKey);

  for (const recoveryId of [
    "vault-repair-overflow-A",
    "vault-repair-overflow-B",
  ]) {
    let rejectedResult;
    await assert.rejects(
      async () => {
        rejectedResult = await repository.claimBlockedQuarantine({
          consumeKey,
          ownerId: "worker-overflow",
          recoveryId,
          now: Number.MAX_SAFE_INTEGER,
          leaseMs: 1,
        });
      },
      (error) => {
        assert.equal(
          error.message,
          "claim expiry exceeds the safe integer range",
        );
        assert.equal(Object.hasOwn(error, "claimToken"), false);
        return true;
      },
    );
    assert.equal(rejectedResult, undefined);
    assert.deepEqual(await repository.getReceipt(consumeKey), blockedReceipt);
  }

  const first = await repository.claimBlockedQuarantine({
    consumeKey,
    ownerId: "worker-valid-A",
    recoveryId: "vault-repair-overflow-A",
    now: 1002,
    leaseMs: 100,
  });
  assert.equal(first.status, "claimed");
  assert.equal(first.claimToken, "claim-2");
  await repository.blockQuarantine({
    consumeKey,
    ownerId: "worker-valid-A",
    claimToken: first.claimToken,
    reasonCode: "HANDLER_TERMINAL",
    now: 1003,
  });

  const second = await repository.claimBlockedQuarantine({
    consumeKey,
    ownerId: "worker-valid-B",
    recoveryId: "vault-repair-overflow-B",
    now: 1004,
    leaseMs: 100,
  });
  assert.equal(second.status, "claimed");
  assert.equal(second.claimToken, "claim-3");
  await repository.blockQuarantine({
    consumeKey,
    ownerId: "worker-valid-B",
    claimToken: second.claimToken,
    reasonCode: "HANDLER_TERMINAL",
    now: 1005,
  });

  const exhausted = await repository.claimBlockedQuarantine({
    consumeKey,
    ownerId: "worker-valid-C",
    recoveryId: "vault-repair-overflow-C",
    now: 1006,
    leaseMs: 100,
  });
  assert.equal(exhausted.status, "blocked");
  assert.equal(Object.hasOwn(exhausted, "claimToken"), false);
  assert.doesNotMatch(
    JSON.stringify([
      blockedReceipt,
      first.receipt,
      second.receipt,
      exhausted.receipt,
    ]),
    /vault-repair-overflow-[ABC]/,
  );
});

test("a concurrent duplicate recovery ID is denied by the same receipt CAS", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  const consumeKey = await createBlockedReceipt(repository);

  const claims = await Promise.all([
    repository.claimBlockedQuarantine({
      consumeKey,
      ownerId: "worker-b",
      recoveryId: "vault-repair-concurrent",
      now: 1002,
      leaseMs: 100,
    }),
    repository.claimBlockedQuarantine({
      consumeKey,
      ownerId: "worker-c",
      recoveryId: "vault-repair-concurrent",
      now: 1002,
      leaseMs: 100,
    }),
  ]);

  assert.deepEqual(
    claims.map(({ status }) => status).sort(),
    ["blocked", "claimed"],
  );
  assert.equal(
    claims.filter(({ claimToken }) => claimToken !== undefined).length,
    1,
  );
});

test("recovery-history exhaustion fails closed without handler, store, ACK, or receive loop", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  const consumeKey = await createBlockedReceipt(repository, {
    maxConsumedRecoveryIdsPerReceipt: 2,
  });

  for (const [index, recoveryId] of [
    "vault-repair-limit-A",
    "vault-repair-limit-B",
  ].entries()) {
    const recovery = await repository.claimBlockedQuarantine({
      consumeKey,
      ownerId: `worker-limit-${index}`,
      recoveryId,
      now: 1010 + index,
      leaseMs: 100,
    });
    assert.equal(recovery.status, "claimed");
    await repository.blockQuarantine({
      consumeKey,
      ownerId: `worker-limit-${index}`,
      claimToken: recovery.claimToken,
      reasonCode: "HANDLER_TERMINAL",
      now: 1020 + index,
    });
  }

  assert.equal(
    (await repository.claimBlockedQuarantine({
      consumeKey,
      ownerId: "worker-limit-denied",
      recoveryId: "vault-repair-limit-C",
      now: 1030,
      leaseMs: 100,
    })).status,
    "blocked",
  );

  let receiveCalls = 0;
  let handlerCalls = 0;
  let storeCalls = 0;
  const denied = createHarness({
    repository,
    receive: async () => {
      receiveCalls += 1;
      return [delivery({ recovered: true })];
    },
    handler: async () => {
      handlerCalls += 1;
      return { status: "committed", commitId: "must-not-commit" };
    },
    quarantinePut: async () => {
      storeCalls += 1;
      return { locator: "must-not-store" };
    },
    config: {
      ownerId: "worker-limit-denied",
      quarantineRecoveryId: "vault-repair-limit-C",
      maxConsumedRecoveryIdsPerReceipt: 8,
    },
  });

  const status = await denied.consumer.run();

  assert.equal(status.state, "degraded");
  assert.equal(receiveCalls, 1);
  assert.equal(handlerCalls, 0);
  assert.equal(storeCalls, 0);
  assert.deepEqual(denied.acknowledgements, []);
});

test("hostile locator and raw errors cannot cross result, status, audit, or metrics", async () => {
  const hostile = "vault-locator-token=super-secret-value";
  const harness = createHarness({
    handler: async () => {
      throw codedError("HANDLER_POISON");
    },
    quarantinePut: async () => ({
      locator: hostile,
      rawError: "token=another-secret-value",
    }),
  });

  const result = await harness.consumer.processDelivery(delivery({
    message: { body: "body token=third-secret-value" },
  }));
  const observable = JSON.stringify({
    result,
    status: harness.consumer.getStatus(),
    audit: harness.audit,
    metrics: harness.metrics,
  });

  assert.equal(result.status, "paused");
  assert.ok(observable.length < 2048);
  assert.doesNotMatch(
    observable,
    /super-secret-value|another-secret-value|third-secret-value|token=/,
  );
});

test("untrusted external error codes collapse to a fixed public fallback", async () => {
  const harness = createHarness({
    ack: async () => {
      throw codedError(
        "TOKEN_PRIVATE_CREDENTIAL",
        "token=credential-that-must-not-cross",
      );
    },
  });

  await assert.rejects(
    harness.consumer.processDelivery(delivery()),
    (error) => {
      assert.equal(error.code, "COORDINATION_CONSUMER_ACK_FAILED");
      assert.equal(
        error.message,
        "coordination consumer operation failed safely",
      );
      return true;
    },
  );
  const observable = JSON.stringify({
    status: harness.consumer.getStatus(),
    audit: harness.audit,
    metrics: harness.metrics,
  });
  assert.doesNotMatch(observable, /TOKEN_PRIVATE|credential-that|token=/);
});

test("a dependency cannot forge the exported error class or consumer code namespace", async () => {
  const forgedCode = "COORDINATION_CONSUMER_TOKEN_LEAK_CANARY";
  const forgedMessage = "RAW_MESSAGE_LEAK_CANARY token=private-value";
  const harness = createHarness({
    ack: async () => {
      throw new CoordinationConsumerError(forgedCode, forgedMessage);
    },
  });
  let publicError;

  await assert.rejects(
    harness.consumer.processDelivery(delivery()),
    (error) => {
      publicError = error;
      assert.equal(error.code, "COORDINATION_CONSUMER_ACK_FAILED");
      assert.equal(
        error.message,
        "coordination consumer operation failed safely",
      );
      return true;
    },
  );

  const observable = JSON.stringify({
    error: {
      code: publicError.code,
      message: publicError.message,
    },
    status: harness.consumer.getStatus(),
    audit: harness.audit,
    metrics: harness.metrics,
  });
  assert.equal(
    harness.consumer.getStatus().lastError.code,
    "COORDINATION_CONSUMER_ACK_FAILED",
  );
  assert.doesNotMatch(
    observable,
    /TOKEN_LEAK_CANARY|RAW_MESSAGE_LEAK_CANARY|private-value|token=/,
  );
});

test("rejected promise and hostile thenable observations stay best effort", async (t) => {
  const unhandled = [];
  let hostileThenableCalls = 0;
  const onUnhandled = (reason) => {
    unhandled.push(reason);
  };
  process.on("unhandledRejection", onUnhandled);
  t.after(() => {
    process.removeListener("unhandledRejection", onUnhandled);
  });
  const harness = createHarness({
    auditSink: () => Promise.reject(
      new Error("ASYNC_OBSERVATION_REJECTION_CANARY"),
    ),
    metricsSink: () => ({
      then(_resolve, reject) {
        hostileThenableCalls += 1;
        reject(new Error("HOSTILE_THENABLE_REJECTION_CANARY"));
      },
    }),
  });

  const result = await harness.consumer.processDelivery(delivery());
  await new Promise((resolve) => {
    setImmediate(resolve);
  });
  await new Promise((resolve) => {
    setImmediate(resolve);
  });

  assert.equal(result.status, "processed");
  assert.equal(hostileThenableCalls, 1);
  assert.deepEqual(unhandled, []);
  assert.deepEqual(harness.acknowledgements, [["100-0"]]);
  const receipt = await harness.repository.getReceipt(result.consumeKey);
  assert.equal(receipt.state, "completed");
  assert.equal(receipt.effect.commitId.startsWith("effect-"), true);
  assert.equal(harness.consumer.getStatus().counters.processed, 1);
});

test("an active claim is busy, then a stale claim is reclaimable by another owner", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  const consumeKey = coordinationConsumeKey(BASE_MESSAGE);
  const input = {
    consumeKey,
    deliveryId: "100-0",
    recovered: false,
    metadata: {
      protocolVersion: 1,
      scopeId: "scope-a",
      messageId: "cm-1",
      fromParticipantId: "pt-sender",
      toParticipantId: "pt-recipient",
      messageType: "IMPACT_NOTICE",
      classification: "internal",
      createdAt: BASE_MESSAGE.createdAt,
    },
    now: 1000,
    leaseMs: 100,
  };

  assert.equal(
    (await repository.claim({ ...input, ownerId: "worker-a" })).status,
    "claimed",
  );
  assert.equal(
    (await repository.claim({ ...input, ownerId: "worker-b", now: 1099 })).status,
    "busy",
  );
  const reclaimed = await repository.claim({
    ...input,
    ownerId: "worker-b",
    now: 1100,
  });
  assert.equal(reclaimed.status, "claimed");
  assert.equal(reclaimed.stale, true);
});

test("claim tokens fence a stale incarnation even when the owner ID is reused", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  const consumeKey = coordinationConsumeKey(BASE_MESSAGE);
  const input = {
    consumeKey,
    deliveryId: "100-0",
    recovered: false,
    metadata: {
      protocolVersion: 1,
      scopeId: "scope-a",
      messageId: "cm-1",
      fromParticipantId: "pt-sender",
      toParticipantId: "pt-recipient",
      messageType: "IMPACT_NOTICE",
      classification: "internal",
      createdAt: BASE_MESSAGE.createdAt,
    },
    ownerId: "worker-a",
    now: 1000,
    leaseMs: 100,
  };
  const first = await repository.claim(input);
  const replacement = await repository.claim({ ...input, now: 1100 });

  assert.notEqual(first.claimToken, replacement.claimToken);
  await assert.rejects(
    repository.commitEffect({
      consumeKey,
      ownerId: "worker-a",
      claimToken: first.claimToken,
      commitId: "stale-effect",
      now: 1101,
    }),
    /not owned/,
  );
  const committed = await repository.commitEffect({
    consumeKey,
    ownerId: "worker-a",
    claimToken: replacement.claimToken,
    commitId: "current-effect",
    now: 1101,
  });
  assert.equal(committed.effect.commitId, "current-effect");
});

test("replay claim tokens fence same-owner stale commit and failure mutations", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  const consumeKey = coordinationConsumeKey(BASE_MESSAGE);
  const claimed = await repository.claim({
    consumeKey,
    deliveryId: "100-0",
    recovered: false,
    metadata: receiptMetadata(),
    ownerId: "worker-a",
    now: 1000,
    leaseMs: 100,
  });
  await repository.commitQuarantine({
    consumeKey,
    ownerId: "worker-a",
    claimToken: claimed.claimToken,
    quarantineId: "quarantine-1",
    locator: "opaque-1",
    reasonCode: "HANDLER_TERMINAL",
    now: 1001,
  });
  const replayInput = {
    quarantineId: "quarantine-1",
    commandId: "replay-1",
    decisionId: "decision-1",
    principalId: "operator-1",
    ownerId: "worker-a",
    leaseMs: 100,
  };
  const first = await repository.beginReplay({ ...replayInput, now: 1100 });
  const replacement = await repository.beginReplay({ ...replayInput, now: 1200 });

  assert.notEqual(first.replayClaimToken, replacement.replayClaimToken);
  await assert.rejects(
    repository.commitReplay({
      quarantineId: "quarantine-1",
      commandId: "replay-1",
      ownerId: "worker-a",
      replayClaimToken: first.replayClaimToken,
      commitId: "stale-effect",
      now: 1201,
    }),
    /not owned/,
  );
  await assert.rejects(
    repository.failReplay({
      quarantineId: "quarantine-1",
      commandId: "replay-1",
      ownerId: "worker-a",
      replayClaimToken: first.replayClaimToken,
      failureCode: "REPLAY_SOURCE_UNAVAILABLE",
      now: 1201,
    }),
    /not owned/,
  );
  const committed = await repository.commitReplay({
    quarantineId: "quarantine-1",
    commandId: "replay-1",
    ownerId: "worker-a",
    replayClaimToken: replacement.replayClaimToken,
    commitId: "current-effect",
    now: 1202,
  });
  assert.equal(committed.replay.commitId, "current-effect");
});

test("shutdown during handling leaves the delivery unacknowledged and reclaimable", async () => {
  const controller = new AbortController();
  let calls = 0;
  const harness = createHarness({
    handler: async ({ signal }) => {
      calls += 1;
      controller.abort();
      if (signal.aborted) {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }
      return { status: "committed", commitId: "impossible" };
    },
  });

  const result = await harness.consumer.processDelivery(delivery(), {
    signal: controller.signal,
  });

  assert.equal(result.status, "stopped");
  assert.equal(calls, 1);
  assert.deepEqual(harness.acknowledgements, []);
  harness.advance(101);
  assert.equal(
    (await harness.repository.claim({
      consumeKey: result.consumeKey,
      deliveryId: "100-0",
      recovered: true,
      metadata: (await harness.repository.getReceipt(result.consumeKey)).metadata,
      ownerId: "worker-b",
      now: harness.now(),
      leaseMs: 100,
    })).status,
    "claimed",
  );
});

test("a handler result already committed at abort still records its receipt and ACKs", async () => {
  const controller = new AbortController();
  const harness = createHarness({
    handler: async () => {
      controller.abort();
      return { status: "committed", commitId: "effect-before-abort" };
    },
  });

  const result = await harness.consumer.processDelivery(delivery(), {
    signal: controller.signal,
  });

  assert.equal(result.status, "processed");
  assert.deepEqual(harness.acknowledgements, [["100-0"]]);
  const receipt = await harness.repository.getReceipt(result.consumeKey);
  assert.equal(receipt.state, "completed");
  assert.equal(receipt.effect.commitId, "effect-before-abort");
});

test("runner is abortable and stale lease failure degrades without handling or ACK", async () => {
  let receives = 0;
  const preAborted = new AbortController();
  preAborted.abort();
  const stoppedHarness = createHarness({
    receive: async () => {
      receives += 1;
      return [delivery()];
    },
  });
  const stopped = await stoppedHarness.consumer.run({
    signal: preAborted.signal,
  });
  assert.equal(stopped.state, "stopped");
  assert.equal(receives, 0);

  const staleHarness = createHarness({
    receive: async () => {
      throw codedError("COORDINATION_LEASE_EXPIRED");
    },
  });
  const stale = await staleHarness.consumer.run();
  assert.equal(stale.state, "degraded");
  assert.equal(stale.lastError.code, "COORDINATION_LEASE_EXPIRED");
  assert.deepEqual(staleHarness.acknowledgements, []);
});

test("runner pauses after vault exhaustion without issuing another receive", async () => {
  let receives = 0;
  const harness = createHarness({
    receive: async () => {
      receives += 1;
      return [delivery({ deliveryId: `${receives}00-0` })];
    },
    handler: async () => {
      throw codedError("HANDLER_POISON");
    },
    quarantinePut: async () => {
      throw codedError("VAULT_UNAVAILABLE");
    },
  });

  const status = await harness.consumer.run();

  assert.equal(status.state, "degraded");
  assert.equal(receives, 1);
  assert.deepEqual(harness.acknowledgements, []);
});

test("runner backs off a busy claim instead of hot-receiving it", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  const now = Date.parse("2026-07-26T08:00:00.000Z");
  await repository.claim({
    consumeKey: coordinationConsumeKey(BASE_MESSAGE),
    deliveryId: "100-0",
    recovered: false,
    metadata: receiptMetadata(),
    ownerId: "other-worker",
    now,
    leaseMs: 1000,
  });
  const controller = new AbortController();
  let receives = 0;
  const busySleeps = [];
  const harness = createHarness({
    repository,
    receive: async () => {
      receives += 1;
      if (receives === 1) return [delivery()];
      controller.abort();
      throw Object.assign(new Error("hot receive"), { name: "AbortError" });
    },
    sleep: async (delayMs) => {
      busySleeps.push(delayMs);
      controller.abort();
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    },
  });

  const status = await harness.consumer.run({ signal: controller.signal });

  assert.equal(status.state, "stopped");
  assert.equal(receives, 1);
  assert.deepEqual(busySleeps, [5]);
  assert.deepEqual(harness.acknowledgements, []);
});

test("default sleep removes its abort listener after every resolved delay", async () => {
  const controller = new AbortController();
  const listenerCounts = [];
  let receives = 0;
  const harness = createHarness({
    useDefaultSleep: true,
    config: { idleDelayMs: 1 },
    receive: async (_request, { signal }) => {
      receives += 1;
      listenerCounts.push(getEventListeners(signal, "abort").length);
      if (receives === 4) {
        controller.abort();
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }
      return [];
    },
  });

  const status = await harness.consumer.run({ signal: controller.signal });

  assert.equal(status.state, "stopped");
  assert.deepEqual(listenerCounts, [0, 0, 0, 0]);
});

test("abort interrupts receive and retry sleep without quarantine or ACK", async () => {
  const receiveController = new AbortController();
  let receiveEntered;
  const enteredReceive = new Promise((resolve) => {
    receiveEntered = resolve;
  });
  const receiveHarness = createHarness({
    receive: async (_request, { signal }) => {
      receiveEntered();
      await new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => {
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        }, { once: true });
      });
      return [];
    },
  });
  const receiveRun = receiveHarness.consumer.run({
    signal: receiveController.signal,
  });
  await enteredReceive;
  receiveController.abort();
  assert.equal((await receiveRun).state, "stopped");

  const retryController = new AbortController();
  let sleepEntered;
  const enteredSleep = new Promise((resolve) => {
    sleepEntered = resolve;
  });
  const retryHarness = createHarness({
    handler: async () => {
      throw codedError("COORDINATION_UNAVAILABLE");
    },
    sleep: async (_delayMs, { signal }) => {
      sleepEntered();
      await new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => {
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        }, { once: true });
      });
    },
  });
  const processing = retryHarness.consumer.processDelivery(delivery(), {
    signal: retryController.signal,
  });
  await enteredSleep;
  retryController.abort();
  assert.equal((await processing).status, "stopped");
  assert.deepEqual(retryHarness.acknowledgements, []);
  assert.equal(retryHarness.storedBodies.size, 0);
});

test("replay requires an exact server-authorized decision and is idempotent", async () => {
  const effects = new Set();
  let replayAllowed = false;
  const harness = createHarness({
    handler: async ({ consumeKey }) => {
      if (!replayAllowed) throw codedError("HANDLER_POISON");
      effects.add(consumeKey);
      return { status: "committed", commitId: "replayed-effect-1" };
    },
    authorizeReplay: async ({ command, quarantine }) => ({
      allowed: true,
      commandId: command.commandId,
      quarantineId: quarantine.quarantineId,
      consumeKey: quarantine.consumeKey,
      decisionId: "decision-1",
      principalId: "operator-1",
    }),
  });
  const quarantined = await harness.consumer.processDelivery(delivery({
    message: {
      body: JSON.stringify({
        authorized: true,
        principalId: "message-is-not-authority",
      }),
    },
  }));
  replayAllowed = true;
  const receipt = await harness.repository.getReceipt(quarantined.consumeKey);
  const command = {
    commandId: "replay-1",
    quarantineId: receipt.quarantine.quarantineId,
    expectedConsumeKey: quarantined.consumeKey,
  };

  const first = await harness.consumer.replay(command);
  const duplicate = await harness.consumer.replay(command);

  assert.equal(first.status, "replayed");
  assert.equal(duplicate.status, "duplicate");
  assert.equal(effects.size, 1);
  assert.equal(first.commitId, "replayed-effect-1");
});

test("replay handler errors cannot forge consumer codes or expose body-derived messages", async () => {
  const bodyCanary = "REPLAY_BODY_LEAK_CANARY token=private-value";
  const forgedCode = "COORDINATION_CONSUMER_REPLAY_TOKEN_LEAK_CANARY";
  let replaying = false;
  const harness = createHarness({
    handler: async ({ message }) => {
      if (!replaying) throw codedError("HANDLER_POISON");
      throw new CoordinationConsumerError(
        forgedCode,
        `RAW_REPLAY_ERROR ${message.body}`,
      );
    },
    authorizeReplay: async ({ command, quarantine }) => ({
      allowed: true,
      commandId: command.commandId,
      quarantineId: quarantine.quarantineId,
      consumeKey: quarantine.consumeKey,
      decisionId: "decision-1",
      principalId: "operator-1",
    }),
  });
  const quarantined = await harness.consumer.processDelivery(delivery({
    message: { body: bodyCanary },
  }));
  const receipt = await harness.repository.getReceipt(quarantined.consumeKey);
  replaying = true;
  let publicError;

  await assert.rejects(
    harness.consumer.replay({
      commandId: "replay-forged-error",
      quarantineId: receipt.quarantine.quarantineId,
      expectedConsumeKey: quarantined.consumeKey,
    }),
    (error) => {
      publicError = error;
      assert.equal(
        error.code,
        "COORDINATION_CONSUMER_REPLAY_HANDLER_FAILED",
      );
      assert.equal(
        error.message,
        "coordination consumer operation failed safely",
      );
      return true;
    },
  );

  const failedReceipt = await harness.repository.getReceipt(
    quarantined.consumeKey,
  );
  assert.equal(
    failedReceipt.replay.failureCode,
    "COORDINATION_CONSUMER_REPLAY_HANDLER_FAILED",
  );
  const observable = JSON.stringify({
    error: {
      code: publicError.code,
      message: publicError.message,
    },
    receipt: failedReceipt,
    status: harness.consumer.getStatus(),
    audit: harness.audit,
    metrics: harness.metrics,
  });
  assert.doesNotMatch(
    observable,
    /REPLAY_TOKEN_LEAK_CANARY|REPLAY_BODY_LEAK_CANARY|RAW_REPLAY_ERROR|private-value|token=/,
  );
});

test("replay revalidates context and hides the locator from its authorizer", async () => {
  let handlerCalls = 0;
  let authorizerQuarantine;
  const harness = createHarness({
    handler: async () => {
      handlerCalls += 1;
      return { status: "committed", commitId: "must-not-run" };
    },
    authorizeReplay: async ({ command, quarantine }) => {
      authorizerQuarantine = quarantine;
      return {
        allowed: true,
        commandId: command.commandId,
        quarantineId: quarantine.quarantineId,
        consumeKey: quarantine.consumeKey,
        decisionId: "decision-1",
        principalId: "operator-1",
      };
    },
  });
  const quarantined = await harness.consumer.processDelivery(delivery({
    message: { scopeId: "scope-other" },
  }));
  const receipt = await harness.repository.getReceipt(quarantined.consumeKey);

  await assert.rejects(
    harness.consumer.replay({
      commandId: "replay-context-mismatch",
      quarantineId: receipt.quarantine.quarantineId,
      expectedConsumeKey: quarantined.consumeKey,
    }),
    (error) => error.code === "COORDINATION_CONSUMER_REPLAY_MISMATCH",
  );
  assert.equal(handlerCalls, 0);
  assert.equal(Object.hasOwn(authorizerQuarantine, "locator"), false);
});

test("distinct authorized replay command IDs converge on one effect and safe decision audit", async () => {
  let replayAllowed = false;
  let handlerCalls = 0;
  const harness = createHarness({
    handler: async () => {
      handlerCalls += 1;
      if (!replayAllowed) throw codedError("HANDLER_POISON");
      return { status: "committed", commitId: "replayed-effect-1" };
    },
    authorizeReplay: async ({ command, quarantine }) => ({
      allowed: true,
      commandId: command.commandId,
      quarantineId: quarantine.quarantineId,
      consumeKey: quarantine.consumeKey,
      decisionId: `decision-${command.commandId}`,
      principalId: "operator-1",
    }),
  });
  const quarantined = await harness.consumer.processDelivery(delivery({
    message: { body: "body token=private-message-value" },
  }));
  replayAllowed = true;
  const receipt = await harness.repository.getReceipt(quarantined.consumeKey);
  const baseCommand = {
    quarantineId: receipt.quarantine.quarantineId,
    expectedConsumeKey: quarantined.consumeKey,
  };

  assert.equal(
    (await harness.consumer.replay({ ...baseCommand, commandId: "replay-1" })).status,
    "replayed",
  );
  assert.equal(
    (await harness.consumer.replay({ ...baseCommand, commandId: "replay-2" })).status,
    "duplicate",
  );
  assert.equal(handlerCalls, 2);
  const replayAudit = harness.audit.filter(
    ({ type }) => type === "COORDINATION_CONSUMER_REPLAY_AUTHORIZED",
  );
  assert.deepEqual(
    replayAudit.map(({ decisionId }) => decisionId),
    ["decision-replay-1", "decision-replay-2"],
  );
  assert.ok(replayAudit.every(({ principalId }) => principalId === "operator-1"));
  assert.doesNotMatch(JSON.stringify(replayAudit), /private-message-value|token=/);
});

test("replay rejects missing authority, decision mismatch, and consume-key mismatch", async () => {
  const unauthorized = createHarness();
  await assert.rejects(
    unauthorized.consumer.replay({
      commandId: "replay-1",
      quarantineId: "quarantine-1",
      expectedConsumeKey: "coord-consume-v1-".padEnd(81, "a"),
      authorized: true,
    }),
    (error) => (
      error instanceof CoordinationConsumerError
      && error.code === "COORDINATION_CONSUMER_REPLAY_DENIED"
    ),
  );

  const mismatched = createHarness({
    handler: async () => {
      throw codedError("HANDLER_POISON");
    },
    authorizeReplay: async ({ command, quarantine }) => ({
      allowed: true,
      commandId: `${command.commandId}-other`,
      quarantineId: quarantine.quarantineId,
      consumeKey: quarantine.consumeKey,
      decisionId: "decision-1",
      principalId: "operator-1",
    }),
  });
  const quarantined = await mismatched.consumer.processDelivery(delivery());
  const receipt = await mismatched.repository.getReceipt(quarantined.consumeKey);
  await assert.rejects(
    mismatched.consumer.replay({
      commandId: "replay-1",
      quarantineId: receipt.quarantine.quarantineId,
      expectedConsumeKey: quarantined.consumeKey,
    }),
    (error) => error.code === "COORDINATION_CONSUMER_REPLAY_DENIED",
  );
  await assert.rejects(
    mismatched.consumer.replay({
      commandId: "replay-2",
      quarantineId: receipt.quarantine.quarantineId,
      expectedConsumeKey: "coord-consume-v1-".padEnd(81, "b"),
    }),
    (error) => error.code === "COORDINATION_CONSUMER_REPLAY_MISMATCH",
  );
});

test("status is a frozen bounded DTO with only safe fixed-size counters and codes", async () => {
  const harness = createHarness({
    handler: async () => {
      throw codedError("HANDLER_POISON");
    },
  });
  await harness.consumer.processDelivery(delivery());

  const status = harness.consumer.getStatus();
  assert.equal(Object.isFrozen(status), true);
  assert.equal(Object.isFrozen(status.counters), true);
  assert.equal(Object.isFrozen(status.lastError), true);
  assert.deepEqual(Object.keys(status).sort(), [
    "counters",
    "inFlight",
    "lastError",
    "state",
  ]);
  assert.deepEqual(Object.keys(status.counters).sort(), [
    "acked",
    "blocked",
    "duplicates",
    "failures",
    "processed",
    "quarantined",
    "replayed",
    "retries",
  ]);
  assert.doesNotMatch(JSON.stringify(status), /review artifact|unsafe raw|token=/);
  assert.ok(JSON.stringify(status).length < 512);
});
