import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { ClaudeAdapter } from "../../gateway/src/adapters/claude_adapter.js";
import { CodexAdapter } from "../../gateway/src/adapters/codex_adapter.js";
import {
  configureAudit,
  query as queryAudit,
  _resetForTests as resetAudit,
} from "../../gateway/src/core/audit.js";
import {
  assertEffectiveSelection,
  consumeEffectiveAgentSelection,
  resolveEffectiveAgentSelection,
  safeAuditSelectionProjection,
} from "../../gateway/src/core/orchestrator_profile.js";
import {
  bindRequestContext,
  createRequestContext,
} from "../../gateway/src/core/request_context.js";
import { ACTION_CATALOG_VERSION } from "../../gateway/src/core/policy_types.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import * as orchestrationRepo from "../../gateway/src/core/repositories/orchestration_repo.js";
import * as sessionRepo from "../../gateway/src/core/repositories/session_repo.js";
import * as taskRepo from "../../gateway/src/core/repositories/task_repo.js";
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
const PROFILE_MODULE = pathToFileURL(
  path.join(ROOT, "gateway", "src", "core", "orchestrator_profile.js"),
);
const canonicalRegistries = loadRegistries({
  policiesDir: path.join(ROOT, "policies"),
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function assertInvalidSelection(run) {
  assert.throws(run, (error) => {
    assert.equal(error.code, "EFFECTIVE_SELECTION_INVALID");
    assert.deepEqual(error.details, {
      field: "effectiveSelection",
      provider: null,
    });
    assert.equal(error.message, "effective agent selection rejected");
    return true;
  });
}

const structuralForgeries = [
  {
    name: "mutable structural clone",
    create: (selection) => structuredClone(selection),
  },
  {
    name: "frozen structural clone",
    create: (selection) => deepFreeze(structuredClone(selection)),
  },
  {
    name: "JSON-rehydrated selection",
    create: (selection) => JSON.parse(JSON.stringify(selection)),
  },
  {
    name: "selection with an extra field",
    create: (selection) => deepFreeze({
      ...structuredClone(selection),
      rawAlias: "forged-alias-S3CRET",
    }),
  },
  {
    name: "selection with an extended source projection",
    create: (selection) => deepFreeze({
      ...structuredClone(selection),
      resolutionSource: {
        ...selection.resolutionSource,
        rawAlias: "forged-source-S3CRET",
      },
    }),
  },
  {
    name: "selection with a valid-looking tampered source",
    create: (selection) => deepFreeze({
      ...structuredClone(selection),
      resolutionSource: {
        ...selection.resolutionSource,
        reasoningEffort: "explicit",
      },
    }),
  },
  {
    name: "Proxy around a canonical selection",
    create: (selection) => new Proxy(selection, {}),
  },
];

for (const scenario of structuralForgeries) {
  test(`selection authority rejects a ${scenario.name}`, () => {
    const canonical = resolveEffectiveAgentSelection({
      agent: "codex",
      model: "gpt-5",
    });
    const forged = scenario.create(canonical);

    assertInvalidSelection(() => assertEffectiveSelection(forged));
    assertInvalidSelection(() => consumeEffectiveAgentSelection(forged, {
      agent: "codex",
      consumer: "delegate",
    }));
  });
}

test("selection authority rejects an object produced by another module instance", async () => {
  const secondInstanceUrl = new URL(PROFILE_MODULE);
  secondInstanceUrl.searchParams.set("authority-instance", `${Date.now()}-${Math.random()}`);
  const secondInstance = await import(secondInstanceUrl);
  const foreignSelection = secondInstance.resolveEffectiveAgentSelection({
    agent: "codex",
  });

  assert.equal(Object.isFrozen(foreignSelection), true);
  assertInvalidSelection(() => assertEffectiveSelection(foreignSelection));
});

function adapterFixture(
  t,
  Adapter,
  agent,
  registries = canonicalRegistries,
) {
  resetAudit();
  const workspace = fs.mkdtempSync(
    path.join(os.tmpdir(), "orchestrator-profile-authority-adapter-"),
  );
  const cwd = path.join(workspace, "repo");
  const auditLog = path.join(workspace, "audit.jsonl");
  fs.mkdirSync(cwd);
  configureAudit({ auditLog });
  const adapter = new Adapter({
    config: {
      dryRun: true,
      repoRoots: [cwd],
      codexSandbox: "workspace-write",
      tmuxPrefix: "authority-",
    },
    registries,
  });

  t.after(() => {
    resetAudit();
    fs.rmSync(workspace, { recursive: true, force: true });
  });
  return { adapter, agent, auditLog, cwd };
}

function directArgs(value, method, overrides = {}) {
  return {
    cwd: value.cwd,
    traceId: `tr-authority-${value.agent}-${method}`,
    taskId: `ts-authority-${value.agent}-${method}`,
    targetAction: "code.write",
    role: "coder",
    repo: "sample-apps",
    ...(method === "delegate" ? { prompt: "implement" } : {}),
    ...overrides,
  };
}

function executionBinding(value, method) {
  const action = `agent.${method}`;
  const traceId = `tr-authority-${value.agent}-${method}`;
  const taskId = `ts-authority-${value.agent}-${method}`;
  const connectionId = `authority-${value.agent}-${method}`;
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
        targetAgent: value.agent,
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
      agent: value.agent,
      role: "coder",
      repo: "sample-apps",
      cwd: value.cwd,
      traceId,
      taskId,
    },
    now: "2026-07-26T08:30:00.000Z",
  });
}

