import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

import * as coordinationModule from "../../gateway/src/coordination.js";
import {
  createOrchestratorCoordinationClient,
} from "../../gateway/src/coordination.js";
import {
  createSqliteCoordinationConsumerRepository,
} from "../../gateway/src/core/repositories/sqlite_coordination_consumer_repo.js";

const requireFromGateway = createRequire(
  new URL("../../gateway/package.json", import.meta.url),
);
const Database = requireFromGateway("better-sqlite3");
const PROFILE_MODULE_URL = new URL(
  "../../gateway/src/core/coordination_consumer_runtime_test_profile.js",
  import.meta.url,
);
const profileModule = await import(PROFILE_MODULE_URL).catch(
  (error) => Object.freeze({ loadError: error }),
);
const OWNER_MIGRATION = new URL(
  "../../gateway/migrations/004_coordination_consumer_runtime_owner.sql",
  import.meta.url,
);
const OWNER_MIGRATION_ID = "004_coordination_consumer_runtime_owner";
const OWNER_TABLE = "coordination_consumer_runtime_owners";
const SCOPE = "scope-owner";
const BASE_METADATA = Object.freeze({
  protocolVersion: 1,
  scopeId: SCOPE,
  messageId: "cm-owner-main",
  fromParticipantId: "pt-sender",
  toParticipantId: "pt-owner",
  messageType: "IMPACT_NOTICE",
  classification: "internal",
  createdAt: "2026-07-28T08:00:00.000Z",
  traceId: "trace-owner-main",
});
const BASE_DELIVERY = Object.freeze({
  deliveryId: "1-0",
  recovered: false,
});
const createdProfiles = [];

function canonicalConsumeKey(metadata = BASE_METADATA) {
  return `coord-consume-v1-${crypto
    .createHash("sha256")
    .update(JSON.stringify([
      metadata.protocolVersion,
      metadata.scopeId,
      metadata.fromParticipantId,
      metadata.toParticipantId,
      metadata.messageId,
    ]))
    .digest("hex")}`;
}

test.after(async () => {
  for (const profile of createdProfiles.reverse()) {
    await profile.dispose();
  }
});

function loadProfileApi() {
  assert.ifError(profileModule.loadError);
  assert.equal(
    typeof profileModule.createSqliteDisposableRuntimeProfile,
    "function",
  );
  return profileModule;
}

function createProfile() {
  const profile = loadProfileApi().createSqliteDisposableRuntimeProfile();
  createdProfiles.push(profile);
  return profile;
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }
  assert.fail(message);
}

async function waitForRejectionCode(operation, expectedCode, message) {
  let lastCode = null;
  for (let attempt = 0; attempt < 400; attempt += 1) {
    try {
      await operation();
    } catch (error) {
      lastCode = error?.code ?? null;
      if (lastCode === expectedCode) return;
    }
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }
  assert.fail(`${message}; last rejection code: ${lastCode}`);
}

function abortError() {
  return Object.assign(new Error("aborted"), { name: "AbortError" });
}

function createStaticManagedClient({
  scopeId = SCOPE,
  participantId = "pt-owner",
  state = "ready",
  receive,
} = {}) {
  const calls = [];
  return Object.freeze({
    calls,
    getStatus() {
      return Object.freeze({
        state,
        participantId,
        participantType: "orchestrator",
        scopeId,
        leaseExpiresAt: "2026-07-28T08:01:00.000Z",
        retryAttempt: 0,
        recovery: "No recovery action is required.",
      });
    },
    async invoke(operation, input, { signal } = {}) {
      calls.push({ operation, input: structuredClone(input), signal });
      if (operation === "ack") {
        return {
          ackedCount: input.deliveryIds.length,
          deliveryIds: [...input.deliveryIds],
        };
      }
      if (operation !== "receive") {
        throw new Error(`unexpected operation ${operation}`);
      }
      if (receive) return receive(input, { signal });
      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(abortError());
          return;
        }
        const onAbort = () => {
          signal.removeEventListener("abort", onAbort);
          reject(abortError());
        };
        signal?.addEventListener("abort", onAbort, { once: true });
      });
    },
  });
}

function createAckRecoveryAcquirer() {
  return () => Object.freeze({
    async inspectAckTombstone() {
      return { status: "absent" };
    },
    async finalizeOrphanAck() {
      return { status: "transport_state_unknown" };
    },
  });
}

function createRuntimeHarness({
  profile,
  pair = profile.createStore(),
  coordinationClient = createStaticManagedClient(),
  repository = createSqliteCoordinationConsumerRepository({
    database: pair.database,
  }),
  provision: suppliedProvision,
  lifecycle,
  ownerFaults,
  consumerFault,
  handler = async () => ({
    status: "committed",
    commitId: "owner-effect",
  }),
  scopeId = SCOPE,
} = {}) {
  profile.admitTestManagedClient(coordinationClient);
  const provision = suppliedProvision ?? profile.provisionRuntime({
    database: pair.database,
    originCapability: pair.originCapability,
    repository,
    coordinationClient,
    acquireAckRecovery: createAckRecoveryAcquirer(),
    ...(lifecycle === undefined ? {} : { lifecycle }),
    ...(ownerFaults === undefined ? {} : { ownerFaults }),
  });
  const runtime = coordinationModule.createCoordinationConsumerRuntime({
    provision,
    quarantineStore: Object.freeze({
      async put() {
        return { locator: "coord-vault-owner" };
      },
      async get() {
        return null;
      },
    }),
    handler,
    consumerFault,
    clock: () => Date.parse("2026-07-28T08:00:00.000Z"),
    reconciliationIntervalMs: 60_000,
    consumerConfig: {
      scopeId,
      consumerId: "owner-consumer",
      ownerId: "owner-consumer-runtime",
      claimLeaseMs: 100,
      maxAttempts: 1,
      baseDelayMs: 1,
      maxDelayMs: 1,
      quarantineStoreMaxAttempts: 1,
      idleDelayMs: 1,
      receiveCount: 1,
      reclaimIdleMs: 0,
      blockMs: 1,
    },
    reconciliationConfig: {
      ownerId: "owner-reconciler",
      claimLeaseMs: 100,
      deferMs: 1,
      tombstoneTtlMs: 60_000,
      limit: 1,
    },
  });
  return {
    pair,
    repository,
    coordinationClient,
    provision,
    runtime,
  };
}

