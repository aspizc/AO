# F/0/2 Trial 1 - To Review

## Summary

Added domain repository modules for the SQLite schema.

## What changed

- Added one repository module per table:
  - `orchestration_repo.js`
  - `task_repo.js`
  - `session_repo.js`
  - `artifact_repo.js`
  - `message_repo.js`
  - `policy_decision_repo.js`
  - `approval_repo.js`
- Added create/get/list/status helpers using prepared statements.
- Kept `policy_decisions` append-only: `insertDecision`, getters/listers, no update API.
- Added `tests/gateway/domain_repositories.test.js`.
- Updated `CHANGELOG.md`.

## Decisions

- Repository functions return the input row on create and SQLite rows on reads, preserving DB column names at this layer.
- Added minimal update helpers only for mutable lifecycle tables (`orchestration_sessions`, `tasks`, `sessions`, `approvals`).
- Did not add a shared SQL abstraction yet; the modules are small and explicit, which keeps the first repository layer easy to audit.

## Verification

- `node --test tests/gateway/domain_repositories.test.js`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `11fee28 feat(state): add domain repositories (F/0/2)`
