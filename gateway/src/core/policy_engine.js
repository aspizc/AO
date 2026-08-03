import { Decision, isRawKind, normalizePolicyContext } from "./policy_types.js";
import { POLICY_RULE } from "./policy_rules.js";

function deny(reason, ruleId) {
  return { decision: Decision.DENY, reason, ruleId };
}

function allow(reason, ruleId) {
  return { decision: Decision.ALLOW, reason, ruleId };
}

function allowWithSanitization(reason, ruleId) {
  return { decision: Decision.ALLOW_WITH_SANITIZATION, reason, ruleId };
}

function actionMatchesDeny(action, denyActions) {
  return denyActions.includes(action) || denyActions.some((denied) => action.startsWith(`${denied}.`));
}

function normalizePolicyPath(value) {
  if (value == null) return "";
  const normalized = String(value)
    .replaceAll("\\", "/")
    .split("/")
    .filter((part) => part && part !== ".")
    .reduce((parts, part) => {
      if (part === "..") {
        parts.pop();
      } else {
        parts.push(part);
      }
      return parts;
    }, [])
    .join("/");
  return normalized.replace(/\/+$/, "");
}

function pathMatchesExcludedPath(rawPath, rawExcludedPath) {
  const policyPath = normalizePolicyPath(rawPath);
  const excludedPath = normalizePolicyPath(rawExcludedPath);
  if (!policyPath || !excludedPath) return false;
  return (
    policyPath === excludedPath ||
    policyPath.startsWith(`${excludedPath}/`) ||
    policyPath.endsWith(`/${excludedPath}`) ||
    policyPath.includes(`/${excludedPath}/`)
  );
}

function evaluateClassification(ctx, registries) {
  const agent = registries.getAgent(ctx.agent);
  if (!agent) return deny(`unknown agent ${ctx.agent}`, POLICY_RULE.AGENT_UNKNOWN);

  if (ctx.repo) {
    const repo = registries.getRepo(ctx.repo);
    if (!repo) return deny(`unknown repo ${ctx.repo}`, POLICY_RULE.REPO_UNKNOWN);

    if (!agent.allowedClassifications.includes(repo.classification)) {
      return deny(
        `agent ${ctx.agent} cannot operate on classification ${repo.classification}`,
        POLICY_RULE.CLASSIFICATION_AGENT_NOT_ALLOWED,
      );
    }

    if (!repo.allowedAgents.includes(ctx.agent)) {
      return deny(
        `repo ${ctx.repo} does not allow agent ${ctx.agent}`,
        POLICY_RULE.CLASSIFICATION_REPO_NOT_ALLOWED,
      );
    }

    if (Array.isArray(repo.excludedPaths) && ctx.path) {
      const excluded = repo.excludedPaths.some((excludedPath) => pathMatchesExcludedPath(ctx.path, excludedPath));
      if (excluded) {
        return deny(
          `path ${ctx.path} is excluded`,
          POLICY_RULE.CLASSIFICATION_EXCLUDED_PATH,
        );
      }
    }
  }

  return null;
}

function evaluateRole(ctx, registries) {
  const agent = registries.getAgent(ctx.agent);
  const role = registries.getRole(ctx.role);

  if (!agent.allowedRoles.includes(ctx.role)) {
    return deny(
      `agent ${ctx.agent} cannot assume role ${ctx.role}`,
      POLICY_RULE.ROLE_AGENT_NOT_ALLOWED_FOR_ROLE,
    );
  }

  if (!role) return deny(`unknown role ${ctx.role}`, POLICY_RULE.ROLE_UNKNOWN);

  if (Array.isArray(role.denyActions) && actionMatchesDeny(ctx.action, role.denyActions)) {
    return deny(
      `role ${ctx.role} denies action ${ctx.action}`,
      POLICY_RULE.ROLE_DENY_ACTION,
    );
  }

  if (ctx.action === "task.assign") {
    if (ctx.role !== "orchestrator") {
      return deny(
        "task.assign is restricted to orchestrator role",
        POLICY_RULE.ROLE_TASK_ASSIGN_ONLY_ORCHESTRATOR,
      );
    }
    if (!ctx.targetAgent || !ctx.targetRole) {
      return deny(
        "task.assign requires targetAgent and targetRole",
        POLICY_RULE.ROLE_TASK_ASSIGN_MISSING_TARGET,
      );
    }

    const targetAgent = registries.getAgent(ctx.targetAgent);
    const targetRole = registries.getRole(ctx.targetRole);
    if (!targetAgent || !targetRole) {
      return deny(
        "task.assign target unknown",
        POLICY_RULE.ROLE_TASK_ASSIGN_UNKNOWN_TARGET,
      );
    }
    if (!targetAgent.allowedRoles.includes(ctx.targetRole)) {
      return deny(
        `target agent ${ctx.targetAgent} cannot assume ${ctx.targetRole}`,
        POLICY_RULE.ROLE_TASK_ASSIGN_TARGET_ROLE_NOT_ALLOWED,
      );
    }
  }

  return null;
}

