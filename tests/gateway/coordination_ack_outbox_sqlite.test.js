import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

import {
  coordinationConsumeKey,
} from "../../gateway/src/core/coordination_consumer.js";
import {
  createCoordinationAckReconciler,
} from "../../gateway/src/core/coordination_ack_reconciler.js";
import {
  createSqliteCoordinationConsumerRepository,
} from "../../gateway/src/core/repositories/sqlite_coordination_consumer_repo.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const MIGRATION_002 = path.join(
  REPO_ROOT,
  "gateway",
  "migrations",
  "002_coordination_consumer.sql",
);
const MIGRATION_003 = path.join(
  REPO_ROOT,
  "gateway",
  "migrations",
  "003_coordination_ack_outbox.sql",
);
const require = createRequire(path.join(REPO_ROOT, "gateway", "package.json"));
const Database = require("better-sqlite3");
const BASE_TIME = 10_000;

function metadata(messageId) {
  return {
    protocolVersion: 1,
    scopeId: "scope-a",
    messageId,
    fromParticipantId: "participant-sender",
    toParticipantId: "participant-old-recipient",
    messageType: "IMPACT_NOTICE",
    classification: "internal",
    createdAt: "2026-07-27T08:00:00.000Z",
    traceId: `trace-${messageId}`,
  };
}

function identity(messageId, deliveryId) {
  const value = metadata(messageId);
  return {
    consumeKey: coordinationConsumeKey(value),
    deliveryId,
    metadata: value,
  };
}

function openRawDatabase(file = ":memory:", { outbox = true } = {}) {
  const database = new Database(file);
  database.backend = "sqlite";
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 1000");
  database.exec(fs.readFileSync(MIGRATION_002, "utf8"));
  if (outbox && fs.existsSync(MIGRATION_003)) {
    database.exec(fs.readFileSync(MIGRATION_003, "utf8"));
  }
  return database;
}

function openRepository(file = ":memory:") {
  const database = openRawDatabase(file);
  return {
    database,
    repository: createSqliteCoordinationConsumerRepository({ database }),
  };
}

async function seedIntent(repository, {
  messageId,
  deliveryId,
  now = BASE_TIME,
} = {}) {
  const seeded = identity(messageId, deliveryId);
  const claimed = await repository.claim({
    consumeKey: seeded.consumeKey,
    deliveryId,
    recovered: false,
    metadata: seeded.metadata,
    ownerId: "effect-owner",
    now,
    leaseMs: 100,
  });
  await repository.commitEffect({
    consumeKey: seeded.consumeKey,
    ownerId: "effect-owner",
    claimToken: claimed.claimToken,
    commitId: `effect-${messageId}`,
    now: now + 1,
  });
  const prepared = await repository.prepareAck({
    consumeKey: seeded.consumeKey,
    deliveryId,
    now: now + 2,
  });
  assert.equal(prepared.status, "pending");
  return seeded;
}

function rawIntent(database, seeded) {
  return database
    .prepare(
      `SELECT
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
       FROM coordination_consumer_ack_intents
       WHERE consume_key = ? AND delivery_id = ?`,
    )
    .get(seeded.consumeKey, seeded.deliveryId);
}

function durableSnapshot(database, seeded) {
  return {
    receipt: database
      .prepare(
        "SELECT * FROM coordination_consumer_receipts "
        + "WHERE consume_key = ?",
      )
      .get(seeded.consumeKey),
    delivery: database
      .prepare(
        "SELECT * FROM coordination_consumer_deliveries "
        + "WHERE consume_key = ? AND delivery_id = ?",
      )
      .get(seeded.consumeKey, seeded.deliveryId),
    intent: rawIntent(database, seeded),
  };
}

function schemaSnapshot(database) {
  return database
    .prepare(
      "SELECT type, name, tbl_name, sql FROM sqlite_master "
      + "WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name",
    )
    .all();
}

function insertSyntheticIntents(database, {
  start,
  count,
  dueAt,
}) {
  const insertReceipt = database.prepare(
    `INSERT INTO coordination_consumer_receipts (
      consume_key,
      metadata_protocol_version,
      metadata_scope_id,
      metadata_message_id,
      metadata_from_participant_id,
      metadata_to_participant_id,
      metadata_message_type,
      metadata_classification,
      metadata_created_at,
      metadata_trace_id,
      metadata_correlation_id,
      metadata_reply_to_message_id,
      metadata_malformed,
      state,
      attempts,
      claim_epoch,
      lease_owner_id,
      lease_claim_token,
      lease_expires_at,
      effect_commit_id,
      effect_committed_at,
      quarantine_id,
      quarantine_reason_code,
      quarantine_committed_at,
      replay_epoch,
      max_consumed_recovery_ids,
      created_at,
      updated_at
    ) VALUES (
      @consumeKey,
      1,
      'scope-synthetic',
      @messageId,
      'participant-sender',
      'participant-old-recipient',
      'IMPACT_NOTICE',
      'internal',
      '2026-07-27T08:00:00.000Z',
      NULL,
      NULL,
      NULL,
      NULL,
      'effect_committed',
      1,
      1,
      NULL,
      NULL,
      NULL,
      @effectCommitId,
      1,
      NULL,
      NULL,
      NULL,
      0,
      8,
      1,
      1
    )`,
  );
  const insertDelivery = database.prepare(
    `INSERT INTO coordination_consumer_deliveries (
      consume_key,
      delivery_id,
      recovered,
      observed_at,
      observed_order,
      ack_state,
      acked_at
    ) VALUES (?, ?, 0, 1, 1, 'acknowledging', NULL)`,
  );
  const insertIntent = database.prepare(
    `INSERT INTO coordination_consumer_ack_intents (
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
    ) VALUES (
      ?, ?, 'pending', ?, 0, NULL, NULL, NULL, NULL,
      NULL, NULL, NULL, 1, 1
    )`,
  );
  database.transaction(() => {
    for (let offset = 0; offset < count; offset += 1) {
      const value = start + offset;
      const consumeKey =
        `coord-consume-v1-${value.toString(16).padStart(64, "0")}`;
      const deliveryId = `${value}-0`;
      insertReceipt.run({
        consumeKey,
        messageId: `message-${value}`,
        effectCommitId: `effect-${value}`,
      });
      insertDelivery.run(consumeKey, deliveryId);
      insertIntent.run(consumeKey, deliveryId, dueAt);
    }
  }).immediate();
}

function bindingsFor(sql, available) {
  const bindings = {};
  for (const match of sql.matchAll(/@([A-Za-z][A-Za-z0-9]*)/g)) {
    const name = match[1];
    assert.equal(
      Object.hasOwn(available, name),
      true,
      `missing SQL binding ${name}`,
    );
    bindings[name] = available[name];
  }
  return bindings;
}

