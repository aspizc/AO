# Implementation handoff — Project V5 G/0/02 OUTBOX Trial 3

Status: `to_review`

This handoff is limited to the remaining Trial 2 P1 in
`G_0_2_OUTBOX-2_result.md`. It makes no WIRING, health/inventory, PostgreSQL,
Redis, integration, promotion, release, or full-`G/0/02` completion claim.

## Candidate

- Trial 2 reviewed-KO contract:
  `7ac610180f6dc328fc2e189a96abbe1d2ea433d4`
- TDD RED:
  `7bffeed4302183620efdbf58d2650790142491e8`
- Technical GREEN:
  `1f9835f51a784bb7f277e1192f459db69ba7da65`

Both Trial 3 commits reference `(V5 G/0/02 OUTBOX Trial 3)`.

## Per-finding closure map

### P1 — terminal proof provenance was not bound to the durable claim family

The persisted ACK-intent projection now accepts a committed intent only when
its terminal proof matches its retained claim family:

- `direct` closes only as `DIRECT_ACK`;
- `reconciliation` closes only as `ACK_TOMBSTONE` or `ORPHAN_ACK`.

`validateAckIntent` enforces this through
`ackProofMatchesClaimFamily` before `ackIntentProjection` returns. The summary
still runs `ackIntentProjection` over every persisted intent before its
aggregate query, so a mismatch fails closed before any result is constructed
or returned.

Migration `003` independently expresses the same relationship in the
`committed` state CHECK. The projection validation remains present because
the corruption regression deliberately bypasses SQLite CHECK constraints for
one update and restores enforcement before the read.

The summary regression now starts from both required normal settled shapes:

1. a `direct` claim normally committed as `DIRECT_ACK`, then relabeled only to
   `ORPHAN_ACK`; and
2. a `reconciliation` claim normally committed through `commitOrphan`, then
   relabeled only to `DIRECT_ACK`.

Before corruption, each row has its exact family/token and proof, a
`completed` receipt, and an `acked` delivery. The test proves the bypass
changes only the proof. Each summary call rejects with
`COORDINATION_CONSUMER_STORE_CORRUPT`, the captured result remains
`undefined`, and the receipt/delivery/intent snapshot is unchanged around the
failed read.

The Trial 1 bounded-listing P1 and false-end-of-cursor P2 were already closed
and independently confirmed in Trial 2. Trial 3 does not change listing,
cursor, containment, claim, or settlement SQL.

## TDD evidence

Before extending the regression, the focal suite passed:

```text
14 passed / 0 failed / 0 skipped
```

At RED commit `7bffeed4302183620efdbf58d2650790142491e8`:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_outbox_sqlite.test.js
```

produced:

```text
12 passed / 2 failed / 0 skipped
```

The two directed failures were:

- migration leaf:
  `Missing expected exception: direct cannot persist ORPHAN_ACK`;
- summary leaf:
  `Missing expected rejection: message-summary-direct-as-orphan`.

At technical GREEN `1f9835f51a784bb7f277e1192f459db69ba7da65`,
the two directed leaves passed:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='migration 003 converges|SQLite ACK summary fails closed' \
  tests/gateway/coordination_ack_outbox_sqlite.test.js

2 passed / 0 failed / 0 skipped
```

The full focal suite then passed `14/14`.

## Surviving-mutant proof

An unmodified disposable candidate first passed both directed leaves
`2 passed / 0 failed`. Four fresh copies under one disposable `/tmp`
workspace then received one mechanical weakening each. Only the named
directed leaf was run. Every mutant produced
`0 passed / 1 failed`; no new guard survived.

