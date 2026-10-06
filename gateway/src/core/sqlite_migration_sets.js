import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const REAL_REPOSITORY_ROOT = fs.realpathSync(REPOSITORY_ROOT);
const MIGRATION_LEDGER_SQL =
  "CREATE TABLE main.schema_migrations("
  + "id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)";
const INSERT_MIGRATION_SQL =
  "INSERT OR IGNORE INTO main.schema_migrations(id, applied_at) "
  + "VALUES (?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))";

function freezeSet(entries) {
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
}

const ROOT_BASELINE_SQLITE = freezeSet([
  {
    id: "001_initial",
    path: "gateway/migrations/001_initial.sql",
    sha256: "260eb6663adc38eb443cd6763d0b1b5acc31e317f0fbef59373ab055d6c2920d",
  },
  {
    id: "002_coordination_consumer",
    path: "gateway/migrations/002_coordination_consumer.sql",
    sha256: "257cab639e9cac9c9be14d197dd9f2fdca9917acca37b13f570b028a7f6200a3",
  },
  {
    id: "002_lifecycle",
    path: "gateway/migrations/002_lifecycle.sql",
    sha256: "d1be59ac7968888c30234401ea779137848a08d88ac8638c90dcf40d5fb6037d",
  },
  {
    id: "003_coordination_ack_outbox",
    path: "gateway/migrations/003_coordination_ack_outbox.sql",
    sha256: "fb12640b8fd79318f1efbb31a6fb8654d3e396b5c5da0542605be6bc5802366f",
  },
  {
    id: "004_coordination_consumer_runtime_owner",
    path: "gateway/migrations/004_coordination_consumer_runtime_owner.sql",
    sha256: "38ba4d8e84dd447a176c2c4f83b96cbb416681cd077d404f4469b4a459cdd6fb",
  },
]);

export const GENERIC_APPLICATION_SQLITE = freezeSet(ROOT_BASELINE_SQLITE);
export const WIRING_A_SQLITE = freezeSet(ROOT_BASELINE_SQLITE);
export const WIRING_B_EPOCH_SQLITE = freezeSet([
  ...ROOT_BASELINE_SQLITE,
  {
    id: "005_coordination_consumer_runtime_epoch",
    path: "gateway/migrations/profiles/"
      + "sqlite-redis-disposable-epoch-test-v1/"
      + "005_coordination_consumer_runtime_epoch.sql",
    sha256: "ba5cef90d2d30d89339acbf3a3fdbe3cb43815f23737a5faeb1e00c78523ea7d",
  },
]);

const KNOWN_MIGRATION_SETS = new Set([
  GENERIC_APPLICATION_SQLITE,
  WIRING_A_SQLITE,
  WIRING_B_EPOCH_SQLITE,
]);

function migrationProfileMismatch() {
  const error = new Error("SQLite migration profile does not match");
  error.code = "MIGRATION_PROFILE_MISMATCH";
  return error;
}

function failMismatch() {
  throw migrationProfileMismatch();
}

function assertCanonicalEntry(entry, ids, paths) {
  if (
    entry === null
    || typeof entry !== "object"
    || Array.isArray(entry)
    || typeof entry.id !== "string"
    || !/^[A-Za-z0-9][A-Za-z0-9_]{0,127}$/.test(entry.id)
    || typeof entry.path !== "string"
    || typeof entry.sha256 !== "string"
    || !/^[0-9a-f]{64}$/.test(entry.sha256)
    || ids.has(entry.id)
    || paths.has(entry.path)
  ) {
    failMismatch();
  }
  const segments = entry.path.split("/");
  if (
    entry.path.startsWith("/")
    || entry.path.includes("\\")
    || segments.some((segment) => (
      segment.length === 0 || segment === "." || segment === ".."
    ))
    || segments[0] !== "gateway"
    || segments[1] !== "migrations"
  ) {
    failMismatch();
  }
  ids.add(entry.id);
  paths.add(entry.path);
  return segments;
}

function readVerifiedMigrationFiles(selectedSet) {
  if (!KNOWN_MIGRATION_SETS.has(selectedSet)) failMismatch();
  const ids = new Set();
  const paths = new Set();
  return selectedSet.map((entry) => {
    const segments = assertCanonicalEntry(entry, ids, paths);
    const expectedPath = path.join(REPOSITORY_ROOT, ...segments);
    let currentPath = REPOSITORY_ROOT;
    let finalStat;
    try {
      for (const segment of segments) {
        currentPath = path.join(currentPath, segment);
        finalStat = fs.lstatSync(currentPath);
        if (finalStat.isSymbolicLink()) failMismatch();
      }
      if (!finalStat?.isFile()) failMismatch();
      const realPath = fs.realpathSync(expectedPath);
      const expectedRealPath = path.join(REAL_REPOSITORY_ROOT, ...segments);
      if (realPath !== expectedRealPath) failMismatch();
      const bytes = fs.readFileSync(expectedPath);
      const digest = crypto.createHash("sha256").update(bytes).digest("hex");
      if (digest !== entry.sha256) failMismatch();
      return Object.freeze({ entry, bytes });
    } catch (error) {
      if (error?.code === "MIGRATION_PROFILE_MISMATCH") throw error;
      failMismatch();
    }
  });
}