test("Codex bound dry-run rejects an unknown raw model plus mutable canonical clone with zero effects", async (t) => {
  const value = adapterFixture(t, CodexAdapter, "codex");
  const clone = structuredClone(resolveEffectiveAgentSelection({
    agent: "codex",
    model: "gpt-5",
  }));

  await assert.rejects(
    () => value.adapter.delegate(directArgs(value, "delegate", {
      model: "unknown-model-S3CRET",
      effectiveSelection: clone,
      requestBinding: executionBinding(value, "delegate"),
    })),
    (error) => error.code === "EFFECTIVE_SELECTION_INVALID",
  );

  assert.deepEqual(await queryAudit({ limit: 100 }), []);
  assert.equal(
    fs.existsSync(value.auditLog) ? fs.readFileSync(value.auditLog, "utf8") : "",
    "",
  );
});

test("Codex bound dry-run rejects a frozen canonical clone with zero effects", async (t) => {
  const value = adapterFixture(t, CodexAdapter, "codex");
  const clone = deepFreeze(structuredClone(resolveEffectiveAgentSelection({
    agent: "codex",
    model: "gpt-5",
  })));

  await assert.rejects(
    () => value.adapter.delegate(directArgs(value, "delegate", {
      effectiveSelection: clone,
      requestBinding: executionBinding(value, "delegate"),
    })),
    (error) => error.code === "EFFECTIVE_SELECTION_INVALID",
  );

  assert.deepEqual(await queryAudit({ limit: 100 }), []);
  assert.equal(
    fs.existsSync(value.auditLog) ? fs.readFileSync(value.auditLog, "utf8") : "",
    "",
  );
});

for (const [Adapter, agent] of [
  [CodexAdapter, "codex"],
  [ClaudeAdapter, "claude-code"],
]) {
  for (const method of ["delegate", "spawn"]) {
    test(`${agent} ${method} rejects redundant raw model, effort, and tier fields before lifecycle effects`, async (t) => {
      const value = adapterFixture(t, Adapter, agent);
      const selection = resolveEffectiveAgentSelection({ agent });

      for (const rawSelection of [
        { model: "unknown-model-S3CRET" },
        { reasoningEffort: "unknown-effort-S3CRET" },
        { serviceTier: "unknown-tier-S3CRET" },
      ]) {
        await assert.rejects(
          () => value.adapter[method](directArgs(value, method, {
            ...rawSelection,
            effectiveSelection: selection,
          })),
          (error) => error.code === "EFFECTIVE_SELECTION_INVALID",
        );
      }

      assert.deepEqual(await queryAudit({ limit: 100 }), []);
    });

    test(`${agent} ${method} rejects a frozen structural selection before lifecycle effects`, async (t) => {
      const value = adapterFixture(t, Adapter, agent);
      const clone = deepFreeze(structuredClone(
        resolveEffectiveAgentSelection({ agent }),
      ));

      await assert.rejects(
        () => value.adapter[method](directArgs(value, method, {
          effectiveSelection: clone,
        })),
        (error) => error.code === "EFFECTIVE_SELECTION_INVALID",
      );

      assert.deepEqual(await queryAudit({ limit: 100 }), []);
    });
  }
}

test("direct adapter rejects a branded cross-provider selection before lifecycle effects", async (t) => {
  const value = adapterFixture(t, ClaudeAdapter, "claude-code");
  const codexSelection = resolveEffectiveAgentSelection({ agent: "codex" });

  await assert.rejects(
    () => value.adapter.delegate(directArgs(value, "delegate", {
      effectiveSelection: codexSelection,
    })),
    (error) => error.code === "EFFECTIVE_SELECTION_INVALID",
  );

  assert.deepEqual(await queryAudit({ limit: 100 }), []);
});

