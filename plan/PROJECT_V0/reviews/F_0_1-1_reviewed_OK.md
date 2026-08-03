# Review F_0_1-1 — OK

**Task:** `plan/F/0/01.md`
**Trial:** 1
**Branch:** `feature/F-0-1-state-initialization`
**Commit:** `d6c5fb2` — `feat(state): harden initialization and migrations (F/0/1)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
State init hardened: `initState` creates the parent dir, opens SQLite, enables WAL + FKs, applies pending migrations from a **module-relative** path, and caches a singleton. **The cwd-relative migrations-path bug flagged in the G/0/0 and F/0/0 reviews is now fixed and locked by a regression test.** 6 state tests + 135 total gateway tests pass. Task F/0/1 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/core/state.js` (path fix + singleton), `tests/gateway/state_init.test.js` (6 tests).
- [x] Tests requeridos — creates DB, runs migrations, enables FKs; plus bonuses (WAL mode, **module-relative regression**, getDb-requires-init). All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — singleton cached (`if (db) return db`); migrations applied in a transaction (`db.transaction`); WAL enabled.
- [x] Definition of done — commit on `feature/F-0-1-state-initialization`; CHANGELOG line for F/0/1 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `d6c5fb2`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 135 # pass 135 # fail 0`; `==> All checks passed.` exit 0.
- **Carried fix CONFIRMED CLOSED:** `MIGRATIONS_DIR` is now `path.resolve(__dirname, "..", "..", "migrations")` via `fileURLToPath(import.meta.url)` — module-relative, not cwd-relative.
  - Regression test `migrations_are_module_relative_not_cwd_relative` chdir's to `gateway/` and asserts `001_initial` is recorded — exactly the scenario I flagged.
  - Independent live probe (cwd `gateway/`, fresh DB): `orchestration_sessions` table present → migration applied ✅. The bug that would have silently skipped migrations under `npm --prefix gateway` is gone.
- WAL + FK pragmas verified by `enables_wal_journal_mode` and `enables_foreign_keys`.
- `get_db_requires_initialization` confirms `getDb()` throws before `initState`.
- Test uses cache-busted dynamic `import(...?cacheBust=...)` to get isolated module state per test — clean way to exercise the singleton without cross-test bleed.
- `git show --stat d6c5fb2` → `state.js` (+7/-2, the path fix) + the test + CHANGELOG. Minimal, focused diff.

### Decision review (non-blocking)
- `initState` now returns the cached DB if already initialized (`if (db) return db`) instead of reopening — implements the spec's "Cachea singleton" guidance and avoids leaking connections. Tests isolate via `_resetForTests()`. Endorsed.

## Stage F status
- [x] F/0/0 Initial SQLite migration
- [x] F/0/1 State initialization (+ migrations-path fix) — **closed by this task**
- [ ] F/0/2, F/0/3 pending

The G/0/0 stand-in `state.js` is now properly hardened — the planning-conflict that drove `G_0_0-1_to_check_by_human.md` is effectively resolved on the implementation side (state init is now correct regardless of which stage "owns" it). The operator may still want to formally answer the ordering question, but there is no remaining technical debt from it.

## Next step
OK → coder advances to **F/0/2** (`plan/F/0/02.md`) — likely the domain-model repositories over this schema. New branch `feature/F-0-2-*` cut from `develop`.

> Operator: `C_0_4-1_to_check_by_human.md` (orchestrator-sanitization field) is still open and is the one human-decision item with downstream impact (Stage M). `G_0_0-1_to_check_by_human.md` is now technically moot (state init is correct) but you may still want to record the ordering decision.
