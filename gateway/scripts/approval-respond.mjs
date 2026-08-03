#!/usr/bin/env node
import { configureAudit } from "../src/core/audit.js";
import { initState } from "../src/core/state.js";
import { loadConfig } from "../src/config.js";
import { respond } from "../src/services/approval_service.js";

function flagValue(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

try {
  const args = process.argv.slice(2);
  const config = loadConfig();
  initState({ stateDb: config.stateDb });
  configureAudit({ auditLog: config.auditLog });

  const result = respond({
    approvalId: flagValue(args, "--approval-id"),
    decision: flagValue(args, "--decision"),
    decidedBy: flagValue(args, "--decided-by") || "operator",
    note: flagValue(args, "--note") || "",
  });
  process.stdout.write(JSON.stringify(result));
} catch (err) {
  process.stdout.write(JSON.stringify({ error: String(err?.message || err) }));
  process.exitCode = 1;
}
