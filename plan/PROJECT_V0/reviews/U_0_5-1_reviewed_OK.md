# Review U_0_5-1 — OK

**Task:** plan/U/0/05.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** 55eb792 — docs: add operational usability gate (U/0/5)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
The operational-usability gate is in place: CI exercises the real two-agent MCP
E2E, the acceptance checklist now cites that evidence, the README documents the
supported `orchestrator -> Gateway MCP -> coder + reviewer` flow, and Codex is
clearly marked optional/post-MVP (P/0/3). A structure test locks all of this.
All acceptance criteria met; full CI green. Verdict: **OK**.

## Checks
- [x] Archivos a crear / modificar — `tests/structure/test_operational_usability_gate.py` (new), `docs/mvp-acceptance-checklist.md`, `README.md`, `CHANGELOG.md`. `scripts/ci.sh`/`smoke_mcp.mjs` correctly left unchanged (see Findings).
- [x] Tests requeridos (ran: `pytest tests/structure/{test_operational_usability_gate,test_acceptance_checklist,test_regression_gate,test_operator_guide}.py` → 14/14; `./scripts/ci.sh` → all checks passed, incl. E2E with `mcp_two_agent_workflow.test.js` and MCP smoke).
- [x] Criterios de aceptacion — CI includes the real two-agent MCP E2E (`ci.sh:25` globs `tests/e2e/**/*.test.js`); checklist criteria 7/12/15-17/19 cite `tool_agent.test.js` + `mcp_two_agent_workflow.test.js`; README + operator guide promise no non-existent tools (guide validated by `test_operator_guide.py`); Codex optional unless P/0/3 (README + checklist note).
- [x] Errores comunes evitados — does not declare MVP ready on in-process services alone; checklist items left `[ ]` (not self-marked); Codex not made an MVP requirement; no Cursor/Antigravity IDE config added.
- [x] Definition of done — acceptance met, tests green, CHANGELOG line "Closes U/0/5". PR draft deferred to operator (project-wide no-push pattern).
- [x] Global invariants — English; no push; working tree clean; no `orchestrator/` dir; no restricted paths.

## Findings
All green. Sound judgment calls worth recording:
1. **`ci.sh` intentionally not modified.** It already runs `node --test tests/e2e/**/*.test.js` (now including the two-agent test) and `scripts/smoke_mcp.mjs`. The new structure test asserts both stay wired, so the gate is enforced without redundant edits. Correct.
2. **Operator guide not re-touched here.** It was already updated to the real `agent.*`+`taskId` flow in K/0/4 (`03be2a4`) and is validated by `test_operator_guide.py`; the acceptance criterion is about the end state, which holds.
3. **Criterion 15** reworded to "Both primitives exist **and are reachable through MCP**" — exactly the adapter-exists vs MCP-can-execute distinction the spec asked for.
4. **Combined branch** — this lands on `feature/K-0-agent-mcp-tools-runtime` (stacked on the K work and the review-history commit) rather than `feature/U-0-5-operational-usability-gate`. Consistent with how the K chain was handled; noted, not blocking.

## Next step
- OK → operational usability gate is closed. Real MCP two-agent usability is now a CI-enforced, documented requirement.
