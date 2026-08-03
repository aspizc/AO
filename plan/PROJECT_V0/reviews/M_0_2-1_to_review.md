# M/0/2 trial 1 - to review

## What was implemented

- Updated `gateway/src/core/artifact_store.js` so `put` automatically creates a secondary sanitized artifact when:
  - `classification === "restricted"`
  - `kind` is a raw artifact kind
  - `sanitizedFrom === null`
- Created sanitized artifacts with:
  - `kind: <raw-kind>_sanitized`
  - `classification: "internal"`
  - `sanitizedFrom` pointing to the raw artifact ID
- Emitted `SANITIZATION_APPLIED` audit events with `sourceArtifactId`, `sanitizedArtifactId`, `kind`, and `appliedRuleIds`.
- Configured the sanitizer during MCP server boot from `config.policiesDir/sanitization-rules.json`.
- Added `tests/gateway/auto_sanitize_artifacts.test.js`.
- Updated existing artifact tests to configure the sanitizer for raw restricted writes.
- Updated `CHANGELOG.md` with the M/0/2 entry.

## Why

Sanitized artifacts should exist before consumers request them. Generating the sanitized artifact at raw restricted `put` time avoids `get`-time races and preserves a durable `sanitized_from` forensic link.

## Decisions

- The raw artifact is always created first and returned from `put`; the sanitized artifact is secondary metadata discoverable through `list`.
- Sanitized artifact creation uses an internal helper rather than recursively calling `put`, so `sanitizedFrom` cannot accidentally trigger another sanitization loop.
- The sanitized artifact also emits the existing `ARTIFACT_CREATED` audit event, followed by `SANITIZATION_APPLIED`.
- The current `artifact.get` policy behavior remains unchanged in this task; it still denies `allow_with_sanitization` content until the next wiring step explicitly serves sanitized artifacts.

## Verification

- First TDD run failed as expected because raw restricted `put` still created only one row and no `SANITIZATION_APPLIED` event:
  `npm --prefix gateway test -- ../tests/gateway/auto_sanitize_artifacts.test.js`
- Focused gateway tests passed after implementation:
  `npm --prefix gateway test -- ../tests/gateway/auto_sanitize_artifacts.test.js ../tests/gateway/artifact_store.test.js ../tests/gateway/artifact_get_policy.test.js ../tests/gateway/mcp_bootstrap.test.js`
- Full CI passed:
  `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`
  - Structure tests: 33 passed.
  - Gateway tests: 31 passed.
  - CLI tests: 25 passed.

## Commit

- `d5a7704 feat(sanitization): auto-generate sanitized artifacts (M/0/2)`
