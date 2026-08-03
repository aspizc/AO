# Review A_0_5-1 — OK

**Task:** `plan/A/0/05.md`
**Trial:** 1
**Branch:** `feature/A-0-5-first-green-ci`
**Commit:** `7a58d38` — `feat(ci): local ci script and structure tests pass green (A/0/5)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Local CI gate is in place and green. `./scripts/ci.sh` runs structure → gateway → CLI suites in order and exits 0. README documents the command. This is the gate that closes Stage A; only A/0/6 (threat model) remains. Task A/0/5 is closed.

## Checks
- [x] Archivos a crear / modificar — `scripts/ci.sh` (27 lines, +x), `README.md` updated with `## Local Checks` block, `tests/structure/test_ci_script.py` (3 tests).
- [x] Tests requeridos — A-T5.1, A-T5.2, A-T5.3 all present; **additionally** all prior-stage tests run green from the same script as required (`tests/structure tests/cli` + `npm --prefix gateway test`).
- [x] Criterios de aceptacion — every item satisfied (live run below).
- [x] Errores comunes evitados — `set -euo pipefail` present (line 2); explicit "pytest not found" message with exit 2; explicit "node_modules missing" message before lazy `npm install`; no credential-bearing steps; README documents the `pip install -e "cli[dev]"` prerequisite.
- [x] Definition of done — commit on `feature/A-0-5-first-green-ci`; CHANGELOG line for A/0/5 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no real Gemini/Claude/Codex CLI required to run CI: OK.

## Findings
All-green. Live verification on the working tree at `7a58d38`:

- `stat -c '%a' scripts/ci.sh` → `775` ✅ executable.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` →
  - `==> Structure tests (pytest)` → 11 passed
  - `==> Gateway tests (node --test)` → 3 passed
  - `==> CLI tests (pytest)` → 5 passed
  - `==> All checks passed.`
  - `exit=0` ✅.
- `git show --stat 7a58d38` → exactly the 3 files prescribed plus the CHANGELOG entry.

### Decision review (non-blocking)
- `.github/workflows/ci.yml` was **not added**. The spec explicitly marks it optional ("opcional", "Si el operador quiere CI remota"). The coder's decision to defer is in spec and aligned with the global "no push without operator approval" rule (a workflow file is harmless until pushed, but skipping it avoids accidentally arming CI before the operator decides). Welcome.
- The script uses `chmod 775` (instead of the more common `755`). Not a spec issue; the executable bit is what the test checks. FYI only.

## Stage A status note (FYI, not part of A/0/5's verdict)
Stage A exit criteria from `plan/A/README.md` are:
- [x] Estructura de carpetas commiteada — A/0/0.
- [x] `npm --prefix gateway test` and `pytest cli/` pass — A/0/2 + A/0/3.
- [x] `./scripts/ci.sh` green — **closed by this task**.
- [x] `docs/architecture.md`, ADRs 001-003 — A/0/4.
- [ ] `docs/threat-model.md` — pending in A/0/6.

A/0/6 (threat model) is still needed to fully close Stage A.

## Next step
OK → coder advances to **A/0/6 — Threat model and abuse cases** (`plan/A/0/06.md`). New branch: `feature/A-0-6-threat-model`, cut from `develop`.
