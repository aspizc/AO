# Review Submission — Project V5 G/0/02 WIRING-A (Trial 4)

## Authorization and boundary

- This submission implements the store-backed ownership mechanism in
  `plan/PROJECT_V5/G/0/02-DESIGN-store-identity.md` at normative design commit
  `6e32720`. Design Trial 3 authorized implementation in
  `G_0_2_WIRING_A_DESIGN-3_result.md` at `e9c9d2e`.
- The only admitted store-origin profile is the reviewed internal
  `sqlite-disposable-local-test-v1` profile. Generic production construction,
  arbitrary SQLite handles, PostgreSQL, in-memory SQLite, and every unreviewed
  filesystem/VFS profile fail closed. This submission does not add or claim a
  production deployment profile.
- Part A uses non-expiring owner state. It exposes no clear, delete, reset,
  PID, TTL, liveness probe, manual takeover, automatic takeover, or restart
  API. A crash, active-row restore, committed-result validation failure,
  failed/uncertain compensation or release, or generation exhaustion can block
  the scope permanently. Restoring a released snapshot can roll generation
  backward. The operator limitation in `docs/coordination-bus.md` and the
  part-B deferral in `plan/PROJECT_V5/DEFERRED.md` remain accurate.
- No crash-recovery, automatic-restart, durable-convergence, Redis-live-
  recovery, health, inventory, integration, promotion, or release claim is
  made.
- Migration `003` was already integrated before RED. The new migration is
  `004_coordination_consumer_runtime_owner`; it is independently applicable
  and does not read or depend on migration `003` or the ACK-outbox schema.
  Runtime composition consumes only the repository port frozen by
  `coordination_ack_reconciler.js:220-232`.
- The closed cancellation implementation in the Redis lane, queue, service,
  and managed operation remains unchanged. The managed-client edit adds only
  stable-lineage lifecycle notifications; it does not change the existing
  abort signal or callback execution path.

## Reviewed-design gate closure map

| Reviewed gate | Implementation | Directed evidence |
|---|---|---|
| One store-backed arbitration point | `main.coordination_consumer_runtime_owners` has one `scope_id` primary key, persistent safe-integer `generation`, and exact `owned`/`released` state. Claim is one targetless UPSERT transaction; release matches exact scope, generation, and `owned` state. | Migration/schema, two-handle, three-by-400, independent-process, persistent-generation, duplicate-release, and exhaustion cases. |
| `main` is authoritative for owner and repository state | Migration lookup, schema manifest, owner DML, consumer repository SQL, and the final frozen repository attestation are tied to the same SQLite `main` handle. | TEMP owner shadows, attached owner schema, shadow-only migration ledger, complete TEMP repository shadows, and forged mixed-repository cases. |
| Only committed/autocommit results cross the owner port | Claim and release reject an ambient transaction before DML, execute synchronously through `CommittedOwnerTransaction`, require its private witness, recheck autocommit, and then validate the returned row. | Open-transaction claim/release, rollback, independently visible claim, unwitnessed raw candidates, and claim/release post-autocommit fault seams. |
| Exact results, not `changes`, determine disposition | Claim and release accept only exact own-data row shapes. `owned` requires an exact observed active row; busy, malformed, absent, and unclassified outcomes fail closed with a distinct store-unavailable result. | Malformed `RETURNING`, changes-like result, busy database, active-row loser, and maximum-generation cases. |
| Release fence is persistent and exact | Graceful release preserves generation. Replacement increments it; stale and duplicate releases cannot match. Maximum safe generation is permanently closed. | Forced delayed/duplicate release sequence reads generations `1` then `2`; maximum-generation claim returns only `STORE_EXHAUSTED`. |
| One immutable store per stable real-client lineage | One lineage is registered once for the real managed-client object and persists through participant rejoin. Its store assignment is immutable; copied clients, substituted stores, and equal scope text do not create authority. | Complete A/B store substitution, copied client, equal-scope/disjoint-lineage, and real D1-to-D2 cases. |
| D2 cannot overlap D1 | Rejoin revokes D1 admission, withholds D2 permit while D1 work and exact release settle, and faults the lineage if retirement fails. | The real managed client holds accepted D1 work and the release barrier independently; D2 is unavailable until exact retirement. The failure variant never issues D2. |
| Genuine profile-to-store-origin binding | The test profile owns its disposable root, opens every admitted handle itself, and records a private exact `(profile, origin, capability, handle)` tuple. | Genuine capability A fails with wrong-origin B and with a separately opened handle to A; plain, spread, cross-profile, and revoked capabilities reject. |
| Unsupported/ambiguous inputs restrict | No object, path, descriptor, inode, lock, or other weaker identity fallback remains. Generic production, PostgreSQL, in-memory, missing-main, busy, and unclassified inputs reject. | Profile admission cases plus the missing-main, busy, and no-fallback mutations. |
| Runtime work is inside the ownership interval | Runtime start creates no work until committed claim. Stop/retirement aborts and settles accepted consumer and reconciliation work before exact release. Failed initialization compensates the exact generation only after created work settles. | Concurrent-start work-count assertion, explicit settlement-order witness, initialization compensation, and failed compensation/release cases. |
| Option 1 remains deliberately non-expiring | An independent child can claim and exit; the active row and its copied backup remain blocking. No cleanup/takeover method exists. | Crash/active-copy and released-snapshot rollback characterization cases plus public-surface absence checks. |
| Authority remains unreachable | Public runtime instances expose only `start`, `stop`, and `getStatus`. Public modules expose no owner, store/origin capability, lineage/permit, recovery acquirer/facet, managed client, raw lane, callback executor, factory, URL, or options object. | Closed public-module/runtime reachability traversal. Caller-owned SQLite handles both return `42` after stop. |

