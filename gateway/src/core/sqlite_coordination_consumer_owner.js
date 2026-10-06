import {
  coordinationConsumerRuntimeError,
} from "./coordination_consumer_runtime_error.js";

const OWNER_MIGRATION_ID = "004_coordination_consumer_runtime_owner";
const OWNER_TABLE = "coordination_consumer_runtime_owners";
const MAX_GENERATION = Number.MAX_SAFE_INTEGER;
const SAFE_SCOPE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const committedCandidates = new WeakMap();

const EXPECTED_SCHEMA_SQL = normalizeSql(`
  CREATE TABLE coordination_consumer_runtime_owners (
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
  )
`);

function ownerError(code, message) {
  return coordinationConsumerRuntimeError(code, message);
}

function unavailable() {
  return ownerError(
    "COORDINATION_CONSUMER_RUNTIME_STORE_UNAVAILABLE",
    "coordination consumer runtime store ownership is unavailable",
  );
}

function invalidStore() {
  return ownerError(
    "COORDINATION_CONSUMER_RUNTIME_STORE_INVALID",
    "coordination consumer runtime store ownership schema is invalid",
  );
}

function exhaustedStore() {
  return ownerError(
    "COORDINATION_CONSUMER_RUNTIME_STORE_EXHAUSTED",
    "coordination consumer runtime store ownership generation is exhausted",
  );
}

function normalizeSql(sql) {
  return String(sql)
    .replace(/\s+/g, " ")
    .replace(/\s*([(),=])\s*/g, "$1")
    .trim()
    .toLowerCase();
}

function exactOwnKeys(value, expected) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false;
  }
  const keys = Reflect.ownKeys(value);
  return (
    keys.length === expected.length
    && keys.every((key, index) => key === expected[index])
    && expected.every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor && Object.hasOwn(descriptor, "value");
    })
  );
}

function exactOwnerRow(row, scopeId, state) {
  // MUTATION_GUARD: returned-owner-row-validation
  return (
    exactOwnKeys(row, ["scope_id", "generation", "owner_state"])
    && row.scope_id === scopeId
    && Number.isSafeInteger(row.generation)
    && row.generation >= 1
    && row.generation <= MAX_GENERATION
    && row.owner_state === state
  );
}

function assertAutocommit(database) {
  let inTransaction;
  try {
    inTransaction = database.inTransaction;
  } catch {
    throw unavailable();
  }
  if (inTransaction !== false) throw unavailable();
}

function assertScopeId(scopeId) {
  if (typeof scopeId !== "string" || !SAFE_SCOPE.test(scopeId)) {
    throw new TypeError("scopeId must be a safe identifier");
  }
}

function exactColumnManifest(rows) {
  return (
    Array.isArray(rows)
    && rows.length === 3
    && rows.every((row) => row.hidden === 0)
    && rows[0]?.name === "scope_id"
    && rows[0]?.type === "TEXT"
    && rows[0]?.notnull === 1
    && rows[0]?.pk === 1
    && rows[1]?.name === "generation"
    && rows[1]?.type === "INTEGER"
    && rows[1]?.notnull === 1
    && rows[1]?.pk === 0
    && rows[2]?.name === "owner_state"
    && rows[2]?.type === "TEXT"
    && rows[2]?.notnull === 1
    && rows[2]?.pk === 0
  );
}

