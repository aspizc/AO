import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COORDINATION_CONSUMER_REPOSITORY_CONTRACT,
  createInMemoryCoordinationConsumerRepository,
} from "../../gateway/src/core/repositories/coordination_consumer_repo.js";
import {
  SQLITE_COORDINATION_CONSUMER_REPOSITORY_CONTRACT,
  SqliteCoordinationConsumerStoreError,
  createSqliteCoordinationConsumerRepository,
} from "../../gateway/src/core/repositories/sqlite_coordination_consumer_repo.js";
import {
  SQLITE_QUARANTINE_STORE_CONTRACT,
  SqliteQuarantineVaultError,
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
const SQLITE_ADAPTER_SOURCES = Object.freeze([
  {
    name: "repository",
    file: path.join(
      REPO_ROOT,
      "gateway",
      "src",
      "core",
      "repositories",
      "sqlite_coordination_consumer_repo.js",
    ),
  },
  {
    name: "vault",
    file: path.join(
      REPO_ROOT,
      "gateway",
      "src",
      "core",
      "sqlite_quarantine_store.js",
    ),
  },
]);
const require = createRequire(path.join(REPO_ROOT, "gateway", "package.json"));
const Database = require("better-sqlite3");

const MESSAGE = Object.freeze({
  protocolVersion: 1,
  scopeId: "scope-a",
  messageId: "message-a",
  fromParticipantId: "participant-sender",
  toParticipantId: "participant-recipient",
  messageType: "IMPACT_NOTICE",
  classification: "internal",
  body: "private quarantine body token=not-public",
  createdAt: "2026-07-26T08:00:00.000Z",
  traceId: "trace-a",
});

function consumeKey(message = MESSAGE) {
  return `coord-consume-v1-${crypto
    .createHash("sha256")
    .update(JSON.stringify([
      1,
      message.scopeId,
      message.fromParticipantId,
      message.toParticipantId,
      message.messageId,
    ]))
    .digest("hex")}`;
}

function metadata(overrides = {}) {
  return {
    protocolVersion: MESSAGE.protocolVersion,
    scopeId: MESSAGE.scopeId,
    messageId: MESSAGE.messageId,
    fromParticipantId: MESSAGE.fromParticipantId,
    toParticipantId: MESSAGE.toParticipantId,
    messageType: MESSAGE.messageType,
    classification: MESSAGE.classification,
    createdAt: MESSAGE.createdAt,
    traceId: MESSAGE.traceId,
    ...overrides,
  };
}

function taskDirectory() {
  return fs.mkdtempSync(
    path.join(os.tmpdir(), "agents-orchestrator-v5-g002-store-test-"),
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

function openRepository(file) {
  const database = openDatabase(file);
  return {
    database,
    repository: createSqliteCoordinationConsumerRepository({ database }),
  };
}

function openVault(file) {
  const database = openDatabase(file);
  return {
    database,
    vault: createSqliteQuarantineStore({ database }),
  };
}

function openRepositoryPair() {
  const database = openDatabase(":memory:");
  return {
    database,
    memory: createInMemoryCoordinationConsumerRepository(),
    sqlite: createSqliteCoordinationConsumerRepository({ database }),
  };
}

function claimInput(overrides = {}) {
  return {
    consumeKey: consumeKey(),
    deliveryId: "100-0",
    recovered: false,
    metadata: metadata(),
    ownerId: "worker-a",
    now: 1000,
    leaseMs: 100,
    maxConsumedRecoveryIdsPerReceipt: 2,
    ...overrides,
  };
}

async function applyToPair(pair, operation, input) {
  const memoryResult = await pair.memory[operation](structuredClone(input));
  const sqliteResult = await pair.sqlite[operation](structuredClone(input));
  assert.deepEqual(sqliteResult, memoryResult);
  return sqliteResult;
}

async function applyFacetToPair(pair, facet, operation, input) {
  const memoryResult = await pair.memory[facet][operation](
    structuredClone(input),
  );
  const sqliteResult = await pair.sqlite[facet][operation](
    structuredClone(input),
  );
  assert.deepEqual(sqliteResult, memoryResult);
  return sqliteResult;
}

async function confirmDirectAck(repository, {
  consumeKey: key,
  deliveryId,
  ownerId = "ack-owner",
  now,
}) {
  const claim = await repository.directAck.claim({
    consumeKey: key,
    deliveryId,
    ownerId,
    now,
    leaseMs: 100,
  });
  return repository.directAck.commit({
    consumeKey: key,
    deliveryId,
    ownerId,
    claimToken: claim.claimToken,
    now,
  });
}

async function quarantineReceipt(repository, overrides = {}) {
  const claimed = await repository.claim(claimInput(overrides));
  await repository.commitQuarantine({
    consumeKey: consumeKey(),
    ownerId: overrides.ownerId ?? "worker-a",
    claimToken: claimed.claimToken,
    quarantineId: "quarantine-a",
    locator: "coord-vault-v1-private-locator",
    reasonCode: "HANDLER_TERMINAL",
    now: (overrides.now ?? 1000) + 1,
  });
  return claimed;
}

async function createStateFixture(state) {
  const database = openDatabase(":memory:");
  const repository = createSqliteCoordinationConsumerRepository({ database });
  const claimed = await repository.claim(claimInput());
  if (state === "processing") {
    return { database, repository };
  }
  if (state === "effect_committed" || state === "completed_effect") {
    await repository.commitEffect({
      consumeKey: consumeKey(),
      ownerId: "worker-a",
      claimToken: claimed.claimToken,
      commitId: "effect-a",
      now: 1001,
    });
    if (state === "completed_effect") {
      await repository.prepareAck({
        consumeKey: consumeKey(),
        deliveryId: "100-0",
        now: 1002,
      });
      await confirmDirectAck(repository, {
        consumeKey: consumeKey(),
        deliveryId: "100-0",
        now: 1002,
      });
    }
    return { database, repository };
  }
  if (state === "quarantine_blocked") {
    await repository.blockQuarantine({
      consumeKey: consumeKey(),
      ownerId: "worker-a",
      claimToken: claimed.claimToken,
      reasonCode: "HANDLER_TERMINAL",
      now: 1001,
    });
    return { database, repository };
  }
  await repository.commitQuarantine({
    consumeKey: consumeKey(),
    ownerId: "worker-a",
    claimToken: claimed.claimToken,
    quarantineId: "quarantine-a",
    locator: "coord-vault-v1-private-locator",
    reasonCode: "HANDLER_TERMINAL",
    now: 1001,
  });
  if (state === "completed_quarantine") {
    await repository.prepareAck({
      consumeKey: consumeKey(),
      deliveryId: "100-0",
      now: 1002,
    });
    await confirmDirectAck(repository, {
      consumeKey: consumeKey(),
      deliveryId: "100-0",
      now: 1002,
    });
  }
  if (state === "replay_committed") {
    const replay = await repository.beginReplay({
      quarantineId: "quarantine-a",
      commandId: "command-a",
      decisionId: "decision-a",
      principalId: "principal-a",
      ownerId: "replayer-a",
      now: 1002,
      leaseMs: 100,
    });
    await repository.commitReplay({
      quarantineId: "quarantine-a",
      commandId: "command-a",
      ownerId: "replayer-a",
      replayClaimToken: replay.replayClaimToken,
      commitId: "replay-effect-a",
      now: 1003,
    });
  }
  return { database, repository };
}

function withIgnoredChecks(database, action) {
  database.pragma("ignore_check_constraints = ON");
  try {
    action();
  } finally {
    database.pragma("ignore_check_constraints = OFF");
  }
}

async function assertCorrupt(repository, canary) {
  await assert.rejects(
    repository.getReceipt(consumeKey()),
    (error) => {
      assert.equal(error.code, "COORDINATION_CONSUMER_STORE_CORRUPT");
      assert.equal(
        error.message,
        "coordination consumer store state is invalid",
      );
      const serialized = `${error.name}${error.message}${JSON.stringify(error)}`;
      assert.equal(serialized.includes(canary), false);
      return true;
    },
  );
}

async function assertStoreFailure(operation, canaries = []) {
  await assert.rejects(
    operation(),
    (error) => {
      assert.equal(error.name, "SqliteCoordinationConsumerStoreError");
      assert.equal(error.code, "COORDINATION_CONSUMER_STORE_FAILED");
      assert.equal(
        error.message,
        "coordination consumer store operation failed safely",
      );
      const serialized = `${error.name}${error.message}${JSON.stringify(error)}`;
      for (const canary of canaries) {
        assert.equal(serialized.includes(canary), false);
      }
      return true;
    },
  );
}

async function assertVaultFailure(operation, canaries = []) {
  await assert.rejects(
    operation(),
    (error) => {
      assert.equal(error.name, "SqliteQuarantineVaultError");
      assert.equal(error.code, "COORDINATION_QUARANTINE_VAULT_FAILED");
      assert.equal(
        error.message,
        "coordination quarantine vault operation failed safely",
      );
      const serialized = `${error.name}${error.message}${JSON.stringify(error)}`;
      for (const canary of canaries) {
        assert.equal(serialized.includes(canary), false);
      }
      return true;
    },
  );
}

async function captureError(operation) {
  let captured;
  let didThrow = false;
  try {
    await operation();
  } catch (error) {
    captured = error;
    didThrow = true;
  }
  assert.equal(didThrow, true, "operation must reject");
  return captured;
}

function hostileDatabase(error) {
  return {
    backend: "sqlite",
    pragma() {},
    prepare() {
      throw error;
    },
    transaction(action) {
      return {
        immediate() {
          return action();
        },
        deferred() {
          return action();
        },
      };
    },
  };
}

function interceptableDatabase(rawDatabase) {
  let nextDependencyError;
  let nextPrepareHook;
  const database = {
    backend: "sqlite",
    pragma(...args) {
      return rawDatabase.pragma(...args);
    },
    prepare(sql) {
      const hook = nextPrepareHook;
      nextPrepareHook = undefined;
      if (hook) hook();
      if (nextDependencyError !== undefined) {
        const error = nextDependencyError;
        nextDependencyError = undefined;
        throw error;
      }
      return rawDatabase.prepare(sql);
    },
    transaction(action) {
      return rawDatabase.transaction(action);
    },
  };
  return {
    database,
    inject(error) {
      nextDependencyError = error;
    },
    beforeNextPrepare(hook) {
      nextPrepareHook = hook;
    },
  };
}

function openInterceptableAdapters() {
  const rawDatabase = openDatabase(":memory:");
  const intercepted = interceptableDatabase(rawDatabase);
  return {
    ...intercepted,
    rawDatabase,
    repository: createSqliteCoordinationConsumerRepository({
      database: intercepted.database,
    }),
    vault: createSqliteQuarantineStore({
      database: intercepted.database,
    }),
  };
}

function assertCapturedContract(error, expected) {
  assert.equal(error.name, expected.name);
  assert.equal(error.message, expected.message);
  if (Object.hasOwn(expected, "code")) {
    assert.equal(error.code, expected.code);
  }
}

function assertFreshFixedFailure(error, previous, kind, canaries = []) {
  assert.notStrictEqual(error, previous);
  if (kind === "repository") {
    assertCapturedContract(error, {
      name: "SqliteCoordinationConsumerStoreError",
      code: "COORDINATION_CONSUMER_STORE_FAILED",
      message: "coordination consumer store operation failed safely",
    });
  } else {
    assertCapturedContract(error, {
      name: "SqliteQuarantineVaultError",
      code: "COORDINATION_QUARANTINE_VAULT_FAILED",
      message: "coordination quarantine vault operation failed safely",
    });
  }
  const serialized = `${error.name}${error.message}${JSON.stringify(error)}`;
  for (const canary of canaries) {
    assert.equal(serialized.includes(canary), false);
  }
}

async function assertReplayedErrorIsUntrusted({
  kind,
  capture,
  expected,
}) {
  const fixture = openInterceptableAdapters();
  try {
    const captured = await capture(fixture);
    assertCapturedContract(captured, expected);
    const canary = `replayed-${kind}-${expected.code ?? expected.name}`;
    captured.replayedContext = canary;
    fixture.inject(captured);

    const operation = kind === "repository"
      ? () => fixture.repository.getReceipt(consumeKey())
      : () => fixture.vault.get({
          locator: `coord-vault-v1-${"a".repeat(64)}`,
        });
    const mapped = await captureError(operation);
    assert.notStrictEqual(mapped, captured);
    if (kind === "repository") {
      assert.equal(mapped.name, "SqliteCoordinationConsumerStoreError");
      assert.equal(mapped.code, "COORDINATION_CONSUMER_STORE_FAILED");
      assert.equal(
        mapped.message,
        "coordination consumer store operation failed safely",
      );
    } else {
      assert.equal(mapped.name, "SqliteQuarantineVaultError");
      assert.equal(mapped.code, "COORDINATION_QUARANTINE_VAULT_FAILED");
      assert.equal(
        mapped.message,
        "coordination quarantine vault operation failed safely",
      );
    }
    const serialized = `${mapped.name}${mapped.message}${JSON.stringify(mapped)}`;
    assert.equal(serialized.includes(canary), false);
    if (expected.message !== mapped.message) {
      assert.equal(serialized.includes(expected.message), false);
    }
    if (expected.code && expected.code !== mapped.code) {
      assert.equal(serialized.includes(expected.code), false);
    }
  } finally {
    fixture.rawDatabase.close();
  }
}

function publicTablesSnapshot(database) {
  return {
    receipts: database
      .prepare("SELECT * FROM coordination_consumer_receipts ORDER BY consume_key")
      .all(),
    deliveries: database
      .prepare(
        "SELECT * FROM coordination_consumer_deliveries "
        + "ORDER BY consume_key, observed_order",
      )
      .all(),
    recovery: database
      .prepare(
        "SELECT * FROM coordination_consumer_recovery_history "
        + "ORDER BY consume_key, recovery_order",
      )
      .all(),
    privateQuarantine: database
      .prepare(
        "SELECT * FROM coordination_consumer_quarantine_private "
        + "ORDER BY consume_key",
      )
      .all(),
    replay: database
      .prepare("SELECT * FROM coordination_consumer_replays ORDER BY consume_key")
      .all(),
  };
}

test("SQLite descriptors make only the durable baseline claims", () => {
  assert.deepEqual(SQLITE_COORDINATION_CONSUMER_REPOSITORY_CONTRACT, {
    durable: true,
    atomicWithBusinessEffect: false,
    bodyStorage: false,
    backend: "sqlite",
    purpose: "durable-coordination-consumer-baseline",
    maxConsumedRecoveryIdsPerReceipt: 8,
  });
  assert.deepEqual(SQLITE_QUARANTINE_STORE_CONTRACT, {
    durable: true,
    backend: "sqlite",
    keyedBy: "consumeKey",
    opaqueCanonicalLocator: true,
  });
  assert.equal(
    Object.isFrozen(SQLITE_COORDINATION_CONSUMER_REPOSITORY_CONTRACT),
    true,
  );
  assert.equal(Object.isFrozen(SQLITE_QUARANTINE_STORE_CONTRACT), true);
  assert.equal(
    SQLITE_COORDINATION_CONSUMER_REPOSITORY_CONTRACT
      .atomicWithBusinessEffect,
    false,
  );
  assert.equal(COORDINATION_CONSUMER_REPOSITORY_CONTRACT.durable, false);
});

test("SQLite adapters reject non-SQLite backends explicitly", () => {
  const postgresShaped = {
    backend: "postgres",
    prepare() {},
    transaction() {},
  };

  assert.throws(
    () => createSqliteCoordinationConsumerRepository({
      database: postgresShaped,
    }),
    /SQLite backend is required/,
  );
  assert.throws(
    () => createSqliteQuarantineStore({ database: postgresShaped }),
    /SQLite backend is required/,
  );
});

test("migration is idempotent, constrained, indexed, and keeps bodies and locators out of receipts", () => {
  const directory = taskDirectory();
  const file = path.join(directory, "migration.db");
  const database = openDatabase(file);
  for (const migration of MIGRATIONS) {
    database.exec(fs.readFileSync(migration, "utf8"));
  }

  const tables = new Set(
    database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map(({ name }) => name),
  );
  for (const table of [
    "coordination_consumer_receipts",
    "coordination_consumer_deliveries",
    "coordination_consumer_recovery_history",
    "coordination_consumer_quarantine_private",
    "coordination_consumer_replays",
    "coordination_quarantine_vault",
  ]) {
    assert.equal(tables.has(table), true, `missing table ${table}`);
  }

  const receiptColumns = database
    .prepare("PRAGMA table_info(coordination_consumer_receipts)")
    .all()
    .map(({ name }) => name);
  assert.equal(receiptColumns.some((name) => /body|locator|json/i.test(name)), false);

  const indexes = new Set(
    database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all()
      .map(({ name }) => name),
  );
  for (const index of [
    "idx_coord_consumer_delivery_ack",
    "idx_coord_consumer_quarantine_id",
    "idx_coord_consumer_replay_state",
    "idx_coord_quarantine_vault_locator",
  ]) {
    assert.equal(indexes.has(index), true, `missing index ${index}`);
  }

  database.close();
  fs.rmSync(directory, { recursive: true });
});

test("SQLite repository preserves the in-memory port projection for every transition", async () => {
  const directory = taskDirectory();
  const file = path.join(directory, "receipts.db");
  const { database, repository } = openRepository(file);
  const memory = createInMemoryCoordinationConsumerRepository();

  const compare = async (operation, input) => {
    const [expected, actual] = await Promise.all([
      memory[operation](structuredClone(input)),
      repository[operation](structuredClone(input)),
    ]);
    assert.deepEqual(actual, expected, operation);
    return actual;
  };

  const first = await compare("claim", claimInput());
  assert.equal(first.claimToken, "claim-1");
  await compare("claim", claimInput({
    deliveryId: "101-0",
    recovered: true,
    ownerId: "worker-b",
    now: 1001,
  }));
  const replacement = await compare("claim", claimInput({
    deliveryId: "102-0",
    recovered: true,
    ownerId: "worker-b",
    now: 1100,
  }));
  assert.equal(replacement.claimToken, "claim-2");
  await compare("recordAttempt", {
    consumeKey: consumeKey(),
    ownerId: "worker-b",
    claimToken: replacement.claimToken,
    now: 1101,
    leaseMs: 100,
  });
  await compare("blockQuarantine", {
    consumeKey: consumeKey(),
    ownerId: "worker-b",
    claimToken: replacement.claimToken,
    reasonCode: "HANDLER_TERMINAL",
    now: 1102,
  });
  const recovery = await compare("claimBlockedQuarantine", {
    consumeKey: consumeKey(),
    ownerId: "worker-c",
    recoveryId: "recovery-a",
    now: 1103,
    leaseMs: 100,
  });
  await compare("blockQuarantine", {
    consumeKey: consumeKey(),
    ownerId: "worker-c",
    claimToken: recovery.claimToken,
    reasonCode: "HANDLER_TERMINAL",
    now: 1104,
  });
  await compare("claimBlockedQuarantine", {
    consumeKey: consumeKey(),
    ownerId: "worker-d",
    recoveryId: "recovery-a",
    now: 1105,
    leaseMs: 100,
  });
  const secondRecovery = await compare("claimBlockedQuarantine", {
    consumeKey: consumeKey(),
    ownerId: "worker-d",
    recoveryId: "recovery-b",
    now: 1105,
    leaseMs: 100,
  });
  await compare("commitQuarantine", {
    consumeKey: consumeKey(),
    ownerId: "worker-d",
    claimToken: secondRecovery.claimToken,
    quarantineId: "quarantine-a",
    locator: "coord-vault-v1-private-locator",
    reasonCode: "HANDLER_TERMINAL",
    now: 1106,
  });
  await compare("prepareAck", {
    consumeKey: consumeKey(),
    deliveryId: "102-0",
    now: 1107,
  });
  const directClaim = await applyFacetToPair(
    { memory, sqlite: repository },
    "directAck",
    "claim",
    {
      consumeKey: consumeKey(),
      deliveryId: "102-0",
      ownerId: "ack-owner",
      now: 1108,
      leaseMs: 100,
    },
  );
  await applyFacetToPair(
    { memory, sqlite: repository },
    "directAck",
    "commit",
    {
      consumeKey: consumeKey(),
      deliveryId: "102-0",
      ownerId: "ack-owner",
      claimToken: directClaim.claimToken,
      now: 1108,
    },
  );
  await compare("getReceipt", consumeKey());
  await compare("getQuarantine", "quarantine-a");

  const replay = await compare("beginReplay", {
    quarantineId: "quarantine-a",
    commandId: "command-a",
    decisionId: "decision-a",
    principalId: "principal-a",
    ownerId: "replayer-a",
    now: 1200,
    leaseMs: 100,
  });
  await compare("failReplay", {
    quarantineId: "quarantine-a",
    commandId: "command-a",
    ownerId: "replayer-a",
    replayClaimToken: replay.replayClaimToken,
    failureCode: "REPLAY_SOURCE_UNAVAILABLE",
    now: 1201,
  });
  const retriedReplay = await compare("beginReplay", {
    quarantineId: "quarantine-a",
    commandId: "command-a",
    decisionId: "decision-a",
    principalId: "principal-a",
    ownerId: "replayer-b",
    now: 1202,
    leaseMs: 100,
  });
  await compare("commitReplay", {
    quarantineId: "quarantine-a",
    commandId: "command-a",
    ownerId: "replayer-b",
    replayClaimToken: retriedReplay.replayClaimToken,
    commitId: "effect-replay-a",
    now: 1203,
  });
  await compare("beginReplay", {
    quarantineId: "quarantine-a",
    commandId: "command-b",
    decisionId: "decision-b",
    principalId: "principal-b",
    ownerId: "replayer-c",
    now: 1204,
    leaseMs: 100,
  });

  database.close();
  fs.rmSync(directory, { recursive: true });
});

test("claims, blocked recovery, attempts, and ACK state survive close and reopen", async () => {
  const directory = taskDirectory();
  const file = path.join(directory, "durable.db");
  let opened = openRepository(file);
  const claimed = await opened.repository.claim(claimInput());
  await opened.repository.recordAttempt({
    consumeKey: consumeKey(),
    ownerId: "worker-a",
    claimToken: claimed.claimToken,
    now: 1001,
    leaseMs: 100,
  });
  await opened.repository.blockQuarantine({
    consumeKey: consumeKey(),
    ownerId: "worker-a",
    claimToken: claimed.claimToken,
    reasonCode: "RETRY_EXHAUSTED",
    now: 1002,
  });
  const recovery = await opened.repository.claimBlockedQuarantine({
    consumeKey: consumeKey(),
    ownerId: "worker-b",
    recoveryId: "recovery-a",
    now: 1003,
    leaseMs: 100,
  });
  await opened.repository.blockQuarantine({
    consumeKey: consumeKey(),
    ownerId: "worker-b",
    claimToken: recovery.claimToken,
    reasonCode: "RETRY_EXHAUSTED",
    now: 1004,
  });
  opened.database.close();

  opened = openRepository(file);
  const sameRecovery = await opened.repository.claimBlockedQuarantine({
    consumeKey: consumeKey(),
    ownerId: "worker-c",
    recoveryId: "recovery-a",
    now: 1005,
    leaseMs: 100,
  });
  assert.equal(sameRecovery.status, "blocked");
  const secondRecovery = await opened.repository.claimBlockedQuarantine({
    consumeKey: consumeKey(),
    ownerId: "worker-c",
    recoveryId: "recovery-b",
    now: 1005,
    leaseMs: 100,
  });
  await opened.repository.commitQuarantine({
    consumeKey: consumeKey(),
    ownerId: "worker-c",
    claimToken: secondRecovery.claimToken,
    quarantineId: "quarantine-durable",
    locator: "coord-vault-v1-durable-private",
    reasonCode: "RETRY_EXHAUSTED",
    now: 1006,
  });
  await opened.repository.prepareAck({
    consumeKey: consumeKey(),
    deliveryId: "100-0",
    now: 1007,
  });
  opened.database.close();

  opened = openRepository(file);
  const prepared = await opened.repository.getReceipt(consumeKey());
  assert.equal(prepared.attempts, 1);
  assert.equal(prepared.state, "quarantined");
  assert.equal(prepared.deliveries[0].ackState, "acknowledging");
  assert.equal(
    Object.hasOwn(prepared, "consumedRecoveryIds"),
    false,
  );
  assert.equal(JSON.stringify(prepared).includes("recovery-a"), false);
  await confirmDirectAck(opened.repository, {
    consumeKey: consumeKey(),
    deliveryId: "100-0",
    now: 1008,
  });
  opened.database.close();

  opened = openRepository(file);
  const committed = await opened.repository.getReceipt(consumeKey());
  assert.equal(committed.state, "completed");
  assert.equal(committed.deliveries[0].ackState, "acked");
  assert.equal(committed.deliveries[0].ackedAt, 1008);
  opened.database.close();
  fs.rmSync(directory, { recursive: true });
});

test("two connections elect one claim and stale owner-token pairs cannot mutate", async () => {
  const directory = taskDirectory();
  const file = path.join(directory, "contended.db");
  const first = openRepository(file);
  const second = openRepository(file);

  const winner = await first.repository.claim(claimInput());
  const busy = await second.repository.claim(claimInput({
    deliveryId: "101-0",
    ownerId: "worker-b",
    now: 1001,
  }));
  assert.equal(winner.status, "claimed");
  assert.equal(busy.status, "busy");

  const beforeRelease = publicTablesSnapshot(first.database);
  const rejectedRelease = await first.repository.releaseClaim({
    consumeKey: consumeKey(),
    ownerId: "worker-a",
    claimToken: "claim-999",
    now: 1002,
  });
  assert.equal(rejectedRelease.lease.expiresAt, 1100);
  assert.deepEqual(publicTablesSnapshot(first.database), beforeRelease);
  const released = await first.repository.releaseClaim({
    consumeKey: consumeKey(),
    ownerId: "worker-a",
    claimToken: winner.claimToken,
    now: 1002,
  });
  assert.equal(released.lease.expiresAt, 1002);

  const replacement = await second.repository.claim(claimInput({
    deliveryId: "102-0",
    ownerId: "worker-a",
    now: 1002,
  }));
  assert.equal(replacement.status, "claimed");
  assert.equal(replacement.claimToken, "claim-2");

  const before = publicTablesSnapshot(first.database);
  await assert.rejects(
    first.repository.commitEffect({
      consumeKey: consumeKey(),
      ownerId: "worker-a",
      claimToken: winner.claimToken,
      commitId: "stale-effect",
      now: 1003,
    }),
    /not owned/,
  );
  await assert.rejects(
    first.repository.recordAttempt({
      consumeKey: consumeKey(),
      ownerId: "worker-a",
      claimToken: winner.claimToken,
      now: 1003,
      leaseMs: 100,
    }),
    /not owned/,
  );
  await assert.rejects(
    first.repository.commitQuarantine({
      consumeKey: consumeKey(),
      ownerId: "worker-a",
      claimToken: winner.claimToken,
      quarantineId: "stale-quarantine",
      locator: "stale-private-locator",
      reasonCode: "HANDLER_TERMINAL",
      now: 1003,
    }),
    /not owned/,
  );
  await assert.rejects(
    first.repository.blockQuarantine({
      consumeKey: consumeKey(),
      ownerId: "worker-a",
      claimToken: winner.claimToken,
      reasonCode: "HANDLER_TERMINAL",
      now: 1003,
    }),
    /not owned/,
  );
  const staleRelease = await first.repository.releaseClaim({
    consumeKey: consumeKey(),
    ownerId: "worker-a",
    claimToken: winner.claimToken,
    now: 1003,
  });
  assert.equal(staleRelease.lease.expiresAt, 1102);
  assert.deepEqual(publicTablesSnapshot(first.database), before);

  await second.repository.commitEffect({
    consumeKey: consumeKey(),
    ownerId: "worker-a",
    claimToken: replacement.claimToken,
    commitId: "winning-effect",
    now: 1004,
  });
  const receipt = await first.repository.getReceipt(consumeKey());
  assert.deepEqual(receipt.effect, {
    commitId: "winning-effect",
    committedAt: 1004,
  });

  first.database.close();
  second.database.close();
  fs.rmSync(directory, { recursive: true });
});

test("two replay connections elect one claimant and fence stale replay tokens", async () => {
  const directory = taskDirectory();
  const file = path.join(directory, "replay.db");
  const first = openRepository(file);
  const second = openRepository(file);
  await quarantineReceipt(first.repository);

  const winner = await first.repository.beginReplay({
    quarantineId: "quarantine-a",
    commandId: "command-a",
    decisionId: "decision-a",
    principalId: "principal-a",
    ownerId: "same-owner",
    now: 2000,
    leaseMs: 100,
  });
  const busy = await second.repository.beginReplay({
    quarantineId: "quarantine-a",
    commandId: "command-a",
    decisionId: "decision-a",
    principalId: "principal-a",
    ownerId: "other-owner",
    now: 2001,
    leaseMs: 100,
  });
  assert.equal(winner.status, "claimed");
  assert.equal(busy.status, "busy");

  const replacement = await second.repository.beginReplay({
    quarantineId: "quarantine-a",
    commandId: "command-a",
    decisionId: "decision-a",
    principalId: "principal-a",
    ownerId: "same-owner",
    now: 2100,
    leaseMs: 100,
  });
  assert.equal(replacement.replayClaimToken, "replay-claim-2");

  const before = publicTablesSnapshot(first.database);
  await assert.rejects(
    first.repository.commitReplay({
      quarantineId: "quarantine-a",
      commandId: "command-a",
      ownerId: "same-owner",
      replayClaimToken: winner.replayClaimToken,
      commitId: "stale-replay-effect",
      now: 2101,
    }),
    /not owned/,
  );
  await assert.rejects(
    first.repository.failReplay({
      quarantineId: "quarantine-a",
      commandId: "command-a",
      ownerId: "same-owner",
      replayClaimToken: winner.replayClaimToken,
      failureCode: "REPLAY_SOURCE_UNAVAILABLE",
      now: 2101,
    }),
    /not owned/,
  );
  assert.deepEqual(publicTablesSnapshot(first.database), before);

  await second.repository.commitReplay({
    quarantineId: "quarantine-a",
    commandId: "command-a",
    ownerId: "same-owner",
    replayClaimToken: replacement.replayClaimToken,
    commitId: "winning-replay-effect",
    now: 2102,
  });
  first.database.close();
  second.database.close();

  const reopened = openRepository(file);
  const duplicate = await reopened.repository.beginReplay({
    quarantineId: "quarantine-a",
    commandId: "another-command",
    decisionId: "another-decision",
    principalId: "another-principal",
    ownerId: "another-owner",
    now: 2200,
    leaseMs: 100,
  });
  assert.equal(duplicate.status, "duplicate");
  assert.equal(
    duplicate.receipt.replay.commitId,
    "winning-replay-effect",
  );
  reopened.database.close();
  fs.rmSync(directory, { recursive: true });
});

const OVERFLOW = Object.freeze({
  now: Number.MAX_SAFE_INTEGER,
  leaseMs: 1,
});

function replayInput(overrides = {}) {
  return {
    quarantineId: "quarantine-a",
    commandId: "command-a",
    decisionId: "decision-a",
    principalId: "principal-a",
    ownerId: "replayer-a",
    now: 10,
    leaseMs: 10,
    ...overrides,
  };
}

async function pairToEffect(pair) {
  const claimed = await applyToPair(
    pair,
    "claim",
    claimInput({ now: 0, leaseMs: 10 }),
  );
  await applyToPair(pair, "commitEffect", {
    consumeKey: consumeKey(),
    ownerId: "worker-a",
    claimToken: claimed.claimToken,
    commitId: "effect-a",
    now: 1,
  });
}

async function pairToBlocked(pair) {
  const claimed = await applyToPair(
    pair,
    "claim",
    claimInput({ now: 0, leaseMs: 10 }),
  );
  await applyToPair(pair, "blockQuarantine", {
    consumeKey: consumeKey(),
    ownerId: "worker-a",
    claimToken: claimed.claimToken,
    reasonCode: "HANDLER_TERMINAL",
    now: 1,
  });
}

async function pairToQuarantined(pair) {
  await Promise.all([
    quarantineReceipt(pair.memory),
    quarantineReceipt(pair.sqlite),
  ]);
}

const OVERFLOW_OUTCOME_CASES = [
  ["completed claim", "committed", async (pair) => {
    await pairToEffect(pair);
    return applyToPair(pair, "claim", claimInput({
      ...OVERFLOW,
      deliveryId: "101-0",
      recovered: true,
      ownerId: "worker-b",
    }));
  }],
  ["blocked claim", "blocked", async (pair) => {
    await pairToBlocked(pair);
    return applyToPair(pair, "claim", claimInput({
      ...OVERFLOW,
      deliveryId: "101-0",
      recovered: true,
      ownerId: "worker-b",
    }));
  }],
  ["busy claim", "busy", async (pair) => {
    await applyToPair(pair, "claim", claimInput({
      now: Number.MAX_SAFE_INTEGER - 20,
      leaseMs: 20,
    }));
    return applyToPair(pair, "claim", claimInput({
      deliveryId: "101-0",
      recovered: true,
      ownerId: "worker-b",
      now: Number.MAX_SAFE_INTEGER - 10,
      leaseMs: 20,
    }));
  }],
  ["completed blocked recovery", "committed", async (pair) => {
    await pairToEffect(pair);
    return applyToPair(pair, "claimBlockedQuarantine", {
      consumeKey: consumeKey(),
      ownerId: "worker-b",
      recoveryId: "recovery-a",
      ...OVERFLOW,
    });
  }],
  ["already-consumed blocked recovery", "blocked", async (pair) => {
    await pairToBlocked(pair);
    const recovery = await applyToPair(pair, "claimBlockedQuarantine", {
      consumeKey: consumeKey(),
      ownerId: "worker-b",
      recoveryId: "recovery-a",
      now: 2,
      leaseMs: 10,
    });
    await applyToPair(pair, "blockQuarantine", {
      consumeKey: consumeKey(),
      ownerId: "worker-b",
      claimToken: recovery.claimToken,
      reasonCode: "HANDLER_TERMINAL",
      now: 3,
    });
    return applyToPair(pair, "claimBlockedQuarantine", {
      consumeKey: consumeKey(),
      ownerId: "worker-c",
      recoveryId: "recovery-a",
      ...OVERFLOW,
    });
  }],
  ["busy blocked recovery", "busy", async (pair) => {
    await pairToBlocked(pair);
    await applyToPair(pair, "claimBlockedQuarantine", {
      consumeKey: consumeKey(),
      ownerId: "worker-b",
      recoveryId: "recovery-a",
      now: Number.MAX_SAFE_INTEGER - 20,
      leaseMs: 20,
    });
    return applyToPair(pair, "claimBlockedQuarantine", {
      consumeKey: consumeKey(),
      ownerId: "worker-c",
      recoveryId: "recovery-b",
      now: Number.MAX_SAFE_INTEGER - 10,
      leaseMs: 20,
    });
  }],
  ["missing replay", "not_found", (pair) => applyToPair(
    pair,
    "beginReplay",
    replayInput({ quarantineId: "quarantine-missing", ...OVERFLOW }),
  )],
  ["duplicate replay", "duplicate", async (pair) => {
    await pairToQuarantined(pair);
    const replay = await applyToPair(pair, "beginReplay", replayInput());
    await applyToPair(pair, "commitReplay", {
      quarantineId: "quarantine-a",
      commandId: "command-a",
      ownerId: "replayer-a",
      replayClaimToken: replay.replayClaimToken,
      commitId: "replay-effect-a",
      now: 11,
    });
    return applyToPair(pair, "beginReplay", replayInput({
      commandId: "command-b",
      decisionId: "decision-b",
      principalId: "principal-b",
      ownerId: "replayer-b",
      ...OVERFLOW,
    }));
  }],
  ["conflicting replay", "conflict", async (pair) => {
    await pairToQuarantined(pair);
    await applyToPair(pair, "beginReplay", replayInput());
    return applyToPair(pair, "beginReplay", replayInput({
      commandId: "command-b",
      decisionId: "decision-b",
      principalId: "principal-b",
      ownerId: "replayer-b",
      ...OVERFLOW,
    }));
  }],
  ["busy replay", "busy", async (pair) => {
    await pairToQuarantined(pair);
    await applyToPair(pair, "beginReplay", replayInput({
      now: Number.MAX_SAFE_INTEGER - 20,
      leaseMs: 20,
    }));
    return applyToPair(pair, "beginReplay", replayInput({
      ownerId: "replayer-b",
      now: Number.MAX_SAFE_INTEGER - 10,
      leaseMs: 20,
    }));
  }],
];

for (const [name, expectedStatus, run] of OVERFLOW_OUTCOME_CASES) {
  test(`overflowing expiry preserves ${name} parity`, async () => {
    const pair = openRepositoryPair();
    const result = await run(pair);
    assert.equal(result.status, expectedStatus);
    pair.database.close();
  });
}

test("winning expiry overflow rolls back every durable lease transition", async () => {
  const cases = [];

  {
    const database = openDatabase(":memory:");
    const repository = createSqliteCoordinationConsumerRepository({ database });
    cases.push({
      database,
      repository,
      before: publicTablesSnapshot(database),
      operation: () => repository.claim(claimInput({
        now: Number.MAX_SAFE_INTEGER,
        leaseMs: 1,
      })),
    });
  }
  {
    const database = openDatabase(":memory:");
    const repository = createSqliteCoordinationConsumerRepository({ database });
    await repository.claim(claimInput({ now: 0, leaseMs: 1 }));
    cases.push({
      database,
      repository,
      before: publicTablesSnapshot(database),
      operation: () => repository.claim(claimInput({
        deliveryId: "101-0",
        recovered: true,
        ownerId: "worker-b",
        now: Number.MAX_SAFE_INTEGER,
        leaseMs: 1,
      })),
    });
  }
  {
    const database = openDatabase(":memory:");
    const repository = createSqliteCoordinationConsumerRepository({ database });
    const claimed = await repository.claim(claimInput({
      now: 0,
      leaseMs: 10,
    }));
    await repository.blockQuarantine({
      consumeKey: consumeKey(),
      ownerId: "worker-a",
      claimToken: claimed.claimToken,
      reasonCode: "HANDLER_TERMINAL",
      now: 1,
    });
    cases.push({
      database,
      repository,
      before: publicTablesSnapshot(database),
      operation: () => repository.claimBlockedQuarantine({
        consumeKey: consumeKey(),
        ownerId: "worker-b",
        recoveryId: "recovery-a",
        now: Number.MAX_SAFE_INTEGER,
        leaseMs: 1,
      }),
    });
  }
  {
    const database = openDatabase(":memory:");
    const repository = createSqliteCoordinationConsumerRepository({ database });
    await quarantineReceipt(repository);
    cases.push({
      database,
      repository,
      before: publicTablesSnapshot(database),
      operation: () => repository.beginReplay({
        quarantineId: "quarantine-a",
        commandId: "command-a",
        decisionId: "decision-a",
        principalId: "principal-a",
        ownerId: "replayer-a",
        now: Number.MAX_SAFE_INTEGER,
        leaseMs: 1,
      }),
    });
  }
  {
    const database = openDatabase(":memory:");
    const repository = createSqliteCoordinationConsumerRepository({ database });
    const claimed = await repository.claim(claimInput({
      now: 0,
      leaseMs: 10,
    }));
    cases.push({
      database,
      repository,
      before: publicTablesSnapshot(database),
      operation: () => repository.recordAttempt({
        consumeKey: consumeKey(),
        ownerId: "worker-a",
        claimToken: claimed.claimToken,
        now: Number.MAX_SAFE_INTEGER,
        leaseMs: 1,
      }),
    });
  }

  for (const item of cases) {
    await assert.rejects(
      item.operation(),
      (error) => {
        assert.equal(error.name, "TypeError");
        assert.equal(
          error.message,
          "claim expiry exceeds the safe integer range",
        );
        return true;
      },
    );
    assert.deepEqual(publicTablesSnapshot(item.database), item.before);
    item.database.close();
  }
});

test("quarantine locator stays private while exact private lookup remains available", async () => {
  const directory = taskDirectory();
  const file = path.join(directory, "private.db");
  const { database, repository } = openRepository(file);
  await quarantineReceipt(repository);

  const receipt = await repository.getReceipt(consumeKey());
  const serializedReceipt = JSON.stringify(receipt);
  assert.equal(serializedReceipt.includes("private-locator"), false);
  assert.equal(serializedReceipt.includes(MESSAGE.body), false);

  const quarantine = await repository.getQuarantine("quarantine-a");
  assert.equal(quarantine.locator, "coord-vault-v1-private-locator");
  assert.equal(
    JSON.stringify({
      ...quarantine,
      locator: undefined,
    }).includes(MESSAGE.body),
    false,
  );
  assert.equal(await repository.getQuarantine("quarantine-missing"), null);

  database.close();
  fs.rmSync(directory, { recursive: true });
});

function updateReceipt(database, sql) {
  database.prepare(
    `UPDATE coordination_consumer_receipts SET ${sql} WHERE consume_key = ?`,
  ).run(consumeKey());
}

function addCorruptLease(database) {
  updateReceipt(
    database,
    "lease_owner_id = 'corrupt-lease-owner', "
    + "lease_claim_token = 'claim-1', lease_expires_at = 2000",
  );
}

function removeLease(database) {
  updateReceipt(
    database,
    "lease_owner_id = NULL, lease_claim_token = NULL, "
    + "lease_expires_at = NULL",
  );
}

function addCorruptEffect(database) {
  updateReceipt(
    database,
    "effect_commit_id = 'corrupt-effect', effect_committed_at = 2000",
  );
}

function removeEffect(database) {
  updateReceipt(
    database,
    "effect_commit_id = NULL, effect_committed_at = NULL",
  );
}

function addBlockedQuarantine(database) {
  database.prepare(
    "DELETE FROM coordination_consumer_quarantine_private "
    + "WHERE consume_key = ?",
  ).run(consumeKey());
  updateReceipt(
    database,
    "quarantine_id = NULL, quarantine_reason_code = 'CORRUPT_REASON', "
    + "quarantine_committed_at = NULL",
  );
}

function addCommittedQuarantine(database) {
  database.prepare(
    "DELETE FROM coordination_consumer_quarantine_private "
    + "WHERE consume_key = ?",
  ).run(consumeKey());
  updateReceipt(
    database,
    "quarantine_id = 'corrupt-quarantine', "
    + "quarantine_reason_code = 'CORRUPT_REASON', "
    + "quarantine_committed_at = 2000",
  );
  database.prepare(
    "INSERT INTO coordination_consumer_quarantine_private "
    + "(consume_key, quarantine_id, locator) VALUES (?, ?, ?)",
  ).run(
    consumeKey(),
    "corrupt-quarantine",
    "corrupt-private-locator",
  );
}

function removeQuarantine(database) {
  database.prepare(
    "DELETE FROM coordination_consumer_quarantine_private "
    + "WHERE consume_key = ?",
  ).run(consumeKey());
  updateReceipt(
    database,
    "quarantine_id = NULL, quarantine_reason_code = NULL, "
    + "quarantine_committed_at = NULL",
  );
}

function addReplay(database, state = "processing") {
  const row = database.prepare(
    "SELECT quarantine_id FROM coordination_consumer_receipts "
    + "WHERE consume_key = ?",
  ).get(consumeKey());
  database.prepare(
    "DELETE FROM coordination_consumer_replays WHERE consume_key = ?",
  ).run(consumeKey());
  updateReceipt(database, "replay_epoch = 1");
  if (state === "processing") {
    database.prepare(
      `INSERT INTO coordination_consumer_replays (
        consume_key,
        quarantine_id,
        command_id,
        decision_id,
        principal_id,
        state,
        lease_owner_id,
        lease_replay_claim_token,
        lease_expires_at,
        commit_id,
        committed_at,
        failure_code
      ) VALUES (?, ?, ?, ?, ?, 'processing', ?, ?, ?, NULL, NULL, NULL)`,
    ).run(
      consumeKey(),
      row.quarantine_id,
      "corrupt-command",
      "corrupt-decision",
      "corrupt-principal",
      "corrupt-replay-owner",
      "replay-claim-1",
      2000,
    );
    return;
  }
  if (state === "failed") {
    database.prepare(
      `INSERT INTO coordination_consumer_replays (
        consume_key,
        quarantine_id,
        command_id,
        decision_id,
        principal_id,
        state,
        lease_owner_id,
        lease_replay_claim_token,
        lease_expires_at,
        commit_id,
        committed_at,
        failure_code
      ) VALUES (?, ?, ?, ?, ?, 'failed', NULL, NULL, NULL, NULL, NULL, ?)`,
    ).run(
      consumeKey(),
      row.quarantine_id,
      "corrupt-command",
      "corrupt-decision",
      "corrupt-principal",
      "CORRUPT_FAILURE",
    );
  }
}

function addCommittedQuarantineAndReplay(database) {
  addCommittedQuarantine(database);
  addReplay(database);
}

function setAck(database, state) {
  database.prepare(
    "UPDATE coordination_consumer_deliveries SET "
    + "ack_state = ?, acked_at = ? WHERE consume_key = ?",
  ).run(state, state === "acked" ? 2000 : null, consumeKey());
}

function removeDeliveries(database) {
  database.prepare(
    "DELETE FROM coordination_consumer_deliveries WHERE consume_key = ?",
  ).run(consumeKey());
}

function addRecovery(database, order = 1, suffix = "a") {
  database.prepare(
    "INSERT INTO coordination_consumer_recovery_history "
    + "(consume_key, recovery_id, recovery_order) VALUES (?, ?, ?)",
  ).run(consumeKey(), `corrupt-recovery-${suffix}`, order);
}

const CORRUPT_STATE_CASES = [
  ["processing", "lease", removeLease],
  ["processing", "effect", addCorruptEffect],
  ["processing", "quarantine", addBlockedQuarantine],
  ["processing", "replay", addCommittedQuarantineAndReplay],
  ["processing", "ACK", (database) => setAck(database, "acknowledging")],
  ["processing", "deliveries", removeDeliveries],
  ["processing", "recovery history", addRecovery],
  ["effect_committed", "lease", addCorruptLease],
  ["effect_committed", "effect", removeEffect],
  ["effect_committed", "quarantine", addBlockedQuarantine],
  ["effect_committed", "replay", addCommittedQuarantineAndReplay],
  ["effect_committed", "ACK", (database) => setAck(database, "acked")],
  ["effect_committed", "deliveries", removeDeliveries],
  ["effect_committed", "recovery history", addRecovery],
  [
    "quarantine_blocked",
    "lease",
    (database) => updateReceipt(
      database,
      "lease_owner_id = 'corrupt-partial-owner'",
    ),
  ],
  ["quarantine_blocked", "effect", addCorruptEffect],
  ["quarantine_blocked", "quarantine", removeQuarantine],
  ["quarantine_blocked", "replay", addCommittedQuarantineAndReplay],
  [
    "quarantine_blocked",
    "ACK",
    (database) => setAck(database, "acknowledging"),
  ],
  ["quarantine_blocked", "deliveries", removeDeliveries],
  [
    "quarantine_blocked",
    "recovery history",
    (database) => {
      addRecovery(database, 1, "a");
      addRecovery(database, 2, "b");
      addRecovery(database, 3, "c");
    },
  ],
  ["quarantined", "lease", addCorruptLease],
  ["quarantined", "effect", addCorruptEffect],
  ["quarantined", "quarantine", removeQuarantine],
  ["quarantined", "replay", (database) => addReplay(database, "failed")],
  ["quarantined", "ACK", (database) => setAck(database, "acked")],
  ["quarantined", "deliveries", removeDeliveries],
  ["quarantined", "recovery history", (database) => addRecovery(database, 2)],
  ["completed_effect", "lease", addCorruptLease],
  ["completed_effect", "effect", removeEffect],
  ["completed_effect", "quarantine", addBlockedQuarantine],
  ["completed_effect", "replay", addCommittedQuarantineAndReplay],
  ["completed_effect", "ACK", (database) => setAck(database, "pending")],
  ["completed_effect", "deliveries", removeDeliveries],
  ["completed_effect", "recovery history", addRecovery],
  ["completed_quarantine", "lease", addCorruptLease],
  ["completed_quarantine", "effect", addCorruptEffect],
  ["completed_quarantine", "quarantine", removeQuarantine],
  [
    "completed_quarantine",
    "ACK",
    (database) => setAck(database, "pending"),
  ],
  ["completed_quarantine", "deliveries", removeDeliveries],
  [
    "completed_quarantine",
    "recovery history",
    (database) => addRecovery(database, 2),
  ],
  ["replay_committed", "lease", addCorruptLease],
  ["replay_committed", "effect", addCorruptEffect],
  ["replay_committed", "quarantine", removeQuarantine],
  [
    "replay_committed",
    "replay missing",
    (database) => {
      database.prepare(
        "DELETE FROM coordination_consumer_replays WHERE consume_key = ?",
      ).run(consumeKey());
      updateReceipt(database, "replay_epoch = 0");
    },
  ],
  [
    "replay_committed",
    "replay processing",
    (database) => addReplay(database, "processing"),
  ],
  ["replay_committed", "deliveries", removeDeliveries],
  [
    "replay_committed",
    "recovery history",
    (database) => addRecovery(database, 2),
  ],
];

for (const [state, dimension, mutate] of CORRUPT_STATE_CASES) {
  test(`${state} rejects impossible ${dimension} state`, async () => {
    const fixture = await createStateFixture(state);
    withIgnoredChecks(fixture.database, () => {
      mutate(fixture.database);
    });
    await assertCorrupt(
      fixture.repository,
      `corrupt-${state}-${dimension}`,
    );
    fixture.database.close();
  });
}

test("stored malformed metadata accepts only the exact NULL, 0, and 1 domain", async () => {
  for (const value of [null, 0, 1]) {
    const fixture = await createStateFixture("processing");
    fixture.database
      .prepare(
        "UPDATE coordination_consumer_receipts "
        + "SET metadata_malformed = ? WHERE consume_key = ?",
      )
      .run(value, consumeKey());
    const receipt = await fixture.repository.getReceipt(consumeKey());
    if (value === null) {
      assert.equal(Object.hasOwn(receipt.metadata, "malformed"), false);
    } else {
      assert.equal(receipt.metadata.malformed, value === 1);
    }
    fixture.database.close();
  }
});

for (const invalidMalformed of [-1, 2, 0.5, "not-a-boolean"]) {
  test(`stored malformed metadata rejects corrupt value ${JSON.stringify(invalidMalformed)}`, async () => {
    const fixture = await createStateFixture("processing");
    withIgnoredChecks(fixture.database, () => {
      fixture.database
        .prepare(
          "UPDATE coordination_consumer_receipts "
          + "SET metadata_malformed = ? WHERE consume_key = ?",
        )
        .run(invalidMalformed, consumeKey());
    });
    await assertCorrupt(fixture.repository, String(invalidMalformed));
    fixture.database.close();
  });
}

test("caller input TypeErrors stay exact even after SQLite is closed", async () => {
  const database = openDatabase(":memory:");
  const repository = createSqliteCoordinationConsumerRepository({ database });
  const vault = createSqliteQuarantineStore({ database });
  database.close();

  const cases = [
    {
      operation: () => repository.getReceipt("not-canonical"),
      message: "consumeKey must be canonical",
    },
    {
      operation: () => repository.claim(claimInput({ leaseMs: 0 })),
      message: "leaseMs must be a positive safe integer",
    },
    {
      operation: () => vault.get({ locator: "not-canonical" }),
      message: "locator must be canonical",
    },
    {
      operation: () => vault.put({
        consumeKey: consumeKey(),
        body: Buffer.from("not-a-public-body-type"),
      }),
      message: "body must be a string or null",
    },
  ];
  for (const scenario of cases) {
    await assert.rejects(
      scenario.operation(),
      (error) => {
        assert.equal(error.name, "TypeError");
        assert.equal(error.message, scenario.message);
        return true;
      },
    );
  }
});

function adapterProbe(kind, database) {
  if (kind === "repository") {
    const repository = createSqliteCoordinationConsumerRepository({ database });
    return () => repository.getReceipt(consumeKey());
  }
  const vault = createSqliteQuarantineStore({ database });
  return () => vault.get({ locator: `coord-vault-v1-${"a".repeat(64)}` });
}

function assertAdapterFailure(kind, operation, canaries) {
  return kind === "repository"
    ? assertStoreFailure(operation, canaries)
    : assertVaultFailure(operation, canaries);
}

function forgedAdapterError(kind) {
  return kind === "repository"
    ? new SqliteCoordinationConsumerStoreError(
        "FORGED_STORE_CODE",
        "forged-store-private-token",
      )
    : new SqliteQuarantineVaultError(
        "FORGED_VAULT_CODE",
        "forged-vault-private-token",
      );
}

for (const kind of ["repository", "vault"]) {
  test(`${kind} maps closed SQLite TypeErrors to its fixed failure`, async () => {
    const database = openDatabase(":memory:");
    const operation = adapterProbe(kind, database);
    database.close();
    await assertAdapterFailure(
      kind,
      operation,
      ["database connection is not open"],
    );
  });

  test(`${kind} maps missing-schema failures without leaking SQL`, async () => {
    const database = new Database(":memory:");
    database.backend = "sqlite";
    const operation = adapterProbe(kind, database);
    await assertAdapterFailure(
      kind,
      operation,
      ["coordination_consumer", "SELECT"],
    );
    database.close();
  });

  test(`${kind} maps hostile dependency TypeErrors to its fixed failure`, async () => {
    const canary = `raw-${kind}-dependency-token`;
    const operation = adapterProbe(
      kind,
      hostileDatabase(new TypeError(canary)),
    );
    await assertAdapterFailure(kind, operation, [canary]);
  });

  test(`${kind} rejects forged exported adapter errors`, async () => {
    const forged = forgedAdapterError(kind);
    const operation = adapterProbe(kind, hostileDatabase(forged));
    await assertAdapterFailure(
      kind,
      operation,
      [forged.code, forged.message],
    );
  });
}

const AMBIENT_ERROR_AUTHORITY_GUARDS = Object.freeze([
  {
    label: "WeakSet authority",
    pattern: /\bWeakSet\b/,
  },
  {
    label: "module or instance mutable authority collection",
    pattern: /^(?: {0}| {2})(?:const|let|var)\s+[A-Za-z0-9_$]*(?:authority|error|provenance|registry|scope|stack|trusted)[A-Za-z0-9_$]*\s*=\s*(?:\[\]|new\s+(?:Array|Map|Set|WeakMap|WeakSet)\s*\()/im,
  },
  {
    label: "ambient current-scope lookup",
    pattern: /^(?:function| {2}function)\s+current[A-Za-z0-9_$]*(?:authority|provenance|scope)/im,
  },
  {
    label: "mutable ambient scope stack",
    pattern: /\b[A-Za-z0-9_$]*(?:authority|provenance|registry|scope|stack|trusted)[A-Za-z0-9_$]*\.(?:pop|push|shift|splice|unshift)\s*\(/i,
  },
]);

for (const adapter of SQLITE_ADAPTER_SOURCES) {
  test(`${adapter.name} error provenance has no ambient mutable authority`, () => {
    const source = fs.readFileSync(adapter.file, "utf8");
    const violations = AMBIENT_ERROR_AUTHORITY_GUARDS
      .filter(({ pattern }) => pattern.test(source))
      .map(({ label }) => label);
    assert.deepEqual(
      violations,
      [],
      `${adapter.name} provenance must be lexical to one invocation`,
    );
  });
}

const REPLAYED_ERROR_CASES = [
  {
    name: "repository validation TypeError",
    kind: "repository",
    expected: {
      name: "TypeError",
      message: "consumeKey must be canonical",
    },
    capture: ({ repository }) => captureError(
      () => repository.getReceipt("not-canonical"),
    ),
  },
  {
    name: "vault validation TypeError",
    kind: "vault",
    expected: {
      name: "TypeError",
      message: "locator must be canonical",
    },
    capture: ({ vault }) => captureError(
      () => vault.get({ locator: "not-canonical" }),
    ),
  },
  {
    name: "repository winning safe-expiry TypeError",
    kind: "repository",
    expected: {
      name: "TypeError",
      message: "claim expiry exceeds the safe integer range",
    },
    capture: ({ repository }) => captureError(
      () => repository.claim(claimInput({
        now: Number.MAX_SAFE_INTEGER,
        leaseMs: 1,
      })),
    ),
  },
  {
    name: "repository not-found control error",
    kind: "repository",
    expected: {
      name: "SqliteCoordinationConsumerStoreError",
      code: "COORDINATION_CONSUMER_RECEIPT_NOT_FOUND",
      message: "coordination consumer receipt was not found",
    },
    capture: ({ repository }) => captureError(
      () => repository.recordAttempt({
        consumeKey: consumeKey(),
        ownerId: "worker-a",
        claimToken: "claim-1",
        now: 1,
        leaseMs: 1,
      }),
    ),
  },
  {
    name: "repository not-owned control error",
    kind: "repository",
    expected: {
      name: "SqliteCoordinationConsumerStoreError",
      code: "COORDINATION_CONSUMER_RECEIPT_NOT_OWNED",
      message: "coordination consumer receipt is not owned",
    },
    capture: async ({ repository }) => {
      await repository.claim(claimInput());
      return captureError(
        () => repository.recordAttempt({
          consumeKey: consumeKey(),
          ownerId: "worker-a",
          claimToken: "claim-999",
          now: 1001,
          leaseMs: 100,
        }),
      );
    },
  },
  {
    name: "repository corruption control error",
    kind: "repository",
    expected: {
      name: "SqliteCoordinationConsumerStoreError",
      code: "COORDINATION_CONSUMER_STORE_CORRUPT",
      message: "coordination consumer store state is invalid",
    },
    capture: async ({ rawDatabase, repository }) => {
      await repository.claim(claimInput());
      withIgnoredChecks(rawDatabase, () => {
        rawDatabase.prepare(
          "UPDATE coordination_consumer_receipts "
          + "SET metadata_malformed = 2 WHERE consume_key = ?",
        ).run(consumeKey());
      });
      return captureError(() => repository.getReceipt(consumeKey()));
    },
  },
  {
    name: "repository mapped failure error",
    kind: "repository",
    expected: {
      name: "SqliteCoordinationConsumerStoreError",
      code: "COORDINATION_CONSUMER_STORE_FAILED",
      message: "coordination consumer store operation failed safely",
    },
    capture: ({ inject, repository }) => {
      inject(new TypeError("first-repository-dependency-failure"));
      return captureError(() => repository.getReceipt(consumeKey()));
    },
  },
  {
    name: "vault conflict control error",
    kind: "vault",
    expected: {
      name: "SqliteQuarantineVaultError",
      code: "COORDINATION_QUARANTINE_VAULT_CONFLICT",
      message: "coordination quarantine vault content conflicts with its key",
    },
    capture: async ({ vault }) => {
      await vault.put({
        consumeKey: consumeKey(),
        body: "original private body",
      });
      return captureError(
        () => vault.put({
          consumeKey: consumeKey(),
          body: "different private body",
        }),
      );
    },
  },
  {
    name: "vault corruption control error",
    kind: "vault",
    expected: {
      name: "SqliteQuarantineVaultError",
      code: "COORDINATION_QUARANTINE_VAULT_CORRUPT",
      message: "coordination quarantine vault state is invalid",
    },
    capture: async ({ rawDatabase, vault }) => {
      const stored = await vault.put({
        consumeKey: consumeKey(),
        body: "private corruptible body",
      });
      rawDatabase.prepare(
        "UPDATE coordination_quarantine_vault SET body_sha256 = ? "
        + "WHERE consume_key = ?",
      ).run("0".repeat(64), consumeKey());
      return captureError(() => vault.get({ locator: stored.locator }));
    },
  },
  {
    name: "vault mapped failure error",
    kind: "vault",
    expected: {
      name: "SqliteQuarantineVaultError",
      code: "COORDINATION_QUARANTINE_VAULT_FAILED",
      message: "coordination quarantine vault operation failed safely",
    },
    capture: ({ inject, vault }) => {
      inject(new TypeError("first-vault-dependency-failure"));
      return captureError(
        () => vault.get({
          locator: `coord-vault-v1-${"a".repeat(64)}`,
        }),
      );
    },
  },
];

for (const scenario of REPLAYED_ERROR_CASES) {
  test(`${scenario.name} has no authority in a later dependency call`, async () => {
    await assertReplayedErrorIsUntrusted(scenario);
  });
}

test("synchronous repository reentrancy isolates current-call control errors", async () => {
  const fixture = openInterceptableAdapters();
  try {
    let nestedError;
    fixture.beforeNextPrepare(() => {
      nestedError = captureError(
        () => fixture.repository.getReceipt("not-canonical"),
      );
    });
    const outerError = await captureError(
      () => fixture.repository.recordAttempt({
        consumeKey: consumeKey(),
        ownerId: "worker-a",
        claimToken: "claim-1",
        now: 1,
        leaseMs: 1,
      }),
    );
    assertCapturedContract(outerError, {
      name: "SqliteCoordinationConsumerStoreError",
      code: "COORDINATION_CONSUMER_RECEIPT_NOT_FOUND",
      message: "coordination consumer receipt was not found",
    });
    assertCapturedContract(await nestedError, {
      name: "TypeError",
      message: "consumeKey must be canonical",
    });
    assert.deepEqual(
      await fixture.repository.beginReplay({
        quarantineId: "missing-quarantine",
        commandId: "command-a",
        decisionId: "decision-a",
        principalId: "principal-a",
        ownerId: "replayer-a",
        now: 1,
        leaseMs: 1,
      }),
      { status: "not_found" },
    );
  } finally {
    fixture.rawDatabase.close();
  }
});

test("synchronous vault reentrancy isolates current-call control errors", async () => {
  const fixture = openInterceptableAdapters();
  try {
    await fixture.vault.put({
      consumeKey: consumeKey(),
      body: "original private body",
    });
    let nestedError;
    fixture.beforeNextPrepare(() => {
      nestedError = captureError(
        () => fixture.vault.get({ locator: "not-canonical" }),
      );
    });
    const outerError = await captureError(
      () => fixture.vault.put({
        consumeKey: consumeKey(),
        body: "different private body",
      }),
    );
    assertCapturedContract(outerError, {
      name: "SqliteQuarantineVaultError",
      code: "COORDINATION_QUARANTINE_VAULT_CONFLICT",
      message: "coordination quarantine vault content conflicts with its key",
    });
    assertCapturedContract(await nestedError, {
      name: "TypeError",
      message: "locator must be canonical",
    });
    assert.equal(
      await fixture.vault.get({
        locator: `coord-vault-v1-${"a".repeat(64)}`,
      }),
      null,
    );
  } finally {
    fixture.rawDatabase.close();
  }
});

test("two repository instances isolate nested and previous errors after callback throws", async () => {
  const outer = openInterceptableAdapters();
  const inner = openInterceptableAdapters();
  try {
    const previous = await captureError(
      () => inner.repository.recordAttempt({
        consumeKey: consumeKey(),
        ownerId: "worker-a",
        claimToken: "claim-1",
        now: 1,
        leaseMs: 1,
      }),
    );
    assertCapturedContract(previous, {
      name: "SqliteCoordinationConsumerStoreError",
      code: "COORDINATION_CONSUMER_RECEIPT_NOT_FOUND",
      message: "coordination consumer receipt was not found",
    });
    const previousCanary = "previous-repository-instance-error";
    previous.replayedContext = previousCanary;

    let nestedError;
    outer.beforeNextPrepare(() => {
      nestedError = captureError(
        () => inner.repository.getReceipt("not-canonical"),
      );
      throw previous;
    });
    const outerFailure = await captureError(
      () => outer.repository.getReceipt(consumeKey()),
    );
    assertFreshFixedFailure(
      outerFailure,
      previous,
      "repository",
      [previousCanary],
    );

    const capturedNested = await nestedError;
    assertCapturedContract(capturedNested, {
      name: "TypeError",
      message: "consumeKey must be canonical",
    });
    const nestedCanary = "nested-repository-instance-error";
    capturedNested.replayedContext = nestedCanary;
    inner.inject(capturedNested);
    const replayedNested = await captureError(
      () => inner.repository.getReceipt(consumeKey()),
    );
    assertFreshFixedFailure(
      replayedNested,
      capturedNested,
      "repository",
      [nestedCanary],
    );

    assertCapturedContract(
      await captureError(
        () => outer.repository.recordAttempt({
          consumeKey: consumeKey(),
          ownerId: "worker-a",
          claimToken: "claim-1",
          now: 1,
          leaseMs: 1,
        }),
      ),
      {
        name: "SqliteCoordinationConsumerStoreError",
        code: "COORDINATION_CONSUMER_RECEIPT_NOT_FOUND",
        message: "coordination consumer receipt was not found",
      },
    );
    assert.deepEqual(
      await inner.repository.beginReplay({
        quarantineId: "missing-quarantine",
        commandId: "command-a",
        decisionId: "decision-a",
        principalId: "principal-a",
        ownerId: "replayer-a",
        now: 1,
        leaseMs: 1,
      }),
      { status: "not_found" },
    );
  } finally {
    outer.rawDatabase.close();
    inner.rawDatabase.close();
  }
});

test("two vault instances isolate nested and previous errors after callback throws", async () => {
  const outer = openInterceptableAdapters();
  const inner = openInterceptableAdapters();
  try {
    await inner.vault.put({
      consumeKey: consumeKey(),
      body: "original private body",
    });
    const previous = await captureError(
      () => inner.vault.put({
        consumeKey: consumeKey(),
        body: "different private body",
      }),
    );
    assertCapturedContract(previous, {
      name: "SqliteQuarantineVaultError",
      code: "COORDINATION_QUARANTINE_VAULT_CONFLICT",
      message: "coordination quarantine vault content conflicts with its key",
    });
    const previousCanary = "previous-vault-instance-error";
    previous.replayedContext = previousCanary;

    let nestedError;
    outer.beforeNextPrepare(() => {
      nestedError = captureError(
        () => inner.vault.get({ locator: "not-canonical" }),
      );
      throw previous;
    });
    const outerFailure = await captureError(
      () => outer.vault.get({
        locator: `coord-vault-v1-${"a".repeat(64)}`,
      }),
    );
    assertFreshFixedFailure(
      outerFailure,
      previous,
      "vault",
      [previousCanary],
    );

    const capturedNested = await nestedError;
    assertCapturedContract(capturedNested, {
      name: "TypeError",
      message: "locator must be canonical",
    });
    const nestedCanary = "nested-vault-instance-error";
    capturedNested.replayedContext = nestedCanary;
    inner.inject(capturedNested);
    const replayedNested = await captureError(
      () => inner.vault.get({
        locator: `coord-vault-v1-${"a".repeat(64)}`,
      }),
    );
    assertFreshFixedFailure(
      replayedNested,
      capturedNested,
      "vault",
      [nestedCanary],
    );

    assertCapturedContract(
      await captureError(
        () => inner.vault.put({
          consumeKey: consumeKey(),
          body: "different private body",
        }),
      ),
      {
        name: "SqliteQuarantineVaultError",
        code: "COORDINATION_QUARANTINE_VAULT_CONFLICT",
        message: "coordination quarantine vault content conflicts with its key",
      },
    );
    assert.equal(
      await outer.vault.get({
        locator: `coord-vault-v1-${"a".repeat(64)}`,
      }),
      null,
    );
  } finally {
    outer.rawDatabase.close();
    inner.rawDatabase.close();
  }
});

test("corrupt or unknown SQLite state fails closed without leaking stored values", async () => {
  const directory = taskDirectory();
  const file = path.join(directory, "corrupt.db");
  const { database, repository } = openRepository(file);
  await repository.claim(claimInput());

  const secret = "token-private-body-json-locator";
  database.pragma("ignore_check_constraints = ON");
  database
    .prepare(
      "UPDATE coordination_consumer_receipts "
      + "SET state = ?, metadata_message_id = ? WHERE consume_key = ?",
    )
    .run(`unknown-${secret}`, `invalid-${secret}`, consumeKey());
  database.pragma("ignore_check_constraints = OFF");

  await assert.rejects(
    repository.getReceipt(consumeKey()),
    (error) => {
      assert.equal(error.code, "COORDINATION_CONSUMER_STORE_CORRUPT");
      assert.equal(
        error.message,
        "coordination consumer store state is invalid",
      );
      assert.equal(error.message.includes(secret), false);
      assert.equal(JSON.stringify(error).includes(secret), false);
      return true;
    },
  );

  database.close();
  fs.rmSync(directory, { recursive: true });
});

test("SQLite vault is byte-idempotent, opaque, exact-locator-only, and durable", async () => {
  const directory = taskDirectory();
  const file = path.join(directory, "vault.db");
  let opened = openVault(file);

  const first = await opened.vault.put({
    consumeKey: consumeKey(),
    body: MESSAGE.body,
  });
  assert.match(first.locator, /^coord-vault-v1-[a-f0-9]{64}$/);
  assert.equal(first.locator.includes(consumeKey()), false);
  assert.equal(first.locator.includes("private"), false);

  const same = await opened.vault.put({
    consumeKey: consumeKey(),
    body: `${MESSAGE.body}`,
  });
  assert.deepEqual(same, first);
  opened.database.close();

  opened = openVault(file);
  const reopened = await opened.vault.put({
    consumeKey: consumeKey(),
    body: MESSAGE.body,
  });
  assert.deepEqual(reopened, first);
  assert.deepEqual(
    await opened.vault.get({ locator: first.locator }),
    { body: MESSAGE.body },
  );
  const absentBodyKey = consumeKey({
    ...MESSAGE,
    messageId: "message-without-body",
  });
  const absent = await opened.vault.put({
    consumeKey: absentBodyKey,
    body: null,
  });
  assert.deepEqual(
    await opened.vault.get({ locator: absent.locator }),
    { body: null },
  );
  await assert.rejects(
    opened.vault.put({
      consumeKey: absentBodyKey,
      body: "",
    }),
    (error) => error.code === "COORDINATION_QUARANTINE_VAULT_CONFLICT",
  );
  assert.equal(
    await opened.vault.get({
      locator: first.locator.replace(/.$/, first.locator.endsWith("0") ? "1" : "0"),
    }),
    null,
  );
  await assert.rejects(
    opened.vault.put({
      consumeKey: consumeKey(),
      body: "different private body with token=leak-me",
    }),
    (error) => {
      assert.equal(error.code, "COORDINATION_QUARANTINE_VAULT_CONFLICT");
      assert.equal(
        error.message,
        "coordination quarantine vault content conflicts with its key",
      );
      assert.equal(error.message.includes("leak-me"), false);
      assert.equal(error.message.includes(first.locator), false);
      return true;
    },
  );

  const row = opened.database
    .prepare(
      "SELECT COUNT(*) AS count FROM coordination_quarantine_vault "
      + "WHERE consume_key = ?",
    )
    .get(consumeKey());
  assert.equal(row.count, 1);
  opened.database.close();
  fs.rmSync(directory, { recursive: true });
});

test("vault corruption fails closed without exposing a body, locator, or raw database value", async () => {
  const directory = taskDirectory();
  const file = path.join(directory, "vault-corrupt.db");
  const { database, vault } = openVault(file);
  const stored = await vault.put({
    consumeKey: consumeKey(),
    body: MESSAGE.body,
  });
  database
    .prepare(
      "UPDATE coordination_quarantine_vault SET body_sha256 = ? "
      + "WHERE consume_key = ?",
    )
    .run("0".repeat(64), consumeKey());

  await assert.rejects(
    vault.get({ locator: stored.locator }),
    (error) => {
      assert.equal(error.code, "COORDINATION_QUARANTINE_VAULT_CORRUPT");
      assert.equal(
        error.message,
        "coordination quarantine vault state is invalid",
      );
      const publicError = `${error.message}${JSON.stringify(error)}`;
      assert.equal(publicError.includes(MESSAGE.body), false);
      assert.equal(publicError.includes(stored.locator), false);
      return true;
    },
  );

  database.close();
  fs.rmSync(directory, { recursive: true });
});
