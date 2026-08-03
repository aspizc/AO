import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { evaluate } from "../../gateway/src/core/policy_engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const reg = loadRegistries({ policiesDir: path.join(REPO_ROOT, "policies") });
const raw = reg.raw();

const SOURCE_POLICY_DIRS = ["gateway/src/services", "gateway/src/tools"];
const UNKNOWN_ACTION = "v3.unknown.action";

const EXPECTED_ACTIONS = [
  "agent.ask",
  "agent.delegate",
  "agent.kill",
  "agent.spawn",
  "agent.view",
  "approval.poll",
  "approval.request",
  "approval.respond",
  "approval.wait",
  "artifact.get",
  "artifact.get.raw_restricted",
  "artifact.get.sanitized",
  "artifact.get.sanitized.raw_restricted",
  "artifact.list",
  "artifact.put",
  "artifact.put.doc",
  "artifact.put.plan",
  "artifact.put.raw_restricted",
  "artifact.put.review_notes",
  "artifact.put.security_finding",
  "artifact.put.test_report",
  "artifact.share",
  "artifact.share.cross_classification",
  "code.read",
  "code.read.raw_restricted",
  "code.write",
  "policy.check",
  "session.attach_info",
  "session.intervention_note",
  "task.assign",
  "test.run",
  UNKNOWN_ACTION,
];