## TDD failing-then-passing evidence

| Phase | Commit | Command and observed result |
|---|---|---|
| RED | `ad942f5` | `node --test --test-concurrency=1 tests/gateway/coordination_consumer_store_ownership.test.js` returned exit 1: 34 tests, 0 pass, 34 fail, 0 cancelled, 0 skipped. The required migration and reviewed origin-owning profile did not exist, so none of the ownership contracts could pass. |
| GREEN | `89942dd` | The same command returned exit 0: 34 tests, 34 pass, 0 fail, 0 cancelled, 0 skipped. |

The RED commit changes tests only. The GREEN commit implements the reviewed
mechanism, makes existing runtime tests use the origin-owning profile, adds
deterministic cleanup/order witnesses for adversarial mutations, and updates
only the sibling ACK test's SQL-instrumentation matchers to recognize required
`main.` qualification.

## Concurrency and store-origin readback

| Workload | Observed result |
|---|---|
| Three independent same-store runs, 400 handles per run | Each run returned exactly 1 `claimed` and 399 `owned`; aggregate 3 winners and 1,197 closed losers, with no identity inference or resolution error. |
| Independent-process contention | 8 independently forked processes were released together against one file and scope: exactly 1 `claimed`, 7 `owned`, 0 errors; main retained one generation-1 `owned` row. |
| WAL target under unrelated rollback-journal reads | 3 repeated runs × 400 target handles. Every handle read target marker `7`; all 400 distinct target claims and all 400 same-text claims in the unrelated store succeeded per run; the common target scope returned exactly 1 `claimed` and 399 `owned`. |
| Rollback-journal target under unrelated WAL reads | 3 repeated runs × 400 target handles. Every handle read target marker `9`; all distinct cross-store claims succeeded; the common target scope again returned exactly 1 `claimed` and 399 `owned`. |
| Bidirectional aggregate | 6 direction-runs, 2,400 target handles, 4,800 successful distinct-scope store-local claims, 6 common-scope winners, and 2,394 common-scope losers. Ordinary reader processes remained active during each run. |
| D1-to-D2 rejoin | D1 admission was revoked while accepted work remained held; D2 was visible in the managed client but had no run permit. D2 received its same-store permit only after D1 work settled and generation-1 release committed, then claimed generation 2. |
| Failed D1 retirement | The lineage read back `faulted`; D2 received no permit and runtime start returned `COORDINATION_CONSUMER_RUNTIME_LINEAGE_FAULTED`. |
| Caller-owned handles | Multiple injected handles remained open and usable after stop; each returned `42`. Runtime/profile disposal owns only handles the disposable test profile itself opened. |

## Per-guard surviving-mutant proof

The final mutation run used committed GREEN-equivalent source and tests in:

```text
/tmp/g002-wiring-trial4-mutants-4oI8nd
```

The runner was:

```text
node /tmp/g002_trial4_mutations.mjs
```

It first ran the pristine ownership suite: 34 tests, 34 pass, 0 fail,
0 cancelled, 0 skipped. Before each mutation it restored every affected file
from the pristine copy. JavaScript mutations passed `node --check`; the SQL
mutation was executed against a disposable SQLite database after creating
only `main.schema_migrations`. Each named directed test was then run in a real
Node test subprocess. Every mutant produced exactly 1 test, 0 pass, 1 fail,
0 cancelled, 0 skipped, exit 1. No subprocess failed to execute, timed out, or
ended by signal.

