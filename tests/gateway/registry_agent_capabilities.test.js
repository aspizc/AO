import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FILE = path.resolve(__dirname, "..", "..", "policies", "agent-capabilities.json");
const reg = JSON.parse(fs.readFileSync(FILE, "utf-8"));

test("loads_agent_capabilities_registry", () => {
  assert.equal(reg.version, 2);
  assert.ok(reg.agents["gemini-cli"]);
  assert.ok(reg.agents["claude-code"]);
  assert.ok(reg.agents.codex);
  assert.ok(reg.agents.antigravity);
});

test("gemini_has_restricted_classification", () => {
  assert.ok(reg.agents["gemini-cli"].allowedClassifications.includes("restricted"));
  assert.ok(reg.agents.antigravity.allowedClassifications.includes("restricted"));
});

test("claude_does_not_have_restricted_classification", () => {
  assert.ok(!reg.agents["claude-code"].allowedClassifications.includes("restricted"));
});

test("codex_can_plan_read_review_and_write_restricted_repositories", () => {
  assert.ok(reg.agents.codex.allowedClassifications.includes("restricted"));
  assert.ok(reg.agents.codex.allowedRoles.includes("orchestrator"));
  assert.ok(reg.agents.codex.allowedRoles.includes("planner"));
  assert.ok(reg.agents.codex.allowedRoles.includes("restricted-coder"));
  assert.ok(reg.agents.codex.allowedRoles.includes("reviewer"));
});

test("orchestrator_role_is_allowed_for_gemini_claude_and_codex", () => {
  assert.ok(reg.agents["gemini-cli"].allowedRoles.includes("orchestrator"));
  assert.ok(reg.agents["claude-code"].allowedRoles.includes("orchestrator"));
  assert.ok(reg.agents.codex.allowedRoles.includes("orchestrator"));
  assert.ok(reg.agents.antigravity.allowedRoles.includes("orchestrator"));
});

test("protected_branches_present", () => {
  assert.ok(Array.isArray(reg.protectedBranches));
  assert.ok(reg.protectedBranches.includes("main"));
});

test("agent_models_and_defaults_are_declared", () => {
  assert.ok(reg.agents.codex.models.includes("gpt-6-astra"));
  assert.ok(reg.agents.codex.models.includes("gpt-5.6-sol"));
  assert.ok(reg.agents.codex.models.includes("gpt-5.6-terra"));
  assert.ok(reg.agents.codex.models.includes("gpt-5.6-luna"));
  assert.equal(reg.agents.codex.modelAliases["gpt-6"], "gpt-6-astra");
  assert.equal(reg.agents.codex.modelAliases.astra, "gpt-6-astra");
  assert.equal(reg.agents.codex.modelAliases["gpt-5.6"], "gpt-5.6-sol");
  assert.equal(reg.agents.codex.modelAliases.sol, "gpt-5.6-sol");
  assert.equal(reg.agents.codex.modelAliases.terra, "gpt-5.6-terra");
  assert.equal(reg.agents.codex.modelAliases.luna, "gpt-5.6-luna");
  assert.equal(reg.agents.codex.defaultModel, "gpt-5.6-sol");
  assert.deepEqual(reg.agents.codex.reasoningEfforts, ["low", "medium", "high", "xhigh", "max", "ultra"]);
  assert.equal(reg.agents.codex.defaultReasoningEffort, "max");
  assert.equal(
    reg.agents.codex.modelProfiles["gpt-5.6-luna"].defaultReasoningEffort,
    "max",
  );
  assert.ok(reg.agents.codex.modelProfiles["gpt-5.6-terra"].reasoningEfforts.includes("ultra"));
  assert.deepEqual(reg.agents.codex.modelProfiles["gpt-6-astra"].reasoningEfforts, [
    "low",
    "medium",
    "high",
    "xhigh",
    "max",
    "ultra",
  ]);
  assert.equal(reg.agents.codex.modelProfiles["gpt-6-astra"].defaultReasoningEffort, "max");
  assert.deepEqual(reg.agents.codex.serviceTiers, ["default", "priority"]);
  assert.equal(reg.agents.codex.defaultServiceTier, "priority");
  assert.ok(!reg.agents.codex.modelProfiles["gpt-5.6-luna"].reasoningEfforts.includes("ultra"));
  assert.deepEqual(reg.agents["claude-code"].models, [
    "claude-sonnet-5",
    "claude-fable-5-1",
    "claude-fable-5",
    "claude-opus-5",
    "claude-opus-4-8",
  ]);
  assert.deepEqual(reg.agents["claude-code"].modelAliases, {
    fable: "claude-fable-5",
    opus: "claude-opus-5",
    sonnet: "claude-sonnet-5",
  });
  assert.equal(reg.agents["claude-code"].defaultModel, "claude-fable-5");
  assert.equal(reg.agents["claude-code"].defaultReasoningEffort, "max");
  assert.equal(reg.agents["gemini-cli"].defaultModel, "gemini-2.5-pro");
  assert.equal(reg.agents["gemini-cli"].defaultReasoningEffort, undefined);
  assert.ok(reg.agents.antigravity.models.includes("gemini-3.8-flash-high"));
  assert.ok(reg.agents.antigravity.models.includes("gemini-3.8-flash-medium"));
  assert.ok(reg.agents.antigravity.models.includes("gemini-3.8-flash-low"));
  assert.ok(reg.agents.antigravity.models.includes("gemini-3.7-flash-high"));
  assert.ok(reg.agents.antigravity.models.includes("gemini-3.7-flash-medium"));
  assert.ok(reg.agents.antigravity.models.includes("gemini-3.7-flash-low"));
  assert.equal(reg.agents.antigravity.modelAliases["gemini-3.8-flash"], "gemini-3.8-flash-high");
  assert.equal(reg.agents.antigravity.modelAliases["gemini-3.7-flash"], "gemini-3.7-flash-high");
  assert.deepEqual(reg.agents.antigravity.reasoningEfforts, ["low", "medium", "high"]);
  assert.equal(reg.agents.antigravity.defaultModel, "gemini-3.8-flash-high");
  assert.equal(reg.agents.antigravity.defaultReasoningEffort, "high");
});
