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

test("claude_denied_on_restricted_repo", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "coder",
      repo: "cvision",
      action: "code.read",
    },
    reg,
  );
  assert.equal(result.decision, "deny");
  assert.match(result.ruleId, /classification/);
});

test("codex_coder_is_allowed_on_restricted_repo", () => {
  const result = evaluate(
    {
      agent: "codex",
      role: "coder",
      repo: "cvision",
      action: "code.write",
    },
    reg,
  );
  assert.equal(result.decision, "allow");
});

test("codex_restricted_coder_is_allowed_on_restricted_repo", () => {
  const result = evaluate(
    {
      agent: "codex",
      role: "restricted-coder",
      repo: "cvision",
      action: "code.write",
    },
    reg,
  );
  assert.equal(result.decision, "allow");
});

test("codex_reviewer_is_allowed_on_restricted_repo", () => {
  const result = evaluate(
    {
      agent: "codex",
      role: "reviewer",
      repo: "cvision",
      action: "agent.delegate",
    },
    reg,
  );
  assert.equal(result.decision, "allow");
});

test("codex_planner_is_allowed_on_internal_planning_repo", () => {
  const result = evaluate(
    {
      agent: "codex",
      role: "planner",
      repo: "engineering_graph",
      action: "agent.delegate",
    },
    reg,
  );
  assert.equal(result.decision, "allow");
});

test("gemini_allowed_on_restricted", () => {
  const result = evaluate(
    {
      agent: "gemini-cli",
      role: "restricted-coder",
      repo: "cvision",
      action: "code.read",
    },
    reg,
  );
  assert.equal(result.decision, "allow");
});

test("unknown_repo_is_denied", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "coder",
      repo: "no-such-repo",
      action: "code.read",
    },
    reg,
  );
  assert.equal(result.decision, "deny");
});

test("unknown_agent_is_denied", () => {
  const result = evaluate(
    {
      agent: "no-such-agent",
      role: "coder",
      repo: "sample-apps",
      action: "code.read",
    },
    reg,
  );
  assert.equal(result.decision, "deny");
});

test("excluded_path_is_denied", () => {
  const fakeReg = {
    getAgent: () => ({ allowedClassifications: ["unrestricted"], allowedRoles: ["coder"] }),
    getRepo: () => ({
      classification: "unrestricted",
      allowedAgents: ["x"],
      excludedPaths: ["secrets/"],
    }),
    getRole: () => ({}),
    getProtectedBranches: () => [],
  };
  const result = evaluate(
    {
      agent: "x",
      role: "coder",
      repo: "y",
      action: "code.read",
      path: "secrets/key.pem",
    },
    fakeReg,
  );
  assert.equal(result.decision, "deny");
});

test("excluded_path_normalizes_common_path_forms", () => {
  const fakeReg = {
    getAgent: () => ({ allowedClassifications: ["unrestricted"], allowedRoles: ["coder"] }),
    getRepo: () => ({
      classification: "unrestricted",
      allowedAgents: ["x"],
      excludedPaths: ["policies/"],
    }),
    getRole: () => ({}),
    getProtectedBranches: () => [],
  };

  for (const path of [
    "policies",
    "./policies/config.json",
    "/workspace/repo/policies/config.json",
    "repo/policies/config.json",
    "policies\\config.json",
    "tmp/../policies/config.json",
  ]) {
    const result = evaluate(
      {
        agent: "x",
        role: "coder",
        repo: "y",
        action: "code.write",
        path,
      },
      fakeReg,
    );
    assert.equal(result.decision, "deny", path);
    assert.equal(result.ruleId, "classification.excluded_path", path);
  }
});

test("excluded_path_does_not_match_similar_prefixes", () => {
  const fakeReg = {
    getAgent: () => ({ allowedClassifications: ["unrestricted"], allowedRoles: ["coder"] }),
    getRepo: () => ({
      classification: "unrestricted",
      allowedAgents: ["x"],
      excludedPaths: ["policies/"],
    }),
    getRole: () => ({}),
    getProtectedBranches: () => [],
  };
  const result = evaluate(
    {
      agent: "x",
      role: "coder",
      repo: "y",
      action: "code.write",
      path: "policies-old/config.json",
    },
    fakeReg,
  );

  assert.equal(result.decision, "allow");
});

test("evaluate_is_deterministic_for_same_input", () => {
  const ctx = {
    agent: "gemini-cli",
    role: "restricted-coder",
    repo: "cvision",
    action: "code.read",
  };
  assert.deepEqual(evaluate(ctx, reg), evaluate(ctx, reg));
});
