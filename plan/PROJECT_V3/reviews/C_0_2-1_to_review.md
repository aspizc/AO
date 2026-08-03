# Review Submission - Task PROJECT_V3/C/0/2 (Trial 1)

## What was done
- Hardened `tests/gateway/postgres_state.test.js` with a `skipReason()` live Postgres gate.
- Added `AGENTS_PG_INTEGRATION=1` opt-in while preserving the legacy `AGENTS_TEST_DB=postgres` gate.
- Added default compose URL `postgres://agents:agents@localhost:5432/agents` with `AGENTS_TEST_DB_URL` override.
- Added live-only coverage for adversarial string literals, `NULL` versus `"null"`, named and positional params, DML `changes`, and non-finite numeric literal rejection.
- Updated `docs/v1-postgres-repository-tests.md` with docker compose execution steps and clarified that CI/Actions do not activate the live suite.
- Updated `CHANGELOG.md` with `Closes V3 C/0/2`.

## Why
- V3 C/0/2 requires a real Postgres opt-in path that never fails default CI because local infrastructure is absent.
- The fake executor covers SQL shape, while the new live cases are aimed at psql/Postgres parsing and literal behavior.

## Decisions Taken
- Kept the existing test file instead of creating a new one because the current live contract path was already there.
- Used `psql SELECT 1` as the readiness check after validating the `psql` binary exists.
- Kept the historical `AGENTS_TEST_DB=postgres` compatibility window and documented the new preferred `AGENTS_PG_INTEGRATION=1` gate.
- Used an idempotently dropped helper table for live DML `INSERT`/`SELECT`/`UPDATE`/`DELETE` checks.

## Verification
- `node --test --experimental-test-isolation=none tests/gateway/postgres_state.test.js` - passed, 8 passed and 9 skipped with clear no-opt-in skip messages.
- `AGENTS_PG_INTEGRATION=1 node --test --experimental-test-isolation=none tests/gateway/postgres_state.test.js` - passed, 8 passed and 9 skipped with `missing: psql`.
- `npm --prefix gateway test` - passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.
- Not run: live green Postgres compose verification, because this machine currently has no accessible Docker, no `psql`, and no Postgres on `localhost:5432`.
- Not run: temporary `pgLiteral` break/revert proof, because the real Postgres suite could not be executed in this environment.

## Commit
- `6781bf0f323b8158113c6457d8c8b4e4f0c44af6` - `test(v3): harden opt-in Postgres integration suite (PROJECT_V3 C/0/2)`
