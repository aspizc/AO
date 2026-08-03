import { execFileSync } from "node:child_process";

// Synchronous Postgres adapter for the existing better-sqlite3-shaped repository
// interface. C/0/1 is responsible for live Postgres parity coverage and any
// future move from the psql executor scaffold to a driver with bound parameters.
export class PostgresDatabase {
  constructor({ url, executor = defaultExecutor }) {
    if (!url) throw new TypeError("Postgres url required");
    this.url = url;
    this.executor = executor;
    this.backend = "postgres";
  }

  exec(sql) {
    this.executor(sql, this.url);
    return this;
  }

  prepare(sql) {
    return new PostgresStatement(this, sql);
  }

  close() {}
}

class PostgresStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  all(...params) {
    return this.#queryRows(this.#materialize(params));
  }

  get(...params) {
    return this.all(...params)[0];
  }

  run(...params) {
    const sql = this.#materialize(params);
    const changesSql = changesQuery(sql);
    if (changesSql) {
      const row = this.#queryRows(changesSql)[0];
      return { changes: Number(row?.changes ?? 0) };
    }
    const result = this.db.executor(sql, this.db.url);
    if (result && typeof result === "object" && !Array.isArray(result) && "changes" in result) {
      return result;
    }
    return { changes: 1 };
  }

  #queryRows(sql) {
    const result = this.db.executor(jsonRowsQuery(sql), this.db.url);
    if (Array.isArray(result)) return result;
    if (typeof result === "string") return parseRows(result);
    return [];
  }

  #materialize(params) {
    const normalized = normalizeSql(this.sql);
    if (params.length === 1 && isPlainObject(params[0])) {
      return normalized.replace(/@([A-Za-z][A-Za-z0-9_]*)/g, (_, key) => pgLiteral(params[0][key]));
    }

    let index = 0;
    return normalized.replace(/\?/g, () => pgLiteral(params[index++]));
  }
}

function defaultExecutor(sql, url) {
  return execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-X", "-q", "-t", "-A", "-c", sql], {
    encoding: "utf8",
  });
}

function normalizeSql(sql) {
  return sql.replace(/,\s*rowid\b/g, "");
}

function jsonRowsQuery(sql) {
  const trimmed = stripTrailingSemicolon(sql);
  return `SELECT COALESCE(json_agg(row_to_json(_q)), '[]'::json) FROM (${trimmed}) AS _q`;
}

function changesQuery(sql) {
  const trimmed = stripTrailingSemicolon(sql);
  if (/^UPDATE\b/i.test(trimmed) || /^DELETE\b/i.test(trimmed)) {
    return `WITH changed AS (${trimmed} RETURNING 1) SELECT COUNT(*)::int AS changes FROM changed`;
  }
  return null;
}

function stripTrailingSemicolon(sql) {
  return sql.trim().replace(/;$/, "");
}

function parseRows(raw) {
  const text = raw.trim();
  if (!text) return [];
  return JSON.parse(text);
}

function pgLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`non-finite number cannot be a SQL literal: ${value}`);
    }
    return String(value);
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
