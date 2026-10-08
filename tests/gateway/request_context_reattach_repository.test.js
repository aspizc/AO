import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { GENERIC_APPLICATION_SQLITE, applySqliteMigrationSet } from "../../gateway/src/core/sqlite_migration_sets.js";

const require = createRequire(new URL("../../gateway/package.json", import.meta.url));
const Database = require("better-sqlite3");
const api = await import("../../gateway/src/core/repositories/request_context_repo.js").catch(() => ({}));
const owner = { connectionId: "original", pid: 123, startToken: "456", bootId: "12345678-1234-1234-1234-123456789abc" };
const identity = { principalId: "linux-uid:1000", machineDigest: "a".repeat(64), statePath: "/private/state.db", verify: () => true };

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reattach-repository-"));
  const file = path.join(root, "state.db");
  const database = new Database(file);
  database.backend = "sqlite";
  applySqliteMigrationSet(database, GENERIC_APPLICATION_SQLITE);
  t.after(() => { database.close(); fs.rmSync(root, { recursive: true, force: true }); });
  database.exec(`INSERT INTO orchestration_sessions
    (session_id, trace_id, caller_agent, caller_role, status, created_at)
    VALUES ('or-one', 'tr-one', 'codex', 'orchestrator', 'active', '2026-10-07');`);
  assert.equal(typeof api.createRequestContextRepository, "function", "missing transactional recovery repository");
  const repository = api.createRequestContextRepository({ database });
  const task = (id) => ({ taskId: id, repositoryId: "app", canonicalRoot: "/app", targetAgent: "codex", targetRole: "coder", targetAction: "code.read" });
  function addTask(id) {
    database.prepare(`INSERT INTO tasks
      (task_id, trace_id, assigned_agent, assigned_role, repo, status, created_at, target_action)
      VALUES (?, 'tr-one', 'codex', 'coder', 'app', 'pending', '2026-10-07', 'code.read')`).run(id);
    return task(id);
  }
  function create() {
    repository.createTrace({ traceId: "tr-one", identity, audience: "agents-gateway", expiresAt: "2026-10-08T00:00:00.000Z", owner });
  }
  function claim(extra = {}) {
    return repository.claimTrace({
      traceId: "tr-one", identity, audience: "agents-gateway", now: "2026-10-07T12:00:00.000Z",
      owner: { ...owner, connectionId: "new", pid: 789 },
      validate: () => ({ traceId: "tr-one" }), ...extra,
    });
  }
  return { database, file, repository, addTask, create, claim };
}

test("metadata writes merge latest task and supervised session bindings in an immediate transaction", (t) => {
  const f = fixture(t);
  f.create();
  const one = f.addTask("ts-one");
  const two = f.addTask("ts-two");
  f.repository.mergeTask({ traceId: "tr-one", owner, task: one });
  const stale = f.repository.getTrace("tr-one");
  f.repository.mergeTask({ traceId: "tr-one", owner, task: two });
  f.database.exec(`INSERT INTO sessions
    (session_id, task_id, trace_id, agent, role, tmux_target, status, started_at)
    VALUES ('ss-one', 'ts-one', 'tr-one', 'codex', 'coder', 'child-one', 'running', '2026-10-07')`);
  const session = { sessionId: "ss-one", taskId: "ts-one", tmuxTarget: "child-one", targetAgent: "codex", targetRole: "coder" };
  f.repository.mergeSession({ traceId: "tr-one", owner, session, snapshot: stale });
  const current = f.repository.getTrace("tr-one");
  assert.deepEqual(current.payload.tasks.map(({ taskId }) => taskId), ["ts-one", "ts-two"]);
  assert.deepEqual(current.payload.sessions, [session]);
  assert.ok(current.revision > stale.revision, "a stale caller snapshot cannot erase a later durable task");
  assert.equal(f.database.inTransaction, false);
});

test("claim validation reads current authoritative rows under the write lock before changing owner", (t) => {
  const f = fixture(t);
  f.create();
  f.repository.mergeTask({ traceId: "tr-one", owner, task: f.addTask("ts-one") });
  const result = f.claim({ validate(record) {
    assert.equal(f.database.inTransaction, true);
    assert.equal(record.owner.connectionId, "original");
    assert.equal(record.tasks[0].target_action, "code.read");
    return { traceId: "tr-one", reattachedTaskIds: ["ts-one"] };
  } });
  assert.deepEqual(result, { traceId: "tr-one", reattachedTaskIds: ["ts-one"] });
  assert.equal(f.repository.getTrace("tr-one").owner.connectionId, "new");
  const revision = f.repository.getTrace("tr-one").revision;
  f.claim();
  assert.equal(f.repository.getTrace("tr-one").revision, revision, "same owner retries retain their revision");
});

test("failed or asynchronous claim validation commits no partial owner", (t) => {
  const f = fixture(t);
  f.create();
  f.repository.mergeTask({ traceId: "tr-one", owner, task: f.addTask("ts-one") });
  const before = f.repository.getTrace("tr-one");
  for (const validate of [() => { throw new Error("probe failed"); }, async () => ({})]) {
    assert.throws(() => f.claim({ validate }));
    assert.deepEqual(f.repository.getTrace("tr-one"), before);
  }
  f.database.exec(`CREATE TRIGGER fail_claim BEFORE UPDATE ON request_context_lineage
    BEGIN SELECT RAISE(ABORT, 'durable write failure'); END;`);
  assert.throws(() => f.claim());
  assert.deepEqual(f.repository.getTrace("tr-one"), before);
});

