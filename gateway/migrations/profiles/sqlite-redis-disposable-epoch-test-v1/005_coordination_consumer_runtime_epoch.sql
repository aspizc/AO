CREATE TABLE main.coordination_consumer_runtime_epoch_store (
  singleton INTEGER NOT NULL PRIMARY KEY
    CHECK (typeof(singleton) = 'integer' AND singleton = 1),
  protocol_version INTEGER NOT NULL
    CHECK (typeof(protocol_version) = 'integer' AND protocol_version = 1),
  redis_authority_id TEXT NOT NULL
    CHECK (
      typeof(redis_authority_id) = 'text'
      AND length(redis_authority_id) BETWEEN 1 AND 128
      AND redis_authority_id GLOB '[A-Za-z0-9]*'
      AND redis_authority_id NOT GLOB '*[^A-Za-z0-9._:-]*'
    ),
  redis_namespace_id TEXT NOT NULL
    CHECK (
      typeof(redis_namespace_id) = 'text'
      AND length(redis_namespace_id) BETWEEN 1 AND 128
      AND redis_namespace_id GLOB '[A-Za-z0-9]*'
      AND redis_namespace_id NOT GLOB '*[^A-Za-z0-9._:-]*'
    ),
  redis_binding_ordinal INTEGER NOT NULL
    CHECK (
      typeof(redis_binding_ordinal) = 'integer'
      AND redis_binding_ordinal BETWEEN 1 AND 9007199254740991
    ),
  allocation_state TEXT NOT NULL
    CHECK (
      typeof(allocation_state) = 'text'
      AND allocation_state = 'bound'
    ),
  UNIQUE (
    redis_authority_id,
    redis_namespace_id,
    redis_binding_ordinal
  )
);

