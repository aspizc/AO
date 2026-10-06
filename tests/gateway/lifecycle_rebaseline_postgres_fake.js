const MAX_LIFECYCLE_VERSION = Number.MAX_SAFE_INTEGER;

const TABLE_KEYS = Object.freeze({
  orchestration_sessions: "session_id",
  tasks: "task_id",
  sessions: "session_id",
  lifecycle_transitions: "idempotency_key",
});

const LIFECYCLE_STATES = Object.freeze({
  orchestration_sessions: new Set([
    "active",
    "paused",
    "completed",
    "cancelled",
  ]),
  tasks: new Set([
    "pending",
    "starting",
    "running",
    "completed",
    "failed",
    "cancelled",
  ]),
  sessions: new Set(["starting", "running", "closed", "error"]),
});

export function createLifecycleRebaselinePostgresFake() {
  const tables = Object.fromEntries(
    Object.keys(TABLE_KEYS).map((table) => [table, []]),
  );
  const calls = [];
  let reservationRace = null;
  let versionRace = false;

  function executor(sql) {
    const materialized = stripTrailingSemicolon(sql);
    calls.push(materialized);
    const query = unwrapReadQuery(materialized);

    if (/^CREATE TABLE IF NOT EXISTS schema_migrations\b/i.test(query)) {
      return { changes: 0 };
    }
    if (/^SELECT id FROM schema_migrations\b/i.test(query)) {
      return [{ id: "001_initial" }, { id: "002_lifecycle" }];
    }
    if (/^INSERT INTO schema_migrations\b/i.test(query)) {
      return { changes: 1 };
    }
    if (/^INSERT INTO\b/i.test(query)) {
      return insertRow(tables, query);
    }
    if (/^WITH lifecycle_(changed|created) AS \(/i.test(query)) {
      const parsed = parseLifecycleCte(query);
      if (parsed.kind === "changed" && versionRace) {
        advanceVersionForRace(tables, parsed.stateSql);
        versionRace = false;
      }
      if (parsed.kind === "created" && reservationRace !== null) {
        seedReservationRace(tables, parsed, reservationRace);
        reservationRace = null;
      }
      return applyLifecycleCte(tables, parsed);
    }
    if (/^WITH changed AS \(/i.test(query)) {
      return updateReturningChanges(tables, query);
    }
    if (/^UPDATE\b/i.test(query)) {
      return updateRows(tables, query);
    }
    if (/^SELECT \* FROM\b/i.test(query)) {
      return selectRows(tables, query);
    }

    throw new Error(`lifecycle fake does not handle SQL: ${query}`);
  }

  executor.calls = calls;
  executor.armSessionReservationRace = (mode) => {
    if (mode !== "exact" && mode !== "different") {
      throw new TypeError("reservation race mode must be exact or different");
    }
    reservationRace = mode;
  };
  executor.armLifecycleVersionRace = () => {
    versionRace = true;
  };
  executor.rows = (table) =>
    (tables[table] ?? []).map((row) => ({ ...row }));

  return executor;
}

function unwrapReadQuery(sql) {
  const match = sql.match(
    /^SELECT COALESCE\(json_agg\(row_to_json\(_q\)\), '\[\]'::json\) FROM \(([\s\S]+)\) AS _q$/i,
  );
  if (!match) return sql;

  const nested = match[1].trim();
  if (
    /^WITH\b/i.test(nested) &&
    /\(\s*(?:UPDATE|INSERT|DELETE)\b/i.test(nested)
  ) {
    const error = new Error(
      "data-modifying lifecycle CTE must be a top-level statement",
    );
    error.code = "FAKE_POSTGRES_NESTED_DML_CTE";
    throw error;
  }
  return nested;
}

function parseLifecycleCte(sql) {
  const match = sql.match(
    /^WITH lifecycle_(changed|created) AS \(\s*([\s\S]+?)\s+RETURNING 1\s*\),\s*lifecycle_recorded AS \(\s*INSERT INTO lifecycle_transitions\s*(\([\s\S]+?\))\s*SELECT\s*([\s\S]+?)\s*FROM lifecycle_\1\s+RETURNING 1\s*\)\s*SELECT[\s\S]+$/i,
  );
  if (!match) {
    throw new Error(`unsupported top-level lifecycle CTE: ${sql}`);
  }
  return {
    kind: match[1].toLowerCase(),
    stateSql: match[2].trim(),
    transitionColumns: match[3],
    transitionValues: match[4],
  };
}

function applyLifecycleCte(tables, parsed) {
  const snapshot = cloneTables(tables);

  try {
    const stateResult =
      parsed.kind === "created"
        ? insertRow(tables, parsed.stateSql)
        : updateRows(tables, parsed.stateSql);
    if (stateResult.changes === 1) {
      insertRow(
        tables,
        `INSERT INTO lifecycle_transitions ${parsed.transitionColumns} ` +
          `VALUES (${parsed.transitionValues})`,
      );
    }
  } catch (error) {
    restoreTables(tables, snapshot);
    throw error;
  }

  // Deliberately unrelated to the actual row counts. The repository contract
  // must derive success or conflict from durable transition evidence.
  return { changes: 73 };
}

function seedReservationRace(tables, parsed, mode) {
  const stateRow = rowFromInsert(parsed.stateSql);
  if (stateRow.table !== "sessions") {
    throw new Error("reservation race was armed for a non-session insert");
  }
  commitRow(tables, stateRow.table, stateRow.row);

  if (mode === "exact") {
    const transition = rowFromInsert(
      `INSERT INTO lifecycle_transitions ${parsed.transitionColumns} ` +
        `VALUES (${parsed.transitionValues})`,
    );
    commitRow(tables, transition.table, transition.row);
  }
}

function advanceVersionForRace(tables, updateSql) {
  const match = updateSql.match(
    /^UPDATE\s+(\w+)\s+SET\s+[\s\S]+?\s+WHERE\s+([\s\S]+)$/i,
  );
  if (!match) throw new Error(`unsupported lifecycle race update: ${updateSql}`);
  const [, table, whereSql] = match;
  const row = tables[table].find((candidate) =>
    matchesWhere(candidate, whereSql),
  );
  if (!row) throw new Error("lifecycle version race has no matching row");
  row.lifecycle_version += 1;
  validateLifecycleRow(table, row);
}

function insertRow(tables, sql) {
  const parsed = rowFromInsert(sql);
  commitRow(tables, parsed.table, parsed.row);
  return { changes: 1 };
}

function rowFromInsert(sql) {
  const match = sql.match(
    /^INSERT INTO\s+(\w+)\s*\(([\s\S]+?)\)\s*VALUES\s*\(([\s\S]+)\)$/i,
  );
  if (!match) throw new Error(`unsupported INSERT: ${sql}`);

  const [, table, columnSql, valueSql] = match;
  const columns = columnSql.split(",").map((column) => column.trim());
  const values = splitSqlList(valueSql).map(parseLiteral);
  return {
    table,
    row: Object.fromEntries(
      columns.map((column, index) => [column, values[index]]),
    ),
  };
}

function commitRow(tables, table, input) {
  const row = { ...input };
  applyLifecycleDefaults(table, row);
  validateLifecycleRow(table, row);
  enforceForeignKeys(tables, table, row);

  const key = TABLE_KEYS[table];
  if (key && tables[table].some((existing) => existing[key] === row[key])) {
    throw new Error(`duplicate key for ${table}.${key}`);
  }
  if (
    table === "lifecycle_transitions" &&
    tables[table].some(
      (existing) =>
        existing.entity_type === row.entity_type &&
        existing.entity_id === row.entity_id &&
        existing.to_version === row.to_version,
    )
  ) {
    throw new Error("duplicate lifecycle transition version");
  }

  tables[table].push(row);
}

function applyLifecycleDefaults(table, row) {
  if (table === "orchestration_sessions" || table === "tasks") {
    row.lifecycle_state ??= row.status;
    row.lifecycle_version ??= 0;
  }
  if (table === "sessions") {
    row.lifecycle_state ??= null;
    row.lifecycle_version ??= null;
  }
  if (table === "orchestration_sessions") row.closed_at ??= null;
}

function validateLifecycleRow(table, row) {
  if (table === "lifecycle_transitions") {
    assertVersion(row.to_version, false);
    assertVersion(row.from_version, true);
    return;
  }
  if (!(table in LIFECYCLE_STATES)) return;

  const nullable = table === "sessions";
  if (row.lifecycle_state === null && nullable) {
    if (row.lifecycle_version !== null) {
      throw constraintError("legacy session version must be null");
    }
    return;
  }
  if (!LIFECYCLE_STATES[table].has(row.lifecycle_state)) {
    throw constraintError("invalid lifecycle state");
  }
  assertVersion(row.lifecycle_version, false);
}

function assertVersion(value, nullable) {
  if (value === null && nullable) return;
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_LIFECYCLE_VERSION
  ) {
    throw constraintError("lifecycle version outside safe domain");
  }
}

function constraintError(message) {
  const error = new Error(message);
  error.code = "FAKE_POSTGRES_CHECK_VIOLATION";
  return error;
}

function updateReturningChanges(tables, sql) {
  const match = sql.match(
    /^WITH changed AS \((UPDATE[\s\S]+)\s+RETURNING 1\)\s+SELECT COUNT\(\*\)::int AS changes FROM changed$/i,
  );
  if (!match) throw new Error(`unsupported changes query: ${sql}`);
  return [{ changes: updateRows(tables, match[1]).changes }];
}

function updateRows(tables, sql) {
  const match = sql.match(
    /^UPDATE\s+(\w+)\s+SET\s+([\s\S]+?)\s+WHERE\s+([\s\S]+)$/i,
  );
  if (!match) throw new Error(`unsupported UPDATE: ${sql}`);

  const [, table, setSql, whereSql] = match;
  const updates = Object.fromEntries(
    splitSqlList(setSql).map((assignment) => {
      const assignmentMatch = assignment.match(/^(\w+)\s*=\s*([\s\S]+)$/);
      if (!assignmentMatch) {
        throw new Error(`unsupported SET clause: ${assignment}`);
      }
      return [assignmentMatch[1], parseLiteral(assignmentMatch[2])];
    }),
  );

  const matches = tables[table].filter((row) =>
    matchesWhere(row, whereSql),
  );
  const replacements = matches.map((row) => {
    const candidate = { ...row, ...updates };
    validateLifecycleRow(table, candidate);
    return candidate;
  });
  for (let index = 0; index < matches.length; index += 1) {
    Object.assign(matches[index], replacements[index]);
  }
  return { changes: matches.length };
}

function selectRows(tables, sql) {
  const match = sql.match(
    /^SELECT \* FROM\s+(\w+)\s+WHERE\s+([\s\S]+?)(?:\s+ORDER BY\s+[\s\S]+?)?(?:\s+LIMIT\s+\d+)?$/i,
  );
  if (!match) throw new Error(`unsupported SELECT: ${sql}`);

  const [, table, whereSql] = match;
  return tables[table]
    .filter((row) => matchesWhere(row, whereSql))
    .map((row) => ({ ...row }));
}

function matchesWhere(row, whereSql) {
  return whereSql.split(/\s+AND\s+/i).every((condition) => {
    const match = condition.trim().match(/^(\w+)\s*=\s*(.+)$/);
    if (!match) throw new Error(`unsupported WHERE clause: ${condition}`);
    return row[match[1]] === parseLiteral(match[2]);
  });
}

function enforceForeignKeys(tables, table, row) {
  if (
    table === "tasks" &&
    !tables.orchestration_sessions.some(
      (parent) => parent.trace_id === row.trace_id,
    )
  ) {
    throw new Error(`foreign key violation: tasks.trace_id ${row.trace_id}`);
  }
  if (
    table === "sessions" &&
    !tables.tasks.some((parent) => parent.task_id === row.task_id)
  ) {
    throw new Error(`foreign key violation: sessions.task_id ${row.task_id}`);
  }
}

function cloneTables(tables) {
  return Object.fromEntries(
    Object.entries(tables).map(([table, rows]) => [
      table,
      rows.map((row) => ({ ...row })),
    ]),
  );
}

function restoreTables(tables, snapshot) {
  for (const [table, rows] of Object.entries(snapshot)) {
    tables[table].splice(0, tables[table].length, ...rows);
  }
}

function stripTrailingSemicolon(sql) {
  return sql.trim().replace(/;$/, "");
}

function splitSqlList(value) {
  const items = [];
  let current = "";
  let inString = false;
  let depth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const next = value[index + 1];
    if (char === "'" && inString && next === "'") {
      current += "''";
      index += 1;
      continue;
    }
    if (char === "'") inString = !inString;
    if (!inString && char === "(") depth += 1;
    if (!inString && char === ")") depth -= 1;
    if (char === "," && !inString && depth === 0) {
      items.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  if (current) items.push(current.trim());
  return items;
}

function parseLiteral(value) {
  const trimmed = value.trim();
  if (/^NULL$/i.test(trimmed)) return null;
  if (/^TRUE$/i.test(trimmed)) return true;
  if (/^FALSE$/i.test(trimmed)) return false;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  throw new Error(`unsupported SQL literal: ${trimmed}`);
}