test("private claim guards reject identity audience original expiry and terminal residue", (t) => {
  const f = fixture(t);
  f.create();
  f.repository.mergeTask({ traceId: "tr-one", owner, task: f.addTask("ts-one") });
  for (const extra of [
    { identity: { ...identity, principalId: "linux-uid:1001" } },
    { identity: { ...identity, machineDigest: "b".repeat(64) } },
    { identity: { ...identity, statePath: "/copied/state.db" } },
    { identity: { ...identity, verify: () => false } },
    { audience: "foreign" }, { now: "2026-10-08T00:00:00.000Z" },
  ]) assert.throws(() => f.claim(extra), { code: "REQUEST_CONTEXT_DENIED" });
  f.database.exec("UPDATE orchestration_sessions SET lifecycle_state = 'completed' WHERE trace_id = 'tr-one'");
  assert.throws(() => f.claim(), { code: "REQUEST_CONTEXT_DENIED" });
  assert.equal(f.repository.getTrace("tr-one").owner.connectionId, "original");
});

test("taskless incomplete legacy action and tampered bindings never enter claim validation", (t) => {
  const f = fixture(t);
  f.create();
  assert.throws(() => f.claim(), { code: "REQUEST_CONTEXT_DENIED" });
  const task = f.addTask("ts-one");
  assert.throws(() => f.claim(), { code: "REQUEST_CONTEXT_DENIED" });
  f.repository.mergeTask({ traceId: "tr-one", owner, task });
  for (const [column, value] of [["target_action", null], ["target_action", "code.write"], ["assigned_role", "reviewer"], ["repo", "other"]]) {
    const old = f.database.prepare(`SELECT ${column} AS value FROM tasks WHERE task_id = 'ts-one'`).get().value;
    f.database.prepare(`UPDATE tasks SET ${column} = ? WHERE task_id = 'ts-one'`).run(value);
    assert.throws(() => f.claim({ validate() { assert.fail("inconsistent lineage reached authority validation"); } }), { code: "REQUEST_CONTEXT_DENIED" });
    f.database.prepare(`UPDATE tasks SET ${column} = ? WHERE task_id = 'ts-one'`).run(old);
  }
});

test("latest owner is visible to a competing claimant and lock contention denies without a write", (t) => {
  const f = fixture(t);
  f.create();
  f.repository.mergeTask({ traceId: "tr-one", owner, task: f.addTask("ts-one") });
  f.claim();
  const second = new Database(f.file, { timeout: 0 });
  second.backend = "sqlite";
  const other = api.createRequestContextRepository({ database: second });
  try {
    assert.throws(() => other.claimTrace({
      traceId: "tr-one", identity, audience: "agents-gateway", now: "2026-10-07T12:00:00.000Z",
      owner: { ...owner, connectionId: "loser" }, validate(record) {
        assert.equal(record.owner.connectionId, "new");
        throw Object.assign(new Error("live owner"), { code: "REQUEST_CONTEXT_DENIED" });
      },
    }), { code: "REQUEST_CONTEXT_DENIED" });
    f.database.exec("BEGIN IMMEDIATE");
    try { assert.throws(() => other.releaseOwner(owner), { code: "REQUEST_CONTEXT_DENIED" }); }
    finally { f.database.exec("ROLLBACK"); }
    assert.equal(f.repository.getTrace("tr-one").owner.connectionId, "new");
  } finally { second.close(); }
});

test("cleanup requires confirmed terminal business rows and owner release preserves original expiry", (t) => {
  const f = fixture(t);
  f.create();
  const before = f.repository.getTrace("tr-one");
  assert.throws(() => f.repository.removeTerminalTrace("tr-one"), { code: "REQUEST_CONTEXT_DENIED" });
  f.repository.releaseOwner(owner);
  const released = f.repository.getTrace("tr-one");
  assert.equal(released.owner, null);
  assert.equal(released.expiresAt, before.expiresAt);
  f.database.exec("UPDATE orchestration_sessions SET lifecycle_state = 'cancelled' WHERE trace_id = 'tr-one'");
  f.repository.removeTerminalTrace("tr-one");
  assert.equal(f.repository.getTrace("tr-one"), null);
});

test("unsupported PostgreSQL recovery creates no repository and performs no queries", () => {
  assert.equal(typeof api.createRequestContextRepository, "function");
  assert.equal(api.createRequestContextRepository({ database: { backend: "postgres", prepare() { assert.fail("unsupported database query"); } } }), null);
});

test("supervised session target cannot exceed its recorded task agent and role", (t) => {
  const f = fixture(t);
  f.create();
  f.repository.mergeTask({ traceId: "tr-one", owner, task: f.addTask("ts-one") });
  f.database.exec(`INSERT INTO sessions
    (session_id, task_id, trace_id, agent, role, tmux_target, status, started_at)
    VALUES ('ss-foreign', 'ts-one', 'tr-one', 'claude-code', 'reviewer', 'foreign', 'running', '2026-10-07')`);
  assert.throws(() => f.repository.mergeSession({ traceId: "tr-one", owner, session: {
    sessionId: "ss-foreign", taskId: "ts-one", tmuxTarget: "foreign", targetAgent: "claude-code", targetRole: "reviewer",
  } }), { code: "REQUEST_CONTEXT_DENIED" });
  assert.deepEqual(f.repository.getTrace("tr-one").payload.sessions, []);
});

test("same connection ID cannot retry using a different process identity", (t) => {
  const f = fixture(t);
  f.create();
  f.repository.mergeTask({ traceId: "tr-one", owner, task: f.addTask("ts-one") });
  assert.throws(() => f.claim({ owner: { ...owner, pid: 999 } }), { code: "REQUEST_CONTEXT_DENIED" });
  assert.equal(f.repository.getTrace("tr-one").owner.pid, owner.pid);
});
