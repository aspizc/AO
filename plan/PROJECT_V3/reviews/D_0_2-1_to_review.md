# Review Submission - Task PROJECT_V3/D/0/2 (Trial 1)

## What was done
- Hardened `tests/gateway/approval_wait.test.js` timing coverage without changing Gateway production code.
- Replaced delayed approval-response causal tests with event/state synchronization through the exported approval bus listener count.
- Replaced narrow timeout assertions with result, audit, monotonicity, and wide cap checks.
- Updated `CHANGELOG.md` under `## Unreleased` with `Closes V3 D/0/2`.

## Why
- The old suite depended on 20-30 ms scheduler behavior and a `<200ms` ceiling, which can flake under loaded CI.
- The suite still covers already-decided waits, later granted/denied decisions, client timeout, server cap, independent concurrent waits, and the `approval.wait` tool config cap.

## Temporal Assert Classification
- Original `wait resolves when approval is granted later`: `setTimeout(..., 20)` was causal ordering. Replaced with `waitUntilApprovalWaitIsListening()` and result asserts on both `respond()` and `waitForDecision()`.
- Original `wait resolves when approval is denied later`: `setTimeout(..., 20)` was causal ordering. Replaced with `waitUntilApprovalWaitIsListening()` and result asserts on both `respond()` and `waitForDecision()`.
- Original `wait returns pending after client timeout and audits timeout`: `timeoutMs: 30` was timeout behavior. Replaced with `timeoutMs: 120`, `result.status === "pending"`, `elapsedMs >= 120`, and audit `timeoutMs === 120`.
- Original `wait never exceeds server max timeout`: `serverMaxMs: 40` plus `elapsedMs < 200` was timeout plus narrow latency ceiling. Replaced with `serverMaxMs: 120`, `elapsedMs >= 120`, `elapsedMs < 1_200`, and audit `timeoutMs === 120`.
- Original `concurrent waits are independent per approval id`: `setTimeout(..., 20)` was causal ordering and `timeoutMs: 30` was timeout behavior for the second wait. Replaced with listener synchronization for both waits, `timeoutMs: 120` for the pending second wait, and unchanged status vector coverage.
- Original `approval wait tool is registered and bounded by config`: `approvalMaxWaitMs: 25` was timeout/cap behavior through tool config. Replaced with `approvalMaxWaitMs: 125`, `elapsedMs >= 125`, `elapsedMs < 1_250`, and audit `timeoutMs === 125`.
- Existing `wait returns immediately when approval is already granted`: `timeoutMs: 1000` / `serverMaxMs: 1000` are bounds supplied to the service but no temporal assert depends on elapsed time; result coverage remains unchanged.

## Decisions Taken
- Used `approvalBus.listenerCount(approvalId)` as the observable synchronization point because `waitForDecision()` registers exactly one listener per pending approval wait.
- Kept cap ceilings only where they validate server-bound behavior, with x10 slack and no ceiling under 100 ms.
- Did not touch `gateway/src/`, `policies/`, or production config defaults such as `AGENTS_APPROVAL_MAX_WAIT_MS`.

## Verification
- `node --test tests/gateway/approval_wait.test.js` - passed.
- `for i in $(seq 1 20); do echo "approval_wait run $i"; node --test tests/gateway/approval_wait.test.js || exit 1; done` - passed 20 consecutive runs.
- `npm --prefix gateway test` - passed, 72 tests.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed, all checks passed.

## Commit
- `0ca9dca3578bb29955decc8d6e1c763a6d583285` - `test(v3): harden approval wait timing assertions (PROJECT_V3 D/0/2)`
