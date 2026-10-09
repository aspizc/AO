import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { withOwnedTmuxServer } from "./fixtures/owned_tmux_server.js";

const tmux = process.env.A04_TEST_TMUX || "tmux";
const fixture = fileURLToPath(new URL("./guarded_paste_fixture.py", import.meta.url));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function terminalTest(exercise, width = "120", height = "40") {
  await withOwnedTmuxServer(tmux, async ({ directory, run }) => {
    const checked = (args, options) => {
      const result = run(args, options);
      assert.equal(result.status, 0, result.stderr || String(result.error));
      return result.stdout.trim();
    };
    let serial = 0;
    const terminal = path.join(directory, "target");
    fs.mkdirSync(terminal);
    fs.writeFileSync(path.join(terminal, "mode"), "0:on");
    const target = checked(["new-session", "-d", "-s", "submit", "-x", width, "-y", height,
      "-P", "-F", "#{pane_id}", "--", "python3", fixture, terminal]);
    const received = (where = terminal) => fs.existsSync(path.join(where, "received"))
      ? fs.readFileSync(path.join(where, "received")) : Buffer.alloc(0);
    const mode = async (enabled, pane = target, where = terminal) => {
      const value = `${++serial}:${enabled}`;
      // Publish a complete mode value; the fixture reads this file concurrently.
      fs.writeFileSync(path.join(where, "mode-next"), value);
      fs.renameSync(path.join(where, "mode-next"), path.join(where, "mode"));
      for (let i = 0; i < 100; i++) {
        if (checked(["capture-pane", "-p", "-t", pane]).includes(`fixture-mode:${value}`)) return;
        await pause(10);
      }
      assert.fail("state change must be parsed before submit");
    };
    await mode("on");
    const evidence = () => {
      const buffer = `agents-submit-${randomUUID()}`;
      const [serverPid, pane, panePid, width, height, cursorX, cursorY] = checked([
        "display-message", "-p", "-t", target,
        "#{pid}|#{pane_id}|#{pane_pid}|#{pane_width}|#{pane_height}|#{cursor_x}|#{cursor_y}",
      ]).split("|");
      checked(["capture-pane", "-b", buffer, "-N", "-T", "-t", target]);
      return { buffer, args: ["agents-submit-v1", "-b", buffer, "-r", serverPid, "-p", panePid,
        "-x", width, "-y", height, "-c", cursorX, "-l", cursorY, "-t", pane] };
    };
    const success = async (ev = evidence()) => {
      const before = received();
      const result = run(ev.args);
      assert.equal(result.status, 0, result.stderr);
      for (let i = 0; i < 100 && received().length === before.length; i++) await pause(10);
      assert.deepEqual(received(), Buffer.concat([before, Buffer.from("\r")]));
      assert.equal(run(["save-buffer", "-b", ev.buffer, "-"]).status, 1, "successful evidence is consumed");
    };
    const refusal = async (ev) => {
      const before = received();
      const result = run(ev.args);
      await pause(40);
      assert.deepEqual(received(), before, "refusal delivers zero CR");
      assert.equal(result.status, 1);
      assert.equal(result.stderr.trim(), "agents: guarded submit refused");
      assert.equal(run(["save-buffer", "-b", ev.buffer, "-"]).status, 1, "refused evidence is consumed");
    };
    const state = () => checked(["display-message", "-p", "-t", target,
      "#{pane_width}|#{pane_height}|#{cursor_x}|#{cursor_y}"]);
    const emit = async (data, expected) => {
      const sequence = String(++serial);
      fs.writeFileSync(path.join(terminal, "output-next"), `${sequence}:${Buffer.from(data).toString("hex")}`);
      fs.renameSync(path.join(terminal, "output-next"), path.join(terminal, "output"));
      for (let i = 0; i < 100; i++) {
        if (fs.existsSync(path.join(terminal, "output-ack"))
          && fs.readFileSync(path.join(terminal, "output-ack"), "utf8") === sequence && state() === expected) return;
        await pause(10);
      }
      assert.equal(state(), expected, "child output must be parsed into observed geometry");
    };
    await exercise({ run, checked, directory, target, terminal, received, mode, evidence, success, refusal, state, emit });
  });
}

