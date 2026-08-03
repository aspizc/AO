# M/0/3 trial 1 - to review

## What was implemented

- Updated `artifact_store.put` to catch sanitizer exceptions after the raw artifact is persisted.
- Added `SANITIZATION_FAILED` audit events with the raw artifact ID and error message.
- Ensured sanitizer failures do not create a sanitized artifact.
- Added `artifact_repo.findSanitizedFor(artifactId)`.
- Updated `artifact.get` handling for `allow_with_sanitization`:
  - returns the linked sanitized artifact when present
  - denies without content when missing
  - audits `SANITIZATION_MISSING_DENY` when missing
- Added `tests/gateway/sanitization_fail_closed.test.js`.
- Updated `CHANGELOG.md` with the M/0/3 entry.

## Why

TM-06 requires fail-closed behavior: sanitizer failure must never cause raw restricted content to be returned as a fallback. The raw artifact can remain stored for forensic/internal purposes, but cross-boundary reads must either receive a sanitized artifact or be denied.

## Decisions

- Raw `put` does not throw on sanitizer failure, matching the plan. The raw row is persisted and the failure is audit-visible.
- `artifact.get` now serves the sanitized linked artifact for `allow_with_sanitization`, because this is the only way to prove the missing-sanitized deny path without leaving the successful path permanently denied.
- The missing-sanitized denial uses a canonical decision object with `ruleId: "sanitization.missing"`.

## Verification

- First TDD run failed as expected:
  - sanitizer exceptions propagated out of `put`
  - no `SANITIZATION_FAILED` event existed
  - `artifact.get` did not serve linked sanitized artifacts
- Focused gateway tests passed after implementation:
  `npm --prefix gateway test -- ../tests/gateway/sanitization_fail_closed.test.js ../tests/gateway/auto_sanitize_artifacts.test.js ../tests/gateway/artifact_get_policy.test.js ../tests/gateway/domain_repositories.test.js`
- Full CI passed:
  `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`
  - Structure tests: 33 passed.
  - Gateway tests: 32 passed.
  - CLI tests: 25 passed.

## Commit

- `ec0b692 feat(sanitization): fail closed on sanitization errors (M/0/3)`
