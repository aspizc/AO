import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CoordinationAckReconcilerError,
  createCoordinationAckReconciler,
} from "../../gateway/src/core/coordination_ack_reconciler.js";
import {
  CoordinationQueueError,
  createRedisCoordinationQueue,
} from "../../gateway/src/core/coordination_queue.js";
import * as coordinationQueueModule from "../../gateway/src/core/coordination_queue.js";
import {
  coordinationConsumeKey,
} from "../../gateway/src/core/coordination_consumer.js";
import {
  RedisClientLane,
} from "../../gateway/src/core/redis_client_lifecycle.js";

const DIGEST = "a".repeat(64);
const MAX_STREAM_COMPONENT = "18446744073709551615";
const CANONICAL_JSON_MAX_BYTES = 262_144;
const CANONICAL_JSON_MAX_WORK = 196_608;
const CANONICAL_JSON_MAX_STRING_BYTES = 131_072;
const CANONICAL_JSON_MAX_DEPTH = 64;

function fence(overrides = {}) {
  return {
    participantId: "pt:recipient",
    scopeId: "project:v5",
    leaseTokenHash: DIGEST,
    ...overrides,
  };
}

function createScriptedClient({ responses = [], handler = null } = {}) {
  let open = false;
  const commands = [];
  return {
    get isOpen() {
      return open;
    },
    commands,
    on() {
      return this;
    },
    async connect() {
      open = true;
    },
    async sendCommand(command) {
      commands.push(structuredClone(command));
      if (handler) return handler(command, commands.length - 1);
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response;
    },
    destroy() {
      open = false;
    },
  };
}

function createQueue(client, options = {}) {
  return createRedisCoordinationQueue({
    redisUrl: "redis://isolated.invalid",
    clientFactory: () => client,
    ...options,
  });
}

function options(overrides = {}) {
  return {
    participantId: "pt:recipient",
    deliveryIds: ["100-0", "101-0"],
    tombstoneTtlMs: 60_000,
    timestamp: "2026-07-25T10:02:00.000Z",
    fence: fence(),
    ...overrides,
  };
}

function ackIdentity(overrides = {}) {
  const identity = {
    deliveryId: "100-0",
    scopeId: "project:v5",
    fromParticipantId: "pt:sender",
    oldParticipantId: "pt:recipient",
    messageId: "cm:ack:1",
    ...overrides,
  };
  return {
    consumeKey: coordinationConsumeKey({
      protocolVersion: 1,
      scopeId: identity.scopeId,
      fromParticipantId: identity.fromParticipantId,
      toParticipantId: identity.oldParticipantId,
      messageId: identity.messageId,
    }),
    ...identity,
  };
}

function canonicalPresence(overrides = {}) {
  return {
    protocolVersion: 1,
    participantId: "pt:recipient",
    participantType: "orchestrator",
    scopeId: "project:v5",
    displayName: "Recipient",
    capabilities: ["coordination.v1"],
    metadata: { protocol: "KYA" },
    registeredAt: "2026-07-25T10:00:00.000Z",
    lastHeartbeatAt: "2026-07-25T10:00:10.000Z",
    leaseExpiresAt: "2026-07-25T10:01:00.000Z",
    leaseTokenHash: DIGEST,
    ...overrides,
  };
}

function propertyPath(parent, key) {
  return `${parent}.${typeof key === "symbol"
    ? `[${String(key)}]`
    : String(key)}`;
}

function reachableDataGraph(roots, limit = 512) {
  const pending = roots.map(({ path, value }) => ({ path, value }));
  const visited = new Set();
  const nodes = [];
  const values = [];
  while (pending.length > 0) {
    const current = pending.shift();
    const isReference = (
      current.value !== null
      && (
        typeof current.value === "object"
        || typeof current.value === "function"
      )
    );
    if (!isReference || visited.has(current.value)) continue;
    visited.add(current.value);
    if (visited.size > limit) {
      throw new Error("reachable queue graph exceeded its test bound");
    }
    nodes.push(current);
    for (const key of Reflect.ownKeys(current.value)) {
      const descriptor = Object.getOwnPropertyDescriptor(current.value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) continue;
      const path = propertyPath(current.path, key);
      values.push({ path, value: descriptor.value });
      if (
        descriptor.value !== null
        && (
          typeof descriptor.value === "object"
          || typeof descriptor.value === "function"
        )
      ) {
        pending.push({ path, value: descriptor.value });
      }
    }
    const prototype = Object.getPrototypeOf(current.value);
    if (
      prototype
      && prototype !== Object.prototype
      && prototype !== Function.prototype
    ) {
      pending.push({
        path: `${current.path}.<prototype>`,
        value: prototype,
      });
    }
  }
  return { nodes, values };
}

function dataMethod(value, name) {
  let current = value;
  while (current && current !== Object.prototype) {
    const descriptor = Object.getOwnPropertyDescriptor(current, name);
    if (descriptor) {
      return Object.hasOwn(descriptor, "value")
        && typeof descriptor.value === "function"
        ? descriptor.value
        : null;
    }
    current = Object.getPrototypeOf(current);
  }
  return null;
}

function canonicalJsonContractSlice(script) {
  const start = script.indexOf("local JSON_MAX_BYTES");
  const end = script.indexOf("local function is_continuation_byte");
  if (start < 0 || end < 0 || start >= end) return null;
  return script.slice(start, end);
}

function assertBoundedCanonicalJsonContract(script) {
  const contract = canonicalJsonContractSlice(script);
  assert.notEqual(contract, null);
  for (const fragment of [
    `local JSON_MAX_BYTES = ${CANONICAL_JSON_MAX_BYTES}`,
    `local JSON_MAX_WORK = ${CANONICAL_JSON_MAX_WORK}`,
    `local JSON_MAX_STRING_BYTES = ${CANONICAL_JSON_MAX_STRING_BYTES}`,
    `local JSON_MAX_DEPTH = ${CANONICAL_JSON_MAX_DEPTH}`,
    "local function consume_json_work",
    "local function skip_json_string",
    "local function skip_json_value",
    "local function parse_canonical_json",
    "string.len(source) > JSON_MAX_BYTES",
    "work = { remaining = JSON_MAX_WORK }",
    "consume_json_work(work",
    "if seen_keys[key] then",
    "seen_keys[key] = true",
    "root_kinds[key] = value_kind",
    "pcall(cjson.decode, source)",
  ]) {
    assert.match(contract, new RegExp(
      fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ));
  }
  const parser = contract.slice(
    contract.indexOf("local function parse_canonical_json"),
  );
  assertScriptOrder(parser, [
    "string.len(source) > JSON_MAX_BYTES",
    "work = { remaining = JSON_MAX_WORK }",
    "local index = skip_json_value(",
    "pcall(cjson.decode, source)",
  ]);
  assert.doesNotMatch(script, /top_level_json_container_kind/);
}

function hasBoundedCanonicalJsonContract(script) {
  if (canonicalJsonContractSlice(script) === null) return false;
  assertBoundedCanonicalJsonContract(script);
  return true;
}

