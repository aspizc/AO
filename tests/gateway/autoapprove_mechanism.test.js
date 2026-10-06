import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "../../gateway/src/config.js";
import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { evaluate } from "../../gateway/src/core/policy_engine.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { request, waitForDecision } from "../../gateway/src/services/approval_service.js";
import { buildApprovalTools } from "../../gateway/src/tools/approval.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const registries = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });

function fresh() {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "autoapprove-"));
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
}

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

test("autoapprove config defaults off and parses comma separated scopes", () => {
  assert.deepEqual(loadConfig({}).autoApproveScopes, []);
  assert.deepEqual(loadConfig({ AGENTS_AUTOAPPROVE: " plan.apply,code.apply ,, " }).autoApproveScopes, [
    "plan.apply",
    "code.apply",
  ]);
});

test("default off keeps approval pending", async () => {
  fresh();

  const result = request({
    traceId: "tr-auto-default-off",
    action: "plan.apply",
    requestedBy: "orchestrator",
    context: {
      taskId: "ts-plan-apply",
      repo: "agents-orchestrator",
      classification: "internal",
    },
    config: { autoApproveScopes: [] },
  });
  const events = await query({ traceId: "tr-auto-default-off" });

  assert.equal(result.status, "pending");
  assert.equal(result.auto, undefined);
  assert.ok(events.some((event) => event.type === "APPROVAL_REQUIRED"));
  assert.ok(!events.some((event) => event.type === "APPROVAL_AUTO_GRANTED"));
});

test("scope in allowlist auto grants with audit", async () => {
  fresh();

  const result = request({
    traceId: "tr-auto-grant",
    action: "plan.apply",
    requestedBy: "orchestrator",
    context: {
      taskId: "ts-plan-grant",
      repo: "agents-orchestrator",
      classification: "internal",
    },
    config: { autoApproveScopes: ["plan.apply"] },
  });
  const events = await query({ traceId: "tr-auto-grant", type: "APPROVAL_AUTO_GRANTED" });

  assert.equal(result.status, "granted");
  assert.equal(result.auto, true);
  assert.equal(result.decidedBy, "operator-autonomous-mode");
  assert.equal(events.length, 1);
  assert.equal(events[0].approvalId, result.approvalId);
  assert.equal(events[0].action, "plan.apply");
  assert.equal(events[0].scope, "plan.apply");
  assert.equal(events[0].decidedBy, "operator-autonomous-mode");
});

test("never auto actions stay pending even if listed", () => {
  fresh();

  for (const action of ["git.push.protected", "dependency.change", "code.write.protected_branch"]) {
    const result = request({
      traceId: `tr-never-${action}`,
      action,
      requestedBy: "orchestrator",
      context: { repo: "agents-orchestrator" },
      config: { autoApproveScopes: [action] },
    });

    assert.equal(result.status, "pending");
  }
});

test("restricted context is never auto granted", async () => {
  fresh();

  const result = request({
    traceId: "tr-restricted-auto",
    action: "plan.apply",
    requestedBy: "orchestrator",
    context: { repo: "cvision", classification: "restricted" },
    config: { autoApproveScopes: ["plan.apply"] },
  });
  const events = await query({ traceId: "tr-restricted-auto", type: "APPROVAL_AUTO_GRANTED" });

  assert.equal(result.status, "pending");
  assert.equal(events.length, 0);
});

test("repository autoapproval requires task, repository, and known classification", async () => {
  fresh();

  for (const [index, context] of [
    null,
    { repo: "sample-apps" },
    { taskId: "ts-owned", repo: "sample-apps" },
    {
      taskId: "ts-owned",
      repo: "sample-apps",
      classification: "unknown",
    },
  ].entries()) {
    const traceId = `tr-incomplete-authority-${index}`;
    const result = request({
      traceId,
      action: "code.apply",
      requestedBy: "orchestrator",
      context,
      config: { autoApproveScopes: ["code.apply"] },
    });
    const events = await query({
      traceId,
      type: "APPROVAL_AUTO_GRANTED",
    });

    assert.equal(result.status, "pending");
    assert.equal(events.length, 0);
  }
});

test("auto grant resolves wait immediately", async () => {
  fresh();

  const result = request({
    traceId: "tr-auto-wait",
    action: "code.apply",
    requestedBy: "orchestrator",
    context: {
      taskId: "ts-code-apply",
      repo: "sample-apps",
      classification: "unrestricted",
    },
    config: { autoApproveScopes: ["code.apply"] },
  });
  const waited = await waitForDecision({ approvalId: result.approvalId, timeoutMs: 1000, serverMaxMs: 1000 });

  assert.equal(waited.status, "granted");
  assert.equal(waited.decidedBy, "operator-autonomous-mode");
});

test("approval request tool receives autoapprove config", async () => {
  fresh();
  const tools = Object.fromEntries(
    buildApprovalTools({ config: { autoApproveScopes: ["plan.apply"] } }).map((tool) => [tool.name, tool]),
  );

  const result = parseToolResult(
    await tools["approval.request"].handler({
      traceId: "tr-tool-auto",
      action: "plan.apply",
      requestedBy: "orchestrator",
      context: {
        taskId: "ts-plan-tool",
        repo: "agents-orchestrator",
        classification: "internal",
      },
    }),
  );

  assert.equal(result.status, "granted");
  assert.equal(result.auto, true);
});

test("orchestrator cannot respond to approvals remains unchanged", () => {
  const result = evaluate(
    {
      agent: "claude-code",
      role: "orchestrator",
      repo: null,
      action: "approval.respond",
    },
    registries,
  );

  assert.equal(result.decision, "deny");
  assert.equal(result.ruleId, "role.deny_action");
});
