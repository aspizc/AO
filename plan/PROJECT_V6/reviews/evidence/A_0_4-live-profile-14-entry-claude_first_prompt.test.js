import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BaseAdapter, submitPrompt } from "../../gateway/src/adapters/base_adapter.js";
import { ClaudeAdapter } from "../../gateway/src/adapters/claude_adapter.js";
import { configureAudit } from "../../gateway/src/core/audit.js";

const [profile] = JSON.parse(fs.readFileSync(new URL("./fixtures/a04_live_profiles_trial9.json", import.meta.url), "utf8"));
const delayedProfile = JSON.parse(fs.readFileSync(new URL("./fixtures/claude_2_1_294_first_prompt.json", import.meta.url), "utf8"));
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

function delayedHarness(records = [delayedProfile.ready, delayedProfile.postPaste, delayedProfile.guard,
  ...Array(8).fill(delayedProfile.working), delayedProfile.after]) {
  const fx = harness(records);
  const waits = [];
  const ask = (spawn = delayedProfile.ready.submitState) => submitPrompt({ ...fx.options,
    prompt: delayedProfile.prompt, firstPromptProcess: spawn, wait: async (ms) => { waits.push(ms); } });
  return { ...fx, ask, waits };
}

test("trial12 delayed Claude 2.1.294 first reply is observed without another Enter", async () => {
  const fx = delayedHarness();
  assert.equal((await fx.ask()).snapshot, delayedProfile.after.snapshot);
  assert.deepEqual(fx.waits, [150, 1500, ...Array(8).fill(1000)]);
  assert.deepEqual(fx.inputs, [`\x1b[200~${delayedProfile.prompt}\x1b[201~`, "\r"]);
  assert.equal(fx.buffers.size, 0);
});

test("trial12 unchanged first-turn spinner exhausts a finite poll without replay", async () => {
  const fx = delayedHarness([delayedProfile.ready, delayedProfile.postPaste, delayedProfile.guard, delayedProfile.working]);
  await assert.rejects(fx.ask, uncertain);
  assert.deepEqual(fx.waits, [150, 1500, ...Array(8).fill(1000)]);
  assert.deepEqual(fx.inputs, [`\x1b[200~${delayedProfile.prompt}\x1b[201~`, "\r"]);
  assert.equal(fx.buffers.size, 0);
});

test("trial12 immediate 2.1.294 completion needs the first Enter and cannot credit a retry", async () => {
  const completed = delayedHarness([delayedProfile.ready, delayedProfile.postPaste, delayedProfile.guard, delayedProfile.after]);
  assert.equal((await completed.ask()).snapshot, delayedProfile.after.snapshot);
  assert.deepEqual(completed.waits, [150, 1500]);
  assert.deepEqual(completed.inputs, [`\x1b[200~${delayedProfile.prompt}\x1b[201~`, "\r"]);
  assert.equal(completed.buffers.size, 0);
  const retry = delayedHarness([delayedProfile.ready, delayedProfile.postPaste, delayedProfile.guard,
    delayedProfile.postPaste, delayedProfile.guard, delayedProfile.after]);
  await assert.rejects(retry.ask, uncertain);
  assert.deepEqual(retry.inputs, [`\x1b[200~${delayedProfile.prompt}\x1b[201~`, "\r", "\r"]);
  assert.equal(retry.buffers.size, 0);
});

test("trial12 reused Claude and stale prior transcript cannot enter the first-turn poll", async () => {
  const reused = delayedHarness();
  await assert.rejects(() => reused.ask(null), uncertain);
  assert.deepEqual(reused.waits, [150, 1500]);
  assert.equal(reused.buffers.size, 0);
  for (const row of [4, 8, 10, 33]) {
    const records = clone([delayedProfile.ready, delayedProfile.postPaste, delayedProfile.guard,
      delayedProfile.working, delayedProfile.after]);
    for (const frame of records.slice(0, 3)) replaceRow(frame, row, "● prior rendered answer");
    const fx = delayedHarness(records);
    await assert.rejects(fx.ask, uncertain);
    assert.deepEqual(fx.waits, [150, 1500]);
    assert.deepEqual(fx.inputs, [`\x1b[200~${delayedProfile.prompt}\x1b[201~`, "\r"]);
    assert.equal(fx.buffers.size, 0);
  }
});

test("trial12 identity drift or ambiguous intermediate cells cannot be rescued by later completion", async () => {
  const changes = [
    (frame) => { frame.submitState.serverPid = "999"; },
    (frame) => { frame.submitState.panePid = "999"; },
    (frame) => { frame.pane.mode = "1"; },
    (frame) => { frame.pane.inputOff = "1"; },
    (frame) => { frame.pane.synchronized = "1"; },
    (frame) => replaceRow(frame, 2, "changed header"),
    (frame) => replaceRow(frame, 9, `❯ ${delayedProfile.prompt}`),
    (frame) => replaceRow(frame, 8, "● prior answer"),
    (frame) => replaceRow(frame, 33, "Select model"),
    (frame) => replaceRow(frame, 34, "unexpected status"),
    (frame) => replaceRow(frame, 36, "❯\u00a0unexpected draft"),
  ];
  for (const change of changes) {
    const records = [delayedProfile.ready, delayedProfile.postPaste, delayedProfile.guard,
      delayedProfile.working, delayedProfile.working, delayedProfile.after].map(clone);
    change(records[4]);
    const fx = delayedHarness(records);
    await assert.rejects(fx.ask, uncertain);
    assert.deepEqual(fx.waits, [150, 1500, 1000]);
    assert.deepEqual(fx.inputs, [`\x1b[200~${delayedProfile.prompt}\x1b[201~`, "\r"]);
    assert.equal(fx.buffers.size, 0);
  }
});

