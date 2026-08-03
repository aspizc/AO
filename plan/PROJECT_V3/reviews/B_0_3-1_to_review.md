# Review Submission - Task PROJECT_V3/B/0/3 (Trial 1)

## What was done
- Decoupled Gateway boundary audit from telemetry by wiring `append: auditAppend` unconditionally in `gateway/src/mcp_server.js`.
- Extended `tests/gateway/otel_tool_spans.test.js` with coverage for telemetry-disabled `MCP_TOOL_CALL` audit emission, telemetry-enabled non-duplication, append failure tolerance, and safe audit fields without tool arguments or payloads.
- Updated `CHANGELOG.md` under `## Unreleased` with `Closes V3 B/0/3`.

## Why
- `MCP_TOOL_CALL` is a product audit event and should exist in the default telemetry-disabled Gateway configuration.
- The audit event records safe boundary metadata only: `traceId`, `toolName`, `status`, optional session/task/approval metadata, and not raw tool arguments, prompts, or payloads.

## Decisions Taken
- Prior decision found: `plan/PROJECT_V1/reviews/E_0_0-1_reviewed_OK.md` and `plan/PROJECT_V1/reviews/E_0_0-2_to_review.md` recorded gating `MCP_TOOL_CALL` behind enabled telemetry to avoid changing audit volume when telemetry was disabled.
- Applied the PROJECT_V3 B/0/3 default and authorized exception to reverse that coupling in production `main()` while preserving tool schemas and error response format.
- The real duplicate risk is low: service-level audit events and `MCP_TOOL_CALL` contain different fields and scopes; the telemetry-on test asserts exactly one `MCP_TOOL_CALL` audit event for a tool call.

## Verification
- `node tests/gateway/otel_tool_spans.test.js` before implementation - failed as expected: telemetry-disabled run produced `0 !== 1` `MCP_TOOL_CALL` events.
- `node tests/gateway/otel_tool_spans.test.js` - passed, 9 tests.
- `npm --prefix gateway test` - passed, 67 tests.
- `node scripts/smoke_mcp.mjs` - passed, `MCP smoke OK`.
- `./scripts/ci.sh` - failed in the shell environment because `ruff` was not on `PATH`.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed; lint, structure tests, Gateway tests, E2E tests, MCP smoke, policy validation, CLI tests, and Orchestrator LangGraph tests all green.

## Commit
- `f21aa53` - `test(v3): decouple MCP tool call audit from telemetry (PROJECT_V3 B/0/3)`
