import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  REQUEST_CONTEXT_ERROR,
  bindRequestContext,
  createGatewayRequestContext,
  createRequestContext,
  revokeRequestContext,
} from "../../gateway/src/core/request_context.js";
import {
  ACTION_CATALOG_VERSION,
  isCanonicalAction,
} from "../../gateway/src/core/policy_types.js";

function fixture(t, overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "request-context-"));
  const repository = path.join(root, "repository");
  const outside = path.join(root, "outside");
  fs.mkdirSync(path.join(repository, "nested"), { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  fs.symlinkSync(outside, path.join(repository, "escape"), "dir");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const context = createRequestContext({
    principalId: "local-operator",
    agent: "claude-code",
    role: "orchestrator",
    audience: "agents-gateway:test",
    connectionId: "connection-a",
    capabilities: [
      "orchestration.create",
      "orchestration.view",
      "task.assign",
      "agent.spawn",
    ],
    repositoryBindings: { "sample-apps": repository },
    lineage: {
      traces: [{ traceId: "tr-owned" }],
      tasks: [{
        taskId: "ts-owned",
        traceId: "tr-owned",
        repositoryId: "sample-apps",
        targetAgent: "codex",
        targetRole: "coder",
        targetAction: "code.write",
      }],
    },
    issuedAt: "2026-07-26T08:00:00.000Z",
    expiresAt: "2026-07-26T09:00:00.000Z",
    ...overrides,
  });

  return {
    context,
    outside: fs.realpathSync(outside),
    repository: fs.realpathSync(repository),
  };
}

function binding(overrides = {}) {
  return {
    action: "agent.spawn",
    actionCatalogVersion: ACTION_CATALOG_VERSION,
    audience: "agents-gateway:test",
    connectionId: "connection-a",
    args: {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      cwd: overrides.cwd,
      traceId: "tr-owned",
      taskId: "ts-owned",
    },
    now: "2026-07-26T08:30:00.000Z",
    ...overrides,
  };
}

function assertDenied(callback, reasonCode) {
  assert.throws(
    callback,
    (error) => {
      assert.equal(error.code, REQUEST_CONTEXT_ERROR);
      assert.equal(error.reasonCode, reasonCode);
      assert.equal(error.message, "request context denied");
      assert.doesNotMatch(
        JSON.stringify(error),
        /local-operator|connection-a|request-context-/,
      );
      return true;
    },
  );
}

test("closed action catalog includes protected tools and rejects absent names", () => {
  for (const action of [
    "orchestration.create",
    "task.assign",
    "agent.spawn",
    "artifact.get",
    "approval.request",
    "session.attach_info",
  ]) {
    assert.equal(isCanonicalAction(action), true, action);
  }
  assert.equal(isCanonicalAction("agent.spwan"), false);
  assert.equal(isCanonicalAction(""), false);
  assert.equal(isCanonicalAction(undefined), false);
});

test("effective actor, target, and canonical repository are server-bound", (t) => {
  const value = fixture(t);
  const effective = bindRequestContext(
    value.context,
    binding({ cwd: path.join(value.repository, "nested") }),
  );

  assert.equal(Object.isFrozen(value.context), true);
  assert.equal(Object.isFrozen(effective), true);
  assert.equal(value.context.capabilities, undefined);
  assert.deepEqual(effective.actor, {
    principalId: "local-operator",
    agent: "claude-code",
    role: "orchestrator",
  });
  assert.deepEqual(effective.target, {
    agent: "codex",
    role: "coder",
    action: "code.write",
  });
  assert.deepEqual(effective.repository, {
    id: "sample-apps",
    root: value.repository,
    cwd: path.join(value.repository, "nested"),
  });
  assert.equal(effective.traceId, "tr-owned");
  assert.equal(effective.taskId, "ts-owned");
  assert.equal(effective.capabilities, undefined);
});

test("caller assertions can deny but cannot replace server identity or capability", (t) => {
  const value = fixture(t);
  const cases = [
    [{ actorAgent: "codex" }, "context.agent_mismatch"],
    [{ actorRole: "coder" }, "context.role_mismatch"],
    [{ audience: "agents-gateway:other" }, "context.audience_mismatch"],
    [{ connectionId: "connection-b" }, "context.connection_mismatch"],
    [{ assertedCapabilities: ["agent.spawn", "approval.respond"] }, "context.capability_assertion_denied"],
  ];

  for (const [overrides, reasonCode] of cases) {
    assertDenied(
      () => bindRequestContext(
        value.context,
        binding({ cwd: value.repository, ...overrides }),
      ),
      reasonCode,
    );
  }
});

test("missing, misspelled, unauthorized, and version-skewed actions fail closed", (t) => {
  const value = fixture(t);
  const cases = [
    [{ action: "" }, "context.action_unknown"],
    [{ action: "agent.spwan" }, "context.action_unknown"],
    [{ action: "approval.respond" }, "context.capability_denied"],
    [{ actionCatalogVersion: ACTION_CATALOG_VERSION + 1 }, "context.action_catalog_version_mismatch"],
  ];

  for (const [overrides, reasonCode] of cases) {
    assertDenied(
      () => bindRequestContext(
        value.context,
        binding({ cwd: value.repository, ...overrides }),
      ),
      reasonCode,
    );
  }
});

test("repository claims resolve by realpath and reject symlink escapes and aliases", (t) => {
  const value = fixture(t);

  assertDenied(
    () => bindRequestContext(
      value.context,
      binding({
        cwd: path.join(value.repository, "escape"),
      }),
    ),
    "context.cwd_denied",
  );
  assertDenied(
    () => bindRequestContext(
      value.context,
      binding({
        cwd: value.repository,
        args: {
          ...binding({ cwd: value.repository }).args,
          repo: "developer-tools",
        },
      }),
    ),
    "context.repository_denied",
  );
});

test("trace, task, target, and repository lineage are checked together", (t) => {
  const value = fixture(t);
  const baseArgs = binding({ cwd: value.repository }).args;
  const cases = [
    [{ ...baseArgs, traceId: "tr-other" }, "context.trace_denied"],
    [{ ...baseArgs, taskId: "ts-other" }, "context.task_denied"],
    [{ ...baseArgs, agent: "gemini-cli" }, "context.task_target_denied"],
    [{ ...baseArgs, role: "reviewer" }, "context.task_target_denied"],
    [{ ...baseArgs, repo: "developer-tools" }, "context.repository_denied"],
  ];

  for (const [args, reasonCode] of cases) {
    assertDenied(
      () => bindRequestContext(
        value.context,
        binding({ cwd: value.repository, args }),
      ),
      reasonCode,
    );
  }
});

test("expired and revoked contexts cannot be replayed", (t) => {
  const value = fixture(t);

  assertDenied(
    () => bindRequestContext(
      value.context,
      binding({
        cwd: value.repository,
        now: "2026-07-26T09:00:00.000Z",
      }),
    ),
    "context.expired",
  );

  revokeRequestContext(value.context, {
    now: "2026-07-26T08:15:00.000Z",
  });
  assertDenied(
    () => bindRequestContext(
      value.context,
      binding({ cwd: value.repository }),
    ),
    "context.revoked",
  );
});

test("gateway repository discovery rejects one ID mapped to different roots", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "request-context-roots-"));
  const direct = path.join(root, "direct", "sample-apps");
  const container = path.join(root, "container");
  fs.mkdirSync(direct, { recursive: true });
  fs.mkdirSync(path.join(container, "sample-apps"), { recursive: true });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  assert.throws(
    () => createGatewayRequestContext({
      config: {
        repoRoot: direct,
        repoRoots: [container],
      },
      registries: {
        raw() {
          return {
            repositories: {
              "sample-apps": { classification: "unrestricted" },
            },
          };
        },
      },
      connectionId: "connection-ambiguous",
      now: "2026-07-26T08:00:00.000Z",
    }),
    /different canonical roots/,
  );
});
