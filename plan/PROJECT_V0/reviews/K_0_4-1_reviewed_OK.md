# Review K_0_4-1 — OK

**Task:** plan/K/0/04.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** 03be2a4 — test(e2e): cover two-agent MCP workflow (K/0/4)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
End-to-end two-agent usability flow exercised through the real MCP stdio Gateway
(not internal services): orchestrator assigns coder + reviewer tasks, spawns the
Gemini restricted-coder, shares a sanitized restricted diff to the Claude
reviewer, delegates review, records approval, and completes the orchestration.
All acceptance criteria met; full CI green. Verdict: **OK**. This closes Stage K.

## Checks
- [x] Archivos a crear / modificar — `tests/e2e/helpers/mcp_client.js` (reusable MCP stdio helper driving `gateway/src/mcp_server.js`), `tests/e2e/mcp_two_agent_workflow.test.js`, `docs/operator-guide.md` (real `agent.*`/`artifact.share`/reviewer flow with `taskId` from `task.assign`), CHANGELOG.
- [x] Tests requeridos (ran: `AGENTS_DRY_RUN=1 node --test tests/e2e/mcp_two_agent_workflow.test.js` → 1/1 pass; `pytest tests/structure/test_operator_guide.py` → 4/4; `./scripts/ci.sh` → all checks passed).
- [x] Criterios de aceptacion — orchestrator+coder+reviewer runs over real MCP stdio; coder/reviewer appear as separate SESSION_STARTED entries (gemini-cli/restricted-coder + claude-code/reviewer, `test:148-150`); raw restricted never reaches orchestrator (`artifact.get` → `POLICY_DENIED`, `test:64`) nor reviewer (sanitized `internal`, SECRET absent, `test:79-80,152-153`); flow needs no network or real CLIs (dry-run); operator guide validated by structure test.
- [x] Errores comunes evitados — drives real `tools/call`, not `services.*`; reviewer prompt uses only sanitized content; reviewer task on non-restricted `sample-apps`; `approval.respond` issued by `operator-cli`, not the orchestrator.
- [x] Definition of done — acceptance criteria met, tests green, CHANGELOG line "Closes K/0/4". Working tree is clean (the K/0/3 finding was resolved). PR draft deferred to operator (project-wide no-push pattern). **Closes Stage K.**
- [x] Global invariants — English; no push; no restricted paths; no `orchestrator/` dir; helper captures stderr separately so stdout stays MCP-only; secret never leaks to orchestrator/reviewer payloads.

## Findings
All green for the K/0/4 deliverable. Two observations outside this task's scope, surfaced for the operator (not blocking K/0/4):
1. The helper starts a short-lived Gateway process per MCP request (sharing one workspace/DB/audit log) rather than holding one interactive pipe. Documented and reasonable — it still exercises the real stdio surface end-to-end.
2. The preceding commit `41394eb docs(plan): add task-less session stage (W)` committed the entire `plan/` tree into git, **including review working-notes** (`*_to_review.md`, the `*_reviewed_OK.md` verdicts, and `K_0_3-1_to_check_by_human.md`). Per the reviewer contract these are ephemeral notes between agents and should not be version-controlled. Recommend the operator decide whether `plan/reviews/` belongs in history or should be git-ignored. This is in a separate commit, not part of K/0/4.

## Next step
- OK → Stage K is complete. The practical MCP two-agent flow is proven end-to-end in dry-run.
