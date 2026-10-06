import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  createSqliteDisposableRuntimeProfile,
} from "../../gateway/src/core/coordination_consumer_runtime_test_profile.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const MIGRATIONS_ROOT = path.join(REPO_ROOT, "gateway", "migrations");
const MIGRATION_MODULE_PATH = path.join(
  REPO_ROOT,
  "gateway",
  "src",
  "core",
  "sqlite_migration_sets.js",
);
const STATE_MODULE_PATH = path.join(
  REPO_ROOT,
  "gateway",
  "src",
  "core",
  "state.js",
);
const EPOCH_MIGRATION_PATH = path.join(
  MIGRATIONS_ROOT,
  "profiles",
  "sqlite-redis-disposable-epoch-test-v1",
  "005_coordination_consumer_runtime_epoch.sql",
);
const FORBIDDEN_ROOT_005 = path.join(
  MIGRATIONS_ROOT,
  "005_coordination_consumer_runtime_epoch.sql",
);
const requireFromGateway = createRequire(
  path.join(REPO_ROOT, "gateway", "package.json"),
);
const Database = requireFromGateway("better-sqlite3");
const migrationModule = await import(pathToFileURL(MIGRATION_MODULE_PATH).href)
  .catch((loadError) => Object.freeze({ loadError }));

const ROOT_ENTRIES = Object.freeze([
  Object.freeze({
    id: "001_initial",
    path: "gateway/migrations/001_initial.sql",
    sha256: "260eb6663adc38eb443cd6763d0b1b5acc31e317f0fbef59373ab055d6c2920d",
  }),
  Object.freeze({
    id: "002_coordination_consumer",
    path: "gateway/migrations/002_coordination_consumer.sql",
    sha256: "257cab639e9cac9c9be14d197dd9f2fdca9917acca37b13f570b028a7f6200a3",
  }),
  Object.freeze({
    id: "002_lifecycle",
    path: "gateway/migrations/002_lifecycle.sql",
    sha256: "d1be59ac7968888c30234401ea779137848a08d88ac8638c90dcf40d5fb6037d",
  }),
  Object.freeze({
    id: "003_coordination_ack_outbox",
    path: "gateway/migrations/003_coordination_ack_outbox.sql",
    sha256: "fb12640b8fd79318f1efbb31a6fb8654d3e396b5c5da0542605be6bc5802366f",
  }),
  Object.freeze({
    id: "004_coordination_consumer_runtime_owner",
    path: "gateway/migrations/004_coordination_consumer_runtime_owner.sql",
    sha256: "38ba4d8e84dd447a176c2c4f83b96cbb416681cd077d404f4469b4a459cdd6fb",
  }),
]);
const ROOT_IDS = ROOT_ENTRIES.map(({ id }) => id);
const EPOCH_ID = "005_coordination_consumer_runtime_epoch";
const EPOCH_RELATIVE_PATH = [
  "gateway/migrations/profiles",
  "sqlite-redis-disposable-epoch-test-v1",
  "005_coordination_consumer_runtime_epoch.sql",
].join("/");
const temporaryRoots = [];
const profiles = [];

test.after(async () => {
  for (const profile of profiles.reverse()) await profile.dispose();
  for (const root of temporaryRoots.reverse()) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function migrationApi() {
  assert.ifError(migrationModule.loadError);
  for (const name of [
    "GENERIC_APPLICATION_SQLITE",
    "WIRING_A_SQLITE",
    "WIRING_B_EPOCH_SQLITE",
    "applySqliteMigrationSet",
  ]) {
    assert.notEqual(migrationModule[name], undefined, `missing export ${name}`);
  }
  return migrationModule;
}

function temporaryDatabasePath(label) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `${label}-`));
  temporaryRoots.push(root);
  return path.join(root, "state.sqlite");
}

async function freshStateModule() {
  const url = pathToFileURL(STATE_MODULE_PATH);
  return import(`${url.href}?epochMigrationTest=${crypto.randomUUID()}`);
}

function appliedIds(database) {
  return database.prepare(
    "SELECT id FROM main.schema_migrations ORDER BY rowid",
  ).all().map(({ id }) => id);
}

function journalMode(database) {
  return database.pragma("journal_mode", { simple: true });
}

