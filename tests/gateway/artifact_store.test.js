import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configureAudit, query as queryAudit, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { configureArtifactStore, get, list, put } from "../../gateway/src/core/artifact_store.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { configureSanitizer } from "../../gateway/src/core/sanitizer.js";
import * as artifactRepo from "../../gateway/src/core/repositories/artifact_repo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const RULES_PATH = path.join(REPO_ROOT, "policies", "sanitization-rules.json");

function fresh() {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-store-"));
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
  configureArtifactStore({ artifactStoreRoot: path.join(workspace, "artifacts") });
  configureSanitizer({ rulesPath: RULES_PATH });
  return workspace;
}

test("put writes artifact content under trace directory", () => {
  const workspace = fresh();
  const root = path.join(workspace, "artifacts");

  const artifact = put({
    traceId: "tr-test",
    kind: "report",
    classification: "internal",
    producedBy: "task-1",
    content: "hello",
  });

  assert.match(artifact.artifactId, /^art-/);
  assert.equal(path.dirname(artifact.path), path.join(root, "tr-test"));
  assert.equal(fs.readFileSync(artifact.path, "utf-8"), "hello");
});

test("put creates database row and audit event", async () => {
  fresh();

  const original = put({
    traceId: "tr-test",
    kind: "raw_diff",
    classification: "restricted",
    producedBy: "task-1",
    content: "diff",
  });
  const artifact = put({
    traceId: "tr-test",
    kind: "review_notes",
    classification: "internal",
    producedBy: "task-1",
    content: "sanitized diff",
    sanitizedFrom: original.artifactId,
  });

  const row = artifactRepo.getArtifactById(artifact.artifactId);
  assert.equal(row.artifact_id, artifact.artifactId);
  assert.equal(row.sanitized_from, original.artifactId);

  const events = await queryAudit({ traceId: "tr-test", type: "ARTIFACT_CREATED" });
  assert.ok(events.some((event) => event.artifactId === artifact.artifactId && event.classification === "internal"));
});

test("get reads artifact content as a Buffer", () => {
  fresh();
  const created = put({
    traceId: "tr-test",
    kind: "review",
    classification: "unrestricted",
    producedBy: "task-1",
    content: "review notes",
  });

  const loaded = get({ artifactId: created.artifactId });

  assert.equal(loaded.artifact_id, created.artifactId);
  assert.equal(Buffer.isBuffer(loaded.content), true);
  assert.equal(loaded.content.toString("utf-8"), "review notes");
});

test("list returns artifacts for a trace", () => {
  fresh();
  put({
    traceId: "tr-a",
    kind: "report",
    classification: "internal",
    producedBy: "task-1",
    content: "a",
  });
  put({
    traceId: "tr-b",
    kind: "report",
    classification: "internal",
    producedBy: "task-1",
    content: "b",
  });

  const artifacts = list({ traceId: "tr-a" });

  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].trace_id, "tr-a");
});

test("trace IDs cannot escape the artifact root", () => {
  const workspace = fresh();
  const root = path.resolve(workspace, "artifacts");

  const artifact = put({
    traceId: "../outside",
    kind: "report",
    classification: "internal",
    producedBy: "task-1",
    content: "safe",
  });
  const relative = path.relative(root, artifact.path);

  assert.equal(path.isAbsolute(relative), false);
  assert.equal(relative.startsWith(".."), false);
  assert.equal(fs.existsSync(path.join(workspace, "outside")), false);
});
