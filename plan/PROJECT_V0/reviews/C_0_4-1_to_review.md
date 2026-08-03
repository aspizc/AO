# C/0/4 Trial 1 - To Review

## Summary

Implemented sanitization policy decisions for restricted raw artifact reads.

## What changed

- Added `evaluateSanitization` to the policy engine after approval checks.
- Added raw artifact detection via `isRawKind`.
- Added `allow_with_sanitization` decisions for restricted raw artifacts requested by roles that can consume sanitized artifacts but do not have raw restricted access.
- Added explicit denial for orchestrator attempts to consume restricted raw artifacts.
- Added tests for:
  - restricted `raw_diff` to reviewer -> `allow_with_sanitization`
  - non-raw artifact to reviewer -> `allow`
  - restricted `raw_diff` to orchestrator -> `deny`
  - internal raw artifact -> no sanitization contract
- Updated `CHANGELOG.md`.

## Decisions

- Reviewer and orchestrator both deny raw restricted access in the role registry, but C/0/4 requires different outcomes: reviewer should get a sanitization contract, orchestrator should be denied. I encoded that orchestrator boundary explicitly with `sanitization.orchestrator_raw`.
- Roles without raw access must also have `artifact.get.sanitized` to receive `allow_with_sanitization`; otherwise the engine denies with `sanitization.role_denies_sanitized`.

## Verification

- `node --test tests/gateway/policy_sanitization.test.js tests/gateway/policy_approval.test.js tests/gateway/policy_roles.test.js tests/gateway/policy_classification.test.js`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `9b03543 feat(policy): add sanitization rules (C/0/4)`