function ownerRows(database) {
  return database.prepare(
    `SELECT scope_id, generation, owner_state
     FROM main.${OWNER_TABLE}
     ORDER BY scope_id`,
  ).all();
}

function createOwnerTempShadow(database) {
  database.exec(
    `CREATE TEMP TABLE ${OWNER_TABLE} AS
       SELECT * FROM main.${OWNER_TABLE} WHERE 0`,
  );
}

function createManualOwnerSchema(database, schema = "main") {
  database.exec(
    `CREATE TABLE ${schema}.${OWNER_TABLE} (
       scope_id TEXT NOT NULL PRIMARY KEY
         CHECK (
           typeof(scope_id) = 'text'
           AND length(scope_id) BETWEEN 1 AND 128
         ),
       generation INTEGER NOT NULL
         CHECK (
           typeof(generation) = 'integer'
           AND generation BETWEEN 1 AND 9007199254740991
         ),
       owner_state TEXT NOT NULL
         CHECK (
           typeof(owner_state) = 'text'
           AND owner_state IN ('owned', 'released')
         )
     )`,
  );
}

function createControlledScheduler() {
  let nextId = 1;
  const timers = new Map();
  return {
    timers,
    setTimeout(callback, delayMs) {
      const id = nextId;
      nextId += 1;
      timers.set(id, { callback, delayMs });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    runNext() {
      const next = timers.entries().next();
      assert.equal(next.done, false, "a managed-client timer was expected");
      const [id, { callback }] = next.value;
      timers.delete(id);
      callback();
    },
  };
}

function createRejoiningClient({
  receive: receiveOverride,
  observeAck = () => {},
} = {}) {
  const scheduler = createControlledScheduler();
  const workRelease = createDeferred();
  const workAborted = createDeferred();
  let registrations = 0;
  let heartbeatCalls = 0;
  const coordination = {
    async status() {
      return {
        protocolVersion: 1,
        status: "ready",
        scopeId: SCOPE,
        limits: {
          leaseDefaultMs: 60_000,
          leaseMaxMs: 60_000,
        },
      };
    },
    async register() {
      registrations += 1;
      const participantId = registrations === 1 ? "pt-d1" : "pt-d2";
      return {
        protocolVersion: 1,
        participantId,
        participantType: "orchestrator",
        scopeId: SCOPE,
        capabilities: ["coordination.v1"],
        metadata: {},
        registeredAt: "2026-07-28T08:00:00.000Z",
        lastHeartbeatAt: "2026-07-28T08:00:00.000Z",
        leaseExpiresAt: "2026-07-28T08:01:00.000Z",
        leaseToken: `lease-${participantId}-token-00000000000000`,
      };
    },
    async heartbeat() {
      heartbeatCalls += 1;
      if (heartbeatCalls === 1) {
        throw Object.assign(new Error("lease lost"), {
          code: "COORDINATION_LEASE_NOT_FOUND",
        });
      }
      throw new Error("unexpected heartbeat");
    },
    async receive(input, { signal } = {}) {
      if (receiveOverride) return receiveOverride(input, { signal });
      if (signal?.aborted) workAborted.resolve();
      signal?.addEventListener("abort", () => workAborted.resolve(), {
        once: true,
      });
      await workRelease.promise;
      return [];
    },
    async ack(input) {
      observeAck(structuredClone(input));
      return {
        ackedCount: input.deliveryIds.length,
        deliveryIds: [...input.deliveryIds],
      };
    },
    async discover() {
      return [];
    },
    async send() {
      return { deliveryId: "1-0", duplicate: false };
    },
    async unregister(input) {
      return {
        participantId: input.participantId,
        unregistered: true,
      };
    },
  };
  const client = createOrchestratorCoordinationClient({
    coordination,
    registration: {
      scopeId: SCOPE,
      capabilities: ["coordination.v1"],
    },
    scheduler,
    clock: () => Date.parse("2026-07-28T08:00:00.000Z"),
    random: () => 0.5,
  });
  return {
    client,
    scheduler,
    workAborted: workAborted.promise,
    releaseWork: workRelease.resolve,
    registrations: () => registrations,
  };
}

test("migration 004 is independent, main-qualified, exact, and persistent", () => {
  const sql = fs.readFileSync(OWNER_MIGRATION, "utf8");
  assert.match(
    sql,
    /CREATE TABLE main\.coordination_consumer_runtime_owners/,
  );
  assert.match(sql, /PRIMARY KEY/);
  assert.match(sql, /generation BETWEEN 1 AND 9007199254740991/);
  assert.match(sql, /owner_state IN \('owned', 'released'\)/);
  assert.match(sql, /INSERT OR IGNORE INTO main\.schema_migrations/);
  assert.doesNotMatch(sql, /coordination_consumer_ack_intents|migration 003/i);

  const database = new Database(":memory:");
  try {
    database.exec(
      "CREATE TABLE main.schema_migrations("
      + "id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
    );
    database.exec(sql);
    database.prepare(
      `INSERT INTO main.${OWNER_TABLE}
         (scope_id, generation, owner_state)
       VALUES (?, 1, 'owned')`,
    ).run("scope-raw-duplicate");
    assert.throws(
      () => database.prepare(
        `INSERT INTO main.${OWNER_TABLE}
           (scope_id, generation, owner_state)
         VALUES (?, 2, 'owned')`,
      ).run("scope-raw-duplicate"),
      /UNIQUE constraint failed/,
    );
  } finally {
    database.close();
  }
});

test("owner DML ignores per-handle TEMP shadows and commits one main owner", () => {
  const profile = createProfile(test);
  const first = profile.createStore();
  const second = profile.openHandle(first.storeOrigin);
  createOwnerTempShadow(first.database);
  createOwnerTempShadow(second.database);
  const firstOwner = profile.owner(first);
  const secondOwner = profile.owner(second);

  assert.deepEqual(firstOwner.claim(SCOPE), {
    status: "claimed",
    generation: 1,
  });
  assert.deepEqual(secondOwner.claim(SCOPE), { status: "owned" });
  assert.deepEqual(ownerRows(first.database), [{
    scope_id: SCOPE,
    generation: 1,
    owner_state: "owned",
  }]);
  assert.equal(
    first.database.prepare(`SELECT count(*) AS n FROM temp.${OWNER_TABLE}`)
      .get().n,
    0,
  );
  assert.equal(
    second.database.prepare(`SELECT count(*) AS n FROM temp.${OWNER_TABLE}`)
      .get().n,
    0,
  );
});

test("attached owner state cannot satisfy a missing main migration or receive DML", () => {
  const profile = createProfile(test);
  const pair = profile.createStore();
  pair.database.exec(
    `DROP TABLE main.${OWNER_TABLE};
     ATTACH DATABASE ':memory:' AS shadow`,
  );
  createManualOwnerSchema(pair.database, "shadow");

  assert.throws(
    () => profile.owner(pair),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_INVALID"
    ),
  );
  assert.equal(
    pair.database.prepare(
      `SELECT count(*) AS n FROM shadow.${OWNER_TABLE}`,
    ).get().n,
    0,
  );
});

