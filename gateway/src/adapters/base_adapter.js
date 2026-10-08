import { captureSessionPrompt, answerSessionPrompt } from "./session_prompt.js";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { append as auditAppend } from "../core/audit.js";
import {
  buildDeleteBufferCmd, buildLoadBufferCmd, buildSubmitEvidenceCmd, buildSubmitStateCmd, buildGuardedSubmitCmd,
  buildPaneStateCmd, buildPasteBufferCmd, buildSendKeysCmd, buildSubmitCmd, tmuxSync,
} from "./tmux_client.js";

import { EffectiveAgentSelectionError } from "../core/orchestrator_profile.js";

export function workerEnv({ role, traceId, taskId = null }) {
  const env = {
    AGENTS_WORKER_ROLE: role,
    AGENTS_WORKER_TRACE_ID: traceId,
    AGENTS_WORKER_TASK_ID: taskId ?? "",
  };
  if (Object.values(env).some((value) => typeof value !== "string" || /[\r\n\0]/.test(value))) {
    throw new EffectiveAgentSelectionError("EFFECTIVE_SELECTION_INVALID", "effectiveSelection");
  }
  return env;
}

const activeSubmissions = new Set();
const codexContextFooter = /^\s*(?:\? for shortcuts\s+)?\d{1,3}% context left\s*$/;
const codexQueueFooter = /^ {2}tab to queue message *$/;
const codexWarningsFooter = /^\s*\? for shortcuts\s+⚠ \d+ warnings? · f2 to view\s*$/;
// Measured 0.160.1 status row; this is rendering evidence, not model selection.
const codexLiveStatus = /^ {2}GPT-6\.1-Sol medium fast · \S+\s*$/;
// Codex 0.160.1 status_surfaces.rs: explicit spinner frames, never acceptance alone.
const codexSpinnerStatus = /^ {2}GPT-6\.1-Sol medium fast · \S+ · [⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] *$/;
const codexWorking = /^• Working \([0-9hms .]+• esc to interrupt\) *$/;
// Codex rust-v0.160.1 history_cell/notices.rs and empty_state_animation/greetings.rs.
// The greeting varies between fresh threads, but is retained within one thread.
const codexStartupGreetings = new Set([
  "  Whoa, fancy meeting you here!",
  "  Look who’s at the keyboard.",
  "  Hello, you. Got an idea?",
  "  Nice to see you in these parts.",
  "  Pull up a prompt.",
  "  What brings you to this corner of the terminal?",
  "  Hey there. Big plans or little fixes?",
  "  What are we getting into today?",
  "  Got something you want to try?",
  "  What’s today’s little adventure?",
  "  Anything interesting on the docket?",
  "  Take your time. The cursor can wait.",
  "  A half-formed idea will do.",
  "  Come on in. There’s room for an idea.",
  "  You, me, and a blinking cursor.",
  "  It takes two to tango. What’s our first step?",
  "  You bring the idea. I’ll bring the brackets.",
  "  Your move, teammate.",
  "  What are we cooking up?",
  "  Shall we turn “what if” into something?",
  "  What’s the first thing on our napkin sketch?",
  "  Bring your unfinished thoughts.",
  "  You set the direction. We’ll work out the steps.",
  "  Ah, the terminal. A classic meeting spot.",
  "  Nice place you’ve got here. Very monospace.",
  "  Welcome to our little rectangle of possibility.",
  "  A cursor blinks. The plot thickens.",
  "  The prompt is yours.",
  "  Fancy a little quality terminal time?",
  "  How’s life between the brackets?",
  "  Shall we give this cursor a purpose?",
  "  A fresh prompt. An open question.",
  "  Your keyboard has entered the chat.",
  "  Hello, world. Hello, you.",
  "  Welcome to the blinking edge of possibility.",
  "  Any loose ends? Semicolons count.",
  "  Shall we make this terminal earn its keep?",
  "  Got an itch to fix a thing?",
  "  Show me the bit that’s being weird.",
  "  Greetings, fellow tinkerer.",
  "  Well, well, well. An idea approaches.",
  "  What’s today’s side quest?",
  "  Is this a plan day or a poke-around day?",
  "  Practical, peculiar, or a little of both?",
  "  Rough sketches welcome.",
  "  Shall we see where this goes?",
  "  All right. What have you got?",
  "  Back for another round?",
  "  Same terminal, new possibilities.",
  "  Welcome back. Familiar territory or a fresh adventure?",
  "  Follow the white cursor.",
  "  Welcome to the command line, Neo.",
  "  A glitch in the Matrix, or just a missing semicolon?",
  "  How deep does this codebase go?",
  "  Speak, friend, and enter a prompt.",
  "  One prompt to begin the journey.",
  "  May the source be with you.",
  "  These might be the bugs you’re looking for.",
  "  A new prompt awakens.",
  "  Forty-two is an answer. What’s the question?",
  "  It’s dangerous to code alone. Take a prompt.",
  "  The code must flow.",
  "  You rang? Metaphorically. You typed.",
  "  Hello again, carbon-based collaborator.",
  "  This looks like the start of a perfectly reasonable rabbit hole.",
  "  Shall we turn “huh?” into “aha!”?",
  "  Well, this terminal just got interesting.",
  "  The source is strong with this one.",
  "  There’s a perfectly good prompt with your name on it.",
  "  Here for a quick fix or the extended edition?",
  "  What’s the latest from your side of the keyboard?",
  "  Got a minute and a mildly unreasonable idea?",
  "  A hunch is a perfectly respectable starting point.",
  "  Hello again. What’s the plot this time?",
  "  Shall we make a little something out of nothing?",
  "  Welcome to the neighborhood. Lots of characters here.",
  "  Nice terminal. Does it come in widescreen?",
  "  Your cursor called. It wants a plot.",
  "  Shall we put some verbs after that cursor?",
  "  Welcome. There’s no dress code, just code.",
  "  This terminal has excellent conversational potential.",
  "  Got an idea that won’t stay on the napkin?",
  "  What are we building in this episode?",
  "  Bring a question. Bonus points if it’s a weird one.",
  "  What are we poking with a metaphorical stick?",
  "  Shall we make the thing that makes the other thing easier?",
  "  Welcome to the part where the idea gets interesting.",
  "  A long time ago, in a directory not so far away…"
]);
// Exact observed static notice; the interactive update picker is not this cell.
const codexStartupNotice = [
  "╭─────────────────────────────────────────────────────────────────────────────────────────────────────╮",
  "│ ✨ Update available! 0.160.1 -> 0.161.0                                                             │",
  "│ Run sh -c 'curl -fsSL https://chatgpt.com/codex/install.sh | CODEX_NON_INTERACTIVE=1 sh' to update. │",
  "│                                                                                                     │",
  "│ See full release notes:                                                                             │",
  "│ https://github.com/openai/codex/releases/latest                                                     │",
  "╰─────────────────────────────────────────────────────────────────────────────────────────────────────╯",
  "",
  "",
  "  >_ OpenAI Codex (v0.160.1)"
];
function codexUpdateWelcomeHeader(rows, width) {
  const greeting = rows[12]?.trimEnd();
  return [11, 12].every((index) => typeof rows[index] === "string" && rows[index].length <= width)
    && codexStartupNotice.every((row, index) => rows[index] === row)
    && /^ {5}(?:\/|~\/)[A-Za-z0-9_./-]+$/.test(rows[10])
    && /^ *$/.test(rows[11]) && codexStartupGreetings.has(greeting)
    && /^ *$/.test(rows[12].slice(greeting.length));
}
function codexUpdateWelcomeDraft(rows, width) {
  const status = `  GPT-6.1-Sol medium fast · ${rows[10]?.slice(5)}`;
  return codexUpdateWelcomeHeader(rows, width)
    && typeof rows[38] === "string" && rows[38].length <= width
    && rows[38].trimEnd() === status && /^ *$/.test(rows[38].slice(status.length))
    && rows[39] === " ".repeat(94) + "⚠ 2 warnings · f2 to view";
}
function codexUpdateWelcomeWork(rows, pane) {
  const status = `  GPT-6.1-Sol medium fast · ${rows[10]?.slice(5)} · `;
  return pane.width === 120 && pane.height === 40 && pane.cursor === 36 && pane.cursorX === 2
    && rows.length === 41 && rows[40] === "" && rows.every((row) => row.length <= pane.width)
    && codexUpdateWelcomeHeader(rows, pane.width)
    && rows.slice(13, 36).every((row, index) => index + 13 === 15
      ? /^› [\x20-\x7e]+$/.test(row) : index + 13 === 33 ? codexWorking.test(row) : /^ *$/.test(row))
    && /^› Ask Codex to do anything *$/.test(rows[36]) && /^ *$/.test(rows[37])
    && codexSpinnerStatus.test(rows[38]) && rows[38].startsWith(status)
    && rows[39] === "  ? for shortcuts" + " ".repeat(77) + "⚠ 2 warnings · f2 to view";
}
// Measured post-turn 0.160.1 Ready label clipped after an 87-column ASCII cwd.
function codexPostTurnPane(rows, pane, phase) {
  if (pane.width !== 120 || pane.height !== 40 || pane.cursor !== 36
    || rows.length !== 41 || rows[40] !== "" || rows.some((row) => row.length > pane.width)
    || !codexUpdateWelcomeHeader(rows, pane.width) || rows[10].slice(5).length !== 87
    || rows[38] !== `  GPT-6.1-Sol medium fast · ${rows[10].slice(5)} · R…`
    || !rows.slice(13, 36).every((row, index) => index + 13 === 15
      ? /^› [\x21-\x7e][\x20-\x7e]*$/.test(row) : index + 13 === 18
        ? /^• [\x21-\x7e][\x20-\x7e]*$/.test(row) : index + 13 === 20
          ? /^ {2}Worked for [0-9]{1,5}s • (?:[01][0-9]|2[0-3]):[0-5][0-9] *$/.test(row) : /^ *$/.test(row))
    || !/^ *$/.test(rows[37])) return null;
  let text = "";
  if (phase === "ready") {
    if (pane.cursorX !== 2 || !/^› Ask Codex to do anything *$/.test(rows[36])
      || rows[39] !== "  ? for shortcuts" + " ".repeat(77) + "⚠ 2 warnings · f2 to view") return null;
  } else if (phase === "draft") {
    text = rows[36].startsWith("› ") ? rows[36].slice(2) : "";
    if (!text || text === "Ask Codex to do anything" || /[^\x20-\x7e]/.test(text)
      || pane.cursorX !== text.length + 2 || pane.cursorX >= pane.width
      || rows[39] !== " ".repeat(94) + "⚠ 2 warnings · f2 to view") return null;
  } else return null;
  return { state: "composer", text, warningDraft: phase === "draft", identity: "36:39:120:40" };
}
function codexGap(rows, cursor, footer) {
  if ((codexWarningsFooter.test(rows[footer]) || codexQueueFooter.test(rows[footer]))
    && !(codexLiveStatus.test(rows[footer - 1]) || codexSpinnerStatus.test(rows[footer - 1]))) return false;
  return rows.slice(cursor + 1, footer).every((row, index) => row.trim() === ""
    || (cursor + 1 + index === footer - 1
      && (codexWarningsFooter.test(rows[footer]) || codexQueueFooter.test(rows[footer]))
      && (codexLiveStatus.test(row) || codexSpinnerStatus.test(row))));
}
function invalidText(text, allowNewlines) {
  return typeof text !== "string" || !text || !text.isWellFormed()
    || Array.from(text).some((character) => {
      const code = character.codePointAt(0);
      return (code < 32 && !(allowNewlines && code === 10)) || (code >= 127 && code <= 159);
    });
}
function activeDecision(provider, rows, pane) {
  if (provider === "codex") {
    const footer = rows.findLastIndex((row) => codexContextFooter.test(row) || codexWarningsFooter.test(row) || codexQueueFooter.test(row));
    const start = rows.findLastIndex((row, index) => index < footer && /^[›»](?: |$)/.test(row));
    if (start >= 0 && pane.cursor >= start && pane.cursor < footer
      && codexGap(rows, pane.cursor, footer)) return false;
  }
  if (provider === "claude-code") {
    const borders = rows.map((row, index) => row === "─".repeat(pane.width) ? index : -1)
      .filter((index) => index >= 0);
    const [top, bottom] = borders.slice(-2);
    if (top !== undefined && bottom === top + 2 && pane.cursor === top + 1) return false;
  }
  const titles = {
    codex: /^(?:Retry with a faster model\?|Do you trust this directory\?|Do you want to (?:proceed|allow)\?)$/i,
    "claude-code": /^(?:Select model|Switch model\?|Change effort level\?|Yes, I trust this folder|Do you trust this folder\?)$/i,
  };
  const title = titles[provider];
  if (title) {
    for (let index = 0; index < rows.length; index++) {
      if (!title.test(rows[index].trim())) continue;
      const choices = rows.slice(index + 1, index + 9);
      const selected = choices.findIndex((row) => /^\s*[›❯»]\s+\d+\.\s+\S/.test(row));
      // A title, multiple numbered choices and focus in that panel distinguish
      // an interactive menu from identical transcript words or a literal draft.
      if (selected >= 0 && choices.some((row) => /^\s+\d+\.\s+\S/.test(row))
        && pane.cursor === index + 1 + selected) return true;
    }
  }
  if (provider === "opencode") {
    const metadata = rows.findLastIndex((row) => /^┃ {2}(?:Build|Plan)(?: auto)? · /.test(row));
    const title = rows.findLastIndex((row) => row.trim() === "Permission required");
    // The source permission overlay is below the prompt, not earlier history.
    if (title > metadata && metadata >= 0
      && rows.slice(title + 1, title + 4).some((row) => /Allow once\s+Allow always\s+Reject/.test(row))) return true;
  }
  return false;
}

