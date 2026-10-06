# G/0/02 WIRING-A — Durable store ownership design

## Status and decision

This document replaces further implementation trials for the WIRING-A
store-identity finding after three independent implementation KOs. Design
Trial 3 responds to the independent result at
`plan/reviews/PROJECT_V5/G_0_2_WIRING_A_DESIGN-2_result.md`.

Implementation remains frozen. This document changes no source, test,
migration, or policy.

The design decision is:

> Do not derive a canonical store identity. Admit only a sealed pairing of one
> stable managed-client lineage and one provisioned SQLite `main` database,
> then acquire a committed, non-expiring owner claim in that database before
> starting any runtime work.

The SQLite store arbitrates ownership through its own transaction and
uniqueness constraint. No pathname, JavaScript object identity, process-global
descriptor map, inode, lock-delta observation, or ambient connection activity
selects a store.

The Trial 3 cancellation correction is closed and frozen. Its queue, managed
client, service, and lifecycle behavior is outside this design and must not be
changed by the store-ownership implementation.

### Design Trial 2 revision record

| Review finding | Trial 2 correction |
|---|---|
| Owner SQL could resolve to TEMP or an attached schema and could return before commit | Every migration check, owner statement, and durable repository statement is anchored to SQLite `main`; ambient transactions are rejected; the adapter's direct `sqlite3_get_autocommit` projection is checked before and after claim/release; only an outcome retained until the transaction commits may cross the owner port |
| A complete binding over the wrong store was accepted and the same coordination participant could split truth across stores | The real managed client owns one stable, non-serializable lineage capability whose immutable store assignment survives every participant incarnation; an incarnation receives a run permit for that store only after its predecessor is fully retired, while equal scope text in different stores remains legal for genuinely disjoint lineages |
| Random-token equality defeated release fencing | Random ownership tokens are removed; a persistent, strictly increasing per-scope generation survives graceful release and is included in release predicates |
| Filesystem support had no admission authority | The runtime does not infer filesystem support; admission requires an exact handle/capability pair co-issued by an origin-owning profile. Only a named disposable test profile is claimed here, and production remains fixed unsupported until a separately reviewed production issuer exists |
| The verification plan could not falsify the theorem or isolate its guards | The plan now includes the exact TEMP, attached, transaction, complete-wrong-binding, forced-collision, and profile counterexamples and gives every named guard an independently killable mutation |
| Crash cleanup lacked a safe protocol | Part A exposes no cleanup and prohibits manual deletion; any future maintenance transition requires enforced global quiescence, and the safety/availability choice is routed for operator ratification |
| Every loser was promised `STORE_OWNED` although busy is possible | A loser receives `STORE_OWNED` only after the active row is observed; busy, ambiguity, generation exhaustion, and invalid outcomes return a distinct closed store failure |

### Design Trial 3 revision record

| Design Trial 2 finding | Trial 3 correction |
|---|---|
| A managed client could rejoin from `D1` to `D2` and pair `D2` with another store | Store assignment moves from replaceable participant capabilities to one stable managed-client lineage capability. Every incarnation inherits that assignment, old runtime admission is revoked at rejoin, and the next incarnation receives no run permit until old work settles and exact release completes |
| A deployment profile brand was not bound to the opened store | No production profile is claimed. The named test-only `sqlite-disposable-local-test-v1` issuer owns both storage-root creation and handle opening, then records the exact capability/handle pair. Current arbitrary `AGENTS_STATE_DB` production bootstrap remains unsupported until a separately reviewed origin-owning profile exists |
| Migration, commit-order, rejoin, and profile mutations were not independently killable | A correct main owner schema with only a shadow migration record isolates migration qualification; one module-private committed-transaction witness replaces impossible early-return mutants; real `D1 -> D2` retirement barriers and valid-capability/wrong-origin cases make lineage and origin guards falsifiable |
| Ratification understated permanent unavailability | The decision artifact, operator runbook, sheet, and deferral now enumerate successful-claim/post-validation failure, failed initialization compensation, failed or uncertain release, generation exhaustion, and both active and released snapshot-restore hazards |

## 1. Precise requirement

### 1.1 Meaning of “the same durable store”

For WIRING-A, a durable store is the file-backed SQLite `main` database that
contains the consumer repository state and runtime-owner table. The integrated
ACK repository independently owns its durable schema; WIRING consumes only its
frozen port and main-binding attestation.

Two open handles refer to the same durable store when SQLite treats their
`main` databases as one transactional serialization domain: a committed row
written through either handle is visible through the other, and SQLite
enforces one set of constraints over those rows.

The following do not define store sameness:

- equality of JavaScript handle objects;
- equality, normalization, or current resolution of pathname strings;
- equality of database contents;
- a device/inode value inferred outside the target connection; or
- process-wide lock or descriptor activity.

A byte-for-byte file copy is a different store because it has an independent
transaction domain, although a copy taken with an active owner row
conservatively copies the blocked state. Handles that remain open to one
database after a pathname rename still refer to that original store if SQLite
can continue to transact on it. A replacement opened at the old pathname is a
different store.

Attached databases and TEMP are never part of the WIRING-A durable store.
`:memory:`, temporary, and shared-memory URI databases are not production
durable stores.

All WIRING-owned tables and every durable statement reachable through the
final repository port must resolve in `main`. Sharing one multi-schema
connection is not sufficient: an unqualified repository query would violate
the definition even if the owner port used the same handle. WIRING verifies an
opaque attestation from each repository owner; it does not enumerate the
sibling ACK schema.

### 1.2 Meaning of one coordination ownership domain

The textual `scope_id` is not globally unique. A coordination ownership domain
`L` is one stable, opaque managed-client lineage capability in one coordination
plane and canonical scope. It is created once with the real managed-client
object and survives every participant incarnation installed by that object.

`D1`, `D2`, and later participant incarnations are children of `L`; they are
not separate ownership domains and cannot choose stores.

Any future production trusted composition must establish:

```text
one managed-client lineage L -> exactly one provisioned durable main store S
every incarnation Di of L -> the same S
```

The managed-client factory issues `L` before registration and retains it for
the object's lifetime. `L` is non-serializable, cannot be reconstructed from
`scopeId` or `participantId`, and may receive one immutable store assignment.
The sole runtime-root provisioner pairs it with the sealed main-store
capability returned by origin-bound state bootstrap. A second pairing for
`L`, whether to the same or a different store, rejects before owner or
repository SQL.

The managed-client lifecycle may install new participant credentials, but it
can issue only an incarnation run permit subordinate to `L`. That permit
contains no store-selection authority and resolves the already assigned `S`.
The lifecycle rules for replacing one permit with the next are specified in
section 3.5.

No query against `S` can prove that an operator intended `S`. Correctness
bottoms out at trusted provisioning selecting the configured state-bootstrap
capability and at SQLite/VFS faithfully operating its handle. If trusted
bootstrap is configured to open the wrong path, that path becomes the
provisioned store; the owner table cannot discover human intent. This is an
explicit external premise, not another identity inference.