test("direct adapter rejects registry drift before lifecycle effects", async (t) => {
  const raw = canonicalRegistries.raw();
  const rejectedValue = "drifted-registry-model-S3CRET";
  raw.agents.codex.defaultModel = rejectedValue;
  raw.agents.codex.models = [rejectedValue, ...raw.agents.codex.models];
  const driftedRegistries = {
    getAgent: (id) => raw.agents[id] ?? null,
    getRepo: (id) => raw.repositories[id] ?? null,
    getRole: (id) => raw.roles[id] ?? null,
    getProtectedBranches: () => [...raw.protectedBranches],
    raw: () => structuredClone(raw),
  };
  const value = adapterFixture(
    t,
    CodexAdapter,
    "codex",
    driftedRegistries,
  );
  const selection = resolveEffectiveAgentSelection({ agent: "codex" });

  await assert.rejects(
    () => value.adapter.delegate(directArgs(value, "delegate", {
      effectiveSelection: selection,
    })),
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

  const events = await queryAudit({ limit: 100 });
  assert.ok(!events.some((event) => event.type === "SESSION_STARTED"));
  assert.equal(JSON.stringify(events).includes(rejectedValue), false);
});

function delegateAdapterResult(args, overrides = {}) {
  const result = {
    stdout: "dry-run",
    stderr: "",
    exitCode: 0,
    dryRun: true,
    model: args.effectiveSelection.model,
    reasoningEffort: args.effectiveSelection.reasoningEffort,
    effectiveSelection: args.effectiveSelection,
  };
  if (args.effectiveSelection.provider === "codex") {
    result.serviceTier = args.effectiveSelection.serviceTier;
    result.sandbox = "workspace-write";
  }
  return { ...result, ...overrides };
}

function spawnAdapterResult(args, overrides = {}) {
  const tmuxTarget = "authority-target";
  return {
    sessionId: tmuxTarget,
    tmuxTarget,
    attachCommand: `tmux attach -t ${tmuxTarget}`,
    launchCommand: "unavailable in dry-run",
    dryRun: true,
    effectiveSelection: args.effectiveSelection,
    ...overrides,
  };
}

function serviceFixture(
  t,
  mutateResult = (_method, _args, result) => result,
  { agent = "codex", config = {} } = {},
) {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(
    path.join(os.tmpdir(), "orchestrator-profile-authority-service-"),
  );
  const cwd = path.join(workspace, "repo");
  const auditLog = path.join(workspace, "audit.jsonl");
  fs.mkdirSync(cwd);
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog });

  const observed = {
    adapterArgs: [],
    adapterGets: 0,
  };
  const adapter = {
    async delegate(args) {
      observed.adapterArgs.push(args);
      return mutateResult(
        "delegate",
        args,
        delegateAdapterResult(args),
      );
    },
    async spawn(args) {
      observed.adapterArgs.push(args);
      return mutateResult(
        "spawn",
        args,
        spawnAdapterResult(args),
      );
    },
  };
  const adapters = {
    get() {
      observed.adapterGets += 1;
      return adapter;
    },
  };
  const service = createAgentService({
    adapters,
    registries: canonicalRegistries,
    config: {
      agentTimeoutMs: 1_000,
      repoRoots: [cwd],
      ...config,
    },
  });

  t.after(() => {
    resetState();
    resetAudit();
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  return {
    agent,
    auditLog,
    cwd,
    observed,
    service,
  };
}

function serviceArgs(value, method, overrides = {}) {
  return {
    agent: value.agent,
    role: "coder",
    repo: "sample-apps",
    cwd: value.cwd,
    traceId: `tr-service-authority-${method}`,
    ...(method === "delegate" ? { prompt: "implement" } : {}),
    ...overrides,
  };
}

function createPersistableTask(value, method) {
  const traceId = `tr-service-authority-${method}`;
  const taskId = `ts-service-authority-${method}`;
  orchestrationRepo.createOrchestration({
    sessionId: `os-service-authority-${method}`,
    traceId,
    callerAgent: "claude-code",
    callerRole: "orchestrator",
    status: "active",
    goal: "adapter result authority",
    createdAt: "2026-07-26T08:00:00.000Z",
  });
  taskRepo.createTask({
    taskId,
    traceId,
    assignedAgent: value.agent,
    assignedRole: "coder",
    repo: "sample-apps",
    status: "running",
    createdAt: "2026-07-26T08:00:00.000Z",
    closedAt: null,
  });
  return taskId;
}

function assertContractRejection(error) {
  assert.equal(error.code, "POLICY_DENIED");
  assert.deepEqual(error.decision.selectionRejection, {
    code: "EFFECTIVE_SELECTION_INVALID",
    field: "effectiveSelection",
    provider: null,
  });
  return true;
}

async function assertNoSuccessfulResultEffects(value, method, sentinel = null) {
  assert.equal(
    (await queryAudit({ type: "AGENT_MODEL_RESOLVED" })).length,
    0,
  );
  assert.equal(
    (await queryAudit({ type: "SESSION_STARTED" })).length,
    0,
  );
  assert.deepEqual(
    sessionRepo.listSessionsByTrace(`tr-service-authority-${method}`),
    [],
  );
  const serializedAudit = fs.existsSync(value.auditLog)
    ? fs.readFileSync(value.auditLog, "utf8")
    : "";
  if (sentinel !== null) {
    assert.equal(serializedAudit.includes(sentinel), false);
  }
}

const RESULT_REQUIRED_FIELDS = Object.freeze({
  codex: Object.freeze({
    delegate: Object.freeze([
      "stdout",
      "stderr",
      "exitCode",
      "dryRun",
      "model",
      "reasoningEffort",
      "serviceTier",
      "effectiveSelection",
      "sandbox",
    ]),
    spawn: Object.freeze([
      "sessionId",
      "tmuxTarget",
      "attachCommand",
      "launchCommand",
      "dryRun",
      "effectiveSelection",
    ]),
  }),
  "claude-code": Object.freeze({
    delegate: Object.freeze([
      "stdout",
      "stderr",
      "exitCode",
      "dryRun",
      "model",
      "reasoningEffort",
      "effectiveSelection",
    ]),
    spawn: Object.freeze([
      "sessionId",
      "tmuxTarget",
      "attachCommand",
      "launchCommand",
      "dryRun",
      "effectiveSelection",
    ]),
  }),
});

function boxedValueFor(value) {
  if (typeof value === "string") return new String(value);
  if (typeof value === "number") return new Number(value);
  if (typeof value === "boolean") return new Boolean(value);
  return Object.create(value);
}

function wrongPrimitiveFor(value) {
  if (typeof value === "string") return 0;
  if (typeof value === "number") return "0";
  if (typeof value === "boolean") return value ? "true" : "false";
  return "invalid-selection";
}

const INVALID_ALLOWED_FIELD_VALUES = Object.freeze([
  {
    name: "undefined",
    create: () => undefined,
  },
  {
    name: "null",
    create: () => null,
  },
  {
    name: "boxed",
    create: (validValue) => boxedValueFor(validValue),
  },
  {
    name: "wrong primitive",
    create: (validValue) => wrongPrimitiveFor(validValue),
  },
  {
    name: "nested object",
    create: (validValue) => ({ value: validValue }),
  },
  {
    name: "nested accessor/toJSON carrier",
    create(validValue, sentinel, reads) {
      const value = {};
      Object.defineProperty(value, "value", {
        enumerable: true,
        get() {
          reads.count += 1;
          return validValue;
        },
      });
      value.toJSON = () => {
        reads.count += 1;
        return sentinel;
      };
      return value;
    },
  },
  {
    name: "nested Proxy",
    create: (validValue) => new Proxy({ value: validValue }, {}),
  },
  {
    name: "array",
    create: (validValue) => [validValue],
  },
  {
    name: "function",
    create: (validValue) => () => validValue,
  },
  {
    name: "symbol",
    create: () => Symbol("invalid-result"),
  },
  {
    name: "bigint",
    create: () => 1n,
  },
]);

for (const agent of ["codex", "claude-code"]) {
  for (const method of ["delegate", "spawn"]) {
    test(`${agent} ${method} rejects every missing adapter result field`, async (t) => {
      let missingField = null;
      const value = serviceFixture(
        t,
        (calledMethod, _args, result) => {
          if (calledMethod !== method) return result;
          const mutated = { ...result };
          delete mutated[missingField];
          return mutated;
        },
        { agent },
      );

      for (const field of RESULT_REQUIRED_FIELDS[agent][method]) {
        missingField = field;
        await assert.rejects(
          () => value.service[method](serviceArgs(value, method)),
          assertContractRejection,
          `${agent} ${method} accepted a result without ${field}`,
        );
      }

      await assertNoSuccessfulResultEffects(value, method);
    });

    test(`${agent} ${method} rejects non-scalar values in every allowed result field`, async (t) => {
      let field = null;
      let invalidValue = null;
      const value = serviceFixture(
        t,
        (calledMethod, _args, result) => (
          calledMethod === method
            ? { ...result, [field]: invalidValue }
            : result
        ),
        { agent },
      );

      for (const requiredField of RESULT_REQUIRED_FIELDS[agent][method]) {
        for (const scenario of INVALID_ALLOWED_FIELD_VALUES) {
          const sentinel = `adapter-${agent}-${method}-${requiredField}-S3CRET`;
          const reads = { count: 0 };
          let validValue = null;
          const baselineSelection = resolveEffectiveAgentSelection({ agent });
          const baseline = method === "delegate"
            ? delegateAdapterResult({ effectiveSelection: baselineSelection })
            : spawnAdapterResult({ effectiveSelection: baselineSelection });
          validValue = baseline[requiredField];
          field = requiredField;
          invalidValue = scenario.create(validValue, sentinel, reads);

          await assert.rejects(
            () => value.service[method](serviceArgs(value, method)),
            assertContractRejection,
            `${agent} ${method} accepted ${scenario.name} in ${requiredField}`,
          );
          assert.equal(
            reads.count,
            0,
            `${agent} ${method} evaluated ${scenario.name} in ${requiredField}`,
          );
        }
      }

      await assertNoSuccessfulResultEffects(value, method, "S3CRET");
    });

    test(`${agent} ${method} rejects every accessor-backed result field without reading it`, async (t) => {
      let field = null;
      let reads = 0;
      const value = serviceFixture(
        t,
        (calledMethod, _args, result) => {
          if (calledMethod !== method) return result;
          const mutated = { ...result };
          const validValue = result[field];
          Object.defineProperty(mutated, field, {
            enumerable: true,
            configurable: true,
            get() {
              reads += 1;
              return validValue;
            },
          });
          return mutated;
        },
        { agent },
      );

      for (const requiredField of RESULT_REQUIRED_FIELDS[agent][method]) {
        field = requiredField;
        await assert.rejects(
          () => value.service[method](serviceArgs(value, method)),
          assertContractRejection,
          `${agent} ${method} accepted an accessor for ${requiredField}`,
        );
      }

      assert.equal(reads, 0);
      await assertNoSuccessfulResultEffects(value, method);
    });
  }
}

test("delegate rejects a result containing only the effective selection", async (t) => {
  const value = serviceFixture(t, (_method, args) => ({
    effectiveSelection: args.effectiveSelection,
  }));

  await assert.rejects(
    () => value.service.delegate(serviceArgs(value, "delegate")),
    assertContractRejection,
  );
  await assertNoSuccessfulResultEffects(value, "delegate");
});

test("delegate enforces provider-specific exact fields and scalar values", async (t) => {
  for (const scenario of [
    {
      name: "Codex wrong model",
      agent: "codex",
      mutate: (result) => ({ ...result, model: "adapter-model-S3CRET" }),
    },
    {
      name: "Codex wrong effort",
      agent: "codex",
      mutate: (result) => ({ ...result, reasoningEffort: "low" }),
    },
    {
      name: "Codex wrong tier",
      agent: "codex",
      mutate: (result) => ({ ...result, serviceTier: "adapter-tier-S3CRET" }),
    },
    {
      name: "Codex empty sandbox",
      agent: "codex",
      mutate: (result) => ({ ...result, sandbox: "" }),
    },
    {
      name: "Claude wrong model",
      agent: "claude-code",
      mutate: (result) => ({ ...result, model: "adapter-model-S3CRET" }),
    },
    {
      name: "Claude wrong effort",
      agent: "claude-code",
      mutate: (result) => ({ ...result, reasoningEffort: "low" }),
    },
    {
      name: "Claude spurious service tier",
      agent: "claude-code",
      mutate: (result) => ({ ...result, serviceTier: null }),
    },
    {
      name: "Claude spurious sandbox",
      agent: "claude-code",
      mutate: (result) => ({ ...result, sandbox: "workspace-write" }),
    },
  ]) {
    await t.test(scenario.name, async (subtest) => {
      const value = serviceFixture(
        subtest,
        (method, _args, result) => (
          method === "delegate" ? scenario.mutate(result) : result
        ),
        { agent: scenario.agent },
      );
      await assert.rejects(
        () => value.service.delegate(serviceArgs(value, "delegate")),
        assertContractRejection,
      );
      await assertNoSuccessfulResultEffects(value, "delegate", "S3CRET");
    });
  }
});

test("Codex delegate accepts only the configured canonical sandbox", async (t) => {
  await t.test("default workspace-write", async (subtest) => {
    const value = serviceFixture(subtest);
    const result = await value.service.delegate(serviceArgs(value, "delegate"));
    assert.equal(result.sandbox, "workspace-write");
  });

  for (const sandbox of [
    "read-only",
    "workspace-write",
    "danger-full-access",
  ]) {
    await t.test(`configured ${sandbox}`, async (subtest) => {
      const value = serviceFixture(
        subtest,
        (method, _args, result) => (
          method === "delegate" ? { ...result, sandbox } : result
        ),
        { config: { codexSandbox: sandbox } },
      );
      const result = await value.service.delegate(
        serviceArgs(value, "delegate"),
      );
      assert.equal(result.sandbox, sandbox);
    });
  }

  for (const scenario of [
    {
      name: "unknown result sandbox",
      config: {},
      resultSandbox: "not-a-codex-sandbox",
    },
    {
      name: "whitespace result sandbox",
      config: {},
      resultSandbox: " ",
    },
    {
      name: "result sandbox mismatches configured sandbox",
      config: { codexSandbox: "read-only" },
      resultSandbox: "workspace-write",
    },
    {
      name: "configured sandbox is outside the canonical domain",
      config: { codexSandbox: "not-a-codex-sandbox-S3CRET" },
      resultSandbox: "not-a-codex-sandbox-S3CRET",
    },
  ]) {
    await t.test(scenario.name, async (subtest) => {
      const value = serviceFixture(
        subtest,
        (method, _args, result) => (
          method === "delegate"
            ? { ...result, sandbox: scenario.resultSandbox }
            : result
        ),
        { config: scenario.config },
      );
      await assert.rejects(
        () => value.service.delegate(serviceArgs(value, "delegate")),
        assertContractRejection,
      );
      await assertNoSuccessfulResultEffects(value, "delegate", "S3CRET");
    });
  }
});

test("invalid Codex sandbox configuration fails before adapter lookup for every operation", async (t) => {
  for (const method of ["delegate", "spawn"]) {
    await t.test(method, async (subtest) => {
      const value = serviceFixture(
        subtest,
        undefined,
        {
          config: {
            codexSandbox: "invalid-config-sandbox-S3CRET",
          },
        },
      );

      await assert.rejects(
        () => value.service[method](serviceArgs(value, method)),
        assertContractRejection,
      );
      assert.equal(value.observed.adapterGets, 0);
      assert.equal(value.observed.adapterArgs.length, 0);
      await assertNoSuccessfulResultEffects(value, method, "S3CRET");
    });
  }
});

test("Codex delegate tool rejects an unknown sandbox with a stable body and no success effects", async (t) => {
  const sentinel = "not-a-codex-sandbox-S3CRET";
  const value = serviceFixture(t, (method, _args, result) => (
    method === "delegate" ? { ...result, sandbox: sentinel } : result
  ));
  const tools = Object.fromEntries(
    buildAgentTools({
      agentService: {
        ...value.service,
        delegate(args, requestBinding) {
          return value.service.delegate(
            { ...args, taskId: null },
            requestBinding,
          );
        },
      },
    }).map((tool) => [tool.name, tool]),
  );

  const response = await tools["agent.delegate"].handler(
    serviceArgs(value, "delegate", { taskId: "ts-tool-sandbox" }),
  );
  const body = JSON.parse(response.content[0].text);

  assert.equal(response.isError, true);
  assert.deepEqual(body, {
    error: "POLICY_DENIED",
    code: "POLICY_DENIED",
    message: "request denied by policy",
    decision: {
      decision: "deny",
      ruleId: "agent.model.allowed",
    },
    selectionRejection: {
      code: "EFFECTIVE_SELECTION_INVALID",
      field: "effectiveSelection",
      provider: null,
    },
  });
  assert.equal(response.content[0].text.includes(sentinel), false);
  await assertNoSuccessfulResultEffects(value, "delegate", sentinel);
});

for (const agent of ["codex", "claude-code"]) {
  test(`${agent} spawn rejects every empty required string`, async (t) => {
    let emptyField = null;
    const value = serviceFixture(
      t,
      (method, _args, result) => (
        method === "spawn" ? { ...result, [emptyField]: "" } : result
      ),
      { agent },
    );

    for (const field of [
      "sessionId",
      "tmuxTarget",
      "attachCommand",
      "launchCommand",
    ]) {
      emptyField = field;
      await assert.rejects(
        () => value.service.spawn(serviceArgs(value, "spawn")),
        assertContractRejection,
        `${agent} spawn accepted an empty ${field}`,
      );
    }

    await assertNoSuccessfulResultEffects(value, "spawn");
  });
}

for (const agent of ["codex", "claude-code"]) {
  test(`${agent} spawn enforces canonical identifiers and commands`, async (t) => {
    const scenarios = [
      {
        name: "whitespace identity",
        mutate: (result) => ({
          ...result,
          sessionId: "   ",
          tmuxTarget: "   ",
          attachCommand: "tmux attach -t    ",
        }),
      },
      {
        name: "identity containing a newline",
        mutate: (result) => ({
          ...result,
          sessionId: "authority-\ntarget",
          tmuxTarget: "authority-\ntarget",
          attachCommand: "tmux attach -t authority-\ntarget",
        }),
      },
      {
        name: "identity containing a tab",
        mutate: (result) => ({
          ...result,
          sessionId: "authority-\ttarget",
          tmuxTarget: "authority-\ttarget",
          attachCommand: "tmux attach -t authority-\ttarget",
        }),
      },
      {
        name: "identity containing NUL",
        mutate: (result) => ({
          ...result,
          sessionId: "authority-\0target",
          tmuxTarget: "authority-\0target",
          attachCommand: "tmux attach -t authority-\0target",
        }),
      },
      {
        name: "identity containing another control character",
        mutate: (result) => ({
          ...result,
          sessionId: "authority-\u001ftarget",
          tmuxTarget: "authority-\u001ftarget",
          attachCommand: "tmux attach -t authority-\u001ftarget",
        }),
      },
      {
        name: "non-ASCII identity",
        mutate: (result) => ({
          ...result,
          sessionId: "authority-tárget",
          tmuxTarget: "authority-tárget",
          attachCommand: "tmux attach -t authority-tárget",
        }),
      },
      {
        name: "overlong identity",
        mutate: (result) => {
          const target = `a${"b".repeat(96)}`;
          return {
            ...result,
            sessionId: target,
            tmuxTarget: target,
            attachCommand: `tmux attach -t ${target}`,
          };
        },
      },
      {
        name: "non-canonical attach command",
        mutate: (result) => ({
          ...result,
          attachCommand: `tmux attach-session -t ${result.tmuxTarget}`,
        }),
      },
      {
        name: "whitespace launch command",
        mutate: (result) => ({ ...result, launchCommand: "   " }),
      },
      {
        name: "launch command with leading whitespace",
        mutate: (result) => ({ ...result, launchCommand: " codex run" }),
      },
      {
        name: "launch command with trailing whitespace",
        mutate: (result) => ({ ...result, launchCommand: "codex run " }),
      },
      {
        name: "launch command containing a tab",
        mutate: (result) => ({ ...result, launchCommand: "codex\trun" }),
      },
      {
        name: "launch command containing a format control",
        mutate: (result) => ({
          ...result,
          launchCommand: "codex\u200brun",
        }),
      },
      {
        name: "non-NFC launch command",
        mutate: (result) => ({
          ...result,
          launchCommand: "codex Cafe\u0301",
        }),
      },
      {
        name: "overlong launch command",
        mutate: (result) => ({
          ...result,
          launchCommand: `codex ${"x".repeat(8_192)}`,
        }),
      },
    ];

    for (const scenario of scenarios) {
      await t.test(scenario.name, async (subtest) => {
        const value = serviceFixture(
          subtest,
          (method, _args, result) => (
            method === "spawn" ? scenario.mutate(result) : result
          ),
          { agent },
        );
        await assert.rejects(
          () => value.service.spawn(serviceArgs(value, "spawn")),
          assertContractRejection,
        );
        await assertNoSuccessfulResultEffects(value, "spawn");
      });
    }

    await t.test("bounded ASCII target and NFC command with internal spaces", async (subtest) => {
      const target = `a${"b".repeat(95)}`;
      const launchCommand = "codex --label Café --cwd /tmp/my repo";
      const value = serviceFixture(
        subtest,
        (method, _args, result) => (
          method === "spawn"
            ? {
                ...result,
                sessionId: target,
                tmuxTarget: target,
                attachCommand: `tmux attach -t ${target}`,
                launchCommand,
              }
            : result
        ),
        { agent },
      );

      const result = await value.service.spawn(serviceArgs(value, "spawn"));
      assert.equal(result.sessionId, target);
      assert.equal(result.tmuxTarget, target);
      assert.equal(result.attachCommand, `tmux attach -t ${target}`);
      assert.equal(result.launchCommand, launchCommand);
    });
  });
}

test("spawn rejects an unsafe task-backed identity before persistence and successful audit", async (t) => {
  const sentinel = "unsafe-target-S3CRET";
  const unsafeTarget = `authority-${sentinel}\n`;
  const value = serviceFixture(t, (method, _args, result) => (
    method === "spawn"
      ? {
          ...result,
          sessionId: unsafeTarget,
          tmuxTarget: unsafeTarget,
          attachCommand: `tmux attach -t ${unsafeTarget}`,
        }
      : result
  ));
  const taskId = createPersistableTask(value, "spawn");

  await assert.rejects(
    () => value.service.spawn(serviceArgs(value, "spawn", { taskId })),
    assertContractRejection,
  );
  await assertNoSuccessfulResultEffects(value, "spawn", sentinel);
});

test("spawn tool rejects an unsafe command with a stable body and no disclosure", async (t) => {
  const sentinel = "unsafe-command-S3CRET";
  const value = serviceFixture(t, (method, _args, result) => (
    method === "spawn"
      ? { ...result, launchCommand: `codex\n${sentinel}` }
      : result
  ));
  const tools = Object.fromEntries(
    buildAgentTools({
      agentService: {
        ...value.service,
        spawn(args, requestBinding) {
          return value.service.spawn(
            { ...args, taskId: null },
            requestBinding,
          );
        },
      },
    }).map((tool) => [tool.name, tool]),
  );

  const response = await tools["agent.spawn"].handler(
    serviceArgs(value, "spawn", { taskId: "ts-tool-command" }),
  );
  const body = JSON.parse(response.content[0].text);

  assert.equal(response.isError, true);
  assert.deepEqual(body, {
    error: "POLICY_DENIED",
    code: "POLICY_DENIED",
    message: "request denied by policy",
    decision: {
      decision: "deny",
      ruleId: "agent.model.allowed",
    },
    selectionRejection: {
      code: "EFFECTIVE_SELECTION_INVALID",
      field: "effectiveSelection",
      provider: null,
    },
  });
  assert.equal(response.content[0].text.includes(sentinel), false);
  await assertNoSuccessfulResultEffects(value, "spawn", sentinel);
});

test("delegate rejects malformed process exit codes", async (t) => {
  for (const exitCode of [-2, 256, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53, "0"]) {
    await t.test(`exitCode ${String(exitCode)}`, async (subtest) => {
      const value = serviceFixture(
        subtest,
        (method, _args, result) => (
          method === "delegate" ? { ...result, exitCode } : result
        ),
      );
      await assert.rejects(
        () => value.service.delegate(serviceArgs(value, "delegate")),
        assertContractRejection,
      );
      await assertNoSuccessfulResultEffects(value, "delegate");
    });
  }
});

for (const agent of ["codex", "claude-code"]) {
  test(`${agent} delegate accepts exact dry-run and process result contracts`, async (t) => {
    let mode = { dryRun: true, exitCode: 0 };
    const value = serviceFixture(
      t,
      (method, _args, result) => (
        method === "delegate" ? { ...result, ...mode } : result
      ),
      { agent },
    );

    for (const expected of [
      { dryRun: true, exitCode: 0 },
      { dryRun: false, exitCode: 0 },
      { dryRun: false, exitCode: 7 },
      { dryRun: false, exitCode: -1 },
    ]) {
      mode = expected;
      const result = await value.service.delegate(serviceArgs(value, "delegate"));
      assert.equal(result.dryRun, expected.dryRun);
      assert.equal(result.exitCode, expected.exitCode);
      assert.equal(result.model, result.effectiveSelection.model);
      assert.equal(
        result.reasoningEffort,
        result.effectiveSelection.reasoningEffort,
      );
      if (agent === "codex") {
        assert.equal(result.serviceTier, result.effectiveSelection.serviceTier);
        assert.equal(result.sandbox, "workspace-write");
      } else {
        assert.equal(Object.hasOwn(result, "serviceTier"), false);
        assert.equal(Object.hasOwn(result, "sandbox"), false);
      }
    }
  });

  test(`${agent} spawn accepts exact dry-run and process result contracts`, async (t) => {
    let dryRun = true;
    const value = serviceFixture(
      t,
      (method, _args, result) => (
        method === "spawn" ? { ...result, dryRun } : result
      ),
      { agent },
    );

    for (const expectedDryRun of [true, false]) {
      dryRun = expectedDryRun;
      const result = await value.service.spawn(serviceArgs(value, "spawn"));
      assert.equal(result.dryRun, expectedDryRun);
      assert.equal(result.sessionId, result.tmuxTarget);
      assert.equal(typeof result.attachCommand, "string");
      assert.equal(typeof result.launchCommand, "string");
    }
  });

  for (const method of ["delegate", "spawn"]) {
    test(`${agent} ${method} preserves null and persisted task flows`, async (t) => {
      await t.test("taskId null", async (subtest) => {
        const value = serviceFixture(subtest, undefined, { agent });
        await value.service[method](serviceArgs(value, method, { taskId: null }));
        assert.deepEqual(
          sessionRepo.listSessionsByTrace(`tr-service-authority-${method}`),
          [],
        );
      });

      await t.test("taskId present", async (subtest) => {
        const value = serviceFixture(subtest, undefined, { agent });
        const taskId = createPersistableTask(value, method);
        await value.service[method](serviceArgs(value, method, { taskId }));
        const sessions = sessionRepo.listSessionsByTrace(
          `tr-service-authority-${method}`,
        );
        assert.equal(sessions.length, 1);
        assert.equal(sessions[0].task_id, taskId);
      });
    });
  }
}

test("spawn rejects a mismatched session and tmux identity before persistence", async (t) => {
  const value = serviceFixture(t, (method, _args, result) => (
    method === "spawn"
      ? { ...result, sessionId: "adapter-session", tmuxTarget: "adapter-target" }
      : result
  ));
  const taskId = createPersistableTask(value, "spawn");

  await assert.rejects(
    () => value.service.spawn(serviceArgs(value, "spawn", { taskId })),
    assertContractRejection,
  );
  await assertNoSuccessfulResultEffects(value, "spawn");
});

test("spawn tool rejects a late-evaluated nested session id without leaking it", async (t) => {
  const sentinel = "nested-result-raw-alias-S3CRET";
  let nestedReads = 0;
  const sessionId = new Proxy({}, {
    get(target, key, receiver) {
      if (key === "toJSON") {
        nestedReads += 1;
        return () => sentinel;
      }
      return Reflect.get(target, key, receiver);
    },
  });
  const value = serviceFixture(t, (method, _args, result) => (
    method === "spawn" ? { ...result, sessionId } : result
  ));
  const tools = Object.fromEntries(
    buildAgentTools({
      agentService: {
        ...value.service,
        spawn(args, requestBinding) {
          return value.service.spawn(
            { ...args, taskId: null },
            requestBinding,
          );
        },
      },
    }).map((tool) => [tool.name, tool]),
  );

  const response = await tools["agent.spawn"].handler(
    serviceArgs(value, "spawn", { taskId: "ts-tool-authority" }),
  );
  const body = JSON.parse(response.content[0].text);

  assert.equal(response.isError, true);
  assert.deepEqual(body, {
    error: "POLICY_DENIED",
    code: "POLICY_DENIED",
    message: "request denied by policy",
    decision: {
      decision: "deny",
      ruleId: "agent.model.allowed",
    },
    selectionRejection: {
      code: "EFFECTIVE_SELECTION_INVALID",
      field: "effectiveSelection",
      provider: null,
    },
  });
  assert.equal(nestedReads, 0);
  assert.equal(response.content[0].text.includes(sentinel), false);
  await assertNoSuccessfulResultEffects(value, "spawn", sentinel);
});

for (const method of ["delegate", "spawn"]) {
  test(`service ${method} sends only the branded selection and returns its exact identity`, async (t) => {
    let adapterResult = null;
    const value = serviceFixture(t, (_calledMethod, _args, result) => {
      adapterResult = result;
      return result;
    });

    const result = await value.service[method](serviceArgs(value, method, {
      model: "gpt-5.6",
      reasoningEffort: "high",
      serviceTier: "priority",
    }));
    const [adapterArgs] = value.observed.adapterArgs;

    assert.equal(Object.hasOwn(adapterArgs, "model"), false);
    assert.equal(Object.hasOwn(adapterArgs, "reasoningEffort"), false);
    assert.equal(Object.hasOwn(adapterArgs, "serviceTier"), false);
    assert.notEqual(result, adapterResult);
    assert.equal(Object.isFrozen(result), true);
    assert.equal(result.effectiveSelection, adapterArgs.effectiveSelection);
    assert.deepEqual(
      structuredClone(result.effectiveSelection),
      safeAuditSelectionProjection(adapterArgs.effectiveSelection),
    );
    assert.equal(result.effectiveSelection.model, "gpt-5.6-sol");
    assert.equal(
      result.effectiveSelection.resolutionSource.model,
      "explicit-alias",
    );
  });
}

const adversarialAdapterResults = [
  {
    name: "missing selection",
    mutate: (_args, result) => {
      const { effectiveSelection: _selection, ...withoutSelection } = result;
      return withoutSelection;
    },
  },
  {
    name: "cloned selection and raw alias",
    mutate: (args, result) => ({
      ...result,
      effectiveSelection: structuredClone(args.effectiveSelection),
      rawAlias: "adapter-substitution-S3CRET",
    }),
  },
  {
    name: "contradictory model projection",
    mutate: (_args, result) => ({
      ...result,
      model: "adapter-model-S3CRET",
    }),
  },
  {
    name: "unknown adapter-owned selection field",
    mutate: (_args, result) => ({
      ...result,
      rawAlias: "adapter-raw-alias-S3CRET",
    }),
  },
  {
    name: "proxied result",
    mutate: (_args, result) => new Proxy(result, {}),
  },
  {
    name: "time-varying model accessor",
    mutate: (args, result) => {
      let reads = 0;
      const accessorResult = { ...result };
      Object.defineProperty(accessorResult, "model", {
        enumerable: true,
        configurable: true,
        get() {
          reads += 1;
          return reads === 1
            ? args.effectiveSelection.model
            : "adapter-accessor-S3CRET";
        },
      });
      return accessorResult;
    },
  },
];

for (const method of ["delegate", "spawn"]) {
  for (const scenario of adversarialAdapterResults) {
    test(`service ${method} rejects an adapter result with ${scenario.name}`, async (t) => {
      const value = serviceFixture(
        t,
        (calledMethod, args, result) => (
          calledMethod === method ? scenario.mutate(args, result) : result
        ),
      );

      await assert.rejects(
        () => value.service[method](serviceArgs(value, method)),
        (error) => {
          assert.equal(error.code, "POLICY_DENIED");
          assert.deepEqual(error.decision.selectionRejection, {
            code: "EFFECTIVE_SELECTION_INVALID",
            field: "effectiveSelection",
            provider: null,
          });
          return true;
        },
      );

      assert.equal(value.observed.adapterGets, 1);
      assert.equal(value.observed.adapterArgs.length, 1);
      assert.equal(
        (await queryAudit({ type: "AGENT_MODEL_RESOLVED" })).length,
        0,
      );
      assert.equal(
        (await queryAudit({ type: "SESSION_STARTED" })).length,
        0,
      );
      const serializedAudit = fs.readFileSync(value.auditLog, "utf8");
      assert.equal(serializedAudit.includes("S3CRET"), false);
    });
  }
}

test("tool output rejects a cloned adapter selection without projecting its raw alias", async (t) => {
  const secret = "adapter-tool-raw-alias-S3CRET";
  const value = serviceFixture(t, (_method, args, result) => ({
    ...result,
    effectiveSelection: structuredClone(args.effectiveSelection),
    rawAlias: secret,
  }));
  const tools = Object.fromEntries(
    buildAgentTools({
      agentService: {
        ...value.service,
        delegate(args, requestBinding) {
          return value.service.delegate(
            { ...args, taskId: null },
            requestBinding,
          );
        },
      },
    }).map((tool) => [
      tool.name,
      tool,
    ]),
  );

  const response = await tools["agent.delegate"].handler(
    serviceArgs(value, "delegate", { taskId: "ts-tool-authority" }),
  );
  const body = JSON.parse(response.content[0].text);

  assert.equal(response.isError, true);
  assert.deepEqual(body, {
    error: "POLICY_DENIED",
    code: "POLICY_DENIED",
    message: "request denied by policy",
    decision: {
      decision: "deny",
      ruleId: "agent.model.allowed",
    },
    selectionRejection: {
      code: "EFFECTIVE_SELECTION_INVALID",
      field: "effectiveSelection",
      provider: null,
    },
  });
  assert.equal(JSON.stringify(body).includes(secret), false);
  assert.equal(fs.readFileSync(value.auditLog, "utf8").includes(secret), false);
});