const expected = {
  orchestrator: row([
    "agent.ask:allow:ok",
    "agent.delegate:allow:ok",
    "agent.kill:allow:ok",
    "agent.spawn:allow:ok",
    "agent.view:allow:ok",
    "approval.poll:allow:ok",
    "approval.request:allow:ok",
    "approval.respond:deny:role.deny_action",
    "approval.wait:allow:ok",
    "artifact.get:allow:ok",
    "artifact.get.raw_restricted:deny:role.deny_action",
    "artifact.get.sanitized:allow:ok",
    "artifact.get.sanitized.raw_restricted:allow:ok",
    "artifact.list:allow:ok",
    "artifact.put:allow:ok",
    "artifact.put.doc:allow:ok",
    "artifact.put.plan:allow:ok",
    "artifact.put.raw_restricted:allow:ok",
    "artifact.put.review_notes:allow:ok",
    "artifact.put.security_finding:allow:ok",
    "artifact.put.test_report:allow:ok",
    "artifact.share:allow:ok",
    "artifact.share.cross_classification:allow:ok",
    "code.read:allow:ok",
    "code.read.raw_restricted:deny:role.deny_action",
    "code.write:deny:role.deny_action",
    "policy.check:allow:ok",
    "session.attach_info:allow:ok",
    "session.intervention_note:allow:ok",
    "task.assign:allow:ok",
    "test.run:allow:ok",
    "v3.unknown.action:allow:ok",
  ]),
  planner: row([
    "agent.ask:allow:ok",
    "agent.delegate:allow:ok",
    "agent.kill:allow:ok",
    "agent.spawn:deny:role.deny_action",
    "agent.view:allow:ok",
    "approval.poll:allow:ok",
    "approval.request:allow:ok",
    "approval.respond:allow:ok",
    "approval.wait:allow:ok",
    "artifact.get:allow:ok",
    "artifact.get.raw_restricted:allow:ok",
    "artifact.get.sanitized:allow:ok",
    "artifact.get.sanitized.raw_restricted:allow:ok",
    "artifact.list:allow:ok",
    "artifact.put:allow:ok",
    "artifact.put.doc:allow:ok",
    "artifact.put.plan:allow:ok",
    "artifact.put.raw_restricted:allow:ok",
    "artifact.put.review_notes:allow:ok",
    "artifact.put.security_finding:allow:ok",
    "artifact.put.test_report:allow:ok",
    "artifact.share:allow:ok",
    "artifact.share.cross_classification:allow:ok",
    "code.read:allow:ok",
    "code.read.raw_restricted:allow:ok",
    "code.write:deny:role.deny_action",
    "policy.check:allow:ok",
    "session.attach_info:allow:ok",
    "session.intervention_note:allow:ok",
    "task.assign:deny:role.task_assign_only_orchestrator",
    "test.run:allow:ok",
    "v3.unknown.action:allow:ok",
  ]),
  coder: row([
    "agent.ask:allow:ok",
    "agent.delegate:allow:ok",
    "agent.kill:allow:ok",
    "agent.spawn:allow:ok",
    "agent.view:allow:ok",
    "approval.poll:allow:ok",
    "approval.request:allow:ok",
    "approval.respond:allow:ok",
    "approval.wait:allow:ok",
    "artifact.get:allow:ok",
    "artifact.get.raw_restricted:deny:role.deny_action",
    "artifact.get.sanitized:allow:ok",
    "artifact.get.sanitized.raw_restricted:allow:ok",
    "artifact.list:allow:ok",
    "artifact.put:allow:ok",
    "artifact.put.doc:allow:ok",
    "artifact.put.plan:allow:ok",
    "artifact.put.raw_restricted:allow:ok",
    "artifact.put.review_notes:allow:ok",
    "artifact.put.security_finding:allow:ok",
    "artifact.put.test_report:allow:ok",
    "artifact.share:allow:ok",
    "artifact.share.cross_classification:allow:ok",
    "code.read:allow:ok",
    "code.read.raw_restricted:deny:role.deny_action",
    "code.write:allow:ok",
    "policy.check:allow:ok",
    "session.attach_info:allow:ok",
    "session.intervention_note:allow:ok",
    "task.assign:deny:role.task_assign_only_orchestrator",
    "test.run:allow:ok",
    "v3.unknown.action:allow:ok",
  ]),
  "restricted-coder": row([
    "agent.ask:allow:ok",
    "agent.delegate:allow:ok",
    "agent.kill:allow:ok",
    "agent.spawn:allow:ok",
    "agent.view:allow:ok",
    "approval.poll:allow:ok",
    "approval.request:allow:ok",
    "approval.respond:allow:ok",
    "approval.wait:allow:ok",
    "artifact.get:allow:ok",
    "artifact.get.raw_restricted:allow:ok",
    "artifact.get.sanitized:allow:ok",
    "artifact.get.sanitized.raw_restricted:allow:ok",
    "artifact.list:allow:ok",
    "artifact.put:allow:ok",
    "artifact.put.doc:allow:ok",
    "artifact.put.plan:allow:ok",
    "artifact.put.raw_restricted:allow:ok",
    "artifact.put.review_notes:allow:ok",
    "artifact.put.security_finding:allow:ok",
    "artifact.put.test_report:allow:ok",
    "artifact.share:allow:ok",
    "artifact.share.cross_classification:deny:role.deny_action",
    "code.read:allow:ok",
    "code.read.raw_restricted:allow:ok",
    "code.write:allow:ok",
    "policy.check:allow:ok",
    "session.attach_info:allow:ok",
    "session.intervention_note:allow:ok",
    "task.assign:deny:role.task_assign_only_orchestrator",
    "test.run:allow:ok",
    "v3.unknown.action:allow:ok",
  ]),
  reviewer: row([
    "agent.ask:allow:ok",
    "agent.delegate:allow:ok",
    "agent.kill:allow:ok",
    "agent.spawn:allow:ok",
    "agent.view:allow:ok",
    "approval.poll:allow:ok",
    "approval.request:allow:ok",
    "approval.respond:allow:ok",
    "approval.wait:allow:ok",
    "artifact.get:allow:ok",
    "artifact.get.raw_restricted:deny:role.deny_action",
    "artifact.get.sanitized:allow:ok",
    "artifact.get.sanitized.raw_restricted:allow:ok",
    "artifact.list:allow:ok",
    "artifact.put:allow:ok",
    "artifact.put.doc:allow:ok",
    "artifact.put.plan:allow:ok",
    "artifact.put.raw_restricted:allow:ok",
    "artifact.put.review_notes:allow:ok",
    "artifact.put.security_finding:allow:ok",
    "artifact.put.test_report:allow:ok",
    "artifact.share:allow:ok",
    "artifact.share.cross_classification:allow:ok",
    "code.read:allow:ok",
    "code.read.raw_restricted:deny:role.deny_action",
    "code.write:deny:role.deny_action",
    "policy.check:allow:ok",
    "session.attach_info:allow:ok",
    "session.intervention_note:allow:ok",
    "task.assign:deny:role.task_assign_only_orchestrator",
    "test.run:allow:ok",
    "v3.unknown.action:allow:ok",
  ]),
  tester: row([
    "agent.ask:allow:ok",
    "agent.delegate:allow:ok",
    "agent.kill:allow:ok",
    "agent.spawn:allow:ok",
    "agent.view:allow:ok",
    "approval.poll:allow:ok",
    "approval.request:allow:ok",
    "approval.respond:allow:ok",
    "approval.wait:allow:ok",
    "artifact.get:allow:ok",
    "artifact.get.raw_restricted:deny:role.deny_action",
    "artifact.get.sanitized:allow:ok",
    "artifact.get.sanitized.raw_restricted:allow:ok",
    "artifact.list:allow:ok",
    "artifact.put:allow:ok",
    "artifact.put.doc:allow:ok",
    "artifact.put.plan:allow:ok",
    "artifact.put.raw_restricted:allow:ok",
    "artifact.put.review_notes:allow:ok",
    "artifact.put.security_finding:allow:ok",
    "artifact.put.test_report:allow:ok",
    "artifact.share:allow:ok",
    "artifact.share.cross_classification:allow:ok",
    "code.read:allow:ok",
    "code.read.raw_restricted:allow:ok",
    "code.write:deny:role.deny_action",
    "policy.check:allow:ok",
    "session.attach_info:allow:ok",
    "session.intervention_note:allow:ok",
    "task.assign:deny:role.task_assign_only_orchestrator",
    "test.run:allow:ok",
    "v3.unknown.action:allow:ok",
  ]),
  documenter: row([
    "agent.ask:allow:ok",
    "agent.delegate:allow:ok",
    "agent.kill:allow:ok",
    "agent.spawn:allow:ok",
    "agent.view:allow:ok",
    "approval.poll:allow:ok",
    "approval.request:allow:ok",
    "approval.respond:allow:ok",
    "approval.wait:allow:ok",
    "artifact.get:allow:ok",
    "artifact.get.raw_restricted:deny:role.deny_action",
    "artifact.get.sanitized:allow:ok",
    "artifact.get.sanitized.raw_restricted:allow:ok",
    "artifact.list:allow:ok",
    "artifact.put:allow:ok",
    "artifact.put.doc:allow:ok",
    "artifact.put.plan:allow:ok",
    "artifact.put.raw_restricted:allow:ok",
    "artifact.put.review_notes:allow:ok",
    "artifact.put.security_finding:allow:ok",
    "artifact.put.test_report:allow:ok",
    "artifact.share:allow:ok",
    "artifact.share.cross_classification:allow:ok",
    "code.read:allow:ok",
    "code.read.raw_restricted:allow:ok",
    "code.write:deny:role.deny_action",
    "policy.check:allow:ok",
    "session.attach_info:allow:ok",
    "session.intervention_note:allow:ok",
    "task.assign:deny:role.task_assign_only_orchestrator",
    "test.run:allow:ok",
    "v3.unknown.action:allow:ok",
  ]),
  security_reviewer: row([
    "agent.ask:allow:ok",
    "agent.delegate:allow:ok",
    "agent.kill:allow:ok",
    "agent.spawn:allow:ok",
    "agent.view:allow:ok",
    "approval.poll:allow:ok",
    "approval.request:allow:ok",
    "approval.respond:allow:ok",
    "approval.wait:allow:ok",
    "artifact.get:allow:ok",
    "artifact.get.raw_restricted:deny:role.deny_action",
    "artifact.get.sanitized:allow:ok",
    "artifact.get.sanitized.raw_restricted:allow:ok",
    "artifact.list:allow:ok",
    "artifact.put:allow:ok",
    "artifact.put.doc:allow:ok",
    "artifact.put.plan:allow:ok",
    "artifact.put.raw_restricted:allow:ok",
    "artifact.put.review_notes:allow:ok",
    "artifact.put.security_finding:allow:ok",
    "artifact.put.test_report:allow:ok",
    "artifact.share:allow:ok",
    "artifact.share.cross_classification:allow:ok",
    "code.read:allow:ok",
    "code.read.raw_restricted:allow:ok",
    "code.write:deny:role.deny_action",
    "policy.check:allow:ok",
    "session.attach_info:allow:ok",
    "session.intervention_note:allow:ok",
    "task.assign:deny:role.task_assign_only_orchestrator",
    "test.run:allow:ok",
    "v3.unknown.action:allow:ok",
  ]),
};

