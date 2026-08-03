import { test } from "node:test";
import assert from "node:assert/strict";

import { createTraceAccessToken, verifyTraceAccessToken } from "../../gateway/src/core/trace_access.js";

const config = { messageAccessSecret: "unit-secret" };

test("trace access token mint and verify roundtrip succeeds with the same secret", () => {
  const token = createTraceAccessToken("tr-roundtrip", config);

  assert.match(token, /^[0-9a-f]{64}$/);
  assert.equal(verifyTraceAccessToken("tr-roundtrip", token, config), true);
});

test("trace access verification fails for altered token, trace id, or secret", () => {
  const token = createTraceAccessToken("tr-original", config);
  const alteredToken = `${token.slice(0, -1)}${token.endsWith("0") ? "1" : "0"}`;

  assert.equal(verifyTraceAccessToken("tr-original", alteredToken, config), false);
  assert.equal(verifyTraceAccessToken("tr-other", token, config), false);
  assert.equal(verifyTraceAccessToken("tr-original", token, { messageAccessSecret: "other-secret" }), false);
});

test("trace access verification returns false for invalid length tokens without throwing", () => {
  assert.doesNotThrow(() => verifyTraceAccessToken("tr-id", "too-short", config));
  assert.equal(verifyTraceAccessToken("tr-id", "too-short", config), false);

  const tooLong = `${createTraceAccessToken("tr-id", config)}00`;
  assert.doesNotThrow(() => verifyTraceAccessToken("tr-id", tooLong, config));
  assert.equal(verifyTraceAccessToken("tr-id", tooLong, config), false);
});

test("trace access verification returns false for missing tokens", () => {
  assert.equal(verifyTraceAccessToken("tr-id", undefined, config), false);
  assert.equal(verifyTraceAccessToken("tr-id", "", config), false);
});
