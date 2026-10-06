import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  configureAudit,
  query as queryAudit,
  _resetForTests as resetAudit,
} from "../../gateway/src/core/audit.js";
import {
  ORCHESTRATOR_PROFILE_DIGEST,
  safeAuditSelectionProjection,
} from "../../gateway/src/core/orchestrator_profile.js";
import {
  bindRequestContext,
  createRequestContext,
} from "../../gateway/src/core/request_context.js";
import { ACTION_CATALOG_VERSION } from "../../gateway/src/core/policy_types.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import {
  initState,
  _resetForTests as resetState,
} from "../../gateway/src/core/state.js";
import { createAgentService } from "../../gateway/src/services/agent_service.js";
import { buildAgentTools } from "../../gateway/src/tools/agent.js";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const canonicalRegistries = loadRegistries({
  policiesDir: path.join(ROOT, "policies"),
});

function fixture(t, { registries = canonicalRegistries } = {}) {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(
    path.join(os.tmpdir(), "orchestrator-profile-runtime-"),
  );
  const auditLog = path.join(workspace, "audit.jsonl");
  const cwd = path.join(workspace, "repo");
  fs.mkdirSync(cwd);
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog });

  const observed = {
    adapterGets: 0,
    adapterCalls: [],
    auditSelections: [],
    policySelections: [],
    resolutions: [],
  };
  const adapter = {
    async delegate(args) {
      observed.adapterCalls.push({ consumer: "delegate", selection: args.effectiveSelection });
      observed.adapterCalls.push({ consumer: "dry-run", selection: args.effectiveSelection });
      return {
        stdout: "dry-run",
        stderr: "",
        exitCode: 0,
        dryRun: true,
        model: args.effectiveSelection.model,
        reasoningEffort: args.effectiveSelection.reasoningEffort,
        effectiveSelection: args.effectiveSelection,
        ...(args.effectiveSelection.provider === "codex"
          ? {
              serviceTier: args.effectiveSelection.serviceTier,
              sandbox: "workspace-write",
            }
          : {}),
      };
    },
    async spawn(args) {
      observed.adapterCalls.push({ consumer: "spawn", selection: args.effectiveSelection });
      observed.adapterCalls.push({ consumer: "dry-run", selection: args.effectiveSelection });
      return {
        sessionId: "profile-runtime",
        tmuxTarget: "profile-runtime",
        attachCommand: "tmux attach -t profile-runtime",
        launchCommand: "unavailable in dry-run",
        dryRun: true,
        effectiveSelection: args.effectiveSelection,
      };
    },
  };
  const adapters = {
    get() {
      observed.adapterGets += 1;
      return adapter;
    },
  };
  const selectionObservers = {
    resolved(selection) {
      observed.resolutions.push(selection);
    },
    policy(selection) {
      observed.policySelections.push(selection);
    },
    audit(selection) {
      observed.auditSelections.push(selection);
    },
  };
  const service = createAgentService({
    adapters,
    registries,
    config: { agentTimeoutMs: 1_000, repoRoots: [cwd] },
    selectionObservers,
  });

  t.after(() => {
    resetState();
    resetAudit();
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  return {
    auditLog,
    cwd,
    observed,
    selectionObservers,
    service,
  };
}

function executionArgs(value, method, overrides = {}) {
  return {
    agent: "codex",
    role: "coder",
    repo: "sample-apps",
    cwd: value.cwd,
    traceId: `tr-profile-${method}`,
    taskId: null,
    ...(method === "delegate" ? { prompt: "implement" } : {}),
    ...overrides,
  };
}

function executionBinding(value, {
  action = "agent.spawn",
  traceId = "tr-bound-profile",
  taskId = "ts-bound-profile",
} = {}) {
  const connectionId = `profile-runtime-${action}`;
  const context = createRequestContext({
    principalId: "local-operator",
    agent: "claude-code",
    role: "orchestrator",
    audience: "agents-gateway:test",
    connectionId,
    capabilities: [action],
    repositoryBindings: {
      "sample-apps": {
        root: value.cwd,
        classification: "unrestricted",
      },
    },
    lineage: {
      traces: [{ traceId }],
      tasks: [{
        taskId,
        traceId,
        repositoryId: "sample-apps",
        targetAgent: "codex",
        targetRole: "coder",
        targetAction: "code.write",
      }],
    },
    issuedAt: "2026-07-26T08:00:00.000Z",
    expiresAt: "2026-07-26T09:00:00.000Z",
  });
  return bindRequestContext(context, {
    action,
    actionCatalogVersion: ACTION_CATALOG_VERSION,
    audience: "agents-gateway:test",
    connectionId,
    args: {
      agent: "codex",
      role: "coder",
      repo: "sample-apps",
      cwd: value.cwd,
      traceId,
      taskId,
    },
    now: "2026-07-26T08:30:00.000Z",
  });
}

for (const method of ["delegate", "spawn"]) {
  test(`${method} resolves once and preserves one selection identity across every runtime consumer`, async (t) => {
    const value = fixture(t);

    const result = await value.service[method](executionArgs(value, method));

    assert.equal(value.observed.resolutions.length, 1);
    const [selection] = value.observed.resolutions;
    assert.equal(Object.isFrozen(selection), true);
    assert.equal(selection.registryDigest, ORCHESTRATOR_PROFILE_DIGEST);
    assert.deepEqual(selection.resolutionSource, {
      model: "agent-default",
      reasoningEffort: "model-default",
      serviceTier: "agent-default",
    });
    assert.ok(value.observed.policySelections.length > 0);
    for (const policySelection of value.observed.policySelections) {
      assert.equal(policySelection, selection);
    }
    assert.deepEqual(
      value.observed.adapterCalls.map(({ consumer }) => consumer),
      [method, "dry-run"],
    );
    for (const { selection: consumerSelection } of value.observed.adapterCalls) {
      assert.equal(consumerSelection, selection);
    }
    assert.deepEqual(value.observed.auditSelections, [selection]);
    assert.equal(result.effectiveSelection, selection);

    const [event] = await queryAudit({
      traceId: executionArgs(value, method).traceId,
      type: "AGENT_MODEL_RESOLVED",
    });
    assert.deepEqual(
      {
        contractVersion: event.contractVersion,
        profileId: event.profileId,
        agent: event.agent,
        provider: event.provider,
        model: event.model,
        reasoningEffort: event.reasoningEffort,
        serviceTier: event.serviceTier,
        resolutionSource: event.resolutionSource,
        registryDigest: event.registryDigest,
      },
      safeAuditSelectionProjection(selection),
    );
  });
}

for (const method of ["delegate", "spawn"]) {
  test(`${method} rejects registry-only Gemini before adapter, session, or model audit`, async (t) => {
    const value = fixture(t);

    await assert.rejects(
      () => value.service[method](
        executionArgs(value, method, {
          agent: "gemini-cli",
          role: "coder",
        }),
      ),
      (error) => {
        assert.equal(error.code, "POLICY_DENIED");
        assert.deepEqual(error.decision.selectionRejection, {
          code: "EFFECTIVE_SELECTION_PROVIDER_UNAVAILABLE",
          field: "agent",
          provider: "gemini-cli",
        });
        return true;
      },
    );

    assert.equal(value.observed.adapterGets, 0);
    assert.equal(value.observed.adapterCalls.length, 0);
    assert.equal(
      (await queryAudit({ type: "AGENT_MODEL_RESOLVED" })).length,
      0,
    );
    assert.equal(
      (await queryAudit({ type: "SESSION_STARTED" })).length,
      0,
    );
  });
}

for (const method of ["delegate", "spawn"]) {
  test(`${method} fails closed on registry drift before adapter, session, or model audit`, async (t) => {
    const rejectedRegistryValue = "environment-registry-model-S3CRET";
    const raw = canonicalRegistries.raw();
    raw.agents.codex.defaultModel = rejectedRegistryValue;
    raw.agents.codex.models = [
      rejectedRegistryValue,
      ...raw.agents.codex.models,
    ];
    const driftedRegistries = {
      getAgent: (id) => raw.agents[id] ?? null,
      getRepo: (id) => raw.repositories[id] ?? null,
      getRole: (id) => raw.roles[id] ?? null,
      getProtectedBranches: () => [...raw.protectedBranches],
      raw: () => structuredClone(raw),
    };
    const value = fixture(t, { registries: driftedRegistries });

    await assert.rejects(
      () => value.service[method](executionArgs(value, method)),
      (error) => {
        assert.equal(error.code, "POLICY_DENIED");
        assert.deepEqual(error.decision.selectionRejection, {
          code: "EFFECTIVE_SELECTION_REGISTRY_DRIFT",
          field: "registry",
          provider: null,
        });
        return true;
      },
    );

    assert.equal(value.observed.adapterGets, 0);
    assert.equal((await queryAudit({ type: "AGENT_MODEL_RESOLVED" })).length, 0);
    assert.equal((await queryAudit({ type: "SESSION_STARTED" })).length, 0);
    assert.equal(
      fs.readFileSync(value.auditLog, "utf8").includes(rejectedRegistryValue),
      false,
    );
  });
}

const unsupportedRuntimeSelections = [
  {
    name: "unknown provider",
    overrides: { agent: "unknown-provider-S3CRET" },
    rejection: {
      code: "EFFECTIVE_SELECTION_PROVIDER_UNKNOWN",
      field: "agent",
      provider: null,
    },
    rejectedValue: "unknown-provider-S3CRET",
  },
  {
    name: "unknown model",
    overrides: { model: "unknown-model-S3CRET" },
    rejection: {
      code: "EFFECTIVE_SELECTION_MODEL_UNSUPPORTED",
      field: "model",
      provider: "codex",
    },
    rejectedValue: "unknown-model-S3CRET",
  },
  {
    name: "unsupported effort",
    overrides: { reasoningEffort: "unsupported-effort-S3CRET" },
    rejection: {
      code: "EFFECTIVE_SELECTION_REASONING_UNSUPPORTED",
      field: "reasoningEffort",
      provider: "codex",
    },
    rejectedValue: "unsupported-effort-S3CRET",
  },
  {
    name: "unsupported tier",
    overrides: { serviceTier: "unsupported-tier-S3CRET" },
    rejection: {
      code: "EFFECTIVE_SELECTION_TIER_UNSUPPORTED",
      field: "serviceTier",
      provider: "codex",
    },
    rejectedValue: "unsupported-tier-S3CRET",
  },
];

for (const method of ["delegate", "spawn"]) {
  for (const scenario of unsupportedRuntimeSelections) {
    test(`${method} rejects ${scenario.name} before adapter, session, or model audit`, async (t) => {
      const value = fixture(t);

      await assert.rejects(
        () => value.service[method](
          executionArgs(value, method, scenario.overrides),
        ),
        (error) => {
          assert.equal(error.code, "POLICY_DENIED");
          assert.deepEqual(error.decision.selectionRejection, scenario.rejection);
          assert.equal(JSON.stringify(error).includes(scenario.rejectedValue), false);
          return true;
        },
      );

      assert.equal(value.observed.adapterGets, 0);
      assert.equal(value.observed.adapterCalls.length, 0);
      assert.equal(
        (await queryAudit({ type: "AGENT_MODEL_RESOLVED" })).length,
        0,
      );
      assert.equal((await queryAudit({ type: "SESSION_STARTED" })).length, 0);
      assert.equal(
        fs.readFileSync(value.auditLog, "utf8").includes(scenario.rejectedValue),
        false,
      );
    });
  }
}

test("request-context authority is validated before selection resolution or audit", async (t) => {
  const value = fixture(t);
  const requestBinding = executionBinding(value);

  await assert.rejects(
    () => value.service.spawn(
      executionArgs(value, "spawn", {
        traceId: "tr-caller-replay",
        taskId: "ts-bound-profile",
      }),
      requestBinding,
    ),
    (error) => error.code === "REQUEST_CONTEXT_DENIED",
  );

  assert.equal(value.observed.resolutions.length, 0);
  assert.equal(value.observed.policySelections.length, 0);
  assert.equal(value.observed.auditSelections.length, 0);
  assert.equal(value.observed.adapterGets, 0);
  assert.equal((await queryAudit({ limit: 100 })).length, 0);
});

test("tool and JSONL selection rejections expose only allowlisted metadata", async (t) => {
  const value = fixture(t);
  const tools = Object.fromEntries(
    buildAgentTools({ agentService: value.service }).map((tool) => [
      tool.name,
      tool,
    ]),
  );
  const rejected = {
    alias: "raw-alias-S3CRET",
    effort: "effort-S3CRET",
    tier: "tier-S3CRET",
  };

  for (const [field, args] of [
    ["model", { model: rejected.alias }],
    ["reasoningEffort", { reasoningEffort: rejected.effort }],
    ["serviceTier", { serviceTier: rejected.tier }],
  ]) {
    const response = await tools["agent.delegate"].handler(
      executionArgs(value, "delegate", {
        traceId: `tr-rejected-${field}`,
        taskId: `ts-rejected-${field}`,
        ...args,
      }),
    );
    const body = JSON.parse(response.content[0].text);

    assert.equal(response.isError, true);
    assert.deepEqual(Object.keys(body).sort(), [
      "code",
      "decision",
      "error",
      "message",
      "selectionRejection",
    ]);
    assert.equal(body.code, "POLICY_DENIED");
    assert.equal(body.selectionRejection.field, field);
    assert.ok(
      [
        "EFFECTIVE_SELECTION_MODEL_UNSUPPORTED",
        "EFFECTIVE_SELECTION_REASONING_UNSUPPORTED",
        "EFFECTIVE_SELECTION_TIER_UNSUPPORTED",
      ].includes(body.selectionRejection.code),
    );
  }

  const serializedAudit = fs.readFileSync(value.auditLog, "utf8");
  const serializedResponses = JSON.stringify(
    await Promise.all(
      Object.entries(rejected).map(async ([name, secret]) => ({ name, secret })),
    ),
  );
  for (const secret of Object.values(rejected)) {
    assert.equal(serializedAudit.includes(secret), false);
  }
  assert.ok(serializedResponses.includes("S3CRET"));
});
