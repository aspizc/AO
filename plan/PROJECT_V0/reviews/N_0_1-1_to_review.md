# N/0/1 trial 1 - to review

## What was implemented

- Added `artifact.share` to `gateway/src/tools/artifact.js`.
- Added Zod schema for `artifactId`, `requesterAgent`, `requesterRole`, and `traceId`.
- Delegated to `shareArtifact({ ...args, registries })`.
- Updated gateway tool registry expectations to include `artifact.share`.
- Added `tests/gateway/tool_artifact_share.test.js`.
- Updated `CHANGELOG.md` with the N/0/1 entry.

## Why

The artifact share service from N/0/0 needs to be exposed through MCP so the orchestrator can explicitly share artifacts while the gateway selects raw vs sanitized IDs according to policy.

## Decisions

- `artifact.share` lives with the other artifact MCP tools, reusing the existing `buildArtifactTools({ registries })` injection pattern.
- The tool returns the service response directly: either `{ decision, sharedArtifactId }` or `{ error, decision }`.

## Verification

- First TDD run failed as expected because `artifact.share` was not registered:
  `npm --prefix gateway test -- ../tests/gateway/tool_artifact_share.test.js`
- Focused gateway tests passed after implementation:
  `npm --prefix gateway test -- ../tests/gateway/tool_artifact_share.test.js ../tests/gateway/mcp_bootstrap.test.js ../tests/gateway/tool_orchestration_task.test.js`
- Full CI passed:
  `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`
  - Structure tests: 33 passed.
  - Gateway tests: 34 passed.
  - CLI tests: 25 passed.

## Commit

- `3f341c2 feat(artifacts): add artifact share MCP tool (N/0/1)`
