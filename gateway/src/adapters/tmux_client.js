import { spawn, spawnSync } from "node:child_process";

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
  return spawnSync("tmux", args, { encoding: "utf-8", ...opts });
}

/** Starts tmux asynchronously with an argument array. */
export function tmuxAsync(args, opts = {}) {
  return spawn("tmux", args, opts);
}