CREATE TABLE main.coordination_consumer_runtime_epoch_fences (
  scope_id TEXT NOT NULL PRIMARY KEY
    CHECK (
      typeof(scope_id) = 'text'
      AND length(scope_id) BETWEEN 1 AND 128
      AND scope_id GLOB '[A-Za-z0-9]*'
      AND scope_id NOT GLOB '*[^A-Za-z0-9._:-]*'
    ),
  generation INTEGER NOT NULL
    CHECK (
      typeof(generation) = 'integer'
      AND generation BETWEEN 1 AND 9007199254740991
    ),
  phase TEXT NOT NULL
    CHECK (
      typeof(phase) = 'text'
      AND phase IN (
        'initializing',
        'active',
        'fencing',
        'recovering',
        'releasing',
        'released',
        'faulted'
      )
    ),
  lease_expires_at_ms INTEGER
    CHECK (
      lease_expires_at_ms IS NULL
      OR (
        typeof(lease_expires_at_ms) = 'integer'
        AND lease_expires_at_ms BETWEEN 1 AND 9007199254740991
      )
    ),
  pending_generation INTEGER
    CHECK (
      pending_generation IS NULL
      OR (
        typeof(pending_generation) = 'integer'
        AND pending_generation BETWEEN 1 AND 9007199254740991
      )
    ),
  participant_id TEXT
    CHECK (
      participant_id IS NULL
      OR (
        typeof(participant_id) = 'text'
        AND length(participant_id) BETWEEN 1 AND 128
        AND participant_id GLOB '[A-Za-z0-9]*'
        AND participant_id NOT GLOB '*[^A-Za-z0-9._:-]*'
      )
    ),
  previous_participant_id TEXT
    CHECK (
      previous_participant_id IS NULL
      OR (
        typeof(previous_participant_id) = 'text'
        AND length(previous_participant_id) BETWEEN 1 AND 128
        AND previous_participant_id GLOB '[A-Za-z0-9]*'
        AND previous_participant_id NOT GLOB '*[^A-Za-z0-9._:-]*'
      )
    ),
  recovery_term INTEGER NOT NULL
    CHECK (
      typeof(recovery_term) = 'integer'
      AND recovery_term BETWEEN 1 AND 9007199254740991
    ),
  recovery_controller_state TEXT NOT NULL
    CHECK (
      typeof(recovery_controller_state) = 'text'
      AND recovery_controller_state IN ('none', 'installing', 'installed')
    ),
  recovery_controller_participant_id TEXT
    CHECK (
      recovery_controller_participant_id IS NULL
      OR (
        typeof(recovery_controller_participant_id) = 'text'
        AND length(recovery_controller_participant_id) BETWEEN 1 AND 128
        AND recovery_controller_participant_id GLOB '[A-Za-z0-9]*'
        AND recovery_controller_participant_id
          NOT GLOB '*[^A-Za-z0-9._:-]*'
      )
    ),
  fault_code TEXT
    CHECK (
      fault_code IS NULL
      OR (
        typeof(fault_code) = 'text'
        AND length(fault_code) BETWEEN 1 AND 128
        AND fault_code GLOB '[A-Za-z0-9]*'
        AND fault_code NOT GLOB '*[^A-Za-z0-9._:-]*'
      )
    ),
  FOREIGN KEY (scope_id)
    REFERENCES coordination_consumer_runtime_owners(scope_id)
    ON DELETE RESTRICT,
  CHECK (
    (
      phase = 'initializing'
      AND generation = 1
      AND lease_expires_at_ms IS NOT NULL
      AND pending_generation IS NULL
      AND participant_id IS NOT NULL
      AND previous_participant_id IS NULL
      AND recovery_controller_state = 'installing'
      AND recovery_controller_participant_id = participant_id
      AND fault_code IS NULL
    )
    OR (
      phase = 'active'
      AND lease_expires_at_ms IS NOT NULL
      AND pending_generation IS NULL
      AND participant_id IS NOT NULL
      AND previous_participant_id IS NULL
      AND recovery_controller_state = 'none'
      AND recovery_controller_participant_id IS NULL
      AND fault_code IS NULL
    )
    OR (
      phase = 'fencing'
      AND lease_expires_at_ms IS NULL
      AND generation < 9007199254740991
      AND pending_generation = generation + 1
      AND participant_id IS NULL
      AND recovery_controller_state = 'none'
      AND recovery_controller_participant_id IS NULL
      AND fault_code IS NULL
    )
    OR (
      phase = 'recovering'
      AND lease_expires_at_ms IS NOT NULL
      AND pending_generation IS NULL
      AND participant_id IS NOT NULL
      AND previous_participant_id IS NULL
      AND recovery_controller_state IN ('installing', 'installed')
      AND recovery_controller_participant_id = participant_id
      AND fault_code IS NULL
    )
    OR (
      phase = 'releasing'
      AND lease_expires_at_ms IS NULL
      AND pending_generation IS NULL
      AND participant_id IS NOT NULL
      AND previous_participant_id IS NULL
      AND recovery_controller_state = 'none'
      AND recovery_controller_participant_id IS NULL
      AND fault_code IS NULL
    )
    OR (
      phase = 'released'
      AND lease_expires_at_ms IS NULL
      AND pending_generation IS NULL
      AND participant_id IS NULL
      AND previous_participant_id IS NULL
      AND recovery_controller_state = 'none'
      AND recovery_controller_participant_id IS NULL
      AND fault_code IS NULL
    )
    OR (
      phase = 'faulted'
      AND lease_expires_at_ms IS NULL
      AND pending_generation IS NULL
      AND participant_id IS NULL
      AND previous_participant_id IS NULL
      AND recovery_controller_state = 'none'
      AND recovery_controller_participant_id IS NULL
      AND fault_code IS NOT NULL
    )
  )
);

