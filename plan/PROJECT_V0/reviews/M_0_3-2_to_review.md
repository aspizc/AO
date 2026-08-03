# M/0/3 trial 2 - to review

## What was corrected

- Kept the production fail-closed behavior from trial 1.
- Removed the flaky bad-rules test setup that polluted shared sanitizer state.
- Added a test-only sanitizer injection hook in `artifact_store`:
  - `_setSanitizeForTests(fn)`
  - `_resetSanitizeForTests()`
- Updated fail-closed tests to inject a throwing sanitizer synchronously and restore it in `finally`.
- Updated `auto_sanitize_artifacts.test.js` to find the sanitized row by `sanitized_from` instead of assuming `list()[1]`, because `artifact_id` is a secondary sort key and UUID order is intentionally random.

## Why

The trial 1 production logic was accepted, but the reviewer found nondeterminism from mutating the global sanitizer configuration with bad rules. The corrected tests now exercise sanitizer failure without changing global rules and avoid order assumptions on UUID-sorted rows.

## Verification

Focused test:

`npm --prefix gateway test -- ../tests/gateway/sanitization_fail_closed.test.js ../tests/gateway/auto_sanitize_artifacts.test.js`

- Gateway tests: 32 passed, 0 failed.

Required 10x gateway test proof:

1. `# pass 32`, `# fail 0`
2. `# pass 32`, `# fail 0`
3. `# pass 32`, `# fail 0`
4. `# pass 32`, `# fail 0`
5. `# pass 32`, `# fail 0`
6. `# pass 32`, `# fail 0`
7. `# pass 32`, `# fail 0`
8. `# pass 32`, `# fail 0`
9. `# pass 32`, `# fail 0`
10. `# pass 32`, `# fail 0`

Full CI:

`PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

- Structure tests: 33 passed.
- Gateway tests: 32 passed.
- CLI tests: 25 passed.
- All checks passed.

## Commits

- Trial 1: `ec0b692 feat(sanitization): fail closed on sanitization errors (M/0/3)`
- Trial 2: `f600915 test(sanitization): isolate fail-closed sanitizer failure (M/0/3 trial 2)`
