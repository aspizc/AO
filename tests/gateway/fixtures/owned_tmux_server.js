import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

// Foreground ownership avoids persistent daemons and adopted double-fork children.
// All commands use the private socket; neither user config nor user servers apply.
export async function withOwnedTmuxServer(tmux, exercise) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ao-a04-owned-"));
  const socket = path.join(directory, "server.sock");
  const env = { ...process.env, TMUX: "", TERM: "xterm-256color" };
  const server = spawn(tmux, ["-D", "-f", "/dev/null", "-S", socket], { env, stdio: "ignore" });
  const stopped = new Promise((resolve, reject) => {
    server.once("error", reject);
    server.once("exit", (code, signal) => resolve({ code, signal }));
  });
  // Observe a rejection immediately even when startup fails before the exercise.
  stopped.catch(() => {});
  const run = (args, options = {}) => spawnSync(tmux, ["-S", socket, ...args], {
    env, encoding: "utf8", timeout: 3000, ...options,
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (fs.existsSync(socket) && run(["list-commands"]).status === 0) { ready = true; break; }
      if (server.exitCode !== null || server.signalCode !== null) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(ready, true, "owned foreground tmux must be ready before any fixture input");
    await exercise({ directory, socket, run });
  } finally {
    if (server.exitCode === null && server.signalCode === null) {
      // Retire panes while their parent server is still alive to reap them.
      // kill-server alone can leave a just-killed pane as an adopted zombie.
      let retirementError;
      try {
        const sessions = run(["list-sessions", "-F", "#{session_id}"]);
        for (const session of (sessions.stdout || "").trim().split("\n").filter(Boolean)) {
          const killed = run(["kill-session", "-t", session]);
          assert.equal(killed.status, 0, killed.stderr);
        }
        if (process.platform === "linux") {
          const children = `/proc/${server.pid}/task/${server.pid}/children`;
          for (let attempt = 0; attempt < 100 && fs.readFileSync(children, "utf8").trim(); attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          assert.equal(fs.readFileSync(children, "utf8").trim(), "", "server reaps all pane children before exit");
        }
      } catch (error) { retirementError = error; }
      const stop = run(["kill-server"]);
      if (stop.status !== 0) server.kill("SIGTERM");
      // Always reap the owned child before asserting the command result.
      await stopped;
      if (retirementError) throw retirementError;
      assert.equal(stop.status, 0, stop.stderr || String(stop.error));
    }
    const result = await stopped;
    assert.equal(result.code, 0, "owned server exits cleanly and is reaped");
    assert.equal(result.signal, null);
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
