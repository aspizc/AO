import { test } from "node:test";
import assert from "node:assert/strict";

import {
  Decision,
  Actions,
  isRawKind,
  normalizePolicyContext,
} from "../../gateway/src/core/policy_types.js";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { evaluate } from "../../gateway/src/core/policy_engine.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const reg = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });

test("decision_values_are_stable", () => {
  assert.equal(Decision.ALLOW, "allow");
  assert.equal(Decision.DENY, "deny");
  assert.equal(Decision.REQUIRE_APPROVAL, "require_approval");
  assert.equal(Decision.ALLOW_WITH_SANITIZATION, "allow_with_sanitization");
});

test("routine_actions_are_mapped", () => {
  for (const action of ["agent.delegate", "artifact.put", "policy.check"]) {
    assert.ok(Actions.includes(action));
  }
});

test("approval_actions_are_mapped", () => {
  for (const action of ["approval.request", "approval.poll", "approval.wait", "approval.respond"]) {
    assert.ok(Actions.includes(action));
  }
});

test("isRawKind_recognizes_raw_kinds", () => {
  assert.ok(isRawKind("raw_diff"));
  assert.ok(isRawKind("raw_code"));
  assert.ok(isRawKind("raw_stacktrace"));
  assert.ok(!isRawKind("review_notes"));
});

test("normalizePolicyContext_throws_when_required_missing", () => {
  assert.throws(() => normalizePolicyContext({}), TypeError);
});

test("normalizePolicyContext_returns_immutable_normalized_context", () => {
  const ctx = normalizePolicyContext({
    agent: "gemini-cli",
    role: "coder",
    action: "code.write",
    repo: "developer-tools",
  });
  assert.equal(ctx.repo, "developer-tools");
  assert.equal(Object.isFrozen(ctx), true);
});

test("default_model_used_when_omitted", () => {
  const result = evaluate(
    { agent: "claude-code", role: "reviewer", repo: "sample-apps", action: "agent.spawn" },
    reg,
  );

  assert.equal(result.decision, "allow");
  assert.equal(result.model, "claude-fable-5");
  assert.equal(result.reasoningEffort, "max");
});

test("allowed_model_resolves_ok", () => {
  const codex = evaluate(
    {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      action: "agent.delegate",
      model: "gpt-5",
    },
    reg,
  );
  const claude = evaluate(
    {
      agent: "claude-code",
      role: "reviewer",
      repo: "sample-apps",
      action: "agent.spawn",
      model: "claude-opus-4-8",
    },
    reg,
  );

  assert.equal(codex.decision, "allow");
  assert.equal(codex.model, "gpt-5");
  assert.equal(claude.decision, "allow");
  assert.equal(claude.model, "claude-opus-4-8");
});

test("disallowed_model_denied_with_reason", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "reviewer",
      repo: "sample-apps",
      action: "agent.spawn",
      model: "gpt-5",
    },
    reg,
  );

  assert.equal(result.decision, "deny");
  assert.equal(result.ruleId, "agent.model.allowed");
  assert.match(result.reason, /model gpt-5 not allowed for agent claude-code/);
});

test("codex defaults to gpt-5.6-sol max on the priority service tier", () => {
  const result = evaluate(
    { agent: "codex", role: "coder", repo: "sample-apps", action: "agent.delegate" },
    reg,
  );

  assert.equal(result.decision, "allow");
  assert.equal(result.model, "gpt-5.6-sol");
  assert.equal(result.reasoningEffort, "max");
  assert.equal(result.serviceTier, "priority");
});

test("gpt-5.6 alias resolves to the canonical sol model", () => {
  const result = evaluate(
    {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      action: "agent.delegate",
      model: "gpt-5.6",
    },
    reg,
  );

  assert.equal(result.decision, "allow");
  assert.equal(result.model, "gpt-5.6-sol");
  assert.equal(result.reasoningEffort, "max");
  assert.equal(result.serviceTier, "priority");
});