test("guarded_submit_refuses_changed_menu_or_grid_without_cr", async () => {
  for (const retry of [false, true]) await terminalTest(async (fx) => {
    if (retry) await fx.success();
    const ev = fx.evidence();
    await fx.mode("on"); // New parsed text after the classified capture.
    await fx.refusal(ev);
  });
});

test("guarded_submit_refuses_cursor_dimensions_mode_input_sync_and_framing_drift", async () => {
  for (const retry of [false, true]) for (const drift of ["cursor", "width", "height", "mode", "input", "sync", "server"]) {
    await terminalTest(async (fx) => {
      if (retry) await fx.success();
      const ev = fx.evidence();
      if (["cursor", "width", "height", "server"].includes(drift)) {
        const flag = { cursor: "-c", width: "-x", height: "-y", server: "-r" }[drift];
        ev.args[ev.args.indexOf(flag) + 1] = String(Number(ev.args[ev.args.indexOf(flag) + 1]) + 1);
      } else if (drift === "mode") fx.checked(["copy-mode", "-t", fx.target]);
      else if (drift === "input") fx.checked(["select-pane", "-d", "-t", fx.target]);
      else if (drift === "sync") fx.checked(["set-option", "-w", "-t", fx.target, "synchronize-panes", "on"]);
      await fx.refusal(ev);
    });
  }
});

for (const retry of [false, true]) test(`guarded_submit_refuses_framing_drift_${retry ? "retry" : "first"}`, async () => {
  await terminalTest(async (fx) => {
    if (retry) await fx.success();
    await fx.mode("off");
    // Fresh evidence matches every predicate except bracketed framing.
    await fx.refusal(fx.evidence());
    await fx.mode("on");
    await fx.success();
  });
});

for (const retry of [false, true]) test(`guarded_submit_refuses_respawned_pane_pid_${retry ? "retry" : "first"}`, async () => {
  await terminalTest(async (fx) => {
    if (retry) await fx.success();
    const oldPid = fx.checked(["display-message", "-p", "-t", fx.target, "#{pane_pid}"]);
    fx.checked(["respawn-pane", "-k", "-t", fx.target, "--", "python3", fixture, fx.terminal]);
    await fx.mode("on");
    const ev = fx.evidence();
    const pidIndex = ev.args.indexOf("-p") + 1;
    assert.notEqual(ev.args[pidIndex], oldPid, "respawn must change only the expected PID predicate");
    ev.args[pidIndex] = oldPid;
    await fx.refusal(ev);
    await fx.success(); // Current PID with the same settled respawn flow delivers one CR.
  });
});

test("guarded_submit_refuses_changed_evidence_buffer", async () => {
  await terminalTest(async (fx) => {
    const ev = fx.evidence();
    const raw = fx.run(["save-buffer", "-b", ev.buffer, "-"], { encoding: null }).stdout;
    raw[0] ^= 1;
    fx.checked(["load-buffer", "-b", ev.buffer, "-"], { input: raw });
    await fx.refusal(ev);
  });
});

test("guarded_submit_consumes_evidence_on_success_and_refusal", async () => {
  await terminalTest(async (fx) => {
    await fx.success();
    const ev = fx.evidence();
    ev.args[ev.args.indexOf("-c") + 1] = "2147483647";
    await fx.refusal(ev);
  });
});

test("guarded_submit_refuses_reused_or_missing_evidence", async () => {
  await terminalTest(async (fx) => {
    const ev = fx.evidence();
    await fx.success(ev);
    await fx.refusal(ev);
    const missing = `agents-submit-${randomUUID()}`;
    await fx.refusal({ buffer: missing, args: ev.args.map((value) => value === ev.buffer ? missing : value) });
  });
});

test("guarded_submit_writes_one_cr_only_to_target_with_sibling_sync_option", async () => {
  await terminalTest(async (fx) => {
    const sibling = path.join(fx.directory, "sibling");
    fs.mkdirSync(sibling);
    fs.writeFileSync(path.join(sibling, "mode"), "0:on");
    const pane = fx.checked(["split-window", "-d", "-P", "-F", "#{pane_id}", "-t", fx.target,
      "--", "python3", fixture, sibling]);
    await fx.mode("on", pane, sibling);
    fx.checked(["set-option", "-p", "-t", pane, "synchronize-panes", "on"]);
    fx.checked(["set-option", "-p", "-t", fx.target, "synchronize-panes", "off"]);
    await fx.success();
    assert.deepEqual(fx.received(sibling), Buffer.alloc(0), "submit bypasses key fanout");
    await fx.success();
    assert.deepEqual(fx.received(sibling), Buffer.alloc(0));
  });
});

