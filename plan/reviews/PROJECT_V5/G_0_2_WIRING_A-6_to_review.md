# Review Submission — Project V5 G/0/02 WIRING-A (Trial 6)

## Authorization and boundary

- This submission closes only the remaining P2 in
  `G_0_2_WIRING_A-5_result.md` at `af786ae`.
- Trial 6 changes one ownership test file. It does not change the exact
  issuing-permit implementation that Trial 5 closed.
- The managed receive cancellation path, store arbitration and concurrency
  implementation, non-expiring owner state, migrations, consumer and ACK
  repositories, reconciliation, and the sibling outbox lane are unchanged.
- No owner clear, delete, reset, PID, TTL, probe, takeover, or automatic
  restart path is added. No crash-recovery, durable-convergence,
  Redis-live-recovery, health, inventory, integration, promotion, or release
  claim is made.
- Runtime composition still consumes only the repository port frozen at
  `coordination_ack_reconciler.js:220-232`.

## Finding closure

| Trial 5 finding | Trial 6 correction | First mutant observation |
|---|---|---|
| Row 25 stopped at the test-only `predecessorRevoked` projection before releasing accepted D1 work or attempting its ACK. | The fixture captures the revocation projection without asserting it, releases the held D1 handler, waits for the real consumer `beforeAck` boundary, stops the runtime, and reads the durable receipt. Its first assertion requires zero managed ACK inputs and an `effect_committed` receipt. The captured projection is asserted only afterward as a secondary signal. | With only predecessor revocation removed, the first failure is `the attempted D1 ACK must reject before managed invocation`. Actual output contains a real ACK for delivery `71-0` with `participantId: pt-d2` and D2's lease token, and the receipt is `completed`; expected output is no managed ACK and `effect_committed`. The stack points to the operational aggregate assertion. The secondary projection is never evaluated. |

The pristine fixture proves the retained D1 permit rejects the attempted ACK
before the managed-client invocation. The row-25 mutant proves the fixture
reaches that operation: removing revocation allows the same D1 work to cross
the boundary with D2 credentials, and that operational counterexample is the
first and only failure.

## Audit of the other mutation rows

The audit found two additional rows with the same forbidden shape:

- Row 26, rejoin retirement before next permit, first failed at a
  `probeRuntimePermit` projection. The fixture now first attempts genuine D2
  successor provisioning while D1 retirement is held. Its isolated mutant
  first fails with `Missing expected exception: D2 provision must remain
  unavailable before D1 exact retirement`; permit projections follow later.
- Row 27, rejoin failure faults lineage, first waited on the private fault
  projection. The fixture now repeatedly attempts the real old-runtime
  `start()` until it receives `COORDINATION_CONSUMER_RUNTIME_LINEAGE_FAULTED`.
  Its isolated mutant first fails because the actual operational rejection
  remains `COORDINATION_CONSUMER_RUNTIME_LINEAGE_RETIRING`; the fault
  projection is asserted only afterward.

No other row had a private/test-only projection as its first observed
failure. All 44 final per-row TAP files were inspected, and none of their
first failures references `probeRuntimePermit`, `predecessorRevoked`, or a
test-only status assertion. In particular:

| Row | Guard | First isolated observation |
|---:|---|---|
| 22 | One stable lineage per real managed client | A real D1-to-D2 provision operation no longer throws. |
| 24 | Successor permit inherits the lineage store | Durable store A remains at generation 1 instead of advancing to 2. |
| 25 | Rejoin revokes predecessor admission | The attempted D1 ACK crosses the managed boundary with D2 credentials and completes the receipt. |
| 26 | Retirement precedes successor permit | Genuine D2 successor provisioning succeeds before D1 exact retirement. |
| 27 | Retirement failure faults the lineage | A real start operation rejects as `LINEAGE_RETIRING`, never `LINEAGE_FAULTED`. |
| 28 | Provision store must equal lineage store | The mutated provision resolution returns `admitted` instead of `rejected`. |
| 29 | Provision admission uses its issued permit | The retained D1 runtime follows D2 instead of rejecting. |
| 30 | Managed operation uses its issued permit | The attempted D1 ACK crosses the managed boundary with D2 credentials and completes the receipt. |

Rows 28, 38, and 39 use profile methods whose names contain `probe`, but
those methods directly execute and return or throw from the mutated provision
resolution/backend admission operation. They are not projections of private
state followed by a skipped claimed behavior. Their first failures are the
direct wrong admission results.

The remaining rows' first failures are their named SQL result, committed
state, schema, capability, runtime, repository, admission, settlement, or
non-expiring-owner observations. No further probe-first row was found.

