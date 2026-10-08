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

export function buildNewSessionCmd({ target, cwd }) {
  return ["new-session", "-d", "-s", target, "-c", cwd];
}

export function buildSendKeysCmd({ target, line }) {
  return ["send-keys", "-t", target, line, "Enter"];
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
  // Only the existing detached shape may consume a private creation response.
  if (args.length !== 6 || args[1] !== "-d" || args[2] !== "-s" || args[4] !== "-c"
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