function submissionError(reason) {
  const error = new Error("prompt submission not confirmed");
  error.code = "AGENT_PROMPT_NOT_SUBMITTED";
  error.reason = reason;
  return error;
}

function checkedRun(run, args, options) {
  let result;
  try { result = run(args, options); } catch { throw submissionError("transport_failed"); }
  if (result?.status !== 0) {
    const unavailable = args[0] === "paste-buffer"
      && ["agents: bracketed paste unavailable", "command paste-buffer: unknown flag -G"].includes(result?.stderr?.trim());
    throw submissionError(unavailable ? "paste_unavailable" : "transport_failed");
  }
  return result.stdout || "";
}

function paneState(run, target) {
  const fields = checkedRun(run, buildPaneStateCmd({ target })).trim().split("|");
  if (fields.length !== 8 || !/^%\d+$/.test(fields[0])
    || fields.slice(1).some((field) => !/^\d+$/.test(field))) {
    throw submissionError("unknown_state");
  }
  return { target: fields[0], mode: fields[1], inputOff: fields[2], synchronized: fields[3],
    cursor: Number(fields[4]), height: Number(fields[5]), width: Number(fields[6]), cursorX: Number(fields[7]) };
}

// Deliberately narrow source-backed and observed profiles. Unknown layouts/providers stay closed.
// Evidence and the unverified live/version boundary are recorded in gateway/README.md.
export function classifyProviderPane(provider, snapshot, pane, phase = "ready") {
  if (pane.mode !== "0" || pane.inputOff !== "0" || pane.synchronized !== "0") return { state: "unknown_state" };
  const rows = snapshot.split("\n");
  if (activeDecision(provider, rows, pane)) return { state: "decision_required" };
  if (provider === "codex") {
    // Raw 0.160.1 update-notice viewport: use the existing first-Enter freshness proof.
    if (codexUpdateWelcomeWork(rows, pane)) {
      return { state: "busy", text: "", modernWork: true, welcomeWork: true,
        workRow: 33, identity: "36:39:120:40" };
    }
    const postTurn = codexPostTurnPane(rows, pane, phase);
    if (postTurn) return postTurn;
    // The shifted startup header cannot borrow a generic draft/footer profile.
    if (phase === "draft" && rows[9]?.trim() === ">_ OpenAI Codex (v0.160.1)"
      && !codexUpdateWelcomeDraft(rows, pane.width)) return { state: "unknown_state" };
    // One measured post-paste footer variant, never initial input or acceptance evidence.
    if (/^ +⚠ 2 warnings · f2 to view *$/.test(rows[39])) {
      const text = rows[36]?.startsWith("› ") ? rows[36].slice(2) : "";
      const updateWelcomeDraft = codexUpdateWelcomeDraft(rows, pane.width);
      if (phase !== "draft" || pane.width !== 120 || pane.height !== 40 || pane.cursor !== 36
        || rows.length !== 41 || rows[40] !== ""
        || !(rows[1]?.trim() === ">_ OpenAI Codex (v0.160.1)" || updateWelcomeDraft)
        || !codexLiveStatus.test(rows[38]) || rows[37]?.trim() !== ""
        || rows.slice(13, 36).some((row) => row.trim() !== "")
        || rows.slice(0, 36).some((row) => codexWorking.test(row))
        || !text || text === "Ask Codex to do anything" || text.length >= 800 || /[^\x20-\x7e]/.test(text)
        || pane.cursorX !== text.length + 2 || pane.cursorX >= pane.width) return { state: "unknown_state" };
      return { state: "composer", text, warningDraft: true, updateWelcomeDraft, identity: "36:39:120:40" };
    }
    const footer = rows.findLastIndex((row) => codexContextFooter.test(row) || codexWarningsFooter.test(row) || codexQueueFooter.test(row));
    const start = rows.findLastIndex((row, index) => index < footer && /^[›»](?: |$)/.test(row));
    if (((codexWarningsFooter.test(rows[footer]) || codexQueueFooter.test(rows[footer]))
      && (pane.width !== 120 || pane.height !== 40))
      || start < 0 || footer - start < 2 || footer - start > 12
      || pane.cursor < start || pane.cursor >= footer
      || !codexGap(rows, pane.cursor, footer)) return { state: "unknown_state" };
    const textRows = rows.slice(start, pane.cursor + 1);
    if (textRows.slice(1).some((row) => !row.startsWith("  "))) return { state: "unknown_state" };
    let text = [textRows[0].replace(/^\s*[›»] ?/, ""), ...textRows.slice(1).map((row) => row.slice(2))].join("\n");
    if (text.replace(/ +$/, "") === "Ask Codex to do anything" && pane.cursorX === 2 && pane.cursor === start) text = "";
    // The measured queue footer identifies only a fully visible pasted draft.
    // It cannot authorize initial input or prove acceptance, even with a placeholder.
    if (codexQueueFooter.test(rows[footer]) && (phase !== "draft" || !text
      || pane.cursor !== start || /[^\x20-\x7e]/.test(text)
      || pane.cursorX !== text.length + 2 || pane.cursorX >= pane.width
      || rows.slice(footer + 1).some((row) => row.trim() !== ""))) return { state: "unknown_state" };
    const status = rows.slice(Math.max(0, start - 2), start).join("\n");
    // Measured 0.160.1 welcome viewport: first-turn Working sits three rows above input.
    const welcomeWork = pane.width === 120 && pane.height === 40 && start === 36 && footer === 39
      && rows.length === 41 && rows[40] === ""
      && rows[1]?.trim() === ">_ OpenAI Codex (v0.160.1)"
      && codexWorking.test(rows[33]) && rows[34]?.trim() === "" && rows[35]?.trim() === ""
      && codexSpinnerStatus.test(rows[38]);
    const modernWork = welcomeWork || (codexLiveStatus.test(rows[footer - 1]) || codexSpinnerStatus.test(rows[footer - 1]))
      && codexWorking.test(rows[start - 4])
      && rows[start - 3]?.trim() === "" && rows[start - 1]?.trim() === "";
    if (codexSpinnerStatus.test(rows[footer - 1]) && !modernWork) return { state: "unknown_state" };
    const busy = modernWork || /Working \([0-9hms .]+[•·] esc to interrupt\)/.test(status);
    // A cursor outside the measured composer cannot prove that Enter targets it.
    return { state: busy ? "busy" : "composer", text, modernWork, welcomeWork,
      workRow: welcomeWork ? 33 : modernWork ? start - 4 : codexWorking.test(rows[start - 2]) ? start - 2 : null,
      identity: `${start}:${footer}:${pane.width}:${pane.height}` };
  }
  if (provider === "pi") {
    const borders = rows.map((row, index) => /^─{3,}$/.test(row) ? index : -1).filter((index) => index >= 0);
    const [top, bottom] = borders.slice(-2);
    if (top === undefined || bottom - top < 2 || bottom - top > 12
      || !/^pi v0\.73\.1$/m.test(snapshot)) return { state: "unknown_state" };
    const text = rows.slice(top + 1, bottom).map((row) => row.startsWith(" ") ? row.slice(1) : row).join("\n");
    const busy = /Working\.\.\.(?: \(esc to interrupt\))?/.test(rows.slice(Math.max(0, top - 2), top).join("\n"));
    if (!busy && (pane.cursor <= top || pane.cursor >= bottom)) return { state: "unknown_state" };
    return { state: busy ? "busy" : "composer", text, identity: `${top}:${bottom}:${pane.width}:${pane.height}` };
  }
  if (provider === "opencode") {
    const metadata = rows.findLastIndex((row) => /^┃ {2}(?:Build|Plan)(?: auto)? · \S.+\S\s*$/.test(row));
    let top = metadata;
    while (top > 0 && rows[top - 1].startsWith("┃")) top--;
    const end = metadata - 2;
    const footer = rows[metadata + 2] || "";
    if (metadata < 0 || !/^┃\s*$/.test(rows[top]) || !/^┃\s*$/.test(rows[metadata - 1])
      || !/^╹▀{3,}\s*$/.test(rows[metadata + 1]) || !/\bcommands\s*$/.test(footer)
      || end - top < 1 || end - top > 12 || pane.cursor < top + 1 || pane.cursor > end
      || pane.cursorX < 3) return { state: "unknown_state" };
    const textRows = rows.slice(top + 1, end + 1);
    if (textRows.some((row) => !row.startsWith("┃  "))
      || textRows.some((row) => row.includes("[Pasted ~"))) return { state: "unknown_state" };
    let text = textRows.map((row) => row.slice(3)).join("\n");
    if (/^Ask anything\.\.\. ".*"$/.test(text) && pane.cursorX === 3 && pane.cursor === top + 1) text = "";
    const busy = /\besc (?:again to )?interrupt\b/.test(footer);
    return { state: busy ? "busy" : "composer", text, identity: `${top}:${metadata}:${pane.width}:${pane.height}` };
  }
  if (provider === "claude-code") {
    // 2.1.292 embedded nE/RC/Xe/qWe/OWt: default Unicode single-line composer.
    // Exact anchors live with the source fixture; no live acceptance is implied.
    const borders = rows.map((row, index) => row === "─".repeat(pane.width) ? index : -1)
      .filter((index) => index >= 0);
    const [top, bottom] = borders.slice(-2);
    if (top === undefined || bottom !== top + 2 || pane.cursor !== top + 1
      || !rows[top + 1].startsWith("❯\u00a0") || pane.cursorX < 2 || pane.cursorX >= pane.width) return { state: "unknown_state" };
    const footer = rows[bottom + 1]?.trim();
    const busy = footer === "esc to interrupt";
    // 2.1.293 measured idle layouts: blank gap with agents hint, or a local
    // status row with either observed auto-mode footer. Neither proves acceptance.
    const liveIdle = pane.width === 120 && pane.height === 40
      && ((footer === "" && rows[bottom + 2]?.trim() === "⏵⏵ auto mode on (shift+tab to cycle) · ← for agents")
        || (/^ {2}[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+:\/[A-Za-z0-9_./-]+\s*$/.test(rows[bottom + 1] || "")
          && ["⏵⏵ auto mode on (shift+tab to cycle)", "⏵⏵ auto mode on (shift+tab to cycle) · ← for agents"]
            .includes(rows[bottom + 2]?.trim())))
      && rows.slice(bottom + 3).every((row) => row.trim() === "");
    if ((!busy && footer !== "? for shortcuts" && !liveIdle)
      || (!liveIdle && rows.slice(bottom + 2).some((row) => row.trim() !== ""))) return { state: "unknown_state" };
    let text = rows[top + 1].slice(2);
    // No inferred text from summaries, viewport clipping, ghost text or wide glyphs.
    if (text.length >= 800 || /[^\x20-\x7e]/.test(text) || /^\[Pasted /.test(text)) return { state: "unknown_state" };
    if (/^Try "[^"]+"$/.test(text) && pane.cursorX === 2) text = "";
    else if (pane.cursorX !== text.length + 2) return { state: "unknown_state" };
    // A blank idle editor can conceal a placeholder; that layout is unproven.
    if (!busy && text === "" && rows[top + 1] === "❯\u00a0") return { state: "unknown_state" };
    return { state: busy ? "busy" : "composer", text, identity: `${top}:${bottom}:${pane.width}:${pane.height}` };
  }
  return { state: "unknown_state" };
}

function capability(run) {
  const probe = (args) => {
    let result;
    try { result = run(args, { encoding: null }); } catch { throw submissionError("paste_unavailable"); }
    if (result?.status !== 0 || result.error || result.signal || (result.stderr?.length || 0) !== 0
      || !Buffer.isBuffer(result.stdout) || result.stdout.some((byte) => byte > 127)) {
      throw submissionError("paste_unavailable");
    }
    return result.stdout.toString("ascii").trim();
  };
  if (probe(["display-message", "-p", "#{version}"]) !== "3.6a-agents.3") throw submissionError("paste_unavailable");
  const lines = probe(["list-commands"]).split("\n");
  if (!lines.some((line) => /^agents-submit-v1(?: |$)/.test(line))
    || !lines.some((line) => /^paste-buffer(?: |$)/.test(line) && /\[-[^\]]*G[^\]]*\]/.test(line))) {
    throw submissionError("paste_unavailable");
  }
}

