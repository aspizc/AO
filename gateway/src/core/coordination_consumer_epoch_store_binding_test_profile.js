import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { types } from "node:util";

import Database from "better-sqlite3";

import {
  WIRING_B_EPOCH_SQLITE,
  applySqliteMigrationSet,
} from "./sqlite_migration_sets.js";

const PROFILE_NAME = "sqlite-redis-disposable-epoch-test-v1";
const MAX_SAFE_DECIMAL = "9007199254740991";
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const STORE_TABLE = "coordination_consumer_runtime_epoch_store";

const ALLOCATE_BINDING_SCRIPT = `
-- epoch-store-binding:allocate:v1
if #KEYS ~= 2 or #ARGV ~= 6 then return {'recovery_required'} end

local function key_type(key)
  local reply = redis.call('TYPE', key)
  if type(reply) == 'table' then return reply.ok end
  return reply
end

local function canonical_counter(value)
  if type(value) ~= 'string' then return false end
  if value ~= '0' and not string.match(value, '^[1-9][0-9]*$') then return false end
  if string.len(value) < string.len(ARGV[5]) then return true end
  if string.len(value) > string.len(ARGV[5]) then return false end
  return value <= ARGV[5]
end

local function increment_decimal(value)
  local result = {}
  local carry = 1
  for index = string.len(value), 1, -1 do
    local digit = string.byte(value, index) - 48 + carry
    if digit == 10 then
      digit = 0
      carry = 1
    else
      carry = 0
    end
    table.insert(result, 1, string.char(digit + 48))
  end
  if carry == 1 then table.insert(result, 1, '1') end
  return table.concat(result)
end

local function decimal_less(left, right)
  if string.len(left) ~= string.len(right) then
    return string.len(left) < string.len(right)
  end
  return left < right
end

if key_type(KEYS[1]) ~= 'string' then return {'recovery_required'} end
if redis.call('PTTL', KEYS[1]) ~= -1 then return {'recovery_required'} end
if redis.call('STRLEN', KEYS[1]) ~= string.len(ARGV[1]) then
  return {'recovery_required'}
end
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return {'recovery_required'} end

local counter_type = key_type(KEYS[2])
local counter = '0'
if counter_type == 'string' then
  if redis.call('PTTL', KEYS[2]) ~= -1 then return {'recovery_required'} end
  local counter_length = redis.call('STRLEN', KEYS[2])
  if counter_length < 1 or counter_length > string.len(ARGV[5]) then
    return {'recovery_required'}
  end
  counter = redis.call('GET', KEYS[2])
elseif counter_type ~= 'none' then
  return {'recovery_required'}
end
if not canonical_counter(counter) or not canonical_counter(ARGV[6]) then
  return {'recovery_required'}
end
if decimal_less(counter, ARGV[6]) or counter == ARGV[5] then
  return {'recovery_required'}
end

local next_ordinal = increment_decimal(counter)
local binding_key = ARGV[2] .. next_ordinal
local binding_type = key_type(binding_key)
if binding_type ~= 'none' then
  if binding_type ~= 'string' then return {'recovery_required'} end
  if redis.call('PTTL', binding_key) ~= -1 then return {'recovery_required'} end
  return {'binding_collision'}
end

redis.call('SET', KEYS[2], next_ordinal)
redis.call('SET', binding_key, ARGV[3] .. next_ordinal .. ARGV[4])
return {'allocated', next_ordinal}
`;

