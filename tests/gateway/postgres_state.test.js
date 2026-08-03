import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { initState, getDb, _resetForTests } from "../../gateway/src/core/state.js";
import { createFakePostgresExecutor } from "./fake_postgres_executor.js";
import { installRepositoryContractTests } from "./repository_contracts.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const STATE_MODULE = path.join(REPO_ROOT, "gateway", "src", "core", "state.js");
const POSTGRES_MIGRATION = path.join(REPO_ROOT, "gateway", "migrations", "postgres", "001_initial.sql");
const DEFAULT_POSTGRES_URL = "postgres://agents:agents@localhost:5432/agents";
const LIVE_POSTGRES_SKIP_MESSAGE =
  "set AGENTS_PG_INTEGRATION=1 (or legacy AGENTS_TEST_DB=postgres) and provide psql plus a reachable Postgres";

let livePostgresSkipReason;

async function freshStateModule() {
  return import(`${pathToFileURL(STATE_MODULE).href}?cacheBust=${Date.now()}-${Math.random()}`);
}

function commandExists(command) {
  return spawnSync("which", [command], { stdio: "ignore" }).status === 0;
}

function livePostgresUrl() {
  return process.env.AGENTS_TEST_DB_URL || DEFAULT_POSTGRES_URL;
}

function livePostgresOptInEnabled() {
  return process.env.AGENTS_PG_INTEGRATION === "1" || process.env.AGENTS_TEST_DB === "postgres";
}

function skipReason() {
  if (livePostgresSkipReason !== undefined) return livePostgresSkipReason;
  if (!livePostgresOptInEnabled()) {
    livePostgresSkipReason = LIVE_POSTGRES_SKIP_MESSAGE;
    return livePostgresSkipReason;
  }
  if (!commandExists("psql")) {
    livePostgresSkipReason = `${LIVE_POSTGRES_SKIP_MESSAGE}; missing: psql`;
    return livePostgresSkipReason;
  }

  const ready = spawnSync(
    "psql",
    [livePostgresUrl(), "-v", "ON_ERROR_STOP=1", "-X", "-q", "-t", "-A", "-c", "SELECT 1"],
    { encoding: "utf8" },
  );
  if (ready.status !== 0 || ready.stdout.trim() !== "1") {
    const detail = ready.stderr.trim() || ready.stdout.trim() || `exit ${ready.status}`;
    livePostgresSkipReason = `${LIVE_POSTGRES_SKIP_MESSAGE}; Postgres not ready at ${livePostgresUrl()}: ${detail}`;
    return livePostgresSkipReason;
  }

  livePostgresSkipReason = false;
  return livePostgresSkipReason;
}

test("sqlite_remains_default_when_agents_db_url_is_unset", async () => {
  const state = await freshStateModule();
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "sqlite-default-")), "state.db");

  const db = state.initState({ stateDb: file, env: {} });

  assert.equal(db.backend, "sqlite");
  assert.ok(fs.existsSync(file));
  state._resetForTests();
});

test("postgres_backend_is_selected_by_agents_db_url_without_creating_sqlite_file", async () => {
  const state = await freshStateModule();
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "postgres-selected-")), "state.db");
  const calls = [];

  const db = state.initState({
    stateDb: file,
    env: { AGENTS_DB_URL: "postgres://user:pass@localhost:5432/agents" },
    postgresExecutor(sql) {
      calls.push(sql);
      if (sql.includes("SELECT id FROM schema_migrations")) return [];
      if (sql.startsWith("SELECT COALESCE(json_agg")) return [];
      return { changes: 1 };
    },
  });

  assert.equal(db.backend, "postgres");
  assert.equal(fs.existsSync(file), false);
  assert.ok(calls.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS orchestration_sessions")));
  state._resetForTests();
});

test("postgres_prepared_statements_keep_better_sqlite_shape", async () => {
  const state = await freshStateModule();
  const calls = [];
  const db = state.initState({
    stateDb: "/unused/state.db",
    env: { AGENTS_DB_URL: "postgres://user:pass@localhost:5432/agents" },
    postgresExecutor(sql) {
      calls.push(sql);
      if (sql.includes("SELECT id FROM schema_migrations")) return ["001_initial"];
      if (sql.includes("COUNT(*)::int AS changes")) return [{ changes: 1 }];
      if (sql.startsWith("SELECT COALESCE(json_agg")) {
        return [{ task_id: "task-1", assigned_role: "coder" }];
      }
      return { changes: 1 };
    },
  });

  const row = db.prepare("SELECT * FROM tasks WHERE task_id = ?").get("task-1");
  const result = db.prepare("UPDATE tasks SET status = ? WHERE task_id = ?").run("completed", "task-1");

  assert.equal(row.assigned_role, "coder");
  assert.equal(result.changes, 1);
  assert.ok(calls.some((sql) => sql.includes("task_id = 'task-1'")));
  assert.ok(calls.some((sql) => sql.includes("status = 'completed'")));
  state._resetForTests();
});

