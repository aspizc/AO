import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "../../gateway/src/config.js";

test("relative_paths_resolve_under_workspace", () => {
  const config = loadConfig({
    AGENTS_WORKSPACE: "/tmp/agents-workspace",
    AGENTS_AUDIT_LOG: "audit/custom.jsonl",
    AGENTS_STATE_DB: "state/custom.db",
    AGENTS_ARTIFACT_STORE: "artifacts-custom",
  });

  assert.equal(config.auditLog, "/tmp/agents-workspace/audit/custom.jsonl");
  assert.equal(config.stateDb, "/tmp/agents-workspace/state/custom.db");
  assert.equal(config.artifactStoreRoot, "/tmp/agents-workspace/artifacts-custom");
});

test("absolute_paths_are_preserved", () => {
  const config = loadConfig({
    AGENTS_AUDIT_LOG: "/var/log/agents/events.jsonl",
    AGENTS_STATE_DB: "/var/lib/agents/state.db",
    AGENTS_ARTIFACT_STORE: "/var/lib/agents/artifacts",
  });

  assert.equal(config.auditLog, "/var/log/agents/events.jsonl");
  assert.equal(config.stateDb, "/var/lib/agents/state.db");
  assert.equal(config.artifactStoreRoot, "/var/lib/agents/artifacts");
});

test("workspace_defaults_are_local", () => {
  const config = loadConfig({});

  assert.ok(config.workspace.endsWith("/workspace"));
  assert.ok(config.auditLog.endsWith("/workspace/audit/events.jsonl"));
  assert.ok(config.stateDb.endsWith("/workspace/state/state.db"));
  assert.ok(config.artifactStoreRoot.endsWith("/workspace/artifacts"));
});

test("redis_config_defaults_to_disabled_with_default_stream", () => {
  const config = loadConfig({});

  assert.equal(config.redisUrl, "");
  assert.equal(config.redisStream, "agents:events");
});

test("redis_config_loads_url_and_stream_override", () => {
  const config = loadConfig({
    AGENTS_REDIS_URL: "redis://redis.example:6379/2",
    AGENTS_REDIS_STREAM: "agents:test-events",
  });

  assert.equal(config.redisUrl, "redis://redis.example:6379/2");
  assert.equal(config.redisStream, "agents:test-events");
});

test("coordination_config_has_bounded_defaults_and_reuses_the_shared_redis_url", () => {
  const disabledConfig = loadConfig({});
  const config = loadConfig({
    AGENTS_REDIS_URL: "redis://redis.example:6379/3",
  });

  assert.equal(disabledConfig.coordinationRedisUrl, "");
  assert.equal(config.coordinationRedisUrl, "redis://redis.example:6379/3");
  assert.equal(config.coordinationPrefix, "agents:coord:v1");
  assert.equal(config.coordinationScopeId, "agents-orchestrator");
  assert.equal(config.coordinationLeaseDefaultMs, 900_000);
  assert.equal(config.coordinationLeaseMaxMs, 3_600_000);
  assert.equal(config.coordinationInboxMaxLen, 10_000);
  assert.equal(config.coordinationMaxBlockMs, 30_000);
  assert.equal(config.coordinationMessageMaxBytes, 65_536);
  assert.equal(config.coordinationDedupeTtlMs, 86_400_000);
  assert.equal(config.coordinationAckTombstoneTtlMs, 86_400_000);
  assert.equal(config.coordinationOrphanInboxTtlMs, 86_400_000);
});

test("coordination_config_loads_explicit_url_and_bounded_setting_overrides", () => {
  const config = loadConfig({
    AGENTS_REDIS_URL: "redis://shared.example:6379/0",
    AGENTS_COORDINATION_REDIS_URL: "redis://coordination.example:6379/4",
    AGENTS_COORDINATION_PREFIX: "acme:coord:test",
    AGENTS_COORDINATION_SCOPE_ID: "project:agents-orchestrator",
    AGENTS_COORDINATION_LEASE_DEFAULT_MS: "45000",
    AGENTS_COORDINATION_LEASE_MAX_MS: "600000",
    AGENTS_COORDINATION_INBOX_MAX_LEN: "2500",
    AGENTS_COORDINATION_MAX_BLOCK_MS: "5000",
    AGENTS_COORDINATION_MESSAGE_MAX_BYTES: "32768",
    AGENTS_COORDINATION_DEDUPE_TTL_MS: "7200000",
    AGENTS_COORDINATION_ACK_TOMBSTONE_TTL_MS: "3600000",
    AGENTS_COORDINATION_ORPHAN_INBOX_TTL_MS: "1800000",
  });

  assert.equal(config.coordinationRedisUrl, "redis://coordination.example:6379/4");
  assert.equal(config.coordinationPrefix, "acme:coord:test");
  assert.equal(config.coordinationScopeId, "project:agents-orchestrator");
  assert.equal(config.coordinationLeaseDefaultMs, 45_000);
  assert.equal(config.coordinationLeaseMaxMs, 600_000);
  assert.equal(config.coordinationInboxMaxLen, 2_500);
  assert.equal(config.coordinationMaxBlockMs, 5_000);
  assert.equal(config.coordinationMessageMaxBytes, 32_768);
  assert.equal(config.coordinationDedupeTtlMs, 7_200_000);
  assert.equal(config.coordinationAckTombstoneTtlMs, 3_600_000);
  assert.equal(config.coordinationOrphanInboxTtlMs, 1_800_000);
});

