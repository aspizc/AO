import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CANONICAL_ORCHESTRATOR_PROFILE,
  EFFECTIVE_SELECTION_CONSUMERS,
  ORCHESTRATOR_PROFILE_DIGEST,
  createEffectiveAgentSelectionBundle,
  profileDigest,
  providerSelectionMatrix,
  resolveEffectiveAgentSelection,
  resolveEffectiveAgentSelectionForConsumer,
  safeAuditSelectionProjection,
} from "../../gateway/src/core/orchestrator_profile.js";

const CODEX_NEW_EFFORTS = ["low", "medium", "high", "xhigh", "max", "ultra"];
const CODEX_LEGACY_EFFORTS = ["low", "medium", "high", "xhigh"];
const PI_THINKING = ["off", "minimal", "low", "medium", "high", "xhigh"];
const CLAUDE_EFFORTS = ["low", "medium", "high", "xhigh", "max"];

function assertSelectionError(fn, code, rejectedValue) {
  assert.throws(fn, (error) => {
    assert.equal(error.name, "EffectiveAgentSelectionError");
    assert.equal(error.code, code);
    assert.equal(error.message.includes(rejectedValue), false);
    assert.deepEqual(Object.keys(error.details).sort(), ["field", "provider"]);
    return true;
  });
}

