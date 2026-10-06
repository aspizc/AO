import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  _resetForTests as resetAudit,
  configureAudit,
} from "../../gateway/src/core/audit.js";
import {
  _resetForTests as resetState,
  initState,
} from "../../gateway/src/core/state.js";
import {
  createTraceAccessToken,
} from "../../gateway/src/core/trace_access.js";
import {
  closeToolRegistry,
  getToolRegistry,
} from "../../gateway/src/tools/index.js";

const OPERATIONS = [
  "status",
  "register",
  "heartbeat",
  "discover",
  "unregister",
  "send",
  "receive",
  "ack",
];
const LEASE_TOKEN = "lease-token-with-at-least-32-characters";

function parseResult(result) {
  return JSON.parse(result.content[0].text);
}

function byName(registry) {
  return Object.fromEntries(registry.map((tool) => [tool.name, tool]));
}

test("registry creates exactly one lazy coordination instance shared by eight tools", async () => {
  const config = {
    coordinationRedisUrl: "redis://127.0.0.1:1",
  };
  const factoryCalls = [];
  const operationCalls = [];
  const coordination = Object.fromEntries(
    OPERATIONS.map((operation) => [
      operation,
      async (args) => {
        operationCalls.push({
          operation,
          args: structuredClone(args),
        });
        return {
          instance: "shared",
          operation,
        };
      },
    ]),
  );

  const registry = getToolRegistry({
    config,
    coordinationFactory: (options) => {
      factoryCalls.push(options);
      return coordination;
    },
  });
  const tools = byName(registry);

  assert.equal(factoryCalls.length, 1);
  assert.equal(factoryCalls[0].config, config);
  assert.deepEqual(operationCalls, []);
  assert.equal(registry.length, 33);

  assert.deepEqual(
    parseResult(
      await tools["coordination.register"].handler({
        participantType: "orchestrator",
        scopeId: "project:v5",
      }),
    ),
    {
      instance: "shared",
      operation: "register",
    },
  );
  assert.deepEqual(
    parseResult(
      await tools["coordination.ack"].handler({
        participantId: "pt-primary",
        leaseToken: LEASE_TOKEN,
        deliveryIds: ["1-0"],
      }),
    ),
    {
      instance: "shared",
      operation: "ack",
    },
  );
  assert.deepEqual(
    operationCalls.map(({ operation }) => operation),
    ["register", "ack"],
  );
});

test("registry construction accepts missing config without connecting to Redis", () => {
  assert.doesNotThrow(() => getToolRegistry());
  assert.equal(getToolRegistry().length, 33);
});

test("registry owns and closes its one coordination service exactly once", async () => {
  let closeCalls = 0;
  const coordination = Object.fromEntries(
    OPERATIONS.map((operation) => [
      operation,
      async () => ({ operation }),
    ]),
  );
  coordination.close = async () => {
    closeCalls += 1;
    return { status: "closed" };
  };
  const registry = getToolRegistry({
    coordinationFactory: () => coordination,
  });

  assert.equal(closeCalls, 0);
  assert.deepEqual(
    await Promise.all([
      closeToolRegistry(registry),
      closeToolRegistry(registry),
    ]),
    [{ status: "closed" }, { status: "closed" }],
  );
  assert.equal(closeCalls, 1);
});

test("disabled coordination fails explicitly while legacy message tools remain usable", async (t) => {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "coordination-registry-"));
  t.after(() => {
    resetState();
    resetAudit();
    fs.rmSync(workspace, { recursive: true, force: true });
  });
  initState({
    stateDb: path.join(workspace, "state.db"),
  });
  configureAudit({
    auditLog: path.join(workspace, "audit", "events.jsonl"),
  });
  const config = {
    coordinationRedisUrl: "",
    messageAccessSecret: "registry-message-access-secret",
  };
  const tools = byName(getToolRegistry({ config }));

  const unavailable = await tools["coordination.register"].handler({
    participantType: "orchestrator",
    scopeId: "project:v5",
  });
  assert.equal(unavailable.isError, true);
  assert.equal(parseResult(unavailable).error, "COORDINATION_UNAVAILABLE");

  const traceId = "tr-coordination-disabled";
  const accessToken = createTraceAccessToken(traceId, config);
  const sent = parseResult(
    await tools["message.send"].handler({
      traceId,
      accessToken,
      fromId: "orchestrator",
      toId: "coder",
      body: "legacy message remains available",
    }),
  );
  const listed = parseResult(
    await tools["message.list"].handler({
      traceId,
      accessToken,
    }),
  );

  assert.match(sent.messageId, /^msg-/);
  assert.equal(sent.body, "legacy message remains available");
  assert.deepEqual(
    listed.map(({ messageId }) => messageId),
    [sent.messageId],
  );
});
