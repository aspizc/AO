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

test("orchestrator_cannot_code_write", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "orchestrator",
      repo: "sample-apps",
      action: "code.write",
    },
    reg,
  );
  assert.equal(result.decision, "deny");
  assert.equal(result.ruleId, "role.deny_action");
});

test("orchestrator_cannot_read_raw_restricted_artifact", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "orchestrator",
      repo: null,
      action: "code.read.raw_restricted",
    },
    reg,
  );
  assert.equal(result.decision, "deny");
});

test("orchestrator_can_task_assign_to_gemini_restricted_coder", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "orchestrator",
      repo: null,
      action: "task.assign",
      targetAgent: "gemini-cli",
      targetRole: "restricted-coder",
    },
    reg,
  );
  assert.equal(result.decision, "allow");
});

test("orchestrator_can_task_assign_to_codex_restricted_coder", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "orchestrator",
      repo: null,
      action: "task.assign",
      targetAgent: "codex",
      targetRole: "restricted-coder",
    },
    reg,
  );
  assert.equal(result.decision, "allow");
});

test("orchestrator_cannot_task_assign_claude_as_restricted_coder", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "orchestrator",
      repo: null,
      action: "task.assign",
      targetAgent: "claude-code",
      targetRole: "restricted-coder",
    },
    reg,
  );
  assert.equal(result.decision, "deny");
});

test("non_orchestrator_cannot_task_assign", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "coder",
      repo: null,
      action: "task.assign",
      targetAgent: "gemini-cli",
      targetRole: "coder",
    },
    reg,
  );
  assert.equal(result.decision, "deny");
});

test("task_assign_requires_target_agent_and_role", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "orchestrator",
      repo: null,
      action: "task.assign",
    },
    reg,
  );
  assert.equal(result.decision, "deny");
});

test("codex_can_assume_orchestrator_role", () => {
  const result = evaluate(
    {
      agent: "codex",
      role: "orchestrator",
      repo: null,
      action: "policy.check",
    },
    reg,
  );
  assert.equal(result.decision, "allow");
});
