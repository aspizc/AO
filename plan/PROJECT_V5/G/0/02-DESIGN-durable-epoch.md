# G/0/02 WIRING-B — Durable ownership epoch and crash/rejoin design

## Status and boundary

This is WIRING-B Design Trial 6. It preserves every closure and survivor
ruling accepted by the immutable Trial 5 KO, including Trial 5's closure of
P2-NEW-01, and closes only P2-NEW-02, the governed CI inventory scope/gate
contradiction. It does not authorize implementation, change a migration, or
claim crash recovery.

The candidate starts from the functional Wave 2 integration at `4236b76`.
The following boundaries are already BUILT and are not reopened here:

- the consumer core and its bounded retry/quarantine/replay state machine;
- the SQLite consumer repository and private quarantine vault;
- the enumerable, claim-fenced ACK outbox and ACK reconciler;
- the queue-private tombstone inspection and orphan finalization commands;
- WIRING-A's stable managed-client lineage, immutable store assignment,
  incarnation permits, exact-generation release, and non-expiring owner row;
  and
- the test-only `sqlite-disposable-local-test-v1` origin issuer.

Also BUILT, and therefore explicit compatibility constraints rather than
claimed corrections, are the generic service's participant/recipient
pre-reads, the managed client's four lease-loss codes, exported raw
`ensureInboxGroup ... MKSTREAM`, root-directory SQLite migration discovery,
and the runtime's `consumerFault`, `reconciliationFault`, and
`lifecycle.beforeRelease` seams.

The following remain PLANNED:

- automatic recovery after a WIRING runtime crash;
- fencing a paused prior runtime across SQLite, Redis, handlers, vault writes,
  ACK reconciliation, and identity-loss recovery;
- every Trial 4 epoch public-authority script/facet, permanent participant
  guard, release-completion ledger/adapter, guard-aware group command, frozen
  migration set, and callback-seam closure described below;
- a production origin-owning SQLite profile;
- a production epoch-aware business-effect profile; and
- health/inventory composition, which remains gated on `E/0/00`, `E/0/04`,
  and `G/0/03`.

WIRING-A remains valid and unchanged. Its current profile is safety-first and
non-expiring. WIRING-B is a separate closed profile and protocol. A store is
never silently upgraded from part A to part B.

### Trial 2 closure record

| Trial 1 finding | Trial 2 decision |
|---|---|
| Same-generation recovery failover had no durable controller fence | Add one durable, strictly increasing `recovery_term` and exact `recovery_controller_participant_id`; every recovery permit, lease, SQLite decision/mutation, Redis recovery command, ACK proof/finalization, and completion predicate compares both |
| A recovery crash had no D2-to-D3 protocol | Add an exact expired-controller CAS which advances the term, atomically records D2 as another drain source, installs D3 in Redis, and withholds D3's permit until both authorities agree |
| Rehome copied a D1-addressed envelope into D2's inbox | Delete transfer/rehome from the design; drain every D1/D2/later superseded inbox in place under private recovery authority, preserving `toParticipantId` and `consumeKey` exactly |
| Positive-TTL proof could expire before SQLite confirmation | Epoch transport writes a generation-scoped settlement proof with no TTL; WIRING-B performs no runtime proof garbage collection |
| Release used an illegal `fencing` shape and had no released restart | Add a representable `releasing` phase and explicit `released(g) -> fencing(g -> g+1) -> recovering(g+1) -> active(g+1)` restart |
| Store binding could collide or move to another Redis plane | Bind each admitted SQLite store once to an origin-owned Redis authority/namespace plus server-allocated ordinal; collision, changed-plane, copied-plane, and non-cloning premises are explicit |
| Ordinary managed receive/ACK bypassed the private facet | Add a non-expiring epoch-participant guard and require the existing receive/reclaim/fence/ACK Lua scripts to reject guarded participants in every epoch phase |
| `retryClassifier` and `authorizeReplay` were unclassified callbacks | The first WIRING-B profile uses one fixed module-private pure retry registry; replay and `authorizeReplay` are unsupported |
| Unread and PEL recovery were conflated | Specify separate bounded `XAUTOCLAIM` PEL and nonblocking `XREADGROUP ... >` unread branches with exact reply and `XACK`/`XDEL` counts |

### Trial 3 correction record

| Trial 2 P1 | Trial 3 executable correction |
|---|---|
| Bootstrap could write Redis generation 1 without a durable reservation | Add a bootstrap-only legal `initializing(1,term,Bn,installing)` owner/companion shape committed in `main` before any generation-scoped Redis write. Credentials and every permit remain withheld; lost replies use exact readback, and B1/B2/B3 succession first advances the durable term |
| Public SEND guarded only its recipient | Pass both endpoint guard keys to the same atomic send command. An absent guard means an ordinary endpoint; a present guard must agree with the exact unexpired active Redis epoch for that endpoint. Every non-active, stale, lower-coordinate, malformed, or ambiguous sender/recipient result is closed before dedupe, `XADD`, dedupe renewal, or event append |
| Release could strand unread work | Commit the main release fence, atomically close Redis recipient admission, and only then obtain an exact stable `XLEN == 0` plus empty-PEL witness. Any known work commits `releasing(g) -> fencing(g -> g+1)` and inserts Dn as an `open` source in the same `main` transaction; ambiguity becomes recovery-required and can never become `released` |
| Discovery/unregister could restore a finite inbox TTL | Make registration, renewal, discovery cleanup, and unregister scripts consume epoch guards. Epoch fencing and every lifecycle branch that sees a guard `PERSIST`s the inbox and never TTLs/deletes it; stale `SSCAN` pages and pre-fence authenticated unregisters are ordered by the Redis script |
| Root migration `005` would auto-apply outside WIRING-B | Put `005` under a profile-specific migration directory and select migrations through three fixed, frozen sets. Generic application state and WIRING-A never enumerate or contain `005`; only the origin-owning epoch profile may apply it to its fresh empty store |

### Trial 4 correction record

| Trial 3 finding | Trial 4 executable correction |
|---|---|
| P1-01 — public service preflights bypassed the atomic SEND result | The epoch profile injects one sealed public-authority facet. Service code performs DTO validation, token hashing, time/ID generation, and projection only; it does not read participant presence or decide caller/recipient authority. The single SEND Lua command authenticates the sender, classifies sender before recipient, derives scope, and owns every ordinary/guarded result before dedupe or stream mutation. Renew, discover, unregister, receive, and ACK use the same command-local authority rule |
| P1-02 — SQLite `released` lost the authority needed to finish Redis release | Add a permanent `coordination_consumer_runtime_release_completions` ledger. The empty-branch SQLite transaction writes one exact `redis_pending` completion identity while committing `released`; only the sealed epoch owner adapter can reacquire the same completion permit, idempotently finish/read back Redis, and mark the row `confirmed`. Restart is ineligible before that confirmation |
| P1-03 — exported `ensureInboxGroup` could manufacture false empty state | Replace raw exported `XGROUP CREATE ... MKSTREAM` with one guard-aware Lua command. Any present guard prevents `XGROUP`/`MKSTREAM`; a canonical guard yields the closed `epoch_owned` result after `PERSIST` where possible, and malformed state is transport unknown. Private epoch creation remains reservation-gated and does not call the exported method |
| P1-04 — frozen migration sets omitted root `002_lifecycle.sql` | Freeze exact `(id,path,digest)` entries for root `001_initial.sql`, both distinct root `002_coordination_consumer.sql` and `002_lifecycle.sql`, root `003`, and root `004`; only the epoch set appends profile-directory `005`. IDs are explicit and are never inferred from a basename |
| P2-01 — actual fault/release callbacks were unclassified | The epoch profile rejects caller-supplied `consumerFault`, `reconciliationFault`, and `lifecycle.beforeRelease`; it supplies module-private no-ops and performs release through the durable epoch state machine. Crash REDs use an external child-process barrier, not a callback |
| P2-02 — Trial 3 request recorded nonexistent Trial 2 objects | Preserve the erroneous immutable Trial 3 request. The Trial 4 handoff must record the actual Trial 2 request `27c49bc357bdfb9cbb3e12c980b38ca1338cb896` and candidate `629480e3410fb7e593cdb4c3934caf329bf8e97b`, authenticated as Git commits |
| P2-03 — process variance was disclosed as if it might be profile evidence | Trial 4 records direct supervised `tmux` as an operator-authorized process variance because Gateway/KYA and Claude were unavailable/failing. It claims no profile compliance, Gateway trace/task/session/artifact, Claude execution, or cross-vendor evidence; the verdict still requires a fresh independent reviewer |

## Decision and assumptions

WIRING-B uses one durable epoch and one subordinate recovery-controller
coordinate:

```text
E = (redisAuthorityId, redisNamespaceId, bindingOrdinal, scopeId, generation)
R = (E, recoveryTerm, recoveryControllerParticipantId)
A = (E, recoveryTerm, activeParticipantId)
P = (participantId, leaseTokenHash)
C = (generation, recoveryTerm)
```

The generation remains the monotonic integer already owned by the SQLite
`main.coordination_consumer_runtime_owners` row. A new companion state in the
same `main` database turns a generation into an epoch. `recoveryTerm` is a
second persistent, strictly increasing safe integer for controller succession
inside one generation; it never resets on activation, release, or restart.
A successful recovery retains that term in `A`, so every active lease, receipt
claim, direct ACK, and transport finalization also compares it; only the
controller identity is cleared on activation.
A non-expiring Redis epoch record fences transport operations. Opaque,
profile-issued epoch and recovery permits fence repository, quarantine,
reconciliation, drain, and business-effect operations.

`P` is authentication input, not epoch authority. Scope is derived only from
the accepted server-held presence/guard/epoch tuple. The epoch profile hashes the
caller-supplied lease token in trusted service code and passes only the digest
to a sealed queue facet. The permanent participant guard retains that digest
so the Redis command can still authenticate an old credential after epoch
fencing has removed ordinary presence. The token itself is never retained,
returned, logged, or placed in a review artifact. The digest grants no work:
the same Lua execution must also accept the operation-specific guard/epoch
phase and coordinate.

After authority/namespace/binding/scope and participant equality are proved,
all public scripts compare `C` lexicographically:

- guard `C < epoch C` is a canonical stale/non-active identity;
- guard `C == epoch C` is usable only when guard and epoch are both exact
  `active`, name that participant, and have a strictly future Redis deadline;
- guard `C > epoch C` is impossible transport lead and therefore unknown; and
- different immutable coordinates, malformed state, missing epoch under a
  guard, or wrong Redis types are incomparable and therefore unknown.

The classification is identical for sender, recipient, renew, discover,
unregister, receive, ACK, and exported group creation. Only the public mapping
differs by operation and whether the endpoint is the authenticated caller.

Takeover is a two-authority transition:

```text
ACTIVE(g)
  -> FENCING(g -> g+1) in SQLite main
  -> install fenced g+1 in Redis
  -> RECOVERING(g+1, term+1, D2, installing) in SQLite main
  -> install exact (g+1, term+1, D2) in Redis
  -> RECOVERING(g+1, term+1, D2, installed) in SQLite main
  -> drain D1's original inbox and reconcile durable state
  -> ACTIVE(g+1)
```

Bootstrap is a distinct first-generation transition:

```text
EMPTY
  -> INITIALIZING(1, term=1, B1, installing) in SQLite main
  -> atomically install exact recovering(1,1,B1) epoch/guard in Redis
  -> RECOVERING(1,1,B1,installed) in SQLite main
  -> drain the provably empty bootstrap source set
  -> ACTIVE(1)
```

Entering `FENCING` is the durable-store revocation point. From that commit
onward, generation `g` cannot commit a repository, vault, or business effect.
Installing `g+1` in Redis is the transport revocation point. From that Redis
operation onward, generation `g` cannot receive, ACK, inspect, finalize, or
drain transport state. Advancing `recoveryTerm` is the controller revocation
point within `g+1`: the old term immediately loses every SQLite recovery
mutation, and installing the higher term in Redis removes its remaining
transport authority. Normal work for `g+1` starts only after both generation
revocation points, an installed current recovery controller, and identity-loss
recovery convergence.

An elapsed lease does not itself grant authority. It only makes the
transaction that enters `FENCING`, or the CAS that advances `recoveryTerm`,
eligible. PID absence, process probes, participant lease loss, heartbeat loss,
and either SQLite or Redis deadline alone remain non-authoritative.

The smallest executable protocol is selected deliberately:

- old inboxes are drained where they already live; no envelope recipient,
  consume identity, receipt key, replay key, or service contract is translated;
- the first profile is disposable and test-only;
- WIRING-B starts only on a profile-created empty store/namespace pair, never
  by upgrading a WIRING-A store or importing an experimental transfer table;
- runtime proof retention is permanent in this slice; and
- replay and arbitrary callbacks remain unsupported rather than receiving a
  speculative fencing abstraction.

## Why a TTL-only extension is rejected

The current SQLite repository contract explicitly says:

```text
atomicWithBusinessEffect: false
```

The current handler is an arbitrary function which returns a `commitId`.
Checking an epoch before calling that function and checking again afterward
cannot stop a paused function from committing an effect between the checks.
The current blocking `XREADGROUP` path can likewise claim a delivery between
its pre- and post-fence checks.

Therefore WIRING-B rejects all of these shortcuts:

- adding an expiry column to migration `004` and starting a replacement;
- treating participant lease expiry as runtime fencing;
- check-before/check-after around an arbitrary handler;
- reusing the blocking `XREADGROUP` path for an epoch-owned runtime;
- passing a plain generation number through public service DTOs;
- allowing ordinary queue possession to acquire epoch or recovery authority;
- deleting or expiring the Redis epoch key;
- reinstalling a missing Redis epoch from an old SQLite snapshot; or
- claiming recovery while an old-participant inbox entry has no closed
  durable disposition.

## 1. Authority and threat model

### 1.1 Adversarial schedules

The proof assumes any process may pause and resume at every instruction. It
must remain safe when:

- the old runtime resumes after the replacement is active;
- a process dies before or after each SQLite commit or Redis command;
- Redis replies are lost after the command commits;
- the managed client rejoins with a new participant ID;
- an old direct-ACK or reconciliation claim is retained across takeover;
- a handler or quarantine write is in flight at lease expiry;
- SQLite or Redis is temporarily unavailable;
- a released or active SQLite snapshot is restored;
- two replacements race to resume one incomplete fencing transition;
- R1 pauses after any SQLite or Redis recovery operation, R2 advances the
  durable controller term, and R1 resumes;
- D2 crashes before or after each drain/ACK boundary and D3 succeeds it;
- a controller-term install reply is lost and a later term overtakes it;
- B1 pauses before or after the bootstrap reservation, epoch/guard install,
  confirmation, or activation and B2/B3 succeeds it;
- a public SEND admitted with a stale sender or recipient presence races a
  generation, controller, activation, or release guard transition;
- the service sees missing/stale ordinary presence for one or both guarded
  SEND endpoints, and both guarded endpoints fail in the same command;
- an ordinary service preflight would have returned authentication,
  target-not-found, or lease-loss before a guard-aware queue command;
- discovery holds a stale `SSCAN` page, or unregister authenticates, before a
  participant is fenced and executes its cleanup script afterward; or
- release races a pre-existing unread entry, PEL entry, concurrent sender,
  lost reply, or crash at every SQLite/Redis empty-source boundary;
- SQLite commits `released` and the process dies before issuing, receiving, or
  durably confirming the Redis release-completion command;
- an ordinary queue holder calls exported `ensureInboxGroup` before or after
  guard installation while the guarded stream/group is missing; or
- a caller attempts to supply `consumerFault`, `reconciliationFault`, or
  `lifecycle.beforeRelease` as a pause/resume seam across
  generation/controller succession.

### 1.2 External premises

The design has six explicit premises:

1. SQLite `main` is the serialization authority for the admitted store.
2. Redis executes each epoch/receive/ACK/recovery Lua command atomically.
3. A business-effect destination either implements the epoch-effect contract
   below or is unsupported.
4. The origin-owning epoch profile binds the exact SQLite origin and exact
   Redis authority/namespace origin it created; a production profile remains
   unsupported.
5. Neither admitted origin is cloned, restored backward, or served
   concurrently as independently writable copies: this covers the SQLite
   store and the Redis authority/namespace with all allocation/epoch history.
   Infrastructure able to present two indistinguishable live copies violates
   this explicit external non-cloning premise.
6. Code with direct database, raw Redis-client, or destination access can
   bypass the protocol and is outside the supported composition.

Clock disagreement may cause early fencing or delayed availability. It must
not permit two committed business effects, because generation and phase—not
clock equality—are checked at every commit point.

### 1.3 Capability reachability

The Redis authority/namespace coordinate, binding ordinal, durable generation,
controller term, and controller identity are internal identifiers, not secrets
and not public runtime DTOs. Authority is held by opaque objects in
module-private `WeakMap` records:

- `DurableEpochStoreCapability`;
- `RedisAuthorityNamespaceCapability`;
- `DurableEpochAllocationCapability`;
- `DurableEpochBootstrapReservation`;
- `DurableEpochTransitionPermit`;
- `DurableEpochRuntimePermit`;
- `DurableEpochReleasePermit`;
- `DurableEpochReleaseCompletionPermit`;
- `DurableRecoveryControllerPermit`;
- `EpochPublicAuthorityFacet`;
- `RedisBootstrapInstalledWitness`;
- `RedisEpochInstalledWitness`;
- `RedisControllerInstalledWitness`;
- `RedisReleaseSourceEmptyWitness`;
- `RedisReleaseCompletedWitness`;
- `EpochRepositoryFacet`;
- `EpochRecoveryFacet`; and
- `CommittedEpochEffectWitness`.

Plain, copied, spread, serialized, accessor-backed, or wrong-profile objects
never substitute for one of these capabilities. No public service, tool, MCP
operation, queue object, status projection, URL/options object, lane, or
callback executor yields one.

