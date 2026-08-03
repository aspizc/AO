# Review K_0_2-1 — OK

**Task:** plan/K/0/02.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** d69f796 — feat(agent): expose MCP agent runtime tools (K/0/1 K/0/2 K/0/3)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
Bounded agent operations via `withTimeout` (configurable `AGENTS_AGENT_TIMEOUT_MS`,
600s default) applied server-side in `AgentService.delegate`/`ask`, plus
structured MCP errors that surface the original `code` without stack traces.
All acceptance criteria met; full CI green. Verdict: **OK**.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/services/_with_timeout.js` (with `clearTimeout`), `agentTimeoutMs` added to `config.js`, `delegate`/`ask` wrapped in `agent_service.js`, error codes standardized in `tool_helpers.js`, documented in README + `client-config/README.md`.
- [x] Tests requeridos (ran: `npm --prefix gateway test`; result: 305/305 pass). `tests/gateway/agent_errors.test.js` covers timeout→`TIMEOUT`, fast resolve, and "tool errors expose the original code without stack traces".
- [x] Criterios de aceptacion — long ops time out with `code: "TIMEOUT"` (`_with_timeout.js:6`); MCP response carries `error`/`code`/`message`, no stack (`tool_helpers.js:78-87`); audit `ERROR` includes `where` + `error` (`agent_service.js:50-59`).
- [x] Errores comunes evitados — `clearTimeout` via `promise.finally`; no `err.stack` returned to the client; timeout is env-configurable, not hardcoded.
- [x] Definition of done — branch + commit present, CHANGELOG line "Closes K/0/2", tests green. Closes the timeouts/structured-errors portion of Stage K.
- [x] Global invariants — English; no push; no restricted paths; no `orchestrator/` dir; timeout applied once in the service so every adapter path shares one cap.

## Findings
All green. The decision to apply timeouts in `AgentService` (not per-adapter) is sound — a single server-side cap covers every adapter. Cross-cutting branch/working-tree notes are tracked in the K_0_3 verdict.

## Next step
- OK → coder advances. Agent operations are now bounded with clean structured errors.
