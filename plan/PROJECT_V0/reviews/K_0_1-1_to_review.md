# Review Submission - Task K/0/1 (Trial 1)

## What was done
- Added `gateway/src/tools/agent.js` with `agent.delegate`, `agent.spawn`, `agent.ask`, `agent.view`, and `agent.kill`.
- Registered the agent tools in the Gateway tool registry.
- Added tool coverage for registration, invalid input handling, and a dry-run spawn/ask/view/kill cycle.

## Why
- The Gateway had an `AgentService` but no MCP surface for the LLM-orchestrator to execute child agents.

## Decisions Taken
- `agent.delegate` and `agent.spawn` require `taskId` at the MCP schema layer. This avoids returning session IDs for sessions that cannot be persisted under the current schema.

## Verification
- `node --test tests/gateway/tool_agent.test.js tests/gateway/mcp_bootstrap.test.js tests/gateway/tool_orchestration_task.test.js` - passed.
- `npm --prefix gateway test` - 54 tests passed.
- `AGENTS_DRY_RUN=1 node scripts/smoke_mcp.mjs` - passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - all checks passed.

## Commit
- `d69f796` - `feat(agent): expose MCP agent runtime tools (K/0/1 K/0/2 K/0/3)`

