import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_COORDINATION_LEASE_TTL_MS,
  DEFAULT_COORDINATION_SCOPE_ID,
  MAX_COORDINATION_LEASE_TTL_MS,
} from "./core/coordination_contract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SAFE_COORDINATION_SCOPE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function resolveUnderWorkspace(envValue, defaultRelPath, workspace) {
  if (envValue && path.isAbsolute(envValue)) return envValue;
  const rel = envValue || defaultRelPath;
  return path.resolve(workspace, rel);
}

function parseInteger(envValue, defaultValue) {
  if (envValue === undefined || envValue === "") return defaultValue;
  const parsed = Number(envValue);
  return Number.isInteger(parsed) ? parsed : defaultValue;
}

function parsePositiveInteger(envValue, defaultValue, envName) {
  if (envValue === undefined || envValue === "") return defaultValue;
  const parsed = Number(envValue);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new TypeError(`${envName} must be a positive integer`);
  }
  return parsed;
}

function parseBoundedPositiveInteger(envValue, defaultValue, envName, maximum) {
  const parsed = parsePositiveInteger(envValue, defaultValue, envName);
  if (parsed > maximum) {
    throw new TypeError(`${envName} must not exceed ${maximum}`);
  }
  return parsed;
}

function parseCsv(envValue) {
  return String(envValue || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(envValue, defaultValue = false) {
  if (envValue === undefined || envValue === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(envValue).toLowerCase());
}

function parseCoordinationScopeId(envValue) {
  const value =
    envValue === undefined ? DEFAULT_COORDINATION_SCOPE_ID : envValue;
  if (
    typeof value !== "string"
    || !SAFE_COORDINATION_SCOPE_ID.test(value)
  ) {
    throw new TypeError(
      "AGENTS_COORDINATION_SCOPE_ID must be a safe coordination identifier",
    );
  }
  return value;
}

const COORDINATION_MESSAGE_V1_BODY_MAX_LENGTH = 65_536;
const PROCESS_MESSAGE_ACCESS_SECRET = crypto.randomBytes(32).toString("hex");

function loadOrCreateMessageAccessSecret(env, workspace) {
  if (env.AGENTS_MESSAGE_ACCESS_SECRET) return env.AGENTS_MESSAGE_ACCESS_SECRET;

  const secretPath = resolveUnderWorkspace(
    env.AGENTS_MESSAGE_ACCESS_SECRET_FILE,
    "secrets/message-access.key",
    workspace,
  );

  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, "utf-8").trim();
      if (existing.length >= 32) return existing;
    }

    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    const secret = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(secretPath, `${secret}\n`, { encoding: "utf-8", mode: 0o600 });
    return secret;
  } catch (err) {
    process.stderr.write(
      `${JSON.stringify({
        ts: new Date().toISOString(),
        level: "warn",
        component: "gateway",
        msg: "message access secret file unavailable; using process fallback",
        error: String(err?.message || err),
        secretPath,
      })}\n`,
    );
    return PROCESS_MESSAGE_ACCESS_SECRET;
  }
}

