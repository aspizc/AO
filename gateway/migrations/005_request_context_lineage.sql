ALTER TABLE main.tasks ADD COLUMN target_action TEXT;

CREATE TABLE main.request_context_lineage (
  trace_id TEXT PRIMARY KEY
    REFERENCES orchestration_sessions(trace_id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
  principal_id TEXT NOT NULL,
  machine_digest TEXT NOT NULL,
  state_path TEXT NOT NULL,
  audience TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  owner_connection_id TEXT,
  owner_pid INTEGER,
  owner_start_token TEXT,
  owner_boot_id TEXT,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  payload_json TEXT NOT NULL,
  CHECK (
    (owner_connection_id IS NULL AND owner_pid IS NULL
      AND owner_start_token IS NULL AND owner_boot_id IS NULL)
    OR
    (owner_connection_id IS NOT NULL AND owner_pid > 1
      AND owner_start_token IS NOT NULL AND owner_boot_id IS NOT NULL)
  )
);

INSERT OR IGNORE INTO main.schema_migrations(id, applied_at)
VALUES ('005_request_context_lineage', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