test("trial12 completed layout requires unique exact cells and matching first-ask provenance", async () => {
  const changes = [
    (frame) => replaceRow(frame, 6, "❯ different prompt"),
    (frame) => replaceRow(frame, 8, "●"),
    (frame) => replaceRow(frame, 9, "● duplicate answer"),
    (frame) => replaceRow(frame, 10, "✻ unknown completion"),
    (frame) => replaceRow(frame, 2, "changed header"),
    (frame) => { frame.submitState.panePid = "999"; },
  ];
  for (const change of changes) {
    const records = clone([delayedProfile.ready, delayedProfile.postPaste, delayedProfile.guard,
      delayedProfile.working, delayedProfile.after]);
    change(records[4]);
    const fx = delayedHarness(records);
    await assert.rejects(fx.ask, uncertain);
    assert.deepEqual(fx.inputs, [`\x1b[200~${delayedProfile.prompt}\x1b[201~`, "\r"]);
    assert.equal(fx.buffers.size, 0);
  }
});

test("trial13 a stable non-Twisting verb with animated glyphs confirms the delayed first reply", async () => {
  for (const verb of ["Pondering", "Razzle-dazzling"]) {
    const frames = ["✶", "✻", "✽", "·", "✢", "*"].map((glyph, index) => {
      const frame = clone(delayedProfile.working);
      replaceRow(frame, 33, `${glyph} ${verb}… (${index + 1}s · ↓ ${index + 2} tokens)`);
      return frame;
    });
    const fx = delayedHarness([delayedProfile.ready, delayedProfile.postPaste, delayedProfile.guard,
      ...frames, delayedProfile.after]);
    assert.equal((await fx.ask()).snapshot, delayedProfile.after.snapshot);
    assert.deepEqual(fx.waits, [150, 1500, ...Array(6).fill(1000)]);
    assert.deepEqual(fx.inputs, [`\x1b[200~${delayedProfile.prompt}\x1b[201~`, "\r"]);
    assert.equal(fx.buffers.size, 0);
  }
});

for (const verb of ["Baked", "Brewed", "Churned", "Cogitated", "Cooked", "Crunched", "Sautéed", "Worked"]) {
  test(`trial13 immediate completion with ${verb} confirms one first-ask Enter`, async () => {
    const after = clone(delayedProfile.after);
    replaceRow(after, 10, `✻ ${verb} for 1s · done 9:00 AM`);
    const fx = delayedHarness([delayedProfile.ready, delayedProfile.postPaste, delayedProfile.guard, after]);
    assert.equal((await fx.ask()).snapshot, after.snapshot);
    assert.deepEqual(fx.waits, [150, 1500]);
    assert.deepEqual(fx.inputs, [`\x1b[200~${delayedProfile.prompt}\x1b[201~`, "\r"]);
    assert.equal(fx.buffers.size, 0);
  });
}

test("trial13 a changed spinner verb cannot borrow a later completed reply", async () => {
  const changed = clone(delayedProfile.working);
  replaceRow(changed, 33, "✽ Pondering… (2s · ↓ 3 tokens)");
  const fx = delayedHarness([delayedProfile.ready, delayedProfile.postPaste, delayedProfile.guard,
    delayedProfile.working, changed, delayedProfile.after]);
  await assert.rejects(fx.ask, uncertain);
  assert.deepEqual(fx.waits, [150, 1500, 1000]);
  assert.deepEqual(fx.inputs, [`\x1b[200~${delayedProfile.prompt}\x1b[201~`, "\r"]);
  assert.equal(fx.buffers.size, 0);
});

test("trial13 completion verbs outside the version-bound set remain uncertain", async () => {
  const after = clone(delayedProfile.after);
  replaceRow(after, 10, "✻ Finished for 1s · done 9:00 AM");
  const fx = delayedHarness([delayedProfile.ready, delayedProfile.postPaste, delayedProfile.guard, after]);
  await assert.rejects(fx.ask, uncertain);
  assert.deepEqual(fx.waits, [150, 1500]);
  assert.deepEqual(fx.inputs, [`\x1b[200~${delayedProfile.prompt}\x1b[201~`, "\r"]);
  assert.equal(fx.buffers.size, 0);
});

test("trial13 unknown spinner forms and a different header version remain uncertain", async () => {
  for (const row of ["✳ Pondering… (1s · ↓ 2 tokens)", "✽ pondering… (1s · ↓ 2 tokens)",
    "✽ Pondering!… (1s · ↓ 2 tokens)", "✽ Pondering… (1s)"]) {
    const working = clone(delayedProfile.working);
    replaceRow(working, 33, row);
    const fx = delayedHarness([delayedProfile.ready, delayedProfile.postPaste, delayedProfile.guard, working]);
    await assert.rejects(fx.ask, uncertain);
    assert.deepEqual(fx.waits, [150, 1500]);
    assert.deepEqual(fx.inputs, [`\x1b[200~${delayedProfile.prompt}\x1b[201~`, "\r"]);
    assert.equal(fx.buffers.size, 0);
  }
  const records = [delayedProfile.ready, delayedProfile.postPaste, delayedProfile.guard, delayedProfile.after].map(clone);
  for (const frame of records) replaceRow(frame, 1, " ▐▛███▛█   Claude Code v2.1.295");
  const fx = delayedHarness(records);
  await assert.rejects(fx.ask, uncertain);
  assert.deepEqual(fx.inputs, [`\x1b[200~${delayedProfile.prompt}\x1b[201~`, "\r"]);
  assert.equal(fx.buffers.size, 0);
});

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
