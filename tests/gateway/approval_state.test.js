import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { initState, _resetForTests as resetState } from "../../gateway/src/core/state.js";
import {
  ApprovalStateError,
  createPendingApproval,
  decideApproval,
  getApproval,
  listPendingApprovals,
} from "../../gateway/src/core/repositories/approval_repo.js";

function fresh() {
  resetState();
  initState({ stateDb: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "approval-state-")), "state.db") });
}

function pending(overrides = {}) {
  return {
    approvalId: overrides.approvalId || "approval-1",
    traceId: overrides.traceId || "trace-1",
    requestedBy: "orchestrator",
    action: "git.push",
    createdAt: "2026-01-01T00:00:00.000Z",
    payload: "{}",
    ...overrides,
  };
}

test("create pending approval", () => {
  fresh();

  createPendingApproval(pending());
  const row = getApproval("approval-1");

  assert.equal(row.approval_id, "approval-1");
  assert.equal(row.status, "pending");
  assert.equal(row.decided_at, null);
  assert.equal(row.decided_by, null);
});

test("grant pending approval", () => {
  fresh();
  createPendingApproval(pending());

  const decided = decideApproval("approval-1", "granted", "operator", "approved");
  const row = getApproval("approval-1");

  assert.equal(decided.status, "granted");
  assert.equal(decided.decided_by, "operator");
  assert.equal(row.status, "granted");
  assert.equal(row.decided_by, "operator");
  assert.equal(row.decided_at, decided.decided_at);
  assert.equal(row.payload, "approved");
});

test("deny pending approval", () => {
  fresh();
  createPendingApproval(pending());

  const decided = decideApproval("approval-1", "denied", "operator", "not allowed");

  assert.equal(decided.status, "denied");
  assert.equal(getApproval("approval-1").status, "denied");
});

test("expire pending approval", () => {
  fresh();
  createPendingApproval(pending());

  const decided = decideApproval("approval-1", "expired", null, null);

  assert.equal(decided.status, "expired");
  assert.equal(getApproval("approval-1").decided_by, null);
});

test("cannot decide twice", () => {
  fresh();
  createPendingApproval(pending());
  decideApproval("approval-1", "granted", "operator", "approved");

  assert.throws(() => decideApproval("approval-1", "denied", "operator", "changed"), (err) => {
    assert.ok(err instanceof ApprovalStateError);
    assert.equal(err.code, "ALREADY_DECIDED");
    return true;
  });
});

test("unknown approval throws not found", () => {
  fresh();

  assert.throws(() => decideApproval("missing", "granted", "operator", null), (err) => {
    assert.ok(err instanceof ApprovalStateError);
    assert.equal(err.code, "NOT_FOUND");
    return true;
  });
});

test("invalid target status throws invalid status", () => {
  fresh();
  createPendingApproval(pending());

  assert.throws(() => decideApproval("approval-1", "pending", "operator", null), (err) => {
    assert.ok(err instanceof ApprovalStateError);
    assert.equal(err.code, "INVALID_STATUS");
    return true;
  });
});

test("list pending approvals can filter by trace", () => {
  fresh();
  createPendingApproval(pending({ approvalId: "approval-1", traceId: "trace-a" }));
  createPendingApproval(pending({ approvalId: "approval-2", traceId: "trace-b" }));
  decideApproval("approval-2", "denied", "operator", null);

  assert.deepEqual(
    listPendingApprovals().map((row) => row.approval_id),
    ["approval-1"],
  );
  assert.deepEqual(
    listPendingApprovals("trace-a").map((row) => row.approval_id),
    ["approval-1"],
  );
  assert.deepEqual(listPendingApprovals("trace-b"), []);
});
