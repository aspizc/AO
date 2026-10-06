# Independent Review Result — Project V5 G/0/02 OUTBOX Trial 2

`reviewed_KO`

This is a result-only verdict for review candidate
`1f5726d2301307cd2babdaba2e2e8219d3150e59`, technical GREEN
`176e107d072be7f3aee49a4a088e53b4e6e7e075`, against Trial 1 result
`b90897ba9b76aa0a9eac2674e81f307e29c5a089`. It makes no integration,
promotion, release, production-readiness, WIRING, health/inventory, or
full-`G/0/02` completion claim.

The Trial 1 unbounded-scan P1 and false-end-of-cursor P2 are closed. The
summary correction rejects the submitted invalid-state and unsettled-join
cases, but it still accepts a terminal proof that is incompatible with the
row's retained durable claim family. That can turn a corrupt proof provenance
into an apparently valid committed summary.

## Severity table

| Severity | Count | Finding |
|---|---:|---|
| P0 | 0 | None |
| P1 | 1 | Summary validation does not bind a committed proof to the durable claim family that was authorized to produce it |
| P2 | 0 | None |

## KO finding

### P1 — A committed proof can contradict its durable claim family and still be summarized

The frozen design gives each proof a specific authority and event:

- `DIRECT_ACK` is produced after live managed-client ACK success;
- `ACK_TOMBSTONE` is produced after internal tombstone inspection; and
- `ORPHAN_ACK` is produced after internal orphan finalization
  (`plan/PROJECT_V5/G/0/02.md:117-126`).

The exported SQLite facets encode the same mapping: direct settlement fixes
`DIRECT_ACK` plus family `direct`, while tombstone/orphan settlement fixes
their respective proof plus family `reconciliation`
(`gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:2892-2922`).
The deterministic token is also domain-separated by family
(`gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:241-252`).

Persisted validation does not preserve that mapping:

- `validateAckIntent` validates `claim_family` and `proof` only as independent
  closed-set members
  (`gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:878-905`);
- it proves that the token matches the retained family
  (`gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:931-950`);
- for `committed`, it requires only a terminal claim and any member of
  `ACK_PROOFS`
  (`gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:977-984`);
- the migration likewise requires only non-null family and non-null proof for
  a committed row
  (`gateway/migrations/003_coordination_ack_outbox.sql:167-177`); and
- `ackIntentProjection` validates the receipt/delivery settlement join, but
  adds no family/proof relationship
  (`gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:1158-1186`).

The Trial 2 summary now calls that projection for every row and then counts the
proof it finds
(`gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:2512-2555`).
It therefore inherits the missing provenance invariant.

#### Independent reproduction 1 — direct authority relabeled as tombstone

I created a normal pending intent through the repository, claimed it through
`directAck`, and committed it normally. I then enabled
`PRAGMA ignore_check_constraints = ON` only for one update that changed
`proof` from `DIRECT_ACK` to `ACK_TOMBSTONE`; all other intent, receipt, and
delivery fields remained untouched. Constraint enforcement was restored
before reading.

The durable shape was otherwise internally and join-valid:

```text
receipt.state       = completed
delivery.ack_state  = acked
intent.state        = committed
intent.claim_epoch  = 1
intent.claim_family = direct
intent.claim_token  = unchanged exact direct-family token
intent.proof        = ACK_TOMBSTONE
```

`getAckReconciliationSummary()` returned instead of failing closed:

```json
{
  "total": 1,
  "pending": 0,
  "claimed": 0,
  "deferred": 0,
  "committed": 1,
  "recoveryRequired": 0,
  "proofs": {
    "DIRECT_ACK": 0,
    "ACK_TOMBSTONE": 1,
    "ORPHAN_ACK": 0
  }
}
```

The snapshot was byte-identical around the read. The summary therefore
attested tombstone inspection even though the retained authority was a direct
claim and no tombstone proof path had run.

#### Independent reproduction 2 — reconciliation authority relabeled as direct

I repeated the probe in the opposite direction: normal reconciliation claim,
normal `commitOrphan`, then changed only `proof` from `ORPHAN_ACK` to
`DIRECT_ACK` under the same temporary constraint bypass. Receipt and delivery
remained settled, the reconciliation family/token remained exact, and the
summary again returned:

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