| # | Guard mutation applied alone | First failing directed test | Syntax | Mutated | Survivors |
|---:|---|---|---|---:|---:|
| 1 | Remove `main.` from claim UPSERT | owner DML ignores per-handle TEMP shadows and commits one main owner | PASS | 0/1 | 0 |
| 2 | Resolve migration id without `main.` | shadow-only migration records cannot satisfy the main migration guard | PASS | 0/1 | 0 |
| 3 | Resolve owner schema manifest/pragmas through attached `shadow` | attached owner state cannot satisfy a missing main migration or receive DML | PASS | 0/1 | 0 |
| 4 | Unqualify the receipt read used by the consumer repository | consumer repository reads and writes main despite complete TEMP shadows | PASS | 0/1 | 0 |
| 5 | Accept a repository without its owner-issued exact binding | runtime provisioning requires the final repository's same-main attestation | PASS | 0/1 | 0 |
| 6 | Remove claim ambient-transaction preguard | ambient claim is rejected before owner DML and rollback changes nothing | PASS | 0/1 | 0 |
| 7 | Let raw claim/release candidates bypass committed witness | raw exact claim and release candidates cannot cross without a witness | PASS | 0/1 | 0 |
| 8 | Remove claim post-autocommit guard | post-autocommit guards reject registered claim and release witnesses | PASS | 0/1 | 0 |
| 9 | Remove release ambient-transaction preguard | ambient release is rejected before UPDATE and cannot unblock replacement | PASS | 0/1 | 0 |
| 10 | Remove release post-autocommit guard | post-autocommit guards reject registered claim and release witnesses | PASS | 0/1 | 0 |
| 11 | Remove owner `scope_id` primary key | migration 004 is independent, main-qualified, exact, and persistent | PASS | 0/1 | 0 |
| 12 | Return before exact schema admission | exact owner schema rejects a SQL-capable table without scope uniqueness | PASS | 0/1 | 0 |
| 13 | Accept malformed claim `RETURNING` row | returned-row admission rejects malformed rows and changes-like results | PASS | 0/1 | 0 |
| 14 | Accept malformed release `RETURNING` row | returned-row admission rejects malformed rows and changes-like results | PASS | 0/1 | 0 |
| 15 | Admit `changes === 1` without exact row | returned-row admission rejects malformed rows and changes-like results | PASS | 0/1 | 0 |
| 16 | Map busy/unclassified claim to `owned` | busy and unclassified claims never masquerade as STORE_OWNED | PASS | 0/1 | 0 |
| 17 | Hold replacement generation at existing value | persistent monotonic generations fence delayed and duplicate releases | PASS | 0/1 | 0 |
| 18 | Reset generation to 1 during release | persistent monotonic generations fence delayed and duplicate releases | PASS | 0/1 | 0 |
| 19 | Remove exact-generation release comparison | persistent monotonic generations fence delayed and duplicate releases | PASS | 0/1 | 0 |
| 20 | Allow release of an already released row | persistent monotonic generations fence delayed and duplicate releases | PASS | 0/1 | 0 |
| 21 | Remove maximum-generation exhaustion disposition | maximum generation is permanently exhausted without wrap, reset, or delete | PASS | 0/1 | 0 |
| 22 | Mint a new lineage when the real client registers D2 | real D1-to-D2 rejoin retires D1 before issuing a same-store D2 permit | PASS | 0/1 | 0 |
| 23 | Permit immutable lineage assignment replacement | one managed-client lineage has one immutable store assignment | PASS | 0/1 | 0 |
| 24 | Issue a permit with a foreign lineage capability | two admitted handles start exactly one runtime and replace after exact stop | PASS | 0/1 | 0 |
| 25 | Leave predecessor permit unrevoked during rejoin | real D1-to-D2 rejoin retires D1 before issuing a same-store D2 permit | PASS | 0/1 | 0 |
| 26 | Issue D2 permit as soon as D2 is ready | real D1-to-D2 rejoin retires D1 before issuing a same-store D2 permit | PASS | 0/1 | 0 |
| 27 | Keep lineage ready after retirement failure | failed D1 retirement faults the lineage and never issues D2 | PASS | 0/1 | 0 |
| 28 | Accept a provision whose store differs from lineage store | one managed-client lineage has one immutable store assignment | PASS | 0/1 | 0 |
| 29 | Resolve a copied client from copied scope text | one managed-client lineage has one immutable store assignment | PASS | 0/1 | 0 |
| 30 | Reuse lineages globally by textual scope | equal scope text remains independent only for genuinely distinct lineages | PASS | 0/1 | 0 |
| 31 | Accept independently supplied repository facet | runtime provisioning requires the final repository's same-main attestation | PASS | 0/1 | 0 |
| 32 | Transfer genuine origin capability to another handle | genuine origin capability is bound to the exact issuer-opened handle | PASS | 0/1 | 0 |
| 33 | Add caller-handle admission to the origin issuer | origin issuer accepts no caller path or handle and capabilities are not forgeable | PASS | 0/1 | 0 |
| 34 | Accept forged/cross-instance origin capability | origin issuer accepts no caller path or handle and capabilities are not forgeable | PASS | 0/1 | 0 |
| 35 | Return a runtime for generic construction without a profile | generic production and bare database construction stay fixed unsupported | PASS | 0/1 | 0 |
| 36 | Admit SQL-capable PostgreSQL through profile probe | PostgreSQL-shaped and in-memory stores fail their independent admission guards | PASS | 0/1 | 0 |
| 37 | Admit complete in-memory SQLite through profile probe | PostgreSQL-shaped and in-memory stores fail their independent admission guards | PASS | 0/1 | 0 |
| 38 | Treat `owned` claim as permission to start | two admitted handles start exactly one runtime and replace after exact stop | PASS | 0/1 | 0 |
| 39 | Release before accepted work settles | runtime release waits until accepted consumer work has settled | PASS | 0/1 | 0 |
| 40 | Remove exact-generation initialization compensation | initialization failure compensates exact generation after created work settles | PASS | 0/1 | 0 |
| 41 | Permit claim over active non-expiring row | crashed independent owner and active-state copy remain non-expiring blocks | PASS | 0/1 | 0 |
| 42 | Return a weaker claimed identity on owner SQL error | busy and unclassified claims never masquerade as STORE_OWNED | PASS | 0/1 | 0 |

