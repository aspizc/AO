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

test("protected_branch_push_requires_approval", () => {
  const result = evaluate(
    {
      agent: "gemini-cli",
      role: "coder",
      repo: "cvision",
      action: "git.push",
      targetBranch: "main",
    },
    reg,
  );
  assert.equal(result.decision, "require_approval");
});

test("release_branch_push_requires_approval", () => {
  const result = evaluate(
    {
      agent: "gemini-cli",
      role: "coder",
      repo: "cvision",
      action: "git.push",
      targetBranch: "release/1.0",
    },
    reg,
  );
  assert.equal(result.decision, "require_approval");
});

test("dependency_change_requires_approval", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "coder",
      repo: "sample-apps",
      action: "dependency.change",
    },
    reg,
  );
  assert.equal(result.decision, "require_approval");
});

test("local_code_write_is_allowed", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "coder",
      repo: "sample-apps",
      action: "code.write",
    },
    reg,
  );
  assert.equal(result.decision, "allow");
});

test("test_run_is_allowed", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "tester",
      repo: "sample-apps",
      action: "test.run",
    },
    reg,
  );
  assert.equal(result.decision, "allow");
});

test("push_to_feature_branch_does_not_require_approval", () => {
  const result = evaluate(
    {
      agent: "gemini-cli",
      role: "coder",
      repo: "cvision",
      action: "git.push",
      targetBranch: "feature/foo",
    },
    reg,
  );
  assert.notEqual(result.decision, "require_approval");
});
