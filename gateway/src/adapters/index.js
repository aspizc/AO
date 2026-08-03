export class UnknownAgentError extends Error {
  constructor(agentId) {
    super(`unknown agent ${agentId}`);
    this.name = "UnknownAgentError";
    this.agentId = agentId;
  }
}

export function createAdapterRegistry({ config, registries }) {
  const adapters = new Map();

  return {
    config,
    registries,
    register(agentId, adapter) {
      if (adapters.has(agentId)) {
        throw new Error(`adapter already registered for ${agentId}`);
      }
      adapters.set(agentId, adapter);
    },
    get(agentId) {
      const adapter = adapters.get(agentId);
      if (!adapter) throw new UnknownAgentError(agentId);
      return adapter;
    },
    has(agentId) {
      return adapters.has(agentId);
    },
    list() {
      return [...adapters.keys()];
    },
  };
}
