import assert from "node:assert/strict";
import test from "node:test";

import {
  CoordinationAckReconcilerError,
  createCoordinationAckReconciler,
} from "../../gateway/src/core/coordination_ack_reconciler.js";
import {
  coordinationConsumeKey,
  createCoordinationConsumer,
} from "../../gateway/src/core/coordination_consumer.js";
import {
  createInMemoryCoordinationConsumerRepository,
} from "../../gateway/src/core/repositories/coordination_consumer_repo.js";

const BASE_TIME = Date.parse("2026-07-27T08:00:00.000Z");
const BASE_MESSAGE = Object.freeze({
  protocolVersion: 1,
  scopeId: "scope-a",
  messageId: "cm-ack-1",
  fromParticipantId: "pt-sender",
  toParticipantId: "pt-old-recipient",
  messageType: "IMPACT_NOTICE",
  classification: "internal",
  body: "private body token=never-project-this",
  createdAt: "2026-07-27T08:00:00.000Z",
  traceId: "trace-ack-1",
});

function message(messageId, overrides = {}) {
  return {
    ...BASE_MESSAGE,
    messageId,
    traceId: `trace-${messageId}`,
    ...overrides,
  };
}

function metadata(value) {
  const {
    body: _body,
    ...bodyFree
  } = value;
  return bodyFree;
}

async function seedAckIntent(repository, {
  messageId,
  deliveryId,
  now = BASE_TIME,
} = {}) {
  const envelope = message(messageId);
  const consumeKey = coordinationConsumeKey(envelope);
  const receiptClaim = await repository.claim({
    consumeKey,
    deliveryId,
    recovered: false,
    metadata: metadata(envelope),
    ownerId: "effect-worker",
    now,
    leaseMs: 100,
  });
  await repository.commitEffect({
    consumeKey,
    ownerId: "effect-worker",
    claimToken: receiptClaim.claimToken,
    commitId: `effect-${messageId}`,
    now: now + 1,
  });
  await repository.prepareAck({
    consumeKey,
    deliveryId,
    now: now + 2,
  });
  return {
    consumeKey,
    deliveryId,
    envelope,
  };
}

function createReconciler({
  repository,
  transport,
  clock,
  fault,
  limit = 16,
} = {}) {
  return createCoordinationAckReconciler({
    repository: repository.ackReconciliation,
    transport,
    clock,
    fault,
    config: {
      ownerId: "ack-reconciler-a",
      claimLeaseMs: 100,
      deferMs: 25,
      tombstoneTtlMs: 60_000,
      limit,
    },
  });
}

test("a post-transport crash converges by tombstone without redelivery or effect replay", async () => {
  let now = BASE_TIME;
  let effectCalls = 0;
  let ackCalls = 0;
  let crash = true;
  const tombstones = new Set();
  const repository = createInMemoryCoordinationConsumerRepository();
  const transport = {
    async receive() {
      return [];
    },
    async ack({ deliveryIds }) {
      ackCalls += 1;
      tombstones.add(deliveryIds[0]);
      return {
        ackedCount: 1,
        deliveryIds: [...deliveryIds],
      };
    },
  };
  const consumer = createCoordinationConsumer({
    transport,
    repository,
    async handler() {
      effectCalls += 1;
      return {
        status: "committed",
        commitId: "effect-once",
      };
    },
    quarantineStore: {
      async put() {
        return { locator: "unused" };
      },
      async get() {
        return null;
      },
    },
    clock: () => now,
    sleep: async () => {},
    fault(point) {
      if (point === "afterAck" && crash) {
        crash = false;
        throw Object.assign(new Error("token=crash-secret"), {
          code: "UNTRUSTED_CRASH_CODE",
        });
      }
    },
    config: {
      scopeId: "scope-a",
      participantId: "pt-old-recipient",
      consumerId: "consumer-a",
      ownerId: "consumer-worker-a",
      claimLeaseMs: 100,
      maxAttempts: 1,
      baseDelayMs: 1,
      maxDelayMs: 1,
      quarantineStoreMaxAttempts: 1,
      idleDelayMs: 1,
      blockMs: 1,
    },
  });
  const delivery = {
    deliveryId: "100-0",
    recovered: false,
    message: message("cm-ack-crash"),
  };

  await assert.rejects(
    consumer.processDelivery(delivery),
    (error) => {
      assert.equal(error.code, "COORDINATION_CONSUMER_FAULT");
      assert.doesNotMatch(error.message, /crash-secret|token=/);
      return true;
    },
  );

  const consumeKey = coordinationConsumeKey(delivery.message);
  const stranded = await repository.getReceipt(consumeKey);
  assert.equal(effectCalls, 1);
  assert.equal(ackCalls, 1);
  assert.equal(stranded.state, "effect_committed");
  assert.equal(stranded.deliveries[0].ackState, "acknowledging");
  assert.deepEqual(
    await repository.ackReconciliation.getAckReconciliationSummary(),
    {
      total: 1,
      pending: 0,
      claimed: 1,
      deferred: 0,
      committed: 0,
      recoveryRequired: 0,
      proofs: {
        DIRECT_ACK: 0,
        ACK_TOMBSTONE: 0,
        ORPHAN_ACK: 0,
      },
    },
  );

  now += 101;
  let finalizeCalls = 0;
  const reconciler = createReconciler({
    repository,
    clock: () => now,
    transport: {
      async inspectAckTombstone(intent) {
        assert.equal(intent.oldParticipantId, "pt-old-recipient");
        assert.equal(intent.messageId, "cm-ack-crash");
        assert.equal(Object.hasOwn(intent, "body"), false);
        assert.equal(Object.hasOwn(intent, "leaseToken"), false);
        assert.equal(Object.hasOwn(intent, "claimToken"), false);
        return {
          status: tombstones.has(intent.deliveryId)
            ? "ack_tombstone"
            : "absent",
        };
      },
      async finalizeOrphanAck() {
        finalizeCalls += 1;
        return { status: "orphan_acked" };
      },
    },
  });

  const result = await reconciler.reconcile();

  assert.deepEqual(result, {
    status: "reconciled",
    inspected: 1,
    claimed: 1,
    busy: 0,
    committed: 1,
    deferred: 0,
    recoveryRequired: 0,
    nextCursor: null,
  });
  assert.equal(finalizeCalls, 0);
  assert.equal(effectCalls, 1);
  assert.equal(ackCalls, 1);
  const completed = await repository.getReceipt(consumeKey);
  assert.equal(completed.state, "completed");
  assert.equal(completed.effect.commitId, "effect-once");
  assert.equal(completed.deliveries[0].ackState, "acked");
  assert.equal(
    (await repository.ackReconciliation.getAckReconciliationSummary())
      .proofs.ACK_TOMBSTONE,
    1,
  );
});