function assertExactLeasedPresenceGuard(script) {
  if (hasBoundedCanonicalJsonContract(script)) {
    for (const fragment of [
      "redis.call('PTTL', KEYS[1])",
      "presence_ttl <= 0",
      "local presence, presence_kinds = parse_canonical_json(",
      "presence_raw",
      "presence_kinds.capabilities ~= 'array'",
      "presence_kinds.metadata ~= 'object'",
    ]) {
      assert.match(script, new RegExp(
        fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      ));
    }
    assertScriptOrder(script, [
      "local presence_raw",
      "redis.call('PTTL', KEYS[1])",
      "local presence, presence_kinds = parse_canonical_json(",
      "presence_kinds.capabilities ~= 'array'",
      "presence_kinds.metadata ~= 'object'",
    ]);
    return;
  }
  for (const fragment of [
    "local function skip_json_string",
    "local function skip_json_value",
    "local function top_level_json_container_kind",
    "local seen_keys = {}",
    "if seen_keys[key] then",
    "seen_keys[key] = true",
    "string.byte",
    "capabilities_kind = top_level_json_container_kind(",
    "presence_raw,",
    "'capabilities'",
    "metadata_kind = top_level_json_container_kind(",
    "'metadata'",
    "capabilities_kind ~= 'array'",
    "metadata_kind ~= 'object'",
    "redis.call('PTTL', KEYS[1])",
    "presence_ttl <= 0",
  ]) {
    assert.match(script, new RegExp(
      fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ));
  }
  assert.doesNotMatch(
    script,
    /string\.(?:find|match)\(\s*presence_raw/,
  );
  assertScriptOrder(script, [
    "local function skip_json_string",
    "local function skip_json_value",
    "local function top_level_json_container_kind",
    "local presence_raw",
    "redis.call('PTTL', KEYS[1])",
    "capabilities_kind = top_level_json_container_kind(",
    "metadata_kind = top_level_json_container_kind(",
    "pcall(cjson.decode, presence_raw)",
  ]);
  const recursiveValueScanner = script.slice(
    script.indexOf("local function skip_json_value"),
    script.indexOf("local function top_level_json_container_kind"),
  );
  for (const fragment of [
    "local seen_keys = {}",
    "local key_start = index",
    "local key_end = skip_json_string",
    "local key_ok, key = pcall(",
    "cjson.decode",
    "if seen_keys[key] then",
    "seen_keys[key] = true",
    "skip_json_value(source, index + 1, depth + 1)",
  ]) {
    assert.match(recursiveValueScanner, new RegExp(
      fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ));
  }
  assertScriptOrder(recursiveValueScanner, [
    "local seen_keys = {}",
    "local key_start = index",
    "local key_end = skip_json_string",
    "local key_ok, key = pcall(",
    "if seen_keys[key] then",
    "seen_keys[key] = true",
    "skip_json_value(source, index + 1, depth + 1)",
  ]);
  const topLevelScanner = script.slice(
    script.indexOf("local function top_level_json_container_kind"),
    script.indexOf("local function is_continuation_byte"),
  );
  for (const fragment of [
    "local seen_keys = {}",
    "local key_start = index",
    "local key_end = skip_json_string",
    "local key_ok, key = pcall(",
    "cjson.decode",
    "if seen_keys[key] then",
    "seen_keys[key] = true",
    "skip_json_value(source, value_start, 1)",
  ]) {
    assert.match(topLevelScanner, new RegExp(
      fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ));
  }
  assertScriptOrder(topLevelScanner, [
    "local seen_keys = {}",
    "local key_start = index",
    "local key_end = skip_json_string",
    "local key_ok, key = pcall(",
    "if seen_keys[key] then",
    "seen_keys[key] = true",
    "skip_json_value(source, value_start, 1)",
  ]);
}

function skipJsonWhitespace(source, index) {
  while (
    source[index] === " "
    || source[index] === "\t"
    || source[index] === "\n"
    || source[index] === "\r"
  ) {
    index += 1;
  }
  return index;
}

function skipJsonStringToken(source, index) {
  if (source[index] !== "\"") {
    throw new Error("expected a JSON string token");
  }
  index += 1;
  while (index < source.length) {
    if (source[index] === "\\") {
      index += 2;
      continue;
    }
    if (source[index] === "\"") return index + 1;
    index += 1;
  }
  throw new Error("unterminated JSON string token");
}

function inspectJsonValueToken(
  source,
  index,
  duplicatePaths,
  path,
) {
  index = skipJsonWhitespace(source, index);
  if (source[index] === "\"") return skipJsonStringToken(source, index);
  if (source[index] === "{") {
    index = skipJsonWhitespace(source, index + 1);
    const seen = new Set();
    while (source[index] !== "}") {
      const keyStart = index;
      const keyEnd = skipJsonStringToken(source, keyStart);
      const key = JSON.parse(source.slice(keyStart, keyEnd));
      if (seen.has(key)) duplicatePaths.push(`${path}.${key}`);
      seen.add(key);
      index = skipJsonWhitespace(source, keyEnd);
      if (source[index] !== ":") {
        throw new Error("JSON object key is missing its value");
      }
      index = inspectJsonValueToken(
        source,
        index + 1,
        duplicatePaths,
        `${path}.${key}`,
      );
      index = skipJsonWhitespace(source, index);
      if (source[index] === "}") break;
      if (source[index] !== ",") {
        throw new Error("JSON object fields are not separated");
      }
      index = skipJsonWhitespace(source, index + 1);
    }
    return index + 1;
  }
  if (source[index] === "[") {
    index = skipJsonWhitespace(source, index + 1);
    let itemIndex = 0;
    while (source[index] !== "]") {
      index = inspectJsonValueToken(
        source,
        index,
        duplicatePaths,
        `${path}[${itemIndex}]`,
      );
      itemIndex += 1;
      index = skipJsonWhitespace(source, index);
      if (source[index] === "]") break;
      if (source[index] !== ",") {
        throw new Error("JSON array items are not separated");
      }
      index = skipJsonWhitespace(source, index + 1);
    }
    return index + 1;
  }
  {
    while (
      index < source.length
      && source[index] !== ","
      && source[index] !== "}"
      && source[index] !== "]"
    ) {
      index += 1;
    }
    return index;
  }
}

function duplicateJsonObjectKeyPaths(source) {
  JSON.parse(source);
  const duplicatePaths = [];
  const end = inspectJsonValueToken(
    source,
    0,
    duplicatePaths,
    "$",
  );
  if (skipJsonWhitespace(source, end) !== source.length) {
    throw new Error("presence JSON has trailing content");
  }
  return duplicatePaths;
}

function createPresenceStateClient({
  presence,
  rawPresence = JSON.stringify(presence),
  pttl,
}) {
  return createScriptedClient({
    handler(command) {
      const parts = evalParts(command);
      if (parts.keys.length === 1) return [1];
      assert.equal(parts.keys.length, 3);
      assertExactLeasedPresenceGuard(parts.script);
      const parsed = JSON.parse(rawPresence);
      const canonical = (
        duplicateJsonObjectKeyPaths(rawPresence).length === 0
        && Array.isArray(parsed.capabilities)
        && parsed.capabilities.length > 0
        && parsed.capabilities.every(
          (capability) => typeof capability === "string",
        )
        && parsed.metadata !== null
        && typeof parsed.metadata === "object"
        && !Array.isArray(parsed.metadata)
        && Number.isSafeInteger(pttl)
        && pttl > 0
      );
      return [canonical ? 3 : 5];
    },
  });
}

function evalParts(command) {
  assert.equal(command[0], "EVAL");
  const keyCount = Number(command[2]);
  return {
    script: command[1],
    keys: command.slice(3, 3 + keyCount),
    args: command.slice(3 + keyCount),
  };
}

function assertScriptOrder(script, needles) {
  const indices = needles.map((needle) => {
    const index = script.indexOf(needle);
    assert.ok(index >= 0, `missing Lua fragment: ${needle}`);
    return index;
  });
  for (let index = 1; index < indices.length; index += 1) {
    assert.ok(indices[index - 1] < indices[index]);
  }
}

function positiveTombstoneGuard(script, {
  key,
  success,
  value,
}) {
  const ttl = `redis.call('PTTL', ${key})`;
  const valueCheck = `${value} == '1'`;
  const ttlIndex = script.indexOf(ttl);
  const valueIndex = script.indexOf(valueCheck);
  const successIndex = script.indexOf(success);
  if (
    ttlIndex < 0
    || valueIndex < 0
    || successIndex < 0
    || valueIndex >= ttlIndex
    || ttlIndex >= successIndex
  ) {
    return false;
  }
  const guard = script.slice(valueIndex, successIndex);
  return (
    /type\([a-z_]+\) ~= 'number'/.test(guard)
    && /[a-z_]+ <= 0/.test(guard)
  );
}

function assertPositiveTombstoneGuard(script, options) {
  assert.equal(positiveTombstoneGuard(script, options), true);
}

function reconciliationIntent(overrides = {}) {
  const identity = ackIdentity();
  return {
    ...identity,
    state: "pending",
    dueAt: 0,
    claimEpoch: 0,
    proof: null,
    reasonCode: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function createReconciliationRepository(intent = reconciliationIntent()) {
  const calls = [];
  let terminal = false;
  const claimedIntent = {
    ...intent,
    state: "claimed",
    claimEpoch: intent.claimEpoch + 1,
  };
  const repository = {
    async list(input) {
      calls.push({ operation: "list", input });
      return {
        intents: terminal ? [] : [intent],
        nextCursor: null,
      };
    },
    async claim(input) {
      calls.push({ operation: "claim", input });
      return {
        status: "claimed",
        claimToken: "ack-claim-token",
        intent: claimedIntent,
      };
    },
    async renew(input) {
      calls.push({ operation: "renew", input });
      return {
        status: "renewed",
        claimToken: input.claimToken,
        intent: claimedIntent,
      };
    },
    async commitTombstone(input) {
      calls.push({ operation: "commitTombstone", input });
      terminal = true;
      return { status: "committed" };
    },
    async commitOrphan(input) {
      calls.push({ operation: "commitOrphan", input });
      terminal = true;
      return { status: "committed" };
    },
    async defer(input) {
      calls.push({ operation: "defer", input });
      return { status: "deferred" };
    },
    async markAckRecoveryRequired(input) {
      calls.push({ operation: "recovery", input });
      terminal = true;
      return { status: "recovery_required" };
    },
    async getAckReconciliationSummary() {
      return {
        total: 1,
        pending: 1,
        claimed: 0,
        deferred: 0,
        committed: 0,
        recoveryRequired: 0,
        proofs: {
          DIRECT_ACK: 0,
          ACK_TOMBSTONE: 0,
          ORPHAN_ACK: 0,
        },
      };
    },
  };
  return { repository, calls };
}

function createAckRuntime(client, intent = reconciliationIntent()) {
  const observed = createReconciliationRepository(intent);
  const transport = Object.freeze({
    async inspectAckTombstone(identity) {
      const command =
        coordinationQueueModule
          .buildCoordinationAckTombstoneInspectionCommand({ identity });
      const reply = await client.sendCommand(command);
      return coordinationQueueModule
        .decodeCoordinationAckTombstoneInspectionReply(reply);
    },
    async finalizeOrphanAck(identity) {
      const command =
        coordinationQueueModule
          .buildCoordinationOrphanAckFinalizationCommand({ identity });
      const reply = await client.sendCommand(command);
      return coordinationQueueModule
        .decodeCoordinationOrphanAckFinalizationReply(reply);
    },
  });
  const reconciler = createCoordinationAckReconciler({
    repository: observed.repository,
    transport,
    clock: () => 1_000,
    config: {
      ownerId: "ack-runtime",
      claimLeaseMs: 100,
      deferMs: 25,
      tombstoneTtlMs: 60_000,
      limit: 1,
    },
  });
  return { ...observed, reconciler };
}

function expectedListAndClaim(intent = reconciliationIntent()) {
  return [
    {
      operation: "list",
      input: {
        cursor: null,
        limit: 1,
        now: 1_000,
      },
    },
    {
      operation: "claim",
      input: {
        consumeKey: intent.consumeKey,
        deliveryId: intent.deliveryId,
        ownerId: "ack-runtime",
        now: 1_000,
        leaseMs: 100,
      },
    },
  ];
}

function expectedOwnedInput(intent = reconciliationIntent()) {
  return {
    consumeKey: intent.consumeKey,
    deliveryId: intent.deliveryId,
    ownerId: "ack-runtime",
    claimToken: "ack-claim-token",
    now: 1_000,
  };
}

function reconciliationResult(overrides = {}) {
  return {
    status: "reconciled",
    inspected: 1,
    claimed: 1,
    busy: 0,
    committed: 0,
    deferred: 0,
    recoveryRequired: 0,
    nextCursor: null,
    ...overrides,
  };
}

function settlementCalls(calls) {
  return calls.filter(({ operation }) => [
    "commitTombstone",
    "commitOrphan",
    "defer",
    "recovery",
  ].includes(operation));
}

function assertSafeRepositoryInputs(calls) {
  for (const { input } of calls) {
    assert.equal(Object.hasOwn(input, "proof"), false);
    assert.equal(Object.hasOwn(input, "body"), false);
    assert.equal(Object.hasOwn(input, "leaseToken"), false);
  }
}

function expectReconciliationFailure(promise) {
  return assert.rejects(
    promise,
    (error) => {
      assert.equal(error instanceof CoordinationAckReconcilerError, true);
      assert.equal(
        error.code,
        "COORDINATION_ACK_RECONCILIATION_FAILED",
      );
      assert.equal(
        error.message,
        "coordination ACK reconciliation failed safely",
      );
      assert.doesNotMatch(
        error.message,
        /token=|private|dependency|projection|100-0|cm:ack:1/,
      );
      return true;
    },
  );
}

function expectQueueCode(promise, code) {
  return assert.rejects(
    promise,
    (err) =>
      err instanceof CoordinationQueueError
      && err.code === code
      && !err.message.includes("sentinel"),
  );
}

test("ack atomically validates pending IDs and writes recipient tombstones", async () => {
  const client = createScriptedClient({ responses: [[1, 2]] });
  const queue = createQueue(client);

  assert.deepEqual(
    await queue.ackInbox(options()),
    { status: "acked", ackedCount: 2 },
  );

  assert.equal(client.commands.length, 1);
  const { script, keys, args } = evalParts(client.commands[0]);
  assert.deepEqual(keys, [
    "agents:coord:v1:presence:pt%3Arecipient",
    "agents:coord:v1:inbox:pt%3Arecipient",
    "agents:coord:v1:events",
    "agents:coord:v1:acked:pt%3Arecipient:100-0",
    "agents:coord:v1:acked:pt%3Arecipient:101-0",
  ]);
  assert.deepEqual(args, [
    "pt:recipient",
    DIGEST,
    "project:v5",
    "coordination-v1",
    "60000",
    "2026-07-25T10:02:00.000Z",
    "2",
    "100-0",
    "101-0",
  ]);
  assert.match(script, /XPENDING/);
  assert.match(script, /XRANGE/);
  assert.match(script, /valid_stored_envelope/);
  assert.match(script, /allowed_message_fields/);
  assert.match(script, /utf16_length/);
  assert.match(script, /classification/);
  assert.match(script, /createdAt/);
  assert.match(script, /XACK/);
  assert.match(script, /XDEL/);
  assert.match(script, /SET[\s\S]*PX/);
  assert.match(script, /message\.acked/);
  assert.match(script, /redis\.pcall\(\s*'XADD'/);
  const pendingIndex = script.lastIndexOf("'XPENDING'");
  const rangeIndex = script.lastIndexOf("'XRANGE'");
  const ackIndex = script.indexOf("'XACK',");
  assert.ok(pendingIndex >= 0);
  assert.ok(rangeIndex >= 0);
  assert.ok(ackIndex >= 0);
  assert.ok(pendingIndex < ackIndex);
  assert.ok(rangeIndex < ackIndex);
  assert.doesNotMatch(script, /MAXLEN|agents:events/);
});

test("ack maps replacement, unknown delivery, and exact retry results", async () => {
  for (const [response, expected] of [
    [[4], { status: "fence_mismatch" }],
    [[6], { status: "delivery_not_found" }],
    [[1, 0], { status: "acked", ackedCount: 0 }],
    [[1, 1], { status: "acked", ackedCount: 1 }],
  ]) {
    const queue = createQueue(
      createScriptedClient({ responses: [response] }),
    );
    assert.deepEqual(await queue.ackInbox(options()), expected);
  }
});

test("ack rejects malformed Lua results and invalid Redis state", async () => {
  const sparse = Array(2);
  sparse[0] = 1;
  for (const response of [
    null,
    [],
    sparse,
    ["1", 2],
    [1],
    [1, -1],
    [1, 3],
    [1, 0.5],
    [1, 1, "extra"],
    [4, "extra"],
    [5],
    [7],
    [99],
  ]) {
    const queue = createQueue(
      createScriptedClient({ responses: [response] }),
    );
    await expectQueueCode(
      queue.ackInbox(options()),
      "COORDINATION_INVALID_DATA",
    );
  }
});

test("ack validates a dense unique bounded batch before Redis", async () => {
  const sparse = Array(1);
  const tooMany = Array.from(
    { length: 101 },
    (_, index) => `${index + 1}-0`,
  );
  const invalidCases = [
    { deliveryIds: [] },
    { deliveryIds: sparse },
    { deliveryIds: ["100-0", "100-0"] },
    { deliveryIds: tooMany },
    { deliveryIds: ["0-0"] },
    { deliveryIds: ["01-0"] },
    { deliveryIds: ["100"] },
    { deliveryIds: ["18446744073709551616-0"] },
    { deliveryIds: ["0-18446744073709551616"] },
    { tombstoneTtlMs: 0 },
    { tombstoneTtlMs: 1.5 },
    { timestamp: "not-a-time" },
    { participantId: "unsafe/id" },
    { fence: fence({ participantId: "pt:other" }) },
  ];

  for (const overrides of invalidCases) {
    const client = createScriptedClient();
    const queue = createQueue(client);
    await assert.rejects(queue.ackInbox(options(overrides)), TypeError);
    assert.equal(client.commands.length, 0);
  }
});

test("ack accepts 100 IDs and the inclusive uint64 boundary", async () => {
  const deliveryIds = Array.from(
    { length: 99 },
    (_, index) => `${index + 1}-0`,
  );
  deliveryIds.push(`${MAX_STREAM_COMPONENT}-${MAX_STREAM_COMPONENT}`);
  const client = createScriptedClient({ responses: [[1, 100]] });
  const queue = createQueue(client);

  assert.deepEqual(
    await queue.ackInbox(options({ deliveryIds })),
    { status: "acked", ackedCount: 100 },
  );
  const { keys, args } = evalParts(client.commands[0]);
  assert.equal(keys.length, 103);
  assert.equal(args[6], "100");
  assert.deepEqual(args.slice(7), deliveryIds);
});

test("the same delivery ID uses independent tombstones for each recipient", async () => {
  const firstClient = createScriptedClient({ responses: [[1, 1]] });
  const secondClient = createScriptedClient({ responses: [[1, 1]] });
  await createQueue(firstClient).ackInbox(options({
    deliveryIds: ["100-0"],
  }));
  await createQueue(secondClient).ackInbox(options({
    participantId: "pt:other",
    deliveryIds: ["100-0"],
    fence: fence({ participantId: "pt:other" }),
  }));

  assert.equal(
    evalParts(firstClient.commands[0]).keys[3],
    "agents:coord:v1:acked:pt%3Arecipient:100-0",
  );
  assert.equal(
    evalParts(secondClient.commands[0]).keys[3],
    "agents:coord:v1:acked:pt%3Aother:100-0",
  );
});

test("foreign Redis errors remain unavailable and do not leak delivery IDs", async () => {
  const queue = createQueue(createScriptedClient({
    responses: [new Error("ERR sentinel 100-0")],
  }));
  await expectQueueCode(
    queue.ackInbox(options()),
    "COORDINATION_UNAVAILABLE",
  );
});

test("ACK recovery build and decode contracts are pure and grant no client authority", () => {
  for (const operation of [
    "buildCoordinationAckTombstoneInspectionCommand",
    "decodeCoordinationAckTombstoneInspectionReply",
    "buildCoordinationOrphanAckFinalizationCommand",
    "decodeCoordinationOrphanAckFinalizationReply",
  ]) {
    assert.equal(typeof coordinationQueueModule[operation], "function");
  }
  const client = createScriptedClient();
  const identity = ackIdentity();
  const inspection =
    coordinationQueueModule
      .buildCoordinationAckTombstoneInspectionCommand({ identity });
  const finalization =
    coordinationQueueModule
      .buildCoordinationOrphanAckFinalizationCommand({
        identity: {
          ...identity,
          tombstoneTtlMs: 60_000,
        },
      });

  assert.equal(inspection[0], "EVAL");
  assert.equal(finalization[0], "EVAL");
  assert.deepEqual(client.commands, []);
  assert.deepEqual(
    coordinationQueueModule
      .decodeCoordinationAckTombstoneInspectionReply([2]),
    { status: "ack_tombstone" },
  );
  assert.deepEqual(
    coordinationQueueModule
      .decodeCoordinationOrphanAckFinalizationReply([1]),
    { status: "orphan_acked" },
  );
});

test("trusted reconciliation inspects tombstones through one typed EVAL", async () => {
  const client = createScriptedClient({ responses: [[2]] });
  const intent = reconciliationIntent();
  const runtime = createAckRuntime(client, intent);

  assert.deepEqual(
    await runtime.reconciler.reconcile(),
    reconciliationResult({ committed: 1 }),
  );
  assert.deepEqual(runtime.calls, [
    ...expectedListAndClaim(intent),
    {
      operation: "commitTombstone",
      input: expectedOwnedInput(intent),
    },
  ]);
  assertSafeRepositoryInputs(runtime.calls);
  assert.deepEqual(
    settlementCalls(runtime.calls).map(({ operation }) => operation),
    ["commitTombstone"],
  );
  assert.equal(client.commands.length, 1);
  const { script, keys, args } = evalParts(client.commands[0]);
  assert.deepEqual(keys, [
    "agents:coord:v1:acked:pt%3Arecipient:100-0",
  ]);
  assert.deepEqual(args, []);
  assert.match(script, /TYPE/);
  assert.match(script, /GET/);
  assert.match(script, /key_type ~= 'string'/);
  assert.doesNotMatch(script, /events|message\.acked|agents:events/);
});

test("trusted orphan finalization is one atomic EVAL bound to the old inbox identity", async () => {
  const client = createScriptedClient({ responses: [[1], [1]] });
  const intent = reconciliationIntent();
  const runtime = createAckRuntime(client, intent);
  const identity = ackIdentity();

  assert.deepEqual(
    await runtime.reconciler.reconcile(),
    reconciliationResult({ committed: 1 }),
  );
  assert.deepEqual(runtime.calls, [
    ...expectedListAndClaim(intent),
    {
      operation: "renew",
      input: {
        ...expectedOwnedInput(intent),
        leaseMs: 100,
      },
    },
    {
      operation: "commitOrphan",
      input: expectedOwnedInput(intent),
    },
  ]);
  assertSafeRepositoryInputs(runtime.calls);
  assert.deepEqual(
    settlementCalls(runtime.calls).map(({ operation }) => operation),
    ["commitOrphan"],
  );

  assert.equal(client.commands.length, 2);
  assert.deepEqual(evalParts(client.commands[0]).args, []);
  const { script, keys, args } = evalParts(client.commands[1]);
  assert.deepEqual(keys, [
    "agents:coord:v1:presence:pt%3Arecipient",
    "agents:coord:v1:inbox:pt%3Arecipient",
    "agents:coord:v1:acked:pt%3Arecipient:100-0",
  ]);
  assert.deepEqual(args, [
    "pt:recipient",
    "project:v5",
    "pt:sender",
    "cm:ack:1",
    identity.consumeKey,
    "coordination-v1",
    "60000",
    "100-0",
  ]);
  assert.match(script, /tombstone/);
  assert.match(script, /presence/);
  assert.match(script, /XPENDING/);
  assert.match(script, /XRANGE/);
  assert.match(script, /fromParticipantId/);
  assert.match(script, /toParticipantId/);
  assert.match(script, /scopeId/);
  assert.match(script, /messageId/);
  assert.match(script, /consume_key/);
  assert.match(script, /XACK/);
  assert.match(script, /XDEL/);
  assert.match(script, /SET[\s\S]*PX/);
  assertScriptOrder(script, [
    "tombstone_raw",
    "presence_raw",
    "'XPENDING'",
    "'XRANGE'",
    "'XACK'",
    "'XDEL'",
  ]);
  const xdelIndex = script.indexOf("'XDEL'");
  const setIndex = script.lastIndexOf("'SET'");
  assert.ok(xdelIndex >= 0);
  assert.ok(setIndex >= 0);
  assert.ok(xdelIndex < setIndex);
  assert.doesNotMatch(script, /events|message\.acked|agents:events/);
  assert.doesNotMatch(script, /leaseToken(?!Hash)/);
});

test("orphan finalization defers live old presence and closes ambiguity as unknown", async () => {
  for (const [response, expectedOperation, expectedResult] of [
    [[2], "commitTombstone", reconciliationResult({ committed: 1 })],
    [[3], "defer", reconciliationResult({ deferred: 1 })],
    [[4], "recovery", reconciliationResult({
      status: "recovery_required",
      recoveryRequired: 1,
    })],
    [[5], "recovery", reconciliationResult({
      status: "recovery_required",
      recoveryRequired: 1,
    })],
  ]) {
    const client = createScriptedClient({
      responses: [[1], response],
    });
    const intent = reconciliationIntent();
    const runtime = createAckRuntime(client, intent);

    assert.deepEqual(
      await runtime.reconciler.reconcile(),
      expectedResult,
    );
    const expectedSettlementInput = expectedOperation === "defer"
      ? {
          ...expectedOwnedInput(intent),
          reasonCode: "OLD_PARTICIPANT_PRESENT",
          retryAt: 1_025,
        }
      : expectedOperation === "recovery"
        ? {
            ...expectedOwnedInput(intent),
            reasonCode: "TRANSPORT_STATE_UNKNOWN",
          }
        : expectedOwnedInput(intent);
    assert.deepEqual(runtime.calls, [
      ...expectedListAndClaim(intent),
      {
        operation: "renew",
        input: {
          ...expectedOwnedInput(intent),
          leaseMs: 100,
        },
      },
      {
        operation: expectedOperation,
        input: expectedSettlementInput,
      },
    ]);
    assertSafeRepositoryInputs(runtime.calls);
    assert.equal(client.commands.length, 2);
    assert.deepEqual(evalParts(client.commands[0]).args, []);
    const { script } = evalParts(client.commands[1]);
    for (const code of [3, 4, 5]) {
      assertScriptOrder(script, [`return {${code}}`, "'XACK'"]);
    }
  }
});

test("hidden recovery identity rejects rebinding, bodies, tokens, and hash mismatch", async () => {
  for (const overrides of [
    { body: "token=private" },
    { leaseToken: "token=private" },
    { claimToken: "claim-private" },
  ]) {
    const client = createScriptedClient();
    const intent = reconciliationIntent(overrides);
    const runtime = createAckRuntime(
      client,
      intent,
    );
    await expectReconciliationFailure(runtime.reconciler.reconcile());
    assert.deepEqual(runtime.calls, [{
      operation: "list",
      input: {
        cursor: null,
        limit: 1,
        now: 1_000,
      },
    }]);
    assert.deepEqual(settlementCalls(runtime.calls), []);
    assertSafeRepositoryInputs(runtime.calls);
    assert.equal(client.commands.length, 0);
  }

  for (const overrides of [
    { oldParticipantId: "pt:new-recipient" },
    { consumeKey: coordinationConsumeKey({
      protocolVersion: 1,
      scopeId: "project:v5",
      fromParticipantId: "pt:sender",
      toParticipantId: "pt:recipient",
      messageId: "cm:other",
    }) },
  ]) {
    const client = createScriptedClient();
    const intent = reconciliationIntent(overrides);
    const runtime = createAckRuntime(
      client,
      intent,
    );
    await expectReconciliationFailure(runtime.reconciler.reconcile());
    assert.deepEqual(runtime.calls, expectedListAndClaim(intent));
    assert.deepEqual(settlementCalls(runtime.calls), []);
    assertSafeRepositoryInputs(runtime.calls);
    assert.equal(client.commands.length, 0);
  }
});

test("malformed ACK recovery replies and Redis errors fail closed without identity leaks", async () => {
  for (const [responses, renewed] of [
    [[null], false],
    [[[]], false],
    [[["1"]], false],
    [[[99]], false],
    [[[1], null], true],
    [[[1], [1, "extra"]], true],
    [[[1], [6]], true],
    [[[1], [99]], true],
  ]) {
    const client = createScriptedClient({ responses: [...responses] });
    const intent = reconciliationIntent();
    const runtime = createAckRuntime(
      client,
      intent,
    );
    await expectReconciliationFailure(runtime.reconciler.reconcile());
    assert.deepEqual(runtime.calls, [
      ...expectedListAndClaim(intent),
      ...(renewed ? [{
        operation: "renew",
        input: {
          ...expectedOwnedInput(intent),
          leaseMs: 100,
        },
      }] : []),
    ]);
    assert.deepEqual(settlementCalls(runtime.calls), []);
    assertSafeRepositoryInputs(runtime.calls);
    assert.equal(client.commands.length, renewed ? 2 : 1);
    assert.deepEqual(evalParts(client.commands[0]).args, []);
  }

  const client = createScriptedClient({
    responses: [new Error("ERR token=secret cm:ack:1 100-0")],
  });
  const intent = reconciliationIntent();
  const runtime = createAckRuntime(client, intent);
  const result = await runtime.reconciler.reconcile();
  assert.deepEqual(result, reconciliationResult({ deferred: 1 }));
  assert.deepEqual(runtime.calls, [
    ...expectedListAndClaim(intent),
    {
      operation: "defer",
      input: {
        ...expectedOwnedInput(intent),
        reasonCode: "TRANSPORT_UNAVAILABLE",
        retryAt: 1_025,
      },
    },
  ]);
  assertSafeRepositoryInputs(runtime.calls);
  assert.equal(client.commands.length, 1);
  assert.deepEqual(evalParts(client.commands[0]).args, []);
  assert.doesNotMatch(JSON.stringify(result), /token=|cm:ack:1|100-0/);
});

test("an ordinary queue holder cannot acquire ACK recovery authority", () => {
  const queue = createQueue(createScriptedClient());
  assert.equal(queue.createAckReconciliationPort, undefined);
  assert.equal(queue.inspectAckTombstone, undefined);
  assert.equal(queue.finalizeOrphanAck, undefined);
  assert.equal(coordinationQueueModule.createAckReconciliationPort, undefined);
  assert.equal(coordinationQueueModule.inspectAckTombstone, undefined);
  assert.equal(coordinationQueueModule.finalizeOrphanAck, undefined);
  assert.equal(
    Reflect.ownKeys(Object.getPrototypeOf(queue))
      .some((key) => /ack.*reconcil|tombstone|orphan/i.test(String(key))),
    false,
  );
});

test("ordinary queue graph cannot reach managed Redis authority", async () => {
  const client = createScriptedClient();
  const clientFactory = () => client;
  const redisUrl = "redis://authority-sentinel.invalid";
  const queue = createRedisCoordinationQueue({
    redisUrl,
    clientFactory,
  });
  const identity = ackIdentity();
  const recoveryCommands = [
    coordinationQueueModule
      .buildCoordinationAckTombstoneInspectionCommand({ identity }),
    coordinationQueueModule
      .buildCoordinationOrphanAckFinalizationCommand({
        identity: {
          ...identity,
          tombstoneTtlMs: 60_000,
        },
      }),
  ];
  const graph = reachableDataGraph([
    { path: "queue", value: queue },
    { path: "module", value: coordinationQueueModule },
  ]);
  const executorPaths = [];
  let managedClientDelivered = false;
  for (const node of graph.nodes) {
    if (node.value === null || typeof node.value !== "object") continue;
    const execute = dataMethod(node.value, "execute");
    if (!execute) continue;
    executorPaths.push(node.path);
    for (const command of recoveryCommands) {
      try {
        await execute.call(node.value, async (managedClient) => {
          managedClientDelivered ||= managedClient === client;
          return managedClient.sendCommand(command);
        });
      } catch {
        // Rejection is not authority; successful callback delivery is.
      }
    }
  }
  await queue.close();

  const forbiddenPaths = graph.values
    .map(({ path }) => path)
    .filter((path) =>
      /clientFactory|clientOptions|redisUrl|commandLane|blockingLane/.test(
        path,
      ))
    .sort();
  const recoveryScripts = new Set(
    recoveryCommands.map((command) => command[1]),
  );
  assert.deepEqual({
    ownKeys: Reflect.ownKeys(queue).map(String).sort(),
    forbiddenPaths,
    clientFactoryReachable: graph.values.some(
      ({ value }) => value === clientFactory,
    ),
    redisUrlReachable: graph.values.some(({ value }) => value === redisUrl),
    executorPaths: executorPaths.sort(),
    managedClientDelivered,
    recoveryEvalCount: client.commands.filter(
      (command) =>
        command[0] === "EVAL"
        && recoveryScripts.has(command[1]),
    ).length,
  }, {
    ownKeys: [],
    forbiddenPaths: [],
    clientFactoryReachable: false,
    redisUrlReachable: false,
    executorPaths: [],
    managedClientDelivered: false,
    recoveryEvalCount: 0,
  });
});

test("lifecycle projection and operations never dispatch replaceable lane prototype methods", async (context) => {
  await context.test("snapshot captures no lane or raw authority", async () => {
    const client = createScriptedClient({
      handler(command) {
        if (
          command[0] === "ECHO"
          && command[1] === "trial-5-snapshot-authority"
        ) {
          return "RAW_OK";
        }
        throw new Error("unexpected fake command");
      },
    });
    const queue = createQueue(client);
    const descriptor = Object.getOwnPropertyDescriptor(
      RedisClientLane.prototype,
      "snapshot",
    );
    let capturedLane;
    let rawResult;
    Object.defineProperty(RedisClientLane.prototype, "snapshot", {
      ...descriptor,
      value() {
        capturedLane = this;
        return descriptor.value.call(this);
      },
    });
    try {
      queue.lifecycle();
    } finally {
      Object.defineProperty(
        RedisClientLane.prototype,
        "snapshot",
        descriptor,
      );
    }

    if (capturedLane) {
      rawResult = await capturedLane.execute((managedClient) =>
        managedClient.sendCommand([
          "ECHO",
          "trial-5-snapshot-authority",
        ]));
    }
    await queue.close();
    assert.deepEqual({
      laneCaptured: capturedLane !== undefined,
      rawResult,
      commands: client.commands,
    }, {
      laneCaptured: false,
      rawResult: undefined,
      commands: [],
    });
  });

  for (const blocking of [false, true]) {
    await context.test(
      `${blocking ? "blocking" : "command"} execution uses private authority`,
      async () => {
        const client = createScriptedClient({
          handler(command) {
            if (command[0] === "PING") return "PONG";
            if (command[0] === "EVAL") return 0;
            if (command[0] === "XREADGROUP") return null;
            throw new Error("unexpected fake command");
          },
        });
        const rawCommands = [];
        const replacedKinds = [];
        const rawClient = {
          async sendCommand(command) {
            rawCommands.push(structuredClone(command));
            if (command[0] === "PING") return "PONG";
            if (command[0] === "EVAL") return 0;
            if (command[0] === "XREADGROUP") return null;
            throw new Error("unexpected raw command");
          },
        };
        const queue = createQueue(client);
        const descriptor = Object.getOwnPropertyDescriptor(
          RedisClientLane.prototype,
          "execute",
        );
        Object.defineProperty(RedisClientLane.prototype, "execute", {
          ...descriptor,
          value(operation) {
            replacedKinds.push(this.kind);
            return operation(rawClient);
          },
        });
        let result;
        try {
          result = blocking
            ? await queue.readInbox({
                participantId: "pt:recipient",
                consumerId: "consumer-trial-5",
                count: 1,
                reclaimIdleMs: null,
                blockMs: 1,
                now: 0,
                fence: fence(),
              })
            : await queue.ping();
        } finally {
          Object.defineProperty(
            RedisClientLane.prototype,
            "execute",
            descriptor,
          );
          await queue.close();
        }

        assert.deepEqual(result, blocking
          ? { status: "read", deliveries: [] }
          : { status: "ready" });
        assert.deepEqual(replacedKinds, []);
        assert.deepEqual(rawCommands, []);
        assert.deepEqual(
          client.commands.map((command) => command[0]),
          blocking
            ? ["EVAL", "XREADGROUP", "EVAL"]
            : ["PING"],
        );
      },
    );
  }

  await context.test("close uses private authority for both lanes", async () => {
    const client = createScriptedClient({
      handler(command) {
        if (
          command[0] === "ECHO"
          && command[1] === "trial-5-close-authority"
        ) {
          return "RAW_OK";
        }
        throw new Error("unexpected fake command");
      },
    });
    const queue = createQueue(client);
    const closeDescriptor = Object.getOwnPropertyDescriptor(
      RedisClientLane.prototype,
      "close",
    );
    const executeDescriptor = Object.getOwnPropertyDescriptor(
      RedisClientLane.prototype,
      "execute",
    );
    const capturedKinds = [];
    const rawResults = [];
    Object.defineProperty(RedisClientLane.prototype, "close", {
      ...closeDescriptor,
      async value() {
        capturedKinds.push(this.kind);
        rawResults.push(await executeDescriptor.value.call(
          this,
          (managedClient) => managedClient.sendCommand([
            "ECHO",
            "trial-5-close-authority",
          ]),
        ));
        return closeDescriptor.value.call(this);
      },
    });
    try {
      assert.deepEqual(await queue.close(), { status: "closed" });
    } finally {
      Object.defineProperty(
        RedisClientLane.prototype,
        "close",
        closeDescriptor,
      );
    }

    assert.deepEqual(capturedKinds, []);
    assert.deepEqual(rawResults, []);
    assert.deepEqual(client.commands, []);
  });
});

test("ordinary queue constrained operations expose only frozen safe projections", async () => {
  const client = createScriptedClient({
    handler(command) {
      if (command[0] === "PING") return "PONG";
      if (command[0] === "EVAL") return [1, 1];
      throw new Error("unexpected fake command");
    },
  });
  const queue = createQueue(client);
  const description = queue.describe();
  const lifecycle = queue.lifecycle();
  const recoveryScripts = new Set([
    coordinationQueueModule
      .buildCoordinationAckTombstoneInspectionCommand({
        identity: ackIdentity(),
      })[1],
    coordinationQueueModule
      .buildCoordinationOrphanAckFinalizationCommand({
        identity: {
          ...ackIdentity(),
          tombstoneTtlMs: 60_000,
        },
      })[1],
  ]);

  assert.equal(queue.enabled, true);
  assert.deepEqual(await queue.ping(), { status: "ready" });
  assert.deepEqual(
    await queue.ackInbox(options({ deliveryIds: ["100-0"] })),
    { status: "acked", ackedCount: 1 },
  );
  assert.deepEqual({
    descriptionFrozen: Object.isFrozen(description),
    lifecycleFrozen: Object.isFrozen(lifecycle),
    commandProjectionFrozen: Object.isFrozen(lifecycle.command),
    blockingProjectionFrozen: Object.isFrozen(lifecycle.blocking),
    descriptionKeys: Object.keys(description).sort(),
    lifecycleKeys: Object.keys(lifecycle).sort(),
    commands: client.commands.map((command) => command[0]),
    recoveryEvalCount: client.commands.filter(
      (command) =>
        command[0] === "EVAL"
        && recoveryScripts.has(command[1]),
    ).length,
  }, {
    descriptionFrozen: true,
    lifecycleFrozen: true,
    commandProjectionFrozen: true,
    blockingProjectionFrozen: true,
    descriptionKeys: [
      "consumerGroup",
      "enabled",
      "eventsStream",
      "prefix",
    ],
    lifecycleKeys: ["blocking", "command", "state"],
    commands: ["PING", "EVAL"],
    recoveryEvalCount: 0,
  });
  await queue.close();
});

test("queue namespace cannot export caller-injectable ACK recovery composition", () => {
  assert.equal(
    coordinationQueueModule.createRedisCoordinationAckRuntime,
    undefined,
  );
  assert.equal(
    coordinationQueueModule.createAckReconciliationPort,
    undefined,
  );
});

test("all tombstone proof paths require exact value and positive PTTL", async () => {
  const client = createScriptedClient({ responses: [[5]] });
  const queue = createQueue(client);
  await expectQueueCode(
    queue.ackInbox(options({ deliveryIds: ["100-0"] })),
    "COORDINATION_INVALID_DATA",
  );
  const directScript = evalParts(client.commands[0]).script;
  const inspectScript = evalParts(
    coordinationQueueModule
      .buildCoordinationAckTombstoneInspectionCommand({
        identity: ackIdentity(),
      }),
  ).script;
  const finalizerScript = evalParts(
    coordinationQueueModule
      .buildCoordinationOrphanAckFinalizationCommand({
        identity: {
          ...ackIdentity(),
          tombstoneTtlMs: 60_000,
        },
      }),
  ).script;

  assertPositiveTombstoneGuard(directScript, {
    key: "tombstone_key",
    value: "tombstone",
    success: "local pending = redis.pcall(",
  });
  assertPositiveTombstoneGuard(inspectScript, {
    key: "KEYS[1]",
    value: "value",
    success: "return {2}",
  });
  assertPositiveTombstoneGuard(finalizerScript, {
    key: "KEYS[3]",
    value: "tombstone_raw",
    success: "return {2}",
  });
});

test("wrong-type tombstones are corrupt state rather than transient transport failure", async () => {
  const client = createScriptedClient({ responses: [[3]] });
  const intent = reconciliationIntent();
  const runtime = createAckRuntime(client, intent);

  assert.deepEqual(
    await runtime.reconciler.reconcile(),
    reconciliationResult({
      status: "recovery_required",
      recoveryRequired: 1,
    }),
  );
  assert.deepEqual(runtime.calls, [
    ...expectedListAndClaim(intent),
    {
      operation: "recovery",
      input: {
        ...expectedOwnedInput(intent),
        reasonCode: "TRANSPORT_STATE_UNKNOWN",
      },
    },
  ]);
  assertSafeRepositoryInputs(runtime.calls);
  assert.deepEqual(
    settlementCalls(runtime.calls).map(({ operation }) => operation),
    ["recovery"],
  );
  const { script, args } = evalParts(client.commands[0]);
  assert.deepEqual(args, []);
  assert.match(script, /TYPE/);
  assert.match(script, /key_type ~= 'string'/);
});

test("repeated corrupt tombstone reconciliation reaches one terminal outcome", async () => {
  const client = createScriptedClient({ responses: [[3]] });
  const intent = reconciliationIntent();
  const runtime = createAckRuntime(client, intent);

  assert.deepEqual(
    await runtime.reconciler.reconcile(),
    reconciliationResult({
      status: "recovery_required",
      recoveryRequired: 1,
    }),
  );
  assert.deepEqual(await runtime.reconciler.reconcile(), {
    status: "reconciled",
    inspected: 0,
    claimed: 0,
    busy: 0,
    committed: 0,
    deferred: 0,
    recoveryRequired: 0,
    nextCursor: null,
  });
  assert.equal(client.commands.length, 1);
  assert.deepEqual(evalParts(client.commands[0]).args, []);
  assert.deepEqual(runtime.calls, [
    ...expectedListAndClaim(intent),
    {
      operation: "recovery",
      input: {
        ...expectedOwnedInput(intent),
        reasonCode: "TRANSPORT_STATE_UNKNOWN",
      },
    },
    {
      operation: "list",
      input: {
        cursor: null,
        limit: 1,
        now: 1_000,
      },
    },
  ]);
  assertSafeRepositoryInputs(runtime.calls);
});

test("orphan finalization recognizes only a complete canonical live presence", async () => {
  const client = createScriptedClient({ responses: [[1], [3]] });
  const intent = reconciliationIntent();
  const runtime = createAckRuntime(client, intent);

  assert.deepEqual(
    await runtime.reconciler.reconcile(),
    reconciliationResult({ deferred: 1 }),
  );
  assert.deepEqual(runtime.calls, [
    ...expectedListAndClaim(intent),
    {
      operation: "renew",
      input: {
        ...expectedOwnedInput(intent),
        leaseMs: 100,
      },
    },
    {
      operation: "defer",
      input: {
        ...expectedOwnedInput(intent),
        reasonCode: "OLD_PARTICIPANT_PRESENT",
        retryAt: 1_025,
      },
    },
  ]);
  assertSafeRepositoryInputs(runtime.calls);
  assert.deepEqual(evalParts(client.commands[0]).args, []);
  const { script } = evalParts(client.commands[1]);
  assert.match(script, /allowed_presence_fields/);
  assert.match(script, /valid_capabilities/);
  assert.match(script, /valid_metadata/);
  assert.match(script, /participantType/);
  assert.match(script, /leaseTokenHash/);
  assert.match(script, /for key, _ in pairs\(presence\)/);
});

test("orphan finalizer parses exact JSON container tokens and positive lease", () => {
  const command =
    coordinationQueueModule
      .buildCoordinationOrphanAckFinalizationCommand({
        identity: {
          ...ackIdentity(),
          tombstoneTtlMs: 60_000,
        },
      });
  assertExactLeasedPresenceGuard(evalParts(command).script);
});

test("presence shape and lease corruption converges once while leased canonical presence defers", async () => {
  const corruptCases = [
    {
      label: "empty-object capabilities",
      presence: canonicalPresence({
        displayName: "decoy \"capabilities\":[]",
        capabilities: {},
      }),
      pttl: 5_000,
    },
    {
      label: "empty-array metadata",
      presence: canonicalPresence({
        displayName: "decoy \"metadata\":{}",
        metadata: [],
      }),
      pttl: 5_000,
    },
    {
      label: "persistent canonical-looking presence",
      presence: canonicalPresence(),
      pttl: -1,
    },
    {
      label: "non-positive presence lease",
      presence: canonicalPresence(),
      pttl: 0,
    },
  ];
  for (const { label, presence, pttl } of corruptCases) {
    const client = createPresenceStateClient({ presence, pttl });
    const intent = reconciliationIntent();
    const runtime = createAckRuntime(client, intent);

    assert.deepEqual(
      await runtime.reconciler.reconcile(),
      reconciliationResult({
        status: "recovery_required",
        recoveryRequired: 1,
      }),
      label,
    );
    assert.deepEqual(await runtime.reconciler.reconcile(), {
      status: "reconciled",
      inspected: 0,
      claimed: 0,
      busy: 0,
      committed: 0,
      deferred: 0,
      recoveryRequired: 0,
      nextCursor: null,
    }, label);
    assert.deepEqual(runtime.calls, [
      ...expectedListAndClaim(intent),
      {
        operation: "renew",
        input: {
          ...expectedOwnedInput(intent),
          leaseMs: 100,
        },
      },
      {
        operation: "recovery",
        input: {
          ...expectedOwnedInput(intent),
          reasonCode: "TRANSPORT_STATE_UNKNOWN",
        },
      },
      {
        operation: "list",
        input: {
          cursor: null,
          limit: 1,
          now: 1_000,
        },
      },
    ], label);
    assertSafeRepositoryInputs(runtime.calls);
    assert.equal(client.commands.length, 2, label);
  }

  const client = createPresenceStateClient({
    presence: canonicalPresence(),
    pttl: 5_000,
  });
  const intent = reconciliationIntent();
  const runtime = createAckRuntime(client, intent);
  assert.deepEqual(
    await runtime.reconciler.reconcile(),
    reconciliationResult({ deferred: 1 }),
  );
  assert.deepEqual(runtime.calls, [
    ...expectedListAndClaim(intent),
    {
      operation: "renew",
      input: {
        ...expectedOwnedInput(intent),
        leaseMs: 100,
      },
    },
    {
      operation: "defer",
      input: {
        ...expectedOwnedInput(intent),
        reasonCode: "OLD_PARTICIPANT_PRESENT",
        retryAt: 1_025,
      },
    },
  ]);
  assertSafeRepositoryInputs(runtime.calls);
  assert.equal(client.commands.length, 2);
});

test("direct and orphan settlement share one bounded canonical JSON contract", async () => {
  const client = createScriptedClient({ responses: [[5]] });
  await expectQueueCode(
    createQueue(client).ackInbox(options({
      deliveryIds: ["100-0"],
    })),
    "COORDINATION_INVALID_DATA",
  );
  const directScript = evalParts(client.commands[0]).script;
  const orphanScript = evalParts(
    coordinationQueueModule
      .buildCoordinationOrphanAckFinalizationCommand({
        identity: {
          ...ackIdentity(),
          tombstoneTtlMs: 60_000,
        },
      }),
  ).script;
  const directContract = canonicalJsonContractSlice(directScript);
  const orphanContract = canonicalJsonContractSlice(orphanScript);

  assert.notEqual(directContract, null);
  assert.equal(directContract, orphanContract);
  assertBoundedCanonicalJsonContract(directScript);
  assertBoundedCanonicalJsonContract(orphanScript);
});

function escapedJsonKeyToken(key) {
  const lastIndex = key.length - 1;
  const escapedCodeUnit = key
    .charCodeAt(lastIndex)
    .toString(16)
    .padStart(4, "0");
  const token = `"${key.slice(0, lastIndex)}\\u${escapedCodeUnit}"`;
  assert.equal(JSON.parse(token), key);
  return token;
}

function replaceUniqueRawFragment(source, fragment, replacement) {
  const index = source.indexOf(fragment);
  assert.ok(index >= 0, `missing raw JSON fragment: ${fragment}`);
  assert.equal(source.indexOf(fragment, index + fragment.length), -1);
  return source.slice(0, index)
    + replacement
    + source.slice(index + fragment.length);
}

function rawJsonWithDuplicateTopLevelField(value, field) {
  const fieldToken = JSON.stringify(field);
  const valueToken = JSON.stringify(value[field]);
  const fragment = `${fieldToken}:${valueToken}`;
  return replaceUniqueRawFragment(
    JSON.stringify(value),
    fragment,
    `${fieldToken}:null,${escapedJsonKeyToken(field)}:${valueToken}`,
  );
}

function rawPresenceWithDuplicateTopLevelField(presence, field) {
  return rawJsonWithDuplicateTopLevelField(presence, field);
}

async function assertDuplicatePresenceConverges({
  duplicatePath,
  label,
  presence,
  rawPresence,
}) {
  assert.deepEqual(JSON.parse(rawPresence), presence, label);
  assert.deepEqual(
    duplicateJsonObjectKeyPaths(rawPresence),
    [duplicatePath],
    label,
  );
  const client = createPresenceStateClient({
    presence,
    rawPresence,
    pttl: 5_000,
  });
  const intent = reconciliationIntent();
  const runtime = createAckRuntime(client, intent);
  assert.deepEqual(
    await runtime.reconciler.reconcile(),
    reconciliationResult({
      status: "recovery_required",
      recoveryRequired: 1,
    }),
    label,
  );
  assert.deepEqual(await runtime.reconciler.reconcile(), {
    status: "reconciled",
    inspected: 0,
    claimed: 0,
    busy: 0,
    committed: 0,
    deferred: 0,
    recoveryRequired: 0,
    nextCursor: null,
  }, label);
  assert.deepEqual(runtime.calls, [
    ...expectedListAndClaim(intent),
    {
      operation: "renew",
      input: {
        ...expectedOwnedInput(intent),
        leaseMs: 100,
      },
    },
    {
      operation: "recovery",
      input: {
        ...expectedOwnedInput(intent),
        reasonCode: "TRANSPORT_STATE_UNKNOWN",
      },
    },
    {
      operation: "list",
      input: {
        cursor: null,
        limit: 1,
        now: 1_000,
      },
    },
  ], label);
  assertSafeRepositoryInputs(runtime.calls);
  assert.equal(client.commands.length, 2, label);
}

test("duplicate JSON object keys across every presence field are terminal corruption", async (context) => {
  const presence = canonicalPresence();
  const relevantFields = [
    "protocolVersion",
    "participantId",
    "participantType",
    "scopeId",
    "displayName",
    "capabilities",
    "metadata",
    "registeredAt",
    "lastHeartbeatAt",
    "leaseExpiresAt",
    "leaseTokenHash",
  ];
  assert.deepEqual(Object.keys(presence), relevantFields);
  for (const field of relevantFields) {
    await context.test(`top-level ${field}`, async () => {
      await assertDuplicatePresenceConverges({
        duplicatePath: `$.${field}`,
        label: `duplicate top-level ${field}`,
        presence,
        rawPresence: rawPresenceWithDuplicateTopLevelField(
          presence,
          field,
        ),
      });
    });
  }
});

test("duplicate JSON object keys nested through metadata are terminal corruption", async (context) => {
  for (const {
    duplicatePath,
    fragment,
    label,
    presence,
    replacement,
  } of [
    {
      duplicatePath: "$.metadata.protocol",
      fragment: "\"protocol\":\"KYA\"",
      label: "direct metadata object",
      presence: canonicalPresence({
        metadata: { protocol: "KYA" },
      }),
      replacement:
        "\"protocol\":null,\"prot\\u006fcol\":\"KYA\"",
    },
    {
      duplicatePath: "$.metadata.routing.layers[0].protocol",
      fragment: "\"protocol\":\"KYA\"",
      label: "object reached through nested object and array",
      presence: canonicalPresence({
        metadata: {
          routing: {
            layers: [{ protocol: "KYA" }],
          },
        },
      }),
      replacement:
        "\"protocol\":null,\"prot\\u006fcol\":\"KYA\"",
    },
  ]) {
    await context.test(label, async () => {
      await assertDuplicatePresenceConverges({
        duplicatePath,
        label,
        presence,
        rawPresence: replaceUniqueRawFragment(
          JSON.stringify(presence),
          fragment,
          replacement,
        ),
      });
    });
  }
});

test("ACK recovery rejects accessor-backed queue replies without rereading them", async () => {
  for (const finalizer of [false, true]) {
    const reply = [];
    let reads = 0;
    Object.defineProperty(reply, 0, {
      enumerable: true,
      get() {
        reads += 1;
        return 1;
      },
    });
    const client = createScriptedClient({
      responses: finalizer ? [[1], reply] : [reply],
    });
    const intent = reconciliationIntent();
    const runtime = createAckRuntime(client, intent);

    await expectReconciliationFailure(runtime.reconciler.reconcile());
    assert.deepEqual(runtime.calls, [
      ...expectedListAndClaim(intent),
      ...(finalizer ? [{
        operation: "renew",
        input: {
          ...expectedOwnedInput(intent),
          leaseMs: 100,
        },
      }] : []),
    ]);
    assert.deepEqual(settlementCalls(runtime.calls), []);
    assertSafeRepositoryInputs(runtime.calls);
    assert.equal(client.commands.length, finalizer ? 2 : 1);
    assert.deepEqual(evalParts(client.commands[0]).args, []);
    assert.ok(reads <= 1);
  }
});
