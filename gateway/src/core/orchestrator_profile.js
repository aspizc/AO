import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const PROFILE_FILE = path.join(
  REPO_ROOT,
  "gateway",
  "contracts",
  "orchestrator-profile-v1.json",
);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
  return `{${entries.join(",")}}`;
}

function readProfile() {
  const parsed = JSON.parse(fs.readFileSync(PROFILE_FILE, "utf-8"));
  if (
    parsed.version !== 1
    || parsed.profileId !== "canonical-orchestrator"
    || !parsed.providers
  ) {
    throw new TypeError("invalid canonical orchestrator profile");
  }
  return deepFreeze(parsed);
}

export const CANONICAL_ORCHESTRATOR_PROFILE = readProfile();

export function profileDigest(profile) {
  const digest = crypto
    .createHash("sha256")
    .update(canonicalJson(profile))
    .digest("hex");
  return `sha256:${digest}`;
}

export const ORCHESTRATOR_PROFILE_DIGEST = profileDigest(
  CANONICAL_ORCHESTRATOR_PROFILE,
);

export const EFFECTIVE_SELECTION_CONSUMERS = Object.freeze([
  "policy",
  "dry-run",
  "audit",
  "delegate",
  "spawn",
]);

const EFFECTIVE_SELECTION_AUTHORITY = new WeakSet();
const EFFECTIVE_SELECTION_KEYS = Object.freeze([
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
const RESOLUTION_SOURCE_KEYS = Object.freeze([
  "model",
  "reasoningEffort",
  "serviceTier",
]);
const RAW_SELECTION_FIELDS = Object.freeze([
  "model",
  "reasoningEffort",
  "serviceTier",
]);

const SAFE_SELECTION_REJECTION_CODES = new Set([
  "EFFECTIVE_SELECTION_CONSUMER_UNKNOWN",
  "EFFECTIVE_SELECTION_INVALID",
  "EFFECTIVE_SELECTION_MODEL_UNSUPPORTED",
  "EFFECTIVE_SELECTION_PROVIDER_UNAVAILABLE",
  "EFFECTIVE_SELECTION_PROVIDER_UNKNOWN",
  "EFFECTIVE_SELECTION_REASONING_UNSUPPORTED",
  "EFFECTIVE_SELECTION_REGISTRY_DRIFT",
  "EFFECTIVE_SELECTION_TIER_UNSUPPORTED",
]);
const SAFE_SELECTION_REJECTION_FIELDS = new Set([
  "agent",
  "consumer",
  "effectiveSelection",
  "model",
  "reasoningEffort",
  "registry",
  "serviceTier",
]);
const SAFE_SELECTION_REJECTION_PROVIDERS = new Set([
  "claude-code",
  "codex",
  "gemini-cli",
]);

export class EffectiveAgentSelectionError extends Error {
  constructor(code, field, provider = null) {
    super("effective agent selection rejected");
    this.name = "EffectiveAgentSelectionError";
    this.code = code;
    this.details = deepFreeze({ field, provider });
  }
}

export class OrchestratorProfileContractError extends Error {
  constructor(code, field) {
    super("canonical orchestrator profile drift");
    this.name = "OrchestratorProfileContractError";
    this.code = code;
    this.details = deepFreeze({ field });
  }
}

function selectionError(code, field, provider = null) {
  throw new EffectiveAgentSelectionError(code, field, provider);
}

function contractError(code, field) {
  throw new OrchestratorProfileContractError(code, field);
}

export function safeSelectionRejection(value) {
  const contractDrift = value instanceof OrchestratorProfileContractError;
  const code = contractDrift
    ? "EFFECTIVE_SELECTION_REGISTRY_DRIFT"
    : value?.code;
  const details = value?.details ?? value;
  const field = contractDrift ? "registry" : details?.field;
  const provider = details?.provider;
  if (
    !SAFE_SELECTION_REJECTION_CODES.has(code)
    || !SAFE_SELECTION_REJECTION_FIELDS.has(field)
  ) {
    return null;
  }
  return deepFreeze({
    code,
    field,
    provider: SAFE_SELECTION_REJECTION_PROVIDERS.has(provider)
      ? provider
      : null,
  });
}

function providerProfile(agent) {
  if (typeof agent !== "string") {
    selectionError("EFFECTIVE_SELECTION_PROVIDER_UNKNOWN", "agent");
  }
  const profile = CANONICAL_ORCHESTRATOR_PROFILE.providers[agent];
  if (!profile || profile.agent !== agent || profile.provider !== agent) {
    selectionError("EFFECTIVE_SELECTION_PROVIDER_UNKNOWN", "agent");
  }
  return profile;
}

function resolveModel(profile, requestedModel) {
  if (requestedModel === null || requestedModel === undefined) {
    return {
      model: profile.defaultModel,
      source: "agent-default",
    };
  }
  if (typeof requestedModel !== "string") {
    selectionError(
      "EFFECTIVE_SELECTION_MODEL_UNSUPPORTED",
      "model",
      profile.provider,
    );
  }
  if (Object.hasOwn(profile.models, requestedModel)) {
    return {
      model: requestedModel,
      source: "explicit-canonical",
    };
  }
  const aliasTarget = profile.aliases[requestedModel];
  if (aliasTarget && Object.hasOwn(profile.models, aliasTarget)) {
    return {
      model: aliasTarget,
      source: "explicit-alias",
    };
  }
  selectionError(
    "EFFECTIVE_SELECTION_MODEL_UNSUPPORTED",
    "model",
    profile.provider,
  );
}

function resolveReasoningEffort(profile, modelProfile, requestedEffort) {
  const supported = modelProfile.reasoningEfforts;
  if (requestedEffort !== null && requestedEffort !== undefined) {
    if (
      typeof requestedEffort !== "string"
      || !Array.isArray(supported)
      || !supported.includes(requestedEffort)
    ) {
      selectionError(
        "EFFECTIVE_SELECTION_REASONING_UNSUPPORTED",
        "reasoningEffort",
        profile.provider,
      );
    }
    return {
      reasoningEffort: requestedEffort,
      source: "explicit",
    };
  }
  if (modelProfile.defaultReasoningEffort !== null) {
    return {
      reasoningEffort: modelProfile.defaultReasoningEffort,
      source: "model-default",
    };
  }
  if (profile.defaultReasoningEffort !== null) {
    return {
      reasoningEffort: profile.defaultReasoningEffort,
      source: "agent-default",
    };
  }
  return {
    reasoningEffort: null,
    source: "unsupported",
  };
}

function resolveServiceTier(profile, requestedTier) {
  const supported = profile.serviceTiers;
  if (requestedTier !== null && requestedTier !== undefined) {
    if (
      typeof requestedTier !== "string"
      || !Array.isArray(supported)
      || !supported.includes(requestedTier)
    ) {
      selectionError(
        "EFFECTIVE_SELECTION_TIER_UNSUPPORTED",
        "serviceTier",
        profile.provider,
      );
    }
    return {
      serviceTier: requestedTier,
      source: "explicit",
    };
  }
  if (profile.defaultServiceTier !== null) {
    return {
      serviceTier: profile.defaultServiceTier,
      source: "agent-default",
    };
  }
  return {
    serviceTier: null,
    source: "unsupported",
  };
}

export function resolveEffectiveAgentSelection({
  agent,
  model = null,
  reasoningEffort = null,
  serviceTier = null,
} = {}) {
  const profile = providerProfile(agent);
  const resolvedModel = resolveModel(profile, model);
  const modelProfile = profile.models[resolvedModel.model];
  const resolvedReasoning = resolveReasoningEffort(
    profile,
    modelProfile,
    reasoningEffort,
  );
  const resolvedTier = resolveServiceTier(profile, serviceTier);

  const selection = deepFreeze({
    contractVersion: CANONICAL_ORCHESTRATOR_PROFILE.version,
    profileId: CANONICAL_ORCHESTRATOR_PROFILE.profileId,
    agent: profile.agent,
    provider: profile.provider,
    model: resolvedModel.model,
    reasoningEffort: resolvedReasoning.reasoningEffort,
    serviceTier: resolvedTier.serviceTier,
    resolutionSource: {
      model: resolvedModel.source,
      reasoningEffort: resolvedReasoning.source,
      serviceTier: resolvedTier.source,
    },
    registryDigest: ORCHESTRATOR_PROFILE_DIGEST,
  });
  EFFECTIVE_SELECTION_AUTHORITY.add(selection);
  return selection;
}

function assertKnownConsumer(consumer) {
  if (!EFFECTIVE_SELECTION_CONSUMERS.includes(consumer)) {
    selectionError("EFFECTIVE_SELECTION_CONSUMER_UNKNOWN", "consumer");
  }
}

function assertProviderExecutable(selection) {
  const profile = CANONICAL_ORCHESTRATOR_PROFILE.providers[selection.provider];
  if (profile.execution !== "available") {
    selectionError(
      "EFFECTIVE_SELECTION_PROVIDER_UNAVAILABLE",
      "agent",
      selection.provider,
    );
  }
}

export function resolveEffectiveAgentSelectionForConsumer(request, consumer) {
  assertKnownConsumer(consumer);
  const selection = resolveEffectiveAgentSelection(request);
  assertProviderExecutable(selection);
  return selection;
}

function hasExactFrozenDataShape(value, keys) {
  if (
    Object.getPrototypeOf(value) !== Object.prototype
    || !Object.isFrozen(value)
  ) {
    return false;
  }
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== keys.length
    || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))
  ) {
    return false;
  }
  return keys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return (
      descriptor
      && Object.hasOwn(descriptor, "value")
      && descriptor.enumerable === true
      && descriptor.configurable === false
      && descriptor.writable === false
    );
  });
}

