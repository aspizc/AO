import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

import { sanitize } from "./sanitizer.js";

let config = null;

const RESERVED_STREAM_KEYS = new Set([
  "eventId",
  "timestamp",
  "traceId",
  "type",
  "event_type",
  "eventType",
  "tool_name",
  "toolName",
  "actor_role",
  "actorRole",
  "action",
  "requesterRole",
  "role",
  "where",
]);

const RESTRICTED_METADATA_KEY_PARTS = [
  "artifact",
  "classification",
  "content",
  "raw",
  "restricted",
  "prompt",
  "payload",
  "secret",
  "token",
  "password",
  "stdout",
  "stderr",
  "stack",
];

export function configureAudit({
  auditLog,
  redisUrl = process.env.AGENTS_REDIS_URL || "",
  redisStream = process.env.AGENTS_REDIS_STREAM || "agents:events",
  redisPublisher = null,
}) {
  if (!auditLog) throw new TypeError("auditLog path required");
  fs.mkdirSync(path.dirname(auditLog), { recursive: true });
  const normalizedRedisUrl = String(redisUrl || "");
  config = {
    auditLog,
    redis:
      normalizedRedisUrl || redisPublisher
        ? {
            stream: redisStream || "agents:events",
            publisher: redisPublisher || createRedisCliPublisher({ redisUrl: normalizedRedisUrl }),
          }
        : null,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function appendJsonl(event) {
  if (!config) throw new Error("audit not configured; call configureAudit first");
  if (!event || typeof event !== "object" || Array.isArray(event) || !event.type) {
    throw new TypeError("audit event requires {type, ...}");
  }

  const enriched = {
    ...event,
    eventId: crypto.randomUUID(),
    timestamp: nowIso(),
  };
  fs.appendFileSync(config.auditLog, `${JSON.stringify(enriched)}\n`, "utf-8");
  return enriched;
}

export function appendLocalOnly(event) {
  return appendJsonl(event);
}

export function append(event) {
  const enriched = appendJsonl(event);
  publishBestEffort(enriched);
  return enriched;
}

export function createRedisCliPublisher({ redisUrl, timeoutMs = 500, onError = warnRedisPublishFailure } = {}) {
  if (!redisUrl) throw new TypeError("redisUrl required");
  return ({ stream, envelope }) => {
    const args = [
      "-u",
      redisUrl,
      "XADD",
      stream,
      "*",
      "traceId",
      envelope.traceId,
      "event_type",
      envelope.event_type,
      "tool_name",
      envelope.tool_name,
      "actor_role",
      envelope.actor_role,
      "timestamp",
      envelope.timestamp,
      "eventId",
      envelope.eventId,
      "metadata",
      JSON.stringify(envelope.metadata),
    ];
    const child = spawn("redis-cli", args, {
      stdio: "ignore",
      windowsHide: true,
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
      onError(new Error(`redis-cli timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    timer.unref?.();
    child.on("error", (err) => {
      clearTimeout(timer);
      onError(err);
    });
    child.on("close", (status) => {
      clearTimeout(timer);
      if (timedOut) return;
      if (status !== 0) {
        onError(new Error(`redis-cli exited with status ${status}`));
      }
    });
    if (typeof child.unref === "function") {
      child.unref();
    }
  };
}

function publishBestEffort(event) {
  if (!config?.redis) return;
  try {
    config.redis.publisher({
      stream: config.redis.stream,
      envelope: streamEnvelope(event),
    });
  } catch (err) {
    warnRedisPublishFailure(err);
  }
}

function warnRedisPublishFailure(err) {
  process.stderr.write(
    `${JSON.stringify({
      ts: nowIso(),
      level: "warn",
      component: "audit",
      msg: "redis audit publish failed",
      error: String(err?.message || err),
    })}\n`,
  );
}

function streamEnvelope(event) {
  return {
    traceId: safeStreamString(event.traceId),
    event_type: safeStreamString(event.type),
    tool_name: safeStreamString(event.tool_name ?? event.toolName ?? event.action ?? event.where),
    actor_role: safeStreamString(event.actor_role ?? event.actorRole ?? event.role ?? event.requesterRole),
    timestamp: safeStreamString(event.timestamp),
    eventId: safeStreamString(event.eventId),
    metadata: sanitizedMetadata(event),
  };
}

function sanitizedMetadata(event) {
  const metadata = {};
  for (const [key, value] of Object.entries(event)) {
    if (RESERVED_STREAM_KEYS.has(key) || isRestrictedMetadataKey(key)) continue;
    const sanitized = sanitizeMetadataValue(value);
    if (sanitized !== undefined) metadata[key] = sanitized;
  }
  return metadata;
}

function sanitizeMetadataValue(value) {
  if (value === null || value === undefined) return value;
  if (Buffer.isBuffer(value)) return undefined;
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeMetadataValue(item))
      .filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      if (isRestrictedMetadataKey(key)) continue;
      const sanitized = sanitizeMetadataValue(nested);
      if (sanitized !== undefined) out[key] = sanitized;
    }
    return out;
  }
  if (typeof value === "string") {
    return sanitizeMetadataString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value).slice(0, 1_000);
}

function isRestrictedMetadataKey(key) {
  const normalized = String(key).toLowerCase();
  return RESTRICTED_METADATA_KEY_PARTS.some((part) => normalized.includes(part));
}

function isRestrictedMetadataString(value) {
  return /(^|[^a-z0-9])(raw|restricted)([^a-z0-9]|$)/i.test(value);
}

function sanitizeMetadataString(value) {
  if (isRestrictedMetadataString(value)) return undefined;
  try {
    return sanitize(value, { kind: "summary" }).sanitized.slice(0, 1_000);
  } catch {
    return value.slice(0, 1_000);
  }
}

function safeStreamString(value) {
  if (value === null || value === undefined) return "";
  return String(value).slice(0, 1_000);
}

function appendLimited(out, event, limit) {
  if (limit === 0) return;
  out.push(event);
  if (out.length > limit) {
    out.shift();
  }
}

export async function query({ traceId, type, limit = 100 } = {}) {
  if (!config) throw new Error("audit not configured; call configureAudit first");
  if (!fs.existsSync(config.auditLog)) return [];

  const normalizedLimit = Math.max(0, Number.isInteger(limit) ? limit : 100);
  const stream = fs.createReadStream(config.auditLog, { encoding: "utf-8" });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const out = [];

  for await (const raw of lines) {
    if (!raw.trim()) continue;
    let event;
    try {
      event = JSON.parse(raw);
    } catch {
      appendLimited(out, { _corrupt: true, raw }, normalizedLimit);
      continue;
    }

    if (traceId && event.traceId !== traceId) continue;
    if (type && event.type !== type) continue;
    appendLimited(out, event, normalizedLimit);
  }

  return out;
}

export function _resetForTests() {
  config = null;
}