test("shadow-only migration records cannot satisfy the main migration guard", () => {
  const profile = createProfile(test);
  const pair = profile.createStore();
  pair.database.prepare(
    "DELETE FROM main.schema_migrations WHERE id = ?",
  ).run(OWNER_MIGRATION_ID);
  pair.database.exec(
    `CREATE TEMP TABLE schema_migrations (
       id TEXT PRIMARY KEY,
       applied_at TEXT NOT NULL
     )`,
  );
  pair.database.prepare(
    "INSERT INTO temp.schema_migrations VALUES (?, ?)",
  ).run(OWNER_MIGRATION_ID, "2026-07-28T08:00:00.000Z");

  assert.throws(
    () => profile.owner(pair),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_INVALID"
    ),
  );

  pair.database.exec(
    "DROP TABLE temp.schema_migrations; "
    + "ATTACH DATABASE ':memory:' AS ledger; "
    + "CREATE TABLE ledger.schema_migrations ("
    + "id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  pair.database.prepare(
    "INSERT INTO ledger.schema_migrations VALUES (?, ?)",
  ).run(OWNER_MIGRATION_ID, "2026-07-28T08:00:00.000Z");
  assert.throws(
    () => profile.owner(pair),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_INVALID"
    ),
  );
});

test("exact owner schema rejects a SQL-capable table without scope uniqueness", () => {
  const profile = createProfile(test);
  const pair = profile.createStore();
  pair.database.exec(`DROP TABLE main.${OWNER_TABLE}`);
  pair.database.exec(
    `CREATE TABLE main.${OWNER_TABLE} (
       scope_id TEXT NOT NULL,
       generation INTEGER NOT NULL,
       owner_state TEXT NOT NULL
     )`,
  );

  assert.throws(
    () => profile.owner(pair),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_INVALID"
    ),
  );
});

test("consumer repository reads and writes main despite complete TEMP shadows", async () => {
  const profile = createProfile(test);
  const pair = profile.createStore();
  const repository = createSqliteCoordinationConsumerRepository({
    database: pair.database,
  });
  const consumeKey = canonicalConsumeKey();
  const claimed = await repository.claim({
    consumeKey,
    deliveryId: BASE_DELIVERY.deliveryId,
    metadata: BASE_METADATA,
    recovered: BASE_DELIVERY.recovered,
    ownerId: "owner-main",
    now: 1,
    leaseMs: 100,
    maxConsumedRecoveryIdsPerReceipt: 8,
  });
  assert.equal(typeof claimed.claimToken, "string");
  for (const table of [
    "coordination_consumer_receipts",
    "coordination_consumer_deliveries",
    "coordination_consumer_recovery_history",
    "coordination_consumer_quarantine_private",
    "coordination_consumer_replays",
  ]) {
    pair.database.exec(
      `CREATE TEMP TABLE ${table} AS
       SELECT * FROM main.${table} WHERE 0`,
    );
  }
  pair.database.exec(
    "INSERT INTO temp.coordination_consumer_receipts "
    + "SELECT * FROM main.coordination_consumer_receipts; "
    + "INSERT INTO temp.coordination_consumer_deliveries "
    + "SELECT * FROM main.coordination_consumer_deliveries",
  );
  pair.database.prepare(
    "UPDATE temp.coordination_consumer_receipts "
    + "SET metadata_message_id = ? WHERE consume_key = ?",
  ).run("cm-temp-shadow", consumeKey);

  const observed = await repository.getReceipt(consumeKey);
  assert.equal(observed.metadata.messageId, BASE_METADATA.messageId);
  assert.equal(
    pair.database.prepare(
      "SELECT metadata_message_id AS messageId "
      + "FROM main.coordination_consumer_receipts WHERE consume_key = ?",
    ).get(consumeKey).messageId,
    BASE_METADATA.messageId,
  );
});

test("runtime provisioning requires the final repository's same-main attestation", () => {
  const profile = createProfile(test);
  const first = profile.createStore();
  const second = profile.createStore();
  const repositoryA = createSqliteCoordinationConsumerRepository({
    database: first.database,
  });
  const repositoryB = createSqliteCoordinationConsumerRepository({
    database: second.database,
  });
  const forged = Object.freeze({
    ...repositoryA,
    ackReconciliation: repositoryB.ackReconciliation,
  });
  const client = createStaticManagedClient();
  profile.admitTestManagedClient(client);

  assert.throws(
    () => profile.provisionRuntime({
      database: first.database,
      originCapability: first.originCapability,
      repository: forged,
      coordinationClient: client,
    }),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_MISMATCH"
    ),
  );
});

test("ambient claim is rejected before owner DML and rollback changes nothing", () => {
  const profile = createProfile(test);
  const pair = profile.createStore();
  const owner = profile.owner(pair);
  pair.database.exec("BEGIN IMMEDIATE");
  try {
    assert.throws(
      () => owner.claim(SCOPE),
      (error) => (
        error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_UNAVAILABLE"
      ),
    );
    assert.equal(ownerRows(pair.database).length, 0);
  } finally {
    pair.database.exec("ROLLBACK");
  }
  assert.deepEqual(owner.claim(SCOPE), {
    status: "claimed",
    generation: 1,
  });
});

