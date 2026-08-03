import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isUuid,
  newApprovalId,
  newArtifactId,
  newChildTaskId,
  newMessageId,
  newOrchestrationId,
  newPolicyDecisionId,
  newSessionId,
  newTraceId,
} from "../../gateway/src/core/ids.js";

const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

test("session IDs are unique", () => {
  const ids = new Set();

  for (let i = 0; i < 1000; i += 1) {
    ids.add(newSessionId());
  }

  assert.equal(ids.size, 1000);
});

test("trace IDs are unique", () => {
  const ids = new Set();

  for (let i = 0; i < 1000; i += 1) {
    ids.add(newTraceId());
  }

  assert.equal(ids.size, 1000);
});

test("trace IDs accept an optional sanitized slug prefix", () => {
  const id = newTraceId({ prefix: "Refactor module X" });

  assert.match(id, new RegExp(`^tr-refactor-module-x-${UUID_PATTERN}$`));
});

test("all domain ID generators use stable prefixes and UUID suffixes", () => {
  const cases = [
    ["tr-", newTraceId()],
    ["os-", newOrchestrationId()],
    ["ts-", newChildTaskId()],
    ["ss-", newSessionId()],
    ["art-", newArtifactId()],
    ["apr-", newApprovalId()],
    ["msg-", newMessageId()],
    ["pd-", newPolicyDecisionId()],
  ];

  for (const [prefix, id] of cases) {
    assert.ok(id.startsWith(prefix));
    assert.ok(isUuid(id.slice(prefix.length)));
  }
});

test("isUuid accepts only canonical lowercase UUID strings", () => {
  assert.equal(isUuid("123e4567-e89b-12d3-a456-426614174000"), true);
  assert.equal(isUuid("123E4567-E89B-12D3-A456-426614174000"), false);
  assert.equal(isUuid("not-a-uuid"), false);
  assert.equal(isUuid("pd-123e4567-e89b-12d3-a456-426614174000"), false);
});
