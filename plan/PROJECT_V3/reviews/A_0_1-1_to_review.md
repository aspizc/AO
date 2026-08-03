# Review Submission - Task PROJECT_V3/A/0/1 (Trial 1)

## What was done
- Added `tests/gateway/policy_engine.test.js` with 18 direct characterization cases for `evaluate()` and `explain()`.
- Covered path normalization and excluded path matching, protected branch matching, deny action prefixes, default-allow behavior, unknown agent/repo short-circuiting, model/reasoning validation, and explain trace order/cutoff.
- Used temporary registry fixtures generated under the OS temp directory; no real `policies/` files are loaded by the new suite.
- Updated `CHANGELOG.md` under `## Unreleased` with `Closes V3 A/0/1`.

## Why
- `gateway/src/core/policy_engine.js` is the authorization core and needed direct tests before V3 changes semantics in later tasks.
- The new cases lock current behavior, including intentionally unsafe/default-allow behavior documented for follow-up in B/0/2.

## Decisions Taken
- Kept the policy engine private helpers private and observed all behavior through public `evaluate()` / `explain()` APIs.
- Added a small shared assertion helper so every characterization case checks both `decision` and `ruleId`.
- Did not modify `gateway/src/` or `policies/`.

## Verification
- `npm --prefix gateway test` - passed; 66 files, 66 passed.
- `./scripts/ci.sh` - first run failed because `.venv` was not active (`pytest not found`).
- `source .venv/bin/activate && ./scripts/ci.sh` - passed; all checks passed.

## Commit
- `814e19e6d8aad23679c07ac0e94fb3618492fc2c` - `test(v3): characterize policy engine behavior (PROJECT_V3 A/0/1)`