test("postgres_migration_is_versioned_and_not_sqlite_specific", () => {
  const sql = fs.readFileSync(POSTGRES_MIGRATION, "utf-8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS orchestration_sessions/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS approvals/);
  assert.doesNotMatch(sql, /PRAGMA/i);
  assert.doesNotMatch(sql, /sqlite_master/i);
});

function freshFakePostgresRepositoryState() {
  _resetForTests();
  initState({
    stateDb: "/unused/state.db",
    env: { AGENTS_DB_URL: "postgres://user:pass@localhost:5432/agents" },
    postgresExecutor: createFakePostgresExecutor(),
  });
}

installRepositoryContractTests({
  test,
  name: "fake postgres repository contract",
  fresh: freshFakePostgresRepositoryState,
});

function livePostgresTest(name, fn) {
  test(name, { skip: skipReason() }, fn);
}

function freshLivePostgresRepositoryState() {
  _resetForTests();
  initState({
    stateDb: "/unused/state.db",
    env: { AGENTS_DB_URL: livePostgresUrl() },
  });
  getDb().exec(
    [
      "DELETE FROM policy_decisions",
      "DELETE FROM messages",
      "DELETE FROM artifacts",
      "DELETE FROM approvals",
      "DELETE FROM sessions",
      "DELETE FROM tasks",
      "DELETE FROM orchestration_sessions",
    ].join("; "),
  );
}

installRepositoryContractTests({
  test: livePostgresTest,
  name: "live postgres repository contract",
  fresh: freshLivePostgresRepositoryState,
});

livePostgresTest("live postgres literals round-trip adversarial strings", () => {
  freshLivePostgresRepositoryState();
  const values = [
    "single ' quote",
    "two '' quotes",
    'double " quote',
    String.raw`backslash \ path`,
    ":variable and :'quoted_variable' psql-looking tokens",
    "line one\nline two",
    "emoji 😀",
  ];

  for (const value of values) {
    const row = getDb().prepare("SELECT ? AS value").get(value);
    assert.equal(row.value, value);
  }
});

livePostgresTest("live postgres literals preserve NULL separately from string null", () => {
  freshLivePostgresRepositoryState();

  const row = getDb().prepare("SELECT ? AS null_value, ? AS string_value").get(null, "null");

  assert.equal(row.null_value, null);
  assert.equal(row.string_value, "null");
});

livePostgresTest("live postgres literals support named and positional params", () => {
  freshLivePostgresRepositoryState();

  const positional = getDb().prepare("SELECT ? AS value").get("positional:value");
  const named = getDb().prepare("SELECT @value AS value").get({ value: "named:value" });

  assert.equal(positional.value, "positional:value");
  assert.equal(named.value, "named:value");
});

livePostgresTest("live postgres reports changes for insert update and delete", () => {
  freshLivePostgresRepositoryState();
  const db = getDb();

  try {
    db.exec(
      "DROP TABLE IF EXISTS v3_pg_integration_changes; " +
        "CREATE TABLE v3_pg_integration_changes (id text PRIMARY KEY, value text)",
    );

    const inserted = db
      .prepare("INSERT INTO v3_pg_integration_changes (id, value) VALUES (?, ?)")
      .run("row-1", "initial");
    const selected = db.prepare("SELECT value FROM v3_pg_integration_changes WHERE id = ?").get("row-1");
    const updated = db
      .prepare("UPDATE v3_pg_integration_changes SET value = @value WHERE id = @id")
      .run({ id: "row-1", value: "updated" });
    const deleted = db.prepare("DELETE FROM v3_pg_integration_changes WHERE id = ?").run("row-1");

    assert.equal(inserted.changes, 1);
    assert.equal(selected.value, "initial");
    assert.equal(updated.changes, 1);
    assert.equal(deleted.changes, 1);
  } finally {
    db.exec("DROP TABLE IF EXISTS v3_pg_integration_changes");
  }
});

livePostgresTest("live postgres rejects non-finite numeric literals before execution", () => {
  freshLivePostgresRepositoryState();

  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.throws(
      () => getDb().prepare("SELECT ? AS value").get(value),
      /non-finite number cannot be a SQL literal/,
    );
  }
});
