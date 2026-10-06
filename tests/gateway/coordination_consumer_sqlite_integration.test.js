import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  coordinationConsumeKey,
  createCoordinationConsumer,
} from "../../gateway/src/core/coordination_consumer.js";
import {
  createSqliteCoordinationConsumerRepository,
} from "../../gateway/src/core/repositories/sqlite_coordination_consumer_repo.js";
import {
  createSqliteQuarantineStore,
} from "../../gateway/src/core/sqlite_quarantine_store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const MIGRATIONS = Object.freeze([
  "002_coordination_consumer.sql",
  "003_coordination_ack_outbox.sql",
].map((file) => path.join(
  REPO_ROOT,
  "gateway",
  "migrations",
  file,
)));
const require = createRequire(path.join(REPO_ROOT, "gateway", "package.json"));
const Database = require("better-sqlite3");

const BASE_MESSAGE = Object.freeze({
  protocolVersion: 1,
  scopeId: "scope-a",
  messageId: "message-a",
  fromParticipantId: "participant-sender",
  toParticipantId: "participant-recipient",
  messageType: "IMPACT_NOTICE",
  classification: "internal",
  body: "private notice body token=not-public",
  createdAt: "2026-07-26T08:00:00.000Z",
  traceId: "trace-a",
});

function taskDirectory() {
  return fs.mkdtempSync(
    path.join(os.tmpdir(), "agents-orchestrator-v5-g002-integration-"),
  );
}

function openDatabase(file) {
  const database = new Database(file);
  database.backend = "sqlite";
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 1000");
  for (const migration of MIGRATIONS) {
    database.exec(fs.readFileSync(migration, "utf8"));
  }
  return database;
}

function openStores(receiptFile, vaultFile) {
  const receiptDatabase = openDatabase(receiptFile);
  const vaultDatabase = openDatabase(vaultFile);
  return {
    receiptDatabase,
    vaultDatabase,
    repository: createSqliteCoordinationConsumerRepository({
      database: receiptDatabase,
    }),
    vault: createSqliteQuarantineStore({ database: vaultDatabase }),
    close() {
      receiptDatabase.close();
      vaultDatabase.close();
    },
  };
}

function delivery({
  deliveryId = "100-0",
  recovered = false,
  message = {},
} = {}) {
  return {
    deliveryId,
    recovered,
    message: {
      ...BASE_MESSAGE,
      ...message,
    },
  };
}

function createConsumer({
  repository,
  vault,
  handler,
  now,
  acknowledgements,
  fault = () => {},
  quarantineRecoveryId = null,
  authorizeReplay,
  quarantineStore = vault,
  ownerId = "worker-a",
  maxConsumedRecoveryIdsPerReceipt = 4,
  maxAttempts = 1,
}) {
  return createCoordinationConsumer({
    transport: {
      receive: async () => [],
      ack: async ({ deliveryIds }) => {
        acknowledgements.push([...deliveryIds]);
        return {
          ackedCount: deliveryIds.length,
          deliveryIds: [...deliveryIds],
        };
      },
    },
    repository,
    quarantineStore,
    handler,
    authorizeReplay,
    clock: () => now.value,
    sleep: async () => {},
    fault,
    config: {
      scopeId: "scope-a",
      participantId: "participant-recipient",
      consumerId: "consumer-a",
      ownerId,
      claimLeaseMs: 100,
      maxAttempts,
      baseDelayMs: 1,
      maxDelayMs: 1,
      quarantineStoreMaxAttempts: 1,
      idleDelayMs: 1,
      quarantineRecoveryId,
      maxConsumedRecoveryIdsPerReceipt,
    },
  });
}

function openBusinessEffects(file) {
  const database = new Database(file);
  database.exec(`
    CREATE TABLE IF NOT EXISTS test_business_effects (
      consume_key TEXT PRIMARY KEY,
      commit_id TEXT NOT NULL
    )
  `);
  return database;
}