test("ambient release is rejected before UPDATE and cannot unblock replacement", () => {
  const profile = createProfile(test);
  const pair = profile.createStore();
  const other = profile.openHandle(pair.storeOrigin);
  const owner = profile.owner(pair);
  const otherOwner = profile.owner(other);
  const claim = owner.claim(SCOPE);
  pair.database.exec("BEGIN IMMEDIATE");
  try {
    assert.throws(
      () => owner.release(SCOPE, claim.generation),
      (error) => (
        error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_UNAVAILABLE"
      ),
    );
    assert.equal(ownerRows(pair.database)[0].owner_state, "owned");
  } finally {
    pair.database.exec("ROLLBACK");
  }
  assert.deepEqual(otherOwner.claim(SCOPE), { status: "owned" });
});

test("raw exact claim and release candidates cannot cross without a witness", () => {
  const profile = createProfile(test);
  const pair = profile.createStore();
  const owner = profile.owner(pair);

  assert.throws(
    () => owner.injectUnwitnessedCandidate({
      operation: "claim",
      candidate: {
        status: "claimed",
        scopeId: SCOPE,
        generation: 1,
        ownerState: "owned",
      },
    }),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_UNAVAILABLE"
    ),
  );
  assert.throws(
    () => owner.injectUnwitnessedCandidate({
      operation: "release",
      candidate: {
        status: "released",
        scopeId: SCOPE,
        generation: 1,
        ownerState: "released",
      },
    }),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_UNAVAILABLE"
    ),
  );
  assert.equal(pair.database.inTransaction, false);
  assert.deepEqual(ownerRows(pair.database), []);
});

test("post-autocommit guards reject registered claim and release witnesses", () => {
  const profile = createProfile(test);
  const pair = profile.createStore();
  const owner = profile.owner(pair);

  assert.throws(
    () => owner.claim(SCOPE, { fault: "post-autocommit-open" }),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_UNAVAILABLE"
    ),
  );
  if (pair.database.inTransaction) pair.database.exec("ROLLBACK");
  const row = ownerRows(pair.database)[0];
  assert.equal(row.owner_state, "owned");

  assert.throws(
    () => owner.release(SCOPE, row.generation, {
      fault: "post-autocommit-open",
    }),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_UNAVAILABLE"
    ),
  );
  if (pair.database.inTransaction) pair.database.exec("ROLLBACK");
});

test("claim is independently visible immediately after the port returns", () => {
  const profile = createProfile(test);
  const pair = profile.createStore();
  const other = profile.openHandle(pair.storeOrigin);
  const owner = profile.owner(pair);
  const otherOwner = profile.owner(other);

  assert.deepEqual(owner.claim(SCOPE), {
    status: "claimed",
    generation: 1,
  });
  assert.deepEqual(ownerRows(other.database), [{
    scope_id: SCOPE,
    generation: 1,
    owner_state: "owned",
  }]);
  assert.deepEqual(otherOwner.claim(SCOPE), { status: "owned" });
});

test("returned-row admission rejects malformed rows and changes-like results", () => {
  const profile = createProfile(test);
  const pair = profile.createStore();
  const other = profile.openHandle(pair.storeOrigin);
  const owner = profile.owner(pair);

  assert.throws(
    () => owner.claim(SCOPE, { fault: "claim-malformed-row" }),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_UNAVAILABLE"
    ),
  );
  assert.deepEqual(profile.owner(other).claim(SCOPE), { status: "owned" });

  for (const fault of ["claim-changes-result", "release-malformed-row"]) {
    assert.throws(
      () => (
        fault.startsWith("release")
          ? owner.release(SCOPE, 1, { fault })
          : owner.claim(SCOPE, { fault })
      ),
      (error) => (
        error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_UNAVAILABLE"
      ),
      fault,
    );
  }
});

test("busy and unclassified claims never masquerade as STORE_OWNED", () => {
  const profile = createProfile(test);
  const pair = profile.createStore();
  const other = profile.openHandle(pair.storeOrigin);
  other.database.pragma("busy_timeout = 0");
  pair.database.exec("BEGIN IMMEDIATE");
  try {
    assert.throws(
      () => profile.owner(other).claim(SCOPE),
      (error) => (
        error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_UNAVAILABLE"
        && error.code !== "COORDINATION_CONSUMER_RUNTIME_STORE_OWNED"
      ),
    );
  } finally {
    pair.database.exec("ROLLBACK");
  }
});

test("persistent monotonic generations fence delayed and duplicate releases", () => {
  const profile = createProfile(test);
  const pair = profile.createStore();
  const owner = profile.owner(pair);
  const first = owner.claim(SCOPE);
  assert.deepEqual(owner.release(SCOPE, first.generation), {
    status: "released",
  });
  const second = owner.claim(SCOPE);
  assert.equal(second.generation, 2);
  assert.deepEqual(owner.release(SCOPE, first.generation), {
    status: "not_owned",
  });
  assert.deepEqual(ownerRows(pair.database), [{
    scope_id: SCOPE,
    generation: 2,
    owner_state: "owned",
  }]);
  assert.deepEqual(owner.release(SCOPE, second.generation), {
    status: "released",
  });
  assert.deepEqual(owner.release(SCOPE, second.generation), {
    status: "not_owned",
  });
  assert.deepEqual(ownerRows(pair.database), [{
    scope_id: SCOPE,
    generation: 2,
    owner_state: "released",
  }]);
});

test("successful exact release preserves generation for the next claim", () => {
  const profile = createProfile(test);
  const pair = profile.createStore();
  const observer = profile.openHandle(pair.storeOrigin);
  const owner = profile.owner(pair);
  const observingOwner = profile.owner(observer);
  const first = owner.claim("scope-no-reset");
  owner.release("scope-no-reset", first.generation);
  const second = owner.claim("scope-no-reset");
  const released = owner.release("scope-no-reset", second.generation);
  const rowAfterRelease = ownerRows(observer.database).find(
    ({ scope_id: scopeId }) => scopeId === "scope-no-reset",
  );
  const third = observingOwner.claim("scope-no-reset");

  assert.deepEqual({
    released,
    rowAfterRelease,
    third,
  }, {
    released: { status: "released" },
    rowAfterRelease: {
      scope_id: "scope-no-reset",
      generation: 2,
      owner_state: "released",
    },
    third: {
      status: "claimed",
      generation: 3,
    },
  });
});

