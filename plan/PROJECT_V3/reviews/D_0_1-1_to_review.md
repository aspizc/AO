# Review Submission - Task PROJECT_V3/D/0/1 (Trial 1)

## What was done
- Added `tests/gateway/sanitizer_composition.test.js` with the eight requested sanitizer composition cases.
- Used temporary fixture rulesets and fresh dynamic imports to avoid leaking the sanitizer module's global configured state between cases.
- Added the required `CHANGELOG.md` entry under `## Unreleased`.

## Why
- The existing sanitizer coverage characterized individual rules, but not ordered composition, cascades, kind gating, replacement backreferences, empty/no-match behavior, fail-closed behavior, or the E2E secret fixture with real rules.

## Decisions Taken
- Kept the behavior characterization in tests only; no production sanitizer code, policy rules, or existing sanitizer tests were changed.
- Captured the current `String.replace` replacement semantics for `$&` and `$1` exactly as implemented today.

## Verification
- `npm --prefix gateway test` - passed, 72/72 test files green.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed, all checks green.

## Commit
- `8e81f71fee2d1db9a335050a814ea47285fdfc09` - `test(v3): characterize sanitizer composition (PROJECT_V3 D/0/1)`