function durableHandler(database, calls) {
  return async ({ consumeKey }) => {
    calls.push(consumeKey);
    const commitId = `business-${consumeKey.slice(-16)}`;
    database
      .prepare(
        "INSERT OR IGNORE INTO test_business_effects "
        + "(consume_key, commit_id) VALUES (?, ?)",
      )
      .run(consumeKey, commitId);
    return {
      status: "committed",
      commitId: database
        .prepare(
          "SELECT commit_id FROM test_business_effects WHERE consume_key = ?",
        )
        .get(consumeKey)
        .commit_id,
    };
  };
}

test("real consumer converges a durable idempotent effect after crash before its receipt", async () => {
  const directory = taskDirectory();
  const receiptFile = path.join(directory, "receipts.db");
  const vaultFile = path.join(directory, "vault.db");
  const businessFile = path.join(directory, "business.db");
  const now = { value: 1000 };
  const acknowledgements = [];
  const calls = [];
  let stores = openStores(receiptFile, vaultFile);
  let business = openBusinessEffects(businessFile);
  let injected = false;
  const crashing = createConsumer({
    repository: stores.repository,
    vault: stores.vault,
    handler: durableHandler(business, calls),
    now,
    acknowledgements,
    fault(point) {
      if (point === "afterEffect" && !injected) {
        injected = true;
        throw new Error("raw private crash token=never-public");
      }
    },
    maxAttempts: 2,
  });

  await assert.rejects(
    crashing.processDelivery(delivery()),
    (error) => {
      assert.equal(
        error.code,
        "COORDINATION_CONSUMER_FAULT",
      );
      assert.equal(error.message.includes("never-public"), false);
      return true;
    },
  );
  assert.equal(
    business
      .prepare("SELECT COUNT(*) AS count FROM test_business_effects")
      .get()
      .count,
    1,
  );
  assert.equal(acknowledgements.length, 0);
  stores.close();
  business.close();

  now.value = 1100;
  stores = openStores(receiptFile, vaultFile);
  business = openBusinessEffects(businessFile);
  const replacement = createConsumer({
    repository: stores.repository,
    vault: stores.vault,
    handler: durableHandler(business, calls),
    now,
    acknowledgements,
    maxAttempts: 2,
  });
  const result = await replacement.processDelivery(delivery({
    recovered: true,
  }));
  assert.equal(result.status, "processed");
  assert.equal(calls.length, 2);
  assert.equal(
    business
      .prepare("SELECT COUNT(*) AS count FROM test_business_effects")
      .get()
      .count,
    1,
  );
  assert.deepEqual(acknowledgements, [["100-0"]]);
  const receipt = await stores.repository.getReceipt(
    coordinationConsumeKey(BASE_MESSAGE),
  );
  assert.equal(receipt.state, "completed");
  assert.equal(receipt.effect.commitId.startsWith("business-"), true);

  stores.close();
  business.close();
  fs.rmSync(directory, { recursive: true });
});

test("effect receipt committed before ACK survives reopen and redelivery retries ACK only", async () => {
  const directory = taskDirectory();
  const receiptFile = path.join(directory, "receipts.db");
  const vaultFile = path.join(directory, "vault.db");
  const now = { value: 2000 };
  const acknowledgements = [];
  let handlerCalls = 0;
  let stores = openStores(receiptFile, vaultFile);
  let injected = false;
  const crashing = createConsumer({
    repository: stores.repository,
    vault: stores.vault,
    handler: async ({ consumeKey }) => {
      handlerCalls += 1;
      return {
        status: "committed",
        commitId: `effect-${consumeKey.slice(-12)}`,
      };
    },
    now,
    acknowledgements,
    fault(point) {
      if (point === "afterReceipt" && !injected) {
        injected = true;
        throw new Error("crash after receipt");
      }
    },
  });

  await assert.rejects(crashing.processDelivery(delivery()));
  assert.equal(handlerCalls, 1);
  assert.equal(acknowledgements.length, 0);
  assert.equal(
    (await stores.repository.getReceipt(coordinationConsumeKey(BASE_MESSAGE)))
      .state,
    "effect_committed",
  );
  stores.close();

  stores = openStores(receiptFile, vaultFile);
  const replacement = createConsumer({
    repository: stores.repository,
    vault: stores.vault,
    handler: async () => {
      handlerCalls += 1;
      throw new Error("handler must not run for a committed receipt");
    },
    now,
    acknowledgements,
  });
  const duplicate = await replacement.processDelivery(delivery({
    recovered: true,
  }));
  assert.equal(duplicate.status, "duplicate");
  assert.equal(handlerCalls, 1);
  assert.deepEqual(acknowledgements, [["100-0"]]);
  assert.equal(
    (await stores.repository.getReceipt(coordinationConsumeKey(BASE_MESSAGE)))
      .state,
    "completed",
  );

  stores.close();
  fs.rmSync(directory, { recursive: true });
});