test("delayed release predicate leaves the replacement row owned", () => {
  const profile = createProfile(test);
  const pair = profile.createStore();
  const observer = profile.openHandle(pair.storeOrigin);
  const owner = profile.owner(pair);
  const first = owner.claim("scope-exact-release");
  owner.release("scope-exact-release", first.generation);
  const replacement = owner.claim("scope-exact-release");
  const delayedResult = owner.release(
    "scope-exact-release",
    first.generation,
  );
  const durableRow = ownerRows(observer.database).find(
    ({ scope_id: scopeId }) => scopeId === "scope-exact-release",
  );

  assert.deepEqual({
    replacement,
    delayedResult,
    durableRow,
  }, {
    replacement: {
      status: "claimed",
      generation: 2,
    },
    delayedResult: {
      status: "not_owned",
    },
    durableRow: {
      scope_id: "scope-exact-release",
      generation: 2,
      owner_state: "owned",
    },
  });
});

test("maximum generation is permanently exhausted without wrap, reset, or delete", () => {
  const profile = createProfile(test);
  const pair = profile.createStore();
  pair.database.prepare(
    `INSERT INTO main.${OWNER_TABLE}
       (scope_id, generation, owner_state)
     VALUES (?, 9007199254740991, 'released')`,
  ).run(SCOPE);

  assert.throws(
    () => profile.owner(pair).claim(SCOPE),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_EXHAUSTED"
    ),
  );
  assert.deepEqual(ownerRows(pair.database), [{
    scope_id: SCOPE,
    generation: Number.MAX_SAFE_INTEGER,
    owner_state: "released",
  }]);
});

test("two admitted handles start exactly one runtime and replace after exact stop", async () => {
  const profile = createProfile(test);
  const first = profile.createStore();
  const second = profile.openHandle(first.storeOrigin);
  const harnesses = [
    createRuntimeHarness({ profile, pair: first }),
    createRuntimeHarness({ profile, pair: second }),
  ];

  try {
    const starts = await Promise.allSettled(
      harnesses.map(({ runtime }) => runtime.start()),
    );
    const winner = starts.findIndex(({ status }) => status === "fulfilled");
    const loser = winner === 0 ? 1 : 0;
    assert.notEqual(winner, -1);
    assert.equal(
      starts[loser].reason?.code,
      "COORDINATION_CONSUMER_RUNTIME_STORE_OWNED",
    );
    assert.equal(harnesses[loser].coordinationClient.calls.length, 0);

    await harnesses[winner].runtime.stop();
    await harnesses[loser].runtime.start();
    await harnesses[loser].runtime.stop();
    assert.deepEqual(ownerRows(first.database), [{
      scope_id: SCOPE,
      generation: 2,
      owner_state: "released",
    }]);
    assert.deepEqual(
      [first.database, second.database].map((database) =>
        database.prepare("SELECT 42 AS value").get().value),
      [42, 42],
    );
  } finally {
    await Promise.allSettled(
      harnesses.map(({ runtime }) => runtime.stop()),
    );
  }
});

test("three independent 400-handle runs produce one same-store winner each", () => {
  const profile = createProfile(test);
  const store = profile.createStore();

  for (let run = 0; run < 3; run += 1) {
    const pairs = [
      store,
      ...Array.from(
        { length: 399 },
        () => profile.openHandle(store.storeOrigin),
      ),
    ];
    const results = pairs.map((pair) =>
      profile.owner(pair).claim(`scope-400-${run}`));
    assert.equal(
      results.filter(({ status }) => status === "claimed").length,
      1,
    );
    assert.equal(
      results.filter(({ status }) => status === "owned").length,
      399,
    );
    for (const pair of pairs.slice(1)) pair.database.close();
  }
});

test("independent processes contend through one named-profile main row", async () => {
  const profile = createProfile(test);
  const store = profile.createStore();
  const results = await profile.contendInIndependentProcesses(
    store.storeOrigin,
    {
      count: 8,
      scopeId: "scope-process-race",
    },
  );

  assert.equal(results.filter(({ status }) => status === "claimed").length, 1);
  assert.equal(results.filter(({ status }) => status === "owned").length, 7);
  assert.equal(results.filter(({ status }) => status === "error").length, 0);
  assert.deepEqual(ownerRows(store.database), [{
    scope_id: "scope-process-race",
    generation: 1,
    owner_state: "owned",
  }]);
});

async function exerciseUnrelatedDirection({
  profile,
  target,
  unrelated,
  label,
}) {
  const unrelatedOwner = profile.owner(unrelated);
  for (let run = 0; run < 3; run += 1) {
    const reader = await profile.startOrdinaryReader(unrelated.storeOrigin);
    const pairs = Array.from(
      { length: 400 },
      () => profile.openHandle(target.storeOrigin),
    );
    try {
      for (let index = 0; index < pairs.length; index += 1) {
        assert.equal(
          pairs[index].database.prepare("SELECT value FROM marker").get().value,
          target.database.prepare("SELECT value FROM marker").get().value,
        );
        const scopeId = `scope-unrelated-${label}-${run}-${index}`;
        assert.equal(unrelatedOwner.claim(scopeId).status, "claimed");
        if (index % 100 === 0) {
          createOwnerTempShadow(pairs[index].database);
          pairs[index].database.exec(
            "ATTACH DATABASE ':memory:' AS shadow; "
            + `CREATE TABLE shadow.${OWNER_TABLE} AS `
            + `SELECT * FROM main.${OWNER_TABLE} WHERE 0`,
          );
        }
        assert.equal(
          profile.owner(pairs[index]).claim(scopeId).status,
          "claimed",
        );
      }
      const common = pairs.map((pair) =>
        profile.owner(pair).claim(`scope-common-${label}-${run}`));
      assert.equal(
        common.filter(({ status }) => status === "claimed").length,
        1,
      );
      assert.equal(
        common.filter(({ status }) => status === "owned").length,
        399,
      );
    } finally {
      await reader.stop();
      for (const pair of pairs) pair.database.close();
    }
  }
}

test("bidirectional unrelated reads cannot substitute a store across three-by-400 runs", async () => {
  const profile = createProfile(test);
  const wal = profile.createStore();
  const rollback = profile.createStore();
  wal.database.pragma("journal_mode = WAL");
  rollback.database.pragma("journal_mode = DELETE");
  wal.database.exec("CREATE TABLE marker(value INTEGER); INSERT INTO marker VALUES (7)");
  rollback.database.exec(
    "CREATE TABLE marker(value INTEGER); INSERT INTO marker VALUES (9)",
  );

  await exerciseUnrelatedDirection({
    profile,
    target: wal,
    unrelated: rollback,
    label: "wal-target",
  });
  await exerciseUnrelatedDirection({
    profile,
    target: rollback,
    unrelated: wal,
    label: "rollback-target",
  });
});