Every recovery capability resolves one exact `R`; every runtime capability
resolves one exact `A`. Possessing a process-local object from an older term
is harmless: every authoritative use independently compares the durable
generation and term plus the controller or active participant at its own
commit point. No permit can mint, renew, or translate a successor permit.

The release-completion permit is the only exception to process-local
non-reacquisition: it is deliberately and uniquely reacquired from the
permanent exact release-completion row after revalidating the sealed SQLite
origin, immutable Redis binding, `released(g)` pair, and Redis
`releasing|released` tuple. It grants only the idempotent
`releasing -> released` Redis completion and its SQLite confirmation; it
cannot receive, send, ACK, recover, activate, or reserve a restart. The public
authority facet similarly grants no caller authority: it is a sealed
composition route to operation-specific atomic scripts.

## 2. Durable state

### 2.1 Migration

WIRING-B owns the profile migration at
`gateway/migrations/profiles/sqlite-redis-disposable-epoch-test-v1/005_coordination_consumer_runtime_epoch.sql`.
It is applied after `004` and does not rewrite migrations `002`, `003`, or
`004`. It is not placed in the shared root `gateway/migrations/`, because the
current application and WIRING-A loaders enumerate every root `.sql` file.

`gateway/src/core/sqlite_migration_sets.js` owns three closed, deeply frozen
ordered arrays of deeply frozen `(id,path,sha256)` entries. These are the exact
path sets; the two root migrations whose filenames begin with `002` are
separate entries and never collapse to a numeric version or shared basename:

```text
ROOT_BASELINE_SQLITE = [
  (001_initial,
   gateway/migrations/001_initial.sql,
   260eb6663adc38eb443cd6763d0b1b5acc31e317f0fbef59373ab055d6c2920d),
  (002_coordination_consumer,
   gateway/migrations/002_coordination_consumer.sql,
   257cab639e9cac9c9be14d197dd9f2fdca9917acca37b13f570b028a7f6200a3),
  (002_lifecycle,
   gateway/migrations/002_lifecycle.sql,
   d1be59ac7968888c30234401ea779137848a08d88ac8638c90dcf40d5fb6037d),
  (003_coordination_ack_outbox,
   gateway/migrations/003_coordination_ack_outbox.sql,
   fb12640b8fd79318f1efbb31a6fb8654d3e396b5c5da0542605be6bc5802366f),
  (004_coordination_consumer_runtime_owner,
   gateway/migrations/004_coordination_consumer_runtime_owner.sql,
   38ba4d8e84dd447a176c2c4f83b96cbb416681cd077d404f4469b4a459cdd6fb)
]

GENERIC_APPLICATION_SQLITE = exact frozen copy(ROOT_BASELINE_SQLITE)
WIRING_A_SQLITE             = exact frozen copy(ROOT_BASELINE_SQLITE)
WIRING_B_EPOCH_SQLITE       = exact frozen copy(ROOT_BASELINE_SQLITE) + [
  (005_coordination_consumer_runtime_epoch,
   gateway/migrations/profiles/
     sqlite-redis-disposable-epoch-test-v1/
     005_coordination_consumer_runtime_epoch.sql,
   <literal SHA-256 of the reviewed 005 bytes in the implementation candidate>)
]
```

The five root digests above are authenticated at the Trial 4 author baseline.
The implementation candidate replaces the angle-bracketed design token with
the literal digest of its newly reviewed `005` bytes before any test can open
a database. The implementation embeds one literal SHA-256 for every exact
reviewed file. It does not compute a set by scanning and does not accept a
digest from an environment or caller. `id` is the literal tuple field above,
not a value derived by removing `.sql` from a discovered basename. The loader resolves
each fixed repository-relative path, rejects symlinks/path traversal and
non-files, verifies the literal digest before opening a write transaction, and
applies entries strictly in array order.

The generic `state.js` loader selects only `GENERIC_APPLICATION_SQLITE`; the
existing `sqlite-disposable-local-test-v1` profile selects only
`WIRING_A_SQLITE`; and the separately named origin-owning epoch profile selects
only `WIRING_B_EPOCH_SQLITE`. No environment value, caller option, directory
scan, glob, basename grouping, numeric-version grouping, or discovered
filename can extend or reduce a set. Duplicate ids, duplicate paths, digest
mismatch, path traversal, a selected entry missing from disk, or a
`schema_migrations.id` outside the selected exact set is
`MIGRATION_PROFILE_MISMATCH`.

For an existing/reopened database, the selected set must contain every applied
id and the loader verifies the exact expected schema for all applied entries
before applying a suffix; an outside-set row is never ignored or adopted.
Fresh generic and WIRING-A databases apply the five-entry root baseline,
including both `002` files. Existing/reopened generic and WIRING-A databases
that already contain those five ids remain valid and never enumerate or apply
`005`. A generic/WIRING-A database containing `005`, or an epoch database
missing either distinct `002`, rejects before owner/Redis work.

On first open, the epoch profile proves it created a new empty SQLite origin
before selecting its six-entry set and persists/seals that profile choice
before opening the owner adapter. A later reopen is allowed only through the
same origin capability and same epoch profile when the exact six applied ids,
digests/schema, and persisted store identity agree. It rejects an existing
nonempty non-epoch origin, any pre-applied outside-set id, a generic/WIRING-A
open of an epoch store, or an epoch reopen under another set. After
application its exact applied-id sequence is the five root ids above followed
by `005_coordination_consumer_runtime_epoch`; no shorthand `001..005`
comparison is permitted. The migration is not an online upgrade of a part-A
store.

The migration creates a one-row store identity table:

```text
main.coordination_consumer_runtime_epoch_store
  singleton               INTEGER PRIMARY KEY CHECK (singleton = 1)
  protocol_version        INTEGER, exactly 1
  redis_authority_id      TEXT, safe 1..128 characters
  redis_namespace_id      TEXT, safe 1..128 characters
  redis_binding_ordinal   INTEGER, 1..Number.MAX_SAFE_INTEGER
  allocation_state        TEXT, exactly bound
  UNIQUE(redis_authority_id, redis_namespace_id, redis_binding_ordinal)
```

and one row per owned scope:

```text
main.coordination_consumer_runtime_epoch_fences
  scope_id                           TEXT PRIMARY KEY
  generation                         INTEGER, 1..Number.MAX_SAFE_INTEGER
  phase                              initializing | active | fencing |
                                     recovering | releasing | released |
                                     faulted
  lease_expires_at_ms                INTEGER or NULL
  pending_generation                 INTEGER or NULL
  participant_id                     TEXT or NULL
  previous_participant_id            TEXT or NULL
  recovery_term                      INTEGER, 1..Number.MAX_SAFE_INTEGER
  recovery_controller_state          none | installing | installed
  recovery_controller_participant_id TEXT or NULL
  fault_code                         TEXT or NULL
```

The exact schema has checks which make these combinations legal:

| Phase | Deadline / pending | Participant/controller shape | Permitted mutation class |
|---|---|---|---|
| `initializing` | positive deadline; pending NULL; generation exactly 1 | participant and controller participant are the same required bootstrap ID; previous NULL; term positive; controller state exactly `installing` | absent-key bootstrap install/confirm or expired-controller succession only; no recovery/runtime/release permit |
| `active` | positive deadline; pending NULL | `participant_id` required; previous/controller fields NULL; controller state `none`; retained term positive | exact `A` only |
| `fencing` | deadline NULL; pending exactly `generation + 1` | `participant_id` NULL; previous is the revoked participant for takeover/release recovery or NULL for released restart; controller fields NULL/`none` | install/confirm the one pending generation only |
| `recovering` | positive deadline; pending NULL | participant and controller participant are the same required ID; term positive; controller state `installing` or `installed` | no recovery operation until `installed`; then exact `R` only |
| `releasing` | deadline/pending NULL | exact last participant retained; controller fields NULL/`none` | idempotent release confirmation only; no normal or recovery work |
| `released` | deadline/pending NULL | all participant/controller fields NULL; controller state `none`; exact permanent release-completion row required | only idempotent Redis completion/confirmation while `redis_pending`; monotonic restart reservation only after `confirmed` |
| `faulted` | deadline/pending NULL | no authority-bearing identity; fixed body-free `fault_code` required | diagnostic reads only |

For `initializing`, `active`, `recovering`, `releasing`, `released`, and
`faulted`, the companion generation equals the generation in
`main.coordination_consumer_runtime_owners`. During `fencing`, the owner row
still contains the old generation and `pending_generation` is the only legal
next generation. The owner is `owned` in `initializing`, `active`,
`recovering`, `releasing`, and `faulted`; it is `released` only in `released`.
The transaction entering `fencing` may start from `active`, `releasing`, or
`released`, but never changes or skips the pending generation. The
`initializing` pair is inserted atomically: the existing owner schema's legal
`owned,generation=1` row and the companion row commit together before Redis
can observe generation 1.

A legal `released(g)` pair always has exactly one matching permanent
release-completion row. While that row is `redis_pending`, the only permitted
mutation class is completion of the already selected empty release. While it
is `recovery_required`, no online transition is legal. A restart reservation
requires `confirmed` plus exact Redis epoch/guard
`released(g,completion_id)`; phase text alone is insufficient.

`recovery_term` starts at exactly 1 in the first bootstrap reservation, never
decreases, and never resets. Entering `active`, `releasing`, or `released`
clears the controller identity but retains the last numeric term. Reserving a
bootstrap successor or later controller uses
`recovery_term < Number.MAX_SAFE_INTEGER` and writes exactly `term + 1`.
Exhaustion is permanent.

The migration also creates durable, body-free drain-source state:

```text
main.coordination_consumer_runtime_recovery_sources
  scope_id                    TEXT
  source_participant_id       TEXT
  first_source_generation     INTEGER
  added_recovery_term         INTEGER
  state                       open | drained | recovery_required
  reason_code                 NULL | TRANSPORT_STATE_UNKNOWN |
                              SOURCE_GUARD_INVALID |
                              SOURCE_GROUP_INVALID
  drained_generation          INTEGER or NULL
  drained_recovery_term       INTEGER or NULL
  created_at                  INTEGER
  updated_at                  INTEGER
  PRIMARY KEY(scope_id, source_participant_id)
```

It stores no body, delivery mapping, lease token, Redis URL, raw client, or
epoch capability. `open -> drained` is monotonic and requires an exact
Redis-empty witness plus the exact installed `R` in one SQLite transaction.
Any ambiguity is monotonic `recovery_required`. A superseded current
controller is inserted as `open` in the same transaction which advances the
controller term, before its successor can obtain authority.

Migration `005` also creates a permanent, body-free release-completion ledger:

```text
main.coordination_consumer_runtime_release_completions
  scope_id                    TEXT
  generation                  INTEGER, 1..Number.MAX_SAFE_INTEGER
  recovery_term               INTEGER, 1..Number.MAX_SAFE_INTEGER
  source_participant_id       TEXT
  completion_id               TEXT, exactly 64 lowercase SHA-256 hex
  state                       redis_pending | confirmed |
                              recovery_required
  reason_code                 NULL | TRANSPORT_STATE_UNKNOWN |
                              RELEASE_COORDINATE_MISMATCH
  created_at                  INTEGER
  confirmed_at                INTEGER or NULL
  PRIMARY KEY(scope_id, generation)
  UNIQUE(completion_id)
```

Checks make the three states exact: `redis_pending` has NULL reason and
`confirmed_at`; `confirmed` has NULL reason and one non-NULL
`confirmed_at >= created_at`; `recovery_required` has one allowlisted
non-NULL reason and NULL `confirmed_at`. Identity columns are immutable after
insert.

`completion_id` is the SHA-256 of one canonical, length-delimited
`coord-release-completion-v1` tuple containing the immutable Redis
authority/namespace/binding ordinal, scope, generation, retained recovery
term, source participant, exact inbox key, and consumer group. It is
deterministic and non-secret; no caller chooses it. The
`RedisReleaseSourceEmptyWitness` resolves that same tuple plus exact
`XLEN = 0`, exact empty `XPENDING`, and Redis
`releasing(g,term,source)`. The witness contains no message, token, Redis URL,
client, clock authority, or arbitrary callback.

The empty-branch transaction inserts exactly one absent completion row as
`redis_pending` while it commits owner/companion `released(g)`. A duplicate
exact tuple is idempotent; a different tuple for the same scope/generation is
store corruption. The row never deletes, rewrites its identity, returns to
pending, or changes from `recovery_required`. Only
`redis_pending -> confirmed` is a successful transition, and it consumes an
exact `RedisReleaseCompletedWitness`. This retained row is the durable source
from which the sealed owner adapter may reacquire release-completion
authority after process loss.

Migration `005` adds nullable epoch-claim columns to the existing receipt and
ACK-intent tables:

```text
coordination_consumer_receipts
  epoch_generation
  recovery_term
  epoch_authority_kind
  epoch_participant_id
  recovery_controller_participant_id

coordination_consumer_ack_intents
  epoch_generation
  recovery_term
  epoch_authority_kind
  epoch_participant_id
  recovery_controller_participant_id
  settlement_generation
  settlement_recovery_term
  settlement_authority_kind
  settlement_participant_id
  settlement_recovery_controller_participant_id
```

The migration adds checks for exactly three shapes:

- unchanged non-epoch rows have every epoch authority column NULL;
- an active WIRING-B claim has exact generation, retained positive term,
  `epoch_authority_kind = active`, and exact active participant, with
  controller NULL; and
- a recovery claim has exact generation, positive term,
  `epoch_authority_kind = recovery`, and the same exact participant in the
  epoch-participant and controller columns.

Every WIRING-B processing or ACK claim uses one of the latter two shapes. An
exact installed controller may atomically replace an active claim from a
lower generation, or a recovery claim whose generation is current and term
is lower, without waiting for the old claim deadline. A terminal ACK copies
the proof's exact accepted authority shape into the settlement columns for
proof equality; its current recovery-claim columns remain distinct, and no
settlement field is inferred from the current epoch after transport
finalization. Replay columns are not extended because replay is unsupported
by WIRING-B.

Every statement is `main`-qualified. TEMP and attached tables cannot satisfy
schema admission or receive an epoch transition. All schema combinations,
foreign keys, partial indexes, and absence of unexpected triggers are checked
exactly before the profile can issue a capability.

### 2.2 Store binding

The binding is an allocation, not a random identity claim. The separately
named `sqlite-redis-disposable-epoch-test-v1` profile owns both origins: it
creates the SQLite store and disposable Redis process/namespace, opens their
exact handles/lanes itself, and records non-transferable capabilities for the
exact pair. The current part-A profile cannot issue an epoch-store capability.
No production profile is implied.

The Redis namespace contains three non-expiring allocation objects:

```text
<namespace>:epoch:authority
<namespace>:epoch:binding-counter
<namespace>:epoch:binding:<ordinal>
```

The authority record contains the exact protocol version,
`redisAuthorityId`, and `redisNamespaceId`. The counter and every binding
record never expire, delete, decrement, or move to another authority. One
atomic allocation script:

1. validates the authority record and exact key types;
2. increments the namespace counter and rejects overflow;
3. requires the resulting binding key to be absent;
4. writes a canonical `reserved` record without TTL; and
5. returns the server-allocated ordinal.

The caller cannot propose an ordinal. If the reply is lost before SQLite is
initialized, that reservation remains orphaned and is never reused; a later
attempt allocates a higher ordinal. After a successful reply, the profile
inserts the exact authority/namespace/ordinal tuple into the new SQLite store,
then atomically changes the exact Redis record from `reserved` to `bound`.
A lost bind reply is resolved by exact readback. A fresh store may never treat
an existing `reserved` or `bound` record as its idempotent allocation; only
the already initialized exact SQLite origin may resume its own bind.

This makes allocation collision-safe rather than collision-probable. If a
faulted allocator repeats an ordinal, the existing non-expiring binding key
causes hard `BINDING_COLLISION`; it is never accepted because its value happens
to look exact. Counter rollback, wrong-type state, malformed state, and an
authority/namespace mismatch are `RECOVERY_REQUIRED`.

At every later admission, the profile must prove all three together:

- the immutable tuple in the exact sealed SQLite `main`;
- the exact `bound` registry record through the originally issued Redis
  authority/namespace capability; and
- the lineage's one immutable WIRING-A store assignment.

A different endpoint/cluster/process, namespace, capability issued by a
different origin, or copied matching anchor rejects before epoch or consumer
work. The same origin issuer may reissue a process-local capability only after
reattesting the exact live origin; object identity is not durable authority.
A copied SQLite file retains the same tuple and is the same logical epoch
history; the origin-owning profile rejects its foreign origin handle, while a
perfectly substituted clone is excluded by the premise in section 1.2. A
copied Redis plane likewise cannot be made safe by data equality: the test
profile rejects its foreign origin capability, and a perfectly cloned origin
is outside the theorem.

Moving either origin requires a separately reviewed offline maintenance
transition under enforced global quiescence. That transition must preserve
and advance the allocation counter and every epoch generation/term; WIRING-B
defines no online rebinding or cloning operation.

### 2.3 Redis epoch record

The queue derives one internal key from its private prefix, immutable binding
tuple, and `scope_id`. Its value is one bounded canonical record:

```text
{
  protocolVersion: 1,
  redisAuthorityId,
  redisNamespaceId,
  bindingOrdinal,
  scopeId,
  generation,
  phase: "fenced" | "recovering" | "active" | "releasing" | "released",
  participantId,
  recoveryTerm,
  recoveryControllerParticipantId,
  leaseExpiresAtMs,
  releaseCompletionId
}
```

The key has no TTL and is never deleted by runtime cleanup. Every decoder has
the existing byte, token/work, string, duplicate-key, and depth bounds.
The positive `recoveryTerm` is retained in every phase. Nullability is exact:
`recovering` names that term and the exact controller; `active` names the
runtime participant and no controller; `fenced`, `releasing`, and `released`
grant neither runtime nor controller authority. `releaseCompletionId` is NULL
in every phase except `released`, where it is the exact 64-hex identity from
the permanent SQLite completion row.