function observe(run, target, provider, owned, phase = "ready") {
  const fields = checkedRun(run, buildSubmitStateCmd({ target })).trim().split("|");
  const limits = [9223372036854775807n, null, 9223372036854775807n, 2147483647n, 2147483647n, 2147483647n, 2147483647n];
  if (fields.length !== 7 || fields[1] !== target || !/^%(?:0|[1-9][0-9]*)$/.test(target)
    || BigInt(target.slice(1)) > 4294967295n
    || fields.some((field, index) => index !== 1 && (!/^(?:0|[1-9][0-9]*)$/.test(field)
      || BigInt(field) > limits[index] || BigInt(field) < (index === 0 || index === 2 ? 2n : index < 5 ? 1n : 0n)))
    || Number(fields[5]) >= Number(fields[3]) || Number(fields[6]) >= Number(fields[4])) {
    throw submissionError("unknown_state");
  }
  const pane = paneState(run, target);
  if (pane.target !== target || pane.width !== Number(fields[3]) || pane.height !== Number(fields[4])
    || pane.cursorX !== Number(fields[5]) || pane.cursor !== Number(fields[6])) throw submissionError("unknown_state");
  const buffer = `agents-submit-${randomUUID()}`;
  owned.add(buffer);
  checkedRun(run, buildSubmitEvidenceCmd({ target, buffer }));
  const raw = checkedRun(run, ["save-buffer", "-b", buffer, "-"], { encoding: null });
  let snapshot;
  try {
    if (!Buffer.isBuffer(raw)) throw new Error("raw capture required");
    snapshot = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(raw);
  } catch { throw submissionError("unknown_state"); }
  return { ...classifyProviderPane(provider, snapshot, pane, phase), snapshot, buffer,
    mode: pane.mode, inputOff: pane.inputOff, synchronized: pane.synchronized,
    serverPid: fields[0], target, panePid: fields[2], width: fields[3], height: fields[4], cursorX: fields[5], cursorY: fields[6] };
}

