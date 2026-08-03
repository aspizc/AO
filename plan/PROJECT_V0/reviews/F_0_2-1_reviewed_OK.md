# Review F_0_2-1 — OK

**Task:** `plan/F/0/02.md`
**Trial:** 1
**Branch:** `feature/F-0-2-domain-repositories`
**Commit:** `11fee28` — `feat(state): add domain repositories (F/0/2)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Seven repository modules (one per table) landed under `gateway/src/core/repositories/`, all using prepared statements with named params. `policy_decisions` is append-only (no update API), FK violations propagate, and connection access stays behind `getDb()`. 6 repository tests + 141 total gateway tests pass. Task F/0/2 is closed.

## Checks
- [x] Archivos a crear / modificar — `orchestration_repo.js`, `task_repo.js`, `session_repo.js`, `artifact_repo.js`, `message_repo.js`, `policy_decision_repo.js`, `approval_repo.js`, `tests/gateway/domain_repositories.test.js` (6 tests).
- [x] Tests requeridos — create/get orchestration, create task under trace, FK violation fails, policy-decision append-only; plus bonuses (all-modules-expose-create, full session/artifact/message/approval round-trip). All green.
- [x] Criterios de aceptacion — every item satisfied (audits below).
- [x] Errores comunes evitados — no connection exported (only `getDb()` getters/setters); **no `UPDATE policy_decisions`** (grep-confirmed); **no string-concatenated SQL** (grep-confirmed — all prepared with `@named` params); no manual BEGIN/COMMIT (uses repo functions over the F/0/1 transaction wrapper).
- [x] Definition of done — commit on `feature/F-0-2-domain-repositories`; CHANGELOG line for F/0/2 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `11fee28`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 141 # pass 141 # fail 0`; `==> All checks passed.` exit 0.
- `grep -rn "UPDATE policy_decisions" gateway/src/core/repositories/` → no matches; `policy_decision_repo.js` exposes only `insertDecision` / `getDecisionById` / `listDecisionsByTrace`. Append-only invariant holds (audit-log integrity, TM-09).
- `grep -rnE '\$\{|" \+ |\+ "' gateway/src/core/repositories/` → no matches → **no SQL injection surface** (every query is a prepared statement with named/positional params).
- `foreign_key_violation_fails` confirms a `tasks` insert with an unknown `trace_id` throws — the F/0/0 FK constraint is exercised through the repo layer.
- Full round-trip test creates orchestration → task → session → artifact → message → approval and lists each by trace — confirms all 7 repos write/read correctly against the real schema.
- `git show --stat 11fee28` → the 7 repo modules + the test + CHANGELOG.

### Decision review (non-blocking)
- Repos return DB rows with raw column names (`session_id`, `assigned_role`, ...) rather than mapping to the camelCase domain shape. Coder flagged this; acceptable for the first repo layer — a mapping/serialization layer can sit in `services/` (J stage) where MCP responses are built. Keeps the repo layer thin and auditable.
- Update helpers added only for mutable lifecycle tables (`orchestration_sessions`, `tasks`, `sessions`, `approvals`); none for `policy_decisions`/`messages`/`artifacts` (write-once). Correct alignment with the data model.
- The spec's example test had an `await import(...)` inside a non-async function (would not run); the coder replaced it with top-level imports + a `typeof updateDecision === "undefined"` assertion. Correct fix.

## Stage F status
- [x] F/0/0 Initial SQLite migration
- [x] F/0/1 State initialization (+ migrations-path fix)
- [x] F/0/2 Domain repositories — **closed by this task**
- [ ] F/0/3 pending (last task of Stage F)

## Next step
OK → coder advances to **F/0/3** (`plan/F/0/03.md`), the last task of Stage F. New branch `feature/F-0-3-*` cut from `develop`.

> Operator: `C_0_4-1_to_check_by_human.md` (orchestrator-sanitization field) remains the one open human-decision item with downstream impact (Stage M).
