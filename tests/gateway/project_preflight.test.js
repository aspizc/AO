import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { resolveEffectiveAgentSelectionForConsumer, safeAuditSelectionProjection } from "../../gateway/src/core/orchestrator_profile.js";

const gatewayRoot = path.resolve("gateway");
const script = path.join(gatewayRoot, "scripts/project-preflight.mjs");
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "project-preflight-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const cwd = path.join(root, "sample-apps");
  fs.mkdirSync(cwd);
  const policiesDir = path.join(root, "registries");
  fs.mkdirSync(policiesDir);
  for (const file of ["roles.json", "agent-capabilities.json", "repositories.json"]) {
    fs.copyFileSync(path.resolve("policies", file), path.join(policiesDir, file));
  }
  return { gatewayRoot, policiesDir, allowedRoots: [root], repositoryId: "sample-apps",
    projectRoot: cwd, taskCwds: [cwd], writePaths: [path.join(cwd, "output.txt")],
    roles: { orchestrator: { agent: "codex", role: "orchestrator" },
      coder: { agent: "codex", role: "coder", model: "gpt-6.1" }, reviewer: { agent: "codex", role: "reviewer" } } };
}
function run(input, overrides = {}) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, [script], { input: JSON.stringify(input), encoding: "utf8", env, ...overrides });
  assert.equal(result.stderr, "");
  return { exit: result.status, dto: JSON.parse(result.stdout) };
}

test("test_preflight_uses_canonical_selection_and_rejects_registry_drift", (t) => {
  const input = fixture(t);
  const result = run(input);
  assert.ok([0, 3].includes(result.exit));
  assert.deepEqual(result.dto.selections[0], safeAuditSelectionProjection(resolveEffectiveAgentSelectionForConsumer(input.roles.coder, "spawn")));
  const file = path.join(input.policiesDir, "agent-capabilities.json");
  const registry = JSON.parse(fs.readFileSync(file));
  registry.agents.codex.defaultModel = "gpt-5.5";
  fs.writeFileSync(file, JSON.stringify(registry));
  const denied = run(input);
  assert.equal(denied.exit, 2);
  assert.equal(denied.dto.error.code, "PROFILE_POLICY_DENIED");
  assert.deepEqual(denied.dto.selections, []);
});

test("preflight rejects unknown provider effort tier and repository/cwd mismatch without echo", (t) => {
  const input = fixture(t);
  for (const field of ["agent", "reasoningEffort", "serviceTier", "model"]) {
    const bad = structuredClone(input);
    bad.roles.coder[field] = "secret-token-canary";
    const result = run(bad);
    assert.equal(result.exit, 2);
    assert.equal(result.dto.error.code, "PROFILE_POLICY_DENIED");
    assert.equal(JSON.stringify(result.dto).includes("canary"), false);
    assert.deepEqual(result.dto.selections, []);
  }
  input.repositoryId = "developer-tools";
  assert.equal(run(input).dto.error.code, "PROFILE_POLICY_DENIED");
});

test("bounded stdin and missing SDK fail safely without config state", (t) => {
  const input = fixture(t);
  const before = fs.readdirSync(input.gatewayRoot);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const oversized = spawnSync(process.execPath, [script], { input: " ".repeat(1048577), encoding: "utf8", env });
  assert.equal(oversized.status, 2);
  assert.equal(JSON.parse(oversized.stdout).error.code, "PROFILE_INVALID");
  input.gatewayRoot = input.projectRoot;
  const missing = run(input);
  assert.equal(missing.exit, 3);
  assert.equal(missing.dto.error.code, "PROFILE_RUNTIME_UNAVAILABLE");
  assert.deepEqual(fs.readdirSync(gatewayRoot), before);
});

test("presence probe respects the adapter executable binding without invoking it", (t) => {
  const input = fixture(t);
  const binary = path.join(input.projectRoot, "selected-provider");
  const marker = path.join(input.projectRoot, "must-not-launch");
  fs.writeFileSync(binary, `#!/bin/sh\ntouch '${marker}'\n`, { mode: 0o700 });
  const env = { ...process.env, PATH: input.projectRoot, AGENTS_CODEX_BIN: binary };
  delete env.NODE_TEST_CONTEXT;
  assert.equal(run(input, { env }).exit, 0);
  assert.equal(fs.existsSync(marker), false);
  env.AGENTS_CODEX_BIN = path.join(input.projectRoot, "absent-secret-canary");
  const missing = run(input, { env });
  assert.equal(missing.exit, 3);
  assert.equal(missing.dto.error.code, "PROFILE_RUNTIME_UNAVAILABLE");
  assert.equal(JSON.stringify(missing.dto).includes("canary"), false);
  assert.equal(fs.existsSync(marker), false);
});