function row(entries) {
  return Object.fromEntries(
    entries.map((entry) => {
      const [action, decision, ruleId] = entry.split(":");
      return [action, { decision, ruleId }];
    }),
  );
}

function sourceFiles(dir) {
  const absDir = path.join(REPO_ROOT, dir);
  return fs
    .readdirSync(absDir, { withFileTypes: true })
    .flatMap((entry) => {
      const absPath = path.join(absDir, entry.name);
      const relPath = path.relative(REPO_ROOT, absPath);
      if (entry.isDirectory()) return sourceFiles(relPath);
      if (!entry.isFile() || !entry.name.endsWith(".js")) return [];
      return [absPath];
    });
}

function actionsFromEvaluateCallSites() {
  const actions = new Set();
  for (const dir of SOURCE_POLICY_DIRS) {
    for (const file of sourceFiles(dir)) {
      const source = fs.readFileSync(file, "utf8");
      if (!source.includes("evaluate(")) continue;
      for (const match of source.matchAll(/action:\s*["']([^"']+)["']/g)) {
        actions.add(match[1]);
      }
      for (const match of source.matchAll(/\|\|\s*["']([^"']+)["']/g)) {
        actions.add(match[1]);
      }
    }
  }
  return actions;
}

function roleRegistryActions() {
  return Object.values(raw.roles).flatMap((role) => [
    ...(role.allowActions || []),
    ...(role.denyActions || []),
  ]);
}

