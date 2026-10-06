import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import * as testProfileModule from "../../gateway/src/core/coordination_consumer_runtime_test_profile.js";
import { withEphemeralRedis } from "./helpers/ephemeral_redis.js";

const requireFromGateway = createRequire(
  new URL("../../gateway/package.json", import.meta.url),
);
const Database = requireFromGateway("better-sqlite3");
const MAX_SAFE_DECIMAL = String(Number.MAX_SAFE_INTEGER);
const profiles = [];
const temporaryRoots = [];

test.after(async () => {
  for (const profile of profiles.reverse()) await profile.dispose();
  for (const root of temporaryRoots.reverse()) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function epochProfileFactory() {
  assert.equal(
    typeof testProfileModule.createSqliteRedisDisposableEpochTestProfile,
    "function",
    "the test-only durable epoch store-binding foundation is missing",
  );
  return testProfileModule.createSqliteRedisDisposableEpochTestProfile;
}

function redisType(record) {
  return record?.type ?? "none";
}

function canonicalCounter(value) {
  return (
    typeof value === "string"
    && /^(0|[1-9][0-9]{0,15})$/.test(value)
    && (
      value.length < MAX_SAFE_DECIMAL.length
      || (
        value.length === MAX_SAFE_DECIMAL.length
        && value <= MAX_SAFE_DECIMAL
      )
    )
  );
}

class FakeRedisBindingOrigin {
  constructor(specification, { records } = {}) {
    this.specification = specification;
    this.commands = [];
    this.records = new Map();
    this.loseNextAllocationReply = false;
    this.loseNextBindReply = false;
    this.repeatNextAllocationReply = false;
    this.lastAllocatedReply = null;
    this.deferredReplies = [];
    this.replyOverrides = [];
    if (records) {
      for (const [key, record] of records) {
        this.records.set(key, { ...record });
      }
    } else {
      this.setString(
        specification.authorityKey,
        specification.authorityRecord,
      );
    }
  }

  cloneRecords() {
    return [...this.records].map(([key, record]) => [key, { ...record }]);
  }

  setString(key, value) {
    this.records.set(key, { type: "string", value, ttl: null });
  }

  setTyped(key, type, value = null) {
    this.records.set(key, { type, value, ttl: null });
  }

  removeOutOfBand(key) {
    this.records.delete(key);
  }

  string(key) {
    const record = this.records.get(key);
    return record?.type === "string" ? record.value : null;
  }

  ttl(key) {
    return this.records.get(key)?.ttl;
  }

  deferNextReply(commandMarker) {
    let signalStarted;
    let releaseReply;
    const started = new Promise((resolve) => {
      signalStarted = resolve;
    });
    const released = new Promise((resolve) => {
      releaseReply = resolve;
    });
    this.deferredReplies.push({ commandMarker, signalStarted, released });
    return Object.freeze({ started, release: releaseReply });
  }

  overrideNextReply(commandMarker, reply) {
    this.replyOverrides.push({ commandMarker, reply });
  }

  async #pauseReply(commandMarker) {
    const index = this.deferredReplies.findIndex(
      (deferred) => deferred.commandMarker === commandMarker,
    );
    if (index === -1) return;
    const [deferred] = this.deferredReplies.splice(index, 1);
    deferred.signalStarted();
    await deferred.released;
  }

  #overrideReply(commandMarker, reply) {
    const index = this.replyOverrides.findIndex(
      (override) => override.commandMarker === commandMarker,
    );
    if (index === -1) return reply;
    return this.replyOverrides.splice(index, 1)[0].reply;
  }

  async sendCommand(command) {
    this.commands.push([...command]);
    if (command[0] !== "EVAL") throw new Error("unexpected Redis command");
    const script = command[1];
    let reply;
    if (script.includes("epoch-store-binding:allocate:v1")) {
      reply = this.#allocate(command);
      await this.#pauseReply("allocate");
      if (this.loseNextAllocationReply) {
        this.loseNextAllocationReply = false;
        throw new Error("allocation reply lost after commit");
      }
      if (
        this.repeatNextAllocationReply
        && reply[0] === "allocated"
        && this.lastAllocatedReply !== null
      ) {
        this.repeatNextAllocationReply = false;
        return ["allocated", this.lastAllocatedReply];
      }
      if (reply[0] === "allocated") this.lastAllocatedReply = reply[1];
      return this.#overrideReply("allocate", reply);
    }
    if (script.includes("epoch-store-binding:bind:v1")) {
      reply = this.#bind(command);
      await this.#pauseReply("bind");
      if (this.loseNextBindReply) {
        this.loseNextBindReply = false;
        throw new Error("bind reply lost after commit");
      }
      return this.#overrideReply("bind", reply);
    }
    if (script.includes("epoch-store-binding:read:v1")) {
      reply = this.#read(command);
      await this.#pauseReply("read");
      return this.#overrideReply("read", reply);
    }
    throw new Error("unknown Redis script");
  }

  #parts(command) {
    const keyCount = Number(command[2]);
    return {
      keys: command.slice(3, 3 + keyCount),
      args: command.slice(3 + keyCount),
    };
  }

  #authorityIsExact(key, expected) {
    const record = this.records.get(key);
    return record?.type === "string" && record.value === expected;
  }

  #counter(key) {
    const record = this.records.get(key);
    if (record === undefined) return "0";
    if (record.type !== "string" || !canonicalCounter(record.value)) {
      return null;
    }
    return record.value;
  }

  #allocate(command) {
    const { keys, args } = this.#parts(command);
    const [authorityKey, counterKey] = keys;
    const [
      authorityRecord,
      bindingPrefix,
      reservedPrefix,
      reservedSuffix,
      ,
      highestObserved = "0",
    ] = args;
    if (!this.#authorityIsExact(authorityKey, authorityRecord)) {
      return ["recovery_required"];
    }
    const counter = this.#counter(counterKey);
    if (counter === null || counter === MAX_SAFE_DECIMAL) {
      return ["recovery_required"];
    }
    if (BigInt(counter) < BigInt(highestObserved)) {
      return ["recovery_required"];
    }
    const next = String(BigInt(counter) + 1n);
    const bindingKey = `${bindingPrefix}${next}`;
    const bindingType = redisType(this.records.get(bindingKey));
    if (bindingType !== "none") {
      if (bindingType !== "string") return ["recovery_required"];
      return ["binding_collision"];
    }
    this.setString(counterKey, next);
    this.setString(bindingKey, `${reservedPrefix}${next}${reservedSuffix}`);
    return ["allocated", next];
  }

  #bind(command) {
    const { keys, args } = this.#parts(command);
    const [authorityKey, counterKey, bindingKey] = keys;
    const [authorityRecord, ordinal, reservedRecord, boundRecord] = args;
    if (!this.#authorityIsExact(authorityKey, authorityRecord)) {
      return ["recovery_required"];
    }
    const counter = this.#counter(counterKey);
    if (
      counter === null
      || BigInt(counter) < BigInt(ordinal)
      || redisType(this.records.get(bindingKey)) !== "string"
      || this.string(bindingKey) !== reservedRecord
    ) {
      return ["recovery_required"];
    }
    this.setString(bindingKey, boundRecord);
    return ["bound"];
  }

  #read(command) {
    const { keys, args } = this.#parts(command);
    const [authorityKey, counterKey, bindingKey] = keys;
    const [authorityRecord, ordinal, boundRecord] = args;
    if (!this.#authorityIsExact(authorityKey, authorityRecord)) {
      return ["recovery_required"];
    }
    const counter = this.#counter(counterKey);
    if (
      counter === null
      || BigInt(counter) < BigInt(ordinal)
      || redisType(this.records.get(bindingKey)) !== "string"
      || this.string(bindingKey) !== boundRecord
    ) {
      return ["recovery_required"];
    }
    return ["bound"];
  }
}

