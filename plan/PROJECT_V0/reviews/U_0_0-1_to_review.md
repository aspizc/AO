# U/0/0 Trial 1 - To Review

## Implemented

- Added `tests/e2e/helpers/gateway_harness.js`.
- Added `tests/e2e/mvp_restricted_flow.test.js`.
- Wired E2E tests into `scripts/ci.sh`.
- Updated `CHANGELOG.md`.

## Flow Covered

- Creates an orchestration as `claude-code` / `orchestrator`.
- Assigns a restricted `cvision` task to `gemini-cli` / `restricted-coder`.
- Spawns the restricted coder through `AgentService` in dry-run mode with a real `taskId`.
- Stores a restricted raw diff containing a fake secret.
- Verifies the orchestrator is denied direct raw access.
- Verifies a reviewer receives the sanitized replacement for the raw restricted diff.
- Verifies the orchestrator can read the sanitized internal artifact.
- Requests and grants an approval.
- Closes the session and completes the orchestration.
- Verifies audit contains the key lifecycle, artifact, sanitization, approval, and completion events.

## Why

U/0/0 establishes a dry-run MVP E2E path for the restricted workflow without network, real agent CLIs, or real restricted repositories.

## Decisions

- Built an in-process harness rather than spawning the MCP server because the codebase already exposes service and core APIs, and this keeps the test deterministic without stdio framing complexity.
- Used actual accepted policy behavior from N/0/2: `orchestrator` is denied raw restricted artifacts; `reviewer` receives sanitized replacement for raw restricted artifacts; `orchestrator` can read the sanitized internal artifact.
- Passed a real `taskId` from `task.assign` into `agent.spawn`, avoiding the O/0/2 `taskId: null` persistence gap.
- Verified actual audit event names used by the implementation: `SANITIZATION_APPLIED` instead of the pseudocode label `ARTIFACT_SANITIZED`.

## TDD Evidence

- First added the E2E test importing a missing harness.
- Initial useful failure: `ERR_MODULE_NOT_FOUND` for `tests/e2e/helpers/gateway_harness.js`.
- Implemented the harness and wired CI after the focused E2E passed.

## Verification

- `node --test tests/e2e/mvp_restricted_flow.test.js`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed. CI now includes the E2E block.

## Commit

- `beda829 test(e2e): add restricted dry-run flow (U/0/0)`
