# Review Q_0_0-1 — OK

**Task:** `plan/Q/0/00.md`
**Trial:** 1
**Branch:** `feature/Q-0-0-approval-state-machine`
**Commit:** `1e63d32` — `feat(approvals): add approval state machine (Q/0/0)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Approval state machine landed in the repo: `pending → granted|denied|expired` only, with **triple-layered** replay/double-grant protection (app check + SQL `WHERE status='pending'` + post-update `changes !== 1` race guard). Typed `ApprovalStateError` codes. TM-07 vectors verified live. 254 total gateway tests pass. Task Q/0/0 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/core/repositories/approval_repo.js` (+state machine), `tests/gateway/approval_state.test.js` (6+ tests), backward-compat aliases preserved.
- [x] Tests requeridos — create pending, grant, deny, double-decide → ALREADY_DECIDED, unknown → NOT_FOUND, invalid status → INVALID_STATUS. All green.
- [x] Criterios de aceptacion — only `pending → {granted,denied,expired}`; double-respond rejected; repository is the only state-mutation path (unsafe direct update removed).
- [x] Errores comunes evitados — `UPDATE` is guarded with `WHERE status = 'pending'` (TM-07 at SQL level); single `decideApproval(status)` (no duplicated grant/deny code).
- [x] Definition of done — commit on `feature/Q-0-0-approval-state-machine`; CHANGELOG line for Q/0/0 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `1e63d32`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 254 # pass 254 # fail 0`; `==> All checks passed.` exit 0.
- **TM-07 replay/double-grant probe:**
  - first `decideApproval("ap1","granted")` → `granted` ✅
  - second `decideApproval("ap1","denied")` (replay) → `ALREADY_DECIDED` ✅
  - unknown id → `NOT_FOUND` ✅
  - bogus status → `INVALID_STATUS` ✅
- **Defense in depth on the transition** (3 layers):
  1. app-level: `row.status !== "pending"` → `ALREADY_DECIDED`;
  2. SQL-level: `UPDATE ... WHERE approval_id = ? AND status = 'pending'`;
  3. post-update: `if (result.changes !== 1) throw ALREADY_DECIDED` — this closes the **TOCTOU race** where two concurrent `decideApproval` calls both pass the app check but only one actually mutates the row. Strong.
- Backward compat: `createApproval` now delegates to `createPendingApproval` (rejects non-pending creation), `getApprovalById` aliases `getApproval` — the F/0/2 domain-repository tests still pass.
- `git show --stat 1e63d32` → the repo change + the state test + CHANGELOG.

### Decision review (non-blocking)
- `note` stored in `payload` (no separate column yet) via `COALESCE(?, payload)` so a null note doesn't wipe an existing payload. Reasonable given the F/0/0 schema. If a dedicated `note` column is wanted later, a migration can add it.
- Single `decideApproval(approvalId, status, decidedBy, note)` rather than separate `grant`/`deny` — matches the spec's "no duplicated code" guidance.

## Stage Q status
- [x] Q/0/0 Approval state machine — **closed by this task**
- [ ] Q/0/1..Q/0/4 pending — async `request`/`poll`/`wait`/`respond` tools (TM-07 spoofing, TM-11 wait-DoS bound).

## Next step
OK → coder advances to **Q/0/1** (`plan/Q/0/01.md`). New branch `feature/Q-0-1-*` cut from `develop`. **Reminders for the Q async tools:** `approval.request` must be **non-blocking** (returns `pending` immediately); `approval.wait` must be **bounded by `AGENTS_APPROVAL_MAX_WAIT_MS`** (config from D/0/2) and may return `pending` (TM-11); `approvalId` must be a UUID (F/0/3 `newApprovalId`, TM-07 unguessable); and the orchestrator role is denied `approval.respond` (only the human operator decides — C/0/2 already enforces this).
