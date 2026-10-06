# Review Submission — Project V5 G/0/02 WIRING-A (Trial 5)

## Authorization and boundary

- This submission closes only the P1 and P2 findings in
  `G_0_2_WIRING_A-4_result.md` at `dc2eabc`.
- The implementation remains the store-backed, non-expiring Option 1 design
  authorized by `G_0_2_WIRING_A_DESIGN-3_result.md`. It adds no owner clear,
  delete, reset, PID, TTL, liveness probe, takeover, or restart path.
- No crash-recovery, automatic-restart, durable-convergence,
  Redis-live-recovery, health, inventory, integration, promotion, release, or
  production-profile claim is made.
- The sibling ACK-outbox schema and migration `003` are not read by WIRING-A.
  Runtime composition still consumes only the eight-operation repository port
  frozen at `coordination_ack_reconciler.js:220-232`.
- No cancellation implementation in the managed client, service, queue, or
  Redis lane changed. The three real-managed-client cancellation fixtures now
  start the client before issuing a runtime provision because a reviewed
  provision requires an existing incarnation permit; their receive,
  cancellation, cleanup, and settlement assertions are unchanged.

## Per-finding closure map

| Trial 4 finding | Trial 5 correction | Directed evidence |
|---|---|---|
| P1 — a provision followed the lineage's current permit rather than the permit under which it was issued | Every provision stores the exact opaque `IncarnationRunPermit` captured after the managed client is ready. Admission, retirement binding, permit probing, and each managed transport operation receive that exact permit. Retirement handlers are stored per permit. A revoked permit rejects a managed operation before `client.invoke`. The successor provisioner accepts no store argument and captures D2 while reusing the predecessor lineage's sealed main store. | `real D1-to-D2 rejoin retires D1 before issuing a same-store D2 permit`; `revoked D1 runtime work rejects its ACK before D2 credentials are used`; `D2 successor permit resolves the lineage store without a store parameter`. |
| P2 — generation reset and exact-release mutants were masked by returned-row validation | The RED commit adds separate durable readback fixtures. Each disposable mutant also projects the requested generation in `RETURNING`, allowing the intact returned-row validator to pass. The reset fixture then observes the persisted reset and wrong next generation; the stale-release fixture observes the replacement row changed to `released`. | `successful exact release preserves generation for the next claim`; `delayed release predicate leaves the replacement row owned`. |
| P2 — the permit-store mutant did not implement the approved D2 store-parameter mutation | The corrected mutant adds and honors complete store-B inputs in successor provisioning, binds its mutated permit admission to B, and reaches B owner SQL. It is not rejected by the lineage-integrity or configured-store guards. | `D2 successor permit resolves the lineage store without a store parameter` becomes red because A remains at generation 1 and B is changed. |
| P2 — predecessor revocation was observed only through a test probe | Removing only the D1 revocation assignment now leaves the D1 permit operational while the handler is held. The fixture releases accepted D1 work after D2 credentials are installed and observes a real managed ACK invocation. The pristine guard rejects that ACK before invocation. | `revoked D1 runtime work rejects its ACK before D2 credentials are used`: pristine `ackInputs` is exactly `[]`; the revocation mutant records an ACK carrying D2 credentials. |

## Incarnation-permit and rejoin evidence

The private authority chain is now:

```text
real managed client
  -> stable lineage L with immutable store A
  -> exact D1 permit
  -> D1 provision
  -> D1 runtime admission and managed operations
```

On rejoin, D1 is marked revoked before the retirement flight starts. The
managed client may install D2 transport credentials while D1 settlement is
still pending, but there is no D2 runtime provision at that point.

The accepted-handler fixture holds D1 after handler admission, triggers
rejoin, waits until the managed client reports `pt-d2`, and confirms the D1
permit is revoked. When the handler returns a committed result, its ACK
attempt is checked against D1's exact permit. The attempt rejects before the
real managed client's `invoke`, so:

- zero ACK inputs cross the managed-client boundary;
- no ACK carries `pt-d2` or D2's lease token;
- accepted D1 work settles;
- exact generation 1 is released; and
- only then does D1 become irreversibly retired.

