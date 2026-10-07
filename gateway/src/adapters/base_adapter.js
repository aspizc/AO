import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { append as auditAppend } from "../core/audit.js";
import {
  buildDeleteBufferCmd, buildLoadBufferCmd, buildSubmitEvidenceCmd, buildSubmitStateCmd, buildGuardedSubmitCmd,
  buildPaneStateCmd, buildPasteBufferCmd, buildSendKeysCmd, buildSubmitCmd, tmuxSync,
} from "./tmux_client.js";

const activeSubmissions = new Set();
function invalidText(text, allowNewlines) {
  return typeof text !== "string" || !text || !text.isWellFormed()
    || Array.from(text).some((character) => {
      const code = character.codePointAt(0);
      return (code < 32 && !(allowNewlines && code === 10)) || (code >= 127 && code <= 159);
    });
}
function activeDecision(provider, rows, pane) {
  if (provider === "codex") {
    const footer = rows.findLastIndex((row) => /^\s*(?:\? for shortcuts\s+)?\d{1,3}% context left\s*$/.test(row));
    const start = rows.findLastIndex((row, index) => index < footer && /^[›»](?: |$)/.test(row));
    if (start >= 0 && pane.cursor >= start && pane.cursor < footer
      && rows.slice(pane.cursor + 1, footer).every((row) => row.trim() === "")) return false;
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

// Deliberately narrow source-backed profiles. Unknown layouts/providers stay closed.
// Evidence and the unverified live/version boundary are recorded in gateway/README.md.
export function classifyProviderPane(provider, snapshot, pane) {
  if (pane.mode !== "0" || pane.inputOff !== "0" || pane.synchronized !== "0") return { state: "unknown_state" };
  const rows = snapshot.split("\n");
  if (activeDecision(provider, rows, pane)) return { state: "decision_required" };
  if (provider === "codex") {
    const footer = rows.findLastIndex((row) => /^\s*(?:\? for shortcuts\s+)?\d{1,3}% context left\s*$/.test(row));
    const start = rows.findLastIndex((row, index) => index < footer && /^[›»](?: |$)/.test(row));
    if (start < 0 || footer - start < 2 || footer - start > 12
      || pane.cursor < start || pane.cursor >= footer
      || rows.slice(pane.cursor + 1, footer).some((row) => row.trim() !== "")) return { state: "unknown_state" };
    const textRows = rows.slice(start, pane.cursor + 1);
    if (textRows.slice(1).some((row) => !row.startsWith("  "))) return { state: "unknown_state" };
    let text = [textRows[0].replace(/^\s*[›»] ?/, ""), ...textRows.slice(1).map((row) => row.slice(2))].join("\n");
    if (text === "Ask Codex to do anything" && pane.cursorX === 2 && pane.cursor === start) text = "";
    const status = rows.slice(Math.max(0, start - 2), start).join("\n");
    const busy = /Working \([0-9hms .]+[•·] esc to interrupt\)/.test(status);
    // A cursor outside the measured composer cannot prove that Enter targets it.
    return { state: busy ? "busy" : "composer", text, identity: `${start}:${footer}:${pane.width}:${pane.height}` };
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
      || !rows[top + 1].startsWith("❯\u00a0") || pane.cursorX < 2 || pane.cursorX >= pane.width
      || rows.slice(bottom + 2).some((row) => row.trim() !== "")) return { state: "unknown_state" };
    const footer = rows[bottom + 1]?.trim();
    const busy = footer === "esc to interrupt";
    if (!busy && footer !== "? for shortcuts") return { state: "unknown_state" };
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

function observe(run, target, provider, owned) {
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
  return { ...classifyProviderPane(provider, snapshot, pane), snapshot, buffer,
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const boundedDelay = (value, fallback, max) => Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : fallback;

export async function submitPrompt({ target, prompt, provider, config = {}, run = tmuxSync, wait = sleep }) {
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
    requireComposer(observe(run, target, provider, owned), "");
    buffer = `agents-prompt-${randomUUID()}`;
    owned.add(buffer);
    checkedRun(run, buildLoadBufferCmd({ buffer }), { input: prompt });
    checkedRun(run, buildPasteBufferCmd({ target, buffer }));
    await wait(boundedDelay(config.tmuxSubmitDelayMs, 150, 1000));
    const pending = observe(run, target, provider, owned);
    requireComposer(pending, prompt);
    for (let attempt = 0; attempt < 2; attempt++) {
      const guard = observe(run, target, provider, owned);
      if (attempt === 0) requireComposer(guard, prompt, pending.identity);
      else if (guard.state !== "composer" || guard.text !== prompt || guard.identity !== pending.identity) {
        throw submissionError("acceptance_uncertain");
      }
      guardedSubmit(run, guard, attempt);
      delivered = true;
      await wait(boundedDelay(config.tmuxAskDelayMs, 1500, 5000));
      const after = observe(run, target, provider, owned);
      if (after.state === "busy" && after.text === "") return { snapshot: after.snapshot, dryRun: false };
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
  constructor({ id, config, registries }) {
    this.id = id;
    this.config = config;
    this.registries = registries;
  }

  submitPrompt({ tmuxTarget, prompt }) {
    return submitPrompt({ target: tmuxTarget, prompt, provider: this.id, config: this.config });
  }

  submitLaunchCommand({ tmuxTarget, line }) {
    return submitLaunchCommand({ target: tmuxTarget, line, config: this.config });
  }

  auditPromptSubmission({ traceId, role, tmuxTarget, prompt }) {
    auditAppend({ type: "SESSION_INPUT", traceId, agent: this.id, role,
      tmuxTarget, promptLength: prompt.length, submitted: true });
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