The install command accepts only:

- an absent key for a genuinely new store at generation 1 when it consumes
  the exact already-committed `initializing(1,term,Bn,installing)` bootstrap
  reservation;
- exact idempotent reinstallation of the pending generation; or
- the exact old generation named by the SQLite transition.

The absent-key bootstrap command installs `recovering`, never `active`, and
atomically creates/fences the reserved participant guard, establishes the
canonical consumer group, and `PERSIST`s every reserved source inbox before
returning. It cannot be called from an empty process-local claim: the sealed
adapter must first resolve the exact durable bootstrap reservation. A
controller-advance command at the same generation accepts a strictly greater
SQLite-reserved term, changes the exact controller identity atomically, and
rejects if Redis already contains a greater term. If Redis contains a lower
term because one or more install replies were lost, it may advance directly
to the newest reserved term. A delayed lower-term command then rejects. No
recovery permit is issued until SQLite consumes an exact Redis witness and
marks that term `installed`.

A greater Redis generation/term, wrong authority/namespace/binding/scope,
malformed record, missing key for a store with existing epoch history, or
rollback is a hard `recovery_required` result. A lower generation or term is
never installed over a higher one.

Loss of the Redis epoch key after any generation has existed is not
automatically repaired. The runtime stops closed. A later reviewed offline
maintenance procedure may recover the anchor; WIRING-B does not infer it from
SQLite. This rule prevents a restored released snapshot from reusing an old
generation after Redis data loss.

### 2.4 Non-expiring participant guards and settlement proofs

Before an epoch-owned participant presence can become visible, the
origin-owned registration path atomically creates:

```text
<prefix>:epoch-participant:<participantId>
```

Its exact canonical shape is:

```text
{
  protocolVersion: 1,
  redisAuthorityId,
  redisNamespaceId,
  bindingOrdinal,
  scopeId,
  participantId,
  leaseTokenHash,
  firstGeneration,
  generation,
  recoveryTerm,
  phase: "fencing" | "recovering" | "active" | "releasing" | "released",
  leaseExpiresAtMs,
  releaseCompletionId
}
```

The record binds the immutable store/Redis tuple, scope, participant, the
64-lowercase-hex SHA-256 digest of that participant's privately generated
lease token, first/current generation, retained recovery term, exact phase,
and the Redis lease deadline when active/recovering. The token is never stored
in the guard. The digest is set before credentials are exposed, never changes,
and is compared in constant-work Lua before any public operation can disclose
or mutate state. It has no TTL and is never deleted, including after
`released`. A superseded controller is left `fencing`; phase and coordinate
changes occur atomically with the corresponding epoch record. An absent marker
means an ordinary participant. A present, wrong-type, malformed, mismatched,
or otherwise ambiguous marker makes ordinary transport fail closed.
`releaseCompletionId` is NULL before release completion and must equal the
permanent SQLite/Redis completion identity in `released`.

Every epoch install, controller succession, release fence, release
confirmation, and lifecycle script which observes a present guard executes
`PERSIST` on the participant inbox before returning. No guarded branch may
execute `DEL`, `UNLINK`, `EXPIRE`, `PEXPIRE`, `EXPIREAT`, `PEXPIREAT`, or a
replacement write against that inbox. This holds even when presence is
already absent or an `SSCAN` result is stale.

Every epoch ACK or recovery finalization writes, in the same Lua command as
`XACK == 1` and `XDEL == 1`, a canonical proof at:

```text
<prefix>:epoch-proof:<bindingOrdinal>:<scopeId>:<sourceParticipantId>:<deliveryId>
```

The proof binds authority/namespace/binding, source participant, delivery,
message/consume identity, settlement generation, recovery term/controller
(or active participant for direct ACK), and proof kind
`EPOCH_DIRECT_ACK` or `EPOCH_RECOVERY_ACK`. It has no TTL. Exact proof replay
is idempotent; any conflicting value is `TRANSPORT_STATE_UNKNOWN`.

WIRING-B performs no proof deletion or expiry. A future garbage collector is a
separate reviewed protocol and may delete only after an exact durable SQLite
ACK-intent commit for that proof plus a monotonic durable GC watermark. Until
such a protocol is independently accepted, every proof remains non-expiring.
The current positive-TTL ordinary ACK tombstones remain BUILT behavior for
non-epoch profiles but are never used as WIRING-B convergence evidence.

## 3. Epoch state machine

### 3.1 Bootstrap

A brand-new epoch profile requires all of these facts:

- no owner row;
- no companion scope row;
- a profile-created, exactly bound store/Redis allocation row;
- no Redis epoch key; and
- no pre-existing consumer, ACK, recovery-source, proof, or vault state for
  the scope.

The origin-owning profile selects a private B1 participant ID but creates no
guard, presence, registry member, credential object, epoch permit, or other
generation-scoped Redis state yet. One `BEGIN IMMEDIATE` transaction:

1. rechecks the exact store binding, selected migration set, empty scope, and
   absent owner/companion rows;
2. inserts the existing owner's legal `(scope, generation=1, owned)` row;
3. inserts
   `initializing(1,term=1,B1,installing,positive_deadline)` in the companion;
   and
4. commits both rows before returning an opaque
   `DurableEpochBootstrapReservation`.

That commit is the first generation reservation. Only then may the private
bootstrap Lua command make the first generation-scoped Redis write. It consumes
the exact reservation, requires the epoch, B1 guard, B1 presence, and B1
registry membership to be absent, establishes the canonical empty stream/group,
`PERSIST`s the inbox, and atomically writes exact
`recovering(1,term=1,B1)` epoch, guard, private presence, and registry state.
Neither the private credentials nor any transition/recovery/runtime permit are
returned. A committed-but-lost reply is resolved only by an exact bounded
readback of that complete tuple.

One second `BEGIN IMMEDIATE` transaction consumes the exact Redis witness,
requires the unchanged unexpired `initializing` reservation and owner row, and
changes only the companion to
`recovering(1,term=1,B1,installed)`. Only after that commit and exact Redis
readback may composition expose B1's private recovery credentials and mint the
sole recovery permit. It proves the recovery-source and ACK sets empty and the
B1 inbox/PEL empty, then uses the ordered activation protocol in section 6.5
to reach `active(1,B1)` without changing generation or decreasing term.

Bootstrap succession is durable, not a fresh retry. If B1's SQLite deadline
expires in `initializing`, one immediate transaction inserts B1 as an `open`
source, changes the private controller identity to B2, increments the term
exactly once, retains `initializing/installing`, and commits before B2 can run
Redis. The bootstrap Redis command then has two legal cases: install the newest
reserved tuple into an absent epoch while creating a fenced/PERSISTed B1 source,
or advance an already installed lower term to B2 while fencing/PERSISTing B1.
B3 repeats the same CAS after B2's deadline. A delayed B1/B2 command may install
only its historically reserved lower term into an absent/lower Redis record;
it receives no permit because SQLite has advanced, and the newest controller
atomically supersedes it. A delayed lower term can never overwrite an equal or
higher Redis term.

| Bootstrap boundary | Durable/Redis state after crash | Sole legal resume |
|---|---|---|
| Before reservation commit | no owner/companion and no generation Redis state | restart fresh admission; the abandoned ID had no credential or Redis footprint |
| After reservation, before Redis | exact `initializing(1,t,Bn)`; Redis absent | same Bn resumes before expiry, or successor CAS reserves `t+1` first |
| Redis install committed, reply lost | SQLite still `initializing`; Redis exact same/lower reserved tuple | exact readback, never a second bootstrap or blind overwrite |
| After Redis witness, before SQLite confirmation | Redis controller exists but no permit/credential is exposed | confirm the exact tuple, or after expiry reserve a higher term |
| After SQLite confirmation, before permit exposure | both authorities agree; no caller holds authority | mint exactly one permit from fresh exact readback |
| During B1/B2/B3 succession | SQLite is equal to or ahead of Redis and every old ID is an open source | install/confirm only the newest reserved term, then drain every source |

Any partial or contradictory bootstrap fails closed. Once the owner row commits,
no process may re-enter fresh bootstrap or fall back to WIRING-A. A missing
epoch after a previously confirmed bootstrap is recovery-required, not
absent-key bootstrap.

### 3.2 Lease renewal

Only an exact active runtime permit or exact installed recovery-controller
permit may renew. Active renewal compares generation, retained recovery term,
and participant. Recovery renewal compares generation, recovery term,
controller participant, controller state `installed`, and both unexpired
deadlines. Renewal is:

1. atomically extend the exact Redis generation/term/participant or exact
   generation/term/controller deadline;
2. update the SQLite companion deadline only if every coordinate and phase
   remains exact and the owner row still matches; and
3. return success only after the SQLite commit.

If step 1 succeeds and step 2 loses a takeover race, the old runtime stops.
The extended Redis deadline grants transport availability only; SQLite still
rejects the old generation/term and the replacement installs the higher
generation or controller term.

The adapter uses SQLite's own clock inside transactions and Redis `TIME`
inside Lua. Lease configuration and renewal cadence are private, bounded
profile values. Callers cannot supply `now` or a deadline.

### 3.3 Crash or forced takeover

After the SQLite lease is expired, exactly one transaction may change
`active(g,D1)` to `fencing(g -> g+1)`. That commit:

- removes the active deadline;
- records the old participant as `previous_participant_id`;
- inserts D1 as an `open` recovery source in the same transaction;
- leaves the owner row at generation `g`; and
- makes every main-backed normal or recovery operation for `g` fail.

Contenders observe the same pending generation. They may idempotently resume
the Redis generation installation. No contender receives a recovery permit in
`fencing`.

Redis installation atomically changes the exact old epoch to `g+1` and
fences the exact old participant presence while preserving its inbox, then
returns an opaque witness. Fencing removes only the exact D1 presence/registry
membership named by the SQLite transition and records an internal
non-expiring participant-fence marker. It does not delete or expire D1's
stream. D1 credentials can no longer heartbeat, receive, ACK, send, discover,
or unregister as that participant. If the old general-purpose managed client
registers a new participant, that public identity has no WIRING-B authority
unless the origin-owned epoch registration path first guards and admits it.

The origin-owning profile selects D2's private ID but creates no D2 guard,
presence, credential, or permit yet. The SQLite reservation transaction
consumes either the generation-install witness or a newly acquired exact
Redis-confirmation witness, advances the owner row to `g+1`, increments the
persistent recovery term, and enters
`recovering(g+1,t+1,D2,installing)`. It sets a bounded SQLite recovery deadline
and returns only a transition witness. The controller-install command then
advances Redis to the exact tuple and atomically creates D2's recovering guard,
private presence/registry state, stream/group, and persistent inbox. A final
SQLite transaction consumes that witness, requires the same unexpired tuple,
changes `installing -> installed`, and only then exposes D2's private
credentials and mints the sole recovery permit.

There is no ordinary receive, ACK, handler, replay, or normal repository
execution in either recovering controller state.

### 3.4 Recovery-controller succession

If R1 at `(g,t,D2)` crashes or pauses, expiry of its SQLite recovery deadline
only makes a successor CAS eligible. The origin-owning profile selects D3's
private ID but creates no D3 guard, presence, credential, or permit. One
immediate SQLite transaction:

1. requires `recovering(g,t,D2,installing|installed)` and the exact expired
   deadline;
2. inserts D2 as an `open` recovery source, idempotently rejecting a
   contradictory pre-existing row;
3. increments `recovery_term` to `t+1`;
4. replaces both controller/participant fields with D3;
5. sets controller state `installing` and a new bounded deadline; and
6. returns a committed transition witness only after commit.

That commit is the main-store controller revocation point. Every SQLite read
used for a decision and every mutation by R1 now rejects, even if an old claim
deadline remains live.

The Redis controller-advance command consumes the transition capability,
requires the exact epoch generation/binding, accepts only a Redis term lower
than `t+1`, fences D2's participant guard without deleting its inbox, and
installs `(g,t+1,D3)` plus D3's recovering guard/private presence atomically.
If R1 runs a term-`t` destructive Redis command before that install, it must
leave the non-expiring exact settlement proof; R1 still cannot commit SQLite.
If the higher term installs first, every delayed lower-term command rejects.
SQLite marks D3 `installed` and exposes its private credentials/permit only
after exact Redis confirmation.

If D3 crashes in `installing`, D4 repeats the same CAS after D3's SQLite
deadline and advances to `t+2`; terms may be skipped in Redis but never
decrease. No controller ever resumes another controller's term.

### 3.5 Orderly rejoin

The accepted WIRING-A lineage retirement remains the first step. After D1
work has settled, an orderly transition may enter `fencing` before its lease
expires. D2 receives no epoch runtime permit until Redis is advanced, SQLite
has an installed controller at the next generation, and D1 drain/recovery is
complete.

Every incarnation therefore uses a new durable generation. A D1 managed
operation retained across rejoin fails both its process-local incarnation
permit and its durable epoch checks.

### 3.6 Release

Release has its own representable phase and is exact-generation:

1. stop new runtime admission, abort the active scheduler, and await every
   already admitted consumer/reconciler/effect/ACK flight while still
   `active(g,Dn)`. The WIRING-B runtime invokes no caller
   `lifecycle.beforeRelease`; this ordered stop is the complete before-release
   behavior;
2. commit `active(g,Dn) -> releasing(g,Dn)` with no pending generation,
   blocking every new main effect;
3. atomically change the exact Redis epoch and Dn guard from `active` to
   `releasing`, remove only Dn's presence/registry membership, and `PERSIST`
   Dn's inbox. This closes both sender and recipient SEND admission plus every
   private/ordinary transport operation before any empty decision;
4. after exact reply/readback, run one read-only release-source command under
   the same `releasing(g,term,Dn)` coordinate. It validates the stream and
   canonical consumer group and returns exactly one closed result:
   `source_empty` only for `XLEN == 0` and an exact empty `XPENDING` summary,
   `source_nonempty` for any positive stream or PEL count, or
   `transport_state_unknown` for every malformed/missing/wrong-type/overflow
   or contradictory state. It returns no entry/body and `PERSIST`s the inbox;
5. in one `BEGIN IMMEDIATE` transaction recheck the exact releasing pair and
   every ACK intent, receipt claim, recovery-required row, committed effect,
   quarantine, source, and observation predicate, then choose one branch:
   - consume an exact `RedisReleaseSourceEmptyWitness` and, only when every
     durable predicate is closed, compute the canonical `completion_id`,
     insert its exact permanent release-completion row as `redis_pending`, and
     commit owner/companion `released(g)` in the same transaction;
   - for `source_nonempty` or any known unsettled durable work, insert Dn as
     `open` and atomically commit
     `releasing(g,Dn) -> fencing(g -> g+1, previous=Dn)`, leaving the owner at
     owned generation `g`; or
   - for ambiguous transport/durable state, insert/mark Dn
     `recovery_required` and enter `faulted`, never `released`;
6. after the empty SQLite commit invalidates the old release permit, the
   origin-owned sealed adapter reacquires one
   `DurableEpochReleaseCompletionPermit` from the exact `redis_pending` row.
   Reacquisition revalidates the exact SQLite origin/capability, immutable
   Redis binding, `released(g)` owner/companion pair, completion tuple, and
   Redis epoch/guard as either exact
   `releasing(g,term,Dn,NULL)` or exact
   `released(g,term,Dn,completion_id)`. No caller, old release permit,
   controller, runtime, ordinary queue, or restart path can acquire it;
7. the Redis completion command consumes that permit, rechecks the canonical
   stream/group, `XLEN == 0`, empty `XPENDING`, exact persistent guard, and
   then accepts exactly two branches: exact `releasing(...,NULL)` atomically
   changes epoch and guard to `released(...,completion_id)`; exact already
   `released(...,completion_id)` changes nothing. Every other tuple rejects.
   Either accepted branch returns the same
   `RedisReleaseCompletedWitness`; and
8. one final `BEGIN IMMEDIATE` transaction consumes that witness, rechecks the
   unchanged `released(g)` pair and completion identity, and changes only the
   completion row `redis_pending -> confirmed`, setting `confirmed_at` once.
   Exact already-`confirmed` replay with the same tuple is idempotent and
   changes no timestamp; a lost SQLite commit reply resolves by exact
   readback. Only then may the incarnation permit be retired as a successful
   release and a later restart become eligible. The open-source branch instead
   uses the normal pending-generation install, which explicitly accepts exact
   Redis `releasing(g)` as its predecessor, installs a new controller, and
   drains Dn in place before any activation.

If generation `g` is exhausted, a nonempty/unsettled release still inserts Dn
durably but marks it `recovery_required` and enters `faulted`; it never treats
exhaustion as empty and never commits `released`.

A sealed release permit resolves exact `A`, and every SQLite/Redis release
step compares its generation, retained term, and participant. The SQLite
`releasing` commit revokes the old active permit in `main`; the Redis
`releasing` change revokes its remaining transport authority and is the SEND
linearization fence. A concurrent inbound SEND to Dn is therefore totally
ordered: if SEND commits first, its delivery is visible to the post-fence
source witness; if the release fence commits first, SEND rejects before dedupe
lookup/renewal, `XLEN`, `XADD`, or event append. A Dn outbound SEND which wins
that same Redis order is complete before transport revocation; one which loses
rejects as a non-active sender. The earlier SQLite `releasing` commit alone is
never claimed as Redis transport revocation.

A crash at any release step leaves a closed state which a later transition
may inspect and idempotently resume at the same generation. `releasing` never
grants normal or recovery effect authority, so two release resumptions can
only confirm or advance the same closed facts. No row, completion record,
participant guard, epoch key, or proof is deleted. An ambiguous or
contradictory result before the empty commit becomes
`faulted`/`recovery_required`, never a successful release. A lost
source-witness reply is repeated after confirming the same Redis release
fence; because send and drain admission are already closed, the predicate is
stable. A crash after the open-source SQLite transaction resumes only
`fencing(g -> g+1)`; it can neither return to release nor omit Dn.

The SQLite-released-before-Redis schedule has exactly one resume:

