import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withOwnedTmuxServer } from "./fixtures/owned_tmux_server.js";

const terminalFixture = fileURLToPath(new URL("./guarded_paste_fixture.py", import.meta.url));
const tmux = process.env.A04_TEST_TMUX || "tmux";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const payload = "Enter\nC-c\n  café λ 🙂  \nlast line\n";
const framed = Buffer.from(`\x1b[200~${payload}\x1b[201~`);

async function ownedServer(runTest) {
  await withOwnedTmuxServer(tmux, async ({ directory, run: native }) => {
    const run = (args, input) => native(args, { input });
    const checked = (args, input) => {
      const result = run(args, input);
      assert.equal(result.status, 0, result.stderr || String(result.error));
      return result.stdout.trim();
    };
    let sequence = 0;
    async function mode(target, terminal, enabled) {
      const marker = `fixture-mode:${++sequence}:${enabled}`;
      fs.writeFileSync(path.join(terminal, "mode"), `${sequence}:${enabled}`);
      for (let attempt = 0; attempt < 100; attempt++) {
        // The marker follows the escape sequence: seeing it proves server parsing.
        if (checked(["capture-pane", "-p", "-t", target]).includes(marker)) return;
        await pause(10);
      }
      assert.fail(`terminal did not establish ${marker}`);
    }
    const received = (terminal) => fs.existsSync(path.join(terminal, "received"))
      ? fs.readFileSync(path.join(terminal, "received")) : Buffer.alloc(0);
      const terminal = path.join(directory, "first");
      fs.mkdirSync(terminal);
      fs.writeFileSync(path.join(terminal, "mode"), "0:on");
      const target = checked(["-f", "/dev/null", "new-session", "-d", "-s", "raw-input",
        "-x", "120", "-y", "40", "-P", "-F", "#{pane_id}", "--", "python3", terminalFixture, terminal]);
      await mode(target, terminal, "on");
      const buffer = "owned-test-payload";
      checked(["load-buffer", "-b", buffer, "-"], payload);
      const paste = (flags = ["-G", "-p", "-r"]) => run(["paste-buffer", ...flags, "-b", buffer, "-t", target]);
      const refused = async (flags) => {
        const result = paste(flags);
        await pause(60);
        assert.deepEqual(received(terminal), Buffer.alloc(0), "a refusal must not write payload, framing, or Enter");
        assert.equal(result.status, 1);
        assert.equal(result.stderr.trim(), "agents: bracketed paste unavailable");
      };
      await runTest({ directory, terminal, target, buffer, checked, run, mode, received, paste, refused });
      checked(["delete-buffer", "-b", buffer]);
  });
}

test("guarded_paste_refuses_disabled_mode_without_input", async () => {
  await ownedServer(async ({ target, terminal, mode, refused }) => {
    await mode(target, terminal, "off");
    await refused();
  });
});

test("guarded_paste_preserves_exact_multiline_bytes", async () => {
  await ownedServer(async ({ paste, received, terminal, checked, target }) => {
    const result = paste();
    assert.equal(result.status, 0, result.stderr);
    for (let attempt = 0; attempt < 100 && received(terminal).length < framed.length; attempt++) await pause(10);
    assert.deepEqual(received(terminal), framed, "UTF-8, LF and key names arrive literally with no intermediate submit");
    checked(["send-keys", "-t", target, "Enter"]);
    for (let attempt = 0; attempt < 100 && received(terminal).length === framed.length; attempt++) await pause(10);
    assert.deepEqual(received(terminal), Buffer.concat([framed, Buffer.from("\r")]), "only the separate Enter submits");
  });
});

test("guarded_paste_rechecks_mode_at_write", async () => {
  await ownedServer(async ({ target, terminal, mode, checked, refused }) => {
    checked(["display-message", "-p", "-t", target, "#{pane_id}"]);
    // Disable after the client's last observation, with no fresh client probe.
    await mode(target, terminal, "off");
    await refused();
  });
});

test("guarded_paste_refuses_input_off_copy_mode_and_sync", async () => {
  await ownedServer(async ({ target, checked, refused, directory, received, mode }) => {
    checked(["select-pane", "-d", "-t", target]);
    await refused();
    checked(["select-pane", "-e", "-t", target]);
    checked(["copy-mode", "-t", target]);
    await refused();
    checked(["send-keys", "-X", "-t", target, "cancel"]);
    const sibling = path.join(directory, "sibling");
    fs.mkdirSync(sibling);
    fs.writeFileSync(path.join(sibling, "mode"), "0:on");
    const siblingTarget = checked(["split-window", "-d", "-P", "-F", "#{pane_id}", "-t", target,
      "--", "python3", terminalFixture, sibling]);
    await mode(siblingTarget, sibling, "on");
    checked(["set-option", "-w", "-t", target, "synchronize-panes", "on"]);
    await refused();
    assert.deepEqual(received(sibling), Buffer.alloc(0), "a refused paste cannot redirect bytes to a synchronized sibling");
  });
});

test("guarded_paste_requires_framing_and_raw_newlines", async () => {
  await ownedServer(async ({ refused }) => {
    for (const flags of [["-G", "-r"], ["-G", "-p"], ["-G", "-p", "-r", "-s", "\r"]]) await refused(flags);
  });
});

test("unguarded_upstream_paste_semantics_are_preserved", async () => {
  await ownedServer(async ({ target, terminal, mode, paste, received }) => {
    await mode(target, terminal, "off");
    const result = paste(["-p", "-r"]);
    assert.equal(result.status, 0, result.stderr);
    for (let attempt = 0; attempt < 100 && received(terminal).length < Buffer.byteLength(payload); attempt++) await pause(10);
    assert.deepEqual(received(terminal), Buffer.from(payload));
  });
});