## TDD failing-then-passing evidence

| Phase | Commit | Evidence |
|---|---|---|
| RED | `45cacab` | The corrected row-25 fixture was committed before the audit corrections. Applying only mutation 25 in a disposable copy produced 1 selected test, 0 pass, 1 fail, 0 cancelled, and 0 skipped. The first failure was the real D1 ACK/receipt aggregate above, before the secondary projection. Pristine production already rejects that operation because the implementation finding was closed in Trial 5; this RED is the required falsifiability RED against the named guard deletion. |
| GREEN | `df9cbc4` | The audit converted rows 26 and 27 from projection-first to operation-first witnesses. The pristine ownership suite returned 38 pass and 0 fail, and the full isolated matrix returned 44 killed and 0 survivors. |

No production source was changed in either Trial 6 commit.

## Per-guard surviving-mutant proof

The final runner was:

```text
node /tmp/g002_trial6_mutations.mjs
```

It copied committed Trial 6 source and tests to:

```text
/tmp/g002-wiring-trial6-mutants-oP955s
```

Before every mutation, the affected files were restored from the pristine
copy. Every JavaScript mutant passed `node --check`; the migration mutant ran
against a fresh SQLite database containing only `main.schema_migrations`.
Every directed run selected exactly one named fixture and returned 0 pass,
1 fail, 0 cancelled, and 0 skipped.

| Rows | Named guard class | Syntax | Directed result | First-witness audit |
|---:|---|---|---|---|
| 1–5 | Main qualification and same-main binding | PASS | KILLED | SQL/schema/binding behavior |
| 6–10 | Ambient transaction and commit witness | PASS | KILLED | Transaction/commit behavior |
| 11–16 | Exact schema, returned rows, and loser disposition | PASS | KILLED | Schema/result behavior |
| 17–21 | Persistent generation and exact release | PASS | KILLED | Durable generation/state behavior |
| 22–24 | Lineage and inherited store | PASS | KILLED | Operational provision/durable-store behavior |
| 25 | Predecessor revocation | PASS | KILLED | Real D1 ACK rejection is first |
| 26 | Retirement before successor permit | PASS | KILLED | Real D2 provision rejection is first |
| 27 | Failure faults lineage | PASS | KILLED | Real D1 start rejection is first |
| 28–32 | Store capability, exact permits, and lineage integrity | PASS | KILLED | Admission/runtime/managed-operation behavior |
| 33–39 | Repository/origin/profile admission | PASS | KILLED | Binding/capability/admission behavior |
| 40–44 | Runtime ownership, settlement, compensation, and fail-closed disposition | PASS | KILLED | Runtime/durable-state behavior |

Mutation summary:
`baseline=38/0 syntax_pass=44 killed=44 survived=0 timed_out=0
cancelled=0 skipped=0`.

## Verification gates

| Gate | Observed result |
|---|---|
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_store_ownership.test.js` | exit 0; 38 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_runtime.test.js` | exit 0; 19 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer.test.js tests/gateway/coordination_consumer_sqlite_repo.test.js tests/gateway/coordination_consumer_sqlite_integration.test.js` | exit 0; 148 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_ack_reconciliation.test.js tests/gateway/coordination_ack_outbox_sqlite.test.js` | exit 0; 33 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_client.test.js` | exit 0; 17 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --experimental-test-isolation=none --test-concurrency=1 tests/gateway/coordination_client.test.js tests/gateway/coordination_service_receive.test.js tests/gateway/coordination_queue_receive.test.js tests/gateway/coordination_queue_lifecycle.test.js` | exit 0; 51 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/sqlite_migrations.test.js tests/gateway/state_init.test.js` | exit 0; 11 pass, 0 fail, 0 cancelled, 0 skipped |
| `npm --prefix gateway run lint -- --no-cache` | exit 0 |
| `git diff --check` | exit 0 |

`bash scripts/ci.sh` was not run.

## Commits and changed paths

- `45cacab` —
  `test(coordination): witness revoked D1 ACK operationally (V5 G/0/02 WIRING-A Trial 6)`
- `df9cbc4` —
  `test(coordination): isolate rejoin mutation witnesses (V5 G/0/02 WIRING-A Trial 6)`

Changed paths:

- `tests/gateway/coordination_consumer_store_ownership.test.js`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_A-6_to_review.md`

The pre-existing untracked `gateway/node_modules` entry remains untouched.

## Review status

Waiting for independent review. No coder-owned verdict is asserted.
