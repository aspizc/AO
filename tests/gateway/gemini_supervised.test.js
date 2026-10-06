import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GeminiAdapter } from "../../gateway/src/adapters/gemini_adapter.js";
import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";

function setup() {
  resetAudit();
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "gemini-supervised-root-")));
  const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), "gemini-supervised-audit-"));
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
    getRole: () => ({ allowActions: ["agent.spawn", "agent.ask"], denyActions: [] }),
    getProtectedBranches: () => [],
  };
}

function adapter(root, overrides = {}) {
  return new GeminiAdapter({
    config: { dryRun: true, repoRoots: [root], tmuxPrefix: "ag-", ...overrides },
    registries: fakeRegistries(),
  });
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

test("registry-only Gemini denies dry-run spawn", async () => {
  const { root } = setup();

  await assert.rejects(
    () => adapter(root).spawn({ cwd: root, traceId: "tr1", role: "coder" }),
    assertRegistryOnly,
  );
});

test("registry-only spawn audits no supervised session start", async () => {
  const { root } = setup();
  await assert.rejects(
    () => adapter(root).spawn({
      cwd: root,
      traceId: "tr-audit",
      role: "coder",
    }),
    assertRegistryOnly,
  );
  const events = await query({ traceId: "tr-audit" });

  assert.equal(events.length, 1);
  assert.equal(events[0].type, "ERROR");
  assert.equal(events[0].where, "spawn");
});

test("dry run ask returns response and audits bounded input", async () => {
  const { root } = setup();
  const result = await adapter(root).ask({
    tmuxTarget: "ag-x",
    prompt: "a".repeat(250),
    traceId: "tr-ask",
    role: "coder",
  });
  const events = await query({ traceId: "tr-ask" });

  assert.equal(result.dryRun, true);
  assert.match(result.snapshot, /^\[dry-run ask\]/);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "SESSION_INPUT");
  assert.equal(events[0].prompt.length, 200);
});

test("view returns snapshot in dry run", async () => {
  const { root } = setup();
  const result = await adapter(root).view({ tmuxTarget: "ag-x" });

  assert.equal(result.dryRun, true);
  assert.equal(typeof result.snapshot, "string");
});

test("kill marks supervised session closed in audit", async () => {
  const { root } = setup();
  const result = await adapter(root).kill({ tmuxTarget: "ag-x", traceId: "tr-kill", role: "coder" });
  const events = await query({ traceId: "tr-kill" });

  assert.deepEqual(result, { closed: true, dryRun: true });
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "SESSION_CLOSED");
  assert.equal(events[0].mode, "supervised");
  assert.equal(events[0].tmuxTarget, "ag-x");
});

test("registry-only spawn denial precedes cwd guard", async () => {
  const { root } = setup();
  const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "gemini-supervised-outside-")));

  await assert.rejects(
    () => adapter(root).spawn({ cwd: outside, traceId: "tr-deny", role: "coder" }),
    assertRegistryOnly,
  );
});
