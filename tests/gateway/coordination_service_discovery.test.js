import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  CoordinationError,
  createCoordinationService,
} from "../../gateway/src/services/coordination_service.js";

const NOW = Date.parse("2026-07-25T10:00:00.000Z");
const CALLER_TOKEN = "discovery-caller-token-with-thirty-two-characters";

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function matchesFence(record, fence) {
  return Boolean(
    record
    && record.participantId === fence.participantId
    && record.scopeId === fence.scopeId
    && record.leaseTokenHash === fence.leaseTokenHash,
  );
}

class DiscoveryQueue {
  constructor() {
    this.enabled = true;
    this.participants = new Map();
    this.listCalls = [];
    this.beforeList = null;
    this.listError = null;
    this.listStatus = "listed";
    this.listRows = null;
  }

  describe() {
    return {
      enabled: true,
      prefix: "test:coord:v1",
      eventsStream: "test:coord:v1:events",
      consumerGroup: "coordination-v1",
    };
  }

  async putParticipant(record, { ifAbsent }) {
    if (!ifAbsent) throw new Error("unexpected lifecycle write");
    if (this.participants.has(record.participantId)) return { status: "exists" };
    this.participants.set(record.participantId, structuredClone(record));
    return { status: "stored" };
  }

  async getParticipant(participantId) {
    return structuredClone(this.participants.get(participantId) ?? null);
  }

  async listParticipants(options) {
    this.listCalls.push(structuredClone(options));
    if (this.listError) throw this.listError;
    this.beforeList?.();
    this.beforeList = null;
    const caller = this.participants.get(options.fence.participantId);
    if (!matchesFence(caller, options.fence)) return { status: "fence_mismatch" };
    return {
      status: this.listStatus,
      participants: structuredClone(
        this.listRows ?? [...this.participants.values()],
      ),
    };
  }
}

function participant({
  participantId,
  participantType = "agent",
  scopeId = "project:v5",
  capabilities = ["task.review"],
  leaseExpiresAt = "2026-07-25T10:01:00.000Z",
} = {}) {
  return {
    protocolVersion: 1,
    participantId,
    participantType,
    scopeId,
    displayName: participantId,
    capabilities: [...capabilities],
    metadata: { source: participantId },
    registeredAt: "2026-07-25T09:59:00.000Z",
    lastHeartbeatAt: "2026-07-25T09:59:30.000Z",
    leaseExpiresAt,
    leaseTokenHash: tokenHash(`peer-token-${participantId}-with-enough-entropy`),
  };
}

async function createHarness({ audit = null } = {}) {
  const queue = new DiscoveryQueue();
  const audits = [];
  const service = createCoordinationService({
    queue,
    config: {
      coordinationLeaseDefaultMs: 30_000,
      coordinationLeaseMaxMs: 300_000,
    },
    clock: () => NOW,
    randomUUID: () => "caller",
    randomToken: () => CALLER_TOKEN,
    audit: audit ?? ((event) => audits.push(event)),
  });
  const caller = await service.register({
    participantType: "orchestrator",
    scopeId: "project:v5",
    capabilities: ["coordination.v1"],
  });
  audits.length = 0;

  return { audits, caller, queue, service };
}