function guardedSubmit(run, observation, attempt) {
  let result;
  try { result = run(buildGuardedSubmitCmd(observation)); } catch { throw submissionError("acceptance_uncertain"); }
  if (result?.status === 0 && !result.error && !result.signal && !(result.stderr?.length)) return;
  const diagnostic = Buffer.isBuffer(result?.stderr) ? result.stderr.toString("utf8") : result?.stderr;
  if (result?.status === 1 && !result.error && !result.signal
    && ["agents: guarded submit refused", "agents: guarded submit refused\n"].includes(diagnostic)) {
    throw submissionError(attempt === 0 ? "unknown_state" : "acceptance_uncertain");
  }
  throw submissionError("acceptance_uncertain");
}

function cleanupBuffer(run, buffer) {
  let result;
  try { result = run(buildDeleteBufferCmd({ buffer })); } catch { throw submissionError("transport_failed"); }
  const diagnostic = Buffer.isBuffer(result?.stderr) ? result.stderr.toString("utf8") : result?.stderr;
  if (result?.status === 0 && !result.error && !result.signal) return;
  if (result?.status === 1 && !result.error && !result.signal
    && [`unknown buffer: ${buffer}`, `unknown buffer: ${buffer}\n`].includes(diagnostic)) return;
  throw submissionError("transport_failed");
}

