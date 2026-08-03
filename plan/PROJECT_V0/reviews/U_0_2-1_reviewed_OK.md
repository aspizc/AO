# Review U_0_2-1 — OK

**Task:** `plan/U/0/02.md`
**Trial:** 1
**Branch:** `feature/U-0-2-mvp-docs-closure`
**Commit:** `61ef933` — `docs: close MVP scope docs (U/0/2)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
README rewritten for post-MVP onboarding (quickstart, "orchestrator is a role", out-of-scope) and `ADR-004-mvp-scope.md` added fixing the MVP perimeter. The coder's Codex/message-store deferral is **consistent with the operative plan** (not a unilateral scope cut). CI green. Task U/0/2 is closed; the scope confirmation is routed to the operator.

## Checks
- [x] Archivos a crear / modificar — `README.md` (rewrite), `docs/adr/ADR-004-mvp-scope.md`, `tests/structure/test_mvp_docs.py`.
- [x] Tests requeridos — README has quickstart, ADR-004 exists, README states orchestrator-is-a-role. All green.
- [x] Criterios de aceptacion — README onboards a new operator (quickstart + doc links); ADR-004 fixes MVP/post-MVP scope; no `orchestrator/` component, IDEs out of scope.
- [x] Errores comunes evitados — no `orchestrator/` reference; no IDE-specific config; scope changes pinned in an ADR (ADR-004).
- [x] Definition of done — commit on `feature/U-0-2-mvp-docs-closure`; CHANGELOG line for U/0/2 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK · `agents-gateway` naming: OK.

## Findings
All-green. Live verifications on the working tree at `61ef933`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → gateway 292 / e2e 1 / CLI 29 / structure incl. new test; `==> All checks passed.` exit 0.
- README: line 6 "the orchestrator is a role" disclaimer, line 11 `## Quickstart`, line 77 `Out of scope:` — onboarding shape present, links to operator-guide/threat-model/checklist/ADRs/plan.
- ADR-004: `Status: accepted`, `Date: 2026-05-23`, explicit "MVP defers" section, and a consequence that "future work reaching into deferred scope requires a new ADR".
- `git show --stat 61ef933` → README + ADR-004 + structure test + CHANGELOG.

## Operator decision — `U_0_2-1_to_check_by_human.md` (Codex / message-store deferral): my assessment is the coder is correct

The U/0/2 **task template** (and its sample ADR-004) list Codex adapter and message tools as MVP deliverables. But the **operative plan** is explicit (`plan/README.md`, "Tareas opcionales / fuera de MVP"):

> - **P/0/0** — Codex adapter (diferido hasta que Gemini + Claude esten estables).
> - **S/0/0, S/0/1** — Message store (solo si entra un consumidor real; en MVP usar artifact-mediated).

The project's own convention ("Convenciones globales — re-leer antes de cada tarea") makes `plan/README.md` the authoritative source. So **ADR-004's deferral of Codex + message store matches the operative plan**, and the coder resolved the template-vs-plan conflict in favor of the authoritative document — the right call, transparently flagged. I'm leaving the **formal** scope confirmation to the operator (per protocol), but on the merits the deferral is well-grounded; no rework is implied if the operator agrees.

(Minor: ADR-004's "Decision" section in the spec template mentioned "a Codex stub (I/O/P)". The committed ADR defers Codex; if a Codex *stub* already exists from an earlier P/0/0 it would be worth a one-line note, but per the operative plan P/0/0 is not part of MVP, so deferring is consistent. Non-blocking.)

## Stage U status
- [x] U/0/0 Restricted-flow E2E
- [x] U/0/1 V4 acceptance checklist
- [x] U/0/2 Final README + MVP scope ADR — **closed by this task**
- [ ] U/0/3, U/0/4 pending — final CI gate + bypass regression, then MVP close.

## Next step
OK → coder advances to **U/0/3** (`plan/U/0/03.md`). New branch `feature/U-0-3-*` cut from `develop`.

> Operator: the scope question (`U_0_2`) joins the open set. The two that gate **U/0/4** remain `C_0_4` + `N_0_2` (sanitized-raw policy). 7 human-check files now in `plan/reviews/`. If you can resolve the scope + the two policy items, U/0/3 and U/0/4 can close the MVP cleanly.
