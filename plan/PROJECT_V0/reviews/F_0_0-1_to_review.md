# F/0/0 Trial 1 - To Review

## Summary

Added the initial SQLite migration for operational state.

## What changed

- Added `gateway/migrations/001_initial.sql`.
- Added tables:
  - `schema_migrations`
  - `orchestration_sessions`
  - `tasks`
  - `sessions`
  - `artifacts`
  - `messages`
  - `policy_decisions`
  - `approvals`
- Added foreign keys, status/classification checks, and trace/status indexes.
- Added idempotent `schema_migrations` registration for `001_initial`.
- Added `tests/gateway/sqlite_migrations.test.js`.
- Updated `CHANGELOG.md`.

## Decisions

- The migration includes `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL`, matching the task and making direct migration tests reflect runtime expectations.
- The test loads `better-sqlite3` via `createRequire` from `gateway/package.json` so it works from root-level tests and from `npm --prefix gateway test`.

## Verification

- `node --test tests/gateway/sqlite_migrations.test.js`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `6331fe3 feat(state): add initial sqlite migration (F/0/0)`
