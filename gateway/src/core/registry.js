import fs from "node:fs";
import path from "node:path";

export class RegistryError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "RegistryError";
    this.code = code;
    this.details = details;
  }
}

function readJson(absPath, file) {
  if (!fs.existsSync(absPath)) {
    throw new RegistryError("REGISTRY_MISSING", `missing registry file: ${file}`, {
      absPath,
      file,
    });
  }

  try {
    return JSON.parse(fs.readFileSync(absPath, "utf-8"));
  } catch (err) {
    throw new RegistryError("REGISTRY_INVALID_JSON", `invalid JSON in ${file}: ${err.message}`, {
      absPath,
      file,
    });
  }
}

function validateAgents(agents) {
  if (typeof agents !== "object" || agents === null || Array.isArray(agents)) {
    throw new RegistryError(
      "REGISTRY_INVALID_SHAPE",
      "agent-capabilities.json: 'agents' must be an object",
      { field: "agents" },
    );
  }

  for (const [id, agent] of Object.entries(agents)) {
    if (!Array.isArray(agent.allowedClassifications)) {
      throw new RegistryError(
        "REGISTRY_INVALID_AGENT",
        `agent ${id}: allowedClassifications must be an array`,
        { field: `agents.${id}.allowedClassifications` },
      );
    }
    if (!Array.isArray(agent.allowedRoles)) {
      throw new RegistryError(
        "REGISTRY_INVALID_AGENT",
        `agent ${id}: allowedRoles must be an array`,
        { field: `agents.${id}.allowedRoles` },
      );
    }
    if (agent.models !== undefined) {
      if (!Array.isArray(agent.models) || agent.models.length === 0) {
        throw new RegistryError("REGISTRY_INVALID_AGENT", `agent ${id}: models must be a non-empty array`, {
          field: `agents.${id}.models`,
        });
      }
      if (agent.defaultModel !== undefined && !agent.models.includes(agent.defaultModel)) {
        throw new RegistryError(
          "REGISTRY_INVALID_AGENT",
          `agent ${id}: defaultModel must be listed in models`,
          { field: `agents.${id}.defaultModel` },
        );
      }
    }
    if (agent.modelAliases !== undefined) {
      if (
        typeof agent.modelAliases !== "object" ||
        agent.modelAliases === null ||
        Array.isArray(agent.modelAliases)
      ) {
        throw new RegistryError(
          "REGISTRY_INVALID_AGENT",
          `agent ${id}: modelAliases must be an object`,
          { field: `agents.${id}.modelAliases` },
        );
      }
      for (const [alias, target] of Object.entries(agent.modelAliases)) {
        if (!alias || !Array.isArray(agent.models) || !agent.models.includes(target)) {
          throw new RegistryError(
            "REGISTRY_INVALID_AGENT",
            `agent ${id}: model alias ${alias} must target a listed model`,
            { field: `agents.${id}.modelAliases.${alias}` },
          );
        }
      }
    }
    if (agent.defaultReasoningEffort !== undefined && agent.reasoningEfforts === undefined) {
      throw new RegistryError(
        "REGISTRY_INVALID_AGENT",
        `agent ${id}: defaultReasoningEffort requires reasoningEfforts`,
        { field: `agents.${id}.defaultReasoningEffort` },
      );
    }
    if (agent.reasoningEfforts !== undefined) {
      if (!Array.isArray(agent.reasoningEfforts) || agent.reasoningEfforts.length === 0) {
        throw new RegistryError(
          "REGISTRY_INVALID_AGENT",
          `agent ${id}: reasoningEfforts must be a non-empty array`,
          { field: `agents.${id}.reasoningEfforts` },
        );
      }
      if (
        agent.defaultReasoningEffort !== undefined &&
        !agent.reasoningEfforts.includes(agent.defaultReasoningEffort)
      ) {
        throw new RegistryError(
          "REGISTRY_INVALID_AGENT",
          `agent ${id}: defaultReasoningEffort must be listed in reasoningEfforts`,
          { field: `agents.${id}.defaultReasoningEffort` },
        );
      }
    }
    if (agent.defaultServiceTier !== undefined && agent.serviceTiers === undefined) {
      throw new RegistryError(
        "REGISTRY_INVALID_AGENT",
        `agent ${id}: defaultServiceTier requires serviceTiers`,
        { field: `agents.${id}.defaultServiceTier` },
      );
    }
    if (agent.serviceTiers !== undefined) {
      if (!Array.isArray(agent.serviceTiers) || agent.serviceTiers.length === 0) {
        throw new RegistryError(
          "REGISTRY_INVALID_AGENT",
          `agent ${id}: serviceTiers must be a non-empty array`,
          { field: `agents.${id}.serviceTiers` },
        );
      }
      if (
        agent.defaultServiceTier !== undefined &&
        !agent.serviceTiers.includes(agent.defaultServiceTier)
      ) {
        throw new RegistryError(
          "REGISTRY_INVALID_AGENT",
          `agent ${id}: defaultServiceTier must be listed in serviceTiers`,
          { field: `agents.${id}.defaultServiceTier` },
        );
      }
    }
    if (agent.modelProfiles !== undefined) {
      if (
        typeof agent.modelProfiles !== "object" ||
        agent.modelProfiles === null ||
        Array.isArray(agent.modelProfiles)
      ) {
        throw new RegistryError(
          "REGISTRY_INVALID_AGENT",
          `agent ${id}: modelProfiles must be an object`,
          { field: `agents.${id}.modelProfiles` },
        );
      }
      for (const [model, profile] of Object.entries(agent.modelProfiles)) {
        if (!Array.isArray(agent.models) || !agent.models.includes(model)) {
          throw new RegistryError(
            "REGISTRY_INVALID_AGENT",
            `agent ${id}: model profile ${model} must reference a listed model`,
            { field: `agents.${id}.modelProfiles.${model}` },
          );
        }
        if (typeof profile !== "object" || profile === null || Array.isArray(profile)) {
          throw new RegistryError(
            "REGISTRY_INVALID_AGENT",
            `agent ${id}: model profile ${model} must be an object`,
            { field: `agents.${id}.modelProfiles.${model}` },
          );
        }
        if (profile.reasoningEfforts !== undefined) {
          if (!Array.isArray(profile.reasoningEfforts) || profile.reasoningEfforts.length === 0) {
            throw new RegistryError(
              "REGISTRY_INVALID_AGENT",
              `agent ${id}: model profile ${model} reasoningEfforts must be a non-empty array`,
              { field: `agents.${id}.modelProfiles.${model}.reasoningEfforts` },
            );
          }
          if (
            profile.defaultReasoningEffort !== undefined &&
            !profile.reasoningEfforts.includes(profile.defaultReasoningEffort)
          ) {
            throw new RegistryError(
              "REGISTRY_INVALID_AGENT",
              `agent ${id}: model profile ${model} defaultReasoningEffort must be listed in reasoningEfforts`,
              { field: `agents.${id}.modelProfiles.${model}.defaultReasoningEffort` },
            );
          }
        }
        const effectiveReasoningEfforts = profile.reasoningEfforts || agent.reasoningEfforts;
        const effectiveDefaultReasoningEffort =
          profile.defaultReasoningEffort || agent.defaultReasoningEffort;
        if (profile.defaultReasoningEffort !== undefined && !Array.isArray(effectiveReasoningEfforts)) {
          throw new RegistryError(
            "REGISTRY_INVALID_AGENT",
            `agent ${id}: model profile ${model} defaultReasoningEffort requires reasoningEfforts`,
            { field: `agents.${id}.modelProfiles.${model}.defaultReasoningEffort` },
          );
        }
        if (
          effectiveDefaultReasoningEffort !== undefined &&
          Array.isArray(effectiveReasoningEfforts) &&
          !effectiveReasoningEfforts.includes(effectiveDefaultReasoningEffort)
        ) {
          throw new RegistryError(
            "REGISTRY_INVALID_AGENT",
            `agent ${id}: model profile ${model} inherited defaultReasoningEffort must be listed in reasoningEfforts`,
            { field: `agents.${id}.modelProfiles.${model}.defaultReasoningEffort` },
          );
        }
        if (profile.serviceTiers !== undefined) {
          if (!Array.isArray(profile.serviceTiers) || profile.serviceTiers.length === 0) {
            throw new RegistryError(
              "REGISTRY_INVALID_AGENT",
              `agent ${id}: model profile ${model} serviceTiers must be a non-empty array`,
              { field: `agents.${id}.modelProfiles.${model}.serviceTiers` },
            );
          }
          if (
            profile.defaultServiceTier !== undefined &&
            !profile.serviceTiers.includes(profile.defaultServiceTier)
          ) {
            throw new RegistryError(
              "REGISTRY_INVALID_AGENT",
              `agent ${id}: model profile ${model} defaultServiceTier must be listed in serviceTiers`,
              { field: `agents.${id}.modelProfiles.${model}.defaultServiceTier` },
            );
          }
        }
        const effectiveServiceTiers = profile.serviceTiers || agent.serviceTiers;
        const effectiveDefaultServiceTier = profile.defaultServiceTier || agent.defaultServiceTier;
        if (profile.defaultServiceTier !== undefined && !Array.isArray(effectiveServiceTiers)) {
          throw new RegistryError(
            "REGISTRY_INVALID_AGENT",
            `agent ${id}: model profile ${model} defaultServiceTier requires serviceTiers`,
            { field: `agents.${id}.modelProfiles.${model}.defaultServiceTier` },
          );
        }
        if (
          effectiveDefaultServiceTier !== undefined &&
          Array.isArray(effectiveServiceTiers) &&
          !effectiveServiceTiers.includes(effectiveDefaultServiceTier)
        ) {
          throw new RegistryError(
            "REGISTRY_INVALID_AGENT",
            `agent ${id}: model profile ${model} inherited defaultServiceTier must be listed in serviceTiers`,
            { field: `agents.${id}.modelProfiles.${model}.defaultServiceTier` },
          );
        }
      }
    }
  }
}