test("provider matrix is the exact H/0/00 executable contract", () => {
  assert.deepEqual(providerSelectionMatrix(), {
    codex: {
      aliases: {
        "gpt-6": "gpt-6-astra",
        astra: "gpt-6-astra",
        "gpt-6.1": "gpt-6.1-sol",
        "gpt-5.6": "gpt-5.6-sol",
        sol: "gpt-5.6-sol",
        terra: "gpt-5.6-terra",
        luna: "gpt-5.6-luna",
      },
      defaultModel: "gpt-5.6-sol",
      defaultReasoningEffort: "max",
      defaultServiceTier: "priority",
      execution: "available",
      models: {
        "gpt-6-astra": {
          reasoningEfforts: CODEX_NEW_EFFORTS,
          defaultReasoningEffort: "max",
        },
        "gpt-6.1-sol": {
          reasoningEfforts: CODEX_NEW_EFFORTS,
          defaultReasoningEffort: "xhigh",
        },
        "gpt-5.6-sol": {
          reasoningEfforts: CODEX_NEW_EFFORTS,
          defaultReasoningEffort: "max",
        },
        "gpt-5.6-terra": {
          reasoningEfforts: CODEX_NEW_EFFORTS,
          defaultReasoningEffort: "max",
        },
        "gpt-5.6-luna": {
          reasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
          defaultReasoningEffort: "max",
        },
        "gpt-5.5": {
          reasoningEfforts: CODEX_LEGACY_EFFORTS,
          defaultReasoningEffort: "medium",
        },
        "gpt-5": {
          reasoningEfforts: CODEX_LEGACY_EFFORTS,
          defaultReasoningEffort: "medium",
        },
        "gpt-5-codex": {
          reasoningEfforts: CODEX_LEGACY_EFFORTS,
          defaultReasoningEffort: "medium",
        },
      },
      serviceTiers: ["default", "priority"],
    },
    "claude-code": {
      aliases: {
        fable: "claude-fable-5",
        opus: "claude-opus-5",
        sonnet: "claude-sonnet-5",
        "opus-5": "claude-opus-5",
        "sonnet-5.5": "claude-sonnet-5-5",
        "opus-5.5": "claude-opus-5-5",
        "opus-5-5": "claude-opus-5-5",
      },
      defaultModel: "claude-fable-5",
      defaultReasoningEffort: "max",
      defaultServiceTier: null,
      execution: "available",
      models: {
        "claude-sonnet-5": {
          reasoningEfforts: CLAUDE_EFFORTS,
          defaultReasoningEffort: null,
        },
        "claude-fable-5-1": {
          reasoningEfforts: CLAUDE_EFFORTS,
          defaultReasoningEffort: null,
        },
        "claude-fable-5": {
          reasoningEfforts: CLAUDE_EFFORTS,
          defaultReasoningEffort: null,
        },
        "claude-opus-5": {
          reasoningEfforts: CLAUDE_EFFORTS,
          defaultReasoningEffort: null,
        },
        "claude-sonnet-5-5": {
          reasoningEfforts: CLAUDE_EFFORTS,
          defaultReasoningEffort: null,
        },
        "claude-opus-5-5": {
          reasoningEfforts: CLAUDE_EFFORTS,
          defaultReasoningEffort: null,
        },
        "claude-opus-4-8": {
          reasoningEfforts: CLAUDE_EFFORTS,
          defaultReasoningEffort: null,
        },
      },
      serviceTiers: null,
    },
    pi: {
      aliases: {
        qwen: "ollama/qwen3.8:27b",
        "qwen-coder": "ollama/qwen3-coder:30b",
        kimi: "moonshotai/kimi-k3",
        "kimi-k3": "moonshotai/kimi-k3",
      },
      defaultModel: "ollama/qwen3.8:27b",
      defaultReasoningEffort: "medium",
      defaultServiceTier: null,
      execution: "available",
      models: {
        "ollama/qwen3.8:27b": {
          reasoningEfforts: PI_THINKING,
          defaultReasoningEffort: "medium",
        },
        "ollama/qwen3-coder:30b": {
          reasoningEfforts: PI_THINKING,
          defaultReasoningEffort: "medium",
        },
        "moonshotai/kimi-k3": {
          reasoningEfforts: PI_THINKING,
          defaultReasoningEffort: "medium",
        },
      },
      serviceTiers: null,
    },
    opencode: {
      aliases: {
        qwen: "ollama/qwen3.8:27b",
        "qwen-coder": "ollama/qwen3-coder:30b",
        kimi: "moonshotai/kimi-k3",
        "kimi-k3": "moonshotai/kimi-k3",
      },
      defaultModel: "ollama/qwen3.8:27b",
      defaultReasoningEffort: null,
      defaultServiceTier: null,
      execution: "available",
      models: {
        "ollama/qwen3.8:27b": {
          reasoningEfforts: null,
          defaultReasoningEffort: null,
        },
        "ollama/qwen3-coder:30b": {
          reasoningEfforts: null,
          defaultReasoningEffort: null,
        },
        "moonshotai/kimi-k3": {
          reasoningEfforts: null,
          defaultReasoningEffort: null,
        },
      },
      serviceTiers: null,
    },
    "gemini-cli": {
      aliases: {},
      defaultModel: "gemini-2.5-pro",
      defaultReasoningEffort: null,
      defaultServiceTier: null,
      execution: "registry-only",
      models: {
        "gemini-2.5-pro": {
          reasoningEfforts: null,
          defaultReasoningEffort: null,
        },
        "gemini-2.5-flash": {
          reasoningEfforts: null,
          defaultReasoningEffort: null,
        },
      },
      serviceTiers: null,
    },
    antigravity: {
      aliases: {
        "gemini-3.8-flash": "gemini-3.8-flash-high",
        "gemini-3.7-flash": "gemini-3.7-flash-high",
        "gemini-3.6-flash": "gemini-3.6-flash-high",
        "gemini-3.5-flash": "gemini-3.5-flash-high",
        "gemini-3.1-pro": "gemini-3.1-pro-high",
      },
      defaultModel: "gemini-3.8-flash-high",
      defaultReasoningEffort: "high",
      defaultServiceTier: null,
      execution: "available",
      models: {
        "gemini-3.8-flash-high": {
          reasoningEfforts: ["low", "medium", "high"],
          defaultReasoningEffort: "high",
        },
        "gemini-3.8-flash-medium": {
          reasoningEfforts: ["low", "medium", "high"],
          defaultReasoningEffort: "high",
        },
        "gemini-3.8-flash-low": {
          reasoningEfforts: ["low", "medium", "high"],
          defaultReasoningEffort: "high",
        },
        "gemini-3.7-flash-high": {
          reasoningEfforts: ["low", "medium", "high"],
          defaultReasoningEffort: "high",
        },
        "gemini-3.7-flash-medium": {
          reasoningEfforts: ["low", "medium", "high"],
          defaultReasoningEffort: "high",
        },
        "gemini-3.7-flash-low": {
          reasoningEfforts: ["low", "medium", "high"],
          defaultReasoningEffort: "high",
        },
        "gemini-3.6-flash-high": {
          reasoningEfforts: ["low", "medium", "high"],
          defaultReasoningEffort: "high",
        },
        "gemini-3.6-flash-medium": {
          reasoningEfforts: ["low", "medium", "high"],
          defaultReasoningEffort: "high",
        },
        "gemini-3.6-flash-low": {
          reasoningEfforts: ["low", "medium", "high"],
          defaultReasoningEffort: "high",
        },
        "gemini-3.5-flash-high": {
          reasoningEfforts: ["low", "medium", "high"],
          defaultReasoningEffort: "high",
        },
        "gemini-3.5-flash-medium": {
          reasoningEfforts: ["low", "medium", "high"],
          defaultReasoningEffort: "high",
        },
        "gemini-3.5-flash-low": {
          reasoningEfforts: ["low", "medium", "high"],
          defaultReasoningEffort: "high",
        },
        "gemini-3.1-pro-high": {
          reasoningEfforts: ["low", "medium", "high"],
          defaultReasoningEffort: "high",
        },
        "gemini-3.1-pro-low": {
          reasoningEfforts: ["low", "medium", "high"],
          defaultReasoningEffort: "high",
        },
      },
      serviceTiers: null,
    },
  });
});