function cleanupOwnedBuffers(run, owned, failureReason) {
  let cleanupError;
  for (const name of owned) {
    try { cleanupBuffer(run, name); } catch (error) { cleanupError ||= error; }
  }
  if (cleanupError) throw submissionError(failureReason);
}

function requireComposer(observation, text, identity) {
  if (observation.state !== "composer") throw submissionError(observation.state);
  if (observation.text !== text || (identity && observation.identity !== identity)) {
    throw submissionError("unknown_state");
  }
}

function freshCodexSecondTurn(ready, pending, guard, after, prompt, attempt) {
  // Measured second-turn witness only; never grants readiness or another Enter.
  if (attempt !== 0 || !pending.warningDraft || !guard.warningDraft
    || [ready, pending, after].some((frame) => ["serverPid", "target", "panePid", "width", "height"]
      .some((key) => frame[key] !== guard[key]))
    || after.mode !== "0" || after.inputOff !== "0" || after.synchronized !== "0"
    || after.cursorY !== "36" || after.cursorX !== "2"
    || /[^\x20-\x7e]/.test(prompt) || prompt.endsWith(" ")) return false;
  const prior = [ready, pending, guard].map((frame) => frame.snapshot.split("\n"));
  const rows = after.snapshot.split("\n");
  if (!codexPostTurnPane(prior[0], { width: Number(ready.width), height: Number(ready.height),
    cursor: Number(ready.cursorY), cursorX: Number(ready.cursorX) }, "ready")
    || rows.length !== 41 || rows[40] !== "" || rows.some((row) => row.length > 120)
    || prior.some((before) => rows.slice(0, 23).some((row, index) => row !== before[index]))
    || rows[23].replace(/ +$/, "") !== `› ${prompt}`
    || rows.filter((row) => row.replace(/ +$/, "") === `› ${prompt}`).length !== 1
    || prior.some((before) => before.slice(0, 36).some((row) => row.replace(/ +$/, "") === `› ${prompt}`))
    || rows.slice(36).some((row, index) => row !== prior[0][index + 36])) return false;
  // Completion is a newly inserted assistant cell AND separator, not the old reply.
  const working = codexWorking.test(rows[33]);
  const completed = /^• [\x21-\x7e][\x20-\x7e]*$/.test(rows[26])
    && /^ {2}Worked for [0-9]{1,5}s • (?:[01][0-9]|2[0-3]):[0-5][0-9] *$/.test(rows[28]);
  return (working || completed) && rows.slice(24, 36).every((row, index) => working
    ? index + 24 === 33 || /^ *$/.test(row)
    : [26, 28].includes(index + 24) || /^ *$/.test(row));
}