export function assertEffectiveSelection(selection) {
  if (
    !selection
    || typeof selection !== "object"
    || !EFFECTIVE_SELECTION_AUTHORITY.has(selection)
  ) {
    selectionError("EFFECTIVE_SELECTION_INVALID", "effectiveSelection");
  }
  if (
    !hasExactFrozenDataShape(selection, EFFECTIVE_SELECTION_KEYS)
    || !hasExactFrozenDataShape(
      selection.resolutionSource,
      RESOLUTION_SOURCE_KEYS,
    )
    || selection.contractVersion !== CANONICAL_ORCHESTRATOR_PROFILE.version
    || selection.registryDigest !== ORCHESTRATOR_PROFILE_DIGEST
    || selection.profileId !== CANONICAL_ORCHESTRATOR_PROFILE.profileId
  ) {
    selectionError("EFFECTIVE_SELECTION_INVALID", "effectiveSelection");
  }
  const profile = CANONICAL_ORCHESTRATOR_PROFILE.providers[selection.provider];
  const modelProfile = profile?.models?.[selection.model];
  if (
    !profile
    || selection.agent !== profile.agent
    || selection.provider !== profile.provider
    || !modelProfile
  ) {
    selectionError("EFFECTIVE_SELECTION_INVALID", "effectiveSelection");
  }

  const modelSource = selection.resolutionSource?.model;
  const reasoningSource = selection.resolutionSource?.reasoningEffort;
  const tierSource = selection.resolutionSource?.serviceTier;
  const modelSourceValid = (
    modelSource === "explicit-canonical"
    || (
      modelSource === "explicit-alias"
      && Object.values(profile.aliases).includes(selection.model)
    )
    || (
      modelSource === "agent-default"
      && selection.model === profile.defaultModel
    )
  );
  const effortAllowed = (
    Array.isArray(modelProfile.reasoningEfforts)
    && modelProfile.reasoningEfforts.includes(selection.reasoningEffort)
  );
  const reasoningSourceValid = (
    (reasoningSource === "explicit" && effortAllowed)
    || (
      reasoningSource === "model-default"
      && modelProfile.defaultReasoningEffort !== null
      && selection.reasoningEffort === modelProfile.defaultReasoningEffort
    )
    || (
      reasoningSource === "agent-default"
      && modelProfile.defaultReasoningEffort === null
      && profile.defaultReasoningEffort !== null
      && selection.reasoningEffort === profile.defaultReasoningEffort
    )
    || (
      reasoningSource === "unsupported"
      && modelProfile.defaultReasoningEffort === null
      && profile.defaultReasoningEffort === null
      && selection.reasoningEffort === null
    )
  );
  const tierAllowed = (
    Array.isArray(profile.serviceTiers)
    && profile.serviceTiers.includes(selection.serviceTier)
  );
  const tierSourceValid = (
    (tierSource === "explicit" && tierAllowed)
    || (
      tierSource === "agent-default"
      && profile.defaultServiceTier !== null
      && selection.serviceTier === profile.defaultServiceTier
    )
    || (
      tierSource === "unsupported"
      && profile.defaultServiceTier === null
      && selection.serviceTier === null
    )
  );
  if (!modelSourceValid || !reasoningSourceValid || !tierSourceValid) {
    selectionError("EFFECTIVE_SELECTION_INVALID", "effectiveSelection");
  }
  return selection;
}

