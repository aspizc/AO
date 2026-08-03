# F/0/3 trial 1 - to review

## What was implemented

- Added `gateway/src/core/ids.js` with centralized domain ID generators based on `crypto.randomUUID()`.
- Added generators for trace, orchestration, child task, session, artifact, approval, message, and policy decision IDs.
- Added `isUuid(value)` for canonical lowercase UUID validation.
- Added `tests/gateway/ids.test.js` covering uniqueness, stable prefixes, optional trace slug prefixes, and UUID validation.
- Updated `CHANGELOG.md` with the F/0/3 entry.

## Why

The project needs non-predictable, stable-format identifiers to reduce spoofing and replay risk while keeping trace IDs readable in logs through an optional sanitized prefix.

## Decisions

- Empty or fully sanitized-away trace prefixes fall back to `tr-<uuid>` instead of producing `tr--<uuid>`.
- `isUuid` intentionally accepts only lowercase canonical UUID strings, matching `crypto.randomUUID()` output and the task's stable-format requirement.

## Verification

- First TDD run failed as expected because `gateway/src/core/ids.js` did not exist:
  `npm --prefix gateway test -- ../tests/gateway/ids.test.js`
- Focused gateway test passed after implementation:
  `npm --prefix gateway test -- ../tests/gateway/ids.test.js`
- Full CI passed:
  `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`
  - Structure tests: 33 passed.
  - Gateway tests: 21 passed.
  - CLI tests: 25 passed.

## Commit

- `fd0af44 feat(state): add domain id generators (F/0/3)`
