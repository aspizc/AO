# Review Submission - Task C/0/2 (Trial 1)

## What was done
- Reorganized `gateway/src/core/policy_engine.js` into classification and role layers.
- Added role validation for agent allowed roles, unknown roles, role deny actions, and prefix deny matching.
- Added `task.assign` special handling: only `orchestrator` can assign, target agent/role are required, target must exist, and target agent must be allowed to assume target role.
- Changed final successful decision to `allow` with `ruleId: "ok"` after all current layers pass.
- Added `tests/gateway/policy_roles.test.js` covering orchestrator write/raw-deny, valid task assignment, invalid restricted-coder assignment to Claude, non-orchestrator assignment, missing target, and disallowed role assumption.
- Updated `CHANGELOG.md` with the C/0/2 entry.

## Why
- Role rules close TM-01: prompt injection cannot make the orchestrator write code, read raw restricted data, self-approve, or assign invalid targets.
- `task.assign` is the orchestration boundary, so target validation must happen before later agent execution stages exist.

## Decisions Taken
- Kept `actionMatchesDeny` prefix-based so deny entries such as `code.write` also catch future sub-actions like `code.write.protected_branch`.
- Did not enforce `allowActions` yet; this task's prescribed logic focuses on `denyActions` and `task.assign`, while later policy tasks add approval and sanitization layers.
- Added `agent_cannot_assume_disallowed_role` and `task_assign_requires_target_agent_and_role` tests to lock explicit failure modes beyond the minimum examples.

## Verification
- Initial Red: `node --test tests/gateway/policy_roles.test.js` failed because the current engine returned classification-only allows.
- `node --test tests/gateway/policy_roles.test.js tests/gateway/policy_classification.test.js` - passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed with `==> All checks passed.`
- Manual probe with `node - <<'NODE' ... NODE` confirmed:
  - orchestrator `code.write` returns `deny` with `role.deny_action`;
  - assigning `claude-code` as `restricted-coder` returns `deny` with `role.task_assign_target_role_not_allowed`;
  - assigning `gemini-cli` as `restricted-coder` returns `allow` with `ok`.

## Commit
- `27c29f1` - `feat(policy): add role and orchestrator rules (C/0/2)`
