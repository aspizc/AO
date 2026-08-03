import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FILE = path.resolve(__dirname, "..", "..", "policies", "repositories.json");
const reg = JSON.parse(fs.readFileSync(FILE, "utf-8"));

test("cvision_is_restricted", () => {
  assert.equal(reg.repositories.cvision.classification, "restricted");
});

test("cvlib_is_restricted", () => {
  assert.equal(reg.repositories.cvlib.classification, "restricted");
});

test("sample_apps_is_unrestricted", () => {
  assert.equal(reg.repositories["sample-apps"].classification, "unrestricted");
});

test("restricted_repos_allow_only_gemini_and_codex", () => {
  for (const id of ["cvision", "cvlib"]) {
    const allowed = reg.repositories[id].allowedAgents;
    assert.deepEqual([...allowed].sort(), ["codex", "gemini-cli"]);
  }
});

test("each_repo_has_exactly_one_classification", () => {
  const valid = new Set(["unrestricted", "internal", "restricted"]);
  for (const [id, repo] of Object.entries(reg.repositories)) {
    assert.ok(valid.has(repo.classification), `${id} has invalid classification`);
  }
});
