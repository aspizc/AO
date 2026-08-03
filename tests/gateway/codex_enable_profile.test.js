import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadRegistries } from "../../gateway/src/core/registry.js";
import { evaluate } from "../../gateway/src/core/policy_engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const BASE = path.join(REPO_ROOT, "policies");
const MVP2 = path.join(REPO_ROOT, "policies", "profiles", "mvp2");

test("base registry enables codex", () => {
  const reg = loadRegistries({ policiesDir: BASE });

  assert.equal(reg.getAgent("codex").enabled, true);
});

test("mvp2 profile enables codex for unrestricted repos", () => {
  const reg = loadRegistries({ policiesDir: MVP2 });
  const decision = evaluate(
    {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      action: "agent.spawn",
    },
    reg,
  );

  assert.equal(reg.getAgent("codex").enabled, true);
  assert.deepEqual(reg.getAgent("codex").allowedClassifications, ["unrestricted", "internal", "restricted"]);
  assert.equal(decision.decision, "allow");
});

test("mvp2 profile allows codex coder in agents-orchestrator", () => {
  const reg = loadRegistries({ policiesDir: MVP2 });
  const decision = evaluate(
    {
      agent: "codex",
      role: "coder",
      repo: "agents-orchestrator",
      action: "code.write",
    },
    reg,
  );

  assert.equal(decision.decision, "allow");
});

test("base registry allows codex coder in agents-orchestrator by default", () => {
  const reg = loadRegistries({ policiesDir: BASE });
  const decision = evaluate(
    {
      agent: "codex",
      role: "coder",
      repo: "agents-orchestrator",
      action: "code.write",
    },
    reg,
  );

  assert.equal(decision.decision, "allow");
});

test("mvp2 profile denies codex writes to self policy files", () => {
  const reg = loadRegistries({ policiesDir: MVP2 });
  for (const path of [
    "policies",
    "policies/profiles/mvp2/repositories.json",
    "./policies/profiles/mvp2/repositories.json",
    "agents-orchestrator/policies/profiles/mvp2/repositories.json",
    "/home/carase/git/personal/agents-orchestrator/policies/profiles/mvp2/repositories.json",
    "policies\\profiles\\mvp2\\repositories.json",
    "tmp/../policies/profiles/mvp2/repositories.json",
  ]) {
    const decision = evaluate(
      {
        agent: "codex",
        role: "coder",
        repo: "agents-orchestrator",
        action: "code.write",
        path,
      },
      reg,
    );

    assert.equal(decision.decision, "deny", path);
    assert.equal(decision.ruleId, "classification.excluded_path", path);
  }
});

test("base registry denies codex writes to self policy files", () => {
  const reg = loadRegistries({ policiesDir: BASE });
  for (const path of [
    "policies",
    "policies/repositories.json",
    "./policies/repositories.json",
    "agents-orchestrator/policies/repositories.json",
    "/home/carase/git/personal/agents-orchestrator/policies/repositories.json",
    "policies\\repositories.json",
    "tmp/../policies/repositories.json",
  ]) {
    const decision = evaluate(
      {
        agent: "codex",
        role: "coder",
        repo: "agents-orchestrator",
        action: "code.write",
        path,
      },
      reg,
    );

    assert.equal(decision.decision, "deny", path);
    assert.equal(decision.ruleId, "classification.excluded_path", path);
  }
});

test("mvp2 profile allows codex planner role in agents-orchestrator", () => {
  const reg = loadRegistries({ policiesDir: MVP2 });
  const decision = evaluate(
    {
      agent: "codex",
      role: "planner",
      repo: "agents-orchestrator",
      action: "artifact.put.plan",
    },
    reg,
  );

  assert.equal(decision.decision, "allow");
});

test("base registry allows codex planner role in agents-orchestrator", () => {
  const reg = loadRegistries({ policiesDir: BASE });
  const decision = evaluate(
    {
      agent: "codex",
      role: "planner",
      repo: "agents-orchestrator",
      action: "artifact.put.plan",
    },
    reg,
  );

  assert.equal(decision.decision, "allow");
});

test("mvp2 profile allows codex on restricted repos", () => {
  const reg = loadRegistries({ policiesDir: MVP2 });
  const decision = evaluate(
    {
      agent: "codex",
      role: "coder",
      repo: "cvision",
      action: "agent.spawn",
    },
    reg,
  );

  assert.equal(decision.decision, "allow");
});

test("mvp2 profile codex default is gpt-5.6-sol max fast", () => {
  const reg = loadRegistries({ policiesDir: MVP2 });
  const decision = evaluate(
    {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      action: "agent.delegate",
    },
    reg,
  );

  assert.equal(reg.getAgent("codex").defaultModel, "gpt-5.6-sol");
  assert.equal(reg.getAgent("codex").defaultReasoningEffort, "max");
  assert.equal(reg.getAgent("codex").defaultServiceTier, "priority");
  assert.equal(decision.model, "gpt-5.6-sol");
  assert.equal(decision.reasoningEffort, "max");
  assert.equal(decision.serviceTier, "priority");
});
