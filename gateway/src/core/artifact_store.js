import fs from "node:fs";
import path from "node:path";
import { append as auditAppend } from "./audit.js";
import { newArtifactId } from "./ids.js";
import { isRawKind } from "./policy_types.js";
import * as artifactRepo from "./repositories/artifact_repo.js";
import { sanitize as defaultSanitize } from "./sanitizer.js";

let root = null;
let sanitizeImpl = defaultSanitize;

export function configureArtifactStore({ artifactStoreRoot }) {
  if (!artifactStoreRoot) throw new TypeError("artifactStoreRoot required");
  root = path.resolve(artifactStoreRoot);
  fs.mkdirSync(root, { recursive: true });
}

function assertConfigured() {
  if (!root) throw new Error("artifact store not configured");
}

function safePathSegment(value) {
  const safe = String(value)
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^\.+/, "_")
    .slice(0, 120);

  return safe || "_";
}

function artifactPath(traceId, artifactId, kind) {
  const dir = path.join(root, safePathSegment(traceId));
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${safePathSegment(kind)}-${artifactId}.bin`);
}

/**
 * Stores artifact content as bytes on disk. `content` may be a string or Buffer;
 * `get` returns content as a Buffer to preserve binary artifacts.
 */
export function put({ traceId, kind, classification, producedBy, content, sanitizedFrom = null }) {
  assertConfigured();
  const raw = createArtifact({
    traceId,
    kind,
    classification,
    producedBy,
    content,
    sanitizedFrom,
  });

  if (sanitizedFrom === null && classification === "restricted" && isRawKind(kind)) {
    try {
      const { sanitized, appliedRuleIds } = sanitizeImpl(content.toString("utf-8"), { kind });
      const sanitizedArtifact = createArtifact({
        traceId,
        kind: `${kind}_sanitized`,
        classification: "internal",
        producedBy,
        content: Buffer.from(sanitized, "utf-8"),
        sanitizedFrom: raw.artifactId,
      });
      auditAppend({
        type: "SANITIZATION_APPLIED",
        traceId,
        sourceArtifactId: raw.artifactId,
        sanitizedArtifactId: sanitizedArtifact.artifactId,
        kind,
        appliedRuleIds,
      });
    } catch (err) {
      auditAppend({
        type: "SANITIZATION_FAILED",
        traceId,
        sourceArtifactId: raw.artifactId,
        kind,
        error: String(err?.message || err),
      });
    }
  }

  return raw;
}

function createArtifact({ traceId, kind, classification, producedBy, content, sanitizedFrom = null }) {
  const artifactId = newArtifactId();
  const filePath = artifactPath(traceId, artifactId, kind);

  fs.writeFileSync(filePath, content);
  const row = {
    artifactId,
    traceId,
    kind,
    classification,
    producedBy,
    path: filePath,
    sanitizedFrom,
    createdAt: new Date().toISOString(),
  };

  artifactRepo.createArtifact(row);
  auditAppend({
    type: "ARTIFACT_CREATED",
    traceId,
    artifactId,
    kind,
    classification,
    producedBy,
    sanitizedFrom,
  });

  return row;
}

export function get({ artifactId }) {
  const row = artifactRepo.getArtifactById(artifactId);
  if (!row) return null;
  return { ...row, content: fs.readFileSync(row.path) };
}

export function list({ traceId }) {
  return artifactRepo.listArtifactsByTrace(traceId);
}

export function _setSanitizeForTests(fn) {
  sanitizeImpl = fn;
}

export function _resetSanitizeForTests() {
  sanitizeImpl = defaultSanitize;
}
