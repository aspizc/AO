const TABLE_KEYS = {
  orchestration_sessions: "session_id",
  tasks: "task_id",
  sessions: "session_id",
  artifacts: "artifact_id",
  messages: "message_id",
  approvals: "approval_id",
  policy_decisions: "decision_id",
};

export function createFakePostgresExecutor() {
  const tables = Object.fromEntries(Object.keys(TABLE_KEYS).map((table) => [table, []]));

  return function fakePostgresExecutor(sql) {
    const query = unwrapJsonRowsQuery(sql.trim());

    if (/^CREATE TABLE IF NOT EXISTS schema_migrations\b/i.test(query)) return { changes: 0 };
    if (/^SELECT id FROM schema_migrations\b/i.test(query)) return [{ id: "001_initial" }];
    if (/^INSERT INTO schema_migrations\b/i.test(query)) return { changes: 1 };

    if (/^INSERT INTO\b/i.test(query)) return insertRow(tables, query);
    if (/^WITH changed AS \(/i.test(query)) return updateReturningChanges(tables, query);
    if (/^UPDATE\b/i.test(query)) return updateRows(tables, query);
    if (/^SELECT \* FROM\b/i.test(query)) return selectRows(tables, query);

    throw new Error(`fake postgres executor does not handle SQL: ${query}`);
  };
}

function insertRow(tables, sql) {
  const match = sql.match(/^INSERT INTO\s+(\w+)\s*\(([\s\S]+?)\)\s*VALUES\s*\(([\s\S]+)\)$/i);
  if (!match) throw new Error(`unsupported INSERT: ${sql}`);

  const [, table, columnSql, valueSql] = match;
  const columns = columnSql.split(",").map((column) => column.trim());
  const values = splitSqlList(valueSql).map(parseLiteral);
  const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));

  enforceForeignKeys(tables, table, row);
  const key = TABLE_KEYS[table];
  if (key && tables[table].some((existing) => existing[key] === row[key])) {
    throw new Error(`duplicate key for ${table}.${key}`);
  }

  tables[table].push(row);
  return { changes: 1 };
}

function updateReturningChanges(tables, sql) {
  const match = sql.match(/^WITH changed AS \((UPDATE[\s\S]+)\s+RETURNING 1\)\s+SELECT COUNT\(\*\)::int AS changes FROM changed$/i);
  if (!match) throw new Error(`unsupported changes query: ${sql}`);
  return [{ changes: updateRows(tables, match[1]).changes }];
}

function updateRows(tables, sql) {
  const match = sql.match(/^UPDATE\s+(\w+)\s+SET\s+([\s\S]+?)\s+WHERE\s+([\s\S]+)$/i);
  if (!match) throw new Error(`unsupported UPDATE: ${sql}`);

  const [, table, setSql, whereSql] = match;
  const updates = Object.fromEntries(
    splitSqlList(setSql).map((assignment) => {
      const assignmentMatch = assignment.match(/^(\w+)\s*=\s*([\s\S]+)$/);
      if (!assignmentMatch) throw new Error(`unsupported SET clause: ${assignment}`);
      return [assignmentMatch[1], parseLiteral(assignmentMatch[2])];
    }),
  );

  const rows = tables[table].filter((row) => matchesWhere(row, whereSql));
  for (const row of rows) Object.assign(row, updates);
  return { changes: rows.length };
}

function selectRows(tables, sql) {
  const match = sql.match(/^SELECT \* FROM\s+(\w+)\s+WHERE\s+([\s\S]+?)(?:\s+ORDER BY\s+[\s\S]+?)?(?:\s+LIMIT\s+\d+)?$/i);
  if (!match) throw new Error(`unsupported SELECT: ${sql}`);

  const [, table, whereSql] = match;
  return tables[table].filter((row) => matchesWhere(row, whereSql));
}

function matchesWhere(row, whereSql) {
  return whereSql.split(/\s+AND\s+/i).every((condition) => {
    const optionalMatch = condition
      .trim()
      .match(/^\((\w+)\s*=\s*(.+)\s+OR\s+\2\s+IS NULL\)$/i);
    if (optionalMatch) {
      const expected = parseLiteral(optionalMatch[2]);
      return expected === null || row[optionalMatch[1]] === expected;
    }

    const match = condition.trim().match(/^(\w+)\s*=\s*(.+)$/);
    if (!match) throw new Error(`unsupported WHERE clause: ${condition}`);
    return row[match[1]] === parseLiteral(match[2]);
  });
}

function enforceForeignKeys(tables, table, row) {
  if (table === "tasks" && !tables.orchestration_sessions.some((parent) => parent.trace_id === row.trace_id)) {
    throw new Error(`foreign key violation: tasks.trace_id ${row.trace_id}`);
  }
  if (table === "sessions" && !tables.tasks.some((parent) => parent.task_id === row.task_id)) {
    throw new Error(`foreign key violation: sessions.task_id ${row.task_id}`);
  }
}

function unwrapJsonRowsQuery(sql) {
  const match = sql.match(/^SELECT COALESCE\(json_agg\(row_to_json\(_q\)\), '\[\]'::json\) FROM \(([\s\S]+)\) AS _q$/i);
  return match ? match[1].trim() : sql;
}

function splitSqlList(value) {
  const items = [];
  let current = "";
  let inString = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const next = value[index + 1];
    if (char === "'" && inString && next === "'") {
      current += "''";
      index += 1;
      continue;
    }
    if (char === "'") inString = !inString;
    if (char === "," && !inString) {
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
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}
