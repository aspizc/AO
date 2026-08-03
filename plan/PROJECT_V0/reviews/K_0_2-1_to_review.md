# Review Submission - Task K/0/2 (Trial 1)

## What was done
- Added `withTimeout` helper for bounded agent operations.
- Added `AGENTS_AGENT_TIMEOUT_MS` config with a 600s default.
- Wrapped `agent.delegate` and `agent.ask` service calls with the timeout helper.
- Changed MCP tool errors to expose the effective error code in `error` and `code`, without stack traces.
- Documented `AGENTS_AGENT_TIMEOUT_MS` in README and generic client config docs.

## Why
- Agent CLI operations must not hang indefinitely, and MCP clients need stable structured errors such as `TIMEOUT`, `POLICY_DENIED`, and `ADAPTER_DISABLED`.

## Decisions Taken
- Kept the generic fallback as `TOOL_ERROR` while preserving explicit `err.code` values as the primary `error`.
- Applied timeouts in `AgentService`, not adapters, so every adapter path shares one server-side cap.

## Verification
- `node --test tests/gateway/agent_errors.test.js tests/gateway/config_paths.test.js tests/gateway/tool_validation.test.js tests/gateway/tool_agent.test.js` - passed.
- `npm --prefix gateway test` - 54 tests passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - all checks passed.

## Commit
- `d69f796` - `feat(agent): expose MCP agent runtime tools (K/0/1 K/0/2 K/0/3)`

