# Review submission — Project V5 G/0/02 WIRING-A store design Trial 3

## Deliverable and reviewed base

Normative design:

```text
plan/PROJECT_V5/G/0/02-DESIGN-store-identity.md
```

Design/documentation commit:

```text
6e32720cd7e8cd7a2ae9d3421396a1ad9d3ac241
docs(design): close design trial 2 findings (V5 G/0/02 WIRING-A)
```

This submission responds only to:

```text
54d0c0d0f8c5008af374c7d6ffde32fcf97911d4
plan/reviews/PROJECT_V5/G_0_2_WIRING_A_DESIGN-2_result.md
```

Implementation remains frozen. The candidate changes documentation only; it
changes no source, test, migration, or policy file. The independently confirmed
queue/client/service cancellation correction remains untouched.

## Confirmed closures retained

The Trial 2 mechanisms accepted by the independent reviewer remain unchanged:

- every owner DML and migration check is qualified to
  `main.coordination_consumer_runtime_owners`/`main.schema_migrations`, and
  final repository owners must attest their own `main` binding;
- ambient transactions are rejected, committed results cross only through the
  transaction witness plus independent autocommit postcondition, and no
  `changes === 1` result is treated as a committed claim;
- persistent monotonic generation is the exact release fence; and
- `STORE_OWNED` requires an observed active row, while busy and ambiguity fail
  with a distinct closed disposition.

## Per-finding closure map

### P1 — complete wrong-store binding across managed-client rejoin

Corrected in sections 1.2–1.5, 3.4–3.5, Lemma 5, the failure table, sections
9.2 and 9.8, and the implementation checklist.

- One private `ManagedClientLineageCapability L` is created with the real
  managed-client object before registration and survives every participant
  incarnation.
- Trusted composition assigns `L` one immutable sealed main-store capability.
  D1, D2, and later incarnations receive subordinate run permits with no store
  parameter; every permit resolves the same store through `L`.
- Rejoin first revokes D1 admission and marks `L` retiring. It rejects new D1
  work, uses the already accepted cancellation path, waits for every accepted
  operation, handler, consumer, reconciler, and timer, commits exact release,
  and marks D1 retired.
- D2 may have new transport credentials for other accepted uses, but receives
  no WIRING-A run permit until D1 retirement completes. Any settlement,
  compensation, release, or committed-result failure faults `L` and prevents
  a D2 permit.
- A second store can no longer enter at rejoin: a successor incarnation has no
  store-selection API, and a second assignment to `L` rejects before SQL.
  Equal scope text in different stores remains legal only for genuinely
  distinct managed-client lineages/runtime roots.

The mandatory real-managed-client RED starts D1 on A, forces lease loss and
D2 registration, holds both accepted D1 work and release at independent
barriers, and attempts D2/B before retirement. It then proves new D1 work and
D2 admission are closed, A remains the immutable store, B is untouched, and
D2 receives an A permit only after exact retirement. Failure variants must
fault the lineage.

Independent mutations cover: minting a second lineage on D2, replacing L's
store, adding a store parameter to the incarnation permit, failing to revoke
D1 admission, issuing D2 before retirement, and issuing D2 after retirement
failure.

### P1 — deployment-profile authority was not bound to store origin

Corrected in sections 1.5, 3.1–3.2, Lemma 6, the failure/portability sections,
sections 9.5–9.6 and 9.8, and the implementation checklist.

- The design claims no production profile. Generic `AGENTS_STATE_DB`, arbitrary
  Linux/macOS/Windows paths, network/custom VFS handles, and caller-selected
  handles return a fixed unsupported-profile result.
- The sole named profile is the internal test-only
  `sqlite-disposable-local-test-v1`. Its issuer creates and controls the
  disposable origin, opens each handle itself, and records the exact
  `(capability, handle, profile-instance)` tuple in private state.
- Additional same-store handles are opened only through the issuer's opaque
  store-origin capability. The independent-process launcher likewise owns the
  worker bootstrap and exact origin; it exposes no general path constructor.
- A genuine capability is not transferable. Pairing capability A with
  out-of-origin handle B or even with a second handle to A's file rejects
  before schema or owner SQL. Object identity is used only to enforce the
  issuer's exact capability/handle pair, never to infer whether two handles
  share a store.
- Any production profile remains a separate named/reviewed artifact whose
  launcher/storage provisioner must own the volume origin and handle opening
  and pass the entire same-process/independent-process gate.

The directed fixtures use genuine origin capabilities with wrong handles, not
only absent or forged brands. Independent mutations allow a genuine
capability to bind any handle, make the issuer accept a caller path/handle,
accept copied/cross-instance capabilities, and let generic production
bootstrap bypass origin authority.

### P1 — verification plan was not falsifiable

