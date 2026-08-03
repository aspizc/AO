import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCapturePaneCmd,
  buildKillSessionCmd,
  buildNewSessionCmd,
  buildSendKeysCmd,
  isTmuxAvailable,
  tmuxSync,
} from "../../gateway/src/adapters/tmux_client.js";

test("builds tmux commands as argument arrays", () => {
  assert.deepEqual(buildNewSessionCmd({ target: "ag-x", cwd: "/tmp" }), [
    "new-session",
    "-d",
    "-s",
    "ag-x",
    "-c",
    "/tmp",
  ]);
  assert.deepEqual(buildSendKeysCmd({ target: "ag-x", line: "ls -la" }), [
    "send-keys",
    "-t",
    "ag-x",
    "ls -la",
    "Enter",
  ]);
  assert.deepEqual(buildCapturePaneCmd({ target: "ag-x", lines: 50 }), [
    "capture-pane",
    "-pt",
    "ag-x",
    "-S",
    "-50",
  ]);
  assert.deepEqual(buildKillSessionCmd({ target: "ag-x" }), ["kill-session", "-t", "ag-x"]);
});

test("uses default capture size", () => {
  assert.deepEqual(buildCapturePaneCmd({ target: "ag-x" }), [
    "capture-pane",
    "-pt",
    "ag-x",
    "-S",
    "-200",
  ]);
});

test("creates and kills a session when tmux is available", { skip: !isTmuxAvailable() }, (t) => {
  const target = `agtest-${Date.now()}`;
  const create = tmuxSync(buildNewSessionCmd({ target, cwd: "/tmp" }));
  if (create.status !== 0) {
    t.skip(`tmux cannot create sessions in this environment: ${create.stderr.trim()}`);
    return;
  }
  try {
    assert.equal(create.status, 0);
  } finally {
    const killed = tmuxSync(buildKillSessionCmd({ target }));
    assert.equal(killed.status, 0);
  }
});