function createHarness({
  authorityId = "redis-authority-a",
  namespaceId = "epoch-namespace-a",
  records,
} = {}) {
  let plane;
  const profile = epochProfileFactory()({
    redisAuthorityId: authorityId,
    redisNamespaceId: namespaceId,
    createRedisOrigin(specification) {
      plane = new FakeRedisBindingOrigin(specification, { records });
      return plane;
    },
  });
  profiles.push(profile);
  return { profile, plane };
}

async function captureCode(operation) {
  try {
    await operation();
    return "RESOLVED";
  } catch (error) {
    return error?.code ?? "UNMAPPED";
  }
}

function createRealHarness(client, {
  authorityId,
  namespaceId,
  prepare,
  beforeCommand,
  afterCommand,
} = {}) {
  let specification;
  const commands = [];
  const profile = epochProfileFactory()({
    redisAuthorityId: authorityId,
    redisNamespaceId: namespaceId,
    createRedisOrigin(candidate) {
      specification = candidate;
      const initialized = (async () => {
        await client.sendCommand([
          "SET",
          candidate.authorityKey,
          candidate.authorityRecord,
        ]);
        if (prepare) await prepare(client, candidate);
      })();
      return Object.freeze({
        async sendCommand(command) {
          await initialized;
          commands.push([...command]);
          const context = Object.freeze({
            client,
            specification,
            command: Object.freeze([...command]),
          });
          if (beforeCommand) await beforeCommand(context);
          const reply = await client.sendCommand(command);
          if (afterCommand) await afterCommand(Object.freeze({
            ...context,
            reply,
          }));
          return reply;
        },
        async close() {},
      });
    },
  });
  return { profile, commands, specification };
}

function evalCommands(commands) {
  return commands.filter((command) => command[0] === "EVAL");
}

function redisSnapshot(client, keys) {
  return Promise.all(keys.map(async (key) => Object.freeze({
    key,
    type: await client.sendCommand(["TYPE", key]),
    value: await client.sendCommand(["GET", key]),
    pttl: await client.sendCommand(["PTTL", key]),
  })));
}

function redisValueSnapshot(client, keys) {
  return Promise.all(keys.map(async (key) => Object.freeze({
    key,
    type: await client.sendCommand(["TYPE", key]),
    value: await client.sendCommand(["GET", key]),
  })));
}

function storeRow(database) {
  return database.prepare(
    `SELECT singleton,
            protocol_version,
            redis_authority_id,
            redis_namespace_id,
            redis_binding_ordinal,
            allocation_state
     FROM main.coordination_consumer_runtime_epoch_store
     ORDER BY singleton`,
  ).all();
}

function bindingRecord(authorityId, namespaceId, ordinal, allocationState) {
  return {
    protocolVersion: 1,
    redisAuthorityId: authorityId,
    redisNamespaceId: namespaceId,
    bindingOrdinal: ordinal,
    allocationState,
  };
}

function assertRejectsCode(operation, code) {
  return assert.rejects(operation, (error) => error?.code === code);
}

function marker(command) {
  if (command[1].includes("epoch-store-binding:allocate:v1")) return "allocate";
  if (command[1].includes("epoch-store-binding:bind:v1")) return "bind";
  if (command[1].includes("epoch-store-binding:read:v1")) return "read";
  return "unknown";
}

