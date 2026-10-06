import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CodexAdapter } from "../../gateway/src/adapters/codex_adapter.js";
import { CwdViolation } from "../../gateway/src/adapters/base_adapter.js";
import { createAdapterRegistry } from "../../gateway/src/adapters/index.js";
import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";

function setup() {
  resetAudit();
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "codex-root-")));
  const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-audit-"));
  configureAudit({ auditLog: path.join(auditDir, "audit.jsonl") });
  return { root };
}

function fakeRegistries({
  enabled = false,
  denyActions = [],
  repoClassification = "unrestricted",
  excludedPaths = [],
} = {}) {
  return {
    getAgent: () => ({
      enabled,
      models: ["gpt-5.6-sol", "gpt-5", "gpt-5-codex"],
      defaultModel: "gpt-5.6-sol",
      reasoningEfforts: ["low", "medium", "high", "max"],
      defaultReasoningEffort: "max",
      serviceTiers: ["default", "priority"],
      defaultServiceTier: "default",
      allowedClassifications: ["unrestricted", "internal", "restricted"],
      allowedRoles: ["planner", "coder", "restricted-coder", "reviewer", "tester"],
      requiresApprovalFor: [],
    }),
    getRepo: () => ({
      classification: repoClassification,
      allowedAgents: ["codex"],
      excludedPaths,
    }),
    getRole: () => ({
      allowActions: ["agent.delegate"],
      denyActions,
    }),
    getProtectedBranches: () => [],
  };
}

function adapter(root, overrides = {}) {
  return new CodexAdapter({
    config: { dryRun: true, repoRoots: [root], codexSandbox: "workspace-write", ...overrides },
    registries: fakeRegistries(overrides),
  });
}

function fakeCodexBin(dir, argvFile) {
  const bin = path.join(dir, "fake-codex.cjs");
  fs.writeFileSync(
    bin,
    [
      "#!/usr/bin/env node",
      "const fs = require('node:fs');",
      `fs.writeFileSync(${JSON.stringify(argvFile)}, JSON.stringify(process.argv.slice(2)));`,
      "process.stdout.write('codex ok');",
      "",
    ].join("\n"),
  );
  fs.chmodSync(bin, 0o755);
  return bin;
}

test("disabled codex returns clear error", async () => {
  const { root } = setup();
  const disabledAdapter = adapter(root);
  const expectedDisabledError = (err) =>
    err.code === "ADAPTER_DISABLED" && /codex adapter is disabled/i.test(err.message);

  await assert.rejects(
    () => disabledAdapter.delegate({ cwd: root, prompt: "x", traceId: "tr-codex-disabled", role: "coder" }),
    expectedDisabledError,
  );
  await assert.rejects(
    () => disabledAdapter.spawn({ traceId: "tr-codex-disabled", role: "coder" }),
    expectedDisabledError,
  );
  await assert.rejects(
    () => disabledAdapter.ask({ traceId: "tr-codex-disabled", role: "coder" }),
    expectedDisabledError,
  );
  await assert.rejects(() => disabledAdapter.view(), expectedDisabledError);
  await assert.rejects(
    () => disabledAdapter.kill({ traceId: "tr-codex-disabled", role: "coder" }),
    expectedDisabledError,
  );
});

test("codex can be registered with a custom disabled registry", async () => {
  const { root } = setup();
  const registries = fakeRegistries();
  const adapters = createAdapterRegistry({ config: { dryRun: true, repoRoots: [root] }, registries });

  adapters.register("codex", new CodexAdapter({ config: adapters.config, registries }));

  assert.equal(adapters.has("codex"), true);
  await assert.rejects(
    () => adapters.get("codex").delegate({ cwd: root, prompt: "x", traceId: "tr-codex-registered", role: "coder" }),
    (err) => err.code === "ADAPTER_DISABLED" && /codex adapter is disabled/i.test(err.message),
  );
});

