import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as base from "../../gateway/src/adapters/base_adapter.js";

// Codex 0.160.1: pinned chat_composer.rs/footer.rs/status_indicator_widget.rs.
// These are source fixtures, not observations of live provider acceptance.
const empty = "\n\n› Ask Codex to do anything\n\n  ? for shortcuts                  100% context left";
const pending = (prompt) => `\n\n› ${prompt.split("\n").join("\n  ")}\n\n                                   100% context left`;
const working = "• Working (0s • esc to interrupt)\n\n› Ask Codex to do anything\n\n  ? for shortcuts                  100% context left";
const menu = "Retry with a faster model?\n› 1. Switch model\n  2. Keep current model";

function fixture({ prompt = "Enter", screens, paste = "1", fail = null, target = "%12", provider = "codex", paneFor = null, version = "3.6a-agents.3", submitResult = null } = {}) {
  const calls = [];
  const inputs = [];
  const buffers = new Map();
  let captures = 0;
  const run = (args, options = {}) => {
    calls.push({ args, options });
    if (args[0] === "display-message" && args.at(-1) === "#{version}") {
      return { status: 0, stderr: "", stdout: Buffer.from(version + "\n") };
    }
    if (args[0] === "display-message") {
      const screen = screens?.[Math.min(captures, screens.length - 1)] ?? empty;
      if (paneFor) {
        const state = `${target}|0|0|0|${paneFor(screen)}`;
        const [, , , , y, height, width, x] = state.split("|");
        return { status: 0, stdout: args.at(-1).startsWith("#{pid}|")
          ? `100|${target}|200|${width}|${height}|${x}|${y}\n` : state + "\n" };
      }
      const rows = screen.split("\n");
      let cursor = rows.findLastIndex((row) => /^›/.test(row));
      const placeholder = rows[cursor]?.includes("Ask Codex to do anything");
      if (!placeholder && rows[cursor]?.startsWith("› ")) cursor += prompt.split("\n").length - 1;
      const y = Math.max(0, cursor), x = placeholder ? 2 : prompt.split("\n").at(-1).length + 2;
      return { status: 0, stdout: args.at(-1).startsWith("#{pid}|")
        ? `100|${target}|200|160|24|${x}|${y}\n` : `${target}|0|0|0|${y}|24|160|${x}\n` };
    }
    if (args[0] === "list-commands") return { status: 0, stderr: "", stdout: Buffer.from("agents-submit-v1 -b buffer-name -t target-pane\npaste-buffer (pasteb) [-dGpr] [-b buffer-name] [-t target-pane]\n") };
    if (args[0] === "capture-pane") {
      const stdout = screens?.[Math.min(captures++, screens.length - 1)] ?? empty;
      if (args.includes("-b")) {
        buffers.set(args[args.indexOf("-b") + 1], Buffer.from(stdout));
        return { status: 0, stdout: "" };
      }
      return { status: 0, stdout };
    }
    if (args[0] === "save-buffer") return { status: 0, stdout: buffers.get(args[2]) };
    if (args[0] === "agents-submit-v1") {
      buffers.delete(args[2]);
      if (submitResult) return typeof submitResult === "function" ? submitResult() : submitResult;
      inputs.push("\r");
    }
    if (args[0] === "load-buffer") buffers.set(args[2], options.input);
    if (args[0] === "delete-buffer") {
      if (!buffers.delete(args[2])) return { status: 1, stderr: `unknown buffer: ${args[2]}\n` };
    }
    if (args[0] === "paste-buffer") {
      if (paste !== "1") return { status: 1, stderr: "agents: bracketed paste unavailable" };
      // Model the bytes written by tmux when bracketed mode was established.
      // An unframed LF would submit here; framed text never does.
      const text = buffers.get(args[args.indexOf("-b") + 1]);
      inputs.push(`\x1b[200~${text}\x1b[201~`);
    }
    if (args[0] === "send-keys") inputs.push(!args.includes("-l") && args.at(-1) === "Enter" ? "\r" : args.at(-1));
    if (args[0] === fail) return { status: 1, stderr: `private pane: ${prompt}` };
    return { status: 0, stdout: "" };
  };
  const waits = [];
  const ask = () => base.submitPrompt({
    target, prompt, provider, run,
    config: { tmuxSubmitDelayMs: 17, tmuxAskDelayMs: 1 },
    wait: async (ms) => { waits.push(ms); },
  });
  return { ask, run, calls, inputs, buffers, waits };
}

function reason(expected) {
  return (err) => err.code === "AGENT_PROMPT_NOT_SUBMITTED"
    && err.reason === expected
    && err.message === "prompt submission not confirmed";
}