test("ACK intent claims are bounded, renewable, token-fenced, and cursor-stable", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  const seeded = [];
  for (const [index, messageId] of [
    "cm-page-a",
    "cm-page-b",
    "cm-page-c",
  ].entries()) {
    seeded.push(await seedAckIntent(repository, {
      messageId,
      deliveryId: `${index + 1}00-0`,
    }));
  }
  const port = repository.ackReconciliation;
  const firstPage = await port.list({
    cursor: null,
    limit: 2,
    now: BASE_TIME + 10,
  });
  const secondPage = await port.list({
    cursor: firstPage.nextCursor,
    limit: 2,
    now: BASE_TIME + 10,
  });
  const repeatedSecondPage = await port.list({
    cursor: firstPage.nextCursor,
    limit: 2,
    now: BASE_TIME + 10,
  });

  assert.equal(firstPage.intents.length, 2);
  assert.equal(typeof firstPage.nextCursor, "string");
  assert.deepEqual(secondPage, repeatedSecondPage);
  assert.equal(secondPage.intents.length, 1);
  assert.equal(secondPage.nextCursor, null);
  assert.deepEqual(
    new Set([
      ...firstPage.intents,
      ...secondPage.intents,
    ].map((intent) => intent.consumeKey)),
    new Set(seeded.map((item) => item.consumeKey)),
  );

  const intent = firstPage.intents[0];
  const claimInput = {
    consumeKey: intent.consumeKey,
    deliveryId: intent.deliveryId,
    ownerId: "ack-owner-a",
    now: BASE_TIME + 20,
    leaseMs: 100,
  };
  const first = await port.claim(claimInput);
  assert.equal(first.status, "claimed");
  assert.equal(first.intent.claimEpoch, 1);
  assert.equal(Object.hasOwn(first.intent, "claimToken"), false);
  assert.equal(
    (await port.claim({
      ...claimInput,
      ownerId: "ack-owner-b",
      now: BASE_TIME + 21,
    })).status,
    "busy",
  );
  const renewed = await port.renew({
    consumeKey: intent.consumeKey,
    deliveryId: intent.deliveryId,
    ownerId: "ack-owner-a",
    claimToken: first.claimToken,
    now: BASE_TIME + 50,
    leaseMs: 100,
  });
  assert.equal(renewed.status, "renewed");
  assert.equal(renewed.claimToken, first.claimToken);

  const replacement = await port.claim({
    ...claimInput,
    now: BASE_TIME + 150,
  });
  assert.equal(replacement.status, "claimed");
  assert.equal(replacement.intent.claimEpoch, 2);
  assert.notEqual(replacement.claimToken, first.claimToken);

  for (const operation of [
    () => port.renew({
      consumeKey: intent.consumeKey,
      deliveryId: intent.deliveryId,
      ownerId: "ack-owner-a",
      claimToken: first.claimToken,
      now: BASE_TIME + 151,
      leaseMs: 100,
    }),
    () => port.defer({
      consumeKey: intent.consumeKey,
      deliveryId: intent.deliveryId,
      ownerId: "ack-owner-a",
      claimToken: first.claimToken,
      reasonCode: "TRANSPORT_UNAVAILABLE",
      retryAt: BASE_TIME + 200,
      now: BASE_TIME + 151,
    }),
    () => port.commitTombstone({
      consumeKey: intent.consumeKey,
      deliveryId: intent.deliveryId,
      ownerId: "ack-owner-a",
      claimToken: first.claimToken,
      now: BASE_TIME + 151,
    }),
    () => port.markAckRecoveryRequired({
      consumeKey: intent.consumeKey,
      deliveryId: intent.deliveryId,
      ownerId: "ack-owner-a",
      claimToken: first.claimToken,
      reasonCode: "TRANSPORT_STATE_UNKNOWN",
      now: BASE_TIME + 151,
    }),
  ]) {
    await assert.rejects(operation(), /not owned/);
  }
  await assert.rejects(
    port.commitTombstone({
      consumeKey: intent.consumeKey,
      deliveryId: intent.deliveryId,
      ownerId: "ack-owner-a",
      claimToken: replacement.claimToken,
      proof: "NEW_PARTICIPANT_ASSUMPTION",
      now: BASE_TIME + 151,
    }),
    TypeError,
  );
  await port.defer({
    consumeKey: intent.consumeKey,
    deliveryId: intent.deliveryId,
    ownerId: "ack-owner-a",
    claimToken: replacement.claimToken,
    reasonCode: "TRANSPORT_UNAVAILABLE",
    retryAt: BASE_TIME + 200,
    now: BASE_TIME + 151,
  });

  assert.equal(
    (await port.list({
      cursor: null,
      limit: 16,
      now: BASE_TIME + 199,
    })).intents.some((item) => item.consumeKey === intent.consumeKey),
    false,
  );
  assert.equal(
    (await port.list({
      cursor: null,
      limit: 16,
      now: BASE_TIME + 200,
    })).intents.some((item) => item.consumeKey === intent.consumeKey),
    true,
  );

  await assert.rejects(
    port.claim({
      ...claimInput,
      newParticipantId: "pt-new-recipient",
      now: BASE_TIME + 200,
    }),
    TypeError,
  );
  const terminalClaim = await port.claim({
    ...claimInput,
    now: BASE_TIME + 200,
  });
  await port.markAckRecoveryRequired({
    consumeKey: intent.consumeKey,
    deliveryId: intent.deliveryId,
    ownerId: "ack-owner-a",
    claimToken: terminalClaim.claimToken,
    reasonCode: "TRANSPORT_STATE_UNKNOWN",
    now: BASE_TIME + 201,
  });

  const receipt = await repository.getReceipt(intent.consumeKey);
  assert.equal(receipt.state, "effect_committed");
  assert.equal(receipt.deliveries[0].ackState, "acknowledging");
  const summary = await port.getAckReconciliationSummary();
  assert.equal(summary.recoveryRequired, 1);
  const observable = JSON.stringify({
    firstPage,
    secondPage,
    busy: await port.claim({
      ...claimInput,
      ownerId: "ack-owner-b",
      now: BASE_TIME + 202,
    }),
    summary,
  });
  assert.doesNotMatch(
    observable,
    /private body|never-project|leaseToken|claimToken|pt-new-recipient/,
  );
});

