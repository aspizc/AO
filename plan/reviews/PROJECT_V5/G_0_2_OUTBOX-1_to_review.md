# Review Submission — Project V5 G/0/02 OUTBOX (Trial 1)

## Review requested

Please assign an independent reviewer that did not implement this trial. Review
the frozen technical range and write any verdict only to:

```text
plan/reviews/PROJECT_V5/G_0_2_OUTBOX-1_result.md
```

This artifact is a request for review and evidence handoff. It contains no
automatic verdict, integration, promotion, release, production-readiness, or
full-`G/0/02` completion claim.

The exact repository-wide lint command has one inherited failure outside this
lane's pathset. That failure is recorded below. This submission does not claim
that the complete gate is green and does not conceal the failure behind the
passing changed-path lint result.

## Implemented contract

Trial 1 adds only the durable SQLite ACK-intent outbox and migration `003`.

Migration `003_coordination_ack_outbox.sql` creates the private,
body-free `coordination_consumer_ack_intents` relation with:

- a composite foreign key to the exact delivery identity;
- closed state, claim-family, proof, and reason checks;
- state-dependent claim, proof, reason, and terminal-field invariants;
- deterministic backfill for every existing `acknowledging` delivery;
- a partial open-intent cursor index;
- a partial due-intent cursor index;
- a bounded-summary index; and
- an idempotent migration marker.

The SQLite repository now exposes the fixed `directAck` facet:

1. `claim`;
2. `commit`, fixed to proof `DIRECT_ACK`; and
3. `defer`.

It also exposes exactly eight `ackReconciliation` operations:

1. `list`;
2. `claim`;
3. `renew`;
4. `commitTombstone`, fixed to proof `ACK_TOMBSTONE`;
5. `commitOrphan`, fixed to proof `ORPHAN_ACK`;
6. `defer`;
7. `markAckRecoveryRequired`; and
8. `getAckReconciliationSummary`.

Claims use monotonic epochs and deterministic replacement tokens. Every
claim-owned mutation is fenced by state, family, owner, token, and lease
rules. Direct-ACK claims cannot use reconciliation completion or lifecycle
operations, and reconciliation claims cannot use the direct completion
operation.

Terminal completion atomically settles the ACK intent, delivery, and receipt.
It is idempotent only for the exact already-persisted proof. Recovery is
terminal and cannot later be completed. Corrupt persisted rows are projected
or transitioned to `recovery_required`; they are not reported as completed.

The bounded cursor read is index-directed, fetches only `limit + 1`, returns a
detached closed public projection, and never emits settled rows.

The former SQLite `commitAck` surface was removed. No service, queue, wire,
tool, MCP, catalog, health, lifecycle, Redis, PostgreSQL, inventory, manifest,
or workflow surface was changed.

## Frozen candidate identity

```text
Branch:        feat/V5-G-0-02-outbox
Base:          7e4b74ea3e2e2ee863d35711efee4942316e290a
RED:           f7838fa9a07455f10e36481e949271b56f64e103
GREEN:         c7cdea31cd0bd02c504699fd31fcd37fc39cdd66
GREEN tree:    109ced471ab184cbbc4c21cc777e03991c2f5115
Technical range:
  7e4b74ea3e2e2ee863d35711efee4942316e290a..
  c7cdea31cd0bd02c504699fd31fcd37fc39cdd66
Runtime:       Node v22.22.1
```

Commits:

```text
f7838fa9a07455f10e36481e949271b56f64e103
test(coordination): specify durable ACK outbox (V5 G/0/02 OUTBOX Trial 1)

c7cdea31cd0bd02c504699fd31fcd37fc39cdd66
feat(coordination): persist ACK reconciliation outbox (V5 G/0/02 OUTBOX Trial 1)
```

The exact pathset is:

```text
A gateway/migrations/003_coordination_ack_outbox.sql
M gateway/src/core/repositories/sqlite_coordination_consumer_repo.js
A tests/gateway/coordination_ack_outbox_sqlite.test.js
M tests/gateway/coordination_consumer_sqlite_integration.test.js
M tests/gateway/coordination_consumer_sqlite_repo.test.js
```

Range size:

```text
5 files changed, 2405 insertions, 38 deletions
```

Frozen blobs:

```text
gateway/migrations/003_coordination_ack_outbox.sql
  b7caadd10e0a0150b9c0d498ae0f23d08f085ab0
gateway/src/core/repositories/sqlite_coordination_consumer_repo.js
  2971445187bfa8ed12b3f63a725d707fa0bccad2
tests/gateway/coordination_ack_outbox_sqlite.test.js
  793888bc8cacbd249c413c6ac2c632c1927c782f
tests/gateway/coordination_consumer_sqlite_integration.test.js
  52ff58112b7b3550b7bec3a02c54c12f415f5f64
tests/gateway/coordination_consumer_sqlite_repo.test.js
  800b4bdbf11bd042cde14056635450e4059c3068
```

