import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { loadRegistries, RegistryError } from "../../gateway/src/core/registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const REAL = path.join(REPO_ROOT, "policies");

function writeMinimalRegistry(tmp, agent) {
  fs.writeFileSync(
    path.join(tmp, "agent-capabilities.json"),
    JSON.stringify({ version: 2, agents: { codex: agent } }),
  );
  fs.writeFileSync(
    path.join(tmp, "repositories.json"),
    JSON.stringify({
      version: 1,
      repositories: {
        sandbox: { classification: "unrestricted", allowedAgents: ["codex"] },
      },
    }),
  );
  fs.writeFileSync(path.join(tmp, "roles.json"), fs.readFileSync(path.join(REAL, "roles.json")));
}

test("loads_all_registries", () => {
  const reg = loadRegistries({ policiesDir: REAL });
  assert.ok(reg.getAgent("gemini-cli"));
});

test("get_agent_returns_agent_config", () => {
  const reg = loadRegistries({ policiesDir: REAL });
  assert.ok(reg.getAgent("claude-code").allowedRoles.includes("orchestrator"));
});

test("get_repo_returns_repo_config", () => {
  const reg = loadRegistries({ policiesDir: REAL });
  assert.equal(reg.getRepo("cvision").classification, "restricted");
});

test("get_role_returns_role_config", () => {
  const reg = loadRegistries({ policiesDir: REAL });
  assert.ok(reg.getRole("orchestrator").denyActions.includes("code.write"));
});

test("unknown_getters_return_null", () => {
  const reg = loadRegistries({ policiesDir: REAL });
  assert.equal(reg.getAgent("missing"), null);
  assert.equal(reg.getRepo("missing"), null);
  assert.equal(reg.getRole("missing"), null);
});

test("protected_branches_and_raw_are_defensive_copies", () => {
  const reg = loadRegistries({ policiesDir: REAL });
  const branches = reg.getProtectedBranches();
  branches.push("mutated");
  assert.ok(!reg.getProtectedBranches().includes("mutated"));

  const raw = reg.raw();
  raw.agents["gemini-cli"].allowedClassifications = [];
  assert.ok(reg.getAgent("gemini-cli").allowedClassifications.includes("restricted"));
});

test("invalid_registry_fails_fast", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reg-"));
  fs.writeFileSync(path.join(tmp, "agent-capabilities.json"), "{not json");
  fs.writeFileSync(path.join(tmp, "repositories.json"), "{}");
  fs.writeFileSync(path.join(tmp, "roles.json"), "{}");
  assert.throws(
    () => loadRegistries({ policiesDir: tmp }),
    (err) => err instanceof RegistryError && err.code === "REGISTRY_INVALID_JSON",
  );
});

test("missing_registry_fails_fast", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reg-"));
  assert.throws(
    () => loadRegistries({ policiesDir: tmp }),
    (err) => err instanceof RegistryError && err.code === "REGISTRY_MISSING",
  );
});

test("cross_invariant_restricted_repo_with_non_restricted_agent_fails", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reg-"));
  fs.writeFileSync(
    path.join(tmp, "agent-capabilities.json"),
    JSON.stringify({
      version: 1,
      agents: {
        "claude-code": { allowedClassifications: ["unrestricted"], allowedRoles: ["coder"] },
      },
    }),
  );
  fs.writeFileSync(
    path.join(tmp, "repositories.json"),
    JSON.stringify({
      version: 1,
      repositories: {
        cvision: { classification: "restricted", allowedAgents: ["claude-code"] },
      },
    }),
  );
  fs.writeFileSync(path.join(tmp, "roles.json"), fs.readFileSync(path.join(REAL, "roles.json")));
  assert.throws(
    () => loadRegistries({ policiesDir: tmp }),
    (err) => err instanceof RegistryError && err.code === "REGISTRY_INVARIANT",
  );
});

test("invalid_agent_default_model_fails_fast", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reg-"));
  fs.writeFileSync(
    path.join(tmp, "agent-capabilities.json"),
    JSON.stringify({
      version: 2,
      agents: {
        "claude-code": {
          allowedClassifications: ["unrestricted"],
          allowedRoles: ["coder"],
          models: ["claude-fable-5"],
          defaultModel: "claude-opus-4-8",
        },
      },
    }),
  );
  fs.writeFileSync(
    path.join(tmp, "repositories.json"),
    JSON.stringify({
      version: 1,
      repositories: {
        sandbox: { classification: "unrestricted", allowedAgents: ["claude-code"] },
      },
    }),
  );
  fs.writeFileSync(path.join(tmp, "roles.json"), fs.readFileSync(path.join(REAL, "roles.json")));

  assert.throws(
    () => loadRegistries({ policiesDir: tmp }),
    (err) => err instanceof RegistryError && err.code === "REGISTRY_INVALID_AGENT",
  );
});

