# Review Submission - Task K/0/4 (Trial 1)

## What was done
- Added `tests/e2e/helpers/mcp_client.js`, a reusable MCP stdio helper that invokes the real Gateway process through finite JSONL stdio calls while preserving one workspace/state DB/audit log.
- Added `tests/e2e/mcp_two_agent_workflow.test.js` for the practical flow:
  orchestrator creates coder and reviewer tasks, spawns Gemini restricted-coder, shares a sanitized restricted diff to Claude reviewer, delegates review, records approval, and completes the orchestration.
- Updated the operator guide to show the real `agent.*`, `artifact.share`, and reviewer flow with `taskId` passed from `task.assign`.
- Updated the changelog. Closes K/0/4.

## Why
- Previous E2E coverage used internal services directly. This task proves the usable operator path through the actual MCP stdio Gateway surface.

## Decisions Taken
- The helper starts a short-lived Gateway process per MCP request instead of keeping one interactive pipe open. The Gateway's existing stdio behavior is already validated with finite JSONL input by `scripts/smoke_mcp.mjs`; reusing that pattern gives real MCP process coverage while sharing the same workspace, SQLite DB, artifact store, and audit log across calls.
- The reviewer task uses `sample-apps` as a non-restricted working repo and receives only sanitized artifact content. The restricted raw artifact is never passed into the reviewer prompt.

## Verification
- `AGENTS_DRY_RUN=1 node --test tests/e2e/mcp_two_agent_workflow.test.js` - passed.
- `AGENTS_DRY_RUN=1 node scripts/smoke_mcp.mjs` - passed.
- `.venv/bin/pytest tests/structure/test_operator_guide.py` - passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - all checks passed.

## Commit
- `03be2a4` - `test(e2e): cover two-agent MCP workflow (K/0/4)`