function freshCodexWork(ready, pending, guard, after, prompt, attempt) {
  if (after.workRow === null || after.workRow === undefined
    || ["serverPid", "target", "panePid", "width", "height"].some((key) => after[key] !== guard[key])) return false;
  // This welcome witness is first-Enter only, with every ask frame bound to the same pane.
  if (after.welcomeWork && (attempt !== 0
    || [ready, pending].some((frame) => ["serverPid", "target", "panePid", "width", "height"]
      .some((key) => frame[key] !== guard[key])))) return false;
  const prior = (after.welcomeWork ? [ready, pending, guard] : [ready, guard])
    .map((observation) => observation.snapshot.split("\n").slice(0, Number(observation.cursorY)));
  // Ignore clock changes and row movement: a prior Working row is stale evidence.
  if (prior.some((rows) => rows.some((row) => codexWorking.test(row)))) return false;
  if (!after.modernWork) return true; // Retained source profile: newly appearing active Working row.
  if (/[^\x20-\x7e]/.test(prompt) || prompt.endsWith(" ")) return false;
  const rows = after.snapshot.split("\n");
  const echo = `› ${prompt}`;
  const echoes = rows.slice(0, after.workRow).map((row, index) => row.replace(/ +$/, "") === echo ? index : -1)
    .filter((index) => index >= 0);
  if (echoes.length !== 1) return false;
  const index = echoes[0];
  if (after.welcomeWork && (index !== 15 || !rows.slice(16, 33).every((row) => row.trim() === ""))) return false;
  // A newly inserted user history cell, not old history shifted into the viewport.
  return prior.every((before) => !before.some((row) => row.replace(/ +$/, "") === echo)
    && before[index]?.trim() === "" && rows.slice(0, index).every((row, offset) => row === before[offset]))
    && !rows.slice(index + 1, after.workRow).some((row) => /^› /.test(row));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const boundedDelay = (value, fallback, max) => Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : fallback;

function freshClaudeResponse(spawn, ready, pending, guard, after, prompt) {
  // Operator option 1: only a locally recorded fresh plain launch's first ask.
  // This is the measured 2.1.293 single-line completed layout, not a turn ID.
  const identity = ["serverPid", "target", "panePid"];
  // Geometry is pinned at the first ask, allowing a same-process pre-ask resize.
  if (!spawn || [ready, pending, guard, after].some((frame) => identity.some((key) => frame[key] !== spawn[key]))
    || [pending, guard, after].some((frame) => ["width", "height"].some((key) => frame[key] !== ready[key]))
    || after.mode !== "0" || after.inputOff !== "0" || after.synchronized !== "0"
    || after.width !== "120" || after.height !== "40" || after.cursorY !== "36" || after.cursorX !== "2"
    || /[^\x20-\x7e]/.test(prompt) || prompt.endsWith(" ")) return false;
  const prior = [ready, pending, guard].map((frame) => frame.snapshot.split("\n"));
  const rows = after.snapshot.split("\n");
  if ([...prior, rows].some((lines) => lines.length !== 41 || lines[40] !== "")
    || prior.some((lines) => lines.slice(0, 35).some((row) => row.trim() !== ""))
    || rows[35] !== "─".repeat(120) || rows[37] !== rows[35]
    || !/^❯\u00a0 *$/.test(rows[36])
    || rows[38] !== prior[2][38]
    || rows[39]?.trim() !== "⏵⏵ auto mode on (shift+tab to cycle) · ← for agents") return false;
  const echo = `❯ ${prompt}`;
  const echoes = rows.slice(0, 35).map((row, index) => row.replace(/ +$/, "") === echo ? index : -1)
    .filter((index) => index >= 0);
  if (echoes.length !== 1) return false;
  const index = echoes[0];
  // A blank transcript excludes rendered prior turns and shifted/spoofed cells.
  // Require exactly the measured user cell, gap, and printable assistant cell.
  return index + 2 < 35 && /^● [\x21-\x7e][\x20-\x7e]*$/.test(rows[index + 2])
    && rows.slice(0, 35).every((row, offset) => offset === index || offset === index + 2 || row.trim() === "")
    && prior.every((lines) => rows.slice(0, index).every((row, offset) => row === lines[offset]));
}

function freshClaude294Response(spawn, ready, pending, guard, after, prompt, working = false) {
  // Measured first-ask layout only. The launch header is preserved, not history.
  const identity = ["serverPid", "target", "panePid"];
  // Geometry is pinned at the first ask, allowing a same-process pre-ask resize.
  if (!spawn || [ready, pending, guard, after].some((frame) => identity.some((key) => frame[key] !== spawn[key]))
    || [pending, guard, after].some((frame) => ["width", "height"].some((key) => frame[key] !== ready[key]))
    || after.mode !== "0" || after.inputOff !== "0" || after.synchronized !== "0"
    || after.width !== "120" || after.height !== "40" || after.cursorY !== "36" || after.cursorX !== "2"
    || /[^\x20-\x7e]/.test(prompt) || prompt.endsWith(" ")) return false;
  const prior = [ready, pending, guard].map((frame) => frame.snapshot.split("\n"));
  const rows = after.snapshot.split("\n");
  const header = prior[0].slice(0, 4);
  if (header[0] !== "" || header[1] !== " ▐▛███▛█   Claude Code v2.1.294"
    || header[2] !== "▝▜██████▀  Opus 5.5 with medium effort · Claude Max"
    || !/^ ▝▝ {3}▝▝ {3}\/[A-Za-z0-9_./-]+$/.test(header[3])
    || [...prior, rows].some((lines) => lines.length !== 41 || lines[40] !== ""
      || header.some((row, index) => lines[index] !== row)
      || lines[34] !== " ".repeat(100) + "◐ medium · /effort")
    || prior.some((lines) => lines.slice(4, 34).some((row) => row.trim() !== ""))
    || rows[35] !== "─".repeat(120) || rows[37] !== rows[35]
    || !/^❯\u00a0 *$/.test(rows[36]) || rows[38] !== prior[2][38]
    || rows[39]?.trim() !== "⏵⏵ auto mode on (shift+tab to cycle) · ← for agents"
    || rows[6] !== `❯ ${prompt}` || rows[7] !== "") return false;
  if (working) {
    // 2.1.294 binary frame set; a strict word also covers configured verbs.
    // Return the per-turn verb so animated glyphs cannot hide a changed turn.
    // Observed pre-assistant transient: empty cell and bare spinner only.
    const spinner = rows[8] === ""
      ? /^[·✢*✶✻✽] ([A-Z][A-Za-z]*(?:-[a-z]+)*)…$/.exec(rows[33])
      : rows[8] === "●" ? /^[·✢*✶✻✽] ([A-Z][A-Za-z]*(?:-[a-z]+)*)… \(\d+s · ↓ \d+ tokens\)$/.exec(rows[33]) : null;
    return spinner
      && rows.slice(4, 34).every((row, index) => [6, 8, 33].includes(index + 4) || row.trim() === "")
      ? spinner[1] : false;
  }
  return /^● [\x21-\x7e][\x20-\x7e]*$/.test(rows[8])
    // Exactly the binary's kg set, gated above by the 2.1.294 header.
    && /^✻ (?:Baked|Brewed|Churned|Cogitated|Cooked|Crunched|Sautéed|Worked) for \d+s · done \d{1,2}:\d{2} [AP]M$/.test(rows[10])
    && rows.slice(4, 34).every((row, index) => [6, 8, 10].includes(index + 4) || row.trim() === "");
}

export async function submitPrompt({ target, prompt, provider, config = {}, run = tmuxSync, wait = sleep, firstPromptProcess = null }) {
  if (invalidText(prompt, true)) throw submissionError("invalid_text");
  const pane = paneState(run, target);
  target = pane.target;
  if (activeSubmissions.has(target)) throw submissionError("concurrent_ask");
  activeSubmissions.add(target);
  let buffer;
  let delivered = false;
  const owned = new Set();
  try {
    capability(run);
    const ready = observe(run, target, provider, owned);
    requireComposer(ready, "");
    buffer = `agents-prompt-${randomUUID()}`;
    owned.add(buffer);
    checkedRun(run, buildLoadBufferCmd({ buffer }), { input: prompt });
    checkedRun(run, buildPasteBufferCmd({ target, buffer }));
    await wait(boundedDelay(config.tmuxSubmitDelayMs, 150, 1000));
    const pending = observe(run, target, provider, owned, "draft");
    requireComposer(pending, prompt);
    for (let attempt = 0; attempt < 2; attempt++) {
      const guard = observe(run, target, provider, owned, "draft");
      if (attempt === 0) requireComposer(guard, prompt, pending.identity);
      else if (guard.state !== "composer" || guard.text !== prompt || guard.identity !== pending.identity) {
        throw submissionError("acceptance_uncertain");
      }
      if (pending.updateWelcomeDraft || guard.updateWelcomeDraft) {
        // Ready's footer is measured separately; a warning transition stays closed.
        if (ready.snapshot.split("\n")[39] !== "  ? for shortcuts" + " ".repeat(77) + "⚠ 2 warnings · f2 to view") {
          throw submissionError("unknown_state");
        }
      }
      if (pending.warningDraft || guard.warningDraft) {
        // No footer transition or process drift can authorize this variant's first Enter.
        if (attempt !== 0 || !pending.warningDraft || !guard.warningDraft || guard.snapshot !== pending.snapshot
          || [ready, pending].some((frame) => ["serverPid", "target", "panePid", "width", "height"]
            .some((key) => frame[key] !== guard[key]))
          || ready.snapshot.split("\n").slice(0, 36).join("\n") !== pending.snapshot.split("\n").slice(0, 36).join("\n")
          || ready.snapshot.split("\n")[38] !== pending.snapshot.split("\n")[38]) throw submissionError("unknown_state");
      }
      guardedSubmit(run, guard, attempt);
      delivered = true;
      await wait(boundedDelay(config.tmuxAskDelayMs, 1500, 5000));
      let after = observe(run, target, provider, owned, "draft");
      if (provider === "claude-code" && attempt === 0) {
        if (freshClaudeResponse(firstPromptProcess, ready, pending, guard, after, prompt)
          || freshClaude294Response(firstPromptProcess, ready, pending, guard, after, prompt)) {
          return { snapshot: after.snapshot, dryRun: false };
        }
        const workingVerb = freshClaude294Response(firstPromptProcess, ready, pending, guard, after, prompt, true);
        if (workingVerb) {
          // Observation only: never re-enter the retry path after this witness.
          for (let poll = 0; poll < 8; poll++) {
            await wait(1000);
            after = observe(run, target, provider, owned, "draft");
            if (freshClaude294Response(firstPromptProcess, ready, pending, guard, after, prompt)) {
              return { snapshot: after.snapshot, dryRun: false };
            }
            if (freshClaude294Response(firstPromptProcess, ready, pending, guard, after, prompt, true) !== workingVerb) {
              throw submissionError("acceptance_uncertain");
            }
          }
          throw submissionError("acceptance_uncertain");
        }
      }
      if (provider === "codex" && freshCodexSecondTurn(ready, pending, guard, after, prompt, attempt)) {
        return { snapshot: after.snapshot, dryRun: false };
      }
      if (after.state === "busy" && after.text === ""
        && (provider !== "codex" || freshCodexWork(ready, pending, guard, after, prompt, attempt))) {
        return { snapshot: after.snapshot, dryRun: false };
      }
      if (after.state !== "composer" || after.text !== prompt || after.identity !== pending.identity) {
        throw submissionError("acceptance_uncertain");
      }
    }
    throw submissionError("not_submitted");
  } catch (error) {
    // A nondiagnostic submit may have written CR before reporting failure.
    if (error.reason === "acceptance_uncertain") delivered = true;
    if (delivered && error.reason !== "not_submitted") throw submissionError("acceptance_uncertain");
    throw error;
  } finally {
    try {
      cleanupOwnedBuffers(run, owned, delivered ? "acceptance_uncertain" : "transport_failed");
    } finally {
      activeSubmissions.delete(target);
    }
  }
}

export async function submitLaunchCommand({ target, line, config = {}, run = tmuxSync, wait = sleep }) {
  if (invalidText(line, false)) throw submissionError("invalid_text");
  checkedRun(run, buildSendKeysCmd({ target, line }));
  await wait(boundedDelay(config.tmuxSubmitDelayMs, 150, 1000));
  checkedRun(run, buildSubmitCmd({ target }));
}

export class CwdViolation extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "CwdViolation";
    this.details = details;
  }
}