function assertExactOwnerSchema(database) {
  try {
    // MUTATION_GUARD: owner-migration-check-main
    const migration = database.prepare(
      "SELECT id FROM main.schema_migrations WHERE id = ?",
    ).get(OWNER_MIGRATION_ID);
    // MUTATION_GUARD: owner-schema-manifest-main
    const schema = database.prepare(
      "SELECT type, name, tbl_name, sql "
      + "FROM main.sqlite_schema WHERE type = 'table' AND name = ?",
    ).get(OWNER_TABLE);
    const columns = database.pragma(
      `main.table_xinfo('${OWNER_TABLE}')`,
    );
    const indexes = database.pragma(
      `main.index_list('${OWNER_TABLE}')`,
    );
    const triggers = database.prepare(
      "SELECT name FROM main.sqlite_schema "
      + "WHERE type = 'trigger' AND tbl_name = ?",
    ).all(OWNER_TABLE);

    // MUTATION_GUARD: exact-owner-schema-admission
    if (
      !exactOwnKeys(migration, ["id"])
      || migration.id !== OWNER_MIGRATION_ID
      || !schema
      || schema.type !== "table"
      || schema.name !== OWNER_TABLE
      || schema.tbl_name !== OWNER_TABLE
      || normalizeSql(schema.sql) !== EXPECTED_SCHEMA_SQL
      || !exactColumnManifest(columns)
      || indexes.length !== 1
      || indexes[0]?.unique !== 1
      || indexes[0]?.origin !== "pk"
      || indexes[0]?.partial !== 0
      || triggers.length !== 0
    ) {
      throw invalidStore();
    }
    const indexName = indexes[0].name;
    if (
      typeof indexName !== "string"
      || !/^sqlite_autoindex_[A-Za-z0-9_]+_[0-9]+$/.test(indexName)
    ) {
      throw invalidStore();
    }
    const indexColumns = database.pragma(
      `main.index_info('${indexName}')`,
    );
    // MUTATION_GUARD: owner-scope-uniqueness
    if (
      indexColumns.length !== 1
      || indexColumns[0]?.seqno !== 0
      || indexColumns[0]?.cid !== 0
      || indexColumns[0]?.name !== "scope_id"
    ) {
      throw invalidStore();
    }
  } catch (error) {
    if (error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_INVALID") {
      throw error;
    }
    throw invalidStore();
  }
}

class CommittedOwnerTransaction {
  #database;

  constructor(database) {
    this.#database = database;
  }

  execute(callback) {
    let candidate;
    const transaction = this.#database.transaction(() => {
      candidate = callback();
    });
    transaction.immediate();
    const witness = Object.freeze({});
    // MUTATION_GUARD: committed-owner-transaction-witness
    committedCandidates.set(witness, candidate);
    return witness;
  }
}

function unwrapCommittedCandidate(witness) {
  // MUTATION_GUARD: committed-owner-witness-admission
  if (!committedCandidates.has(witness)) throw unavailable();
  return committedCandidates.get(witness);
}

function claimCandidate(database, scopeId) {
  // MUTATION_GUARD: owner-claim-dml-main
  const returned = database.prepare(
    `INSERT INTO main.${OWNER_TABLE} (
       scope_id,
       generation,
       owner_state
     ) VALUES (?, 1, 'owned')
     ON CONFLICT DO UPDATE SET
       generation = ${OWNER_TABLE}.generation + 1,
       owner_state = 'owned'
     WHERE
       ${OWNER_TABLE}.owner_state = 'released'
       AND ${OWNER_TABLE}.generation < 9007199254740991
     RETURNING scope_id, generation, owner_state`,
  ).get(scopeId);
  if (returned !== undefined) {
    return Object.freeze({
      operation: "claim",
      source: "returned",
      scopeId,
      row: returned,
    });
  }
  const observed = database.prepare(
    `SELECT scope_id, generation, owner_state
     FROM main.${OWNER_TABLE}
     WHERE scope_id = ?`,
  ).get(scopeId);
  return Object.freeze({
    operation: "claim",
    source: "observed",
    scopeId,
    row: observed,
  });
}

function releaseCandidate(database, scopeId, generation) {
  // MUTATION_GUARD: owner-release-exact-generation
  // MUTATION_GUARD: owner-release-requires-owned
  const returned = database.prepare(
    `UPDATE main.${OWNER_TABLE}
     SET owner_state = 'released'
     WHERE
       scope_id = ?
       AND generation = ?
       AND owner_state = 'owned'
     RETURNING scope_id, generation, owner_state`,
  ).get(scopeId, generation);
  return Object.freeze({
    operation: "release",
    scopeId,
    generation,
    row: returned,
  });
}

function admitClaimCandidate(candidate) {
  if (
    !exactOwnKeys(candidate, ["operation", "source", "scopeId", "row"])
    || candidate.operation !== "claim"
    || !SAFE_SCOPE.test(candidate.scopeId)
    || !["returned", "observed"].includes(candidate.source)
  ) {
    throw unavailable();
  }
  if (candidate.source === "returned") {
    // MUTATION_GUARD: returned-claim-row-validation
    if (!exactOwnerRow(candidate.row, candidate.scopeId, "owned")) {
      throw unavailable();
    }
    return Object.freeze({
      status: "claimed",
      generation: candidate.row.generation,
    });
  }
  // MUTATION_GUARD: owned-requires-observed-active-row
  if (exactOwnerRow(candidate.row, candidate.scopeId, "owned")) {
    return Object.freeze({ status: "owned" });
  }
  if (
    exactOwnerRow(candidate.row, candidate.scopeId, "released")
    && candidate.row.generation === MAX_GENERATION
  ) {
    // MUTATION_GUARD: generation-exhaustion
    throw exhaustedStore();
  }
  throw unavailable();
}

