# Independent Design Review Result — Project V5 G/0/02 WIRING-A store identity

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 5 |
| P2 | 2 |

The store-backed direction removes Trial 3's process-wide identity selection,
but the submitted SQL and proof do not establish the claimed invariant. The
claim can execute outside the durable `main` table, `changes === 1` need not
mean that a claim committed, a complete but wrong store binding is accepted,
and an exact token collision defeats release fencing. The verification plan
does not exercise those failures.

This verdict **does not authorize implementation**. WIRING-A store-identity
implementation remains frozen.

This result does not reopen the independently closed Trial 3 cancellation
work, and it makes no integration, promotion, release, crash-recovery,
health/inventory, or complete-`G/0/02` claim.

## Reviewed identity and scope

- Review branch: `review/V5-G-0-02-wiring-a-design-1`
- Reviewed HEAD: `047783f`
- Normative design commit: `3095a10`
- Design submission commit: `047783f`
- Trial 3 KO: `75676bf`
- Actual durable ACK-outbox integration inspected: `cc1c10e`
- Current functional-wave-2 evidence head inspected: `96091cb`

The candidate range after Trial 3 adds only:

```text
plan/PROJECT_V5/G/0/02-DESIGN-store-identity.md
plan/reviews/PROJECT_V5/G_0_2_WIRING_A_DESIGN-1_to_review.md
```

The pre-existing untracked `gateway/node_modules` entry was left untouched.

## Correctness ruling

The useful part of the argument is narrow: if every owner statement is
guaranteed to target the committed owner row in the intended SQLite `main`
database, then SQLite uniqueness is the correct arbitration authority.
Ordinary reads on unrelated store `U` cannot substitute `U` for that
statement's database as Trial 3 did.

Those premises are not established by this design:

- Lemma 1 is false for the unqualified table name.
- Lemma 2 confuses a statement-local change count with a committed claim.
- Lemma 4 assumes, but does not state or enforce, token non-collision.
- The theorem assumes the caller supplied the intended store; the opaque
  binding proves only co-construction over whatever handle was supplied.

I exercised the proposed SQL shape with the installed `better-sqlite3`
11.10.0 / SQLite 3.49.2. The readback was:

| Scenario | Observed result |
|---|---|
| Two handles to one file, each with a same-named TEMP owner table | both unqualified inserts returned `changes=1`; `main` retained zero rows; each connection-local TEMP table retained one row |
| `main` migration missing, same-named owner table in an attached database | the unqualified insert returned `changes=1` and wrote the attached table while `main` had no owner table |
| Claim inside an ambient `BEGIN IMMEDIATE` | first insert returned `changes=1`, `database.inTransaction` remained true, and the other handle saw zero rows; after rollback, a second insert returned `changes=1` |
| Replacement receives the exact same 32-byte token | replacement claimed successfully, then the old token-qualified delete returned `changes=1` and removed the replacement |

The first three cases directly contradict the claimed store-local,
committed-row arbitration. They need no pathname, descriptor, or lock
inference and are not failures of SQLite uniqueness.

## P1 findings

### P1 — the statement is neither anchored to `main` nor guaranteed committed

The requirement defines the durable store as SQLite `main`
(`02-DESIGN-store-identity.md:28-33`) and excludes attached databases
(`:49-50`), but both claim and release use the unqualified
`coordination_consumer_runtime_owners` name (`:189-196`, `:219-222`).
SQLite resolves an unqualified name through connection schemas. A TEMP table
can shadow `main`; if `main` lacks the migration, an attached table can satisfy
the name. Consequently, two handles to the same `main` can each win through
their own TEMP table, and a missing `main` migration need not fail closed.

The same exact handle is also caller-owned. The design does not reject an
already active transaction or require a commit boundary. `changes === 1`
inside that transaction permits runtime work at `:198-212`, although the row
is not visible to another handle and may be rolled back. The old runtime can
remain running while a later runtime also receives `changes === 1`.

Required correction:

- qualify owner DML and migration checks as
  `main.coordination_consumer_runtime_owners`;
- account for the existing repository's own schema resolution so that
  same-handle construction actually means both facets use `main`, rather than
  merely the same multi-schema connection;
- reject an ambient transaction and specify a verified committed/autocommit
  postcondition before `claimed` can cross the owner port; and
- add TEMP-shadow, attached-shadow, open-transaction rollback, and
  uncommitted-release REDs plus independent mutations for those guards.

### P1 — a complete wrong-store binding is accepted, and scope collision is real

