# Independent Design Review Result — Project V5 G/0/02 WIRING-B Design Trial 1

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 1 |
| P1 | 6 |
| P2 | 2 |

The candidate correctly rejects TTL-only ownership, check-before/check-after
handler fencing, blocking epoch receive, Redis-anchor recreation, and generic
production handlers. It also keeps WIRING-A, production profiles, health, and
inventory outside its claimed BUILT boundary.

The proposed recovery protocol is nevertheless not safe or executable as
written. Most importantly, a replacement recovery controller resumes the same
durable generation without any durable controller term. A paused prior
controller and its opaque permit therefore cannot be distinguished from the
successor by the stated SQLite or Redis commit predicates. The identity-rehome
algorithm also preserves an envelope addressed to D1 while placing it in D2's
inbox, which both existing service and consumer validation reject.

This verdict does not authorize implementation, migration work, integration,
promotion, release, automatic recovery, or any production profile.

## Candidate and reviewer identity

- Review id: `G_0_2_WIRING_B_DESIGN`
- Trial: `1`
- Candidate commit:
  `ab2a0f57375485d61033dbf61dea4e48d5c04e99`
- Candidate tree:
  `909ddc61141f13487cedbb8e09e83d8950a38699`
- Candidate base:
  `4236b765fbf18fa519fb4692fea551f9485fe506`
- Pre-verdict review HEAD:
  `6497728d55bfb9787f037df81c520ff4240a2eab`
- Review branch: `review/V5-G-0-02-wiring-b-design-1`
- Review date: `2026-07-29`
- Reviewer session: fresh independent Codex design-review session; it did not
  author the candidate and did not adopt the author/root session's conclusions
- Reviewer/model identity: OpenAI Codex, GPT-5 family; the exact serving model
  slug is not exposed to this session
- Sub-reviewers: none

The repository profile normally assigns design review to `claude-code` with
`claude-fable-5`
(`.claude/orchestration-profile.md:78-86`). That reviewer was unavailable, and
the operator explicitly selected this distinct Codex reviewer session. This is
an execution exception only: it does not lower the evidence standard and is
not self-review.

The exact candidate range adds only
`plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md`; the handoff itself confirms
that no source, test, migration, policy, runtime, or result is included
(`G_0_2_WIRING_B_DESIGN-1_to_review.md:14-29`).

## BUILT versus PLANNED

| Classification | Independent ruling and evidence |
|---|---|
| **BUILT** | Consumer retry/quarantine/replay and canonical consume identity are present in `gateway/src/core/coordination_consumer.js:209-235,990-1013,1034-1120,1258-1489`. |
| **BUILT** | SQLite receipts, deliveries, replay, and vault schema exist in `gateway/migrations/002_coordination_consumer.sql:8-206`; the repository implements consumer mutations, ACK outbox transitions, summaries, and replay at `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js:1380-1905,1906-2573,2621-2875`. |
| **BUILT** | The ACK intent schema and closed `recovery_required` state exist at `gateway/migrations/003_coordination_ack_outbox.sql:3-209`; existing Redis ACK/tombstone/orphan scripts use destructive `XACK`/`XDEL` and positive-TTL proof at `gateway/src/core/coordination_queue.js:1246-1350,1353-1370,1689-1802`. |
| **BUILT** | WIRING-A has a persistent exact-generation owner with only `owned`/`released` states in `gateway/migrations/004_coordination_consumer_runtime_owner.sql:3-24` and `gateway/src/core/sqlite_coordination_consumer_owner.js:5-29,366-445`. Stable same-main provisioning remains test-profile-only and reports production unsupported at `gateway/src/core/coordination_consumer_runtime_provision.js:21-97`. |
| **BUILT** | Current public receive and ACK use participant lease fencing, not a durable WIRING-B epoch, at `gateway/src/services/coordination_service.js:1269-1380` and `gateway/src/core/coordination_queue.js:3021-3254`. The managed client publicly invokes both operations at `gateway/src/coordination_client.js:19-24,773-809,832-841`. |
| **PLANNED** | Every durable-epoch table, transition permit, repository facet, effect port, Redis epoch command, transfer outbox, rehome command, epoch profile, and epoch test is design text only. The candidate itself classifies crash recovery and cross-port fencing as PLANNED (`02-DESIGN-durable-epoch.md:3-28`) and defers all implementation to later sub-slices (`:632-678`). |
| **PLANNED / unsupported** | Production origin issuance, production business effects, generic handlers, health/inventory, integration, promotion, and release remain unsupported (`02-DESIGN-durable-epoch.md:423-430,778-807`). I reject any production or automatic-recovery claim based on this candidate. |