function sqliteStatementStats(file, sql, available) {
  const bindings = bindingsFor(sql, available);
  const args = [
    "-batch",
    "-cmd",
    ".stats stmt",
    "-cmd",
    ".parameter init",
  ];
  for (const [name, value] of Object.entries(bindings)) {
    let literal;
    if (value === null) {
      literal = "NULL";
    } else if (typeof value === "number") {
      literal = String(value);
    } else {
      literal = `'${value.replaceAll("'", "''")}'`;
    }
    args.push("-cmd", `.parameter set @${name} ${literal}`);
  }
  args.push(file, sql);
  const result = spawnSync("sqlite3", args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  assert.equal(
    result.status,
    0,
    `sqlite3 statement probe failed: ${result.stderr}`,
  );
  const output = `${result.stdout}\n${result.stderr}`;
  const fullscan = [...output.matchAll(/Fullscan Steps:\s+(\d+)/g)];
  const virtualMachine = [
    ...output.matchAll(/Virtual Machine Steps:\s+(\d+)/g),
  ];
  assert.ok(fullscan.length > 0, "sqlite3 omitted full-scan statistics");
  assert.ok(
    virtualMachine.length > 0,
    "sqlite3 omitted virtual-machine statistics",
  );
  return {
    fullscanSteps: Number(fullscan.at(-1)[1]),
    virtualMachineSteps: Number(virtualMachine.at(-1)[1]),
  };
}

function injectIntentMutation(database, seeded, sql) {
  database.pragma("ignore_check_constraints = ON");
  try {
    database.prepare(
      "UPDATE coordination_consumer_ack_intents SET "
      + `${sql} WHERE consume_key = ? AND delivery_id = ?`,
    ).run(seeded.consumeKey, seeded.deliveryId);
  } finally {
    database.pragma("ignore_check_constraints = OFF");
  }
}

function insertLegacyAcknowledging(database, seeded) {
  database.prepare(
    `INSERT INTO coordination_consumer_receipts (
      consume_key,
      metadata_protocol_version,
      metadata_scope_id,
      metadata_message_id,
      metadata_from_participant_id,
      metadata_to_participant_id,
      metadata_message_type,
      metadata_classification,
      metadata_created_at,
      metadata_trace_id,
      metadata_correlation_id,
      metadata_reply_to_message_id,
      metadata_malformed,
      state,
      attempts,
      claim_epoch,
      lease_owner_id,
      lease_claim_token,
      lease_expires_at,
      effect_commit_id,
      effect_committed_at,
      quarantine_id,
      quarantine_reason_code,
      quarantine_committed_at,
      replay_epoch,
      max_consumed_recovery_ids,
      created_at,
      updated_at
    ) VALUES (
      @consumeKey,
      1,
      @scopeId,
      @messageId,
      @fromParticipantId,
      @toParticipantId,
      @messageType,
      @classification,
      @metadataCreatedAt,
      @traceId,
      NULL,
      NULL,
      NULL,
      'effect_committed',
      1,
      1,
      NULL,
      NULL,
      NULL,
      'legacy-effect',
      @effectCommittedAt,
      NULL,
      NULL,
      NULL,
      0,
      8,
      @createdAt,
      @updatedAt
    )`,
  ).run({
    consumeKey: seeded.consumeKey,
    scopeId: seeded.metadata.scopeId,
    messageId: seeded.metadata.messageId,
    fromParticipantId: seeded.metadata.fromParticipantId,
    toParticipantId: seeded.metadata.toParticipantId,
    messageType: seeded.metadata.messageType,
    classification: seeded.metadata.classification,
    metadataCreatedAt: seeded.metadata.createdAt,
    traceId: seeded.metadata.traceId,
    effectCommittedAt: BASE_TIME + 1,
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME + 2,
  });
  database.prepare(
    `INSERT INTO coordination_consumer_deliveries (
      consume_key,
      delivery_id,
      recovered,
      observed_at,
      observed_order,
      ack_state,
      acked_at
    ) VALUES (?, ?, 0, ?, 1, 'acknowledging', NULL)`,
  ).run(seeded.consumeKey, seeded.deliveryId, BASE_TIME);
}

function claimInput(seeded, overrides = {}) {
  return {
    consumeKey: seeded.consumeKey,
    deliveryId: seeded.deliveryId,
    ownerId: "ack-owner",
    now: BASE_TIME + 10,
    leaseMs: 100,
    ...overrides,
  };
}

function ownedInput(seeded, claim, overrides = {}) {
  return {
    consumeKey: seeded.consumeKey,
    deliveryId: seeded.deliveryId,
    ownerId: "ack-owner",
    claimToken: claim.claimToken,
    now: BASE_TIME + 11,
    ...overrides,
  };
}

function createReconciler(port, {
  ownerId,
  transport,
  clock = () => BASE_TIME + 10,
} = {}) {
  return createCoordinationAckReconciler({
    repository: port,
    transport,
    clock,
    config: {
      ownerId,
      claimLeaseMs: 100,
      deferMs: 10,
      tombstoneTtlMs: 1_000,
      limit: 1,
    },
  });
}

test("migration 003 converges fresh and 002-only databases and is a no-op on rerun", () => {
  assert.equal(
    fs.existsSync(MIGRATION_003),
    true,
    "migration 003 must exist",
  );
  const migration = fs.readFileSync(MIGRATION_003, "utf8");
  assert.match(
    migration,
    /eligible_at\s+INTEGER GENERATED ALWAYS AS \([\s\S]+?\) VIRTUAL\s+CHECK \(\s+eligible_at IS NULL[\s\S]+?eligible_at BETWEEN 0 AND 9007199254740991\s+\)/,
  );
  const fresh = openRawDatabase(":memory:", { outbox: false });
  const upgraded = openRawDatabase(":memory:", { outbox: false });
  const legacy = identity("message-legacy-ack", "100-0");
  insertLegacyAcknowledging(upgraded, legacy);

  fresh.exec(migration);
  upgraded.exec(migration);

  assert.deepEqual(schemaSnapshot(upgraded), schemaSnapshot(fresh));
  assert.deepEqual(rawIntent(upgraded, legacy), {
    consume_key: legacy.consumeKey,
    delivery_id: legacy.deliveryId,
    state: "pending",
    due_at: BASE_TIME + 2,
    claim_epoch: 0,
    claim_family: null,
    claim_owner_id: null,
    claim_token: null,
    claim_expires_at: null,
    proof: null,
    reason_code: null,
    committed_at: null,
    created_at: BASE_TIME + 2,
    updated_at: BASE_TIME + 2,
  });
  const validLegacyRow = rawIntent(upgraded, legacy);
  for (const invalidMutation of [
    "consume_key = 'invalid-consume-key'",
    "delivery_id = ''",
    "state = 'unknown_state'",
    "due_at = -1",
    "claim_epoch = -1",
    "claim_family = 'cross-domain'",
    "claim_owner_id = ''",
    "claim_token = ''",
    "claim_expires_at = -1",
    "proof = 'AMBIGUOUS_PROOF'",
    "reason_code = 'UNKNOWN_REASON'",
    "committed_at = -1",
    "created_at = -1",
    "updated_at = -1",
  ]) {
    assert.throws(
      () => upgraded.prepare(
        "UPDATE coordination_consumer_ack_intents SET "
        + `${invalidMutation} WHERE consume_key = ? AND delivery_id = ?`,
      ).run(legacy.consumeKey, legacy.deliveryId),
      /constraint/i,
      invalidMutation,
    );
    assert.deepEqual(rawIntent(upgraded, legacy), validLegacyRow);
  }
  const setCommittedIntent = upgraded.prepare(
    "UPDATE coordination_consumer_ack_intents SET "
    + "state = 'committed', due_at = NULL, claim_epoch = 1, "
    + "claim_family = ?, claim_owner_id = 'migration-owner', "
    + "claim_token = ?, claim_expires_at = NULL, proof = ?, "
    + "reason_code = NULL, committed_at = ?, updated_at = ? "
    + "WHERE consume_key = ? AND delivery_id = ?",
  );
  for (const provenance of [
    {
      family: "direct",
      token: "migration-direct-token",
      proof: "DIRECT_ACK",
      crossFamilyProof: "ORPHAN_ACK",
    },
    {
      family: "reconciliation",
      token: "migration-reconciliation-token",
      proof: "ORPHAN_ACK",
      crossFamilyProof: "DIRECT_ACK",
    },
  ]) {
    setCommittedIntent.run(
      provenance.family,
      provenance.token,
      provenance.proof,
      BASE_TIME + 3,
      BASE_TIME + 3,
      legacy.consumeKey,
      legacy.deliveryId,
    );
    const validCommittedRow = rawIntent(upgraded, legacy);
    assert.throws(
      () => upgraded.prepare(
        "UPDATE coordination_consumer_ack_intents SET proof = ? "
        + "WHERE consume_key = ? AND delivery_id = ?",
      ).run(
        provenance.crossFamilyProof,
        legacy.consumeKey,
        legacy.deliveryId,
      ),
      /constraint/i,
      `${provenance.family} cannot persist ${provenance.crossFamilyProof}`,
    );
    assert.deepEqual(rawIntent(upgraded, legacy), validCommittedRow);
  }
  upgraded.prepare(
    "UPDATE coordination_consumer_ack_intents SET "
    + "state = 'pending', due_at = ?, claim_epoch = 0, "
    + "claim_family = NULL, claim_owner_id = NULL, claim_token = NULL, "
    + "claim_expires_at = NULL, proof = NULL, reason_code = NULL, "
    + "committed_at = NULL, updated_at = ? "
    + "WHERE consume_key = ? AND delivery_id = ?",
  ).run(
    BASE_TIME + 2,
    BASE_TIME + 2,
    legacy.consumeKey,
    legacy.deliveryId,
  );
  assert.deepEqual(rawIntent(upgraded, legacy), validLegacyRow);
  const beforeRerun = {
    schema: schemaSnapshot(upgraded),
    row: rawIntent(upgraded, legacy),
    migration: upgraded
      .prepare(
        "SELECT * FROM schema_migrations "
        + "WHERE id = '003_coordination_ack_outbox'",
      )
      .all(),
  };
  upgraded.exec(migration);
  assert.deepEqual({
    schema: schemaSnapshot(upgraded),
    row: rawIntent(upgraded, legacy),
    migration: upgraded
      .prepare(
        "SELECT * FROM schema_migrations "
        + "WHERE id = '003_coordination_ack_outbox'",
      )
      .all(),
  }, beforeRerun);
  assert.deepEqual(fresh.pragma("foreign_key_check"), []);
  assert.deepEqual(upgraded.pragma("foreign_key_check"), []);
  fresh.close();
  upgraded.close();
});

test("two reconcilers over one stale SQLite page let one settle and make the loser mutation-free", async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "coord-ack-outbox-cas-"),
  );
  const file = path.join(directory, "outbox.db");
  const first = openRepository(file);
  const second = openRepository(file);
  const seeded = await seedIntent(first.repository, {
    messageId: "message-stale-cas",
    deliveryId: "200-0",
  });
  const winnerPort = first.repository.ackReconciliation;
  const loserPort = second.repository.ackReconciliation;
  assert.equal(typeof winnerPort?.claim, "function");
  assert.equal(typeof loserPort?.claim, "function");

  let listed = 0;
  let releaseLists;
  const bothListed = new Promise((resolve) => {
    releaseLists = resolve;
  });
  const staleList = (port) => async (input) => {
    const page = await port.list(input);
    listed += 1;
    if (listed === 2) releaseLists();
    await bothListed;
    return page;
  };
  let winnerCommitted;
  const committed = new Promise((resolve) => {
    winnerCommitted = resolve;
  });
  let settledSnapshot;
  let loserBefore;
  let loserAfter;
  let loserTransportCalls = 0;
  const winner = createReconciler({
    ...winnerPort,
    list: staleList(winnerPort),
    async commitTombstone(input) {
      const result = await winnerPort.commitTombstone(input);
      settledSnapshot = durableSnapshot(first.database, seeded);
      winnerCommitted();
      return result;
    },
  }, {
    ownerId: "reconciler-winner",
    transport: {
      async inspectAckTombstone() {
        return { status: "ack_tombstone" };
      },
      async finalizeOrphanAck() {
        throw new Error("unused");
      },
    },
  });
  const loser = createReconciler({
    ...loserPort,
    list: staleList(loserPort),
    async claim(input) {
      await committed;
      loserBefore = durableSnapshot(second.database, seeded);
      const result = await loserPort.claim(input);
      assert.equal(result.status, "committed");
      assert.equal(result.intent.proof, null);
      loserAfter = durableSnapshot(second.database, seeded);
      return result;
    },
  }, {
    ownerId: "reconciler-loser",
    transport: {
      async inspectAckTombstone() {
        loserTransportCalls += 1;
        return { status: "ack_tombstone" };
      },
      async finalizeOrphanAck() {
        loserTransportCalls += 1;
        return { status: "orphan_acked" };
      },
    },
  });

  const [won, lost] = await Promise.all([
    winner.reconcile(),
    loser.reconcile(),
  ]);

  assert.equal(won.committed, 1);
  assert.equal(lost.inspected, 1);
  assert.equal(lost.claimed, 0);
  assert.equal(lost.committed, 0);
  assert.equal(loserTransportCalls, 0);
  assert.deepEqual(loserBefore, settledSnapshot);
  assert.deepEqual(loserAfter, loserBefore);
  assert.equal(
    (await winnerPort.getAckReconciliationSummary())
      .proofs.ACK_TOMBSTONE,
    1,
  );
  first.database.close();
  second.database.close();
  fs.rmSync(directory, { recursive: true });
});

