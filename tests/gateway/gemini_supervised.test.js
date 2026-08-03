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

test("dry run spawn returns session info", async () => {
  const { root } = setup();
  const result = await adapter(root).spawn({ cwd: root, traceId: "tr1", role: "coder" });

  assert.equal(result.dryRun, true);
  assert.equal(result.sessionId, result.tmuxTarget);
  assert.equal(result.tmuxTarget, "ag-tr1-gemini-coder");
  assert.equal(result.attachCommand, "tmux attach -t ag-tr1-gemini-coder");
});

test("spawn audits supervised session start", async () => {
  const { root } = setup();
  const result = await adapter(root).spawn({ cwd: root, traceId: "tr-audit", role: "coder" });
  const events = await query({ traceId: "tr-audit" });

  assert.equal(events.length, 1);
  assert.equal(events[0].type, "SESSION_STARTED");
  assert.equal(events[0].mode, "supervised");
  assert.equal(events[0].tmuxTarget, result.tmuxTarget);
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

test("spawn cwd guard runs in dry run", async () => {
  const { root } = setup();
  const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "gemini-supervised-outside-")));

  await assert.rejects(
    () => adapter(root).spawn({ cwd: outside, traceId: "tr-deny", role: "coder" }),
    CwdViolation,
  );
});