## Findings

### P0 — Same-generation recovery failover has no durable controller fence

The durable companion row records generation, phase, deadline, participant,
and predecessor, but no recovery-controller owner, term, or token
(`02-DESIGN-durable-epoch.md:155-184`). Only the transaction entering
`recovering` initially receives a recovery permit (`:320-336`), while the crash
matrix promises that another controller resumes that **same generation** after
the recovery lease (`:594-603`). Every stated repository recovery commit checks
only exact generation, allowed phase, and an unexpired lease
(`:374-404`); the Redis recovery checks likewise name current generation and a
recovery permit, with no durable successor term (`:498-510`).

Counterexample schedule:

1. R1 commits `recovering(g+1)`, receives its process-local opaque recovery
   permit, and pauses.
2. Its recovery lease expires.
3. R2 follows the specified crash-resume path, retains `g+1`, obtains recovery
   authority, and extends or replaces the recovery deadline.
4. R1 resumes. Its opaque object cannot be revoked by R2 in another process.
   The durable row again says `recovering(g+1)` with an unexpired lease, so all
   predicates stated by the design accept the same facts for R1 and R2.
5. R1 can race R2 at a recovery repository or Redis commit point even though
   R2 is the replacement recovery controller.

Binding a permit to the prior deadline would help only if exact deadline/term
equality were stored and checked by every commit; the candidate specifies
neither. This violates the D01 requirement that a paused predecessor cannot
resume any recovery or transport finalization after replacement
(`plan/PROJECT_V5/DEFERRED.md:27-39`).

The correction needs a durable, monotonically advanced recovery-controller
term (or a new durable generation), exact controller identity/term checks in
every SQLite and Redis recovery mutation, and a two-controller paused-resume
RED. Process-local capability branding alone cannot fence another process.

### P1 — A crash during `recovering` has no D2-to-D3 succession protocol

Credentials are deliberately not persisted, so a hard restart normally
registers a new participant (`02-DESIGN-durable-epoch.md:512-521`). If the
process crashes after entering `recovering(g+1)` with D2 but before or during
the scan, the next process registers D3. The candidate nevertheless requires
the “new participant” to be live before scanning (`:523-531`), records only
one current participant in the epoch row (`:166-184`), and creates rehome
mappings/tombstones to that participant (`:558-574`). Its only stated resume
rule is another controller at the same generation (`:594-603`).

There is no CAS transition that replaces D2 with D3, retires partial D2
transfer intents, chains already committed D1-to-D2 mappings, or advances the
generation. Thus the advertised crash point can remain permanently
`recovering`, or an implementation must invent an unreviewed identity rewrite.
The design needs an explicit durable participant-succession state machine and
crash tests before and after each D2-targeted transfer boundary.

### P1 — Rehome preserves a D1 recipient identity that D2 must reject

Atomic rehome appends the **same canonical envelope** to D2's inbox and claims
that the same `consumeKey` is preserved
(`02-DESIGN-durable-epoch.md:558-577`). In the shipped contract,
`toParticipantId` is part of the consume identity
(`gateway/src/core/coordination_consumer.js:209-235`). The service rejects an
envelope whose recipient is not the inbox participant
(`gateway/src/services/coordination_service.js:804-825`), and the consumer
independently quarantines that mismatch before the handler
(`gateway/src/core/coordination_consumer.js:1003-1013`).

Therefore a D1 envelope copied unchanged into D2's inbox is rejected or
quarantined. Rewriting `toParticipantId` to D2 avoids that check only by
changing the canonical consume identity, contradicting the promised
idempotence and existing receipt lookup. Existing directed tests enforce both
guards at
`tests/gateway/coordination_service_receive.test.js:378-435` and
`tests/gateway/coordination_consumer.test.js:605-624`.