test("ask delivers exact multiline/key-name text without an intermediate submit", async () => {
  for (const prompt of ["Enter", "C-c", "first line\nsecond line", "  white space  "]) {
    const fx = fixture({ prompt, screens: [empty, pending(prompt), pending(prompt), working] });
    const result = await fx.ask();
    assert.equal(result.snapshot, working);
    assert.deepEqual(fx.inputs, [`\x1b[200~${prompt}\x1b[201~`, "\r"]);
    assert.deepEqual(fx.waits, [17, 1]);
    assert.equal(fx.buffers.size, 0);
    assert.equal(fx.calls.find((c) => c.args[0] === "load-buffer").options.input, prompt);
  }
});

test("ask retries Enter once only for the same positively identified pending composer", async () => {
  const fx = fixture({ screens: [empty, pending("Enter"), pending("Enter"), pending("Enter"), pending("Enter"), working] });
  await fx.ask();
  assert.deepEqual(fx.inputs, ["\x1b[200~Enter\x1b[201~", "\r", "\r"]);
});

test("ask fails after a second confirmed unchanged composer and does not resend text", async () => {
  const fx = fixture({ screens: [empty, ...Array(5).fill(pending("Enter"))] });
  await assert.rejects(fx.ask, reason("not_submitted"));
  assert.deepEqual(fx.inputs, ["\x1b[200~Enter\x1b[201~", "\r", "\r"]);
  assert.equal(fx.buffers.size, 0);
});

test("permission and model menus receive no keys", async () => {
  for (const screen of [menu, "Do you trust this directory?\n› 1. Yes\n  2. No", "Do you want to proceed?\n› 1. Yes\n  2. No"]) {
    const fx = fixture({ screens: [screen] });
    await assert.rejects(fx.ask, reason("decision_required"));
    assert.deepEqual(fx.inputs, []);
    assert.equal(fx.calls.some((c) => c.args[0] === "load-buffer"), false);
  }
});

test("unknown or busy pane cannot be submitted", async () => {
  for (const [screen, expected] of [["a shell prompt $", "unknown_state"], [working, "busy"]]) {
    const fx = fixture({ screens: [screen] });
    await assert.rejects(fx.ask, reason(expected));
    assert.deepEqual(fx.inputs, []);
  }
});

test("a menu appearing after paste receives no Enter", async () => {
  const fx = fixture({ screens: [empty, menu] });
  await assert.rejects(fx.ask, reason("decision_required"));
  assert.deepEqual(fx.inputs, ["\x1b[200~Enter\x1b[201~"]);
});

test("prompt disappearance without acceptance is uncertain and never retried", async () => {
  const fx = fixture({ screens: [empty, pending("Enter"), pending("Enter"), empty, empty] });
  await assert.rejects(fx.ask, reason("acceptance_uncertain"));
  assert.deepEqual(fx.inputs, ["\x1b[200~Enter\x1b[201~", "\r"]);
});

test("an unknown observation followed by pending text cannot authorize a retry", async () => {
  const fx = fixture({ screens: [empty, pending("Enter"), pending("Enter"), "unrecognized", pending("Enter")] });
  await assert.rejects(fx.ask, reason("acceptance_uncertain"));
  assert.equal(fx.inputs.filter((input) => input === "\r").length, 1);
});

test("stale acceptance text away from the active composer cannot confirm this submission", async () => {
  const stale = `${working}\n${"old history\n".repeat(12)}`;
  const fx = fixture({ screens: [empty, pending("Enter"), pending("Enter"), `${stale}${pending("Enter")}`, `${stale}${pending("Enter")}`] });
  await assert.rejects(fx.ask, reason("acceptance_uncertain"));
  assert.equal(fx.inputs.filter((input) => input === "\r").length, 1);
});

test("bracketed paste disabled or unavailable refuses before input", async () => {
  for (const paste of ["0", ""]) {
    const fx = fixture({ paste, screens: [empty] });
    await assert.rejects(fx.ask, reason("paste_unavailable"));
    assert.deepEqual(fx.inputs, []);
    assert.equal(fx.buffers.size, 0);
  }
});

test("unsupported controls refuse before target observation or input", async () => {
  for (const prompt of ["escape\x1b[201~", "delete\x7f", "return\r", "null\0", "tab\t", "\ud800", ""]) {
    const fx = fixture({ prompt });
    await assert.rejects(fx.ask, reason("invalid_text"));
    assert.deepEqual(fx.calls, []);
  }
});

test("owned buffers are isolated and cleaned on transport failure with safe metadata", async () => {
  const names = [];
  for (const fail of ["load-buffer", "paste-buffer", "agents-submit-v1"]) {
    const fx = fixture({ fail, prompt: "private-prompt", screens: [empty, pending("private-prompt"), pending("private-prompt")] });
    await assert.rejects(fx.ask, (err) => {
      assert.doesNotMatch(JSON.stringify({ message: err.message, ...err }), /private/);
      return reason(fail === "agents-submit-v1" ? "acceptance_uncertain" : "transport_failed")(err);
    });
    names.push(fx.calls.find((c) => c.args[0] === "load-buffer").args[2]);
    assert.equal(fx.buffers.size, 0);
  }
  assert.equal(new Set(names).size, 3);
});

