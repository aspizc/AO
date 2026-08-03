# Review U_0_3-1 — OK

**Task:** `plan/U/0/03.md`
**Trial:** 1
**Branch:** `feature/U-0-3-mvp-regression-gate`
**Commit:** `7a5368d` — `test: add MVP regression gate smoke (U/0/3)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
MVP regression gate formalized: `./scripts/ci.sh` now runs structure → gateway → E2E → **MCP stdio smoke** → `policy validate` → CLI, all green in one pass. Host-agnostic smoke (`smoke_mcp.mjs`) verifies `tools/list` over real stdio. Task U/0/3 is closed. Two judgment calls (no ruff/mypy; smoke checks real tools) reviewed below.

## Checks
- [x] Archivos a crear / modificar — `scripts/smoke_mcp.mjs`, `scripts/ci.sh` (+smoke +policy validate), `docs/operator-guide.md` (+optional smoke), `tests/structure/test_regression_gate.py`.
- [x] Tests requeridos — regression-gate structure test green; smoke green.
- [x] Criterios de aceptacion — every item satisfied (live run below).
- [x] Errores comunes evitados — gate is reproducible with declared deps (no undeclared tools); E2E + smoke included; host-agnostic (no IDE dependency).
- [x] Definition of done — commit on `feature/U-0-3-mvp-regression-gate`; CHANGELOG line for U/0/3 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `7a5368d`:

- `node scripts/smoke_mcp.mjs` → `MCP smoke OK`.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → full ordered gate:
  ```
  ==> Structure tests (pytest)   → 50 passed
  ==> Gateway tests (node --test) → # pass 292
  ==> E2E tests (node --test)     → # pass 1
  ==> MCP smoke (stdio tools/list) → MCP smoke OK
  ==> Policy registry validation
  ==> CLI tests (pytest)          → 29 passed
  ==> All checks passed.
  ```
- The gate is genuinely "everything green at once" and **host-agnostic** — the smoke spawns `node ./gateway/src/mcp_server.js` with `AGENTS_DRY_RUN=1` and drives a real `tools/list`, no IDE involved.
- `git show --stat 7a5368d` → smoke + ci.sh + operator-guide + structure test + CHANGELOG.

### Decision review (non-blocking, both sound)
1. **No `ruff`/`mypy`.** The spec's example `ci.sh` lists them, but they are **not declared** in `cli/pyproject.toml` (only `pytest` under `[dev]`), and the project's `ci.sh` never ran them. The coder declined to introduce undeclared tooling that would make the gate non-reproducible (and would require fixing lint across the tree). **None of U/0/3's acceptance criteria require linters** — they require a green, reproducible, host-agnostic gate, which is delivered. Reasonable call.
   - *For the operator:* if Python linting/typing should be part of the MVP gate, that's a small follow-up (add `ruff`/`mypy` to `cli[dev]`, fix findings, add the steps to `ci.sh`). Flagging since the spec mentioned them.
2. **Smoke checks real registered tools** (`orchestration.create`, `task.assign`, `artifact.share`, `approval.request`) instead of the spec sample's `policy.check`. Correct — `policy.check` is an **`agent-run` CLI command**, not a registered MCP tool, so the spec's literal assertion would have failed against the real `tools/list`. Good catch; the smoke asserts tools that actually exist.

## Stage U status
- [x] U/0/0 Restricted-flow E2E
- [x] U/0/1 V4 acceptance checklist
- [x] U/0/2 Final README + MVP scope ADR
- [x] U/0/3 MVP regression gate — **closed by this task**
- [ ] U/0/4 pending — **bypass regression suite (one test per TM-id)**, then MVP close.

The full battery now runs as a single green gate. Only the bypass-regression evidence (U/0/4) remains before the acceptance checklist can be driven to all-green.

## Next step
OK → coder advances to **U/0/4** (`plan/U/0/04.md`), the final task — the bypass regression suite. New branch `feature/U-0-4-*` cut from `develop`. **U/0/4 is the security capstone:** it must add ≥1 bypass test per threat-model TM-id (TM-01..TM-11) and consumes the `N_0_2` visibility matrix as source of truth. I'll scrutinize that each TM-id has a real, failing-if-broken assertion.

> **Operator — last call before U/0/4:** `C_0_4` + `N_0_2` (sanitized-raw policy) directly determine the TM-02/TM-08 bypass expectations U/0/4 will lock. Resolving them now avoids re-baselining. 7 human-check files in `plan/reviews/`.