function assertNoDestructiveOrExpiringCommands(plane) {
  const forbidden = new Set([
    "DEL",
    "UNLINK",
    "EXPIRE",
    "PEXPIRE",
    "EXPIREAT",
    "PEXPIREAT",
  ]);
  assert.ok(plane.commands.length > 0);
  for (const command of plane.commands) {
    assert.equal(forbidden.has(command[0].toUpperCase()), false);
    assert.equal(command[0], "EVAL");
    assert.doesNotMatch(
      command[1],
      /redis\.call\(['"](?:DEL|UNLINK|EXPIRE|PEXPIRE|EXPIREAT|PEXPIREAT)['"]/i,
    );
    assert.doesNotMatch(
      command[1],
      /redis\.call\(['"]SET['"][\s\S]*?['"](?:EX|PX|EXAT|PXAT)['"]/i,
    );
  }
}

test("the WIRING-A profile cannot issue an epoch-store capability", async () => {
  const profile = testProfileModule.createSqliteDisposableRuntimeProfile();
  profiles.push(profile);
  assert.equal(profile.createEpochStore, undefined);
  assert.equal(profile.admitEpochStore, undefined);
});

test("allocation creates exact persistent keys and binds one exact SQLite main row", async () => {
  const authorityId = "redis-authority-exact";
  const namespaceId = "namespace-exact";
  const { profile, plane } = createHarness({ authorityId, namespaceId });
  const store = await profile.createStore();

  assert.deepEqual(storeRow(store.database), [{
    singleton: 1,
    protocol_version: 1,
    redis_authority_id: authorityId,
    redis_namespace_id: namespaceId,
    redis_binding_ordinal: 1,
    allocation_state: "bound",
  }]);
  const authorityKey = `${namespaceId}:epoch:authority`;
  const counterKey = `${namespaceId}:epoch:binding-counter`;
  const bindingKey = `${namespaceId}:epoch:binding:1`;
  assert.equal(
    plane.string(authorityKey),
    JSON.stringify({
      protocolVersion: 1,
      redisAuthorityId: authorityId,
      redisNamespaceId: namespaceId,
    }),
  );
  assert.equal(plane.string(counterKey), "1");
  assert.equal(
    plane.string(bindingKey),
    JSON.stringify(bindingRecord(authorityId, namespaceId, 1, "bound")),
  );
  assert.equal(plane.ttl(authorityKey), null);
  assert.equal(plane.ttl(counterKey), null);
  assert.equal(plane.ttl(bindingKey), null);
  assert.deepEqual(plane.commands.map(marker), ["allocate", "bind"]);
  assert.deepEqual(await profile.admitStore(store), { status: "admitted" });
  assert.deepEqual(plane.commands.map(marker), ["allocate", "bind", "read"]);
  assertNoDestructiveOrExpiringCommands(plane);
});

test("a lost allocation reply leaves an orphan and retry uses a greater ordinal", async () => {
  const authorityId = "redis-authority-lost-allocation";
  const namespaceId = "namespace-lost-allocation";
  const { profile, plane } = createHarness({ authorityId, namespaceId });
  plane.loseNextAllocationReply = true;

  await assertRejectsCode(() => profile.createStore(), "RECOVERY_REQUIRED");
  const store = await profile.createStore();
  assert.equal(storeRow(store.database)[0].redis_binding_ordinal, 2);
  assert.equal(
    plane.string(`${namespaceId}:epoch:binding:1`),
    JSON.stringify(bindingRecord(authorityId, namespaceId, 1, "reserved")),
  );
  assert.equal(
    plane.string(`${namespaceId}:epoch:binding:2`),
    JSON.stringify(bindingRecord(authorityId, namespaceId, 2, "bound")),
  );
  assert.equal(plane.string(`${namespaceId}:epoch:binding-counter`), "2");
  assert.deepEqual(plane.commands.map(marker), ["allocate", "allocate", "bind"]);
});

test("a lost bind reply converges only by exact readback for its initialized origin", async () => {
  const authorityId = "redis-authority-lost-bind";
  const namespaceId = "namespace-lost-bind";
  const { profile, plane } = createHarness({ authorityId, namespaceId });
  plane.loseNextBindReply = true;

  const store = await profile.createStore();
  assert.deepEqual(plane.commands.map(marker), ["allocate", "bind", "read"]);
  assert.deepEqual(await profile.admitStore(store), { status: "admitted" });

  const clonedRecords = plane.cloneRecords();
  const fresh = createHarness({ authorityId, namespaceId, records: clonedRecords });
  const freshStore = await fresh.profile.createStore();
  assert.equal(storeRow(freshStore.database)[0].redis_binding_ordinal, 2);
  assert.equal(
    fresh.plane.string(`${namespaceId}:epoch:binding:1`),
    JSON.stringify(bindingRecord(authorityId, namespaceId, 1, "bound")),
  );
});

test("repeated ordinals and exact-looking pre-existing binding records collide", async (t) => {
  await t.test("a faulted allocator reply cannot repeat an issued ordinal", async () => {
    const { profile, plane } = createHarness({
      namespaceId: "namespace-repeat-reply",
    });
    await profile.createStore();
    plane.repeatNextAllocationReply = true;
    await assertRejectsCode(() => profile.createStore(), "BINDING_COLLISION");
    const commandsAfterFault = plane.commands.length;
    assert.equal(await captureCode(() => profile.createStore()), "BINDING_COLLISION");
    assert.equal(plane.commands.length, commandsAfterFault);
  });

  for (const allocationState of ["reserved", "bound"]) {
    await t.test(`an existing ${allocationState} record is never adopted`, async () => {
      const authorityId = `redis-authority-existing-${allocationState}`;
      const namespaceId = `namespace-existing-${allocationState}`;
      let plane;
      const profile = epochProfileFactory()({
        redisAuthorityId: authorityId,
        redisNamespaceId: namespaceId,
        createRedisOrigin(specification) {
          plane = new FakeRedisBindingOrigin(specification);
          plane.setString(specification.counterKey, "0");
          plane.setString(
            `${specification.bindingPrefix}1`,
            JSON.stringify(bindingRecord(
              authorityId,
              namespaceId,
              1,
              allocationState,
            )),
          );
          return plane;
        },
      });
      profiles.push(profile);
      await assertRejectsCode(() => profile.createStore(), "BINDING_COLLISION");
      const commandsAfterFault = plane.commands.length;
      const retryCode = await captureCode(() => profile.createStore());
      assert.equal(plane.string(`${namespaceId}:epoch:binding-counter`), "0");
      assert.equal(retryCode, "BINDING_COLLISION");
      assert.equal(plane.commands.length, commandsAfterFault);
    });
  }
});

test("wrong Redis types, malformed state, unsafe counters, and rollback require recovery", async (t) => {
  const cases = [
    ["wrong authority type", (plane, spec) => {
      plane.setTyped(spec.authorityKey, "hash", {});
    }],
    ["malformed authority", (plane, spec) => {
      plane.setString(spec.authorityKey, "{not-canonical}");
    }],
    ["wrong counter type", (plane, spec) => {
      plane.setTyped(spec.counterKey, "list", []);
    }],
    ["malformed counter", (plane, spec) => {
      plane.setString(spec.counterKey, "01");
    }],
    ["overflow counter", (plane, spec) => {
      plane.setString(spec.counterKey, MAX_SAFE_DECIMAL);
    }],
    ["unsafe counter", (plane, spec) => {
      plane.setString(spec.counterKey, "9007199254740992");
    }],
    ["wrong binding type", (plane, spec) => {
      plane.setString(spec.counterKey, "0");
      plane.setTyped(`${spec.bindingPrefix}1`, "set", new Set());
    }],
  ];
  for (const [label, corrupt] of cases) {
    await t.test(label, async () => {
      let plane;
      const profile = epochProfileFactory()({
        redisAuthorityId: `authority-${label.replaceAll(" ", "-")}`,
        redisNamespaceId: `namespace-${label.replaceAll(" ", "-")}`,
        createRedisOrigin(specification) {
          plane = new FakeRedisBindingOrigin(specification);
          corrupt(plane, specification);
          return plane;
        },
      });
      profiles.push(profile);
      await assertRejectsCode(() => profile.createStore(), "RECOVERY_REQUIRED");
    });
  }

  await t.test("a counter rollback is not accepted as a new allocation", async () => {
    const { profile, plane } = createHarness({ namespaceId: "namespace-rollback" });
    plane.setString(plane.specification.counterKey, "5");
    const store = await profile.createStore();
    assert.equal(storeRow(store.database)[0].redis_binding_ordinal, 6);
    plane.setString(plane.specification.counterKey, "4");
    plane.removeOutOfBand(`${plane.specification.bindingPrefix}5`);
    const before = plane.cloneRecords();
    const commandsBefore = plane.commands.length;
    const firstCode = await captureCode(() => profile.createStore());
    const commandsAfterFault = plane.commands.length;
    const retryCode = await captureCode(() => profile.createStore());
    assert.equal(firstCode, "RECOVERY_REQUIRED");
    assert.equal(retryCode, "RECOVERY_REQUIRED");
    assert.deepEqual(plane.cloneRecords(), before);
    assert.equal(commandsAfterFault, commandsBefore + 1);
    assert.equal(plane.commands.length, commandsAfterFault);
  });
});

test("admission rejects malformed Redis authority, counter, and bound records", async (t) => {
  const cases = [
    ["authority mismatch", (plane) => {
      plane.setString(plane.specification.authorityKey, "{}");
    }],
    ["counter rollback", (plane) => {
      plane.setString(plane.specification.counterKey, "0");
    }],
    ["malformed bound record", (plane) => {
      plane.setString(`${plane.specification.bindingPrefix}1`, "{}");
    }],
    ["wrong bound type", (plane) => {
      plane.setTyped(`${plane.specification.bindingPrefix}1`, "hash", {});
    }],
  ];
  for (const [label, corrupt] of cases) {
    await t.test(label, async () => {
      const { profile, plane } = createHarness({
        namespaceId: `namespace-admission-${label.replaceAll(" ", "-")}`,
      });
      const store = await profile.createStore();
      corrupt(plane);
      await assertRejectsCode(() => profile.admitStore(store), "RECOVERY_REQUIRED");
    });
  }
});

test("foreign issuers, copied handles and files, and copied Redis planes have no authority", async () => {
  const authorityId = "redis-authority-copy";
  const namespaceId = "namespace-copy";
  const first = createHarness({ authorityId, namespaceId });
  const store = await first.profile.createStore();
  const commandsBefore = first.plane.commands.length;

  const second = createHarness({
    authorityId,
    namespaceId,
    records: first.plane.cloneRecords(),
  });
  await assertRejectsCode(
    () => first.profile.admitStore({
      ...store,
      redisAuthorityNamespaceCapability:
        second.profile.redisAuthorityNamespaceCapability,
    }),
    "REDIS_AUTHORITY_MISMATCH",
  );
  assert.equal(first.plane.commands.length, commandsBefore);

  const secondHandle = new Database(store.database.name);
  try {
    await assertRejectsCode(
      () => first.profile.admitStore({ ...store, database: secondHandle }),
      "STORE_ORIGIN_MISMATCH",
    );
  } finally {
    secondHandle.close();
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "g002-binding-copy-"));
  temporaryRoots.push(root);
  const copiedPath = path.join(root, "copy.sqlite");
  await store.database.backup(copiedPath);
  const copiedHandle = new Database(copiedPath);
  try {
    await assertRejectsCode(
      () => first.profile.admitStore({ ...store, database: copiedHandle }),
      "STORE_ORIGIN_MISMATCH",
    );
  } finally {
    copiedHandle.close();
  }

  await assertRejectsCode(
    () => first.profile.admitStore({ ...store, storeCapability: {} }),
    "STORE_ORIGIN_MISMATCH",
  );
  await assertRejectsCode(
    () => first.profile.admitStore({ ...store, originCapability: {} }),
    "STORE_ORIGIN_MISMATCH",
  );
  await assertRejectsCode(
    () => second.profile.admitStore(store),
    "STORE_ORIGIN_MISMATCH",
  );
  assert.equal(first.plane.commands.length, commandsBefore);
});

test("SQLite admission is sealed to main and rejects ledger, row, and tuple faults", async (t) => {
  await t.test("TEMP and attached lookalikes cannot redirect admission", async () => {
    const { profile } = createHarness({ namespaceId: "namespace-lookalike" });
    const store = await profile.createStore();
    store.database.exec(`
      CREATE TEMP TABLE coordination_consumer_runtime_epoch_store (
        singleton INTEGER,
        allocation_state TEXT
      );
      INSERT INTO temp.coordination_consumer_runtime_epoch_store
      VALUES (1, 'reserved');
      ATTACH DATABASE ':memory:' AS foreign_epoch;
      CREATE TABLE foreign_epoch.coordination_consumer_runtime_epoch_store (
        singleton INTEGER,
        allocation_state TEXT
      );
      INSERT INTO foreign_epoch.coordination_consumer_runtime_epoch_store
      VALUES (1, 'reserved');
    `);
    assert.deepEqual(await profile.admitStore(store), { status: "admitted" });
    store.database.exec(
      "DELETE FROM main.coordination_consumer_runtime_epoch_store",
    );
    await assertRejectsCode(
      () => profile.admitStore(store),
      "STORE_SCHEMA_UNSUPPORTED",
    );
  });

  await t.test("a changed main schema is not the sealed origin", async () => {
    const { profile } = createHarness({ namespaceId: "namespace-schema-change" });
    const store = await profile.createStore();
    store.database.exec("CREATE TABLE main.binding_schema_mutant(value INTEGER)");
    await assertRejectsCode(
      () => profile.admitStore(store),
      "STORE_SCHEMA_UNSUPPORTED",
    );
  });

  await t.test("an outside-set main ledger row is rejected", async () => {
    const { profile } = createHarness({ namespaceId: "namespace-ledger-change" });
    const store = await profile.createStore();
    store.database.prepare(
      "INSERT INTO main.schema_migrations(id, applied_at) VALUES (?, ?)",
    ).run("999_outside_epoch_profile", "2026-08-03T00:00:00.000Z");
    await assertRejectsCode(
      () => profile.admitStore(store),
      "MIGRATION_PROFILE_MISMATCH",
    );
  });

  await t.test("extra rows and malformed allocation state fail closed", async () => {
    const first = createHarness({ namespaceId: "namespace-extra-row" });
    const extra = await first.profile.createStore();
    extra.database.pragma("ignore_check_constraints = ON");
    extra.database.prepare(
      `INSERT INTO main.coordination_consumer_runtime_epoch_store (
         singleton,
         protocol_version,
         redis_authority_id,
         redis_namespace_id,
         redis_binding_ordinal,
         allocation_state
       ) VALUES (2, 1, 'other-authority', 'other-namespace', 2, 'bound')`,
    ).run();
    await assertRejectsCode(
      () => first.profile.admitStore(extra),
      "STORE_SCHEMA_UNSUPPORTED",
    );

    const second = createHarness({ namespaceId: "namespace-wrong-state" });
    const malformed = await second.profile.createStore();
    malformed.database.pragma("ignore_check_constraints = ON");
    malformed.database.exec(
      `UPDATE main.coordination_consumer_runtime_epoch_store
       SET allocation_state = 'reserved'`,
    );
    await assertRejectsCode(
      () => second.profile.admitStore(malformed),
      "STORE_SCHEMA_UNSUPPORTED",
    );
  });

  await t.test("a valid-looking changed tuple cannot select another plane", async () => {
    const { profile } = createHarness({ namespaceId: "namespace-tuple-change" });
    const store = await profile.createStore();
    store.database.exec(
      `UPDATE main.coordination_consumer_runtime_epoch_store
       SET redis_namespace_id = 'namespace-foreign-valid'`,
    );
    await assertRejectsCode(
      () => profile.admitStore(store),
      "REDIS_AUTHORITY_MISMATCH",
    );
  });
});

test("dispose closes every deferred Redis publication window", async (t) => {
  const cases = ["allocate", "bind", "bind-readback", "admission-read"];
  for (const scenario of cases) {
    await t.test(scenario, async () => {
      const { profile, plane } = createHarness({
        namespaceId: `namespace-dispose-${scenario}`,
      });
      let pending;
      let gate;
      if (scenario === "allocate") {
        gate = plane.deferNextReply("allocate");
        pending = profile.createStore();
      } else if (scenario === "bind") {
        gate = plane.deferNextReply("bind");
        pending = profile.createStore();
      } else if (scenario === "bind-readback") {
        plane.loseNextBindReply = true;
        gate = plane.deferNextReply("read");
        pending = profile.createStore();
      } else {
        const store = await profile.createStore();
        gate = plane.deferNextReply("read");
        pending = profile.admitStore(store);
      }
      await gate.started;
      await profile.dispose();
      gate.release();
      assert.equal(
        await captureCode(() => pending),
        "STORE_ORIGIN_MISMATCH",
      );
    });
  }

  await t.test("an origin database is closed exactly once", async () => {
    const { profile } = createHarness({ namespaceId: "namespace-close-once" });
    const store = await profile.createStore();
    const close = store.database.close.bind(store.database);
    let closeCalls = 0;
    store.database.close = () => {
      closeCalls += 1;
      return close();
    };
    await profile.dispose();
    await profile.dispose();
    assert.equal(closeCalls, 1);
  });
});

test("admission snapshots only exact plain own-data envelopes", async () => {
  const { profile } = createHarness({ namespaceId: "namespace-envelope" });
  const store = await profile.createStore();

  let getterCalls = 0;
  const accessor = { ...store };
  Object.defineProperty(accessor, "database", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return store.database;
    },
  });
  assert.equal(
    await captureCode(() => profile.admitStore(accessor)),
    "STORE_ORIGIN_MISMATCH",
  );
  assert.equal(getterCalls, 0);

  let proxyTraps = 0;
  const proxy = new Proxy(store, {
    get(target, key, receiver) {
      proxyTraps += 1;
      return Reflect.get(target, key, receiver);
    },
    ownKeys(target) {
      proxyTraps += 1;
      return Reflect.ownKeys(target);
    },
  });
  assert.equal(
    await captureCode(() => profile.admitStore(proxy)),
    "STORE_ORIGIN_MISMATCH",
  );
  assert.equal(proxyTraps, 0);

  const malformed = [
    { ...store, unexpected: true },
    { ...store, [Symbol("unexpected")]: true },
    Object.assign(Object.create(null), store),
  ];
  for (const candidate of malformed) {
    assert.equal(
      await captureCode(() => profile.admitStore(candidate)),
      "STORE_ORIGIN_MISMATCH",
    );
  }
  assert.deepEqual(
    await profile.admitStore({ ...store }),
    { status: "admitted" },
  );
});

test("Redis replies and SQLite initialization failures are mapped closed", async (t) => {
  await t.test("reply accessors are never invoked", async () => {
    const { profile, plane } = createHarness({
      namespaceId: "namespace-reply-accessor",
    });
    let getterCalls = 0;
    const reply = [null, "1"];
    Object.defineProperty(reply, "0", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "allocated";
      },
    });
    plane.overrideNextReply("allocate", reply);
    assert.equal(
      await captureCode(() => profile.createStore()),
      "RECOVERY_REQUIRED",
    );
    assert.equal(getterCalls, 0);
  });

  await t.test("reply proxies are rejected without traps", async () => {
    const { profile, plane } = createHarness({
      namespaceId: "namespace-reply-proxy",
    });
    let proxyTraps = 0;
    const reply = new Proxy(["allocated", "1"], {
      get(target, key, receiver) {
        if (key !== "then") proxyTraps += 1;
        return Reflect.get(target, key, receiver);
      },
    });
    plane.overrideNextReply("allocate", reply);
    assert.equal(
      await captureCode(() => profile.createStore()),
      "RECOVERY_REQUIRED",
    );
    assert.equal(proxyTraps, 0);
  });

  await t.test("unknown tuple insertion failures close once and map to schema", async () => {
    const originalPrepare = Database.prototype.prepare;
    const originalClose = Database.prototype.close;
    let closeCalls = 0;
    Database.prototype.prepare = function prepare(sql, ...parameters) {
      if (String(sql).includes(
        "INSERT INTO main.coordination_consumer_runtime_epoch_store",
      )) {
        throw new Error("injected SQLite tuple insertion failure");
      }
      return originalPrepare.call(this, sql, ...parameters);
    };
    Database.prototype.close = function close(...parameters) {
      if (this.name.includes("/g002-epoch-profile-")) closeCalls += 1;
      return originalClose.call(this, ...parameters);
    };
    try {
      const { profile } = createHarness({
        namespaceId: "namespace-sqlite-initialization-failure",
      });
      assert.equal(
        await captureCode(() => profile.createStore()),
        "STORE_SCHEMA_UNSUPPORTED",
      );
      assert.equal(closeCalls, 1);
    } finally {
      Database.prototype.prepare = originalPrepare;
      Database.prototype.close = originalClose;
    }
  });
});