| Guard | Mechanical weakening | Directed observable failure |
|---|---|---|
| Migration committed direct/proof mapping | Removed `AND proof = 'DIRECT_ACK'` from the `direct` branch | Migration leaf: `Missing expected exception: direct cannot persist ORPHAN_ACK` |
| Migration committed reconciliation/proof mapping | Removed the reconciliation proof-membership condition | Migration leaf: `Missing expected exception: reconciliation cannot persist DIRECT_ACK` |
| Projection direct/proof mapping | Removed the `DIRECT_ACK` comparison from the direct branch | Summary leaf: `Missing expected rejection: message-summary-direct-as-orphan` |
| Projection reconciliation/proof mapping | Removed the tombstone/orphan membership condition from the reconciliation branch | Summary leaf: `Missing expected rejection: message-summary-reconciliation-as-direct` |

The disposable mutation workspace was removed after the runs.

## Migration convergence and genuine rerun evidence

After the migration change, the directed migration leaf was re-run on the
unmodified candidate:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='migration 003 converges fresh and 002-only databases and is a no-op on rerun' \
  tests/gateway/coordination_ack_outbox_sqlite.test.js

1 passed / 0 failed / 0 skipped
```

That leaf:

- applies migration `003` to a fresh migration-`002` database;
- applies it to a migration-`002` database with a legacy acknowledging
  delivery and compares the complete schema to the fresh result;
- verifies direct/`DIRECT_ACK` and reconciliation/`ORPHAN_ACK` committed
  shapes are accepted;
- verifies both cross-family proof updates fail their CHECK without changing
  the valid row;
- restores and confirms the exact legacy backfill;
- re-executes the complete migration text and compares schema, intent, and
  migration-marker snapshots byte-for-byte; and
- checks foreign keys in both databases.

Migration `002` is unchanged in
`7ac610180f6dc328fc2e189a96abbe1d2ea433d4..1f9835f51a784bb7f277e1192f459db69ba7da65`
(`git diff --quiet` exited `0`).

## Requested gate

Runtime: Node `v22.22.1`.

| Command | Exit | Exact result |
|---|---:|---|
| `node --test --test-concurrency=1 tests/gateway/coordination_ack_outbox_sqlite.test.js` | 0 | 14 passed, 0 failed, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_ack_reconciliation.test.js` | 0 | 19 passed, 0 failed, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_sqlite_repo.test.js` | 0 | 100 passed, 0 failed, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_sqlite_integration.test.js` | 0 | 7 passed, 0 failed, 0 skipped |
| changed-path ESLint | 0 | 0 errors, 0 warnings |
| `git diff --check` | 0 | clean |
| `git diff --check 7ac6101..1f9835f` | 0 | clean |

The exact requested repository-wide lint command was run:

```text
npm --prefix gateway run lint -- --no-cache
```

It exited `1` with exactly one error and no warnings:

```text
gateway/src/adapters/process_supervisor.js
  51:7  SESSION_PORT_MAX_REQUEST_BYTES  no-unused-vars
```

That path is unchanged in the Trial 3 technical range:

```text
git diff --quiet 7ac6101..1f9835f -- \
  gateway/src/adapters/process_supervisor.js
```

exited `0`. This is the inherited, out-of-range lint failure already recorded
and independently adjudicated in Trials 1 and 2. Trial 3 does not repair,
suppress, stage, or otherwise expand into that adapter.

The supplemental changed-path lint command was:

```text
gateway/node_modules/.bin/eslint \
  --config gateway/eslint.config.js \
  gateway/src/core/repositories/sqlite_coordination_consumer_repo.js \
  tests/gateway/coordination_ack_outbox_sqlite.test.js \
  --no-cache
```

It passed with `0 errors / 0 warnings`.

`bash scripts/ci.sh` was not run.

## Changed-path allowlist

The Trial 3 technical range contains exactly:

```text
gateway/migrations/003_coordination_ack_outbox.sql
gateway/src/core/repositories/sqlite_coordination_consumer_repo.js
tests/gateway/coordination_ack_outbox_sqlite.test.js
```

This handoff adds only:

```text
plan/reviews/PROJECT_V5/G_0_2_OUTBOX-3_to_review.md
```

No WIRING, store-identity binder, service lifecycle, health/inventory,
PostgreSQL, live Redis, migration `002`, public receipt projection, plan
sheet, policy, or shared review-index file was changed.