The design must introduce and review a stable logical-recipient identity or an
explicit D1-to-D2 identity translation with a durable dedupe alias, then name
the exact service, consumer, receipt, and replay changes. The current “same
envelope, same consume key” algorithm cannot implement D1-to-D2 recovery.

### P1 — Positive-TTL tombstones do not close arbitrary crash/lost-reply pauses

The threat model permits a process to pause at every instruction and lose a
Redis success reply (`02-DESIGN-durable-epoch.md:99-112`). Rehome nevertheless
deletes the source and writes only a positive-TTL transfer tombstone, then
claims that a lost reply or crash converges (`:558-574`). ACK recovery makes
the same convergence claim (`:487-510,594-603`).

For either operation, Redis can commit `XACK`/`XDEL`, the reply can be lost,
and the process can remain paused until the tombstone expires. On resumption,
the SQLite intent is still uncommitted while both source entry and proof are
absent. The candidate's own recovery table then requires
`TRANSPORT_STATE_UNKNOWN`/recovery-required and refuses activation
(`:542-590`), rather than converging.

This is not hypothetical behavior hidden by the existing ACK implementation:
the default tombstone TTL is finite (24 hours) at
`gateway/src/core/coordination_contract.js:10-12`; current scripts require
numeric `PTTL > 0` and distinguish an absent proof
(`gateway/src/core/coordination_queue.js:1246-1310,1353-1370,1689-1802`).
That accepted fail-closed rule must not be restated as unbounded recovery.

The design needs proof whose retention cannot expire before durable
confirmation (for example, generation-scoped proof with reviewed garbage
collection only after the SQLite commit), or it must honestly specify a
terminal operator recovery instead of automatic convergence.

### P1 — The release state is illegal, and released restart is absent

The schema permits `fencing` only with
`pending_generation = generation + 1`
(`02-DESIGN-durable-epoch.md:176-184`). Release begins by committing
`fencing` **without** a pending replacement (`:351-363`). That state cannot be
stored under the candidate's own checks.

The state machine also defines bootstrap only for a store with no owner or
companion row (`:276-290`), takeover only from `active` (`:310-338`), and
release ending in persistent `released`. It defines no normal
`released(g) -> ... -> active(g+1)` restart. “Resume exact release or fence
next generation” in the crash matrix (`:603-606`) does not supply the missing
legal transition.

The design needs a representable releasing state (or a separately legal
fencing shape), exact crash transitions for it, and an explicit monotonic
restart from `released`.

### P1 — Store binding is neither collision-safe nor durably bound to a Redis plane

`store_binding_id` is merely a 64-hex value unique inside one SQLite file
(`02-DESIGN-durable-epoch.md:150-174`). The origin profile “creates” it, but no
allocation authority or collision protocol is stated (`:223-237`). The Redis
key is derived from binding plus scope, and an exact record is accepted as an
idempotent install (`:239-266`).

Two independent new stores whose allocator is forced to return the same value,
using the same scope and Redis prefix, therefore derive the same generation-1
key. After store A installs it, store B cannot distinguish A's record from its
own exact idempotent install. Both local SQLite files can become active. This
reintroduces the probabilistic identity premise that WIRING-A deliberately
removed (`02-DESIGN-store-identity.md:31-38,579-586`).

There is a second form of the same gap: SQLite records no Redis plane/cluster
identity. A restart can be pointed at another plane containing a copied or
matching anchor. Each plane then validates only its local key; the old plane
is never advanced, and the candidate's lower-generation and snapshot checks
cannot compare the two. The missing-key rule is correctly fail-closed on the
same plane (`02-DESIGN-durable-epoch.md:264-272`), but it does not prove
single-plane continuity.

The origin profile must durably and injectively bind the admitted SQLite store
to one reviewed Redis authority/namespace, reject forced binding collisions,
and test a changed or duplicated plane. Otherwise the design must state and
enforce that binding as an external premise; the four stated premises do not
contain it (`:114-127`).