test("SQLite dueAt uses the exact millisecond boundary without advancing an early claim", async () => {
  const { database, repository } = openRepository();
  const seeded = await seedIntent(repository, {
    messageId: "message-due-boundary",
    deliveryId: "300-0",
  });
  const port = repository.ackReconciliation;
  assert.equal(typeof port?.defer, "function");
  const first = await port.claim(claimInput(seeded));
  const beforeInvalidReason = durableSnapshot(database, seeded);
  await assert.rejects(
    port.defer(ownedInput(seeded, first, {
      reasonCode: "UNKNOWN_REASON",
      retryAt: BASE_TIME + 100,
    })),
    TypeError,
  );
  assert.deepEqual(
    durableSnapshot(database, seeded),
    beforeInvalidReason,
  );
  await port.defer(ownedInput(seeded, first, {
    reasonCode: "TRANSPORT_UNAVAILABLE",
    retryAt: BASE_TIME + 100,
  }));
  const beforeEarlyClaim = rawIntent(database, seeded);

  assert.equal(
    (await port.list({
      cursor: null,
      limit: 1,
      now: BASE_TIME + 99,
    })).intents.length,
    0,
  );
  const early = await port.claim(claimInput(seeded, {
    ownerId: "early-owner",
    now: BASE_TIME + 99,
  }));
  assert.equal(early.status, "not_due");
  assert.equal(early.intent.dueAt, BASE_TIME + 100);
  assert.deepEqual(rawIntent(database, seeded), beforeEarlyClaim);

  const exactlyDue = await port.list({
    cursor: null,
    limit: 1,
    now: BASE_TIME + 100,
  });
  assert.equal(exactlyDue.intents.length, 1);
  const claimed = await port.claim(claimInput(seeded, {
    ownerId: "due-owner",
    now: BASE_TIME + 100,
  }));
  const stored = rawIntent(database, seeded);
  assert.equal(claimed.status, "claimed");
  assert.equal(stored.claim_epoch, beforeEarlyClaim.claim_epoch + 1);
  assert.equal(stored.claim_token, claimed.claimToken);
  await port.defer({
    consumeKey: seeded.consumeKey,
    deliveryId: seeded.deliveryId,
    ownerId: "due-owner",
    claimToken: claimed.claimToken,
    reasonCode: "TRANSPORT_UNAVAILABLE",
    retryAt: BASE_TIME + 200,
    now: BASE_TIME + 101,
  });
  assert.equal(
    (await repository.prepareAck({
      consumeKey: seeded.consumeKey,
      deliveryId: seeded.deliveryId,
      now: BASE_TIME + 102,
    })).status,
    "pending",
  );
  const reopened = rawIntent(database, seeded);
  assert.equal(reopened.state, "pending");
  assert.equal(reopened.due_at, BASE_TIME + 102);
  assert.equal(reopened.reason_code, null);
  assert.equal(reopened.claim_epoch, stored.claim_epoch);
  database.close();
});

