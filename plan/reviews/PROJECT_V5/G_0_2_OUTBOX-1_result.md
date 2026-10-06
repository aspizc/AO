# Independent Review Result — Project V5 G/0/02 OUTBOX Trial 1

`reviewed_KO`

This is a result-only verdict for review candidate
`0c27f7adafc0980f86cac8c53ad8ed0ae7faacb6`, technical GREEN
`c7cdea31cd0bd02c504699fd31fcd37fc39cdd66`, against base
`7e4b74ea3e2e2ee863d35711efee4942316e290a`. It makes no integration,
promotion, release, WIRING, or full-`G/0/02` completion claim.

## Severity table

| Severity | Count | Finding |
|---|---:|---|
| P0 | 0 | None |
| P1 | 2 | ACK listing is not work-bounded; the summary can silently report a corrupt unsettled row as a committed proof |
| P2 | 1 | Corruption containment can return a false end-of-cursor while eligible intents remain |

## KO findings

### P1 — The pinned list query performs an unbounded full index scan

Evidence:

- `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:2017-2043`
  pins `idx_coord_consumer_ack_outbox_open_cursor`, orders by
  `(consume_key, delivery_id)`, and applies `due_at <= now` only after those
  leading index columns. `LIMIT limit + 1` bounds returned rows, not index
  entries visited.
- I captured the actual SQL prepared by `ackReconciliation.list` and ran
  `EXPLAIN QUERY PLAN` against a database created by migrations `002` and
  `003`. SQLite returned:

  ```text
  SCAN coordination_consumer_ack_intents
    USING INDEX idx_coord_consumer_ack_outbox_open_cursor
  ```

- I then populated the real migration-`003` table with 10,000 valid `pending`
  intents whose `due_at` was in the future and ran that exact query with
  `now=100` and `LIMIT 2`. It returned zero rows, but SQLite statement
  statistics reported:

  ```text
  Fullscan Steps:        9999
  Virtual Machine Steps: 40012
  ```

- The independent contract leaf
  `bounded ACK listing cannot use a full index scan plan` therefore failed:

  ```text
  expected bounded SEARCH plan, received
  [{"detail":"SCAN coordination_consumer_ack_intents USING INDEX idx_coord_consumer_ack_outbox_open_cursor"}]
  ```

This violates the frozen bounded-enumeration requirement. A large population
of deferred/not-due intents makes every empty poll proportional to the open
outbox, so the repository is not bounded by its requested page size.

Required correction:

1. Align eligibility ordering, cursor encoding, and the leading index columns
   so listing can seek into the due work set and advance from an opaque cursor
   without scanning or sorting an unbounded population. Merely retaining
   `LIMIT`, removing `INDEXED BY`, or pinning the existing cursor index is not
   sufficient.
2. Add a directed test using SQLite planner/statement evidence. With fixed
   `limit`, grow a population of future intents by orders of magnitude and
   assert that full-scan/VM work remains bounded independently of that
   population. A regex over emitted SQL is not behavioral proof.

### P1 — Summary aggregation can make a corrupt unsettled ACK look completed

Evidence:

- `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:2498-2535`
  aggregates only `(state, proof)` and checks membership in the two closed
  sets. It does not validate the state-dependent intent fields or the joined
  delivery/receipt settlement invariant enforced by `ackIntentProjection`.
- In a disposable migration-`003` database I used the same corruption
  injection mechanism as the focal suite
  (`PRAGMA ignore_check_constraints = ON`) and changed one pending intent to:

  ```text
  state=committed
  due_at=NULL
  claim_family=NULL
  claim_owner_id=NULL
  claim_token=NULL
  claim_expires_at=NULL
  proof=DIRECT_ACK
  committed_at=12345
  ```

  Its durable receipt was still `effect_committed` and its delivery was still
  `acknowledging`; no transport settlement or fenced commit had occurred.
- `getAckReconciliationSummary()` nevertheless returned:

  ```json
  {
    "total": 1,
    "pending": 0,
    "claimed": 0,
    "deferred": 0,
    "committed": 1,
    "recoveryRequired": 0,
    "proofs": {
      "DIRECT_ACK": 1,
      "ACK_TOMBSTONE": 0,
      "ORPHAN_ACK": 0
    }
  }
  ```

- A subsequent `ackReconciliation.claim` recognized the same row as corrupt
  and converted it to `recovery_required` /
  `TRANSPORT_STATE_UNKNOWN`. Thus the summary's prior completion was not a
  valid alternate interpretation; it was a silent false completion.
- The independent contract leaf
  `corrupt unsettled proof cannot be summarized as a committed ACK` failed
  `1 !== 0` for `summary.committed`.

This violates fail-closed corruption handling and the exactly-one closed-proof
contract. It can expose a plausible committed/proof projection for a receipt
that never completed.

Required correction:

1. Before counting a row as committed/proved, validate the same
   state-dependent claim fields and receipt/delivery settlement relationship
   used by the intent projection. On corruption, either atomically contain the
   row as `recovery_required` before aggregation or fail the summary operation
   closed; never count it as committed.
2. Add a regression that injects a syntactically allowed proof/state pair with
   missing terminal claim authority and an unsettled receipt/delivery, then
   proves the summary cannot report completion. Also cover a committed intent
   with no proof and an open intent carrying a proof.

### P2 — Contained rows can make pagination falsely report end-of-stream

Evidence:

- `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:2038-2063`
  fetches `limit + 1` raw rows, removes corrupt rows from `projected`, and
  derives `nextCursor` only from `projected.length`.
- I seeded four due intents in cursor order, made the first two corrupt by
  adding a proof to their pending rows, and called `list` with `limit=1`.
  The raw page contained the two corrupt rows; both were correctly contained,
  but the result was:

  ```text
  intents.length = 0
  nextCursor      = null
  ```

  Calling the same list again from `cursor=null` immediately returned one of
  the two still-eligible healthy intents. The first page therefore claimed
  end-of-stream while work remained.
- The independent contract leaf
  `corruption containment cannot falsely terminate a nonempty cursor` failed
  on the null continuation.

Required correction:

1. Derive continuation from raw scan progress and an explicit has-more
   decision, not solely from successfully projected rows. An empty projected
   page must still advance safely past rows it contained when unvisited rows
   may remain.
2. Add mixed corrupt/healthy pages at the beginning, middle, and end, including
   a page where every fetched row is corrupt. Prove cursor traversal visits
   every healthy due intent once and never re-emits a terminalized row.

## Per-area adjudication

### Claim-fence atomicity — OK

I opened two independent SQLite connections to one WAL database and released
two worker threads simultaneously against the same due intent. The outcomes
were exactly `["busy", "claimed"]`. The persisted row had
`claim_epoch=1`, the winner's owner, and the winner's returned token.

I separately constructed stale claim calls after defer, commit, and
recovery-required. The returned statuses were:

```text
not_due, committed, recovery_required
```

For each case I hashed the raw receipt, delivery, intent, public receipt, and
summary before and after. The hash pairs were byte-identical:

```text
a29478...dc2 == a29478...dc2
21b56a...fda2 == 21b56a...fda2
6a498b...5bdf == 6a498b...5bdf
```

The first `UPDATE ... RETURNING` repeats the due/state/expiry predicates while
advancing epoch and installing claim authority under `BEGIN IMMEDIATE`; the
follow-up token normalization remains in that same rollback-capable
transaction and is fenced by the just-created epoch/family/owner/placeholder
token.

### Exactly one closed proof — OK

Independent direct, tombstone, and orphan cases persisted exactly:

```text
DIRECT_ACK
ACK_TOMBSTONE
ORPHAN_ACK
```

The same operation/token retry returned `committed` without changing the raw
rows or counters. Attempting the alternate reconciliation proof after a
terminal proof was rejected and left the complete snapshot unchanged. No
second proof relation or field exists.

### Durable claim-family separation — OK

With the same owner and valid claim token:

- a direct claim was rejected by both `commitTombstone` and `commitOrphan`;
- a reconciliation claim was rejected by direct `commit`; and
- every rejection preserved raw receipt, delivery, intent, public receipt,
  and summary/counters byte-for-byte.

The complete-snapshot digests around the direct and reconciliation attempts
were respectively:

```text
9774f51a7ad847a6571c60b15ee835a4a2152fa6fc3eb3642470d81e727a259f
1abbea60bd44e469751a5572ea6cd362f657a8f5b98afa423e4534e2e88932f7
```

There is no separate ACK audit store in this slice; I treated the public
receipt plus reconciliation summary/proof counters as the observable audit
projection and also compared all three durable rows.

### Fail closed and transport ordering — KO for the summary finding

The normal mutation paths behaved correctly:

- an injected unknown state converged to `recovery_required` with
  `TRANSPORT_STATE_UNKNOWN`;
- the receipt remained `effect_committed`;
- the delivery remained `acknowledging`;
- later `prepareAck` and direct claim both returned `recovery_required`; and
- the row never became completed.

With a real SQLite repository wrapped only to record call order, a successful
consumer path emitted:

```text
transport-ack, repository-commit
```

When transport ACK threw, the repository commit wrapper was never called and
durable state was:

```text
intent=deferred
receipt=effect_committed
delivery=acknowledging
```

The exported SQLite repository has no legacy `commitAck` operation. The
summary path remains KO because it can project a corrupt, unsettled row as
completed before the normal claim path contains it.

### Migration discipline — OK

I applied `003` independently to:

1. an empty database after migration `002`; and
2. an `002`-only database with an existing `effect_committed` receipt whose
   delivery was `acknowledging`.

The schemas converged exactly. The legacy delivery became:

```text
state=pending
due_at=2001
claim_epoch=0
claim_family=NULL
claim_token=NULL
proof=NULL
reason_code=NULL
```