| Completion boundary | Durable/Redis fact | Sole legal resume |
|---|---|---|
| After `released` + `redis_pending`, before Redis command | old release permit is invalid; Redis exact `releasing`; completion identity is permanent | sealed epoch owner adapter reacquires the exact completion permit and runs step 7 |
| Redis completion committed, reply lost | Redis exact `released(completion_id)`; SQLite completion remains pending | exact bounded readback produces the same completion witness; never mint active/recovery/restart authority |
| After Redis witness, before SQLite confirmation | both stores identify the same completed release; restart still closed | repeat exact readback and commit only `redis_pending -> confirmed` |
| SQLite confirmation commits, reply lost | completion row is exact `confirmed`; `confirmed_at` is fixed | exact readback returns the same successful release and performs no write |
| After `confirmed` | SQLite and Redis release identities agree | restart reservation may revalidate both and reserve exactly `g+1` |

Epoch profile admission runs this completion resolver after exact
migration-set/store-origin/Redis-binding authentication and before bootstrap,
takeover, restart, participant registration, or runtime construction. In one
SQLite read transaction it loads the owner, companion, and at most one
completion row for the scope:

- `released` with no exact row, or a row whose tuple does not match the
  companion, is `STORE_SCHEMA_UNSUPPORTED`;
- `redis_pending` constructs the one sealed adapter for that exact
  `completion_id`, runs steps 6–8, and admits no other transition;
- `confirmed` requires exact Redis readback and is the only state which makes
  restart reservation eligible; and
- `recovery_required` is permanently faulted and grants no completion or
  restart capability.

The adapter class is module-private and created only by this origin-owning
admission path. It serializes attempts per opened store, exposes no raw Redis
client or generic mutation method, and can issue only
`completeRelease(completion_id)`. Separate processes may race to resume the
same durable row, but they derive the same unique command identity: Redis
accepts the exact transition once and exact replay thereafter, and SQLite
accepts the exact `redis_pending -> confirmed` CAS once. No process election,
PID, timeout, callback, lease, or newly minted identity is credited as
authority.

If Redis is nonempty, malformed, missing, wrong-type, at a higher coordinate,
or released under another completion ID after SQLite has committed
`released`, the adapter atomically marks the completion row
`recovery_required`; it never rewinds the companion, invents a new completion
ID, or permits restart. Concurrent resumers can acquire only capabilities for
the same row and command, so Redis idempotence plus the final SQLite CAS makes
their observable result identical. This is the only reacquirable
post-`released` authority.

A connection failure, timeout, or unknown command result is not evidence of
any contradictory Redis fact: the row remains `redis_pending` and admission
retries the same command/readback. Only a bounded successful observation of
the contradictory states above may make the monotonic
`recovery_required` transition.

### 3.7 Restart after released

A normal restart is explicit and monotonic:

```text
released(g)
  -> fencing(g -> g+1)
  -> Redis fenced(g+1)
  -> recovering(g+1, term+1, Dn, installing)
  -> Redis recovering(g+1, term+1, Dn)
  -> recovering(..., installed)
  -> active(g+1,Dn)
```

The reservation transaction requires the exact released owner/companion pair,
the permanent completion row in `confirmed`, and exact Redis epoch/guard
`released(g,completion_id)`. It retains historical recovery sources and term
and sets no previous participant. A `redis_pending` or `recovery_required`
completion is restart-ineligible even if the companion says `released`. The
new epoch-owned participant is guarded before registration exposure. The
recovery controller verifies all historical sources remain drained, no open
ACK/recovery state exists, and its own inbox is empty before activation. A
released snapshot with lower generation/term or a different completion ID
cannot pass the retained Redis anchor.

### 3.8 Exhaustion

`Number.MAX_SAFE_INTEGER` remains permanent exhaustion for either generation,
recovery term, or binding ordinal. There is no wrap, reset, store-binding
rotation, row deletion, or reuse at the same identity. Recovery requires a
separately reviewed offline maintenance transition.

### 3.9 State and authority invariants

The implementation must encode these as executable predicates, not comments:

1. `generation` and `recovery_term` never decrease; only the exact transitions
   above may increment either.
2. At most one SQLite row is current for a scope. At most one installed
   recovery controller exists for `(scope,generation,recovery_term)`.
3. A process may hold at most one class of authority: bootstrap reservation,
   transition, installed recovery, active runtime, or release. No object
   converts itself into another class.
4. Main-store mutations stop at the SQLite `FENCING` or controller-term CAS
   commit. Transport mutations stop at the corresponding Redis generation or
   term install. No operation is reported successful unless its own authority
   point accepted the exact coordinate.
5. Redis may temporarily lag SQLite during a transition, but no new
   recovery/runtime permit exists while the two records disagree. Redis may
   never lead with an unreserved generation/term.
6. `open -> drained` and any transition to `recovery_required` are monotonic.
   A participant ID is never removed from recovery history or reused as an
   ordinary participant after its non-expiring guard exists.
7. `releasing` and `released` grant no effect authority. Restart always
   reserves exactly `generation + 1`.
8. Absence, TTL expiry, clock passage, PID/probe state, or copied bytes never
   create authority.
9. `released` requires a post-Redis-fence exact empty stream/PEL witness and
   every durable close predicate. Its only post-commit mutation authority is
   the matching permanent release-completion row; restart remains closed
   until that row is `confirmed` against exact Redis
   `released(completion_id)`. Otherwise the source is durably `open` under a
   pending next generation or is `recovery_required`; no source identity is
   discarded.
10. Any script observing an epoch guard may preserve an inbox with `PERSIST`
    but may never TTL, delete, replace, or rehome it.
11. Migration profile is durable admission state: generic application and
    WIRING-A sets can never discover or apply the epoch migration.
12. The epoch public service performs no participant/recipient authority
    preflight. Local validation always reaches the operation's atomic Redis
    classifier; sender classification precedes recipient classification and
    all SEND mutations.
13. Exported group creation cannot create or repair an inbox/group while a
    participant guard exists. Missing guarded transport remains unknown.
14. Epoch construction exposes no caller-controlled consumer fault,
    reconciliation fault, or before-release callback.

| Phase | Active private receive/ACK | Recovery drain/ACK | Public SEND as guarded sender | Public SEND to guarded recipient | Other public managed operations | Main effect commit |
|---|---|---|---|---|---|---|
| `initializing` | reject | reject | reject | target unavailable | registration/renew/discover/unregister reject or hide target; inbox only `PERSIST` | reject |
| `fencing` | reject | reject | reject | target unavailable | reject by guard; target cleanup only `PERSIST` | reject |
| `recovering/installing` | reject | reject | reject | target unavailable | reject by guard; target cleanup only `PERSIST` | reject |
| `recovering/installed` | reject | exact `R` only | reject | target unavailable | reject by guard; target cleanup only `PERSIST` | exact recovery `R` only |
| `active` | exact `A` only | reject | allow only exact unexpired guard + matching Redis `A` | allow only exact unexpired guard + matching Redis `A` | receive/ACK/renew/unregister reject; discover may read only under exact `A` and uses guarded cleanup | exact `A` only |
| `releasing` | reject | reject | reject | target unavailable | reject by guard; target cleanup only `PERSIST` | reject |
| `released` | reject | reject | reject | target unavailable | reject by guard; target cleanup only `PERSIST` | reject |
| `faulted` | reject | reject | reject | target unavailable | reject by guard/closed state | reject |

An absent endpoint guard retains the existing ordinary participant behavior.
No public DTO carries generation, term, binding, epoch key, or capability.

## 4. Effect fencing

### 4.1 SQLite repository and ACK transitions

The profile binds the consumer repository, ACK outbox, recovery-source table,
deterministic test effect table, observation intents, and quarantine vault to
the same sealed SQLite `main` store.

The provisioner creates epoch-bound facets. It does not add a caller-supplied
`generation` field to existing DTOs. Each facet resolves its opaque permit
privately, then executes its mutation and this predicate in one immediate
transaction:

```text
owner generation is exact
AND epoch phase permits this operation class
AND epoch lease is unexpired
AND recovery term is exact
AND (
  active participant is exact
  OR (
    for recovery, controller state is installed
    AND recovery controller participant is exact
  )
)
```

Normal operations require `active` and exact `A`; their claim projection
retains the current positive term. Identity/ACK recovery operations require
`recovering`, an exact installed recovery permit, and exact `R`. No recovery
operation is permitted in `active`, `fencing`, `releasing`, or `released`.
The following existing operations are all covered:

- consumer `claim`, blocked-quarantine claim, attempt, effect commit,
  quarantine commit/block, claim release, receipt reads used for decisions,
  and bounded unacked-receipt enumeration;
- direct ACK `prepareAck`, claim, defer, and commit;
- reconciliation list, claim, renew, tombstone/orphan commit, defer,
  recovery-required, and summary;
- quarantine `put` and `get`; and
- recovery-source insert/list, empty-witness commit, terminal marking, and
  summary.

Every SQL statement which can change one of those tables includes the epoch
predicate in the same immediate transaction. Reads whose result controls a
later action validate the same coordinate in their read transaction and the
later mutation rechecks it; a read never grants authority. An epoch/controller
mismatch has one closed internal result and changes no receipt, intent, vault
row, recovery source, counter, or observation intent.

An old receipt or ACK claim records its complete active or recovery authority
shape. The current exact controller can take over a lower-generation active
claim or lower-term recovery claim atomically; equality with a caller-supplied
owner/token is never enough. Direct-active and recovery claim families remain
domain-separated.

### 4.2 Business effects

WIRING-B does not accept the current arbitrary handler as an epoch fence.

An epoch-capable profile must issue a `DurableEpochEffectPort` whose
destination atomically:

1. validates the opaque runtime epoch;
2. verifies exact generation, phase, and unexpired lease at the destination's
   commit point;
3. deduplicates by `consumeKey`; and
4. commits the effect and returns a registered
   `CommittedEpochEffectWitness`.

The consumer repository accepts the witness once and records its closed
`commitId` in the same `main` transaction which rechecks the exact epoch or
controller tuple. A plain `{status: "committed", commitId}` is invalid.

The first implementation profile may place a deterministic test business
effect table in the same SQLite `main` transaction domain. A future external
destination must implement an equivalent atomic compare-and-commit contract.
HTTP calls, shell commands, model calls, filesystem writes, or callbacks
without destination-side epoch fencing remain unsupported.

Consequently the generic production handler path stays unavailable even
after the epoch code exists. This is a deliberate support boundary, not a
deferred test.

### 4.3 Observations

WIRING-B does not invoke arbitrary audit or metrics callbacks directly. The
first test profile uses no-op observers. A future non-no-op profile must use an
`EpochObservationPort`: the authoritative transaction stores a body-free,
idempotent observation intent in `main`, and an epoch-aware drain delivers it
through a destination-side dedupe key. A stale runtime cannot emit a new
observation after `FENCING`; an observation committed before fencing may be
delivered later as historical evidence.

Observation DTOs contain no epoch capability, body, token, raw error, or
store binding. A callback failure cannot revive, renew, settle, or select an
epoch. The current arbitrary audit/metrics callback path is unsupported by an
epoch production profile for the same reason as the current arbitrary
business handler.

### 4.4 Retry and replay policy

The first WIRING-B profile accepts no caller-supplied `retryClassifier`.
Trusted composition selects one module-private, frozen registry that maps a
closed allowlist of safe consumer error codes to `retryable` or `permanent`.
The lookup is synchronous, total, deterministic, performs no I/O, invokes no
callback/getter, holds no capability, and defaults unknown codes to
`permanent`. Mutating the registry or supplying a function rejects profile
construction.

Replay is unsupported. The WIRING-B consumer does not expose its existing
`replay` method, does not call `authorizeReplay`, and does not invoke
`beginReplay`, `commitReplay`, or `failReplay`. A request receives fixed
`EFFECT_PROFILE_UNSUPPORTED` before authorization or repository work. A future
replay profile must separately define an epoch-aware authorization/effect
protocol and receive independent review; this design does not speculate one.

### 4.5 Actual runtime callback seam closure

The built generic runtime currently accepts `consumerFault` and
`reconciliationFault`, and awaits
`inspect().lifecycle.beforeRelease` when present. Those are real control-flow
seams, not test abstractions. The epoch profile closes them as follows:

- its constructor accepts an exact allowlist of data properties. Validation
  uses own-property descriptors without invoking getters; an accessor,
  symbol, non-plain prototype, or own `consumerFault`,
  `reconciliationFault`, `lifecycle`, or `beforeRelease` property rejects with
  `EFFECT_PROFILE_UNSUPPORTED` before migration selection, store opening,
  participant registration, Redis access, or provision construction;
- trusted epoch composition supplies two frozen module-private no-op functions
  to the generic runtime positions for `consumerFault` and
  `reconciliationFault`. Their identities cannot be replaced after
  construction, they capture no authority, perform no I/O, and their return
  values are ignored;
- the epoch runtime release branch does not inspect, call, or await
  `inspect().lifecycle.beforeRelease`. It first stops admission/scheduling
  through the sealed runtime supervisor and then enters the durable section
  3.6 release state machine. The epoch provision exposes no callable
  `beforeRelease`; encountering one after construction is
  `EFFECT_PROFILE_UNSUPPORTED`, not a hook invocation; and
- the generic/WIRING-A runtime behavior remains unchanged. No production
  callback is represented as epoch-safe by this design.

Crash tests do not regain these seams. They run the epoch owner in a child
process, wait for an externally visible committed SQLite/Redis witness, and
pause/terminate the child through the supervising test process. No
`consumerFault`, `reconciliationFault`, lifecycle callback, audit callback, or
getter signals a crash boundary.

The directed REDs are
`epoch_profile_rejects_consumerFault_before_admission`,
`epoch_profile_rejects_reconciliationFault_before_admission`, and
`epoch_release_never_reads_or_invokes_beforeRelease`. Their independent
mutants are respectively `EPOCH-WIRING/CB-CONSUMER`,
`EPOCH-WIRING/CB-RECONCILIATION`, and
`EPOCH-WIRING/CB-BEFORE-RELEASE`; killing one supplies no evidence for either
of the others.

## 5. Redis transport fencing

### 5.1 Private transport facet

WIRING-B obtains one epoch transport facet through trusted service/queue
composition. It is injected once into the provision, like the accepted ACK
recovery facet. It is not acquired from an ordinary
`RedisCoordinationQueue`, public coordination service, managed-client status,
or module export.

The same trusted composition also installs one sealed
`EpochPublicAuthorityFacet` in `createCoordinationService`. Its presence
selects the epoch-profile dispatch for all public participant operations; it
is neither an option accepted from application code nor a property returned
by the service. The ordinary service dispatch remains byte-for-byte reachable
when the facet is absent. Epoch dispatch performs only:

1. existing local DTO/size/identifier validation;
2. local SHA-256 hashing of the supplied lease token;
3. bounded clock/UUID generation; and
4. construction of a non-authoritative message/filter/read/ACK draft.

It then calls exactly one facet operation. In particular, epoch dispatch never
calls `queue.getParticipant`, `readParticipant`,
`authenticateParticipant`, or a recipient lookup, and never derives scope,
presence, lease currency, a sender/recipient fence, or lifecycle authority in
JavaScript. The facet derives Redis keys from validated identifiers and its
private immutable prefix; raw keys, epoch coordinates, and capabilities are
not caller inputs. Queue results return the canonical scope and participant
projection needed for output validation and audit only after the atomic
authority decision. Audit remains post-result and grants no authority.

Public DTOs do not gain epoch fields. The epoch runtime uses the private facet
while preserving current DTO validation and body-free external errors. The
managed client retains its exact four-code `LEASE_LOSS_CODES` set:
`COORDINATION_AUTH_FAILED`, `COORDINATION_LEASE_EXPIRED`,
`COORDINATION_LEASE_CHANGED`, and `COORDINATION_LEASE_NOT_FOUND`. The new
managed-operation and internal-error results are deliberately not lease-loss
codes.

The private facet is necessary but not sufficient. The existing ordinary
`FENCE_INBOX_SCRIPT`, `FENCED_AUTOCLAIM_SCRIPT`,
`FENCED_READ_NEW_SCRIPT`, and `ACK_INBOX_SCRIPT` each receive the derived
epoch-participant guard key and inspect it atomically before any `XREADGROUP`,
`XAUTOCLAIM`, `XACK`, `XDEL`, or tombstone mutation. A canonical guard in
`fencing`, `recovering`, `active`, `releasing`, or `released` returns the
closed `epoch_owned` result. A wrong-type, malformed, mismatched, or ambiguous
guard returns invalid transport state. Only an absent guard permits the
unchanged ordinary receive/ACK path.

#### 5.1.1 Atomic public SEND endpoint guards

After DTO validation, epoch dispatch calls
`EpochPublicAuthorityFacet.send` with only the validated sender/recipient IDs,
the sender lease-token digest, a generated message ID and timestamp, the
dedupe TTL, and a bounded draft containing message type, classification, body,
and optional trace/correlation/reply IDs. It does not build an authoritative
envelope. One extended `SEND_MESSAGE_SCRIPT` reads both presence keys, both
guard keys, any guard-derived epoch keys, the recipient inbox, dedupe key, and
event stream and obtains one Redis `TIME`. Inside that single invocation it:

1. authenticates and classifies the sender;
2. authenticates/classifies the recipient without a recipient credential;
3. derives the one scope from the accepted sender and proves the recipient has
   that scope;
4. constructs and serializes the canonical envelope from the accepted
   identities plus the non-authoritative draft;
5. reads existing dedupe state;
6. performs an equal-retry `PEXPIRE` only after semantic equality;
7. checks `XLEN` capacity;
8. performs `XADD`;
9. writes the dedupe value; and
10. appends the event.

No earlier service/queue read is authoritative and no second Redis command can
admit the send. Every result before step 5 leaves the dedupe value and TTL,
inbox, event stream, and audit unchanged. A duplicate result returns the
stored canonical envelope; created and duplicate results return the canonical
sender/recipient projection used by service validation and audit.

