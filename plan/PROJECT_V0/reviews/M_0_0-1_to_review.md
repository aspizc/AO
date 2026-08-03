# M/0/0 trial 1 - to review

## What was implemented

- Added `policies/sanitization-rules.json`.
- Added initial declarative sanitization rules for:
  - secrets/tokens
  - absolute home paths
  - UUID-like identifiers
  - internal/private file paths
- Included `appliesTo` and `severity` metadata on each rule.
- Added `tests/gateway/sanitization_rules.test.js`.
- Updated `CHANGELOG.md` with the M/0/0 entry.

## Why

The sanitizer needs versioned, operator-reviewable rules before code can apply sanitization reproducibly. A policy registry lets later tasks load and audit which rules were applied without hardcoding the patterns.

## Decisions

- The secret rule uses explicit character classes for case-insensitive matching instead of inline `(?i)` because JavaScript `RegExp` does not support that inline flag syntax.
- Tests resolve the repository root from `import.meta.url` rather than process cwd so they pass both from the repo root and through `npm --prefix gateway test`.
- Added `severity` even though the minimum plan shape did not require it, because the task description lists severity as a rule field.

## Verification

- First TDD run failed as expected because `policies/sanitization-rules.json` did not exist:
  `npm --prefix gateway test -- ../tests/gateway/sanitization_rules.test.js`
- Focused gateway test passed after implementation:
  `npm --prefix gateway test -- ../tests/gateway/sanitization_rules.test.js`
- Full CI passed:
  `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`
  - Structure tests: 33 passed.
  - Gateway tests: 29 passed.
  - CLI tests: 25 passed.

## Commit

- `ad09f13 feat(sanitization): add rules registry (M/0/0)`
