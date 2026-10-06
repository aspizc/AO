PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS coordination_consumer_ack_intents (
  consume_key       TEXT NOT NULL
    CHECK (
      typeof(consume_key) = 'text'
      AND length(consume_key) = 81
      AND substr(consume_key, 1, 17) = 'coord-consume-v1-'
    ),
  delivery_id       TEXT NOT NULL
    CHECK (
      typeof(delivery_id) = 'text'
      AND length(delivery_id) BETWEEN 3 AND 128
    ),
  state             TEXT NOT NULL
    CHECK (
      typeof(state) = 'text'
      AND state IN (
        'pending',
        'claimed',
        'deferred',
        'committed',
        'recovery_required'
      )
    ),
  due_at            INTEGER
    CHECK (
      due_at IS NULL
      OR (
        typeof(due_at) = 'integer'
        AND due_at BETWEEN 0 AND 9007199254740991
      )
    ),
  claim_epoch       INTEGER NOT NULL DEFAULT 0
    CHECK (
      typeof(claim_epoch) = 'integer'
      AND claim_epoch BETWEEN 0 AND 9007199254740991
    ),
  claim_family      TEXT
    CHECK (
      claim_family IS NULL
      OR (
        typeof(claim_family) = 'text'
        AND claim_family IN ('direct', 'reconciliation')
      )
    ),
  claim_owner_id    TEXT
    CHECK (
      claim_owner_id IS NULL
      OR (
        typeof(claim_owner_id) = 'text'
        AND length(claim_owner_id) BETWEEN 1 AND 256
      )
    ),
  claim_token       TEXT
    CHECK (
      claim_token IS NULL
      OR (
        typeof(claim_token) = 'text'
        AND length(claim_token) BETWEEN 1 AND 256
      )
    ),
  claim_expires_at  INTEGER
    CHECK (
      claim_expires_at IS NULL
      OR (
        typeof(claim_expires_at) = 'integer'
        AND claim_expires_at BETWEEN 0 AND 9007199254740991
      )
    ),
  eligible_at       INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN state = 'claimed' THEN claim_expires_at
      ELSE due_at
    END
  ) VIRTUAL
    CHECK (
      eligible_at IS NULL
      OR (
        typeof(eligible_at) = 'integer'
        AND eligible_at BETWEEN 0 AND 9007199254740991
      )
    ),
  proof             TEXT
    CHECK (
      proof IS NULL
      OR (
        typeof(proof) = 'text'
        AND proof IN ('DIRECT_ACK', 'ACK_TOMBSTONE', 'ORPHAN_ACK')
      )
    ),
  reason_code       TEXT
    CHECK (
      reason_code IS NULL
      OR (
        typeof(reason_code) = 'text'
        AND reason_code IN (
          'ACK_CONTRACT_INVALID',
          'ACK_TRANSPORT_FAILED',
          'OLD_PARTICIPANT_PRESENT',
          'TRANSPORT_UNAVAILABLE',
          'TRANSPORT_STATE_UNKNOWN'
        )
      )
    ),
  committed_at      INTEGER
    CHECK (
      committed_at IS NULL
      OR (
        typeof(committed_at) = 'integer'
        AND committed_at BETWEEN 0 AND 9007199254740991
      )
    ),
  created_at        INTEGER NOT NULL
    CHECK (
      typeof(created_at) = 'integer'
      AND created_at BETWEEN 0 AND 9007199254740991
    ),
  updated_at        INTEGER NOT NULL
    CHECK (
      typeof(updated_at) = 'integer'
      AND updated_at BETWEEN 0 AND 9007199254740991
    ),
  PRIMARY KEY (consume_key, delivery_id),
  FOREIGN KEY (consume_key, delivery_id)
    REFERENCES coordination_consumer_deliveries(consume_key, delivery_id)
    ON DELETE CASCADE,
  CHECK (
    (
      state = 'pending'
      AND due_at IS NOT NULL
      AND claim_family IS NULL
      AND claim_owner_id IS NULL
      AND claim_token IS NULL
      AND claim_expires_at IS NULL
      AND proof IS NULL
      AND reason_code IS NULL
      AND committed_at IS NULL
    )
    OR (
      state = 'claimed'
      AND due_at IS NOT NULL
      AND claim_family IS NOT NULL
      AND claim_owner_id IS NOT NULL
      AND claim_token IS NOT NULL
      AND claim_expires_at IS NOT NULL
      AND proof IS NULL
      AND reason_code IS NULL
      AND committed_at IS NULL
    )
    OR (
      state = 'deferred'
      AND due_at IS NOT NULL
      AND claim_family IS NULL
      AND claim_owner_id IS NULL
      AND claim_token IS NULL
      AND claim_expires_at IS NULL
      AND proof IS NULL
      AND reason_code IN (
        'ACK_CONTRACT_INVALID',
        'ACK_TRANSPORT_FAILED',
        'OLD_PARTICIPANT_PRESENT',
        'TRANSPORT_UNAVAILABLE'
      )
      AND committed_at IS NULL
    )
    OR (
      state = 'committed'
      AND due_at IS NULL
      AND claim_family IS NOT NULL
      AND claim_owner_id IS NOT NULL
      AND claim_token IS NOT NULL
      AND claim_expires_at IS NULL
      AND proof IS NOT NULL
      AND (
        (
          claim_family = 'direct'
          AND proof = 'DIRECT_ACK'
        )
        OR (
          claim_family = 'reconciliation'
          AND proof IN ('ACK_TOMBSTONE', 'ORPHAN_ACK')
        )
      )
      AND reason_code IS NULL
      AND committed_at IS NOT NULL
    )
    OR (
      state = 'recovery_required'
      AND due_at IS NULL
      AND (
        (
          claim_family IS NULL
          AND claim_owner_id IS NULL
          AND claim_token IS NULL
        )
        OR (
          claim_family IS NOT NULL
          AND claim_owner_id IS NOT NULL
          AND claim_token IS NOT NULL
        )
      )
      AND claim_expires_at IS NULL
      AND proof IS NULL
      AND reason_code = 'TRANSPORT_STATE_UNKNOWN'
      AND committed_at IS NULL
    )
  )
);

