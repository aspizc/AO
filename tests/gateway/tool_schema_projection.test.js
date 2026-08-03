import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import { z } from "../../gateway/src/tools/tool_helpers.js";
import {
  UnsupportedZodSchemaError,
  zodToJsonSchema,
} from "../../gateway/src/tools/schema_projection.js";
import {
  TOOL_CATALOG,
  validateCatalogInput,
} from "../../gateway/src/tools/catalog.js";

const requireFromGateway = createRequire(
  new URL("../../gateway/package.json", import.meta.url),
);
const Ajv = requireFromGateway("ajv");

function catalogEntry(name) {
  const entry = TOOL_CATALOG.find((candidate) => candidate.name === name);
  assert.ok(entry, `missing catalog entry ${name}`);
  return entry;
}

function withCatalogFields(name, fields) {
  return {
    ...structuredClone(catalogEntry(name).example),
    ...fields,
  };
}

function catalogValidationPair(ajv, name, value) {
  const validateJsonSchema = ajv.compile(catalogEntry(name).inputSchema);
  const zod = validateCatalogInput(name, value).success;
  const jsonSchema = validateJsonSchema(value);
  return {
    name,
    zod,
    jsonSchema,
    jsonKeyword: validateJsonSchema.errors?.[0]?.keyword ?? null,
  };
}

function collectTypedNumericPaths(schema, path = "") {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return [];
  if (schema.type === "number" || schema.type === "integer") return [path];
  const paths = [];
  for (const option of schema.anyOf || []) {
    paths.push(...collectTypedNumericPaths(option, path));
  }
  for (const [key, value] of Object.entries(schema.properties || {})) {
    paths.push(
      ...collectTypedNumericPaths(value, path ? `${path}.${key}` : key),
    );
  }
  if (
    schema.additionalProperties
    && typeof schema.additionalProperties === "object"
    && !Array.isArray(schema.additionalProperties)
  ) {
    paths.push(
      ...collectTypedNumericPaths(
        schema.additionalProperties,
        path ? `${path}.*` : "*",
      ),
    );
  }
  return paths;
}

function collectUnicodeBoundedPaths(schema, path = "") {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return [];
  if (
    schema.type === "string"
    && Number.isSafeInteger(schema.maxLength)
    && schema.pattern === undefined
    && schema.allOf === undefined
  ) {
    return [path];
  }
  const paths = [];
  for (const option of schema.anyOf || []) {
    paths.push(...collectUnicodeBoundedPaths(option, path));
  }
  for (const [key, value] of Object.entries(schema.properties || {})) {
    paths.push(
      ...collectUnicodeBoundedPaths(value, path ? `${path}.${key}` : key),
    );
  }
  if (
    schema.additionalProperties
    && typeof schema.additionalProperties === "object"
    && !Array.isArray(schema.additionalProperties)
  ) {
    paths.push(
      ...collectUnicodeBoundedPaths(
        schema.additionalProperties,
        path ? `${path}.*` : "*",
      ),
    );
  }
  return paths;
}

test("projector covers records, unions, null, any, strict objects, and bounds", () => {
  const schema = z.object({
    context: z.record(z.any()).optional(),
    anything: z.any(),
    metadata: z.record(
      z.union([z.string(), z.number().finite(), z.boolean(), z.null()]),
    ),
    label: z.string().min(2).max(8).regex(/^[a-z]+$/),
    count: z.number().finite().int().positive().max(10).multipleOf(2),
    items: z.array(z.string()).min(1).max(3),
    nullable: z.string().nullable(),
  }).strict();

  assert.deepEqual(zodToJsonSchema(schema), {
    type: "object",
    properties: {
      context: {
        type: "object",
        additionalProperties: {},
      },
      anything: {},
      metadata: {
        type: "object",
        additionalProperties: {
          anyOf: [
            { type: "string" },
            { type: "number" },
            { type: "boolean" },
            { type: "null" },
          ],
        },
      },
      label: {
        type: "string",
        minLength: 2,
        maxLength: 8,
        pattern: "^[a-z]+$",
      },
      count: {
        type: "integer",
        exclusiveMinimum: 0,
        maximum: 10,
        multipleOf: 2,
      },
      items: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 3,
      },
      nullable: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
    },
    required: ["metadata", "label", "count", "items", "nullable"],
    additionalProperties: false,
  });
});