function validateRepos(repositories) {
  if (typeof repositories !== "object" || repositories === null || Array.isArray(repositories)) {
    throw new RegistryError("REGISTRY_INVALID_SHAPE", "repositories.json: 'repositories' must be an object", {
      field: "repositories",
    });
  }

  const validClassifications = new Set(["unrestricted", "internal", "restricted"]);
  for (const [id, repo] of Object.entries(repositories)) {
    if (typeof repo !== "object" || repo === null || Array.isArray(repo)) {
      throw new RegistryError("REGISTRY_INVALID_REPO", `repo ${id}: entry must be an object`, {
        field: `repositories.${id}`,
      });
    }
    if (!validClassifications.has(repo.classification)) {
      throw new RegistryError(
        "REGISTRY_INVALID_REPO",
        `repo ${id}: invalid classification ${repo.classification}`,
        { field: `repositories.${id}.classification` },
      );
    }
    if (!Array.isArray(repo.allowedAgents) || repo.allowedAgents.length === 0) {
      throw new RegistryError(
        "REGISTRY_INVALID_REPO",
        `repo ${id}: allowedAgents must be a non-empty array`,
        { field: `repositories.${id}.allowedAgents` },
      );
    }
  }
}

function validateRoles(roles) {
  if (typeof roles !== "object" || roles === null || Array.isArray(roles)) {
    throw new RegistryError("REGISTRY_INVALID_SHAPE", "roles.json: 'roles' must be an object", {
      field: "roles",
    });
  }

  const required = [
    "orchestrator",
    "planner",
    "coder",
    "restricted-coder",
    "reviewer",
    "tester",
    "documenter",
    "security_reviewer",
  ];
  for (const role of required) {
    if (!roles[role]) {
      throw new RegistryError("REGISTRY_MISSING_ROLE", `missing role ${role}`, {
        field: `roles.${role}`,
      });
    }
  }

  const orchestratorDeny = roles.orchestrator.denyActions || [];
  for (const action of ["code.write", "artifact.get.raw_restricted", "approval.respond"]) {
    if (!orchestratorDeny.includes(action)) {
      throw new RegistryError("REGISTRY_INVARIANT", `orchestrator must deny '${action}'`, {
        field: "roles.orchestrator.denyActions",
        action,
      });
    }
  }
}