Two stores may use equal `scope_id` text only when they belong to genuinely
distinct managed-client lineages and deployment/runtime roots. Rejoin within
one lineage never creates that distinction. Reusing one managed client,
lineage capability, or descendant incarnation across two stores is illegal.
Raw clients, URLs/options, lease credentials, lineage/incarnation
capabilities, and store capabilities remain unreachable from runtime,
repository, service, queue, tool, and MCP surfaces.

### 1.3 Ownership invariant

The store-local ownership coordinate is:

```text
(the provisioned SQLite main database containing the owner row, scope_id)
```

There is no serialized `store_id`. The database containing the row is the
store coordinate.

For any admitted pair `(L, S)` and valid scope `K`:

1. at most one runtime may be in `starting`, `running`, or `stopping` after
   successfully claiming the committed active row for `(S, K)`;
2. every other start against `(S, K)` receives either
   `COORDINATION_CONSUMER_RUNTIME_STORE_OWNED` after observing the committed
   active row, or a distinct closed store failure when contention cannot be
   classified, before it creates a consumer, reconciler, timer, handler, or
   transport operation;
3. no incarnation of `L` can be paired with another store, while a genuinely
   distinct lineage may own equal textual `K` in a different `S`;
4. graceful stop releases only the exact durable generation held by that
   runtime, after every owned operation settles; and
5. after committed exact release, a replacement incarnation of the same
   lineage may receive a run permit, advance the durable generation, claim,
   and start.

Two handles do not need an equal identity value. They share ownership because
their `main`-qualified claim transactions contend on the same unique row in
the same database.

### 1.4 Committed-result invariant

`claimed` and `released` are committed facts, not aliases for
`result.changes === 1`.

The owner adapter uses `better-sqlite3`'s `database.inTransaction` accessor,
which directly reports the inverse of SQLite's `sqlite3_get_autocommit()`.
Before claim or release, it must read exactly `false`; absence, an exception,
or any other value rejects the operation before SQL.

One module-private `CommittedOwnerTransaction` abstraction executes the
synchronous immediate wrapper. It may retain an internal candidate, but mints
an opaque `CommittedOwnerWitness` only after the wrapper has committed and
returned. The candidate is stored behind that witness in a private `WeakMap`;
raw candidates are never valid port inputs and the callback executor is never
exposed.

Immediately after receiving the witness, the owner port must again observe
`database.inTransaction === false`, validate that the witness is registered,
unwrap the candidate, and validate its exact result. A raw/unwitnessed
candidate fails even when the post-autocommit guard reads `false`. This makes
the commit witness and post-autocommit guard independent.

A thrown statement or commit, a transaction that remains open, a malformed
returned row, or an invalid postcondition returns no success. If a commit
succeeded but a later validation fails, the call still fails closed; the
durable row is then the authority for subsequent attempts.

### 1.5 Failure invariant

Construction fails if composition cannot prove all of the following:

- the final consumer/ACK repository and owner port were produced from the same
  sealed main-store capability;
- every durable repository statement used by the runtime targets `main`;
- the stable managed-client lineage is immutably paired with that store across
  every participant rejoin;
- the current incarnation run permit was issued only after the prior runtime
  was retired; and
- the store capability and exact database handle were co-issued by one
  approved origin-owning profile issuer.

Start fails closed if SQLite cannot execute or classify a committed claim:
missing or wrong `main` migration, read-only or closed handle, busy timeout,
corruption, unsupported backend/profile, generation exhaustion, invalid
result, or adapter error.

No failure may fall back to object identity, pathname identity, inode,
descriptor inspection, process-local store keys, `changes`, random-token
probability, or best-effort ownership.

Restrict beats analyse: rejecting a usable-looking handle is acceptable;
starting two owners is not.

## 2. Why the three implementations failed

### Trial 1 — JavaScript object identity

Trial 1 keyed a process-local `WeakMap` by the injected database object and
then by scope.

What it measured was whether two callers held the same JavaScript wrapper
object. Two `better-sqlite3` objects opened on the same file are different
objects, so they acquired different map entries and both started. The object
was a handle identity, not a store identity.

### Trial 2 — current pathname identity

Trial 2 computed `device:inode` by calling `stat(database.name)` and cached
that value per handle.

What it measured was the file named by the handle's retained pathname spelling
at the later time identity was requested. It did not measure the file already
open inside SQLite. After the original database was renamed and a replacement
was created at the old pathname, the old handle was assigned the replacement
file's identity. Padded filenames and relative names after a working-directory
change also showed that `database.name` was only a spelling.

### Trial 3 — process-wide descriptor and lock deltas

Trial 3 held a read-only query open, compared `/proc/self/fdinfo` lock state
before and after, and used `fstat` on a selected changed descriptor. This
looked authoritative because `fstat` itself reported a real open file.

The missing proof was causality: the changed descriptor was not proven to
belong to the target handle. The observation covered the whole process, not
one SQLite connection. The selection algorithm preferred a unique
rollback-journal lock change before relating WAL activity to the target.
During an ordinary read on an unrelated rollback-journal store, that unrelated
descriptor could be the unique direct candidate and therefore win.

The reviewer opened every tested handle on a WAL target containing marker
`7`, concurrently read an unrelated rollback-journal store containing marker
`9`, and repeated 400 target resolutions three times. Of 1,200 target
handles, 303 received the unrelated store's exact identity and none failed
closed.

Trial 3 therefore measured “a process descriptor whose lock state changed
during this interval,” not “the durable store held by this handle.” A genuine
descriptor does not become authoritative merely because it was observed near
the target query.

### Common failure pattern

All three implementations inferred a store key outside the store's own
transactional authority. Repository binding then recomputed or preserved the
same inference, so it could confirm a shared mistake. A fourth inference
mechanism would need to prove a connection-to-resource binding that the
current JavaScript adapter does not expose. This design removes that proof
obligation.

## 3. Trusted capabilities and `main` binding

### 3.1 Closed deployment-profile capability

The JavaScript runtime cannot prove that an arbitrary pathname is on a local
filesystem with adequate SQLite locking. It must not attempt to do so.

No production SQLite deployment profile is currently reviewed in this
repository. In particular, the existing bootstrap that accepts an arbitrary
absolute `AGENTS_STATE_DB` path is not an origin authority and cannot enable a
WIRING-A production runtime. Production store ownership must fail with a fixed
unsupported-profile result until a separate profile artifact is reviewed.

The only profile named by this design is
`sqlite-disposable-local-test-v1`. It is test-only and its issuer/enforcement
locus is the internal WIRING-A SQLite test fixture. That issuer:

1. creates and exclusively controls one disposable storage root;
2. opens the SQLite handle inside that root itself, using the allowlisted
   `better-sqlite3`/SQLite build;
3. returns the still caller-owned handle together with one opaque
   `OriginBoundSqliteStoreCapability`;
4. stores the exact `(capability, handle, profile-instance)` tuple in a
   module-private `WeakMap`; and
5. runs the same-process and independent-process locking/commit gates against
   that exact origin before the profile can be used as passing evidence.

