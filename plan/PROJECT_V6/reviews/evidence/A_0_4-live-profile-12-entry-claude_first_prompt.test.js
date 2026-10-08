import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BaseAdapter, submitPrompt } from "../../gateway/src/adapters/base_adapter.js";
import { ClaudeAdapter } from "../../gateway/src/adapters/claude_adapter.js";
import { configureAudit } from "../../gateway/src/core/audit.js";

const [profile] = JSON.parse(fs.readFileSync(new URL("./fixtures/a04_live_profiles_trial9.json", import.meta.url), "utf8"));
const clone = (value) => structuredClone(value);
const uncertain = (error) => error.code === "AGENT_PROMPT_NOT_SUBMITTED" && error.reason === "acceptance_uncertain";

function harness(records = [profile.ready, profile.postPaste, profile.guard, profile.after]) {
  let index = 0;
  const buffers = new Map();
  const inputs = [];
  const run = (args, options = {}) => {
    const observation = records[Math.min(index, records.length - 1)];
    const { pane, submitState: state } = observation;
    if (args[0] === "display-message") {
      if (args.at(-1) === "#{version}") return { status: 0, stderr: "", stdout: Buffer.from("3.6a-agents.3\n") };
      return { status: 0, stdout: args.at(-1).startsWith("#{pid}|")
        ? `${state.serverPid}|${state.target}|${state.panePid}|${pane.width}|${pane.height}|${pane.cursorX}|${pane.cursor}\n`
        : `${pane.target}|${pane.mode}|${pane.inputOff}|${pane.synchronized}|${pane.cursor}|${pane.height}|${pane.width}|${pane.cursorX}\n` };
    }
    if (args[0] === "list-commands") return { status: 0, stderr: "", stdout: Buffer.from("agents-submit-v1 -b buffer-name -t target-pane\npaste-buffer [-dGpr]\n") };
    if (args[0] === "capture-pane") { buffers.set(args[args.indexOf("-b") + 1], Buffer.from(observation.snapshot)); index++; }
    if (args[0] === "save-buffer") return { status: 0, stdout: buffers.get(args[2]) };
    if (args[0] === "load-buffer") buffers.set(args[2], options.input);
    if (args[0] === "paste-buffer") inputs.push(`\x1b[200~${buffers.get(args[args.indexOf("-b") + 1])}\x1b[201~`);
    if (args[0] === "agents-submit-v1") { inputs.push("\r"); buffers.delete(args[2]); }
    if (args[0] === "delete-buffer" && !buffers.delete(args[2])) return { status: 1, stderr: `unknown buffer: ${args[2]}\n` };
    return { status: 0, stdout: "", stderr: "" };
  };
  const options = { target: "%1", tmuxTarget: "%1", prompt: profile.prompt, provider: "claude-code", run, wait: async () => {} };
  const ask = (firstPromptProcess = profile.ready.submitState) => submitPrompt({ ...options, firstPromptProcess });
  return { run, options, ask, inputs, buffers };
}

test("trial10 newly spawned Claude first prompt accepts the exact completed boundary frames with one Enter", async () => {
  const fx = harness();
  assert.equal((await fx.ask()).snapshot, profile.after.snapshot);
  assert.deepEqual(fx.inputs, [`\x1b[200~${profile.prompt}\x1b[201~`, "\r"]);
  assert.equal(fx.buffers.size, 0);
});

test("trial10 completed cells without fresh spawn provenance remain uncertain without replay", async () => {
  const fx = harness();
  await assert.rejects(() => fx.ask(null), uncertain);
  assert.equal(fx.inputs.filter((input) => input === "\r").length, 1);
  assert.equal(fx.buffers.size, 0);
});

test("trial11 an older identical completed turn already on screen cannot confirm the first ask", async () => {
  const records = clone([profile.ready, profile.postPaste, profile.guard, profile.after]);
  const transcript = profile.after.snapshot.split("\n").slice(0, 35);
  for (const record of records.slice(0, 3)) {
    record.snapshot = [...transcript, ...record.snapshot.split("\n").slice(35)].join("\n");
  }
  const fx = harness(records);
  await assert.rejects(fx.ask, uncertain);
  assert.deepEqual(fx.inputs, [`\x1b[200~${profile.prompt}\x1b[201~`, "\r"]);
  assert.equal(fx.buffers.size, 0);
});

test("trial11 a completed response after the retry Enter cannot use the attempt-zero witness", async () => {
  const fx = harness([profile.ready, profile.postPaste, profile.guard,
    profile.postPaste, profile.guard, profile.after]);
  await assert.rejects(fx.ask, uncertain);
  assert.deepEqual(fx.inputs, [`\x1b[200~${profile.prompt}\x1b[201~`, "\r", "\r"]);
  assert.equal(fx.buffers.size, 0);
});

function replaceRow(observation, row, text) {
  const rows = observation.snapshot.split("\n");
  rows[row] = text;
  observation.snapshot = rows.join("\n");
}

