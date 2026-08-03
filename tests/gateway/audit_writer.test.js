import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  _resetForTests,
  append,
  appendLocalOnly,
  configureAudit,
  createRedisCliPublisher,
} from "../../gateway/src/core/audit.js";
import { loadConfig } from "../../gateway/src/config.js";
import { configureSanitizer } from "../../gateway/src/core/sanitizer.js";

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "audit-"));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const RULES_PATH = path.join(REPO_ROOT, "policies", "sanitization-rules.json");

test("append_creates_file", () => {
  _resetForTests();
  const file = path.join(tmp(), "audit.jsonl");
  configureAudit({ auditLog: file });

  append({ type: "TEST_EVENT", traceId: "t1" });

  assert.ok(fs.existsSync(file));
});

test("append_writes_valid_json_line", () => {
  _resetForTests();
  const file = path.join(tmp(), "audit.jsonl");
  configureAudit({ auditLog: file });

  const event = append({ type: "TEST_EVENT", traceId: "t1", payload: { a: 1 } });
  const line = fs.readFileSync(file, "utf-8").trim();
  const parsed = JSON.parse(line);

  assert.equal(parsed.type, "TEST_EVENT");
  assert.equal(parsed.traceId, "t1");
  assert.deepEqual(parsed.payload, { a: 1 });
  assert.equal(parsed.eventId, event.eventId);
  assert.match(parsed.eventId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.match(parsed.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

test("appendLocalOnly writes enriched JSONL without invoking the Redis publisher", () => {
  _resetForTests();
  const file = path.join(tmp(), "audit.jsonl");
  const published = [];
  configureAudit({
    auditLog: file,
    redisPublisher: (entry) => published.push(entry),
  });

  const local = appendLocalOnly({
    type: "COORDINATION_TEST",
    traceId: "tr-local-only",
  });
  assert.match(local.eventId, /^[0-9a-f-]{36}$/i);
  assert.match(local.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(published.length, 0);

  const legacy = append({
    type: "LEGACY_TEST",
    traceId: "tr-legacy",
  });
  assert.equal(published.length, 1);
  assert.equal(published[0].stream, "agents:events");
  assert.equal(published[0].envelope.eventId, legacy.eventId);

  const lines = fs
    .readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.deepEqual(
    lines.map(({ type }) => type),
    ["COORDINATION_TEST", "LEGACY_TEST"],
  );
});

test("appendLocalOnly preserves append validation and configuration errors", () => {
  _resetForTests();
  assert.throws(
    () => appendLocalOnly({ type: "COORDINATION_TEST" }),
    /configureAudit/,
  );

  configureAudit({
    auditLog: path.join(tmp(), "audit.jsonl"),
  });
  assert.throws(() => appendLocalOnly({}), TypeError);
});

test("existing_lines_are_not_mutated", () => {
  _resetForTests();
  const file = path.join(tmp(), "audit.jsonl");
  configureAudit({ auditLog: file });

  append({ type: "A" });
  const snapshot = fs.readFileSync(file, "utf-8");
  append({ type: "B" });
  const after = fs.readFileSync(file, "utf-8");

  assert.ok(after.startsWith(snapshot), "first line was modified");
  assert.equal(after.split("\n").filter(Boolean).length, 2);
});

test("requires_configure_before_append", () => {
  _resetForTests();
  assert.throws(() => append({ type: "TEST_EVENT" }), /configureAudit/);
});

test("requires_type_field", () => {
  _resetForTests();
  configureAudit({ auditLog: path.join(tmp(), "audit.jsonl") });

  assert.throws(() => append({}), TypeError);
});

test("configure_creates_parent_directory", () => {
  _resetForTests();
  const file = path.join(tmp(), "nested", "audit", "events.jsonl");

  configureAudit({ auditLog: file });
  append({ type: "TEST_EVENT" });

  assert.ok(fs.existsSync(path.dirname(file)));
  assert.ok(fs.existsSync(file));
});

test("redis_publisher_uses_default_stream_when_redis_url_is_configured", () => {
  _resetForTests();
  const file = path.join(tmp(), "audit.jsonl");
  const published = [];
  configureAudit({
    auditLog: file,
    redisUrl: "redis://localhost:6379/0",
    redisPublisher: (entry) => published.push(entry),
  });

  const event = append({
    type: "TOOL_CALLED",
    traceId: "trace-redis-default",
    toolName: "agent.delegate",
    role: "planner",
    allowed: true,
  });

  assert.equal(published.length, 1);
  assert.equal(published[0].stream, "agents:events");
  assert.deepEqual(published[0].envelope, {
    traceId: "trace-redis-default",
    event_type: "TOOL_CALLED",
    tool_name: "agent.delegate",
    actor_role: "planner",
    timestamp: event.timestamp,
    eventId: event.eventId,
    metadata: { allowed: true },
  });
});

test("redis_publisher_failure_does_not_break_jsonl_append", () => {
  _resetForTests();
  const file = path.join(tmp(), "audit.jsonl");
  const originalWrite = process.stderr.write;
  const stderr = [];
  process.stderr.write = function write(chunk, ...args) {
    stderr.push(String(chunk));
    const callback = args.find((arg) => typeof arg === "function");
    if (callback) callback();
    return true;
  };

  try {
    configureAudit({
      auditLog: file,
      redisPublisher: () => {
        throw new Error("redis unavailable");
      },
    });

    assert.doesNotThrow(() => append({ type: "TEST_EVENT", traceId: "trace-publish-failure" }));
  } finally {
    process.stderr.write = originalWrite;
  }

  const parsed = JSON.parse(fs.readFileSync(file, "utf-8").trim());
  assert.equal(parsed.type, "TEST_EVENT");
  assert.equal(parsed.traceId, "trace-publish-failure");
  assert.match(stderr.join(""), /redis audit publish failed/);
});

test("redis_cli_publisher_requires_redis_url", () => {
  assert.throws(() => createRedisCliPublisher(), /redisUrl required/);
});

test("redis_stream_metadata_excludes_restricted_raw_fields", () => {
  _resetForTests();
  configureSanitizer({ rulesPath: RULES_PATH });
  const file = path.join(tmp(), "audit.jsonl");
  const published = [];
  configureAudit({
    auditLog: file,
    redisPublisher: (entry) => published.push(entry),
  });

  append({
    type: "ARTIFACT_PUT",
    traceId: "trace-tv-02",
    role: "restricted-coder",
    classification: "restricted",
    artifact: "raw-restricted-artifact",
    content: "restricted content",
    prompt: "restricted prompt",
    payload: { secret: "restricted payload", visible: "ok" },
    token: "sensitive-token",
    stdout: "restricted stdout",
    stderr: "restricted stderr",
    nested: {
      raw: "nested raw",
      artifactContent: "nested artifact content",
      child: {
        restrictedValue: "nested restricted",
        safeValue: "ok",
      },
    },
    summary: "sanitized summary",
    note: "api_key=abcdef1234567890",
  });

  assert.equal(published.length, 1);
  assert.deepEqual(published[0].envelope.metadata, {
    nested: { child: { safeValue: "ok" } },
    summary: "sanitized summary",
    note: "api_key=<REDACTED-SECRET>",
  });
});

test("config_default_audit_log_points_to_workspace_events_jsonl", () => {
  const config = loadConfig({ AGENTS_WORKSPACE: "/tmp/agents-workspace" });

  assert.equal(config.auditLog, "/tmp/agents-workspace/audit/events.jsonl");
});
