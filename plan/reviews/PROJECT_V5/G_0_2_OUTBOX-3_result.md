# Independent Review Result — Project V5 G/0/02 OUTBOX Trial 3

`reviewed_OK`

This is a result-only verdict for review candidate
`9f73f68118f326cca654e724655397b59a2f0cec`, technical GREEN
`1f9835f51a784bb7f277e1192f459db69ba7da65`, against the Trial 2 result at
`7ac610180f6dc328fc2e189a96abbe1d2ea433d4`.

The remaining Trial 2 P1 is closed. A committed ACK proof is now bound to its
retained durable claim family both by migration `003`'s committed-state CHECK
and by the persisted projection that runs before summary aggregation. I found
no P0, P1, or P2 issue in the reviewed scope.

This verdict makes no integration, promotion, release, production-readiness,
WIRING, health/inventory, PostgreSQL, Redis, or full-`G/0/02` completion
claim.

## Severity table

| Severity | Count | Finding |
|---|---:|---|
| P0 | 0 | None |
| P1 | 0 | None |
| P2 | 0 | None |

## Trial 2 finding adjudication

The two required enforcement layers are both present:

- migration `003` accepts a committed `direct` row only with `DIRECT_ACK`,
  and a committed `reconciliation` row only with `ACK_TOMBSTONE` or
  `ORPHAN_ACK`
  (`gateway/migrations/003_coordination_ack_outbox.sql:167-187`);
- `ackProofMatchesClaimFamily` expresses the same closed mapping in the
  repository
  (`gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:41-49`);
- `validateAckIntent` invokes that mapping for every committed row
  (`gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:988-995`);
  and
- `getAckReconciliationSummary` runs the full joined intent projection over
  every persisted intent before constructing its aggregate
  (`gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:2523-2539`).

I did not rely on those source observations or on the submitted regression.
I exercised each layer independently.

### Independent reproduction of both named corruptions

For each case I created a fresh migration-`002` plus migration-`003` database,
used the public repository to create an effect-committed pending intent,
claimed and settled it through the normal producer facet, and confirmed:

```text
receipt.state       = completed
delivery.ack_state  = acked
intent.state        = committed
intent.claim_epoch  = 1
intent.claim_family = the normally claimed family
intent.claim_token  = the exact domain-separated token returned by that claim
intent.proof        = the proof fixed by that settlement facet
```

I then enabled `PRAGMA ignore_check_constraints = ON` for exactly one update,
restored it to `OFF`, and called the real
`getAckReconciliationSummary()`. The pre-corruption settled snapshot was
reconstructed from the corrupt snapshot by restoring only the named proof,
which proves that no other receipt, delivery, or intent field changed.

| Independent case | Bypassed update | Summary result | Error | Before/after durable-row SHA-256 |
|---|---|---|---|---|
| Normal direct claim and `directAck.commit` | `DIRECT_ACK` → `ORPHAN_ACK` | No result; capture remained `undefined` | `COORDINATION_CONSUMER_STORE_CORRUPT` | `d7d4cfebfcb670b86c0a843d82c33f30ae288d033bc2a33518b38b5251ba462b` both times |
| Normal reconciliation claim and `commitOrphan` | `ORPHAN_ACK` → `DIRECT_ACK` | No result; capture remained `undefined` | `COORDINATION_CONSUMER_STORE_CORRUPT` | `30e82b6e63d4ffa4668b099b45ca5b22305dd869cf95746bcc566c2bb332537f` both times |

The snapshots were fresh reads of the complete receipt, delivery, and intent
rows immediately before and after the failed summary. Their serialized bytes,
not merely selected provenance fields, were identical.

### Additional provenance corruptions

I added three cases that are not listed in the Trial 3 handoff. Each began
from a normal, fully settled row and used the same temporary CHECK bypass.

| Additional corruption | Why it is distinct | Summary result | Durable mutation during failed read |
|---|---|---|---|
| Set a direct committed row's `claim_family` to `NULL` while retaining its exact direct token and `DIRECT_ACK` | Proof is set but the authorizing family is absent | `COORDINATION_CONSUMER_STORE_CORRUPT`; no summary | None; before/after SHA-256 `c1de7776159291b7ce9588cbf35e8ef356f5e171debfcc1318a199374d7662b2` |
| Set a reconciliation committed row's `claim_family` to `alien-family` while retaining its exact reconciliation token and `ORPHAN_ACK` | Proof is set but the authorizing family is unrecognised | `COORDINATION_CONSUMER_STORE_CORRUPT`; no summary | None; before/after SHA-256 `e7897e3fb1d3edc5c8f7b6b3536ecb44e5ce14e830e3276628d5d726cc84de0f` |
| Change a normal direct row to the isolation-valid pair `reconciliation`/`ORPHAN_ACK` while retaining the exact direct-family claim token | The current family/proof pair agrees, but the durable token belongs to the other claim family | `COORDINATION_CONSUMER_STORE_CORRUPT`; no summary | None; before/after SHA-256 `c1454962ece284edc6586050d05102f1f8bc60f626bc2cc0d7e433bac890282a` |