const BIND_RESERVED_SCRIPT = `
-- epoch-store-binding:bind:v1
if #KEYS ~= 3 or #ARGV ~= 5 then return {'recovery_required'} end

local function key_type(key)
  local reply = redis.call('TYPE', key)
  if type(reply) == 'table' then return reply.ok end
  return reply
end

local function canonical_counter(value)
  if type(value) ~= 'string' then return false end
  if value ~= '0' and not string.match(value, '^[1-9][0-9]*$') then return false end
  if string.len(value) < string.len(ARGV[5]) then return true end
  if string.len(value) > string.len(ARGV[5]) then return false end
  return value <= ARGV[5]
end

local function decimal_less(left, right)
  if string.len(left) ~= string.len(right) then
    return string.len(left) < string.len(right)
  end
  return left < right
end

if key_type(KEYS[1]) ~= 'string' then return {'recovery_required'} end
if redis.call('PTTL', KEYS[1]) ~= -1 then return {'recovery_required'} end
if redis.call('STRLEN', KEYS[1]) ~= string.len(ARGV[1]) then
  return {'recovery_required'}
end
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return {'recovery_required'} end
if key_type(KEYS[2]) ~= 'string' then return {'recovery_required'} end
if redis.call('PTTL', KEYS[2]) ~= -1 then return {'recovery_required'} end
local counter_length = redis.call('STRLEN', KEYS[2])
if counter_length < 1 or counter_length > string.len(ARGV[5]) then
  return {'recovery_required'}
end
local counter = redis.call('GET', KEYS[2])
if not canonical_counter(counter) or decimal_less(counter, ARGV[2]) then
  return {'recovery_required'}
end
if key_type(KEYS[3]) ~= 'string' then return {'recovery_required'} end
if redis.call('PTTL', KEYS[3]) ~= -1 then return {'recovery_required'} end
if redis.call('STRLEN', KEYS[3]) ~= string.len(ARGV[3]) then
  return {'recovery_required'}
end
if redis.call('GET', KEYS[3]) ~= ARGV[3] then return {'recovery_required'} end
redis.call('SET', KEYS[3], ARGV[4])
return {'bound'}
`;

const READ_BOUND_SCRIPT = `
-- epoch-store-binding:read:v1
if #KEYS ~= 3 or #ARGV ~= 4 then return {'recovery_required'} end

local function key_type(key)
  local reply = redis.call('TYPE', key)
  if type(reply) == 'table' then return reply.ok end
  return reply
end

local function canonical_counter(value)
  if type(value) ~= 'string' then return false end
  if value ~= '0' and not string.match(value, '^[1-9][0-9]*$') then return false end
  if string.len(value) < string.len(ARGV[4]) then return true end
  if string.len(value) > string.len(ARGV[4]) then return false end
  return value <= ARGV[4]
end

local function decimal_less(left, right)
  if string.len(left) ~= string.len(right) then
    return string.len(left) < string.len(right)
  end
  return left < right
end

if key_type(KEYS[1]) ~= 'string' then return {'recovery_required'} end
if redis.call('PTTL', KEYS[1]) ~= -1 then return {'recovery_required'} end
if redis.call('STRLEN', KEYS[1]) ~= string.len(ARGV[1]) then
  return {'recovery_required'}
end
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return {'recovery_required'} end
if key_type(KEYS[2]) ~= 'string' then return {'recovery_required'} end
if redis.call('PTTL', KEYS[2]) ~= -1 then return {'recovery_required'} end
local counter_length = redis.call('STRLEN', KEYS[2])
if counter_length < 1 or counter_length > string.len(ARGV[4]) then
  return {'recovery_required'}
end
local counter = redis.call('GET', KEYS[2])
if not canonical_counter(counter) or decimal_less(counter, ARGV[2]) then
  return {'recovery_required'}
end
if key_type(KEYS[3]) ~= 'string' then return {'recovery_required'} end
if redis.call('PTTL', KEYS[3]) ~= -1 then return {'recovery_required'} end
if redis.call('STRLEN', KEYS[3]) ~= string.len(ARGV[3]) then
  return {'recovery_required'}
end
if redis.call('GET', KEYS[3]) ~= ARGV[3] then return {'recovery_required'} end
return {'bound'}
`;

function bindingError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function recoveryRequired() {
  return bindingError(
    "RECOVERY_REQUIRED",
    "durable epoch store binding requires recovery",
  );
}

function bindingCollision() {
  return bindingError(
    "BINDING_COLLISION",
    "durable epoch store binding allocation collided",
  );
}

function storeOriginMismatch() {
  return bindingError(
    "STORE_ORIGIN_MISMATCH",
    "durable epoch SQLite store origin does not match",
  );
}

function redisAuthorityMismatch() {
  return bindingError(
    "REDIS_AUTHORITY_MISMATCH",
    "durable epoch Redis authority does not match",
  );
}

function unsupportedStoreSchema() {
  return bindingError(
    "STORE_SCHEMA_UNSUPPORTED",
    "durable epoch SQLite store schema is unsupported",
  );
}

function assertSafeId(value, label) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    throw new TypeError(`${label} must be a safe identifier`);
  }
}