### P1 — The ordinary managed client bypasses recovery, epoch ACK, and release

The candidate gives the epoch runtime a private transport facet and leaves
public receive/ACK DTOs unchanged (`02-DESIGN-durable-epoch.md:449-461`). It
requires ordinary scripts to honor only the **predecessor** participant fence
marker (`:463-467`). It never says that ordinary operations for the current
epoch participant are rejected.

The shipped managed client exposes `receive` and `ack`
(`gateway/src/coordination_client.js:19-24,773-809,832-841`). The service
routes them to queue operations that check participant lease state only
(`gateway/src/services/coordination_service.js:1269-1380`). Ordinary
`readInbox` can use the blocking pre/read/post path and ordinary `ackInbox`
performs `XACK`/`XDEL` without any epoch key
(`gateway/src/core/coordination_queue.js:3021-3254`).

Consequently, while D2 is live but SQLite is still `recovering`, code holding
the same supported managed client can claim a message through public
`receive`, or delete one through public `ack`, bypassing the private epoch
facet and durable ACK ordering. The same gap exists after release unless the
current participant is separately fenced. Raw Redis access is not required,
so the candidate's external-access exclusion does not remove this schedule.

The epoch profile must make ordinary service/queue receive and ACK
structurally unreachable for an epoch-owned participant and enforce that fact
inside the scripts, or issue a sealed client that does not expose those
operations. A private alternative path does not disable the public existing
path.

### P2 — Effectful classifier and replay-authorization callbacks are unclassified

The candidate explicitly excludes arbitrary handler, audit, and metrics
callbacks and requires epoch-aware alternatives
(`02-DESIGN-durable-epoch.md:406-447`). It does not classify the existing
`retryClassifier`, which is invoked after a handler error
(`gateway/src/core/coordination_consumer.js:1034-1062`), or
`authorizeReplay`, which is invoked before the epoch-fenced `beginReplay`
transition (`:1258-1363`).

Either callback can itself perform an external effect after fencing unless the
epoch profile fixes it to a reviewed pure implementation or gives it the same
destination-side epoch contract. Replay is not a currently supported
WIRING-B production path, so this is not evidence of shipped production
unsafety; it is a design-completeness gap that must be closed before the
candidate's “every other effect” acceptance statement can be implemented.

### P2 — Rehome does not distinguish unread stream entries from PEL entries

