# Review Submission — Project V5 G/0/02 WIRING-B design correction (Trial 4)

## Request state and requested verdict

Request state: **unreviewed**.

This is the immutable review request for WIRING-B Design Trial 4. It records
no review verdict and is not evidence that the design is correct. A fresh,
independent reviewer who did not author the candidate must authenticate and
adversarially review it, then return exactly one of:

- `reviewed_OK` only if all four P1 and three P2 findings in the immutable
  Trial 3 result are closed by executable deterministic design and every
  Trial 2/3 survivor remains intact; or
- `reviewed_KO` with prioritized, reproducible findings if any authority,
  ordering, crash resume, mapping, owner, test, or support boundary remains
  ambiguous, contradictory, unreachable, or untestable.

The reviewer must write a separate immutable result at
`plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-4_result.md`. That result does
not exist as part of this request. This request must remain unchanged whether
the verdict is OK or KO.

## Exact candidate identity and lineage

- Review ID: `PROJECT_V5/G_0_2_WIRING_B_DESIGN-4`
- Stage/task: Project V5 `G/0/02`, WIRING-B, design
- Trial: 4
- Candidate commit:
  `ef50b29713928e39f1698ed83c483e361b9b7f5c`
- Candidate tree:
  `695673c75f837ee53315f75e03229540a93e35a9`
- Candidate sole parent:
  `77d4aa7662ec5dfbdc731b7f27e660659496a074`
- Candidate subject:
  `docs(coordination): correct durable epoch design (V5 G/0/02 WIRING-B Trial 4)`
- Candidate path:
  `plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md`
- Candidate Git blob:
  `03ab2338af9308212759e55790c2ea82ceb664fb`
- Candidate path SHA-256:
  `8502e64470e2088979fdc1c396050e2687cc2977653493172b80f3231d8c3043`
- Parent-to-candidate scope: exactly one modified path, the candidate design
  above
- Parent-to-candidate numstat: exactly `698` insertions and `167` deletions

The candidate parent is the immutable Trial 3 result commit:

- Trial 3 design candidate:
  `4529fa6305661161a5da27eb68dc613c47087b6c`
- Trial 3 request:
  `19c40db11e764092a0b2dfd54f5a686120c78838`
- Trial 3 result and direct Trial 4 parent:
  `77d4aa7662ec5dfbdc731b7f27e660659496a074`
- Trial 3 result tree:
  `0adb8f83bb9fbb1ca4cfe436097148a34bc293de`
- Trial 3 result Git blob:
  `3ab6aaa7ef45f544c04d8c2ed7c9932a6a6f973f`
- Trial 3 result file SHA-256:
  `18b941cb6231189e6c61a859d1726519cc9d285398fa80e4c74fbeed86f11a07`

The actual Trial 2 objects, authenticated as Git commits, are:

- Trial 2 design candidate:
  `629480e3410fb7e593cdb4c3934caf329bf8e97b`
- Trial 2 candidate tree:
  `f5590d310735dbcf2962971c07f792fcac0c2e66`
- Trial 2 request:
  `27c49bc357bdfb9cbb3e12c980b38ca1338cb896`
- Trial 2 request tree:
  `381f8717d6ee0af6308007253a50ebe4dd26d4ce`
- Trial 2 result:
  `e31bc714166e3b814d1c417ba4ddf1358cd3abd8`

The immutable Trial 3 request remains at
`19c40db11e764092a0b2dfd54f5a686120c78838` with Git blob
`1f0dbfc6525dea7e10b7efa7f3ff03b6a9fdc96f` and file SHA-256
`bb6441c89a7c0e96a04227e79c6ca42def89a01780b4bfafbf08a8842d77236b`.
It incorrectly names two nonexistent Trial 2 objects. Trial 4 corrects the
trail prospectively in this request; it does not rewrite that prior request.

The reviewer must inspect the design from the candidate Git object, not trust
a mutable working-tree copy. Any mismatch in commit, tree, parent, path scope,
numstat, blob, or SHA-256 is an authentication failure and therefore a KO for
this request.

