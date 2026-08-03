# J/0/2 trial 1 - to review

## What was implemented

- Added `gateway/src/tools/tool_helpers.js` with `defineTool`, Zod validation, JSON Schema conversion, `INVALID_INPUT` responses, and structured `TOOL_ERROR` responses.
- Added `gateway/src/tools/orchestration.js` exposing:
  - `orchestration.create`
  - `orchestration.view`
  - `orchestration.pause`
  - `orchestration.resume`
  - `orchestration.cancel`
  - `orchestration.complete`
- Added `gateway/src/tools/task.js` exposing `task.assign`.
- Registered all orchestration/task tools in `gateway/src/tools/index.js`.
- Updated MCP bootstrap and gateway scaffold tests to expect the registered tools instead of an empty registry.
- Added `tests/gateway/tool_validation.test.js`.
- Added `tests/gateway/tool_orchestration_task.test.js`.
- Updated `CHANGELOG.md` with the J/0/2 entry.

## Why

The orchestration and task services need MCP tool wrappers so the LLM orchestrator can create orchestration scopes, inspect them, manage lifecycle status, and assign tasks through the policy-gated service path.

## Decisions

- Implemented the `defineTool` helper inside this task because `J/0/2` depends on `G/0/1`, but `G/0/1` was not present on `develop`. The implementation follows the `plan/G/0/01.md` contract and is covered by tests.
- Tool handlers return MCP text content with JSON payloads, matching the existing server `tools/call` flow.
- Service-level audit behavior is preserved by delegation; tool tests assert that `TASK_CREATED` audit events still appear.

## Verification

- First TDD run failed as expected because `gateway/src/tools/tool_helpers.js` and `gateway/src/tools/orchestration.js` did not exist:
  `npm --prefix gateway test -- ../tests/gateway/tool_validation.test.js ../tests/gateway/tool_orchestration_task.test.js`
- Focused gateway tests passed after implementation and scaffold adjustment:
  `npm --prefix gateway test -- ../tests/gateway/tool_validation.test.js ../tests/gateway/tool_orchestration_task.test.js ../tests/gateway/mcp_bootstrap.test.js`
- Full CI passed:
  `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`
  - Structure tests: 33 passed.
  - Gateway tests: 25 passed.
  - CLI tests: 25 passed.

## Commit

- `e0b3006 feat(gateway): add orchestration and task MCP tools (J/0/2)`
