# M/0/1 trial 1 - to review

## What was implemented

- Added `gateway/src/core/sanitizer.js`.
- Implemented `configureSanitizer({ rulesPath })`.
- Implemented `sanitize(content, { kind })`.
- Applied configured rules in JSON array order.
- Returned `{ sanitized, appliedRuleIds }`.
- Added `tests/gateway/sanitizer.test.js`.
- Updated `CHANGELOG.md` with the M/0/1 entry.

## Why

The sanitization rules from M/0/0 need a deterministic engine so later artifact flows can sanitize raw artifacts reproducibly and audit which rules were applied.

## Decisions

- The sanitizer detects an applied rule by comparing output before and after replacement. This avoids `RegExp.test` state issues with global regexes and keeps each rule evaluation deterministic.
- Each rule gets a fresh `RegExp` instance during `sanitize`, so `lastIndex` cannot leak between invocations.
- Non-array `appliesTo` values are treated as non-applicable rather than throwing during sanitization; registry shape is already tested separately.

## Verification

- First TDD run failed as expected because `gateway/src/core/sanitizer.js` did not exist:
  `npm --prefix gateway test -- ../tests/gateway/sanitizer.test.js`
- Focused gateway test passed after implementation:
  `npm --prefix gateway test -- ../tests/gateway/sanitizer.test.js`
- Full CI passed:
  `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`
  - Structure tests: 33 passed.
  - Gateway tests: 30 passed.
  - CLI tests: 25 passed.

## Commit

- `4c2343b feat(sanitization): add sanitizer core (M/0/1)`
