import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  CoordinationError,
  createCoordinationService,
} from "../../gateway/src/services/coordination_service.js";

const START = Date.parse("2026-07-25T10:00:00.000Z");
const TOKEN = "lifecycle-token-with-at-least-thirty-two-chars";
const OTHER_TOKEN = "replacement-token-with-at-least-thirty-two-chars";

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function fenceMatches(record, fence) {
  return Boolean(
    record
    && fence
    && record.participantId === fence.participantId
    && record.scopeId === fence.scopeId
    && record.leaseTokenHash === fence.leaseTokenHash,
  );
}

class LifecycleQueue {
  constructor() {
    this.enabled = true;
    this.participants = new Map();
    this.putCalls = [];
    this.deleteCalls = [];
    this.beforeFencedPut = null;
    this.beforeDelete = null;
    this.getError = null;
  }

  describe() {
    return {
      enabled: true,
      prefix: "test:coord:v1",
      eventsStream: "test:coord:v1:events",
      consumerGroup: "coordination-v1",
    };
  }

  async putParticipant(record, options) {
    this.putCalls.push({ record: structuredClone(record), options: structuredClone(options) });
    if (options.ifAbsent) {
      if (this.participants.has(record.participantId)) return { status: "exists" };
      this.participants.set(record.participantId, structuredClone(record));
      return { status: "stored" };
    }

    this.beforeFencedPut?.();
    this.beforeFencedPut = null;
    const current = this.participants.get(record.participantId);
    if (!current) return { status: "missing" };
    if (!fenceMatches(current, options.fence)) return { status: "fence_mismatch" };
    this.participants.set(record.participantId, structuredClone(record));
    return { status: "stored" };
  }

  async getParticipant(participantId) {
    if (this.getError) throw this.getError;
    return structuredClone(this.participants.get(participantId) ?? null);
  }

  async deleteParticipant(participantId, options) {
    this.deleteCalls.push({ participantId, options: structuredClone(options) });
    this.beforeDelete?.();
    this.beforeDelete = null;
    const current = this.participants.get(participantId);
    if (!current) return { status: "missing" };
    if (!fenceMatches(current, options.fence)) return { status: "fence_mismatch" };
    this.participants.delete(participantId);
    return { status: "deleted" };
  }
}

async function createHarness({ config = {} } = {}) {
  let now = START;
  const queue = new LifecycleQueue();
  const audits = [];
  const service = createCoordinationService({
    queue,
    config: {
      coordinationLeaseDefaultMs: 30_000,
      coordinationLeaseMaxMs: 300_000,
      ...config,
    },
    clock: () => now,
    randomUUID: () => "lifecycle",
    randomToken: () => TOKEN,
    audit: (event) => audits.push(event),
  });
  const registered = await service.register({
    participantType: "orchestrator",
    scopeId: "project:v5",
    displayName: "Lifecycle owner",
    capabilities: ["coordination.v1"],
    metadata: { version: "5" },
  });
  audits.length = 0;
  queue.putCalls.length = 0;

  return {
    audits,
    queue,
    registered,
    service,
    advance(ms) {
      now += ms;
    },
    now: () => now,
  };
}

async function expectCode(promise, code) {
  await assert.rejects(
    promise,
    (err) =>
      err instanceof CoordinationError
      && err.code === code
      && !err.message.includes("sentinel"),
  );
}

function credentials(registered, overrides = {}) {
  return {
    participantId: registered.participantId,
    leaseToken: registered.leaseToken,
    ...overrides,
  };
}

function replacement(record) {
  return {
    ...structuredClone(record),
    scopeId: "replacement:scope",
    leaseTokenHash: tokenHash(OTHER_TOKEN),
    registeredAt: "2026-07-25T10:00:05.000Z",
    lastHeartbeatAt: "2026-07-25T10:00:05.000Z",
    leaseExpiresAt: "2026-07-25T10:01:05.000Z",
  };
}

test("heartbeat authenticates and renews through a digest-and-scope fence", async () => {
  const { audits, queue, registered, service, advance, now } = await createHarness();
  advance(10_000);

  const renewed = await service.heartbeat(credentials(registered, {
    leaseTtlMs: 60_000,
  }));

  assert.equal(renewed.registeredAt, registered.registeredAt);
  assert.equal(renewed.lastHeartbeatAt, "2026-07-25T10:00:10.000Z");
  assert.equal(renewed.leaseExpiresAt, "2026-07-25T10:01:10.000Z");
  assert.equal(renewed.leaseToken, undefined);
  assert.equal(renewed.leaseTokenHash, undefined);
  assert.equal(renewed.queue, undefined);
  assert.deepEqual(queue.putCalls[0].options, {
    ttlMs: 60_000,
    ifAbsent: false,
    fence: {
      participantId: registered.participantId,
      scopeId: registered.scopeId,
      leaseTokenHash: tokenHash(TOKEN),
    },
  });
  assert.deepEqual(audits, [{
    type: "COORDINATION_PARTICIPANT_HEARTBEAT",
    participantId: registered.participantId,
    participantType: "orchestrator",
    scopeId: "project:v5",
    timestamp: now(),
    leaseTtlMs: 60_000,
  }]);
  assert.doesNotMatch(JSON.stringify(audits), /leaseToken|leaseTokenHash|sentinel/);
});

