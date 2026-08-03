import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configureSanitizer, sanitize } from "../../gateway/src/core/sanitizer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const RULES_PATH = path.join(REPO_ROOT, "policies", "sanitization-rules.json");

configureSanitizer({ rulesPath: RULES_PATH });

test("sanitizer redacts secrets", () => {
  const result = sanitize("api_key=abcdef1234567890", { kind: "raw_code" });

  assert.equal(result.sanitized, "api_key=<REDACTED-SECRET>");
  assert.deepEqual(result.appliedRuleIds, ["secret.token"]);
});

test("sanitizer redacts absolute paths", () => {
  const result = sanitize("/home/dev/project/private/key.pem", { kind: "raw_code" });

  assert.equal(result.sanitized, "<HOME>/...");
  assert.deepEqual(result.appliedRuleIds, ["absolute.path"]);
});

test("sanitizer returns applied rule IDs in rule order", () => {
  const result = sanitize(
    "token=abcdefghijklmnop /home/dev/project/private/key.pem 123e4567-e89b-12d3-a456-426614174000",
    { kind: "raw_diff" },
  );

  assert.deepEqual(result.appliedRuleIds, ["secret.token", "absolute.path", "uuid"]);
});

test("sanitizer is deterministic", () => {
  const input = "uuid 123e4567-e89b-12d3-a456-426614174000";

  assert.deepEqual(sanitize(input, { kind: "raw_diff" }), sanitize(input, { kind: "raw_diff" }));
});

test("sanitizer leaves non-applicable kinds unchanged", () => {
  const result = sanitize("api_key=abcdef1234567890", { kind: "doc" });

  assert.equal(result.sanitized, "api_key=abcdef1234567890");
  assert.deepEqual(result.appliedRuleIds, []);
});