function commandCalls(info, commandNames) {
  return Object.fromEntries(commandNames.map((commandName) => {
    const match = info.match(new RegExp(
      `^cmdstat_${commandName}:calls=([0-9]+)`,
      "m",
    ));
    return [commandName, Number(match?.[1] ?? 0)];
  }));
}

test("the exact submitted Lua runs against disposable Redis", async () => {
  await withEphemeralRedis(async ({ client }) => {
    const authorityId = "real-authority-happy";
    const namespaceId = "real-namespace-happy";
    const harness = createRealHarness(client, { authorityId, namespaceId });
    try {
      const store = await harness.profile.createStore();
      assert.deepEqual(await harness.profile.admitStore(store), {
        status: "admitted",
      });
      assert.equal(storeRow(store.database)[0].redis_binding_ordinal, 1);
      assert.equal(
        await client.sendCommand(["GET", harness.specification.counterKey]),
        "1",
      );
      assert.equal(
        await client.sendCommand([
          "GET",
          `${harness.specification.bindingPrefix}1`,
        ]),
        JSON.stringify(bindingRecord(authorityId, namespaceId, 1, "bound")),
      );
      for (const key of [
        harness.specification.authorityKey,
        harness.specification.counterKey,
        `${harness.specification.bindingPrefix}1`,
      ]) {
        assert.equal(await client.sendCommand(["PTTL", key]), -1);
      }
      assert.deepEqual(harness.commands.map(marker), [
        "allocate",
        "bind",
        "read",
      ]);
      assertNoDestructiveOrExpiringCommands({ commands: harness.commands });
    } finally {
      await harness.profile.dispose();
    }
  });
});