test("projector fails closed for strip objects, unsupported types, and regex flags", () => {
  for (const schema of [
    z.object({ value: z.string() }),
    z.object({ value: z.date() }).strict(),
    z.object({ value: z.string().regex(/value/i) }).strict(),
    z.object({ value: z.number() }).strict(),
  ]) {
    assert.throws(
      () => zodToJsonSchema(schema),
      (error) =>
        error instanceof UnsupportedZodSchemaError
        && typeof error.path === "string"
        && error.path.startsWith("$"),
    );
  }
});

test("catalog publishes record/union/null and every object is strict at runtime", () => {
  const approval = TOOL_CATALOG.find(({ name }) => name === "approval.request");
  const register = TOOL_CATALOG.find(({ name }) => name === "coordination.register");
  const note = TOOL_CATALOG.find(({ name }) => name === "session.intervention_note");

  assert.deepEqual(approval.inputSchema.properties.context, {
    type: "object",
    additionalProperties: {},
  });
  assert.deepEqual(register.inputSchema.properties.metadata, {
    type: "object",
    additionalProperties: {
      anyOf: [
        { type: "string", maxLength: 2_048 },
        { type: "number" },
        { type: "boolean" },
        { type: "null" },
      ],
    },
    propertyNames: {
      minLength: 1,
      maxLength: 64,
      pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$",
    },
    maxProperties: 32,
  });
  assert.equal(note.inputSchema.properties.note.minLength, 1);

  assert.equal(
    validateCatalogInput("orchestration.create", {
      callerAgent: "claude-code",
      callerRole: "orchestrator",
      unexpected: "must not be stripped",
    }).success,
    false,
  );
  assert.equal(
    validateCatalogInput("task.assign", {
      traceId: "tr-1",
      caller: { agent: "claude-code", role: "orchestrator", unexpected: true },
      target: { role: "coder" },
    }).success,
    false,
  );
});

test("AJV and Zod agree for every catalog example and unknown-field mutation", () => {
  const ajv = new Ajv({ allErrors: true, strict: true });
  for (const entry of TOOL_CATALOG) {
    const validateJsonSchema = ajv.compile(entry.inputSchema);
    const valid = structuredClone(entry.example);
    assert.equal(validateCatalogInput(entry.name, valid).success, true, entry.name);
    assert.equal(validateJsonSchema(valid), true, entry.name);

    const unknown = { ...valid, __unknown_contract_field: true };
    const acceptsUnknown = entry.name.startsWith("message.");
    assert.equal(
      validateCatalogInput(entry.name, unknown).success,
      acceptsUnknown,
      entry.name,
    );
    assert.equal(validateJsonSchema(unknown), acceptsUnknown, entry.name);
  }
});

test("parsed JSON exponent overflow is rejected by Zod and JSON Schema", () => {
  const ajv = new Ajv({ allErrors: true, strict: true });
  const exponentOverflow = JSON.parse("1e400");
  assert.equal(exponentOverflow, Infinity);

  const results = [
    catalogValidationPair(
      ajv,
      "approval.wait",
      withCatalogFields("approval.wait", { timeoutMs: exponentOverflow }),
    ),
    catalogValidationPair(
      ajv,
      "coordination.register",
      withCatalogFields("coordination.register", {
        metadata: { limit: exponentOverflow },
      }),
    ),
  ];

  assert.deepEqual(results, [
    {
      name: "approval.wait",
      zod: false,
      jsonSchema: false,
      jsonKeyword: "type",
    },
    {
      name: "coordination.register",
      zod: false,
      jsonSchema: false,
      jsonKeyword: "type",
    },
  ]);
});

test("non-BMP strings use JSON Schema Unicode code-point boundaries", () => {
  const ajv = new Ajv({ allErrors: true, strict: true });
  const cases = [
    [
      "coordination.register",
      withCatalogFields("coordination.register", {
        displayName: "😀".repeat(256),
      }),
      true,
    ],
    [
      "coordination.register",
      withCatalogFields("coordination.register", {
        displayName: "😀".repeat(257),
      }),
      false,
    ],
    [
      "coordination.send",
      withCatalogFields("coordination.send", {
        traceId: "😀".repeat(128),
      }),
      true,
    ],
    [
      "coordination.send",
      withCatalogFields("coordination.send", {
        traceId: "😀".repeat(129),
      }),
      false,
    ],
  ];

  assert.deepEqual(
    cases.map(([name, value, expected]) => ({
      expected,
      ...catalogValidationPair(ajv, name, value),
    })),
    [
      {
        expected: true,
        name: "coordination.register",
        zod: true,
        jsonSchema: true,
        jsonKeyword: null,
      },
      {
        expected: false,
        name: "coordination.register",
        zod: false,
        jsonSchema: false,
        jsonKeyword: "maxLength",
      },
      {
        expected: true,
        name: "coordination.send",
        zod: true,
        jsonSchema: true,
        jsonKeyword: null,
      },
      {
        expected: false,
        name: "coordination.send",
        zod: false,
        jsonSchema: false,
        jsonKeyword: "maxLength",
      },
    ],
  );
});

