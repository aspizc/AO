import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GeminiAdapter } from "../../gateway/src/adapters/gemini_adapter.js";
import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";

function fakeRegistries({ denyActions = [] } = {}) {
  return {
    getAgent: () => ({
      allowedClassifications: ["unrestricted", "internal", "restricted"],
      allowedRoles: ["coder", "restricted-coder"],
    }),
    getRepo: () => null,
    getRole: () => ({ allowActions: ["agent.delegate", "agent.spawn", "agent.ask"], denyActions }),
    getProtectedBranches: () => [],
  };
}

function setup() {
  resetAudit();
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "gemini-policy-root-")));
  const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), "gemini-policy-audit-"));
  configureAudit({ auditLog: path.join(auditDir, "audit.jsonl") });
  return { root };
}

test("policy deny prevents delegate session start and audits error", async () => {
  const { root } = setup();
  const adapter = new GeminiAdapter({
    config: { dryRun: true, repoRoots: [root] },
    registries: fakeRegistries({ denyActions: ["agent.delegate"] }),
  });

  await assert.rejects(
    () => adapter.delegate({ cwd: root, prompt: "x", traceId: "tr-deny", role: "coder" }),
    /policy denied/,
  );
  const events = await query({ traceId: "tr-deny" });

  assert.ok(!events.some((event) => event.type === "SESSION_STARTED"));
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "ERROR");
  assert.equal(events[0].where, "delegate");
  assert.equal(events[0].policy.decision, "deny");
});

test("policy allow preserves delegate lifecycle audit", async () => {
  const { root } = setup();
  const adapter = new GeminiAdapter({
    config: { dryRun: true, repoRoots: [root] },
    registries: fakeRegistries(),
  });

  await adapter.delegate({ cwd: root, prompt: "x", traceId: "tr-allow", role: "coder" });
  const events = await query({ traceId: "tr-allow" });

  assert.deepEqual(
    events.map((event) => event.type),
    ["SESSION_STARTED", "SESSION_CLOSED"],
  );
});

test("adapter error is audited and rethrown", async () => {
  const { root } = setup();
  const adapter = new GeminiAdapter({
    config: { dryRun: true, repoRoots: [root] },
    registries: fakeRegistries(),
  });

  await assert.rejects(
    () => adapter.delegate({ cwd: "/no/such/path", prompt: "x", traceId: "tr-error", role: "coder" }),
    /cwd does not exist/,
  );
  const events = await query({ traceId: "tr-error" });

  assert.equal(events.length, 1);
  assert.equal(events[0].type, "ERROR");
  assert.equal(events[0].where, "delegate");
});

test("policy deny prevents supervised spawn session start", async () => {
  const { root } = setup();
  const adapter = new GeminiAdapter({
    config: { dryRun: true, repoRoots: [root] },
    registries: fakeRegistries({ denyActions: ["agent.spawn"] }),
  });

  await assert.rejects(
    () => adapter.spawn({ cwd: root, traceId: "tr-spawn-deny", role: "coder" }),
    /policy denied/,
  );
  const events = await query({ traceId: "tr-spawn-deny" });

  assert.ok(!events.some((event) => event.type === "SESSION_STARTED"));
  assert.equal(events[0].type, "ERROR");
  assert.equal(events[0].where, "spawn");
});
