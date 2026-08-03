import { test } from "node:test";
import assert from "node:assert/strict";

import {
  defineTool,
  z,
} from "../../gateway/src/tools/tool_helpers.js";
import {
  buildCoordinationTools,
} from "../../gateway/src/tools/coordination.js";

function parse(result) {
  return JSON.parse(result.content[0].text);
}

test("unknown exceptions never expose messages, details, decisions, or credentials", async () => {
  const tool = defineTool({
    name: "test.unknown_error",
    description: "Exercise safe unknown errors.",
    schema: z.object({}).strict(),
    handler: async () => {
      const error = new Error("leaseToken=top-secret prompt=private-payload");
      error.details = { accessToken: "credential", body: "restricted" };
      error.decision = { reason: "api_key=secret-value", ruleId: "unsafe" };
      throw error;
    },
  });

  const result = await tool.handler({});
  assert.equal(result.isError, true);
  assert.deepEqual(parse(result), {
    error: "TOOL_ERROR",
    code: "TOOL_ERROR",
    message: "tool operation failed",
  });
  assert.doesNotMatch(result.content[0].text, /top-secret|private-payload|credential|secret-value/);
});

test("only explicitly authorized domain codes survive with catalog-owned messages", async () => {
  const tool = defineTool({
    name: "test.safe_error",
    description: "Exercise an authorized safe error.",
    schema: z.object({}).strict(),
    allowedErrorCodes: ["ADAPTER_DISABLED"],
    errorMessages: { ADAPTER_DISABLED: "adapter disabled" },
    handler: async () => {
      const error = new Error("api_key=must-not-leak");
      error.code = "ADAPTER_DISABLED";
      throw error;
    },
  });

  const result = await tool.handler({});
  assert.deepEqual(parse(result), {
    error: "ADAPTER_DISABLED",
    code: "ADAPTER_DISABLED",
    message: "adapter disabled",
  });
  assert.doesNotMatch(result.content[0].text, /must-not-leak/);
});

test("validation issues retain safe field and bound details but not attacker values", async () => {
  const tool = defineTool({
    name: "test.validation",
    description: "Exercise safe validation errors.",
    schema: z.object({
      leaseTtlMs: z.number().finite().int().max(300_000),
      metadata: z.record(
        z.union([z.string(), z.number().finite(), z.boolean(), z.null()]),
      ).optional(),
    }).strict(),
    handler: async () => ({ ok: true }),
  });

  const result = await tool.handler({
    leaseTtlMs: 600_000,
    metadata: { "api_key=secret": ["must-not-leak"] },
    "api_key=secret": "must-not-leak",
  });
  const payload = parse(result);
  assert.equal(result.isError, true);
  assert.equal(payload.error, "INVALID_INPUT");
  assert.equal(payload.code, "INVALID_INPUT");
  assert.ok(
    payload.issues.some(
      (issue) =>
        issue.path === "leaseTtlMs"
        && issue.code === "too_big"
        && issue.maximum === 300_000,
    ),
  );
  assert.ok(
    payload.issues.some(
      (issue) =>
        issue.path === "metadata.*"
        && issue.code === "invalid_union",
    ),
  );
  assert.doesNotMatch(result.content[0].text, /api_key|secret|must-not-leak|600000/);
});

test("coordination lease errors retain the exact safe field-specific limit", async () => {
  const service = Object.fromEntries(
    ["status", "register", "heartbeat", "discover", "unregister", "send", "receive", "ack"]
      .map((operation) => [operation, async () => ({})]),
  );
  const tools = Object.fromEntries(
    buildCoordinationTools({ coordination: service }).map((tool) => [tool.name, tool]),
  );

  const result = await tools["coordination.register"].handler({
    participantType: "orchestrator",
    leaseTtlMs: 3_600_001,
  });
  assert.deepEqual(parse(result), {
    error: "COORDINATION_INVALID_INPUT",
    message: "leaseTtlMs exceeds maximum 3600000",
    code: "COORDINATION_INVALID_INPUT",
  });
});

test("policy errors keep only safe decision fields", async () => {
  const tool = defineTool({
    name: "test.policy_error",
    description: "Exercise safe policy details.",
    schema: z.object({}).strict(),
    allowedErrorCodes: ["POLICY_DENIED"],
    errorMessages: { POLICY_DENIED: "request denied by policy" },
    handler: async () => {
      const error = new Error("role secret-role denies secret-action");
      error.code = "POLICY_DENIED";
      error.decision = {
        decision: "deny",
        ruleId: "role.deny_action",
        reason: "token=must-not-leak",
        model: "private-model",
      };
      throw error;
    },
  });

  const result = await tool.handler({});
  assert.deepEqual(parse(result), {
    error: "POLICY_DENIED",
    code: "POLICY_DENIED",
    message: "request denied by policy",
    decision: {
      decision: "deny",
      ruleId: "role.deny_action",
    },
  });
  assert.doesNotMatch(result.content[0].text, /must-not-leak|private-model|secret-role/);
});

test("policy rule IDs require canonical provenance for thrown and returned errors", async () => {
  const makeDecision = () => ({
    decision: "deny",
    ruleId: "api_key:top-secret",
    reason: "token=must-not-leak",
  });
  const tools = [
    defineTool({
      name: "test.thrown_policy_rule",
      description: "Reject a non-canonical thrown policy rule.",
      schema: z.object({}).strict(),
      allowedErrorCodes: ["POLICY_DENIED"],
      errorMessages: { POLICY_DENIED: "request denied by policy" },
      handler: async () => {
        const error = new Error("api_key=must-not-leak");
        error.code = "POLICY_DENIED";
        error.decision = makeDecision();
        throw error;
      },
    }),
    defineTool({
      name: "test.returned_policy_rule",
      description: "Reject a non-canonical returned policy rule.",
      schema: z.object({}).strict(),
      allowedErrorCodes: ["POLICY_DENIED"],
      errorMessages: { POLICY_DENIED: "request denied by policy" },
      handler: async () => ({
        error: "POLICY_DENIED",
        message: "api_key=must-not-leak",
        decision: makeDecision(),
      }),
    }),
  ];

  for (const tool of tools) {
    const result = await tool.handler({});
    assert.equal(result.isError, true);
    assert.deepEqual(parse(result), {
      error: "POLICY_DENIED",
      code: "POLICY_DENIED",
      message: "request denied by policy",
      decision: { decision: "deny" },
    });
    assert.doesNotMatch(result.content[0].text, /api_key|top-secret|must-not-leak/);
  }
});

test("legacy message payload errors use common sanitization without changing their envelope", async () => {
  const tool = defineTool({
    name: "message.send",
    description: "Send a message between participants of an orchestration trace.",
    schema: z.object({}).strict(),
    handler: async () => ({
      error: "TRACE_ACCESS_DENIED",
      code: "SECRET_CODE",
      message: "accessToken=must-not-leak",
      decision: {
        decision: "deny",
        ruleId: "api_key:top-secret",
        reason: "token=must-not-leak",
      },
      accessToken: "credential",
    }),
  });

  const result = await tool.handler({
    traceId: "tr-legacy-envelope",
    accessToken: "trace-access-token",
    fromId: "orchestrator",
    toId: "reviewer",
    body: "review ready",
  });

  assert.equal(result.isError, undefined);
  assert.deepEqual(parse(result), { error: "TRACE_ACCESS_DENIED" });
  assert.doesNotMatch(result.content[0].text, /SECRET_CODE|must-not-leak|credential|api_key/);
});
