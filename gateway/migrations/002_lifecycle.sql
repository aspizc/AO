ALTER TABLE orchestration_sessions
  ADD COLUMN lifecycle_state TEXT NOT NULL DEFAULT 'active'
  CHECK (lifecycle_state IN ('active','paused','completed','cancelled'));
ALTER TABLE orchestration_sessions
  ADD COLUMN lifecycle_version INTEGER NOT NULL DEFAULT 0
  CHECK (
    lifecycle_version >= 0
    AND lifecycle_version <= 9007199254740991
  );
ALTER TABLE orchestration_sessions
  ADD COLUMN closed_at TEXT;

UPDATE orchestration_sessions
SET lifecycle_state = status;

ALTER TABLE tasks
  ADD COLUMN lifecycle_state TEXT NOT NULL DEFAULT 'pending'
  CHECK (lifecycle_state IN (
    'pending','starting','running','completed','failed','cancelled'
  ));
ALTER TABLE tasks
  ADD COLUMN lifecycle_version INTEGER NOT NULL DEFAULT 0
  CHECK (
    lifecycle_version >= 0
    AND lifecycle_version <= 9007199254740991
  );

UPDATE tasks
SET lifecycle_state = status;

-- A session created through the pre-splice writer remains explicitly legacy.
-- Only SESSION_RESERVE supplies both canonical lifecycle columns.
ALTER TABLE sessions
  ADD COLUMN lifecycle_state TEXT
  CHECK (
    lifecycle_state IS NULL
    OR lifecycle_state IN ('starting','running','closed','error')
  );
ALTER TABLE sessions
  ADD COLUMN lifecycle_version INTEGER
  CHECK (
    (
      lifecycle_state IS NULL
      AND lifecycle_version IS NULL
    )
    OR (
      lifecycle_state IN ('starting','running','closed','error')
      AND
      lifecycle_version >= 0
      AND lifecycle_version <= 9007199254740991
    )
  );

CREATE TABLE lifecycle_transitions (
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
  from_version INTEGER CHECK (
    from_version IS NULL
    OR (
      from_version >= 0
      AND from_version <= 9007199254740991
    )
  ),
  to_version INTEGER NOT NULL CHECK (
    to_version >= 0
    AND to_version <= 9007199254740991
  ),
  evidence TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (entity_type, entity_id, to_version)
);

CREATE INDEX idx_lifecycle_transitions_entity
  ON lifecycle_transitions(entity_type, entity_id, to_version);
CREATE INDEX idx_lifecycle_transitions_trace
  ON lifecycle_transitions(trace_id, occurred_at, idempotency_key);
