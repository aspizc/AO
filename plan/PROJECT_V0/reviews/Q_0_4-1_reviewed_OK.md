# Review Q_0_4-1 — OK

**Task:** `plan/Q/0/04.md`
**Trial:** 1
**Branch:** `feature/Q-0-4-approval-wait-primitive`
**Commit:** `9e4b354` — `feat(approvals): add bounded approval wait (Q/0/4)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
`approval.wait` (the only blocking approval primitive) landed, **bounded by the server cap** — verified live that a client request of 10s with a 200ms server cap returns `pending` in ~201ms (TM-11 closed). Event-driven early return on decision, clean listener/timer teardown. 272 total gateway tests pass. **This task closes Stage Q.**

## Checks
- [x] Archivos a crear / modificar — `gateway/src/services/approval_service.js` (+`waitForDecision`), `gateway/src/tools/approval.js` (+`approval.wait`), `gateway/src/tools/index.js` (pass `config.approvalMaxWaitMs`), `tests/gateway/approval_wait.test.js`, registry test counts updated.
- [x] Tests requeridos — granted/denied resolve, client-timeout → pending, server-cap → pending, concurrent independent waits, audit on timeout. All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — `clearTimeout` + `approvalBus.off` on every resolution path (no leak); `Math.min(requestedMs, maxMs)` cap (never unbounded); per-`approvalId` listener (doesn't block the whole bus).
- [x] Definition of done — commit on `feature/Q-0-4-approval-wait-primitive`; CHANGELOG line for Q/0/4 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK · approval async-first, wait bounded by server cap.

## Findings
All-green. Live verifications on the working tree at `9e4b354`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 272 # pass 272 # fail 0`; `==> All checks passed.` exit 0.
- **TM-11 server-cap bound** (the critical one): client requests `timeoutMs: 10000`, `serverMaxMs: 200` → `waitForDecision` returns `status: "pending"` in **201 ms** (not 10s). `capMs = Math.max(0, Math.min(requestedMs, maxMs))` enforces the cap regardless of client request. ✅
- **Event-driven early return:** `respond` at 50ms → `wait` (5s requested) resolves `granted` in **50 ms** via the `approvalBus` listener. ✅
- Resolution paths all run `cleanup()` (clearTimeout + bus.off) guarded by a `settled` flag → no double-resolve, no listener/timer leak.
- Timeout path audits `APPROVAL_WAIT_TIMEOUT` (with trace + capMs) and returns the latest poll status (`pending`).
- Returns immediately for already-decided or NOT_FOUND approvals (no needless blocking).
- `git show --stat 9e4b354` → service + tool + registry wiring + the wait test + registry test count updates + CHANGELOG.

### Decision review (non-blocking)
- Default to `serverMaxMs` when `timeoutMs` omitted — correct: an unspecified wait still caps at the server max.
- `config.approvalMaxWaitMs` (D/0/2) is threaded from `getToolRegistry` into the approval tools — the cap is configuration-driven, not hardcoded.

## Stage Q status — CLOSED
- [x] Q/0/0 Approval state machine
- [x] Q/0/1 Async approval service
- [x] Q/0/2 Approval MCP tools
- [x] Q/0/3 `agent-run approve` CLI
- [x] Q/0/4 Bounded `approval.wait` — **closed by this task**

Async-first approval workflow is complete end-to-end: state machine (TM-07), non-blocking request/poll, operator CLI respond, and a server-capped wait (TM-11). The MCP can never be hung indefinitely by an approval.

## Next step
OK → per `plan/README.md` MVP order (Q + R, then O, then U), coder advances to **Stage R** starting with **R/0/0** (`plan/R/0/00.md`) — session tools + tmux intervention (TM-05). New branch `feature/R-0-0-*` cut from `develop`.

> Operator: 3 human-check items remain open (`C_0_4`, `N_0_2`, `J_0_2`).