function validateCross(registry) {
  for (const [repoId, repo] of Object.entries(registry.repositories)) {
    for (const agentId of repo.allowedAgents) {
      const agent = Object.hasOwn(registry.agents, agentId) ? registry.agents[agentId] : null;
      if (!agent) {
        throw new RegistryError("REGISTRY_INVARIANT", `repo ${repoId} allows unknown agent ${agentId}`, {
          field: `repositories.${repoId}.allowedAgents`,
          agentId,
        });
      }
      if (repo.classification === "restricted" && !agent.allowedClassifications.includes("restricted")) {
        throw new RegistryError(
          "REGISTRY_INVARIANT",
          `repo ${repoId} (restricted) allows agent ${agentId} that lacks 'restricted'`,
          { field: `repositories.${repoId}.allowedAgents`, agentId },
        );
      }
    }
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function loadRegistries({ policiesDir, repositoriesOverlay }) {
  const agentsFile = path.join(policiesDir, "agent-capabilities.json");
  const repositoriesFile = path.join(policiesDir, "repositories.json");
  const rolesFile = path.join(policiesDir, "roles.json");

  const agentCapabilities = readJson(agentsFile, "agent-capabilities.json");
  const repositories = readJson(repositoriesFile, "repositories.json");
  const roles = readJson(rolesFile, "roles.json");

  validateAgents(agentCapabilities.agents);
  validateRepos(repositories.repositories);
  validateRoles(roles.roles);

  const effectiveRepositories = { ...repositories.repositories };
  if (repositoriesOverlay) {
    if (!path.isAbsolute(repositoriesOverlay)) {
      throw new RegistryError("REGISTRY_INVALID_OVERLAY", "repositories overlay path must be absolute");
    }
    const overlay = readJson(repositoriesOverlay, "repositories overlay");
    if (!overlay || !Number.isInteger(overlay.version) || overlay.version < 1) {
      throw new RegistryError("REGISTRY_INVALID_OVERLAY", "repositories overlay requires a positive integer version");
    }
    validateRepos(overlay.repositories);
    for (const [id, entry] of Object.entries(overlay.repositories)) {
      if (Object.hasOwn(effectiveRepositories, id)) {
        throw new RegistryError("REGISTRY_OVERLAY_COLLISION", `repositories overlay collides with base id ${id}`, {
          field: `repositories.${id}`,
        });
      }
      Object.defineProperty(effectiveRepositories, id, { value: entry, enumerable: true });
    }
  }

  const registry = {
    agents: agentCapabilities.agents,
    repositories: effectiveRepositories,
    roles: roles.roles,
    protectedBranches: agentCapabilities.protectedBranches || [],
  };

  validateCross(registry);

  return {
    getAgent(id) {
      return registry.agents[id] ?? null;
    },
    getRepo(id) {
      return registry.repositories[id] ?? null;
    },
    getRole(id) {
      return registry.roles[id] ?? null;
    },
    getProtectedBranches() {
      return [...registry.protectedBranches];
    },
    raw() {
      return clone(registry);
    },
  };
}