test("defaults resolve in the declared hierarchy with one deterministic digest", () => {
  const selection = resolveEffectiveAgentSelection({ agent: "codex" });

  assert.deepEqual(selection, {
    contractVersion: 1,
    profileId: "canonical-orchestrator",
    agent: "codex",
    provider: "codex",
    model: "gpt-5.6-sol",
    reasoningEffort: "max",
    serviceTier: "priority",
    resolutionSource: {
      model: "agent-default",
      reasoningEffort: "model-default",
      serviceTier: "agent-default",
    },
    registryDigest: ORCHESTRATOR_PROFILE_DIGEST,
  });
  assert.match(ORCHESTRATOR_PROFILE_DIGEST, /^sha256:[0-9a-f]{64}$/);
  assert.equal(
    profileDigest(structuredClone(CANONICAL_ORCHESTRATOR_PROFILE)),
    ORCHESTRATOR_PROFILE_DIGEST,
  );
});

test("canonical IDs and exact aliases produce canonical immutable selections", () => {
  const canonical = resolveEffectiveAgentSelection({
    agent: "codex",
    model: "gpt-5.6-terra",
    reasoningEffort: "ultra",
    serviceTier: "priority",
  });
  const alias = resolveEffectiveAgentSelection({
    agent: "codex",
    model: "gpt-5.6",
  });
  const claude = resolveEffectiveAgentSelection({
    agent: "claude-code",
    model: "opus",
    reasoningEffort: "low",
  });

  assert.equal(canonical.resolutionSource.model, "explicit-canonical");
  assert.equal(canonical.resolutionSource.reasoningEffort, "explicit");
  assert.equal(canonical.resolutionSource.serviceTier, "explicit");
  assert.equal(alias.model, "gpt-5.6-sol");
  assert.equal(alias.resolutionSource.model, "explicit-alias");
  assert.equal(claude.model, "claude-opus-5");
  assert.equal(claude.serviceTier, null);
  assert.equal(claude.resolutionSource.serviceTier, "unsupported");
  assert.equal(Object.isFrozen(alias), true);
  assert.equal(Object.isFrozen(alias.resolutionSource), true);
  assert.throws(() => {
    alias.model = "changed";
  }, TypeError);
});

test("every declared model and supported effort/tier resolves across the matrix", () => {
  const matrix = providerSelectionMatrix();

  for (const [provider, profile] of Object.entries(matrix)) {
    for (const [model, modelProfile] of Object.entries(profile.models)) {
      const base = resolveEffectiveAgentSelection({ agent: provider, model });
      assert.equal(base.model, model);

      for (const reasoningEffort of modelProfile.reasoningEfforts || []) {
        const selection = resolveEffectiveAgentSelection({
          agent: provider,
          model,
          reasoningEffort,
        });
        assert.equal(selection.reasoningEffort, reasoningEffort);
      }

      for (const serviceTier of profile.serviceTiers || []) {
        const selection = resolveEffectiveAgentSelection({
          agent: provider,
          model,
          serviceTier,
        });
        assert.equal(selection.serviceTier, serviceTier);
      }
    }

    for (const [alias, model] of Object.entries(profile.aliases)) {
      const selection = resolveEffectiveAgentSelection({ agent: provider, model: alias });
      assert.equal(selection.model, model);
      assert.equal(selection.resolutionSource.model, "explicit-alias");
    }
  }
});

