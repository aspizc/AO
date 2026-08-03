# L/0/1 trial 1 - to review

## What was implemented

- Added `gateway/src/tools/artifact.js`.
- Implemented MCP tools:
  - `artifact.put`
  - `artifact.get`
  - `artifact.list`
- Registered artifact tools in `gateway/src/tools/index.js`.
- Configured the artifact store during MCP server bootstrap with `config.artifactStoreRoot`.
- Ensured tool responses omit the internal filesystem `path`.
- Added `tests/gateway/tool_artifact.test.js`.
- Updated existing registry/bootstrap tests for the expanded tool list.
- Updated `CHANGELOG.md` with the L/0/1 entry.

## Why

The artifact store from L/0/0 must be available over MCP so external clients and the orchestrator can create, read, and list artifacts. This task intentionally does not add policy or sanitization checks; those belong to the later L/M stages.

## Decisions

- `artifact.put` accepts UTF-8 string content and converts it to a `Buffer` before calling the store.
- `artifact.get` converts the store's `Buffer` content back to a UTF-8 string for JSON MCP responses.
- `path` is stripped from `put`, `get`, and `list` responses because filesystem paths are internal implementation details.
- `sanitizedFrom` was added as an optional `artifact.put` field so the tool can preserve lineage when callers already know it, without introducing sanitization policy here.

## Verification

- First TDD run failed as expected because `gateway/src/tools/artifact.js` did not exist:
  `npm --prefix gateway test -- ../tests/gateway/tool_artifact.test.js`
- Focused gateway tests passed after implementation:
  `npm --prefix gateway test -- ../tests/gateway/tool_artifact.test.js ../tests/gateway/mcp_bootstrap.test.js ../tests/gateway/tool_orchestration_task.test.js`
- Full CI passed:
  `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`
  - Structure tests: 33 passed.
  - Gateway tests: 27 passed.
  - CLI tests: 25 passed.

## Commit

- `9c14271 feat(artifacts): add artifact MCP tools (L/0/1)`
