# Review Submission — Project V5 G/0/02 OUTBOX (Trial 2)

## Review requested

Please assign an independent reviewer that did not implement this trial. Review
the frozen Trial 2 correction range and write any verdict only to:

```text
plan/reviews/PROJECT_V5/G_0_2_OUTBOX-2_result.md
```

This is request-only evidence. It contains no automatic verdict, integration,
promotion, release, production-readiness, WIRING, health/inventory, or
full-`G/0/02` completion claim.

Trial 2 is limited to the three findings in
`G_0_2_OUTBOX-1_result.md`. It preserves the reviewed claim-fence atomicity,
exactly-one-closed-proof rule, durable claim-family separation, migration
discipline, and scope.

## Per-finding closure map

| Trial 1 finding | Trial 2 correction | Directed evidence |
|---|---|---|
| P1: listing scanned the complete identity-first open index before applying due eligibility | Migration `003` now derives checked `eligible_at`: pending/deferred use `due_at`, claimed uses `claim_expires_at`. The due cursor index and opaque cursor both lead with `(eligible_at, consume_key, delivery_id)`. Null and continuation queries are pinned to that index, ordered by the same tuple, and continuation uses a composite row-value seek. | The actual prepared SQL produces `SEARCH` plans. At fixed limit, 10 and 10,000 future intents both record 0 full-scan steps and 14 VM steps. A cursor after offset 9,000 also performs a composite seek. Mixed-due traversal proves ordering is eligibility-first. |
| P1: summary counted a corrupt unsettled intent as committed/proved | Before aggregation, summary now passes every durable intent through the existing `ackIntentProjection`, which validates all state-dependent claim fields plus the joined receipt/delivery settlement invariant. Any invalid row makes the summary fail closed with `COORDINATION_CONSUMER_STORE_CORRUPT`; it is never counted. | Regressions inject committed proof without terminal authority, committed intent without proof, open intent with proof, and a fully state-valid committed intent whose receipt/delivery remain unsettled. All four fail closed without mutation. |
| P2: contained corrupt rows could produce a false null cursor | One call fetches only `limit + 1` raw rows, processes at most the first `limit`, and treats the final raw row only as an unprocessed lookahead. Continuation is decided from raw lookahead and encoded from the last processed raw row, regardless of successful projection count. | Beginning, middle, and end corruption cases traverse every healthy due intent exactly once. The beginning case has an all-corrupt fetched page with zero public intents and a non-null continuation. Contained and committed rows are not re-emitted. |

## Frozen candidate identity

```text
Branch:        feat/V5-G-0-02-outbox
Trial 1 KO:    b90897ba9b76aa0a9eac2674e81f307e29c5a089
Trial 2 RED:   bea5f3fdbcabcdd5d24f6e8684b29b4600e3a268
RED tree:      e25360c751d016fc336509e43b572f45270eac9f
Trial 2 GREEN: 176e107d072be7f3aee49a4a088e53b4e6e7e075
GREEN tree:    947563012f158aa47eb8a18f24100bbd8afa807e
Technical range:
  b90897ba9b76aa0a9eac2674e81f307e29c5a089..
  176e107d072be7f3aee49a4a088e53b4e6e7e075
Runtime:       Node v22.22.1
```

Commits:

```text
bea5f3fdbcabcdd5d24f6e8684b29b4600e3a268
test(coordination): specify bounded OUTBOX corrections
  (V5 G/0/02 OUTBOX Trial 2)

176e107d072be7f3aee49a4a088e53b4e6e7e075
fix(coordination): close durable OUTBOX findings
  (V5 G/0/02 OUTBOX Trial 2)
```

The Trial 2 technical pathset is exactly:

```text
M gateway/migrations/003_coordination_ack_outbox.sql
M gateway/src/core/repositories/sqlite_coordination_consumer_repo.js
M tests/gateway/coordination_ack_outbox_sqlite.test.js
```

Range size:

```text
3 files changed, 721 insertions, 54 deletions
```

The test growth includes a 10,000-row behavioral work probe, SQLite
statement-statistics parsing, four summary-corruption cases, three mixed-page
corruption traversals, and mixed-due cursor traversal. Production changes are:

```text
gateway/migrations/003_coordination_ack_outbox.sql
  14 insertions / 1 deletion
gateway/src/core/repositories/sqlite_coordination_consumer_repo.js
  68 insertions / 46 deletions
```

Frozen blobs:

```text
gateway/migrations/003_coordination_ack_outbox.sql
  68b75fa0b9503dd365423e192daee4d0a4db889f
gateway/src/core/repositories/sqlite_coordination_consumer_repo.js
  4033e04b5688ee3f567dcd513a7de13d07fd9219
tests/gateway/coordination_ack_outbox_sqlite.test.js
  ec48988e069ec683c59225ddf2c308bb1512e516
```

The focal test blob is byte-identical at RED and GREEN:

```text
RED   ec48988e069ec683c59225ddf2c308bb1512e516
GREEN ec48988e069ec683c59225ddf2c308bb1512e516
```

