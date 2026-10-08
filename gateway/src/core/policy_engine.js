import {
  Decision,
  isCanonicalAction,
  isRawKind,
  normalizePolicyContext,
} from "./policy_types.js";
import { POLICY_RULE } from "./policy_rules.js";
import {
  consumeEffectiveAgentSelection,
  resolveEffectiveAgentSelectionForConsumer,
  safeSelectionRejection,
  validateRuntimeAgentCapabilities,
} from "./orchestrator_profile.js";

function deny(reason, ruleId, details = {}) {
  return { decision: Decision.DENY, reason, ruleId, ...details };
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

function evaluateAction(ctx) {
  if (!isCanonicalAction(ctx.action)) {
    return deny("action is not in the canonical catalog", POLICY_RULE.ACTION_UNKNOWN);
  }
  return null;
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

function selectionRuleId(rejection) {
  if (rejection.field === "reasoningEffort") {
    return POLICY_RULE.AGENT_REASONING_EFFORT_ALLOWED;
  }
  if (rejection.field === "serviceTier") {
    return POLICY_RULE.AGENT_SERVICE_TIER_ALLOWED;
  }
  if (rejection.field === "agent") return POLICY_RULE.AGENT_UNKNOWN;
  return POLICY_RULE.AGENT_MODEL_ALLOWED;
}

export function selectionDenialDecision(error) {
  const selectionRejection = safeSelectionRejection(error);
  if (!selectionRejection) return null;
  return deny(
    "effective agent selection rejected",
    selectionRuleId(selectionRejection),
    { selectionRejection },
  );
}

function evaluateModel(ctx, registries) {
  if (!resolvesModels(ctx.action) && !ctx.effectiveSelection) return null;
  const resolved = resolveAgentExecutionProfile(ctx, registries);
  if (resolved.decision !== Decision.ALLOW) return resolved;
  return resolved;
}

export function resolveAgentExecutionProfile(rawContext, registries) {
  try {
    const agentId = String(rawContext?.targetAgent ?? rawContext?.agent ?? "");
    const suppliedSelection = (
      rawContext?.effectiveSelection !== null
      && rawContext?.effectiveSelection !== undefined
    );
    const effectiveSelection = suppliedSelection
      ? consumeEffectiveAgentSelection(rawContext.effectiveSelection, {
          agent: agentId,
          consumer: "policy",
          rawSelection: {
            model: rawContext?.model,
            reasoningEffort: rawContext?.reasoningEffort,
            serviceTier: rawContext?.serviceTier,
          },
        })
      : resolveEffectiveAgentSelectionForConsumer(
          {
            agent: agentId,
            model: rawContext?.model,
            reasoningEffort: rawContext?.reasoningEffort,
            serviceTier: rawContext?.serviceTier,
          },
          "policy",
        );
    validateRuntimeAgentCapabilities(registries);
    return {
      ...allow("agent model resolved", POLICY_RULE.AGENT_MODEL_ALLOWED),
      model: effectiveSelection.model,
      reasoningEffort: effectiveSelection.reasoningEffort,
      serviceTier: effectiveSelection.serviceTier,
      effectiveSelection,
    };
  } catch (error) {
    const decision = selectionDenialDecision(error);
    if (decision) return decision;
    throw error;
  }
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
    ["action", evaluateAction],
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
    if (result?.effectiveSelection) {
      effective.effectiveSelection = result.effectiveSelection;
    }
  }

  return {
    final: { ...allow("all layers passed", POLICY_RULE.OK), ...effective },
    trace,
  };
}

function validateSelectionRegistry(ctx, registries) {
  if (!resolvesModels(ctx.action) && !ctx.effectiveSelection) return null;
  try {
    validateRuntimeAgentCapabilities(registries);
    return null;
  } catch (error) {
    const decision = selectionDenialDecision(error);
    if (decision) return decision;
    throw error;
  }
}

export function evaluate(rawCtx, registries) {
  const ctx = normalizePolicyContext(rawCtx);
  const registryDecision = validateSelectionRegistry(ctx, registries);
  if (registryDecision) return registryDecision;
  return runPipeline(ctx, registries).final;
}

export function resolveCliWriteAccess({ agent, role, repo }, registries) {
  return evaluate({ agent, role, repo, action: "code.write" }, registries).decision === "allow";
}

export function explain(rawCtx, registries) {
  const ctx = normalizePolicyContext(rawCtx);
  const registryDecision = validateSelectionRegistry(ctx, registries);
  if (registryDecision) {
    return {
      decision: registryDecision.decision,
      reason: registryDecision.reason,
      ruleId: registryDecision.ruleId,
      layers: [{ name: "model", result: registryDecision }],
      context: ctx,
    };
  }
  const { final, trace } = runPipeline(ctx, registries);
  return {
    decision: final.decision,
    reason: final.reason,
    ruleId: final.ruleId,
    layers: trace,
    context: ctx,
  };
}
