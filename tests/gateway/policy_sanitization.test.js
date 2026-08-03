import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { evaluate } from "../../gateway/src/core/policy_engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const reg = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });

test("restricted_raw_diff_to_reviewer_requires_sanitization", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "reviewer",
      repo: "sample-apps",
      action: "artifact.get",
      artifactKind: "raw_diff",
      artifactClassification: "restricted",
    },
    reg,
  );
  assert.equal(result.decision, "allow_with_sanitization");
  assert.equal(result.ruleId, "sanitization.required");
});

test("sanitized_diff_to_reviewer_allowed", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "reviewer",
      repo: "sample-apps",
      action: "artifact.get",
      artifactKind: "review_notes",
      artifactClassification: "restricted",
    },
    reg,
  );
  assert.equal(result.decision, "allow");
});

test("raw_restricted_to_orchestrator_denied", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "orchestrator",
      repo: null,
      action: "artifact.get",
      artifactKind: "raw_diff",
      artifactClassification: "restricted",
    },
    reg,
  );
  assert.equal(result.decision, "deny");
  assert.equal(result.ruleId, "sanitization.orchestrator_raw");
});

test("non_restricted_raw_no_sanitization_needed", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "reviewer",
      repo: "sample-apps",
      action: "artifact.get",
      artifactKind: "raw_diff",
      artifactClassification: "internal",
    },
    reg,
  );
  assert.notEqual(result.decision, "allow_with_sanitization");
});