test("same-target concurrent asks cannot interleave even through target aliases", async () => {
  let release;
  const fx = fixture({ screens: [empty, pending("Enter"), pending("Enter"), working] });
  const first = base.submitPrompt({ target: "session-name", prompt: "Enter", provider: "codex", run: fx.run,
    config: { tmuxSubmitDelayMs: 17, tmuxAskDelayMs: 1 }, wait: () => new Promise((resolve) => { release = resolve; }) });
  await assert.rejects(() => base.submitPrompt({ target: "%12", prompt: "second", provider: "codex", run: fx.run }), reason("concurrent_ask"));
  release();
  // The second delay must not hang this fixture.
  await new Promise((resolve) => setImmediate(resolve));
  release();
  await first;
  assert.deepEqual(fx.inputs, ["\x1b[200~Enter\x1b[201~", "\r"]);
});

test("foreign provider composer layouts stay closed without fabricated readiness", async () => {
  for (const provider of ["claude-code", "antigravity", "opencode"]) {
    const fx = fixture({ screens: [empty] });
    await assert.rejects(() => base.submitPrompt({ target: "%12", prompt: "Enter", provider, run: fx.run }), reason("unknown_state"));
    assert.deepEqual(fx.inputs, []);
  }
});

test("pi 0.73.1 uses its editor borders and working loader, not a Codex banner", () => {
  // interactive-mode.js createWorkingLoader; pi-tui Editor.render emits two borders.
  const pane = { mode: "0", inputOff: "0", synchronized: "0", cursor: 2, width: 40, height: 24 };
  const ready = "pi v0.73.1\n──────────────────\n \n──────────────────\n/tmp";
  assert.equal(base.classifyProviderPane("pi", ready, pane).state, "composer");
  assert.equal(base.classifyProviderPane("pi", ready.replace("\n \n", "\n Enter\n"), pane).text, "Enter");
  const busy = ready.replace("pi v0.73.1\n", "pi v0.73.1\n⠋ Working...\n");
  assert.equal(base.classifyProviderPane("pi", busy, { ...pane, cursor: 3 }).state, "busy");
  assert.equal(base.classifyProviderPane("codex", ready, pane).state, "unknown_state");
});

test("OpenCode 1.18.20 uses its source composer border, agent metadata and interrupt footer", () => {
  // v1.18.20 packages/tui/src/component/prompt/index.tsx and ui/border.ts.
  const screen = (text, footer = "/tmp     tab agents  ctrl+p commands") =>
    `┃\n┃  ${text.split("\n").join("\n┃  ")}\n┃\n┃  Build · GPT-6 OpenAI\n╹▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀\n${footer}`;
  const pane = { mode: "0", inputOff: "0", synchronized: "0", cursor: 1, cursorX: 3, width: 40, height: 24 };
  const ready = screen('Ask anything... "How does auth work?"');
  assert.equal(base.classifyProviderPane("opencode", ready, pane).state, "composer");
  assert.equal(base.classifyProviderPane("opencode", ready, pane).text, "");
  assert.equal(base.classifyProviderPane("opencode", screen("Enter\nC-c"), { ...pane, cursor: 2, cursorX: 6 }).text, "Enter\nC-c");
  assert.equal(base.classifyProviderPane("opencode", screen("", " ▄▄   esc interrupt     ctrl+p commands"), pane).state, "busy");
  assert.equal(base.classifyProviderPane("codex", ready, pane).state, "unknown_state");
});

test("OpenCode overlays, shell mode, paste summaries and cursor drift cannot authorize Enter", () => {
  const pane = { mode: "0", inputOff: "0", synchronized: "0", cursor: 1, cursorX: 3, width: 40, height: 24 };
  const ready = '┃\n┃  Ask anything... "example"\n┃\n┃  Build · GPT-6 OpenAI\n╹▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀\n /tmp    tab agents  ctrl+p commands';
  assert.equal(base.classifyProviderPane("opencode", `${ready}\nPermission required\nAllow once  Allow always  Reject`, pane).state, "decision_required");
  assert.equal(base.classifyProviderPane("opencode", ready.replace("Build · GPT-6 OpenAI", "Shell"), pane).state, "unknown_state");
  assert.equal(base.classifyProviderPane("opencode", ready.replace('Ask anything... "example"', "[Pasted ~3 lines]"), pane).state, "unknown_state");
  assert.equal(base.classifyProviderPane("opencode", ready, { ...pane, cursor: 5 }).state, "unknown_state");
});

