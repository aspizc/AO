import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  createCoordinationAckReconciler,
} from "../../gateway/src/core/coordination_ack_reconciler.js";
import {
  CoordinationQueueError,
  buildCoordinationAckTombstoneInspectionCommand,
  buildCoordinationOrphanAckFinalizationCommand,
  createRedisCoordinationQueue,
  decodeCoordinationAckTombstoneInspectionReply,
  decodeCoordinationOrphanAckFinalizationReply,
} from "../../gateway/src/core/coordination_queue.js";
import {
  coordinationKeys,
} from "../../gateway/src/core/coordination_contract.js";
import {
  coordinationConsumeKey,
} from "../../gateway/src/core/coordination_consumer.js";
import {
  withEphemeralRedis,
} from "./helpers/ephemeral_redis.js";

const CONSUMER_GROUP = "coordination-v1";
const DIGEST = "a".repeat(64);
const JSON_MAX_BYTES = 262_144;
const JSON_MAX_STRING_BYTES = 131_072;
const testNamePattern = process.execArgv.find(
  (argument) => argument.startsWith("--test-name-pattern="),
) ?? "";
const LUA_MUTANT = /MUTANT:([a-z-]+)/.exec(testNamePattern)?.[1] ?? "";
const LUA_MUTANTS = new Set([
  "",
  "tombstone-value",
  "tombstone-ttl",
  "json-bytes",
  "json-work",
  "json-string",
  "json-depth",
  "json-duplicate",
]);
let mutationApplications = 0;

assert.ok(LUA_MUTANTS.has(LUA_MUTANT), "unknown ACK Lua mutant");

function replaceMutation(source, search, replacement) {
  if (!source.includes(search)) return source;
  mutationApplications += source.split(search).length - 1;
  return source.replaceAll(search, replacement);
}

function mutateLua(script) {
  if (LUA_MUTANT === "tombstone-value") {
    let mutated = script;
    for (const [search, replacement] of [
      ["if tombstone == '1' then", "if tombstone then"],
      ["if value == '1' then", "if value then"],
      ["if tombstone_raw == '1' then", "if tombstone_raw then"],
    ]) {
      mutated = replaceMutation(mutated, search, replacement);
    }
    return mutated;
  }
  if (LUA_MUTANT === "tombstone-ttl") {
    let mutated = replaceMutation(
      script,
      "    if type(tombstone_ttl) ~= 'number'"
        + " or tombstone_ttl <= 0 then\n"
        + "      return {5}\n"
        + "    end\n",
      "",
    );
    mutated = replaceMutation(
      mutated,
      "  if type(tombstone_ttl) ~= 'number'"
        + " or tombstone_ttl <= 0 then\n"
        + "    return {3}\n"
        + "  end\n",
      "",
    );
    return mutated;
  }
  if (LUA_MUTANT === "json-bytes") {
    return replaceMutation(
      script,
      "\n    or string.len(source) > JSON_MAX_BYTES",
      "",
    );
  }
  if (LUA_MUTANT === "json-work") {
    return replaceMutation(
      script,
      "local work = { remaining = JSON_MAX_WORK }",
      "local work = { remaining = 2147483647 }",
    );
  }
  if (LUA_MUTANT === "json-string") {
    return replaceMutation(
      script,
      "if index - start > JSON_MAX_STRING_BYTES\n"
        + "      or not consume_json_work(work) then",
      "if not consume_json_work(work) then",
    );
  }
  if (LUA_MUTANT === "json-depth") {
    return replaceMutation(
      script,
      "if depth > JSON_MAX_DEPTH or not consume_json_work(work) then",
      "if not consume_json_work(work) then",
    );
  }
  if (LUA_MUTANT === "json-duplicate") {
    return replaceMutation(
      script,
      "if seen_keys[key] then\n"
        + "        return nil\n"
        + "      end",
      "if seen_keys[key] then\n"
        + "        seen_keys[key] = seen_keys[key]\n"
        + "      end",
    );
  }
  return script;
}

function mutateCommand(command) {
  if (
    !LUA_MUTANT
    || command[0] !== "EVAL"
    || typeof command[1] !== "string"
  ) {
    return command;
  }
  const mutated = [...command];
  mutated[1] = mutateLua(mutated[1]);
  return mutated;
}