test("trial10 prior rendered conversation, hidden-history reuse and marker spoof cannot prove a first turn", async () => {
  for (const prior of ["❯ Summarize this.", "● older answer", "old transcript", "✻ Cogitated for 1s"]) {
    const records = clone([profile.ready, profile.postPaste, profile.guard, profile.after]);
    for (const record of records.slice(0, 3)) replaceRow(record, 2, prior);
    const fx = harness(records);
    await assert.rejects(fx.ask, uncertain);
    assert.equal(fx.inputs.filter((input) => input === "\r").length, 1);
    assert.equal(fx.buffers.size, 0);
  }
  // Identical completed cells restored from offscreen on a reused process have no spawn capability.
  const fx = harness();
  await assert.rejects(() => fx.ask(null), uncertain);
});

test("trial10 mismatched spawn ready guard or after identity cannot bind the completed response", async () => {
  for (const stage of [0, 1, 2, 3]) {
    for (const key of ["serverPid", "panePid", "target"]) {
      const records = clone([profile.ready, profile.postPaste, profile.guard, profile.after]);
      records[stage].submitState[key] = key === "target" ? "%2" : "999";
      if (key === "target") records[stage].pane.target = "%2";
      const fx = harness(records);
      await assert.rejects(fx.ask, (error) => error.code === "AGENT_PROMPT_NOT_SUBMITTED");
      assert.ok(fx.inputs.filter((input) => input === "\r").length <= 1);
      assert.equal(fx.buffers.size, 0);
    }
  }
  const fx = harness();
  await assert.rejects(() => fx.ask({ ...profile.ready.submitState, panePid: "999" }), uncertain);
});

test("trial10 missing duplicate reflowed non-ASCII or spoofed cells and unsafe pane modes stay uncertain", async () => {
  const changes = [
    (after) => replaceRow(after, 6, ""),
    (after) => replaceRow(after, 8, ""),
    (after) => replaceRow(after, 9, `❯ ${profile.prompt}`),
    (after) => replaceRow(after, 9, "● duplicate answer"),
    (after) => replaceRow(after, 8, "● ❯ spoofed user turn"),
    (after) => replaceRow(after, 8, "● héllo"),
    (after) => replaceRow(after, 4, "shifted prefix"),
    (after) => replaceRow(after, 36, "❯\u00a0unexpected draft"),
    (after) => replaceRow(after, 39, "Select model"),
    (after) => { after.pane.width = 119; },
    (after) => { after.pane.cursorX = 3; },
    (after) => { after.pane.mode = "1"; },
    (after) => { after.pane.inputOff = "1"; },
    (after) => { after.pane.synchronized = "1"; },
  ];
  for (const change of changes) {
    const records = clone([profile.ready, profile.postPaste, profile.guard, profile.after]);
    change(records[3]);
    const fx = harness(records);
    await assert.rejects(fx.ask, uncertain);
    assert.equal(fx.inputs.filter((input) => input === "\r").length, 1);
    assert.equal(fx.buffers.size, 0);
  }
});

test("trial10 exact final draft guard is required before any Enter", async () => {
  const records = clone([profile.ready, profile.postPaste, profile.guard, profile.after]);
  replaceRow(records[2], 36, "❯\u00a0" + "x".repeat(profile.prompt.length));
  const fx = harness(records);
  await assert.rejects(fx.ask, (error) => error.reason === "unknown_state");
  assert.equal(fx.inputs.includes("\r"), false);
});

test("trial10 adapter consumes fresh spawn eligibility on its first ask including failure", async () => {
  for (const invalidFirst of [false, true]) {
    const records = [profile.ready, ...Array(2).fill([profile.ready, profile.postPaste, profile.guard, profile.after]).flat()];
    const fx = harness(records);
    const adapter = new BaseAdapter({ id: "claude-code", config: {} });
    adapter.rememberFreshClaudeSpawn({ tmuxTarget: "%1", run: fx.run });
    if (invalidFirst) {
      await assert.rejects(() => adapter.submitPrompt({ ...fx.options, prompt: "\x01" }), (error) => error.reason === "invalid_text");
    } else {
      assert.equal((await adapter.submitPrompt(fx.options)).snapshot, profile.after.snapshot);
    }
    await assert.rejects(() => adapter.submitPrompt(fx.options), uncertain);
    assert.equal(fx.buffers.size, 0);
  }
});

