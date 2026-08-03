import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { evaluate, explain } from "../../gateway/src/core/policy_engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const reg = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });

test("explain_returns_final_decision_context_and_layer_trace", () => {
  const ctx = {
    agent: "claude-code",
    role: "reviewer",
    repo: "sample-apps",
    action: "artifact.get",
    artifactKind: "raw_diff",
    artifactClassification: "restricted",
  };

  const result = explain(ctx, reg);

  assert.equal(result.decision, "allow_with_sanitization");
  assert.equal(result.ruleId, "sanitization.required");
  assert.deepEqual(result.context, {
    agent: "claude-code",
    role: "reviewer",
    repo: "sample-apps",
    action: "artifact.get",
    path: null,
    artifactKind: "raw_diff",
    artifactClassification: "restricted",
    targetAgent: null,
    targetRole: null,
    targetBranch: null,
    model: null,
    reasoningEffort: null,
    serviceTier: null,
  });
  assert.deepEqual(
    result.layers.map((layer) => layer.name),
    ["classification", "model", "role", "approval", "sanitization"],
  );
  assert.equal(result.layers.at(-1).result.decision, "allow_with_sanitization");
});

test("evaluate_returns_the_same_final_decision_as_explain", () => {
  const ctx = {
    agent: "gemini-cli",
    role: "coder",
    repo: "cvision",
    action: "git.push",
    targetBranch: "main",
  };

  assert.deepEqual(evaluate(ctx, reg), {
    decision: explain(ctx, reg).decision,
    reason: explain(ctx, reg).reason,
    ruleId: explain(ctx, reg).ruleId,
  });
});

test("explain_stops_trace_after_first_non_allow_decision", () => {
  const result = explain(
    {
      agent: "claude-code",
      role: "coder",
      repo: "cvision",
      action: "code.read",
    },
    reg,
  );

  assert.equal(result.decision, "deny");
  assert.deepEqual(
    result.layers.map((layer) => layer.name),
    ["classification"],
  );
});