Corrected in sections 9.1–9.8.

The four requested isolations are explicit:

1. **Migration qualification:** the fixture creates the exact correct main
   owner schema, omits the main migration ledger, and places the exact
   migration record only in TEMP or an attached ledger. The schema-manifest
   guard passes; removing only `main.` from the migration lookup admits.
2. **Committed transaction witness:** an internal fault executor supplies exact
   raw claim/release candidates while the database remains in autocommit.
   Removing/bypassing only witness registration lets those candidates escape;
   the intact post-autocommit guard cannot kill that mutant. Conversely,
   post-autocommit mutants receive registered witnesses.
3. **D1-to-D2 rejoin:** the exported real managed client, independent accepted
   work/release barriers, store effects, permit issuance, and failure variants
   make lineage assignment, revocation, retirement, and fault guards directly
   observable.
4. **Profile origin:** the issuer opens the admitted handle; valid capability
   A is paired with wrong-origin B and a separately opened same-file handle.
   Issuer and binding mutations, rather than missing-brand tests, admit the
   counterexample.

The retained many-handle workload remains mandatory for every admitted named
profile: at least three independent 400-handle runs, unrelated concurrent
activity in both directions, TEMP/attached shadows, and independent-process
contention. Section 9.8 now names 42 independently applied guard mutations,
each with one syntactically valid mutation and one directed failure. Evidence
must record pristine/mutated counts, syntax outcome, first failure, and zero
survivors.

### P2 — the Option 1 ratification basis omitted permanent-block cases

Corrected by appending—not rewriting—the standing operator decision in:

```text
plan/reviews/PROJECT_V5/G_0_2_WIRING_A_DESIGN_to_check_by_human.md
```

The addendum explicitly records permanent closure after:

- runtime crash or provisioning an active-state backup/copy;
- committed claim followed by witness/result validation failure;
- failed or uncertain initialization compensation;
- failed or uncertain exact release after orderly settlement; and
- persistent generation exhaustion.

It separately states that restoring a released-state snapshot can roll
generation backward and is not an online recovery shortcut. Every active or
released restore/copy/move for the same lineage requires enforced global
quiescence and generation-preserving advancement in a separately reviewed
offline maintenance transition. Part A provides no such transition.

The addendum also resolves the ACK wording: the accepted ACK repository port
remains frozen for Option 1/part A, which consumes only that port and no sibling
schema. A future Option 2 epoch design may require a separately authorized and
reviewed ACK contract extension; it cannot promise the contract stays
unchanged in advance.

The operator-facing limitation and registered deferral are updated at:

```text
docs/coordination-bus.md
plan/PROJECT_V5/G/0/02.md
plan/PROJECT_V5/DEFERRED.md
```

The existing Option 1 ratification stands. The candidate neither substitutes a
new decision nor claims automatic restart, takeover, cleanup, or crash
recovery.

## Correctness argument summary

There is no derived store identity.

For any admitted lineage/store pair `(L, S)`, every incarnation permit resolves
the immutable `S`. Rejoin cannot introduce B, and D2 cannot overlap authorized
D1 work because its permit is withheld until D1 settlement and committed exact
release. Every admitted handle is the exact handle opened by its profile
issuer. Owner and repository operations are sealed to that handle's SQLite
`main`.

Two admitted handles to the same durable store and scope therefore transact
against the same `main` primary-key row. SQLite serialization permits at most
one committed `claimed` result. Unrelated store activity cannot substitute a
row because no identity-selection observation exists and every statement
targets the supplied handle's `main`. A successful claim/release crosses only
through the registered post-commit witness and the independent autocommit
postcondition. Persistent monotonic generation makes delayed release exact
without randomness.

Under the explicitly named profile, adapter, transaction, main-binding, and
no-bypass premises, two handles to one store cannot receive different
ownership coordinates, one handle cannot receive another store's coordinate,
and one real managed-client lineage cannot split its durable truth across D1
and D2.

## Scope and documentation verification

- `git diff --check` passes for the design/documentation commit.
- Only the normative design, operator-facing runbook, WIRING sheet, deferred
  register, and appended human-decision record changed in the first commit.
- No source, test, migration, policy, ACK schema, or cancellation implementation
  changed; no implementation tests are run or claimed while implementation is
  frozen.
- WIRING consumes only the repository port frozen at
  `coordination_ack_reconciler.js:220-232`.
- PostgreSQL, migration `003`/outbox semantics, health, inventory,
  Redis-live-recovery, durable convergence, automatic reclaim, crash recovery,
  integration, promotion, and release remain outside this submission.
- The pre-existing untracked `gateway/node_modules` entry remains untouched.

## Review status

Awaiting independent Design Trial 3 review. No coder-owned verdict is asserted.
