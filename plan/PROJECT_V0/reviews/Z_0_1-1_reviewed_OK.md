# Review Z_0_1-1 — OK

**Task:** plan/Z/0/01.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** b0de791 — docs(prompts): add planning loop prompts (Z/0/1)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
Three planning-loop prompts added: planner (draft+review with the
`OPEN DECISIONS / QUESTIONS FOR HUMAN` escalation format), apply-coder
(restricted to `plan/**`, TODO markers for open decisions), and the orchestrator
loop addendum. All reaffirm that the Gateway policy is the authority. All
acceptance criteria met; structure tests + CI green. Verdict: **OK**.

## Checks
- [x] Archivos a crear / modificar — `prompts/planner_system_prompt.md`, `prompts/planner_apply_coder_prompt.md`, `prompts/orchestrator_planning_loop.md`, `tests/structure/test_planner_loop_prompts.py`, CHANGELOG.
- [x] Tests requeridos (ran: `pytest tests/structure/test_planner_loop_prompts.py` → 4/4; `./scripts/ci.sh` → all checks passed).
- [x] Criterios de aceptacion — planner (draft+review), coder (apply), and orchestrator (loop) prompts exist; planner escalates via `## OPEN DECISIONS / QUESTIONS FOR HUMAN`; coder is restricted to `plan/**` and leaves `<!-- TODO(open-decision:<id>): pending human decision -->` markers; all reaffirm "Gateway policy is the authority".
- [x] Errores comunes evitados — planner does not resolve scope/safety/policy decisions itself (escalates); coder limited to `plan/**` (never `policies/`/`gateway/`/`tests/`, no push, no commits without operator); `OPEN DECISIONS` format present; prompt is not the security boundary.
- [x] Definition of done — commit on branch, conventional message references Z/0/1, CHANGELOG line. PR draft deferred (project no-push pattern).
- [x] Global invariants — English; no push; no `orchestrator/` process (loop is a host role); no restricted paths.

## Findings
Precise role prompts. Notably, the apply-coder prompt is **stricter than policy by instruction** (`plan/**`-only, no `policies/`/`gateway/`, no push/commit without operator) — this is exactly the workflow discipline that the Z/0/0 verdict flagged the `internal` policy classification does not enforce on its own. Defense is now layered: policy gates the repo, prompts confine the writes, and the human approval gate + branch workflow remain. Escalation uses the exact `OPEN DECISIONS / QUESTIONS FOR HUMAN` heading the orchestrator relays to the human.

Process note: `plan/README.md` and `plan/W/` still carry the coder's uncommitted working-tree edits — left untouched per operator decision.

## Next step
- OK → coder advances to Z/0/2 (planning MCP profile), then Z/0/3 (planning runbook + smoke) to close Stage Z.
