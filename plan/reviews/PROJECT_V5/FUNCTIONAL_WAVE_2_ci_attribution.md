# Functional Wave 2 — full-gate attribution (orchestrator-owned)

Recorded by the root orchestrator. This is an attribution record, not a review verdict, and it
makes no integration, promotion, or release claim.

## Runs

Two full `bash scripts/ci.sh` runs on `/tmp/agents-orchestrator-v5-wave2-integration`
(`integration/V5-functional-wave-2`, at `13fada7` and unchanged between runs), executed on the host
with the tree's `.venv` on `PATH`. Both produced the **identical** result, so nothing below is a
flake induced by the concurrent lane sessions:

```text
status: failed
counts: 1792 passed / 10 failed / 12 skipped of 1814
errors:
  test.structure: command left processes in its owned process group
  test.gateway: 9 tests failed
  test.gateway: command exited with status 1
```

Suites `test.langgraph`, `test.redis-live` and `test.real-agents` reported
`infrastructure_unavailable`. `test.redis-live` and `test.real-agents` ran zero tests;
`test.langgraph` still executed 81 passed / 3 skipped.

## Finding 1 — nine `test.gateway` failures, of two distinct causes

The nine `live postgres` entries in the suite's `infrastructureUnavailable` list are **not** the
failures. `postgres_state.test.js` guards them with `skipReason()` and they are correctly counted
among the nine `skipped`. The nine **failures** are different tests:

| Failing test | File |
|---|---|
| real consumer converges a durable idempotent effect after crash before its receipt | `tests/gateway/coordination_consumer_sqlite_integration.test.js` |
| effect receipt committed before ACK survives reopen and redelivery retries ACK only | same |
| quarantine receipt and body committed before ACK survive reopen with ACK-only redelivery | same |
| real consumer durably quarantines a malformed envelope with no body | same |
| a dangling vault put converges idempotently after reopen | same |
| blocked recovery history remains private and one-shot across restarts | same |
| authorized replay commit survives reopen and later commands deduplicate | same |
| SQLite repository preserves the in-memory port projection for every transition | same |
| orchestration lifecycle tools update status | `tests/gateway/tool_orchestration_task.test.js` |

### 1a — the eight SQLite integration failures were introduced by the ACK merge

Error: `TypeError: repository.directAck.claim must be a function`.

Bisected against the Wave 2 starting point:

| Commit | `coordination_consumer_sqlite_integration` |
|---|---|
| `1a134f4` (handoff, Wave 2 start) | **7 passed / 0 failed** |
| `ef38763` merge: integrate reviewed V5 G/0/02 ACK reconciliation | **0 passed / 7 failed** |
| `616a4de`, `aaf4817` (later merges) | 0 passed / 7 failed (unchanged) |

Cause: the ACK reconciliation lane added the domain-separated `directAck` claim family to the
repository port and implemented it **only** in the in-memory repository
(`gateway/src/core/repositories/coordination_consumer_repo.js`, +466 in that merge). The SQLite
repository was left behind. The merge did not touch
`coordination_consumer_sqlite_integration.test.js`, so that pre-existing suite was outside both the
lane's focused gate and its independent review, and it went red on merge.

**Orchestrator process failure, recorded plainly:** the focused gate run after that merge covered the
ACK ephemeral-Redis suite and lint, but not the SQLite integration suite that consumed the same
port. A lane that widens a port contract must be gated on every existing implementation of that
port, not only on the implementation it changed.

Disposition: the durable ACK outbox lane (`feat/V5-G-0-02-outbox`) implements the SQLite side of
that same family. On its branch this suite is green at **7 passed / 0 failed**. That lane's Trial 1
was independently `reviewed_KO` and Trial 2 is in flight; merging its reviewed-OK candidate is the
fix. No revert of `ef38763` is proposed. Until then, `integration/V5-functional-wave-2` is
**red by construction** and no promotion claim may be made from it.

### 1b — the lifecycle failure is pre-existing, not a Wave 2 regression

`orchestration lifecycle tools update status` asserts `'cancelled'` and receives `undefined`
(`tool_orchestration_task.test.js:46`, assertion at `:55`). It already fails at `1a134f4`, the Wave
2 starting point, so it predates this orchestration. It is unowned by any Wave 2 lane and needs an
owner before Wave 2 can claim a green gate.

## Finding 2 — `test.structure` leaves processes in its owned process group