test("SQLite ACK epochs and tokens never regress and replayed stale tokens cannot settle", async () => {
  const { database, repository } = openRepository();
  const seeded = await seedIntent(repository, {
    messageId: "message-monotonic-token",
    deliveryId: "400-0",
  });
  const port = repository.ackReconciliation;
  assert.equal(typeof port?.claim, "function");
  const first = await port.claim(claimInput(seeded, {
    now: BASE_TIME + 10,
    leaseMs: 10,
  }));
  const renewed = await port.renew(ownedInput(seeded, first, {
    now: BASE_TIME + 11,
    leaseMs: 10,
  }));
  assert.equal(renewed.status, "renewed");
  assert.equal(renewed.claimToken, first.claimToken);
  assert.equal(rawIntent(database, seeded).claim_expires_at, BASE_TIME + 21);
  const beforeBusy = durableSnapshot(database, seeded);
  assert.equal(
    (await port.list({
      cursor: null,
      limit: 1,
      now: BASE_TIME + 20,
    })).intents.length,
    0,
  );
  assert.equal(
    (await port.list({
      cursor: null,
      limit: 1,
      now: BASE_TIME + 21,
    })).intents.length,
    1,
  );
  const busy = await port.claim(claimInput(seeded, {
    ownerId: "competing-owner",
    now: BASE_TIME + 20,
    leaseMs: 10,
  }));
  assert.equal(busy.status, "busy");
  assert.deepEqual(durableSnapshot(database, seeded), beforeBusy);
  const second = await port.claim(claimInput(seeded, {
    now: BASE_TIME + 21,
    leaseMs: 10,
  }));
  const beforeStaleReplay = durableSnapshot(database, seeded);

  assert.equal(first.intent.claimEpoch, 1);
  assert.equal(second.intent.claimEpoch, 2);
  assert.notEqual(second.claimToken, first.claimToken);
  assert.equal(beforeStaleReplay.intent.claim_epoch, 2);
  assert.equal(beforeStaleReplay.intent.claim_token, second.claimToken);
  for (const operation of [
    () => port.renew(ownedInput(seeded, first, {
      now: BASE_TIME + 22,
      leaseMs: 10,
    })),
    () => port.defer(ownedInput(seeded, first, {
      now: BASE_TIME + 22,
      reasonCode: "TRANSPORT_UNAVAILABLE",
      retryAt: BASE_TIME + 30,
    })),
    () => port.markAckRecoveryRequired(ownedInput(seeded, first, {
      now: BASE_TIME + 22,
      reasonCode: "TRANSPORT_STATE_UNKNOWN",
    })),
    () => port.commitTombstone(ownedInput(seeded, first, {
      now: BASE_TIME + 22,
    })),
  ]) {
    await assert.rejects(operation(), /not owned/);
    assert.deepEqual(durableSnapshot(database, seeded), beforeStaleReplay);
  }
  await port.commitTombstone(ownedInput(seeded, second, {
    now: BASE_TIME + 23,
  }));
  assert.equal(rawIntent(database, seeded).claim_epoch, 2);
  database.close();
});

