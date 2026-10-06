#!/usr/bin/env node

import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { isDeepStrictEqual } from "node:util";

const NODE_LOCK_PATH = "gateway/package-lock.json";
const SBOM_PATH = "ci/production-sbom.json";
const ADVISORIES_PATH = "ci/production-advisories.json";
const REQUIRED_FILES = [
  "requirements.lock",
  "scripts/bootstrap.sh",
  "scripts/bootstrap_preflight.mjs",
  "scripts/requirements_lock.sh",
  "cli/pyproject.toml",
  "orchestrator-langgraph/pyproject.toml",
  "ci/requirements-build.in",
  SBOM_PATH,
  ADVISORIES_PATH,
  "gateway/package.json",
  NODE_LOCK_PATH,
  "gateway/.npmrc",
  "examples/hero/profile.json",
  "examples/hero/repository.json",
  "examples/hero/plan.json",
  "examples/hero/app/index.html",
];
const OPTIONAL_OUTPUTS = [
  [".venv", "directory"],
  [".venv/bin", "directory"],
  [".venv/bin/activate", "file"],
  ["gateway/node_modules", "directory"],
];
const LOCK_ROOT_FIELDS = [
  "name",
  "version",
  "license",
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
  "peerDependenciesMeta",
  "engines",
  "bin",
  "os",
  "cpu",
];
const PYTHON_LOCK_INPUTS = [
  "cli/pyproject.toml",
  "orchestrator-langgraph/pyproject.toml",
  "ci/requirements-build.in",
  "scripts/requirements_lock.sh",
];
const PYTHON_LOCK_CONTRACT =
  "uv=0.11.21;python=3.11;all-extras;universal;generate-hashes;" +
  "exclude-newer=2026-10-06T00:00:00Z";
const CANONICAL_SHA256 = /^sha256:[a-f0-9]{64}$/;

class PreflightError extends Error {}

function reject(message) {
  throw new PreflightError(message);
}

function lstatOrMissing(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    reject("could not inspect the checkout boundary");
  }
}

function checkPath(root, relative, expectedType, required) {
  let current = root;
  const components = relative.split("/");
  for (const [index, component] of components.entries()) {
    current = join(current, component);
    const metadata = lstatOrMissing(current);
    if (metadata === null) {
      if (required) {
        reject(`required checkout path is missing: ${relative}`);
      }
      return;
    }
    if (metadata.isSymbolicLink()) {
      reject(`symbolic links are forbidden in bootstrap control paths: ${relative}`);
    }
    if (index < components.length - 1 && !metadata.isDirectory()) {
      reject(`bootstrap control path has a non-directory ancestor: ${relative}`);
    }
    if (index === components.length - 1) {
      const matches =
        expectedType === "file" ? metadata.isFile() : metadata.isDirectory();
      if (!matches) {
        reject(`bootstrap control path has the wrong type: ${relative}`);
      }
    }
  }
}

function readBytes(root, relative) {
  try {
    return readFileSync(join(root, relative));
  } catch {
    reject(`bootstrap input could not be read: ${relative}`);
  }
}

function parseJsonBytes(bytes, relative) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    reject(`invalid JSON bootstrap input: ${relative}`);
  }
}

function parseJson(root, relative) {
  return parseJsonBytes(readBytes(root, relative), relative);
}