The issuer does not accept an arbitrary database handle or arbitrary caller
path. A genuine capability is non-transferable: pairing it with a different
handle, including another handle to the same file or a handle opened outside
the issuer's root, rejects before schema or owner SQL. Exact JavaScript object
identity is sound here only as the issuer's capability-to-handle binding; it
does not compare two handles or identify a store.

The test profile can open additional handles only through an opaque
profile-owned store-origin capability returned when it created the store. It
resolves the internally retained target, opens each additional handle itself,
and issues a distinct exact-handle capability. This is how the two-handle,
400-handle, and independent-process fixtures obtain admitted handles to one
store; none supplies a path or pre-opened handle to the issuer. The profile's
private process launcher owns the worker bootstrap and exact origin for the
independent-process fixture rather than exposing a general path-based child
constructor.

A future production profile must be a separately named and independently
reviewed deployment artifact. Its deployment launcher/storage provisioner must
own both the approved volume origin and the handle-opening operation, issue
the same non-transferable tuple, name the adapter/VFS/storage class, and pass
section 9 on that exact deployment. Passing a profile brand into the generic
path bootstrap is prohibited.

No plain object, environment string, adapter property, pathname, mount-name
guess, copied/spread value, or capability issued for another handle can
substitute. The implementation cannot advertise generic Linux, macOS,
Windows, “local path,” production `AGENTS_STATE_DB`, or arbitrary
caller-injected-handle support.

### 3.2 Sealed main-store capability

Origin-owning state bootstrap receives the exact tuple returned by the profile
issuer, verifies the private capability-to-handle record, and creates a
private `SqliteMainStoreCapability`. Its private record contains:

- the exact open `better-sqlite3` handle;
- the origin-bound store capability and profile instance;
- the exact expected owner migration id and schema manifest; and
- the owner constructor plus opaque main-binding attestations from the final
  consumer and ACK repository owners.

The capability does not contain a derived pathname/inode identity and is not
exported. It neither closes the handle nor transfers handle ownership; caller
ownership remains unchanged.

The store-binding constructor accepts this capability, not an arbitrary
`database` plus independently supplied repositories. The exact handle is
reverified against the origin issuer's private record at binding. A future
production profile must use the same closed protocol; until one exists there
is no production constructor path. The internal disposable issuer is
unreachable from production exports.

### 3.3 Main-only schema and repository requirement

The future owner migration must create
`main.coordination_consumer_runtime_owners`. Runtime migration validation must
read only:

```sql
main.schema_migrations
main.sqlite_schema
PRAGMA main.table_xinfo(...)
PRAGMA main.index_list(...)
PRAGMA main.index_info(...)
```

It must verify the exact owner migration id, columns, constraints, unique
scope key, and absence of unexpected owner-table triggers. An identically
named TEMP or attached table does not satisfy any check.

The existing integrated SQLite repository currently uses unqualified durable
table names. Before a WIRING-A binding may be implemented, the consumer
repository owner must qualify its statements over these consumer-owned tables
as `main`:

```text
main.coordination_consumer_receipts
main.coordination_consumer_deliveries
main.coordination_consumer_recovery_history
main.coordination_consumer_quarantine_private
main.coordination_consumer_replays
```

The sibling ACK repository owner must likewise guarantee main binding behind
its opaque attestation. WIRING does not name, inspect, query, or validate that
schema; it consumes only the repository port frozen at
`coordination_ack_reconciler.js:220-232`. These guarantees are prerequisites,
not claims about the frozen branch. The owner migration has no foreign key,
query, or semantic dependency on migration `003` or the ACK outbox.

Attaching databases or creating TEMP tables is not itself prohibited. Those
schemas simply cannot satisfy or redirect any runtime durable operation.

### 3.4 Stable managed-client lineage provisioning

The real managed-client factory creates one private
`ManagedClientLineageCapability L` with the client object before its first
registration. A private record for `L` contains:

- that exact managed-client object;
- its canonical coordination plane/scope configuration;
- one initially empty, then immutable `SqliteMainStoreCapability` assignment;
- the current incarnation number and run-permit state; and
- the current runtime retirement flight, if any.

Trusted runtime-root composition assigns the sealed main store to `L` once.
Thereafter no API accepts a store argument for an incarnation. Public ready
status, copied `scopeId`/`participantId`, and a new participant credential set
cannot recreate `L` or alter its assignment.

When the managed client reaches `ready`, the lineage supervisor may create one
private `IncarnationRunPermit` for those credentials. The permit is
non-serializable, resolves its store through `L`, and carries no store choice.
The runtime provisioner accepts `(L, current permit)` and retrieves the already
assigned store; it does not accept a participant capability plus store.

A separate managed-client lineage and deployment/runtime root may use equal
scope text in another store. Successive participant incarnations of one real
managed client are never such separate lineages.

### 3.5 Managed rejoin retirement gate

The real client may lose its lease and re-register as `D2` after `D1`. Rejoin
uses this private state machine:

1. before a `D2` run permit can be issued, atomically mark the `D1` permit
   revoked and the lineage `retiring`;
2. reject new D1 runtime operations, signal the existing runtime through its
   already accepted cancellation/lifecycle path, and await consumer,
   reconciler, handler, timer, and managed-operation settlement;
3. commit exact-generation release in the lineage's immutable store;
4. only after settlement and release succeed, mark D1 irreversibly retired;
5. validate D2 ready status against `L`; and
6. issue the D2 run permit, which resolves the same store and may claim its
   next generation.

The managed client may install D2 credentials for its other accepted uses
while retirement runs, but WIRING-A exposes no D2 consumer run permit until
step 4. An attempted D2 runtime start during retirement receives a fixed
closed lineage-retiring result before owner SQL.

If D1 settlement, compensation, release, or its committed-result validation
fails, `L` becomes `faulted`, retains its original store assignment, and
issues no D2 run permit. A ready D2 public status does not override that
fault. Store B cannot be offered because incarnation provisioning has no store
parameter; a same-store row that remains owned supplies the additional durable
fail-closed barrier.

The lineage supervisor and permit issuer are module-private. They reuse the
real managed client without exposing it, its raw client/lane, credentials,
factory, recovery facet, callback executor, or store authority.

## 4. Persistent generation protocol

### 4.1 WIRING-owned table

A new migration, independent of ACK migration `003`, creates:

```sql
CREATE TABLE main.coordination_consumer_runtime_owners (
  scope_id TEXT NOT NULL PRIMARY KEY
    CHECK (
      typeof(scope_id) = 'text'
      AND length(scope_id) BETWEEN 1 AND 128
    ),
  generation INTEGER NOT NULL
    CHECK (
      typeof(generation) = 'integer'
      AND generation BETWEEN 1 AND 9007199254740991
    ),
  owner_state TEXT NOT NULL
    CHECK (
      typeof(owner_state) = 'text'
      AND owner_state IN ('owned', 'released')
    )
);
```

The proposed filename remains
`004_coordination_consumer_runtime_owner.sql`, subject to coordination
reserving the next free migration number after independently owned migration
`003`. The migration loader and runtime check must record/read that id in
`main.schema_migrations`.