test("every typed catalog number rejects non-finite JavaScript values", () => {
  const numericPaths = TOOL_CATALOG.flatMap((entry) =>
    collectTypedNumericPaths(entry.inputSchema)
      .map((path) => `${entry.name}:${path}`));
  assert.deepEqual(numericPaths.sort(), [
    "approval.wait:timeoutMs",
    "coordination.heartbeat:leaseTtlMs",
    "coordination.receive:blockMs",
    "coordination.receive:count",
    "coordination.receive:reclaimIdleMs",
    "coordination.register:leaseTtlMs",
    "coordination.register:metadata.*",
  ]);

  const cases = [
    ["approval.wait", (value) => ({ timeoutMs: value })],
    ["coordination.register", (value) => ({ leaseTtlMs: value })],
    ["coordination.register", (value) => ({ metadata: { limit: value } })],
    ["coordination.heartbeat", (value) => ({ leaseTtlMs: value })],
    ["coordination.receive", (value) => ({ count: value })],
    ["coordination.receive", (value) => ({ reclaimIdleMs: value })],
    ["coordination.receive", (value) => ({ blockMs: value })],
  ];
  const ajv = new Ajv({ allErrors: true, strict: true });

  for (const nonFinite of [Infinity, -Infinity, Number.NaN]) {
    for (const [name, fieldsFor] of cases) {
      const value = withCatalogFields(name, fieldsFor(nonFinite));
      const pair = catalogValidationPair(ajv, name, value);
      assert.equal(pair.zod, false, `${name} Zod ${String(nonFinite)}`);
      assert.equal(
        pair.jsonSchema,
        false,
        `${name} JSON Schema ${String(nonFinite)}`,
      );
    }
  }
});

test("every Unicode-bounded catalog string agrees at and over its limit", () => {
  const boundedPaths = TOOL_CATALOG.flatMap((entry) =>
    collectUnicodeBoundedPaths(entry.inputSchema)
      .map((path) => `${entry.name}:${path}`));
  assert.deepEqual(boundedPaths.sort(), [
    "coordination.register:displayName",
    "coordination.register:metadata.*",
    "coordination.send:correlationId",
    "coordination.send:traceId",
  ]);

  const cases = [
    ["coordination.register", "displayName", 256],
    ["coordination.register", "metadata", 2_048],
    ["coordination.send", "traceId", 128],
    ["coordination.send", "correlationId", 128],
  ];
  const ajv = new Ajv({ allErrors: true, strict: true });

  for (const [name, field, maximum] of cases) {
    for (const [length, expected] of [
      [maximum, true],
      [maximum + 1, false],
    ]) {
      const text = "😀".repeat(length);
      const fields = field === "metadata"
        ? { metadata: { note: text } }
        : { [field]: text };
      const pair = catalogValidationPair(
        ajv,
        name,
        withCatalogFields(name, fields),
      );
      assert.equal(pair.zod, expected, `${name}.${field} Zod ${length}`);
      assert.equal(
        pair.jsonSchema,
        expected,
        `${name}.${field} JSON Schema ${length}`,
      );
    }
  }
});

test("legacy message schemas preserve explicit strip compatibility while every other root is closed", () => {
  for (const entry of TOOL_CATALOG) {
    assert.equal(
      entry.inputSchema.additionalProperties,
      entry.name.startsWith("message."),
      entry.name,
    );
  }

  const parsed = validateCatalogInput("message.send", {
    ...TOOL_CATALOG.find(({ name }) => name === "message.send").example,
    ignoredLegacyField: "strip-me",
  });
  assert.equal(parsed.success, true);
  assert.equal(Object.hasOwn(parsed.data, "ignoredLegacyField"), false);
});

