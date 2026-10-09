import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withOwnedTmuxServer } from "./fixtures/owned_tmux_server.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { configureAudit, query } from "../../gateway/src/core/audit.js";
import { createOrchestration } from "../../gateway/src/core/repositories/orchestration_repo.js";
import * as tasks from "../../gateway/src/core/repositories/task_repo.js";
import * as sessions from "../../gateway/src/core/repositories/session_repo.js";
import { respond } from "../../gateway/src/services/approval_service.js";
import { createSessionPromptWatcher } from "../../gateway/src/services/session_prompt_service.js";
import { captureSessionPrompt, answerSessionPrompt } from "../../gateway/src/adapters/session_prompt.js";
import { recognizeCodexPrompt } from "../../gateway/src/adapters/codex_adapter.js";
import { recognizeClaudePrompt } from "../../gateway/src/adapters/claude_adapter.js";

const tmux = process.env.A04_TEST_TMUX || "tmux";
const terminal = fileURLToPath(new URL("./session_prompt_race_fixture.py", import.meta.url));
const menus = {
  command: "Would you like to run the following command?\n\n  $ npm test\n\n› 1. Yes, proceed (y)\n  2. No, and tell Codex what to do differently (esc)\n\nPress enter to confirm or esc to cancel\n",
  trust: "Do you trust the contents of this directory?\n\n  /tmp/a06-fixture\n\n› 1. Yes, proceed\n  2. No, quit\n\nPress enter to confirm or esc to cancel\n",
  permission: "Bash command\n\n  npm test\n  Run tests\n\nDo you want to proceed?\n❯ 1. Yes\n  2. Yes, and don't ask again for npm test commands\n  3. No\n\nEsc to cancel · Tab to amend\n",
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setup(kind, adapter) {
  resetState();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "a06-guard-state-"));
  initState({ stateDb: path.join(directory, "state.db") });
  configureAudit({ auditLog: path.join(directory, "audit.jsonl") });
  const agent = kind === "permission" ? "claude-code" : "codex";
  const now = new Date().toISOString();
  createOrchestration({ sessionId: "trace-owner", traceId: "trace", callerAgent: "claude-code", callerRole: "orchestrator", status: "active", goal: "guard test", createdAt: now });
  tasks.createTask({ taskId: "task", traceId: "trace", assignedAgent: agent, assignedRole: "coder", repo: "fixture", status: "pending", createdAt: now, closedAt: null });
  sessions.createSession({ sessionId: "session", taskId: "task", traceId: "trace", agent, role: "coder", tmuxTarget: "guard-test", status: "running", startedAt: now, closedAt: null });
  const registries = { getRole: () => ({ allowActions: [], denyActions: [] }), getAgent: () => ({ allowedRoles: ["coder"], allowedClassifications: ["internal"], requiresApprovalFor: [] }), getRepo: () => ({ classification: "internal", allowedAgents: [agent] }), getProtectedBranches: () => [] };
  return createSessionPromptWatcher({ adapters: { get: () => adapter }, registries });
}

for (const kind of Object.keys(menus)) {
  for (const variant of ["redraw", "unchanged", "pending-wrap"]) {
    const redraw = variant === "redraw", pendingWrap = variant === "pending-wrap";
    test(`real pinned tmux ${kind}: ${redraw ? "redraw after evidence refuses all bytes" : `${pendingWrap ? "pending-wrap" : "unchanged"} selected one-time choice receives exactly one guarded CR`}`, async () => {
      await withOwnedTmuxServer(tmux, async ({ directory, run }) => {
        assert.match(run(["-V"]).stdout, /^tmux 3\.6a-agents\.4\n$/);
        fs.writeFileSync(path.join(directory, "pane.txt"), menus[kind]);
        if (pendingWrap) fs.writeFileSync(path.join(directory, "pending-wrap"), "1");
        const created = run(["new-session", "-d", "-s", "guard-test", "-x", pendingWrap ? "80" : "120", "-y", pendingWrap ? "24" : "40", "-P", "-F", "#{pane_id}", "--", "python3", terminal, directory, kind]);
        assert.equal(created.status, 0, created.stderr);
        const target = created.stdout.trim();
        for (let i = 0; i < 100 && !fs.existsSync(path.join(directory, "drawn")); i++) await pause(10);
        const recognizer = kind === "permission" ? recognizeClaudePrompt : recognizeCodexPrompt;
        for (let i = 0; i < 100 && !recognizer(captureSessionPrompt({ tmuxTarget: target, run })?.snapshot); i++) await pause(10);
        if (pendingWrap) assert.equal(run(["display-message", "-p", "-t", target,
          "#{pane_width}|#{pane_height}|#{cursor_x}|#{cursor_y}"]).stdout.trim(), "80|24|80|23");
        const writes = [];
        let interleaved = false;
        const intercepted = (args, options) => {
          if (["send-keys", "agents-submit-v1"].includes(args[0])) {
            writes.push(args[0]);
            if (redraw && !interleaved) {
              interleaved = true;
              fs.writeFileSync(path.join(directory, "control"), "redraw");
              let changed = false;
              for (let attempt = 0; attempt < 200; attempt++) {
                const pane = run(["capture-pane", "-p", "-N", "-T", "-t", target]).stdout;
                if (pane.includes(kind === "trust" ? "/tmp/changed-fixture" : "changed-command")) { changed = true; break; }
                Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
              }
              assert.equal(changed, true, "child redraw must be visible before guarded write");
            }
          }
          return run(args, options);
        };
        const adapter = { recognizePrompt: recognizer, capturePrompt: () => captureSessionPrompt({ tmuxTarget: target, run }), answerPrompt: ({ permit }) => answerSessionPrompt({ permit, run: intercepted }) };
        const watcher = setup(kind, adapter);
        try {
          const pending = watcher.observe({ sessionId: "session" });
          assert.equal(pending?.status, "pending");
          const response = respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human" });
          await pause(80);
          const received = fs.existsSync(path.join(directory, "received")) ? fs.readFileSync(path.join(directory, "received")) : Buffer.alloc(0);
          const answered = await query({ type: "SESSION_PROMPT_ANSWERED" });
          const attempts = await query({ type: "SESSION_PROMPT_ANSWER_ATTEMPT" });
          if (redraw) {
            assert.equal(received.length, 0, `changed ${kind} prompt must receive zero bytes; got ${received.toString("hex")}`);
            assert.equal(response.promptAnswer?.status, "not_answered");
            assert.equal(answered.length, 0);
            assert.ok(attempts.some((event) => event.outcome === "refused"));
          } else {
            assert.deepEqual(received, Buffer.from("\r"));
            assert.equal(response.promptAnswer?.status, "answered");
            assert.equal(answered.length, 1);
            respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human" });
            watcher.answer(pending);
            await pause(30);
            assert.deepEqual(fs.readFileSync(path.join(directory, "received")), Buffer.from("\r"));
          }
          assert.deepEqual(writes, ["agents-submit-v1"], "prompt input uses only one guarded transport operation");
          assert.equal(run(["list-buffers"]).stdout, "", "owned evidence buffers are consumed or cleaned");
        } finally { watcher.close(); }
      });
    });
  }
}