test("quarantine receipt and body committed before ACK survive reopen with ACK-only redelivery", async () => {
  const directory = taskDirectory();
  const receiptFile = path.join(directory, "receipts.db");
  const vaultFile = path.join(directory, "vault.db");
  const now = { value: 3000 };
  const acknowledgements = [];
  let handlerCalls = 0;
  let stores = openStores(receiptFile, vaultFile);
  let injected = false;
  const crashing = createConsumer({
    repository: stores.repository,
    vault: stores.vault,
    handler: async () => {
      handlerCalls += 1;
      throw Object.assign(new Error("private poison details"), {
        code: "PERMANENT_PRIVATE_FAILURE",
      });
    },
    now,
    acknowledgements,
    fault(point, context) {
      if (
        point === "afterReceipt"
        && context.outcome === "quarantine"
        && !injected
      ) {
        injected = true;
        throw new Error("crash after quarantine receipt");
      }
    },
  });

  await assert.rejects(crashing.processDelivery(delivery()));
  const consumeKey = coordinationConsumeKey(BASE_MESSAGE);
  const before = await stores.repository.getReceipt(consumeKey);
  assert.equal(before.state, "quarantined");
  assert.equal(JSON.stringify(before).includes(BASE_MESSAGE.body), false);
  assert.equal(JSON.stringify(before).includes("locator"), false);
  const privateRecord = await stores.repository.getQuarantine(
    before.quarantine.quarantineId,
  );
  assert.deepEqual(
    await stores.vault.get({ locator: privateRecord.locator }),
    { body: BASE_MESSAGE.body },
  );
  assert.equal(handlerCalls, 1);
  assert.equal(acknowledgements.length, 0);
  stores.close();

  stores = openStores(receiptFile, vaultFile);
  const replacement = createConsumer({
    repository: stores.repository,
    vault: stores.vault,
    handler: async () => {
      handlerCalls += 1;
      throw new Error("handler must not run");
    },
    now,
    acknowledgements,
  });
  const duplicate = await replacement.processDelivery(delivery({
    recovered: true,
  }));
  assert.equal(duplicate.status, "duplicate");
  assert.equal(handlerCalls, 1);
  assert.deepEqual(acknowledgements, [["100-0"]]);

  stores.close();
  fs.rmSync(directory, { recursive: true });
});

test("real consumer durably quarantines a malformed envelope with no body", async () => {
  const directory = taskDirectory();
  const receiptFile = path.join(directory, "receipts.db");
  const vaultFile = path.join(directory, "vault.db");
  const now = { value: 3500 };
  const acknowledgements = [];
  const stores = openStores(receiptFile, vaultFile);
  let handlerCalls = 0;
  const consumer = createConsumer({
    repository: stores.repository,
    vault: stores.vault,
    handler: async () => {
      handlerCalls += 1;
      throw new Error("malformed input must not reach the handler");
    },
    now,
    acknowledgements,
  });

  const result = await consumer.processDelivery(delivery({
    message: { body: null },
  }));
  assert.equal(result.status, "quarantined");
  assert.equal(handlerCalls, 0);
  assert.deepEqual(acknowledgements, [["100-0"]]);
  const quarantine = await stores.repository.getQuarantine(
    result.quarantineId,
  );
  assert.equal(quarantine.metadata.malformed, true);
  assert.deepEqual(
    await stores.vault.get({ locator: quarantine.locator }),
    { body: null },
  );

  stores.close();
  fs.rmSync(directory, { recursive: true });
});

