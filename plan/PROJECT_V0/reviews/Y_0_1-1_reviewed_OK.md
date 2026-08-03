# Review Y_0_1-1 — OK

**Task:** plan/Y/0/01.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** 8abaec8 — feat(smoke): add MVP2 two-agent operator smoke (Y/0/1)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
`scripts/smoke_mvp2.mjs` runs the MVP2 two-agent flow over MCP stdio (dry-run by
default, real only with `AGENTS_DRY_RUN=0`) and prints a human summary of
agents/effective models, sessions, artifacts, audit path, mode, and result, with
an exit code reflecting success/failure. All acceptance criteria met; tests + CI
green. Verdict: **OK**.

## Checks
- [x] Archivos a crear / modificar — `scripts/smoke_mvp2.mjs`, `README.md` (smoke command), `docs/mvp2-orchestrator-runbook.md` (smoke step + real mode), `tests/structure/test_mvp2_smoke.py`, CHANGELOG.
- [x] Tests requeridos (ran: `node scripts/smoke_mvp2.mjs` → dry-run, `result: OK`, EXIT=0; `pytest tests/structure/test_mvp2_smoke.py` → 3/3; `./scripts/ci.sh` → all checks passed).
- [x] Criterios de aceptacion — runs dry-run by default and OK; prints coder (`codex gpt-5/medium/workspace-write`) + reviewer (`claude-code claude-opus-4-7`), session ids, artifacts (3 recorded + review), audit path, mode, result; exit code reflects success/failure; referenced in README and runbook.
- [x] Errores comunes evitados — default is dry-run (`AGENTS_DRY_RUN==="0" ? "0" : "1"`), real mode fails early if `tmux`/`codex`/`claude` missing; effective models printed; failure → non-zero exit (`fail()`→`process.exit(1)`, `run().catch`→`fail`); real mode kills sessions in the catch before rethrow (no dangling tmux).
- [x] Definition of done — commit on branch, conventional message references Y/0/1, CHANGELOG line. PR draft deferred (project no-push pattern).
- [x] Global invariants — English; no push; MVP2 profile/`agents-gateway` used; no `orchestrator/` process; no restricted paths; sanitized reviewer handoff.

## Findings
Clean operator smoke mirroring `smoke_mcp.mjs`'s JSONL-over-stdio pattern. Verified live: dry-run prints the full evidence summary and exits 0; real mode is explicit and guarded by binary checks; failures propagate to a non-zero exit with session cleanup. Leaves artifact/audit paths under `/tmp` and prints them so the operator can inspect evidence.

`plan/W/` specs still carry the coder's uncommitted working-tree edits — left untouched per operator decision.

## Next step
- OK → coder advances to Y/0/2 (MVP2.0 gate + acceptance checklist + ADR), the final task that closes Stage Y and the MVP2.0.
