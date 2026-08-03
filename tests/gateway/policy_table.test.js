import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { evaluate } from "../../gateway/src/core/policy_engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const reg = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });

const TABLE = [
  ["claude code on cvision", { agent: "claude-code", role: "coder", repo: "cvision", action: "code.read" }, "deny"],
  ["codex code on cvlib", { agent: "codex", role: "coder", repo: "cvlib", action: "code.read" }, "allow"],
  [
    "gemini restricted-coder on cvision",
    { agent: "gemini-cli", role: "restricted-coder", repo: "cvision", action: "code.write" },
    "allow",
  ],
  [
    "orchestrator code.write",
    { agent: "claude-code", role: "orchestrator", repo: "sample-apps", action: "code.write" },
    "deny",
  ],
  [
    "orchestrator artifact.get raw restricted",
    {
      agent: "claude-code",
      role: "orchestrator",
      action: "artifact.get",
      artifactKind: "raw_diff",
      artifactClassification: "restricted",
    },
    "deny",
  ],
  [
    "orchestrator delegates to gemini restricted-coder",
    {
      agent: "claude-code",
      role: "orchestrator",
      action: "task.assign",
      targetAgent: "gemini-cli",
      targetRole: "restricted-coder",
    },
    "allow",
  ],
  [
    "orchestrator delegates to claude restricted-coder",
    {
      agent: "claude-code",
      role: "orchestrator",
      action: "task.assign",
      targetAgent: "claude-code",
      targetRole: "restricted-coder",
    },
    "deny",
  ],
  [
    "coder cannot task.assign",
    {
      agent: "claude-code",
      role: "coder",
      action: "task.assign",
      targetAgent: "gemini-cli",
      targetRole: "coder",
    },
    "deny",
  ],
  [
    "push to main requires approval",
    { agent: "gemini-cli", role: "coder", repo: "cvision", action: "git.push", targetBranch: "main" },
    "require_approval",
  ],
  [
    "push to feature branch is allowed",
    { agent: "gemini-cli", role: "coder", repo: "cvision", action: "git.push", targetBranch: "feature/x" },
    "allow",
  ],
  [
    "dep change requires approval",
    { agent: "claude-code", role: "coder", repo: "sample-apps", action: "dependency.change" },
    "require_approval",
  ],
  ["test run is allowed", { agent: "claude-code", role: "tester", repo: "sample-apps", action: "test.run" }, "allow"],
  [
    "reviewer reads sanitized review_notes",
    {
      agent: "claude-code",
      role: "reviewer",
      repo: "sample-apps",
      action: "artifact.get",
      artifactKind: "review_notes",
      artifactClassification: "restricted",
    },
    "allow",
  ],
  [
    "reviewer asks raw_diff restricted",
    {
      agent: "claude-code",
      role: "reviewer",
      repo: "sample-apps",
      action: "artifact.get",
      artifactKind: "raw_diff",
      artifactClassification: "restricted",
    },
    "allow_with_sanitization",
  ],
  ["unknown agent denied", { agent: "no-such", role: "coder", repo: "sample-apps", action: "code.read" }, "deny"],
  ["unknown repo denied", { agent: "claude-code", role: "coder", repo: "no-such", action: "code.read" }, "deny"],
  [
    "claude internal allowed",
    { agent: "claude-code", role: "coder", repo: "developer-tools", action: "code.read" },
    "allow",
  ],
  ["codex restricted allowed", { agent: "codex", role: "coder", repo: "cvlib", action: "code.read" }, "allow"],
  ["orchestrator policy.check allowed", { agent: "claude-code", role: "orchestrator", action: "policy.check" }, "allow"],
  [
    "agent.spawn coder unrestricted allowed",
    {
      agent: "claude-code",
      role: "orchestrator",
      repo: "sample-apps",
      action: "agent.spawn",
      targetAgent: "claude-code",
      targetRole: "coder",
    },
    "allow",
  ],
];

test("policy_table_has_at_least_20_cases", () => {
  assert.ok(TABLE.length >= 20);
});

for (const [name, ctx, expected] of TABLE) {
  test(`policy_table: ${name}`, () => {
    const result = evaluate(ctx, reg);
    assert.equal(result.decision, expected, `${name}: got ${JSON.stringify(result)}`);
  });
}