## TDD evidence

### RED

The exact RED commit was exported to an isolated disposable worktree and run
without either production correction:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_outbox_sqlite.test.js
```

Result:

```text
14 tests / 9 passed / 5 failed / 0 skipped
```

The five intended failures were:

1. migration `003` lacked the checked derived eligibility key;
2. the prepared list plan was the reviewed full `SCAN`;
3. mixed-due traversal used identity order instead of eligibility order;
4. summary returned rather than rejecting the first corrupt completion; and
5. an all-corrupt raw page returned a null cursor while healthy work remained.

The exact isolated RED directory was removed.

### GREEN

With that RED test blob unchanged:

```text
14 tests / 14 passed / 0 failed / 0 skipped
```

Migration convergence remains covered for a fresh database and a migration
`002` database with an existing `acknowledging` delivery. Both produce the
same final schema and backfill. Reapplying migration `003` preserves the
schema, row, and one marker; foreign-key checks remain empty. The accepted
backfill, composite foreign key, state checks, proof/reason domains, and
body-free intent remain unchanged. Trial 2 adds only the checked virtual
eligibility column and changes the due cursor index's leading key.

## Bounded-list planner and work evidence

The test captures the exact SQL prepared by
`ackReconciliation.list`; it does not reconstruct a look-alike query.

The null-cursor plan from better-sqlite3's SQLite **3.49.2** is:

```text
SEARCH coordination_consumer_ack_intents
  USING INDEX idx_coord_consumer_ack_outbox_due_cursor (eligible_at<?)
```

The continuation plan is:

```text
SEARCH coordination_consumer_ack_intents
  USING INDEX idx_coord_consumer_ack_outbox_due_cursor
  ((eligible_at,consume_key,delivery_id)>(?,?,?) AND eligible_at<?)
```

The database was first populated with 10 valid pending intents whose
`eligible_at` was in the future, then grown by three orders of magnitude to
10,000. With `now=100` and SQL fetch limit `2`, SQLite **3.51.2** statement
statistics were:

| Population | Returned rows | Full-scan steps | VM steps |
|---:|---:|---:|---:|
| 10 future intents | 0 | 0 | 14 |
| 10,000 future intents | 0 | 0 | 14 |

After making all 10,000 rows due at the same time, statement evidence was:

| Position | Full-scan steps | VM steps |
|---|---:|---:|
| front of due set | 0 | 56 |
| composite cursor after offset 9,000 | 0 | 84 |

The deep-cursor work therefore remains page-bounded rather than revisiting the
9,000 preceding equal-time entries. A separate mixed-due test retains all rows
open and proves exact tuple order and one-time traversal.

## Summary fail-closed evidence

Each scenario uses `PRAGMA ignore_check_constraints = ON` only for the
corruption injection, then restores constraint enforcement before invoking
the repository:

1. `state=committed`, `proof=DIRECT_ACK`, but no terminal claim authority and
   an unsettled receipt/delivery;
2. an otherwise terminal claimed row changed to committed with no proof;
3. a pending row carrying `ACK_TOMBSTONE`; and
4. a state-valid committed row retaining the exact deterministic direct claim
   family/owner/token, but with its receipt still `effect_committed` and
   delivery still `acknowledging`.

Every summary call rejects with
`COORDINATION_CONSUMER_STORE_CORRUPT`. The raw receipt, delivery, and intent
snapshot is byte-for-byte unchanged around the failed read.

The fourth case is important: replacing `ackIntentProjection` with only
`validateAckIntent` still turns the test RED, so state-local validation cannot
silently replace the joined settlement invariant.

## Corruption-safe pagination evidence

Three seven-intent databases place two corrupt pending/proof rows at the:

- beginning;
- middle; and
- end

of eligibility order. Traversal uses public limit `1`, commits every healthy
intent it receives, and follows only returned opaque cursors.

For the beginning case the first SQL fetch contains two corrupt rows. The
public page contains zero intents but returns a non-null cursor after the one
raw row it contained; the second raw row remains the lookahead for the next
page. Across all three placements:

- every healthy due identity appears exactly once;
- every corrupt row becomes `recovery_required`;
- no cursor repeats;
- traversal terminates; and
- a restart from null returns no contained or committed row.

## Surviving-mutant proof

The unmodified disposable candidate passed **14/14** before mutation. Each
row below is one mechanical weakening in a freshly restored `/tmp` copy. Only
the named directed leaf was run; every mutant produced **0 passed / 1 failed**.
No mutant survived.

| Guard | Mechanical weakening | Directed observable failure |
|---|---|---|
| Generated eligibility domain | Deleted the `eligible_at` CHECK | Migration structure guard rejected the unchecked column |
| Claimed eligibility time | Changed claimed eligibility from `claim_expires_at` to original `due_at` | A live claim was listed one millisecond before expiry |
| Due index leading key | Changed the index lead from `eligible_at` to `due_at` | Plan became `SCAN ... due_cursor` plus a temporary sort |
| Required index selection | Removed `INDEXED BY idx_coord_consumer_ack_outbox_due_cursor` | Planner selected the summary index and a temporary sort |
| Due upper bound | Replaced `eligible_at <= now` with a nonnegative tautology while retaining the bound parameter | A future intent was returned |
| Composite continuation seek | Replaced the tuple predicate with parameter tautologies | Continuation plan lost the composite lower seek |
| Decoded cursor eligibility | Bound continuation eligibility to `0` | An unchanged open row overlapped the preceding page |
| Eligibility-first ordering | Reordered by identity before eligibility | Mixed-due traversal skipped four of six rows |
| Raw per-call work budget | Processed the lookahead by replacing `rawPage.slice(0, limit)` with `rawPage` | Public limit `2` returned three intents |
| Raw has-more decision | Based continuation on projected count instead of raw count | All-corrupt first page returned null |
| Last processed raw progress | Encoded the unprocessed lookahead as the cursor | Healthy rows between pages were skipped |
| Full summary intent validation | Deleted the pre-aggregation validation loop | Missing-authority committed proof was counted rather than rejected |
| Joined settlement validation | Replaced `ackIntentProjection` with `validateAckIntent` | State-valid but unsettled committed proof was counted rather than rejected |

The mutation worktree and every Trial 2 task-owned temporary directory were
removed. A final `/tmp` search found no `g002-outbox-trial2-*` directory.

## Requested gate

Durable outbox suite:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_outbox_sqlite.test.js
```

