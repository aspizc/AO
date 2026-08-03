# L/0/2 trial 1 - to review

## What was implemented

- Updated `artifact.get` to require `requesterAgent` and `requesterRole`.
- Injected `registries` into `buildArtifactTools({ registries })`.
- Evaluated `artifact.get` policy using artifact metadata:
  - `artifactKind`
  - `artifactClassification`
  - requester agent/role
- Emitted `POLICY_DECIDED` audit events for each found artifact get call.
- Returned `{ error: "POLICY_DENIED", decision }` without content for any non-`allow` decision, including `allow_with_sanitization`.
- Preserved `NOT_FOUND` behavior for missing artifacts.
- Added `artifact.get.raw_restricted` to the `restricted-coder` role so the plan's Gemini restricted-coder raw restricted allow case is expressible by the policy engine.
- Added `tests/gateway/artifact_get_policy.test.js`.
- Updated existing artifact tool tests to provide requester identity.
- Updated `CHANGELOG.md` with the L/0/2 entry.

## Why

`artifact.get` was previously an unrestricted content read by artifact ID. This task gates reads through the existing policy engine, audits the decision, and prevents content from being returned on deny before the later sanitized fallback exists.

## Decisions

- Missing requester identity is a schema validation error (`INVALID_INPUT`) rather than a default `unknown` policy denial. This matches the acceptance criterion that requester identity is required and prevents ambiguous audit entries.
- `allow_with_sanitization` is treated as denied content for now. A code comment marks that sanitized fallback is added later.
- `restricted-coder` was granted `artifact.get.raw_restricted` because `policy_engine` already uses that role action to decide whether raw restricted artifact access can pass, and `plan/L/0/02.md` requires Gemini restricted-coder to be allowed.

## Verification

- First TDD run failed because `artifact.get` did not yet require requester identity or enforce policy:
  `npm --prefix gateway test -- ../tests/gateway/artifact_get_policy.test.js ../tests/gateway/tool_artifact.test.js`
- Focused gateway tests passed after implementation:
  `npm --prefix gateway test -- ../tests/gateway/artifact_get_policy.test.js ../tests/gateway/tool_artifact.test.js ../tests/gateway/policy_table.test.js ../tests/gateway/policy_roles.test.js`
- Full CI passed:
  `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`
  - Structure tests: 33 passed.
  - Gateway tests: 28 passed.
  - CLI tests: 25 passed.

## Commit

- `82e7330 feat(artifacts): enforce artifact get policy (L/0/2)`