This is not merely a presentation-label discrepancy. These proof values make
different claims about which external evidence was observed. Accepting a
cross-family proof violates the fixed producer facets and makes the proof
summary untrustworthy after persisted corruption. The Trial 1 summary P1 is
therefore not fully closed.

#### Required correction

1. Make the persisted projection enforce the terminal provenance mapping:
   `direct` may close only as `DIRECT_ACK`; `reconciliation` may close only as
   `ACK_TOMBSTONE` or `ORPHAN_ACK`. A mismatch must fail closed before
   aggregation.
2. Express the same relationship in migration `003`'s committed-state CHECK,
   while retaining projection validation because corruption probes
   deliberately bypass CHECK constraints.
3. Add both otherwise-valid, fully settled cross-family corruptions above to
   the summary regression. Assert `COORDINATION_CONSUMER_STORE_CORRUPT`,
   no summary result, and zero durable mutation.
4. Mutate or remove each new family/proof guard in a disposable copy and prove
   the directed leaf turns RED. Re-run fresh/`002`-only convergence and the
   genuine rerun no-op check after changing the migration.

## Trial 1 finding adjudication

### Bounded listing — closed

I wrapped the real `better-sqlite3` dependency, called
`ackReconciliation.list`, and captured the exact SQL passed to `prepare`.
The null-cursor statement was:

```sql
SELECT *
FROM coordination_consumer_ack_intents
  INDEXED BY idx_coord_consumer_ack_outbox_due_cursor
WHERE state IN ('pending', 'claimed', 'deferred')
  AND eligible_at <= @now
ORDER BY eligible_at, consume_key, delivery_id
LIMIT @fetchLimit
```

Against a database built by applying migrations `002` and `003`,
`EXPLAIN QUERY PLAN` returned:

```text
SEARCH coordination_consumer_ack_intents
  USING INDEX idx_coord_consumer_ack_outbox_due_cursor (eligible_at<?)
```

The captured continuation statement added:

```sql
AND (eligible_at, consume_key, delivery_id) >
    (@cursorEligibleAt, @cursorConsumeKey, @cursorDeliveryId)
```

Its independent plan at a cursor after row 45,000 was:

```text
SEARCH coordination_consumer_ack_intents
  USING INDEX idx_coord_consumer_ack_outbox_due_cursor
  ((eligible_at,consume_key,delivery_id)>(?,?,?) AND eligible_at<?)
```

Using SQLite CLI 3.51.2 statement statistics, `now=100`, public limit `1`,
and therefore SQL fetch limit `2`, I measured:

| Future open intents | Returned | Full-scan steps | VM steps |
|---:|---:|---:|---:|
| 10 | 0 | 0 | 14 |
| 10,000 | 0 | 0 | 14 |
| 50,000 | 0 | 0 | 14 |

After making all 50,000 intents due:

| Position | Returned | Full-scan steps | VM steps |
|---|---:|---:|---:|
| Front | 2 | 0 | 56 |
| Composite cursor after 45,000 | 2 | 0 | 84 |

The work is page/seek-bounded rather than population-bounded. This closes the
Trial 1 full-index-scan defect.

I also challenged index selection rather than trusting the pin:

- on this populated/analyzed database, the same SQL without `INDEXED BY`
  still selected the due-cursor index;
- forcing the planner to decline all indexes produced
  `SCAN coordination_consumer_ack_intents` plus
  `USE TEMP B-TREE FOR ORDER BY`, 49,999 full-scan steps, and 1,250,080 VM
  steps; and
- dropping the pinned index made the production query fail closed as
  `COORDINATION_CONSUMER_STORE_FAILED`; it did not silently degrade to a scan.

The production `INDEXED BY` plus migration-owned index therefore prevents a
planner-choice regression, and absence of that required index is a preparation
failure rather than unbounded fallback.

### Summary fail-closed — submitted cases closed, proof provenance still KO

I independently reproduced the Trial 1 corrupt unsettled completion:

```text
state=committed, proof=DIRECT_ACK, committed_at=60000,
no terminal claim authority, receipt=effect_committed,
delivery=acknowledging
```

The summary rejected with `COORDINATION_CONSUMER_STORE_CORRUPT` and changed no
row.