test("the bounded reconciler closes only explicit proofs and fails unknown state closed", async () => {
  let now = BASE_TIME + 1_000;
  const repository = createInMemoryCoordinationConsumerRepository();
  const outcomes = new Map([
    ["cm-tombstone", "tombstone"],
    ["cm-old-live", "old_live"],
    ["cm-orphan", "orphan"],
    ["cm-unknown", "unknown"],
  ]);
  const seeded = new Map();
  let index = 1;
  for (const messageId of outcomes.keys()) {
    const intent = await seedAckIntent(repository, {
      messageId,
      deliveryId: `${index}00-0`,
      now: BASE_TIME,
    });
    seeded.set(messageId, intent);
    index += 1;
  }
  const calls = new Map();
  const remember = (messageId, operation) => {
    const existing = calls.get(messageId) ?? [];
    existing.push(operation);
    calls.set(messageId, existing);
  };
  const reconciler = createReconciler({
    repository,
    clock: () => now,
    transport: {
      async inspectAckTombstone(intent) {
        remember(intent.messageId, "inspect");
        assert.equal(intent.oldParticipantId, "pt-old-recipient");
        assert.equal(Object.hasOwn(intent, "body"), false);
        return outcomes.get(intent.messageId) === "tombstone"
          ? { status: "ack_tombstone" }
          : { status: "absent" };
      },
      async finalizeOrphanAck(intent) {
        remember(intent.messageId, "finalize");
        assert.equal(intent.oldParticipantId, "pt-old-recipient");
        if (outcomes.get(intent.messageId) === "old_live") {
          return { status: "old_participant_present" };
        }
        if (outcomes.get(intent.messageId) === "orphan") {
          return { status: "orphan_acked" };
        }
        return { status: "transport_state_unknown" };
      },
    },
  });

  const result = await reconciler.reconcile();

  assert.deepEqual(result, {
    status: "recovery_required",
    inspected: 4,
    claimed: 4,
    busy: 0,
    committed: 2,
    deferred: 1,
    recoveryRequired: 1,
    nextCursor: null,
  });
  assert.deepEqual(calls.get("cm-tombstone"), ["inspect"]);
  assert.deepEqual(calls.get("cm-old-live"), ["inspect", "finalize"]);
  assert.deepEqual(calls.get("cm-orphan"), ["inspect", "finalize"]);
  assert.deepEqual(calls.get("cm-unknown"), ["inspect", "finalize"]);

  const tombstoneReceipt = await repository.getReceipt(
    seeded.get("cm-tombstone").consumeKey,
  );
  const orphanReceipt = await repository.getReceipt(
    seeded.get("cm-orphan").consumeKey,
  );
  const liveReceipt = await repository.getReceipt(
    seeded.get("cm-old-live").consumeKey,
  );
  const unknownReceipt = await repository.getReceipt(
    seeded.get("cm-unknown").consumeKey,
  );
  assert.equal(tombstoneReceipt.state, "completed");
  assert.equal(orphanReceipt.state, "completed");
  assert.equal(liveReceipt.state, "effect_committed");
  assert.equal(unknownReceipt.state, "effect_committed");
  assert.equal(unknownReceipt.deliveries[0].ackState, "acknowledging");

  const summary = await reconciler.getSummary();
  assert.equal(summary.proofs.DIRECT_ACK, 0);
  assert.equal(summary.proofs.ACK_TOMBSTONE, 1);
  assert.equal(summary.proofs.ORPHAN_ACK, 1);
  assert.equal(summary.deferred, 1);
  assert.equal(summary.recoveryRequired, 1);

  now += 24;
  assert.equal(
    (await repository.ackReconciliation.list({
      cursor: null,
      limit: 16,
      now,
    })).intents.some((intent) => intent.messageId === "cm-old-live"),
    false,
  );
  now += 1;
  assert.equal(
    (await repository.ackReconciliation.list({
      cursor: null,
      limit: 16,
      now,
    })).intents.some((intent) => intent.messageId === "cm-old-live"),
    true,
  );
});

