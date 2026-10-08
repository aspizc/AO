import { test } from "node:test";
import assert from "node:assert/strict";
import { withOwnedTmuxServer } from "./fixtures/owned_tmux_server.js";
import {
  buildCapturePaneCmd,
  buildKillSessionCmd,
  buildNewSessionCmd,
  buildSendKeysCmd,
  buildSubmitCmd,
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
    "-l",
    "-t",
    "ag-x",
    "--",
    "ls -la",
  ]);
  assert.deepEqual(buildSubmitCmd({ target: "ag-x" }), ["send-keys", "-t", "ag-x", "Enter"]);
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

test("creates and kills a session and reaps its owned server", { skip: !isTmuxAvailable() }, async () => {
  await withOwnedTmuxServer("tmux", async ({ socket }) => {
    const target = `agtest-${Date.now()}`;
    const create = tmuxSync(["-S", socket, ...buildNewSessionCmd({ target, cwd: "/tmp" }), "--", "/bin/sleep", "3600"]);
    assert.equal(create.status, 0);
    const killed = tmuxSync(["-S", socket, ...buildKillSessionCmd({ target })]);
    assert.equal(killed.status, 0);
  });
});

test("buildNewSessionCmd emits -e for each marker without shell interpolation", () => {
  assert.deepEqual(buildNewSessionCmd({ target: "ag-x", cwd: "/tmp", env: {
    AGENTS_WORKER_ROLE: "reviewer", AGENTS_WORKER_TRACE_ID: "tr=$literal", AGENTS_WORKER_TASK_ID: "",
  } }), ["new-session", "-d", "-s", "ag-x", "-c", "/tmp",
    "-e", "AGENTS_WORKER_ROLE=reviewer", "-e", "AGENTS_WORKER_TRACE_ID=tr=$literal", "-e", "AGENTS_WORKER_TASK_ID="]);
});