I then used corruption shapes not listed in the handoff:

| Independent corrupt shape | Result | Mutation during failed read |
|---|---|---|
| Advanced `claim_epoch` from 1 to 2 while retaining the exact epoch-1 token | `COORDINATION_CONSUMER_STORE_CORRUPT` | None |
| Deleted the joined delivery with foreign keys temporarily disabled, leaving the intent orphaned | `COORDINATION_CONSUMER_STORE_CORRUPT` | None |
| Regressed an otherwise committed delivery from `acked` to `acknowledging` | `COORDINATION_CONSUMER_STORE_CORRUPT` | None |
| Relabeled direct-family `DIRECT_ACK` as `ACK_TOMBSTONE` | Incorrect committed/tombstone summary | None |
| Relabeled reconciliation-family `ORPHAN_ACK` as `DIRECT_ACK` | Incorrect committed/direct summary | None |

The complete projection reuse closes state-local and joined-settlement
corruption but not the durable relationship between terminal authority and
proof.

### Pagination containment — closed

I seeded four due intents in exact eligibility order, used public limit `1`,
and corrupted the first row so it occupied exactly the one processed slot
while the second row was the raw lookahead.

The first public page was:

```text
intents.length = 0
nextCursor      = ack-v1:50002:<first consume key>:800-0
```

The corrupt row was atomically contained as
`recovery_required` / `TRANSPORT_STATE_UNKNOWN`. Following only returned
cursors visited all three healthy intents exactly once, used three unique
cursors, terminated with a null cursor, and a restart from null returned no
contained or committed row. Eligible work was not hidden behind a false
end-of-cursor.

## Migration `003` re-verification

I applied the exact candidate migration to:

1. an empty migration-`002` database; and
2. a migration-`002` database containing an existing
   `effect_committed`/`acknowledging` delivery.

The resulting schemas were identical. The legacy delivery backfilled exactly:

```text
state       = pending
due_at      = receipt.updated_at = 50001
claim_epoch = 0
proof       = NULL
```

Reapplying the complete migration left the schema, intent, marker, and public
receipt serialization byte-identical. There was exactly one `003` marker and
both `PRAGMA foreign_key_check` results were empty.

Additional checks:

- `gateway/migrations/002_coordination_consumer.sql` is unchanged in
  `b90897b..176e107` (independent SHA-256:
  `257cab639e9cac9c9be14d197dd9f2fdca9917acca37b13f570b028a7f6200a3`);
- the intent table has no body, message body, locator, STORE lease token, or
  STORE lease-claim-token column;
- its `claim_token` remains the domain-separated ACK-outbox claim token, not
  the receipt lease token;
- the public receipt before and after migration was deeply equal and retained
  only the existing top-level keys; and
- migration `003` did not duplicate a body or locator.

Fresh/upgrade convergence, backfill, no-op rerun, migration separation, and
public projection preservation pass. The missing committed family/proof CHECK
belongs to the single P1 above.

## Independent surviving-mutant re-runs

I exported the exact candidate to seven fresh disposable `/tmp` copies,
linked only the existing dependency installation, made one mechanical
weakening per copy, and ran only the named directed leaf. The unmodified focal
suite had first passed 14/14. Every mutant produced 0 passed / 1 failed:

| Guard challenged | Independent weakening | Directed failure |
|---|---|---|
| Generated eligibility domain | Deleted the `eligible_at` CHECK | Migration structure assertion failed |
| Claimed eligibility time | Used `due_at` instead of `claim_expires_at` for claimed rows | Live claim was listed before expiry (`expected 0`, `actual 1`) |
| Due-index leading key | Changed `eligible_at` to `due_at` | Bounded-plan assertion failed |
| Raw has-more decision | Used projected count instead of raw count | All-corrupt boundary returned null instead of a cursor |
| Last processed progress | Encoded the unprocessed lookahead as the cursor | Healthy traversal set differed |
| Full summary validation | Deleted the pre-aggregation validation loop | Missing-authority corruption did not reject |
| Joined settlement validation | Replaced `ackIntentProjection` with `validateAckIntent` | State-valid unsettled completion did not reject |

No selected Trial 2 guard survived.

## Preserved behavior and scope