Endpoint classification uses the one global lexicographic coordinate order
`C = (generation,recoveryTerm)`:

- **guard absent:** the ordinary presence must be canonical, name that endpoint
  and scope, and have a future expiry. For the sender its stored token digest
  must equal the supplied digest. No epoch coordinate is invented.
- **guard present, lower coordinate:** the canonical endpoint is a known
  predecessor and is not active. Sender returns
  `epoch_sender_not_active`; recipient returns
  `epoch_recipient_not_active`.
- **guard present, equal coordinate:** authority/namespace/binding/scope,
  participant, guard, epoch, and coordinate must agree. Only exact
  `phase=active`, exact Redis `A`, matching canonical presence, matching
  sender digest, and future epoch and presence deadlines are active. Every
  other canonical equal non-active phase or elapsed canonical deadline is the
  corresponding not-active result. An `active` tuple with missing, malformed,
  or mismatched presence is contradictory and therefore unknown.
- **guard present, higher or incomparable coordinate:** a missing/wrong-type
  epoch, malformed or non-canonical bounded JSON, different
  authority/namespace/binding/scope/participant, or any higher guard than the
  epoch is `transport_state_unknown`. It is never guessed stale or active.

Sender classification is unconditionally complete before the recipient is
read. Therefore a stale/closed sender plus missing/closed/corrupt recipient
has the sender result, making the sender-first dual-failure branch reachable
through the public service. The exact queue/service/client mapping is:

| Atomic queue result | Fixed service result | Managed-client disposition |
|---|---|---|
| guard-absent sender presence absent, or supplied digest mismatches canonical ordinary presence/permanent guard digest | `COORDINATION_AUTH_FAILED` | existing lease-loss path begins rejoin |
| canonical ordinary sender expired | `COORDINATION_LEASE_EXPIRED` | existing lease-loss path begins rejoin |
| malformed ordinary endpoint presence, or active guarded endpoint with missing/mismatched presence | `COORDINATION_INTERNAL_ERROR` | fail closed; no lease-loss retry/rejoin |
| legacy ordinary-profile fence mismatch (not emitted by the epoch facet, which has no preflight fence) | `COORDINATION_LEASE_CHANGED` | existing lease-loss path begins rejoin |
| `epoch_sender_not_active` for lower or canonical equal non-active/expired state | `COORDINATION_EPOCH_MANAGED_OPERATION_REQUIRED` | reject; not lease loss; no rejoin |
| ordinary recipient absent/expired, or `epoch_recipient_not_active` for lower or canonical equal non-active/expired state | `COORDINATION_TARGET_NOT_FOUND` | reject; no rejoin |
| accepted endpoints with different scope | `COORDINATION_SCOPE_MISMATCH` | reject; no rejoin |
| `transport_state_unknown` for either endpoint | `COORDINATION_INTERNAL_ERROR` | fail closed; no lease-loss retry/rejoin |
| ordinary or exact-active endpoints accepted | existing created/duplicate/conflict/full mapping | unchanged |

The public error contains no participant record, generation, term, phase, raw
Redis reply, body, or token. Exact-active guarded SEND is a compatibility
surface, not an epoch capability: the command validates server-held state.
Lower/equal-non-active sender results never masquerade as lease loss, so a
managed client cannot register a replacement and regain WIRING-B authority.

#### 5.1.2 Epoch-aware public lifecycle scripts

Epoch service dispatch applies the same “validate/hash, then facet” rule to
heartbeat (renew), discovery, unregister, receive, and ACK. None calls
`readParticipant` or `authenticateParticipant`. Their scripts use the same
coordinate classifier and authenticate the caller before any operation
mutation:

| Public operation / script | Exact epoch-profile authority and ordering |
|---|---|
| register / `REGISTER_PARTICIPANT_SCRIPT` | Registration has no caller credential. Check the server-generated ID's guard before group/event/presence/registry writes. Guard absent preserves ordinary registration. Canonical guard first `PERSIST`s an existing inbox and returns `epoch_owned`; malformed/higher/incomparable state is unknown. This is a bounded ID collision and the service retries with a new generated ID. Only private epoch installation may create/update guarded state |
| heartbeat / `RENEW_PARTICIPANT_SCRIPT` | Receive ID, supplied digest, generated lease times, and participant draft. Read guard before presence mutation. Guard absent authenticates the canonical presence digest and expiry inside Lua, then performs the ordinary renewal. Guard present authenticates against the permanent guard digest, `PERSIST`s an existing inbox, and returns `epoch_owned` for lower or any canonical equal coordinate; higher/incomparable/malformed is unknown. No event, presence TTL/value, or registry mutation occurs on a guarded result |
| discover / `LIST_PARTICIPANTS_SCRIPT` | `SSCAN` only supplies untrusted candidate IDs. Every batch command first authenticates the caller digest and current lease; a guard-absent caller is ordinary, exact-active equal guarded caller may list, lower/equal-non-active returns `epoch_owned`, and higher/incomparable is unknown. It derives caller scope inside Lua and enforces an optional requested scope there. Each target is then classified: ordinary/exact-active may be returned; lower/equal-non-active is omitted and may be `SREM`ed only after `PERSIST`; unknown aborts. A final empty batch repeats caller authentication before service returns any list |
| unregister / `DELETE_PARTICIPANT_SCRIPT` | Receive only ID, supplied digest, and generated timestamp. Guard absent plus missing presence preserves `{unregistered:false}`; otherwise authenticate digest and expiry inside Lua before ordinary delete. Any canonical guard first authenticates against its permanent digest and `PERSIST`s an existing inbox, then lower/equal returns `epoch_owned`; higher/incomparable is unknown. It performs no `DEL`, `SREM`, event, presence, or TTL mutation |
| receive / `FENCE_INBOX_SCRIPT`, `FENCED_AUTOCLAIM_SCRIPT`, `FENCED_READ_NEW_SCRIPT` | Each command receives ID and digest, authenticates inside Lua, and returns the canonical participant/scope projection with deliveries. Guard absent preserves ordinary behavior. Any lower or canonical equal guard returns `epoch_owned` before fenced read/reclaim; higher/incomparable is unknown. The blocking path authenticates in its before-script and repeats the guard/auth check after the raw block before returning a delivery |
| ACK / `ACK_INBOX_SCRIPT` | One command receives ID/digest/delivery IDs, authenticates and classifies the guard before tombstone, `XACK`, `XDEL`, or event mutation. Guard absent preserves ordinary ACK. Lower or canonical equal guard returns `epoch_owned`; higher/incomparable is unknown |

For heartbeat/unregister/receive/ACK, a guard-absent missing presence or digest
mismatch maps to `COORDINATION_AUTH_FAILED`, expiry to
`COORDINATION_LEASE_EXPIRED`; the managed client follows its existing rejoin
rule. The epoch facet emits neither `COORDINATION_LEASE_CHANGED` nor
`COORDINATION_LEASE_NOT_FOUND`; those remain existing generic/client
lease-loss codes. `epoch_owned` maps to
`COORDINATION_EPOCH_MANAGED_OPERATION_REQUIRED` and unknown maps to
`COORDINATION_INTERNAL_ERROR`; neither causes rejoin. Unregister's historical
missing/no-op result remains the sole unauthenticated exception and is decided
inside its Lua command. For discovery, `epoch_owned` is the same managed
operation error; target non-active state is only omission, and unknown remains
internal error. Registration collision does not disclose epoch ownership.

`listParticipants` changes each evaluated target from a presence/inbox pair to
a presence/inbox/guard triple and retains a final empty-batch caller check.
An `SSCAN` page captured before fencing has two legal linearizations: its batch
script wins and completes bounded ordinary cleanup before epoch installation,
whose atomic fence then `PERSIST`s the inbox; or installation wins, the batch
sees the guard, `PERSIST`s, and cannot execute `PEXPIRE`. Authenticated
unregister has the same ordering against its one Lua command. There is no gap
between observing the guard and deciding TTL/delete behavior. A blocking
ordinary receive whose before-script wins just before fencing may move a
delivery to PEL; its after-script cannot return it, and the durable source is
recovered through the separate PEL branch. It never makes a guarded delivery
disappear.

Epoch install/controller succession/release commands themselves remove only
the exact predecessor presence/registry membership, advance its guard, and
`PERSIST` its inbox atomically. Registration, renewal, discovery, unregister,
fencing, and release never delete an epoch guard or guarded inbox. The
epoch-owned profile disables ordinary heartbeat/unregister cleanup for its
managed identity and drives the private renewal/release paths; retained public
calls still reject inside Redis. A stale general-purpose client may register a
different unguarded ordinary participant, but that identity receives no
WIRING-B permit.

The epoch registration path creates the guard before credentials are exposed,
so a newly installed epoch identity cannot begin the blocking ordinary path
in an unguarded window. The marker is not a public unregister credential and
does not grant authority over any other participant.

#### 5.1.3 Guard-aware exported group creation

The exported `RedisCoordinationQueue.ensureInboxGroup(participantId)` remains
available for ordinary trusted-local provisioning, but it becomes one
`ENSURE_INBOX_GROUP_SCRIPT` over the participant guard and inbox keys. It has
this closed behavior:

1. validate/derive the participant, guard, and inbox keys in JavaScript;
2. inside Lua inspect the guard before `TYPE`, `XINFO`, or group creation;
3. if the guard is absent, preserve the ordinary idempotent
   `XGROUP CREATE <inbox> <group> 0 MKSTREAM` behavior: return
   `{status:"created"}` when creation returns `OK`, or `{status:"exists"}`
   when Redis returns `BUSYGROUP`;
4. if a canonical guard and its derived epoch form a lower or equal canonical
   coordinate, call `PERSIST` only when the inbox exists, perform no `XGROUP`,
   `MKSTREAM`, `XADD`, delete, or TTL mutation, and return
   `{status:"epoch_owned"}` whether the stream/group exists or is missing; and
5. if a present guard/derived epoch or inbox is wrong-type, malformed,
   missing-epoch, higher/incomparable, or Redis replies ambiguously, return
   queue invalid-data/transport unknown and create nothing.

The low-level `epoch_owned` result is deliberately closed: no current public
service, tool, MCP, managed client, registration/provision path, or epoch
runtime calls this exported method at the authenticated author baseline; only
the queue contract tests call it directly. Those ordinary tests continue to
accept exactly `created` and `exists`. A future public mapping would be
`COORDINATION_EPOCH_MANAGED_OPERATION_REQUIRED`, while invalid data maps to
`COORDINATION_INTERNAL_ERROR`. Private bootstrap/controller installation uses
its reservation-gated epoch script and never calls `ensureInboxGroup`.
Private receive/ACK and release also never call it.

The group/install race has only two owners. If ordinary ensure commits first,
epoch installation subsequently validates the stream/group and `PERSIST`s the
inbox before installing the guard. If epoch installation commits first,
ensure sees the guard and cannot create a missing stream/group. A missing
guarded inbox/group is therefore transport unknown to receive, recovery, and
release; it can never be reconstructed as an empty source. The distinct
mutation owner is `EPOCH-TRANSPORT/GROUP-GUARD`, not the lifecycle-script
owner. A lost `created` reply before guard installation replays as `exists`;
a lost `exists` reply replays as `exists`. A lost `epoch_owned`/unknown reply
after guard installation replays the guarded no-create branch. A process crash
after either ordinary result and before epoch installation leaves only an
ordinary stream/group, which the later reservation-gated install must validate
and persist.

### 5.2 Receive

Every epoch receive Lua command checks, atomically:

- the exact non-expired Redis epoch;
- exact `A`, or for drain receive exact `R`;
- the current participant lease fence;
- scope, inbox, consumer group, and delivery bounds; and
- the canonical stored envelope.

Epoch runtime receive does not use blocking `XREADGROUP`. It performs bounded
nonblocking fenced reads/reclaims and uses the existing abortable scheduler
between empty polls. This removes the unavoidable side effect between a
blocking command's pre- and post-fence checks.

An obsolete or expired epoch returns no delivery to the consumer. A delivery
already claimed immediately before fencing is handled only through the
durable recovery rules below.

### 5.3 Direct ACK

The epoch-specific ACK command receives the internal epoch key, participant
guard, proof key, and either exact `A` or exact `R`. The epoch/controller
predicate, envelope, exact PEL
identity, `XACK`, `XDEL`, non-expiring proof write, and event append remain one
atomic command. The first destructive settlement requires `XACK == 1` and
`XDEL == 1`; exact proof replay returns already-settled without repeating
either mutation. Every other count or proof conflict is transport unknown.

The built ordinary `ACK_INBOX_SCRIPT` retains positive-TTL tombstones only for
unguarded non-epoch participants. Its new guard check prevents an epoch-owned
participant from reaching that path.

### 5.4 ACK reconciliation

Proof inspection and orphan finalization both require:

- either an exact active runtime permit and exact `A`, or an exact installed
  recovery permit and exact `R`, matching the intent's authority kind;
- the current non-expired Redis epoch;
- the accepted source participant/delivery/message/consume identity; and
- the canonical guard/presence and bounded-envelope checks.

The corresponding SQLite reconciliation claim is epoch-fenced. A paused old
reconciler cannot list, claim, renew, finalize, defer, mark terminal, or commit
after generation fencing or controller-term succession. If Redis finalization
commits and the process dies before SQLite commit, the generation-scoped
non-expiring proof survives arbitrarily long and the same exact active
authority or a later exact controller commits the intent. Active and recovery
command kinds cannot substitute for one another; the explicit recovery branch
may confirm a predecessor's direct proof only by preserving that proof's exact
settlement `A` while committing under current `R`. A missing proof after the
source is absent is `TRANSPORT_STATE_UNKNOWN`, never claimed convergence.

## 6. Participant identity loss and inbox recovery

### 6.1 Persisted identity, not credentials

The epoch companion stores the active participant ID but never its lease
token. WIRING-B does not persist or restore participant credentials. A hard
process restart normally registers a new participant D2.

Every superseded participant ID is durably inserted into
`main.coordination_consumer_runtime_recovery_sources`. It is recovery identity
only and grants no service or queue authority. The current controller ID is
separate and is authoritative only as part of exact `R`.

If D2 crashes while recovering, D3 succeeds it through section 3.4. D2 becomes
another `open` source before D3 can receive a permit. Its new guarded
participant ID was required to have no pre-existing inbox/guard history, and
ordinary sends to it were rejected while it was recovering. Partial D2
receipt/ACK claims and D2-owned PEL entries therefore remain attached to the
original source inbox and are immediately reclaimable by D3's higher term;
the D2 source row also proves its own inbox stayed empty. Repeated crashes
append further sources without rewriting an earlier identity.

There are no participant-transfer intents or mappings. A partially committed
mapping and an already committed D1-to-D2 mapping are impossible states in
this protocol because migration `005` creates no transfer table and the Redis
facet exposes no rehome command/key. Discovery of any experimental transfer
table, mapping key, or transfer tombstone makes store/namespace admission fail
`STORE_SCHEMA_UNSUPPORTED`/`TRANSPORT_STATE_UNKNOWN`; it is never imported.
Partial consumer or ACK intents remain keyed by the original envelope identity
and are reclaimed by the higher controller term.

The drain and public-authority decisions are fixed against the current
production contract:

| Existing surface | Trial 4 treatment |
|---|---|
| `gateway/src/core/coordination_contract.js:75-102` participant-scoped inbox keys | Drain the exact source participant's existing stream; create no destination stream entry |
| `gateway/src/core/coordination_consumer.js:209-235` consume identity includes `toParticipantId` | Preserve the canonical envelope and therefore the exact `consumeKey` |
| `gateway/src/services/coordination_service.js:804-825` delivery recipient validation | Keep the guard unchanged; the private drain validates against the source participant, never D3 |
| `gateway/src/core/coordination_consumer.js:1003-1013` consumer context validation | Keep the guard unchanged; recovery consumer configuration uses the source participant as expected recipient |
| `gateway/src/core/coordination_queue.js:591-850` atomic send and both lease fences | Add both endpoint guard keys; require absent or exact active guard/epoch for sender and recipient before every dedupe/stream/event operation |
| `gateway/src/core/coordination_queue.js:438-588` registration/renewal/discovery/unregister lifecycle | Add caller/target guard consumption; any guarded inbox is `PERSIST`ed and never TTLed/deleted, including stale discovery and authenticated-unregister races |
| `gateway/src/services/coordination_service.js:1031-1353` participant pre-reads and lifecycle/send/receive/ACK composition | The sealed epoch dispatch does local validation/hash/draft work only, then reaches the operation-specific atomic command; ordinary dispatch retains existing pre-reads |
| `gateway/src/coordination_client.js:25-30,773-808` lease-loss/rejoin set | Preserve the four existing lease-loss codes; managed-operation/internal/target results do not cause rejoin |
| exported `gateway/src/core/coordination_queue.js` `ensureInboxGroup` | Replace raw group creation with guard-aware Lua; no guarded missing stream/group may be created or normalized to empty |
| `gateway/src/core/coordination_consumer_runtime.js` `consumerFault`, `reconciliationFault`, and `lifecycle.beforeRelease` | Reject caller input, install module-private fault no-ops, and route epoch release directly through durable section 3.6 |
| `gateway/src/core/state.js:11-38` and `gateway/src/core/coordination_consumer_runtime_test_profile.js:85-107` migration discovery | Replace unbounded root discovery with exact five-path generic/WIRING-A sets including both root `002` files; only the separately named epoch profile adds profile-directory `005` |
| `gateway/migrations/002_coordination_consumer.sql:8-206` receipt/delivery/replay identity | Add only nullable epoch-claim columns through migration `005`; do not rewrite metadata or keys |
| `gateway/migrations/003_coordination_ack_outbox.sql:3-209` ACK intents | Extend claim/settlement fencing through migration `005`; retain original `consume_key,delivery_id` primary identity |
| Existing replay path | Unreachable/unsupported for WIRING-B; no alias, recipient translation, or replay migration |

