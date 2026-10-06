import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CodexAdapter } from "../../gateway/src/adapters/codex_adapter.js";
import { CwdViolation } from "../../gateway/src/adapters/base_adapter.js";
import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";

function setup() {
  resetAudit();
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "codex-supervised-root-")));
  const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-supervised-audit-"));
  configureAudit({ auditLog: path.join(auditDir, "audit.jsonl") });
  return { root };
}

function fakeRegistries({
  enabled = true,
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
      allowActions: ["agent.spawn", "agent.ask"],
      denyActions,
    }),
    getProtectedBranches: () => [],
  };
}

function adapter(root, overrides = {}) {
  return new CodexAdapter({
    config: {
      dryRun: true,
      repoRoots: [root],
      tmuxPrefix: "ag-",
      codexBin: "codex",
      codexSandbox: "workspace-write",
      ...overrides,
    },
    registries: fakeRegistries(overrides),
  });
}

test("spawn dry run returns attach command and audits start", async () => {
  const { root } = setup();

  const result = await adapter(root).spawn({
    cwd: root,
    traceId: "tr-codex-supervised",
    role: "coder",
  });
  const events = await query({ traceId: "tr-codex-supervised" });

  assert.equal(result.dryRun, true);
  assert.equal(result.sessionId, "ag-tr-codex-supervised-codex-coder");
  assert.equal(result.tmuxTarget, result.sessionId);
  assert.equal(result.attachCommand, "tmux attach -t ag-tr-codex-supervised-codex-coder");
  assert.deepEqual(
    events.map((event) => event.type),
    ["SESSION_STARTED"],
  );
  assert.equal(events[0].mode, "supervised");
});

test("spawn launch line includes model effort service tier sandbox and cwd", async () => {
  const { root } = setup();

  const result = await adapter(root).spawn({
    cwd: root,
    traceId: "tr-codex-launch",
    role: "coder",
    model: "gpt-5.6-sol",
    reasoningEffort: "max",
    serviceTier: "priority",
  });

  assert.equal(
    result.launchCommand,
    `codex -m gpt-5.6-sol -c model_reasoning_effort="max" -c service_tier="priority" -s workspace-write -C ${root}`,
  );
});

test("spawn without an explicit tier preserves the public priority default", async () => {
  const { root } = setup();

  const result = await adapter(root).spawn({
    cwd: root,
    traceId: "tr-codex-launch-default",
    role: "coder",
  });

  assert.equal(
    result.launchCommand,
    `codex -m gpt-5.6-sol -c model_reasoning_effort="max" -c service_tier="priority" -s workspace-write -C ${root}`,
  );
});

test("disabled codex spawn is denied", async () => {
  const { root } = setup();

  await assert.rejects(
    () => adapter(root, { enabled: false }).spawn({ cwd: root, traceId: "tr-codex-disabled-spawn", role: "coder" }),
    (err) => err.code === "ADAPTER_DISABLED",
  );
});

test("restricted repo spawn is allowed for codex restricted-coder", async () => {
  const { root } = setup();

  const result = await adapter(root, { repoClassification: "restricted" }).spawn({
    cwd: root,
    repo: "restricted-repo",
    traceId: "tr-codex-restricted-spawn",
    role: "restricted-coder",
  });

  assert.equal(result.dryRun, true);
  assert.equal((await query({ traceId: "tr-codex-restricted-spawn", type: "SESSION_STARTED" })).length, 1);
});

test("spawn cwd guard runs before tmux", async () => {
  const { root } = setup();
  const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "codex-supervised-outside-")));

  await assert.rejects(
    () => adapter(root, { dryRun: false }).spawn({ cwd: outside, traceId: "tr-codex-spawn-cwd", role: "coder" }),
    CwdViolation,
  );
});

test("spawn rejects cwd that exposes repo excluded paths", async () => {
  const { root } = setup();
  fs.mkdirSync(path.join(root, "policies"), { recursive: true });

  await assert.rejects(
    () =>
      adapter(root, { excludedPaths: ["policies/"] }).spawn({
        cwd: root,
        repo: "agents-orchestrator",
        traceId: "tr-codex-spawn-excluded-cwd",
        role: "coder",
      }),
    (err) => err.code === "EXCLUDED_PATH_EXPOSED",
  );
  assert.equal((await query({ traceId: "tr-codex-spawn-excluded-cwd", type: "SESSION_STARTED" })).length, 0);
});

test("spawn permits scoped cwd outside repo excluded paths", async () => {
  const { root } = setup();
  const scoped = path.join(root, "gateway");
  fs.mkdirSync(path.join(root, "policies"), { recursive: true });
  fs.mkdirSync(scoped, { recursive: true });

  const result = await adapter(root, { excludedPaths: ["policies/"] }).spawn({
    cwd: scoped,
    repo: "agents-orchestrator",
    traceId: "tr-codex-spawn-scoped-cwd",
    role: "coder",
  });

  assert.equal(result.dryRun, true);
  assert.match(result.launchCommand, new RegExp(`-C ${scoped}$`));
});

test("ask view kill dry run flow audits input and close", async () => {
  const { root } = setup();
  const subject = adapter(root);
  const tmuxTarget = "ag-tr-codex-flow-codex-coder";

  const asked = await subject.ask({
    tmuxTarget,
    prompt: "a".repeat(250),
    traceId: "tr-codex-flow",
    role: "coder",
  });
  const viewed = await subject.view({ tmuxTarget });
  const killed = await subject.kill({ tmuxTarget, traceId: "tr-codex-flow", role: "coder" });
  const events = await query({ traceId: "tr-codex-flow" });

  assert.equal(asked.dryRun, true);
  assert.match(asked.snapshot, /^\[dry-run codex ask\]/);
  assert.deepEqual(viewed, { snapshot: "[dry-run codex view]", dryRun: true });
  assert.deepEqual(killed, { closed: true, dryRun: true });
  assert.deepEqual(
    events.map((event) => event.type),
    ["SESSION_INPUT", "SESSION_CLOSED"],
  );
  assert.equal(events[0].prompt.length, 200);
  assert.equal(events[1].tmuxTarget, tmuxTarget);
});
