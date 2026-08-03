# Review Submission - Task K/0/3 (Trial 1)

## What was done
- Wired the real Gateway tool registry to construct the adapter registry, register Gemini, Claude, and dormant Codex adapters, and create `AgentService`.
- Updated MCP bootstrap and smoke tests so `agent.spawn` and `agent.ask` are required in `tools/list`.
- Added coverage that Codex is registered but returns a structured `ADAPTER_DISABLED` error by default.
- Integrated best-effort tmux intervention detection into `agent.ask` and `agent.view`.

## Why
- The previous dry-run E2E used services directly; the actual MCP Gateway did not expose or wire agent execution primitives, so a human-facing LLM could not run child coder/reviewer sessions.

## Decisions Taken
- Codex is registered in the adapter registry but remains disabled by the production policy registry.
- Intervention detection is best-effort and intentionally cannot break the control path if pane capture or audit detection fails.
- The task was implemented together with K/0/1 and K/0/2 because K/0/3 depends on the missing tool surface and structured error behavior.

## Verification
- `node --test tests/gateway/tool_agent.test.js tests/gateway/mcp_bootstrap.test.js tests/gateway/tool_orchestration_task.test.js` - passed.
- `AGENTS_DRY_RUN=1 node scripts/smoke_mcp.mjs` - passed.
- `npm --prefix gateway test` - 54 tests passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - all checks passed.

## Commit
- `d69f796` - `feat(agent): expose MCP agent runtime tools (K/0/1 K/0/2 K/0/3)`