The row is persistent. Graceful release changes `owner_state` to `released`;
it does not delete the row or reset `generation`. There is no random owner
token, timestamp, PID, expiry, heartbeat, or liveness field.

The maximum generation is JavaScript's largest exact integer. A released row
at that generation is permanently exhausted and fails closed. Wrap, reset,
delete-and-reinsert, and floating-point coercion are prohibited.

### 4.2 Committed atomic claim

Claim is one synchronous immediate transaction on the capability-bound handle.
The adapter performs this sequence without returning control to caller code:

1. verify `database.inTransaction === false`;
2. invoke the module-private `CommittedOwnerTransaction`;
3. enter its trusted `better-sqlite3` immediate transaction wrapper;
4. execute the `main`-qualified UPSERT below and retain its returned row;
5. if it returned no row, read the exact `main` row in the same transaction to
   classify `owned`, exhausted, or invalid;
6. let the wrapper commit and return to the transaction abstraction;
7. only then mint a registered `CommittedOwnerWitness` containing the retained
   classification;
8. return that witness to the owner port;
9. verify `database.inTransaction === false`;
10. reject anything that is not a registered witness; and
11. unwrap and validate the classification before returning a closed port
    result.

The UPSERT is:

```sql
INSERT INTO main.coordination_consumer_runtime_owners (
  scope_id,
  generation,
  owner_state
) VALUES (?, 1, 'owned')
ON CONFLICT DO UPDATE SET
  generation =
    coordination_consumer_runtime_owners.generation + 1,
  owner_state = 'owned'
WHERE
  coordination_consumer_runtime_owners.owner_state = 'released'
  AND coordination_consumer_runtime_owners.generation < 9007199254740991
RETURNING scope_id, generation, owner_state;
```

There is one uniqueness constraint in the exact schema: the `scope_id`
primary key. Targetless `ON CONFLICT DO UPDATE` therefore handles only that
known uniqueness conflict. Unlike `INSERT OR IGNORE`, it cannot convert
`CHECK`, `NOT NULL`, or type failures into an apparent owner conflict.

Disposition after commit/postcondition is:

- one exact returned row with requested scope, exact integer generation, and
  `owner_state === "owned"` -> `{ status: "claimed", generation }`;
- no UPSERT row plus an exact observed main row with the requested scope and
  `owner_state === "owned"` -> `{ status: "owned" }`;
- a released row at maximum generation -> fixed generation-exhausted store
  failure; or
- any other row count, state, type, exception, busy result, commit failure, or
  autocommit violation -> fixed store-unavailable/invalid-store failure.

No branch reads `changes`. `changes === 1` neither establishes the target
schema nor proves that an ambient transaction committed.

The generation is private lifecycle state. It is not a coordination lease
token and must not enter status, logs, audit, metrics, public repository DTOs,
tools, MCP, or review artifacts.

### 4.3 Committed exact release

Only after consumer, reconciler, handlers, timers, and managed operations have
settled does the same owner port run an immediate transaction:

```sql
UPDATE main.coordination_consumer_runtime_owners
SET owner_state = 'released'
WHERE
  scope_id = ?
  AND generation = ?
  AND owner_state = 'owned'
RETURNING scope_id, generation, owner_state;
```

Release uses the same pre-autocommit, module-private committed-witness,
post-autocommit, and returned-row validation sequence as claim. A raw release
candidate cannot cross the port even when `database.inTransaction` is false.

- one exact returned row for the requested scope/generation with
  `owner_state === "released"` -> `{ status: "released" }`;
- zero rows -> `{ status: "not_owned" }`, a fail-closed lifecycle fault; or
- any other result/exception -> fixed store failure.

A delayed release for generation `g` cannot match a replacement at `g + 1`.
This is deterministic even if every random generator in the process returns
identical bytes, because randomness is absent from ownership and release.

Stop retains one idempotent stop flight, so only that flight attempts release.
If start fails after a committed claim, it first settles any created work and
then runs the same exact-generation compensating release. A release failure
leaves the active row authoritative and future starts closed.

### 4.4 Runtime ordering

For each start:

1. validate the origin-bound main-store capability, stable lineage assignment,
   current incarnation run permit, and runtime provision;
2. validate managed-client readiness against the permit's exact lineage,
   canonical scope, and participant;
3. claim the committed main row;
4. only on committed `claimed`, initialize and start consumer/reconciler work;
5. on initialization failure, settle created work and attempt exact-generation
   compensation;
6. on stop or supervised completion, abort and await all owned work; and
7. after no owned work can issue another operation, commit exact-generation
   release.

The runtime never accepts bare `database`, repository, owner port, managed
client, raw client, lane, factory, URL/options, recovery facet, or recovery
acquirer inputs.

### 4.5 Deliberately non-expiring active state

Part A performs no expiry, PID test, heartbeat, probe, wall-clock takeover,
manual delete, or automatic stale-owner transition. A process crash leaves
`owner_state = 'owned'`.

An expiring row without fencing every receive, handler effect, repository
mutation, ACK, and reconciliation operation would allow a paused old process
to resume after replacement. That would recreate two active owners. Complete
epoch fencing is a larger crash-recovery design and is not authorized here.

## 5. Correctness argument

Let:

- `S` be one admitted SQLite `main` transactional serialization domain;
- `T_S` be `main.coordination_consumer_runtime_owners` in `S`;
- `K` be one validated `scope_id`;
- `L` be one stable managed-client lineage capability;
- `D_i` be participant incarnation `i` within `L`;
- `G(S, K)` be the persistent integer generation in `T_S`; and
- `C(S, K)` be the claim transaction through `S`'s sealed main-store
  capability.

The argument has explicit premises:

1. trusted provisioning assigns one store to `L`; every `D_i` inherits it and
   receives no run permit until `D_(i-1)` is retired;
2. an origin-owning profile issuer opened the exact admitted handle and its
   exact storage origin passed the required SQLite locking/commit gates;
3. `better-sqlite3` transaction return means commit completed, the private
   transaction abstraction mints witnesses only after that return, and
   `database.inTransaction` directly reflects `sqlite3_get_autocommit`;
4. every runtime durable statement is `main`-qualified; and
5. no actor bypasses the repository to alter `T_S`.

Violation of an external premise is outside the theorem and must not be
silently reclassified as supported.

### Lemma 1 — main locality

Every owner statement names `main.coordination_consumer_runtime_owners`.
Migration validation reads only `main.schema_migrations`,
`main.sqlite_schema`, and `PRAGMA main.*`. Each repository owner's opaque
attestation guarantees that statements reachable through its frozen port also
name `main`; WIRING does not inspect the sibling schema.

Therefore a TEMP table cannot shadow the owner or repository state, and an
attached database cannot satisfy a missing main migration or receive an owner
write. Ordinary activity on unrelated store `U` can affect scheduling, but
cannot substitute `T_U` for `T_S` or determine a result read from `T_S`.

### Lemma 2 — returned claim means committed active row

Claim rejects an ambient transaction. The immediate transaction retains its
candidate classification internally and commits before its wrapper returns.
Only the private transaction abstraction can convert that candidate into a
registered witness, and it does so after wrapper return. The port separately
verifies autocommit and rejects an unregistered raw candidate. A
statement-local change count is not used.