test("a dangling vault put converges idempotently after reopen", async () => {
  const directory = taskDirectory();
  const receiptFile = path.join(directory, "receipts.db");
  const vaultFile = path.join(directory, "vault.db");
  const now = { value: 4000 };
  const acknowledgements = [];
  let stores = openStores(receiptFile, vaultFile);
  let rejectedOnce = false;
  const interruptedRepository = {
    ...stores.repository,
    commitQuarantine(input) {
      if (!rejectedOnce) {
        rejectedOnce = true;
        throw new Error("crash between vault and receipt");
      }
      return stores.repository.commitQuarantine(input);
    },
  };
  const crashing = createConsumer({
    repository: interruptedRepository,
    vault: stores.vault,
    handler: async () => {
      throw new Error("terminal handler failure");
    },
    now,
    acknowledgements,
  });
  await assert.rejects(crashing.processDelivery(delivery()));
  assert.equal(
    stores.vaultDatabase
      .prepare(
        "SELECT COUNT(*) AS count FROM coordination_quarantine_vault",
      )
      .get()
      .count,
    1,
  );
  assert.equal(
    (await stores.repository.getReceipt(coordinationConsumeKey(BASE_MESSAGE)))
      .state,
    "processing",
  );
  stores.close();

  now.value = 4100;
  stores = openStores(receiptFile, vaultFile);
  const replacement = createConsumer({
    repository: stores.repository,
    vault: stores.vault,
    handler: async () => {
      throw new Error("terminal handler failure");
    },
    now,
    acknowledgements,
  });
  const quarantined = await replacement.processDelivery(delivery({
    recovered: true,
  }));
  assert.equal(quarantined.status, "quarantined");
  assert.equal(
    stores.vaultDatabase
      .prepare(
        "SELECT COUNT(*) AS count FROM coordination_quarantine_vault",
      )
      .get()
      .count,
    1,
  );
  assert.deepEqual(acknowledgements, [["100-0"]]);

  stores.close();
  fs.rmSync(directory, { recursive: true });
});

test("blocked recovery history remains private and one-shot across restarts", async () => {
  const directory = taskDirectory();
  const receiptFile = path.join(directory, "receipts.db");
  const vaultFile = path.join(directory, "vault.db");
  const now = { value: 5000 };
  const acknowledgements = [];
  let stores = openStores(receiptFile, vaultFile);
  let putCalls = 0;
  const failingStore = {
    get: (input) => stores.vault.get(input),
    async put() {
      putCalls += 1;
      throw new Error("vault unavailable with private locator");
    },
  };
  const initial = createConsumer({
    repository: stores.repository,
    vault: stores.vault,
    quarantineStore: failingStore,
    handler: async () => {
      throw new Error("terminal handler failure");
    },
    now,
    acknowledgements,
    maxConsumedRecoveryIdsPerReceipt: 2,
  });
  assert.equal(
    (await initial.processDelivery(delivery())).status,
    "paused",
  );
  assert.equal(putCalls, 1);
  stores.close();

  stores = openStores(receiptFile, vaultFile);
  const recoveryAStore = {
    get: (input) => stores.vault.get(input),
    async put() {
      putCalls += 1;
      throw new Error("vault still unavailable");
    },
  };
  const recoveryA = createConsumer({
    repository: stores.repository,
    vault: stores.vault,
    quarantineStore: recoveryAStore,
    handler: async () => {
      throw new Error("handler must not run during recovery");
    },
    now,
    acknowledgements,
    quarantineRecoveryId: "recovery-a",
    ownerId: "worker-recovery-a",
    maxConsumedRecoveryIdsPerReceipt: 2,
  });
  assert.equal(
    (await recoveryA.processDelivery(delivery({ recovered: true }))).status,
    "paused",
  );
  assert.equal(putCalls, 2);
  stores.close();

  stores = openStores(receiptFile, vaultFile);
  const repeatedA = createConsumer({
    repository: stores.repository,
    vault: stores.vault,
    quarantineStore: {
      get: (input) => stores.vault.get(input),
      async put(input) {
        putCalls += 1;
        return stores.vault.put(input);
      },
    },
    handler: async () => {
      throw new Error("handler must not run during recovery");
    },
    now,
    acknowledgements,
    quarantineRecoveryId: "recovery-a",
    ownerId: "worker-recovery-a-repeat",
    maxConsumedRecoveryIdsPerReceipt: 2,
  });
  assert.equal(
    (await repeatedA.processDelivery(delivery({ recovered: true }))).status,
    "paused",
  );
  assert.equal(putCalls, 2);
  const blockedReceipt = await stores.repository.getReceipt(
    coordinationConsumeKey(BASE_MESSAGE),
  );
  assert.equal(JSON.stringify(blockedReceipt).includes("recovery-a"), false);
  stores.close();

  stores = openStores(receiptFile, vaultFile);
  const recoveryB = createConsumer({
    repository: stores.repository,
    vault: stores.vault,
    quarantineStore: {
      get: (input) => stores.vault.get(input),
      async put(input) {
        putCalls += 1;
        return stores.vault.put(input);
      },
    },
    handler: async () => {
      throw new Error("handler must not run during recovery");
    },
    now,
    acknowledgements,
    quarantineRecoveryId: "recovery-b",
    ownerId: "worker-recovery-b",
    maxConsumedRecoveryIdsPerReceipt: 2,
  });
  assert.equal(
    (await recoveryB.processDelivery(delivery({ recovered: true }))).status,
    "quarantined",
  );
  assert.equal(putCalls, 3);
  assert.deepEqual(acknowledgements, [["100-0"]]);

  stores.close();
  fs.rmSync(directory, { recursive: true });
});