function assertRedisOriginFactory(createRedisOrigin) {
  if (typeof createRedisOrigin !== "function") {
    throw new TypeError("createRedisOrigin must be a function");
  }
}

function authorityRecord(redisAuthorityId, redisNamespaceId) {
  return JSON.stringify({
    protocolVersion: 1,
    redisAuthorityId,
    redisNamespaceId,
  });
}

function bindingRecordPrefix(redisAuthorityId, redisNamespaceId) {
  return JSON.stringify({
    protocolVersion: 1,
    redisAuthorityId,
    redisNamespaceId,
  }).slice(0, -1) + ",\"bindingOrdinal\":";
}

function bindingRecordSuffix(allocationState) {
  return `,"allocationState":"${allocationState}"}`;
}

function bindingRecord(tuple, allocationState) {
  return `${tuple.recordPrefix}${tuple.ordinal}`
    + bindingRecordSuffix(allocationState);
}

const CLOSED_ERROR_CODES = new Set([
  "BINDING_COLLISION",
  "MIGRATION_PROFILE_MISMATCH",
  "RECOVERY_REQUIRED",
  "REDIS_AUTHORITY_MISMATCH",
  "STORE_ORIGIN_MISMATCH",
  "STORE_SCHEMA_UNSUPPORTED",
]);

const STORE_INPUT_KEYS = Object.freeze([
  "database",
  "storeOrigin",
  "originCapability",
  "storeCapability",
  "redisAuthorityNamespaceCapability",
]);

function ownErrorCode(error) {
  try {
    if (types.isProxy(error)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(error, "code");
    if (!descriptor || !("value" in descriptor)) return null;
    return typeof descriptor.value === "string" ? descriptor.value : null;
  } catch {
    return null;
  }
}

function isClosedError(error) {
  return CLOSED_ERROR_CODES.has(ownErrorCode(error));
}

function snapshotRedisReply(reply) {
  try {
    if (
      types.isProxy(reply)
      || !Array.isArray(reply)
      || Object.getPrototypeOf(reply) !== Array.prototype
    ) {
      throw recoveryRequired();
    }
    const length = Object.getOwnPropertyDescriptor(reply, "length")?.value;
    if (!Number.isInteger(length) || length < 1 || length > 2) {
      throw recoveryRequired();
    }
    const expectedKeys = [
      ...Array.from({ length }, (_, index) => String(index)),
      "length",
    ];
    const keys = Reflect.ownKeys(reply);
    if (
      keys.length !== expectedKeys.length
      || !expectedKeys.every((key) => keys.includes(key))
    ) {
      throw recoveryRequired();
    }
    const snapshot = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(reply, String(index));
      if (
        !descriptor
        || !("value" in descriptor)
        || typeof descriptor.value !== "string"
        || descriptor.value.length < 1
        || descriptor.value.length > 64
      ) {
        throw recoveryRequired();
      }
      snapshot.push(descriptor.value);
    }
    return Object.freeze(snapshot);
  } catch (error) {
    if (ownErrorCode(error) === "RECOVERY_REQUIRED") throw error;
    throw recoveryRequired();
  }
}

function snapshotStoreInput(input) {
  try {
    if (
      types.isProxy(input)
      || input === null
      || typeof input !== "object"
      || Array.isArray(input)
      || Object.getPrototypeOf(input) !== Object.prototype
    ) {
      throw storeOriginMismatch();
    }
    const keys = Reflect.ownKeys(input);
    if (
      keys.length !== STORE_INPUT_KEYS.length
      || !STORE_INPUT_KEYS.every((key) => keys.includes(key))
    ) {
      throw storeOriginMismatch();
    }
    const snapshot = {};
    for (const key of STORE_INPUT_KEYS) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !("value" in descriptor)) {
        throw storeOriginMismatch();
      }
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch (error) {
    if (ownErrorCode(error) === "STORE_ORIGIN_MISMATCH") throw error;
    throw storeOriginMismatch();
  }
}

function exactReply(reply, status, length) {
  return (
    Array.isArray(reply)
    && reply.length === length
    && reply[0] === status
  );
}

function parseOrdinal(value) {
  if (
    typeof value !== "string"
    || !/^[1-9][0-9]{0,15}$/.test(value)
    || (
      value.length === MAX_SAFE_DECIMAL.length
      && value > MAX_SAFE_DECIMAL
    )
  ) {
    throw recoveryRequired();
  }
  const ordinal = Number(value);
  if (!Number.isSafeInteger(ordinal) || ordinal < 1) {
    throw recoveryRequired();
  }
  return ordinal;
}