function canonicalJson(value) {
  if (value === null || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      reject("review snapshot contains a non-canonical number");
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  reject("review snapshot contains an unsupported JSON value");
}

function parseCanonicalJsonBytes(bytes, relative) {
  const document = parseJsonBytes(bytes, relative);
  const canonical = Buffer.from(`${canonicalJson(document)}\n`, "utf8");
  if (!bytes.equals(canonical)) {
    reject(`review snapshot is not canonical JSON: ${relative}`);
  }
  return document;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function requireCanonicalDigest(value, relative) {
  if (typeof value !== "string" || !CANONICAL_SHA256.test(value)) {
    reject(`review snapshot has an invalid lock digest: ${relative}`);
  }
  return value;
}

function readSbomLockDigest(root) {
  const bytes = readBytes(root, SBOM_PATH);
  const snapshot = parseCanonicalJsonBytes(bytes, SBOM_PATH);
  if (
    !isRecord(snapshot) ||
    snapshot.schemaVersion !== "production-sbom/v1" ||
    !Array.isArray(snapshot.sourceLocks)
  ) {
    reject("production SBOM snapshot has an invalid contract");
  }
  const matches = snapshot.sourceLocks.filter(
    (entry) => isRecord(entry) && entry.path === NODE_LOCK_PATH,
  );
  if (matches.length !== 1) {
    reject("production SBOM has an invalid Node lock path");
  }
  return requireCanonicalDigest(matches[0].sha256, SBOM_PATH);
}

function readAdvisoryLockDigest(root) {
  const bytes = readBytes(root, ADVISORIES_PATH);
  const snapshot = parseCanonicalJsonBytes(bytes, ADVISORIES_PATH);
  if (
    !isRecord(snapshot) ||
    snapshot.schemaVersion !== "production-advisories/v1" ||
    !isRecord(snapshot.lockDigests)
  ) {
    reject("production advisory snapshot has an invalid contract");
  }
  if (!hasOwn(snapshot.lockDigests, NODE_LOCK_PATH)) {
    reject("production advisory snapshot has an invalid Node lock path");
  }
  return requireCanonicalDigest(
    snapshot.lockDigests[NODE_LOCK_PATH],
    ADVISORIES_PATH,
  );
}

function readReviewedNodeLock(root) {
  const sbomDigest = readSbomLockDigest(root);
  const advisoryDigest = readAdvisoryLockDigest(root);
  if (sbomDigest !== advisoryDigest) {
    reject("review snapshots disagree about the Node lock digest");
  }

  const lockBytes = readBytes(root, NODE_LOCK_PATH);
  const actualDigest = `sha256:${createHash("sha256")
    .update(lockBytes)
    .digest("hex")}`;
  if (actualDigest !== sbomDigest) {
    reject("package-lock does not match the reviewed snapshots");
  }
  return parseJsonBytes(lockBytes, NODE_LOCK_PATH);
}

function parseVersion(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (match === null) {
    reject("Node.js returned an invalid runtime version");
  }
  return match.slice(1).map(Number);
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }
  return 0;
}

function supportsEngine(version, engineRange) {
  const clauses = engineRange.split(" || ");
  if (clauses.length === 0) {
    return false;
  }
  return clauses.some((clause) => {
    const match = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(clause);
    if (match === null) {
      reject("unsupported Node.js engine contract");
    }
    const lower = match.slice(1).map(Number);
    const upper = [lower[0] + 1, 0, 0];
    return (
      compareVersions(version, lower) >= 0 &&
      compareVersions(version, upper) < 0
    );
  });
}

function checkNodeContract(root, reportedVersion) {
  const manifest = parseJson(root, "gateway/package.json");
  const lock = readReviewedNodeLock(root);
  if (!isRecord(manifest) || !isRecord(lock)) {
    reject("Node.js manifest and lock must be JSON objects");
  }
  if (
    lock.lockfileVersion !== 3 ||
    lock.requires !== true ||
    !isRecord(lock.packages) ||
    !isRecord(lock.packages[""])
  ) {
    reject("unsupported package-lock root contract");
  }
  const lockRoot = lock.packages[""];
  for (const field of LOCK_ROOT_FIELDS) {
    if (!isDeepStrictEqual(manifest[field], lockRoot[field])) {
      reject(`package manifest and lock root differ at: ${field}`);
    }
  }
  if (
    manifest.name !== lock.name ||
    manifest.version !== lock.version ||
    !isRecord(manifest.engines) ||
    typeof manifest.engines.node !== "string"
  ) {
    reject("package manifest and lock metadata differ");
  }
  if (!supportsEngine(parseVersion(reportedVersion), manifest.engines.node)) {
    reject("the active Node.js runtime is unsupported");
  }
}

function checkPythonLockInputs(root) {
  const digest = createHash("sha256");
  for (const relative of PYTHON_LOCK_INPUTS) {
    digest.update(relative, "utf8");
    digest.update(Buffer.from([0]));
    digest.update(readBytes(root, relative));
    digest.update(Buffer.from([0]));
  }
  digest.update(PYTHON_LOCK_CONTRACT, "utf8");

  const lock = readBytes(root, "requirements.lock").toString("utf8");
  const matches = [...lock.matchAll(/^# inputs-sha256: ([a-f0-9]{64})$/gm)];
  if (matches.length !== 1 || matches[0][1] !== digest.digest("hex")) {
    reject("requirements.lock inputs are stale");
  }
}

function main() {
  if (process.argv.length !== 4) {
    reject("invalid bootstrap preflight invocation");
  }
  const root = process.argv[2];
  const reportedVersion = process.argv[3];
  if (!isAbsolute(root) || realpathSync.native(root) !== root) {
    reject("checkout root must be an absolute physical path");
  }
  const rootMetadata = lstatSync(root);
  if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink()) {
    reject("checkout root must be a physical directory");
  }
  for (const relative of REQUIRED_FILES) {
    checkPath(root, relative, "file", true);
  }
  for (const [relative, expectedType] of OPTIONAL_OUTPUTS) {
    checkPath(root, relative, expectedType, false);
  }
  checkNodeContract(root, reportedVersion);
  checkPythonLockInputs(root);
}

try {
  main();
} catch (error) {
  const message =
    error instanceof PreflightError
      ? error.message
      : "bootstrap preflight failed closed";
  process.stderr.write(`bootstrap: ${message}\n`);
  process.exitCode = 1;
}