test("genuine origin capability is bound to the exact issuer-opened handle", () => {
  const profile = createProfile(test);
  const first = profile.createStore();
  const wrongStore = profile.createStore();
  const secondHandle = profile.openHandle(first.storeOrigin);

  assert.throws(
    () => profile.owner({
      database: wrongStore.database,
      originCapability: first.originCapability,
    }),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_PROFILE_INVALID"
    ),
  );
  assert.throws(
    () => profile.owner({
      database: secondHandle.database,
      originCapability: first.originCapability,
    }),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_PROFILE_INVALID"
    ),
  );
  assert.deepEqual(profile.owner(first).claim(SCOPE), {
    status: "claimed",
    generation: 1,
  });
});

test("origin issuer accepts no caller path or handle and capabilities are not forgeable", () => {
  const profile = createProfile(test);
  const otherProfile = createProfile(test);
  const pair = profile.createStore();

  assert.equal(profile.openPath, undefined);
  assert.equal(profile.admitHandle, undefined);
  for (const forged of [
    {},
    { ...pair.originCapability },
    pair.storeOrigin,
  ]) {
    assert.throws(
      () => profile.owner({
        database: pair.database,
        originCapability: forged,
      }),
      (error) => (
        error?.code === "COORDINATION_CONSUMER_RUNTIME_PROFILE_INVALID"
      ),
    );
  }
  assert.throws(
    () => otherProfile.owner(pair),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_PROFILE_INVALID"
    ),
  );
  profile.revoke(pair.originCapability);
  assert.throws(
    () => profile.owner(pair),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_PROFILE_INVALID"
    ),
  );
});

test("generic production and bare database construction stay fixed unsupported", () => {
  const profile = createProfile(test);
  const pair = profile.createStore();
  const repository = createSqliteCoordinationConsumerRepository({
    database: pair.database,
  });

  assert.throws(
    () => coordinationModule.createCoordinationConsumerRuntime({
      database: pair.database,
      repository,
      coordinationClient: createStaticManagedClient(),
      consumerConfig: { scopeId: SCOPE },
    }),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_PROFILE_UNSUPPORTED"
    ),
  );
});

test("PostgreSQL-shaped and in-memory stores fail their independent admission guards", () => {
  const profile = createProfile(test);
  const sqlCapablePostgres = {
    backend: "postgres",
    memory: false,
    prepare() {
      throw new Error("backend guard must run before SQL");
    },
    transaction() {
      throw new Error("backend guard must run before SQL");
    },
    pragma() {
      throw new Error("backend guard must run before SQL");
    },
  };
  assert.throws(
    () => profile.probeUnsupportedBackend(sqlCapablePostgres),
    /SQLite backend is required; PostgreSQL is deferred to Project V5 I\/0\/05/,
  );

  const memory = new Database(":memory:");
  try {
    memory.backend = "sqlite";
    assert.throws(
      () => profile.probeUnsupportedBackend(memory),
      (error) => (
        error?.code === "COORDINATION_CONSUMER_RUNTIME_PROFILE_UNSUPPORTED"
      ),
    );
  } finally {
    memory.close();
  }
});

test("one managed-client lineage has one immutable store assignment", () => {
  const profile = createProfile(test);
  const first = profile.createStore();
  const second = profile.createStore();
  const client = createStaticManagedClient();
  const harness = createRuntimeHarness({
    profile,
    pair: first,
    coordinationClient: client,
  });
  const repositoryB = createSqliteCoordinationConsumerRepository({
    database: second.database,
  });

  assert.deepEqual(profile.probeConfiguredStoreSubstitution({
    provision: harness.provision,
    database: second.database,
    originCapability: second.originCapability,
    repository: repositoryB,
  }), {
    status: "rejected",
    code: "COORDINATION_CONSUMER_RUNTIME_PROFILE_INVALID",
  });

  const copiedClient = Object.freeze({ ...client });
  assert.throws(
    () => profile.provisionRuntime({
      database: second.database,
      originCapability: second.originCapability,
      repository: repositoryB,
      coordinationClient: copiedClient,
    }),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_PROFILE_INVALID"
    ),
  );

  assert.throws(
    () => profile.provisionRuntime({
      database: second.database,
      originCapability: second.originCapability,
      repository: repositoryB,
      coordinationClient: client,
    }),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_MISMATCH"
    ),
  );
  assert.deepEqual(ownerRows(first.database), []);
  assert.deepEqual(ownerRows(second.database), []);
});

test("equal scope text remains independent only for genuinely distinct lineages", async () => {
  const profile = createProfile(test);
  const first = createRuntimeHarness({
    profile,
    pair: profile.createStore(),
    coordinationClient: createStaticManagedClient({
      participantId: "pt-distinct-a",
    }),
  });
  const second = createRuntimeHarness({
    profile,
    pair: profile.createStore(),
    coordinationClient: createStaticManagedClient({
      participantId: "pt-distinct-b",
    }),
  });

  assert.equal((await first.runtime.start()).status, "started");
  assert.equal((await second.runtime.start()).status, "started");
  await first.runtime.stop();
  await second.runtime.stop();
});