test("a crash after atomic orphan finalization converges through its tombstone", async () => {
  let now = BASE_TIME + 2_000;
  let finalized = 0;
  let tombstone = false;
  let crash = true;
  const repository = createInMemoryCoordinationConsumerRepository();
  const seeded = await seedAckIntent(repository, {
    messageId: "cm-finalize-crash",
    deliveryId: "900-0",
    now: BASE_TIME,
  });
  const transport = {
    async inspectAckTombstone() {
      return {
        status: tombstone ? "ack_tombstone" : "absent",
      };
    },
    async finalizeOrphanAck(intent) {
      finalized += 1;
      assert.equal(intent.oldParticipantId, "pt-old-recipient");
      tombstone = true;
      return { status: "orphan_acked" };
    },
  };
  const crashing = createReconciler({
    repository,
    transport,
    clock: () => now,
    fault(point) {
      if (point === "afterFinalize" && crash) {
        crash = false;
        throw new Error("token=finalize-crash-secret");
      }
    },
  });

  await assert.rejects(
    crashing.reconcile(),
    (error) => {
      assert.equal(error instanceof CoordinationAckReconcilerError, true);
      assert.equal(error.code, "COORDINATION_ACK_RECONCILIATION_FAULT");
      assert.doesNotMatch(error.message, /finalize-crash-secret|token=/);
      return true;
    },
  );
  assert.equal(
    (await repository.getReceipt(seeded.consumeKey)).state,
    "effect_committed",
  );
  assert.equal(
    (await repository.ackReconciliation.getAckReconciliationSummary()).claimed,
    1,
  );

  now += 101;
  const recovered = createReconciler({
    repository,
    transport,
    clock: () => now,
  });
  const result = await recovered.reconcile();

  assert.equal(result.committed, 1);
  assert.equal(finalized, 1);
  assert.equal(
    (await repository.getReceipt(seeded.consumeKey)).state,
    "completed",
  );
  const summary = await recovered.getSummary();
  assert.equal(summary.proofs.ACK_TOMBSTONE, 1);
  assert.equal(summary.proofs.ORPHAN_ACK, 0);
});

for (const status of ["busy", "claimed"]) {
  test(`ACK reconciliation rejects an open ${status} claim DTO with extra fields`, async () => {
    const repository = createInMemoryCoordinationConsumerRepository();
    await seedAckIntent(repository, {
      messageId: `cm-hostile-${status}`,
      deliveryId: status === "busy" ? "910-0" : "911-0",
    });
    const basePort = repository.ackReconciliation;
    const hostilePort = {
      ...basePort,
      async claim(input) {
        if (status === "busy") {
          const claimed = await basePort.claim({
            ...input,
            ownerId: "competing-owner",
          });
          assert.equal(claimed.status, "claimed");
          return {
            status: "busy",
            intent: claimed.intent,
            body: "private dependency projection",
          };
        }
        return {
          ...await basePort.claim(input),
          body: "private dependency projection",
        };
      },
    };
    const reconciler = createReconciler({
      repository: { ackReconciliation: hostilePort },
      clock: () => BASE_TIME + 1_000,
      transport: {
        async inspectAckTombstone() {
          return { status: "ack_tombstone" };
        },
        async finalizeOrphanAck() {
          return { status: "orphan_acked" };
        },
      },
    });

    await assert.rejects(
      reconciler.reconcile(),
      (error) => {
        assert.equal(error instanceof CoordinationAckReconcilerError, true);
        assert.equal(
          error.code,
          "COORDINATION_ACK_RECONCILIATION_FAILED",
        );
        assert.doesNotMatch(error.message, /private|dependency|projection/);
        return true;
      },
    );
  });
}

test("ACK reconciliation rejects a renewed claim DTO with extra fields", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  await seedAckIntent(repository, {
    messageId: "cm-hostile-renewal",
    deliveryId: "912-0",
  });
  const basePort = repository.ackReconciliation;
  const hostilePort = {
    ...basePort,
    async renew(input) {
      return {
        ...await basePort.renew(input),
        leaseToken: "private dependency projection",
      };
    },
  };
  const reconciler = createReconciler({
    repository: { ackReconciliation: hostilePort },
    clock: () => BASE_TIME + 1_000,
    transport: {
      async inspectAckTombstone() {
        return { status: "absent" };
      },
      async finalizeOrphanAck() {
        return { status: "orphan_acked" };
      },
    },
  });

  await assert.rejects(
    reconciler.reconcile(),
    (error) => {
      assert.equal(error instanceof CoordinationAckReconcilerError, true);
      assert.equal(
        error.code,
        "COORDINATION_ACK_RECONCILIATION_FAILED",
      );
      assert.doesNotMatch(error.message, /private|dependency|projection/);
      return true;
    },
  );
});

