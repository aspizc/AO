# Review K_0_1-1 — OK

**Task:** plan/K/0/01.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** d69f796 — feat(agent): expose MCP agent runtime tools (K/0/1 K/0/2 K/0/3)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
The five `agent.*` MCP tools (`delegate`, `spawn`, `ask`, `view`, `kill`) are
exposed via `gateway/src/tools/agent.js` with strict Zod schemas and registered
in `tools/index.js`. Invalid input returns a structured `INVALID_INPUT` error.
All acceptance criteria met; full CI green. Verdict: **OK**.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/tools/agent.js` created with 5 tools; registered in `gateway/src/tools/index.js`.
- [x] Tests requeridos (ran: `npm --prefix gateway test`; result: 305/305 pass). `tests/gateway/tool_agent.test.js` covers registration, `INVALID_INPUT` on missing args, and the dry-run spawn→ask→view→kill cycle.
- [x] Criterios de aceptacion — MCP exposes 5 agent tools; invalid inputs → `INVALID_INPUT` (`tool_helpers.js:65-72`); dry-run cycle works through the tools.
- [x] Errores comunes evitados — policy is not duplicated in the tool layer; tools validate input shape only, service+adapter keep policy-before-action.
- [x] Definition of done — branch + commit present, CHANGELOG line "Closes K/0/1" (combined commit), tests green. PR draft deferred to operator (no push, consistent with project pattern).
- [x] Global invariants — English; no `git push` (branch local); no restricted paths; no `orchestrator/` dir; errors returned structured, never crash the MCP server.

## Findings
All green for this task's deliverables. Two cross-cutting observations (see K_0_3 verdict for the action item):
- The three K tasks were implemented in one commit on the combined branch `feature/K-0-agent-mcp-tools-runtime` rather than the per-task branch `feature/K-0-1-agent-mcp-tools`. Defensible given the tight dependency chain (K/0/3 explicitly anticipates K/0/1 and K/0/2 being implemented together) — noted, not blocking.
- `agent.delegate`/`agent.spawn` require `taskId` (the spec sketch had it optional). This is the K/0/3-recommended MVP path and is the subject of the open human-check; it does not affect this task's criteria.

## Next step
- OK → coder advances. The K MCP tool surface is in place.
