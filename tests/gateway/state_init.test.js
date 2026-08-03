import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const STATE_MODULE = path.join(REPO_ROOT, "gateway", "src", "core", "state.js");

function tmpDb() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "state-init-")), "state.db");
}

async function freshStateModule() {
  return import(`${pathToFileURL(STATE_MODULE).href}?cacheBust=${Date.now()}-${Math.random()}`);
}

test("creates_db_file", async () => {
  const state = await freshStateModule();
  const file = tmpDb();

  state.initState({ stateDb: file });

  assert.ok(fs.existsSync(file));
  state._resetForTests();
});

test("runs_migrations", async () => {
  const state = await freshStateModule();

  state.initState({ stateDb: tmpDb() });
  const tables = state.getDb().prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name);

  assert.ok(tables.includes("orchestration_sessions"));
  state._resetForTests();
});

test("enables_foreign_keys", async () => {
  const state = await freshStateModule();

  state.initState({ stateDb: tmpDb() });
  const result = state.getDb().prepare("PRAGMA foreign_keys").get();

  assert.equal(result.foreign_keys, 1);
  state._resetForTests();
});

test("enables_wal_journal_mode", async () => {
  const state = await freshStateModule();

  state.initState({ stateDb: tmpDb() });
  const result = state.getDb().prepare("PRAGMA journal_mode").get();

  assert.equal(result.journal_mode, "wal");
  state._resetForTests();
});

test("migrations_are_module_relative_not_cwd_relative", async () => {
  const originalCwd = process.cwd();
  process.chdir(path.join(REPO_ROOT, "gateway"));
  try {
    const state = await freshStateModule();
    state.initState({ stateDb: tmpDb() });
    const row = state.getDb().prepare("SELECT id FROM schema_migrations WHERE id = ?").get("001_initial");
    assert.equal(row.id, "001_initial");
    state._resetForTests();
  } finally {
    process.chdir(originalCwd);
  }
});

test("get_db_requires_initialization", async () => {
  const state = await freshStateModule();

  assert.throws(() => state.getDb(), /state not initialized/);
});