test("invalid_agent_default_reasoning_effort_fails_fast", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reg-"));
  fs.writeFileSync(
    path.join(tmp, "agent-capabilities.json"),
    JSON.stringify({
      version: 2,
      agents: {
        codex: {
          allowedClassifications: ["unrestricted"],
          allowedRoles: ["coder"],
          reasoningEfforts: ["low", "medium"],
          defaultReasoningEffort: "high",
        },
      },
    }),
  );
  fs.writeFileSync(
    path.join(tmp, "repositories.json"),
    JSON.stringify({
      version: 1,
      repositories: {
        sandbox: { classification: "unrestricted", allowedAgents: ["codex"] },
      },
    }),
  );
  fs.writeFileSync(path.join(tmp, "roles.json"), fs.readFileSync(path.join(REAL, "roles.json")));

  assert.throws(
    () => loadRegistries({ policiesDir: tmp }),
    (err) => err instanceof RegistryError && err.code === "REGISTRY_INVALID_AGENT",
  );
});

test("agent_default_reasoning_effort_requires_an_allowlist", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reg-"));
  writeMinimalRegistry(tmp, {
    allowedClassifications: ["unrestricted"],
    allowedRoles: ["coder"],
    defaultReasoningEffort: "max",
  });

  assert.throws(
    () => loadRegistries({ policiesDir: tmp }),
    (err) => err instanceof RegistryError && err.code === "REGISTRY_INVALID_AGENT",
  );
});

test("invalid_agent_default_service_tier_fails_fast", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reg-"));
  fs.writeFileSync(
    path.join(tmp, "agent-capabilities.json"),
    JSON.stringify({
      version: 2,
      agents: {
        codex: {
          allowedClassifications: ["unrestricted"],
          allowedRoles: ["coder"],
          serviceTiers: ["priority"],
          defaultServiceTier: "standard",
        },
      },
    }),
  );
  fs.writeFileSync(
    path.join(tmp, "repositories.json"),
    JSON.stringify({
      version: 1,
      repositories: {
        sandbox: { classification: "unrestricted", allowedAgents: ["codex"] },
      },
    }),
  );
  fs.writeFileSync(path.join(tmp, "roles.json"), fs.readFileSync(path.join(REAL, "roles.json")));

  assert.throws(
    () => loadRegistries({ policiesDir: tmp }),
    (err) => err instanceof RegistryError && err.code === "REGISTRY_INVALID_AGENT",
  );
});

test("agent_default_service_tier_requires_an_allowlist", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reg-"));
  writeMinimalRegistry(tmp, {
    allowedClassifications: ["unrestricted"],
    allowedRoles: ["coder"],
    defaultServiceTier: "priority",
  });

  assert.throws(
    () => loadRegistries({ policiesDir: tmp }),
    (err) => err instanceof RegistryError && err.code === "REGISTRY_INVALID_AGENT",
  );
});

test("model_alias_target_must_be_a_listed_model", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reg-"));
  fs.writeFileSync(
    path.join(tmp, "agent-capabilities.json"),
    JSON.stringify({
      version: 2,
      agents: {
        codex: {
          allowedClassifications: ["unrestricted"],
          allowedRoles: ["coder"],
          models: ["gpt-5.6-sol"],
          modelAliases: { "gpt-5.6": "gpt-5.6-missing" },
        },
      },
    }),
  );
  fs.writeFileSync(
    path.join(tmp, "repositories.json"),
    JSON.stringify({
      version: 1,
      repositories: {
        sandbox: { classification: "unrestricted", allowedAgents: ["codex"] },
      },
    }),
  );
  fs.writeFileSync(path.join(tmp, "roles.json"), fs.readFileSync(path.join(REAL, "roles.json")));

  assert.throws(
    () => loadRegistries({ policiesDir: tmp }),
    (err) => err instanceof RegistryError && err.code === "REGISTRY_INVALID_AGENT",
  );
});

test("model_profile_must_be_an_object", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reg-"));
  writeMinimalRegistry(tmp, {
    allowedClassifications: ["unrestricted"],
    allowedRoles: ["coder"],
    models: ["gpt-5.6-sol"],
    modelProfiles: { "gpt-5.6-sol": null },
  });

  assert.throws(
    () => loadRegistries({ policiesDir: tmp }),
    (err) => err instanceof RegistryError && err.code === "REGISTRY_INVALID_AGENT",
  );
});

test("model_profile_rejects_an_incompatible_inherited_default", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reg-"));
  writeMinimalRegistry(tmp, {
    allowedClassifications: ["unrestricted"],
    allowedRoles: ["coder"],
    models: ["gpt-5.6-luna"],
    reasoningEfforts: ["max", "ultra"],
    defaultReasoningEffort: "ultra",
    modelProfiles: {
      "gpt-5.6-luna": { reasoningEfforts: ["max"] },
    },
  });

  assert.throws(
    () => loadRegistries({ policiesDir: tmp }),
    (err) => err instanceof RegistryError && err.code === "REGISTRY_INVALID_AGENT",
  );
});
