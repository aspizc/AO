import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as catalogApi from "../../gateway/src/tools/catalog.js";
import { getToolRegistry } from "../../gateway/src/tools/index.js";

const {
  TOOL_CATALOG,
  TOOL_NAMES,
  catalogProjection,
  catalogProjectionDigest,
  validateCatalogInput,
} = catalogApi;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const GOLDEN = path.join(ROOT, "gateway", "contracts", "mcp-tools-v1.json");
const MESSAGE_TOOL = path.join(ROOT, "gateway", "src", "tools", "message.js");

function assertDeepFrozen(value, label) {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, label);
  for (const [key, nested] of Object.entries(value)) {
    assertDeepFrozen(nested, `${label}.${key}`);
  }
}

const EXPECTED_NAMES = [
  "orchestration.create",
  "orchestration.view",
  "orchestration.pause",
  "orchestration.resume",
  "orchestration.cancel",
  "orchestration.complete",
  "task.assign",
  "agent.delegate",
  "agent.spawn",
  "agent.ask",
  "agent.view",
  "agent.kill",
  "artifact.put",
  "artifact.get",
  "artifact.list",
  "artifact.share",
  "approval.request",
  "approval.respond",
  "approval.poll",
  "approval.wait",
  "message.send",
  "message.list",
  "message.reply",
  "session.attach_info",
  "session.intervention_note",
  "coordination.status",
  "coordination.register",
  "coordination.heartbeat",
  "coordination.discover",
  "coordination.unregister",
  "coordination.send",
  "coordination.receive",
  "coordination.ack",
];

test("canonical catalog freezes the exact 33-tool v1 order", () => {
  assert.deepEqual(TOOL_NAMES, EXPECTED_NAMES);
  assert.equal(TOOL_CATALOG.length, 33);
  assertDeepFrozen(TOOL_CATALOG, "TOOL_CATALOG");
  for (const entry of TOOL_CATALOG) {
    assert.equal(entry.listed, "always", entry.name);
    assert.match(entry.description, /\.$/, entry.name);
  }
  assert.equal(new Set(TOOL_NAMES).size, TOOL_NAMES.length);
});

test("catalog API does not expose mutable Zod runtime state", () => {
  assert.equal(Object.hasOwn(catalogApi, "getToolRuntimeSpec"), false);

  const projection = catalogProjection();
  assertDeepFrozen(projection, "catalogProjection");
  assert.throws(
    () => {
      projection[0].inputSchema.required.length = 0;
    },
    TypeError,
  );
  assert.equal(
    validateCatalogInput("orchestration.create", {}).success,
    false,
  );
  assert.notEqual(
    TOOL_CATALOG[0].inputSchema.required.length,
    0,
  );
});

test("registry bindings are complete and expose only catalog projections", () => {
  const registry = getToolRegistry();
  assert.deepEqual(registry.map(({ name }) => name), EXPECTED_NAMES);
  assert.deepEqual(
    registry.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    })),
    TOOL_CATALOG.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    })),
  );
});

test("catalog error allowlists are operation-specific and complete", () => {
  const codes = (name) =>
    TOOL_CATALOG.find((entry) => entry.name === name).publicErrorCodes;

  assert.deepEqual(codes("orchestration.view"), [
    "INVALID_INPUT",
    "TOOL_ERROR",
    "REQUEST_CONTEXT_DENIED",
  ]);
  assert.deepEqual(codes("approval.respond"), [
    "INVALID_INPUT",
    "TOOL_ERROR",
    "REQUEST_CONTEXT_DENIED",
    "NOT_FOUND",
  ]);
  assert.deepEqual(codes("agent.ask"), [
    "INVALID_INPUT",
    "TOOL_ERROR",
    "REQUEST_CONTEXT_DENIED",
    "NOT_FOUND",
    "POLICY_DENIED",
    "ADAPTER_DISABLED",
    "TIMEOUT",
  ]);
  for (const name of ["agent.view", "agent.kill"]) {
    assert.deepEqual(codes(name), [
      "INVALID_INPUT",
      "TOOL_ERROR",
      "REQUEST_CONTEXT_DENIED",
      "NOT_FOUND",
      "ADAPTER_DISABLED",
      "TIMEOUT",
    ]);
  }
  assert.deepEqual(codes("coordination.status"), [
    "INVALID_INPUT",
    "TOOL_ERROR",
    "COORDINATION_UNAVAILABLE",
    "COORDINATION_INTERNAL_ERROR",
  ]);
  assert.equal(
    codes("coordination.send").includes("COORDINATION_MESSAGE_CONFLICT"),
    true,
  );
  assert.equal(
    codes("coordination.send").includes("COORDINATION_DELIVERY_NOT_FOUND"),
    false,
  );
});

test("versioned golden pins the complete public projection digest", () => {
  const golden = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  assert.equal(golden.schemaVersion, 1);
  assert.equal(golden.toolCount, 33);
  assert.deepEqual(golden.names, EXPECTED_NAMES);
  assert.equal(golden.projectionSha256, catalogProjectionDigest());
  assert.equal(
    golden.projectionSha256,
    `sha256:${crypto
      .createHash("sha256")
      .update(JSON.stringify(catalogProjection()))
      .digest("hex")}`,
  );
});

test("message tool source remains byte-identical to the reviewed baseline", () => {
  const digest = crypto.createHash("sha256").update(fs.readFileSync(MESSAGE_TOOL)).digest("hex");
  assert.equal(
    digest,
    "6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac",
  );
});