test("ACK reconciliation summaries are closed deeply frozen DTOs", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  const basePort = repository.ackReconciliation;
  const transport = {
    async inspectAckTombstone() {
      return { status: "absent" };
    },
    async finalizeOrphanAck() {
      return { status: "transport_state_unknown" };
    },
  };

  for (const hostileSummary of [
    async () => ({
      ...await basePort.getAckReconciliationSummary(),
      body: "private dependency projection",
    }),
    async () => {
      const value = await basePort.getAckReconciliationSummary();
      return {
        ...value,
        proofs: {
          ...value.proofs,
          claimToken: "private dependency projection",
        },
      };
    },
  ]) {
    const reconciler = createReconciler({
      repository: {
        ackReconciliation: {
          ...basePort,
          getAckReconciliationSummary: hostileSummary,
        },
      },
      clock: () => BASE_TIME,
      transport,
    });
    await assert.rejects(
      reconciler.getSummary(),
      (error) => {
        assert.equal(error instanceof CoordinationAckReconcilerError, true);
        assert.equal(
          error.code,
          "COORDINATION_ACK_RECONCILIATION_FAILED",
        );
        assert.doesNotMatch(error.message, /private|dependency|projection/);
        return true;
      },
    );
  }

  const summary = await createReconciler({
    repository,
    clock: () => BASE_TIME,
    transport,
  }).getSummary();
  assert.equal(Object.isFrozen(summary), true);
  assert.equal(Object.isFrozen(summary.proofs), true);
  assert.throws(() => {
    summary.pending = 1;
  }, TypeError);
  assert.throws(() => {
    summary.proofs.DIRECT_ACK = 1;
  }, TypeError);
});

test("ACK reconciliation rejects validate-then-reread status accessors", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  await seedAckIntent(repository, {
    messageId: "cm-status-toctou",
    deliveryId: "913-0",
  });
  let reads = 0;
  let finalizerCalls = 0;
  const reconciler = createReconciler({
    repository,
    clock: () => BASE_TIME + 1_000,
    transport: {
      async inspectAckTombstone() {
        const result = {};
        Object.defineProperty(result, "status", {
          enumerable: true,
          get() {
            reads += 1;
            return reads === 1 ? "ack_tombstone" : "absent";
          },
        });
        return result;
      },
      async finalizeOrphanAck() {
        finalizerCalls += 1;
        return { status: "orphan_acked" };
      },
    },
  });

  await assert.rejects(
    reconciler.reconcile(),
    (error) =>
      error instanceof CoordinationAckReconcilerError
      && error.code === "COORDINATION_ACK_RECONCILIATION_FAILED",
  );
  assert.equal(finalizerCalls, 0);
  assert.ok(reads <= 1);
});

test("ACK reconciliation rejects page, intent, claim, and renewal accessors", async () => {
  const cases = [
    ["page", "919-0"],
    ["intent", "920-0"],
    ["claim", "921-0"],
    ["renewal", "922-0"],
  ];

  for (const [kind, deliveryId] of cases) {
    const repository = createInMemoryCoordinationConsumerRepository();
    await seedAckIntent(repository, {
      messageId: `cm-accessor-${kind}`,
      deliveryId,
    });
    const basePort = repository.ackReconciliation;
    let reads = 0;
    const togglingField = (source, field, first, second) => {
      const result = { ...source };
      Object.defineProperty(result, field, {
        enumerable: true,
        configurable: true,
        get() {
          reads += 1;
          return reads === 1 ? first : second;
        },
      });
      return result;
    };
    const hostilePort = {
      ...basePort,
      ...(kind === "page" ? {
        async list(input) {
          const page = await basePort.list(input);
          return togglingField(
            { nextCursor: page.nextCursor },
            "intents",
            page.intents,
            [],
          );
        },
      } : {}),
      ...(kind === "intent" ? {
        async list(input) {
          const page = await basePort.list(input);
          return {
            ...page,
            intents: [
              togglingField(
                page.intents[0],
                "state",
                page.intents[0].state,
                "committed",
              ),
            ],
          };
        },
      } : {}),
      ...(kind === "claim" ? {
        async claim(input) {
          const claimed = await basePort.claim(input);
          return togglingField(
            claimed,
            "status",
            claimed.status,
            "busy",
          );
        },
      } : {}),
      ...(kind === "renewal" ? {
        async renew(input) {
          const renewed = await basePort.renew(input);
          return togglingField(
            renewed,
            "status",
            renewed.status,
            "invalid",
          );
        },
      } : {}),
    };
    const reconciler = createReconciler({
      repository: { ackReconciliation: hostilePort },
      clock: () => BASE_TIME + 1_000,
      transport: {
        async inspectAckTombstone() {
          return { status: "absent" };
        },
        async finalizeOrphanAck() {
          return { status: "orphan_acked" };
        },
      },
    });

    await assert.rejects(
      reconciler.reconcile(),
      (error) =>
        error instanceof CoordinationAckReconcilerError
        && error.code === "COORDINATION_ACK_RECONCILIATION_FAILED",
    );
    assert.ok(reads <= 1);
  }
});

test("ACK reconciliation rejects unvalidated summary accessor projections", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  const basePort = repository.ackReconciliation;
  let reads = 0;
  const reconciler = createReconciler({
    repository: {
      ackReconciliation: {
        ...basePort,
        async getAckReconciliationSummary() {
          const summary = await basePort.getAckReconciliationSummary();
          Object.defineProperty(summary, "pending", {
            enumerable: true,
            configurable: true,
            get() {
              reads += 1;
              return reads === 1 ? 0 : "UNVALIDATED";
            },
          });
          return summary;
        },
      },
    },
    clock: () => BASE_TIME,
    transport: {
      async inspectAckTombstone() {
        throw new Error("unused");
      },
      async finalizeOrphanAck() {
        throw new Error("unused");
      },
    },
  });

  await assert.rejects(
    reconciler.getSummary(),
    (error) =>
      error instanceof CoordinationAckReconcilerError
      && error.code === "COORDINATION_ACK_RECONCILIATION_FAILED",
  );
  assert.ok(reads <= 1);
});

