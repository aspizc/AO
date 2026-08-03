# C/0/3 Trial 1 - To Review

## Summary

Implemented the approval policy layer in the gateway policy engine.

## What changed

- Added `evaluateApproval` after classification and role checks.
- Added protected branch matching against `protectedBranches`.
- Added `require_approval` decisions for:
  - `git.push` targeting `main`, `master`, or `release/*`.
  - actions present in `agent.requiresApprovalFor`, including `dependency.change`.
- Updated agent capability policies from generic `git.push` to `git.push.protected` so feature branch pushes remain routine while protected pushes still require approval.
- Added approval policy tests covering protected pushes, dependency changes, routine code writes, test runs, and feature branch pushes.
- Updated `CHANGELOG.md`.

## Decisions

- Interpreted the plan's `git.push -> git.push.protected` note and its feature-branch test as requiring protected-branch-only push approval. The previous generic `git.push` registry value would have made every push require approval and contradicted the provided test case.
- Protected branch approval is enforced directly from `protectedBranches` for any `git.push` target that matches those patterns.

## Verification

- `node --test tests/gateway/policy_approval.test.js tests/gateway/policy_roles.test.js tests/gateway/policy_classification.test.js`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `36cf735 feat(policy): add approval rules (C/0/3)`