### Claim-fence atomicity — preserved

Two repository instances over one WAL database produced exactly
`["busy", "claimed"]` for the same due intent. The stored epoch/token belonged
to the winner. The focal stale-reconciler test also passed, and stale token,
renewal, defer, recovery, and settlement checks remained green.

### Exactly one normal closed proof — preserved

Normal direct, tombstone, and orphan operations stored their respective fixed
proofs. Exact same-operation/token retry was mutation-free. In my independent
tombstone case, an alternate direct settlement was rejected as
`COORDINATION_CONSUMER_ACK_INTENT_NOT_OWNED` without changing receipt,
delivery, intent, or summary.

The P1 is specifically the fail-closed projection of corrupt persisted proof
provenance; it does not report a normal API cross-facet settlement.

### Durable claim-family separation — preserved on mutation paths

The fixed facets and family predicates still reject direct-versus-
reconciliation cross-settlement. Claim epoch/token installation remains
domain-separated and mutation-free on rejection. The KO is that read-side
validation later forgets the required family/proof relationship.

### Migration discipline — preserved subject to the P1 correction

Fresh/upgrade convergence, deterministic backfill, constraints, marker
idempotence, foreign keys, migration-`002` isolation, and body/locator/public
projection boundaries passed as detailed above.

### Scope — preserved

The complete Trial 2 technical range is exactly:

```text
gateway/migrations/003_coordination_ack_outbox.sql
gateway/src/core/repositories/sqlite_coordination_consumer_repo.js
tests/gateway/coordination_ack_outbox_sqlite.test.js
```

No WIRING, service composition, health, inventory, Redis, PostgreSQL, MCP,
queue, lifecycle, manifest, workflow, or plan-sheet change entered the
technical range.

## Gate outputs reproduced

Runtime: Node `v22.22.1`.

| Command | Exit | Result |
|---|---:|---|
| `node --test --test-concurrency=1 tests/gateway/coordination_ack_outbox_sqlite.test.js` | 0 | 14 passed, 0 failed, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_ack_reconciliation.test.js` | 0 | 19 passed, 0 failed, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_sqlite_repo.test.js` | 0 | 100 passed, 0 failed, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_sqlite_integration.test.js` | 0 | 7 passed, 0 failed, 0 skipped |
| changed-path ESLint from the handoff | 0 | 0 errors, 0 warnings |
| `git diff --check b90897b..176e107` | 0 | clean |
| migration-`002` range check | 0 | unchanged |
| independent plan/work/corruption/pagination/migration/fence assertions | 0 | all positive assertions passed; cross-family outcomes recorded separately |
| independent cross-family fail-closed contract assertion | 1 | expected `rejected`, actual `returned` for direct-family/tombstone proof |

The exact required command:

```text
npm --prefix gateway run lint -- --no-cache
```

exited `1` with one error and no warnings:

```text
gateway/src/adapters/process_supervisor.js
51:7  SESSION_PORT_MAX_REQUEST_BYTES  no-unused-vars
```

That path is unchanged in `b90897b..176e107`; this is the same inherited,
out-of-range lint failure recorded in Trial 1, not an additional OUTBOX
finding.

The SQLite consumer integration suite genuinely passed 7/7 on this branch;
the direct-ACK repository facet required by that integration is present.

## What I did and did not verify

I inspected the complete Trial 2 technical range and the Trial 1 KO
specification; captured the actual prepared list statements; ran
`EXPLAIN QUERY PLAN` myself; measured statement work at 10, 10,000, and 50,000
rows plus a 45,000-row deep cursor; forced planner index refusal; exercised a
missing pinned index; injected the Trial 1 corruption and five independent
corruption shapes; traversed a corrupt exact-limit boundary; applied and
reapplied migration `003` on fresh and upgraded databases; compared raw,
public, schema, and marker snapshots; re-ran seven disposable mutants; and
ran every focused suite and lint/range gate listed above.

I did not run `bash scripts/ci.sh`, did not use live Redis, PostgreSQL, network,
WIRING, service lifecycle, health, or inventory composition, and did not
exercise production filesystem latency. I changed no source, test, migration,
plan sheet, or shared review index. I did not push, integrate, promote, or
claim the full `G/0/02` task complete.
