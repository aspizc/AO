# F/0/1 Trial 1 - To Review

## Summary

Hardened state initialization and migration loading.

## What changed

- Updated `gateway/src/core/state.js`.
- Migrations are now resolved module-relatively instead of cwd-relatively.
- `initState({ stateDb })`:
  - creates the parent directory
  - opens SQLite
  - enables WAL
  - enables foreign keys
  - applies pending migrations
  - caches the singleton DB connection
- `getDb()` requires initialization.
- Added `tests/gateway/state_init.test.js`.
- Updated `CHANGELOG.md`.

## Decisions

- `initState` now returns the existing DB if already initialized, rather than closing/reopening implicitly. Tests use `_resetForTests()` for isolation.
- Added a cwd-regression test that imports `state.js` fresh after changing cwd to `gateway/`, closing the bug flagged in the G/0/0 and F/0/0 reviews.

## Verification

- `node --test tests/gateway/state_init.test.js tests/gateway/sqlite_migrations.test.js tests/gateway/mcp_bootstrap.test.js`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `d6c5fb2 feat(state): harden initialization and migrations (F/0/1)`