test("ACK intent claim preserves a future deferred intent as not_due", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  const seeded = await seedAckIntent(repository, {
    messageId: "cm-future-due",
    deliveryId: "914-0",
  });
  const port = repository.ackReconciliation;
  const first = await port.claim({
    consumeKey: seeded.consumeKey,
    deliveryId: seeded.deliveryId,
    ownerId: "ack-owner-a",
    now: BASE_TIME + 10,
    leaseMs: 100,
  });
  await port.defer({
    consumeKey: seeded.consumeKey,
    deliveryId: seeded.deliveryId,
    ownerId: "ack-owner-a",
    claimToken: first.claimToken,
    reasonCode: "TRANSPORT_UNAVAILABLE",
    retryAt: BASE_TIME + 1_000,
    now: BASE_TIME + 20,
  });

  const early = await port.claim({
    consumeKey: seeded.consumeKey,
    deliveryId: seeded.deliveryId,
    ownerId: "ack-owner-b",
    now: BASE_TIME + 999,
    leaseMs: 100,
  });
  assert.equal(early.status, "not_due");
  assert.equal(early.intent.state, "deferred");
  assert.equal(early.intent.dueAt, BASE_TIME + 1_000);
  assert.equal(early.intent.reasonCode, "TRANSPORT_UNAVAILABLE");
  assert.equal(early.intent.claimEpoch, first.intent.claimEpoch);
  assert.equal(Object.hasOwn(early.intent, "claimToken"), false);

  const due = await port.claim({
    consumeKey: seeded.consumeKey,
    deliveryId: seeded.deliveryId,
    ownerId: "ack-owner-b",
    now: BASE_TIME + 1_000,
    leaseMs: 100,
  });
  assert.equal(due.status, "claimed");
  assert.equal(due.intent.claimEpoch, first.intent.claimEpoch + 1);
});

test("two reconcilers settle a committed stale-list race as a no-op", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  await seedAckIntent(repository, {
    messageId: "cm-stale-two-reconcilers",
    deliveryId: "923-0",
  });
  const basePort = repository.ackReconciliation;
  let announceClaim;
  const claimStarted = new Promise((resolve) => {
    announceClaim = resolve;
  });
  let releaseClaim;
  const claimReleased = new Promise((resolve) => {
    releaseClaim = resolve;
  });
  let staleTransportCalls = 0;
  const staleReconciler = createReconciler({
    repository: {
      ackReconciliation: {
        ...basePort,
        async claim(input) {
          announceClaim();
          await claimReleased;
          return basePort.claim(input);
        },
      },
    },
    clock: () => BASE_TIME + 1_000,
    transport: {
      async inspectAckTombstone() {
        staleTransportCalls += 1;
        return { status: "ack_tombstone" };
      },
      async finalizeOrphanAck() {
        staleTransportCalls += 1;
        return { status: "orphan_acked" };
      },
    },
    limit: 1,
  });
  const settlingReconciler = createReconciler({
    repository,
    clock: () => BASE_TIME + 1_000,
    transport: {
      async inspectAckTombstone() {
        return { status: "ack_tombstone" };
      },
      async finalizeOrphanAck() {
        throw new Error("unused");
      },
    },
    limit: 1,
  });

  const staleRun = staleReconciler.reconcile();
  await claimStarted;
  const settled = await settlingReconciler.reconcile().finally(releaseClaim);
  const stale = await staleRun;

  assert.equal(settled.committed, 1);
  assert.equal(stale.inspected, 1);
  assert.equal(stale.claimed, 0);
  assert.equal(stale.committed, 0);
  assert.equal(staleTransportCalls, 0);
});

test("a stale-list claim after defer preserves backoff and epoch", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  await seedAckIntent(repository, {
    messageId: "cm-stale-after-defer",
    deliveryId: "924-0",
  });
  const basePort = repository.ackReconciliation;
  let announceClaim;
  const claimStarted = new Promise((resolve) => {
    announceClaim = resolve;
  });
  let releaseClaim;
  const claimReleased = new Promise((resolve) => {
    releaseClaim = resolve;
  });
  let staleClaim;
  let staleTransportCalls = 0;
  const staleReconciler = createReconciler({
    repository: {
      ackReconciliation: {
        ...basePort,
        async claim(input) {
          announceClaim();
          await claimReleased;
          staleClaim = await basePort.claim(input);
          return staleClaim;
        },
      },
    },
    clock: () => BASE_TIME + 1_000,
    transport: {
      async inspectAckTombstone() {
        staleTransportCalls += 1;
        return { status: "ack_tombstone" };
      },
      async finalizeOrphanAck() {
        staleTransportCalls += 1;
        return { status: "orphan_acked" };
      },
    },
    limit: 1,
  });
  const deferringReconciler = createReconciler({
    repository,
    clock: () => BASE_TIME + 1_000,
    transport: {
      async inspectAckTombstone() {
        throw new Error("transport unavailable");
      },
      async finalizeOrphanAck() {
        throw new Error("unused");
      },
    },
    limit: 1,
  });

  const staleRun = staleReconciler.reconcile();
  await claimStarted;
  const deferred = await deferringReconciler.reconcile().finally(releaseClaim);
  const stale = await staleRun;

  assert.equal(deferred.deferred, 1);
  assert.equal(stale.claimed, 0);
  assert.equal(stale.deferred, 0);
  assert.equal(staleTransportCalls, 0);
  assert.equal(staleClaim.status, "not_due");
  assert.equal(staleClaim.intent.state, "deferred");
  assert.equal(staleClaim.intent.dueAt, BASE_TIME + 1_025);
  assert.equal(staleClaim.intent.reasonCode, "TRANSPORT_UNAVAILABLE");
  assert.equal(staleClaim.intent.claimEpoch, 1);
  assert.equal(Object.hasOwn(staleClaim, "claimToken"), false);
});

