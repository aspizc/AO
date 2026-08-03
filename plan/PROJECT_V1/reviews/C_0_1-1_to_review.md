# Review Submission - Task C/0/1 (Trial 1)

## What was done
- Added shared Gateway repository contract tests in `tests/gateway/repository_contracts.js`.
- Added an injected fake Postgres executor for repository parity coverage without a live database.
- Reused the same contracts for SQLite and fake Postgres paths.
- Added an opt-in live Postgres contract path gated by `AGENTS_TEST_DB=postgres` and `AGENTS_TEST_DB_URL`.
- Documented how to run the default and live Postgres repository suites.
- Updated `CHANGELOG.md`.

## Why
- PROJECT_V1 C/0/1 requires confidence that switching Gateway repository state from SQLite to Postgres preserves repository semantics and does not change the MCP contract.

## Delegated Coder Run
- Coder trace: `tr-7071318e-eca0-4e9a-a079-136c503525f3`.
- Coder task: `ts-68588296-0abb-4789-949d-69ffc97de33d`.
- Coder session: `ss-d4c630cf-101d-4042-8f06-7267aebdf3d0`.
- Coder notes artifact: `art-a99aef1c-842e-4262-9dc5-6f518e8f6d97`.
- Coder result: Codex completed the test-only implementation under scoped `cwd=tests/`.
- Operational note: the first two Codex attempts failed because the MVP2 profile forced unsupported `gpt-5`/`gpt-5-codex` models for this account. The successful run used a temporary MVP2 policy copy without a forced Codex model, allowing the Codex CLI default model.

## Decisions Taken
- Kept live Postgres tests skipped by default.
- Used `AGENTS_TEST_DB_URL` instead of runtime `AGENTS_DB_URL` for destructive live tests.
- Forced existing SQLite repository tests to pass `env: {}` so ambient `AGENTS_DB_URL` cannot redirect them to Postgres.
- Kept the fake executor focused on the SQL shape produced by current Gateway repositories and `PostgresDatabase`.

## Verification
- `node --test tests/gateway/domain_repositories.test.js tests/gateway/postgres_state.test.js` - passed.
- `npm --prefix gateway test` - passed, 64 tests.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Notes
- No MCP tool schemas, Gateway tool handlers, or production repository code were changed.
- PR draft creation is not included because this workflow does not push branches unless the human explicitly asks.
