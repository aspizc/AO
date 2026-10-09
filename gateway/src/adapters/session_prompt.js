import { randomUUID } from "node:crypto";
import { buildCurrentPaneCmd, buildSubmitEvidenceCmd, buildSubmitStateCmd,
  buildGuardedSubmitCmd, buildDeleteBufferCmd, tmuxSync } from "./tmux_client.js";

const stateFormat = "#{pid}|#{pane_id}|#{pane_pid}|#{pane_in_mode}|#{pane_input_off}|#{pane_synchronized}";
function checked(run, args) {
  const result = run(args, { timeout: 1000, maxBuffer: 262144 });
  if (result?.status !== 0 || result.error || result.signal || result.stderr?.length) throw new Error("session prompt transport failed");
  return String(result.stdout || "");
}

// Current visible pane only. Never recognize a historical prompt in scrollback.
export function captureSessionPrompt({ tmuxTarget, run = tmuxSync }) {
  const before = checked(run, ["display-message", "-p", "-t", tmuxTarget, stateFormat]);
  const match = /^([1-9]\d*)\|(%\d+)\|([1-9]\d*)\|0\|0\|0\n$/.exec(before);
  if (!match) return null;
  const snapshot = checked(run, buildCurrentPaneCmd({ target: match[2] }));
  const after = checked(run, ["display-message", "-p", "-t", tmuxTarget, stateFormat]);
  if (before !== after) return null;
  return { snapshot, target: match[2], serverPid: match[1], panePid: match[3] };
}

export function samePromptCapture(left, right) {
  return !!left && !!right && ["snapshot", "target", "serverPid", "panePid"]
    .every((key) => typeof left[key] === "string" && left[key] === right[key]);
}

const permits = new WeakMap();

// Internal capability issued only by the approval watcher, never a tool input.
export function issuePromptAnswer(binding) {
  const permit = Object.freeze({});
  permits.set(permit, binding);
  return permit;
}

// Authorization is issued by the watcher for one bound decision, consumed before
// transport. No caller-supplied key, persistent choice or composer submission.
export function answerSessionPrompt({ permit, run = tmuxSync }) {
  const binding = permit && permits.get(permit);
  if (!binding) return false;
  permits.delete(permit);
  const { tmuxTarget, expected, authorize, response, onOutcome } = binding;
  let buffer;
  let attempted = false;
  let outcome;
  let detail;
  try {
    detail = "invalid_response";
    if (response !== "Enter" || typeof authorize !== "function") throw new Error("invalid prompt response");
    detail = "transport_unavailable";
    if (checked(run, ["display-message", "-p", "#{version}"]) !== "3.6a-agents.4\n"
      || !checked(run, ["list-commands"]).split("\n").some((row) => /^agents-submit-v1(?: |$)/.test(row))) {
      throw new Error("guarded prompt transport unavailable");
    }
    detail = "target_unavailable";
    const before = checked(run, ["display-message", "-p", "-t", tmuxTarget, stateFormat]);
    const identity = /^([1-9]\d*)\|(%\d+)\|([1-9]\d*)\|0\|0\|0\n$/.exec(before);
    if (!identity) throw new Error("prompt target unavailable");
    const target = identity[2];
    detail = "geometry_unavailable";
    const state = checked(run, buildSubmitStateCmd({ target }));
    const fields = state.trim().split("|");
    if (fields.length !== 7 || fields[0] !== identity[1] || fields[1] !== target || fields[2] !== identity[3]
      || BigInt(target.slice(1)) > 4294967295n
      || fields.some((value, index) => index !== 1 && (!/^(?:0|[1-9]\d*)$/.test(value)
        || BigInt(value) > (index < 3 ? 9223372036854775807n : 2147483647n)
        || BigInt(value) < (index < 3 ? 2n : index < 5 ? 1n : 0n)))
      || Number(fields[5]) > Number(fields[3]) || Number(fields[6]) >= Number(fields[4])) {
      throw new Error("prompt geometry unavailable");
    }
    detail = "evidence_unavailable";
    buffer = `agents-submit-${randomUUID()}`;
    checked(run, buildSubmitEvidenceCmd({ target, buffer }));
    const saved = run(["save-buffer", "-b", buffer, "-"], { encoding: null, timeout: 1000, maxBuffer: 262144 });
    if (saved?.status !== 0 || saved.error || saved.signal || saved.stderr?.length || !Buffer.isBuffer(saved.stdout)) {
      throw new Error("prompt evidence unavailable");
    }
    const snapshot = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(saved.stdout);
    const capture = { snapshot, target, serverPid: fields[0], panePid: fields[2],
      width: fields[3], height: fields[4], cursorX: fields[5], cursorY: fields[6], buffer };
    detail = "state_changed";
    if (before !== checked(run, ["display-message", "-p", "-t", tmuxTarget, stateFormat])
      || state !== checked(run, buildSubmitStateCmd({ target }))) throw new Error("prompt no longer bound");
    detail = "capture_mismatch";
    if (!samePromptCapture(expected, capture)) throw new Error("prompt no longer bound");
    detail = "authorization_refused";
    if (!authorize(capture, (stage) => { detail = stage; })) throw new Error("prompt no longer bound");
    detail = undefined;
    attempted = true;
    const result = run(buildGuardedSubmitCmd(capture), { timeout: 1000, maxBuffer: 8192 });
    const diagnostic = Buffer.isBuffer(result?.stderr) ? result.stderr.toString("utf8") : result?.stderr;
    if (result?.status === 0 && !result.error && !result.signal && !result.stderr?.length) outcome = "sent";
    else if (result?.status === 1 && !result.error && !result.signal
      && ["agents: guarded submit refused", "agents: guarded submit refused\n"].includes(diagnostic)) outcome = "refused";
    else outcome = "uncertain";
  } catch (_error) {
    outcome = attempted ? "uncertain" : "refused";
  } finally {
    if (buffer) {
      try {
        const result = run(buildDeleteBufferCmd({ buffer }), { timeout: 1000, maxBuffer: 8192 });
        const diagnostic = Buffer.isBuffer(result?.stderr) ? result.stderr.toString("utf8") : result?.stderr;
        if (result?.error || result?.signal || !(result?.status === 0
          || (result?.status === 1 && [`unknown buffer: ${buffer}`, `unknown buffer: ${buffer}\n`].includes(diagnostic)))) {
          outcome = attempted ? "uncertain" : "refused";
        }
      } catch (_error) { outcome = attempted ? "uncertain" : "refused"; }
    }
  }
  onOutcome?.(outcome, detail);
  return outcome === "sent";
}

export function isUnknownPrompt(snapshot) {
  if (typeof snapshot !== "string") return false;
  const rows = snapshot.split("\n");
  return rows.some((row) => /^\s*[›❯]\s*\d+[.)]\s+\S/.test(row))
    && rows.filter((row) => /^\s*(?:[›❯]\s*)?\d+[.)]\s+\S/.test(row)).length >= 2;
}