for (const status of ["not_due", "committed", "recovery_required"]) {
  test(`a stale-list ${status} claim is a bounded reconciliation no-op`, async () => {
    const repository = createInMemoryCoordinationConsumerRepository();
    await seedAckIntent(repository, {
      messageId: `cm-stale-${status}`,
      deliveryId: status === "not_due"
        ? "915-0"
        : status === "committed"
          ? "916-0"
          : "917-0",
    });
    const basePort = repository.ackReconciliation;
    const page = await basePort.list({
      cursor: null,
      limit: 1,
      now: BASE_TIME + 10,
    });
    const listed = page.intents[0];
    let terminalProof = null;
    if (status === "committed") {
      const claim = await basePort.claim({
        consumeKey: listed.consumeKey,
        deliveryId: listed.deliveryId,
        ownerId: "terminal-proof-producer",
        now: BASE_TIME + 10,
        leaseMs: 100,
      });
      await basePort.commitTombstone({
        consumeKey: listed.consumeKey,
        deliveryId: listed.deliveryId,
        ownerId: "terminal-proof-producer",
        claimToken: claim.claimToken,
        now: BASE_TIME + 11,
      });
      terminalProof = (await basePort.claim({
        consumeKey: listed.consumeKey,
        deliveryId: listed.deliveryId,
        ownerId: "terminal-proof-observer",
        now: BASE_TIME + 12,
        leaseMs: 100,
      })).intent.proof;
    }
    const terminalIntent = {
      ...listed,
      state: status === "not_due" ? "deferred" : status,
      dueAt: status === "not_due" ? BASE_TIME + 1_000 : null,
      proof: terminalProof,
      reasonCode: status === "not_due"
        ? "TRANSPORT_UNAVAILABLE"
        : status === "recovery_required"
          ? "TRANSPORT_STATE_UNKNOWN"
          : null,
    };
    let transportCalls = 0;
    const reconciler = createReconciler({
      repository: {
        ackReconciliation: {
          ...basePort,
          async list() {
            return page;
          },
          async claim() {
            return { status, intent: terminalIntent };
          },
        },
      },
      clock: () => BASE_TIME + 10,
      transport: {
        async inspectAckTombstone() {
          transportCalls += 1;
          return { status: "ack_tombstone" };
        },
        async finalizeOrphanAck() {
          transportCalls += 1;
          return { status: "orphan_acked" };
        },
      },
      limit: 1,
    });

    assert.deepEqual(await reconciler.reconcile(), {
      status: "reconciled",
      inspected: 1,
      claimed: 0,
      busy: 0,
      committed: 0,
      deferred: 0,
      recoveryRequired: 0,
      nextCursor: null,
    });
    assert.equal(transportCalls, 0);

    if (status === "committed") {
      const forged = createReconciler({
        repository: {
          ackReconciliation: {
            ...basePort,
            async list() {
              return page;
            },
            async claim() {
              return {
                status,
                intent: { ...terminalIntent, proof: "ACK_TOMBSTONE" },
              };
            },
          },
        },
        clock: () => BASE_TIME + 10,
        transport: {
          async inspectAckTombstone() {
            transportCalls += 1;
            return { status: "ack_tombstone" };
          },
          async finalizeOrphanAck() {
            transportCalls += 1;
            return { status: "orphan_acked" };
          },
        },
        limit: 1,
      });
      await assert.rejects(
        forged.reconcile(),
        (error) =>
          error?.code === "COORDINATION_ACK_RECONCILIATION_FAILED",
      );
      assert.equal(transportCalls, 0);
    }
  });
}

test("ACK proof authority is split into fixed producer facets", async () => {
  const repository = createInMemoryCoordinationConsumerRepository();
  assert.deepEqual(
    Object.keys(repository.directAck).sort(),
    ["claim", "commit", "defer"],
  );
  assert.equal(repository.ackReconciliation.commit, undefined);
  assert.equal(
    typeof repository.ackReconciliation.commitTombstone,
    "function",
  );
  assert.equal(
    typeof repository.ackReconciliation.commitOrphan,
    "function",
  );

  const seeded = await seedAckIntent(repository, {
    messageId: "cm-fixed-proof",
    deliveryId: "918-0",
  });
  const directClaim = await repository.directAck.claim({
    consumeKey: seeded.consumeKey,
    deliveryId: seeded.deliveryId,
    ownerId: "direct-owner",
    now: BASE_TIME + 10,
    leaseMs: 100,
  });
  await assert.rejects(
    repository.directAck.commit({
      consumeKey: seeded.consumeKey,
      deliveryId: seeded.deliveryId,
      ownerId: "direct-owner",
      claimToken: directClaim.claimToken,
      now: BASE_TIME + 11,
      proof: "ORPHAN_ACK",
    }),
    TypeError,
  );
});

