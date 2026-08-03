# Review Q_0_1-1 — OK

**Task:** `plan/Q/0/01.md`
**Trial:** 1
**Branch:** `feature/Q-0-1-async-approval-service`
**Commit:** `bb89b7d` — `feat(approvals): add async approval service (Q/0/1)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Async-first approval service landed: `request` returns `pending` immediately (non-blocking), `respond` is idempotent and only accepts `granted|denied`, `poll` is a cheap read, and an `approvalBus` EventEmitter emits once per decision (for Q/0/4's `wait`). Audit `APPROVAL_REQUIRED/GRANTED/DENIED`. 261 total gateway tests pass. Task Q/0/1 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/services/approval_service.js`, `tests/gateway/approval_service.test.js`.
- [x] Tests requeridos — request returns pending, grant/deny, double-respond idempotent, poll, audit events. All green.
- [x] Criterios de aceptacion — `request` returns in ms with `pending`; `respond` idempotent; `poll` cheap; full audit.
- [x] Errores comunes evitados — `respond` does **not** throw on double-respond (returns current status); bus emitted on the first transition (Q/0/4 dependency); operator `respond` limited to `granted|denied` (`expired` rejected).
- [x] Definition of done — commit on `feature/Q-0-1-async-approval-service`; CHANGELOG line for Q/0/1 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK · approval async-first (`request` never blocks).

## Findings
All-green. Live verifications on the working tree at `bb89b7d`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 261 # pass 261 # fail 0`; `==> All checks passed.` exit 0.
- Async/idempotent probe:
  - `request` → `pending` in **1 ms** (non-blocking) ✅
  - first `respond(granted)` → `granted`; second `respond(denied)` (replay) → `granted` (current status, **no throw**) ✅ — service-level TM-07 idempotency on top of Q/0/0's repo guard.
  - `approvalBus` fired **exactly once** (only the first transition) ✅ — Q/0/4 `wait` won't get duplicate events.
  - `poll` → `granted` ✅
  - `respond(decision: "expired")` → rejected (`invalid decision`) ✅ — `expired` is repo-level state, not a human response.
- `respond` defers state mutation to `repo.decideApproval` (Q/0/0), so the SQL-level + `changes!==1` race guards still apply underneath.
- `git show --stat bb89b7d` → the service + the test + CHANGELOG.

### Decision review (non-blocking)
- Notes truncated to 500 chars in audit (`noteSummary`) — consistent with the I/0/1 prompt-truncation pattern; avoids unbounded operator notes in the audit log.
- `approvalBus` is a module-level singleton EventEmitter. Fine for the single-gateway runtime; Q/0/4's `wait` will subscribe to `approvalId`-keyed events. (As with other singletons, any test that needs an isolated bus should be mindful of the M/0/3 lesson — but `respond` only emits on real transitions so cross-test bleed is unlikely here.)

## Stage Q status
- [x] Q/0/0 Approval state machine
- [x] Q/0/1 Async approval service — **closed by this task**
- [ ] Q/0/2 (MCP tools), Q/0/3 (`agent-run approve` CLI), Q/0/4 (bounded `wait`, TM-11) pending

## Next step
OK → coder advances to **Q/0/2** (`plan/Q/0/02.md`). New branch `feature/Q-0-2-*` cut from `develop`. **Reminders:** Q/0/4's `wait` is the only method allowed to block and **must** be bounded by `AGENTS_APPROVAL_MAX_WAIT_MS` (D/0/2 config) and may return `pending` (TM-11); the MCP `approval.respond` tool path must remain operator-only (the `orchestrator` role is denied `approval.respond` by C/0/2).
