#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRegistries } from "../src/core/registry.js";
import { explain } from "../src/core/policy_engine.js";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..", "..");
const args = process.argv.slice(2);

function get(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

const ctx = {
  agent: get("--agent"),
  role: get("--role"),
  repo: get("--repo") || null,
  action: get("--action"),
  artifactKind: get("--artifact-kind") || null,
  artifactClassification: get("--artifact-classification") || null,
  targetAgent: get("--target-agent") || null,
  targetRole: get("--target-role") || null,
  targetBranch: get("--target-branch") || null,
};

const policiesDir = process.env.AGENTS_POLICIES_DIR
  ? path.resolve(process.env.AGENTS_POLICIES_DIR)
  : path.join(REPO_ROOT, "policies");
const registries = loadRegistries({
  policiesDir,
  repositoriesOverlay: process.env.AGENTS_REPOSITORIES_OVERLAY,
});
const decision = explain(ctx, registries);
process.stdout.write(JSON.stringify(decision));