test("a committed bind with both recovery replies lost is terminal", async () => {
  await withEphemeralRedis(async ({ client }) => {
    const authorityId = "real-authority-double-lost-bind";
    const namespaceId = "real-namespace-double-lost-bind";
    let lostBindReply = false;
    let lostReadbackReply = false;
    const harness = createRealHarness(client, {
      authorityId,
      namespaceId,
      async afterCommand({ command }) {
        const commandMarker = marker(command);
        if (commandMarker === "bind" && !lostBindReply) {
          lostBindReply = true;
          throw new Error("bind reply lost after commit");
        }
        if (commandMarker === "read" && !lostReadbackReply) {
          lostReadbackReply = true;
          throw new Error("exact readback reply lost after read");
        }
      },
    });
    try {
      const firstCode = await captureCode(() => harness.profile.createStore());
      const bindingOne = `${harness.specification.bindingPrefix}1`;
      const bindingTwo = `${harness.specification.bindingPrefix}2`;
      const keys = [
        harness.specification.authorityKey,
        harness.specification.counterKey,
        bindingOne,
        bindingTwo,
      ];
      const stateAfterFault = await redisSnapshot(client, keys);
      const commandsAfterFault = harness.commands.length;
      const subsequentCodes = [];
      for (let attempt = 0; attempt < 2; attempt += 1) {
        subsequentCodes.push(
          await captureCode(() => harness.profile.createStore()),
          await captureCode(() => harness.profile.admitStore({})),
        );
      }

      assert.equal(firstCode, "RECOVERY_REQUIRED");
      assert.deepEqual(harness.commands.slice(0, commandsAfterFault).map(marker), [
        "allocate",
        "bind",
        "read",
      ]);
      assert.equal(
        await client.sendCommand(["GET", bindingOne]),
        JSON.stringify(bindingRecord(authorityId, namespaceId, 1, "bound")),
      );
      assert.equal(
        await client.sendCommand(["GET", harness.specification.counterKey]),
        "1",
      );
      assert.deepEqual(subsequentCodes, [
        "RECOVERY_REQUIRED",
        "RECOVERY_REQUIRED",
        "RECOVERY_REQUIRED",
        "RECOVERY_REQUIRED",
      ]);
      assert.equal(harness.commands.length, commandsAfterFault);
      assert.deepEqual(await redisSnapshot(client, keys), stateAfterFault);
      assert.equal(await client.sendCommand(["EXISTS", bindingTwo]), 0);
      assertNoDestructiveOrExpiringCommands({ commands: harness.commands });
    } finally {
      await harness.profile.dispose();
    }
  });
});

