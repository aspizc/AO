import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const policiesDir = path.resolve(__dirname, "..", "..", "policies");
const reg = JSON.parse(fs.readFileSync(path.join(policiesDir, "roles.json"), "utf-8"));

const REQUIRED_ROLES = [
  "orchestrator",
  "planner",
  "coder",
  "restricted-coder",
  "reviewer",
  "tester",
  "documenter",
  "security_reviewer",
];

test("all_v4_roles_exist", () => {
  for (const role of REQUIRED_ROLES) {
    assert.ok(reg.roles[role], `missing role ${role}`);
  }
});

test("orchestrator_denies_code_write", () => {
  assert.ok(reg.roles.orchestrator.denyActions.includes("code.write"));
});

test("orchestrator_denies_raw_restricted_artifacts", () => {
  assert.ok(reg.roles.orchestrator.denyActions.includes("artifact.get.raw_restricted"));
  assert.ok(reg.roles.orchestrator.denyActions.includes("code.read.raw_restricted"));
});

test("orchestrator_cannot_self_approve", () => {
  assert.ok(reg.roles.orchestrator.denyActions.includes("approval.respond"));
});

test("reviewer_denies_raw_artifact_kinds", () => {
  assert.ok(reg.roles.reviewer.denyActions.includes("artifact.get.raw_restricted"));
});

test("restricted_coder_is_a_role_not_an_agent", () => {
  assert.ok(reg.roles["restricted-coder"]);
  const agents = JSON.parse(
    fs.readFileSync(path.join(policiesDir, "agent-capabilities.json"), "utf-8"),
  );
  assert.ok(!agents.agents["restricted-coder"], "restricted-coder must be a role, not an agent");
});
