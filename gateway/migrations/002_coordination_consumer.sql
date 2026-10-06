PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id          TEXT PRIMARY KEY,
  applied_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coordination_consumer_receipts (
  consume_key                       TEXT PRIMARY KEY
    CHECK (
      length(consume_key) = 81
      AND substr(consume_key, 1, 17) = 'coord-consume-v1-'
    ),
  metadata_protocol_version         INTEGER NOT NULL
    CHECK (
      metadata_protocol_version >= 0
      AND metadata_protocol_version <= 255
    ),
  metadata_scope_id                 TEXT NOT NULL
    CHECK (length(metadata_scope_id) BETWEEN 1 AND 128),
  metadata_message_id               TEXT NOT NULL
    CHECK (length(metadata_message_id) BETWEEN 1 AND 128),
  metadata_from_participant_id      TEXT NOT NULL
    CHECK (length(metadata_from_participant_id) BETWEEN 1 AND 128),
  metadata_to_participant_id        TEXT NOT NULL
    CHECK (length(metadata_to_participant_id) BETWEEN 1 AND 128),
  metadata_message_type             TEXT NOT NULL
    CHECK (length(metadata_message_type) BETWEEN 1 AND 128),
  metadata_classification           TEXT NOT NULL
    CHECK (length(metadata_classification) BETWEEN 1 AND 128),
  metadata_created_at               TEXT NOT NULL
    CHECK (length(metadata_created_at) BETWEEN 1 AND 64),
  metadata_trace_id                 TEXT
    CHECK (
      metadata_trace_id IS NULL
      OR length(metadata_trace_id) BETWEEN 1 AND 128
    ),
  metadata_correlation_id           TEXT
    CHECK (
      metadata_correlation_id IS NULL
      OR length(metadata_correlation_id) BETWEEN 1 AND 128
    ),
  metadata_reply_to_message_id      TEXT
    CHECK (
      metadata_reply_to_message_id IS NULL
      OR length(metadata_reply_to_message_id) BETWEEN 1 AND 128
    ),
  metadata_malformed                INTEGER
    CHECK (metadata_malformed IS NULL OR metadata_malformed IN (0, 1)),
  state                             TEXT NOT NULL
    CHECK (
      state IN (
        'processing',
        'effect_committed',
        'quarantine_blocked',
        'quarantined',
        'completed',
        'replay_committed'
      )
    ),
  attempts                          INTEGER NOT NULL DEFAULT 0
    CHECK (attempts >= 0),
  claim_epoch                       INTEGER NOT NULL
    CHECK (claim_epoch >= 1),
  lease_owner_id                    TEXT,
  lease_claim_token                 TEXT,
  lease_expires_at                  INTEGER,
  effect_commit_id                  TEXT,
  effect_committed_at               INTEGER,
  quarantine_id                    TEXT,
  quarantine_reason_code           TEXT,
  quarantine_committed_at           INTEGER,
  replay_epoch                      INTEGER NOT NULL DEFAULT 0
    CHECK (replay_epoch >= 0),
  max_consumed_recovery_ids         INTEGER NOT NULL
    CHECK (max_consumed_recovery_ids BETWEEN 1 AND 8),
  created_at                        INTEGER NOT NULL
    CHECK (created_at >= 0),
  updated_at                        INTEGER NOT NULL
    CHECK (updated_at >= 0),
  CHECK (
    (
      lease_owner_id IS NULL
      AND lease_claim_token IS NULL
      AND lease_expires_at IS NULL
    )
    OR (
      lease_owner_id IS NOT NULL
      AND lease_claim_token IS NOT NULL
      AND lease_expires_at IS NOT NULL
      AND lease_expires_at >= 0
    )
  ),
  CHECK (
    (
      effect_commit_id IS NULL
      AND effect_committed_at IS NULL
    )
    OR (
      effect_commit_id IS NOT NULL
      AND effect_committed_at IS NOT NULL
      AND effect_committed_at >= 0
    )
  ),
  CHECK (
    quarantine_committed_at IS NULL
    OR quarantine_committed_at >= 0
  )
);

