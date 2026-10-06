import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AntigravityAdapter } from "../../gateway/src/adapters/antigravity_adapter.js";
import { CwdViolation } from "../../gateway/src/adapters/base_adapter.js";
import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";

beforeEach((t) => {
  const previous = process.env.AGENTS_ANTIGRAVITY_AUTO;
  delete process.env.AGENTS_ANTIGRAVITY_AUTO;
  t.after(() => {
    if (previous === undefined) delete process.env.AGENTS_ANTIGRAVITY_AUTO;
    else process.env.AGENTS_ANTIGRAVITY_AUTO = previous;
  });
});

function setup() {
  resetAudit();
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-root-")));
  const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-audit-"));
  configureAudit({ auditLog: path.join(auditDir, "audit.jsonl") });
  return { root };
}

function fakeRegistries({ denyActions = [] } = {}) {
  return {
    getAgent: () => ({
      models: [
        "gemini-3.7-flash-high",
        "gemini-3.7-flash-medium",
        "gemini-3.7-flash-low",
        "gemini-3.6-flash-high",
        "gemini-3.6-flash-medium",
        "gemini-3.6-flash-low",
        "gemini-3.5-flash-high",
        "gemini-3.5-flash-medium",
        "gemini-3.5-flash-low",
        "gemini-3.1-pro-high",
        "gemini-3.1-pro-low",
      ],
      modelAliases: {
        "gemini-3.7-flash": "gemini-3.7-flash-high",
        "gemini-3.6-flash": "gemini-3.6-flash-high",
        "gemini-3.5-flash": "gemini-3.5-flash-high",
        "gemini-3.1-pro": "gemini-3.1-pro-high",
      },
      defaultModel: "gemini-3.7-flash-high",
      reasoningEfforts: ["low", "medium", "high"],
      defaultReasoningEffort: "high",
      allowedClassifications: ["unrestricted", "internal", "restricted"],
      allowedRoles: ["coder", "orchestrator", "reviewer", "planner"],
      requiresApprovalFor: [],
    }),
    getRepo: () => null,
    getRole: () => ({
      allowActions: ["agent.delegate", "agent.spawn", "agent.ask"],
      denyActions,
    }),
    getProtectedBranches: () => [],
  };
}

function adapter(root, overrides = {}) {
  return new AntigravityAdapter({
    config: { dryRun: true, repoRoots: [root], tmuxPrefix: "ag-", ...overrides },
    registries: fakeRegistries(overrides),
  });
}

function fakeAgyBin(dir, argvFile) {
  const bin = path.join(dir, "fake-agy.js");
  fs.writeFileSync(
    bin,
    [
      "#!/usr/bin/env node",
      "import fs from 'node:fs';",
      `fs.writeFileSync(${JSON.stringify(argvFile)}, JSON.stringify(process.argv.slice(2)));`,
      "process.stdout.write('{\"ok\":true}');",
      "",
    ].join("\n"),
  );
  fs.chmodSync(bin, 0o755);
  return bin;
}