Consequently `{ status: "claimed", generation: g }` can cross the owner port
only after the transaction containing `(K, g, "owned")` committed in `T_S`.
If commit or the postcondition is uncertain, no claimed result crosses.

### Lemma 3 — one committed owner per store/scope

`scope_id` is the one primary key in exact `T_S`. Immediate write
transactions serialize. For an absent row, one claimant inserts generation
`1`. For a released row at generation `g`, one claimant changes it to
`(g + 1, "owned")`. While the row is owned, the UPSERT predicate is false for
every competitor.

Thus at most one claim transaction for `(S, K)` returns a committed
`claimed`; a serialized competitor observes `owned`, or fails closed before
classification. Removing the primary key leaves the UPSERT syntactically
valid but permits duplicate rows, which the schema and many-handle tests
directly detect.

### Lemma 4 — exact release has no probabilistic premise

Release matches `(K, g, "owned")` and changes only that row to `released`.
The row and generation persist. The next successful claim must advance to
`g + 1`; generation never wraps or resets.

Therefore an old or duplicated release for `g` changes zero rows after a
replacement owns `g + 1`. Equality of random draws is irrelevant because no
random value participates.

### Lemma 5 — rejoin cannot split a lineage across stores

The production provisioner assigns `S` once to stable lineage `L`. An
incarnation permit has no store parameter and resolves `S` through `L`.
Changing from D1 to D2 therefore cannot introduce store B.

Before D2 receives a run permit, the supervisor revokes D1 admission, awaits
all D1 work, commits exact release in S, and marks D1 retired. If any step
fails, L is faulted and D2 receives no permit. Thus D1 cannot retain authorized
work while D2 starts, and D2 cannot evade S by presenting a complete binding
for another store.

### Lemma 6 — an admitted store capability is bound to its origin

The origin-owning profile issuer opens the handle and records the exact
capability/handle/profile-instance tuple. State bootstrap and store binding
both revalidate that tuple. A genuine capability paired with a different
handle or origin therefore rejects before SQL.

This design claims only the named disposable test profile. Because no reviewed
production issuer exists, arbitrary production paths remain unsupported
rather than conditionally assumed safe.

### Theorem — no same-store split and no unrelated-store substitution

By Lemmas 1–3, two handles to the same admitted durable store and scope contend
on one committed main row; at most one runtime obtains start permission.
They cannot receive different ownership keys because no derived key exists.

By Lemma 1, a handle operating on `S` cannot receive an identity or row from
unrelated `U`: no identity is selected and all statements target the handle's
`main`. By Lemma 5, every rejoined incarnation of one managed client remains
bound to S and cannot overlap its predecessor. By Lemma 6, a profile
capability for S cannot be transferred to a handle from U.

By Lemma 4, graceful release cannot delete or release a later generation.
Release follows work settlement, so a gracefully replaced generation cannot
overlap authorized work from its predecessor.

Under the stated premises, unrelated concurrent connections may cause a
closed busy failure but cannot create a second owner, substitute another
store, or cause an old release to affect a replacement.

## 6. Failure disposition

| Condition | Disposition |
|---|---|
| Active main row observed for the same scope | Closed `COORDINATION_CONSUMER_RUNTIME_STORE_OWNED`; create no work |
| Busy/locked before a row can be classified | Distinct closed unavailable failure; create no work; caller may make a new start attempt |
| TEMP or attached table has the owner/repository name | Ignore it through mandatory `main` qualification |
| Owner migration/table absent from `main`, even if present elsewhere | Hard store-admission failure |
| Main owner schema differs from the exact manifest | Hard invalid-store failure |
| Ambient transaction exists before claim or release | Reject before owner DML |
| Candidate lacks a registered committed-transaction witness | Hard store failure even when autocommit reads false |
| Transaction remains open or commit outcome is uncertain | Hard store failure; return no `claimed`/`released` |
| Handle closed, read-only, corrupt, or statement throws | Hard store failure |
| Released row has maximum generation | Permanent generation-exhausted failure; never wrap/reset |
| Repository/owner facets do not share one sealed main-store capability | Construction rejection |
| Any incarnation of one lineage is offered a second store | Construction rejection before either store is touched |
| D2 start is attempted before D1 retirement completes | Closed lineage-retiring failure before owner SQL |
| D1 retirement/release fails during rejoin | Fault the lineage; issue no D2 run permit |
| Origin capability is paired with a different handle/profile instance | Construction rejection before schema/owner SQL |
| Plain/copied/forged origin, lineage, or incarnation capability | Construction rejection |
| Current generic production bootstrap has no reviewed origin-owning profile | Fixed unsupported-profile rejection; no production WIRING-A start |
| Unsupported backend, VFS, or in-memory store | Construction/start rejection |
| Exact release returns no row | Lifecycle fault; never release by scope alone |
| Compensating release fails | Leave active row authoritative; future starts remain closed |
| Process exits with active row | Leave active row; no automatic takeover |

No path falls back to a `WeakMap` store key, pathname, inode, descriptor scan,
content hash, caller-supplied store id, random token, PID, TTL, or advisory
result.

## 7. Portability and authority boundary

The SQL protocol uses core SQLite transactions, UPSERT, and `RETURNING`; it
has no `/proc`, POSIX descriptor, inode, pathname-canonicalization, or
platform-lock dependency in application code.

That does not make arbitrary filesystems admissible. The only claimed profile
is test-only `sqlite-disposable-local-test-v1`, whose issuer creates the
disposable root, opens the exact handle, binds the tuple, and runs the full
same-process and independent-process gates on that origin.

There is no supported production profile in this design. The current generic
`AGENTS_STATE_DB` bootstrap, generic Linux/macOS/Windows paths,
network/distributed filesystems, custom VFS implementations, and arbitrary
caller-opened handles all fail production admission. PostgreSQL remains
deferred to Project V5 I/0/05. In-memory, temporary, shared-memory, and
read-only stores are not production-admissible.

A future production profile can support a particular platform/storage class
only after its origin-owning issuer artifact is independently reviewed and
passes the full gate on the exact deployment. There is no runtime filesystem
inference, transferable brand, or silent degradation.

## 8. Honest limits and operator decision

### 8.1 Safety is purchased with indefinite unavailability

An active row contains no liveness proof and never expires. The following can
leave a scope blocked indefinitely:

- a hard process crash or active-state backup/copy;
- a claim commit that succeeds before later witness/result validation fails,
  so no runtime starts but the active row remains authoritative;
- initialization failure followed by failed or uncertain compensating release;
- graceful stop whose exact release fails or has an uncertain committed
  result; and
- a released row at maximum generation, which can never advance.

These are not all crash cases. PID absence, elapsed time, heartbeat loss,
lease expiry, or a failed probe cannot exclude a paused old process and cannot
authorize reclamation.

Part A must expose no stale-row delete, clear, reset, PID takeover, TTL
takeover, or operator clear API. The earlier suggestion that an operator could
manually delete after “establishing” process absence is withdrawn. Manual
`DELETE` is prohibited because it also destroys the monotonic generation.

