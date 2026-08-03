#!/usr/bin/env node
import { configureAudit, query } from "../src/core/audit.js";
import { loadConfig } from "../src/config.js";

const args = process.argv.slice(2);

function get(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

const traceId = get("--trace-id");
const type = get("--type");
const limit = Number(get("--limit") || 100);

const config = loadConfig();
configureAudit({ auditLog: config.auditLog });

const events = await query({ traceId, type, limit });
process.stdout.write(JSON.stringify(events));
