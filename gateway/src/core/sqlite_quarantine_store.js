import crypto from "node:crypto";

const CONSUME_KEY = /^coord-consume-v1-[a-f0-9]{64}$/;
const LOCATOR = /^coord-vault-v1-[a-f0-9]{64}$/;

export const SQLITE_QUARANTINE_STORE_CONTRACT = Object.freeze({
  durable: true,
  backend: "sqlite",
  keyedBy: "consumeKey",
  opaqueCanonicalLocator: true,
});

export class SqliteQuarantineVaultError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SqliteQuarantineVaultError";
    this.code = code;
  }
}

function vaultError(scope, code, message) {
  return scope.control(
    new SqliteQuarantineVaultError(code, message),
  );
}

function corruptVault(scope) {
  return vaultError(
    scope,
    "COORDINATION_QUARANTINE_VAULT_CORRUPT",
    "coordination quarantine vault state is invalid",
  );
}

function failedVault() {
  return new SqliteQuarantineVaultError(
    "COORDINATION_QUARANTINE_VAULT_FAILED",
    "coordination quarantine vault operation failed safely",
  );
}

function conflictVault(scope) {
  return vaultError(
    scope,
    "COORDINATION_QUARANTINE_VAULT_CONFLICT",
    "coordination quarantine vault content conflicts with its key",
  );
}

function validationError(scope, message) {
  return scope.validation(
    new TypeError(message),
  );
}

function plainObject(scope, value, label) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw validationError(scope, `${label} must be a plain object`);
  }
  return value;
}

function consumeKey(scope, value) {
  if (typeof value !== "string" || !CONSUME_KEY.test(value)) {
    throw validationError(scope, "consumeKey must be canonical");
  }
  return value;
}

function locator(scope, value) {
  if (typeof value !== "string" || !LOCATOR.test(value)) {
    throw validationError(scope, "locator must be canonical");
  }
  return value;
}

function normalizeBody(scope, value) {
  if (value === null) {
    return {
      body: null,
      kind: "absent",
      bytes: Buffer.alloc(0),
    };
  }
  if (typeof value !== "string") {
    throw validationError(scope, "body must be a string or null");
  }
  const bytes = Buffer.from(value, "utf8");
  if (bytes.toString("utf8") !== value) {
    throw validationError(
      scope,
      "body must have a canonical UTF-8 representation",
    );
  }
  return {
    body: value,
    kind: "string",
    bytes,
  };
}

function digest(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function canonicalLocator(key) {
  return `coord-vault-v1-${digest(
    Buffer.from(JSON.stringify([1, key]), "utf8"),
  )}`;
}

function assertSqlite(database) {
  if (
    database?.backend === "postgres"
    || (
      database?.backend !== undefined
      && database.backend !== "sqlite"
    )
    || typeof database?.prepare !== "function"
    || typeof database?.transaction !== "function"
    || typeof database?.pragma !== "function"
  ) {
    throw new TypeError(
      "SQLite backend is required; PostgreSQL is deferred to Project V5 I/0/05",
    );
  }
}

function decodeRow(scope, row) {
  let key;
  let storedLocator;
  let bytes;
  if (
    !row
    || typeof row !== "object"
    || Array.isArray(row)
    || !Buffer.isBuffer(row.body)
  ) {
    throw corruptVault(scope);
  }
  try {
    key = consumeKey(scope, row.consume_key);
    storedLocator = locator(scope, row.locator);
  } catch (error) {
    if (!scope.isValidation(error)) throw error;
    throw corruptVault(scope);
  }
  bytes = row.body;
  if (!["string", "absent"].includes(row.body_kind)) {
    throw corruptVault(scope);
  }
  const expectedDigest = digest(bytes);
  if (
    storedLocator !== canonicalLocator(key)
    || row.body_sha256 !== expectedDigest
    || typeof row.created_at !== "string"
    || !Number.isFinite(Date.parse(row.created_at))
  ) {
    throw corruptVault(scope);
  }
  const body = row.body_kind === "absent" ? null : bytes.toString("utf8");
  if (
    (row.body_kind === "absent" && bytes.length !== 0)
    || (
      row.body_kind === "string"
      && !Buffer.from(body, "utf8").equals(bytes)
    )
  ) {
    throw corruptVault(scope);
  }
  return {
    key,
    locator: storedLocator,
    bytes,
    body,
    kind: row.body_kind,
  };
}

export function createSqliteQuarantineStore({ database } = {}) {
  assertSqlite(database);

  function safely(action) {
    const controlErrors = new Set();
    const validationErrors = new Set();
    const scope = Object.freeze({
      control(error) {
        controlErrors.add(error);
        return error;
      },
      isControl(error) {
        return controlErrors.has(error);
      },
      isValidation(error) {
        return validationErrors.has(error);
      },
      validation(error) {
        validationErrors.add(error);
        return error;
      },
    });
    try {
      return action(scope);
    } catch (error) {
      if (scope.isControl(error) || scope.isValidation(error)) {
        throw error;
      }
      throw failedVault();
    } finally {
      controlErrors.clear();
      validationErrors.clear();
    }
  }

  function write(scope, action) {
    try {
      return database.transaction(action).immediate();
    } catch (error) {
      if (scope.isValidation(error)) {
        throw corruptVault(scope);
      }
      throw error;
    }
  }

  function read(scope, action) {
    try {
      return database.transaction(action).deferred();
    } catch (error) {
      if (scope.isValidation(error)) {
        throw corruptVault(scope);
      }
      throw error;
    }
  }

  async function put(input) {
    return safely((scope) => {
      const source = plainObject(scope, input, "quarantine body");
      const key = consumeKey(scope, source.consumeKey);
      const normalizedBody = normalizeBody(scope, source.body);
      const { bytes } = normalizedBody;
      const bodySha256 = digest(bytes);
      const resolvedLocator = canonicalLocator(key);
      return write(scope, () => {
        const existing = database
          .prepare(
            "SELECT * FROM coordination_quarantine_vault "
            + "WHERE consume_key = ?",
          )
          .get(key);
        if (existing) {
          const decoded = decodeRow(scope, existing);
          if (
            decoded.kind !== normalizedBody.kind
            || !decoded.bytes.equals(bytes)
          ) {
            throw conflictVault(scope);
          }
          return Object.freeze({ locator: decoded.locator });
        }
        const collision = database
          .prepare(
            "SELECT consume_key FROM coordination_quarantine_vault "
            + "WHERE locator = ?",
          )
          .get(resolvedLocator);
        if (collision) throw corruptVault(scope);
        database
          .prepare(
            "INSERT INTO coordination_quarantine_vault "
            + "(consume_key, locator, body, body_kind, body_sha256, "
            + "created_at) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .run(
            key,
            resolvedLocator,
            bytes,
            normalizedBody.kind,
            bodySha256,
            new Date().toISOString(),
          );
        return Object.freeze({ locator: resolvedLocator });
      });
    });
  }

  async function get(input) {
    return safely((scope) => {
      const source = plainObject(scope, input, "quarantine locator");
      const exactLocator = locator(scope, source.locator);
      return read(scope, () => {
        const row = database
          .prepare(
            "SELECT * FROM coordination_quarantine_vault WHERE locator = ?",
        )
          .get(exactLocator);
        if (!row) return null;
        const decoded = decodeRow(scope, row);
        if (decoded.locator !== exactLocator) throw corruptVault(scope);
        return Object.freeze({ body: decoded.body });
      });
    });
  }

  return Object.freeze({ put, get });
}