The required append-only prior trail is:

- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-1_to_review.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-1_result.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-2_to_review.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-2_result.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-3_to_review.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-3_result.md`

The fresh reviewer must read all six artifacts. Earlier requests/results are
immutable evidence; no conclusion in them is silently replaced by this
handoff.

## Design-only and evidence boundary

This candidate changes a design document only. It does not claim an
implementation, migration, integration, promotion, rollout, or release.

| State | Canonical state for this request |
|---|---|
| Trial 4 design authored | Yes, at the exact candidate object above |
| Trial 4 design reviewed | No; this request remains unreviewed |
| Epoch implementation | Not implemented or authorized by this request |
| Migration `005` / migration-set code | Planned; not created or applied |
| Integration | Not performed or implied |
| Promotion/rollout/release | Not performed or implied |
| Production origin/effect profile | Unsupported |
| Health/inventory composition | Out of scope and still gated |

The following are **BUILT inputs**, not Trial 4 implementation evidence:
WIRING-A's reviewed non-expiring ownership mechanics; the durable consumer,
receipt, ACK outbox/reconciler, runtime-owner substrate, and current generic
queue/service/client/runtime behavior. In particular, current production code
still has service participant/recipient preflights, the managed client's four
lease-loss codes, exported unguarded `ensureInboxGroup ... MKSTREAM`,
root-directory migration discovery, and the `consumerFault`,
`reconciliationFault`, and `lifecycle.beforeRelease` seams.

Every epoch guard, public-authority facet/script, release-completion
ledger/adapter, fixed migration-set module, profile migration `005`, directed
epoch RED, and semantic mutant in the candidate is **PLANNED** until a separate
implementation candidate is built and independently reviewed. Static design
checks cannot establish Redis/SQLite crash safety.

## Process variance and reviewer independence

The operator authorized direct supervised `tmux` for the design-authoring and
handoff process because the Gateway/KYA route was unusable or failing and the
Claude lane was unavailable or failing. This is a process-variance disclosure
only.

This request does **not** claim repository-profile compliance, a Gateway
trace/task/session/artifact, successful KYA orchestration, Claude execution,
cross-vendor review, or retroactive Gateway evidence. None of those identifiers
or artifacts is available to authenticate here. The operator authorization
permits the work requested by the operator; it does not transform the route
into profile-compliance evidence.

A fresh independent reviewer is therefore mandatory. The reviewer must not be
the Trial 4 design author, must independently authenticate the object and
current production callers, and must derive the verdict rather than reuse the
author's closure table, static checks, or self-review. Prior KO results are
correction contracts and evidence, not a substitute verdict.

## Trial 3 finding closure map and mandatory adversarial review

### P1-01 — public preflights bypassed the atomic SEND authority

Exact Trial 4 design sections:

- `Decision and assumptions`, especially `P` authentication and the one
  lexicographic `C=(generation,recoveryTerm)` classifier
- `§3.9 State and authority invariants`
- `§5.1 Private transport facet`
- `§5.1.1 Atomic public SEND endpoint guards`
- `§5.1.2 Epoch-aware public lifecycle scripts`
- `§7 Crash matrix`
- `§8 Failure model`
- `§9 EPOCH-TRANSPORT` and `EPOCH-WIRING`
- `§10 Required tests and mutation owners`

The reviewer must begin at the actual public callers in
`gateway/src/services/coordination_service.js` and
`gateway/src/coordination_client.js`, not at Lua in isolation. Establish that
the sealed epoch dispatch performs only DTO validation, token hashing,
time/ID generation, and non-authoritative draft construction. It must not
call `getParticipant`, `readParticipant`, `authenticateParticipant`, or a
recipient authority preflight before the operation-specific script.

Attack the public SEND path with ordinary and guarded senders/recipients,
including removed presence, wrong credential, expired ordinary state, lower,
equal-active, equal-non-active, higher, incomparable, missing epoch, malformed
guard/epoch, active guard with missing presence, and dual endpoint failure.
Require the exact one-command order:

1. sender authentication/classification;
2. recipient classification;
3. server-held scope derivation/equality;
4. canonical envelope construction;
5. dedupe lookup;
6. equal-retry dedupe `PEXPIRE`;
7. `XLEN`;
8. `XADD`;
9. dedupe `SET`; and
10. event append.

The sender result must win every dual failure and be reachable even after
guard installation removed ordinary presence. Every rejection before dedupe
must leave dedupe value/TTL, inbox, stream, event, and audit unchanged.

Independently verify the closed mapping:

- ordinary missing/bad credential → `COORDINATION_AUTH_FAILED` → existing
  managed-client rejoin;
- ordinary expiry → `COORDINATION_LEASE_EXPIRED` → existing rejoin;
- guarded lower/equal-non-active sender →
  `COORDINATION_EPOCH_MANAGED_OPERATION_REQUIRED` → no rejoin;
- guarded lower/equal-non-active recipient →
  `COORDINATION_TARGET_NOT_FOUND` → no rejoin;
- higher/incomparable/corrupt state → `COORDINATION_INTERNAL_ERROR` → no
  rejoin; and
- exact-active/ordinary accepted endpoints → existing
  created/duplicate/conflict/full behavior.

The epoch facet must not invent `COORDINATION_LEASE_CHANGED` or
`COORDINATION_LEASE_NOT_FOUND`; those remain legacy lease-loss codes. Apply
the analogous no-preflight/authentication/classification review to heartbeat,
discover (every batch and final caller check), unregister, receive, and ACK,
including the blocking-receive-before/after-script race and its recoverable
PEL side effect. Kill the distinct
`EPOCH-WIRING/PUBLIC-AUTHORITY-DISPATCH` mutant.

### P1-02 — empty release lost resumable authority after SQLite `released`

Exact Trial 4 design sections:

- `§1.3 Capability reachability`
- `§2.1 Migration`, especially the release-completion ledger
- `§2.3 Redis epoch record`
- `§2.4 Non-expiring participant guards and settlement proofs`
- `§3.6 Release`
- `§3.7 Restart after released`
- `§3.9 State and authority invariants`
- `§7 Crash matrix`
- `§8 Failure model`
- `§10`, owner `EPOCH-CORE/RELEASE-COMPLETION`

Seed the exact empty release prestate only after the Redis release/SEND fence,
canonical group, `XLEN == 0`, empty PEL, and every durable close predicate are
proven. Then kill the process immediately after the one SQLite transaction
commits owner/companion `released(g)` plus the exact permanent
`redis_pending` completion row, before Redis completion.

Require a uniquely reproducible `completion_id` bound to Redis
authority/namespace/binding, scope, generation, retained term, source
participant, inbox, and group. On reopen, admission must authenticate the
origin/binding and resolve pending completion before bootstrap, takeover,
restart, registration, or runtime construction. Only the sealed
release-completion adapter may issue the exact idempotent Redis transition.

Attack:

- crash before the Redis command;
- Redis commit with reply loss;
- readback/witness loss;
- crash before SQLite `confirmed`;
- SQLite confirmation commit with reply loss;
- two processes resuming the same row;
- a different completion ID, coordinate, group, stream type, positive XLEN or
  PEL, missing anchor, and transport timeout; and
- restart attempted in `redis_pending`, `recovery_required`, and `confirmed`.

Timeout/unknown commit must retain `redis_pending` and replay the same
identity. A bounded contradictory observation must become monotonic
`recovery_required`. Exact confirmed replay changes no timestamp. Only exact
SQLite `confirmed` plus Redis `released(completion_id)` permits
`released(g) -> fencing(g+1)`. No old release permit, controller, runtime,
ordinary queue, or restart actor may acquire completion authority.

### P1-03 — exported group creation could manufacture false empty transport

Exact Trial 4 design sections:

- `§3.9` invariants 10 and 13
- `§5.1.3 Guard-aware exported group creation`
- `§7 Crash matrix`
- `§8 Failure model`
- `§9 EPOCH-TRANSPORT`
- `§10`, owner `EPOCH-TRANSPORT/GROUP-GUARD`
- `§11 Path scope`

Starting from a permanent participant guard with a missing stream/group, call
the exported `ensureInboxGroup`. The one Lua command must inspect the guard
before group/stream creation and perform no `XGROUP`, `MKSTREAM`, `XADD`, TTL,
delete, or replacement. A canonical lower/equal guard returns low-level
`epoch_owned`; malformed, higher, incomparable, wrong-type, or missing-epoch
state is transport unknown. Neither outcome may be exposed as false empty.

Run ensure and epoch installation in both orders, with existing and missing
stream/group, plus lost replies and a crash after ordinary `ready` but before
installation. If ensure wins first, installation must validate and `PERSIST`;
if the guard wins first, ensure must never create. Confirm the authenticated
baseline has no production caller beyond the exported method's contract
tests, and that private bootstrap, receive, ACK, recovery, and release never
call it. Kill `EPOCH-TRANSPORT/GROUP-GUARD` independently of lifecycle guards.

### P1-04 — frozen migration sets omitted root `002_lifecycle.sql`

Exact Trial 4 design sections:

- `§2.1 Migration`
- `§8 Failure model`
- `§9 EPOCH-CORE` and `EPOCH-WIRING`
- `§10`, owner `EPOCH-CORE/MIGRATION-PATH-SET`
- `§11 Path scope`
- `§12 Rollout and rollback`
- `§13 Design acceptance checklist`
- `§14 Verification gate`

Require exact ordered `(id,path,literal SHA-256)` entries for:

1. `gateway/migrations/001_initial.sql`;
2. `gateway/migrations/002_coordination_consumer.sql`;
3. `gateway/migrations/002_lifecycle.sql`;
4. `gateway/migrations/003_coordination_ack_outbox.sql`; and
5. `gateway/migrations/004_coordination_consumer_runtime_owner.sql`.

Generic application and WIRING-A must select only that five-path root set.
Only the separately named epoch profile may append
`gateway/migrations/profiles/sqlite-redis-disposable-epoch-test-v1/005_coordination_consumer_runtime_epoch.sql`.
No directory scan, glob, basename, shared `002`, numeric-version grouping,
environment, or caller option may alter a set.

Attack fresh, existing, and reopened generic/WIRING-A stores; first-open and
same-origin reopened epoch stores; a generic/WIRING-A store containing `005`;
an epoch store missing either `002`; an outside-set applied ID; duplicate
id/path; path traversal/symlink; changed digest; wrong profile reopen; and a
nonempty purported fresh epoch origin. An outside-set row must reject before
owner/Redis work, never be ignored or adopted. Kill the migration-path-set
mutant separately from profile-directory isolation.

### P2-01 — actual fault and release callback seams were unowned

Exact Trial 4 design sections:

- `§3.6 Release`
- `§4.5 Actual runtime callback seam closure`
- `§8 Failure model`
- `§9 EPOCH-WIRING`
- `§10 Required tests and mutation owners`

Use the actual runtime inputs `consumerFault`, `reconciliationFault`, and
`inspect().lifecycle.beforeRelease`. The epoch profile must reject a caller
property, accessor, symbol, or non-allowlisted shape with
`EFFECT_PROFILE_UNSUPPORTED` before migration selection, store opening,
Redis, registration, or provision construction. Trusted fault positions may
contain only frozen module-private no-ops. Epoch release must bypass
`lifecycle.beforeRelease` and enter the durable release coordinator.

Crash tests must use an external child-process supervisor observing committed
SQLite/Redis witnesses; no callback/getter may signal a boundary. Independently
kill `EPOCH-WIRING/CB-CONSUMER`,
`EPOCH-WIRING/CB-RECONCILIATION`, and
`EPOCH-WIRING/CB-BEFORE-RELEASE`.

### P2-02 — Trial 3 request recorded nonexistent Trial 2 objects

Exact Trial 4 locations:

- `Status and boundary` → `Trial 4 correction record`
- `§10` Trial 4 correction ledger, owner
  `TRIAL4-HANDOFF/TRIAL2-LINEAGE`
- `§13 Design acceptance checklist`
- `Exact candidate identity and lineage` in this request

Authenticate with `git cat-file -e <sha>^{commit}` that the actual Trial 2
request is `27c49bc357bdfb9cbb3e12c980b38ca1338cb896` and candidate is
`629480e3410fb7e593cdb4c3934caf329bf8e97b`. Also verify the erroneous Trial 3
request remains byte-for-byte at its authenticated blob/digest above. Editing
that request or repeating either nonexistent SHA is a failure.

### P2-03 — process variance was not profile-compliance evidence

Exact Trial 4 locations:

- `Status and boundary` → `Trial 4 correction record`
- `§10` Trial 4 correction ledger, owner
  `TRIAL4-HANDOFF/PROCESS-VARIANCE`
- `§13 Design acceptance checklist`
- `Process variance and reviewer independence` in this request

Treat direct supervised tmux as the operator-authorized variance actually
reported because Gateway/KYA and Claude were unavailable or failing. Do not
credit it as profile compliance, Gateway/KYA execution, Claude/cross-vendor
evidence, or a retroactive trace. A passing review requires a fresh
independent reviewer on the authority of this review request, not a fabricated
or inferred orchestration artifact.

## Survivor ledger that Trial 4 must not weaken

| Required survivor | Exact Trial 4 design anchors | Mandatory regression attack |
|---|---|---|
| Legal durable bootstrap B1/B2/B3 | `§2.1`, `§2.3`, `§3.1`, `§3.4`, `§7`, `§10` | No generation-1 Redis write before atomic `initializing(1,term,Bn,installing)` owner/companion commit; lose every install/readback/confirmation reply; advance B1→B2→B3 and deliver delayed lower-term commands; expose no credential/permit before both authorities confirm |
| Durable controller succession | `§3.3`, `§3.4`, `§6.5`, `§7` | Pause R1 at every SQLite/Redis operation, advance exact term/controller to R2/R3, then resume R1 and require zero old-term mutation |
| Drain-in-place source identity | `§6.1`–`§6.5` | Preserve original source inbox, `toParticipantId`, `consumeKey`, receipt/replay identity, and service/consumer recipient validation; no transfer/rehome/mapping/alias |
| Permanent guards and settlement proofs | `§2.4`, `§5`, `§6` | No TTL/delete/rehome of a guard, guarded inbox, allocation record, or proof; exact proof replay only; no runtime proof GC |
| Lifecycle `PERSIST` race ownership | `§5.1.2`, `§7` | Stale discovery and unregister on both sides of install/fence/release; guarded path always `PERSIST`s before omission/cleanup and never expires/deletes |
| Separate unread and PEL recovery | `§6.4`, `§7`, `§10` | Exact independent commands, cursor/count/reply checks, unread-to-PEL crash, deleted IDs, and no fallthrough between branches |
| Store/Redis origin binding | `§1.2`, `§1.3`, `§2.2`, `§2.3` | Collision, rollback, wrong authority/namespace, changed/copied plane, foreign origin capability, and explicit non-cloning theorem boundary |
| Exact A/R claims and effect fencing | `§3.9`, `§4.1`–`§4.4`, `§5.2`–`§5.4`, `§6.5` | Every repository/vault/ACK/proof/effect commit compares exact generation, retained term, and active/controller identity at its own mutation point |
| Activation order and permit withholding | `§6.5`, `§7` | SQLite exact `A` before Redis activation, Redis reply loss, exact readback, and no active permit/consumer before both agree |
| Release fence and empty-or-open source | `§3.6`, `§5.1.1`, `§6.4`, `§7` | Close sender/recipient admission first; exact post-fence `XLEN==0` and empty PEL plus durable predicates, otherwise atomically open Dn and reserve `g+1`, or fault ambiguity |
| Callback/observation/replay support boundary | `§4.2`–`§4.5` | Generic handler/audit/metrics/retry/replay remain unsupported; Trial 4's three actual runtime seams are closed without broadening production support |
| Body-free closed diagnostics | `§8` and public maps in `§5.1` | No token, body, raw Redis reply, coordinate, or capability in public errors; unknown state never becomes success or lease-loss rejoin |

Any weakening is a Trial 4 KO even if all seven direct correction summaries
look plausible.

## Cross-cutting review requirements

Static prose presence is insufficient. For every correction and survivor, the
reviewer must derive:

1. the exact legal prestate and authenticated input;
2. the single atomic SQLite or Redis decision owner;
3. both race orders or every crash/lost-reply boundary;
4. the durable state after each order;
5. the sole legal resume and whether authority can be reacquired;
6. the exact queue/service/client result and rejoin behavior;
7. the first directed RED that fails before GREEN; and
8. an independently killable semantic mutant and owning slice.

Review the composition across schema shapes, capability reachability,
authority/phase tables, SQLite/Redis ordering, public mappings, crash matrix,
failure model, path scope, five-slice decomposition, RED/GREEN inventory,
mutation owners, rollout/rollback, checklist, and verification gate. A status
projection, service preflight, process-local object, callback, PID, timeout,
or absence may never substitute for durable authority.

The reviewer must specifically re-derive the whole release path:
`active -> releasing`, Redis sender/recipient admission fence, exact
XLEN/PEL/durable decision, atomic empty completion row plus `released` or
atomic open source plus `fencing(g+1)`, idempotent release completion, and
confirmed-only restart.

## Request-author authentication and static checks

These checks authenticate document objects and scope only; they are not a
design verdict and make no implementation/runtime claim:

- `git cat-file -t ef50b29713928e39f1698ed83c483e361b9b7f5c`
  returned `commit`.
- The candidate resolves to tree
  `695673c75f837ee53315f75e03229540a93e35a9` and sole parent
  `77d4aa7662ec5dfbdc731b7f27e660659496a074`.
- Parent-to-candidate name-status returned only
  `M plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md`.
- Parent-to-candidate numstat returned exactly `698 167` for that path.
- The committed candidate path resolves to Git blob
  `03ab2338af9308212759e55790c2ea82ceb664fb`.
- SHA-256 read from the candidate object returned
  `8502e64470e2088979fdc1c396050e2687cc2977653493172b80f3231d8c3043`.
- Candidate `git diff --check` passed.
- The five authenticated root migration SHA-256 values in the design match
  the candidate-parent files.
- The design has balanced Markdown code fences and names all seven directed
  correction owners.
- Review-request `git diff --check` passed before its explicit-pathspec commit.
- Before this request was authored, the only worktree residue was untracked
  `gateway/node_modules`; it was not read, staged, modified, or committed.

No implementation suite, integration test, live Redis experiment, migration,
CI gate, rollout, promotion, release, Gateway/KYA command, or Claude review
was run or represented by these author checks.

## Required result contents

The independent Trial 4 result must:

1. repeat the authenticated candidate commit, tree, parent, blob, one-path
   scope, numstat, and committed SHA-256;
2. state reviewer independence and disclose the review route actually used
   without inventing Gateway/KYA/Claude evidence;
3. give one explicit pass/fail ruling for P1-01 through P1-04 and P2-01
   through P2-03, citing exact candidate sections and adversarial schedules;
4. give an explicit intact/regressed ruling for every survivor row above;
5. distinguish BUILT inputs from PLANNED epoch work and design review from
   implementation, integration, migration, promotion, rollout, and release;
6. classify every new finding as P0, P1, or P2 with reproducible evidence;
7. report whether every directed RED and independent mutation owner is
   sufficient to distinguish the intended protocol from the named mutant; and
8. issue exactly one final `reviewed_OK` or `reviewed_KO` verdict.

While producing the result, the reviewer must not amend the candidate design,
this request, any prior request/result, either review index, the sheet/stage/
project plan, policy, migration, code, or tests. Only the new Trial 4 result
may be written. A KO correction must use Design Trial 5 rather than rewrite
this request or result.