After retirement, starting the original D1 runtime still returns
`COORDINATION_CONSUMER_RUNTIME_LINEAGE_RETIRING`; it cannot follow D2.
`provisionSuccessorRuntime` captures D2, accepts no database, origin
capability, or repository field, and resolves the store through the same
lineage. The adversarial fixture nevertheless offers a complete valid store B
tuple as extra JavaScript fields. D2 claims and releases generation 2 in A,
while B remains empty.

## TDD failing-then-passing evidence

| Phase | Commit | Command and observed result |
|---|---|---|
| RED | `0578d43` | `node --test tests/gateway/coordination_consumer_store_ownership.test.js` exited 1: 38 tests, 35 pass, 3 fail, 0 cancelled, 0 skipped. The failures were the accepted D1 ACK carrying `pt-d2`, successful reuse of the D1 provision after D2, and the missing successor provisioner. |
| GREEN | `18e33df` | `node --test --test-concurrency=1 tests/gateway/coordination_consumer_store_ownership.test.js` exited 0: 38 tests, 38 pass, 0 fail, 0 cancelled, 0 skipped. |

The two release-fence isolation fixtures were also authored in the RED commit.
They pass against pristine source because the production release guards were
already correct. In disposable copies, deleting each named guard while
preserving the returned-row validator makes only its directed fixture red, as
shown in mutation rows 18 and 19 below.

## Concurrency and durable-store regression results

| Workload | Trial 5 observed result |
|---|---|
| Three same-store runs, 400 issuer-opened handles per run | Every run returned exactly 1 `claimed` and 399 `owned`: 3 winners, 1,197 closed losers, and no error. |
| Independent-process contention | Eight independently forked claimant processes contended on one store and scope: exactly 1 `claimed`, 7 `owned`, and 0 errors. |
| WAL target under unrelated rollback-journal activity | Three runs of 400 target handles: all target marker reads were correct, every target-local distinct-scope claim succeeded, and each common target scope returned 1 `claimed` and 399 `owned`. |
| Rollback-journal target under unrelated WAL activity | Three runs of 400 target handles with the same result in the opposite direction. |
| Bidirectional aggregate | Six direction-runs, 2,400 target handles, 2,400 successful target-local distinct-scope claims, 6 common-scope winners, 2,394 common-scope losers, 0 marker mismatches, and 0 errors. A separate ordinary-reader process remained active against the unrelated store. |
| Trial 4 review-owned independent-process extension | Preserved, not reimplemented or weakened: the independent reviewer reported six direction-runs with eight claimant processes × 50 issuer-origin handles, exactly 1 winner and 399 losers per run, plus 400 successful target-local distinct claims and no marker mismatch or error. |

Trial 5 changes only permit/provision authority and do not change owner SQL,
the migration, the profile's origin-owning handle issuer, or any concurrency
worker.

## Per-guard surviving-mutant proof

The final runner was:

```text
node /tmp/g002_trial5_mutations.mjs
```

It copied committed GREEN source and tests to:

```text
/tmp/g002-wiring-trial5-mutants-jRO6UT
```

The pristine disposable suite returned 38 pass and 0 fail. Before every
mutation, all affected files were restored from the pristine copy. Each
JavaScript mutant passed `node --check`; the migration mutant executed against
a fresh SQLite database containing only `main.schema_migrations`. Every
directed run contained exactly one selected test and returned 0 pass, 1 fail,
0 cancelled, and 0 skipped. No mutation timed out or ended by signal.