Reapplying the exact migration preserved the schema, row, and marker
byte-for-byte (snapshot SHA-256
`74b9c95cf1716234db73e1faca723822573c3ccd1430ed99f82eac5529a1a2b0`).
There was one migration marker and zero `foreign_key_check` violations.

Migration `002` is unchanged in the candidate range. The new relation contains
no body, locator, transport lease token, or lease claim token; its
`claim_token` is the ACK outbox claim token required by the frozen design.
The public receipt contained none of the intent/proof/reason/epoch/token
fields.

### Bounded enumeration and closed projections — KO for listing

Returned page and intent values were plain own-data objects. Mutating the
returned array and intent did not affect a later read, which returned the
persisted `pending` state. Settled intents were not re-emitted in the passing
focal suite.

The actual query is nevertheless a full index scan, and corruption can produce
a false null cursor, as detailed in the findings.

### Scope — OK

The technical range contains only:

```text
gateway/migrations/003_coordination_ack_outbox.sql
gateway/src/core/repositories/sqlite_coordination_consumer_repo.js
tests/gateway/coordination_ack_outbox_sqlite.test.js
tests/gateway/coordination_consumer_sqlite_integration.test.js
tests/gateway/coordination_consumer_sqlite_repo.test.js
```

No WIRING, Redis, PostgreSQL, service, MCP, health, inventory, lifecycle,
manifest, or workflow addition appears in the production delta.

## Independent mutation re-runs

I copied the candidate to four disposable directories, applied one mechanical
weakening per copy, and ran only the named directed leaf. The unmodified focal
suite had already passed 10/10 in this review.

| Guard challenged | Independent mutation | Directed result |
|---|---|---|
| Legacy backfill selection | `acknowledging` → `acked` in migration backfill | exit 1; 0/1 passed; expected legacy row was absent |
| Exact due boundary | list predicate `due_at <= now` → `due_at >= 0` | exit 1; 0/1 passed; early page returned 1 rather than 0 |
| Commit family fence | exact family comparison → non-null tautology while retaining the bound parameter | exit 1; 0/1 passed; expected cross-facet rejection was missing |
| Cursor index selection | removed `INDEXED BY idx_coord_consumer_ack_outbox_open_cursor` | exit 1; 0/1 passed; SQL regex assertion failed |

All four selected mutations turned their directed leaf RED. However, the
cursor-index mutation proves only that the string is present. The unmutated
query still produces a full-scan plan and 9,999 full-scan steps, so that guard
does not observe the bounded-work property it names.

## Gate outputs reproduced

| Command | Exit | Result |
|---|---:|---|
| `node --test --test-concurrency=1 tests/gateway/coordination_ack_outbox_sqlite.test.js` | 0 | 10 passed, 0 failed, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_ack_reconciliation.test.js` | 0 | 19 passed, 0 failed, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_sqlite_repo.test.js` | 0 | 100 passed, 0 failed, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_sqlite_integration.test.js` | 0 | 7 passed, 0 failed, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/state_init.test.js` | 0 | 6 passed, 0 failed, 0 skipped |
| changed-path ESLint from the handoff | 0 | 0 errors, 0 warnings |
| `git diff --check 7e4b74e..c7cdea3` | 0 | clean |
| `git diff --exit-code integration/V5-functional-wave-2...HEAD -- gateway/migrations/002_coordination_consumer.sql` | 0 | unchanged |
| independent migration/concurrency/domain/proof/order/corruption/page probe | 0 | all positive assertions passed; false-summary and scan behavior recorded |
| three independent candidate contract leaves | 1 | 0 passed, 3 failed on the three findings above |

The exact required lint command:

```text
npm --prefix gateway run lint -- --no-cache
```

exited 1 with the one inherited error:

```text
gateway/src/adapters/process_supervisor.js
51:7  SESSION_PORT_MAX_REQUEST_BYTES  no-unused-vars
```

Per the review brief, this is resolved on the current integration head and is
not a KO finding for this candidate. The candidate's changed-path lint passed.

## What I did and did not verify

I verified the frozen contract and repository shapes, inspected the complete
candidate migration and relevant SQLite implementation, reproduced every
requested focused suite, exercised two real SQLite connections concurrently,
constructed mutation-free stale outcomes, compared durable/public/counter
snapshots, exercised all three proof domains and cross-facet failures,
constructed unknown and internally inconsistent persisted rows, measured the
actual SQLite query plan and statement work, applied/reran migration `003` on
fresh and upgraded databases, and reran four mechanical mutants in disposable
copies.

I did not run `scripts/ci.sh`, did not use live Redis, PostgreSQL, network,
WIRING, service lifecycle, health, or inventory composition, and did not
exercise production-scale filesystem latency. Those are outside this result
lane or explicitly reserved by the brief. I changed no source, test,
migration, plan sheet, or shared review index.