test("real D1-to-D2 rejoin retires D1 before issuing a same-store D2 permit", async () => {
  const profile = createProfile(test);
  const storeA = profile.createStore();
  const storeB = profile.createStore();
  const managed = createRejoiningClient();
  const releaseEntered = createDeferred();
  const releaseBarrier = createDeferred();
  await managed.client.start();
  const harness = createRuntimeHarness({
    profile,
    pair: storeA,
    coordinationClient: managed.client,
    lifecycle: {
      async beforeRelease() {
        releaseEntered.resolve();
        await releaseBarrier.promise;
      },
    },
  });
  await harness.runtime.start();
  await waitFor(
    () => managed.client.getStatus().participantId === "pt-d1",
    "D1 was not installed",
  );

  managed.scheduler.runNext();
  await managed.workAborted;
  await waitFor(
    () => managed.client.getStatus().participantId === "pt-d2",
    "D2 was not installed",
  );
  assert.throws(
    () => profile.provisionSuccessorRuntime({
      predecessorProvision: harness.provision,
      acquireAckRecovery: createAckRecoveryAcquirer(),
    }),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_CLIENT_NOT_READY"
    ),
    "D2 provision must remain unavailable before D1 exact retirement",
  );
  assert.deepEqual(profile.probeRuntimePermit(harness.provision), {
    status: "retiring",
    predecessorRevoked: true,
  });
  await assert.rejects(
    harness.runtime.start(),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_LINEAGE_RETIRING"
    ),
  );
  assert.throws(
    () => profile.provisionRuntime({
      database: storeB.database,
      originCapability: storeB.originCapability,
      repository: createSqliteCoordinationConsumerRepository({
        database: storeB.database,
      }),
      coordinationClient: managed.client,
    }),
    (error) => (
      error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_MISMATCH"
    ),
  );
  assert.deepEqual(ownerRows(storeB.database), []);

  managed.releaseWork();
  await releaseEntered.promise;
  assert.deepEqual(profile.probeRuntimePermit(harness.provision), {
    status: "retiring",
    predecessorRevoked: true,
  });
  releaseBarrier.resolve();
  await harness.runtime.stop();
  await waitFor(
    () => managed.client.getStatus().participantId === "pt-d2",
    "D2 permit was not issued after exact retirement",
  );
  let successor = null;
  try {
    await assert.rejects(
      harness.runtime.start(),
      (error) => (
        error?.code === "COORDINATION_CONSUMER_RUNTIME_LINEAGE_RETIRING"
      ),
      "a D1 provision must not dynamically follow D2",
    );
    await waitFor(
      () => profile.probeRuntimePermit(harness.provision).status === "retired",
      "D1 did not become irreversibly retired",
    );
    const successorProvision = profile.provisionSuccessorRuntime({
      predecessorProvision: harness.provision,
      acquireAckRecovery: createAckRecoveryAcquirer(),
    });
    successor = createRuntimeHarness({
      profile,
      pair: storeA,
      repository: harness.repository,
      coordinationClient: managed.client,
      provision: successorProvision,
    });
    assert.deepEqual(profile.probeRuntimePermit(successorProvision), {
      status: "ready",
      participantId: "pt-d2",
    });
    await successor.runtime.start();
    await successor.runtime.stop();
    assert.deepEqual(ownerRows(storeA.database), [{
      scope_id: SCOPE,
      generation: 2,
      owner_state: "released",
    }]);
    assert.deepEqual(ownerRows(storeB.database), []);
  } finally {
    await Promise.allSettled([
      successor?.runtime.stop(),
      harness.runtime.stop(),
      managed.client.stop(),
    ]);
  }
});

test("revoked D1 runtime work rejects its ACK before D2 credentials are used", async () => {
  const profile = createProfile(test);
  const handlerEntered = createDeferred();
  const releaseHandler = createDeferred();
  const ackAttempted = createDeferred();
  const ackInputs = [];
  const d1Message = {
    ...BASE_METADATA,
    messageId: "cm-owner-revoked-d1-ack",
    toParticipantId: "pt-d1",
    body: "accepted D1 work",
  };
  let deliveryIssued = false;
  const managed = createRejoiningClient({
    receive(input, { signal }) {
      if (!deliveryIssued) {
        deliveryIssued = true;
        return [{
          ...BASE_DELIVERY,
          deliveryId: "71-0",
          message: d1Message,
        }];
      }
      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(abortError());
          return;
        }
        signal?.addEventListener("abort", () => reject(abortError()), {
          once: true,
        });
      });
    },
    observeAck(input) {
      ackInputs.push(input);
    },
  });
  await managed.client.start();
  const harness = createRuntimeHarness({
    profile,
    coordinationClient: managed.client,
    consumerFault(point) {
      if (point === "beforeAck") ackAttempted.resolve();
    },
    handler: async () => {
      handlerEntered.resolve();
      await releaseHandler.promise;
      return {
        status: "committed",
        commitId: "d1-accepted-effect",
      };
    },
  });

  try {
    await harness.runtime.start();
    await handlerEntered.promise;
    managed.scheduler.runNext();
    await waitFor(
      () => managed.client.getStatus().participantId === "pt-d2",
      "D2 credentials were not installed",
    );
    const secondaryRevocationProbe = profile.probeRuntimePermit(
      harness.provision,
    );

    releaseHandler.resolve();
    await ackAttempted.promise;
    await harness.runtime.stop();
    const receipt = await harness.repository.getReceipt(
      canonicalConsumeKey(d1Message),
    );

    assert.deepEqual(
      {
        managedAckInputs: ackInputs,
        receiptState: receipt.state,
      },
      {
        managedAckInputs: [],
        receiptState: "effect_committed",
      },
      "the attempted D1 ACK must reject before managed invocation",
    );
    assert.deepEqual(
      secondaryRevocationProbe,
      {
        status: "retiring",
        predecessorRevoked: true,
      },
      "the test-only revocation probe is a secondary signal",
    );
    assert.deepEqual(ownerRows(harness.pair.database), [{
      scope_id: SCOPE,
      generation: 1,
      owner_state: "released",
    }]);
  } finally {
    releaseHandler.resolve();
    managed.releaseWork();
    await Promise.allSettled([
      harness.runtime.stop(),
      managed.client.stop(),
    ]);
  }
});

test("D2 successor permit resolves the lineage store without a store parameter", async () => {
  const profile = createProfile(test);
  const storeA = profile.createStore();
  const storeB = profile.createStore();
  const repositoryB = createSqliteCoordinationConsumerRepository({
    database: storeB.database,
  });
  const managed = createRejoiningClient();
  await managed.client.start();
  const predecessor = createRuntimeHarness({
    profile,
    pair: storeA,
    coordinationClient: managed.client,
  });
  let successor = null;
  try {
    await predecessor.runtime.start();
    managed.scheduler.runNext();
    await managed.workAborted;
    await waitFor(
      () => managed.client.getStatus().participantId === "pt-d2",
      "D2 was not installed",
    );
    managed.releaseWork();
    await predecessor.runtime.stop();
    await waitFor(
      () => (
        profile.probeRuntimePermit(predecessor.provision).status === "retired"
      ),
      "D1 did not become irreversibly retired",
    );

    const successorProvision = profile.provisionSuccessorRuntime({
      predecessorProvision: predecessor.provision,
      acquireAckRecovery: createAckRecoveryAcquirer(),
      database: storeB.database,
      originCapability: storeB.originCapability,
      repository: repositoryB,
    });
    successor = createRuntimeHarness({
      profile,
      pair: storeA,
      repository: predecessor.repository,
      coordinationClient: managed.client,
      provision: successorProvision,
    });
    await successor.runtime.start();
    await successor.runtime.stop();

    assert.deepEqual(ownerRows(storeA.database), [{
      scope_id: SCOPE,
      generation: 2,
      owner_state: "released",
    }]);
    assert.deepEqual(ownerRows(storeB.database), []);
  } finally {
    managed.releaseWork();
    await Promise.allSettled([
      successor?.runtime.stop(),
      predecessor.runtime.stop(),
      managed.client.stop(),
    ]);
  }
});