test("ordinary_send_keys_preserves_upstream_sibling_fanout", async () => {
  await terminalTest(async (fx) => {
    const sibling = path.join(fx.directory, "sibling");
    fs.mkdirSync(sibling);
    fs.writeFileSync(path.join(sibling, "mode"), "0:on");
    const pane = fx.checked(["split-window", "-d", "-P", "-F", "#{pane_id}", "-t", fx.target,
      "--", "python3", fixture, sibling]);
    await fx.mode("on", pane, sibling);
    fx.checked(["set-option", "-w", "-t", fx.target, "synchronize-panes", "on"]);
    fx.checked(["send-keys", "-t", fx.target, "Enter"]);
    for (let i = 0; i < 100 && !fx.received(sibling).length; i++) await pause(10);
    assert.deepEqual(fx.received(), Buffer.from("\r"));
    assert.deepEqual(fx.received(sibling), Buffer.from("\r"));
  });
});

test("real tmux pending-wrap guarded submit delivers exactly one CR for the bound observed cursor", async () => {
  await terminalTest(async (fx) => {
    await fx.emit("\x1b[?7h\x1b[?25l\x1b[24;1H" + "X".repeat(80), "80|24|80|23");
    await fx.success();
    assert.equal(fx.state(), "80|24|80|23", "raw noecho input CR does not redraw tmux");
    await fx.emit("\r", "80|24|0|23");
    await fx.emit("X".repeat(80), "80|24|80|23");
    await fx.emit("Y", "80|24|1|23"); // Bottom-row printable consumes wrap and scrolls.
  }, "80", "24");
});
for (const x of [81, 90]) test(`real tmux alternate-screen shrink refuses observed cursor beyond width ${x}`, async () => {
  await terminalTest(async (fx) => {
    await fx.emit(`\x1b[?1049h\x1b[?2004h\x1b[1;${x + 1}H`, `100|30|${x}|0`);
    await fx.success(); // Same cursor is in range before shrink.
    fx.checked(["resize-window", "-t", fx.target, "-x", "80", "-y", "30"]);
    assert.equal(fx.state(), `80|30|${x}|0`);
    assert.ok(Number(fx.state().split("|")[2]) > Number(fx.state().split("|")[0]));
    await fx.refusal(fx.evidence()); // Every argument matches actual state; only x bound refuses.
  }, "100", "30");
});
for (const [control, expected] of [["\b", "80|24|79|4"], ["\n", "80|24|80|5"], ["\x1bM", "80|24|80|3"]]) {
  test(`real pending-wrap cursor-only drift ${JSON.stringify(control)} refuses stale binding`, async () => {
    await terminalTest(async (fx) => {
      await fx.emit("\x1b[2J\x1b[5;1H" + "X".repeat(80), "80|24|80|4");
      const ev = fx.evidence();
      const grid = fx.checked(["capture-pane", "-p", "-N", "-T", "-t", fx.target]);
      await fx.emit(control, expected);
      assert.equal(fx.checked(["capture-pane", "-p", "-N", "-T", "-t", fx.target]), grid);
      await fx.refusal(ev);
      const current = fx.evidence();
      // Same saved grid with current cursor succeeds, isolating the stale cursor predicate.
      await fx.success(current);
    }, "80", "24");
  });
}
for (const [flag, value] of [["-c", "81"], ["-l", "24"]]) test(`real pending-wrap rejects invalid ${flag} ${value}`, async () => {
  await terminalTest(async (fx) => {
    await fx.emit("\x1b[24;1H" + "X".repeat(80), "80|24|80|23");
    const ev = fx.evidence();
    ev.args[ev.args.indexOf(flag) + 1] = value;
    await fx.refusal(ev);
  }, "80", "24");
});