function discoverInput(caller, overrides = {}) {
  return {
    participantId: caller.participantId,
    leaseToken: caller.leaseToken,
    ...overrides,
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

test("discover returns sorted active public participants in the caller scope", async () => {
  const { audits, caller, queue, service } = await createHarness();
  const reviewer = participant({ participantId: "pt-reviewer" });
  queue.participants.set(reviewer.participantId, reviewer);
  queue.participants.set("pt-builder", participant({
    participantId: "pt-builder",
    participantType: "agent",
    capabilities: ["task.build"],
  }));
  queue.participants.set("pt-other-scope", participant({
    participantId: "pt-other-scope",
    scopeId: "other:scope",
  }));
  queue.participants.set("pt-expired", participant({
    participantId: "pt-expired",
    leaseExpiresAt: "2026-07-25T10:00:00.000Z",
  }));

  const result = await service.discover(discoverInput(caller));

  assert.deepEqual(
    result.map(({ participantId }) => participantId),
    ["pt-builder", "pt-caller", "pt-reviewer"],
  );
  assert.ok(result.every((record) => record.scopeId === "project:v5"));
  assert.ok(result.every((record) => record.leaseTokenHash === undefined));
  assert.ok(result.every((record) => record.leaseToken === undefined));
  assert.notStrictEqual(
    result.find(({ participantId }) => participantId === "pt-reviewer").metadata,
    reviewer.metadata,
  );
  assert.deepEqual(queue.listCalls, [{
    fence: {
      participantId: caller.participantId,
      scopeId: caller.scopeId,
      leaseTokenHash: tokenHash(CALLER_TOKEN),
    },
  }]);
  assert.deepEqual(audits, [{
    type: "COORDINATION_PARTICIPANTS_DISCOVERED",
    participantId: caller.participantId,
    scopeId: caller.scopeId,
    timestamp: NOW,
    participantCount: 3,
  }]);
  assert.doesNotMatch(JSON.stringify(result), /discovery-caller-token|leaseTokenHash/);
});

test("discover applies exact scope, type, and capability filters", async () => {
  const { caller, queue, service } = await createHarness();
  queue.participants.set("pt-reviewer", participant({ participantId: "pt-reviewer" }));
  queue.participants.set("pt-builder", participant({
    participantId: "pt-builder",
    capabilities: ["task.build"],
  }));

  const result = await service.discover(discoverInput(caller, {
    scopeId: "project:v5",
    participantType: "agent",
    capability: "task.review",
  }));

  assert.deepEqual(result.map(({ participantId }) => participantId), ["pt-reviewer"]);
});

test("discover validates filters and rejects an explicit cross-scope request before listing", async () => {
  for (const overrides of [
    { scopeId: "other:scope" },
    { participantType: "worker" },
    { capability: "unsafe capability" },
    { unexpected: "sentinel" },
  ]) {
    const { caller, queue, service } = await createHarness();
    await expectCode(
      service.discover(discoverInput(caller, overrides)),
      overrides.scopeId === "other:scope"
        ? "COORDINATION_SCOPE_MISMATCH"
        : "COORDINATION_INVALID_INPUT",
    );
    assert.equal(queue.listCalls.length, 0);
  }
});

test("discover discloses no rows when the caller disappears or is replaced at the fenced list", async () => {
  for (const change of ["delete", "replace"]) {
    const { audits, caller, queue, service } = await createHarness();
    queue.participants.set("pt-reviewer", participant({ participantId: "pt-reviewer" }));
    queue.beforeList = () => {
      if (change === "delete") {
        queue.participants.delete(caller.participantId);
      } else {
        queue.participants.set(caller.participantId, {
          ...queue.participants.get(caller.participantId),
          scopeId: "replacement:scope",
          leaseTokenHash: tokenHash(
            "replacement-discovery-token-with-thirty-two-chars",
          ),
        });
      }
    };

    await expectCode(
      service.discover(discoverInput(caller)),
      "COORDINATION_LEASE_CHANGED",
    );
    assert.deepEqual(audits, []);
  }
});

test("discover rejects missing, wrong, and expired caller credentials", async () => {
  const wrong = await createHarness();
  await expectCode(
    wrong.service.discover(discoverInput(wrong.caller, {
      leaseToken: "wrong-discovery-token-with-thirty-two-characters",
    })),
    "COORDINATION_AUTH_FAILED",
  );

  const expired = await createHarness();
  expired.queue.participants.get(expired.caller.participantId).leaseExpiresAt =
    "2026-07-25T10:00:00.000Z";
  await expectCode(
    expired.service.discover(discoverInput(expired.caller)),
    "COORDINATION_LEASE_EXPIRED",
  );

  const missing = await createHarness();
  missing.queue.participants.delete(missing.caller.participantId);
  await expectCode(
    missing.service.discover(discoverInput(missing.caller)),
    "COORDINATION_AUTH_FAILED",
  );
});

test("discover fails safely on queue errors, unknown statuses, and corrupt rows", async () => {
  const unavailable = await createHarness();
  unavailable.queue.listError = new CoordinationError(
    "COORDINATION_UNAVAILABLE",
    "sentinel Redis credentials",
  );
  await expectCode(
    unavailable.service.discover(discoverInput(unavailable.caller)),
    "COORDINATION_UNAVAILABLE",
  );

  const unknown = await createHarness();
  unknown.queue.listStatus = "sentinel_unknown";
  await expectCode(
    unknown.service.discover(discoverInput(unknown.caller)),
    "COORDINATION_INTERNAL_ERROR",
  );

  const corrupt = await createHarness();
  corrupt.queue.listRows = [{
    ...corrupt.queue.participants.get(corrupt.caller.participantId),
    leaseTokenHash: "sentinel-invalid",
  }];
  await expectCode(
    corrupt.service.discover(discoverInput(corrupt.caller)),
    "COORDINATION_INTERNAL_ERROR",
  );
});

test("discover keeps an audit callback failure best effort", async () => {
  const { caller, service } = await createHarness({
    audit() {
      throw new Error("sentinel audit failure");
    },
  });

  const result = await service.discover(discoverInput(caller));

  assert.deepEqual(result.map(({ participantId }) => participantId), ["pt-caller"]);
});