test("launch sends literal single-line text then separate Enter after settling", async () => {
  const fx = fixture();
  await base.submitLaunchCommand({ target: "%12", line: "Enter", run: fx.run, config: { tmuxSubmitDelayMs: 17 },
    wait: async (ms) => { fx.waits.push(ms); } });
  assert.deepEqual(fx.inputs, ["Enter", "\r"]);
  assert.deepEqual(fx.waits, [17]);
  assert.equal(fx.calls[0].args.includes("-l"), true);
  for (const line of ["codex\nsecond command", "claude\r", "pi\x1b"]) {
    const invalid = fixture();
    await assert.rejects(() => base.submitLaunchCommand({ target: "%12", line, run: invalid.run }), reason("invalid_text"));
    assert.deepEqual(invalid.calls, []);
  }
});

test("unsupported_runtime_has_no_unguarded_fallback", async () => {
  const fx = fixture({ screens: [empty] });
  const run = (args, options) => args[0] === "list-commands"
    ? { status: 0, stdout: "paste-buffer [-dpr]" } : fx.run(args, options);
  await assert.rejects(() => base.submitPrompt({ target: "%12", prompt: "Enter", provider: "codex", run }), reason("paste_unavailable"));
  assert.deepEqual(fx.inputs, []);
  assert.equal(fx.calls.some((call) => call.args[0] === "load-buffer"), false);
  assert.equal(fx.calls.some((call) => ["paste-buffer", "send-keys"].includes(call.args[0])), false);
});

test("an unsupported guarded option has a bounded refusal with no raw fallback", async () => {
  const fx = fixture({ screens: [empty] });
  const run = (args, options) => args[0] === "paste-buffer"
    ? { status: 1, stderr: "command paste-buffer: unknown flag -G" } : fx.run(args, options);
  await assert.rejects(() => base.submitPrompt({ target: "%12", prompt: "first\nsecond", provider: "codex", run }), reason("paste_unavailable"));
  assert.deepEqual(fx.inputs, []);
  assert.equal(fx.buffers.size, 0);
  assert.equal(fx.calls.some((call) => call.args[0] === "send-keys"), false);
});

test("bracketed mode disappearing at paste refuses atomically without sending raw multiline", async () => {
  const fx = fixture({ prompt: "first\nsecond", paste: "0", screens: [empty] });
  await assert.rejects(fx.ask, reason("paste_unavailable"));
  assert.deepEqual(fx.inputs, []);
  assert.equal(fx.buffers.size, 0);
});

const claudeSource = JSON.parse(fs.readFileSync(new URL("./fixtures/claude_2_1_292_composer.json", import.meta.url), "utf8"));
const claudePrefix = claudeSource.pointer + claudeSource.separator;
const claudeScreen = (text = claudeSource.placeholder, footer = claudeSource.idleFooter) =>
  ["─".repeat(claudeSource.width), claudePrefix + text, "─".repeat(claudeSource.width), footer].join("\n");
const claudePane = (cursorX = 2) => ({ mode: "0", inputOff: "0", synchronized: "0", cursor: 1,
  cursorX, width: claudeSource.width, height: claudeSource.height });
const claudeReady = claudeScreen();
const claudeBusy = claudeScreen("", claudeSource.busyFooter);
function claudeFixture(prompt, screens) {
  return fixture({ prompt, screens, provider: "claude-code", paneFor: (screen) => {
    const rows = screen.split("\n");
    const cursor = rows.findLastIndex((row) => row.startsWith(claudePrefix));
    const text = rows[cursor]?.slice(2) || "";
    return `${Math.max(0, cursor)}|${claudeSource.height}|${claudeSource.width}|${text === claudeSource.placeholder ? 2 : text.length + 2}`;
  } });
}

test("Claude 2.1.292 source profile submits literal key names only after exact draft and fresh loading footer", async () => {
  for (const prompt of ["Enter", "C-c", "  literal spaces  ", "esc to interrupt"]) {
    const draft = claudeScreen(prompt);
    const fx = claudeFixture(prompt, [claudeReady, draft, draft, claudeBusy]);
    const result = await fx.ask();
    assert.equal(result.snapshot, claudeBusy);
    assert.deepEqual(fx.inputs, [`\x1b[200~${prompt}\x1b[201~`, "\r"]);
    assert.deepEqual(fx.waits, [17, 1]);
    assert.equal(fx.buffers.size, 0);
  }
});

test("Claude source placeholder and a typed identical string are distinguished by the composer cursor", () => {
  const ready = base.classifyProviderPane("claude-code", claudeReady, claudePane());
  assert.equal(ready.state, "composer");
  assert.equal(ready.text, "");
  const typed = base.classifyProviderPane("claude-code", claudeReady, claudePane(2 + claudeSource.placeholder.length));
  assert.equal(typed.state, "composer");
  assert.equal(typed.text, claudeSource.placeholder);
  assert.equal(base.classifyProviderPane("claude-code", claudeBusy, claudePane()).state, "busy");
});