CREATE TABLE main.coordination_consumer_runtime_recovery_sources (
  scope_id TEXT NOT NULL
    CHECK (
      typeof(scope_id) = 'text'
      AND length(scope_id) BETWEEN 1 AND 128
      AND scope_id GLOB '[A-Za-z0-9]*'
      AND scope_id NOT GLOB '*[^A-Za-z0-9._:-]*'
    ),
  source_participant_id TEXT NOT NULL
    CHECK (
      typeof(source_participant_id) = 'text'
      AND length(source_participant_id) BETWEEN 1 AND 128
      AND source_participant_id GLOB '[A-Za-z0-9]*'
      AND source_participant_id NOT GLOB '*[^A-Za-z0-9._:-]*'
    ),
  first_source_generation INTEGER NOT NULL
    CHECK (
      typeof(first_source_generation) = 'integer'
      AND first_source_generation BETWEEN 1 AND 9007199254740991
    ),
  added_recovery_term INTEGER NOT NULL
    CHECK (
      typeof(added_recovery_term) = 'integer'
      AND added_recovery_term BETWEEN 1 AND 9007199254740991
    ),
  state TEXT NOT NULL
    CHECK (
      typeof(state) = 'text'
      AND state IN ('open', 'drained', 'recovery_required')
    ),
  reason_code TEXT
    CHECK (
      reason_code IS NULL
      OR (
        typeof(reason_code) = 'text'
        AND reason_code IN (
          'TRANSPORT_STATE_UNKNOWN',
          'SOURCE_GUARD_INVALID',
          'SOURCE_GROUP_INVALID'
        )
      )
    ),
  drained_generation INTEGER
    CHECK (
      drained_generation IS NULL
      OR (
        typeof(drained_generation) = 'integer'
        AND drained_generation BETWEEN 1 AND 9007199254740991
      )
    ),
  drained_recovery_term INTEGER
    CHECK (
      drained_recovery_term IS NULL
      OR (
        typeof(drained_recovery_term) = 'integer'
        AND drained_recovery_term BETWEEN 1 AND 9007199254740991
      )
    ),
  created_at INTEGER NOT NULL
    CHECK (
      typeof(created_at) = 'integer'
      AND created_at BETWEEN 0 AND 9007199254740991
    ),
  updated_at INTEGER NOT NULL
    CHECK (
      typeof(updated_at) = 'integer'
      AND updated_at BETWEEN 0 AND 9007199254740991
      AND updated_at >= created_at
    ),
  PRIMARY KEY (scope_id, source_participant_id),
  FOREIGN KEY (scope_id)
    REFERENCES coordination_consumer_runtime_epoch_fences(scope_id)
    ON DELETE RESTRICT,
  CHECK (
    (
      state = 'open'
      AND reason_code IS NULL
      AND drained_generation IS NULL
      AND drained_recovery_term IS NULL
    )
    OR (
      state = 'drained'
      AND reason_code IS NULL
      AND drained_generation IS NOT NULL
      AND drained_recovery_term IS NOT NULL
    )
    OR (
      state = 'recovery_required'
      AND reason_code IS NOT NULL
      AND drained_generation IS NULL
      AND drained_recovery_term IS NULL
    )
  )
);

CREATE TABLE main.coordination_consumer_runtime_release_completions (
  scope_id TEXT NOT NULL
    CHECK (
      typeof(scope_id) = 'text'
      AND length(scope_id) BETWEEN 1 AND 128
      AND scope_id GLOB '[A-Za-z0-9]*'
      AND scope_id NOT GLOB '*[^A-Za-z0-9._:-]*'
    ),
  generation INTEGER NOT NULL
    CHECK (
      typeof(generation) = 'integer'
      AND generation BETWEEN 1 AND 9007199254740991
    ),
  recovery_term INTEGER NOT NULL
    CHECK (
      typeof(recovery_term) = 'integer'
      AND recovery_term BETWEEN 1 AND 9007199254740991
    ),
  source_participant_id TEXT NOT NULL
    CHECK (
      typeof(source_participant_id) = 'text'
      AND length(source_participant_id) BETWEEN 1 AND 128
      AND source_participant_id GLOB '[A-Za-z0-9]*'
      AND source_participant_id NOT GLOB '*[^A-Za-z0-9._:-]*'
    ),
  completion_id TEXT NOT NULL
    CHECK (
      typeof(completion_id) = 'text'
      AND length(completion_id) = 64
      AND completion_id NOT GLOB '*[^0-9a-f]*'
    ),
  state TEXT NOT NULL
    CHECK (
      typeof(state) = 'text'
      AND state IN ('redis_pending', 'confirmed', 'recovery_required')
    ),
  reason_code TEXT
    CHECK (
      reason_code IS NULL
      OR (
        typeof(reason_code) = 'text'
        AND reason_code IN (
          'TRANSPORT_STATE_UNKNOWN',
          'RELEASE_COORDINATE_MISMATCH'
        )
      )
    ),
  created_at INTEGER NOT NULL
    CHECK (
      typeof(created_at) = 'integer'
      AND created_at BETWEEN 0 AND 9007199254740991
    ),
  confirmed_at INTEGER
    CHECK (
      confirmed_at IS NULL
      OR (
        typeof(confirmed_at) = 'integer'
        AND confirmed_at BETWEEN 0 AND 9007199254740991
      )
    ),
  PRIMARY KEY (scope_id, generation),
  UNIQUE (completion_id),
  FOREIGN KEY (scope_id)
    REFERENCES coordination_consumer_runtime_epoch_fences(scope_id)
    ON DELETE RESTRICT,
  CHECK (
    (
      state = 'redis_pending'
      AND reason_code IS NULL
      AND confirmed_at IS NULL
    )
    OR (
      state = 'confirmed'
      AND reason_code IS NULL
      AND confirmed_at IS NOT NULL
      AND confirmed_at >= created_at
    )
    OR (
      state = 'recovery_required'
      AND reason_code IS NOT NULL
      AND confirmed_at IS NULL
    )
  )
);

