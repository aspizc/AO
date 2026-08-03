# Review Verdict - Task PROJECT_V3/C/0/2 (Trial 1) - OK

## Summary

C/0/2 hardens the opt-in live Postgres path in `tests/gateway/postgres_state.test.js`
with a `skipReason()` gate (new `AGENTS_PG_INTEGRATION=1`, legacy
`AGENTS_TEST_DB=postgres` preserved), default compose URL with
`AGENTS_TEST_DB_URL` override, the adversarial literal cases required by the
spec, updated docs (`docs/v1-postgres-repository-tests.md`) and CHANGELOG.
Commits reviewed: `6781bf0` (implementation) + `ed0c60a` (handoff). The diff
touches only the four expected files; `gateway/src/` and `policies/` are
untouched. The live green run and the pgLiteral break/revert proof are blocked
by the environment (no docker daemon, no psql, no Postgres) — the handoff
documents this honestly and the V3 contract allows closing with an explained
environmental block. Verdict: **OK**.

## Findings

### Gating (spec step 2) — OK
- `skipReason()` replicates the reference pattern of
  `tests/e2e/mcp_two_agent_real.test.js:20-25`, with memoization so the psql
  readiness probe runs at most once per process
  (`tests/gateway/postgres_state.test.js:36-60`).
- New gate `AGENTS_PG_INTEGRATION=1` OR legacy `AGENTS_TEST_DB=postgres`
  (`postgres_state.test.js:33-35`). The legacy gate is widened compatibly: it
  previously also required `AGENTS_TEST_DB_URL`; now the compose default URL
  applies when unset. This is documented in the docs section "The legacy gate
  remains supported for compatibility".
- `grep AGENTS_TEST_DB` across the repo: outside `plan/` (historical specs and
  handoffs, which are immutable records) the only references are
  `docs/v1-postgres-repository-tests.md` (updated in the same commit, legacy
  gate documented as supported) and the test file itself. No broken references.
- Without the gate, `skipReason()` returns before spawning anything — no
  connection attempt, no slowdown of the default `npm --prefix gateway test`.

### Skip never fails on absent environment — OK
- Three-tier skip with clear messages: no opt-in → base message; opt-in but no
  psql → `; missing: psql`; psql but Postgres unreachable → `; Postgres not
  ready at <url>: <stderr detail>`. Verified tiers 1 and 2 directly (below);
  tier 3 is straight-line code over `spawnSync` results and cannot throw.

### Adversarial cases vs spec list — OK
- Single quote, doubled quotes, double quote, backslash, psql-style
  `:variable` and `:'quoted_variable'`, newline, emoji
  (`postgres_state.test.js:176-192`); `NULL` vs string `"null"`
  (`:194-201`); named vs positional params (`:203-211`); DML `changes` counts
  (`:213-239`); non-finite numbers throw, asserted against
  `/non-finite number cannot be a SQL literal/` which matches the actual
  message in `gateway/src/core/postgres_db.js:109` (`:241-250`).
- All spec test IDs covered: C2-T1 (pre-existing live repository contracts now
  under the hardened gate), C2-T2, C2-T3, C2-T4.

### Cleanup idempotency — OK
- The live DML test creates its helper table with `DROP TABLE IF EXISTS` first
  and drops it again in a `finally` block, so reruns and mid-test failures
  leave no residue. The pre-existing live contract setup keeps clearing
  Gateway-owned tables in FK order; docs state the disposable-database caveat.

### Scope — OK
- `git diff develop...HEAD --stat`: only `CHANGELOG.md`, the docs page, the
  test file, and the review handoff. No `gateway/src/`, no `policies/`, not in
  `scripts/ci.sh` nor Actions (grep for `AGENTS_PG_INTEGRATION` confirms the
  gate appears only in the test, the docs, and plan records).

### Environmental block (live run + break/revert proof) — accepted
- Independently confirmed on this machine: `docker` binary exists but the
  daemon is not accessible (`docker info` fails), `psql`/`pg_isready` are
  absent, and port 5432 refuses connections. The compose-up green run and the
  deliberate `pgLiteral` mutation proof are therefore unverifiable here.
- The handoff states both omissions explicitly under Verification ("Not run:
  ...") with the reason. Per the V3 common contract ("`./scripts/ci.sh` esta
  verde o la review explica claramente el bloqueo ambiental"), this is
  sufficient and honest. **Operator follow-up (pending, not blocking):** on a
  machine with Docker, run
  `docker compose -f docker/docker-compose.yml up -d postgres` then
  `AGENTS_PG_INTEGRATION=1 npm --prefix gateway test` and confirm green; also
  temporarily break `pgLiteral` escaping locally and confirm the live suite
  fails where the fake does not, then revert.

### Minor (non-blocking)
- The documented command
  `npm --prefix gateway test -- ../tests/gateway/postgres_state.test.js` does
  not actually narrow the run to that file: the `test` script in
  `gateway/package.json` already passes globs, so the full 448-test suite runs
  (verified). Harmless — the live tests still gate correctly inside the full
  run — but the docs imply a single-file run. Could be simplified to
  `AGENTS_PG_INTEGRATION=1 npm --prefix gateway test` in a future docs touch.

## Verification

Run by the reviewer on this machine (no docker daemon, no psql, port 5432 closed):

- `node --test --experimental-test-isolation=none tests/gateway/postgres_state.test.js`
  — 17 tests, 8 pass, 9 skipped, 0 fail; skip message is the clear opt-in hint.
- `AGENTS_PG_INTEGRATION=1 node --test --experimental-test-isolation=none tests/gateway/postgres_state.test.js`
  — 8 pass, 9 skipped with `; missing: psql` appended, 0 fail.
- `npm --prefix gateway test` — 448 tests, 439 pass, 9 skipped, 0 fail.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` — "All checks passed"
  (gateway suite + Python 81 passed, 3 skipped).
- `npm --prefix gateway test -- ../tests/gateway/postgres_state.test.js` —
  green (runs full suite; see minor finding).
- `git diff develop...HEAD --stat` — only the four expected files.
- `grep -rn AGENTS_TEST_DB` / `AGENTS_PG_INTEGRATION` — no stale or broken
  references outside immutable plan records.

## Verdict

**OK.** Acceptance criteria met within what this environment can verify; the
live-Postgres green run and the pgLiteral break/revert proof remain as
documented operator follow-ups, which the V3 contract explicitly permits.