test("SQLite ACK claim families reject every cross-facet settlement with zero row mutation", async () => {
  const attempts = [
    {
      messageId: "message-direct-to-tombstone",
      deliveryId: "500-0",
      claimFacet: "directAck",
      settlementFacet: "ackReconciliation",
      operation: "commitTombstone",
    },
    {
      messageId: "message-direct-to-orphan",
      deliveryId: "501-0",
      claimFacet: "directAck",
      settlementFacet: "ackReconciliation",
      operation: "commitOrphan",
    },
    {
      messageId: "message-reconciliation-to-direct",
      deliveryId: "502-0",
      claimFacet: "ackReconciliation",
      settlementFacet: "directAck",
      operation: "commit",
    },
    {
      messageId: "message-direct-to-renew",
      deliveryId: "503-0",
      claimFacet: "directAck",
      settlementFacet: "ackReconciliation",
      operation: "renew",
      input: { leaseMs: 100 },
    },
    {
      messageId: "message-direct-to-reconciliation-defer",
      deliveryId: "504-0",
      claimFacet: "directAck",
      settlementFacet: "ackReconciliation",
      operation: "defer",
      input: {
        reasonCode: "TRANSPORT_UNAVAILABLE",
        retryAt: BASE_TIME + 30,
      },
    },
    {
      messageId: "message-direct-to-recovery",
      deliveryId: "506-0",
      claimFacet: "directAck",
      settlementFacet: "ackReconciliation",
      operation: "markAckRecoveryRequired",
      input: { reasonCode: "TRANSPORT_STATE_UNKNOWN" },
    },
    {
      messageId: "message-reconciliation-to-direct-defer",
      deliveryId: "505-0",
      claimFacet: "ackReconciliation",
      settlementFacet: "directAck",
      operation: "defer",
      input: {
        reasonCode: "TRANSPORT_UNAVAILABLE",
        retryAt: BASE_TIME + 30,
      },
    },
  ];

  for (const attempt of attempts) {
    const { database, repository } = openRepository();
    const seeded = await seedIntent(repository, attempt);
    assert.equal(typeof repository[attempt.claimFacet]?.claim, "function");
    assert.equal(
      typeof repository[attempt.settlementFacet]?.[attempt.operation],
      "function",
    );
    const claim = await repository[attempt.claimFacet].claim(
      claimInput(seeded),
    );
    const before = {
      rows: durableSnapshot(database, seeded),
      summary:
        await repository.ackReconciliation.getAckReconciliationSummary(),
    };
    await assert.rejects(
      repository[attempt.settlementFacet][attempt.operation](
        ownedInput(seeded, claim, attempt.input),
      ),
      /not owned/,
    );
    assert.deepEqual({
      rows: durableSnapshot(database, seeded),
      summary:
        await repository.ackReconciliation.getAckReconciliationSummary(),
    }, before);
    database.close();
  }
});

test("SQLite ACK inputs reject accessors and unsupported fields without reading or mutating", async () => {
  const { database, repository } = openRepository();
  const seeded = await seedIntent(repository, {
    messageId: "message-closed-input",
    deliveryId: "550-0",
  });
  const before = durableSnapshot(database, seeded);
  let reads = 0;
  const hostile = {
    consumeKey: seeded.consumeKey,
    deliveryId: seeded.deliveryId,
    ownerId: "ack-owner",
    leaseMs: 100,
  };
  Object.defineProperty(hostile, "now", {
    enumerable: true,
    get() {
      reads += 1;
      return BASE_TIME + 10;
    },
  });

  await assert.rejects(
    repository.ackReconciliation.claim(hostile),
    TypeError,
  );
  await assert.rejects(
    repository.ackReconciliation.claim({
      ...claimInput(seeded),
      proof: "ACK_TOMBSTONE",
    }),
    TypeError,
  );
  assert.equal(reads, 0);
  assert.deepEqual(durableSnapshot(database, seeded), before);
  database.close();
});

test("SQLite commits each closed ACK proof exactly once and retries idempotently", async () => {
  const { database, repository } = openRepository();
  const cases = [
    {
      proof: "DIRECT_ACK",
      messageId: "message-proof-direct",
      deliveryId: "600-0",
      facet: repository.directAck,
      operation: "commit",
    },
    {
      proof: "ACK_TOMBSTONE",
      messageId: "message-proof-tombstone",
      deliveryId: "601-0",
      facet: repository.ackReconciliation,
      operation: "commitTombstone",
    },
    {
      proof: "ORPHAN_ACK",
      messageId: "message-proof-orphan",
      deliveryId: "602-0",
      facet: repository.ackReconciliation,
      operation: "commitOrphan",
    },
  ];

  for (const scenario of cases) {
    assert.equal(typeof scenario.facet?.claim, "function");
    const seeded = await seedIntent(repository, scenario);
    const claim = await scenario.facet.claim(claimInput(seeded));
    const input = ownedInput(seeded, claim);
    assert.deepEqual(
      await scenario.facet[scenario.operation](input),
      { status: "committed" },
    );
    const afterFirst = durableSnapshot(database, seeded);
    assert.deepEqual(
      await scenario.facet[scenario.operation](input),
      { status: "committed" },
    );
    assert.deepEqual(durableSnapshot(database, seeded), afterFirst);
    assert.equal(afterFirst.intent.proof, scenario.proof);
    assert.equal(afterFirst.intent.committed_at, input.now);
    assert.equal(afterFirst.receipt.state, "completed");
    assert.equal(afterFirst.delivery.ack_state, "acked");
    assert.equal(afterFirst.delivery.acked_at, input.now);
  }

  assert.deepEqual(
    await repository.ackReconciliation.getAckReconciliationSummary(),
    {
      total: 3,
      pending: 0,
      claimed: 0,
      deferred: 0,
      committed: 3,
      recoveryRequired: 0,
      proofs: {
        DIRECT_ACK: 1,
        ACK_TOMBSTONE: 1,
        ORPHAN_ACK: 1,
      },
    },
  );
  database.close();
});

test("SQLite recovery_required is terminal and never completes the receipt", async () => {
  const { database, repository } = openRepository();
  const seeded = await seedIntent(repository, {
    messageId: "message-recovery-terminal",
    deliveryId: "700-0",
  });
  const port = repository.ackReconciliation;
  assert.equal(typeof port?.markAckRecoveryRequired, "function");
  const claim = await port.claim(claimInput(seeded));
  const beforeInvalidReason = durableSnapshot(database, seeded);
  await assert.rejects(
    port.markAckRecoveryRequired(ownedInput(seeded, claim, {
      reasonCode: "UNKNOWN_REASON",
    })),
    TypeError,
  );
  assert.deepEqual(
    durableSnapshot(database, seeded),
    beforeInvalidReason,
  );
  const recoveryInput = ownedInput(seeded, claim, {
    reasonCode: "TRANSPORT_STATE_UNKNOWN",
  });
  assert.deepEqual(
    await port.markAckRecoveryRequired(recoveryInput),
    { status: "recovery_required" },
  );
  assert.deepEqual(
    await port.markAckRecoveryRequired(recoveryInput),
    { status: "recovery_required" },
  );
  const terminal = durableSnapshot(database, seeded);

  assert.equal(terminal.intent.state, "recovery_required");
  assert.equal(terminal.intent.reason_code, "TRANSPORT_STATE_UNKNOWN");
  assert.equal(terminal.intent.proof, null);
  assert.equal(terminal.receipt.state, "effect_committed");
  assert.equal(terminal.delivery.ack_state, "acknowledging");
  assert.equal(terminal.delivery.acked_at, null);
  assert.equal(
    (await repository.prepareAck({
      consumeKey: seeded.consumeKey,
      deliveryId: seeded.deliveryId,
      now: BASE_TIME + 20,
    })).status,
    "recovery_required",
  );
  assert.equal(
    (await port.claim(claimInput(seeded, {
      now: BASE_TIME + 20,
    }))).status,
    "recovery_required",
  );
  await assert.rejects(
    port.commitTombstone(ownedInput(seeded, claim, {
      now: BASE_TIME + 20,
    })),
    /not owned/,
  );
  assert.deepEqual(durableSnapshot(database, seeded), terminal);
  database.close();
});

