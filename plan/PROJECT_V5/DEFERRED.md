# Project V5 deferred register

This register records explicit residuals whose closure belongs to another
Project V5 sheet. `DEFERRED` is not a passing test, implemented behavior, or a
release claim. Each entry names the reason, owner, required privilege, retained
mitigations, and closure condition.

## V5-H-0-01-D01 — Pure-Python dunder reflection can retain an issued Doctor DTO

| Field | Value |
|---|---|
| Status | `DEFERRED` |
| Origin | `H/0/01` DOCTOR Trial 12 independent P2 and the operator-ratified Trial 13 Option B amendment |
| Residual | An issued pure-Python DTO exposes ordinary inherited, generated, or class-defined dunder bound methods. Their writable `__func__.__dict__` can retain the DTO, a probe capability, and the otherwise-retirable issuance record. |
| Reason | A normal Python class cannot expose zero ordinary Python function dictionaries. Closing the absolute condition would require a non-Python built-in or compiled extension DTO, which is outside the stdlib-only Doctor preflight. |
| Owner | [`D/0/02`](D/0/02.md) — sandbox and same-process execution isolation |
| Required privilege | Same-process Python execution, a live issued DTO or the live referent returned by its issuance weak reference, and the loaded Doctor module |
| Demonstrated impact | Retention of the caller graph and delayed ledger retirement; no admission bypass or unsafe result projection was demonstrated |
| Retained mitigation | Trial 12 removed the DTO `__del__` finalizer, kept the discovered weakref callback slots-only with a built-in call surface, and retained exact post-GC/pre-issuance sweep guards, callback cleanup, irreversible taint, and atomic admission |
| Closure condition | D/0/02 prevents untrusted code from sharing this Python process/object authority, or a separately scoped and reviewed decision replaces the DTOs with non-Python built-in/compiled types |

Evidence:

- [`H_0_1_DOCTOR-12_result.md`](../reviews/PROJECT_V5/H_0_1_DOCTOR-12_result.md)
- [`H_0_1_DOCTOR Option A infeasibility decision`](../reviews/PROJECT_V5/H_0_1_DOCTOR_optionA_infeasible_to_check_by_human.md)

## V5-G-0-02-D01 — Durable ownership epoch fencing is deferred to WIRING part B

| Field | Value |
|---|---|
| Status | `DEFERRED` |
| Origin | `G/0/02` WIRING-A store-identity design Trial 3 and the operator-ratified Option 1 availability decision, including its Design Trial 2 completeness correction |
| Residual | Part A has no safe automatic restart or stale-owner reclamation. A future durable ownership epoch must fence receive, handler effects, consumer and ACK repository transitions, reconciliation, and transport finalization before a replacement can take over. |
| Reason | PID absence, elapsed time, heartbeat loss, lease expiry, or a failed probe cannot exclude a paused prior process. Part A intentionally preserves single-owner safety with non-expiring owner state; crash/reclaim belongs to WIRING part B. |
| Owner | [`G/0/02`](G/0/02.md) — `G_0_2_WIRING` part B crash/reclaim slice |
| Required privilege | Ability to resume an old runtime or start a replacement that can receive work, execute handler effects, mutate consumer/ACK state, reconcile, or finalize transport delivery |
| Demonstrated impact | A runtime crash or active-state backup/restore blocks the scope indefinitely. The same permanent block can follow a committed claim whose later validation fails, failed or uncertain initialization compensation, failed or uncertain exact release, or generation exhaustion. Restoring even a released-state snapshot can roll generation backward. Automatic restart is not implemented or claimed, while retaining the block prevents an unfenced old and replacement runtime from producing concurrent effects. |
| Retained mitigation | Non-expiring store-backed owner state; no part-A cleanup, delete, takeover, restart, or maintenance path; every active/released restore remains offline-only; any future maintenance transition requires enforced global quiescence and preserved/advanced generation |
| Closure condition | WIRING part B defines, RED/GREEN implements, independently reviews, and integrates one durable epoch that is checked before every receive, handler effect, consumer and ACK repository transition, reconciliation action, and transport finalization; crash/restart, every non-crash permanent-block disposition, active-state restore, and released-snapshot generation-rollback tests must prove that a paused old epoch cannot produce any effect after replacement and that generations cannot be reused, and operator documentation must name the reviewed recovery procedure |

Evidence:

- [`G/0/02 WIRING-A durable store ownership design`](G/0/02-DESIGN-store-identity.md)
- [`WIRING-A Option 1 ratification`](../reviews/PROJECT_V5/G_0_2_WIRING_A_DESIGN_to_check_by_human.md)
