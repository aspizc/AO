# Review A_0_0-2 — OK

**Task:** plan/PROJECT_V1/A/0/00.md
**Trial:** 2
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** 51b43cb — feat(v1): scaffold LangGraph orchestrator package (PROJECT_V1 A/0/0)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
Trial-1's out-of-scope concern is resolved: the `orchestrator-langgraph/` scaffold
commit is now scaffold-only, and the interactive-orchestration skill was split
into its own commit (`ee79af8`). Scaffold meets every acceptance criterion;
tests + CI green. Verdict: **OK**.

## Checks
- [x] Archivos a crear — scaffold complete: `pyproject.toml`, package `__init__.py` (root + `client`/`graphs`/`nodes`), `tests/__init__.py`, `tests/structure/__init__.py`, `tests/structure/test_langgraph_layout.py`.
- [x] Tests requeridos (ran: `pytest orchestrator-langgraph/tests/structure/test_langgraph_layout.py` → 3/3; `./scripts/ci.sh` → all checks passed). Includes the dirs/pyproject structural checks plus an import test (pythonpath configured in subproject `pyproject.toml`).
- [x] Criterios de aceptacion — full folder tree; `pyproject.toml` (name `orchestrator-langgraph`, Python ≥3.11, `langgraph`+`mcp`); structural test green; no business logic.
- [x] Errores comunes evitados — underscores in the Python package; no business logic; no Temporal/Redis/Postgres.
- [x] Verificacion Gateway contract inmutable — `gateway/src/tools/**`/MCP schemas untouched in `51b43cb`.
- [x] Definition of done — scaffold commit on branch, conventional message references PROJECT_V1 A/0/0, CHANGELOG `## Unreleased` updated. PR draft deferred.
- [x] Global invariants — English; no push; `orchestrator-langgraph/` is the V1-sanctioned non-privileged MCP client (not ADR-002's forbidden `orchestrator/`); no restricted paths.

## Findings
Clean fix. The trial-1 finding (skill folded into the scaffold commit) is addressed: `51b43cb` contains only the scaffold + its CHANGELOG line, and the skill now lives in a dedicated commit `ee79af8 docs(skills): add interactive Gateway orchestration skill`. Scaffold is correct and green; the LangGraph package remains a Gateway client, contract untouched.

**Still open for the operator (does not affect this task's verdict):** the skill is kept **tracked** under `.codex/skills/` (now also `tdd-implementation/`), while the analogous `.claude/` agent config stays local/untracked and neither is gitignored. Whether tool-specific agent skills belong in the repo is the operator's governance call (raised in the A_0_0-1 verdict); the coder chose to keep them in-repo but isolated their commit.

## Next step
- OK → coder advances to PROJECT_V1 A/0/1. Operator: the `.codex/`-in-repo question remains open (in-repo vs local + `.gitignore`).