Mutation summary:
`baseline=34/0 syntax_pass=42 killed=42 survived=0 timed_out=0
cancelled=0 skipped=0`.

## Verification gates

| Gate | Observed result |
|---|---|
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_store_ownership.test.js` | exit 0; 34 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_runtime.test.js` | exit 0; 19 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer.test.js tests/gateway/coordination_consumer_sqlite_repo.test.js tests/gateway/coordination_consumer_sqlite_integration.test.js` | exit 0; 148 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_ack_reconciliation.test.js tests/gateway/coordination_ack_outbox_sqlite.test.js` | exit 0; 33 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_client.test.js` | exit 0; 17 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --experimental-test-isolation=none --test-concurrency=1 tests/gateway/coordination_client.test.js tests/gateway/coordination_service_receive.test.js tests/gateway/coordination_queue_receive.test.js tests/gateway/coordination_queue_lifecycle.test.js` | exit 0; 51 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/sqlite_migrations.test.js tests/gateway/state_init.test.js` | exit 0; 11 pass, 0 fail, 0 cancelled, 0 skipped |
| `npm --prefix gateway run lint -- --no-cache` | exit 0 |
| `git diff --check` | exit 0 |

`bash scripts/ci.sh` was not run, as required. No live Redis, network service,
MCP, or production database was used.

## Commits

- `ad942f5` —
  `test(coordination): specify reviewed store ownership (V5 G/0/02 WIRING-A Trial 4)`
- `89942dd` —
  `feat(coordination): implement reviewed store ownership (V5 G/0/02 WIRING-A Trial 4)`

## Changed-path allowlist

- `gateway/migrations/004_coordination_consumer_runtime_owner.sql`
- `gateway/src/coordination_client.js`
- `gateway/src/core/coordination_consumer_lineage.js`
- `gateway/src/core/coordination_consumer_runtime.js`
- `gateway/src/core/coordination_consumer_runtime_error.js`
- `gateway/src/core/coordination_consumer_runtime_provision.js`
- `gateway/src/core/coordination_consumer_runtime_test_profile.js`
- `gateway/src/core/coordination_consumer_runtime_test_worker.js`
- `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js`
- `gateway/src/core/sqlite_coordination_consumer_owner.js`
- `gateway/src/core/sqlite_coordination_repository_binding.js`
- `gateway/src/core/sqlite_store_identity.js` (removed)
- `tests/gateway/coordination_ack_outbox_sqlite.test.js`
- `tests/gateway/coordination_consumer_runtime.test.js`
- `tests/gateway/coordination_consumer_store_ownership.test.js`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_A-4_to_review.md`

The pre-existing untracked `gateway/node_modules` entry remains untouched.
No policy, design, operator decision, runbook, deferral, health, inventory,
public coordination status, migration `003`, or ACK implementation path was
changed.

## Review status

Waiting for independent review. No coder-owned verdict is asserted.
