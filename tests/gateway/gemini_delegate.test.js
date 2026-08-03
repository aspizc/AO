import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GeminiAdapter } from "../../gateway/src/adapters/gemini_adapter.js";
import { CwdViolation } from "../../gateway/src/adapters/base_adapter.js";
import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";

function setup() {
  resetAudit();
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "gemini-root-")));
  const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), "gemini-audit-"));
  configureAudit({ auditLog: path.join(auditDir, "audit.jsonl") });
  return { root };
}

function fakeRegistries() {
  return {
    getAgent: () => ({
      allowedClassifications: ["unrestricted", "internal", "restricted"],
      allowedRoles: ["coder"],
    }),
    getRepo: () => null,
    getRole: () => ({ allowActions: ["agent.delegate"], denyActions: [] }),
    getProtectedBranches: () => [],
  };
}

test("dry run delegate returns deterministic mock output", async () => {
  const { root } = setup();
  const adapter = new GeminiAdapter({
    config: { dryRun: true, repoRoots: [root] },
    registries: fakeRegistries(),
  });

  const result = await adapter.delegate({
    cwd: root,
    prompt: "write tests",
    traceId: "tr-gemini-dry",
    role: "coder",
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.dryRun, true);
  assert.match(result.stdout, /^\[dry-run\]/);
  assert.match(result.stdout, /prompt=write tests/);
  assert.match(result.stdout, new RegExp(`cwd=${root}`));
});

test("delegate audits session lifecycle", async () => {
  const { root } = setup();
  const adapter = new GeminiAdapter({
    config: { dryRun: true, repoRoots: [root] },
    registries: fakeRegistries(),
  });

  await adapter.delegate({
    cwd: root,
    prompt: "audit me",
    traceId: "tr-gemini-audit",
    role: "coder",
  });
  const events = await query({ traceId: "tr-gemini-audit" });

  assert.equal(events.length, 2);
  assert.deepEqual(
    events.map((event) => event.type),
    ["SESSION_STARTED", "SESSION_CLOSED"],
  );
  assert.equal(events[0].agent, "gemini-cli");
  assert.equal(events[0].role, "coder");
  assert.equal(events[0].mode, "headless");
  assert.equal(events[1].exitCode, 0);
});

test("cwd guard runs even in dry run", async () => {
  const { root } = setup();
  const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "gemini-outside-")));
  const adapter = new GeminiAdapter({
    config: { dryRun: true, repoRoots: [root] },
    registries: fakeRegistries(),
  });

  await assert.rejects(
    () => adapter.delegate({ cwd: outside, prompt: "x", traceId: "tr-gemini-deny", role: "coder" }),
    CwdViolation,
  );
});