function realpathOrViolation(target, message) {
  try {
    return fs.realpathSync(target);
  } catch (err) {
    throw new CwdViolation(message, { path: target, error: String(err?.message || err) });
  }
}

export function assertSafeCwd(cwd, allowedRoots) {
  if (!cwd) throw new CwdViolation("missing cwd");
  if (!Array.isArray(allowedRoots) || allowedRoots.length === 0) {
    throw new CwdViolation("AGENTS_REPO_ROOTS not configured");
  }

  const resolved = realpathOrViolation(cwd, `cwd does not exist or is unreachable: ${cwd}`);
  const allowed = allowedRoots.map((root) =>
    realpathOrViolation(root, `allowed root does not exist or is unreachable: ${root}`),
  );

  const ok = allowed.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
  if (!ok) {
    throw new CwdViolation(`cwd ${resolved} is outside allowed roots`, {
      cwd: resolved,
      allowedRoots: allowed,
    });
  }

  return resolved;
}

export class BaseAdapter {
  #freshClaudeSpawns = new Map();

  constructor({ id, config, registries }) {
    this.id = id;
    this.config = config;
    this.registries = registries;
  }

  rememberFreshClaudeSpawn({ tmuxTarget, run = tmuxSync }) {
    if (this.id !== "claude-code") return;
    this.#freshClaudeSpawns.delete(tmuxTarget);
    const owned = new Set();
    let identity;
    try {
      const pane = paneState(run, tmuxTarget);
      const observation = observe(run, pane.target, this.id, owned);
      identity = Object.fromEntries(["serverPid", "target", "panePid"]
        .map((key) => [key, observation[key]]));
    } finally {
      cleanupOwnedBuffers(run, owned, "transport_failed");
    }
    this.#freshClaudeSpawns.set(tmuxTarget, identity);
  }

