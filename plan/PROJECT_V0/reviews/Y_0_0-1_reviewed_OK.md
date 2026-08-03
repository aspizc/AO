# Review Y_0_0-1 — OK

**Task:** plan/Y/0/00.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** ecfb30a — test(e2e): add guarded MVP2 real two-agent flow (Y/0/0)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
A guarded real two-agent E2E (`tests/e2e/mcp_two_agent_real.test.js`) drives
Codex coder (`gpt-5`/`medium`) + Claude reviewer (`claude-opus-4-7`) through the
real MCP stdio Gateway, but only when `AGENTS_E2E_REAL=1` and `tmux`/`codex`/
`claude` exist — otherwise it skips. CI stays deterministic (the test skips).
All acceptance criteria met. Verdict: **OK**.

## Checks
- [x] Archivos a crear / modificar — `tests/e2e/mcp_two_agent_real.test.js`, `scripts/ci.sh` (optional-note), `docs/mvp2-orchestrator-runbook.md` (real-test reference), `tests/structure/test_mvp2_real_e2e.py`, CHANGELOG.
- [x] Tests requeridos (ran: `node --test tests/e2e/mcp_two_agent_real.test.js` → **skipped 1 / fail 0** with reason; `pytest tests/structure/test_mvp2_real_e2e.py` → 3/3; `./scripts/ci.sh` → all green, E2E 17 tests / 16 pass / **1 skipped** / 0 fail, smoke OK).
- [x] Criterios de aceptacion — skips without `AGENTS_E2E_REAL=1` or missing `tmux`/`codex`/`claude` (clear reason); the real path runs the supervised two-agent MCP flow (spawn codex coder gpt-5/medium → sanitized share → claude reviewer opus-4.7 → review notes → kill → complete); asserts coder's real file write, effective models in audit (`codex` + `claude-opus-4-7`), and sanitized-only reviewer access; does not run in CI by default.
- [x] Errores comunes evitados — properly guarded (won't run/fail in CI); uses a temp non-restricted work repo within the allowlist; assertions check verifiable facts (file existence, audit model, sanitization), not model prose; CI does not set `AGENTS_E2E_REAL`.
- [x] Definition of done — commit on branch, conventional message references Y/0/0, CHANGELOG line, runbook references the optional run, CI stays green & deterministic. PR draft deferred (project no-push pattern).
- [x] Global invariants — English; no push; `agents-gateway`/MVP2 profile used; no `orchestrator/` process; no restricted paths; sanitized-only reviewer handoff preserved.

## Findings
Correctly guarded: `skipReason()` returns the skip string unless `AGENTS_E2E_REAL=1` and all three binaries are present, fed to `node:test`'s `{ skip }` option — confirmed it skips in normal mode and under full `ci.sh` (1 skipped, 0 fail). The scenario and assertions match the spec; the real execution path itself is operator-validated (the binaries aren't present in CI), which is exactly the intended design.

`plan/W/` specs still carry the coder's uncommitted working-tree edits — left untouched per operator decision.

## Next step
- OK → coder advances to Y/0/1 (operator smoke `scripts/smoke_mvp2.mjs`), then Y/0/2 (MVP2.0 gate + checklist + ADR) to close the stage.
