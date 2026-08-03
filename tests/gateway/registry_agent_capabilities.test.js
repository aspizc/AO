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
});

test("gemini_has_restricted_classification", () => {
  assert.ok(reg.agents["gemini-cli"].allowedClassifications.includes("restricted"));
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
});

test("protected_branches_present", () => {
  assert.ok(Array.isArray(reg.protectedBranches));
  assert.ok(reg.protectedBranches.includes("main"));
});

test("agent_models_and_defaults_are_declared", () => {
  assert.ok(reg.agents.codex.models.includes("gpt-5.6-sol"));
  assert.ok(reg.agents.codex.models.includes("gpt-5.6-terra"));
  assert.ok(reg.agents.codex.models.includes("gpt-5.6-luna"));
  assert.equal(reg.agents.codex.modelAliases["gpt-5.6"], "gpt-5.6-sol");
  assert.equal(reg.agents.codex.defaultModel, "gpt-5.6-sol");
  assert.deepEqual(reg.agents.codex.reasoningEfforts, ["low", "medium", "high", "xhigh", "max", "ultra"]);
  assert.equal(reg.agents.codex.defaultReasoningEffort, "max");
  assert.deepEqual(reg.agents.codex.serviceTiers, ["priority"]);
  assert.equal(reg.agents.codex.defaultServiceTier, "priority");
  assert.ok(!reg.agents.codex.modelProfiles["gpt-5.6-luna"].reasoningEfforts.includes("ultra"));
  assert.deepEqual(reg.agents["claude-code"].models, [
    "claude-fable-5",
    "claude-opus-5",
    "claude-opus-4-8",
  ]);
  assert.deepEqual(reg.agents["claude-code"].modelAliases, {
    fable: "claude-fable-5",
    opus: "claude-opus-5",
  });
  assert.equal(reg.agents["claude-code"].defaultModel, "claude-fable-5");
  assert.equal(reg.agents["claude-code"].defaultReasoningEffort, "max");
  assert.equal(reg.agents["gemini-cli"].defaultModel, "gemini-2.5-pro");
  assert.equal(reg.agents["gemini-cli"].defaultReasoningEffort, undefined);
});