test("SQLite stale-list corruption becomes recovery_required instead of a false completion", async () => {
  for (const mutation of [
    {
      messageId: "message-corrupt-state",
      deliveryId: "800-0",
      sql: "state = 'unknown_state'",
    },
    {
      messageId: "message-ambiguous-proof",
      deliveryId: "801-0",
      sql: "proof = 'ACK_TOMBSTONE'",
    },
    {
      messageId: "message-corrupt-claim-token",
      deliveryId: "802-0",
      sql: "state = 'claimed', claim_epoch = 1, "
        + "claim_family = 'reconciliation', "
        + "claim_owner_id = 'corrupt-owner', "
        + "claim_token = 'ack-corrupt-token', "
        + `claim_expires_at = ${BASE_TIME + 100}`,
    },
  ]) {
    const { database, repository } = openRepository();
    const seeded = await seedIntent(repository, mutation);
    const port = repository.ackReconciliation;
    const stalePage = await port.list({
      cursor: null,
      limit: 1,
      now: BASE_TIME + 10,
    });
    assert.equal(stalePage.intents.length, 1);
    database.pragma("ignore_check_constraints = ON");
    try {
      database.prepare(
        "UPDATE coordination_consumer_ack_intents SET "
        + `${mutation.sql} WHERE consume_key = ? AND delivery_id = ?`,
      ).run(seeded.consumeKey, seeded.deliveryId);
    } finally {
      database.pragma("ignore_check_constraints = OFF");
    }

    const result = await port.claim(claimInput(seeded));
    const stored = durableSnapshot(database, seeded);
    assert.equal(result.status, "recovery_required");
    assert.equal(result.intent.reasonCode, "TRANSPORT_STATE_UNKNOWN");
    assert.equal(stored.intent.state, "recovery_required");
    assert.equal(stored.intent.proof, null);
    assert.equal(stored.receipt.state, "effect_committed");
    assert.equal(stored.delivery.ack_state, "acknowledging");
    assert.equal(stored.delivery.acked_at, null);
    database.close();
  }
});

test("SQLite ACK listing seeks bounded due work independently of outbox population", async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "coord-ack-outbox-work-bound-"),
  );
  const file = path.join(directory, "outbox.db");
  let database;
  try {
    database = openRawDatabase(file);
    insertSyntheticIntents(database, {
      start: 1,
      count: 10,
      dueAt: 1_000,
    });
    const prepared = [];
    const trackingDatabase = {
      backend: "sqlite",
      pragma(...args) {
        return database.pragma(...args);
      },
      prepare(sql) {
        prepared.push(sql);
        return database.prepare(sql);
      },
      transaction(action) {
        return database.transaction(action);
      },
    };
    const repository = createSqliteCoordinationConsumerRepository({
      database: trackingDatabase,
    });
    assert.deepEqual(await repository.ackReconciliation.list({
      cursor: null,
      limit: 1,
      now: 100,
    }), {
      intents: [],
      nextCursor: null,
    });
    const noCursorSql = prepared.find((sql) =>
      /SELECT \*[\s\S]+FROM main\.coordination_consumer_ack_intents/.test(sql));
    assert.equal(typeof noCursorSql, "string");
    const noCursorBindings = {
      now: 100,
      fetchLimit: 2,
      cursorEligibleAt: null,
      cursorConsumeKey: null,
      cursorDeliveryId: null,
    };
    const smallPlan = database
      .prepare(`EXPLAIN QUERY PLAN ${noCursorSql}`)
      .all(bindingsFor(noCursorSql, noCursorBindings));
    database.close();
    database = null;

    const smallFutureWork = sqliteStatementStats(
      file,
      noCursorSql,
      noCursorBindings,
    );

    database = openRawDatabase(file);
    insertSyntheticIntents(database, {
      start: 11,
      count: 9_990,
      dueAt: 1_000,
    });
    database.close();
    database = null;
    const largeFutureWork = sqliteStatementStats(
      file,
      noCursorSql,
      noCursorBindings,
    );

    database = openRawDatabase(file);
    database
      .prepare(
        "UPDATE coordination_consumer_ack_intents SET due_at = 50",
      )
      .run();
    const cursorPrepared = [];
    const cursorTrackingDatabase = {
      backend: "sqlite",
      pragma(...args) {
        return database.pragma(...args);
      },
      prepare(sql) {
        cursorPrepared.push(sql);
        return database.prepare(sql);
      },
      transaction(action) {
        return database.transaction(action);
      },
    };
    const cursorRepository = createSqliteCoordinationConsumerRepository({
      database: cursorTrackingDatabase,
    });
    const firstPage = await cursorRepository.ackReconciliation.list({
      cursor: null,
      limit: 1,
      now: 100,
    });
    assert.equal(typeof firstPage.nextCursor, "string");
    cursorPrepared.length = 0;
    await cursorRepository.ackReconciliation.list({
      cursor: firstPage.nextCursor,
      limit: 1,
      now: 100,
    });
    const cursorSql = cursorPrepared.find((sql) =>
      /SELECT \*[\s\S]+FROM main\.coordination_consumer_ack_intents/.test(sql));
    assert.equal(typeof cursorSql, "string");
    const anchor = database
      .prepare(
        `SELECT
           CASE
             WHEN state = 'claimed' THEN claim_expires_at
             ELSE due_at
           END AS eligible_at,
           consume_key,
           delivery_id
         FROM coordination_consumer_ack_intents
         ORDER BY eligible_at, consume_key, delivery_id
         LIMIT 1 OFFSET 9000`,
      )
      .get();
    const cursorBindings = {
      now: 100,
      fetchLimit: 2,
      cursorEligibleAt: anchor.eligible_at,
      cursorConsumeKey: anchor.consume_key,
      cursorDeliveryId: anchor.delivery_id,
    };
    const cursorPlan = database
      .prepare(`EXPLAIN QUERY PLAN ${cursorSql}`)
      .all(bindingsFor(cursorSql, cursorBindings));
    database.close();
    database = null;

    const frontDueWork = sqliteStatementStats(
      file,
      noCursorSql,
      noCursorBindings,
    );
    const deepCursorWork = sqliteStatementStats(
      file,
      cursorSql,
      cursorBindings,
    );
    const smallPlanDetails = smallPlan.map(({ detail }) => detail);
    const cursorPlanDetails = cursorPlan.map(({ detail }) => detail);
    assert.equal(
      smallPlanDetails.some((detail) =>
        detail.includes(
          "SEARCH main.coordination_consumer_ack_intents "
          + "USING INDEX idx_coord_consumer_ack_outbox_due_cursor",
        )),
      true,
      JSON.stringify(smallPlanDetails),
    );
    assert.equal(
      smallPlanDetails.some((detail) =>
        detail.includes("SCAN main.coordination_consumer_ack_intents")),
      false,
      JSON.stringify(smallPlanDetails),
    );
    assert.equal(smallFutureWork.fullscanSteps, 0);
    assert.equal(largeFutureWork.fullscanSteps, 0);
    assert.ok(
      largeFutureWork.virtualMachineSteps
        <= smallFutureWork.virtualMachineSteps + 32,
      JSON.stringify({ smallFutureWork, largeFutureWork }),
    );
    assert.equal(
      cursorPlanDetails.some((detail) =>
        detail.includes(
          "(eligible_at,consume_key,delivery_id)>(?,?,?)",
        )),
      true,
      JSON.stringify(cursorPlanDetails),
    );
    assert.equal(deepCursorWork.fullscanSteps, 0);
    assert.ok(
      deepCursorWork.virtualMachineSteps
        <= frontDueWork.virtualMachineSteps + 64,
      JSON.stringify({ frontDueWork, deepCursorWork }),
    );
  } finally {
    database?.close();
    fs.rmSync(directory, { recursive: true });
  }
});