test("Claude retries one unchanged observed draft but never repeats the pasted text", async () => {
  const draft = claudeScreen("Enter");
  const fx = claudeFixture("Enter", [claudeReady, draft, draft, draft, draft, claudeBusy]);
  await fx.ask();
  assert.deepEqual(fx.inputs, ["\x1b[200~Enter\x1b[201~", "\r", "\r"]);
  const failed = claudeFixture("Enter", [claudeReady, ...Array(5).fill(draft)]);
  await assert.rejects(failed.ask, reason("not_submitted"));
  assert.deepEqual(failed.inputs, ["\x1b[200~Enter\x1b[201~", "\r", "\r"]);
});

test("Claude model, effort and folder trust dialogs cannot receive text or Enter", async () => {
  for (const title of ["Select model", "Switch model?", "Change effort level?", "Yes, I trust this folder"]) {
    const fx = fixture({ provider: "claude-code", screens: [title + "\n❯ 1. Confirm\n  2. Cancel"],
      paneFor: () => "1|24|40|2" });
    await assert.rejects(fx.ask, reason("decision_required"));
    assert.deepEqual(fx.inputs, []);
    assert.equal(fx.calls.some((call) => call.args[0] === "load-buffer"), false);
  }
});

test("Claude loading and unknown panes refuse before any buffer or input", async () => {
  for (const [screen, expected] of [[claudeBusy, "busy"], ["a shell prompt $", "unknown_state"],
    [claudeScreen(""), "unknown_state"]]) {
    const fx = claudeFixture("Enter", [screen]);
    await assert.rejects(fx.ask, reason(expected));
    assert.deepEqual(fx.inputs, []);
    assert.equal(fx.calls.some((call) => call.args[0] === "load-buffer"), false);
  }
});

test("Claude uncertain rendering and cursor states stay closed", () => {
  const candidates = [
    [claudeReady.replace(claudePrefix, "! "), claudePane()],
    [claudeReady.replace(claudePrefix, "@coder "), claudePane()],
    [claudeReady.replace(claudePrefix, "❯ "), claudePane()],
    [claudeReady, { ...claudePane(), cursor: 3 }],
    [claudeReady, claudePane(3)],
    [claudeScreen(""), claudePane()],
    [claudeScreen("[Pasted text #1 +3 lines]"), claudePane(26)],
    [claudeScreen("Enter\n  C-c"), claudePane(7)],
    [claudeScreen("Enter suggestion"), claudePane(7)],
    [claudeScreen("x".repeat(39)), claudePane(41)],
    [claudeReady.replace("─".repeat(40), "─".repeat(39)), claudePane()],
    [claudeReady + "\nSelect an option", claudePane()],
    [claudeScreen("Enter", "  unrelated footer"), claudePane(7)],
  ];
  for (const [screen, pane] of candidates) {
    assert.equal(base.classifyProviderPane("claude-code", screen, pane).state, "unknown_state", screen);
  }
});

test("Claude input echo, disappearance and stale loading footer do not confirm acceptance or authorize replay", async () => {
  const draft = claudeScreen("Enter");
  const stale = claudeSource.busyFooter + "\nold output\n" + claudeReady;
  for (const after of [claudeReady, stale, claudeScreen("Enter", claudeSource.busyFooter), "unrecognized"]) {
    const fx = claudeFixture("Enter", [claudeReady, draft, draft, after]);
    await assert.rejects(fx.ask, reason("acceptance_uncertain"));
    assert.deepEqual(fx.inputs, ["\x1b[200~Enter\x1b[201~", "\r"]);
    assert.equal(fx.buffers.size, 0);
  }
});

test("Claude a decision at the final Enter guard prevents both first submit and retry", async () => {
  const draft = claudeScreen("Enter");
  const decision = "Switch model?\n❯ 1. Confirm\n  2. Cancel";
  for (const [screens, enters] of [[ [claudeReady, draft, decision], 0 ],
    [ [claudeReady, draft, draft, draft, decision], 1 ]]) {
    const fx = fixture({ provider: "claude-code", screens, paneFor: (screen) => {
      if (screen === decision) return "1|24|40|2";
      const text = screen.split("\n")[1]?.slice(2) || "";
      return `1|24|40|${text === claudeSource.placeholder ? 2 : text.length + 2}`;
    } });
    await assert.rejects(fx.ask, reason(enters ? "acceptance_uncertain" : "decision_required"));
    assert.equal(fx.inputs.filter((input) => input === "\r").length, enters);
    assert.equal(fx.buffers.size, 0);
  }
});

test("Claude summarized or changed drafts refuse before Enter instead of inferring the sent prompt", async () => {
  for (const [prompt, rendered] of [["first\nsecond\nthird", "[Pasted text #1 +3 lines]"],
    ["Enter", "Enter suggestion"], ["https://example.invalid", "[Pasted text #1]"]]) {
    const fx = claudeFixture(prompt, [claudeReady, claudeScreen(rendered)]);
    await assert.rejects(fx.ask, reason("unknown_state"));
    assert.deepEqual(fx.inputs, [`\x1b[200~${prompt}\x1b[201~`]);
    assert.equal(fx.buffers.size, 0);
  }
});