function participantPresence(overrides = {}) {
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

function storedEnvelope(overrides = {}) {
  return {
    protocolVersion: 1,
    messageId: "cm:ack:1",
    fromParticipantId: "pt:sender",
    toParticipantId: "pt:recipient",
    scopeId: "project:v5",
    messageType: "ACK",
    classification: "internal",
    body: "{\"status\":\"reviewed\"}",
    createdAt: "2026-07-25T10:00:00.000Z",
    traceId: "trace:ack:1",
    correlationId: "correlation:ack:1",
    replyToMessageId: "cm:request:1",
    ...overrides,
  };
}

function ackIdentity(deliveryId) {
  const identity = {
    deliveryId,
    scopeId: "project:v5",
    fromParticipantId: "pt:sender",
    oldParticipantId: "pt:recipient",
    messageId: "cm:ack:1",
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

function ackOptions(deliveryId) {
  return {
    participantId: "pt:recipient",
    deliveryIds: [deliveryId],
    tombstoneTtlMs: 60_000,
    timestamp: "2026-07-25T10:02:00.000Z",
    fence: {
      participantId: "pt:recipient",
      scopeId: "project:v5",
      leaseTokenHash: DIGEST,
    },
  };
}

function testPrefix(label) {
  const safeLabel = label.replace(/[^A-Za-z0-9:_-]/g, "-");
  return `agents:test:v5:ack5:${safeLabel}:${crypto.randomUUID()}`;
}

function queueClientFactory(createClient) {
  return () => {
    const client = createClient();
    if (!LUA_MUTANT) return client;
    const sendCommand = client.sendCommand.bind(client);
    Object.defineProperty(client, "sendCommand", {
      configurable: true,
      value(command, options) {
        return sendCommand(mutateCommand(command), options);
      },
    });
    return client;
  };
}

async function runCommand(client, command) {
  return client.sendCommand(mutateCommand(command));
}

async function setPresence(client, keys, raw = null) {
  await client.sendCommand([
    "SET",
    keys.presence("pt:recipient"),
    raw ?? JSON.stringify(participantPresence()),
    "PX",
    "60000",
  ]);
}

async function createInboxGroup(client, inboxKey) {
  assert.equal(
    await client.sendCommand([
      "XGROUP",
      "CREATE",
      inboxKey,
      CONSUMER_GROUP,
      "0",
      "MKSTREAM",
    ]),
    "OK",
  );
}

async function appendEnvelope(client, inboxKey, rawEnvelope, {
  pending = true,
} = {}) {
  const deliveryId = await client.sendCommand([
    "XADD",
    inboxKey,
    "*",
    "envelope",
    rawEnvelope,
  ]);
  if (pending) {
    const read = await client.sendCommand([
      "XREADGROUP",
      "GROUP",
      CONSUMER_GROUP,
      "consumer-ack-5",
      "COUNT",
      "1",
      "STREAMS",
      inboxKey,
      ">",
    ]);
    assert.equal(read[0][1][0][0], deliveryId);
  }
  return deliveryId;
}

async function prepareDelivery(client, prefix, rawEnvelope, options = {}) {
  const keys = coordinationKeys(prefix);
  const inboxKey = keys.inbox("pt:recipient");
  await createInboxGroup(client, inboxKey);
  const deliveryId = await appendEnvelope(
    client,
    inboxKey,
    rawEnvelope,
    options,
  );
  return { deliveryId, inboxKey, keys };
}

async function prepareZeroTtlDelivery(client, prefix, rawEnvelope) {
  const keys = coordinationKeys(prefix);
  const inboxKey = keys.inbox("pt:recipient");
  await createInboxGroup(client, inboxKey);
  await appendEnvelope(
    client,
    inboxKey,
    JSON.stringify(storedEnvelope({ messageId: "cm:sentinel" })),
  );
  const deliveryId = await appendEnvelope(
    client,
    inboxKey,
    rawEnvelope,
    { pending: false },
  );
  return { deliveryId, inboxKey, keys };
}

async function tombstoneSnapshot(client, key) {
  const type = await client.sendCommand(["TYPE", key]);
  const pttl = await client.sendCommand(["PTTL", key]);
  if (type === "string") {
    return {
      type,
      pttl,
      value: await client.sendCommand(["GET", key]),
    };
  }
  if (type === "hash") {
    return {
      type,
      pttl,
      value: await client.sendCommand(["HGETALL", key]),
    };
  }
  return { type, pttl, value: null };
}

async function settlementSnapshot(
  client,
  { deliveryId, inboxKey, keys },
) {
  const pending = await client.sendCommand([
    "XPENDING",
    inboxKey,
    CONSUMER_GROUP,
    deliveryId,
    deliveryId,
    "10",
  ]);
  const pendingSummary = await client.sendCommand([
    "XPENDING",
    inboxKey,
    CONSUMER_GROUP,
  ]);
  return {
    rows: await client.sendCommand([
      "XRANGE",
      inboxKey,
      deliveryId,
      deliveryId,
    ]),
    pending,
    pendingTotal: pendingSummary[0],
    tombstone: await tombstoneSnapshot(
      client,
      keys.acked("pt:recipient", deliveryId),
    ),
    eventsLength: await client.sendCommand(["XLEN", keys.events]),
  };
}

function createRecordingRepository(deliveryId) {
  const calls = [];
  let terminal = false;
  const identity = ackIdentity(deliveryId);
  const intent = {
    ...identity,
    state: "pending",
    dueAt: 0,
    claimEpoch: 0,
    proof: null,
    reasonCode: null,
    createdAt: 0,
    updatedAt: 0,
  };
  const claimed = {
    ...intent,
    state: "claimed",
    claimEpoch: 1,
  };
  const repository = {
    async list(input) {
      calls.push({ operation: "list", input });
      return { intents: terminal ? [] : [intent], nextCursor: null };
    },
    async claim(input) {
      calls.push({ operation: "claim", input });
      return {
        status: "claimed",
        claimToken: "ack-claim-token",
        intent: claimed,
      };
    },
    async renew(input) {
      calls.push({ operation: "renew", input });
      return {
        status: "renewed",
        claimToken: input.claimToken,
        intent: claimed,
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
  return { calls, repository };
}

function createRealTransport(client, {
  afterInspect = null,
  executeFinalizer = null,
  executeInspection = null,
  prefix,
} = {}) {
  return {
    async inspectAckTombstone(identity) {
      const command =
        buildCoordinationAckTombstoneInspectionCommand({
          identity,
          prefix,
        });
      const reply = executeInspection
        ? await executeInspection(command)
        : await runCommand(client, command);
      const decoded =
        decodeCoordinationAckTombstoneInspectionReply(reply);
      if (afterInspect) await afterInspect(decoded);
      return decoded;
    },
    async finalizeOrphanAck(identity) {
      const command =
        buildCoordinationOrphanAckFinalizationCommand({
          identity,
          prefix,
        });
      const reply = executeFinalizer
        ? await executeFinalizer(command)
        : await runCommand(client, command);
      return decodeCoordinationOrphanAckFinalizationReply(reply);
    },
  };
}

async function reconcileWithRedis(
  client,
  deliveryId,
  prefix,
  transportOptions = {},
) {
  const recorded = createRecordingRepository(deliveryId);
  const reconciler = createCoordinationAckReconciler({
    repository: recorded.repository,
    transport: createRealTransport(client, {
      ...transportOptions,
      prefix,
    }),
    clock: () => 1_000,
    config: {
      ownerId: "ack-redis-trial-5",
      claimLeaseMs: 100,
      deferMs: 25,
      tombstoneTtlMs: 60_000,
      limit: 1,
    },
  });
  return {
    ...recorded,
    reconciler,
    result: await reconciler.reconcile(),
  };
}

function proofCommits(calls) {
  return calls
    .filter(({ operation }) => (
      operation === "commitTombstone"
      || operation === "commitOrphan"
    ))
    .map(({ operation }) => operation);
}

function stablePending(pending) {
  return pending.map((row) => [row[0], row[1], row[3]]);
}

function assertPendingUnchanged(afterState, beforeState, label) {
  assert.deepEqual(
    stablePending(afterState.pending),
    stablePending(beforeState.pending),
    label,
  );
  assert.equal(
    afterState.pendingTotal,
    beforeState.pendingTotal,
    label,
  );
}

async function waitUntilExpired(client, key) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await client.sendCommand(["PTTL", key]) === -2) return;
    await new Promise((resolve) => {
      setTimeout(resolve, 1);
    });
  }
  assert.fail("Redis tombstone did not expire");
}

async function prepareTombstone(client, key, state) {
  await client.sendCommand(["DEL", key]);
  if (state === "missing") return;
  if (state === "positive") {
    await client.sendCommand(["SET", key, "1", "PX", "5000"]);
    return;
  }
  if (state === "expired") {
    await client.sendCommand(["SET", key, "1", "PX", "1"]);
    await waitUntilExpired(client, key);
    return;
  }
  if (state === "persistent") {
    await client.sendCommand(["SET", key, "1"]);
    return;
  }
  if (state === "wrong type") {
    await client.sendCommand(["HSET", key, "proof", "1"]);
    await client.sendCommand(["PEXPIRE", key, "5000"]);
    return;
  }
  if (state === "wrong value") {
    await client.sendCommand(["SET", key, "0", "PX", "5000"]);
    return;
  }
  assert.equal(state, "zero");
}

async function executeAtZeroPttl(client, key, command) {
  const executable = mutateCommand(command);
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const time = await client.sendCommand(["TIME"]);
    const now = Number(time[0]) * 1_000
      + Math.floor(Number(time[1]) / 1_000);
    await client.sendCommand(["DEL", key]);
    await client.sendCommand([
      "SET",
      key,
      "1",
      "PXAT",
      String(now + 1),
    ]);
    await client.sendCommand(["MULTI"]);
    await client.sendCommand(["PTTL", key]);
    await client.sendCommand(executable);
    const [pttl, reply] = await client.sendCommand(["EXEC"]);
    if (pttl === 0) return reply;
  }
  assert.fail("Redis did not expose the PTTL == 0 boundary");
}

const TOMBSTONE_STATES = [
  "missing",
  "positive",
  "zero",
  "expired",
  "persistent",
  "wrong type",
  "wrong value",
];

test("ephemeral ACK Redis uses only its private Unix socket", async () => {
  await withEphemeralRedis(async ({
    client,
    serverPid,
    socketPath,
    tempDirectory,
  }) => {
    assert.equal(await client.sendCommand(["PING"]), "PONG");
    assert.ok(Number.isSafeInteger(serverPid));
    assert.equal(socketPath, `${tempDirectory}/r.sock`);
    assert.match(socketPath, /\/ack-redis-[^/]+\/r\.sock$/);
  });
});

test("real direct ACK executes the complete tombstone PTTL matrix", async (context) => {
  for (const state of TOMBSTONE_STATES) {
    await context.test(state, async () => {
      await withEphemeralRedis(async ({ client, createClient }) => {
        const prefix = testPrefix(`direct-${state.replaceAll(" ", "-")}`);
        const keys = coordinationKeys(prefix);
        await setPresence(client, keys);
        const rawEnvelope = JSON.stringify(storedEnvelope());
        const fixture = state === "zero"
          ? await prepareZeroTtlDelivery(client, prefix, rawEnvelope)
          : await prepareDelivery(client, prefix, rawEnvelope);
        const tombstoneKey = keys.acked(
          "pt:recipient",
          fixture.deliveryId,
        );
        await prepareTombstone(client, tombstoneKey, state);
        const before = await settlementSnapshot(client, fixture);
        let outcome;

        if (state === "zero") {
          let command;
          const captureClient = createClient();
          const sendCommand = captureClient.sendCommand.bind(captureClient);
          Object.defineProperty(captureClient, "sendCommand", {
            configurable: true,
            async value(candidate) {
              if (candidate[0] === "EVAL") {
                command = candidate;
                throw new Error("captured direct ACK command");
              }
              return sendCommand(candidate);
            },
          });
          const captureQueue = createRedisCoordinationQueue({
            redisUrl: "redis://unix-socket.invalid",
            prefix,
            clientFactory: () => captureClient,
          });
          await assert.rejects(
            captureQueue.ackInbox(ackOptions(fixture.deliveryId)),
            (error) => (
              error instanceof CoordinationQueueError
              && error.code === "COORDINATION_UNAVAILABLE"
            ),
          );
          await captureQueue.close();
          assert.ok(command);
          outcome = await executeAtZeroPttl(
            client,
            tombstoneKey,
            command,
          );
        } else {
          const queue = createRedisCoordinationQueue({
            redisUrl: "redis://unix-socket.invalid",
            prefix,
            clientFactory: queueClientFactory(createClient),
          });
          try {
            outcome = await queue.ackInbox(
              ackOptions(fixture.deliveryId),
            );
          } catch (error) {
            outcome = error;
          } finally {
            await queue.close();
          }
        }

        const afterState = await settlementSnapshot(client, fixture);
        if (["missing", "positive", "expired"].includes(state)) {
          assert.deepEqual(outcome, {
            status: "acked",
            ackedCount: 1,
          });
          assert.equal(afterState.rows.length, 0);
          assert.equal(afterState.pending.length, 0);
          assert.equal(afterState.pendingTotal, 0);
          assert.equal(afterState.tombstone.type, "string");
          assert.equal(afterState.tombstone.value, "1");
          assert.ok(afterState.tombstone.pttl > 0);
          return;
        }

        if (state === "zero") {
          assert.deepEqual(outcome, [5]);
        } else {
          assert.equal(outcome.code, "COORDINATION_INVALID_DATA");
        }
        assert.deepEqual(afterState.rows, before.rows);
        assertPendingUnchanged(afterState, before);
        assert.equal(afterState.eventsLength, before.eventsLength);
        if (state === "zero") {
          assert.ok(afterState.tombstone.pttl <= 0);
        } else {
          assert.equal(afterState.tombstone.type, before.tombstone.type);
          assert.deepEqual(
            afterState.tombstone.value,
            before.tombstone.value,
          );
          if (state === "persistent") {
            assert.equal(afterState.tombstone.pttl, -1);
          } else {
            assert.ok(afterState.tombstone.pttl > 0);
            assert.ok(
              afterState.tombstone.pttl <= before.tombstone.pttl,
            );
          }
        }
      });
    });
  }
});

test("real tombstone inspection executes the complete PTTL matrix", async (context) => {
  for (const state of TOMBSTONE_STATES) {
    await context.test(state, async () => {
      await withEphemeralRedis(async ({ client }) => {
        const prefix = testPrefix(`inspect-${state.replaceAll(" ", "-")}`);
        const keys = coordinationKeys(prefix);
        const fixture = await prepareDelivery(
          client,
          prefix,
          JSON.stringify(storedEnvelope({ messageId: "cm:sentinel" })),
        );
        const deliveryId = "9999999999999-0";
        const tombstoneKey = keys.acked("pt:recipient", deliveryId);
        await prepareTombstone(client, tombstoneKey, state);
        const before = await settlementSnapshot(client, fixture);
        const runtime = await reconcileWithRedis(
          client,
          deliveryId,
          prefix,
          state === "zero"
            ? {
                executeInspection: (command) =>
                  executeAtZeroPttl(client, tombstoneKey, command),
              }
            : {},
        );
        const afterState = await settlementSnapshot(client, fixture);

        if (state === "positive") {
          assert.equal(runtime.result.committed, 1);
          assert.deepEqual(
            proofCommits(runtime.calls),
            ["commitTombstone"],
          );
        } else {
          assert.equal(runtime.result.status, "recovery_required");
          assert.deepEqual(proofCommits(runtime.calls), []);
        }
        assert.deepEqual(afterState.rows, before.rows);
        assertPendingUnchanged(afterState, before);
        assert.equal(afterState.eventsLength, before.eventsLength);
      });
    });
  }
});

test("real orphan finalization executes the complete tombstone PTTL matrix", async (context) => {
  for (const state of TOMBSTONE_STATES) {
    await context.test(state, async () => {
      await withEphemeralRedis(async ({ client }) => {
        const prefix = testPrefix(`orphan-${state.replaceAll(" ", "-")}`);
        const rawEnvelope = JSON.stringify(storedEnvelope());
        const fixture = state === "zero"
          ? await prepareZeroTtlDelivery(client, prefix, rawEnvelope)
          : await prepareDelivery(client, prefix, rawEnvelope);
        const tombstoneKey = fixture.keys.acked(
          "pt:recipient",
          fixture.deliveryId,
        );
        const before = await settlementSnapshot(client, fixture);
        const runtime = await reconcileWithRedis(
          client,
          fixture.deliveryId,
          prefix,
          {
            afterInspect: async ({ status }) => {
              assert.equal(status, "absent");
              if (state !== "zero") {
                await prepareTombstone(
                  client,
                  tombstoneKey,
                  state,
                );
              }
            },
            ...(state === "zero"
              ? {
                  executeFinalizer: (command) =>
                    executeAtZeroPttl(client, tombstoneKey, command),
                }
              : {}),
          },
        );
        const afterState = await settlementSnapshot(client, fixture);

        if (["missing", "expired"].includes(state)) {
          assert.equal(runtime.result.committed, 1);
          assert.deepEqual(
            proofCommits(runtime.calls),
            ["commitOrphan"],
          );
          assert.equal(afterState.rows.length, 0);
          assert.equal(afterState.pending.length, 0);
          assert.equal(afterState.pendingTotal, 0);
          assert.equal(afterState.tombstone.value, "1");
          assert.ok(afterState.tombstone.pttl > 0);
          return;
        }
        if (state === "positive") {
          assert.equal(runtime.result.committed, 1);
          assert.deepEqual(
            proofCommits(runtime.calls),
            ["commitTombstone"],
          );
        } else {
          assert.equal(runtime.result.status, "recovery_required");
          assert.deepEqual(proofCommits(runtime.calls), []);
        }
        assert.deepEqual(afterState.rows, before.rows);
        assertPendingUnchanged(afterState, before);
        assert.equal(afterState.eventsLength, before.eventsLength);
        if (state === "zero") {
          assert.ok(afterState.tombstone.pttl <= 0);
        }
      });
    });
  }
});

function escapedPadding(length) {
  const escapes = Math.floor(length / 6);
  return "\\u0078".repeat(escapes) + "x".repeat(length % 6);
}

function rawPresenceAtByteBoundary(targetBytes) {
  const firstMarker = "FIRST_PADDING_MARKER";
  const secondMarker = "SECOND_PADDING_MARKER";
  const firstToken = JSON.stringify(firstMarker);
  const secondToken = JSON.stringify(secondMarker);
  const template = JSON.stringify(participantPresence({
    metadata: {
      first: firstMarker,
      second: secondMarker,
    },
  }));
  const fixedBytes = Buffer.byteLength(template)
    - Buffer.byteLength(firstToken)
    - Buffer.byteLength(secondToken)
    + 4;
  const contentBytes = targetBytes - fixedBytes;
  const firstLength = Math.floor(contentBytes / 2);
  const secondLength = contentBytes - firstLength;
  assert.ok(firstLength < JSON_MAX_STRING_BYTES);
  assert.ok(secondLength < JSON_MAX_STRING_BYTES);
  const raw = template
    .replace(firstToken, `"${escapedPadding(firstLength)}"`)
    .replace(secondToken, `"${escapedPadding(secondLength)}"`);
  assert.equal(Buffer.byteLength(raw), targetBytes);
  return raw;
}

function rawWidePresence(propertyCount = 18_000) {
  const metadata = {};
  for (let index = 0; index < propertyCount; index += 1) {
    metadata[`k${String(index).padStart(5, "0")}`] = 0;
  }
  return JSON.stringify(participantPresence({ metadata }));
}

function rawDeepPresence(depth = 70) {
  let metadata = { terminal: true };
  for (let index = 0; index < depth; index += 1) {
    metadata = { nested: metadata };
  }
  return JSON.stringify(participantPresence({ metadata }));
}

test("real orphan parser enforces byte, work, string, and depth bounds", async (context) => {
  const specimens = [
    {
      accepted: true,
      label: "exact byte boundary",
      raw: rawPresenceAtByteBoundary(JSON_MAX_BYTES),
    },
    {
      accepted: false,
      label: "over byte ceiling",
      raw: rawPresenceAtByteBoundary(JSON_MAX_BYTES + 1),
    },
    {
      accepted: false,
      label: "wide flat work exhaustion",
      raw: rawWidePresence(),
    },
    {
      accepted: false,
      label: "long string token",
      raw: JSON.stringify(participantPresence({
        metadata: {
          padding: "x".repeat(JSON_MAX_STRING_BYTES + 1),
        },
      })),
    },
    {
      accepted: false,
      label: "excessive depth",
      raw: rawDeepPresence(),
    },
  ];

  for (const specimen of specimens) {
    await context.test(specimen.label, async () => {
      await withEphemeralRedis(async ({ client }) => {
        const prefix = testPrefix(
          `bounds-${specimen.label.replaceAll(" ", "-")}`,
        );
        const fixture = await prepareDelivery(
          client,
          prefix,
          JSON.stringify(storedEnvelope()),
        );
        await setPresence(client, fixture.keys, specimen.raw);
        const before = await settlementSnapshot(client, fixture);
        const runtime = await reconcileWithRedis(
          client,
          fixture.deliveryId,
          prefix,
        );
        const afterState = await settlementSnapshot(client, fixture);

        if (specimen.accepted) {
          assert.equal(runtime.result.deferred, 1);
          assert.equal(
            runtime.calls.some(
              ({ operation }) => operation === "defer",
            ),
            true,
          );
        } else {
          assert.equal(runtime.result.status, "recovery_required");
          assert.equal(runtime.result.recoveryRequired, 1);
        }
        assert.deepEqual(proofCommits(runtime.calls), []);
        assert.deepEqual(afterState.rows, before.rows);
        assertPendingUnchanged(afterState, before);
        assert.equal(afterState.tombstone.type, "none");
        assert.equal(afterState.eventsLength, before.eventsLength);
      });
    });
  }
});

function escapedJsonKeyToken(key) {
  const lastIndex = key.length - 1;
  const codeUnit = key
    .charCodeAt(lastIndex)
    .toString(16)
    .padStart(4, "0");
  const token = `"${key.slice(0, lastIndex)}\\u${codeUnit}"`;
  assert.equal(JSON.parse(token), key);
  return token;
}

function replaceUnique(source, fragment, replacement) {
  const index = source.indexOf(fragment);
  assert.ok(index >= 0, `missing JSON fragment: ${fragment}`);
  assert.equal(source.indexOf(fragment, index + fragment.length), -1);
  return source.slice(0, index)
    + replacement
    + source.slice(index + fragment.length);
}

function rawEnvelopeWithDuplicateField(envelope, field, escaped) {
  const fieldToken = JSON.stringify(field);
  const valueToken = JSON.stringify(envelope[field]);
  const fragment = `${fieldToken}:${valueToken}`;
  const alias = escaped ? escapedJsonKeyToken(field) : fieldToken;
  return replaceUnique(
    JSON.stringify(envelope),
    fragment,
    `${fieldToken}:null,${alias}:${valueToken}`,
  );
}

function rawEnvelopeWithNestedBodyArrayAmbiguity(envelope) {
  const valueToken = JSON.stringify(envelope.body);
  return replaceUnique(
    JSON.stringify(envelope),
    `"body":${valueToken}`,
    "\"body\":{\"layers\":[{\"scopeId\":\"decoy\","
      + "\"scop\\u0065Id\":\"project:v5\"}]},"
      + `${escapedJsonKeyToken("body")}:${valueToken}`,
  );
}

async function assertHostileEnvelopeFailsClosed(
  client,
  createClient,
  label,
  rawEnvelope,
) {
  assert.deepEqual(JSON.parse(rawEnvelope), storedEnvelope(), label);

  const directPrefix = testPrefix(`duplicate-direct-${label}`);
  const directFixture = await prepareDelivery(
    client,
    directPrefix,
    rawEnvelope,
  );
  await setPresence(client, directFixture.keys);
  const directBefore = await settlementSnapshot(client, directFixture);
  const queue = createRedisCoordinationQueue({
    redisUrl: "redis://unix-socket.invalid",
    prefix: directPrefix,
    clientFactory: queueClientFactory(createClient),
  });
  let directOutcome;
  try {
    directOutcome = {
      status: "resolved",
      value: await queue.ackInbox(
        ackOptions(directFixture.deliveryId),
      ),
    };
  } catch (error) {
    directOutcome = {
      status: "rejected",
      code: error?.code,
      queueError: error instanceof CoordinationQueueError,
    };
  } finally {
    await queue.close();
  }
  const directAfter = await settlementSnapshot(client, directFixture);

  const orphanPrefix = testPrefix(`duplicate-orphan-${label}`);
  const orphanFixture = await prepareDelivery(
    client,
    orphanPrefix,
    rawEnvelope,
  );
  const orphanBefore = await settlementSnapshot(client, orphanFixture);
  const runtime = await reconcileWithRedis(
    client,
    orphanFixture.deliveryId,
    orphanPrefix,
  );
  const orphanAfter = await settlementSnapshot(client, orphanFixture);
  assert.deepEqual({
    direct: {
      outcome: directOutcome,
      rows: directAfter.rows,
      pending: stablePending(directAfter.pending),
      pendingTotal: directAfter.pendingTotal,
      tombstoneType: directAfter.tombstone.type,
      eventsLength: directAfter.eventsLength,
    },
    orphan: {
      status: runtime.result.status,
      proofCommits: proofCommits(runtime.calls),
      rows: orphanAfter.rows,
      pending: stablePending(orphanAfter.pending),
      pendingTotal: orphanAfter.pendingTotal,
      tombstoneType: orphanAfter.tombstone.type,
      eventsLength: orphanAfter.eventsLength,
    },
  }, {
    direct: {
      outcome: {
        status: "rejected",
        code: "COORDINATION_INVALID_DATA",
        queueError: true,
      },
      rows: directBefore.rows,
      pending: stablePending(directBefore.pending),
      pendingTotal: directBefore.pendingTotal,
      tombstoneType: "none",
      eventsLength: directBefore.eventsLength,
    },
    orphan: {
      status: "recovery_required",
      proofCommits: [],
      rows: orphanBefore.rows,
      pending: stablePending(orphanBefore.pending),
      pendingTotal: orphanBefore.pendingTotal,
      tombstoneType: "none",
      eventsLength: orphanBefore.eventsLength,
    },
  }, label);
}

test("real settlement scripts reject literal, escaped, and nested duplicate envelope keys", async (context) => {
  const envelope = storedEnvelope();
  const specimens = [{
    label: "literal scopeId alias",
    raw: rawEnvelopeWithDuplicateField(
      envelope,
      "scopeId",
      false,
    ),
  }];
  for (const field of Object.keys(envelope)) {
    specimens.push({
      label: `escaped ${field} alias`,
      raw: rawEnvelopeWithDuplicateField(envelope, field, true),
    });
  }
  specimens.push({
    label: "nested body and array aliases",
    raw: rawEnvelopeWithNestedBodyArrayAmbiguity(envelope),
  });

  for (const specimen of specimens) {
    await context.test(specimen.label, async () => {
      await withEphemeralRedis(async ({ client, createClient }) => {
        await assertHostileEnvelopeFailsClosed(
          client,
          createClient,
          specimen.label,
          specimen.raw,
        );
      });
    });
  }
});

test("real corrupt presence reaches one terminal unknown while canonical leased presence alone defers", async (context) => {
  const specimens = [
    {
      corrupt: true,
      label: "partial JSON",
      prepare: async (client, keys) => {
        await setPresence(client, keys, JSON.stringify({
          participantId: "pt:recipient",
          scopeId: "project:v5",
        }));
      },
    },
    {
      corrupt: true,
      label: "malformed JSON",
      prepare: async (client, keys) => {
        await setPresence(client, keys, "{");
      },
    },
    {
      corrupt: true,
      label: "wrong Redis type",
      prepare: async (client, keys) => {
        await client.sendCommand([
          "HSET",
          keys.presence("pt:recipient"),
          "participantId",
          "pt:recipient",
        ]);
        await client.sendCommand([
          "PEXPIRE",
          keys.presence("pt:recipient"),
          "60000",
        ]);
      },
    },
    {
      corrupt: true,
      label: "persistent canonical JSON",
      prepare: async (client, keys) => {
        await client.sendCommand([
          "SET",
          keys.presence("pt:recipient"),
          JSON.stringify(participantPresence()),
        ]);
      },
    },
    {
      corrupt: true,
      label: "wrong empty container shapes",
      prepare: async (client, keys) => {
        await setPresence(client, keys, JSON.stringify(
          participantPresence({
            capabilities: {},
            metadata: [],
          }),
        ));
      },
    },
    {
      corrupt: false,
      label: "canonical leased JSON",
      prepare: setPresence,
    },
  ];

  for (const specimen of specimens) {
    await context.test(specimen.label, async () => {
      await withEphemeralRedis(async ({ client }) => {
        const prefix = testPrefix(
          `presence-${specimen.label.replaceAll(" ", "-")}`,
        );
        const fixture = await prepareDelivery(
          client,
          prefix,
          JSON.stringify(storedEnvelope()),
        );
        await specimen.prepare(client, fixture.keys);
        const before = await settlementSnapshot(client, fixture);
        const runtime = await reconcileWithRedis(
          client,
          fixture.deliveryId,
          prefix,
        );
        const repeated = await runtime.reconciler.reconcile();
        const afterState = await settlementSnapshot(client, fixture);
        const recoveries = runtime.calls.filter(
          ({ operation }) => operation === "recovery",
        );
        const deferrals = runtime.calls.filter(
          ({ operation }) => operation === "defer",
        );

        if (specimen.corrupt) {
          assert.equal(runtime.result.status, "recovery_required");
          assert.equal(runtime.result.recoveryRequired, 1);
          assert.equal(repeated.inspected, 0);
          assert.equal(recoveries.length, 1);
          assert.equal(deferrals.length, 0);
        } else {
          assert.equal(runtime.result.status, "reconciled");
          assert.equal(runtime.result.deferred, 1);
          assert.equal(repeated.deferred, 1);
          assert.equal(recoveries.length, 0);
          assert.equal(deferrals.length, 2);
        }
        assert.deepEqual(proofCommits(runtime.calls), []);
        assert.deepEqual(afterState.rows, before.rows);
        assertPendingUnchanged(afterState, before);
        assert.equal(afterState.tombstone.type, "none");
        assert.equal(afterState.eventsLength, before.eventsLength);
      });
    });
  }
});
if (LUA_MUTANT) {
  test("selected ACK Lua mutant matched a shipped script", () => {
    assert.ok(
      mutationApplications > 0,
      `ACK Lua mutant ${LUA_MUTANT} did not match a shipped script`,
    );
  });
}