test("coordination_config_rejects_an_invalid_canonical_scope", () => {
  for (const value of ["", "scope with spaces", "scope/with/slashes", `s${"x".repeat(128)}`]) {
    assert.throws(
      () =>
        loadConfig({
          AGENTS_COORDINATION_SCOPE_ID: value,
        }),
      /AGENTS_COORDINATION_SCOPE_ID/,
    );
  }
});

test("coordination_config_rejects_invalid_or_non_positive_integer_settings", () => {
  const names = [
    "AGENTS_COORDINATION_LEASE_DEFAULT_MS",
    "AGENTS_COORDINATION_LEASE_MAX_MS",
    "AGENTS_COORDINATION_INBOX_MAX_LEN",
    "AGENTS_COORDINATION_MAX_BLOCK_MS",
    "AGENTS_COORDINATION_MESSAGE_MAX_BYTES",
    "AGENTS_COORDINATION_DEDUPE_TTL_MS",
    "AGENTS_COORDINATION_ACK_TOMBSTONE_TTL_MS",
    "AGENTS_COORDINATION_ORPHAN_INBOX_TTL_MS",
  ];

  for (const name of names) {
    for (const value of ["0", "-1", "1.5", "not-an-integer"]) {
      assert.throws(() => loadConfig({ [name]: value }), new RegExp(name));
    }
  }
});

test("coordination_message_max_bytes_cannot_exceed_the_v1_schema_body_limit", () => {
  const config = loadConfig({
    AGENTS_COORDINATION_MESSAGE_MAX_BYTES: "65536",
  });

  assert.equal(config.coordinationMessageMaxBytes, 65_536);
  assert.throws(
    () =>
      loadConfig({
        AGENTS_COORDINATION_MESSAGE_MAX_BYTES: "65537",
      }),
    /AGENTS_COORDINATION_MESSAGE_MAX_BYTES must not exceed 65536/,
  );
});

test("coordination_config_rejects_a_default_lease_above_the_maximum", () => {
  assert.throws(
    () =>
      loadConfig({
        AGENTS_COORDINATION_LEASE_DEFAULT_MS: "60000",
        AGENTS_COORDINATION_LEASE_MAX_MS: "30000",
      }),
    /AGENTS_COORDINATION_LEASE_DEFAULT_MS/,
  );
});

test("coordination_config_rejects_a_lease_maximum_above_the_v1_contract", () => {
  assert.throws(
    () =>
      loadConfig({
        AGENTS_COORDINATION_LEASE_MAX_MS: "3600001",
      }),
    /AGENTS_COORDINATION_LEASE_MAX_MS must not exceed 3600000/,
  );
});

test("policies_dir_defaults_to_repo_and_env_override_is_resolved", () => {
  const defaultConfig = loadConfig({});
  const overrideConfig = loadConfig({ AGENTS_POLICIES_DIR: "custom-policies" });

  assert.ok(defaultConfig.policiesDir.endsWith("/policies"));
  assert.equal(overrideConfig.policiesDir, path.resolve("custom-policies"));
});

test("approval_max_wait_ms_default_60s", () => {
  assert.equal(loadConfig({}).approvalMaxWaitMs, 60_000);
  assert.equal(loadConfig({ AGENTS_APPROVAL_MAX_WAIT_MS: "2500" }).approvalMaxWaitMs, 2500);
});

test("agent_timeout_ms_default_600s", () => {
  assert.equal(loadConfig({}).agentTimeoutMs, 600_000);
  assert.equal(loadConfig({ AGENTS_AGENT_TIMEOUT_MS: "2500" }).agentTimeoutMs, 2500);
});

test("dry_run_flag", () => {
  assert.equal(loadConfig({ AGENTS_DRY_RUN: "1" }).dryRun, true);
  assert.equal(loadConfig({}).dryRun, false);
});

test("codex_binary_and_sandbox_defaults_and_overrides", () => {
  const defaultConfig = loadConfig({});
  const overrideConfig = loadConfig({
    AGENTS_CODEX_BIN: "/opt/codex/bin/codex",
    AGENTS_CODEX_SANDBOX: "read-only",
  });

  assert.equal(defaultConfig.codexBin, "codex");
  assert.equal(defaultConfig.codexSandbox, "workspace-write");
  assert.equal(overrideConfig.codexBin, "/opt/codex/bin/codex");
  assert.equal(overrideConfig.codexSandbox, "read-only");
});

test("repo_roots_are_colon_separated", () => {
  const config = loadConfig({ AGENTS_REPO_ROOTS: "/repo/a:/repo/b" });

  assert.deepEqual(config.repoRoots, ["/repo/a", "/repo/b"]);
});

test("message access secret is high entropy and persisted under workspace", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "message-secret-"));
  const first = loadConfig({ AGENTS_WORKSPACE: workspace });
  const second = loadConfig({ AGENTS_WORKSPACE: workspace });
  const secretPath = path.join(workspace, "secrets", "message-access.key");

  assert.match(first.messageAccessSecret, /^[0-9a-f]{64}$/);
  assert.equal(second.messageAccessSecret, first.messageAccessSecret);
  assert.equal(fs.readFileSync(secretPath, "utf-8").trim(), first.messageAccessSecret);
});

test("message access secret env override wins", () => {
  const config = loadConfig({ AGENTS_MESSAGE_ACCESS_SECRET: "operator-secret" });

  assert.equal(config.messageAccessSecret, "operator-secret");
});