function exactStoreRows(rows) {
  if (!Array.isArray(rows) || rows.length !== 1) return null;
  const row = rows[0];
  if (
    row === null
    || typeof row !== "object"
    || Array.isArray(row)
    || Object.getPrototypeOf(row) !== Object.prototype
  ) {
    return null;
  }
  const expectedKeys = [
    "singleton",
    "protocol_version",
    "redis_authority_id",
    "redis_namespace_id",
    "redis_binding_ordinal",
    "allocation_state",
  ];
  const keys = Reflect.ownKeys(row);
  if (
    keys.length !== expectedKeys.length
    || !keys.every((key, index) => key === expectedKeys[index])
    || row.singleton !== 1
    || row.protocol_version !== 1
    || !SAFE_ID.test(row.redis_authority_id)
    || !SAFE_ID.test(row.redis_namespace_id)
    || !Number.isSafeInteger(row.redis_binding_ordinal)
    || row.redis_binding_ordinal < 1
    || row.allocation_state !== "bound"
  ) {
    return null;
  }
  return row;
}

function sqliteSchemaVersion(database) {
  let version;
  try {
    version = database.pragma("main.schema_version", { simple: true });
  } catch {
    throw unsupportedStoreSchema();
  }
  if (!Number.isSafeInteger(version) || version < 0) {
    throw unsupportedStoreSchema();
  }
  return version;
}

function assertDatabaseUsable(database) {
  if (
    database === null
    || typeof database !== "object"
    || database.backend !== "sqlite"
    || database.memory !== false
    || database.open !== true
    || database.inTransaction !== false
    || typeof database.prepare !== "function"
    || typeof database.pragma !== "function"
  ) {
    throw storeOriginMismatch();
  }
}

function closeDatabase(database, openDatabases, closedDatabases) {
  if (closedDatabases.has(database)) return;
  closedDatabases.add(database);
  openDatabases.delete(database);
  if (database.open) database.close();
}