For the third case, reconstructing the normal settled snapshot required
restoring only `claim_family = direct` and `proof = DIRECT_ACK`; owner, epoch,
token, receipt, delivery, and every other intent field remained the normal
direct-settlement values. All three summary captures remained `undefined`.

## Independent two-layer verification

### Projection with the CHECK bypassed

All five corruptions above were durably present only because
`ignore_check_constraints` was temporarily enabled. I asserted the pragma was
back to `0` before every summary read. Every read failed in the projection
with `COORDINATION_CONSUMER_STORE_CORRUPT`, produced no summary, and was
mutation-free. This proves the projection does not depend on SQLite having
prevented the row.

### CHECK without the projection

I separately copied each normal committed row, deleted only its intent row,
and attempted an ordinary direct SQL `INSERT` with constraint bypass disabled.
No repository projection or summary code ran:

| Ordinary non-bypassed insert | SQLite result | Persisted intent rows |
|---|---|---:|
| Exact normal direct committed row except `proof = ORPHAN_ACK` | `SQLITE_CONSTRAINT_CHECK` | 0 |
| Exact normal reconciliation committed row except `proof = DIRECT_ACK` | `SQLITE_CONSTRAINT_CHECK` | 0 |

The CHECK therefore rejects independently. The four guard-deletion trials
below prove that neither layer, nor either family branch within a layer, is
decorative.

## Migration `003` re-verification

I applied the exact candidate migration to:

1. a fresh migration-`002` database; and
2. a migration-`002` database containing a real repository-created
   `effect_committed` receipt whose delivery was in the legacy
   `acknowledging` state.

The complete `sqlite_master` snapshots converged to the same SHA-256:

```text
8040b78ed68cbc956259278ae7f7b0b751ffcf79a50196380decb108785cf1ed
```

The upgraded legacy row backfilled exactly as:

```text
state            = pending
due_at           = receipt.updated_at = 82002
claim_epoch      = 0
claim_family     = NULL
claim_owner_id   = NULL
claim_token      = NULL
claim_expires_at = NULL
proof            = NULL
```

Before applying `003`, I captured every pre-existing migration-`002` table
definition and every row. They remained deeply equal afterward, as did every
pre-`003` migration marker. This independently verifies that `003` did not
reopen or rewrite `002`.

The public receipt was read through the production repository before and
after `003`; the complete projection was deeply equal and retained exactly
these top-level keys:

```text
consumeKey, metadata, state, attempts, lease, deliveries, effect,
quarantine, replay, createdAt, updatedAt
```

The outbox table has no body, locator, `lease_token`, or
`lease_claim_token` column. The legacy backfill retained a null outbox
`claim_token`, and all pre-existing rows—including any body/locator-owning
tables in the migration-`002` schema—were unchanged. The migration therefore
did not duplicate a body or locator or persist a receipt lease token.

I then re-executed the complete migration text. Schema, every table row,
public receipt, and foreign-key-check snapshots were byte-for-byte
equivalent before and after the rerun:

```text
first SHA-256  = 550ed103f0d7823fd303a1a7442b6fe995d2ab987f99723fdd9e70167c580b7d
second SHA-256 = 550ed103f0d7823fd303a1a7442b6fe995d2ab987f99723fdd9e70167c580b7d
```

There was exactly one `003_coordination_ack_outbox` marker and zero foreign
key violations in both fresh and upgraded databases.

Migration `002` is unchanged in `7ac6101..1f9835f`
(`git diff --quiet` exit `0`), with independently calculated SHA-256:

```text
257cab639e9cac9c9be14d197dd9f2fdca9917acca37b13f570b028a7f6200a3
```

## Independent surviving-mutant re-runs

I exported the exact candidate to fresh copies under one disposable `/tmp`
workspace and linked only the existing dependency installation. The
unmodified copy first passed the migration and summary directed leaves:

```text
2 passed / 0 failed / 0 skipped
```

I then made one mechanical weakening per fresh copy and ran only the
corresponding directed leaf:

| Guard independently removed | Directed result | Observable failure |
|---|---:|---|
| Migration direct branch: `proof = 'DIRECT_ACK'` | exit 1; 0 pass / 1 fail | `Missing expected exception: direct cannot persist ORPHAN_ACK` |
| Migration reconciliation branch: proof membership in `ACK_TOMBSTONE`, `ORPHAN_ACK` | exit 1; 0 pass / 1 fail | `Missing expected exception: reconciliation cannot persist DIRECT_ACK` |
| Projection direct branch: `proof === "DIRECT_ACK"` | exit 1; 0 pass / 1 fail | `Missing expected rejection: message-summary-direct-as-orphan` |
| Projection reconciliation branch: tombstone/orphan proof membership | exit 1; 0 pass / 1 fail | `Missing expected rejection: message-summary-reconciliation-as-direct` |

All four new provenance guards are observed; no selected mutant survived.

## Non-regression spot-checks

### Bounded listing plan and pagination