### 6.2 Bounded old-inbox inspection

The private recovery facet drains each `open` source inbox only after:

- Redis is at the new epoch;
- the source presence is absent and its non-expiring epoch guard is exact and
  fenced;
- the current controller participant is live and epoch-guarded in the same
  scope;
- SQLite is `recovering(..., installed)` at exact `R`; and
- the Redis epoch contains that exact `R` with an unexpired deadline.

Each entry is decoded under the existing canonical JSON work bounds. The scan
returns a bounded delivery batch to the private recovery consumer. The
envelope remains addressed to its source participant. The recovery consumer
sets `expectedRecipientId = source_participant_id`, so both service-equivalent
context validation and `coordinationConsumeKey` retain the shipped D1/D2
identity exactly. D3 is the controller, not a substitute envelope recipient.

Any corrupt stream, ambiguous duplicate key, unexpected group state, live old
presence, missing epoch/term, guard mismatch, or unbounded cursor becomes
`TRANSPORT_STATE_UNKNOWN`. The runtime remains `recovering` and does not start
normal receive.

### 6.3 Recovery dispositions

Every old delivery must reach exactly one disposition:

| Durable/transport state | Action |
|---|---|
| ACK intent exists | Reclaim it under exact current `R`; inspect/commit the non-expiring proof or epoch-finalize the original source delivery |
| Effect/quarantine is committed but no ACK intent exists | Epoch-fenced `prepareAck`, then reconcile the original source delivery |
| Processing receipt has no committed effect | Reclaim the lower-term receipt and re-run only the epoch-aware destination compare-and-commit; destination dedupe by unchanged `consumeKey` returns the same effect witness if needed |
| No receipt exists | Claim the original delivery under exact `R`, preserving its envelope and `consumeKey`, then process it |
| Completed receipt and source entry/proof agree | Confirm terminal state; never execute the effect again |
| Exact non-expiring proof exists but SQLite intent is not committed | Reclaim/prepare the intent and commit its exact proof |
| Receipt, entry, proof, guard, or source identity disagree | Mark the ACK/source `recovery_required` and stop |

The repository adds bounded enumeration for receipts whose observed delivery
is not ACKed. It does not infer completion from a body or Redis absence.

### 6.4 Exact PEL and unread drain branches

No command appends to another inbox. Each source is drained through two
separate nonblocking branches under the exact controller predicate.

**PEL branch.** The bounded Lua command uses `XAUTOCLAIM` with minimum idle
zero, a controller-specific consumer name, a canonical cursor, and
`1..profileMaxBatch` count. Its reply must be exactly
`[nextCursor, entries, deletedIds]`:

- `nextCursor` is canonical and advances or is `0-0`;
- `0 <= entries.length <= requestedCount`;
- `deletedIds.length === 0`; a deleted PEL reference is unknown state;
- every delivery ID is unique and each entry contains exactly one `envelope`
  field;
- every bounded canonical envelope names the source participant and scope; and
- an exact `XPENDING source group id id 1` check yields exactly one four-field
  row for that delivery, owned by the recovery consumer.

Any extra stream, entry, field, row, duplicate, non-advancing cursor, count
mismatch, or missing entry is terminal unknown state. A crash after
`XAUTOCLAIM` but before a receipt commit leaves the item in the PEL; a later
higher-term controller claims it again.

**Unread branch.** Only after a complete PEL pass returns terminal cursor with
zero entries does a separate bounded Lua command issue nonblocking
`XREADGROUP GROUP <group> <controller-consumer> COUNT n STREAMS <source> >`.
The reply is either nil/empty for zero or exactly one stream tuple for the
source with `1..n` unique entries. Each entry has exactly one canonical
`envelope` field addressed to the source. Before any delivery leaves the
command, exact `XPENDING` for that ID must return one four-field row owned by
the recovery consumer. The command never uses `BLOCK`.

Processing either branch uses the same original delivery ID and envelope.
Final settlement atomically requires either:

- no prior proof, exact PEL row count `1`, exact envelope identity,
  `XACK == 1`, `XDEL == 1`, and one non-expiring proof write; or
- one exact existing proof, in which case no `XACK`/`XDEL` is repeated.

`XACK == 0`, `XACK > 1`, `XDEL == 0`, `XDEL > 1`, proof conflict, or a stream
entry outside the PEL is `TRANSPORT_STATE_UNKNOWN`. The PEL and unread branches
have independent REDs and mutations; neither may fall through to the other
after a malformed reply.

After both branches return empty, a third atomic source-empty command checks
the exact `R`, fenced source guard, absent source presence, canonical group,
`XLEN == 0`, and exact empty `XPENDING` summary. Its opaque witness allows the
SQLite source row to change `open -> drained` under the same exact `R`. A lost
empty-witness reply is harmless because the command is read-only and can be
repeated.

### 6.5 Recovery completion

`recovering` changes to `active` only when one transaction verifies:

- every durable recovery source is `drained` by an exact empty witness;
- ACK reconciliation has no due/claimed/deferred unknown from the predecessor;
- every committed-effect delivery has an ACK disposition;
- no lower-term receipt/ACK claim remains;
- the current controller's own guarded inbox is empty; and
- no recovery-required receipt, ACK intent, or source remains.

Activation is an ordered two-authority transition, not an optimistic pair of
writes:

1. an exact-`R` read-only Redis command proves the controller inbox and group
   empty while `SEND_MESSAGE_SCRIPT` still rejects the recovering participant
   as either sender or recipient;
2. one SQLite transaction verifies that witness and every durable predicate
   above, changes `recovering/installed` to exact `A`, clears only controller
   identity/state, and returns an opaque activation witness;
3. the Redis activation command consumes that witness, requires the still
   exact `R` and empty inbox, and atomically changes the epoch and participant
   guard to exact `A`; and
4. only exact Redis readback plus exact SQLite `A` may mint the active runtime
   permit and expose the active participant as an authorized sender/recipient.

After step 2, the old recovery permit already fails SQLite while sends and all
transport effects still fail Redis; after step 3, newly sent messages are
ordinary active work but no runtime can receive them until step 4. If the step
3 reply is lost, the sealed owner adapter may reacquire only the same
activation witness from exact SQLite `A` plus exact Redis `R`/`A` readback.
If its lease expires instead, normal next-generation fencing is allowed; no
same-generation controller or runtime authority is reconstructed. The
transition creates no normal consumer, handler, replay, or ordinary managed
receive/ACK path before both authorities confirm.

## 7. Crash matrix

| Crash point | Durable result | Resume behavior |
|---|---|---|
| Before bootstrap reservation commit | no owner/companion or generation Redis state | retry fresh bootstrap; abandoned B1 has no credential/guard |
| After `initializing(1,t,Bn)` commit, before bootstrap Redis install | generation/term is durably reserved; Redis is absent/lower | exact Bn resumes or Bn+1 first commits term succession; never write unreserved generation 1 |
| Bootstrap Redis install committed, reply lost | Redis has exact reserved recovering tuple; SQLite remains `initializing`; no credential/permit exposed | exact readback then confirm, or reserve a higher term after deadline |
| After bootstrap Redis witness, before SQLite confirmation | transport controller exists without main authority | consume exact witness only; B2/B3 succession remains legal after expiry |
| After bootstrap SQLite confirmation, before permit exposure | both authorities agree, but no process has a permit | fresh exact readback mints one recovery permit |
| B1/B2 command resumes after B2/B3 SQLite succession | Redis may receive a historically reserved lower term; SQLite rejects it | newest reserved controller advances Redis; delayed lower term cannot overwrite it or gain a permit |
| Before `FENCING` commit | old epoch remains active until deadline | retry reserve after expiry |
| After `FENCING`, before Redis generation install | all main effects blocked; source row is open; Redis may still name old epoch | resume exact pending generation; no normal/recovery work |
| Redis install committed, reply lost | old transport fenced | confirm exact Redis epoch and continue |
| After Redis generation install, before SQLite controller reservation | old main/transport effects blocked; no controller exists | reserve the next durable term for one guarded participant |
| After SQLite reserves `(g,t,D2,installing)`, before Redis term install | lower terms fail SQLite; Redis may still accept the old term | after deadline D3 advances to `t+1`; delayed term installs can only move upward |
| Redis term install committed, reply lost | exact new controller is transport-current but has no permit | confirm exact tuple, mark `installed`, then mint permit |
| After `installed`, before any source scan | normal work blocked | D3 succession advances term; D2 becomes an open source |
| After PEL claim, before receipt claim | delivery remains PEL under old recovery consumer | higher-term controller `XAUTOCLAIM`s it and preserves identity |
| After unread `XREADGROUP`, before receipt claim | delivery moved to PEL, no receipt required | higher-term controller takes the PEL branch; it is not read as unread again |
| After effect destination commit, before receipt commit | destination has unchanged `consumeKey`; SQLite has no effect commit | retry compare-and-commit returns exact witness, then current-term receipt commit |
| After epoch `XACK`/`XDEL`, before ACK commit | non-expiring generation-scoped proof survives | current controller confirms proof and commits intent at any later time |
| After source-empty Redis witness, before SQLite `drained` | source remains open but Redis is empty | repeat read-only witness and commit `drained` under current term |
| D2 crashes after partial ACK intents | intents/claims remain in original identity; D2 becomes source | D3 immediately reclaims lower-term claims and drains D1 plus D2 |
| D2 crashes after a fully committed settlement | SQLite terminal state and non-expiring proof agree | D3 confirms terminal state; no mapping or duplicate effect |
| After controller-inbox empty witness, before SQLite activation | Redis still rejects sends and runtime transport | repeat the stable witness and exact durable checks |
| After SQLite commits exact `A`, before Redis activation | recovery permit fails main; active permit is withheld; Redis rejects sends/transport | resume only the exact activation command/readback, or fence the next generation after lease expiry |
| Redis activation committed, reply lost | both authorities contain exact `A`; runtime permit is withheld | exact readback reacquires the same witness and mints one permit |
| After both activation confirmations, before consumer start | active epoch may accept queued work but has no consumer | start if lease and exact `A` remain current, otherwise fence next generation |
| Public SEND finishes local DTO/hash/draft work, then sender/recipient state changes before Lua | no authority decision or send mutation has occurred | the single SEND Lua classifies current sender first and recipient second; there is no service presence/recipient preflight to bypass it |
| Sender and recipient are both closed/corrupt when public SEND reaches Lua | no send mutation has occurred | mandatory sender-first classification returns the sender result and does not read/mutate dedupe, inbox, or event state |
| Public heartbeat/discover/unregister/receive/ACK crosses epoch installation after local validation | no service-side presence decision has occurred | the operation script authenticates/classifies current guard/epoch state; lower/equal closed maps managed-operation, higher/incomparable maps internal, and no guarded TTL/delete/ACK/read mutation follows |
| Public SEND commits immediately before release fence | message/dedupe/event precede the fence | post-fence `XLEN`/PEL witness sees work and SQLite opens Dn as a source |
| Release fence commits immediately before public SEND | guard/epoch are `releasing` | SEND rejects before dedupe renewal/append/event |
| Discovery holds a stale `SSCAN` page or unregister finishes local validation before fencing | no cleanup script has yet committed | if lifecycle Lua wins, later fence `PERSIST`s; if fence wins, lifecycle Lua authenticates/classifies the guard and cannot TTL/delete |
| Ordinary `ensureInboxGroup` commits, reply is lost or caller crashes before epoch guard installation | ordinary stream/group may exist; no guard was created by ensure | replay is ordinary-idempotent; later installation validates it and `PERSIST`s before installing the guard |
| Epoch guard installation commits before `ensureInboxGroup` on a missing inbox/group, or guarded ensure reply is lost | permanent guard exists; transport remains missing | every replay returns `epoch_owned`/unknown without `MKSTREAM`/`XGROUP`; recovery/release reports transport unknown |
| During active handler | destination commit checks epoch atomically | stale commit rejects or exact idempotent result survives |
| During lease renewal | Redis may have a later deadline than SQLite | old runtime stops; higher generation may fence immediately |
| Before `releasing` commit | runtime remains active or its stop flight fails closed | retry orderly stop or allow later takeover after active lease expiry |
| After `releasing` commit, before Redis release fence | main effects blocked; transport may still name active | exact release transition advances Redis; no main commit can follow old work |
| Redis release fence committed, reply lost | main and transport effects closed; inbox is persistent | exact readback, then run the post-fence source witness |
| After Redis release fence, before/after source witness | send/drain admission is closed and source state is stable | repeat exact `XLEN` plus `XPENDING` witness; never infer empty from absence |
| After empty witness, before SQLite release commit | no authority has reopened the stable empty source | repeat witness and all durable predicates; commit released only if all remain exact |
| After nonempty witness, before/after open-source SQLite commit | Dn is either not yet or durably an `open` source | repeat until `releasing -> fencing(g+1)` and source insert commit atomically |
| After open-source reservation, before Redis generation install | Dn is durable and pending `g+1`; Redis stays closed `releasing(g)` | resume only standard fencing/recovery; never return `released` |
| Unknown release witness/result | no empty witness exists | mark Dn recovery-required/faulted; no release or source deletion |
| After SQLite `released` + completion `redis_pending`, before Redis completion command | main is released, Redis is closed `releasing`, and the unique completion tuple is durable | admission constructs only the sealed completion adapter for that row and resumes the idempotent command; no restart/recovery/runtime authority |
| Redis release completion commits and its reply is lost | Redis is exact `released(completion_id)`; SQLite completion remains `redis_pending` | exact command/readback returns the same `RedisReleaseCompletedWitness`, then the SQLite CAS confirms it |
| After Redis completion witness, before SQLite `confirmed` | both stores name the exact completion but restart remains closed | admission repeats readback and commits only `redis_pending -> confirmed` |
| SQLite confirmation commits and its reply is lost | completion is exact `confirmed` with fixed `confirmed_at` | exact row plus Redis readback returns the same successful release without rewriting it |
| Completion is `confirmed`, before restart reservation | both stores agree on released identity | restart may reserve exactly `g+1`; no actor may reuse `g` |
| Restart from `released(g)` crashes in `fencing` | one pending `g+1`, no work | resume exact monotonic install; never bootstrap or reuse `g` |
| Test supervisor terminates at a consumer/reconciler/release boundary | only externally visible SQLite/Redis witnesses precede termination | restart derives authority from durable state; no fault or lifecycle callback is invoked or credited |

The required two-controller schedule is explicit: R1 pauses at every SQLite
and Redis recovery boundary; R2 advances `recovery_term` and exact controller
identity; R1 resumes each retained repository, vault, ACK, proof-inspection,
finalization, source-drain, completion, and renewal call. R1 must fail at the
corresponding SQLite or Redis predicate and change no state. No row in this
table authorizes a lower generation/term, a recipient rewrite, or a
check-before/check-after business effect.

## 8. Failure model