test("actual submitted bind and read Lua reject intervening origin faults", async (t) => {
  await withEphemeralRedis(async ({ client }) => {
    await t.test("authority expires after allocation but before bind", async () => {
      let stateBeforeBind;
      let expired = false;
      const harness = createRealHarness(client, {
        authorityId: "real-authority-expire-before-bind",
        namespaceId: "real-namespace-expire-before-bind",
        async beforeCommand({ command, specification }) {
          if (marker(command) !== "bind" || expired) return;
          expired = true;
          await client.sendCommand([
            "PEXPIRE",
            specification.authorityKey,
            "60000",
          ]);
          stateBeforeBind = await redisValueSnapshot(client, [
            specification.authorityKey,
            specification.counterKey,
            `${specification.bindingPrefix}1`,
          ]);
        },
      });
      try {
        const firstCode = await captureCode(() => harness.profile.createStore());
        const commandsAfterFault = harness.commands.length;
        const retryCode = await captureCode(() => harness.profile.createStore());
        assert.equal(firstCode, "RECOVERY_REQUIRED");
        assert.equal(retryCode, "RECOVERY_REQUIRED");
        assert.deepEqual(harness.commands.map(marker), ["allocate", "bind"]);
        assert.equal(harness.commands.length, commandsAfterFault);
        assert.deepEqual(
          await redisValueSnapshot(client, stateBeforeBind.map(({ key }) => key)),
          stateBeforeBind,
        );
        assert.ok(
          await client.sendCommand(["PTTL", harness.specification.authorityKey])
            > 0,
        );
        assert.equal(
          await client.sendCommand([
            "GET",
            `${harness.specification.bindingPrefix}1`,
          ]),
          JSON.stringify(bindingRecord(
            "real-authority-expire-before-bind",
            "real-namespace-expire-before-bind",
            1,
            "reserved",
          )),
        );
      } finally {
        await harness.profile.dispose();
      }
    });

    await t.test("authority expires after bind but before read", async () => {
      let stateBeforeRead;
      let expired = false;
      const harness = createRealHarness(client, {
        authorityId: "real-authority-expire-before-read",
        namespaceId: "real-namespace-expire-before-read",
        async beforeCommand({ command, specification }) {
          if (marker(command) !== "read" || expired) return;
          expired = true;
          await client.sendCommand([
            "PEXPIRE",
            specification.authorityKey,
            "60000",
          ]);
          stateBeforeRead = await redisValueSnapshot(client, [
            specification.authorityKey,
            specification.counterKey,
            `${specification.bindingPrefix}1`,
          ]);
        },
      });
      try {
        const store = await harness.profile.createStore();
        const firstCode = await captureCode(() => harness.profile.admitStore(store));
        const commandsAfterFault = harness.commands.length;
        const retryCode = await captureCode(() => harness.profile.admitStore(store));
        assert.equal(firstCode, "RECOVERY_REQUIRED");
        assert.equal(retryCode, "RECOVERY_REQUIRED");
        assert.deepEqual(harness.commands.map(marker), [
          "allocate",
          "bind",
          "read",
        ]);
        assert.equal(harness.commands.length, commandsAfterFault);
        assert.deepEqual(
          await redisValueSnapshot(client, stateBeforeRead.map(({ key }) => key)),
          stateBeforeRead,
        );
        assert.ok(
          await client.sendCommand(["PTTL", harness.specification.authorityKey])
            > 0,
        );
      } finally {
        await harness.profile.dispose();
      }
    });

    await t.test("exact bound bytes are corrupted before read", async () => {
      const authorityId = "real-authority-corrupt-before-read";
      const namespaceId = "real-namespace-corrupt-before-read";
      const corruptedBound = JSON.stringify(
        bindingRecord(authorityId, namespaceId, 1, "b0und"),
      );
      let stateBeforeRead;
      let corrupted = false;
      const harness = createRealHarness(client, {
        authorityId,
        namespaceId,
        async beforeCommand({ command, specification }) {
          if (marker(command) !== "read" || corrupted) return;
          corrupted = true;
          await client.sendCommand([
            "SET",
            `${specification.bindingPrefix}1`,
            corruptedBound,
          ]);
          stateBeforeRead = await redisSnapshot(client, [
            specification.authorityKey,
            specification.counterKey,
            `${specification.bindingPrefix}1`,
          ]);
        },
      });
      try {
        const store = await harness.profile.createStore();
        const firstCode = await captureCode(() => harness.profile.admitStore(store));
        const commandsAfterFault = harness.commands.length;
        const retryCode = await captureCode(() => harness.profile.admitStore(store));
        assert.equal(firstCode, "RECOVERY_REQUIRED");
        assert.equal(retryCode, "RECOVERY_REQUIRED");
        assert.deepEqual(harness.commands.map(marker), [
          "allocate",
          "bind",
          "read",
        ]);
        assert.equal(harness.commands.length, commandsAfterFault);
        assert.deepEqual(
          await redisSnapshot(client, stateBeforeRead.map(({ key }) => key)),
          stateBeforeRead,
        );
        assert.equal(
          await client.sendCommand([
            "GET",
            `${harness.specification.bindingPrefix}1`,
          ]),
          corruptedBound,
        );
      } finally {
        await harness.profile.dispose();
      }
    });
  });
});

