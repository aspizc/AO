# Review Submission - Task C/0/0 (Trial 1)

## What was done
- Added an optional Postgres backend scaffold for Gateway repository state.
- `initState` now keeps SQLite as the default and selects Postgres only for `postgres://` or `postgresql://` `AGENTS_DB_URL` values.
- Added a synchronous `PostgresDatabase` adapter with the same shape the existing repositories use: `exec`, `prepare().get`, `prepare().all`, `prepare().run`, and `close`.
- Added versioned Postgres migration SQL in `gateway/migrations/postgres/001_initial.sql`.
- Added focused backend-selection and adapter-shape tests that do not require a running Postgres server.
- Updated `CHANGELOG.md`.

## Why
- PROJECT_V1 C/0/0 needs a durable Postgres backend option behind the existing repository interface without changing MCP tools or making Postgres the local default.

## Delegated Coder Run
- First attempted `codex/coder`; Gateway denied it by policy because `agents-orchestrator` does not allow `codex`.
- Relaunched with allowed `claude-code/coder`.
- Coder trace: `tr-8ad9c32e-0883-480d-9efe-79fecd9adbfc`.
- Coder task: `ts-0c743909-5f50-4de9-8c1f-5bbbbe73f6a7`.
- Coder session: `ss-09fb40c8-a729-4173-9742-f7a61bf56a05`.
- Coder notes artifact: `art-ab330f20-cfd3-413b-ae3b-31a9d6f4224d`.
- Coder result: accepted the draft by inspection, but could not edit or run tests because Claude Code headless denied `Edit`, `Write`, and `Bash` under `dontAsk`.

## Decisions Taken
- Kept real Postgres parity tests for C/0/1, per the stage plan.
- Used an injectable synchronous executor so C/0/0 can test backend selection and adapter shape without a live server.
- Used `psql` as the default executor scaffold to avoid adding a new package or async repository contract in this task.
- Preserved SQLite migration behavior and SQLite as the default backend.
- Applied two low-risk hardening suggestions from the delegated coder: a scope comment on the Postgres adapter and rejection of non-finite numeric SQL literals.

## Verification
- `node tests/gateway/postgres_state.test.js` - passed, 4 tests.
- `npm --prefix gateway test` - passed, 64 tests.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Commit
- `f3aff35` - `feat(v1): add Postgres state backend scaffold (PROJECT_V1 C/0/0)`

## Notes
- No MCP tool schemas or Gateway tool handlers were changed.
- PR draft creation is not included because this workflow does not push branches unless the human explicitly asks.
