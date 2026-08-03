# J/0/1 trial 1 - to review

## What was implemented

- Added `gateway/src/services/task_service.js`.
- Implemented `assignTask({ caller, target, repo, brief, traceId, registries })`.
- Added `PolicyDeniedError` with `code: "POLICY_DENIED"`.
- Validated that `traceId` belongs to an existing orchestration before policy evaluation or persistence.
- Added automatic target-agent selection:
  - `restricted-coder` -> `gemini-cli`
  - otherwise prefer `claude-code`, then `gemini-cli`
- Evaluated policy for both caller (`task.assign`) and target work action before creating a task.
- Emitted `POLICY_DECIDED` audit events for caller and target checks.
- Persisted tasks only after both policy decisions allow the operation.
- Emitted `TASK_CREATED` audit events with a 500-character brief cap.
- Added `tests/gateway/task_service.test.js`.
- Updated `CHANGELOG.md` with the J/0/1 entry.

## Why

`task.assign` is the main orchestration delegation path. It must prevent non-orchestrator assignment, invalid target role/agent combinations, restricted-repo assignment to disallowed agents, and orphaned work outside a trace.

## Decisions

- `targetAgent` is resolved before the caller `task.assign` policy evaluation. The policy engine requires both `targetAgent` and `targetRole`; evaluating before resolution would deny valid auto-selection requests.
- Policy decisions are audit events rather than persisted `policy_decisions` rows in this task because the task plan and reviewer note explicitly required `POLICY_DECIDED` audit events. The existing `policy_decision_repo` remains available for later tooling if a plan step asks for durable decision records.
- Missing or unknown `traceId` throws `ORCHESTRATION_NOT_FOUND` before any policy audit event, so audit correlation is not written for invalid scopes.

## Verification

- First TDD run failed as expected because `gateway/src/services/task_service.js` did not exist:
  `npm --prefix gateway test -- ../tests/gateway/task_service.test.js`
- Focused gateway test passed after implementation:
  `npm --prefix gateway test -- ../tests/gateway/task_service.test.js`
- Full CI passed:
  `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`
  - Structure tests: 33 passed.
  - Gateway tests: 23 passed.
  - CLI tests: 25 passed.

## Commit

- `673ada8 feat(gateway): add task assignment service (J/0/1)`
