// Isolate uncaught timer errors from the test runner while tracking real timers.
import fs from "node:fs";
import path from "node:path";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { configureAudit } from "../../gateway/src/core/audit.js";
import { createOrchestration } from "../../gateway/src/core/repositories/orchestration_repo.js";
import * as tasks from "../../gateway/src/core/repositories/task_repo.js";
import * as sessions from "../../gateway/src/core/repositories/session_repo.js";
import { createSessionPromptWatcher } from "../../gateway/src/services/session_prompt_service.js";

const directory = process.argv[2];
initState({ stateDb: path.join(directory, "state.db") });
configureAudit({ auditLog: path.join(directory, "audit.jsonl") });
const now = new Date().toISOString();
createOrchestration({ sessionId: "owner", traceId: "trace", callerAgent: "claude-code", callerRole: "orchestrator", status: "active", goal: "crash fixture", createdAt: now });
tasks.createTask({ taskId: "task", traceId: "trace", assignedAgent: "codex", assignedRole: "coder", repo: "fixture", status: "pending", createdAt: now, closedAt: null });
sessions.createSession({ sessionId: "session", taskId: "task", traceId: "trace", agent: "codex", role: "coder", tmuxTarget: "fixture", status: "running", startedAt: now, closedAt: null });
const mode = process.argv[3];
const pending = new Set();
const uncaught = [];
const realSetTimeout = globalThis.setTimeout;
const realClearTimeout = globalThis.clearTimeout;
globalThis.setTimeout = (callback, ms, ...args) => {
  let handle;
  handle = realSetTimeout(() => { pending.delete(handle); callback(...args); }, ms);
  if (callback.name === "tick") pending.add(handle);
  return handle;
};
globalThis.clearTimeout = (handle) => { pending.delete(handle); realClearTimeout(handle); };
process.on("uncaughtException", (error) => uncaught.push(error.message));
const adapter = { capturePrompt() { throw new Error("capture failed"); }, recognizePrompt() { return null; } };
const watcher = createSessionPromptWatcher({ adapters: { get: () => adapter }, registries: {} });
watcher.watch("session");
if (mode === "state-loss") resetState();
else fs.appendFileSync = () => { throw new Error("audit sink failed"); };
realSetTimeout(() => {
  console.log(JSON.stringify({ mode, uncaught, pendingPromptTimers: pending.size }));
  process.exit(0);
}, 1200);