export function consumeEffectiveAgentSelection(
  selection,
  {
    agent = null,
    consumer,
    rawSelection = null,
    requireExecutable = true,
  } = {},
) {
  assertKnownConsumer(consumer);
  const effective = assertEffectiveSelection(selection);
  if (agent !== null && effective.agent !== agent) {
    selectionError("EFFECTIVE_SELECTION_INVALID", "effectiveSelection");
  }
  if (
    rawSelection
    && RAW_SELECTION_FIELDS.some(
      (field) => rawSelection[field] !== null && rawSelection[field] !== undefined,
    )
  ) {
    selectionError("EFFECTIVE_SELECTION_INVALID", "effectiveSelection");
  }
  if (requireExecutable) assertProviderExecutable(effective);
  return effective;
}

export function safeAuditSelectionProjection(selection) {
  const effective = assertEffectiveSelection(selection);
  return deepFreeze({
    contractVersion: effective.contractVersion,
    profileId: effective.profileId,
    agent: effective.agent,
    provider: effective.provider,
    model: effective.model,
    reasoningEffort: effective.reasoningEffort,
    serviceTier: effective.serviceTier,
    resolutionSource: structuredClone(effective.resolutionSource),
    registryDigest: effective.registryDigest,
  });
}

export function createEffectiveAgentSelectionBundle(request) {
  const selection = resolveEffectiveAgentSelection(request);
  assertProviderExecutable(selection);
  const bundle = {
    effectiveSelection: selection,
  };
  for (const consumer of EFFECTIVE_SELECTION_CONSUMERS) {
    bundle[consumer] = selection;
  }
  bundle.auditProjection = safeAuditSelectionProjection(selection);
  return deepFreeze(bundle);
}

