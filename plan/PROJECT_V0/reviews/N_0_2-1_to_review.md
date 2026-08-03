# N/0/2 trial 1 to review

## Implemented

- Added `tests/gateway/artifact_visibility_matrix.test.js` as a table-driven visibility suite.
- Added reusable dataset `tests/fixtures/artifact_visibility_matrix.js` so later regression work can import the same matrix.
- Covered the requested rows:
  - Gemini `restricted-coder` can receive raw restricted diffs and sanitized internal diffs.
  - Claude `orchestrator` is denied raw restricted diffs and can receive sanitized internal diffs.
  - Claude `reviewer` receives a sanitized replacement for raw restricted diffs and can receive sanitized internal diffs.
  - Codex `tester` is denied raw restricted diffs and can receive internal `test_report` artifacts.
- Updated policy evaluation so sanitized replacement for raw restricted artifacts requires the more specific role permission `artifact.get.sanitized.raw_restricted`.
- Granted that permission only to `reviewer`.
- Updated `CHANGELOG.md`.

## Why

The stage requires locking the V4 visibility matrix with a reusable, table-driven test suite. The first green run exposed that `tester` roles could receive sanitized replacements for raw restricted artifacts because the previous policy treated any `artifact.get.sanitized` permission as enough. The matrix requires Codex `tester` to be denied raw restricted artifacts while still allowing internal `test_report` artifacts.

## Decisions

- The matrix dataset lives in `tests/fixtures/artifact_visibility_matrix.js` instead of inside the test file so `U/0/4` can import it without copying test runner code.
- Direct access to already-sanitized internal artifacts remains governed by the existing `artifact.get.sanitized`/normal visibility path.
- Receiving a sanitized replacement for a raw restricted artifact now uses `artifact.get.sanitized.raw_restricted`, a narrower policy action. This avoids accidentally granting raw-restricted derived content to every role that may read ordinary sanitized artifacts.

## Verification

- Red: `npm --prefix gateway test -- tests/gateway/artifact_visibility_matrix.test.js` failed before the fixture existed.
- Red: the matrix then failed because Codex `tester` was not denied raw restricted diffs.
- Green: `node tests/gateway/artifact_visibility_matrix.test.js`
- Green: `npm --prefix gateway test`
- Green: `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- `ff9ad1a test(artifacts): add visibility matrix coverage (N/0/2)`
