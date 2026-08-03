import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SANITIZER_URL = pathToFileURL(path.join(REPO_ROOT, "gateway", "src", "core", "sanitizer.js"));
const REAL_RULES_PATH = path.join(REPO_ROOT, "policies", "sanitization-rules.json");

let importCounter = 0;

async function freshSanitizer() {
  importCounter += 1;
  return import(`${SANITIZER_URL.href}?sanitizer-composition=${importCounter}`);
}

function writeRulesFile(rules) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sanitizer-composition-"));
  const rulesPath = path.join(dir, "rules.json");
  fs.writeFileSync(rulesPath, JSON.stringify({ version: 1, rules }, null, 2));
  return rulesPath;
}

async function configuredSanitizer(rules) {
  const sanitizer = await freshSanitizer();
  sanitizer.configureSanitizer({ rulesPath: writeRulesFile(rules) });
  return sanitizer;
}

test("first rule wins when two rules match the same original span", async () => {
  const { sanitize } = await configuredSanitizer([
    {
      id: "overlap.first",
      pattern: "secret=alpha",
      replacement: "<FIRST>",
      appliesTo: ["raw_diff"],
    },
    {
      id: "overlap.second",
      pattern: "secret=alpha",
      replacement: "<SECOND>",
      appliesTo: ["raw_diff"],
    },
  ]);

  const result = sanitize("before secret=alpha after", { kind: "raw_diff" });

  assert.equal(result.sanitized, "before <FIRST> after");
  assert.deepEqual(result.appliedRuleIds, ["overlap.first"]);
});

test("replacement from one rule can cascade into a later rule match", async () => {
  const { sanitize } = await configuredSanitizer([
    {
      id: "cascade.seed",
      pattern: "token=alpha",
      replacement: "created-secret",
      appliesTo: ["raw_diff"],
    },
    {
      id: "cascade.followup",
      pattern: "created-secret",
      replacement: "<CASCADE-REDACTED>",
      appliesTo: ["raw_diff"],
    },
  ]);

  const result = sanitize("before token=alpha after", { kind: "raw_diff" });

  assert.equal(result.sanitized, "before <CASCADE-REDACTED> after");
  assert.deepEqual(result.appliedRuleIds, ["cascade.seed", "cascade.followup"]);
});

test("secret, path, and UUID matches record all rule ids in array order", async () => {
  const { sanitize } = await configuredSanitizer([
    {
      id: "fixture.secret",
      pattern: "token=[A-Za-z0-9]{12,}",
      replacement: "token=<SECRET>",
      appliesTo: ["raw_diff"],
    },
    {
      id: "fixture.path",
      pattern: "/home/[A-Za-z0-9_-]+/[A-Za-z0-9_./-]+",
      replacement: "<PATH>",
      appliesTo: ["raw_diff"],
    },
    {
      id: "fixture.uuid",
      pattern: "\\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\b",
      replacement: "<UUID>",
      appliesTo: ["raw_diff"],
    },
  ]);

  const result = sanitize(
    "token=abcdefghijklmnop /home/dev/project/private/key.pem 123e4567-e89b-12d3-a456-426614174000",
    { kind: "raw_diff" },
  );

  assert.equal(result.sanitized, "token=<SECRET> <PATH> <UUID>");
  assert.deepEqual(result.appliedRuleIds, ["fixture.secret", "fixture.path", "fixture.uuid"]);
});

test("matching rule is skipped when appliesTo excludes the requested kind", async () => {
  const { sanitize } = await configuredSanitizer([
    {
      id: "summary.only",
      pattern: "token=[A-Za-z0-9]{12,}",
      replacement: "token=<SECRET>",
      appliesTo: ["summary"],
    },
  ]);

  const result = sanitize("token=abcdefghijklmnop", { kind: "raw_diff" });

  assert.equal(result.sanitized, "token=abcdefghijklmnop");
  assert.deepEqual(result.appliedRuleIds, []);
});

test("replacement values use current String.replace backreference semantics", async () => {
  const { sanitize } = await configuredSanitizer([
    {
      id: "replacement.backreference",
      pattern: "(token)=([A-Za-z0-9]{12,})",
      replacement: "literal-$&-$1",
      appliesTo: ["raw_diff"],
    },
  ]);

  const result = sanitize("token=abcdefghijklmnop", { kind: "raw_diff" });

  assert.equal(result.sanitized, "literal-token=abcdefghijklmnop-token");
  assert.deepEqual(result.appliedRuleIds, ["replacement.backreference"]);
});

test("empty content and content with no matches stay unchanged", async () => {
  const { sanitize } = await configuredSanitizer([
    {
      id: "fixture.secret",
      pattern: "token=[A-Za-z0-9]{12,}",
      replacement: "token=<SECRET>",
      appliesTo: ["raw_diff"],
    },
  ]);

  assert.deepEqual(sanitize("", { kind: "raw_diff" }), { sanitized: "", appliedRuleIds: [] });
  assert.deepEqual(sanitize("nothing sensitive here", { kind: "raw_diff" }), {
    sanitized: "nothing sensitive here",
    appliedRuleIds: [],
  });
});

test("sanitize fails closed when the sanitizer has not been configured", async () => {
  const { sanitize } = await freshSanitizer();

  assert.throws(() => sanitize("token=abcdefghijklmnop", { kind: "raw_diff" }), /sanitizer not configured/);
});

test("real sanitization rules remove the E2E SECRET fixture token", async () => {
  const { configureSanitizer, sanitize } = await freshSanitizer();
  configureSanitizer({ rulesPath: REAL_RULES_PATH });

  const secret = "abcdefghijklmnop";
  const result = sanitize(`diff --git a/HELLO.md b/HELLO.md\n+token=${secret}`, { kind: "raw_diff" });

  assert.ok(!result.sanitized.includes(secret));
  assert.deepEqual(result.appliedRuleIds, ["secret.token"]);
});