ALTER TABLE main.coordination_consumer_receipts
  ADD COLUMN epoch_generation INTEGER
  CHECK (
    epoch_generation IS NULL
    OR (
      typeof(epoch_generation) = 'integer'
      AND epoch_generation BETWEEN 1 AND 9007199254740991
    )
  );
ALTER TABLE main.coordination_consumer_receipts
  ADD COLUMN recovery_term INTEGER
  CHECK (
    recovery_term IS NULL
    OR (
      typeof(recovery_term) = 'integer'
      AND recovery_term BETWEEN 1 AND 9007199254740991
    )
  );
ALTER TABLE main.coordination_consumer_receipts
  ADD COLUMN epoch_authority_kind TEXT
  CHECK (
    epoch_authority_kind IS NULL
    OR (
      typeof(epoch_authority_kind) = 'text'
      AND epoch_authority_kind IN ('active', 'recovery')
    )
  );
ALTER TABLE main.coordination_consumer_receipts
  ADD COLUMN epoch_participant_id TEXT
  CHECK (
    epoch_participant_id IS NULL
    OR (
      typeof(epoch_participant_id) = 'text'
      AND length(epoch_participant_id) BETWEEN 1 AND 128
      AND epoch_participant_id GLOB '[A-Za-z0-9]*'
      AND epoch_participant_id NOT GLOB '*[^A-Za-z0-9._:-]*'
    )
  );
ALTER TABLE main.coordination_consumer_receipts
  ADD COLUMN recovery_controller_participant_id TEXT
  CHECK (
    (
      epoch_generation IS NULL
      AND recovery_term IS NULL
      AND epoch_authority_kind IS NULL
      AND epoch_participant_id IS NULL
      AND recovery_controller_participant_id IS NULL
    )
    OR (
      epoch_generation IS NOT NULL
      AND recovery_term IS NOT NULL
      AND epoch_authority_kind = 'active'
      AND epoch_participant_id IS NOT NULL
      AND recovery_controller_participant_id IS NULL
    )
    OR (
      epoch_generation IS NOT NULL
      AND recovery_term IS NOT NULL
      AND epoch_authority_kind = 'recovery'
      AND epoch_participant_id IS NOT NULL
      AND recovery_controller_participant_id = epoch_participant_id
    )
  );

ALTER TABLE main.coordination_consumer_ack_intents
  ADD COLUMN epoch_generation INTEGER
  CHECK (
    epoch_generation IS NULL
    OR (
      typeof(epoch_generation) = 'integer'
      AND epoch_generation BETWEEN 1 AND 9007199254740991
    )
  );
ALTER TABLE main.coordination_consumer_ack_intents
  ADD COLUMN recovery_term INTEGER
  CHECK (
    recovery_term IS NULL
    OR (
      typeof(recovery_term) = 'integer'
      AND recovery_term BETWEEN 1 AND 9007199254740991
    )
  );
ALTER TABLE main.coordination_consumer_ack_intents
  ADD COLUMN epoch_authority_kind TEXT
  CHECK (
    epoch_authority_kind IS NULL
    OR (
      typeof(epoch_authority_kind) = 'text'
      AND epoch_authority_kind IN ('active', 'recovery')
    )
  );
ALTER TABLE main.coordination_consumer_ack_intents
  ADD COLUMN epoch_participant_id TEXT
  CHECK (
    epoch_participant_id IS NULL
    OR (
      typeof(epoch_participant_id) = 'text'
      AND length(epoch_participant_id) BETWEEN 1 AND 128
      AND epoch_participant_id GLOB '[A-Za-z0-9]*'
      AND epoch_participant_id NOT GLOB '*[^A-Za-z0-9._:-]*'
    )
  );
ALTER TABLE main.coordination_consumer_ack_intents
  ADD COLUMN recovery_controller_participant_id TEXT
  CHECK (
    (
      epoch_generation IS NULL
      AND recovery_term IS NULL
      AND epoch_authority_kind IS NULL
      AND epoch_participant_id IS NULL
      AND recovery_controller_participant_id IS NULL
    )
    OR (
      epoch_generation IS NOT NULL
      AND recovery_term IS NOT NULL
      AND epoch_authority_kind = 'active'
      AND epoch_participant_id IS NOT NULL
      AND recovery_controller_participant_id IS NULL
    )
    OR (
      epoch_generation IS NOT NULL
      AND recovery_term IS NOT NULL
      AND epoch_authority_kind = 'recovery'
      AND epoch_participant_id IS NOT NULL
      AND recovery_controller_participant_id = epoch_participant_id
    )
  );