export function createSqliteRedisDisposableEpochTestProfile({
  redisAuthorityId,
  redisNamespaceId,
  createRedisOrigin,
} = {}) {
  assertSafeId(redisAuthorityId, "redisAuthorityId");
  assertSafeId(redisNamespaceId, "redisNamespaceId");
  assertRedisOriginFactory(createRedisOrigin);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "g002-epoch-profile-"));
  const profileInstance = Object.freeze({ name: PROFILE_NAME });
  const authorityKey = `${redisNamespaceId}:epoch:authority`;
  const counterKey = `${redisNamespaceId}:epoch:binding-counter`;
  const bindingPrefix = `${redisNamespaceId}:epoch:binding:`;
  const canonicalAuthority = authorityRecord(
    redisAuthorityId,
    redisNamespaceId,
  );
  const recordPrefix = bindingRecordPrefix(
    redisAuthorityId,
    redisNamespaceId,
  );
  const redisClient = createRedisOrigin(Object.freeze({
    profileName: PROFILE_NAME,
    redisAuthorityId,
    redisNamespaceId,
    authorityKey,
    counterKey,
    bindingPrefix,
    authorityRecord: canonicalAuthority,
  }));
  if (typeof redisClient?.sendCommand !== "function") {
    throw new TypeError("Redis origin must provide sendCommand");
  }

  const redisAuthorityRecords = new WeakMap();
  const originRecords = new WeakMap();
  const originCapabilities = new WeakMap();
  const storeCapabilityRecords = new WeakMap();
  const openDatabases = new Set();
  const closedDatabases = new WeakSet();
  const issuedOrdinals = new Set();
  const redisAuthorityNamespaceCapability = Object.freeze({});
  const redisRecord = {
    profileInstance,
    client: redisClient,
    redisAuthorityId,
    redisNamespaceId,
    authorityKey,
    counterKey,
    bindingPrefix,
    authorityRecord: canonicalAuthority,
  };
  redisAuthorityRecords.set(
    redisAuthorityNamespaceCapability,
    redisRecord,
  );
  let highestObservedOrdinal = 0;
  let nextStore = 1;
  let disposed = false;
  let terminalFaultCode = null;

  function assertActive() {
    if (disposed) throw storeOriginMismatch();
  }

  function terminalFault() {
    return terminalFaultCode === "BINDING_COLLISION"
      ? bindingCollision()
      : recoveryRequired();
  }

  function assertOperational() {
    assertActive();
    if (terminalFaultCode !== null) throw terminalFault();
  }

  function latchFault(error) {
    const code = ownErrorCode(error);
    if (code === "BINDING_COLLISION" || code === "RECOVERY_REQUIRED") {
      terminalFaultCode ??= code;
    }
    throw error;
  }

  async function runRedis(command) {
    assertOperational();
    let reply;
    try {
      reply = await redisRecord.client.sendCommand(command);
    } catch {
      assertActive();
      throw recoveryRequired();
    }
    assertActive();
    try {
      return snapshotRedisReply(reply);
    } catch (error) {
      latchFault(error);
    }
  }

  async function allocate() {
    const reply = await runRedis([
      "EVAL",
      ALLOCATE_BINDING_SCRIPT,
      "2",
      authorityKey,
      counterKey,
      canonicalAuthority,
      bindingPrefix,
      recordPrefix,
      bindingRecordSuffix("reserved"),
      MAX_SAFE_DECIMAL,
      String(highestObservedOrdinal),
    ]);
    if (exactReply(reply, "binding_collision", 1)) {
      latchFault(bindingCollision());
    }
    if (!exactReply(reply, "allocated", 2)) {
      latchFault(recoveryRequired());
    }
    let ordinal;
    try {
      ordinal = parseOrdinal(reply[1]);
    } catch (error) {
      latchFault(error);
    }
    if (issuedOrdinals.has(ordinal)) latchFault(bindingCollision());
    if (ordinal <= highestObservedOrdinal) latchFault(recoveryRequired());
    issuedOrdinals.add(ordinal);
    highestObservedOrdinal = ordinal;
    return ordinal;
  }

  function tupleFor(ordinal) {
    return Object.freeze({
      redisAuthorityId,
      redisNamespaceId,
      ordinal,
      recordPrefix,
    });
  }

  function bindingCommand(script, tuple, expectedRecord) {
    const key = `${bindingPrefix}${tuple.ordinal}`;
    return [
      "EVAL",
      script,
      "3",
      authorityKey,
      counterKey,
      key,
      canonicalAuthority,
      String(tuple.ordinal),
      expectedRecord,
      MAX_SAFE_DECIMAL,
    ];
  }

  async function readExactBound(tuple) {
    const reply = await runRedis(bindingCommand(
      READ_BOUND_SCRIPT,
      tuple,
      bindingRecord(tuple, "bound"),
    ));
    if (!exactReply(reply, "bound", 1)) latchFault(recoveryRequired());
  }

  async function bindInitializedOrigin(tuple) {
    assertOperational();
    const reserved = bindingRecord(tuple, "reserved");
    const bound = bindingRecord(tuple, "bound");
    let reply;
    try {
      reply = await redisRecord.client.sendCommand([
        "EVAL",
        BIND_RESERVED_SCRIPT,
        "3",
        authorityKey,
        counterKey,
        `${bindingPrefix}${tuple.ordinal}`,
        canonicalAuthority,
        String(tuple.ordinal),
        reserved,
        bound,
        MAX_SAFE_DECIMAL,
      ]);
    } catch {
      assertActive();
      try {
        await readExactBound(tuple);
      } catch (error) {
        latchFault(error);
      }
      return;
    }
    assertActive();
    try {
      reply = snapshotRedisReply(reply);
    } catch (error) {
      latchFault(error);
    }
    if (!exactReply(reply, "bound", 1)) latchFault(recoveryRequired());
  }

  function insertStoreTuple(database, tuple) {
    const insert = database.transaction(() => {
      database.prepare(
        `INSERT INTO main.${STORE_TABLE} (
           singleton,
           protocol_version,
           redis_authority_id,
           redis_namespace_id,
           redis_binding_ordinal,
           allocation_state
         ) VALUES (1, 1, ?, ?, ?, 'bound')`,
      ).run(
        tuple.redisAuthorityId,
        tuple.redisNamespaceId,
        tuple.ordinal,
      );
    });
    insert.immediate();
  }

  async function createStore() {
    assertOperational();
    const ordinal = await allocate();
    const tuple = tupleFor(ordinal);
    const filename = path.join(root, `store-${nextStore}.sqlite`);
    nextStore += 1;
    let database;
    try {
      assertOperational();
      database = new Database(filename);
      database.backend = "sqlite";
      openDatabases.add(database);
      database.pragma("foreign_keys = ON");
      database.pragma("busy_timeout = 10000");
      applySqliteMigrationSet(database, WIRING_B_EPOCH_SQLITE);
      insertStoreTuple(database, tuple);
      const storeOrigin = Object.freeze({});
      const originCapability = Object.freeze({});
      const originRecord = {
        profileInstance,
        database,
        filename,
        storeOrigin,
        originCapability,
        tuple,
        schemaVersion: sqliteSchemaVersion(database),
        bound: false,
      };
      originRecords.set(storeOrigin, originRecord);
      originCapabilities.set(originCapability, originRecord);
      await bindInitializedOrigin(tuple);
      assertOperational();
      originRecord.bound = true;
      const storeCapability = Object.freeze({});
      storeCapabilityRecords.set(storeCapability, Object.freeze({
        profileInstance,
        origin: originRecord,
        redis: redisRecord,
        tuple,
      }));
      return Object.freeze({
        database,
        storeOrigin,
        originCapability,
        storeCapability,
        redisAuthorityNamespaceCapability,
      });
    } catch (error) {
      if (database) {
        closeDatabase(database, openDatabases, closedDatabases);
      }
      if (isClosedError(error)) throw error;
      throw unsupportedStoreSchema();
    }
  }

  function resolveAdmission(input) {
    const {
      database,
      storeOrigin,
      originCapability,
      storeCapability,
      redisAuthorityNamespaceCapability: redisCapability,
    } = snapshotStoreInput(input);
    const store = storeCapabilityRecords.get(storeCapability);
    if (!store || store.profileInstance !== profileInstance) {
      throw storeOriginMismatch();
    }
    const origin = originCapabilities.get(originCapability);
    if (
      !origin
      || origin !== store.origin
      || originRecords.get(storeOrigin) !== origin
      || origin.profileInstance !== profileInstance
      || origin.database !== database
      || origin.bound !== true
    ) {
      throw storeOriginMismatch();
    }
    const redis = redisAuthorityRecords.get(redisCapability);
    if (
      !redis
      || redis !== store.redis
      || redis.profileInstance !== profileInstance
    ) {
      throw redisAuthorityMismatch();
    }
    assertDatabaseUsable(database);
    return store;
  }

  function assertSealedMainStore(store) {
    try {
      const { database } = store.origin;
      if (sqliteSchemaVersion(database) !== store.origin.schemaVersion) {
        throw unsupportedStoreSchema();
      }
      applySqliteMigrationSet(database, WIRING_B_EPOCH_SQLITE);
      const rows = database.prepare(
        `SELECT singleton,
                protocol_version,
                redis_authority_id,
                redis_namespace_id,
                redis_binding_ordinal,
                allocation_state
         FROM main.${STORE_TABLE}
         ORDER BY singleton`,
      ).all();
      const row = exactStoreRows(rows);
      if (row === null) throw unsupportedStoreSchema();
      if (
        row.redis_authority_id !== store.tuple.redisAuthorityId
        || row.redis_namespace_id !== store.tuple.redisNamespaceId
        || row.redis_binding_ordinal !== store.tuple.ordinal
      ) {
        throw redisAuthorityMismatch();
      }
    } catch (error) {
      if (isClosedError(error)) throw error;
      throw unsupportedStoreSchema();
    }
  }

  async function admitStore(input) {
    assertOperational();
    const store = resolveAdmission(input);
    assertSealedMainStore(store);
    await readExactBound(store.tuple);
    assertOperational();
    return Object.freeze({ status: "admitted" });
  }

  async function dispose() {
    if (disposed) return;
    disposed = true;
    for (const database of [...openDatabases]) {
      closeDatabase(database, openDatabases, closedDatabases);
    }
    if (typeof redisClient.close === "function") await redisClient.close();
    fs.rmSync(root, { recursive: true, force: true });
  }

  return Object.freeze({
    createStore,
    admitStore,
    redisAuthorityNamespaceCapability,
    dispose,
  });
}
