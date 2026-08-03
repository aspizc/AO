import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const MIGRATION = path.join(REPO_ROOT, "gateway", "migrations", "001_initial.sql");
const require = createRequire(path.join(REPO_ROOT, "gateway", "package.json"));
const Database = require("better-sqlite3");

function tmpDb() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "sqlite-migration-")), "state.db");
}

function applyMigration(dbFile) {
  const db = new Database(dbFile);
  const sql = fs.readFileSync(MIGRATION, "utf-8");
  db.exec(sql);
  return db;
}

test("migration_is_idempotent", () => {
  const file = tmpDb();
  applyMigration(file).close();
  applyMigration(file).close();
  assert.ok(true);
});

test("all_domain_tables_exist", () => {
  const db = applyMigration(tmpDb());
  const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name);

  for (const table of [
    "schema_migrations",
    "orchestration_sessions",
    "tasks",
    "sessions",
    "artifacts",
    "messages",
    "policy_decisions",
    "approvals",
  ]) {
    assert.ok(names.includes(table), `missing table ${table}`);
  }
  db.close();
});

test("foreign_keys_are_enabled", () => {
  const db = applyMigration(tmpDb());
  const result = db.prepare("PRAGMA foreign_keys").get();

  assert.equal(result.foreign_keys, 1);
  db.close();
});

test("indexes_are_created", () => {
  const db = applyMigration(tmpDb());
  const names = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map((row) => row.name);

  for (const index of [
    "idx_tasks_trace",
    "idx_sessions_trace",
    "idx_artifacts_trace",
    "idx_messages_trace",
    "idx_pd_trace",
    "idx_approvals_status",
    "idx_approvals_trace",
  ]) {
    assert.ok(names.includes(index), `missing index ${index}`);
  }
  db.close();
});

test("schema_migrations_records_initial_migration", () => {
  const db = applyMigration(tmpDb());
  const row = db.prepare("SELECT id FROM schema_migrations WHERE id = ?").get("001_initial");

  assert.equal(row.id, "001_initial");
  db.close();
});