test("SQLite ACK cursor orders eligibility before identity across due times", async () => {
  const { database, repository } = openRepository();
  const seeded = [];
  for (let index = 0; index < 6; index += 1) {
    const intent = await seedIntent(repository, {
      messageId: `message-mixed-due-${index}`,
      deliveryId: `${840 + index}-0`,
    });
    seeded.push(intent);
  }
  const dueTimes = [
    BASE_TIME + 8,
    BASE_TIME + 3,
    BASE_TIME + 7,
    BASE_TIME + 2,
    BASE_TIME + 6,
    BASE_TIME + 2,
  ];
  for (const [index, intent] of seeded.entries()) {
    database
      .prepare(
        "UPDATE coordination_consumer_ack_intents SET due_at = ? "
        + "WHERE consume_key = ? AND delivery_id = ?",
      )
      .run(dueTimes[index], intent.consumeKey, intent.deliveryId);
  }
  const expected = database
    .prepare(
      "SELECT consume_key, delivery_id "
      + "FROM coordination_consumer_ack_intents "
      + "ORDER BY due_at, consume_key, delivery_id",
    )
    .all()
    .map((row) => `${row.consume_key}:${row.delivery_id}`);
  const observed = [];
  const cursors = new Set();
  let cursor = null;
  while (true) {
    const page = await repository.ackReconciliation.list({
      cursor,
      limit: 1,
      now: BASE_TIME + 10,
    });
    observed.push(...page.intents.map((intent) =>
      `${intent.consumeKey}:${intent.deliveryId}`));
    if (page.nextCursor === null) break;
    assert.equal(cursors.has(page.nextCursor), false);
    cursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }
  assert.deepEqual(observed, expected);
  database.close();
});

test("SQLite ACK summary fails closed for invalid, unsettled, and cross-family proof rows", async () => {
  const scenarios = [
    {
      messageId: "message-summary-missing-authority",
      deliveryId: "850-0",
      mutation: "state = 'committed', due_at = NULL, "
        + "proof = 'DIRECT_ACK', committed_at = 12345",
    },
    {
      messageId: "message-summary-missing-proof",
      deliveryId: "851-0",
      claim: true,
      mutation: "state = 'committed', due_at = NULL, "
        + "claim_expires_at = NULL, proof = NULL, committed_at = 12345",
    },
    {
      messageId: "message-summary-open-proof",
      deliveryId: "852-0",
      mutation: "proof = 'ACK_TOMBSTONE'",
    },
    {
      messageId: "message-summary-unsettled-proof",
      deliveryId: "853-0",
      claim: true,
      mutation: "state = 'committed', due_at = NULL, "
        + "claim_expires_at = NULL, proof = 'DIRECT_ACK', "
        + "committed_at = 12345",
    },
    {
      messageId: "message-summary-direct-as-orphan",
      deliveryId: "854-0",
      settlementFacet: "directAck",
      operation: "commit",
      family: "direct",
      proof: "DIRECT_ACK",
      mutation: "proof = 'ORPHAN_ACK'",
    },
    {
      messageId: "message-summary-reconciliation-as-direct",
      deliveryId: "855-0",
      settlementFacet: "ackReconciliation",
      operation: "commitOrphan",
      family: "reconciliation",
      proof: "ORPHAN_ACK",
      mutation: "proof = 'DIRECT_ACK'",
    },
  ];

  for (const scenario of scenarios) {
    const { database, repository } = openRepository();
    const seeded = await seedIntent(repository, scenario);
    let settled;
    if (scenario.settlementFacet) {
      const facet = repository[scenario.settlementFacet];
      const claim = await facet.claim(claimInput(seeded));
      assert.equal(claim.status, "claimed");
      assert.deepEqual(
        await facet[scenario.operation](ownedInput(seeded, claim)),
        { status: "committed" },
      );
      settled = durableSnapshot(database, seeded);
      assert.equal(settled.intent.claim_family, scenario.family);
      assert.equal(settled.intent.proof, scenario.proof);
      assert.equal(settled.receipt.state, "completed");
      assert.equal(settled.delivery.ack_state, "acked");
    } else if (scenario.claim) {
      const claim = await repository.directAck.claim(
        claimInput(seeded),
      );
      assert.equal(claim.status, "claimed");
    }
    injectIntentMutation(database, seeded, scenario.mutation);
    const before = durableSnapshot(database, seeded);
    if (scenario.settlementFacet) {
      assert.deepEqual(
        {
          ...before,
          intent: {
            ...before.intent,
            proof: scenario.proof,
          },
        },
        settled,
      );
      assert.equal(before.intent.claim_family, scenario.family);
      assert.equal(before.receipt.state, "completed");
      assert.equal(before.delivery.ack_state, "acked");
    }
    let summaryResult;
    await assert.rejects(
      async () => {
        summaryResult =
          await repository.ackReconciliation.getAckReconciliationSummary();
      },
      (error) =>
        error?.code === "COORDINATION_CONSUMER_STORE_CORRUPT",
      scenario.messageId,
    );
    assert.equal(summaryResult, undefined);
    assert.deepEqual(durableSnapshot(database, seeded), before);
    database.close();
  }
});