  forgetFreshClaudeSpawn({ tmuxTarget }) {
    this.#freshClaudeSpawns.delete(tmuxTarget);
  }

  submitPrompt({ tmuxTarget, prompt, run = tmuxSync, wait = sleep }) {
    const firstPromptProcess = this.#freshClaudeSpawns.get(tmuxTarget);
    // Consume synchronously, even on invalid input, refusal or concurrent ask.
    this.#freshClaudeSpawns.delete(tmuxTarget);
    return submitPrompt({ target: tmuxTarget, prompt, provider: this.id, config: this.config, run, wait, firstPromptProcess });
  }

  submitLaunchCommand({ tmuxTarget, line }) {
    return submitLaunchCommand({ target: tmuxTarget, line, config: this.config });
  }

  auditPromptSubmission({ traceId, role, tmuxTarget, prompt }) {
    auditAppend({ type: "SESSION_INPUT", traceId, agent: this.id, role,
      tmuxTarget, promptLength: prompt.length, submitted: true });
  }

  capturePrompt({ tmuxTarget }) {
    this.checkEnabled();
    if (this.config?.dryRun || process.env.AGENTS_DRY_RUN === "1") return null;
    return captureSessionPrompt({ tmuxTarget });
  }

  answerPrompt(args) {
    this.checkEnabled();
    if (this.config?.dryRun || process.env.AGENTS_DRY_RUN === "1") return false;
    return answerSessionPrompt(args);
  }

  async delegate(_args) {
    // Execution args carry the canonical effectiveSelection resolved by policy.
    throw new Error(`adapter ${this.id} must implement delegate`);
  }

  async spawn(_args) {
    // Execution args carry the canonical effectiveSelection resolved by policy.
    throw new Error(`adapter ${this.id} must implement spawn`);
  }

  async ask(_args) {
    throw new Error(`adapter ${this.id} must implement ask`);
  }

  async view(_args) {
    throw new Error(`adapter ${this.id} must implement view`);
  }

  async kill(_args) {
    throw new Error(`adapter ${this.id} must implement kill`);
  }
}
