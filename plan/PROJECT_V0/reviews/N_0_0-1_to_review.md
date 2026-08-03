# N/0/0 trial 1 - to review

## What was implemented

- Added `gateway/src/services/artifact_share_service.js`.
- Implemented `shareArtifact({ artifactId, requesterAgent, requesterRole, traceId, registries })`.
- Enforced same-trace sharing; cross-trace requests return `POLICY_DENIED` with `ruleId: "share.cross_trace"`.
- Applied visibility policy using the existing `artifact.get` policy context so raw restricted visibility produces:
  - hard deny for orchestrator
  - sanitized artifact sharing for reviewer via `allow_with_sanitization`
  - original artifact sharing for `allow`
- Looked up linked sanitized artifacts with `artifact_repo.findSanitizedFor`.
- Audited `ARTIFACT_SHARED` and `ARTIFACT_SHARE_DENIED`.
- Added `tests/gateway/artifact_share_service.test.js`.
- Updated `CHANGELOG.md` with the N/0/0 entry.

## Why

Artifact-mediated communication needs an explicit share service that respects trace boundaries and visibility policy. Raw restricted artifacts must not be shared directly to roles that only qualify for sanitized access.

## Decisions

- The service evaluates `action: "artifact.get"` rather than `artifact.share` because the existing policy engine's sanitization rules are attached to artifact visibility/read semantics. This makes the share service policy-aware without duplicating raw/sanitized logic.
- Missing sanitized companions return `SANITIZATION_MISSING`; this mirrors the fail-closed behavior added in M/0/3.

## Verification

- First TDD run failed as expected because `gateway/src/services/artifact_share_service.js` did not exist:
  `npm --prefix gateway test -- ../tests/gateway/artifact_share_service.test.js`
- Focused gateway test passed after implementation:
  `npm --prefix gateway test -- ../tests/gateway/artifact_share_service.test.js`
- Full CI passed:
  `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`
  - Structure tests: 33 passed.
  - Gateway tests: 33 passed.
  - CLI tests: 25 passed.

## Commit

- `9ff8ea0 feat(artifacts): add artifact share service (N/0/0)`
