#!/usr/bin/env node
import { configureAudit } from "../src/core/audit.js";
import { initState } from "../src/core/state.js";
import { loadConfig } from "../src/config.js";
import { respondExternal } from "../src/services/approval_service.js";

function flagValue(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

try {
  const args = process.argv.slice(2);
  const decidedBy = flagValue(args, "--decided-by") || "operator";
  if (["operator-autonomous-mode", "session-prompt-watcher"].includes(decidedBy)) {
    throw new Error(`reserved decider ${decidedBy}`);
  }
  const config = loadConfig();
  initState({ stateDb: config.stateDb });
  configureAudit({ auditLog: config.auditLog });

  const result = await respondExternal({
    approvalId: flagValue(args, "--approval-id"),
    decision: flagValue(args, "--decision"),
    decidedBy,
    note: flagValue(args, "--note") || "",
  });
  process.stdout.write(JSON.stringify(result));
  if (result.isSessionPrompt && result.status !== "denied"
    && !(result.promptAnswer?.status === "answered" && result.promptAnswer?.outcome === "sent")) process.exitCode = 1;
} catch (err) {
  process.stdout.write(JSON.stringify({ error: String(err?.message || err) }));
  process.exitCode = 1;
}