function schemaRows(database) {
  return database.prepare(
    `SELECT type, name, tbl_name AS tableName, sql
     FROM main.sqlite_master
     WHERE name NOT LIKE 'sqlite_%'
     ORDER BY type, name`,
  ).all();
}

function assertMigrationMismatch(operation) {
  assert.throws(
    operation,
    (error) => error?.code === "MIGRATION_PROFILE_MISMATCH",
  );
}

function createMigrationLedger(database) {
  database.exec(
    "CREATE TABLE main.schema_migrations("
    + "id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
}

function applyRawPrefix(database, entries, count) {
  createMigrationLedger(database);
  for (const entry of entries.slice(0, count)) {
    database.exec(fs.readFileSync(path.join(REPO_ROOT, entry.path), "utf8"));
    database.prepare(
      "INSERT OR IGNORE INTO main.schema_migrations(id, applied_at) "
      + "VALUES (?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
    ).run(entry.id);
  }
}

function createProfile() {
  const profile = createSqliteDisposableRuntimeProfile();
  profiles.push(profile);
  return profile;
}

async function withDirectoryScanCanary(operation) {
  const fakeName = "999_directory_scan_canary.sql";
  const fakePath = path.join(MIGRATIONS_ROOT, fakeName);
  const originalReaddir = fs.readdirSync;
  const originalReadFile = fs.readFileSync;
  fs.readdirSync = function patchedReaddir(target, ...args) {
    const entries = originalReaddir.call(this, target, ...args);
    return path.resolve(String(target)) === MIGRATIONS_ROOT
      ? [...entries, fakeName]
      : entries;
  };
  fs.readFileSync = function patchedReadFile(target, ...args) {
    if (path.resolve(String(target)) === fakePath) {
      return "CREATE TABLE main.directory_scan_canary(value INTEGER)";
    }
    return originalReadFile.call(this, target, ...args);
  };
  try {
    return await operation();
  } finally {
    fs.readdirSync = originalReaddir;
    fs.readFileSync = originalReadFile;
  }
}

test("migration sets are literal, ordered, distinct, and deeply frozen", () => {
  const {
    GENERIC_APPLICATION_SQLITE,
    WIRING_A_SQLITE,
    WIRING_B_EPOCH_SQLITE,
  } = migrationApi();
  const epochBytes = fs.readFileSync(EPOCH_MIGRATION_PATH);
  const epochSha256 = crypto.createHash("sha256").update(epochBytes).digest("hex");
  const epochEntry = Object.freeze({
    id: EPOCH_ID,
    path: EPOCH_RELATIVE_PATH,
    sha256: epochSha256,
  });

  assert.deepEqual(GENERIC_APPLICATION_SQLITE, ROOT_ENTRIES);
  assert.deepEqual(WIRING_A_SQLITE, ROOT_ENTRIES);
  assert.deepEqual(WIRING_B_EPOCH_SQLITE, [...ROOT_ENTRIES, epochEntry]);
  assert.notEqual(GENERIC_APPLICATION_SQLITE, WIRING_A_SQLITE);
  assert.notEqual(WIRING_A_SQLITE, WIRING_B_EPOCH_SQLITE);
  for (const selected of [
    GENERIC_APPLICATION_SQLITE,
    WIRING_A_SQLITE,
    WIRING_B_EPOCH_SQLITE,
  ]) {
    assert.equal(Object.isFrozen(selected), true);
    assert.equal(selected.every(Object.isFrozen), true);
  }

  const source = fs.readFileSync(MIGRATION_MODULE_PATH, "utf8");
  for (const entry of [...ROOT_ENTRIES, epochEntry]) {
    assert.match(source, new RegExp(`sha256: ["']${entry.sha256}["']`));
  }
  assert.doesNotMatch(
    source,
    /readdir|glob|basename|process\.env|AGENTS_|MIGRATIONS_DIR/,
  );
});

test("generic SQLite selection ignores a directory-scan canary", async () => {
  await withDirectoryScanCanary(async () => {
    const state = await freshStateModule();
    try {
      state.initState({ stateDb: temporaryDatabasePath("epoch-generic-scan") });
      assert.deepEqual(appliedIds(state.getDb()), ROOT_IDS);
      assert.equal(
        state.getDb().prepare(
          "SELECT count(*) AS count FROM main.sqlite_master "
          + "WHERE name = 'directory_scan_canary'",
        ).get().count,
        0,
      );
    } finally {
      state._resetForTests();
    }
  });
});

test("WIRING-A SQLite selection ignores a directory-scan canary", async () => {
  await withDirectoryScanCanary(() => {
    const profile = createProfile();
    const pair = profile.createStore();
    assert.deepEqual(appliedIds(pair.database), ROOT_IDS);
    assert.equal(
      pair.database.prepare(
        "SELECT count(*) AS count FROM main.sqlite_master "
        + "WHERE name = 'directory_scan_canary'",
      ).get().count,
      0,
    );
  });
});

test("generic state applies the exact set to fresh, existing, and reopened stores", async () => {
  const filename = temporaryDatabasePath("epoch-generic-reopen");
  const existing = new Database(filename);
  applyRawPrefix(existing, ROOT_ENTRIES, 2);
  existing.close();

  const first = await freshStateModule();
  first.initState({ stateDb: filename });
  assert.deepEqual(appliedIds(first.getDb()), ROOT_IDS);
  assert.equal(first.getDb().open, true);
  first._resetForTests();

  const reopened = await freshStateModule();
  reopened.initState({ stateDb: filename });
  assert.deepEqual(appliedIds(reopened.getDb()), ROOT_IDS);
  assert.equal(
    reopened.getDb().prepare(
      "SELECT count(*) AS count FROM main.sqlite_master "
      + "WHERE name LIKE 'coordination_consumer_runtime_epoch_%'",
    ).get().count,
    0,
  );
  reopened._resetForTests();
});

test("generic authentication failure leaves an existing file untouched and closes unpublished state", async () => {
  const filename = temporaryDatabasePath("epoch-generic-preauth");
  const existing = new Database(filename);
  existing.exec(
    "CREATE TABLE main.preauth_sentinel(value TEXT NOT NULL);"
    + "INSERT INTO main.preauth_sentinel(value) VALUES ('unchanged')",
  );
  assert.equal(journalMode(existing), "delete");
  const expectedSchema = schemaRows(existing);
  existing.close();

  const firstPath = path.join(REPO_ROOT, ROOT_ENTRIES[0].path);
  const originalReadFile = fs.readFileSync;
  const originalClose = Database.prototype.close;
  let rejectedHandle;
  fs.readFileSync = function digestMismatch(target, ...args) {
    if (path.resolve(String(target)) === firstPath) {
      return Buffer.from("tampered migration bytes");
    }
    return originalReadFile.call(this, target, ...args);
  };
  Database.prototype.close = function observedClose(...args) {
    if (this.name === filename) rejectedHandle = this;
    return originalClose.call(this, ...args);
  };

  const state = await freshStateModule();
  try {
    assertMigrationMismatch(() => state.initState({ stateDb: filename }));
    assert.throws(() => state.getDb(), /state not initialized/);
    assert.notEqual(rejectedHandle, undefined);
    assert.equal(rejectedHandle.open, false);
  } finally {
    fs.readFileSync = originalReadFile;
    Database.prototype.close = originalClose;
    state._resetForTests();
  }

  const observed = new Database(filename);
  try {
    assert.equal(journalMode(observed), "delete");
    assert.deepEqual(schemaRows(observed), expectedSchema);
    assert.equal(
      observed.prepare(
        "SELECT count(*) AS count FROM main.sqlite_master "
        + "WHERE name = 'schema_migrations'",
      ).get().count,
      0,
    );
    assert.deepEqual(
      observed.prepare("SELECT value FROM main.preauth_sentinel").all(),
      [{ value: "unchanged" }],
    );
  } finally {
    observed.close();
  }
});

test("generic state rejects unknown and epoch-profile applied rows", async () => {
  const unknownPath = temporaryDatabasePath("epoch-generic-unknown");
  const unknown = new Database(unknownPath);
  createMigrationLedger(unknown);
  unknown.prepare(
    "INSERT INTO main.schema_migrations(id, applied_at) VALUES (?, ?)",
  ).run("999_outside_set", "2026-08-03T00:00:00.000Z");
  unknown.close();
  const state = await freshStateModule();
  try {
    assertMigrationMismatch(() => state.initState({ stateDb: unknownPath }));
    assert.throws(() => state.getDb(), /state not initialized/);
  } finally {
    state._resetForTests();
  }

  const { WIRING_B_EPOCH_SQLITE, applySqliteMigrationSet } = migrationApi();
  const epochPath = temporaryDatabasePath("epoch-generic-cross-profile");
  const epoch = new Database(epochPath);
  applySqliteMigrationSet(epoch, WIRING_B_EPOCH_SQLITE);
  epoch.close();
  const crossProfileState = await freshStateModule();
  try {
    assertMigrationMismatch(
      () => crossProfileState.initState({ stateDb: epochPath }),
    );
    assert.throws(() => crossProfileState.getDb(), /state not initialized/);
  } finally {
    crossProfileState._resetForTests();
  }
});

test("WIRING-A applies only its exact set and revalidates every opened handle", () => {
  const profile = createProfile();
  const pair = profile.createStore();
  const reopened = profile.openHandle(pair.storeOrigin);
  assert.deepEqual(appliedIds(pair.database), ROOT_IDS);
  assert.deepEqual(appliedIds(reopened.database), ROOT_IDS);
  assert.equal(pair.database.open, true);
  assert.equal(reopened.database.open, true);

  pair.database.prepare(
    "INSERT INTO main.schema_migrations(id, applied_at) VALUES (?, ?)",
  ).run("999_outside_set", "2026-08-03T00:00:00.000Z");
  assertMigrationMismatch(() => profile.openHandle(pair.storeOrigin));
});

test("WIRING-A fresh, reopened, and copied file handles use WAL", async () => {
  const profile = createProfile();
  const fresh = profile.createStore();
  const reopened = profile.openHandle(fresh.storeOrigin);
  const copied = await profile.copyStore(fresh.storeOrigin);

  assert.deepEqual(
    [fresh.database, reopened.database, copied.database].map((database) => ({
      memory: database.memory,
      journalMode: journalMode(database),
    })),
    [
      { memory: false, journalMode: "wal" },
      { memory: false, journalMode: "wal" },
      { memory: false, journalMode: "wal" },
    ],
  );
});

test("generic and WIRING-A reject a profile-only 005 row", () => {
  const {
    WIRING_B_EPOCH_SQLITE,
    applySqliteMigrationSet,
  } = migrationApi();
  const profile = createProfile();
  const pair = profile.createStore();
  applySqliteMigrationSet(pair.database, WIRING_B_EPOCH_SQLITE);
  assert.deepEqual(appliedIds(pair.database), [...ROOT_IDS, EPOCH_ID]);
  assertMigrationMismatch(() => profile.openHandle(pair.storeOrigin));
});

test("the application seam rejects caller extension, traversal, and duplicate sets", () => {
  const {
    GENERIC_APPLICATION_SQLITE,
    applySqliteMigrationSet,
  } = migrationApi();
  const forgedSets = [
    [...GENERIC_APPLICATION_SQLITE, Object.freeze({
      id: "outside",
      path: "../outside.sql",
      sha256: "0".repeat(64),
    })],
    [...GENERIC_APPLICATION_SQLITE, GENERIC_APPLICATION_SQLITE[0]],
    GENERIC_APPLICATION_SQLITE.slice(0, -1),
  ];
  for (const forged of forgedSets) {
    const database = new Database(":memory:");
    try {
      assertMigrationMismatch(() => applySqliteMigrationSet(database, forged));
      assert.equal(
        database.prepare(
          "SELECT count(*) AS count FROM main.sqlite_master",
        ).get().count,
        0,
      );
    } finally {
      database.close();
    }
  }
});

test("file-backed application establishes and revalidates persistent WAL", () => {
  const {
    GENERIC_APPLICATION_SQLITE,
    applySqliteMigrationSet,
  } = migrationApi();
  const filename = temporaryDatabasePath("epoch-direct-wal");
  const fresh = new Database(filename);
  applySqliteMigrationSet(fresh, GENERIC_APPLICATION_SQLITE);
  const freshMode = journalMode(fresh);
  fresh.close();

  const reset = new Database(filename);
  assert.equal(reset.pragma("journal_mode = DELETE", { simple: true }), "delete");
  reset.close();

  const reopened = new Database(filename);
  try {
    applySqliteMigrationSet(reopened, GENERIC_APPLICATION_SQLITE);
    assert.deepEqual(
      {
        freshMode,
        reopenedMode: journalMode(reopened),
        applied: appliedIds(reopened),
      },
      {
        freshMode: "wal",
        reopenedMode: "wal",
        applied: ROOT_IDS,
      },
    );
  } finally {
    reopened.close();
  }
});

test("file-backed application rejects an unverified WAL result", () => {
  const {
    GENERIC_APPLICATION_SQLITE,
    applySqliteMigrationSet,
  } = migrationApi();
  const database = new Database(temporaryDatabasePath("epoch-direct-wal-verify"));
  const originalPragma = database.pragma;
  let walAttempts = 0;
  database.pragma = function unverifiedWal(source, ...args) {
    if (source === "journal_mode = WAL") {
      walAttempts += 1;
      return "delete";
    }
    return originalPragma.call(this, source, ...args);
  };
  let caught;
  try {
    applySqliteMigrationSet(database, GENERIC_APPLICATION_SQLITE);
  } catch (error) {
    caught = error;
  } finally {
    database.pragma = originalPragma;
  }
  try {
    assert.deepEqual(
      { walAttempts, code: caught?.code, open: database.open },
      { walAttempts: 1, code: "MIGRATION_PROFILE_MISMATCH", open: true },
    );
  } finally {
    database.close();
  }
});

test("a later migration failure rolls back every schema and ledger write", () => {
  const {
    GENERIC_APPLICATION_SQLITE,
    applySqliteMigrationSet,
  } = migrationApi();
  const database = new Database(temporaryDatabasePath("epoch-direct-rollback"));
  const originalExec = database.exec;
  let injected = false;
  database.exec = function failLaterMigration(source, ...args) {
    if (
      typeof source === "string"
      && source.includes("CREATE TABLE IF NOT EXISTS coordination_consumer_receipts")
    ) {
      injected = true;
      throw new Error("injected later migration failure");
    }
    return originalExec.call(this, source, ...args);
  };
  try {
    assertMigrationMismatch(
      () => applySqliteMigrationSet(database, GENERIC_APPLICATION_SQLITE),
    );
  } finally {
    database.exec = originalExec;
  }
  try {
    assert.equal(injected, true);
    assert.equal(database.open, true);
    assert.equal(journalMode(database), "delete");
    assert.deepEqual(schemaRows(database), []);
  } finally {
    database.close();
  }
});

test("in-memory application preserves SQLite journal semantics", () => {
  const {
    GENERIC_APPLICATION_SQLITE,
    applySqliteMigrationSet,
  } = migrationApi();
  const database = new Database(":memory:");
  try {
    applySqliteMigrationSet(database, GENERIC_APPLICATION_SQLITE);
    assert.equal(database.memory, true);
    assert.equal(journalMode(database), "memory");
    assert.deepEqual(appliedIds(database), ROOT_IDS);
  } finally {
    database.close();
  }
});

test("digest mismatch, symlink, and non-file entries reject before target writes", () => {
  const {
    GENERIC_APPLICATION_SQLITE,
    applySqliteMigrationSet,
  } = migrationApi();
  const firstPath = path.join(REPO_ROOT, ROOT_ENTRIES[0].path);
  const originalReadFile = fs.readFileSync;
  const originalLstat = fs.lstatSync;
  const cases = [
    {
      patch() {
        fs.readFileSync = function digestMismatch(target, ...args) {
          if (path.resolve(String(target)) === firstPath) {
            return Buffer.from("tampered migration bytes");
          }
          return originalReadFile.call(this, target, ...args);
        };
      },
    },
    {
      patch() {
        fs.lstatSync = function symlinkEntry(target, ...args) {
          if (path.resolve(String(target)) === firstPath) {
            return { isSymbolicLink: () => true, isFile: () => true };
          }
          return originalLstat.call(this, target, ...args);
        };
      },
    },
    {
      patch() {
        fs.lstatSync = function nonFileEntry(target, ...args) {
          if (path.resolve(String(target)) === firstPath) {
            return { isSymbolicLink: () => false, isFile: () => false };
          }
          return originalLstat.call(this, target, ...args);
        };
      },
    },
  ];

  for (const { patch } of cases) {
    const database = new Database(":memory:");
    patch();
    try {
      assertMigrationMismatch(
        () => applySqliteMigrationSet(database, GENERIC_APPLICATION_SQLITE),
      );
      assert.equal(
        database.prepare(
          "SELECT count(*) AS count FROM main.sqlite_master",
        ).get().count,
        0,
      );
    } finally {
      fs.readFileSync = originalReadFile;
      fs.lstatSync = originalLstat;
      database.close();
    }
  }
});

test("applied migration ledgers reject duplicate, unknown, and non-prefix rows", () => {
  const {
    GENERIC_APPLICATION_SQLITE,
    applySqliteMigrationSet,
  } = migrationApi();
  const ledgers = [
    [ROOT_IDS[0], ROOT_IDS[0]],
    ["999_outside_set"],
    [ROOT_IDS[1]],
  ];
  for (const ids of ledgers) {
    const database = new Database(":memory:");
    try {
      database.exec(
        "CREATE TABLE main.schema_migrations("
        + "id TEXT, applied_at TEXT NOT NULL)",
      );
      for (const id of ids) {
        database.prepare(
          "INSERT INTO main.schema_migrations(id, applied_at) VALUES (?, ?)",
        ).run(id, "2026-08-03T00:00:00.000Z");
      }
      assertMigrationMismatch(
        () => applySqliteMigrationSet(database, GENERIC_APPLICATION_SQLITE),
      );
    } finally {
      database.close();
    }
  }
});

test("reopened stores validate already-applied schema before adding a suffix", () => {
  const {
    GENERIC_APPLICATION_SQLITE,
    applySqliteMigrationSet,
  } = migrationApi();
  const database = new Database(":memory:");
  try {
    applySqliteMigrationSet(database, GENERIC_APPLICATION_SQLITE);
    database.exec("DROP INDEX main.idx_tasks_trace");
    assertMigrationMismatch(
      () => applySqliteMigrationSet(database, GENERIC_APPLICATION_SQLITE),
    );
    database.exec("CREATE INDEX main.idx_tasks_trace ON tasks(trace_id)");
    applySqliteMigrationSet(database, GENERIC_APPLICATION_SQLITE);
    database.exec(
      "CREATE TRIGGER main.unexpected_tasks_trigger "
      + "AFTER INSERT ON tasks BEGIN SELECT 1; END",
    );
    assertMigrationMismatch(
      () => applySqliteMigrationSet(database, GENERIC_APPLICATION_SQLITE),
    );
    assert.equal(database.open, true);
  } finally {
    database.close();
  }
});

function insertReceiptAndAckIntent(database) {
  const consumeKey = `coord-consume-v1-${"a".repeat(64)}`;
  database.prepare(
    `INSERT INTO main.coordination_consumer_receipts (
       consume_key, metadata_protocol_version, metadata_scope_id,
       metadata_message_id, metadata_from_participant_id,
       metadata_to_participant_id, metadata_message_type,
       metadata_classification, metadata_created_at, state, attempts,
       claim_epoch, replay_epoch, max_consumed_recovery_ids,
       created_at, updated_at
     ) VALUES (?, 1, 'scope-a', 'message-a', 'sender-a', 'receiver-a',
       'IMPACT_NOTICE', 'internal', '2026-08-03T00:00:00.000Z',
       'processing', 0, 1, 0, 8, 1, 1)`,
  ).run(consumeKey);
  database.prepare(
    `INSERT INTO main.coordination_consumer_deliveries (
       consume_key, delivery_id, recovered, observed_at, observed_order,
       ack_state, acked_at
     ) VALUES (?, '1-0', 0, 1, 1, 'pending', NULL)`,
  ).run(consumeKey);
  database.prepare(
    `INSERT INTO main.coordination_consumer_ack_intents (
       consume_key, delivery_id, state, due_at, claim_epoch,
       created_at, updated_at
     ) VALUES (?, '1-0', 'pending', 1, 0, 1, 1)`,
  ).run(consumeKey);
  return consumeKey;
}

test("epoch selection appends only the exact main-qualified 005 schema", () => {
  const {
    WIRING_B_EPOCH_SQLITE,
    applySqliteMigrationSet,
  } = migrationApi();
  const database = new Database(":memory:");
  try {
    applySqliteMigrationSet(database, WIRING_B_EPOCH_SQLITE);
    applySqliteMigrationSet(database, WIRING_B_EPOCH_SQLITE);
    assert.deepEqual(appliedIds(database), [...ROOT_IDS, EPOCH_ID]);
    assert.equal(database.open, true);

    const tableNames = database.prepare(
      "SELECT name FROM main.sqlite_master WHERE type = 'table' ORDER BY name",
    ).all().map(({ name }) => name);
    for (const name of [
      "coordination_consumer_runtime_epoch_store",
      "coordination_consumer_runtime_epoch_fences",
      "coordination_consumer_runtime_recovery_sources",
      "coordination_consumer_runtime_release_completions",
    ]) {
      assert.ok(tableNames.includes(name), `missing epoch table ${name}`);
    }

    const receiptColumns = database.prepare(
      "PRAGMA main.table_info('coordination_consumer_receipts')",
    ).all().map(({ name }) => name);
    assert.deepEqual(receiptColumns.slice(-5), [
      "epoch_generation",
      "recovery_term",
      "epoch_authority_kind",
      "epoch_participant_id",
      "recovery_controller_participant_id",
    ]);
    const ackColumns = database.prepare(
      "PRAGMA main.table_info('coordination_consumer_ack_intents')",
    ).all().map(({ name }) => name);
    assert.deepEqual(ackColumns.slice(-10), [
      "epoch_generation",
      "recovery_term",
      "epoch_authority_kind",
      "epoch_participant_id",
      "recovery_controller_participant_id",
      "settlement_generation",
      "settlement_recovery_term",
      "settlement_authority_kind",
      "settlement_participant_id",
      "settlement_recovery_controller_participant_id",
    ]);

    const indexes = new Set(database.prepare(
      "SELECT name FROM main.sqlite_master WHERE type = 'index'",
    ).all().map(({ name }) => name));
    for (const name of [
      "idx_coord_consumer_runtime_epoch_fences_phase",
      "idx_coord_consumer_runtime_recovery_sources_state",
      "idx_coord_consumer_runtime_release_completions_state",
      "idx_coord_consumer_receipts_epoch_authority",
      "idx_coord_consumer_ack_intents_epoch_authority",
      "idx_coord_consumer_ack_intents_settlement_authority",
    ]) {
      assert.equal(indexes.has(name), true, `missing epoch index ${name}`);
    }

    database.prepare(
      `INSERT INTO main.coordination_consumer_runtime_epoch_store (
         singleton, protocol_version, redis_authority_id,
         redis_namespace_id, redis_binding_ordinal, allocation_state
       ) VALUES (1, 1, 'authority-a', 'namespace-a', 1, 'bound')`,
    ).run();
    assert.throws(() => database.prepare(
      `INSERT INTO main.coordination_consumer_runtime_epoch_store (
         singleton, protocol_version, redis_authority_id,
         redis_namespace_id, redis_binding_ordinal, allocation_state
       ) VALUES (2, 1, 'authority-b', 'namespace-b', 2, 'bound')`,
    ).run());

    database.exec(
      `INSERT INTO main.coordination_consumer_runtime_owners
         (scope_id, generation, owner_state)
       VALUES ('scope-active', 1, 'owned'),
              ('scope-a', 1, 'owned'),
              ('scope-invalid', 2, 'owned')`,
    );
    database.prepare(
      `INSERT INTO main.coordination_consumer_runtime_epoch_fences (
         scope_id, generation, phase, lease_expires_at_ms,
         pending_generation, participant_id, previous_participant_id,
         recovery_term, recovery_controller_state,
         recovery_controller_participant_id, fault_code
       ) VALUES ('scope-active', 1, 'active', 10, NULL, 'participant-a',
         NULL, 1, 'none', NULL, NULL)`,
    ).run();
    database.prepare(
      `INSERT INTO main.coordination_consumer_runtime_epoch_fences (
         scope_id, generation, phase, lease_expires_at_ms,
         pending_generation, participant_id, previous_participant_id,
         recovery_term, recovery_controller_state,
         recovery_controller_participant_id, fault_code
       ) VALUES ('scope-a', 1, 'active', 10, NULL, 'participant-a',
         NULL, 1, 'none', NULL, NULL)`,
    ).run();
    assert.throws(() => database.prepare(
      `INSERT INTO main.coordination_consumer_runtime_epoch_fences (
         scope_id, generation, phase, lease_expires_at_ms,
         pending_generation, participant_id, previous_participant_id,
         recovery_term, recovery_controller_state,
         recovery_controller_participant_id, fault_code
       ) VALUES ('scope-invalid', 2, 'initializing', 10, NULL,
         'participant-b', NULL, 1, 'installing', 'participant-b', NULL)`,
    ).run());

    database.prepare(
      `INSERT INTO main.coordination_consumer_runtime_recovery_sources (
         scope_id, source_participant_id, first_source_generation,
         added_recovery_term, state, reason_code, drained_generation,
         drained_recovery_term, created_at, updated_at
       ) VALUES ('scope-a', 'source-a', 1, 1, 'open', NULL, NULL, NULL, 1, 1)`,
    ).run();
    assert.throws(() => database.prepare(
      `INSERT INTO main.coordination_consumer_runtime_recovery_sources (
         scope_id, source_participant_id, first_source_generation,
         added_recovery_term, state, reason_code, drained_generation,
         drained_recovery_term, created_at, updated_at
       ) VALUES ('scope-a', 'source-b', 1, 1, 'open',
         'TRANSPORT_STATE_UNKNOWN', NULL, NULL, 1, 1)`,
    ).run());

    database.prepare(
      `INSERT INTO main.coordination_consumer_runtime_release_completions (
         scope_id, generation, recovery_term, source_participant_id,
         completion_id, state, reason_code, created_at, confirmed_at
       ) VALUES ('scope-a', 1, 1, 'source-a', ?,
         'redis_pending', NULL, 1, NULL)`,
    ).run("a".repeat(64));
    assert.throws(() => database.prepare(
      `INSERT INTO main.coordination_consumer_runtime_release_completions (
         scope_id, generation, recovery_term, source_participant_id,
         completion_id, state, reason_code, created_at, confirmed_at
       ) VALUES ('scope-b', 1, 1, 'source-b', ?,
         'redis_pending', NULL, 1, NULL)`,
    ).run("A".repeat(64)));

    const consumeKey = insertReceiptAndAckIntent(database);
    database.prepare(
      `UPDATE main.coordination_consumer_receipts
       SET epoch_generation = 1, recovery_term = 1,
           epoch_authority_kind = 'active',
           epoch_participant_id = 'participant-a'
       WHERE consume_key = ?`,
    ).run(consumeKey);
    assert.throws(() => database.prepare(
      `UPDATE main.coordination_consumer_receipts
       SET recovery_controller_participant_id = 'controller-a'
       WHERE consume_key = ?`,
    ).run(consumeKey));
    database.prepare(
      `UPDATE main.coordination_consumer_ack_intents
       SET epoch_generation = 1, recovery_term = 1,
           epoch_authority_kind = 'recovery',
           epoch_participant_id = 'controller-a',
           recovery_controller_participant_id = 'controller-a',
           settlement_generation = 1, settlement_recovery_term = 1,
           settlement_authority_kind = 'active',
           settlement_participant_id = 'participant-a'
       WHERE consume_key = ? AND delivery_id = '1-0'`,
    ).run(consumeKey);
    assert.throws(() => database.prepare(
      `UPDATE main.coordination_consumer_ack_intents
       SET settlement_recovery_controller_participant_id = 'controller-a'
       WHERE consume_key = ? AND delivery_id = '1-0'`,
    ).run(consumeKey));
  } finally {
    database.close();
  }

  const sql = fs.readFileSync(EPOCH_MIGRATION_PATH, "utf8");
  assert.match(sql, /CREATE TABLE main\.coordination_consumer_runtime_epoch_store/);
  assert.match(sql, /CREATE TABLE main\.coordination_consumer_runtime_epoch_fences/);
  assert.match(sql, /ALTER TABLE main\.coordination_consumer_receipts/);
  assert.match(sql, /ALTER TABLE main\.coordination_consumer_ack_intents/);
  assert.match(sql, /INSERT OR IGNORE INTO main\.schema_migrations/);
});

test("the epoch migration exists only in its selected profile directory", () => {
  assert.equal(fs.existsSync(EPOCH_MIGRATION_PATH), true);
  assert.equal(fs.lstatSync(EPOCH_MIGRATION_PATH).isFile(), true);
  assert.equal(fs.lstatSync(EPOCH_MIGRATION_PATH).isSymbolicLink(), false);
  assert.equal(fs.existsSync(FORBIDDEN_ROOT_005), false);
});
