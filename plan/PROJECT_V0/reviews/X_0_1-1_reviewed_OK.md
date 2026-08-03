# Review X_0_1-1 — OK

**Task:** plan/X/0/01.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** 65c0c08 — docs(prompts): add MVP2 orchestrator prompt (X/0/1)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
`prompts/orchestrator_mvp2_two_agent.md` instructs an MCP host to run the
supervised two-agent flow (Codex coder `gpt-5`/`medium` + Claude reviewer
`claude-opus-4-7`), with the full spawn/ask/view → sanitized handoff → async
approval → kill/complete sequence, and explicitly defers security authority to
the Gateway policy. All acceptance criteria met; structure tests + CI green.
Verdict: **OK**.

## Checks
- [x] Archivos a crear / modificar — `prompts/orchestrator_mvp2_two_agent.md`, profile `README.md` (links the prompt), `tests/structure/test_mvp2_orchestrator_prompt.py`, CHANGELOG.
- [x] Tests requeridos (ran: `pytest tests/structure/{test_mvp2_orchestrator_prompt,test_orchestrator_prompt}.py` → 14/14; `./scripts/ci.sh` → all checks passed). Structure test enforces the prompt contract.
- [x] Criterios de aceptacion — describes coder Codex (`gpt-5`/`medium`) + reviewer Claude (`claude-opus-4-7`) with explicit agent/role/model fields; supervised sequence (spawn/ask/view) + sanitized handoff + async approvals; reaffirms "The Gateway policy is the authority"; linked from the profile README.
- [x] Errores comunes evitados — prompt is not the security boundary (policy is); reviewer never receives raw restricted; sanitization step between coder and reviewer is explicit; approvals are async (`approval.request` + `poll`/`wait`, pending = not granted).
- [x] Definition of done — commit on branch, conventional message references X/0/1, CHANGELOG line. PR draft deferred (project no-push pattern).
- [x] Global invariants — English; no push; `agents-gateway` referenced; no `orchestrator/` process (ADR-002 — prompt/config only); no restricted paths; Codex prohibited on restricted reaffirmed.

## Findings
Accurate, on-spec system prompt. Security framing is correct (Gateway policy authoritative; prompt is guidance), model defaults are stated for host guidance while policies remain the runtime source of truth, and supervised tmux operator hooks (`session.attach_info`, `session.intervention_note`) are included. The runbook link target is X/0/2 (next task).

`plan/W/` specs still carry the coder's uncommitted working-tree edits — left untouched per operator decision.

## Next step
- OK → coder advances to X/0/2 (MVP2.0 operator runbook), the last Stage X task.
