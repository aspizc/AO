import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { evaluate, explain } from "../../gateway/src/core/policy_engine.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";

function writeJson(dir, file, value) {
  fs.writeFileSync(path.join(dir, file), `${JSON.stringify(value, null, 2)}\n`);
}

function makeRegistries(overrides = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "policy-engine-reg-"));
  const agents = {
    "test-agent": {
      allowedClassifications: ["unrestricted", "internal", "restricted"],
      allowedRoles: ["coder", "reviewer", "denied-coder"],
      requiresApprovalFor: [],
      models: ["gpt-test-default", "gpt-test-alt"],
      defaultModel: "gpt-test-default",
      reasoningEfforts: ["low", "medium"],
      defaultReasoningEffort: "medium",
      ...overrides.agent,
    },
    ...overrides.agents,
  };
  const repositories = {
    sandbox: {
      classification: "unrestricted",
      allowedAgents: ["test-agent"],
      excludedPaths: ["secrets", "etc/passwd"],
      ...overrides.repo,
    },
    ...overrides.repositories,
  };
  const roles = {
    orchestrator: {
      allowActions: [],
      denyActions: ["code.write", "artifact.get.raw_restricted", "approval.respond"],
    },
    planner: { allowActions: [], denyActions: [] },
    coder: { allowActions: ["agent.delegate", "artifact.get.sanitized.raw_restricted"], denyActions: [] },
    "denied-coder": { allowActions: [], denyActions: ["code.write"] },
    "restricted-coder": { allowActions: [], denyActions: [] },
    reviewer: { allowActions: [], denyActions: [] },
    tester: { allowActions: [], denyActions: [] },
    documenter: { allowActions: [], denyActions: [] },
    security_reviewer: { allowActions: [], denyActions: [] },
    ...overrides.roles,
  };

  writeJson(tmp, "agent-capabilities.json", {
    version: 1,
    agents,
    protectedBranches: overrides.protectedBranches ?? ["main", "release/*"],
  });
  writeJson(tmp, "repositories.json", { version: 1, repositories });
  writeJson(tmp, "roles.json", { version: 1, roles });
  writeJson(tmp, "sanitization-rules.json", { version: 1, rules: [] });

  return loadRegistries({ policiesDir: tmp });
}

const reg = makeRegistries();

function baseContext(overrides = {}) {
  return {
    agent: "test-agent",
    role: "coder",
    repo: "sandbox",
    action: "code.read",
    ...overrides,
  };
}

function assertDecision(result, decision, ruleId) {
  assert.equal(result.decision, decision);
  assert.equal(result.ruleId, ruleId);
}

test("excluded path matches a segment in any position", () => {
  const result = explain(baseContext({ path: "a/secrets/b" }), reg);

  assertDecision(result, "deny", "classification.excluded_path");
});

test("excluded path matches exact path", () => {
  const result = explain(baseContext({ path: "secrets" }), reg);

  assertDecision(result, "deny", "classification.excluded_path");
});

test("excluded path does not match partial segment names", () => {
  const result = explain(baseContext({ path: "src/secrets-utils.js" }), reg);

  assertDecision(result, "allow", "ok");
});

test("parent traversal above root normalizes without throwing", () => {
  const result = explain(baseContext({ path: "../../etc/passwd" }), reg);

  assertDecision(result, "deny", "classification.excluded_path");
});

test("windows separators are normalized before excluded path matching", () => {
  const result = explain(baseContext({ path: "a\\secrets\\b" }), reg);

  assertDecision(result, "deny", "classification.excluded_path");
});

test("redundant current-directory and slash segments are normalized", () => {
  const result = explain(baseContext({ path: "./a//secrets/./b//" }), reg);

  assertDecision(result, "deny", "classification.excluded_path");
});

test("push to exactly protected main branch requires approval", () => {
  const result = evaluate(baseContext({ action: "git.push", targetBranch: "main" }), reg);

  assertDecision(result, "require_approval", "approval.git_push_protected");
});

test("wildcard protected branch pattern matches release child branch", () => {
  const result = evaluate(baseContext({ action: "git.push", targetBranch: "release/1.2" }), reg);

  assertDecision(result, "require_approval", "approval.git_push_protected");
});

test("wildcard protected branch pattern does not match release without slash", () => {
  const result = evaluate(baseContext({ action: "git.push", targetBranch: "release" }), reg);

  assertDecision(result, "allow", "ok");
});

test("role deny action matches action prefix", () => {
  const result = evaluate(baseContext({ role: "denied-coder", action: "code.write.file" }), reg);

  assertDecision(result, "deny", "role.deny_action");
});

test("unknown action is denied by the closed action layer", () => {
  const result = explain(baseContext({ action: "foo.bar" }), reg);

  assertDecision(result, "deny", "action.unknown");
  assert.deepEqual(
    result.layers.map((layer) => layer.name),
    ["action"],
  );
});

test("missing action is denied by the closed action layer", () => {
  const result = explain(baseContext({ action: undefined }), reg);

  assertDecision(result, "deny", "action.unknown");
});

test("unknown agent is denied by classification first", () => {
  const result = explain(baseContext({ agent: "missing-agent" }), reg);

  assertDecision(result, "deny", "agent.unknown");
});

test("unknown repo is denied by classification first", () => {
  const result = explain(baseContext({ repo: "missing-repo" }), reg);

  assertDecision(result, "deny", "repo.unknown");
});

test("delegation rejects a noncanonical provider before its registry model can apply", () => {
  const result = evaluate(baseContext({ action: "agent.delegate", model: "gpt-other" }), reg);

  assertDecision(result, "deny", "agent.model.allowed");
  assert.deepEqual(result.selectionRejection, {
    code: "EFFECTIVE_SELECTION_REGISTRY_DRIFT",
    field: "registry",
    provider: null,
  });
});

test("delegation does not resolve defaults from a noncanonical registry", () => {
  const result = evaluate(baseContext({ action: "agent.delegate" }), reg);

  assertDecision(result, "deny", "agent.model.allowed");
  assert.deepEqual(result.selectionRejection, {
    code: "EFFECTIVE_SELECTION_REGISTRY_DRIFT",
    field: "registry",
    provider: null,
  });
  assert.equal(result.model, undefined);
});

test("noncanonical registry effort values cannot become a selection authority", () => {
  const result = evaluate(baseContext({ action: "agent.delegate", reasoningEffort: "extreme" }), reg);

  assertDecision(result, "deny", "agent.model.allowed");
  assert.deepEqual(result.selectionRejection, {
    code: "EFFECTIVE_SELECTION_REGISTRY_DRIFT",
    field: "registry",
    provider: null,
  });
  assert.equal(result.reasoningEffort, undefined);
});

test("explain includes every layer in order when policy allows", () => {
  const result = explain(baseContext({ action: "artifact.get", artifactKind: "review_notes" }), reg);

  assertDecision(result, "allow", "ok");
  assert.deepEqual(
    result.layers.map((layer) => layer.name),
    ["action", "classification", "model", "role", "approval", "sanitization"],
  );
});

test("explain stops after classification deny without evaluating later layers", () => {
  const result = explain(baseContext({ path: "secrets/token.txt" }), reg);

  assertDecision(result, "deny", "classification.excluded_path");
  assert.deepEqual(
    result.layers.map((layer) => layer.name),
    ["action", "classification"],
  );
});
