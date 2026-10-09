// Cross-process owner whose actual guarded transport pauses before finalization.
import fs from "node:fs";
import path from "node:path";
import { initState } from "../../gateway/src/core/state.js";
import { configureAudit } from "../../gateway/src/core/audit.js";
import * as approvals from "../../gateway/src/core/repositories/approval_repo.js";
import { createSessionPromptWatcher } from "../../gateway/src/services/session_prompt_service.js";
import { recognizeCodexPrompt } from "../../gateway/src/adapters/codex_adapter.js";
import { answerSessionPrompt } from "../../gateway/src/adapters/session_prompt.js";
import { promptTransportFixture } from "./session_prompt_transport_fixture.js";
const directory = process.argv[2];
const deadline = Date.now() + 30_000;
initState({ stateDb: path.join(directory, "state.db") });
configureAudit({ auditLog: path.join(directory, "audit.jsonl") });
const snapshot = fs.readFileSync(new URL("./fixtures/session_prompts/codex-command.txt", import.meta.url), "utf8");
const capture = { snapshot, target: "%1", serverPid: "100", panePid: "200" };
let id, inputs = 0;
const transport = promptTransportFixture({ current: () => capture, onInput: () => {
  inputs++;
  process.send({ status: "in_flight", payload: approvals.getApproval(id).payload });
  const wait = new Int32Array(new SharedArrayBuffer(4));
  while (!fs.existsSync(path.join(directory, "finish"))) {
    if (Date.now() > deadline) throw new Error("owner fixture timed out");
    Atomics.wait(wait, 0, 0, 20);
  }
} });
const adapter = { recognizePrompt: recognizeCodexPrompt, capturePrompt: () => capture,
  answerPrompt: ({ permit }) => answerSessionPrompt({ permit, run: transport.run }) };
const registries = { getRole: () => ({ allowActions: ["code.write", "session.prompt.command"], denyActions: [], sessionPromptScopes: [] }),
  getAgent: () => ({ allowedRoles: ["coder"], allowedClassifications: ["internal"], requiresApprovalFor: [] }),
  getRepo: () => ({ classification: "internal", allowedAgents: ["codex"] }), getProtectedBranches: () => [] };
const watcher = createSessionPromptWatcher({ adapters: { get: () => adapter }, registries });
id = watcher.observe({ sessionId: "session" }).approvalId;
process.send({ approvalId: id });
const timer = setInterval(() => {
  if (Date.now() >= deadline) {
    clearInterval(timer);
    watcher.close();
    process.stderr.write("owner fixture overall deadline exceeded\n");
    process.exit(1);
  }
  watcher.observe({ sessionId: "session" });
  const answer = approvals.promptAnswerResult(approvals.getApproval(id));
  if (answer?.status === "answered") {
    clearInterval(timer);
    process.send({ answer, inputs }, () => { watcher.close(); process.exit(0); });
  }
}, 50);