test("real Lua rollback and collision faults are non-mutating and terminal", async (t) => {
  await withEphemeralRedis(async ({ client }) => {
    await t.test("counter rollback", async () => {
      const harness = createRealHarness(client, {
        authorityId: "real-authority-rollback",
        namespaceId: "real-namespace-rollback",
        async prepare(redis, specification) {
          await redis.sendCommand(["SET", specification.counterKey, "5"]);
        },
      });
      try {
        await harness.profile.createStore();
        await client.sendCommand(["SET", harness.specification.counterKey, "4"]);
        const keys = [
          harness.specification.counterKey,
          `${harness.specification.bindingPrefix}5`,
          `${harness.specification.bindingPrefix}6`,
        ];
        const before = await redisSnapshot(client, keys);
        const commandsBefore = harness.commands.length;
        const firstCode = await captureCode(() => harness.profile.createStore());
        const commandsAfterFault = harness.commands.length;
        const retryCode = await captureCode(() => harness.profile.createStore());
        assert.equal(firstCode, "RECOVERY_REQUIRED");
        assert.equal(retryCode, "RECOVERY_REQUIRED");
        assert.deepEqual(await redisSnapshot(client, keys), before);
        assert.equal(commandsAfterFault, commandsBefore + 1);
        assert.equal(harness.commands.length, commandsAfterFault);
      } finally {
        await harness.profile.dispose();
      }
    });

    await t.test("exact-looking collision", async () => {
      const authorityId = "real-authority-collision";
      const namespaceId = "real-namespace-collision";
      const harness = createRealHarness(client, {
        authorityId,
        namespaceId,
        async prepare(redis, specification) {
          await redis.sendCommand(["SET", specification.counterKey, "0"]);
          await redis.sendCommand([
            "SET",
            `${specification.bindingPrefix}1`,
            JSON.stringify(bindingRecord(authorityId, namespaceId, 1, "reserved")),
          ]);
        },
      });
      try {
        const firstCode = await captureCode(() => harness.profile.createStore());
        const commandsAfterFault = harness.commands.length;
        const retryCode = await captureCode(() => harness.profile.createStore());
        assert.equal(firstCode, "BINDING_COLLISION");
        assert.equal(retryCode, "BINDING_COLLISION");
        assert.equal(
          await client.sendCommand(["GET", harness.specification.counterKey]),
          "0",
        );
        assert.equal(harness.commands.length, commandsAfterFault);
      } finally {
        await harness.profile.dispose();
      }
    });
  });
});