export function providerSelectionMatrix() {
  const matrix = {};
  for (const [provider, profile] of Object.entries(
    CANONICAL_ORCHESTRATOR_PROFILE.providers,
  )) {
    matrix[provider] = {
      aliases: structuredClone(profile.aliases),
      defaultModel: profile.defaultModel,
      defaultReasoningEffort: profile.defaultReasoningEffort,
      defaultServiceTier: profile.defaultServiceTier,
      execution: profile.execution,
      models: structuredClone(profile.models),
      serviceTiers: structuredClone(profile.serviceTiers),
    };
  }
  return deepFreeze(matrix);
}

function sameValue(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function assertCapabilityField(actual, expected, field) {
  if (!sameValue(actual, expected)) {
    contractError("ORCHESTRATOR_PROFILE_CAPABILITY_DRIFT", field);
  }
}

export function validateProfileAgainstAgentCapabilities(profile, capabilities) {
  if (!profile?.providers || !capabilities?.agents) {
    contractError("ORCHESTRATOR_PROFILE_CAPABILITY_DRIFT", "agents");
  }
  assertCapabilityField(
    Object.keys(capabilities.agents).sort(),
    Object.keys(profile.providers).sort(),
    "agents",
  );

  const supportedRoles = new Set();
  for (const [providerId, provider] of Object.entries(profile.providers)) {
    const agent = capabilities.agents[providerId];
    if (!agent) {
      contractError(
        "ORCHESTRATOR_PROFILE_CAPABILITY_DRIFT",
        `agents.${providerId}`,
      );
    }
    if (!Array.isArray(agent.allowedRoles)) {
      contractError(
        "ORCHESTRATOR_PROFILE_CAPABILITY_DRIFT",
        `agents.${providerId}.allowedRoles`,
      );
    }
    for (const role of agent.allowedRoles) supportedRoles.add(role);
    assertCapabilityField(
      agent.models,
      Object.keys(provider.models),
      `agents.${providerId}.models`,
    );
    assertCapabilityField(
      agent.modelAliases || {},
      provider.aliases,
      `agents.${providerId}.modelAliases`,
    );
    assertCapabilityField(
      agent.defaultModel ?? null,
      provider.defaultModel,
      `agents.${providerId}.defaultModel`,
    );
    assertCapabilityField(
      agent.reasoningEfforts ?? null,
      provider.models[provider.defaultModel].reasoningEfforts,
      `agents.${providerId}.reasoningEfforts`,
    );
    assertCapabilityField(
      agent.defaultReasoningEffort ?? null,
      provider.defaultReasoningEffort,
      `agents.${providerId}.defaultReasoningEffort`,
    );
    assertCapabilityField(
      agent.serviceTiers ?? null,
      provider.serviceTiers,
      `agents.${providerId}.serviceTiers`,
    );
    assertCapabilityField(
      agent.defaultServiceTier ?? null,
      provider.defaultServiceTier,
      `agents.${providerId}.defaultServiceTier`,
    );

    for (const [model, modelContract] of Object.entries(provider.models)) {
      const modelProfile = agent.modelProfiles?.[model];
      const effectiveEfforts =
        modelProfile?.reasoningEfforts
        ?? agent.reasoningEfforts
        ?? null;
      const effectiveDefaultEffort =
        modelProfile?.defaultReasoningEffort
        ?? agent.defaultReasoningEffort
        ?? null;
      const contractDefaultEffort =
        modelContract.defaultReasoningEffort
        ?? provider.defaultReasoningEffort
        ?? null;
      assertCapabilityField(
        effectiveEfforts,
        modelContract.reasoningEfforts,
        `agents.${providerId}.modelProfiles.${model}.reasoningEfforts`,
      );
      assertCapabilityField(
        effectiveDefaultEffort,
        contractDefaultEffort,
        `agents.${providerId}.modelProfiles.${model}.defaultReasoningEffort`,
      );
    }
  }
  assertCapabilityField(
    [...supportedRoles].sort(),
    [...profile.roles].sort(),
    "roles",
  );
  return true;
}

export function validateRuntimeAgentCapabilities(registries) {
  if (typeof registries?.raw !== "function") return true;
  try {
    const runtimeRegistry = registries.raw();
    validateProfileAgainstAgentCapabilities(
      CANONICAL_ORCHESTRATOR_PROFILE,
      { agents: runtimeRegistry?.agents },
    );
    return true;
  } catch (error) {
    if (error instanceof OrchestratorProfileContractError) {
      selectionError("EFFECTIVE_SELECTION_REGISTRY_DRIFT", "registry");
    }
    throw error;
  }
}

function normalizeToolNames(toolCatalog) {
  if (!Array.isArray(toolCatalog)) {
    contractError("ORCHESTRATOR_PROFILE_TOOL_DRIFT", "toolGuidance");
  }
  return toolCatalog.map((entry) =>
    typeof entry === "string" ? entry : entry?.name);
}

export function validateProfileAgainstToolCatalog(profile, toolCatalog) {
  const toolNames = normalizeToolNames(toolCatalog);
  assertCapabilityField(
    Object.keys(profile.toolGuidance).sort(),
    [...toolNames].sort(),
    "toolGuidance",
  );
  const known = new Set(toolNames);
  for (const [phase, workflow] of Object.entries(profile.workflows)) {
    for (const tool of workflow.tools) {
      if (!known.has(tool)) {
        contractError(
          "ORCHESTRATOR_PROFILE_TOOL_DRIFT",
          `workflows.${phase}.tools`,
        );
      }
    }
  }
  return true;
}

export function validateProfileAgainstArtifactSchema(profile, artifactSchema) {
  const artifactKinds = artifactSchema?.properties?.kind?.enum;
  if (!Array.isArray(artifactKinds)) {
    contractError("ORCHESTRATOR_PROFILE_ARTIFACT_DRIFT", "artifacts");
  }
  const known = new Set(artifactKinds);
  for (const [phase, workflow] of Object.entries(profile.workflows)) {
    for (const artifact of workflow.artifacts) {
      if (!known.has(artifact)) {
        contractError(
          "ORCHESTRATOR_PROFILE_ARTIFACT_DRIFT",
          `workflows.${phase}.artifacts`,
        );
      }
    }
    for (const prerequisite of workflow.prerequisites) {
      if (
        profile.prerequisites[prerequisite]?.availability
        !== "unavailable"
      ) {
        contractError(
          "ORCHESTRATOR_PROFILE_PREREQUISITE_DRIFT",
          `workflows.${phase}.prerequisites`,
        );
      }
    }
  }
  return true;
}
