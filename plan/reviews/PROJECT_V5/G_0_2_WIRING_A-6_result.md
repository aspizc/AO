# Independent Review Result — Project V5 G/0/02 WIRING-A (Trial 6)

## Verdict

**reviewed_OK**

| Severity | Count | Finding |
|---|---:|---|
| P0 | 0 | None |
| P1 | 0 | None |
| P2 | 0 | None |

Trial 6 closes the sole Trial 5 evidence defect. Row 25 now reaches and fails
first on the real D1 ACK/receipt outcome. Rows 26 and 27 also fail first on
real successor-provision and runtime-start operations. I found no replaced
assertion that was removed or weakened, and an independently inspected
reviewer sample found no further projection-first mutation witness.

This is a narrow, result-only verdict. It makes no integration, promotion,
release, production-profile, crash-recovery, durable-convergence,
Redis-live-recovery, health, inventory, or complete-sheet claim.

## Reviewed identity and boundary

- Review branch: `review/V5-G-0-02-wiring-a-6`
- Reviewed HEAD: `a55d61332d0c1351645b9ea14b0acec0f035bef9`
- Trial 5 implementation baseline: `18e33df`
- Row 25 test correction: `45cacab768539194db4989819d0ff760fe28fc71`
- Rows 26/27 test correction: `df9cbc4a2c7c466e0de1fd91ae0e1f88f389e266`
- Handoff: `a55d61332d0c1351645b9ea14b0acec0f035bef9`
- Trial 6 test delta: 71 additions and 21 deletions, or 92 changed lines,
  exclusively in
  `tests/gateway/coordination_consumer_store_ownership.test.js`
- The handoff is the only other Trial 6 path.

Before this result was written, the worktree contained only the disclosed
pre-existing untracked `gateway/node_modules` entry. No source, migration,
test, design, sheet, policy, runbook, or human-decision artifact was changed
by this review.

## Row 25 operational-first reproduction

I applied row 25 alone in a fresh disposable copy and ran only its named
committed fixture. The runner first established a pristine 38/38 baseline and
then reported:

```text
25 KILLED Rejoin revokes predecessor admission
syntax=PASS tests=1 pass=0 fail=1 cancelled=0 skipped=0
```

The first and only failure was the operational aggregate:

```text
the attempted D1 ACK must reject before managed invocation

actual:
  managedAckInputs:
    - deliveryIds: ["71-0"]
      participantId: "pt-d2"
      leaseToken: "lease-pt-d2-token-00000000000000"
  receiptState: "completed"

expected:
  managedAckInputs: []
  receiptState: "effect_committed"
```

The stack points to the aggregate assertion at the disposable test's
equivalent of committed line 1496. The secondary revocation projection begins
at committed line 1507, after that aggregate, and was never evaluated in the
mutant. Thus the row is killed by the real ACK crossing the managed-client
boundary with D2 credentials and by the resulting completed receipt, not by
`predecessorRevoked`.

## Independent mutation-sweep verification

I read the 44 mutation definitions and their exact replacement anchors, then
reran the full matrix from committed Trial 6 files. Each row restored all
affected files to pristine content before applying its mutation. Every
JavaScript mutation passed `node --check`; the SQL mutation executed against
a fresh SQLite schema. The full result was:

```text
baseline=38 pass, 0 fail
syntax_pass=44
killed=44
survivors=0
cancelled=0
skipped=0
```

I did not accept that aggregate as proof of first-failure quality. I opened
the individual TAP artifacts and traced the first stack/assertion for the
following reviewer-chosen rows, each applied alone:

| Row | Mutation | Actual first failure |
|---:|---|---|
| 1 | Unqualify owner claim DML | The second real owner claim returned `claimed`, generation 1, instead of `owned`. |
| 6 | Remove the claim ambient-transaction preguard | Owner DML created one durable row inside the ambient transaction where zero rows were required. |
| 18 | Reset generation during release while preserving the returned-row projection | Durable readback was generation 1 instead of 2, and the next real claim was generation 2 instead of 3. |
| 24 | Resolve the D2 permit to the supplied store B | After successor start/stop, durable store A remained at generation 1 instead of advancing to 2. |
| 26 | Issue D2's permit before D1 exact retirement | Genuine successor provisioning succeeded; `assert.throws` reported `Missing expected exception: D2 provision must remain unavailable before D1 exact retirement`. |
| 27 | Keep the lineage non-faulted after retirement failure | Repeated real `runtime.start()` calls rejected as `COORDINATION_CONSUMER_RUNTIME_LINEAGE_RETIRING`; the required `LINEAGE_FAULTED` result was never observed. |
| 28 | Admit a provision whose store differs from its lineage store | Actual provision resolution returned `{status: "admitted"}` instead of the required `PROFILE_INVALID` rejection. |
| 30 | Invoke the managed client without the provision's issued permit | The real ACK/receipt aggregate observed delivery `71-0` under D2 credentials and a `completed` receipt. |
| 37 | Permit generic runtime construction without a profile | Generic construction returned instead of throwing `COORDINATION_CONSUMER_RUNTIME_PROFILE_UNSUPPORTED`. |
| 38 | Admit a PostgreSQL-shaped store | The backend-admission operation no longer threw the required SQLite-only rejection. |
| 39 | Admit an in-memory SQLite store | The independent in-memory admission operation no longer threw `PROFILE_UNSUPPORTED`. |
| 40 | Treat an `owned` claim as permission to start | The losing runtime lacked the required `COORDINATION_CONSUMER_RUNTIME_STORE_OWNED` rejection. |
| 41 | Release before accepted work settles | The real release lifecycle had already started (`true`) while the fixture required it to remain false. |
| 42 | Remove exact-generation initialization compensation | Durable owner state remained `owned` instead of becoming `released`. |
| 43 | Permit claim over an active non-expiring row | The real claim returned `claimed`, generation 2, instead of `owned`. |

None of these first failures was a `probeRuntimePermit`,
`predecessorRevoked`, fault-status, or similar state projection. Rows 28, 38,
and 39 use test-profile method names containing `probe`, so I inspected those
paths specifically. Row 28 constructs and resolves the mutated provision and
returns that admission result. Rows 38 and 39 execute the backend-admission
guard itself. They do not first inspect private state and then skip a claimed
operation.

The independently sampled evidence therefore supports the lane's report that
rows 26 and 27 were the only additional projection-first cases needing
conversion. I found no contrary row in the sample.

## Rows 26 and 27

### Row 26

The added assertion calls `provisionSuccessorRuntime` before D1's release
barrier is opened and requires
`COORDINATION_CONSUMER_RUNTIME_CLIENT_NOT_READY`. It is placed before the
existing permit projection. Under row 26, that real provision operation
succeeds and the fixture stops at the missing-exception assertion. The later
`probeRuntimePermit` checks are not involved in the kill.

All pre-existing row-26 checks remain: predecessor revocation, D1 start
rejection, store-B mismatch and emptiness, release ordering, irreversible D1
retirement, D1 provision non-reuse, D2 readiness, successor start/stop, store-A
generation 2, and empty store B. The conversion is additive.

### Row 27

After the expected forced `runtime.stop()` failure, the fixture now drives
the real `runtime.start()` operation until the asynchronous retirement result
settles and requires the exact
`COORDINATION_CONSUMER_RUNTIME_LINEAGE_FAULTED` code. Under row 27, the last
observed operational code remains `LINEAGE_RETIRING`, so the helper fails
before the secondary fault projection.

The old 400-turn settling budget remains. The old properties also remain:
`runtime.stop()` must reject with the forced retirement failure, the runtime
must reject with the exact faulted-lineage code, and
`probeRuntimePermit` must equal `{status: "faulted"}`. Only their witness
order changed.

## No-weakening comparison

The old and new ownership suites both contain 38 named tests. A mechanical
assertion inventory increased from 128 assertion calls to 130; more
importantly, the semantic comparison of every changed assertion found:

| Changed area | Previously checked | Trial 6 check | Ruling |
|---|---|---|---|
| Runtime harness | Existing handler, lifecycle, owner faults, and runtime construction | Adds pass-through of the existing `consumerFault` boundary solely to await `beforeAck` | No old check changed |
| Row 26 | Revocation, retirement, store and successor outcomes | Adds genuine pre-retirement successor provisioning rejection before the projections | Strengthened |
| Row 25 message | Inline D1 message with the same metadata/body | Extracts that identical object so its durable consume key can be read | Equivalent setup |
| Row 25 revocation | Immediate deep equality on `{status: "retiring", predecessorRevoked: true}` | Captures at the same pre-release point and deep-compares the captured value after the operational aggregate | Same property retained |
| Row 25 ACK | `ackInputs` exactly `[]` | `managedAckInputs` exactly `[]` plus receipt state exactly `effect_committed` | Strictly strengthened |
| Row 25 owner | Generation 1 and `released` | Unchanged | Retained |
| Row 27 failure | Eventual private fault projection, then one exact `runtime.start()` rejection | Eventual exact `runtime.start()` rejection first, then exact private fault projection | Both properties retained; operational witness now first |

The new rejection helper accounts for the same asynchronous transition that
the former `waitFor` handled and uses the same 400-turn bound. It succeeds
only after observing the exact expected operational code and otherwise fails
with the last code. No previously checked property is absent from the final
fixture.

## Non-regression

Trial 6 changes no production path. The maintained suites nevertheless
confirm that the surrounding closed behavior remains intact:

- Ownership 38/38 includes the same-store contention and direction cases,
  persistent generation/release fencing, active-copy/crashed-owner blocking,
  and the absence of clear/takeover authority.
- The no-takeover design remains unchanged: there is still no clear, delete,
  reset, PID, TTL, liveness, takeover, or automatic restart path.
- Runtime and managed-client cancellation behavior remains green.
- Consumer, SQLite repository/integration, ACK reconciliation, ACK outbox,
  migrations, and state initialization remain green.

## Gate outputs

| Gate | Result |
|---|---|
| Pristine ownership suite | exit 0; 38 pass, 0 fail, 0 cancelled, 0 skipped |
| Full isolated mutation matrix | 44 syntax pass; 44 killed; 0 survivors; 0 cancelled; 0 skipped |
| Focused row 25 mutation | exit 1 as required; 1 test, 0 pass, 1 operational-aggregate failure |
| Runtime | exit 0; 19 pass, 0 fail |
| Focused consumer | exit 0; 41 pass, 0 fail |
| Consumer + SQLite repository/integration | exit 0; 148 pass, 0 fail |
| Focused ACK reconciliation | exit 0; 19 pass, 0 fail |
| ACK reconciliation + ACK outbox SQLite | exit 0; 33 pass, 0 fail |
| Managed client | exit 0; 17 pass, 0 fail |
| Cancellation client/service/queue aggregate | exit 0; 51 pass, 0 fail |
| SQLite migrations + state initialization | exit 0; 11 pass, 0 fail |
| `npm --prefix gateway run lint -- --no-cache` | exit 0 |
| `git diff --check 18e33df..a55d613` | exit 0, no output |
| `git diff --check` before verdict | exit 0, no output |

As required, full `bash scripts/ci.sh` was not run.

## What I did and did not verify

I read the review brief, plan invariants, G/0/02 sheet, Trial 5 result, Trial 6
handoff, both Trial 6 commits, the complete changed test regions, relevant
test-profile operations, and the mutation runner's 44 exact transformations.
I reproduced row 25 alone, reran the full matrix, independently inspected the
first TAP failure and assertion order for fifteen selected rows, compared all
92 changed test lines with their predecessors, and ran every scoped gate
listed above.

All mutations existed only in disposable `/tmp` copies and exercised existing
suite fixtures. I used no kernel/lock introspection or standalone internal
probe.

I did not change source, tests, design, a plan sheet, migration, policy,
runbook, deferral, or human-decision artifact; run aggregate CI; repeat the
already closed Trial 4 reviewer-owned process extension; use live
Redis/MCP/network services or a production database/profile; test a custom or
network VFS; implement or claim crash reclamation; integrate; promote;
release; push; or use sub-agents.
