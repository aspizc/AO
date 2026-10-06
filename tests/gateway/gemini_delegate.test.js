import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GeminiAdapter } from "../../gateway/src/adapters/gemini_adapter.js";
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

function assertRegistryOnly(error) {
  assert.equal(error.code, "POLICY_DENIED");
  assert.equal(error.message, "request denied by policy");
  assert.deepEqual(error.decision.selectionRejection, {
    code: "EFFECTIVE_SELECTION_PROVIDER_UNAVAILABLE",
    field: "agent",
    provider: "gemini-cli",
  });
  return true;
}

test("registry-only Gemini denies dry-run delegate", async () => {
  const { root } = setup();
  const adapter = new GeminiAdapter({
    config: { dryRun: true, repoRoots: [root] },
    registries: fakeRegistries(),
  });

  await assert.rejects(
    () => adapter.delegate({
      cwd: root,
      prompt: "write tests",
      traceId: "tr-gemini-dry",
      role: "coder",
    }),
    assertRegistryOnly,
  );
});

test("registry-only delegate audits one safe error and no session lifecycle", async () => {
  const { root } = setup();
  const adapter = new GeminiAdapter({
    config: { dryRun: true, repoRoots: [root] },
    registries: fakeRegistries(),
  });

  await assert.rejects(
    () => adapter.delegate({
      cwd: root,
      prompt: "audit me",
      traceId: "tr-gemini-audit",
      role: "coder",
    }),
    assertRegistryOnly,
  );
  const events = await query({ traceId: "tr-gemini-audit" });

  assert.equal(events.length, 1);
  assert.equal(events[0].type, "ERROR");
  assert.equal(events[0].agent, "gemini-cli");
  assert.equal(events[0].role, "coder");
  assert.deepEqual(events[0].policy.selectionRejection, {
    code: "EFFECTIVE_SELECTION_PROVIDER_UNAVAILABLE",
    field: "agent",
    provider: "gemini-cli",
  });
});

test("registry-only denial precedes the cwd guard", async () => {
  const { root } = setup();
  const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "gemini-outside-")));
  const adapter = new GeminiAdapter({
    config: { dryRun: true, repoRoots: [root] },
    registries: fakeRegistries(),
  });

  await assert.rejects(
    () => adapter.delegate({ cwd: outside, prompt: "x", traceId: "tr-gemini-deny", role: "coder" }),
    assertRegistryOnly,
  );
});
