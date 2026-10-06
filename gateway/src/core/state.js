import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { PostgresDatabase } from "./postgres_db.js";
import {
  GENERIC_APPLICATION_SQLITE,
  applySqliteMigrationSet,
} from "./sqlite_migration_sets.js";

let db = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, "..", "..", "migrations");
const POSTGRES_MIGRATIONS_DIR = path.join(MIGRATIONS_DIR, "postgres");

function listMigrations(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
}

function applyPendingSqlite(nextDb) {
  applySqliteMigrationSet(nextDb, GENERIC_APPLICATION_SQLITE);
}

function applyPendingPostgres(nextDb) {
  nextDb.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations(id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  const applied = new Set(nextDb.prepare("SELECT id FROM schema_migrations").all().map((row) => row.id ?? row));

  for (const file of listMigrations(POSTGRES_MIGRATIONS_DIR)) {
    const id = file.replace(/\.sql$/, "");
    if (applied.has(id)) continue;
    const sql = fs.readFileSync(path.join(POSTGRES_MIGRATIONS_DIR, file), "utf-8");
    nextDb.exec(sql);
    nextDb
      .prepare(
        "INSERT INTO schema_migrations(id, applied_at) VALUES (?, to_char(clock_timestamp(), 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'))",
      )
      .run(id);
  }
}

export function initState({ stateDb, env = process.env, postgresExecutor } = {}) {
  if (db) return db;

  const dbUrl = env.AGENTS_DB_URL || "";
  if (isPostgresUrl(dbUrl)) {
    db = new PostgresDatabase({ url: dbUrl, executor: postgresExecutor });
    applyPendingPostgres(db);
    return db;
  }

  if (!stateDb) throw new TypeError("stateDb path required");
  fs.mkdirSync(path.dirname(stateDb), { recursive: true });
  const nextDb = new Database(stateDb);
  nextDb.backend = "sqlite";
  try {
    nextDb.pragma("foreign_keys = ON");
    applyPendingSqlite(nextDb);
  } catch (error) {
    nextDb.close();
    throw error;
  }
  db = nextDb;
  return db;
}

export function getDb() {
  if (!db) throw new Error("state not initialized; call initState first");
  return db;
}

export function _resetForTests() {
  if (db) {
    db.close();
    db = null;
  }
}

function isPostgresUrl(value) {
  return /^postgres(ql)?:\/\//.test(value);
}