| Condition | Closed disposition |
|---|---|
| Active unexpired epoch | `EPOCH_OWNED` |
| Generation-1 Redis install without exact durable `initializing` reservation | `BOOTSTRAP_RESERVATION_REQUIRED`; no Redis write |
| Exact `initializing` row with absent/lower Redis tuple | resume exact bootstrap or reserve successor term after deadline; expose no credential/permit |
| Main generation/phase mismatch | `EPOCH_STALE` |
| Lease expired | `EPOCH_EXPIRED`; no effect |
| Pending fence exists | resume it; never allocate another generation |
| Recovery controller is `installing` | `RECOVERY_CONTROLLER_NOT_INSTALLED`; no recovery operation |
| Recovery generation/term/controller mismatch | `RECOVERY_CONTROLLER_STALE`; no read-for-decision result or mutation |
| SQLite is active while Redis still has the matching recovering tuple | `EPOCH_ACTIVATION_INCOMPLETE`; resume exact activation or later fence |
| Recovery term exhausted | permanent `RECOVERY_TERM_EXHAUSTED` |
| Redis has greater generation | `RECOVERY_REQUIRED` |
| Redis has greater controller term | `RECOVERY_REQUIRED` |
| Redis epoch missing after history exists | `RECOVERY_REQUIRED` |
| Redis authority/namespace/binding mismatch or corrupt record | `RECOVERY_REQUIRED` |
| Fresh allocation collides with an existing ordinal/key | `BINDING_COLLISION`; store remains uninitialized |
| Redis plane/capability differs from immutable SQLite binding | `REDIS_AUTHORITY_MISMATCH`; no Redis command |
| Copied SQLite store is presented by a foreign origin capability | `STORE_ORIGIN_MISMATCH`; no store/Redis command |
| Copied plane presents matching bytes without the issued origin capability | `REDIS_AUTHORITY_MISMATCH`; a perfectly cloned origin is excluded by the explicit non-cloning premise |
| Old participant still live | bounded defer while recovery lease remains |
| Guard-absent caller presence is absent, or supplied digest mismatches canonical ordinary presence/permanent guard digest | `COORDINATION_AUTH_FAILED`; existing managed client begins rejoin |
| Ordinary public caller lease expired | `COORDINATION_LEASE_EXPIRED`; existing managed client begins rejoin |
| Ordinary endpoint presence is malformed/wrong-type, or exact-active guarded presence is missing/mismatched | `COORDINATION_INTERNAL_ERROR`; no mutation or lease rejoin |
| Legacy ordinary-profile fence mismatch | `COORDINATION_LEASE_CHANGED`; existing managed client begins rejoin; the epoch facet has no preflight fence and does not emit this result |
| Epoch participant uses ordinary receive or ACK at a lower or canonical equal coordinate in any phase | `COORDINATION_EPOCH_MANAGED_OPERATION_REQUIRED` inside the existing script; no read/ACK and no client rejoin |
| Guarded sender is lower, or equal but not exact active/unexpired | internal `epoch_sender_not_active`, mapped to `COORDINATION_EPOCH_MANAGED_OPERATION_REQUIRED`; no dedupe/append/event and no client rejoin |
| Send targets a guarded lower or equal non-active/expired participant | internal `epoch_recipient_not_active`, mapped to existing `COORDINATION_TARGET_NOT_FOUND`; no dedupe/append/event or client rejoin |
| Any endpoint guard is higher than its epoch, incomparable, malformed, wrong-type, missing its epoch, or contradictory | internal `transport_state_unknown`, mapped to fixed `COORDINATION_INTERNAL_ERROR`; no mutation or lease rejoin |
| Guarded identity uses public register/heartbeat/unregister or lower/equal non-active discover | `COORDINATION_EPOCH_MANAGED_OPERATION_REQUIRED`; inbox is `PERSIST`ed and no presence/registry/TTL/event mutation occurs |
| Discovery/unregister sees a fenced target | omit/closed result after `PERSIST`; never `PEXPIRE`, delete, or return a non-active target |
| Epoch participant guard is malformed or wrong-type | `TRANSPORT_STATE_UNKNOWN`; guarded inbox receives no destructive lifecycle mutation |
| Exported `ensureInboxGroup` sees any canonical guard | low-level `epoch_owned`; no `XGROUP`, `MKSTREAM`, stream, TTL, or delete mutation |
| Exported `ensureInboxGroup` sees guarded missing/wrong-type/ambiguous transport | `TRANSPORT_STATE_UNKNOWN`; never create a replacement stream/group or infer empty |
| Post-fence release source has positive `XLEN` or PEL count, or durable unsettled work | `RELEASE_RECOVERY_RESERVED`; atomically insert source `open` and enter pending next-generation `fencing` |
| Post-fence release source/durable predicate is ambiguous | source `recovery_required` plus `faulted`; never `released` |
| SQLite is `released` with exact completion `redis_pending` | only the sealed completion adapter may idempotently complete/read back Redis and confirm SQLite; all restart/recovery/runtime paths reject |
| Release completion is `confirmed` but Redis does not name the same `completion_id` | `RELEASE_COORDINATE_MISMATCH`/`recovery_required`; restart rejects |
| SQLite is `released` without its exact permanent completion row | `STORE_SCHEMA_UNSUPPORTED`; no Redis or restart command |
| Old inbox, PEL/unread branch, proof, or recovery-source state ambiguous | `TRANSPORT_STATE_UNKNOWN` |
| Experimental transfer table/key/tombstone exists | `STORE_SCHEMA_UNSUPPORTED` or `TRANSPORT_STATE_UNKNOWN`; never import/rehome |
| Positive-TTL ordinary ACK tombstone is the only evidence | insufficient for WIRING-B; inspect source or enter `TRANSPORT_STATE_UNKNOWN` |
| Generic handler or separate unfenced vault | `EFFECT_PROFILE_UNSUPPORTED` |
| Caller-supplied retry classifier | `EFFECT_PROFILE_UNSUPPORTED` |
| Replay or `authorizeReplay` requested | `EFFECT_PROFILE_UNSUPPORTED` before callback/repository work |
| Caller supplies `consumerFault`, `reconciliationFault`, `lifecycle.beforeRelease`, an accessor, or another non-allowlisted epoch-profile property | `EFFECT_PROFILE_UNSUPPORTED` before migration/store/Redis/provision work |
| Generic application or WIRING-A loader observes/applied profile `005`, either loader lacks either exact root `002`, or any selected profile observes an applied id/path/digest outside its literal set | `MIGRATION_PROFILE_MISMATCH`; close database/profile before owner or Redis work |
| Generation exhausted | permanent `STORE_EXHAUSTED` |
| Active/released snapshot rollback | lower Redis generation rejects; missing Redis anchor requires offline maintenance |
| Unknown commit result | `faulted` or `recovery_required`; no start |

Exact external error strings remain closed and body/token free. Health and
inventory projection are not added in this slice.

## 9. Implementation decomposition

Implementation requires separately reviewable sub-slices. No later slice may
weaken an earlier accepted fence.

### EPOCH-CORE

- literal five-path generic/WIRING-A and six-path epoch migration sets,
  including both distinct root `002` files, profile-directory `005`, exact
  digest/schema/profile admission, and proof that generic/WIRING-A never
  enumerate or apply it;
- origin-owned Redis authority/namespace allocation, immutable SQLite binding,
  forced-collision rejection, and opaque capabilities;
- legal bootstrap `initializing` reservation and B1/B2/B3 term succession;
- reserve/install/activate/controller-succeed/renew/releasing/
  release-to-recovery/released/restart state machine;
- permanent release-completion ledger, sealed completion-adapter
  reacquisition, lost-reply readback, and confirmed-only restart admission;
- generation, recovery-term, and binding-ordinal exhaustion plus
  snapshot/plane rollback rejection; and
- per-transition committed witnesses and mutation matrix.

### EPOCH-STORE

- epoch-bound consumer, ACK, recovery-source, observation, and vault facets;
- same-main requirement for the first profile;
- deterministic epoch-aware business-effect port;
- fixed pure retry registry and fixed unsupported replay boundary;
- operation-at-commit race tests; and
- proof that the generic handler remains unsupported.

### EPOCH-TRANSPORT

- private Redis epoch issuer/facet;
- epoch install/confirm/renew/fence scripts;
- nonblocking fenced receive/reclaim;
- controller-term install/confirm/renew and exact predecessor fencing;
- epoch-fenced direct ACK, proof inspection, orphan finalization, and
  non-expiring settlement proofs;
- non-expiring participant guards plus existing ordinary receive/reclaim/
  fence/ACK script rejection;
- exact sender and recipient guard/epoch admission in the existing send
  script, sender first and before every dedupe/stream/event mutation;
- sealed public-authority facet inputs/results, canonical envelope
  construction in the SEND script, and ordinary/lower/equal/higher endpoint
  classification;
- guard-aware register/renew/list/delete scripts, predecessor `PERSIST`, and
  the exact post-release-fence `XLEN`/PEL witness;
- guard-aware exported `ensureInboxGroup` with the distinct
  `GROUP-GUARD` mutation owner and no guarded `MKSTREAM`/group creation; and
- ordinary-queue/public-service/managed-client reachability and bypass tests.

### EPOCH-IDENTITY

- durable recovery-source and unacked-receipt enumeration;
- separate exact PEL and unread drain commands;
- drain-in-place recovery with no transfer schema, mapping, recipient rewrite,
  or rehome command;
- D1-to-D2 and D2-to-D3 controller succession/convergence;
- atomic release-source `open` insertion, exact Dn drain, and refusal to
  release an unread/PEL/durably unsettled source; and
- corrupt/unknown-state terminal cases.

### EPOCH-WIRING

- runtime renewal and supervision;
- bootstrap and recovery-controller succession, crash/restart, released
  restart, and orderly release/rejoin composition;
- epoch-only profile composition, explicit migration-set selection, public
  authority dispatch/status/rejoin mapping, and private lifecycle use;
- exact constructor rejection of caller fault/lifecycle callbacks,
  module-private consumer/reconciliation no-ops, callback-free durable release,
  and external child-process crash barriers;
- stale discovery page, authenticated-unregister, concurrent-send, release
  fence, and B1/B2/B3 child-process schedules;
- isolated Redis + real SQLite process tests;
- rollout/runbook updates; and
- the full G/0/02 crash/reclaim exit gate.

Each sub-slice uses RED, GREEN, an immutable handoff, and a fresh independent
review result. A design OK does not approve any implementation candidate.

## 10. Required tests and mutation owners

Trial 4 has this executable correction ledger. Each row has a distinct
mutation owner; a test or mutant credited to one row cannot close another:

| Finding | Directed RED and decisive assertion | Independent mutation owner |
|---|---|---|
| P1-01 public authority | `epoch_public_send_reaches_lua_after_guarded_presence_removal_sender_first` removes both presences, retains a lower guarded sender and corrupt recipient, spies that `getParticipant` is never called, and requires managed-operation plus unchanged dedupe TTL/value/inbox/event; `epoch_public_authority_coordinate_and_rejoin_matrix` covers ordinary auth/expiry, proves the epoch facet does not emit legacy changed/not-found lease results, and covers guarded lower/equal/higher for SEND, heartbeat, discover, unregister, receive, and ACK with the exact section 5.1 maps | `EPOCH-WIRING/PUBLIC-AUTHORITY-DISPATCH`; mutant restores any service participant/recipient preflight or maps managed-operation as lease loss |
| P1-02 release completion | `epoch_release_resumes_sqlite_released_before_redis_completion` kills the child after the `redis_pending` SQLite commit, reopens the profile, proves only the identical completion command runs, loses its Redis reply, confirms by exact readback, and proves restart rejects before/accepts after `confirmed` | `EPOCH-CORE/RELEASE-COMPLETION`; mutant removes the row/adapter check, changes its identity, or admits restart while pending |
| P1-03 group creation | `epoch_ensure_inbox_group_never_creates_behind_guard` runs ensure/install in both orders with a missing and existing inbox, requires no `XGROUP`/`MKSTREAM` after guard and unknown release/recovery for missing transport | `EPOCH-TRANSPORT/GROUP-GUARD`; mutant skips the guard key/check or restores raw `MKSTREAM` |
| P1-04 migration set | `epoch_migration_sets_are_literal_and_include_both_root_002_paths` checks exact ids, paths, root digests, order, fresh/existing/reopened stores, profile `005` isolation, and injected outside-set rows without basename/numeric collapsing | `EPOCH-CORE/MIGRATION-PATH-SET`; mutant drops either `002`, scans a directory, groups by `002`, or admits an outside-set id |
| P2-01 callbacks | the three section 4.5 REDs prove rejection before first migration/store/Redis call and child-process crash barriers; each test records zero callback/getter invocations | `EPOCH-WIRING/CB-CONSUMER`, `EPOCH-WIRING/CB-RECONCILIATION`, and `EPOCH-WIRING/CB-BEFORE-RELEASE`; the three mutants independently restore the named seam |
| P2-02 lineage | handoff check `trial4_request_authenticates_actual_trial2_objects` uses `git cat-file -e <sha>^{commit}` and exact equality for request `27c49bc357bdfb9cbb3e12c980b38ca1338cb896` and candidate `629480e3410fb7e593cdb4c3934caf329bf8e97b`, while verifying the immutable Trial 3 request blob is unchanged | `TRIAL4-HANDOFF/TRIAL2-LINEAGE`; mutant substitutes either erroneous Trial 3 value or edits the prior request |
| P2-03 process variance | handoff check `trial4_request_discloses_operator_tmux_variance_without_gateway_claim` requires the exact operator-authorized direct supervised tmux disclosure and explicit absence of profile-compliance, Gateway-trace, KYA-success, or Claude-review evidence claims | `TRIAL4-HANDOFF/PROCESS-VARIANCE`; mutant claims profile compliance or fabricated Gateway/Claude evidence |

The RED set must include:

- bootstrap rejects every generation-1 Redis command before the exact
  `initializing` owner/companion commit and exposes no credential/permit before
  exact Redis install plus SQLite confirmation;
- B1/B2/B3 lost-reply/crash succession before and after reservation, absent-key
  install, guard/presence creation, Redis readback, SQLite confirmation, permit
  mint, source-empty proof, and activation, with delayed lower-term commands in
  both orders;
- illegal bootstrap schema shapes (`generation != 1`, owner absent/released,
  controller mismatch, non-installing state, missing deadline) and a Redis
  generation-1 record with no durable reservation;
- fresh/existing/reopened generic application state and WIRING-A stores
  proving their exact ordered five-path set includes both distinct root `002`
  files and neither enumerates nor applies `005`, plus the epoch profile
  proving only its fresh empty origin applies those five exact paths followed
  by its profile-directory `005`; injected unknown/duplicate/path-traversal
  entries, basename/numeric collisions, digest changes, and cross-profile
  `005` rows reject;
- a paused old repository transaction committing after replacement;
- a paused handler whose destination commit occurs after replacement;
- a retained direct-ACK claim, reconciler claim, vault write, source-empty
  witness, and recovery permit;
- the full R1/R2 schedule: pause R1 before and after every SQLite/Redis
  recovery operation, advance exact `(term, controller)` to R2, resume R1, and
  assert zero old-term mutations;
- R2 pausing during controller `installing`, R3 advancing another term, and
  delayed Redis term commands arriving in both orders;
- blocking-receive mutation proving why WIRING-B polls nonblocking;
- crash before/after every state-machine row in section 7;
- crash at every activation step, including SQLite `A` with Redis still
  recovering and a lost Redis activation reply;
- lost Redis generation-install, controller-install, non-expiring ACK-proof,
  and empty-source replies;
- two processes resuming one pending generation;
- D1 lease loss and D2 rejoin with held D1 work;
- D2 crash and D3 succession before scan, after PEL claim, after unread claim,
  after receipt claim, after destination commit, after `prepareAck`, after
  Redis settlement, after SQLite ACK commit, and after source-empty proof;
- D2 partial receipt/ACK claims reclaimed immediately by D3's higher term and
  a fully committed D2 settlement confirmed without duplication;
- explicit absence of transfer schema, transfer keys, mapping commits, rehome
  commands, recipient rewrites, or dedupe aliases;
- a D1 envelope in D1's inbox drained with unchanged `toParticipantId`,
  unchanged `consumeKey`, and service/consumer context guards still enabled;
- a delayed D1 heartbeat after Redis installs D2's generation;
- an old process which re-registers a third public participant but retains
  only the stale WIRING permit;
- old inbox entries before repository claim, after effect, and after ACK intent;
- separate unread and PEL fixtures, including exact zero/one/many counts,
  malformed reply shapes, deleted PEL IDs, wrong owner, `XACK` 0/1/>1,
  `XDEL` 0/1/>1, and crash from unread into PEL before receipt;
- a lost ACK reply followed by a pause longer than the ordinary 24-hour
  tombstone TTL, proving the epoch proof still exists and converges;
- attempted TTL/expiry/deletion of an epoch proof, plus conflicting proof
  content, and proof GC attempted before durable SQLite confirmation;
- live/expired/corrupt old presence;
- ordinary managed-client receive and ACK against the same epoch participant
  in `fencing`, `recovering`, `active`, `releasing`, and `released`, including
  the blocking receive path; every script must reject before mutation;
- public SEND sender REDs for `fencing`, recovering/installing,
  recovering/installed, `releasing`, `released`, expired active, lower/higher
  generation, lower/higher term, guard/epoch mismatch, and a call delayed
  across activation/release; each asserts unchanged dedupe value/TTL, inbox,
  event stream, and audit projection;
- an epoch-service spy which throws if `getParticipant`,
  `readParticipant`, `authenticateParticipant`, or recipient lookup is reached
  by SEND/heartbeat/discover/unregister/receive/ACK, while each valid DTO
  reaches its atomic classifier and returns the exact ordinary/lower/equal/
  higher mapping and client rejoin disposition;
- the Cartesian endpoint matrix: ordinary/exact-active/non-active/corrupt
  sender by ordinary/exact-active/non-active/corrupt recipient, including the
  deterministic sender-first result and exact public error/client-rejoin
  mapping;
- register, renew, delete, and list target/caller guard REDs, including a stale
  `SSCAN` page and an authenticated unregister paused across epoch install;
  every guarded branch asserts `PTTL == -1`, no inbox delete, no forbidden
  presence/event mutation, and repeat convergence;
- exported `ensureInboxGroup` before/after guard installation, with existing
  and missing stream/group, asserting no post-guard `XGROUP`, `MKSTREAM`,
  expiry, delete, or false-empty release result;
- release with a pre-existing unread entry, a PEL entry, durable unsettled work,
  and a sender on either side of the Redis fence; each nonempty case atomically
  opens Dn and reserves `g+1`, then drains Dn before activation;
- release lost replies/crashes before and after main `releasing`, Redis fence,
  empty/nonempty witness, open-source transaction, SQLite `released`, and Redis
  `released`, including malformed/missing group/stream states which can never
  reach `released`;
- SQLite `released + redis_pending` process death, Redis completion reply loss,
  re-opened adapter reacquisition, concurrent identical resumers, final
  SQLite confirmation loss, contradictory completion identity, and
  confirmed-only restart eligibility;
- malformed, wide, deep, duplicate-key, and wrong-type Redis records;
- active and released SQLite snapshot rollback with the Redis anchor retained;
- missing Redis anchor after prior epoch history;
- allocation reply loss, bind reply loss, forced repeated ordinal, counter
  rollback, existing exact-looking binding collision, wrong authority,
  changed namespace/plane, copied SQLite or Redis state without its original
  origin capability, and same scope in a genuinely disjoint plane/store;
- deliberately duplicated live SQLite and Redis origins documented as outside
  the theorem, with profile admission still rejecting foreign origin
  capabilities where the copies remain distinguishable;
- legal `active -> releasing -> released` storage, crash at every release
  boundary, and monotonic `released(g) -> active(g+1)` restart;
- generation, recovery-term, and allocation-ordinal exhaustion;
- supplied/effectful `retryClassifier` rejection and deterministic pure
  registry mapping under repeated inputs;
- replay/`authorizeReplay` rejection before callback and repository work;
- caller-supplied `consumerFault`, `reconciliationFault`, and
  `lifecycle.beforeRelease`/accessor rejection before admission, independent
  restoration mutants, and child-process crash schedules that invoke none;
- generic handler, separate unfenced vault, forged capability, public queue,
  service, tool, and MCP reachability; and
- exact active-to-release and active-to-takeover races.

The GREEN for each sub-slice is the smallest implementation that makes its
directed REDs pass without enabling a production profile:

- `EPOCH-CORE` admits the profile-specific schema/set, commits legal
  `initializing` before bootstrap Redis, advances B1/B2/B3 durably, and
  represents both empty release and release-to-recovery branches, including
  permanent completion identity and confirmed-only restart;
- `EPOCH-TRANSPORT` performs both SEND endpoint checks and every lifecycle/
  release-source decision atomically in bounded Lua with mandatory `PERSIST`,
  and refuses guarded exported group creation;
- `EPOCH-STORE` rechecks exact epoch/controller predicates in every authoritative
  transaction and supplies the durable release close predicates;
