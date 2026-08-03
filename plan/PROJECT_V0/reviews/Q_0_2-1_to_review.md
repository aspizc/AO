# Q/0/2 trial 1 to review

## Implemented

- Added `gateway/src/tools/approval.js`.
- Exposed non-blocking MCP tools:
  - `approval.request`
  - `approval.respond`
  - `approval.poll`
- Registered approval tools in `gateway/src/tools/index.js`.
- Updated exact tool-list tests for scaffold, MCP bootstrap, and orchestration/task registry.
- Added `tests/gateway/tool_approval.test.js`.
- Updated `CHANGELOG.md`.

## Why

The async approval workflow needs to be available through MCP so the orchestrator can request and poll approvals and the operator path can respond. `approval.wait` is intentionally left for Q/0/4.

## Decisions

- `approval.request` description explicitly says it returns immediately with `pending`.
- The timing test asserts request completes under 100 ms to catch accidental blocking behavior.
- Tools reuse the service directly, preserving repository state and audit behavior from Q/0/1.
- Tool schemas restrict `approval.respond.decision` to `granted|denied`.

## Verification

- Red: `node --test tests/gateway/tool_approval.test.js` failed before `gateway/src/tools/approval.js` existed.
- Green: `node --test tests/gateway/tool_approval.test.js`
- Green after updating exact registry lists: `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- `cc7ce14 feat(approvals): add approval MCP tools (Q/0/2)`
