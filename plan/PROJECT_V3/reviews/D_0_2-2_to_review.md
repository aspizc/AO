# Review Submission - Task PROJECT_V3/D/0/2 (Trial 2)

## What was done
- Addressed `plan/PROJECT_V3/reviews/D_0_2-1_reviewed_KO.md` F1/F2 only.
- Removed the three exact lower-bound wall-clock assertions from `tests/gateway/approval_wait.test.js`.
- Kept the already-reviewed synchronization, result assertions, audit assertions, and wide upper ceilings unchanged.

## Why
- The KO reproduced flakes where `Date.now()` measured `setTimeout(cap)` callbacks as firing about 1 ms before the exact cap.
- Result plus audited `APPROVAL_WAIT_TIMEOUT` state proves the timeout path and configured cap without depending on an exact lower wall-clock boundary.

## KO Corrections
- F1: removed `assert.ok(elapsedMs >= 120)` from the server-cap subtest while keeping `result.status === "pending"`, `events[0].timeoutMs === 120`, and `elapsedMs < 1_200`.
- F2 client timeout: removed `assert.ok(elapsedMs >= 120)` and the now-unused elapsed measurement while keeping `result.status === "pending"` and audit `timeoutMs === 120`.
- F2 tool config: removed `assert.ok(elapsedMs >= 125)` while keeping `result.status === "pending"`, audit `timeoutMs === 125`, and `elapsedMs < 1_250`.

## Decisions Taken
- Chose the reviewer-preferred robust option: assert result plus observable audit state, without lower clock-bound assertions.
- Did not change `gateway/src/`, `policies/`, production defaults, or any already-validated trial 1 behavior outside F1/F2.

## Verification
- `node --test tests/gateway/approval_wait.test.js` - passed.
- `for i in $(seq 1 40); do node --test tests/gateway/approval_wait.test.js || exit 1; done` - passed 40/40 consecutive runs.
- `npm --prefix gateway test` - passed, 72 tests.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed, all checks passed.

## Commit
- `e708d1836323542813a728b92aadde8e81cceebb` - `test(v3): remove flaky approval wait lower-bound assertions (PROJECT_V3 D/0/2)`
