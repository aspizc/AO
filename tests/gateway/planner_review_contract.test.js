import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluate } from "../../gateway/src/core/policy_engine.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const reg = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });

test("planner can put plans and review notes", () => {
  const planner = reg.getRole("planner");

  assert.ok(planner.allowActions.includes("artifact.put.plan"));
  assert.ok(planner.allowActions.includes("artifact.put.review_notes"));
  assert.equal(
    evaluate({ agent: "claude-code", role: "planner", repo: "agents-orchestrator", action: "artifact.put.plan" }, reg)
      .decision,
    "allow",
  );
  assert.equal(
    evaluate(
      {
        agent: "claude-code",
        role: "planner",
        repo: "agents-orchestrator",
        action: "artifact.put.review_notes",
      },
      reg,
    ).decision,
    "allow",
  );
});

test("planner remains denied code write and agent spawn", () => {
  for (const action of ["code.write", "agent.spawn"]) {
    const result = evaluate(
      { agent: "claude-code", role: "planner", repo: "agents-orchestrator", action },
      reg,
    );

    assert.equal(result.decision, "deny");
    assert.equal(result.ruleId, "role.deny_action");
  }
});

test("claude coder can write plans in agents-orchestrator internal repo", () => {
  const repo = reg.getRepo("agents-orchestrator");
  assert.equal(repo.classification, "internal");
  assert.deepEqual(repo.allowedAgents, ["gemini-cli", "claude-code", "codex"]);
  assert.deepEqual(repo.tags, ["self", "planning"]);

  const result = evaluate(
    { agent: "claude-code", role: "coder", repo: "agents-orchestrator", action: "code.write", path: "plan/Z/0/00.md" },
    reg,
  );
  assert.equal(result.decision, "allow");
});

test("planner cannot write even in agents-orchestrator", () => {
  const result = evaluate(
    { agent: "claude-code", role: "planner", repo: "agents-orchestrator", action: "code.write", path: "plan/Z/0/00.md" },
    reg,
  );

  assert.equal(result.decision, "deny");
  assert.equal(result.ruleId, "role.deny_action");
});

test("restricted repositories remain gemini and codex only", () => {
  for (const repoId of ["cvision", "cvlib"]) {
    const repo = reg.getRepo(repoId);

    assert.equal(repo.classification, "restricted");
    assert.deepEqual(repo.allowedAgents, ["gemini-cli", "codex"]);
  }
});
