# Review X_0_0-1 — OK

**Task:** plan/X/0/00.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** 4dcd966 — feat(config): add MVP2 two-agent MCP profile (X/0/0)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
A host-agnostic MCP profile `client-config/profiles/codex-coder-claude-reviewer/`
wires the Gateway in real mode (`AGENTS_DRY_RUN=0`) against the MVP2 policies
profile, with Codex coder + Claude reviewer, a placeholder repo-roots path, and
a `.env.example` documenting the dry-run rehearsal. All acceptance criteria met;
structure tests + full CI green. Verdict: **OK**.

## Checks
- [x] Archivos a crear / modificar — `profiles/codex-coder-claude-reviewer/{mcp.json,.env.example,README.md}`, `client-config/README.md` (links profile), `tests/structure/test_mvp2_mcp_profile.py`, CHANGELOG.
- [x] Tests requeridos (ran: `pytest tests/structure/{test_mvp2_mcp_profile,test_generic_mcp_config}.py` → 11/11; `./scripts/ci.sh` → all checks passed; JSON parses). Structure tests assert JSON validity, real mode, MVP2 policy dir, placeholder repo path, env docs, profile docs.
- [x] Criterios de aceptacion — real MCP profile with Codex coder + Claude reviewer (models default from the MVP2 policies profile); `AGENTS_POLICIES_DIR=./policies/profiles/mvp2` (Codex enabled, scoped); `.env.example` documents `AGENTS_REPO_ROOTS` (absolute) and the dry-run rehearsal; JSON parseable and the referenced profile exists.
- [x] Errores comunes evitados — `AGENTS_DRY_RUN=0` (real, not left at 1); no hardcoded author repo path (uses `REPLACE_WITH_ABSOLUTE_WORK_REPO_PATH`); points to the MVP2 profile (not the base where Codex is disabled); no IDE-specific config.
- [x] Definition of done — commit on branch, conventional message references X/0/0, CHANGELOG line. PR draft deferred (project no-push pattern).
- [x] Global invariants — English; no push; MCP server named **`agents-gateway`** in the profile; no `orchestrator/` dir/process (ADR-002 honored — config only); no restricted paths.

## Findings
Clean, host-agnostic profile exactly per spec. `mcp.json` uses stdio + `node ./gateway/src/mcp_server.js`, the MVP2 policies dir, and `workspace-write`; `.env.example` correctly tells the operator to flip `AGENTS_DRY_RUN=1` for a safe rehearsal first and to set an absolute `AGENTS_REPO_ROOTS`. Model defaults are kept in the policies profile rather than env (sound — single source of truth).

`plan/W/` specs still carry the coder's uncommitted working-tree edits — left untouched per operator decision.

## Next step
- OK → coder advances to X/0/1 (MVP2.0 orchestrator system prompt), then X/0/2 (operator runbook).
