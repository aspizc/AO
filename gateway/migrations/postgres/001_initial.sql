CREATE TABLE IF NOT EXISTS schema_migrations (
  id          TEXT PRIMARY KEY,
  applied_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orchestration_sessions (
  session_id    TEXT PRIMARY KEY,
  trace_id      TEXT NOT NULL UNIQUE,
  caller_agent  TEXT NOT NULL,
  caller_role   TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('active','paused','completed','cancelled')),
  goal          TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  task_id        TEXT PRIMARY KEY,
  trace_id       TEXT NOT NULL REFERENCES orchestration_sessions(trace_id) ON DELETE CASCADE,
  assigned_agent TEXT NOT NULL,
  assigned_role  TEXT NOT NULL,
  repo           TEXT,
  status         TEXT NOT NULL CHECK (status IN ('pending','running','completed','failed','cancelled')),
  created_at     TEXT NOT NULL,
  closed_at      TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id    TEXT PRIMARY KEY,
  task_id       TEXT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  trace_id      TEXT NOT NULL,
  agent         TEXT NOT NULL,
  role          TEXT NOT NULL,
  tmux_target   TEXT,
  status        TEXT NOT NULL CHECK (status IN ('starting','running','closed','error')),
  started_at    TEXT NOT NULL,
  closed_at     TEXT
);

CREATE TABLE IF NOT EXISTS artifacts (
  artifact_id    TEXT PRIMARY KEY,
  trace_id       TEXT NOT NULL,
  kind           TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('unrestricted','internal','restricted')),
  produced_by    TEXT NOT NULL,
  path           TEXT NOT NULL,
  sanitized_from TEXT REFERENCES artifacts(artifact_id),
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  message_id  TEXT PRIMARY KEY,
  trace_id    TEXT NOT NULL,
  from_id     TEXT NOT NULL,
  to_id       TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS policy_decisions (
  decision_id TEXT PRIMARY KEY,
  trace_id    TEXT,
  context     TEXT NOT NULL,
  decision    TEXT NOT NULL,
  reason_code TEXT,
  decided_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approvals (
  approval_id  TEXT PRIMARY KEY,
  trace_id     TEXT,
  requested_by TEXT NOT NULL,
  action       TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('pending','granted','denied','expired')),
  created_at   TEXT NOT NULL,
  decided_at   TEXT,
  decided_by   TEXT,
  payload      TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_trace ON tasks(trace_id);
CREATE INDEX IF NOT EXISTS idx_sessions_trace ON sessions(trace_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_trace ON artifacts(trace_id);
CREATE INDEX IF NOT EXISTS idx_messages_trace ON messages(trace_id);
CREATE INDEX IF NOT EXISTS idx_pd_trace ON policy_decisions(trace_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_trace ON approvals(trace_id);
