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

import { evaluate, resolveAgentExecutionProfile } from "../../gateway/src/core/policy_engine.js";
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
  assert.equal(result.model, "claude-opus-5-5");
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

test("disallowed_model_denied_with_safe_reason_and_metadata", () => {
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
  assert.equal(result.reason, "effective agent selection rejected");
  assert.deepEqual(result.selectionRejection, {
    code: "EFFECTIVE_SELECTION_MODEL_UNSUPPORTED",
    field: "model",
    provider: "claude-code",
  });
});

test("codex defaults to Sol 6.1 max on the priority tier", () => {
  const result = evaluate(
    { agent: "codex", role: "coder", repo: "sample-apps", action: "agent.delegate" },
    reg,
  );

  assert.equal(result.decision, "allow");
  assert.equal(result.model, "gpt-6.1-sol");
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

test("astra alias resolves to gpt-6-astra and accepts every effort up to ultra", () => {
  const aliasResult = evaluate(
    {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      action: "agent.delegate",
      model: "astra",
    },
    reg,
  );
  const ultraResult = evaluate(
    {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      action: "agent.delegate",
      model: "gpt-6",
      reasoningEffort: "ultra",
    },
    reg,
  );
  const lowResult = evaluate(
    {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      action: "agent.delegate",
      model: "gpt-6-astra",
      reasoningEffort: "low",
    },
    reg,
  );

  assert.equal(aliasResult.decision, "allow");
  assert.equal(aliasResult.model, "gpt-6-astra");
  assert.equal(aliasResult.reasoningEffort, "max");
  assert.equal(aliasResult.serviceTier, "priority");
  assert.equal(ultraResult.decision, "allow");
  assert.equal(ultraResult.model, "gpt-6-astra");
  assert.equal(ultraResult.reasoningEffort, "ultra");
  assert.equal(lowResult.decision, "allow");
  assert.equal(lowResult.reasoningEffort, "low");
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

test("disallowed_reasoning_effort_denied_without_echoing_it", () => {
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
  assert.equal(result.reason, "effective agent selection rejected");
  assert.equal(result.reason.includes("extreme"), false);
  assert.deepEqual(result.selectionRejection, {
    code: "EFFECTIVE_SELECTION_REASONING_UNSUPPORTED",
    field: "reasoningEffort",
    provider: "codex",
  });
});

test("agent_without_canonical_profile_fails_closed", () => {
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

  assert.equal(result.decision, "deny");
  assert.equal(result.ruleId, "agent.model.allowed");
  assert.equal(result.model, undefined);
  assert.deepEqual(result.selectionRejection, {
    code: "EFFECTIVE_SELECTION_REGISTRY_DRIFT",
    field: "registry",
    provider: null,
  });
});

test("current defaults and explicit alternatives resolve across profiles without changing roles", () => {
  for (const profile of ["", "profiles/mvp2", "profiles/kya"]) {
    const registries = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies", profile) });
    for (const [agent, model, alias, effort] of [
      ["codex", "gpt-6.1-sol", "gpt-6.1", "max"],
      ["claude-code", "claude-sonnet-5-5", "sonnet-5.5", "max"],
      ["claude-code", "claude-opus-5-5", "opus-5.5", "max"],
    ]) {
      for (const requestedModel of [model, alias]) {
        const resolved = resolveAgentExecutionProfile({ agent, model: requestedModel }, registries);
        assert.equal(resolved.decision, "allow");
        assert.equal(resolved.model, model);
        assert.equal(resolved.reasoningEffort, effort);
        for (const role of ["orchestrator", "coder", "reviewer", "restricted-coder"]) {
          const result = evaluate({ agent, role, effectiveSelection: resolved.effectiveSelection, action: "policy.check" }, registries);
          const allowed = registries.getAgent(agent).allowedRoles.includes(role);
          assert.equal(result.decision, allowed ? "allow" : "deny", `${profile} ${agent} ${role}`);
          if (allowed) {
            assert.equal(result.model, model);
            assert.equal(result.reasoningEffort, effort);
          } else {
            assert.equal(result.ruleId, "role.agent_not_allowed_for_role");
          }
        }
      }
    }
    for (const [agent, model] of [["codex", "gpt-6.1-sol"], ["claude-code", "claude-opus-5-5"]]) {
      const result = resolveAgentExecutionProfile({ agent }, registries);
      assert.equal(result.model, model);
      assert.equal(result.reasoningEffort, "max");
      if (agent === "codex") assert.equal(result.serviceTier, "priority");
    }
  }
});