The opaque brand rejects repository A paired with owner port B, but it accepts
a repository and owner port jointly built over the wrong database. No
store-local query can discover the caller's intended database. Trust therefore
bottoms out at trusted composition selecting the correct open handle, then at
SQLite/VFS faithfully executing against that handle. This is not another
identity inference; it is an external provisioning assumption that the
correctness argument currently omits.

The omission is observable at system level. The design expressly permits two
different stores to own the same `scope_id` (`:63-73`) and requires a test
that proves they both can (`:460-463`). The coordination plane, however, gives
a Gateway instance one canonical scope, and the runtime validates its managed
client against that scope. Two complete bindings over different stores can
therefore use the same ready managed client/scope and both start, splitting
receipt and ACK-outbox truth for one coordination participant. The owner table
cannot see the contradiction because it is precisely in different stores.

The design must either:

- make a reviewed external invariant bind one canonical coordination
  plane/participant to exactly one provisioned durable store and reject any
  second binding through an authoritative provisioned capability; or
- move the needed uniqueness to an authority visible to all candidate stores.

If same textual scopes in different stores are intended to be legal only when
their coordination planes are disjoint, that distinction must be part of
admission and the verification matrix. Merely trusting the same `scope_id`
string is insufficient.

### P1 — random freshness is not an exact release fence

The design says a 32-byte random token prevents old or delayed release
(`:179-182`, `:228-230`) and the proof says a stale token changes zero rows
(`:340-345`). That holds only when every generation's token differs. A
cryptographically random draw makes equality negligible, not impossible, and
the proof does not declare a computational collision assumption.

With an exact collision, the submitted predicate is an ABA check: after the
first row is released and a replacement inserts the same token, a duplicated
or delayed old delete matches and removes the replacement. The disposable
probe observed exactly that sequence.

Use a durable monotonic generation that survives graceful release, and include
that generation in claim and release predicates, or weaken the theorem
explicitly to a reviewed probabilistic guarantee. The required test must force
an exact RNG collision; merely mutating the implementation to cache a token
does not prove the pristine design handles a colliding draw.

### P1 — unsupported-filesystem admission is asserted without an authority

The DDL/DML itself removes Trial 3's Linux `/proc` dependency and is portable
SQLite. Its safety premise is still conditional on a supported VFS and local
filesystem (`:310-312`, `:387-403`). The design mandates that an unknown
network filesystem or custom VFS be rejected at admission, but it identifies
no authoritative capability exposed by the current JavaScript adapter that
can prove that fact.

`better-sqlite3` can expose useful handle state such as memory/read-only/open
status, but a pathname check cannot prove local-filesystem locking and would
reintroduce ambient resource inference. Platform CI proves only the tested
environment; it does not make arbitrary deployed filesystems admissible.

The design must choose and specify one trust boundary: an adapter-provided
authoritative VFS/filesystem capability, a closed allowlisted deployment
profile enforced outside this runtime, or narrower supported-platform claims.
As written, §1.3's fail-closed admission is not implementable from the stated
inputs.

### P1 — the verification plan cannot validate the theorem or its named guards

The Trial 3 workload is correctly retained as a mandatory three-by-400,
bidirectional unrelated-concurrency gate (`:465-485`), and the independent
process case is also required. Those are good regressions.

The plan nevertheless misses every new counterexample above:

- no TEMP or attached-schema shadow;
- no ambient transaction, rollback-after-`changes=1`, or committed-claim
  assertion;
- no complete wrong-store binding using the same managed client and canonical
  scope;
- no exact token-collision fixture; and
- no authoritative supported-VFS/filesystem admission test.

Two named mutants also do not isolate the advertised guards:

- removing `PRIMARY KEY` while retaining
  `ON CONFLICT(scope_id) DO NOTHING` makes the statement invalid because the
  conflict target no longer names a unique constraint. The 400-handle fixture
  can turn red on store error without observing lost exclusivity.
- the “fresh token” mutant checks deliberate reuse, not an equal result from
  two fresh random draws. The pristine proposed mechanism has no collision
  guard to mutate.

The backend/admission row also groups several mechanisms; read-only or
missing-table cases can remain red because later SQL fails even when the
admission guard has been removed. Each admission predicate needs a mutation
whose named fixture fails because that predicate, rather than a downstream
guard, was removed.

## Stale-claim and scope-collision rulings

### P2 — stale-owner safety is purchased by indefinite unavailability

This is a non-expiring claim, not a reclaimable lease. The automatic path does
not reintroduce liveness inference because it never reclaims: a crash, backup,
or copied live row blocks forever (`:286-298`, `:409-420`). That is internally
safe and is more honest than a TTL/PID takeover without end-to-end fencing.