function matchesProtectedBranch(branch, patterns) {
  if (!branch) return false;
  return patterns.some(
    (pattern) => pattern === branch || (pattern.endsWith("/*") && branch.startsWith(pattern.slice(0, -1))),
  );
}

function requireApproval(reason, ruleId) {
  return { decision: Decision.REQUIRE_APPROVAL, reason, ruleId };
}

function evaluateApproval(ctx, registries) {
  const agent = registries.getAgent(ctx.agent);
  const requires = agent.requiresApprovalFor || [];
  const protectedBranches = registries.getProtectedBranches();

  if (ctx.action === "git.push" && matchesProtectedBranch(ctx.targetBranch, protectedBranches)) {
    return requireApproval(
      `push to protected branch ${ctx.targetBranch}`,
      POLICY_RULE.APPROVAL_GIT_PUSH_PROTECTED,
    );
  }

  if (requires.includes(ctx.action)) {
    return requireApproval(
      `agent ${ctx.agent} requires approval for ${ctx.action}`,
      POLICY_RULE.APPROVAL_AGENT_REQUIRED,
    );
  }

  return null;
}

function resolvesModels(action) {
  return action === "agent.delegate" || action === "agent.spawn";
}

function resolveModel(agent, agentId, requestedModel) {
  if (!Array.isArray(agent.models)) return { ok: true };
  const requestedOrDefault = requestedModel || agent.defaultModel;
  if (!requestedOrDefault) return { ok: true };
  const model = agent.models.includes(requestedOrDefault)
    ? requestedOrDefault
    : agent.modelAliases?.[requestedOrDefault];
  if (!model || !agent.models.includes(model)) {
    return {
      ok: false,
      decision: deny(
        `model ${requestedOrDefault} not allowed for agent ${agentId}`,
        POLICY_RULE.AGENT_MODEL_ALLOWED,
      ),
    };
  }

  return { ok: true, model };
}

function modelProfile(agent, model) {
  if (!model || !agent.modelProfiles || typeof agent.modelProfiles !== "object") return null;
  return agent.modelProfiles[model] || null;
}

function resolveReasoningEffort(agent, agentId, model, requestedReasoningEffort) {
  const profile = modelProfile(agent, model);
  const reasoningEfforts = profile?.reasoningEfforts || agent.reasoningEfforts;
  if (!Array.isArray(reasoningEfforts)) {
    if (!requestedReasoningEffort) return { ok: true };
    return {
      ok: false,
      decision: deny(
        `reasoning effort ${requestedReasoningEffort} not supported by agent ${agentId}`,
        POLICY_RULE.AGENT_REASONING_EFFORT_ALLOWED,
      ),
    };
  }
  const reasoningEffort =
    requestedReasoningEffort || profile?.defaultReasoningEffort || agent.defaultReasoningEffort;
  if (!reasoningEffort) return { ok: true };
  if (!reasoningEfforts.includes(reasoningEffort)) {
    return {
      ok: false,
      decision: deny(
        `reasoning effort ${reasoningEffort} not allowed for agent ${agentId}`,
        POLICY_RULE.AGENT_REASONING_EFFORT_ALLOWED,
      ),
    };
  }

  return { ok: true, reasoningEffort };
}

function resolveServiceTier(agent, agentId, model, requestedServiceTier) {
  const profile = modelProfile(agent, model);
  const serviceTiers = profile?.serviceTiers || agent.serviceTiers;
  if (!Array.isArray(serviceTiers)) {
    if (!requestedServiceTier) return { ok: true };
    return {
      ok: false,
      decision: deny(
        `service tier ${requestedServiceTier} not supported by agent ${agentId}`,
        POLICY_RULE.AGENT_SERVICE_TIER_ALLOWED,
      ),
    };
  }
  const serviceTier = requestedServiceTier || profile?.defaultServiceTier || agent.defaultServiceTier;
  if (!serviceTier) return { ok: true };
  if (!serviceTiers.includes(serviceTier)) {
    return {
      ok: false,
      decision: deny(
        `service tier ${serviceTier} not allowed for agent ${agentId}`,
        POLICY_RULE.AGENT_SERVICE_TIER_ALLOWED,
      ),
    };
  }

  return { ok: true, serviceTier };
}

