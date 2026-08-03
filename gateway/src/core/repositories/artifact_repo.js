import { getDb } from "../state.js";

export function createArtifact(row) {
  getDb()
    .prepare(
      `INSERT INTO artifacts
       (artifact_id, trace_id, kind, classification, produced_by, path, sanitized_from, created_at)
       VALUES (@artifactId, @traceId, @kind, @classification, @producedBy, @path, @sanitizedFrom, @createdAt)`,
    )
    .run(row);
  return row;
}

export function getArtifactById(artifactId) {
  return getDb().prepare("SELECT * FROM artifacts WHERE artifact_id = ?").get(artifactId) || null;
}

export function listArtifactsByTrace(traceId) {
  return getDb().prepare("SELECT * FROM artifacts WHERE trace_id = ? ORDER BY created_at, rowid").all(traceId);
}

export function findSanitizedFor(artifactId) {
  return (
    getDb()
      .prepare("SELECT * FROM artifacts WHERE sanitized_from = ? ORDER BY created_at, rowid LIMIT 1")
      .get(artifactId) || null
  );
}