test("claude aliases resolve to current canonical models", () => {
  const fable = evaluate(
    {
      agent: "claude-code",
      role: "reviewer",
      repo: "sample-apps",
      action: "agent.delegate",
      model: "fable",
    },
    reg,
  );
  const opus = evaluate(
    {
      agent: "claude-code",
      role: "reviewer",
      repo: "sample-apps",
      action: "agent.delegate",
      model: "opus",
    },
    reg,
  );

  assert.equal(fable.model, "claude-fable-5");
  assert.equal(opus.model, "claude-opus-5");
  assert.equal(fable.reasoningEffort, "max");
  assert.equal(opus.reasoningEffort, "max");
});

test("luna rejects ultra but uses max by default", () => {
  const defaultResult = evaluate(
    {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      action: "agent.delegate",
      model: "gpt-5.6-luna",
    },
    reg,
  );
  const invalidResult = evaluate(
    {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      action: "agent.delegate",
      model: "gpt-5.6-luna",
      reasoningEffort: "ultra",
    },
    reg,
  );

  assert.equal(defaultResult.decision, "allow");
  assert.equal(defaultResult.reasoningEffort, "max");
  assert.equal(invalidResult.decision, "deny");
  assert.equal(invalidResult.ruleId, "agent.reasoning_effort.allowed");
});

test("disallowed service tier is denied", () => {
  const result = evaluate(
    {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      action: "agent.delegate",
      serviceTier: "standard",
    },
    reg,
  );

  assert.equal(result.decision, "deny");
  assert.equal(result.ruleId, "agent.service_tier.allowed");
});

test("service tier is denied for agents that do not declare it", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "reviewer",
      repo: "sample-apps",
      action: "agent.delegate",
      serviceTier: "priority",
    },
    reg,
  );

  assert.equal(result.decision, "deny");
  assert.equal(result.ruleId, "agent.service_tier.allowed");
});

test("reasoning effort is denied for agents that do not declare it", () => {
  const result = evaluate(
    {
      agent: "gemini-cli",
      role: "coder",
      repo: "sample-apps",
      action: "agent.delegate",
      reasoningEffort: "max",
    },
    reg,
  );

  assert.equal(result.decision, "deny");
  assert.equal(result.ruleId, "agent.reasoning_effort.allowed");
});

test("disallowed_reasoning_effort_denied", () => {
  const result = evaluate(
    {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      action: "agent.delegate",
      reasoningEffort: "extreme",
    },
    reg,
  );

  assert.equal(result.decision, "deny");
  assert.equal(result.ruleId, "agent.reasoning_effort.allowed");
  assert.match(result.reason, /reasoning effort extreme not allowed for agent codex/);
});

test("agent_without_models_block_keeps_validating", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "model-reg-"));
  fs.writeFileSync(
    path.join(tmp, "agent-capabilities.json"),
    JSON.stringify({
      version: 1,
      agents: {
        legacy: {
          allowedClassifications: ["unrestricted"],
          allowedRoles: ["coder"],
          requiresApprovalFor: [],
        },
      },
      protectedBranches: [],
    }),
  );
  fs.writeFileSync(
    path.join(tmp, "repositories.json"),
    JSON.stringify({
      version: 1,
      repositories: {
        sandbox: { classification: "unrestricted", allowedAgents: ["legacy"] },
      },
    }),
  );
  fs.writeFileSync(
    path.join(tmp, "roles.json"),
    JSON.stringify({
      version: 1,
      roles: {
        orchestrator: {
          allowActions: [],
          denyActions: ["code.write", "artifact.get.raw_restricted", "approval.respond"],
        },
        planner: { allowActions: [], denyActions: [] },
        coder: { allowActions: ["agent.delegate"], denyActions: [] },
        "restricted-coder": { allowActions: [], denyActions: [] },
        reviewer: { allowActions: [], denyActions: [] },
        tester: { allowActions: [], denyActions: [] },
        documenter: { allowActions: [], denyActions: [] },
        security_reviewer: { allowActions: [], denyActions: [] },
      },
    }),
  );

  const legacy = loadRegistries({ policiesDir: tmp });
  const result = evaluate(
    { agent: "legacy", role: "coder", repo: "sandbox", action: "agent.delegate" },
    legacy,
  );

  assert.equal(result.decision, "allow");
  assert.equal(result.model, undefined);
});