Deterministic across both runs. Running the suite directly gives **409 passed in ~44 s**, so this is
the gate's own subreaper/leak check firing after the suite completes, not a test assertion failure.

`tests/structure/test_ci_suite_manifest.py` deliberately spawns child processes to exercise the
gate's leak detection and timeout reaping (`wait_for_pid_file`, `stop_exact_processes`,
`start_new_session=True`). The suite's own cleanup uses `finally` blocks and `SIGKILL`. The leak
check and that self-test both predate Wave 2's merges — their most recent commits belong to the
earlier `C/0/00`, `C/0/02` and `G/0/00` lanes — so this is not attributable to a Wave 2 lane either.
Exact identification of the surviving process requires running the structure suite under the gate
supervisor with the survivors captured; `scripts/ci_gate.py` exposes no per-suite selection
(`--validate-only` and `--refresh-inventory` only), so that diagnosis is a scoped task rather than a
side effect of this attribution.

## Consequence for Wave 2 closure

The wave cannot record a green full gate today. Two items must be resolved and one decided:

1. Merge the reviewed-OK durable outbox candidate — closes finding 1a.
2. Assign an owner for the pre-existing lifecycle failure (finding 1b) and for the structure-suite
   process leak (finding 2). Neither belongs to a Wave 2 lane.
3. **Operator decision:** whether Wave 2 closure requires those two pre-existing failures to be
   fixed first, or whether it closes with them recorded as attributed pre-existing defects carried
   into a follow-up. The canonical status rule applies either way: integrated is not promoted and
   not released.

## Update — both attributed failures are closed; the gate has zero failures

Recorded by the root orchestrator after integrating both fixes.

| Finding | Disposition |
|---|---|
| 1a — eight SQLite failures from the ACK merge | Closed by the durable ACK outbox (Trial 3 OK, merged). `coordination_consumer_sqlite_integration` 0/7 → 7/7; `coordination_consumer_sqlite_repo` 99/1 → 100/100. |
| 1b — pre-existing `orchestration lifecycle tools update status` | Closed. Independently reviewed OK and merged at `85e6156`. The defect was a superseded V0 test expectation: `cancelOrchestration` deliberately throws `LIFECYCLE_OUTCOME_REQUIRED` for an existing trace per the operator-ratified `C/1/00` Option-B contract. |
| 2 — pre-existing `test.structure` process leak | Closed. Independently reviewed OK with zero findings and merged at `f1e372a`. The surviving process was `/usr/lib/git-core/git maintenance run --auto --quiet --detach`, a zombie clone of Git's detached background maintenance triggered by an `H/0/01` bootstrap fixture. The fix disables that maintenance in the fixture; the gate's leak detection was **not** weakened, and the reviewer independently confirmed the detector still catches a deliberate leak. |

Full gate on the combined tree (`bash scripts/ci.sh`, host, tree `.venv` on `PATH`):

```text
2237 tests: 2225 passed / 0 failed / 12 skipped
```

Per suite: `test.structure` 410/410; `test.gateway` 1361 passed, 0 failed, 9
infrastructure-unavailable; `test.e2e` 25/25; `test.cli` 342/342; every lint,
lock, release-candidate, policy-registry and smoke suite passed.

### Re-run after the WIRING-A integration

`G_0_2_WIRING` part A was independently reviewed OK at `a55d613` and merged at
`b52b661`. The inventory digests went stale on that merge and were refreshed
mechanically per ADR-007 at `f629dfb` — `inventorySha256` only, with
`ci/suites-contract.json` untouched. The full gate was then re-run on the
resulting tree:

```text
2294 tests: 2282 passed / 0 failed / 12 skipped
```

The 57 added tests are WIRING-A's ownership (38) and runtime (19) suites;
`test.gateway` is 1418 passed, 0 failed, 9 infrastructure-unavailable. **Zero
failures again**, with the same four infrastructure-unavailable required suites
and the same attribution recorded below. Nothing new appeared and nothing
previously attributed regressed.

**Zero failures.** The aggregate status remains `infrastructure_unavailable`
rather than `passed`, and that is honest rather than a defect: PostgreSQL, live
Redis and real agent providers are genuinely absent on this host, and three
LangGraph service tests need a service that is not running. Those suites are
correctly infra-classified, not silently passed. No failure remains unattributed
and no defect is carried forward as debt.

The operator decision recorded earlier in this note — whether Wave 2 closes with
those two pre-existing defects carried forward — is **moot**: both were fixed
rather than carried.