ALTER TABLE main.coordination_consumer_ack_intents
  ADD COLUMN settlement_generation INTEGER
  CHECK (
    settlement_generation IS NULL
    OR (
      typeof(settlement_generation) = 'integer'
      AND settlement_generation BETWEEN 1 AND 9007199254740991
    )
  );
ALTER TABLE main.coordination_consumer_ack_intents
  ADD COLUMN settlement_recovery_term INTEGER
  CHECK (
    settlement_recovery_term IS NULL
    OR (
      typeof(settlement_recovery_term) = 'integer'
      AND settlement_recovery_term BETWEEN 1 AND 9007199254740991
    )
  );
ALTER TABLE main.coordination_consumer_ack_intents
  ADD COLUMN settlement_authority_kind TEXT
  CHECK (
    settlement_authority_kind IS NULL
    OR (
      typeof(settlement_authority_kind) = 'text'
      AND settlement_authority_kind IN ('active', 'recovery')
    )
  );
ALTER TABLE main.coordination_consumer_ack_intents
  ADD COLUMN settlement_participant_id TEXT
  CHECK (
    settlement_participant_id IS NULL
    OR (
      typeof(settlement_participant_id) = 'text'
      AND length(settlement_participant_id) BETWEEN 1 AND 128
      AND settlement_participant_id GLOB '[A-Za-z0-9]*'
      AND settlement_participant_id NOT GLOB '*[^A-Za-z0-9._:-]*'
    )
  );
ALTER TABLE main.coordination_consumer_ack_intents
  ADD COLUMN settlement_recovery_controller_participant_id TEXT
  CHECK (
    (
      settlement_generation IS NULL
      AND settlement_recovery_term IS NULL
      AND settlement_authority_kind IS NULL
      AND settlement_participant_id IS NULL
      AND settlement_recovery_controller_participant_id IS NULL
    )
    OR (
      settlement_generation IS NOT NULL
      AND settlement_recovery_term IS NOT NULL
      AND settlement_authority_kind = 'active'
      AND settlement_participant_id IS NOT NULL
      AND settlement_recovery_controller_participant_id IS NULL
    )
    OR (
      settlement_generation IS NOT NULL
      AND settlement_recovery_term IS NOT NULL
      AND settlement_authority_kind = 'recovery'
      AND settlement_participant_id IS NOT NULL
      AND settlement_recovery_controller_participant_id
        = settlement_participant_id
    )
  );

CREATE INDEX main.idx_coord_consumer_runtime_epoch_fences_phase
  ON coordination_consumer_runtime_epoch_fences (
    phase,
    lease_expires_at_ms,
    scope_id
  );
CREATE INDEX main.idx_coord_consumer_runtime_recovery_sources_state
  ON coordination_consumer_runtime_recovery_sources (
    scope_id,
    state,
    source_participant_id
  );
CREATE INDEX main.idx_coord_consumer_runtime_release_completions_state
  ON coordination_consumer_runtime_release_completions (
    state,
    scope_id,
    generation
  );
CREATE INDEX main.idx_coord_consumer_receipts_epoch_authority
  ON coordination_consumer_receipts (
    epoch_generation,
    recovery_term,
    epoch_authority_kind,
    epoch_participant_id,
    recovery_controller_participant_id
  )
  WHERE epoch_generation IS NOT NULL;
CREATE INDEX main.idx_coord_consumer_ack_intents_epoch_authority
  ON coordination_consumer_ack_intents (
    epoch_generation,
    recovery_term,
    epoch_authority_kind,
    epoch_participant_id,
    recovery_controller_participant_id
  )
  WHERE epoch_generation IS NOT NULL;
CREATE INDEX main.idx_coord_consumer_ack_intents_settlement_authority
  ON coordination_consumer_ack_intents (
    settlement_generation,
    settlement_recovery_term,
    settlement_authority_kind,
    settlement_participant_id,
    settlement_recovery_controller_participant_id
  )
  WHERE settlement_generation IS NOT NULL;

INSERT OR IGNORE INTO main.schema_migrations(id, applied_at)
VALUES (
  '005_coordination_consumer_runtime_epoch',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