test("SQLite ACK pagination advances across corrupt rows without hiding healthy work", async () => {
  const cases = [
    { label: "beginning", corruptPositions: [0, 1] },
    { label: "middle", corruptPositions: [2, 3] },
    { label: "end", corruptPositions: [5, 6] },
  ];
  for (const scenario of cases) {
    const { database, repository } = openRepository();
    for (let index = 0; index < 7; index += 1) {
      await seedIntent(repository, {
        messageId: `message-corrupt-page-${scenario.label}-${index}`,
        deliveryId: `${860 + index}-0`,
      });
    }
    const ordered = database
      .prepare(
        "SELECT consume_key, delivery_id "
        + "FROM coordination_consumer_ack_intents "
        + "ORDER BY due_at, consume_key, delivery_id",
      )
      .all();
    const corrupt = new Set(
      scenario.corruptPositions.map((position) =>
        `${ordered[position].consume_key}:${ordered[position].delivery_id}`),
    );
    database.pragma("ignore_check_constraints = ON");
    try {
      for (const position of scenario.corruptPositions) {
        database
          .prepare(
            "UPDATE coordination_consumer_ack_intents "
            + "SET proof = 'ACK_TOMBSTONE' "
            + "WHERE consume_key = ? AND delivery_id = ?",
          )
          .run(
            ordered[position].consume_key,
            ordered[position].delivery_id,
          );
      }
    } finally {
      database.pragma("ignore_check_constraints = OFF");
    }

    const expectedHealthy = ordered
      .map((row) => `${row.consume_key}:${row.delivery_id}`)
      .filter((key) => !corrupt.has(key))
      .sort();
    const seen = new Set();
    const cursors = new Set();
    let cursor = null;
    let pageNumber = 0;
    while (true) {
      const page = await repository.ackReconciliation.list({
        cursor,
        limit: 1,
        now: BASE_TIME + 10,
      });
      if (scenario.label === "beginning" && pageNumber === 0) {
        assert.deepEqual(page.intents, []);
        assert.equal(typeof page.nextCursor, "string");
      }
      for (const intent of page.intents) {
        const key = `${intent.consumeKey}:${intent.deliveryId}`;
        assert.equal(seen.has(key), false, `re-emitted ${key}`);
        assert.equal(corrupt.has(key), false, `emitted corrupt ${key}`);
        seen.add(key);
        const ownerId = `page-owner-${scenario.label}`;
        const claim = await repository.ackReconciliation.claim({
          consumeKey: intent.consumeKey,
          deliveryId: intent.deliveryId,
          ownerId,
          now: BASE_TIME + 10,
          leaseMs: 100,
        });
        assert.equal(claim.status, "claimed");
        await repository.ackReconciliation.commitOrphan({
          consumeKey: intent.consumeKey,
          deliveryId: intent.deliveryId,
          ownerId,
          claimToken: claim.claimToken,
          now: BASE_TIME + 11,
        });
      }
      pageNumber += 1;
      assert.ok(pageNumber < 30, "cursor traversal did not terminate");
      if (page.nextCursor === null) break;
      assert.equal(cursors.has(page.nextCursor), false);
      cursors.add(page.nextCursor);
      cursor = page.nextCursor;
    }
    assert.deepEqual([...seen].sort(), expectedHealthy);
    assert.equal(
      database
        .prepare(
          "SELECT COUNT(*) AS count "
          + "FROM coordination_consumer_ack_intents "
          + "WHERE state = 'recovery_required'",
        )
        .get()
        .count,
      scenario.corruptPositions.length,
    );
    assert.deepEqual(await repository.ackReconciliation.list({
      cursor: null,
      limit: 100,
      now: BASE_TIME + 20,
    }), {
      intents: [],
      nextCursor: null,
    });
    database.close();
  }
});

test("SQLite list is cursor-driven, detached, and never re-emits settlements", async () => {
  const rawDatabase = openRawDatabase();
  const prepared = [];
  const trackingDatabase = {
    backend: "sqlite",
    pragma(...args) {
      return rawDatabase.pragma(...args);
    },
    prepare(sql) {
      prepared.push(sql);
      return rawDatabase.prepare(sql);
    },
    transaction(action) {
      return rawDatabase.transaction(action);
    },
  };
  const repository = createSqliteCoordinationConsumerRepository({
    database: trackingDatabase,
  });
  for (const [index, messageId] of [
    "message-cursor-a",
    "message-cursor-b",
    "message-cursor-c",
    "message-cursor-d",
    "message-cursor-e",
  ].entries()) {
    await seedIntent(repository, {
      messageId,
      deliveryId: `${900 + index}-0`,
    });
  }
  const port = repository.ackReconciliation;
  assert.equal(typeof port?.list, "function");
  const seen = new Set();
  let cursor = null;
  await assert.rejects(
    port.list({
      cursor: "invalid-cursor",
      limit: 2,
      now: BASE_TIME + 10,
    }),
    TypeError,
  );
  await assert.rejects(
    port.list({
      cursor: null,
      limit: 101,
      now: BASE_TIME + 10,
    }),
    TypeError,
  );
  prepared.length = 0;
  const firstPage = await port.list({
    cursor: null,
    limit: 2,
    now: BASE_TIME + 10,
  });
  const firstListSql = prepared.find((sql) =>
    /SELECT[\s\S]+FROM main\.coordination_consumer_ack_intents/.test(sql));
  assert.match(firstListSql, /LIMIT @fetchLimit/);
  const secondPage = await port.list({
    cursor: firstPage.nextCursor,
    limit: 2,
    now: BASE_TIME + 10,
  });
  assert.equal(firstPage.intents.length, 2);
  assert.equal(secondPage.intents.length, 2);
  const firstPageKeys = new Set(firstPage.intents.map((intent) =>
    `${intent.consumeKey}:${intent.deliveryId}`));
  assert.equal(
    secondPage.intents.some((intent) =>
      firstPageKeys.has(`${intent.consumeKey}:${intent.deliveryId}`)),
    false,
  );

  while (true) {
    prepared.length = 0;
    const page = await port.list({
      cursor,
      limit: 2,
      now: BASE_TIME + 10,
    });
    assert.ok(page.intents.length <= 2);
    const listSql = prepared.find((sql) =>
      /SELECT[\s\S]+FROM main\.coordination_consumer_ack_intents/.test(sql));
    assert.match(listSql, /LIMIT @fetchLimit/);
    for (const intent of page.intents) {
      assert.equal(Object.getPrototypeOf(intent), Object.prototype);
      assert.equal(
        Object.values(Object.getOwnPropertyDescriptors(intent))
          .every((descriptor) => Object.hasOwn(descriptor, "value")),
        true,
      );
      const key = `${intent.consumeKey}:${intent.deliveryId}`;
      assert.equal(seen.has(key), false, `re-emitted ${key}`);
      seen.add(key);
      const claim = await port.claim({
        consumeKey: intent.consumeKey,
        deliveryId: intent.deliveryId,
        ownerId: "cursor-owner",
        now: BASE_TIME + 10,
        leaseMs: 100,
      });
      await port.commitOrphan({
        consumeKey: intent.consumeKey,
        deliveryId: intent.deliveryId,
        ownerId: "cursor-owner",
        claimToken: claim.claimToken,
        now: BASE_TIME + 11,
      });
    }
    if (page.intents.length > 0) {
      page.intents[0].state = "hostile-local-mutation";
    }
    if (page.nextCursor === null) break;
    cursor = page.nextCursor;
  }

  assert.equal(seen.size, 5);
  assert.deepEqual(await port.list({
    cursor: null,
    limit: 2,
    now: BASE_TIME + 20,
  }), {
    intents: [],
    nextCursor: null,
  });
  assert.equal(
    rawDatabase
      .prepare(
        "SELECT COUNT(*) AS count "
        + "FROM coordination_consumer_ack_intents "
        + "WHERE state = 'committed'",
      )
      .get()
      .count,
    5,
  );
  rawDatabase.close();
});