INSERT OR IGNORE INTO coordination_consumer_ack_intents (
  consume_key,
  delivery_id,
  state,
  due_at,
  claim_epoch,
  claim_family,
  claim_owner_id,
  claim_token,
  claim_expires_at,
  proof,
  reason_code,
  committed_at,
  created_at,
  updated_at
)
SELECT
  delivery.consume_key,
  delivery.delivery_id,
  'pending',
  receipt.updated_at,
  0,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  receipt.updated_at,
  receipt.updated_at
FROM coordination_consumer_deliveries AS delivery
JOIN coordination_consumer_receipts AS receipt
  ON receipt.consume_key = delivery.consume_key
WHERE delivery.ack_state = 'acknowledging';

CREATE INDEX IF NOT EXISTS idx_coord_consumer_ack_outbox_open_cursor
  ON coordination_consumer_ack_intents (
    consume_key,
    delivery_id,
    due_at,
    claim_expires_at
  )
  WHERE state IN ('pending', 'claimed', 'deferred');

CREATE INDEX IF NOT EXISTS idx_coord_consumer_ack_outbox_due_cursor
  ON coordination_consumer_ack_intents (
    eligible_at,
    consume_key,
    delivery_id
  )
  WHERE state IN ('pending', 'claimed', 'deferred');

CREATE INDEX IF NOT EXISTS idx_coord_consumer_ack_outbox_summary
  ON coordination_consumer_ack_intents(state, proof);

INSERT OR IGNORE INTO schema_migrations(id, applied_at)
VALUES (
  '003_coordination_ack_outbox',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