The focal test blob is byte-identical at RED and GREEN:

```text
RED   793888bc8cacbd249c413c6ac2c632c1927c782f
GREEN 793888bc8cacbd249c413c6ac2c632c1927c782f
```

## TDD evidence

### RED

The exact RED commit was exported into a disposable isolated worktree and the
new focal file was run before the production implementation existed:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_outbox_sqlite.test.js
```

Result:

```text
10 tests / 0 passed / 10 failed / 0 skipped
```

All ten specified leaves failed for the intended missing migration or missing
SQLite facet behavior:

1. fresh/upgraded migration convergence and constraints;
2. stale-list two-reconciler convergence;
3. exact due boundary and deferred `prepareAck` reopening;
4. renewal, active-lease exclusion, monotonic epochs, and stale fencing;
5. cross-facet mutation rejection;
6. closed inputs and public projection;
7. fixed proofs and exact-proof idempotence;
8. terminal recovery behavior;
9. corrupt state/proof/token containment; and
10. indexed bounded cursor pagination and settled-row exclusion.

The isolated RED directory was removed after the run.

### GREEN

With the RED test blob unchanged, the same focal command produced:

```text
10 tests / 10 passed / 0 failed / 0 skipped
```

Migration convergence was exercised on both:

- a fresh database; and
- an upgraded migration-`002` database containing a pre-existing
  `acknowledging` delivery.

Both paths produced the same schema. Reapplying migration `003` left the schema,
marker, and backfill unchanged. The upgraded legacy row became:

```text
state=pending
due_at=10002
claim_epoch=0
claim_family=NULL
claim_owner=NULL
claim_token=NULL
proof=NULL
reason=NULL
committed_at=NULL
created_at=10002
updated_at=10002
```

The migration marker count was one and `PRAGMA foreign_key_check` returned no
violations.

## Surviving-mutant proof

Each new guard was challenged in a disposable copy of the exact GREEN
candidate. Every mutation below was a one-purpose mechanical weakening. The
unmutated copy first passed all 10 focal tests. Each mutant then ran only its
directed leaf and produced **0 passed / 1 failed**. No mutant survived.

| Guard | Mechanical weakening | Directed observable failure |
|---|---|---|
| Legacy backfill selection | Changed `acknowledging` selection to a non-matching state | Required backfill row was absent |
| Migration rerun idempotence | Changed marker `INSERT OR IGNORE` to `INSERT` | Second application failed on the marker primary key |
| Persisted state check | Disabled SQLite CHECK enforcement | An unknown ACK-intent state was accepted |
| Closed operation inputs | Disabled the exact-object unsupported-field rejection | An extra claim input field was accepted |
| Exact due boundary | Neutralized due predicates in list and claim | A row one millisecond early was listed |
| Active lease exclusion | Neutralized active-claim expiry predicates | A lease with one millisecond remaining was reclaimed |
| Claimable persisted state | Replaced the pending-state claim predicate with a tautology | An unknown state was claimed rather than contained |
| Monotonic claim epoch | Replaced epoch increment with constant `1` | Replacement claim did not advance its epoch |
| Replacement token | Preserved the placeholder token after claim | The persisted token did not match the claimed epoch |
| Persisted token validation | Neutralized token-format validation | A corrupt token was not sent to recovery |
| Stale-list loser convergence | Disabled the committed fallback branch | The losing reconciler did not receive the closed committed outcome |
| Owner/token fence | Replaced exact owner/token predicates with non-null checks | A stale token mutated the row |
| Commit family fence | Neutralized the commit family predicate | A cross-facet commit succeeded |
| Renew family fence | Neutralized the renewal family predicate | A direct claim was renewed by reconciliation |
| Defer family fence | Neutralized the reconciliation defer family predicate | A cross-facet defer succeeded |
| Recovery family fence | Neutralized the recovery family predicate | A direct claim was terminalized by reconciliation |
| Fixed direct proof | Changed `DIRECT_ACK` wrapper to `ORPHAN_ACK` | SQLite stored the wrong proof |
| Fixed tombstone proof | Changed `ACK_TOMBSTONE` wrapper to `ORPHAN_ACK` | SQLite stored the wrong proof |
| Fixed orphan proof | Changed `ORPHAN_ACK` wrapper to `ACK_TOMBSTONE` | SQLite stored the wrong proof |
| Exact-proof idempotence | Neutralized terminal proof comparison | A same-proof retry was rejected |
| Recovery terminality in prepare | Disabled the recovery branch in `prepareAck` | A recovery row was later reported pending |
| Recovery cannot settle | Expanded settlement to recovery rows and neutralized its reason | A recovery token completed |
| Atomic delivery settlement guard | Changed the required delivery state from acknowledging to pending | The completion transaction failed and rolled back |
| Corruption containment | Replaced corruption recovery with rethrow | A corrupt stale row rejected instead of becoming recovery |
| Closed defer reason | Disabled defer-reason validation | An unsupported reason crossed the public boundary |
| Closed recovery reason | Disabled recovery-reason validation | An unsupported reason crossed the public boundary |
| Cursor index selection | Removed `INDEXED BY` | SQL-observation guard detected the unpinned plan |
| Bounded SQL fetch | Replaced `LIMIT @fetchLimit` with `LIMIT 1000` | SQL-observation guard detected the unbounded fetch |
| Strict cursor continuation | Made the null-cursor branch unconditional | Page two repeated page-one rows |
| Settled-row exclusion | Neutralized the open-state filter and made its partial index full | Committed rows were re-emitted |
| Closed public projection | Returned the internal intent object | Reconciler projection-shape guard observed private fields |
| Cursor validation | Disabled invalid-cursor rejection | A malformed cursor was accepted |
| Page maximum | Disabled the maximum-limit rejection | Limit `101` was accepted |
| Proof-aware summary | Neutralized the proof summary increment | The bounded summary proof count was wrong |
| Deferred prepare reopening | Disabled the deferred-to-pending `prepareAck` branch | Re-preparation left the row deferred |

The mutation copy and every task-owned temporary directory were removed. A
final `/tmp` search found no `g002-outbox-*` directory.

## Directed verification

Required focal outbox suite:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_outbox_sqlite.test.js
```

