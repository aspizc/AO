// Separate process: simulate death after the guarded child received CR but before
// onOutcome/cleanup. No command is executed and no terminal result can be saved.
import fs from "node:fs";
import path from "node:path";
import { initState } from "../../gateway/src/core/state.js";
import { configureAudit } from "../../gateway/src/core/audit.js";
import { createOrchestration } from "../../gateway/src/core/repositories/orchestration_repo.js";
import * as tasks from "../../gateway/src/core/repositories/task_repo.js";
import * as sessions from "../../gateway/src/core/repositories/session_repo.js";
import { respond } from "../../gateway/src/services/approval_service.js";
import { createSessionPromptWatcher } from "../../gateway/src/services/session_prompt_service.js";
import { answerSessionPrompt } from "../../gateway/src/adapters/session_prompt.js";
import { recognizeCodexPrompt } from "../../gateway/src/adapters/codex_adapter.js";
import { promptTransportFixture } from "./session_prompt_transport_fixture.js";

const directory = process.argv[2];
initState({ stateDb: path.join(directory, "state.db") });
configureAudit({ auditLog: path.join(directory, "audit.jsonl") });
const now = new Date().toISOString();
createOrchestration({ sessionId: "owner", traceId: "trace", callerAgent: "claude-code", callerRole: "orchestrator", status: "active", goal: "crash fixture", createdAt: now });
tasks.createTask({ taskId: "task", traceId: "trace", assignedAgent: "codex", assignedRole: "coder", repo: "fixture", status: "pending", createdAt: now, closedAt: null });
sessions.createSession({ sessionId: "session", taskId: "task", traceId: "trace", agent: "codex", role: "coder", tmuxTarget: "fixture", status: "running", startedAt: now, closedAt: null });
const snapshot = "Would you like to run the following command?\n\n  $ npm test\n\n› 1. Yes, proceed (y)\n  2. No, and tell Codex what to do differently (esc)\n\nPress enter to confirm or esc to cancel";
const capture = { snapshot, target: "%1", serverPid: "100", panePid: "200" };
const transport = promptTransportFixture({ current: () => capture, guardResult: () => {
  fs.writeFileSync(path.join(directory, "child_received"), "\r");
  process.exit(75);
} });
const adapter = { recognizePrompt: recognizeCodexPrompt, capturePrompt: () => capture, answerPrompt: ({ permit }) => answerSessionPrompt({ permit, run: transport.run }) };
const registries = { getRole: () => ({ allowActions: [], denyActions: [] }), getAgent: () => ({ allowedRoles: ["coder"], allowedClassifications: ["internal"], requiresApprovalFor: [] }), getRepo: () => ({ classification: "internal", allowedAgents: ["codex"] }), getProtectedBranches: () => [] };
const watcher = createSessionPromptWatcher({ adapters: { get: () => adapter }, registries });
const pending = watcher.observe({ sessionId: "session" });
fs.writeFileSync(path.join(directory, "approval_id"), pending.approvalId);
respond({ approvalId: pending.approvalId, decision: "granted", decidedBy: "human" });
throw new Error("fixture must stop inside guard before onOutcome");
