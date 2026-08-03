import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const require = createRequire(path.join(repoRoot, "gateway", "package.json"));
const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validators = new Map();

const SCHEMAS = [
  "agent-capabilities",
  "coordination-participant",
  "coordination-message",
  "orchestration-session",
  "task",
  "artifact",
  "message",
  "policy-decision",
  "approval",
  "registry-meta",
];

const FORBIDDEN_COORDINATION_FIELDS = {
  "coordination-participant": { leaseToken: "must-never-be-discoverable" },
  "coordination-message": { streamEntryId: "delivery-metadata-is-not-envelope-data" },
};

function load(rel) {
  return JSON.parse(fs.readFileSync(path.resolve(repoRoot, rel), "utf-8"));
}

for (const name of SCHEMAS) {
  const schema = load(`schemas/${name}.schema.json`);
  const validate = ajv.compile(schema);
  validators.set(name, validate);

  test(`schema_${name}_has_id_and_version`, () => {
    assert.ok(schema.$id, "missing $id");
    assert.ok(schema.version, "missing version");
  });

  test(`valid_${name}_passes`, () => {
    const valid = load(`tests/fixtures/schemas/${name}.valid.json`);
    assert.ok(validate(valid), JSON.stringify(validate.errors));
  });

  test(`invalid_${name}_fails`, () => {
    const invalid = load(`tests/fixtures/schemas/${name}.invalid.json`);
    assert.ok(!validate(invalid));
  });

  if (FORBIDDEN_COORDINATION_FIELDS[name]) {
    test(`strict_${name}_rejects_non_contract_fields`, () => {
      const valid = load(`tests/fixtures/schemas/${name}.valid.json`);
      assert.ok(!validate({ ...valid, ...FORBIDDEN_COORDINATION_FIELDS[name] }));
    });
  }
}

test("coordination identifiers remain bounded and Redis-key safe", () => {
  const participant = load("tests/fixtures/schemas/coordination-participant.valid.json");
  const message = load("tests/fixtures/schemas/coordination-message.valid.json");
  const validateParticipant = validators.get("coordination-participant");
  const validateMessage = validators.get("coordination-message");

  assert.equal(validateParticipant({ ...participant, participantId: "pt/unsafe" }), false);
  assert.equal(validateParticipant({ ...participant, scopeId: "scope with spaces" }), false);
  assert.equal(validateParticipant({ ...participant, participantId: `pt-${"x".repeat(126)}` }), false);
  assert.equal(validateMessage({ ...message, messageId: "cm/unsafe" }), false);
  assert.equal(validateMessage({ ...message, messageType: "type with spaces" }), false);
  assert.equal(validateMessage({ ...message, replyToMessageId: "cm/unsafe" }), false);
});

test("coordination message schema enforces persisted body and optional link bounds", () => {
  const message = load("tests/fixtures/schemas/coordination-message.valid.json");
  const validate = validators.get("coordination-message");

  assert.equal(validate({ ...message, body: "" }), false);
  assert.equal(validate({ ...message, body: "x".repeat(65_537) }), false);
  assert.equal(validate({ ...message, traceId: "x".repeat(129) }), false);
  assert.equal(validate({ ...message, correlationId: "x".repeat(129) }), false);
});