test("unsupported values and unknown providers fail closed without echoing caller payloads", () => {
  assertSelectionError(
    () => resolveEffectiveAgentSelection({ agent: "unknown-provider-secret" }),
    "EFFECTIVE_SELECTION_PROVIDER_UNKNOWN",
    "unknown-provider-secret",
  );
  assertSelectionError(
    () => resolveEffectiveAgentSelection({ agent: "codex", model: "secret-model-alias" }),
    "EFFECTIVE_SELECTION_MODEL_UNSUPPORTED",
    "secret-model-alias",
  );
  assertSelectionError(
    () =>
      resolveEffectiveAgentSelection({
        agent: "codex",
        model: "gpt-5.6-luna",
        reasoningEffort: "ultra",
      }),
    "EFFECTIVE_SELECTION_REASONING_UNSUPPORTED",
    "ultra",
  );
  assertSelectionError(
    () =>
      resolveEffectiveAgentSelection({
        agent: "claude-code",
        serviceTier: "priority-secret",
      }),
    "EFFECTIVE_SELECTION_TIER_UNSUPPORTED",
    "priority-secret",
  );
  assertSelectionError(
    () =>
      resolveEffectiveAgentSelection({
        agent: "gemini-cli",
        reasoningEffort: "max-secret",
      }),
    "EFFECTIVE_SELECTION_REASONING_UNSUPPORTED",
    "max-secret",
  );
});

test("ambient model, effort, and tier variables never influence resolution", () => {
  const names = [
    "AGENTS_MODEL",
    "AGENTS_REASONING_EFFORT",
    "AGENTS_SERVICE_TIER",
    "OPENAI_MODEL",
  ];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));

  try {
    for (const name of names) process.env[name] = "environment-secret-override";
    assert.deepEqual(
      resolveEffectiveAgentSelection({ agent: "claude-code" }),
      resolveEffectiveAgentSelection({ agent: "claude-code" }),
    );
    const selection = resolveEffectiveAgentSelection({ agent: "claude-code" });
    assert.equal(selection.model, "claude-fable-5");
    assert.equal(selection.reasoningEffort, "max");
    assert.equal(selection.serviceTier, null);
    assert.equal(JSON.stringify(selection).includes("environment-secret-override"), false);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});

test("all parity consumers receive the same effective selection object", () => {
  assert.deepEqual(EFFECTIVE_SELECTION_CONSUMERS, [
    "policy",
    "dry-run",
    "audit",
    "delegate",
    "spawn",
  ]);
  const bundle = createEffectiveAgentSelectionBundle({
    agent: "claude-code",
    model: "fable",
  });

  for (const consumer of EFFECTIVE_SELECTION_CONSUMERS) {
    assert.equal(bundle[consumer], bundle.effectiveSelection);
  }
  assert.deepEqual(
    bundle.auditProjection,
    safeAuditSelectionProjection(bundle.effectiveSelection),
  );
  assert.deepEqual(Object.keys(bundle.auditProjection), [
    "contractVersion",
    "profileId",
    "agent",
    "provider",
    "model",
    "reasoningEffort",
    "serviceTier",
    "resolutionSource",
    "registryDigest",
  ]);
  assert.equal(bundle.auditProjection.model, "claude-fable-5");
  assert.equal("requestedModel" in bundle.auditProjection, false);
  assert.equal("alias" in bundle.auditProjection, false);
});

test("audit projection rejects forged effective values without leaking them", () => {
  const selection = resolveEffectiveAgentSelection({ agent: "codex" });
  const forged = {
    ...selection,
    reasoningEffort: "audit-secret-effort",
  };

  assertSelectionError(
    () => safeAuditSelectionProjection(forged),
    "EFFECTIVE_SELECTION_INVALID",
    "audit-secret-effort",
  );
});

test("registry-only providers fail for execution consumers before child selection", () => {
  const profileSelection = resolveEffectiveAgentSelection({ agent: "gemini-cli" });
  assert.equal(profileSelection.model, "gemini-2.5-pro");

  for (const consumer of ["policy", "dry-run", "delegate", "spawn"]) {
    assertSelectionError(
      () =>
        resolveEffectiveAgentSelectionForConsumer(
          { agent: "gemini-cli" },
          consumer,
        ),
      "EFFECTIVE_SELECTION_PROVIDER_UNAVAILABLE",
      "gemini-cli",
    );
  }
});
