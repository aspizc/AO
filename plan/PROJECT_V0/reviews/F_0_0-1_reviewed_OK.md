# Review F_0_0-1 — OK

**Task:** `plan/F/0/00.md`
**Trial:** 1
**Branch:** `feature/F-0-0-sqlite-initial-migration`
**Commit:** `6331fe3` — `feat(state): add initial sqlite migration (F/0/0)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Initial SQLite migration `001_initial.sql` landed: all 8 domain tables, FKs, CHECK constraints, indexes, and idempotent `schema_migrations` registration. Migration is idempotent and FK enforcement is live-verified. 5 migration tests + 129 total gateway tests pass. Task F/0/0 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/migrations/001_initial.sql`, `tests/gateway/sqlite_migrations.test.js` (5 tests).
- [x] Tests requeridos — idempotent, all domain tables exist, FKs enabled; plus bonuses (indexes created, schema_migrations records `001_initial`). All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — `IF NOT EXISTS` everywhere (idempotent); FKs present (`tasks→orchestration_sessions`, `sessions→tasks`, `artifacts.sanitized_from→artifacts`); CHECK constraints enforced in SQLite (status/classification enums).
- [x] Definition of done — commit on `feature/F-0-0-sqlite-initial-migration`; CHANGELOG line for F/0/0 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `6331fe3`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 129 # pass 129 # fail 0`; `==> All checks passed.` exit 0.
- FK enforcement live probe: inserting a `tasks` row with a `trace_id` not in `orchestration_sessions` → `FOREIGN KEY constraint failed` ✅ (FKs actually enforced, not just declared).
- `migration_is_idempotent` confirms a second `db.exec(sql)` on the same file does not fail (all `CREATE ... IF NOT EXISTS` + `INSERT OR IGNORE`).
- Schema aligns with the B/0/3 JSON schemas: classification enum `unrestricted|internal|restricted`, approval status `pending|granted|denied|expired`, `artifacts.sanitized_from` self-reference for the sanitization lineage, `policy_decisions.context` as TEXT (JSON blob). Consistent — the SQL and the JSON-Schema contract won't diverge.
- `git show --stat 6331fe3` → exactly the 2 prescribed files plus the CHANGELOG entry.

### Decision review (non-blocking)
- Test loads `better-sqlite3` via `createRequire(gateway/package.json)` and resolves the migration path with `import.meta.url` — cwd-independent, works from repo root and `npm --prefix gateway test`. Consistent with the B/0/3 / B/0/4 pattern. Welcome.
- `PRAGMA foreign_keys` test checks the connection that ran the migration. Note this is per-connection state, not a persisted schema property — it confirms the migration sets the pragma and the live probe above confirms enforcement actually fires. Adequate.

### Reminder: state.js migrations-path fix (carried from G/0/0 review)
Now that a real migration exists in `gateway/migrations/`, the latent bug flagged in the G/0/0 review becomes load-bearing: `gateway/src/core/state.js` line 7 resolves the migrations dir with **cwd-relative** `path.resolve("gateway", "migrations")`. Under `npm --prefix gateway` (cwd `gateway/`) that becomes `gateway/gateway/migrations` and `001_initial.sql` would **not** be applied at boot. **F/0/1** (the state-init hardening task) MUST switch `state.js` to a module-relative path (`fileURLToPath(import.meta.url)` → `../migrations`). This migration file is correct; the loader that consumes it is the thing to fix.

## Stage F status
- [x] F/0/0 Initial SQLite migration — **closed by this task**
- [ ] F/0/1 (state init/repo) — pending; **must fix the `state.js` migrations-path resolution**
- [ ] F/0/2, F/0/3 pending

## Next step
OK → coder advances to **F/0/1** (`plan/F/0/01.md`). New branch `feature/F-0-1-*` cut from `develop`. **Critical for F/0/1:** make `state.js` resolve `gateway/migrations/` module-relatively so `001_initial.sql` actually applies at Gateway boot.
