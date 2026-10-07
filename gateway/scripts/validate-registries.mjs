#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRegistries, RegistryError } from "../src/core/registry.js";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..", "..");
const policiesDir = process.env.AGENTS_POLICIES_DIR
  ? path.resolve(process.env.AGENTS_POLICIES_DIR)
  : path.join(REPO_ROOT, "policies");

try {
  const registries = loadRegistries({
    policiesDir,
    repositoriesOverlay: process.env.AGENTS_REPOSITORIES_OVERLAY,
  });
  const raw = registries.raw();
  process.stdout.write(
    JSON.stringify({
      ok: true,
      policiesDir,
      counts: {
        agents: Object.keys(raw.agents).length,
        repositories: Object.keys(raw.repositories).length,
        roles: Object.keys(raw.roles).length,
      },
      ...(process.argv.includes("--repositories") ? { repositories: raw.repositories } : {}),
    }),
  );
  process.exit(0);
} catch (err) {
  process.stdout.write(
    JSON.stringify({
      ok: false,
      code: err instanceof RegistryError ? err.code : "UNKNOWN",
      message: err.message,
      details: err.details || null,
    }),
  );
  process.exit(1);
}