function evaluateModel(ctx, registries) {
  if (!resolvesModels(ctx.action)) return null;
  const agent = registries.getAgent(ctx.agent);
  if (!agent) return null;

  const resolvedModel = resolveModel(agent, ctx.agent, ctx.model);
  if (!resolvedModel.ok) return resolvedModel.decision;

  const resolvedReasoning = resolveReasoningEffort(
    agent,
    ctx.agent,
    resolvedModel.model,
    ctx.reasoningEffort,
  );
  if (!resolvedReasoning.ok) return resolvedReasoning.decision;

  const resolvedServiceTier = resolveServiceTier(
    agent,
    ctx.agent,
    resolvedModel.model,
    ctx.serviceTier,
  );
  if (!resolvedServiceTier.ok) return resolvedServiceTier.decision;

  if (!resolvedModel.model && !resolvedReasoning.reasoningEffort && !resolvedServiceTier.serviceTier) {
    return null;
  }

  return {
    ...allow("agent model resolved", POLICY_RULE.AGENT_MODEL_ALLOWED),
    ...(resolvedModel.model ? { model: resolvedModel.model } : {}),
    ...(resolvedReasoning.reasoningEffort ? { reasoningEffort: resolvedReasoning.reasoningEffort } : {}),
    ...(resolvedServiceTier.serviceTier ? { serviceTier: resolvedServiceTier.serviceTier } : {}),
  };
}

function roleHasRawRestrictedAccess(role) {
  if (!role) return false;
  const allowActions = role.allowActions || [];
  return (
    allowActions.includes("code.read.raw_restricted") ||
    allowActions.includes("artifact.put.raw_restricted") ||
    allowActions.includes("artifact.get.raw_restricted")
  );
}

function roleCanReceiveSanitizedRawRestricted(role) {
  if (!role) return false;
  const allowActions = role.allowActions || [];
  return allowActions.includes("artifact.get.sanitized.raw_restricted");
}

function evaluateSanitization(ctx, registries) {
  if (ctx.action !== "artifact.get") return null;
  if (!isRawKind(ctx.artifactKind)) return null;
  if (ctx.artifactClassification !== "restricted") return null;

  const role = registries.getRole(ctx.role);
  if (roleHasRawRestrictedAccess(role)) return null;

  if (ctx.role === "orchestrator") {
    return deny(
      "orchestrator cannot consume raw restricted artifacts",
      POLICY_RULE.SANITIZATION_ORCHESTRATOR_RAW,
    );
  }

  if (!roleCanReceiveSanitizedRawRestricted(role)) {
    return deny(
      `role ${ctx.role} cannot receive sanitized raw restricted artifacts`,
      POLICY_RULE.SANITIZATION_ROLE_DENIES_SANITIZED_RAW_RESTRICTED,
    );
  }

  return allowWithSanitization(
    `role ${ctx.role} may consume sanitized version of ${ctx.artifactKind}`,
    POLICY_RULE.SANITIZATION_REQUIRED,
  );
}

function runPipeline(ctx, registries) {
  const layers = [
    ["classification", evaluateClassification],
    ["model", evaluateModel],
    ["role", evaluateRole],
    ["approval", evaluateApproval],
    ["sanitization", evaluateSanitization],
  ];
  const trace = [];

  const effective = {};

  for (const [name, layer] of layers) {
    const result = layer(ctx, registries);
    trace.push({ name, result });
    if (result && result.decision !== Decision.ALLOW) {
      return { final: result, trace };
    }
    if (result?.model) effective.model = result.model;
    if (result?.reasoningEffort) effective.reasoningEffort = result.reasoningEffort;
    if (result?.serviceTier) effective.serviceTier = result.serviceTier;
  }

  return {
    final: { ...allow("all layers passed", POLICY_RULE.OK), ...effective },
    trace,
  };
}

export function evaluate(rawCtx, registries) {
  const ctx = normalizePolicyContext(rawCtx);
  return runPipeline(ctx, registries).final;
}

export function explain(rawCtx, registries) {
  const ctx = normalizePolicyContext(rawCtx);
  const { final, trace } = runPipeline(ctx, registries);
  return {
    decision: final.decision,
    reason: final.reason,
    ruleId: final.ruleId,
    layers: trace,
    context: ctx,
  };
}