test("failed D1 retirement faults the lineage and never issues D2", async () => {
  const profile = createProfile(test);
  const managed = createRejoiningClient();
  await managed.client.start();
  const harness = createRuntimeHarness({
    profile,
    coordinationClient: managed.client,
    lifecycle: {
      async beforeRelease() {
        throw new Error("forced retirement failure");
      },
    },
  });
  await harness.runtime.start();
  managed.scheduler.runNext();
  await managed.workAborted;
  managed.releaseWork();
  await assert.rejects(harness.runtime.stop(), /forced retirement failure/);
  await waitForRejectionCode(
    () => harness.runtime.start(),
    "COORDINATION_CONSUMER_RUNTIME_LINEAGE_FAULTED",
    "failed retirement did not operationally fault the lineage",
  );
  assert.deepEqual(
    profile.probeRuntimePermit(harness.provision),
    { status: "faulted" },
    "the test-only fault probe is a secondary signal",
  );
  await managed.client.stop();
});

test("initialization failure compensates exact generation after created work settles", async () => {
  const profile = createProfile(test);
  const harness = createRuntimeHarness({
    profile,
    handler: null,
  });
  await assert.rejects(harness.runtime.start());
  assert.deepEqual(ownerRows(harness.pair.database), [{
    scope_id: SCOPE,
    generation: 1,
    owner_state: "released",
  }]);
  assert.equal(harness.coordinationClient.calls.length, 0);
});

test("failed compensation and failed exact release retain authoritative owned state", async () => {
  const profile = createProfile(test);
  const compensation = createRuntimeHarness({
    profile,
    pair: profile.createStore(),
    handler: null,
    ownerFaults: { compensationRelease: "fail" },
  });
  await assert.rejects(compensation.runtime.start());
  assert.equal(ownerRows(compensation.pair.database)[0].owner_state, "owned");

  const release = createRuntimeHarness({
    profile,
    pair: profile.createStore(),
    ownerFaults: { release: "fail" },
  });
  await release.runtime.start();
  await assert.rejects(release.runtime.stop());
  assert.equal(ownerRows(release.pair.database)[0].owner_state, "owned");
});

test("runtime release waits until accepted consumer work has settled", async () => {
  const profile = createProfile(test);
  const abortObserved = createDeferred();
  const workRelease = createDeferred();
  const settlementOrder = [];
  let releaseStarted = false;
  const client = createStaticManagedClient({
    async receive(_input, { signal }) {
      signal.addEventListener("abort", () => abortObserved.resolve(), {
        once: true,
      });
      await workRelease.promise;
      settlementOrder.push("consumer-settled");
      return [];
    },
  });
  const harness = createRuntimeHarness({
    profile,
    coordinationClient: client,
    lifecycle: {
      beforeRelease() {
        releaseStarted = true;
        settlementOrder.push("release-started");
      },
    },
  });
  await harness.runtime.start();
  const stopping = harness.runtime.stop();
  await abortObserved.promise;
  for (let turn = 0; turn < 20 && !releaseStarted; turn += 1) {
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }
  assert.equal(releaseStarted, false);
  assert.equal(ownerRows(harness.pair.database)[0].owner_state, "owned");
  workRelease.resolve();
  await stopping;
  assert.deepEqual(settlementOrder, [
    "consumer-settled",
    "release-started",
  ]);
  assert.equal(ownerRows(harness.pair.database)[0].owner_state, "released");
});

test("crashed independent owner and active-state copy remain non-expiring blocks", async () => {
  const profile = createProfile(test);
  const store = profile.createStore();
  await profile.claimAndExit(store.storeOrigin, {
    scopeId: "scope-crashed",
  });
  assert.deepEqual(profile.owner(store).claim("scope-crashed"), {
    status: "owned",
  });

  const copy = await profile.copyStore(store.storeOrigin);
  assert.deepEqual(profile.owner(copy).claim("scope-crashed"), {
    status: "owned",
  });
  assert.equal(profile.clearOwner, undefined);
  assert.equal(profile.takeoverOwner, undefined);
});

test("released snapshot rollback demonstrates why online restore is prohibited", async () => {
  const profile = createProfile(test);
  const store = profile.createStore();
  const owner = profile.owner(store);
  const first = owner.claim(SCOPE);
  owner.release(SCOPE, first.generation);
  const releasedSnapshot = await profile.copyStore(store.storeOrigin);
  const second = owner.claim(SCOPE);
  owner.release(SCOPE, second.generation);

  assert.deepEqual(ownerRows(store.database), [{
    scope_id: SCOPE,
    generation: 2,
    owner_state: "released",
  }]);
  assert.deepEqual(ownerRows(releasedSnapshot.database), [{
    scope_id: SCOPE,
    generation: 1,
    owner_state: "released",
  }]);
});

test("runtime and public modules expose no client, store, permit, or recovery authority", () => {
  const profile = createProfile(test);
  const harness = createRuntimeHarness({ profile });
  const publicExports = Reflect.ownKeys(coordinationModule).map(String);

  assert.deepEqual(
    Reflect.ownKeys(harness.runtime).map(String).sort(),
    ["getStatus", "start", "stop"],
  );
  assert.equal(
    publicExports.some((name) =>
      /profile|origin|store.*capability|lineage|permit|owner/i.test(name)),
    false,
  );
  assert.equal(
    Object.values(harness.runtime).includes(harness.coordinationClient),
    false,
  );
  assert.equal(
    Object.values(harness.runtime).includes(harness.pair.database),
    false,
  );
  assert.equal(
    fs.existsSync(
      path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        "../../gateway/src/core/sqlite_store_identity.js",
      ),
    ),
    false,
  );
});