function ledgerExists(database) {
  const row = database.prepare(
    "SELECT type FROM main.sqlite_master WHERE name = 'schema_migrations'",
  ).get();
  if (row === undefined) return false;
  if (row.type !== "table") failMismatch();
  return true;
}

function readAppliedIds(database, selectedSet, exists) {
  if (!exists) return [];
  let rows;
  try {
    rows = database.prepare(
      "SELECT rowid, id FROM main.schema_migrations ORDER BY rowid",
    ).all();
  } catch {
    failMismatch();
  }
  const seen = new Set();
  const ids = rows.map(({ id }) => {
    if (typeof id !== "string" || seen.has(id)) failMismatch();
    seen.add(id);
    return id;
  });
  if (ids.length > selectedSet.length) failMismatch();
  for (let index = 0; index < ids.length; index += 1) {
    if (ids[index] !== selectedSet[index].id) failMismatch();
  }
  return ids;
}

function schemaRows(database) {
  return database.prepare(
    `SELECT type, name, tbl_name AS tableName, sql
     FROM main.sqlite_master
     WHERE type IN ('table', 'index', 'trigger', 'view')
       AND name NOT LIKE 'sqlite_%'
     ORDER BY type, name`,
  ).all();
}

function expectedSchema(files, count) {
  const database = new Database(":memory:");
  try {
    database.exec(MIGRATION_LEDGER_SQL);
    for (const { entry, bytes } of files.slice(0, count)) {
      database.exec(bytes.toString("utf8"));
      database.prepare(INSERT_MIGRATION_SQL).run(entry.id);
    }
    return schemaRows(database);
  } catch {
    failMismatch();
  } finally {
    database.close();
  }
}

function assertExpectedSchema(database, expected) {
  let actual;
  try {
    actual = new Map(schemaRows(database).map((row) => [
      `${row.type}:${row.name}`,
      row,
    ]));
  } catch {
    failMismatch();
  }
  const expectedKeys = new Set(expected.map(({ type, name }) => `${type}:${name}`));
  const expectedTables = new Set(
    expected.filter(({ type }) => type === "table").map(({ name }) => name),
  );
  for (const row of expected) {
    const candidate = actual.get(`${row.type}:${row.name}`);
    if (
      candidate === undefined
      || candidate.tableName !== row.tableName
      || candidate.sql !== row.sql
    ) {
      failMismatch();
    }
  }
  for (const row of actual.values()) {
    if (
      (row.type === "index" || row.type === "trigger")
      && expectedTables.has(row.tableName)
      && !expectedKeys.has(`${row.type}:${row.name}`)
    ) {
      failMismatch();
    }
  }
}

function assertDatabaseShape(database) {
  if (
    database === null
    || typeof database !== "object"
    || typeof database.prepare !== "function"
    || typeof database.exec !== "function"
    || typeof database.transaction !== "function"
    || typeof database.pragma !== "function"
  ) {
    throw new TypeError("SQLite database is required");
  }
}

function establishFileJournalMode(database) {
  if (database.memory === true) return;
  let mode;
  try {
    mode = database.pragma("journal_mode = WAL", { simple: true });
  } catch {
    failMismatch();
  }
  if (mode !== "wal") failMismatch();
}

export function applySqliteMigrationSet(database, selectedSet) {
  assertDatabaseShape(database);
  const files = readVerifiedMigrationFiles(selectedSet);
  let exists;
  let appliedIds;
  try {
    exists = ledgerExists(database);
    appliedIds = readAppliedIds(database, selectedSet, exists);
  } catch (error) {
    if (error?.code === "MIGRATION_PROFILE_MISMATCH") throw error;
    failMismatch();
  }

  if (exists) {
    assertExpectedSchema(database, expectedSchema(files, appliedIds.length));
  }
  if (appliedIds.length !== selectedSet.length) {
    const completeSchema = expectedSchema(files, files.length);
    const apply = database.transaction(() => {
      if (!exists) database.exec(MIGRATION_LEDGER_SQL);
      for (const { entry, bytes } of files.slice(appliedIds.length)) {
        database.exec(bytes.toString("utf8"));
        database.prepare(INSERT_MIGRATION_SQL).run(entry.id);
      }
      const finalIds = readAppliedIds(database, selectedSet, true);
      if (finalIds.length !== selectedSet.length) failMismatch();
      assertExpectedSchema(database, completeSchema);
    });
    try {
      apply();
    } catch (error) {
      if (error?.code === "MIGRATION_PROFILE_MISMATCH") throw error;
      failMismatch();
    }
  }
  establishFileJournalMode(database);
}