test("Antigravity isolated binary help strings do not establish a composer profile", async () => {
  for (const screen of ["Press Enter to send\nEsc to interrupt", claudeReady, claudeBusy]) {
    const fx = fixture({ screens: [screen], provider: "antigravity" });
    await assert.rejects(fx.ask, reason("unknown_state"));
    assert.deepEqual(fx.inputs, []);
  }
});

test("decision words in history and literal drafts do not impersonate focused Codex menus", async () => {
  for (const prompt of ["explain permission required", "Retry with a faster model?", "Select model", "Switch model?", "Do you want to proceed?",
    "Retry with a faster model?\n  2. Keep current model\n› 1. Switch model"]) {
    const history = "Permission required (historical output)\nRetry with a faster model?\n› 1. Switch model\n  2. Keep current model\n";
    const fx = fixture({ prompt, screens: [history + empty, history + pending(prompt), history + pending(prompt), history + working] });
    await fx.ask();
    assert.deepEqual(fx.inputs, [`\x1b[200~${prompt}\x1b[201~`, "\r"]);
  }
});

test("Claude exact decision titles in transcript and draft remain composer text", async () => {
  for (const prompt of ["Switch model?", "Change effort level?", "Select model", "permission required"]) {
    const history = "Switch model?\n❯ 1. Confirm\n  2. Cancel\n";
    const draft = claudeScreen(prompt);
    const fx = claudeFixture(prompt, [history + claudeReady, history + draft, history + draft, history + claudeBusy]);
    await fx.ask();
    assert.deepEqual(fx.inputs, [`\x1b[200~${prompt}\x1b[201~`, "\r"]);
  }
});

test("focused known menus and changed unknown menus remain closed", async () => {
  const draft = pending("Enter");
  for (const [screen, expected] of [[menu, "decision_required"],
    ["Unrecognized decision\n› 1. Confirm\n  2. Cancel", "unknown_state"]]) {
    const fx = fixture({ screens: [empty, draft, screen] });
    await assert.rejects(fx.ask, reason(expected));
    assert.deepEqual(fx.inputs, ["\x1b[200~Enter\x1b[201~"]);
  }
});

test("dot2_runtime_refuses_before_prompt_paste", async () => {
  const fx = fixture({ version: "3.6a-agents.2" });
  await assert.rejects(fx.ask, reason("paste_unavailable"));
  assert.deepEqual(fx.inputs, []);
  assert.equal(fx.calls.some((call) => ["capture-pane", "load-buffer"].includes(call.args[0]) && call.args.includes("-b")), false);
});

test("capability_probe_rejects_missing_submit_command_before_buffer", async () => {
  const fx = fixture();
  const run = (args, options) => args[0] === "list-commands"
    ? { status: 0, stderr: "", stdout: Buffer.from("paste-buffer [-dGpr]\n") } : fx.run(args, options);
  await assert.rejects(() => base.submitPrompt({ target: "%12", prompt: "Enter", provider: "codex", run }), reason("paste_unavailable"));
  assert.deepEqual(fx.inputs, []);
  assert.equal(fx.buffers.size, 0);
});

test("submit_nondiagnostic_failure_is_uncertain_without_retry", async () => {
  for (const submitResult of [{ status: 2, stderr: "agents: guarded submit refused" },
    { status: 1, stderr: "private transport" }, { status: null, signal: "SIGTERM" },
    () => { throw new Error("private spawn failure"); }]) {
    const fx = fixture({ screens: [empty, pending("Enter"), pending("Enter"), working], submitResult });
    await assert.rejects(fx.ask, reason("acceptance_uncertain"));
    assert.equal(fx.calls.filter((call) => call.args[0] === "agents-submit-v1").length, 1);
    assert.equal(fx.buffers.size, 0);
  }
});

test("submit_fixed_refusal_maps_first_and_retry_public_envelopes", async () => {
  const { buildAgentTools } = await import("../../gateway/src/tools/agent.js");
  for (const retry of [false, true]) {
    const fx = fixture({ screens: [empty, ...Array(5).fill(pending("Enter"))] });
    let submits = 0;
    const run = (args, options) => {
      if (args[0] === "agents-submit-v1" && ++submits === (retry ? 2 : 1)) {
        fx.buffers.delete(args[2]);
        return { status: 1, stderr: "agents: guarded submit refused\n" };
      }
      return fx.run(args, options);
    };
    const tools = buildAgentTools({ agentService: { ask: () => base.submitPrompt({ target: "%12", prompt: "Enter", provider: "codex", run, wait: async () => {} }) } });
    const envelope = await tools.find((tool) => tool.name === "agent.ask").handler({ sessionId: "sess", traceId: "tr", prompt: "private" });
    assert.equal(envelope.isError, true);
    assert.deepEqual(JSON.parse(envelope.content[0].text), { error: "AGENT_PROMPT_NOT_SUBMITTED", code: "AGENT_PROMPT_NOT_SUBMITTED",
      message: "prompt submission not confirmed", reason: retry ? "acceptance_uncertain" : "unknown_state" });
    assert.equal(submits, retry ? 2 : 1);
    assert.equal(fx.buffers.size, 0);
  }
});