### 8.2 Minimum safe future maintenance boundary

Any future offline maintenance transition requires enforced global
quiescence, not inferred liveness:

1. fence or stop every process that can access the store or participant;
2. prevent scheduler restart and revoke both store and participant access;
3. obtain exclusive offline control such that an old process cannot resume;
4. preserve and advance the durable generation while transitioning the row to
   `released` in a separately reviewed maintenance transaction; and
5. restore access only after the new provisioning is complete.

No part-A code implements this procedure. Every backup restore or store move
for the same managed-client lineage requires that maintenance boundary,
including a snapshot whose owner row says `released`. Restoring a released
snapshot can roll the durable generation backward and make an old generation
number reusable; “released” is therefore not an online-restore safety proof.
A quiescent copy is a different store and may be provisioned only to a
distinct lineage/runtime root unless the original mapping has been fenced and
retired.

### 8.3 Operator choice and recommendation

The operator must choose between:

1. **Safety-first part A:** ratify the non-expiring design, accept every
   permanent closed state in section 8.1 and the restore constraints in
   section 8.2, expose no cleanup API, and defer restart/reclamation; or
2. **Recoverable ownership:** keep implementation frozen and authorize a
   larger design with durable epochs fenced through receive, handlers,
   business/store transitions, ACK, reconciliation, and every side effect
   before any automatic or operator-assisted takeover.

The operator ratified option 1 for the current no-crash-recovery scope. The
ratification remains recorded in
`plan/reviews/PROJECT_V5/G_0_2_WIRING_A_DESIGN_to_check_by_human.md`; Design
Trial 3 appends the completeness correction for non-crash permanent blocks
and released-snapshot rollback without rewriting that decision.

### 8.4 Other trust limits

- An origin-owning issuer can bind the exact handle it opened but cannot know
  an operator intended a different configured deployment root.
- No production profile is supported until its concrete issuer/enforcement
  artifact is separately reviewed.
- Code with direct database access can bypass the owner port. Such bypass is
  outside the supported composition and must not be exposed.
- Generation exhaustion causes permanent closed failure.
- This design makes no crash-recovery, Redis-live-recovery, durable
  convergence, health, inventory, integration, promotion, or complete-sheet
  claim.

## 9. Verification plan for implementation

Implementation may begin only after an independent design result and the
operator decision. It begins with RED tests. Every accepted Trial 3
cancellation test remains byte-for-byte unchanged.

### 9.1 Main namespace and committed-result counterexamples

The following are mandatory real-`better-sqlite3` RED cases:

1. **TEMP owner shadow:** open two handles to one migrated main store; create a
   same-named TEMP owner table on each; concurrent same-scope claims must
   produce one committed `claimed` and one committed `owned`, with exactly one
   row in `main` and zero owner effect in either TEMP table.
2. **Attached owner shadow:** omit the owner migration from `main`, attach a
   database containing a complete same-named owner table and migration record,
   and require hard admission failure with the attached table unchanged.
3. **Shadow-only migration record:** create the exact correct owner table and
   schema in `main`, deliberately omit `main.schema_migrations`, and put the
   exact owner migration id only in a TEMP `schema_migrations` table; repeat
   with only an attached ledger. The qualified migration check must reject
   while the independent main schema-manifest check would pass. Removing only
   `main.` from the migration query must admit, so no other guard can mask the
   mutation.
4. **TEMP/attached repository shadows:** place valid-looking but contradictory
   consumer and ACK rows in TEMP and attached tables. The sealed repository
   must read/write only main, and a missing main repository table must fail
   even when another schema is complete.
5. **Open transaction claim:** execute `BEGIN IMMEDIATE` on the caller-owned
   handle, call claim, and require rejection before owner DML. Roll back, then
   let another handle claim. A trace assertion proves the rejected call issued
   no UPSERT.
6. **Rollback-after-local-change counterexample:** with the ambient-transaction
   guard deliberately removed in a disposable mutation, run the claim inside
   the open transaction, observe the candidate change only on that handle,
   roll it back, and show a second handle can claim. The pristine port must
   never return `claimed` in that sequence.
7. **Committed transaction witness:** an internal fault executor returns an
   exact-looking raw claim candidate and, separately, an exact-looking raw
   release candidate without invoking `CommittedOwnerTransaction`; the
   database remains in autocommit so the intact postguard passes. Both raw
   candidates must reject solely because they lack the registered witness.
8. **Committed visibility:** immediately after pristine claim returns, an
   independent handle must observe the exact main generation/state and its own
   claim must return `owned` without any manual commit.
9. **Uncommitted release:** begin an ambient transaction before release and
   require rejection before UPDATE. A replacement remains blocked; rollback
   changes nothing.
10. **Post-autocommit fault:** an internal owner-adapter fault seam reports
   autocommit before entry, returns a registered committed witness, and then
   reports an open transaction after wrapper return.
   Neither `claimed` nor `released` may cross, even when the retained SQL row
   is otherwise valid.

TEMP and attached cases run with exact and misleading migration ids. The
shadow-only ledger case is the directed migration-qualification fixture;
owner-schema and repository qualification retain separate fixtures.

### 9.2 Provisioning and cross-store scope cases

1. Assign store A to one real managed-client lineage `L`, then offer the same
   lineage a complete main-bound store B. Construction of B must reject before
   either store SQL runs.
2. Start runtime A under D1 on store A. Force the exported real managed client
   through lease loss and successful re-registration as D2 while holding one
   D1 managed operation and the D1 release at explicit barriers.
3. While `L` is retiring, attempt both a complete D2/store-B provision and a
   D2 runtime start. Store B must reject before SQL; D2 must have no run permit
   for A or B; a new D1 operation must reject; and the already accepted D1
   cancellation/settlement remains pending only at the held barrier.
4. Release the D1 barriers. Only after all D1 work settles and exact release
   commits may D2 receive a permit resolving store A and start at the next
   generation. Store B remains untouched.
5. Repeat with D1 settlement failure, release failure, and committed-result
   uncertainty. `L` becomes faulted, no D2 permit is issued, and neither A nor
   B starts new runtime work.
6. Mutate trusted composition to substitute a bare/foreign handle for the
   state-bootstrap capability. It must reject even if the foreign store has a
   complete owner schema and otherwise valid frozen repository facets.
7. Create two genuinely distinct managed-client lineages and runtime roots,
   give them equal scope text and different stores, and prove both may claim.
   Rejoin incarnations of one lineage are explicitly excluded from this case.
8. Give two store bindings to one main file and distinct lineages with equal
   scope. The main row still permits exactly one runtime.
9. Plain objects with copied status fields, a spread lineage/permit, and a
   recreated participant id must all reject.

Cases 2–5 are the mandatory D1-to-D2 real-managed-client proof. They assert
permit issuance and store effects directly, not merely eventual owner-row
contention.

### 9.3 Deterministic generation and release

1. Force every injectable RNG/random-byte source to return the exact same
   32-byte value. Claim generation `g`, commit release, claim `g + 1`, then
   replay the delayed release for `g`; it must return `not_owned`, and an
   independent handle must still observe `g + 1` as owned.
