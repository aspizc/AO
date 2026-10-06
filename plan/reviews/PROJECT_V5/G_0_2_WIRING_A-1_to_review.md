# Review Submission — Project V5 G/0/02 WIRING-A (Trial 1)

## Scope and boundary

- This submission owns WIRING part A only: the single-owner consumer runtime,
  managed-client reuse, and explicit service lifecycle.
- It consumes only the repository facets already required by the consumer and
  the eight-operation ACK reconciliation port frozen in
  `coordination_ack_reconciler.js`.
- No crash-recovery claim is made. Redis crash/reclaim integration and any
  retained-identity versus lease-loss evidence remain part B.
- No live Redis, network, MCP, tmux, agent, migration, repository-schema, or
  PostgreSQL implementation work is included.

## Deliverable map

| Path | Deliverable |
|---|---|
| `gateway/src/core/coordination_consumer_runtime.js` | Explicit, inert runtime with one owner per caller-owned database/scope, managed-client transport reuse, one-shot private recovery-facet composition, bounded reconciliation scheduling, and abortable/idempotent lifecycle. |
| `gateway/src/coordination.js` | Trusted direct-code export of the runtime factory; no service instance is auto-started or enlarged. |
| `tests/gateway/coordination_consumer_runtime.test.js` | Ten load-bearing runtime characterizations covering ownership, SQLite-only admission, managed-client and recovery authority reachability, repository-port use, start/stop races, and leak readback. |

## What was done

- Kept construction side-effect free. Two independently created coordination
  services reported `ready` while the unstarted runtime remained
  `{ state: "idle", generation: 0 }`, with zero client invocations and zero
  recovery-facet acquisitions.
- Keyed runtime ownership by the already-open database object and canonical
  scope. A same-runtime second start returns
  `COORDINATION_CONSUMER_RUNTIME_ALREADY_RUNNING`; another runtime over the
  same database/scope returns
  `COORDINATION_CONSUMER_RUNTIME_STORE_OWNED`.
- Released ownership only after both supervised loops settled, permitting a
  clean replacement owner and a later restart with generations read back as
  `1`, `1`, and `2`.
- Reused the supplied ready managed coordination client exclusively through
  `invoke("receive", ...)` and `invoke("ack", ...)`. The runtime did not call
  client/service `start`, `stop`, or `close`.
- Accepted only the same exact SQLite-shaped database contract used by the
  existing adapters and rejected `postgres`, another named backend, and a
  shape missing SQLite operations with the explicit I/0/05 deferral message.
  The database remained caller-owned.
- Acquired an exact own-data recovery facet once, copied its two narrow
  operations into a private frozen transport, discarded the acquirer, and
  composed one reconciler. Restart reused that reconciler without another
  acquisition.
- Ran the consumer and bounded reconciliation loop under one abort controller.
  Stop aborts both, waits for both outcomes, clears its interval timer and
  listeners, and returns one stable promise for repeated calls.

## Decisions taken

- The runtime accepts an already-managed, already-ready coordination client.
  It does not create Redis clients, URLs, options, lanes, or connection
  factories, and it does not own the coordination service lifecycle.
- The injected database is used only as the exact-SQLite admission and
  single-owner identity anchor. Repository and quarantine adapters remain
  caller-supplied, so this lane does not open, migrate, query, transact on, or
  close the database.
- Recovery authority enters only through the one-shot trusted acquirer. The
  public runtime exposes exactly `getStatus`, `start`, and `stop`; it exposes
  neither the acquirer nor the acquired facet.
- Runtime lifecycle state is not added to `coordination.status` or operator
  inventory. Health/inventory composition remains outside this lane.

## TDD failing-then-passing evidence

| Phase | Commit | Command and observed result |
|---|---|---|
| RED | `4882c9e84acbd6fd37223fcada7d624b3c7f2d35` | `node --test --test-concurrency=1 tests/gateway/coordination_consumer_runtime.test.js` against the test-only tree in `/tmp/g002-wiring-red.uCIWeb`: 0 pass, 10 fail, 0 skipped; every family failed because the runtime module did not exist. |
| GREEN | `bb613f9b7969c1acd222b08522344ea6087438af` | The same command against the candidate: 10 pass, 0 fail, 0 skipped. |

## Per-guard surviving-mutant table

Each mutation was made in `/tmp/g002-wiring-guards.KYuhfI`, checked with
`node --check`, and run against the complete runtime test file with test
isolation disabled only so named TAP evidence could be retained. The pristine
copy passed 10/10. All 13 mutants compiled, all returned exit 1, and none
survived.