test("dry run delegate returns deterministic mock output", async () => {
  const { root } = setup();

  const result = await adapter(root).delegate({
    cwd: root,
    prompt: "write tests",
    traceId: "tr-antigravity-dry",
    role: "coder",
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.dryRun, true);
  assert.match(result.stdout, /^\[dry-run antigravity/);
  assert.match(result.stdout, /prompt=write tests/);
  assert.match(result.stdout, new RegExp(`cwd=${root}`));
});

test("dry run delegate reports the resolved model and effort when provided", async () => {
  const { root } = setup();

  const result = await adapter(root).delegate({
    cwd: root,
    prompt: "write tests",
    traceId: "tr-antigravity-dry-model",
    role: "coder",
    model: "gemini-3.7-flash-high",
    reasoningEffort: "high",
  });

  assert.equal(result.model, "gemini-3.7-flash-high");
  assert.equal(result.reasoningEffort, "high");
  assert.match(result.stdout, /^\[dry-run antigravity model=gemini-3.7-flash-high effort=high\]/);
});

test("delegate real passes model and effort flags to agy cli", async () => {
  const { root } = setup();
  const argvFile = path.join(root, "argv.json");
  const subject = adapter(root, {
    dryRun: false,
    antigravityBin: fakeAgyBin(root, argvFile),
    adapterTimeoutMs: 1000,
  });

  const result = await subject.delegate({
    cwd: root,
    prompt: "ship feature",
    traceId: "tr-antigravity-real",
    role: "coder",
    model: "gemini-3.7-flash-high",
    reasoningEffort: "high",
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.dryRun, false);
  assert.equal(result.model, "gemini-3.7-flash-high");
  assert.equal(result.reasoningEffort, "high");

  const argv = JSON.parse(fs.readFileSync(argvFile, "utf-8"));
  assert.deepEqual(argv, [
    "--print",
    "--output-format",
    "json",
    "--model",
    "gemini-3.7-flash-high",
    "--effort",
    "high",
    "ship feature",
  ]);
});

test("delegate enforces policy denial before execution", async () => {
  const { root } = setup();
  const subject = adapter(root, { denyActions: ["agent.delegate"] });

  await assert.rejects(
    () =>
      subject.delegate({
        cwd: root,
        prompt: "run denied",
        traceId: "tr-antigravity-denied",
        role: "coder",
      }),
    (err) => err.code === "POLICY_DENIED",
  );
});

test("delegate rejects unsafe cwd outside repo roots", async () => {
  const { root } = setup();
  const outside = fs.realpathSync(os.tmpdir());

  await assert.rejects(
    () =>
      adapter(root).delegate({
        cwd: outside,
        prompt: "outside",
        traceId: "tr-antigravity-outside",
        role: "coder",
      }),
    CwdViolation,
  );
});

test("spawn dry run creates deterministic session naming and launch command", async () => {
  const { root } = setup();

  const result = await adapter(root).spawn({
    cwd: root,
    traceId: "tr-antigravity-spawn",
    role: "coder",
    model: "gemini-3.7-flash-high",
    reasoningEffort: "high",
  });

  assert.equal(result.sessionId, "ag-tr-antigravity-spawn-antigravity-coder");
  assert.equal(result.tmuxTarget, "ag-tr-antigravity-spawn-antigravity-coder");
  assert.equal(result.attachCommand, "tmux attach -t ag-tr-antigravity-spawn-antigravity-coder");
  assert.equal(
    result.launchCommand,
    "agy --model gemini-3.7-flash-high --effort high",
  );
  assert.equal(result.dryRun, true);
});

test("ask view kill dry run return deterministic responses and audit events", async () => {
  const { root } = setup();
  const subject = adapter(root);
  const target = "ag-tr-antigravity-session-antigravity-coder";

  const spawned = await subject.spawn({
    cwd: root,
    traceId: "tr-antigravity-session",
    role: "coder",
  });
  const askResult = await subject.ask({
    tmuxTarget: spawned.tmuxTarget,
    prompt: "check status",
    traceId: "tr-antigravity-session",
    role: "coder",
  });
  assert.match(askResult.snapshot, /\[dry-run antigravity ask\]/);
  assert.match(askResult.snapshot, /check status/);

  const viewResult = await subject.view({ tmuxTarget: spawned.tmuxTarget });
  assert.equal(viewResult.snapshot, "[dry-run antigravity view]");

  const killResult = await subject.kill({
    tmuxTarget: spawned.tmuxTarget,
    traceId: "tr-antigravity-session",
    role: "coder",
  });
  assert.equal(killResult.closed, true);

  const events = await query({ traceId: "tr-antigravity-session" });
  assert.deepEqual(
    events.map((e) => e.type),
    ["SESSION_STARTED", "SESSION_INPUT", "SESSION_CLOSED"],
  );
});

for (const optIn of ["config", "environment"]) {
  test(`permission bypass requires explicit ${optIn} opt-in for delegate and spawn`, async () => {
    const { root } = setup();
    const argvFile = path.join(root, "argv.json");
    if (optIn === "environment") process.env.AGENTS_ANTIGRAVITY_AUTO = "1";
    const config = optIn === "config" ? { antigravityAuto: true } : {};
    const subject = adapter(root, {
      ...config,
      dryRun: false,
      antigravityBin: fakeAgyBin(root, argvFile),
    });
    const result = await subject.delegate({
      cwd: root, prompt: "write tests", traceId: "tr-auto", role: "coder",
    });
    assert.equal(result.exitCode, 0);
    assert.ok(JSON.parse(fs.readFileSync(argvFile)).includes("--dangerously-skip-permissions"));
    const spawned = await adapter(root, config).spawn({
      cwd: root, traceId: "tr-auto-spawn", role: "coder",
    });
    assert.match(spawned.launchCommand, /--dangerously-skip-permissions/);
  });
}

test("non-opt-in environment values preserve permission prompts", async () => {
  const { root } = setup();
  for (const value of ["0", "true", "false", ""]) {
    process.env.AGENTS_ANTIGRAVITY_AUTO = value;
    const argvFile = path.join(root, "argv.json");
    const result = await adapter(root, {
      dryRun: false,
      antigravityBin: fakeAgyBin(root, argvFile),
    }).delegate({ cwd: root, prompt: "write tests", traceId: "tr-no-auto", role: "coder" });
    assert.equal(result.exitCode, 0);
    assert.ok(!JSON.parse(fs.readFileSync(argvFile)).includes("--dangerously-skip-permissions"));
    const spawned = await adapter(root).spawn({ cwd: root, traceId: "tr-no-auto-spawn", role: "coder" });
    assert.doesNotMatch(spawned.launchCommand, /--dangerously-skip-permissions/);
  }
});
