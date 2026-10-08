import { spawn, spawnSync } from "node:child_process";

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
  return spawnSync("tmux", args, { encoding: "utf-8", ...opts });
}

/** Starts tmux asynchronously with an argument array. */
export function tmuxAsync(args, opts = {}) {
  return spawn("tmux", args, opts);
}