test("real Lua enforces authority TTL, counter form, and decimal increment", async (t) => {
  await withEphemeralRedis(async ({ client }) => {
    for (const [label, prepare] of [
      ["expiring authority", async (redis, specification) => {
        await redis.sendCommand(["PEXPIRE", specification.authorityKey, "60000"]);
      }],
      ["malformed counter", async (redis, specification) => {
        await redis.sendCommand(["SET", specification.counterKey, "01"]);
      }],
    ]) {
      await t.test(label, async () => {
        const harness = createRealHarness(client, {
          authorityId: `real-authority-${label.replaceAll(" ", "-")}`,
          namespaceId: `real-namespace-${label.replaceAll(" ", "-")}`,
          prepare,
        });
        try {
          assert.equal(
            await captureCode(() => harness.profile.createStore()),
            "RECOVERY_REQUIRED",
          );
          assert.equal(
            await client.sendCommand([
              "EXISTS",
              `${harness.specification.bindingPrefix}1`,
            ]),
            0,
          );
        } finally {
          await harness.profile.dispose();
        }
      });
    }

    await t.test("decimal carry remains string-exact", async () => {
      const harness = createRealHarness(client, {
        authorityId: "real-authority-decimal-carry",
        namespaceId: "real-namespace-decimal-carry",
        async prepare(redis, specification) {
          await redis.sendCommand(["SET", specification.counterKey, "99"]);
        },
      });
      try {
        const store = await harness.profile.createStore();
        assert.equal(storeRow(store.database)[0].redis_binding_ordinal, 100);
        assert.equal(
          await client.sendCommand(["GET", harness.specification.counterKey]),
          "100",
        );
      } finally {
        await harness.profile.dispose();
      }
    });
  });
});

test("real Lua rejects missing and surplus arity before Redis reads or writes", async () => {
  await withEphemeralRedis(async ({ client }) => {
    const harness = createRealHarness(client, {
      authorityId: "real-authority-arity",
      namespaceId: "real-namespace-arity",
    });
    try {
      const store = await harness.profile.createStore();
      await harness.profile.admitStore(store);
      const commands = evalCommands(harness.commands);
      assert.equal(commands.length, 3);
      const observed = [];
      for (const command of commands) {
        const commandMarker = marker(command);
        const keyCount = Number(command[2]);
        const argumentStart = 3 + keyCount;
        const requiredArguments = { allocate: 6, bind: 5, read: 4 }[commandMarker];
        const complete = [...command];
        while (complete.length - argumentStart < requiredArguments) {
          complete.push("1");
        }
        for (const malformed of [
          complete.slice(0, -1),
          [...complete, "unexpected-surplus"],
        ]) {
          const beforeState = await redisSnapshot(
            client,
            complete.slice(3, argumentStart),
          );
          const observedCommands = ["type", "pttl", "strlen", "get", "set"];
          const beforeCalls = commandCalls(
            await client.sendCommand(["INFO", "commandstats"]),
            observedCommands,
          );
          let reply;
          try {
            reply = await client.sendCommand(malformed);
          } catch {
            reply = ["threw"];
          }
          const afterCalls = commandCalls(
            await client.sendCommand(["INFO", "commandstats"]),
            observedCommands,
          );
          observed.push({
            reply,
            beforeCalls,
            afterCalls,
            beforeState,
            afterState: await redisSnapshot(
              client,
              complete.slice(3, argumentStart),
            ),
          });
        }
      }
      for (const result of observed) {
        assert.deepEqual(result.reply, ["recovery_required"]);
        assert.deepEqual(result.afterCalls, result.beforeCalls);
        assert.deepEqual(result.afterState, result.beforeState);
      }
    } finally {
      await harness.profile.dispose();
    }
  });
});