CREATE TABLE IF NOT EXISTS coordination_consumer_deliveries (
  consume_key     TEXT NOT NULL
    REFERENCES coordination_consumer_receipts(consume_key)
    ON DELETE CASCADE,
  delivery_id     TEXT NOT NULL,
  recovered       INTEGER NOT NULL CHECK (recovered IN (0, 1)),
  observed_at     INTEGER NOT NULL CHECK (observed_at >= 0),
  observed_order  INTEGER NOT NULL CHECK (observed_order >= 1),
  ack_state       TEXT NOT NULL
    CHECK (ack_state IN ('pending', 'acknowledging', 'acked')),
  acked_at        INTEGER CHECK (acked_at IS NULL OR acked_at >= 0),
  PRIMARY KEY (consume_key, delivery_id),
  UNIQUE (consume_key, observed_order),
  CHECK (
    (ack_state = 'acked' AND acked_at IS NOT NULL)
    OR (ack_state <> 'acked' AND acked_at IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS coordination_consumer_recovery_history (
  consume_key    TEXT NOT NULL
    REFERENCES coordination_consumer_receipts(consume_key)
    ON DELETE CASCADE,
  recovery_id    TEXT NOT NULL,
  recovery_order INTEGER NOT NULL CHECK (recovery_order >= 1),
  PRIMARY KEY (consume_key, recovery_id),
  UNIQUE (consume_key, recovery_order)
);

CREATE TABLE IF NOT EXISTS coordination_consumer_quarantine_private (
  consume_key    TEXT PRIMARY KEY
    REFERENCES coordination_consumer_receipts(consume_key)
    ON DELETE CASCADE,
  quarantine_id  TEXT NOT NULL UNIQUE,
  locator        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coordination_consumer_replays (
  consume_key                 TEXT PRIMARY KEY
    REFERENCES coordination_consumer_receipts(consume_key)
    ON DELETE CASCADE,
  quarantine_id               TEXT NOT NULL,
  command_id                  TEXT NOT NULL,
  decision_id                 TEXT NOT NULL,
  principal_id                TEXT NOT NULL,
  state                       TEXT NOT NULL
    CHECK (state IN ('processing', 'committed', 'failed')),
  lease_owner_id              TEXT,
  lease_replay_claim_token    TEXT,
  lease_expires_at            INTEGER,
  commit_id                   TEXT,
  committed_at                INTEGER,
  failure_code                TEXT,
  CHECK (
    (
      lease_owner_id IS NULL
      AND lease_replay_claim_token IS NULL
      AND lease_expires_at IS NULL
    )
    OR (
      lease_owner_id IS NOT NULL
      AND lease_replay_claim_token IS NOT NULL
      AND lease_expires_at IS NOT NULL
      AND lease_expires_at >= 0
    )
  ),
  CHECK (
    committed_at IS NULL OR committed_at >= 0
  )
);

CREATE TABLE IF NOT EXISTS coordination_quarantine_vault (
  consume_key   TEXT PRIMARY KEY
    CHECK (
      length(consume_key) = 81
      AND substr(consume_key, 1, 17) = 'coord-consume-v1-'
    ),
  locator       TEXT NOT NULL UNIQUE
    CHECK (
      length(locator) = 79
      AND substr(locator, 1, 15) = 'coord-vault-v1-'
  ),
  body          BLOB NOT NULL CHECK (typeof(body) = 'blob'),
  body_kind     TEXT NOT NULL CHECK (body_kind IN ('string', 'absent')),
  body_sha256   TEXT NOT NULL CHECK (length(body_sha256) = 64),
  created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coord_consumer_delivery_ack
  ON coordination_consumer_deliveries(consume_key, ack_state);
CREATE INDEX IF NOT EXISTS idx_coord_consumer_quarantine_id
  ON coordination_consumer_quarantine_private(quarantine_id);
CREATE INDEX IF NOT EXISTS idx_coord_consumer_replay_state
  ON coordination_consumer_replays(state, quarantine_id);
CREATE INDEX IF NOT EXISTS idx_coord_quarantine_vault_locator
  ON coordination_quarantine_vault(locator);

INSERT OR IGNORE INTO schema_migrations(id, applied_at)
VALUES (
  '002_coordination_consumer',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