test("ACK claim families reject cross-facet settlement without mutation", async () => {
  const attempts = [
    {
      claimFacet: "directAck",
      settlementFacet: "ackReconciliation",
      operation: "commitTombstone",
      messageId: "cm-family-direct-tombstone",
      deliveryId: "919-0",
    },
    {
      claimFacet: "directAck",
      settlementFacet: "ackReconciliation",
      operation: "commitOrphan",
      messageId: "cm-family-direct-orphan",
      deliveryId: "920-0",
    },
    {
      claimFacet: "ackReconciliation",
      settlementFacet: "directAck",
      operation: "commit",
      messageId: "cm-family-reconciliation-direct",
      deliveryId: "921-0",
    },
  ];

  for (const attempt of attempts) {
    const repository = createInMemoryCoordinationConsumerRepository();
    const seeded = await seedAckIntent(repository, {
      messageId: attempt.messageId,
      deliveryId: attempt.deliveryId,
    });
    const ownerId = "shared-ack-owner";
    const claim = await repository[attempt.claimFacet].claim({
      consumeKey: seeded.consumeKey,
      deliveryId: seeded.deliveryId,
      ownerId,
      now: BASE_TIME + 10,
      leaseMs: 100,
    });
    assert.equal(claim.status, "claimed");
    assert.equal(typeof claim.claimToken, "string");

    const observe = async () => ({
      receipt: await repository.getReceipt(seeded.consumeKey),
      summary:
        await repository.ackReconciliation.getAckReconciliationSummary(),
      intents: await repository.ackReconciliation.list({
        cursor: null,
        limit: 1,
        now: BASE_TIME + 1_000,
      }),
    });
    const before = await observe();
    let rejected = false;
    let errorSafe = false;
    try {
      await repository[attempt.settlementFacet][attempt.operation]({
        consumeKey: seeded.consumeKey,
        deliveryId: seeded.deliveryId,
        ownerId,
        claimToken: claim.claimToken,
        now: BASE_TIME + 11,
      });
    } catch (error) {
      rejected = error instanceof Error;
      errorSafe = (
        typeof error?.message === "string"
        && !error.message.includes(claim.claimToken)
        && !error.message.includes(seeded.consumeKey)
        && !error.message.includes(seeded.deliveryId)
      );
    }
    const after = await observe();

    assert.deepEqual({
      rejected,
      errorSafe,
      after,
    }, {
      rejected: true,
      errorSafe: true,
      after: before,
    }, `${attempt.claimFacet} must not authorize ${attempt.operation}`);
  }
});

test("ACK proof values are opaque evidence minted only by their producer facet", async () => {
  const repositoryModule = await import(
    "../../gateway/src/core/repositories/coordination_consumer_repo.js"
  );
  assert.equal(
    typeof repositoryModule.coordinationAckProofCode,
    "function",
  );
  const projectProof =
    repositoryModule.coordinationAckProofCode;
  const cases = [
    {
      claimFacet: "directAck",
      settlementFacet: "directAck",
      operation: "commit",
      proofCode: "DIRECT_ACK",
      messageId: "cm-evidence-direct",
      deliveryId: "925-0",
    },
    {
      claimFacet: "ackReconciliation",
      settlementFacet: "ackReconciliation",
      operation: "commitTombstone",
      proofCode: "ACK_TOMBSTONE",
      messageId: "cm-evidence-tombstone",
      deliveryId: "926-0",
    },
    {
      claimFacet: "ackReconciliation",
      settlementFacet: "ackReconciliation",
      operation: "commitOrphan",
      proofCode: "ORPHAN_ACK",
      messageId: "cm-evidence-orphan",
      deliveryId: "927-0",
    },
  ];

  for (const value of cases) {
    const repository = createInMemoryCoordinationConsumerRepository();
    const seeded = await seedAckIntent(repository, {
      messageId: value.messageId,
      deliveryId: value.deliveryId,
    });
    const ownerId = `producer-${value.proofCode.toLowerCase()}`;
    const claim = await repository[value.claimFacet].claim({
      consumeKey: seeded.consumeKey,
      deliveryId: seeded.deliveryId,
      ownerId,
      now: BASE_TIME + 10,
      leaseMs: 100,
    });
    await repository[value.settlementFacet][value.operation]({
      consumeKey: seeded.consumeKey,
      deliveryId: seeded.deliveryId,
      ownerId,
      claimToken: claim.claimToken,
      now: BASE_TIME + 11,
    });
    const terminal = await repository[value.claimFacet].claim({
      consumeKey: seeded.consumeKey,
      deliveryId: seeded.deliveryId,
      ownerId: "proof-observer",
      now: BASE_TIME + 12,
      leaseMs: 100,
    });
    const evidence = terminal.intent.proof;

    assert.equal(terminal.status, "committed");
    assert.equal(typeof evidence, "object");
    assert.equal(Object.getPrototypeOf(evidence), null);
    assert.equal(Object.isFrozen(evidence), true);
    assert.deepEqual(Reflect.ownKeys(evidence), []);
    assert.equal(projectProof(evidence), value.proofCode);
    for (const forgery of [
      value.proofCode,
      Symbol(value.proofCode),
      Object.freeze(Object.create(null)),
      Object.freeze({ proofCode: value.proofCode }),
    ]) {
      assert.throws(() => projectProof(forgery), TypeError);
    }
  }
});
