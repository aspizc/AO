import fs from "node:fs";
import path from "node:path";

export class CwdViolation extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "CwdViolation";
    this.details = details;
  }
}

function realpathOrViolation(target, message) {
  try {
    return fs.realpathSync(target);
  } catch (err) {
    throw new CwdViolation(message, { path: target, error: String(err?.message || err) });
  }
}

export function assertSafeCwd(cwd, allowedRoots) {
  if (!cwd) throw new CwdViolation("missing cwd");
  if (!Array.isArray(allowedRoots) || allowedRoots.length === 0) {
    throw new CwdViolation("AGENTS_REPO_ROOTS not configured");
  }

  const resolved = realpathOrViolation(cwd, `cwd does not exist or is unreachable: ${cwd}`);
  const allowed = allowedRoots.map((root) =>
    realpathOrViolation(root, `allowed root does not exist or is unreachable: ${root}`),
  );

  const ok = allowed.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
  if (!ok) {
    throw new CwdViolation(`cwd ${resolved} is outside allowed roots`, {
      cwd: resolved,
      allowedRoots: allowed,
    });
  }

  return resolved;
}

export class BaseAdapter {
  constructor({ id, config, registries }) {
    this.id = id;
    this.config = config;
    this.registries = registries;
  }

  async delegate(_args) {
    // Execution args carry the canonical effectiveSelection resolved by policy.
    throw new Error(`adapter ${this.id} must implement delegate`);
  }

  async spawn(_args) {
    // Execution args carry the canonical effectiveSelection resolved by policy.
    throw new Error(`adapter ${this.id} must implement spawn`);
  }

  async ask(_args) {
    throw new Error(`adapter ${this.id} must implement ask`);
  }

  async view(_args) {
    throw new Error(`adapter ${this.id} must implement view`);
  }

  async kill(_args) {
    throw new Error(`adapter ${this.id} must implement kill`);
  }
}