2. Repeat claim/release for multiple generations and across reopened handles;
   generations must strictly increase and persist while released.
3. Run concurrent replacement claims against a released row; exactly one
   obtains `g + 1`.
4. Seed a released row at maximum generation and require permanent closed
   exhaustion, with no wrap, delete, or reset.
5. Force release failure after work settlement; the row must remain owned or
   the call must report uncertainty. It may never report a successful release
   without the committed independent witness.

The forced equal-RNG fixture is retained specifically to prove that exact
random collisions no longer affect ownership. No owner protocol call may
consume the RNG.

### 9.4 Core same-store concurrency

1. Open two independent handles to one migrated store. Concurrent same-scope
   starts yield exactly one `started`; the other is `STORE_OWNED` or a
   documented closed busy failure. If busy is retried after the winner
   commits, the retry must return `STORE_OWNED`.
2. Stop the winner, prove committed release, start the rejected runtime as
   replacement at the next generation, stop it, and prove both caller-owned
   handles remain usable.
3. Across at least three independent runs, open 400 handles to one store and
   issue simultaneous same-scope claims. Exactly one returns `claimed`; every
   completed non-busy competitor returns `owned`; no second runtime work is
   created.
4. Run the same contention across independent processes on the exact named
   deployment profile, not only promises in one event loop.
5. Directly test the schema invariant by attempting two raw main inserts with
   equal scope. The second must raise the unique constraint. This fixture,
   not UPSERT preparation failure, kills removal of the primary key.

### 9.5 Required Trial 3 unrelated-concurrency regression

For every admitted named deployment profile, initially only
`sqlite-disposable-local-test-v1`:

1. create a WAL target with marker `7` and an unrelated rollback-journal store
   with marker `9`;
2. run an unsynchronized worker that repeatedly opens/advances ordinary
   `SELECT` iterators on the unrelated store;
3. in each of at least three independent runs, open 400 fresh target handles,
   confirm marker `7`, and perform target-store claims during unrelated work;
4. preclaim matching distinct scopes in the unrelated store, then require all
   corresponding target claims to succeed;
5. issue one common-scope claim through all target handles and require exactly
   one target winner;
6. reverse target and unrelated roles and repeat; and
7. repeat with TEMP and attached shadows present on a subset of handles.

Any wrong-main effect, unrelated-row conflict, second winner, uncategorized
success, or missing committed witness fails the profile gate. Tests assert
store markers and main rows, never kernel bookkeeping.

### 9.6 Deployment-profile admission

1. `sqlite-disposable-local-test-v1` creates its own root, opens handle A, and
   returns `(A, originCapabilityA)`. That exact pair passes profile admission
   and the real independent-process writer/commit gates.
2. Pair the genuine `originCapabilityA` with independently opened handle B
   outside the profile root; repeat with a second handle to A's file. Both
   reject before schema SQL. The test proves profile-to-exact-handle origin
   binding, not brand presence.
3. Mutate the issuer to accept an arbitrary caller path/handle and request a
   capability for B. The pristine issuer API has no such input; the mutation
   must make the wrong-origin fixture unexpectedly admissible.
4. Plain, copied, wrong-instance, and revoked origin capabilities reject before
   SQL.
5. Invoke the existing production `AGENTS_STATE_DB` bootstrap with an
   otherwise valid local SQLite database. Because no reviewed production
   origin issuer exists, WIRING-A returns the fixed unsupported-profile result
   and creates no runtime work.
6. A generic network/custom-VFS handle cannot obtain an origin capability; the
   runtime does not inspect its pathname or mount.
7. PostgreSQL-compatible fakes, `:memory:` databases with complete schemas,
   and temporary/shared-memory stores reject before owner SQL even though
   downstream SQL could otherwise succeed.

Each admission fixture uses an otherwise successful SQL-capable spy or store,
so removing the named predicate causes start permission rather than a later
SQL error. No test treats a transferable profile brand as origin evidence.

### 9.7 Failure, lifecycle, and declared crash limit

- Closed, read-only, corrupt, busy, malformed returned-row, commit-throw, and
  exact-schema-mismatch cases create no consumer, reconciler, timer, handler,
  or managed operation.
- A moved handle that SQLite refuses to write through fails closed and never
  falls back to its current pathname.
- Initialization failure after committed claim performs one
  exact-generation compensating release after created work settles.
- Release occurs only after consumer/reconciler/managed work has settled.
- A child process that claims and exits without release leaves `owned`; a new
  process is rejected. No test deletes or reclaims that row.
- An active-state backup/copy remains blocked.
- A claim commit followed by result/witness validation failure leaves no
  runtime work and blocks later claims.
- Initialization compensation failure and exact release failure each retain a
  closed active row; generation exhaustion is permanently closed.
- Restoring either an active or released snapshot online is prohibited. A
  released snapshot rollback test demonstrates generation reuse would be
  possible absent enforced global quiescence and generation advancement.
- Existing managed-client, recovery-facet, repository-port, caller-ownership,
  and reachability tests remain green.
- Every closed Trial 3 queue/client/service/cancellation case reruns unchanged.

### 9.8 Independent per-guard mutation matrix

Every mutation is applied alone in a disposable copy, passes syntax checking,
and runs only its named directed fixture first. Evidence records pristine and
mutated counts, first failure, syntax result, and zero survivors.