| Guard deleted or made unconditional | Primary killing characterization | Result |
|---|---|---|
| Exact SQLite database admission | `the runtime borrows an exact SQLite database and rejects PostgreSQL` | Killed |
| Ready managed-client identity and exact-scope check | `managed client readiness and exact scope fail closed before ownership` | Killed |
| Exact own-data recovery-facet shape | `recovery acquisition accepts only an exact own-data facet` | Killed |
| Existing store/scope owner rejection | `one SQLite store and scope has one owner, then stop releases it cleanly` | Killed |
| Pre-aborted delay rejection | `an abort immediately before idle delay settles without a timer` | Killed; the stuck stop also contaminated later ownership checks as expected |
| Timer cancellation during delay cleanup | `abortable idempotent stop settles in-flight work and leaks nothing` | Killed |
| Canonical scope configuration | `runtime lifecycle bounds reject invalid scope, interval, and scheduler` | Killed |
| Positive safe reconciliation interval | `runtime lifecycle bounds reject invalid scope, interval, and scheduler` | Killed |
| Scheduler contract | `runtime lifecycle bounds reject invalid scope, interval, and scheduler` | Killed |
| One-shot reconciler/facet initialization | `managed client and ACK recovery authorities are reused once and unreachable` | Killed |
| Active same-runtime second-start rejection | `one SQLite store and scope has one owner, then stop releases it cleanly` | Killed |
| Existing stop-flight reuse | `abortable idempotent stop settles in-flight work and leaks nothing` | Killed |
| Inactive-stop fast path | `stop before start is idempotent and allocates no authority or work` | Killed |

Mutation summary read back from the harness:
`baseline_exit=0 survivors=0 invalid=0 killed=13`.

## Authority and lifecycle readback

The reachability probe started from only the ordinary Redis queue, coordination
service, public queue/coordination/runtime module exports, and the public
runtime object. It read back:

| Probe | Observed value |
|---|---|
| Raw managed-client factory calls | `0` |
| Recovery-facet acquisitions over two start/stop cycles | `1` |
| Managed raw client reachable | `false` |
| Managed raw-client factory reachable | `false` |
| Redis URL reachable | `false` |
| Recovery facet reachable | `false` |
| Recovery acquirer reachable | `false` |
| Forbidden lane/factory/options/executor paths | `[]` |
| Runtime own keys | `["getStatus", "start", "stop"]` |
| Public runtime recovery exports | `[]` |
| Reconciliation repository operations observed | exactly `list`, `claim`, `renew`, `commitTombstone`, `commitOrphan`, `defer`, `markAckRecoveryRequired`, and `getAckReconciliationSummary` |

The injected database call counters after start/stop were all zero:
`prepare=0`, `transaction=0`, `pragma=0`, `migrate=0`, and `close=0`.
Managed client lifecycle counters were also
`start=0`, `stop=0`, and `close=0`.

After aborting in-flight handler work, the running-system readback was:
`pending managed operations=0`, `tracked timers=0`, `abort listeners=0`,
`new active handles=0`, and `new active requests=0`. No ACK was issued for the
aborted delivery.

## Verification

- `node --test --test-concurrency=1 tests/gateway/coordination_consumer_runtime.test.js`
  — 10 pass, 0 fail, 0 skipped.
- `node --test --test-concurrency=1 tests/gateway/coordination_consumer.test.js`
  — 41 pass, 0 fail, 0 skipped.
- `node --test --test-concurrency=1 tests/gateway/coordination_ack_reconciliation.test.js`
  — 19 pass, 0 fail, 0 skipped.
- `npm --prefix gateway run lint -- --no-cache` — exit 0.
- `git diff --check` — exit 0.
- Full CI was not run; the lane brief assigns it to the orchestrator.

## Commits

- `4882c9e84acbd6fd37223fcada7d624b3c7f2d35` —
  `test(coordination): characterize consumer runtime (V5 G/0/02 WIRING-A Trial 1)`
- `bb613f9b7969c1acd222b08522344ea6087438af` —
  `feat(coordination): add single-owner consumer runtime (V5 G/0/02 WIRING-A Trial 1)`

## Changed-path allowlist

- `tests/gateway/coordination_consumer_runtime.test.js`
- `gateway/src/core/coordination_consumer_runtime.js`
- `gateway/src/coordination.js`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_A-1_to_review.md`

No policy, migration, SQLite repository, ACK Lua, queue surface, receipt
projection, CI, changelog, or `plan/PROJECT_V5/G/**` path was changed.

## Review status

Waiting for independent review. No coder-owned verdict is asserted.