| # | Guard mutation applied alone | Own directed fixture | Syntax | Result |
|---:|---|---|---|---|
| 1 | Remove `main.` from claim UPSERT | owner DML ignores per-handle TEMP shadows and commits one main owner | PASS | KILLED |
| 2 | Resolve migration id without `main.` | shadow-only migration records cannot satisfy the main migration guard | PASS | KILLED |
| 3 | Resolve owner schema manifest and pragmas through attached `shadow` | attached owner state cannot satisfy a missing main migration or receive DML | PASS | KILLED |
| 4 | Unqualify the receipt read used by the consumer repository | consumer repository reads and writes main despite complete TEMP shadows | PASS | KILLED |
| 5 | Accept a repository without its owner-issued exact binding | runtime provisioning requires the final repository's same-main attestation | PASS | KILLED |
| 6 | Remove claim ambient-transaction preguard | ambient claim is rejected before owner DML and rollback changes nothing | PASS | KILLED |
| 7 | Let raw claim/release candidates bypass the committed witness | raw exact claim and release candidates cannot cross without a witness | PASS | KILLED |
| 8 | Remove claim post-autocommit guard | post-autocommit guards reject registered claim and release witnesses | PASS | KILLED |
| 9 | Remove release ambient-transaction preguard | ambient release is rejected before UPDATE and cannot unblock replacement | PASS | KILLED |
| 10 | Remove release post-autocommit guard | post-autocommit guards reject registered claim and release witnesses | PASS | KILLED |
| 11 | Remove owner `scope_id` primary key | migration 004 is independent, main-qualified, exact, and persistent | PASS | KILLED |
| 12 | Return before exact schema admission | exact owner schema rejects a SQL-capable table without scope uniqueness | PASS | KILLED |
| 13 | Accept malformed claim `RETURNING` row | returned-row admission rejects malformed rows and changes-like results | PASS | KILLED |
| 14 | Accept malformed release `RETURNING` row | returned-row admission rejects malformed rows and changes-like results | PASS | KILLED |
| 15 | Admit `changes === 1` without an exact row | returned-row admission rejects malformed rows and changes-like results | PASS | KILLED |
| 16 | Map busy/unclassified claim to `owned` | busy and unclassified claims never masquerade as STORE_OWNED | PASS | KILLED |
| 17 | Hold replacement generation at its existing value | persistent monotonic generations fence delayed and duplicate releases | PASS | KILLED |
| 18 | Reset durable generation to 1 while projecting the requested generation to the intact return validator | successful exact release preserves generation for the next claim | PASS | KILLED |
| 19 | Remove exact-generation release comparison while projecting the stale requested generation to the intact return validator | delayed release predicate leaves the replacement row owned | PASS | KILLED |
| 20 | Allow release of an already released row | persistent monotonic generations fence delayed and duplicate releases | PASS | KILLED |
| 21 | Remove maximum-generation exhaustion disposition | maximum generation is permanently exhausted without wrap, reset, or delete | PASS | KILLED |
| 22 | Mint a new lineage when the real client registers D2 | real D1-to-D2 rejoin retires D1 before issuing a same-store D2 permit | PASS | KILLED |
| 23 | Permit immutable lineage assignment replacement | one managed-client lineage has one immutable store assignment | PASS | KILLED |
| 24 | Add and honor complete D2 store-B inputs and resolve the D2 permit to B | D2 successor permit resolves the lineage store without a store parameter | PASS | KILLED |
| 25 | Leave predecessor permit unrevoked during rejoin | revoked D1 runtime work rejects its ACK before D2 credentials are used | PASS | KILLED |
| 26 | Issue D2 permit as soon as D2 is ready | real D1-to-D2 rejoin retires D1 before issuing a same-store D2 permit | PASS | KILLED |
| 27 | Keep lineage ready after retirement failure | failed D1 retirement faults the lineage and never issues D2 | PASS | KILLED |
| 28 | Accept a provision whose store differs from the lineage store | one managed-client lineage has one immutable store assignment | PASS | KILLED |
| 29 | Resolve provision admission through the current permit instead of its issued permit | real D1-to-D2 rejoin retires D1 before issuing a same-store D2 permit | PASS | KILLED |
| 30 | Bypass the issued permit and invoke the managed client directly for runtime operations | revoked D1 runtime work rejects its ACK before D2 credentials are used | PASS | KILLED |
| 31 | Resolve a copied client from copied scope text | one managed-client lineage has one immutable store assignment | PASS | KILLED |
| 32 | Reuse lineages globally by textual scope | equal scope text remains independent only for genuinely distinct lineages | PASS | KILLED |
| 33 | Accept independently supplied repository facet | runtime provisioning requires the final repository's same-main attestation | PASS | KILLED |
| 34 | Transfer genuine origin capability to another handle | genuine origin capability is bound to the exact issuer-opened handle | PASS | KILLED |
| 35 | Add caller-handle admission to the origin issuer | origin issuer accepts no caller path or handle and capabilities are not forgeable | PASS | KILLED |
| 36 | Accept forged/cross-instance origin capability | origin issuer accepts no caller path or handle and capabilities are not forgeable | PASS | KILLED |
| 37 | Return a runtime for generic construction without a profile | generic production and bare database construction stay fixed unsupported | PASS | KILLED |
| 38 | Admit SQL-capable PostgreSQL through profile probe | PostgreSQL-shaped and in-memory stores fail their independent admission guards | PASS | KILLED |
| 39 | Admit complete in-memory SQLite through profile probe | PostgreSQL-shaped and in-memory stores fail their independent admission guards | PASS | KILLED |
| 40 | Treat `owned` claim as permission to start | two admitted handles start exactly one runtime and replace after exact stop | PASS | KILLED |
| 41 | Release before accepted work settles | runtime release waits until accepted consumer work has settled | PASS | KILLED |
| 42 | Remove exact-generation initialization compensation | initialization failure compensates exact generation after created work settles | PASS | KILLED |
| 43 | Permit claim over active non-expiring row | crashed independent owner and active-state copy remain non-expiring blocks | PASS | KILLED |
| 44 | Return a weaker claimed identity on owner SQL error | busy and unclassified claims never masquerade as STORE_OWNED | PASS | KILLED |