test("authorized replay commit survives reopen and later commands deduplicate", async () => {
  const directory = taskDirectory();
  const receiptFile = path.join(directory, "receipts.db");
  const vaultFile = path.join(directory, "vault.db");
  const now = { value: 6000 };
  const acknowledgements = [];
  let stores = openStores(receiptFile, vaultFile);
  const poisonConsumer = createConsumer({
    repository: stores.repository,
    vault: stores.vault,
    handler: async () => {
      throw new Error("terminal handler failure");
    },
    now,
    acknowledgements,
  });
  const quarantined = await poisonConsumer.processDelivery(delivery());
  const consumeKey = coordinationConsumeKey(BASE_MESSAGE);
  assert.equal(quarantined.status, "quarantined");

  let replayHandlerCalls = 0;
  const authorizeReplay = async ({ command, quarantine }) => ({
    allowed: true,
    commandId: command.commandId,
    quarantineId: quarantine.quarantineId,
    consumeKey: quarantine.consumeKey,
    decisionId: "decision-a",
    principalId: "principal-a",
  });
  const replayConsumer = createConsumer({
    repository: stores.repository,
    vault: stores.vault,
    handler: async ({ consumeKey: replayKey }) => {
      replayHandlerCalls += 1;
      assert.equal(replayKey, consumeKey);
      return {
        status: "committed",
        commitId: "replay-effect-a",
      };
    },
    authorizeReplay,
    now,
    acknowledgements,
  });
  const replayed = await replayConsumer.replay({
    commandId: "command-a",
    quarantineId: quarantined.quarantineId,
    expectedConsumeKey: consumeKey,
  });
  assert.deepEqual(replayed, {
    status: "replayed",
    consumeKey,
    commitId: "replay-effect-a",
  });
  assert.equal(replayHandlerCalls, 1);
  stores.close();

  stores = openStores(receiptFile, vaultFile);
  const reopened = createConsumer({
    repository: stores.repository,
    vault: stores.vault,
    handler: async () => {
      replayHandlerCalls += 1;
      throw new Error("replay handler must not run twice");
    },
    authorizeReplay,
    now,
    acknowledgements,
  });
  const duplicate = await reopened.replay({
    commandId: "command-b",
    quarantineId: quarantined.quarantineId,
    expectedConsumeKey: consumeKey,
  });
  assert.deepEqual(duplicate, {
    status: "duplicate",
    consumeKey,
    commitId: "replay-effect-a",
  });
  assert.equal(replayHandlerCalls, 1);

  const receipt = await stores.repository.getReceipt(consumeKey);
  assert.equal(receipt.state, "replay_committed");
  assert.equal(receipt.replay.state, "committed");
  assert.equal(receipt.replay.commitId, "replay-effect-a");
  assert.equal(JSON.stringify(receipt).includes("coord-vault"), false);
  assert.equal(JSON.stringify(receipt).includes(BASE_MESSAGE.body), false);

  stores.close();
  fs.rmSync(directory, { recursive: true });
});