I wrapped the production SQLite dependency, invoked the real listing facet,
captured its prepared SQL, and independently ran `EXPLAIN QUERY PLAN`.
With public limit `1`, the SQL fetch limit was `2`, and both statements
retained `LIMIT @fetchLimit`.

The null-cursor plan was:

```text
SEARCH coordination_consumer_ack_intents
USING INDEX idx_coord_consumer_ack_outbox_due_cursor (eligible_at<?)
```

The continuation plan was:

```text
SEARCH coordination_consumer_ack_intents
USING INDEX idx_coord_consumer_ack_outbox_due_cursor
((eligible_at,consume_key,delivery_id)>(?,?,?) AND eligible_at<?)
```

No `SCAN` appeared. The full focal suite also re-executed the
population-independent work bound, composite cursor ordering, corrupt
exact-limit pagination, and no-reemission leaves. All passed.

### Claim fence, terminal proofs, and durable family separation

The focal suite re-ran the two-reconciler stale-page race, monotonic
epoch/token and stale-token fence, every cross-facet settlement with zero
row mutation, exactly-once direct/tombstone/orphan proof closure, terminal
recovery, and corruption containment. All 14 leaves passed.

The core reconciliation suite independently passed its bounded renewable
claim, explicit-proof closure, stale-race, fixed producer-facet, and
cross-family no-mutation leaves as part of 19/19.

### Wave-level SQLite integration

`coordination_consumer_sqlite_integration` genuinely passed 7/7 on this
branch. The repository facet widening that this lane supplies is therefore
present for every real-consumer SQLite integration leaf exercised here. This
is a lane-local verification, not a claim that the integration branch or
wave is otherwise green.

### Scope

The Trial 3 technical range `7ac6101..1f9835f` contains exactly:

```text
gateway/migrations/003_coordination_ack_outbox.sql
gateway/src/core/repositories/sqlite_coordination_consumer_repo.js
tests/gateway/coordination_ack_outbox_sqlite.test.js
```

The handoff commit adds only:

```text
plan/reviews/PROJECT_V5/G_0_2_OUTBOX-3_to_review.md
```

No WIRING, health/inventory, PostgreSQL, Redis, migration `002`, service
lifecycle, public receipt contract, policy, plan sheet, or shared review
index entered the candidate range.

## Gate outputs reproduced

Runtime: Node `v22.22.1`.

| Command | Exit | Exact result |
|---|---:|---|
| `node --test --test-concurrency=1 tests/gateway/coordination_ack_outbox_sqlite.test.js` | 0 | 14 passed, 0 failed, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_sqlite_repo.test.js` | 0 | 100 passed, 0 failed, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_sqlite_integration.test.js` | 0 | 7 passed, 0 failed, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_ack_reconciliation.test.js` | 0 | 19 passed, 0 failed, 0 skipped |
| Changed-path ESLint for the repository and outbox test | 0 | 0 errors, 0 warnings |
| `git diff --check` | 0 | clean before this result |
| `git diff --check 7ac6101..1f9835f` | 0 | clean |
| Migration-`002` range check | 0 | unchanged |
| Independent five-case projection probe | 0 | all rejected, no summary, byte-identical rows |
| Independent two-case ordinary INSERT CHECK probe | 0 | both rejected, zero rows inserted |
| Independent migration and bounded-plan probes | 0 | all assertions passed |
| Four independent guard-deletion mutants | expected nonzero | all four directed leaves turned red |

The exact required repository-wide command:

```text
npm --prefix gateway run lint -- --no-cache
```

exited `1` with one error and no warnings:

```text
gateway/src/adapters/process_supervisor.js
51:7  SESSION_PORT_MAX_REQUEST_BYTES  no-unused-vars
```

That adapter is unchanged in the Trial 3 technical range
(`git diff --quiet 7ac6101..1f9835f` exit `0`). At the locally available
current `integration/V5-functional-wave-2` head
`b174599d859cb1764633890a7026a7356189db7a`, the constant is used at line
1404, so this inherited candidate-branch lint error is resolved there. It is
not an OUTBOX finding and this result does not change or suppress it.

`bash scripts/ci.sh` was not run.

## What I did and did not verify

I inspected the Trial 2 result, Trial 3 handoff, exact candidate range,
migration CHECK, repository projection, summary ordering, and directed
regressions. I independently reproduced both named corruptions and three
additional provenance corruptions; read complete receipt, delivery, and
intent rows before and after every failed summary; separated projection
enforcement from CHECK enforcement; applied and reapplied migration `003` to
fresh and upgraded databases; compared schema, all existing rows, migration
markers, public receipt projection, and foreign keys; captured and explained
the production listing plans; re-ran four isolated mutants plus an
unmodified control; and ran every suite and gate reported above.

I did not run `bash scripts/ci.sh`, WIRING, health/inventory, PostgreSQL, live
Redis, network, service composition, or production filesystem-latency tests.
I changed no source, test, migration, plan sheet, policy, or shared review
index. I did not push, integrate, promote, release, or claim full
`G/0/02` completion.
