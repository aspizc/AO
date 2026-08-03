# Review A_0_6-1 — OK

**Task:** `plan/A/0/06.md`
**Trial:** 1
**Branch:** `feature/A-0-6-threat-model`
**Commit:** `f887257` — `docs(security): add threat model with 11 abuse cases (A/0/6)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Threat model with all 11 required categories (TM-01 to TM-11) landed, each with the prescribed structure (description, attacker capability, primary control, defense in depth, `Tested by:`). Cross-links from `docs/architecture.md` and `README.md` are wired. Live `./scripts/ci.sh` is green. **This task closes Stage A.**

## Checks
- [x] Archivos a crear / modificar — `docs/threat-model.md` (154 lines, 11 TM sections), `docs/architecture.md` (+5 lines for "Threat model" pointer), `README.md` (+1 line under Documentation), `tests/structure/test_threat_model.py` (4 tests).
- [x] Tests requeridos — A-T6.1, A-T6.2, A-T6.3, A-T6.4 all present and green via `./scripts/ci.sh`.
- [x] Criterios de aceptacion — every item satisfied (see below).
- [x] Errores comunes evitados — every threat has `Tested by:` (verified by test); TM-11 (approval wait DoS) present and references Q/0/4; every threat names a Primary control; all 11 threats are technical security, no project-management risk.
- [x] Definition of done — commit on `feature/A-0-6-threat-model`; CHANGELOG line for A/0/6 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component (TM-08 reinforces orchestrator privilege limits): OK.

## Findings
All-green. Live verifications on the working tree at `f887257`:

- `grep -E "^### TM-" docs/threat-model.md | wc -l` → `11` ✅ (TM-01 prompt injection, TM-02 raw restricted leak, TM-03 filesystem bypass, TM-04 cwd bypass, TM-05 tmux intervention, TM-06 sanitizer failure, TM-07 approval spoofing/replay, TM-08 artifact poisoning, TM-09 cross-trace leakage, TM-10 MCP stdout corruption, TM-11 approval wait DoS).
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `==> All checks passed.` exit 0 (structure + gateway + cli all green).
- `grep -n "threat-model" docs/architecture.md` → line 65 (cross-link present).
- `grep -n "threat-model" README.md` → line 49 (cross-link present).
- "Living document" section present at the bottom of `threat-model.md`, with explicit pointer to `tests/e2e/bypass_regression.test.js` and `U/0/4`.
- Every TM section has a `Tested by:` entry that names a future task identifier (`C/0/2`, `M/0/3`, `Q/0/4`, etc.) or a `U/0/4#...` regression test slug — exactly the pattern the spec invites for planned tests.
- `git show --stat f887257` → exactly the 4 files prescribed plus the CHANGELOG entry.

### Decision review (non-blocking)
- Coder kept TM count at the spec's minimum (11). The spec says "10 categorias minimas"; 11 satisfies. No need to invent more.
- All headings switched to ASCII-only `TM-XX - name` (em-dash replaced with hyphen). Consistent with the project's ASCII-only convention and doesn't break any assertion. Welcome.

## Stage A status
With this OK, Stage A is **fully closed**:

- [x] A/0/0 Folder architecture
- [x] A/0/1 Repo metadata + gitignore + changelog
- [x] A/0/2 Gateway Node scaffold
- [x] A/0/3 Python CLI scaffold
- [x] A/0/4 Architecture docs + ADRs 001-003
- [x] A/0/5 Local CI green
- [x] A/0/6 Threat model with 11 abuse cases

All Stage A exit criteria from `plan/A/README.md` are satisfied.

## Next step
OK → coder advances to **Stage B (Registries and JSON Schemas)**, starting with **B/0/0**. Read `plan/B/README.md` for the stage overview, then `plan/B/0/00.md` for the first task. New branch will follow `feature/B-0-0-*` cut from `develop`.
