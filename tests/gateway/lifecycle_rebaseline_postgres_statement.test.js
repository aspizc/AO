import assert from "node:assert/strict";
import { test } from "node:test";

import { PostgresDatabase } from "../../gateway/src/core/postgres_db.js";
import { createLifecycleRebaselinePostgresFake } from "./lifecycle_rebaseline_postgres_fake.js";

const DATA_MODIFYING_CTE = `
  WITH lifecycle_changed AS (
    UPDATE tasks
    SET lifecycle_version = 1
    WHERE task_id = 'task-1' AND lifecycle_version = 0
    RETURNING 1
  ),
  lifecycle_recorded AS (
    INSERT INTO lifecycle_transitions
      (idempotency_key, command_digest, command_version, action, entity_type,
       entity_id, trace_id, task_id, from_status, to_status, from_version,
       to_version, evidence, occurred_at, created_at)
    SELECT
      'idem-1', 'digest-1', 1, 'task.reserve_start', 'task', 'task-1',
      'trace-1', 'task-1', 'pending', 'starting', 0, 1, '{}',
      '2026-07-27T00:00:00.000Z', '2026-07-27T00:00:00.000Z'
    FROM lifecycle_changed
    RETURNING 1
  )
  SELECT 1
`;

test("PostgresDatabase get nests a data-modifying CTE and the lifecycle fake rejects it", () => {
  const executor = createLifecycleRebaselinePostgresFake();
  const db = new PostgresDatabase({
    url: "postgres://offline/lifecycle",
    executor,
  });

  assert.throws(
    () => db.prepare(DATA_MODIFYING_CTE).get(),
    {
      code: "FAKE_POSTGRES_NESTED_DML_CTE",
      message: "data-modifying lifecycle CTE must be a top-level statement",
    },
  );
  assert.match(executor.calls.at(-1), /^SELECT COALESCE/);
  assert.match(executor.calls.at(-1), /FROM \(\s*WITH lifecycle_changed/i);
});

test("PostgresDatabase run leaves a data-modifying lifecycle CTE top-level", () => {
  const calls = [];
  const db = new PostgresDatabase({
    url: "postgres://offline/lifecycle",
    executor(sql) {
      calls.push(sql);
      return { changes: 73 };
    },
  });

  const result = db.prepare(DATA_MODIFYING_CTE).run();

  assert.equal(result.changes, 73);
  assert.match(calls[0].trim(), /^WITH lifecycle_changed/i);
  assert.doesNotMatch(calls[0].trim(), /^SELECT COALESCE/);
});
