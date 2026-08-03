import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import { request } from "../../gateway/src/services/approval_service.js";

function fresh() {
  resetState();
  resetAudit();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "code-autoapprove-"));
  initState({ stateDb: path.join(workspace, "state.db") });
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
}

test("code_apply_pending_when_scope_absent", async () => {
  fresh();

  const result = request({
    traceId: "tr-code-apply-default",
    action: "code.apply",
    requestedBy: "orchestrator",
    context: { repo: "sample-apps", agent: "codex", role: "coder" },
    config: { autoApproveScopes: [] },
  });
  const autoGrants = await query({ traceId: "tr-code-apply-default", type: "APPROVAL_AUTO_GRANTED" });

  assert.equal(result.status, "pending");
  assert.equal(autoGrants.length, 0);
});

test("code_apply_auto_granted_when_scope_present", async () => {
  fresh();

  const result = request({
    traceId: "tr-code-apply-auto",
    action: "code.apply",
    requestedBy: "orchestrator",
    context: { repo: "sample-apps", agent: "codex", role: "coder" },
    config: { autoApproveScopes: ["code.apply"] },
  });
  const autoGrants = await query({ traceId: "tr-code-apply-auto", type: "APPROVAL_AUTO_GRANTED" });

  assert.equal(result.status, "granted");
  assert.equal(result.auto, true);
  assert.equal(result.decidedBy, "operator-autonomous-mode");
  assert.equal(autoGrants.length, 1);
  assert.equal(autoGrants[0].action, "code.apply");
  assert.equal(autoGrants[0].scope, "code.apply");
});

test("code_apply_never_grants_protected_push_even_with_scope", async () => {
  fresh();

  const result = request({
    traceId: "tr-code-apply-protected",
    action: "git.push.protected",
    requestedBy: "orchestrator",
    context: { repo: "sample-apps", branch: "main" },
    config: { autoApproveScopes: ["code.apply", "git.push.protected"] },
  });
  const autoGrants = await query({ traceId: "tr-code-apply-protected", type: "APPROVAL_AUTO_GRANTED" });

  assert.equal(result.status, "pending");
  assert.equal(autoGrants.length, 0);
});

test("restricted_repo_code_apply_never_auto_granted", async () => {
  fresh();

  const result = request({
    traceId: "tr-code-apply-restricted",
    action: "code.apply",
    requestedBy: "orchestrator",
    context: { repo: "cvision", agent: "codex", role: "coder", classification: "restricted" },
    config: { autoApproveScopes: ["code.apply"] },
  });
  const autoGrants = await query({ traceId: "tr-code-apply-restricted", type: "APPROVAL_AUTO_GRANTED" });

  assert.equal(result.status, "pending");
  assert.equal(autoGrants.length, 0);
});