- **10 passed / 0 failed / 0 skipped**.

Required ACK reconciler conformance suite:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_reconciliation.test.js
```

- **19 passed / 0 failed / 0 skipped**.

Required SQLite repository suite:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer_sqlite_repo.test.js
```

- **100 passed / 0 failed / 0 skipped**.

Additional SQLite integration coverage:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer_sqlite_integration.test.js
```

- **7 passed / 0 failed / 0 skipped**.

Additional migration-runner coverage:

```text
node --test --test-concurrency=1 \
  tests/gateway/state_init.test.js
```

- **6 passed / 0 failed / 0 skipped**.

Changed-path ESLint:

```text
gateway/node_modules/.bin/eslint \
  --config gateway/eslint.config.js \
  gateway/src/core/repositories/sqlite_coordination_consumer_repo.js \
  tests/gateway/coordination_ack_outbox_sqlite.test.js \
  tests/gateway/coordination_consumer_sqlite_repo.test.js \
  tests/gateway/coordination_consumer_sqlite_integration.test.js \
  --no-cache
```

- passed with **0 errors and 0 warnings**.

Range whitespace check:

```text
git diff --check \
  7e4b74ea3e2e2ee863d35711efee4942316e290a..
  c7cdea31cd0bd02c504699fd31fcd37fc39cdd66
```

- passed.

## Required lint gate exception

The exact required command was run without substitution:

```text
npm --prefix gateway run lint -- --no-cache
```

It exited **1** with exactly one error and no warnings:

```text
gateway/src/adapters/process_supervisor.js
  51:7  error  'SESSION_PORT_MAX_REQUEST_BYTES' is assigned a value but never
  used. Allowed unused vars must match /^_/u  no-unused-vars
```

That path and finding are inherited from the exact base:

```text
git diff --quiet \
  7e4b74ea3e2e2ee863d35711efee4942316e290a -- \
  gateway/src/adapters/process_supervisor.js
```

The command exited zero: this lane did not change the failing file. The
out-of-scope lint error was not repaired, suppressed, or staged. Independent
review should record the full gate as not completely green while assessing
the frozen five-path OUTBOX range on its own evidence.

## Scope and hygiene

- No WIRING work was started.
- No health or inventory work was started.
- No full CI, aggregate integration, live Redis, PostgreSQL, service, network,
  MCP, KYA, agent spawn, or tmux command was run.
- No policy, manifest, lock, workflow, plan sheet, shared review index, or
  generated inventory was changed.
- No push was performed.
- The pre-existing untracked `gateway/node_modules` symlink was used only as a
  local dependency provider and is excluded from every commit.
- `git diff --check` passes for the frozen technical range.
- The only technical commits are the RED and GREEN commits listed above.

## Reviewer focus

Please inspect:

1. migration convergence, rerun safety, composite ownership, and CHECK
   completeness;
2. the `BEGIN IMMEDIATE` claim and terminal-transition boundaries;
3. exact family/owner/token/epoch fencing under two-reconciler contention;
4. fixed proof authority and exact-proof idempotence;
5. atomic intent/delivery/receipt settlement and recovery terminality;
6. corrupt-row containment without false completion;
7. index-pinned, limit-plus-one cursor pagination and detached projection;
8. removal of the former SQLite `commitAck` authority; and
9. whether the inherited repository-wide lint failure changes the review
   disposition for this otherwise lane-local candidate.
