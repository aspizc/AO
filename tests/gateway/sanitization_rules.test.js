import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const RULES_PATH = path.join(REPO_ROOT, "policies", "sanitization-rules.json");

function loadRules() {
  return JSON.parse(fs.readFileSync(RULES_PATH, "utf-8"));
}

test("sanitization rules file loads", () => {
  const rules = loadRules();

  assert.equal(rules.version, 1);
  assert.ok(Array.isArray(rules.rules));
  assert.ok(rules.rules.length >= 4);
});

test("sanitization rules have required fields", () => {
  const rules = loadRules();

  for (const rule of rules.rules) {
    assert.equal(typeof rule.id, "string");
    assert.ok(rule.id.length > 0);
    assert.equal(typeof rule.pattern, "string");
    assert.equal(typeof rule.replacement, "string");
    assert.ok(Array.isArray(rule.appliesTo));
    assert.ok(rule.appliesTo.length > 0);
    assert.equal(typeof rule.severity, "string");
  }
});

test("sanitization rule patterns compile", () => {
  const rules = loadRules();

  for (const rule of rules.rules) {
    assert.doesNotThrow(() => new RegExp(rule.pattern), rule.id);
  }
});

test("sanitization rules cover required initial categories", () => {
  const ids = new Set(loadRules().rules.map((rule) => rule.id));

  assert.ok(ids.has("secret.token"));
  assert.ok(ids.has("absolute.path"));
  assert.ok(ids.has("uuid"));
  assert.ok(ids.has("internal.file"));
});

test("sanitization rules file contains no real-looking secrets", () => {
  const text = fs.readFileSync(RULES_PATH, "utf-8");

  assert.equal(/sk-[A-Za-z0-9]{20,}/.test(text), false);
  assert.equal(/ghp_[A-Za-z0-9]{30,}/.test(text), false);
});