The candidate explicitly creates a transfer for an old inbox entry with no
receipt (`02-DESIGN-durable-epoch.md:542-556`) and then unconditionally
describes `XACK`/`XDEL` during rehome (`:558-570`). A no-receipt entry can be
either unread (not in the consumer group's PEL) or claimed before the first
SQLite receipt commit. Existing destructive recovery requires an exact
`XPENDING` row and `XACK == 1`
(`gateway/src/core/coordination_queue.js:1256-1337,1728-1795`).

The new Lua algorithm may legitimately use different exact branches for
unread and pending entries, but those branches, their expected return counts,
and their corruption/duplicate rules are absent. The identity slice must
specify both cases and independently test the crash before repository claim;
otherwise “every old delivery” is not an executable Redis contract.

## Adversarial verification matrix

| Required attack | Independent result |
|---|---|
| Paused old repository/handler/vault process | The planned same-transaction repository predicates and destination-side compare-and-commit are the right shape (`02-DESIGN-durable-epoch.md:374-430`), but no implementation exists and recovery-controller failover lacks a sub-fence (P0). |
| Every SQLite/Redis crash boundary and lost reply | Non-expiring epoch install can be confirmed; ACK/rehome proof can expire before SQLite convergence (P1). The release boundary is not representable (P1). |
| Lease and clock races | The design correctly treats expiry as transition eligibility and uses SQLite/Redis clocks locally (`:293-308`); it does not use clock equality as safety. Same-generation recovery lease reuse remains unsafe (P0). |
| Blocking receive | The epoch path correctly forbids blocking `XREADGROUP` (`:469-485`), but the existing managed-client/service blocking path remains reachable (P1). |
| Handler, audit, metrics, and vault | Generic handlers and non-no-op observations are honestly unsupported; same-main vault/repository fencing is planned. Retry/replay callbacks remain unclassified (P2). |
| D1 heartbeat/re-registration | The non-expiring predecessor marker is an appropriate planned guard (`:324-332,463-467`). A crash-created D3 during D2 recovery has no succession transition (P1). |
| Identity-loss inbox entries, with and without receipts | The disposition table is bounded and fail-closed, but rehome cannot preserve both D1 envelope identity and D2 validation (P1); unread versus PEL behavior is under-specified (P2). |
| Transfer/ACK tombstone expiry | Counterexample found: destructive Redis commit plus pause beyond TTL leaves no convergence proof (P1). |
| Redis anchor loss | Same-plane loss after history correctly becomes `recovery_required` and is not reconstructed (`:264-272,613-627`). Duplicated/changed Redis-plane identity is not bound (P1). |
| Active/released snapshot rollback | A retained higher same-plane Redis anchor rejects rollback as designed (`:619-627,758-776`). A matching anchor on another unbound plane is not covered (P1). |
| Same scope across stores/planes | Different local stores are separated only if `storeBindingId` allocation is injective; that property is neither premised nor enforced (P1). |
| Generation exhaustion | Maximum generation is permanent and has no wrap/reset/rotation path (`:365-370,625`); no defect found in this boundary. |
| Capability and lifecycle-lane reachability | Existing Redis lane execution is authority-checked through a `WeakMap` at `gateway/src/core/redis_client_lifecycle.js:41-90,437-454`, and the new recovery facet is only planned. The current managed client still exposes ordinary receive/ACK bypasses (P1). |
| Unsupported production claims | Candidate wording correctly retains WIRING-A test-only support and marks WIRING-B/production profiles planned (`02-DESIGN-durable-epoch.md:778-807`). No production evidence was accepted. |

## Verification performed

- Read the shared-root `AGENTS.md` and
  `.claude/orchestration-profile.md`, plus `plan/README.md`,
  `plan/PROJECT_V5/G/README.md`, the full sheet, full WIRING-A store-identity
  design, ratified human decision, `V5-G-0-02-D01`, Trial 1 handoff, and all
  835 lines of the exact candidate.
- Confirmed candidate commit/tree and that the candidate changes exactly one
  design file with `git diff-tree`/`git show`.
- Inspected all production ports named by the handoff: consumer and replay
  ordering, ACK reconciler, runtime/lineage/provision, repository port and
  SQLite adapter, owner and same-main binding, quarantine vault, managed
  client, service receive/ACK, queue ACK/tombstone/orphan/receive scripts,
  Redis lifecycle lanes, and migrations `002`-`004`.
- Ran the existing cross-inbox guards:

  ```text
  node --test --test-concurrency=1 \
    --test-name-pattern='scope, recipient, and trace context|receive rejects cross-inbox' \
    tests/gateway/coordination_consumer.test.js \
    tests/gateway/coordination_service_receive.test.js
  ```

  Result: `2 passed, 0 failed`; non-matching tests were skipped by the name
  filter. This directly confirms the rehome counterexample.
- `git diff --check
  4236b765fbf18fa519fb4692fea551f9485fe506
  ab2a0f57375485d61033dbf61dea4e48d5c04e99` passed.
- The pre-existing untracked `gateway/node_modules` entry was not read as
  candidate evidence, staged, or modified.

## Not verified and not claimed

- No epoch migration, source, scripts, profile, tests, mutation evidence, or
  live epoch runtime exists to execute.
- I did not run the proposed epoch suite, full CI, a live Redis crash lane, or
  production deployment checks; representing any of those as passing would
  be false.
- I did not validate a production SQLite origin issuer, external effect
  destination, Redis-plane identity authority, health/inventory integration,
  rollout, rollback procedure, promotion, or release.
- I did not modify the candidate, handoff, source, tests, migrations, policies,
  human decision, deferral, or earlier verdicts.

## Required disposition

Keep WIRING-B PLANNED and D01 open. A new immutable design trial must close the
P0 recovery-controller fence and every P1 before implementation is authorized.
It should also resolve both P2 gaps so the later RED/mutation matrix tests the
actual complete protocol rather than inventing missing semantics.
