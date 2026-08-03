# C/0/5 Trial 1 - To Review

## Summary

Implemented policy explanation traces, canonical table-driven coverage, and policy examples documentation. This closes the planned Stage C policy engine work from the implementation side.

## What changed

- Refactored the policy engine pipeline into `runPipeline`.
- Kept `evaluate(ctx, registries)` as the final-decision API.
- Added `explain(ctx, registries)` returning:
  - final `decision`
  - `reason`
  - `ruleId`
  - normalized `context`
  - `layers` trace with one entry per evaluated layer
- Added `tests/gateway/policy_explain.test.js`.
- Added `tests/gateway/policy_table.test.js` with 20 canonical cases.
- Added `docs/policy-examples.md` mirroring the table cases.
- Updated `CHANGELOG.md`.

## Decisions

- The trace stops at the first non-allow decision, matching the existing short-circuit semantics of `evaluate`.
- Layer entries preserve the raw layer result as `{ name, result }`; skipped layers are not emitted because they were not evaluated.
- The table includes both specific policy boundaries and unknown entity failures so it exercises classification, role, approval, and sanitization outcomes.

## Verification

- `node --test tests/gateway/policy_explain.test.js tests/gateway/policy_table.test.js tests/gateway/policy_sanitization.test.js tests/gateway/policy_approval.test.js tests/gateway/policy_roles.test.js tests/gateway/policy_classification.test.js`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `ebd4351 feat(policy): add explain traces and table tests (C/0/5)`
