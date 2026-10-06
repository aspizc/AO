CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

ALTER TABLE orchestration_sessions
  ADD COLUMN IF NOT EXISTS lifecycle_state TEXT;
ALTER TABLE orchestration_sessions
  ADD COLUMN IF NOT EXISTS lifecycle_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE orchestration_sessions
  ADD COLUMN IF NOT EXISTS closed_at TEXT;

UPDATE orchestration_sessions
SET lifecycle_state = status
WHERE lifecycle_state IS NULL;

ALTER TABLE orchestration_sessions
  ALTER COLUMN lifecycle_state SET DEFAULT 'active';
ALTER TABLE orchestration_sessions
  ALTER COLUMN lifecycle_state SET NOT NULL;
ALTER TABLE orchestration_sessions
  ADD CONSTRAINT orchestration_lifecycle_state_check
  CHECK (lifecycle_state IN ('active','paused','completed','cancelled'));
ALTER TABLE orchestration_sessions
  ADD CONSTRAINT orchestration_lifecycle_version_check
  CHECK (
    lifecycle_version >= 0
    AND lifecycle_version <= 9007199254740991
  );

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS lifecycle_state TEXT;
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS lifecycle_version BIGINT NOT NULL DEFAULT 0;

UPDATE tasks
SET lifecycle_state = status
WHERE lifecycle_state IS NULL;

ALTER TABLE tasks
  ALTER COLUMN lifecycle_state SET DEFAULT 'pending';
ALTER TABLE tasks
  ALTER COLUMN lifecycle_state SET NOT NULL;
ALTER TABLE tasks
  ADD CONSTRAINT task_lifecycle_state_check
  CHECK (lifecycle_state IN (
    'pending','starting','running','completed','failed','cancelled'
  ));
ALTER TABLE tasks
  ADD CONSTRAINT task_lifecycle_version_check
  CHECK (
    lifecycle_version >= 0
    AND lifecycle_version <= 9007199254740991
  );

-- Legacy session rows and inserts leave both lifecycle columns NULL.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS lifecycle_state TEXT;
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS lifecycle_version BIGINT;
ALTER TABLE sessions
  ADD CONSTRAINT session_lifecycle_pair_check
  CHECK (
    (
      lifecycle_state IS NULL
      AND lifecycle_version IS NULL
    )
    OR (
      lifecycle_state IN ('starting','running','closed','error')
      AND lifecycle_version >= 0
      AND lifecycle_version <= 9007199254740991
    )
  );

CREATE TABLE IF NOT EXISTS lifecycle_transitions (
  idempotency_key TEXT PRIMARY KEY,
  command_digest TEXT NOT NULL,
  command_version INTEGER NOT NULL CHECK (command_version = 1),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('orchestration','task','session')),
  entity_id TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  task_id TEXT,
  from_status TEXT,
  to_status TEXT NOT NULL,
  from_version BIGINT CHECK (
    from_version IS NULL
    OR (
      from_version >= 0
      AND from_version <= 9007199254740991
    )
  ),
  to_version BIGINT NOT NULL CHECK (
    to_version >= 0
    AND to_version <= 9007199254740991
  ),
  evidence TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (entity_type, entity_id, to_version)
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_transitions_entity
  ON lifecycle_transitions(entity_type, entity_id, to_version);
CREATE INDEX IF NOT EXISTS idx_lifecycle_transitions_trace
  ON lifecycle_transitions(trace_id, occurred_at, idempotency_key);