export function loadConfig(env = process.env) {
  const workspace = env.AGENTS_WORKSPACE
    ? path.resolve(env.AGENTS_WORKSPACE)
    : path.resolve(REPO_ROOT, "workspace");
  const coordinationLeaseDefaultMs = parsePositiveInteger(
    env.AGENTS_COORDINATION_LEASE_DEFAULT_MS,
    DEFAULT_COORDINATION_LEASE_TTL_MS,
    "AGENTS_COORDINATION_LEASE_DEFAULT_MS",
  );
  const coordinationLeaseMaxMs = parseBoundedPositiveInteger(
    env.AGENTS_COORDINATION_LEASE_MAX_MS,
    MAX_COORDINATION_LEASE_TTL_MS,
    "AGENTS_COORDINATION_LEASE_MAX_MS",
    MAX_COORDINATION_LEASE_TTL_MS,
  );
  if (coordinationLeaseDefaultMs > coordinationLeaseMaxMs) {
    throw new TypeError(
      "AGENTS_COORDINATION_LEASE_DEFAULT_MS must not exceed AGENTS_COORDINATION_LEASE_MAX_MS",
    );
  }

  return {
    repoRoot: REPO_ROOT,
    workspace,
    policiesDir: env.AGENTS_POLICIES_DIR
      ? path.resolve(env.AGENTS_POLICIES_DIR)
      : path.resolve(REPO_ROOT, "policies"),
    stateDb: resolveUnderWorkspace(env.AGENTS_STATE_DB, "state/state.db", workspace),
    auditLog: resolveUnderWorkspace(env.AGENTS_AUDIT_LOG, "audit/events.jsonl", workspace),
    redisUrl: env.AGENTS_REDIS_URL || "",
    redisStream: env.AGENTS_REDIS_STREAM || "agents:events",
    coordinationRedisUrl: env.AGENTS_COORDINATION_REDIS_URL || env.AGENTS_REDIS_URL || "",
    coordinationPrefix: env.AGENTS_COORDINATION_PREFIX || "agents:coord:v1",
    coordinationScopeId: parseCoordinationScopeId(
      env.AGENTS_COORDINATION_SCOPE_ID,
    ),
    coordinationLeaseDefaultMs,
    coordinationLeaseMaxMs,
    coordinationInboxMaxLen: parsePositiveInteger(
      env.AGENTS_COORDINATION_INBOX_MAX_LEN,
      10_000,
      "AGENTS_COORDINATION_INBOX_MAX_LEN",
    ),
    coordinationMaxBlockMs: parsePositiveInteger(
      env.AGENTS_COORDINATION_MAX_BLOCK_MS,
      30_000,
      "AGENTS_COORDINATION_MAX_BLOCK_MS",
    ),
    coordinationMessageMaxBytes: parseBoundedPositiveInteger(
      env.AGENTS_COORDINATION_MESSAGE_MAX_BYTES,
      COORDINATION_MESSAGE_V1_BODY_MAX_LENGTH,
      "AGENTS_COORDINATION_MESSAGE_MAX_BYTES",
      COORDINATION_MESSAGE_V1_BODY_MAX_LENGTH,
    ),
    coordinationDedupeTtlMs: parsePositiveInteger(
      env.AGENTS_COORDINATION_DEDUPE_TTL_MS,
      86_400_000,
      "AGENTS_COORDINATION_DEDUPE_TTL_MS",
    ),
    coordinationAckTombstoneTtlMs: parsePositiveInteger(
      env.AGENTS_COORDINATION_ACK_TOMBSTONE_TTL_MS,
      86_400_000,
      "AGENTS_COORDINATION_ACK_TOMBSTONE_TTL_MS",
    ),
    coordinationOrphanInboxTtlMs: parsePositiveInteger(
      env.AGENTS_COORDINATION_ORPHAN_INBOX_TTL_MS,
      86_400_000,
      "AGENTS_COORDINATION_ORPHAN_INBOX_TTL_MS",
    ),
    artifactStoreRoot: resolveUnderWorkspace(env.AGENTS_ARTIFACT_STORE, "artifacts", workspace),
    tmuxPrefix: env.AGENTS_TMUX_PREFIX || "ag-",
    approvalMaxWaitMs: parseInteger(env.AGENTS_APPROVAL_MAX_WAIT_MS, 60_000),
    agentTimeoutMs: parseInteger(env.AGENTS_AGENT_TIMEOUT_MS, 600_000),
    messageAccessSecret: loadOrCreateMessageAccessSecret(env, workspace),
    codexBin: env.AGENTS_CODEX_BIN || "codex",
    codexSandbox: env.AGENTS_CODEX_SANDBOX || "workspace-write",
    dryRun: env.AGENTS_DRY_RUN === "1",
    repoRoots: (env.AGENTS_REPO_ROOTS || "").split(":").filter(Boolean),
    autoApproveScopes: parseCsv(env.AGENTS_AUTOAPPROVE),
    telemetry: {
      enabled: parseBoolean(env.AGENTS_OTEL_ENABLED, false),
      exporter: env.AGENTS_OTEL_EXPORTER || "stderr",
      serviceName: env.AGENTS_OTEL_SERVICE_NAME || "agents-gateway",
    },
  };
}
