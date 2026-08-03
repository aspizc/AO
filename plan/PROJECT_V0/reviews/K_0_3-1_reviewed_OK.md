# Review K_0_3-1 — OK

**Task:** plan/K/0/03.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** d69f796 — feat(agent): expose MCP agent runtime tools (K/0/1 K/0/2 K/0/3)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
The real Gateway tool registry now builds the adapter registry, registers
Gemini, Claude and the dormant Codex adapters, creates `AgentService`, and
exposes the five `agent.*` tools over MCP. Orphan sessions are prevented by
requiring `taskId`; disabled Codex fails closed with `ADAPTER_DISABLED`; the
smoke test fails if `agent.*` disappears; tmux intervention detection is wired
best-effort. All acceptance criteria met; full CI green. Verdict: **OK**, with
one open human-check question and one required cleanup (below).

## Checks
- [x] Archivos a crear / modificar — `tools/agent.js`, `tools/index.js` (adapters + `AgentService` wired), `services/agent_service.js` (orphan-session guard + R/0/1 hook), `tests/gateway/tool_agent.test.js`, `tests/gateway/mcp_bootstrap.test.js`, `scripts/smoke_mcp.mjs`, CHANGELOG.
- [x] Tests requeridos (ran: `npm --prefix gateway test` → 305/305; `AGENTS_DRY_RUN=1 node scripts/smoke_mcp.mjs` → OK; `./scripts/ci.sh` → all checks passed). Required test names all present: `mcp_agent_tools_are_registered`, `agent_spawn_requires_task_id`, `dry_run_spawn_ask_view_kill_cycle`, `disabled_codex_returns_structured_adapter_error`; bootstrap asserts all five `agent.*` in `tools/list`.
- [x] Criterios de aceptacion — 5 tools listed; spawn dry-run returns `sessionId`+`tmuxTarget`+`attachCommand` (`tool_agent.test.js:123-125`); spawn→ask→view→kill works through tools; missing `taskId` → `INVALID_INPUT`, no orphan; disabled Codex → `ADAPTER_DISABLED` (`tool_agent.test.js:152-153`); smoke fails if `agent.spawn`/`agent.ask` absent.
- [x] Errores comunes evitados — adapters wired in the real Gateway (not just in-process service); no reusable `sessionId` returned without persistence; Codex stays disabled; tool errors don't crash the stdio server; logs not to stdout.
- [ ] Definition of done — acceptance criteria + tests green + CHANGELOG done; **but the working tree is not clean** (see Findings #2). PR draft deferred to operator (project-wide no-push pattern).
- [x] Global invariants — English; no push; no restricted paths; no `orchestrator/` dir; intervention detection is best-effort and cannot break the control path (`agent_service.js:69-75`).

## Findings
1. **Open human-check (not decided by reviewer).** `K_0_3-1_to_check_by_human.md` asks whether `taskId` should stay mandatory for all MCP agent execution calls (current implementation) or whether a later migration should allow task-less sessions. The implemented choice (mandatory `taskId`) matches the K/0/3-recommended MVP path and the operator-guide workflow, and is correct as code. Leaving the policy question for the human operator.
2. **Working tree not clean (required cleanup).** `docs/mvp-acceptance-checklist.md` has an uncommitted modification (the K/0/3-K/0/4-U/0/5 usability-gap + Codex-optional notes). The content is sensible and related to this work, but it is not part of commit `d69f796`. Commit it (it reads as belonging to this task) or revert it before starting K/0/4 — do not let it leak into the next task's commit.
3. **Combined branch.** Work landed on `feature/K-0-agent-mcp-tools-runtime` covering K/0/1+K/0/2+K/0/3 in one commit, not the three per-task branches. Defensible given the dependency chain and K/0/3's explicit allowance for K/0/1/K/0/2 being implemented together. Noted, not blocking.

## Next step
- OK → coder may advance to K/0/4, **after** resolving Finding #2 (clean the working tree). The `taskId` policy question (Finding #1) is for the human operator and does not block progress.