Mutation summary:
`baseline=38/0 syntax_pass=44 killed=44 survived=0 timed_out=0
cancelled=0 skipped=0`.

Rows 18 and 19 cross the intact returned-row validator and are killed by
durable state readback. Row 24 reaches wrong-store behavior instead of an
unrelated capability rejection. Row 25 is killed by a genuine D1 ACK
operation, not `predecessorRevoked` probe output. Rows 29 and 30 separately
delete exact-permit admission and exact-permit managed-operation use.

## Verification gates

| Gate | Observed result |
|---|---|
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_store_ownership.test.js` | exit 0; 38 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_runtime.test.js` | exit 0; 19 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer.test.js tests/gateway/coordination_consumer_sqlite_repo.test.js tests/gateway/coordination_consumer_sqlite_integration.test.js` | exit 0; 148 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_ack_reconciliation.test.js tests/gateway/coordination_ack_outbox_sqlite.test.js` | exit 0; 33 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_client.test.js` | exit 0; 17 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --experimental-test-isolation=none --test-concurrency=1 tests/gateway/coordination_client.test.js tests/gateway/coordination_service_receive.test.js tests/gateway/coordination_queue_receive.test.js tests/gateway/coordination_queue_lifecycle.test.js` | exit 0; 51 pass, 0 fail, 0 cancelled, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/sqlite_migrations.test.js tests/gateway/state_init.test.js` | exit 0; 11 pass, 0 fail, 0 cancelled, 0 skipped |
| `npm --prefix gateway run lint -- --no-cache` | exit 0 |
| `git diff --check` | exit 0 |

`bash scripts/ci.sh` was not run. No live Redis, network service, production
database, or production deployment profile was used.

## Commits

- `0578d43` —
  `test(coordination): expose permit boundary gaps (V5 G/0/02 WIRING-A Trial 5)`
- `18e33df` —
  `feat(coordination): bind runtimes to incarnation permits (V5 G/0/02 WIRING-A Trial 5)`

## Changed-path allowlist

- `gateway/src/core/coordination_consumer_lineage.js`
- `gateway/src/core/coordination_consumer_runtime.js`
- `gateway/src/core/coordination_consumer_runtime_provision.js`
- `gateway/src/core/coordination_consumer_runtime_test_profile.js`
- `tests/gateway/coordination_consumer_runtime.test.js`
- `tests/gateway/coordination_consumer_store_ownership.test.js`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_A-5_to_review.md`

The pre-existing untracked `gateway/node_modules` entry remains untouched.
No migration, ACK implementation, cancellation implementation, policy,
design, operator decision, runbook, deferral, health, inventory, or public
coordination-status path changed.

## Review status

Waiting for independent review. No coder-owned verdict is asserted.
