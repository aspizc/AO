PRAGMA foreign_keys = ON;

CREATE TABLE main.coordination_consumer_runtime_owners (
  scope_id TEXT NOT NULL PRIMARY KEY
    CHECK (
      typeof(scope_id) = 'text'
      AND length(scope_id) BETWEEN 1 AND 128
    ),
  generation INTEGER NOT NULL
    CHECK (
      typeof(generation) = 'integer'
      AND generation BETWEEN 1 AND 9007199254740991
    ),
  owner_state TEXT NOT NULL
    CHECK (
      typeof(owner_state) = 'text'
      AND owner_state IN ('owned', 'released')
    )
);

INSERT OR IGNORE INTO main.schema_migrations(id, applied_at)
VALUES (
  '004_coordination_consumer_runtime_owner',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