test("heartbeat uses the orchestrator default and accepts the inclusive one-hour maximum", async () => {
  const { queue, registered, service } = await createHarness({
    config: {
      coordinationScopeId: "project:v5",
      coordinationLeaseDefaultMs: 900_000,
      coordinationLeaseMaxMs: 3_600_000,
    },
  });

  const defaultRenewal = await service.heartbeat(credentials(registered));
  assert.equal(defaultRenewal.leaseExpiresAt, "2026-07-25T10:15:00.000Z");
  assert.equal(queue.putCalls[0].options.ttlMs, 900_000);

  const maximumRenewal = await service.heartbeat(credentials(registered, {
    leaseTtlMs: 3_600_000,
  }));
  assert.equal(maximumRenewal.leaseExpiresAt, "2026-07-25T11:00:00.000Z");
  assert.equal(queue.putCalls[1].options.ttlMs, 3_600_000);

  await assert.rejects(
    service.heartbeat(credentials(registered, {
      leaseTtlMs: 3_600_001,
    })),
    (err) =>
      err instanceof CoordinationError
      && err.code === "COORDINATION_INVALID_INPUT"
      && err.message === "leaseTtlMs exceeds maximum 3600000",
  );
  assert.equal(queue.putCalls.length, 2);
});

test("heartbeat rejects malformed, wrong, expired, missing, and excessive credentials", async () => {
  const { queue, registered, service, advance } = await createHarness();

  await expectCode(
    service.heartbeat(credentials(registered, {
      leaseToken: OTHER_TOKEN,
    })),
    "COORDINATION_AUTH_FAILED",
  );
  await expectCode(
    service.heartbeat(credentials(registered, {
      leaseTtlMs: 300_001,
    })),
    "COORDINATION_INVALID_INPUT",
  );
  await expectCode(
    service.heartbeat({
      participantId: registered.participantId,
      leaseToken: "short",
    }),
    "COORDINATION_INVALID_INPUT",
  );
  await expectCode(
    service.heartbeat({
      ...credentials(registered),
      unexpected: "sentinel",
    }),
    "COORDINATION_INVALID_INPUT",
  );

  advance(30_000);
  await expectCode(
    service.heartbeat(credentials(registered)),
    "COORDINATION_LEASE_EXPIRED",
  );

  queue.participants.delete(registered.participantId);
  await expectCode(
    service.heartbeat(credentials(registered)),
    "COORDINATION_AUTH_FAILED",
  );
  assert.equal(queue.putCalls.length, 0);
});

test("heartbeat fails closed when the presence changes after authentication", async () => {
  const { audits, queue, registered, service } = await createHarness();
  const original = queue.participants.get(registered.participantId);
  const swapped = replacement(original);
  queue.beforeFencedPut = () => {
    queue.participants.set(registered.participantId, structuredClone(swapped));
  };

  await expectCode(
    service.heartbeat(credentials(registered)),
    "COORDINATION_LEASE_CHANGED",
  );

  assert.deepEqual(queue.participants.get(registered.participantId), swapped);
  assert.deepEqual(audits, []);
});

test("unregister authenticates an existing presence and is a no-op when absent", async () => {
  const { audits, queue, registered, service, now } = await createHarness();

  await expectCode(
    service.unregister(credentials(registered, {
      leaseToken: OTHER_TOKEN,
    })),
    "COORDINATION_AUTH_FAILED",
  );

  assert.deepEqual(
    await service.unregister(credentials(registered)),
    { participantId: registered.participantId, unregistered: true },
  );
  assert.deepEqual(queue.deleteCalls[0], {
    participantId: registered.participantId,
    options: {
      fence: {
        participantId: registered.participantId,
        scopeId: registered.scopeId,
        leaseTokenHash: tokenHash(TOKEN),
      },
      participantType: "orchestrator",
      scopeId: "project:v5",
      timestamp: "2026-07-25T10:00:00.000Z",
    },
  });
  assert.deepEqual(
    await service.unregister(credentials(registered)),
    { participantId: registered.participantId, unregistered: false },
  );
  assert.equal(queue.deleteCalls.length, 1);
  assert.deepEqual(audits, [{
    type: "COORDINATION_PARTICIPANT_UNREGISTERED",
    participantId: registered.participantId,
    participantType: "orchestrator",
    scopeId: "project:v5",
    timestamp: now(),
    unregistered: true,
  }]);
});

test("unregister rejects expiry and a replacement race without deleting the replacement", async () => {
  const expiredHarness = await createHarness();
  expiredHarness.advance(30_000);
  await expectCode(
    expiredHarness.service.unregister(credentials(expiredHarness.registered)),
    "COORDINATION_LEASE_EXPIRED",
  );
  assert.equal(expiredHarness.queue.deleteCalls.length, 0);

  const raceHarness = await createHarness();
  const current = raceHarness.queue.participants.get(raceHarness.registered.participantId);
  const swapped = replacement(current);
  raceHarness.queue.beforeDelete = () => {
    raceHarness.queue.participants.set(
      raceHarness.registered.participantId,
      structuredClone(swapped),
    );
  };
  await expectCode(
    raceHarness.service.unregister(credentials(raceHarness.registered)),
    "COORDINATION_LEASE_CHANGED",
  );
  assert.deepEqual(
    raceHarness.queue.participants.get(raceHarness.registered.participantId),
    swapped,
  );
  assert.deepEqual(raceHarness.audits, []);
});

test("lifecycle dependency and stored-data failures remain safe", async () => {
  const { queue, registered, service } = await createHarness();
  queue.getError = new CoordinationError(
    "COORDINATION_UNAVAILABLE",
    "sentinel Redis credentials",
  );
  await expectCode(
    service.heartbeat(credentials(registered)),
    "COORDINATION_UNAVAILABLE",
  );

  queue.getError = null;
  queue.participants.get(registered.participantId).leaseTokenHash = "sentinel-invalid";
  await expectCode(
    service.heartbeat(credentials(registered)),
    "COORDINATION_INTERNAL_ERROR",
  );
});