- **14 passed / 0 failed / 0 skipped**.

ACK reconciliation conformance:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_reconciliation.test.js
```

- **19 passed / 0 failed / 0 skipped**.

SQLite repository:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer_sqlite_repo.test.js
```

- **100 passed / 0 failed / 0 skipped**.

SQLite consumer integration:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer_sqlite_integration.test.js
```

- **7 passed / 0 failed / 0 skipped**.

Changed-path ESLint:

```text
gateway/node_modules/.bin/eslint \
  --config gateway/eslint.config.js \
  gateway/src/core/repositories/sqlite_coordination_consumer_repo.js \
  tests/gateway/coordination_ack_outbox_sqlite.test.js \
  --no-cache
```

- passed with **0 errors and 0 warnings**.

Range whitespace check:

```text
git diff --check \
  b90897ba9b76aa0a9eac2674e81f307e29c5a089..
  176e107d072be7f3aee49a4a088e53b4e6e7e075
```

- passed.

## Exact lint gate result

The exact requested command was run:

```text
npm --prefix gateway run lint -- --no-cache
```

It exited **1** with exactly the inherited error recorded by the Trial 1
reviewer:

```text
gateway/src/adapters/process_supervisor.js
  51:7  SESSION_PORT_MAX_REQUEST_BYTES  no-unused-vars
```

The Trial 2 technical range does not change that path:

```text
git diff --quiet b90897b..176e107 -- \
  gateway/src/adapters/process_supervisor.js
```

- exited zero.

The Trial 1 independent result explicitly adjudicated this integration-head
drift as not an OUTBOX KO finding. Trial 2 did not repair, suppress, stage, or
otherwise expand into the unrelated adapter. This handoff records the real
non-green command and does not substitute changed-path lint for it.

## Preserved reviewed behavior and scope

- Claim SQL, `BEGIN IMMEDIATE` fencing, epoch/token installation, stale
  outcomes, renewal, defer, recovery, and terminal commit logic are unchanged.
- Direct/tombstone/orphan fixed proof wrappers are unchanged.
- Direct versus reconciliation claim-family fencing is unchanged.
- Receipt/delivery/intent terminal settlement remains atomic.
- Migration `002`, migration `003` backfill, foreign key, state machine, proof
  and reason domains, and marker behavior remain unchanged except for the
  virtual eligibility key and due-index lead required by P1.
- No public receipt field or repository operation was added.
- No WIRING work was started; sibling-owned WIRING part A was not touched.
- No health or inventory work was started.
- No Redis, PostgreSQL, service, queue, tool, MCP, lifecycle, manifest,
  workflow, lock, policy, plan sheet, or shared review index changed.
- No live service, network, agent spawn, tmux, full CI, or
  `bash scripts/ci.sh` command was run.
- No push was performed.
- The pre-existing untracked `gateway/node_modules` symlink is excluded from
  every commit.

## Reviewer focus

Please independently verify:

1. that `eligible_at` exactly models pending/deferred due time and claimed
   lease expiry;
2. both actual `SEARCH` plans and fixed-work statement statistics;
3. composite cursor seeking with equal eligibility times and mixed due times;
4. raw lookahead versus processed-row continuation under corrupt pages;
5. summary reuse of the complete intent plus receipt/delivery invariant;
6. preservation of the Trial 1 independently accepted claim/proof/family and
   migration behavior; and
7. the exact three-path Trial 2 scope.