function admitReleaseCandidate(candidate) {
  if (
    !exactOwnKeys(candidate, ["operation", "scopeId", "generation", "row"])
    || candidate.operation !== "release"
    || !SAFE_SCOPE.test(candidate.scopeId)
    || !Number.isSafeInteger(candidate.generation)
    || candidate.generation < 1
    || candidate.generation > MAX_GENERATION
  ) {
    throw unavailable();
  }
  if (candidate.row === undefined) {
    return Object.freeze({ status: "not_owned" });
  }
  // MUTATION_GUARD: returned-release-row-validation
  if (
    !exactOwnerRow(candidate.row, candidate.scopeId, "released")
    || candidate.row.generation !== candidate.generation
  ) {
    throw unavailable();
  }
  return Object.freeze({ status: "released" });
}

function injectFault(database, candidate, fault) {
  if (fault === "post-autocommit-open") {
    database.exec("BEGIN IMMEDIATE");
    return candidate;
  }
  if (fault === "claim-malformed-row") {
    return Object.freeze({
      operation: "claim",
      source: "returned",
      scopeId: candidate.scopeId,
      row: { scope_id: candidate.scopeId },
    });
  }
  if (fault === "claim-changes-result") {
    return Object.freeze({ changes: 1 });
  }
  if (fault === "release-malformed-row") {
    return Object.freeze({
      operation: "release",
      scopeId: candidate.scopeId,
      generation: candidate.generation,
      row: { changes: 1 },
    });
  }
  return candidate;
}

export function createSqliteCoordinationConsumerOwner(database) {
  assertExactOwnerSchema(database);
  const committed = new CommittedOwnerTransaction(database);

  function claim(scopeId, { fault } = {}) {
    assertScopeId(scopeId);
    try {
      // MUTATION_GUARD: claim-ambient-transaction-preguard
      assertAutocommit(database);
      const witness = committed.execute(() => claimCandidate(database, scopeId));
      const candidate = injectFault(
        database,
        unwrapCommittedCandidate(witness),
        fault,
      );
      // MUTATION_GUARD: claim-post-autocommit-guard
      assertAutocommit(database);
      return admitClaimCandidate(candidate);
    } catch (error) {
      if (
        error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_EXHAUSTED"
        || error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_UNAVAILABLE"
      ) {
        throw error;
      }
      throw unavailable();
    }
  }

  function release(scopeId, generation, { fault } = {}) {
    assertScopeId(scopeId);
    if (
      !Number.isSafeInteger(generation)
      || generation < 1
      || generation > MAX_GENERATION
    ) {
      throw new TypeError("generation must be a positive safe integer");
    }
    try {
      // MUTATION_GUARD: release-ambient-transaction-preguard
      assertAutocommit(database);
      const witness = committed.execute(
        () => releaseCandidate(database, scopeId, generation),
      );
      const candidate = injectFault(
        database,
        unwrapCommittedCandidate(witness),
        fault,
      );
      // MUTATION_GUARD: release-post-autocommit-guard
      assertAutocommit(database);
      return admitReleaseCandidate(candidate);
    } catch (error) {
      if (error?.code === "COORDINATION_CONSUMER_RUNTIME_STORE_UNAVAILABLE") {
        throw error;
      }
      throw unavailable();
    }
  }

  function injectUnwitnessedCandidate({ operation, candidate } = {}) {
    assertAutocommit(database);
    // This deliberate test seam must traverse the same witness gate.
    const unwitnessed = Object.freeze({});
    if (operation === "claim") {
      return admitClaimCandidate(unwrapCommittedCandidate(unwitnessed));
    }
    if (operation === "release") {
      return admitReleaseCandidate(unwrapCommittedCandidate(unwitnessed));
    }
    void candidate;
    throw unavailable();
  }

  return Object.freeze({
    claim,
    release,
    injectUnwitnessedCandidate,
  });
}
