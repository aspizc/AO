import { spawn, spawnSync } from "node:child_process";
import { AsyncLocalStorage } from "node:async_hooks";
import { readLinuxProcessIdentity } from "./process_supervisor.js";

const creationObservers = new AsyncLocalStorage();

// Private launch scope: ordinary tmux calls neither observe nor grant receipts.
export function withTmuxCreationObserver(observer, operation) {
  return creationObservers.run(observer, operation);
}

const creationFormat = "a05-create-v1 #{session_id} #{pane_id} #{pane_pid}";

function observeCreation(result, observer) {
  const row = typeof result.stdout === "string"
    && /^a05-create-v1 (\$\d+) (%\d+) ([1-9]\d*)\n$/.exec(result.stdout);
  const identity = row && row[0] === result.stdout && readLinuxProcessIdentity(Number(row[3]));
  if ((result.error && result.error.code !== "ETIMEDOUT") || !identity) {
    throw new Error("tmux creation identity unavailable");
  }
  observer(Object.freeze({ sessionId: row[1], paneId: row[2], identity: Object.freeze(identity) }));
}

export function isTmuxAvailable() {
  try {
    return spawnSync("tmux", ["-V"], { stdio: "ignore" }).status === 0;
  } catch {
    return false;
  }
}

export function buildNewSessionCmd({ target, cwd, env = {} }) {
  return ["new-session", "-d", "-s", target, "-c", cwd,
    ...Object.entries(env).flatMap(([key, value]) => ["-e", `${key}=${value}`])];
}

export function buildSendKeysCmd({ target, line }) {
  return ["send-keys", "-l", "-t", target, "--", line];
}

export function buildSubmitCmd({ target }) {
  return ["send-keys", "-t", target, "Enter"];
}

export function buildLoadBufferCmd({ buffer }) {
  return ["load-buffer", "-b", buffer, "-"];
}

export function buildPasteBufferCmd({ target, buffer }) {
  // -G is the pinned agents runtime's atomic require-bracketed-mode guard.
  return ["paste-buffer", "-G", "-p", "-r", "-b", buffer, "-t", target];
}

export function buildDeleteBufferCmd({ buffer }) {
  return ["delete-buffer", "-b", buffer];
}

export function buildPaneStateCmd({ target }) {
  return ["display-message", "-p", "-t", target,
    "#{pane_id}|#{pane_in_mode}|#{pane_input_off}|#{pane_synchronized}|#{cursor_y}|#{pane_height}|#{pane_width}|#{cursor_x}"];
}

export function buildCurrentPaneCmd({ target }) {
  // Do not include scrollback in a current-composer/acceptance observation.
  // -N retains rendered trailing spaces; -T omits unwritten empty cells.
  return ["capture-pane", "-p", "-N", "-T", "-t", target];
}

export function buildSubmitEvidenceCmd({ target, buffer }) {
  return ["capture-pane", "-b", buffer, "-N", "-T", "-t", target];
}

export function buildSubmitStateCmd({ target }) {
  return ["display-message", "-p", "-t", target,
    "#{pid}|#{pane_id}|#{pane_pid}|#{pane_width}|#{pane_height}|#{cursor_x}|#{cursor_y}"];
}

export function buildGuardedSubmitCmd({ target, buffer, serverPid, panePid, width, height, cursorX, cursorY }) {
  return ["agents-submit-v1", "-b", buffer, "-r", serverPid, "-p", panePid,
    "-x", width, "-y", height, "-c", cursorX, "-l", cursorY, "-t", target];
}

export function buildCapturePaneCmd({ target, lines = 200 }) {
  return ["capture-pane", "-pt", target, "-S", `-${lines}`];
}

export function buildKillSessionCmd({ target }) {
  return ["kill-session", "-t", target];
}

/** Runs tmux synchronously with an argument array. */
export function tmuxSync(args, opts = {}) {
  const observer = creationObservers.getStore();
  if (!observer || process.platform !== "linux" || args[0] !== "new-session") {
    return spawnSync("tmux", args, { encoding: "utf-8", ...opts });
  }
  // Accept the detached builder shape, including literal worker environment pairs.
  const environment = args.slice(6);
  if (args.length < 6 || environment.length % 2 !== 0
    || environment.some((value, index) => index % 2 === 0
      ? value !== "-e" : typeof value !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*=[^\0\r\n]*$/.test(value))
    || args[1] !== "-d" || args[2] !== "-s" || args[4] !== "-c"
    || (opts.encoding && !["utf-8", "utf8"].includes(opts.encoding)) || opts.stdio !== undefined) {
    throw new Error("unsupported tmux creation observation");
  }
  const result = spawnSync("tmux", [...args, "-P", "-F", creationFormat],
    { encoding: "utf-8", ...opts, timeout: 1000, maxBuffer: 8192 });
  if (result.status !== 0) {
    // A timeout can follow a complete creation response. Retain only that
    // exact tuple and live kernel identity; never infer a receipt from a name.
    // The original command failure still reaches the adapter unchanged.
    if (result.error?.code === "ETIMEDOUT") observeCreation(result, observer);
    return result;
  }
  observeCreation(result, observer);
  // The supported original command has empty stdout; keep its public shape.
  result.stdout = "";
  if (Array.isArray(result.output)) result.output[1] = "";
  return result;
}

/** Starts tmux asynchronously with an argument array. */
export function tmuxAsync(args, opts = {}) {
  return spawn("tmux", args, opts);
}