test("submit_evidence_cleanup_is_owned_and_missing_buffer_tolerant", async () => {
  const fx = fixture({ screens: [empty, pending("Enter"), pending("Enter"), working] });
  await fx.ask();
  const captures = fx.calls.filter((call) => call.args[0] === "capture-pane" && call.args.includes("-b"));
  assert.ok(captures.length >= 4);
  const names = captures.map((call) => call.args[call.args.indexOf("-b") + 1]);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.every((name) => /^agents-submit-[0-9a-f-]{36}$/.test(name)));
  assert.equal(fx.calls.some((call) => call.args[0] === "send-keys"), false);
  assert.ok(fx.calls.filter((call) => call.args[0] === "save-buffer").every((call) => call.options.encoding === null));
  assert.equal(fx.buffers.size, 0);
});

test("capability probes require strict raw ASCII and exact empty-stderr success on every operation", async () => {
  for (const result of [{ status: 1, stdout: Buffer.from("3.6a-agents.3\n") },
    { status: 0, stdout: Buffer.from("3.6a-agents.3\n"), stderr: "warning" },
    { status: 0, stdout: Buffer.from([0xff]) },
    { status: 0, stdout: "3.6a-agents.3" },
    { status: 0, stdout: Buffer.from("3.6a-agents.30") }]) {
    const fx = fixture();
    const run = (args, options) => args.at(-1) === "#{version}" ? result : fx.run(args, options);
    await assert.rejects(() => base.submitPrompt({ target: "%12", prompt: "Enter", provider: "codex", run }), reason("paste_unavailable"));
    assert.equal(fx.buffers.size, 0);
    assert.deepEqual(fx.inputs, []);
  }
  for (const commands of ["unrelated agents-submit-v1\npaste-buffer [-dGpr]", "agents-submit-v10\npaste-buffer [-dGpr]",
    "agents-submit-v1\npaste-buffer [-dpr]\nunrelated [-G]"]) {
    const fx = fixture();
    const run = (args, options) => args[0] === "list-commands"
      ? { status: 0, stdout: Buffer.from(commands), stderr: "" } : fx.run(args, options);
    await assert.rejects(() => base.submitPrompt({ target: "%12", prompt: "Enter", provider: "codex", run }), reason("paste_unavailable"));
    assert.equal(fx.buffers.size, 0);
  }
  const fx = fixture({ screens: [empty, pending("Enter"), pending("Enter"), working, empty] });
  await fx.ask();
  const run = (args, options) => args.at(-1) === "#{version}"
    ? { status: 0, stdout: Buffer.from("3.6a-agents.2"), stderr: "" } : fx.run(args, options);
  await assert.rejects(() => base.submitPrompt({ target: "%12", prompt: "Enter", provider: "codex", run }), reason("paste_unavailable"));
  assert.equal(fx.inputs.filter((input) => input === "\r").length, 1);
});

test("invalid UTF-8 captured evidence refuses without replacement inference or keys", async () => {
  const fx = fixture();
  const run = (args, options) => args[0] === "save-buffer"
    ? { status: 0, stdout: Buffer.from([0xff]) } : fx.run(args, options);
  await assert.rejects(() => base.submitPrompt({ target: "%12", prompt: "Enter", provider: "codex", run }), reason("unknown_state"));
  assert.deepEqual(fx.inputs, []);
  assert.equal(fx.buffers.size, 0);
});

test("cleanup attempts every owned buffer but never suppresses a non-missing error or retries", async () => {
  const fx = fixture({ screens: [empty, pending("Enter"), pending("Enter"), working] });
  let deletes = 0;
  const run = (args, options) => {
    const result = fx.run(args, options);
    if (args[0] === "delete-buffer" && ++deletes === 1) return { status: 1, stderr: "private cleanup failure" };
    return result;
  };
  await assert.rejects(() => base.submitPrompt({ target: "%12", prompt: "Enter", provider: "codex", run, wait: async () => {} }), reason("acceptance_uncertain"));
  assert.ok(deletes >= 5);
  assert.equal(fx.buffers.size, 0);
  assert.equal(fx.inputs.filter((input) => input === "\r").length, 1);
});