| Guard | Syntactically valid mutation | Directed fixture that must fail for that guard |
|---|---|---|
| Owner DML targets main | Remove `main.` from claim UPSERT only | Two-handle TEMP-owner-shadow case observes two TEMP winners or wrong main count |
| Owner migration check targets main | Resolve migration id without `main.` | Correct main owner schema plus a shadow-only migration ledger is admitted |
| Owner schema manifest targets main | Resolve schema metadata without `main.` | TEMP exact-looking owner schema satisfies a missing/wrong main schema |
| Consumer repository targets main | Remove `main.` from one receipt read/write family | Contradictory TEMP receipt marker is read or written |
| Frozen repository main-binding attestation | Accept a final repository without its owner-issued main-binding attestation | Shadow-schema integration fixture admits a repository whose frozen port resolves outside main |
| Claim ambient-transaction preguard | Remove the pre-entry autocommit assertion | Open-transaction trace observes claim DML before rejection; rollback counterexample becomes reachable |
| Committed transaction witness | Remove/bypass witness registration by making the owner port accept an exact raw claim/release candidate | An unwitnessed candidate passes the intact post-autocommit guard and escapes |
| Claim post-autocommit guard | Remove only the post-wrapper assertion | Post-autocommit fault seam permits `claimed` with an open transaction |
| Release ambient-transaction preguard | Remove the release pre-entry assertion | Open-transaction trace observes UPDATE and the uncommitted-release fixture sees an invalid candidate |
| Release post-autocommit guard | Remove only the release postcondition | Release fault seam permits `released` with an open transaction |
| Scope uniqueness | Remove `PRIMARY KEY` from otherwise unchanged DDL | Direct duplicate raw inserts both succeed; SQL remains valid rather than failing UPSERT preparation |
| Exact schema admission | Accept a table without the scope uniqueness/generation checks | Wrong-but-SQL-capable main schema reaches a successful claim |
| Returned claim row validation | Accept an absent/malformed `RETURNING` row from a changes-like result | SQL-capable result spy starts work without an exact row |
| Returned release row validation | Accept an absent/malformed release `RETURNING` row | SQL-capable result spy reports release while the exact row remains owned or invalid |
| No `changes` admission | Replace returned-row classification with `changes === 1` | Ambient rollback and malformed-result fixtures permit an uncommitted/invalid claim |
| Owned result requires an observed active row | Map busy, absent, or unclassified outcomes to `STORE_OWNED` | Busy/unclassified fault fixture receives the inaccurate owner code |
| Persistent generation advance | Set replacement generation to the existing value | Forced-equal-RNG/delayed-release fixture releases the replacement |
| No generation reset on release | Delete the row or reset generation during release | Reopen/multi-generation test observes reused generation |
| Exact-generation release predicate | Remove `generation = ?` | Delayed old release changes the replacement row |
| Release requires owned state | Remove `owner_state = 'owned'` | Duplicate release reports success or mutates a released generation |
| Generation exhaustion guard | Permit wrap/reset at maximum | Maximum-generation fixture obtains a new claim |
| One lineage per real managed client | Mint a replacement lineage when D2 registers | Real D1-on-A to D2-on-B rejoin obtains a wrong-store permit or touches B |
| Immutable lineage store assignment | Permit `L`'s assigned store to be replaced by B | Complete B provision succeeds or B owner SQL is attempted |
| Incarnation permit inherits its lineage store | Add or honor a store parameter while issuing D2's permit | D2 obtains a B permit instead of resolving A through `L` |
| Rejoin revokes predecessor admission | Leave D1's permit accepting new work after retirement begins | A new D1 managed operation is accepted while the held D1 work is settling |
| Rejoin retirement before next permit | Issue D2's permit when D2 is ready rather than after D1 is retired | D2 obtains a permit while D1's managed operation or release barrier is held |
| Rejoin failure faults lineage | Issue D2 after D1 settlement or release fails | Failure variant starts D2 or attempts owner SQL |
| Configured store capability | Accept a bare/foreign database in the lineage provisioner | Trusted-composition substitution admits the complete wrong store |
| Lineage capability integrity | Accept copied scope/incarnation text instead of the issued `L` | Copied status, spread permit, or recreated participant id provisions runtime work |
| Equal scope is not a global store key | Key provisioning only by `scopeId` | Two disjoint lineages with equal scope in different stores are incorrectly conflated |
| Sealed same-main binding | Permit independently supplied repository/owner facets | Main repository A plus owner B construction succeeds |
| Origin capability binds exact handle | Accept a genuine capability with any SQLite handle | Capability A paired with wrong-origin B or a second handle to A is admitted |
| Origin issuer owns the open | Let the test issuer accept an arbitrary caller path or handle | A caller-selected store obtains a genuine origin capability |
| Origin capability integrity | Accept a plain, spread, or wrong-profile-instance descriptor | Forged or cross-instance capability starts successfully |
| No ungated production profile | Let generic `AGENTS_STATE_DB` mint or bypass origin authority | The otherwise valid production-path fixture starts WIRING-A |
| PostgreSQL exclusion | Admit an otherwise SQL-capable PostgreSQL spy | PostgreSQL-directed fixture reaches claim/start |
| In-memory exclusion | Admit a complete `:memory:` store | In-memory-directed fixture reaches claim/start |
| Start only after committed claim | Treat `owned` or closed failure as permission | Two-handle directed case creates second runtime work |
| Release after work settlement | Move release before consumer/reconciler settlement | Replacement begins while predecessor work is pending |
| Initialization compensation | Remove exact-generation compensation | Failed-start row blocks the directed graceful replacement |
| Non-expiring active state | Add PID/TTL/probe/manual automatic takeover | Crashed-child active-row fixture starts a replacement |
| No identity fallback | Re-enable object/path/descriptor fallback on owner SQL error | Missing-main/busy fixtures create work |

The primary-key mutation is intentionally compatible with the targetless
UPSERT. Its directed raw-insert fixture observes lost exclusivity, not a
statement preparation error. The migration-qualification fixture leaves the
correct main owner schema intact so only the qualified migration lookup can
kill its mutant. The committed-witness mutant leaves both ambient-transaction
guards intact, and the post-autocommit mutants leave witness registration
intact. D1/D2 fixtures hold independent work and release barriers so a missing
retirement gate cannot be masked by fast cleanup. Profile mutants use genuine
origin capabilities paired with the wrong handle, not merely missing or forged
brands. The generation mutation forces exact equality; it does not merely test
deliberate reuse of a random token. Admission mutants use SQL-capable stores so
downstream failures cannot kill them accidentally.

### 9.9 Gates

The implementation review must include exact counts for:

- the runtime suite, including every counterexample and concurrency case above;
- the accepted consumer suite;
- the accepted ACK reconciliation suite;
- unchanged cancellation/client/service/queue lifecycle suites;
- lint without cache; and
- `git diff --check`.

No live shared Redis, MCP service, migration `003` schema dependency, health
composition, inventory composition, automatic reclaim, or crash-recovery
claim enters this proof.

## 10. Implementation acceptance checklist

- [ ] Ownership arbitration is store-backed; no canonical store identity is
      derived.
- [ ] Every WIRING owner/migration statement targets SQLite `main`, and every
      frozen repository facet carries its owner-issued main-binding
      attestation without WIRING inspecting sibling schema.
- [ ] Ambient transactions are rejected and `claimed`/`released` cross only
      after a verified committed/autocommit boundary.
- [ ] One persistent monotonic generation fences release without randomness.
- [ ] One managed-client lineage can be assigned to exactly one configured
      main-store capability across all of its participant incarnations.
- [ ] D2 cannot receive a run permit until D1 is fully settled, exactly
      released, and retired; any retirement failure faults the lineage closed.
- [ ] Equal scope text across stores is admitted only for genuinely disjoint
      managed-client lineages.
- [ ] The named test profile owns the exact handle it admits and binds a
      non-transferable origin capability to that handle; no production
      deployment profile is claimed or silently inferred.
- [ ] TEMP, attached, shadow-only migration, rollback, uncommitted release,
      unwitnessed candidate, D1-to-D2 rejoin, complete wrong binding, exact
      collision, origin-binding, and Trial 3 concurrency counterexamples pass.
- [ ] Busy/ambiguity returns a closed store failure rather than an inaccurate
      `STORE_OWNED`.
- [ ] Every named guard has one isolated killed mutation with zero survivors.
- [ ] Every permanent-block disposition, including non-crash validation,
      compensation, release, and generation-exhaustion failures plus
      active/released snapshot restore hazards, is operator-visible; no state
      is reclaimed automatically.
- [ ] Closed Trial 3 cancellation behavior is unchanged.
- [ ] No migration `003` internals, ACK-outbox schema semantics, health,
      inventory, Redis-live-recovery, or crash-recovery claim is consumed or
      made.