test("trial10 Claude spawn and ask wire first-prompt eligibility only after a successful plain launch", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "a04-first-prompt-"));
  const previousPath = process.env.PATH;
  const previousDryRun = process.env.AGENTS_DRY_RUN;
  try {
    // A fake transport only: no Claude executable or live provider is launched.
    fs.writeFileSync(path.join(directory, "tmux"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    process.env.PATH = `${directory}:${previousPath}`;
    delete process.env.AGENTS_DRY_RUN;
    configureAudit({ auditLog: path.join(directory, "audit.jsonl") });
    const registries = {
      getAgent: () => ({ reasoningEfforts: ["medium"], allowedClassifications: ["internal"], allowedRoles: ["coder"], requiresApprovalFor: [] }),
      getRepo: () => null,
      getRole: () => ({ allowActions: ["agent.spawn", "agent.ask"] }),
      getProtectedBranches: () => [],
    };
    for (const variant of ["plain", "wrapper-arguments", "failed-launch", "dry-run"]) {
      const fx = harness([profile.ready, ...Array(2).fill([profile.ready, profile.postPaste, profile.guard, profile.after]).flat()]);
      const adapter = new ClaudeAdapter({ registries, config: { dryRun: variant === "dry-run", repoRoots: [directory],
        claudeBin: variant === "wrapper-arguments" ? "claude --resume" : "claude" } });
      let registered = 0;
      adapter.submitLaunchCommand = async () => { if (variant === "failed-launch") throw new Error("launch failed"); };
      adapter.rememberFreshClaudeSpawn = ({ tmuxTarget }) => {
        registered++;
        BaseAdapter.prototype.rememberFreshClaudeSpawn.call(adapter, { tmuxTarget, run: fx.run });
      };
      adapter.submitPrompt = (args) => BaseAdapter.prototype.submitPrompt.call(adapter, { ...args, run: fx.run, wait: async () => {} });
      const spawn = () => adapter.spawn({ cwd: directory, traceId: `tr-first-${variant}`, role: "coder", model: "claude-opus-5-5", reasoningEffort: "medium" });
      if (variant === "failed-launch") {
        await assert.rejects(spawn, /launch failed/);
        assert.equal(registered, 0);
        continue;
      }
      const result = await spawn();
      assert.equal(registered, variant === "plain" ? 1 : 0);
      if (variant !== "plain") continue;
      const ask = () => adapter.ask({ tmuxTarget: result.tmuxTarget, prompt: profile.prompt, traceId: "tr-first-plain", role: "coder" });
      assert.equal((await ask()).snapshot, profile.after.snapshot);
      await assert.rejects(ask, uncertain);
      assert.equal(fx.buffers.size, 0);
    }
  } finally {
    process.env.PATH = previousPath;
    if (previousDryRun === undefined) delete process.env.AGENTS_DRY_RUN;
    else process.env.AGENTS_DRY_RUN = previousDryRun;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("trial11 killing a plain-launch Claude revokes eligibility before its first ask", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "a04-kill-first-prompt-"));
  const previousPath = process.env.PATH;
  const previousDryRun = process.env.AGENTS_DRY_RUN;
  try {
    // The fake kill leaves the captured layout available to expose stale eligibility.
    fs.writeFileSync(path.join(directory, "tmux"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    process.env.PATH = `${directory}:${previousPath}`;
    delete process.env.AGENTS_DRY_RUN;
    configureAudit({ auditLog: path.join(directory, "audit.jsonl") });
    const registries = {
      getAgent: () => ({ reasoningEfforts: ["medium"], allowedClassifications: ["internal"], allowedRoles: ["coder"], requiresApprovalFor: [] }),
      getRepo: () => null,
      getRole: () => ({ allowActions: ["agent.spawn", "agent.ask"] }),
      getProtectedBranches: () => [],
    };
    const fx = harness([profile.ready, profile.ready, profile.postPaste, profile.guard, profile.after]);
    const adapter = new ClaudeAdapter({ registries, config: { repoRoots: [directory], claudeBin: "claude" } });
    adapter.submitLaunchCommand = async () => {};
    adapter.rememberFreshClaudeSpawn = ({ tmuxTarget }) =>
      BaseAdapter.prototype.rememberFreshClaudeSpawn.call(adapter, { tmuxTarget, run: fx.run });
    adapter.submitPrompt = (args) => BaseAdapter.prototype.submitPrompt.call(adapter, { ...args, run: fx.run, wait: async () => {} });
    const traceId = "tr-kill-first-prompt";
    const result = await adapter.spawn({ cwd: directory, traceId, role: "coder", model: "claude-opus-5-5", reasoningEffort: "medium" });
    assert.deepEqual(await adapter.kill({ tmuxTarget: result.tmuxTarget, traceId, role: "coder" }), { closed: true, dryRun: false });
    await assert.rejects(() => adapter.ask({ tmuxTarget: result.tmuxTarget, prompt: profile.prompt, traceId, role: "coder" }), uncertain);
    assert.deepEqual(fx.inputs, [`\x1b[200~${profile.prompt}\x1b[201~`, "\r"]);
    assert.equal(fx.buffers.size, 0);
  } finally {
    process.env.PATH = previousPath;
    if (previousDryRun === undefined) delete process.env.AGENTS_DRY_RUN;
    else process.env.AGENTS_DRY_RUN = previousDryRun;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