test("enabled dry run delegate works and audits lifecycle", async () => {
  const { root } = setup();

  const result = await adapter(root, { enabled: true }).delegate({
    cwd: root,
    prompt: "write tests",
    traceId: "tr-codex-dry",
    role: "coder",
  });
  const events = await query({ traceId: "tr-codex-dry" });

  assert.equal(result.exitCode, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(result.dryRun, true);
  assert.equal(result.model, "gpt-5.6-sol");
  assert.equal(result.reasoningEffort, "max");
  assert.equal(result.serviceTier, "priority");
  assert.match(
    result.stdout,
    /^\[dry-run codex model=gpt-5\.6-sol effort=max serviceTier=priority sandbox=workspace-write\]/,
  );
  assert.match(result.stdout, /prompt=write tests/);
  assert.deepEqual(
    events.map((event) => event.type),
    ["SESSION_STARTED", "SESSION_CLOSED"],
  );
});

test("enabled dry run delegate reports model effort sandbox and cwd", async () => {
  const { root } = setup();

  const result = await adapter(root, { enabled: true }).delegate({
    cwd: root,
    prompt: "write tests",
    traceId: "tr-codex-dry-model",
    role: "coder",
    model: "gpt-5.6-sol",
    reasoningEffort: "max",
    serviceTier: "priority",
  });

  assert.equal(result.model, "gpt-5.6-sol");
  assert.equal(result.reasoningEffort, "max");
  assert.equal(result.serviceTier, "priority");
  assert.equal(result.sandbox, "workspace-write");
  assert.match(
    result.stdout,
    /^\[dry-run codex model=gpt-5\.6-sol effort=max serviceTier=priority sandbox=workspace-write\]/,
  );
  assert.match(result.stdout, new RegExp(`cwd=${root}`));
});

test("an unrequested tier preserves the public priority default", async () => {
  const { root } = setup();
  const argvFile = path.join(root, "argv.json");
  const subject = adapter(root, {
    enabled: true,
    dryRun: false,
    codexBin: fakeCodexBin(root, argvFile),
    codexSandbox: "workspace-write",
    adapterTimeoutMs: 1000,
  });

  const result = await subject.delegate({
    cwd: root,
    prompt: "implement",
    traceId: "tr-codex-default-tier",
    role: "coder",
  });
  const argv = JSON.parse(fs.readFileSync(argvFile, "utf-8"));

  assert.equal(result.serviceTier, "priority");
  assert.ok(argv.includes('service_tier="priority"'));
  assert.ok(!argv.includes('service_tier="default"'));
});

test("enabled real delegate invokes fake codex exec with model effort sandbox and cwd", async () => {
  const { root } = setup();
  const argvFile = path.join(root, "argv.json");
  const subject = adapter(root, {
    enabled: true,
    dryRun: false,
    codexBin: fakeCodexBin(root, argvFile),
    codexSandbox: "workspace-write",
    adapterTimeoutMs: 1000,
  });

  const result = await subject.delegate({
    cwd: root,
    prompt: "implement",
    traceId: "tr-codex-real",
    role: "coder",
    model: "gpt-5.6-sol",
    reasoningEffort: "max",
    serviceTier: "priority",
  });
  const argv = JSON.parse(fs.readFileSync(argvFile, "utf-8"));

  assert.equal(result.dryRun, false);
  assert.equal(result.model, "gpt-5.6-sol");
  assert.equal(result.reasoningEffort, "max");
  assert.equal(result.serviceTier, "priority");
  assert.deepEqual(argv, [
    "exec",
    "-m",
    "gpt-5.6-sol",
    "-c",
    'model_reasoning_effort="max"',
    "-c",
    'service_tier="priority"',
    "-s",
    "workspace-write",
    "-C",
    root,
    "implement",
  ]);
});

test("enabled delegate still applies policy", async () => {
  const { root } = setup();

  await assert.rejects(
    () =>
      adapter(root, { enabled: true, denyActions: ["agent.delegate"] }).delegate({
        cwd: root,
        prompt: "x",
        traceId: "tr-codex-policy",
        role: "coder",
      }),
    /request denied by policy/,
  );
});

test("enabled dry run still applies cwd guard", async () => {
  const { root } = setup();
  const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "codex-outside-")));

  await assert.rejects(
    () =>
      adapter(root, { enabled: true }).delegate({
        cwd: outside,
        prompt: "x",
        traceId: "tr-codex-cwd",
        role: "coder",
      }),
    CwdViolation,
  );
});

test("delegate rejects cwd that exposes repo excluded paths", async () => {
  const { root } = setup();
  fs.mkdirSync(path.join(root, "policies"), { recursive: true });

  await assert.rejects(
    () =>
      adapter(root, { enabled: true, excludedPaths: ["policies/"] }).delegate({
        cwd: root,
        repo: "agents-orchestrator",
        prompt: "x",
        traceId: "tr-codex-excluded-cwd",
        role: "coder",
      }),
    (err) => err.code === "EXCLUDED_PATH_EXPOSED",
  );
});

test("delegate permits scoped cwd outside repo excluded paths", async () => {
  const { root } = setup();
  const scoped = path.join(root, "gateway");
  fs.mkdirSync(path.join(root, "policies"), { recursive: true });
  fs.mkdirSync(scoped, { recursive: true });

  const result = await adapter(root, { enabled: true, excludedPaths: ["policies/"] }).delegate({
    cwd: scoped,
    repo: "agents-orchestrator",
    prompt: "x",
    traceId: "tr-codex-scoped-cwd",
    role: "coder",
  });

  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`cwd=${scoped}`));
});

test("real delegate rejects cwd outside allowlist before process", async () => {
  const { root } = setup();
  const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "codex-outside-")));
  const argvFile = path.join(root, "argv.json");

  await assert.rejects(
    () =>
      adapter(root, {
        enabled: true,
        dryRun: false,
        codexBin: fakeCodexBin(root, argvFile),
      }).delegate({
        cwd: outside,
        prompt: "x",
        traceId: "tr-codex-real-cwd",
        role: "coder",
        model: "gpt-5",
        reasoningEffort: "medium",
      }),
    CwdViolation,
  );
  assert.equal(fs.existsSync(argvFile), false);
});

test("codex restricted repo is allowed by policy", async () => {
  const { root } = setup();

  const result = await adapter(root, {
    enabled: true,
    repoClassification: "restricted",
  }).delegate({
    cwd: root,
    repo: "restricted-repo",
    prompt: "x",
    traceId: "tr-codex-restricted",
    role: "restricted-coder",
    model: "gpt-5",
    reasoningEffort: "medium",
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.dryRun, true);
  assert.match(result.stdout, /role=restricted-coder|prompt=x|cwd=/);
});

test("disallowed model is denied before process", async () => {
  const { root } = setup();
  const argvFile = path.join(root, "argv.json");

  await assert.rejects(
    () =>
      adapter(root, {
        enabled: true,
        dryRun: false,
        codexBin: fakeCodexBin(root, argvFile),
      }).delegate({
        cwd: root,
        prompt: "x",
        traceId: "tr-codex-model-denied",
        role: "coder",
        model: "claude-opus-4-8",
        reasoningEffort: "medium",
      }),
    (error) => {
      assert.equal(error.code, "POLICY_DENIED");
      assert.equal(error.message, "request denied by policy");
      assert.deepEqual(error.decision.selectionRejection, {
        code: "EFFECTIVE_SELECTION_MODEL_UNSUPPORTED",
        field: "model",
        provider: "codex",
      });
      return true;
    },
  );
  assert.equal(fs.existsSync(argvFile), false);
});