The future manual-delete sentence is not yet a safe reclamation protocol.
“Independently established that every prior process is stopped” necessarily
depends on external liveness evidence, while the row contains no attributable
process identity. PID absence, elapsed time, heartbeat loss, or a failed probe
cannot exclude a paused old process. Without epoch fencing on every effect,
safe cleanup requires enforced global quiescence: fence or stop every process
that can use the store, prevent restart/access, then clear the row under that
maintenance boundary.

The operator tradeoff is explicit:

- preserve single-owner safety and accept indefinite outage after a hard
  crash; or
- authorize a larger end-to-end epoch-fenced recovery design.

Part A may implement no stale-row deletion, PID takeover, TTL, or operator
clear API. Full WIRING must not claim crash restart until the separate choice
and procedure are reviewed.

The cross-store `scope_id` collision is not visible to this table. It is a real
hazard whenever the stores address the same coordination plane/participant,
and it is the subject of the second P1 above. It is harmless only under an
external guarantee that the coordination domains are disjoint.

### P2 — the loser-result invariant contradicts the busy disposition

Section 1.2 says every competing start receives `STORE_OWNED`
(`:67-69`), while the failure table permits a busy/locked timeout to return a
distinct unavailable failure (`:367-371`). Under contention, fail-closed busy
is safe, but it does not satisfy the stated result invariant. The requirement
should say “owned or a closed store failure,” reserving `STORE_OWNED` for an
observed conflicting row.

## Migration-independence check against the real schema

The durable ACK outbox is reviewed-OK and integrated. Commit `cc1c10e` adds
exactly `gateway/migrations/003_coordination_ack_outbox.sql`, whose table is
`coordination_consumer_ack_intents` and whose migration id is
`003_coordination_ack_outbox`. The current functional-wave-2 evidence head
`96091cb` contains that migration.

The proposed `004_coordination_consumer_runtime_owner.sql` name is currently
free across the inspected repository history. The SQLite migration loader
sorts full filenames and records the full stem, so `003` precedes the proposed
`004`. The submitted owner DDL has no foreign key, query, table-name, body,
locator, receipt, outbox, or Redis dependency on migration `003`; the
store-ownership table is schema-independent.

The complete runtime is not delivery-independent of ACK: the opaque binding is
created after the final consumer and ACK repository facets are assembled, and
the real ACK repository consumes migration `003`. That sequencing dependency
does not invalidate the owner-table design, but implementation must start from
the integrated tree rather than this review branch, which predates `003`.

I found no live migration-number or table-name collision.

## Portability ruling

The owner-table algorithm uses portable core SQLite SQL and removes Trial 3's
Linux-only descriptor interface. Its platform dependency is SQLite's actual
locking/atomic-commit behavior through the selected VFS/filesystem, plus
`better-sqlite3` availability. Linux, macOS, and Windows can be claimed only
for configurations exercised on those platforms.

The unresolved issue is admission, not SQL syntax: the design cannot both
avoid resource inference and dynamically prove an arbitrary path is on a
supported local filesystem using the stated adapter. That is the fourth P1.

## Verification-plan assessment

Required and adequate:

- repeated many-handle same-store claims;
- independent-process contention;
- the exact Trial 3 unrelated-read workload in both directions;
- explicit unrelated-store preclaims;
- graceful release/replacement and crash-stale denial; and
- preservation of closed cancellation tests.

Not adequate:

- the omitted namespace, commit, complete-wrong-binding, token-collision, and
  filesystem-authority cases;
- the primary-key mutant that is killed by invalid UPSERT preparation rather
  than an exclusivity failure;
- the token-reuse mutant that does not model an exact collision; and
- grouped admission mutants that can be killed by downstream SQL failures.

The implementation gate therefore cannot presently support the design's
absolute correctness claim.

## What I did and did not verify

I read the normative design and submission, both required prior KO results,
the `G/0/02` sheet, repository operating instructions, the current runtime and
consumer contracts, the canonical coordination-scope documentation, the
actual SQLite migration loader, and the integrated ACK-outbox migration and
schema. I inspected the exact candidate pathset and history.

I walked two-runtime contention, acquire during stop, graceful replacement,
crash without release, same-process separate handles, separate processes,
whole-binding misconfiguration, same-scope different stores, and exact token
collision. In disposable `/tmp` databases I reproduced TEMP shadowing,
attached-database fallback, uncommitted claim/rollback, and colliding-token
release with the installed adapter. The disposable databases were removed.

I did not implement the design; change source, tests, the design, a plan sheet,
migration, policy, or review submission; run aggregate CI; use a live Redis
service; execute on macOS or Windows; exercise a network/custom VFS; test a
future stale-row cleanup API; integrate branches; push; or use sub-agents.
Those omissions do not cure the proof counterexamples above.