function actionUniverse() {
  return [...new Set([...roleRegistryActions(), ...actionsFromEvaluateCallSites(), UNKNOWN_ACTION])].sort();
}

function selectAgentForRole(role) {
  const compatible = Object.entries(raw.agents).find(([, agent]) => agent.allowedRoles.includes(role));
  assert.ok(compatible, `role ${role} has no compatible agent in policies/agent-capabilities.json`);
  return compatible[0];
}

function contextFor({ role, action }) {
  const context = {
    agent: selectAgentForRole(role),
    role,
    repo: null,
    action,
  };
  if (action === "task.assign") {
    context.targetAgent = "gemini-cli";
    context.targetRole = "coder";
  }
  return context;
}

test("role action matrix covers the real policy registries and evaluate call sites", () => {
  assert.deepEqual(Object.keys(expected), Object.keys(raw.roles));
  assert.deepEqual(EXPECTED_ACTIONS, actionUniverse());

  for (const [role, expectedRow] of Object.entries(expected)) {
    assert.deepEqual(Object.keys(expectedRow), EXPECTED_ACTIONS, `${role} expected row must cover every action`);
  }
});

test("role action matrix freezes current gateway decisions", () => {
  for (const role of Object.keys(raw.roles)) {
    for (const action of EXPECTED_ACTIONS) {
      const result = evaluate(contextFor({ role, action }), reg);
      assert.equal(result.decision, expected[role][action].decision, `${role} ${action} decision`);
      assert.equal(result.ruleId, expected[role][action].ruleId, `${role} ${action} ruleId`);
    }
  }
});

test("unknown actions currently default to allow for every real role", () => {
  for (const role of Object.keys(raw.roles)) {
    const result = evaluate(contextFor({ role, action: UNKNOWN_ACTION }), reg);
    assert.equal(result.decision, "allow", `${role} unknown action decision`);
    assert.equal(result.ruleId, "ok", `${role} unknown action ruleId`);
  }
});
