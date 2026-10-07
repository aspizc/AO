import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { TextDecoder } from "node:util";
import { loadRegistries } from "../src/core/registry.js";
import { evaluate } from "../src/core/policy_engine.js";
import { resolveRegisteredRepositoryCwd } from "../src/core/request_context.js";
import {
  resolveEffectiveAgentSelectionForConsumer,
  safeAuditSelectionProjection,
  validateRuntimeAgentCapabilities,
} from "../src/core/orchestrator_profile.js";

const MAX_BYTES = 1048576;
function reject(code, field, exit = 2) {
  throw Object.assign(new Error(code), { safeCode: code, safeField: field, exit });
}
function directory(value, field) {
  if (typeof value !== "string" || !path.isAbsolute(value)) reject("PROFILE_INVALID", field);
  try {
    const canonical = fs.realpathSync(value);
    if (canonical !== value || !fs.statSync(canonical).isDirectory()) throw new Error();
    return canonical;
  } catch {
    reject("PROFILE_PATH_DENIED", field);
  }
}
function contains(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}
function executable(name) {
  const candidates = path.isAbsolute(name) ? [name] : (process.env.PATH || "").split(path.delimiter).map((dir) => path.join(dir, name));
  return candidates.some((candidate) => {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return fs.statSync(candidate).isFile();
    } catch { return false; }
  });
}

async function main() {
  let selections = [];
  try {
    let bytes = 0;
    const chunks = [];
    for await (const chunk of process.stdin) {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) reject("PROFILE_INVALID", "profile");
      chunks.push(chunk);
    }
    let input;
    try { input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
    catch { reject("PROFILE_INVALID", "profile"); }
    const keys = ["gatewayRoot", "policiesDir", "allowedRoots", "repositoryId", "projectRoot", "taskCwds", "writePaths", "roles"];
    if (!input || typeof input !== "object" || Object.keys(input).length !== keys.length || keys.some((k) => !Object.hasOwn(input, k))) reject("PROFILE_INVALID", "profile");
    const gatewayRoot = directory(input.gatewayRoot, "gatewayRoot");
    const policiesDir = directory(input.policiesDir, "policiesDir");
    if (!Array.isArray(input.allowedRoots) || !input.allowedRoots.length || input.allowedRoots.length > 256) reject("PROFILE_INVALID", "allowedRoots");
    const repoRoots = input.allowedRoots.map((r) => directory(r, "allowedRoots"));
    const projectRoot = directory(input.projectRoot, "projectRoot");
    if (!repoRoots.some((r) => contains(r, projectRoot))) reject("PROFILE_PATH_DENIED", "projectRoot");
    if (!Array.isArray(input.taskCwds) || input.taskCwds.length > 256 || !Array.isArray(input.writePaths) || input.writePaths.length > 65536) reject("PROFILE_INVALID", "tasks");
    const config = { repoRoot: path.dirname(gatewayRoot), repoRoots };
    let registries;
    try {
      registries = loadRegistries({ policiesDir });
      validateRuntimeAgentCapabilities(registries);
      for (const cwd of [projectRoot, ...input.taskCwds]) {
        const canonical = directory(cwd, "cwd");
        if (!repoRoots.some((r) => contains(r, canonical))) reject("PROFILE_PATH_DENIED", "cwd");
        resolveRegisteredRepositoryCwd({ config, registries, repositoryId: input.repositoryId, cwd: canonical });
      }
    } catch (error) {
      if (error.safeCode) throw error;
      reject("PROFILE_POLICY_DENIED", "repositoryId");
    }
    const roles = input.roles;
    if (!roles || Object.keys(roles).length !== 3 || ["orchestrator", "coder", "reviewer"].some((r) => !Object.hasOwn(roles, r))) reject("PROFILE_INVALID", "roles");
    const actor = roles.orchestrator;
    const requireAllowed = (context, field) => {
      if (evaluate(context, registries).decision !== "allow") reject("PROFILE_POLICY_DENIED", field);
    };
    for (const action of ["orchestration.create", "agent.ask", "agent.view", "agent.kill", "orchestration.view", "artifact.list"]) {
      requireAllowed({ ...actor, action }, "roles");
    }
    const resolved = [];
    for (const [name, action] of [["coder", "code.write"], ["reviewer", "artifact.put.review_notes"]]) {
      const role = roles[name];
      let selection;
      try { selection = resolveEffectiveAgentSelectionForConsumer(role, "spawn"); }
      catch { reject("PROFILE_POLICY_DENIED", "roles"); }
      requireAllowed({ ...actor, action: "task.assign", targetAgent: role.agent, targetRole: role.role }, "roles");
      requireAllowed({ ...actor, action: "agent.spawn", targetAgent: role.agent, targetRole: role.role, effectiveSelection: selection }, "roles");
      requireAllowed({ agent: role.agent, role: role.role, repo: input.repositoryId, action, effectiveSelection: selection }, "roles");
      if (name === "coder") {
        for (const writePath of input.writePaths) {
          if (typeof writePath !== "string" || !contains(projectRoot, writePath)) reject("PROFILE_PATH_DENIED", "writePaths");
          requireAllowed({ agent: role.agent, role: role.role, repo: input.repositoryId, action, path: path.relative(projectRoot, writePath), effectiveSelection: selection }, "writePaths");
        }
      }
      resolved.push(safeAuditSelectionProjection(selection));
    }
    selections = resolved;
    const [major, minor] = process.versions.node.split(".").map(Number);
    if (process.platform === "win32") reject("PROFILE_RUNTIME_UNSUPPORTED", "platform", 3);
    if (!(major === 22 && minor >= 13 || major === 24)) reject("PROFILE_RUNTIME_UNAVAILABLE", "node", 3);
    try {
      const require = createRequire(path.join(gatewayRoot, "package.json"));
      require.resolve("@modelcontextprotocol/sdk/client/index.js");
    } catch { reject("PROFILE_RUNTIME_UNAVAILABLE", "mcp", 3); }
    // Detect executable presence only: no --version, login or provider startup.
    const binaries = {
      codex: process.env.AGENTS_CODEX_BIN || "codex",
      "claude-code": process.env.AGENTS_CLAUDE_BIN || "claude",
      "gemini-cli": "gemini",
      pi: process.env.AGENTS_PI_BIN || "pi",
      opencode: process.env.AGENTS_OPENCODE_BIN || "opencode",
      antigravity: process.env.AGENTS_ANTIGRAVITY_BIN || process.env.AGENTS_AGY_BIN || "agy",
    };
    if (selections.some((s) => !executable(binaries[s.provider]))) reject("PROFILE_RUNTIME_UNAVAILABLE", "provider", 3);
    process.stdout.write(JSON.stringify({ status: "ready", selections, error: null }));
  } catch (error) {
    const code = error.safeCode || "PROFILE_POLICY_DENIED";
    process.stdout.write(JSON.stringify({ status: error.exit === 3 ? "unavailable" : "invalid", selections, error: { code, field: error.safeField || "roles" } }));
    process.exitCode = error.exit || 2;
  }
}
await main();