- `EPOCH-IDENTITY` drains each bootstrap/release/superseded source in place and
  commits `open -> drained` only from the exact empty witness; and
- `EPOCH-WIRING` selects the epoch migration set internally, withholds
  credentials/permits, removes epoch service preflights, maps closed public
  statuses/rejoin behavior, rejects the actual callback seams, and passes the
  real SQLite/disposable-Redis child-process crash schedules.

Every semantic guard has one independently killable mutation. At minimum the
matrix owns:

- main phase/generation/deadline predicate;
- main recovery-term/controller/install-state predicate on every repository,
  vault, ACK, source, summary, and completion family;
- Redis generation/term/controller/deadline predicate on every drain, proof,
  ACK, finalization, and renewal command;
- permit binding to exact generation/term/controller or active participant;
- legal bootstrap `initializing` shape and owner-row atomicity;
- bootstrap reservation commit before every generation-1 Redis write;
- no bootstrap credential/permit before exact two-authority confirmation;
- B1/B2/B3 term succession and delayed lower-term install rejection;
- controller term strictly increments and controller identity changes;
- superseded controller becomes a recovery source in the same SQLite CAS;
- `FENCING` before Redis install;
- Redis generation install before `recovering`;
- Redis controller install before recovery permit;
- recovery completion before `active`;
- controller-inbox stability, SQLite-before-Redis activation ordering, and
  withholding the active permit until exact `A` agrees;
- representable `releasing` shape and released-to-next-generation restart;
- Redis release/SEND fence before source witness;
- exact post-fence `XLEN == 0` and empty-PEL conjunction;
- permanent exact release-completion row in the SQLite released transaction,
  sealed-adapter reacquisition, idempotent Redis completion/readback,
  pending-to-confirmed CAS, and confirmed-only restart;
- atomic nonempty release source insertion plus `g+1` reservation;
- refusal to release on unknown source/durable state;
- no blocking `XREADGROUP`;
- destination-side effect compare-and-commit;
- all repository/ACK/vault operation families;
- direct-ACK and reconciliation claim-family separation;
- old-presence absence;
- exact predecessor-presence fencing without inbox deletion;
- drain-in-place recipient/consume identity equality and no transfer/rehome
  surface;
- PEL/unread branch separation and every exact reply/count check;
- non-expiring generation-scoped settlement proof identity;
- no proof GC before durable SQLite confirmation;
- ordinary receive/reclaim/fence/ACK scripts reject every epoch guard phase;
- ordinary send validates both guarded endpoints against exact active Redis
  coordinates before lookup/renewal of dedupe or any append/event;
- sender/recipient closed result and service/client mapping;
- epoch service SEND/heartbeat/discover/unregister/receive/ACK performs no
  participant/recipient authority preflight and always reaches its atomic
  classifier after local validation;
- register/renew/list/delete guard consumption, stale-page/unregister ordering,
  and `PERSIST` before any guarded cleanup result;
- exported group creation checks the participant guard atomically and cannot
  `MKSTREAM`/create a group for any guarded identity;
- bounded scan/work limits;
- no epoch anchor, participant guard, allocation record, or proof deletion/TTL;
- missing-anchor rejection;
- lower-generation and lower-controller-term rejection;
- injective server-side binding allocation and collision rejection;
- immutable exact Redis authority/namespace capability binding;
- changed/copied plane rejection plus explicit non-cloning premise;
- stable WIRING-A lineage/store binding;
- exact five-path generic/WIRING-A and six-path epoch migration sets,
  including both distinct root `002` paths/digests, profile-directory
  isolation, and rejection of cross-profile/outside-set applied migrations;
- fixed pure retry registry;
- replay/authorization unsupported before any callback;
- caller `consumerFault`, `reconciliationFault`, and
  `lifecycle.beforeRelease` rejection plus three module/control-flow
  restoration mutants;
- no generic handler/profile;
- no public recovery-facet reachability; and
- exact-generation releasing/released/exhaustion.

Mutation ownership is exact:

| Sub-slice owner | Guard families and first directed witness |
|---|---|
| `EPOCH-CORE` | migration-set/profile isolation, bootstrap schema/reservation ordering, B1/B2/B3 term CAS, generation/term monotonicity, controller permit, allocation/plane binding, release/recovery/restart, exhaustion; first witnesses are direct migration and SQLite state transitions before any Redis call |
| `EPOCH-STORE` | every repository/ACK/vault/source predicate, lower-term claim takeover, destination witness, pure retry registry, replay rejection; first witnesses are authoritative store/effect operations |
| `EPOCH-TRANSPORT` | generation/term/controller predicates, dual SEND endpoint guards/order/status, ordinary receive/ACK guards, lifecycle guard/PERSIST rules, release source witness, nonblocking receive, non-expiring proofs, exact settlement counts, no TTL/delete; first witnesses are real/fake Redis command outcomes |
| `EPOCH-IDENTITY` | bootstrap/release/superseded source insertion, D2-to-D3 succession state, unchanged recipient/consume identity, PEL/unread split, exact source-empty proof, no transfer surface; first witnesses are drain operations and original inbox state |
| `EPOCH-WIRING` | process-level B1/B2/B3 and R1/R2/R3 schedules, public status mapping, stale discovery/unregister/concurrent-send release races, lost replies, crash matrix, rollout/rollback; first witnesses are real child-process behavior, never status projection |

Mutation evidence records syntax, selected test count, first operational
failure, and zero survivors. A private status projection is not an adequate
first witness.

## 11. Path scope

Expected implementation paths are limited to:

- profile-only migration
  `gateway/migrations/profiles/sqlite-redis-disposable-epoch-test-v1/005_coordination_consumer_runtime_epoch.sql`;
- new fixed-set owner `gateway/src/core/sqlite_migration_sets.js` and surgical
  loader changes in `gateway/src/core/state.js` and
  `gateway/src/core/coordination_consumer_runtime_test_profile.js`;
- separately named
  `gateway/src/core/coordination_consumer_runtime_epoch_test_profile.js`;
- new epoch owner/recovery modules under `gateway/src/core/`;
- surgical extensions to
  `gateway/src/core/coordination_consumer_runtime.js`,
  `gateway/src/core/coordination_consumer_runtime_provision.js`,
  `gateway/src/core/coordination_consumer_lineage.js`,
  `gateway/src/core/coordination_consumer.js`,
  `gateway/src/core/coordination_ack_reconciler.js`,
  `gateway/src/core/coordination_queue.js`,
  `gateway/src/services/coordination_service.js`, and
  `gateway/src/coordination_client.js`;
- `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js`,
  `gateway/src/core/sqlite_coordination_repository_binding.js`,
  `gateway/src/core/sqlite_quarantine_store.js`;
- focused gateway tests, including
  `tests/gateway/coordination_queue_contract.test.js`, whose raw-command
  assertion changes to the guard-aware Lua invocation while its exact
  `{status:"created"}` and `{status:"exists"}` assertions remain,
  `tests/gateway/coordination_consumer_epoch_migrations.test.js`,
  `tests/gateway/coordination_consumer_epoch_public_guards.test.js`,
  `tests/gateway/coordination_consumer_epoch_group_guard.test.js`,
  `tests/gateway/coordination_consumer_epoch_callbacks.test.js`,
  `tests/gateway/coordination_consumer_epoch_release.test.js`, existing
  application state/WIRING-A/lifecycle/send tests, and isolated mutation
  drivers;
- `ci/suites.json`, strictly for the governed inventory-only digest refresh
  required after the new matched source/test file set is final; no suite field
  other than `inventorySha256` changes;
- `docs/coordination-bus.md`, this sheet, `DEFERRED.md`, and the immutable
  review trail.

`ci/suites-contract.json` remains unchanged because suite IDs, topology,
commands, patterns, skip allowances, and timeouts do not change.

No policy file, public MCP schema, raw Redis lane, production database path,
PostgreSQL adapter, health/inventory surface, shared Redis configuration, or
unrelated consumer behavior is in scope. In particular,
`gateway/migrations/005_coordination_consumer_runtime_epoch.sql` at the shared
root is forbidden: its presence is a scope and migration-profile failure.

## 12. Rollout and rollback

Part B is opt-in through a distinct reviewed profile. It does not reinterpret
an existing WIRING-A store.

Rollout requires:

1. all sub-slices independently OK and integrated;
2. the literal five-path generic and WIRING-A migration-set tests proving both
   distinct root `002` files present and `005` absent on
   existing/fresh/reopened stores, and the six-path epoch-set test proving
   `005` exists only in its profile directory and only the epoch profile
   applies it;
3. an origin-owning epoch profile which creates and binds both the exact
   SQLite origin and exact Redis authority/namespace origin;
4. an epoch-aware business-effect profile;
5. an empty profile-created store and fresh server-allocated binding ordinal;
   WIRING-A stores and experimental transfer state are not upgraded;
6. operator enforcement of the non-cloning/no-rollback premise for both
   SQLite and Redis origins;
7. isolated non-expiring allocation, epoch, guard, and proof creation;
8. proof-capacity sizing which assumes no runtime GC; and
9. bootstrap succession, preflight-free public authority dispatch,
   sender-first dual-SEND guard, lifecycle/group-creation `PERSIST`/refusal,
   callback-seam rejection, crash/rejoin/controller-succession, and release
   empty-or-open plus durable completion gates on the exact deployment
   profile.

Rollback is offline only. It fences the active epoch, settles recovery, keeps
the Redis allocation/epoch/participant/proof anchors, and leaves durable
generation and recovery-term history intact. A store with epoch history is
never downgraded to the part-A runtime online, and rollback never deletes,
expires, clones, rebinds, or recreates an epoch object.

Selecting the generic or WIRING-A migration set is not rollback. Either loader
must reject a database whose `schema_migrations` contains profile-only `005`;
it may not ignore the row, drop epoch tables, or reinterpret the owner row.

An offline move is not ordinary rollback. It requires a separately reviewed
maintenance protocol which proves global quiescence of both origins, preserves
and advances generation/term/allocation history, and updates the exact
origin-owning profile. This design supplies no such production procedure.

Until those conditions are met, the shipped support statement remains:

```text
WIRING-A is test-profile-only and has no automatic crash recovery.
WIRING-B is planned.
Production origin and business-effect profiles are unsupported.
```

## 13. Design acceptance checklist

- [ ] One state machine orders SQLite and Redis fencing without a dual-write
      success assumption.
- [ ] Bootstrap commits one legal `initializing(1,term,Bn)` owner/companion
      reservation before every generation-1 Redis write; B1/B2/B3 lost-reply
      succession exposes no credential or permit before exact confirmation.
- [ ] A paused old epoch cannot commit a main-store, vault, business,
      receive, ACK, reconciliation, source-drain, proof, or transport
      finalization effect after the corresponding revocation point.
- [ ] Every recovery controller has one durable strictly increasing term and
      exact participant identity; every recovery permit, lease, SQLite
      operation, Redis command, ACK, and finalization compares both.
- [ ] Every active permit, lease, receipt claim, direct ACK, and transport
      finalization compares exact `A`, including the retained durable term.
- [ ] R1 paused/resume after R2 term succession changes no SQLite or Redis
      state, including when R1's process-local permit and claim tokens survive.
- [ ] Lease expiry is eligibility, not authority.
- [ ] Every normal and recovery repository transition is fenced at commit.
- [ ] Business effects require destination-side compare-and-commit; the
      current generic handler remains unsupported.
- [ ] Epoch receive uses no blocking `XREADGROUP`.
- [ ] Epoch-owned participants are rejected inside every existing ordinary
      receive/reclaim/fence/ACK script in recovering, active, fencing,
      releasing, and released states.
- [ ] Public SEND atomically validates both guarded endpoints against exact
      unexpired Redis `A` before dedupe or append; every sender phase,
      lower-coordinate, delayed-call, and recipient combination has a closed
      status mapping.
- [ ] Epoch service SEND, heartbeat, discover, unregister, receive, and ACK
      perform no presence/recipient authority preflight; after local
      validation they reach the atomic command which applies the one
      ordinary/lower/equal/higher classifier and exact rejoin mapping.
- [ ] Registration, renewal, discovery cleanup, and unregister consume guards;
      fencing and every guarded lifecycle branch `PERSIST` the inbox and no
      stale page/authenticated call can TTL or delete it.
- [ ] Exported `ensureInboxGroup` atomically consumes the guard and cannot
      `MKSTREAM`, create a group, or normalize a missing guarded source to
      empty; its race has a distinct RED and mutation owner.
- [ ] ACK lost-reply windows converge through exact generation-scoped
      non-expiring proofs; current positive-TTL tombstones are not credited.
- [ ] D1-to-D2 identity loss and D2-to-D3 recovery succession have a bounded,
      body-safe, fail-closed disposition for every original-inbox delivery and
      every partial intent.
- [ ] No transfer/rehome mapping exists; original `toParticipantId`,
      `consumeKey`, receipt, replay identity, and service/consumer recipient
      checks remain unchanged.
- [ ] Unread and PEL drain branches have separate exact commands, counts,
      corruption rules, crash points, REDs, and mutations.
- [ ] `releasing` first closes Redis SEND admission, then either consumes an
      exact post-fence `XLEN == 0`/empty-PEL witness and releases, or atomically
      opens Dn and reserves recovery; unread/PEL/unknown state never disappears.
- [ ] `released` durably retains one exact `redis_pending|confirmed|
      recovery_required` completion identity; only the sealed adapter may
      resume the lost Redis reply/confirmation, and only `confirmed` permits
      the explicit `released(g) -> active(g+1)` monotonic restart.
- [ ] Each SQLite store is injectively allocated and immutably bound to one
      exact Redis authority/namespace capability; forced collision and changed
      or copied plane cases reject, and the non-cloning premise is explicit.
- [ ] Retry classification is one fixed pure deterministic registry; replay
      and `authorizeReplay` are unsupported before any callback or repository
      transition.
- [ ] Caller `consumerFault`, `reconciliationFault`, and
      `lifecycle.beforeRelease` seams reject before admission, and three
      independent mutants plus callback-free child-process crashes prove the
      replacements.
- [ ] Redis epoch history never expires, deletes, or moves backward.
- [ ] Redis allocation records, participant guards, and settlement proofs also
      never expire/delete; any future proof GC requires separate review and
      durable SQLite confirmation.
- [ ] Active/released snapshot rollback and missing-anchor cases cannot reuse
      a generation, recovery term, binding ordinal, or Redis plane.
- [ ] WIRING-A lineage/store assignment and exact-generation semantics remain
      intact.
- [ ] Fixed migration sets name exact ids/paths/digests for root `001`, both
      distinct root `002` files, root `003`, and root `004`; profile-only
      `005` is unreachable from generic production and WIRING-A
      fresh/existing/reopened stores and only the origin-owning epoch profile
      applies it to its fresh empty origin.
- [ ] Trial 4 handoff authenticates the actual Trial 2 request
      `27c49bc357bdfb9cbb3e12c980b38ca1338cb896` and candidate
      `629480e3410fb7e593cdb4c3934caf329bf8e97b` without editing the erroneous
      immutable Trial 3 request.
- [ ] Trial 4 handoff describes direct supervised tmux only as an
      operator-authorized process variance caused by unavailable/failing
      Gateway/KYA and Claude lanes; it claims no profile compliance, Gateway
      trace, or cross-vendor evidence.
- [ ] No production origin, handler, health, inventory, integration,
      promotion, or release claim is implied.

## 14. Verification gate

After the governed source/test file set is final, the eventual WIRING-B
candidate must run:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer_epoch_migrations.test.js \
  tests/gateway/coordination_consumer_epoch_owner.test.js \
  tests/gateway/coordination_consumer_epoch_controller.test.js \
  tests/gateway/coordination_consumer_epoch_binding.test.js \
  tests/gateway/coordination_consumer_epoch_store.test.js \
  tests/gateway/coordination_consumer_epoch_transport.test.js \
  tests/gateway/coordination_consumer_epoch_public_guards.test.js \
  tests/gateway/coordination_consumer_epoch_group_guard.test.js \
  tests/gateway/coordination_consumer_epoch_callbacks.test.js \
  tests/gateway/coordination_consumer_epoch_drain.test.js \
  tests/gateway/coordination_consumer_epoch_release.test.js \
  tests/gateway/coordination_consumer_epoch_runtime.test.js

node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer_epoch_mutations.test.js

node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_consumer_runtime.test.js \
  tests/gateway/coordination_consumer_sqlite_repo.test.js \
  tests/gateway/coordination_consumer_sqlite_integration.test.js \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_ack_outbox_sqlite.test.js \
  tests/gateway/coordination_consumer_store_ownership.test.js \
  tests/gateway/state_init.test.js \
  tests/gateway/coordination_client.test.js \
  tests/gateway/coordination_service_register.test.js \
  tests/gateway/coordination_service_discovery.test.js \
  tests/gateway/coordination_service_lifecycle.test.js \
  tests/gateway/coordination_service_send.test.js \
  tests/gateway/coordination_service_receive.test.js \
  tests/gateway/coordination_service_ack.test.js \
  tests/gateway/coordination_queue_send.test.js \
  tests/gateway/coordination_queue_presence.test.js \
  tests/gateway/coordination_queue_receive.test.js \
  tests/gateway/coordination_queue_ack.test.js \
  tests/gateway/coordination_queue_lifecycle.test.js

npm --prefix gateway run lint -- --no-cache
test ! -e gateway/migrations/005_coordination_consumer_runtime_epoch.sql
git diff --check
python3 scripts/ci_gate.py --repo-root . --refresh-inventory
python3 scripts/ci_gate.py --repo-root . --validate-only
bash scripts/ci.sh
```

Live tests use only a disposable Redis process and profile-owned SQLite
stores. A missing runtime, skipped host lane, shared Redis prefix, live MCP
service, surviving semantic mutant, or DEFERRED result is a hard failure, not
passing evidence. The implementation handoff records exact pristine/mutated
test counts, each first operational failure, live Redis process identity, and
zero survivors.
