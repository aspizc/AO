import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { readLinuxProcessIdentity } from "../../../gateway/src/adapters/process_supervisor.js";
import { setTimeout as delay } from "node:timers/promises";

// A foreground server is a direct, awaitable child; daemonized tmux leaves
// intermediate zombies with the CI subreaper even after kill-server succeeds.
export async function ownedTmuxFixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "a05-owned-tmux-"));
  const previous = { TMUX_TMPDIR: process.env.TMUX_TMPDIR, TMUX: process.env.TMUX };
  process.env.TMUX_TMPDIR = directory;
  delete process.env.TMUX;
  const env = { ...process.env };
  const server = spawn("tmux", ["-D", "-f", "/dev/null"], { env, stdio: "ignore" });
  const exit = once(server, "exit");
  const socket = path.join(directory, `tmux-${process.getuid()}`, "default");
  const run = (args) => spawnSync("tmux", args, { env, encoding: "utf8", timeout: 2000 });
  t.after(async () => {
    if (server.exitCode === null && server.signalCode === null) {
      const targets = run(["list-sessions", "-F", "#{session_name}"]);
      const ownedTargets = targets.stdout.trim().split("\n").filter(Boolean);
      for (const target of ownedTargets) run(["send-keys", "-t", `${target}:0.0`, "C-c"]);
      await delay(100);
      for (const target of ownedTargets) {
        // Keep the parent server alive long enough to reap each pane.
        run(["kill-session", "-t", `=${target}`]);
      }
      for (let attempt = 0; attempt < 100; attempt++) {
        const panes = run(["list-panes", "-a", "-F", "#{pane_pid}"]);
        if (!panes.stdout.trim()) break;
        await delay(10);
      }
      await delay(100);
      run(["kill-server"]);
    }
    let timer;
    try {
      await Promise.race([exit, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("owned tmux server did not exit")), 2000);
      })]);
      t.diagnostic(JSON.stringify({ fixture: "owned-tmux-exited", pid: server.pid, exitCode: server.exitCode, signal: server.signalCode }));
    } finally {
      clearTimeout(timer);
      if (server.exitCode === null && server.signalCode === null) { server.kill("SIGKILL"); await exit; }
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
  for (let attempt = 0; attempt < 100 && !fs.existsSync(socket); attempt++) {
    assert.equal(server.exitCode, null, "owned foreground tmux server exited before readiness");
    await delay(10);
  }
  assert.ok(fs.existsSync(socket), "owned foreground tmux socket was not created");
  // Synthetic panes must not run the operator's login profiles or their children.
  assert.equal(run(["set-option", "-g", "default-shell", "/bin/sh"]).status, 0);
  assert.equal(run(["set-option", "-g", "default-command", "exec /bin/sh"]).status, 0);
  const observed = readLinuxProcessIdentity(server.pid);
  assert.ok(observed?.startToken);
  t.diagnostic(JSON.stringify({ fixture: "owned-tmux-ready", ...observed, ppid: process.pid,
    state: fs.readFileSync(`/proc/${server.pid}/stat`, "utf8").split(") ").at(-1).split(" ")[0],
    runtime: run(["-V"]).stdout.trim() }));
  return { directory, run, server };
}