test("coordination catalog closes representable service boundaries in both validators", () => {
  const ajv = new Ajv({ allErrors: true, strict: true });
  const entries = Object.fromEntries(
    TOOL_CATALOG
      .filter(({ name }) => name.startsWith("coordination."))
      .map((entry) => [entry.name, entry]),
  );
  const validate = (name, value, expected) => {
    const zodValid = validateCatalogInput(name, value).success;
    const jsonValid = ajv.compile(entries[name].inputSchema)(value);
    assert.equal(zodValid, expected, `${name} Zod: ${JSON.stringify(value)}`);
    assert.equal(jsonValid, expected, `${name} JSON Schema: ${JSON.stringify(value)}`);
  };
  const mutation = (name, fields) => ({
    ...structuredClone(entries[name].example),
    ...fields,
  });

  validate("coordination.register", mutation("coordination.register", {
    participantType: "worker",
  }), false);
  validate("coordination.register", mutation("coordination.register", {
    scopeId: "-unsafe",
  }), false);
  validate("coordination.register", mutation("coordination.register", {
    displayName: "",
  }), false);
  validate("coordination.register", mutation("coordination.register", {
    capabilities: ["coordination.v1", "coordination.v1"],
  }), false);
  validate("coordination.register", mutation("coordination.register", {
    capabilities: Array.from({ length: 65 }, (_, index) => `capability.${index}`),
  }), false);
  validate("coordination.register", mutation("coordination.register", {
    metadata: Object.fromEntries(
      Array.from({ length: 33 }, (_, index) => [`key.${index}`, index]),
    ),
  }), false);
  validate("coordination.register", mutation("coordination.register", {
    metadata: { "-unsafe": true },
  }), false);
  validate("coordination.register", mutation("coordination.register", {
    metadata: { note: "x".repeat(2_049) },
  }), false);

  validate("coordination.heartbeat", mutation("coordination.heartbeat", {
    participantId: "-unsafe",
  }), false);
  validate("coordination.heartbeat", mutation("coordination.heartbeat", {
    leaseToken: "too-short",
  }), false);
  validate("coordination.discover", mutation("coordination.discover", {
    participantType: "worker",
  }), false);
  validate("coordination.discover", mutation("coordination.discover", {
    capability: "unsafe capability",
  }), false);

  validate("coordination.send", mutation("coordination.send", {
    classification: "restricted",
  }), true);
  validate("coordination.send", mutation("coordination.send", {
    classification: "secret",
  }), false);
  validate("coordination.send", mutation("coordination.send", {
    body: "",
  }), false);
  validate("coordination.send", mutation("coordination.send", {
    traceId: "",
  }), false);

  validate("coordination.receive", mutation("coordination.receive", {
    count: 0,
  }), false);
  validate("coordination.receive", mutation("coordination.receive", {
    count: 1.5,
  }), false);
  validate("coordination.receive", mutation("coordination.receive", {
    count: 101,
  }), false);
  validate("coordination.receive", mutation("coordination.receive", {
    reclaimIdleMs: -1,
  }), false);
  validate("coordination.receive", mutation("coordination.receive", {
    blockMs: -1,
  }), false);

  validate("coordination.ack", mutation("coordination.ack", {
    deliveryIds: [],
  }), false);
  validate("coordination.ack", mutation("coordination.ack", {
    deliveryIds: ["1-0", "1-0"],
  }), false);
  validate("coordination.ack", mutation("coordination.ack", {
    deliveryIds: Array.from({ length: 101 }, (_, index) => `${index + 1}-0`),
  }), false);
  validate("coordination.ack", mutation("coordination.ack", {
    deliveryIds: ["01-0"],
  }), false);
});

test("AJV preserves every repeated Zod restriction instead of broadening validation", () => {
  const zodSchema = z.object({
    label: z.string()
      .min(5)
      .min(2)
      .max(8)
      .max(10)
      .regex(/^[a-z]+$/)
      .regex(/z$/),
    count: z.number()
      .finite()
      .min(5)
      .min(2)
      .max(8)
      .max(10)
      .multipleOf(2)
      .multipleOf(3),
  }).strict();
  const jsonSchema = zodToJsonSchema(zodSchema);
  const validateJsonSchema = new Ajv({ allErrors: true, strict: true })
    .compile(jsonSchema);
  const cases = [
    { label: "abcdz", count: 6 },
    { label: "abcz", count: 6 },
    { label: "abcdefghz", count: 6 },
    { label: "1234z", count: 6 },
    { label: "abcdz", count: 3 },
    { label: "abcdz", count: 9 },
  ];

  for (const value of cases) {
    assert.equal(
      validateJsonSchema(value),
      zodSchema.safeParse(value).success,
      JSON.stringify(value),
    );
  }
  assert.deepEqual(jsonSchema.properties.label.allOf, [
    { pattern: "^[a-z]+$" },
    { pattern: "z$" },
  ]);
  assert.deepEqual(jsonSchema.properties.count.allOf, [
    { multipleOf: 2 },
    { multipleOf: 3 },
  ]);
});
