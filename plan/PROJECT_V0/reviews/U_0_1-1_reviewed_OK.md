# Review U_0_1-1 — OK

**Task:** `plan/U/0/01.md`
**Trial:** 1
**Branch:** `feature/U-0-1-v4-acceptance-checklist`
**Commit:** `c1886d0` — `docs: add MVP acceptance checklist (U/0/1)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
MVP acceptance checklist landed at `docs/mvp-acceptance-checklist.md`: all 27 V4 §30 criteria mapped to evidence (test IDs / docs / manual), every status left **unchecked** so a reviewer remains the completion authority. A structure test enforces non-TBD evidence + valid status per row. CI green. Task U/0/1 is closed.

## Checks
- [x] Archivos a crear / modificar — `docs/mvp-acceptance-checklist.md`, `tests/structure/test_acceptance_checklist.py`.
- [x] Tests requeridos — checklist exists, each item has evidence. All green.
- [x] Criterios de aceptacion — every V4 §30 criterion represented (27 rows); **no items checked without evidence** (0 `[x]`); structure test green.
- [x] Errores comunes evitados — nothing marked `[x]` without evidence (all `[ ]`); V4 criteria not silently moved to post-MVP; security items reference TM-ids; IDE-specific V4 criterion mapped to the host-agnostic config + operator guide (with the project's out-of-scope rationale).
- [x] Definition of done — commit on `feature/U-0-1-v4-acceptance-checklist`; CHANGELOG line for U/0/1 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `c1886d0`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → gateway 292 / e2e 1 / CLI 29 / structure incl. new test; `==> All checks passed.` exit 0.
- `grep -cE "^\| [0-9]+ \|" docs/mvp-acceptance-checklist.md` → **27** rows (the coder used the real V4 §30 list, not the spec's 10-row illustrative example).
- `grep -cE "\[x\]"` → **0** — nothing prematurely checked; the doc explicitly states a reviewer (not the implementer) must verify. Correct: this is a contract, and checking items is a deliberate human/reviewer act backed by passing evidence.
- The structure test asserts every numbered row has a non-empty criterion, non-TBD evidence, and a `[ ]`/`[x]` status — so the checklist can't silently degrade.
- References open human-check files where they affect acceptance interpretation — useful traceability.
- `git show --stat c1886d0` → exactly the checklist + the structure test + CHANGELOG.

### Decision review (non-blocking)
- Kept all statuses `[ ]` even where evidence already exists. This is the right call per the task ("a reviewer must verify, not the implementer") — but note this means the checklist is a **living gate**: as U/0/2..U/0/4 land and the operator/reviewer confirms each criterion, items should be checked with their now-passing evidence. The MVP isn't "done" until this checklist is fully `[x]` with green evidence.

## Stage U status
- [x] U/0/0 Restricted-flow E2E
- [x] U/0/1 V4 acceptance checklist — **closed by this task**
- [ ] U/0/2, U/0/3, U/0/4 pending — incl. **U/0/4 bypass regression** (one test per TM-id) and the final MVP close-out where this checklist gets verified to all-green.

## Next step
OK → coder advances to **U/0/2** (`plan/U/0/02.md`). New branch `feature/U-0-2-*` cut from `develop`.

> Operator reminder: the checklist's security rows (TM-ids) will be satisfied by **U/0/4 bypass regression**, which locks the `N_0_2` visibility matrix. The `C_0_4` / `N_0_2` human-checks remain the items most worth resolving before U/0/4 to avoid re-baselining. 6 human-check files in `plan/reviews/`.
