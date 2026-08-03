import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ClaudeAdapter } from "../../gateway/src/adapters/claude_adapter.js";
import { CwdViolation } from "../../gateway/src/adapters/base_adapter.js";
import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";

function setup() {
  resetAudit();
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "claude-root-")));
  const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-audit-"));
  configureAudit({ auditLog: path.join(auditDir, "audit.jsonl") });
  return { root };
}

function fakeRegistries({ denyActions = [] } = {}) {
  return {
    getAgent: () => ({
      reasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
      allowedClassifications: ["unrestricted", "internal"],
      allowedRoles: ["coder"],
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
  return new ClaudeAdapter({
    config: { dryRun: true, repoRoots: [root], tmuxPrefix: "ag-", ...overrides },
    registries: fakeRegistries(overrides),
  });
}

function fakeClaudeBin(dir, argvFile) {
  const bin = path.join(dir, "fake-claude.js");
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
    traceId: "tr-claude-dry",
    role: "coder",
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.dryRun, true);
  assert.match(result.stdout, /^\[dry-run claude\]/);
  assert.match(result.stdout, /prompt=write tests/);
  assert.match(result.stdout, new RegExp(`cwd=${root}`));
});

test("dry run delegate reports the resolved model and effort when provided", async () => {
  const { root } = setup();

  const result = await adapter(root).delegate({
    cwd: root,
    prompt: "write tests",
    traceId: "tr-claude-dry-model",
    role: "coder",
    model: "claude-fable-5",
    reasoningEffort: "max",
  });

  assert.equal(result.model, "claude-fable-5");
  assert.equal(result.reasoningEffort, "max");
  assert.match(result.stdout, /^\[dry-run claude model=claude-fable-5 effort=max\]/);
});

test("delegate real passes model and effort flags to claude cli", async () => {
  const { root } = setup();
  const argvFile = path.join(root, "argv.json");
  const subject = adapter(root, {
    dryRun: false,
    claudeBin: fakeClaudeBin(root, argvFile),
    adapterTimeoutMs: 1000,
  });

  const result = await subject.delegate({
    cwd: root,
    prompt: "review",
    traceId: "tr-claude-real-model",
    role: "coder",
    model: "claude-fable-5",
    reasoningEffort: "max",
  });
  const argv = JSON.parse(fs.readFileSync(argvFile, "utf-8"));

  assert.equal(result.exitCode, 0);
  assert.deepEqual(argv, [
    "--print",
    "--output-format",
    "json",
    "--permission-mode",
    "dontAsk",
    "--no-session-persistence",
    "--model",
    "claude-fable-5",
    "--effort",
    "max",
    "review",
  ]);
});

test("delegate real omits model and effort flags when neither is resolved", async () => {
  const { root } = setup();
  const argvFile = path.join(root, "argv.json");
  const subject = adapter(root, {
    dryRun: false,
    claudeBin: fakeClaudeBin(root, argvFile),
    adapterTimeoutMs: 1000,
  });

  await subject.delegate({
    cwd: root,
    prompt: "review",
    traceId: "tr-claude-real-no-model",
    role: "coder",
  });
  const argv = JSON.parse(fs.readFileSync(argvFile, "utf-8"));

  assert.equal(argv.includes("--model"), false);
  assert.equal(argv.includes("--effort"), false);
  assert.equal(argv.at(-1), "review");
});

test("delegate audits session lifecycle", async () => {
  const { root } = setup();

  await adapter(root).delegate({
    cwd: root,
    prompt: "audit me",
    traceId: "tr-claude-audit",
    role: "coder",
  });
  const events = await query({ traceId: "tr-claude-audit" });

  assert.deepEqual(
    events.map((event) => event.type),
    ["SESSION_STARTED", "SESSION_CLOSED"],
  );
  assert.equal(events[0].agent, "claude-code");
  assert.equal(events[0].role, "coder");
  assert.equal(events[0].mode, "headless");
  assert.equal(events[1].exitCode, 0);
});

test("policy deny prevents delegate session start and audits error", async () => {
  const { root } = setup();

  await assert.rejects(
    () =>
      adapter(root, { denyActions: ["agent.delegate"] }).delegate({
        cwd: root,
        prompt: "x",
        traceId: "tr-claude-deny",
        role: "coder",
      }),
    /policy denied/,
  );
  const events = await query({ traceId: "tr-claude-deny" });

  assert.equal(events.length, 1);
  assert.equal(events[0].type, "ERROR");
  assert.equal(events[0].where, "delegate");
  assert.equal(events[0].policy.decision, "deny");
});

test("cwd guard runs even in dry run", async () => {
  const { root } = setup();
  const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "claude-outside-")));

  await assert.rejects(
    () => adapter(root).delegate({ cwd: outside, prompt: "x", traceId: "tr-claude-cwd", role: "coder" }),
    CwdViolation,
  );
});

test("dry run supervised cycle returns session info and audits input lifecycle", async () => {
  const { root } = setup();
  const subject = adapter(root);

  const spawned = await subject.spawn({ cwd: root, traceId: "tr-claude-supervised", role: "coder" });
  const asked = await subject.ask({
    tmuxTarget: spawned.tmuxTarget,
    prompt: "a".repeat(250),
    traceId: "tr-claude-supervised",
    role: "coder",
  });
  const viewed = await subject.view({ tmuxTarget: spawned.tmuxTarget });
  const killed = await subject.kill({
    tmuxTarget: spawned.tmuxTarget,
    traceId: "tr-claude-supervised",
    role: "coder",
  });
  const events = await query({ traceId: "tr-claude-supervised" });

  assert.equal(spawned.dryRun, true);
  assert.equal(spawned.sessionId, "ag-tr-claude-supervised-claude-code-coder");
  assert.equal(spawned.attachCommand, "tmux attach -t ag-tr-claude-supervised-claude-code-coder");
  assert.equal(asked.dryRun, true);
  assert.match(asked.snapshot, /^\[dry-run claude ask\]/);
  assert.deepEqual(viewed, { snapshot: "[dry-run claude view]", dryRun: true });
  assert.deepEqual(killed, { closed: true, dryRun: true });
  assert.deepEqual(
    events.map((event) => event.type),
    ["SESSION_STARTED", "SESSION_INPUT", "SESSION_CLOSED"],
  );
  assert.equal(events[1].prompt.length, 200);
});

test("dry run spawn reports launch command with model and effort", async () => {
  const { root } = setup();

  const spawned = await adapter(root).spawn({
    cwd: root,
    traceId: "tr-claude-spawn-model",
    role: "coder",
    model: "claude-fable-5",
    reasoningEffort: "max",
  });

  assert.equal(spawned.launchCommand, "claude --model claude-fable-5 --effort max");
});

test("spawn cwd guard runs in dry run", async () => {
  const { root } = setup();
  const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "claude-supervised-outside-")));

  await assert.rejects(
    () => adapter(root).spawn({ cwd: outside, traceId: "tr-claude-spawn-cwd", role: "coder" }),
    CwdViolation,
  );
});
