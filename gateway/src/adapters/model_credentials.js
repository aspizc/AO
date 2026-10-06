/**
 * Provider credentials for the model ids the registry hands to a CLI adapter.
 *
 * A model id is `<provider>/<model>` — exactly the string the CLI receives, so the
 * provider prefix is the only thing that decides which credential it needs. Local
 * providers need a reachable endpoint instead of a key, which is why they carry a
 * base-URL env var rather than a credential.
 */
const API_KEY_ENV_BY_PROVIDER = Object.freeze({
  moonshotai: "MOONSHOT_API_KEY",
});

const LOCAL_PROVIDER_BASE_URL_ENV = Object.freeze({
  ollama: "AGENTS_OLLAMA_BASE_URL",
});

const DEFAULT_LOCAL_BASE_URL = Object.freeze({
  ollama: "http://127.0.0.1:11434/v1",
});

export function modelProvider(model) {
  if (typeof model !== "string") return null;
  const slash = model.indexOf("/");
  return slash === -1 ? null : model.slice(0, slash);
}

export function requiredApiKeyEnv(model) {
  const provider = modelProvider(model);
  return provider ? API_KEY_ENV_BY_PROVIDER[provider] || null : null;
}

export function localBaseUrl(model, env = process.env) {
  const provider = modelProvider(model);
  if (!provider || !LOCAL_PROVIDER_BASE_URL_ENV[provider]) return null;
  return (
    env[LOCAL_PROVIDER_BASE_URL_ENV[provider]] || DEFAULT_LOCAL_BASE_URL[provider]
  );
}

/**
 * Refuse before launching when the model's provider needs an API key that is not
 * set. Launching without it fails deep inside the CLI with a provider-shaped error
 * that reads like a bug in the harness, so this turns it into one named refusal.
 */
export function assertModelCredentials(model, env = process.env) {
  const keyEnv = requiredApiKeyEnv(model);
  if (!keyEnv) return null;
  if (env[keyEnv]) return keyEnv;
  const err = new Error(
    `model ${model} needs ${keyEnv} and it is not set in this environment`,
  );
  err.code = "MODEL_CREDENTIAL_MISSING";
  err.model = model;
  err.requiredEnv = keyEnv;
  throw err;
}
