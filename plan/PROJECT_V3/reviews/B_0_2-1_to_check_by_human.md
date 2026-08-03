# Human Check - Task PROJECT_V3/B/0/2 Phase 1

## Question for the owner

Choose the ADR-008 branch for role/action semantics:

- **Branch A: documented deny-list.** Keep current behavior. `denyActions` is the role enforcement mechanism; `allowActions` remains documentation plus special sanitization affordances. Tradeoff: zero compatibility risk now, but every new tool/action must deliberately update deny-lists where needed because unknown actions default to allow.
- **Branch B: enforced allowlist.** Change `evaluateRole` so actions outside `allowActions` deny, using the same prefix semantics as deny matching. Tradeoff: clearer least-privilege semantics, but many cells below change from allow to deny and `roles.json` must be updated so existing gateway flows keep working.

## Matrix Scope

The matrix uses the real registries from `policies/` and covers:

- Union of all `allowActions` and `denyActions` in `policies/roles.json`.
- Actions emitted by `evaluate()` call sites under `gateway/src/services/` and `gateway/src/tools/`.
- Synthetic `v3.unknown.action` to document current default behavior.

Cells are `decision (ruleId)`. No action in this phase-1 universe currently returns `require_approval`.

## Role Matrix: Agent and Approval Actions

| role | agent.ask | agent.delegate | agent.kill | agent.spawn | agent.view | approval.poll | approval.request | approval.respond | approval.wait |
|---|---|---|---|---|---|---|---|---|---|
| orchestrator | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | deny (role.deny_action) | allow (ok) |
| planner | allow (ok) | allow (ok) | allow (ok) | deny (role.deny_action) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) |
| coder | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) |
| restricted-coder | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) |
| reviewer | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) |
| tester | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) |
| documenter | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) |
| security_reviewer | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) |

## Role Matrix: Artifact Actions

| role | artifact.get | artifact.get.raw_restricted | artifact.get.sanitized | artifact.get.sanitized.raw_restricted | artifact.list | artifact.put | artifact.put.doc | artifact.put.plan | artifact.put.raw_restricted | artifact.put.review_notes | artifact.put.security_finding | artifact.put.test_report | artifact.share | artifact.share.cross_classification |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| orchestrator | allow (ok) | deny (role.deny_action) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) |
| planner | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) |
| coder | allow (ok) | deny (role.deny_action) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) |
| restricted-coder | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | deny (role.deny_action) |
| reviewer | allow (ok) | deny (role.deny_action) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) |
| tester | allow (ok) | deny (role.deny_action) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) |
| documenter | allow (ok) | deny (role.deny_action) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) |
| security_reviewer | allow (ok) | deny (role.deny_action) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) |

## Role Matrix: Code, Policy, Session, Task, Test, Unknown Actions

| role | code.read | code.read.raw_restricted | code.write | policy.check | session.attach_info | session.intervention_note | task.assign | test.run | v3.unknown.action |
|---|---|---|---|---|---|---|---|---|---|
| orchestrator | allow (ok) | deny (role.deny_action) | deny (role.deny_action) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) |
| planner | allow (ok) | allow (ok) | deny (role.deny_action) | allow (ok) | allow (ok) | allow (ok) | deny (role.task_assign_only_orchestrator) | allow (ok) | allow (ok) |
| coder | allow (ok) | deny (role.deny_action) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | deny (role.task_assign_only_orchestrator) | allow (ok) | allow (ok) |
| restricted-coder | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | allow (ok) | deny (role.task_assign_only_orchestrator) | allow (ok) | allow (ok) |
| reviewer | allow (ok) | deny (role.deny_action) | deny (role.deny_action) | allow (ok) | allow (ok) | allow (ok) | deny (role.task_assign_only_orchestrator) | allow (ok) | allow (ok) |
| tester | allow (ok) | allow (ok) | deny (role.deny_action) | allow (ok) | allow (ok) | allow (ok) | deny (role.task_assign_only_orchestrator) | allow (ok) | allow (ok) |
| documenter | allow (ok) | allow (ok) | deny (role.deny_action) | allow (ok) | allow (ok) | allow (ok) | deny (role.task_assign_only_orchestrator) | allow (ok) | allow (ok) |
| security_reviewer | allow (ok) | allow (ok) | deny (role.deny_action) | allow (ok) | allow (ok) | allow (ok) | deny (role.task_assign_only_orchestrator) | allow (ok) | allow (ok) |

## Notable Cells

- `v3.unknown.action` is `allow (ok)` for every role. This is the clearest evidence of the current default-allow behavior.
- Many actions absent from a role's `allowActions` still allow today, for example `planner` can `artifact.get.raw_restricted`, `reviewer` can `artifact.put.raw_restricted`, and `tester` can `agent.spawn`.
- `task.assign` is denied for every non-orchestrator role by the special rule `role.task_assign_only_orchestrator`, independent of `denyActions`.
- `restricted-coder` is the only role denying `artifact.share.cross_classification`; all other roles currently allow that action because it is not in their deny-list.
- Some raw-code action names behave differently by role: `reviewer` denies `code.read.raw_restricted`, while `tester`, `documenter`, and `security_reviewer` allow it because their role deny-lists do not include that action.

## Verification

- `node tests/gateway/policy_role_matrix.test.js` - passed.
- `npm --prefix gateway test` - passed, 67 tests.

## Owner Decision

- Decision: Branch A - documented deny-list, zero behavior change.
- Date: 2026-06-11.
- Decided by: owner via orchestrator.
- Audit: the decision is also registered in the Gateway audit log.
