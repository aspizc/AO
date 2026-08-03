# Review Y_0_3-1 — OK

**Task:** plan/Y/0/03.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** 6fe0c60 — docs(mvp2): add code apply autonomous scope (Y/0/3)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
The `code.apply` post-review approval gate is defined for the MVP2 coder+reviewer
flow and subscribed to the Q/0/5 auto-approval mechanism: default requires a
human, `AGENTS_AUTOAPPROVE=code.apply` auto-grants it, but a reviewer KO stops
the flow and push/dependency/restricted are never auto-granted. All acceptance
criteria met; tests + CI green. Verdict: **OK**.

## Checks
- [x] Archivos a crear / modificar — `prompts/orchestrator_mvp2_two_agent.md` (code.apply gate + Autonomous Mode), `client-config/profiles/codex-coder-claude-reviewer/.env.example` (`AGENTS_AUTOAPPROVE`), `docs/mvp2-orchestrator-runbook.md` (autonomous section + audit guidance), `tests/gateway/code_autoapprove_scope.test.js`, CHANGELOG.
- [x] Tests requeridos (ran: `node --test tests/gateway/code_autoapprove_scope.test.js` → 4/4; `pytest tests/structure/{test_mvp2_orchestrator_prompt,test_mvp2_runbook,test_mvp2_mcp_profile}.py` → 18/18; `AGENTS_AUTOAPPROVE=code.apply node scripts/smoke_mvp2.mjs` → dry-run OK; `./scripts/ci.sh` → all checks passed). Cases: pending when scope absent, auto-granted with scope, never grants protected push even with scope, restricted never auto-granted.
- [x] Criterios de aceptacion — post-review acceptance uses `approval.request({ action: "code.apply" })`; default requires human; `AGENTS_AUTOAPPROVE=code.apply` auto-grants with audit; reviewer KO stops the flow and `git.push.protected`/`dependency.change`/restricted are never auto-granted.
- [x] Errores comunes evitados — does not reimplement auto-grant (reuses Q/0/5); does not auto-accept KO'd reviewer work (prompt: "If the reviewer returns KO … do not request or rely on `code.apply`"); push/dependency/restricted never auto; mode is not default.
- [x] Definition of done — commit on branch, conventional message references Y/0/3, CHANGELOG line. PR draft deferred (project no-push pattern).
- [x] Global invariants — English; no push (prompt explicitly: orchestrator never pushes autonomously, work on a branch); approval stays async; human authority preserved for dangerous/restricted; no restricted paths.

## Findings
Clean scope definition layered on the Q/0/5 mechanism. The prompt's Autonomous Mode section is precise: autonomous mode only skips the human pause for the post-review `code.apply` gate, the reviewer still reviews and records `review_notes`, a reviewer KO/blocking finding stops the flow even when enabled, work stays on a branch, and `git.push.protected`/`dependency.change` are never auto-assumed. The test confirms protected push and restricted context stay pending even with the scope listed. The autonomous smoke run is green.

Process note: `plan/README.md` and `plan/W/` still carry the coder's uncommitted working-tree edits — left untouched per operator decision.

## Next step
- OK → the MVP2 coder+reviewer flow has its `code.apply` autonomous scope; combine with `plan.apply` (Z/0/4) via `AGENTS_AUTOAPPROVE=plan.apply,code.apply`.