for (const [name, stage, failure] of [
  ["post_cr_capture_failure_is_uncertain_without_retry", "after", "capture"],
  ["post_cr_invalid_metadata_is_uncertain_without_retry", "after", "metadata"],
  ["post_cr_invalid_utf8_is_uncertain_without_retry", "after", "utf8"],
  ["post_cr_retry_guard_capture_failure_is_uncertain_without_retry", "retry", "capture"],
  ["post_cr_retry_guard_metadata_failure_is_uncertain_without_retry", "retry", "metadata"],
  ["post_cr_retry_guard_utf8_failure_is_uncertain_without_retry", "retry", "utf8"],
]) test(name, async () => {
  const fx = fixture({ screens: [empty, ...Array(5).fill(pending("Enter"))] });
  let postCrCaptures = 0;
  const run = (args, options) => {
    const delivered = fx.inputs.includes("\r");
    const failNow = delivered && (stage === "after" || postCrCaptures >= 1);
    if (failNow && failure === "metadata" && args[0] === "display-message" && args.at(-1).startsWith("#{pid}|")) {
      return { status: 0, stdout: "100|%12|200|160|24|160|2\n" };
    }
    if (failNow && failure === "capture" && args[0] === "capture-pane") {
      fx.calls.push({ args, options });
      return { status: 1, stderr: "private capture failure" };
    }
    if (failNow && failure === "utf8" && args[0] === "save-buffer") {
      return { status: 0, stdout: Buffer.from([0xff]) };
    }
    const result = fx.run(args, options);
    if (delivered && args[0] === "save-buffer") postCrCaptures++;
    return result;
  };
  await assert.rejects(() => base.submitPrompt({ target: "%12", prompt: "Enter", provider: "codex", run, wait: async () => {} }), reason("acceptance_uncertain"));
  assert.equal(fx.inputs.filter((input) => input === "\r").length, 1);
  assert.equal(fx.calls.filter((call) => call.args[0] === "agents-submit-v1").length, 1);
  assert.equal(fx.buffers.size, 0);
});

for (const outcome of ["status2", "throws"]) {
  for (const cleanupFails of [false, true]) {
    test(`first_submit_${outcome}_cleanup_${cleanupFails ? "failure" : "success"}_preserves_uncertainty_and_one_cr`, async () => {
      const fx = fixture({ screens: [empty, pending("Enter"), pending("Enter"), working] });
      const deleted = [];
      const run = (args, options) => {
        if (args[0] === "delete-buffer") {
          deleted.push(args[2]);
          if (cleanupFails) {
            fx.calls.push({ args, options });
            return { status: 1, stderr: "private cleanup failure" };
          }
        }
        const result = fx.run(args, options);
        if (args[0] === "agents-submit-v1") {
          // The transport can fail after writing CR; it is unsafe to replay.
          if (outcome === "throws") throw new Error("private transport failure after CR");
          return { status: 2, stderr: "server exited" };
        }
        return result;
      };
      await assert.rejects(() => base.submitPrompt({ target: "%12", prompt: "Enter", provider: "codex", run, wait: async () => {} }), reason("acceptance_uncertain"));
      assert.deepEqual(fx.inputs, ["\x1b[200~Enter\x1b[201~", "\r"]);
      assert.equal(fx.inputs.filter((input) => input === "\r").length, 1);
      assert.equal(fx.calls.filter((call) => call.args[0] === "agents-submit-v1").length, 1);
      assert.equal(deleted.length, 4);
      assert.equal(new Set(deleted).size, 4);
      assert.equal(fx.buffers.size, cleanupFails ? 3 : 0);
    });
  }
}

for (const cleanupFails of [false, true]) {
  test(`first_submit_fixed_refusal_cleanup_${cleanupFails ? "failure" : "success"}_remains_pre_delivery`, async () => {
    const fx = fixture({ screens: [empty, pending("Enter"), pending("Enter")],
      submitResult: { status: 1, stderr: "agents: guarded submit refused\n" } });
    const deleted = [];
    const run = (args, options) => {
      if (args[0] === "delete-buffer") {
        deleted.push(args[2]);
        if (cleanupFails) {
          fx.calls.push({ args, options });
          return { status: 1, stderr: "private cleanup failure" };
        }
      }
      return fx.run(args, options);
    };
    await assert.rejects(() => base.submitPrompt({ target: "%12", prompt: "Enter", provider: "codex", run, wait: async () => {} }), reason(cleanupFails ? "transport_failed" : "unknown_state"));
    assert.deepEqual(fx.inputs, ["\x1b[200~Enter\x1b[201~"]);
    assert.equal(fx.inputs.filter((input) => input === "\r").length, 0);
    assert.equal(fx.calls.filter((call) => call.args[0] === "agents-submit-v1").length, 1);
    assert.equal(deleted.length, 4);
    assert.equal(new Set(deleted).size, 4);
    assert.equal(fx.buffers.size, cleanupFails ? 3 : 0);
  });
}
