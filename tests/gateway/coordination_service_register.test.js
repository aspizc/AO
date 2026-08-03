import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  CoordinationError,
  createCoordinationService,
} from "../../gateway/src/services/coordination_service.js";

const NOW = Date.parse("2026-07-25T10:00:00.000Z");
const TOKEN = "lease-token-with-at-least-thirty-two-characters";

class RegistrationQueue {
  constructor({ statuses = ["stored"], error = null, description = {} } = {}) {
    this.enabled = true;
    this.statuses = [...statuses];
    this.error = error;
    this.calls = [];
    this.description = {
      enabled: true,
      prefix: "test:coord:v1",
      eventsStream: "test:coord:v1:events",
      consumerGroup: "coordination-v1",
      redisUrl: "redis://sentinel-credentials@example.invalid",
      leaseToken: "sentinel-descriptor-token",
      ...description,
    };
  }

  describe() {
    return this.description;
  }

  async putParticipant(record, options) {
    this.calls.push({ record, options });
    if (this.error) throw this.error;
    return { status: this.statuses.shift() ?? "stored" };
  }
}

function createHarness({
  queue = new RegistrationQueue(),
  uuids = ["registration-a"],
  token = TOKEN,
  audit = () => {},
  config = {},
  clock = () => NOW,
  randomUUID,
  randomToken,
} = {}) {
  let tokenCalls = 0;
  const ids = [...uuids];
  const service = createCoordinationService({
    queue,
    config: {
      coordinationLeaseDefaultMs: 30_000,
      coordinationLeaseMaxMs: 300_000,
      ...config,
    },
    clock,
    randomUUID: randomUUID ?? (() => ids.shift()),
    randomToken: randomToken ?? (() => {
      tokenCalls += 1;
      return token;
    }),
    audit,
  });
  return { queue, service, tokenCalls: () => tokenCalls };
}

function input(overrides = {}) {
  return {
    participantType: "orchestrator",
    scopeId: "project:v5",
    displayName: "V5 orchestrator",
    capabilities: ["coordination.v1", "task.review"],
    metadata: {
      version: "5",
      supervised: true,
    },
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

test("register returns one plaintext token and persists only its digest", async () => {
  const audits = [];
  const { queue, service, tokenCalls } = createHarness({
    audit: (event) => audits.push(event),
  });

  const result = await service.register(input());
  const stored = queue.calls[0].record;
  const tokenHash = crypto.createHash("sha256").update(TOKEN).digest("hex");
  const publicParticipant = {
    protocolVersion: 1,
    participantId: "pt-registration-a",
    participantType: "orchestrator",
    scopeId: "project:v5",
    displayName: "V5 orchestrator",
    capabilities: ["coordination.v1", "task.review"],
    metadata: {
      version: "5",
      supervised: true,
    },
    registeredAt: "2026-07-25T10:00:00.000Z",
    lastHeartbeatAt: "2026-07-25T10:00:00.000Z",
    leaseExpiresAt: "2026-07-25T10:00:30.000Z",
  };

  assert.deepEqual(result, {
    ...publicParticipant,
    leaseToken: TOKEN,
    queue: {
      enabled: true,
      prefix: "test:coord:v1",
      eventsStream: "test:coord:v1:events",
      consumerGroup: "coordination-v1",
    },
  });
  assert.deepEqual(stored, {
    ...publicParticipant,
    leaseTokenHash: tokenHash,
  });
  assert.deepEqual(queue.calls[0].options, { ttlMs: 30_000, ifAbsent: true });
  assert.equal(tokenCalls(), 1);
  assert.equal(stored.leaseToken, undefined);
  assert.equal(result.leaseTokenHash, undefined);
  assert.equal(JSON.stringify(result).split(TOKEN).length - 1, 1);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(tokenHash));
  assert.doesNotMatch(JSON.stringify(result.queue), /sentinel|redisUrl|leaseToken/);
  assert.deepEqual(audits, [{
    type: "COORDINATION_PARTICIPANT_REGISTERED",
    participantId: "pt-registration-a",
    participantType: "orchestrator",
    scopeId: "project:v5",
    timestamp: NOW,
    leaseTtlMs: 30_000,
  }]);
  assert.doesNotMatch(JSON.stringify(audits), /sentinel|leaseToken|leaseTokenHash|metadata/);
  assert.notStrictEqual(result.capabilities, stored.capabilities);
  assert.notStrictEqual(result.metadata, stored.metadata);
});

test("register omits an absent display name and accepts the inclusive lease maximum", async () => {
  const { queue, service } = createHarness();

  const result = await service.register(input({
    displayName: undefined,
    capabilities: undefined,
    metadata: undefined,
    leaseTtlMs: 300_000,
  }));

  assert.equal(Object.hasOwn(result, "displayName"), false);
  assert.deepEqual(result.capabilities, []);
  assert.deepEqual(result.metadata, {});
  assert.equal(result.leaseExpiresAt, "2026-07-25T10:05:00.000Z");
  assert.deepEqual(queue.calls[0].options, { ttlMs: 300_000, ifAbsent: true });
});

test("register validates lease bounds before writing", async () => {
  for (const leaseTtlMs of [0, -1, 1.5, 300_001]) {
    const { queue, service } = createHarness();

    await expectCode(
      service.register(input({ leaseTtlMs })),
      "COORDINATION_INVALID_INPUT",
    );
    assert.equal(queue.calls.length, 0);
  }
});

test("register defaults to a fifteen minute lease and canonical service scope", async () => {
  const { queue, service } = createHarness({
    config: {
      coordinationScopeId: "agents-orchestrator",
      coordinationLeaseDefaultMs: 900_000,
      coordinationLeaseMaxMs: 3_600_000,
    },
  });
  const request = input({
    capabilities: ["v1.6"],
  });
  delete request.scopeId;
  delete request.leaseTtlMs;

  const result = await service.register(request);

  assert.equal(result.scopeId, "agents-orchestrator");
  assert.deepEqual(result.capabilities, ["v1.6"]);
  assert.equal(result.leaseExpiresAt, "2026-07-25T10:15:00.000Z");
  assert.deepEqual(queue.calls[0].options, {
    ttlMs: 900_000,
    ifAbsent: true,
  });
});

test("register accepts capabilities and leases through the inclusive one-hour maximum", async () => {
  for (const leaseTtlMs of [600_000, 900_000, 3_600_000]) {
    const { queue, service } = createHarness({
      config: {
        coordinationScopeId: "project:v5",
        coordinationLeaseDefaultMs: 900_000,
        coordinationLeaseMaxMs: 3_600_000,
      },
    });

    const result = await service.register(input({
      capabilities: ["v1.6"],
      leaseTtlMs,
    }));

    assert.deepEqual(result.capabilities, ["v1.6"]);
    assert.deepEqual(queue.calls[0].options, {
      ttlMs: leaseTtlMs,
      ifAbsent: true,
    });
  }
});

test("register reports the lease field and configured maximum before writing", async () => {
  const { queue, service } = createHarness({
    config: {
      coordinationScopeId: "project:v5",
      coordinationLeaseDefaultMs: 900_000,
      coordinationLeaseMaxMs: 3_600_000,
    },
  });

  await assert.rejects(
    service.register(input({ leaseTtlMs: 3_600_001 })),
    (err) =>
      err instanceof CoordinationError
      && err.code === "COORDINATION_INVALID_INPUT"
      && err.message === "leaseTtlMs exceeds maximum 3600000",
  );
  assert.equal(queue.calls.length, 0);
});

test("register rejects an explicit scope different from the canonical service scope", async () => {
  const { queue, service } = createHarness({
    config: {
      coordinationScopeId: "project:canonical",
      coordinationLeaseDefaultMs: 900_000,
      coordinationLeaseMaxMs: 3_600_000,
    },
  });

  await assert.rejects(
    service.register(input({ scopeId: "project:isolated" })),
    (err) =>
      err instanceof CoordinationError
      && err.code === "COORDINATION_SCOPE_MISMATCH"
      && err.message === "scopeId must match configured coordination scope",
  );
  assert.equal(queue.calls.length, 0);
});

test("register retries ID collisions, audits only the stored identity, and reuses one token", async () => {
  const audits = [];
  const queue = new RegistrationQueue({ statuses: ["exists", "stored"] });
  const { service, tokenCalls } = createHarness({
    queue,
    uuids: ["collision", "unique"],
    audit: (event) => audits.push(event),
  });

  const result = await service.register(input());

  assert.equal(result.participantId, "pt-unique");
  assert.deepEqual(
    queue.calls.map(({ record }) => record.participantId),
    ["pt-collision", "pt-unique"],
  );
  assert.ok(queue.calls.every(({ options }) => options.ifAbsent === true));
  assert.equal(tokenCalls(), 1);
  assert.deepEqual(audits.map(({ participantId }) => participantId), ["pt-unique"]);
});

test("register bounds repeated collisions and maps dependency failures to safe errors", async () => {
  const collisions = new RegistrationQueue({ statuses: Array(8).fill("exists") });
  const collisionHarness = createHarness({
    queue: collisions,
    uuids: Array.from({ length: 8 }, (_, index) => `collision-${index}`),
  });

  await expectCode(
    collisionHarness.service.register(input()),
    "COORDINATION_ID_COLLISION",
  );
  assert.equal(collisions.calls.length, 8);

  const unexpected = new RegistrationQueue({ statuses: ["missing"] });
  await expectCode(
    createHarness({ queue: unexpected }).service.register(input()),
    "COORDINATION_INTERNAL_ERROR",
  );

  const unavailableQueue = new RegistrationQueue({
    error: Object.assign(new Error("sentinel redis failure"), {
      code: "COORDINATION_UNAVAILABLE",
    }),
  });
  await expectCode(
    createHarness({ queue: unavailableQueue }).service.register(input()),
    "COORDINATION_UNAVAILABLE",
  );

  const sensitiveCoordinationError = new RegistrationQueue({
    error: new CoordinationError(
      "COORDINATION_UNAVAILABLE",
      "sentinel dependency credentials",
    ),
  });
  await expectCode(
    createHarness({ queue: sensitiveCoordinationError }).service.register(input()),
    "COORDINATION_UNAVAILABLE",
  );
});

test("register isolates an audit callback failure from the stored result", async () => {
  const { queue, service } = createHarness({
    audit() {
      throw new Error("sentinel audit failure");
    },
  });

  const result = await service.register(input());

  assert.equal(result.participantId, "pt-registration-a");
  assert.equal(queue.calls.length, 1);
});

test("register contains hostile descriptors, clocks, and random generators", async () => {
  const hostileDescriptor = new RegistrationQueue();
  Object.defineProperty(hostileDescriptor.description, "prefix", {
    get() {
      throw new Error("sentinel descriptor credentials");
    },
  });
  await expectCode(
    createHarness({ queue: hostileDescriptor }).service.register(input()),
    "COORDINATION_INTERNAL_ERROR",
  );

  await expectCode(
    createHarness({ clock: () => Number.MAX_SAFE_INTEGER }).service.register(input()),
    "COORDINATION_INTERNAL_ERROR",
  );
  await expectCode(
    createHarness({
      randomToken() {
        throw new Error("sentinel token generator");
      },
    }).service.register(input()),
    "COORDINATION_INTERNAL_ERROR",
  );
  await expectCode(
    createHarness({
      randomUUID() {
        throw new Error("sentinel UUID generator");
      },
    }).service.register(input()),
    "COORDINATION_INTERNAL_ERROR",
  );
});
