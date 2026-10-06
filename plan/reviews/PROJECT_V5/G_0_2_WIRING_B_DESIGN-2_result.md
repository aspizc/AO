# Independent Design Review Result — Project V5 G/0/02 WIRING-B Design Trial 2

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 5 |
| P2 | 0 |

Trial 2 materially improves the protocol. The durable recovery term/controller,
D2-to-D3 succession, drain-in-place identity, permanent settlement proof,
separate PEL/unread branches, representable release phase, monotonic released
restart, origin binding, ordinary receive/ACK guards, fixed retry policy, and
replay rejection are all substantially specified.

It is not yet executable or safe as a whole. Bootstrap has no legal durable
pre-Redis reservation, an epoch participant can use the public sender while it
has no runtime authority, release can abandon an unread delivery, existing
public lifecycle scripts can put a fenced source inbox back on a finite TTL, and
the planned root migration would be auto-applied outside the opt-in epoch
profile. Those are protocol/design findings, not implementation findings.

This verdict does not authorize implementation, tests, migrations, policy
changes, integration, rollout, production use, promotion, or release.

## Candidate, request, scope, and reviewer identity

- Review id: `G_0_2_WIRING_B_DESIGN`
- Trial: `2`
- Request commit:
  `27c49bc357bdfb9cbb3e12c980b38ca1338cb896`
- Candidate commit:
  `629480e3410fb7e593cdb4c3934caf329bf8e97b`
- Candidate tree:
  `f5590d310735dbcf2962971c07f792fcac0c2e66`
- Candidate parent:
  `99f38767804180dab2edd51399f9811c81ab03bd`
- Pre-verdict review HEAD:
  `27c49bc357bdfb9cbb3e12c980b38ca1338cb896`
- Review branch: `review/V5-G-0-02-wiring-b-design-t2`
- Review date: `2026-07-30`
- Reviewer session: fresh independent Codex design-review session; it did not
  author the candidate, reuse an author verdict, or delegate review work
- Sub-reviewers: none

Git object inspection authenticated the request, candidate, parent, and tree as
the stated object types. The candidate's parent-to-candidate diff changes
exactly one path:

```text
M plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md
```

The request commit adds exactly the Trial 2 handoff. The handoff also expressly
classifies the candidate as design-only
(`plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-2_to_review.md:15-35`).

The repository orchestration profile normally assigns this design review to
Claude (`.claude/orchestration-profile.md:78-86`). The operator disclosed that
agents-gateway was misconfigured and Claude was unavailable, and explicitly
requested this direct fresh Codex review. This is a reviewer-execution exception
only. It does not lower the evidence standard, make the review self-review, or
change any implementation/integration authority.

## BUILT versus PLANNED

| Classification | Independent ruling and evidence |
|---|---|
| **BUILT** | The current consumer identity includes `toParticipantId`, and the current consumer/service enforce recipient context (`gateway/src/core/coordination_consumer.js:209-235,1003-1013`; `gateway/src/services/coordination_service.js:804-825`). |
| **BUILT** | Current public client/service send, discover, unregister, receive, and ACK paths use ordinary participant credentials (`gateway/src/coordination_client.js:19-24,773-809`; `gateway/src/services/coordination_service.js:1075-1233,1269-1380`). |
| **BUILT** | Current send, participant cleanup, discovery cleanup, receive, and ACK behavior lives in the existing queue Lua scripts. In particular, unregister/discovery can apply `PEXPIRE` to an orphan inbox (`gateway/src/core/coordination_queue.js:498-588,782-882,2845-2968`). |
| **BUILT** | WIRING-A's owner generation starts at 1 and has only `owned`/`released` states (`gateway/migrations/004_coordination_consumer_runtime_owner.sql:3-19`). Both the application state loader and current WIRING-A test profile discover every root SQLite migration (`gateway/src/core/state.js:11-38,60-77`; `gateway/src/core/coordination_consumer_runtime_test_profile.js:85-107,199-208`). |
| **PLANNED** | Migration `005`, every epoch/term/guard/proof Lua command, epoch-bound repository/effect facet, recovery controller, release/restart transition, epoch-only profile, and every directed epoch test remain design text (`plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md:21-33,1208-1392`). |
| **PLANNED / unsupported** | Production origin and effect profiles, generic handlers, health/inventory, automatic crash recovery, rollout, promotion, and release remain unsupported (`plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md:21-29,814-838,1422-1459`). |

## Findings

### P1 — Bootstrap cannot durably reserve generation 1 before Redis leads

The existing owner schema permits generations only from 1 and has no
initializing state
(`gateway/migrations/004_coordination_consumer_runtime_owner.sql:3-19`).
Trial 2's companion schema also starts at generation 1 and permits only
`active`, `fencing`, `recovering`, `releasing`, `released`, or `faulted`;
`fencing` requires a pre-existing owner generation and exactly
`pending_generation = generation + 1`
(`plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md:239-278`).

The bootstrap order nevertheless says the adapter reserves `0 -> 1`, installs
Redis generation 1, and only then commits the owner/companion pair as
`recovering(1,term=1,D1,installing)` (`:513-534`). No schema row defined by the
design can store that first reservation before Redis installation.

Minimal schedule:

1. B1 admits a fresh bound empty store/namespace and creates D1's guard.
2. The stated `0 -> 1` reservation is only process-local because neither
   existing nor planned schema has a legal durable shape for it.
3. The Redis generation-1 `fenced` install commits; its reply is lost and B1
   crashes before the `recovering` SQLite transaction.
4. SQLite still has no owner/companion phase from which bootstrap can resume.
   A fresh bootstrap is ineligible because the Redis epoch key now exists, and
   the stated resume rule requires an exact stored phase/tuple.

The first violated invariant is “Redis may never lead with an unreserved
generation/term” (`:719-721`); the exact-phase bootstrap-resume promise also has
no durable input (`:532-534`).

Smallest correction: define one legal durable bootstrap reservation committed
in `main` before the first Redis epoch write. This can be a bootstrap-only
initializing shape, or an explicitly legal owner/companion generation-1
`recovering/installing` reservation whose absent-key Redis install is then
confirmed. In either case, withhold all permits and credentials until the exact
SQLite/Redis confirmations. Add lost-reply/crash and B1/B2/B3 succession tests
before and after every bootstrap SQLite/Redis boundary.

### P1 — Public SEND checks only the recipient epoch guard, not the sender

The managed client publicly exposes `send`
(`gateway/src/coordination_client.js:19-24,773-809`). The service authenticates
the sender's ordinary presence/lease, then passes ordinary sender and recipient
lease fences to `putMessage`
(`gateway/src/services/coordination_service.js:1177-1233`). The current script
checks those presence records and performs dedupe/`XADD`
(`gateway/src/core/coordination_queue.js:782-882`).

Trial 2 extends `SEND_MESSAGE_SCRIPT` with only the **recipient** guard. It
allows an absent ordinary recipient guard or an exact active recipient guard
and rejects guarded non-active recipients
(`plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md:881-889`). It does not pass or
check the sender's epoch guard.

Minimal schedule:

1. D2 is live and guarded at
   `recovering(g,t,D2,installed)`. SQLite and Redis correctly withhold active
   runtime authority.
2. Code retaining D2's ordinary managed-client credentials invokes public
   `send` to a live ordinary participant O whose recipient guard is absent.
3. Service authentication succeeds. The planned recipient-only check also
   succeeds, so dedupe, `XADD`, and the send event commit.
4. D2 has produced an externally visible transport effect while the authority
   table permits only exact recovery operations and explicitly excludes normal
   work.

The first violated invariants are that a process holds only its current permit
class and that `recovering` grants no normal authority
(`plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md:712-718,730-738,594-595`).
The same sender-side omission exists in `fencing`, `releasing`, and `released`
whenever an ordinary presence call is already in flight or remains live.

Smallest correction: pass both sender and recipient guard keys to the atomic
send script. An epoch-guarded sender must be accepted only under the exact
phase/coordinate explicitly authorized for outbound send (at minimum reject
every non-active phase), before dedupe, `XADD`, or event append. Name the
service/client status mapping and add public-send REDs for every sender phase,
lower generation/term, delayed calls, and all ordinary/guarded recipient
combinations.

### P1 — Release can seal an unread delivery that no future controller drains

Release stops local admission, commits SQLite `releasing`, then changes the
Redis guard. Its closing predicate checks ACK intents, claims,
recovery-required state, and uncommitted observations, but not `XLEN`, PEL, or
an exact source-empty witness
(`plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md:642-673`). While the recipient
guard is still `active`, the planned send rule expressly allows sends to that
participant (`:881-889`).

Minimal schedule:

1. Dn's inbox already contains unread message M when orderly stop begins, or a
   remote sender appends M after SQLite step 2 and before Redis step 3.
2. No consumer receipt or ACK intent exists for M. Every predicate in release
   step 4 therefore passes.
3. SQLite and Redis become `released(g)`.
4. Restart sets no previous participant and checks retained historical sources
   plus the **new** controller's own inbox (`:675-695`). Released Dn was never
   inserted as an open source, so no later recovery branch visits M.

The first violated invariant is the required fail-closed, at-least-once
disposition for identity-loss delivery
(`plan/PROJECT_V5/G/0/02.md:273-281`); it also contradicts Trial 2's statement
that every old delivery reaches a disposition
(`plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md:1029-1044`).

Smallest correction: close Redis send admission for Dn and obtain an exact
post-fence `XLEN == 0` plus empty-PEL witness before `released` can commit. If
the source is nonempty, durably insert Dn as an open recovery source and enter a
defined recovery/takeover path instead of `released`; do not discard or expire
the source identity. Add pre-existing unread, PEL, concurrent send, lost reply,
and crash tests at every release boundary.

### P1 — Public discovery/unregister can expire a fenced source inbox

Trial 2 says epoch installation removes predecessor presence while preserving
its inbox and makes the old participant unable to discover or unregister
(`plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md:574-582`). Its guard changes
name only receive/reclaim/fence/ACK and recipient-send scripts (`:871-904`).
They do not name the two existing lifecycle cleanup scripts.

Current behavior is destructive to retention:

- `DELETE_PARTICIPANT_SCRIPT` applies `PEXPIRE` to the inbox both when presence
  is already absent and after successful unregister
  (`gateway/src/core/coordination_queue.js:498-535`);
- `LIST_PARTICIPANTS_SCRIPT` applies `PEXPIRE` when a scanned participant has
  no presence (`gateway/src/core/coordination_queue.js:538-588`);
- their public queue/service paths are reachable at
  `gateway/src/core/coordination_queue.js:2845-2968` and
  `gateway/src/services/coordination_service.js:1075-1175`; and
- the configured orphan-inbox TTL is 24 hours
  (`gateway/src/core/coordination_contract.js:10-12`). Existing directed tests
  expressly require those `PEXPIRE`s
  (`tests/gateway/coordination_queue_presence.test.js:228-279,323-364`).

Minimal schedules:

1. D1 has unread or PEL work. An unregister call authenticates D1 immediately
   before fencing, or an unrelated ordinary participant's discovery scan
   captures D1's registry member.
2. Epoch installation removes D1 presence, writes its non-expiring guard, and
   retains the inbox.
3. The already admitted unregister/discovery script runs after installation.
   It never receives the epoch guard, sees missing presence, and applies
   `PEXPIRE` to D1's inbox.
4. Recovery pauses beyond 24 hours. The source stream disappears without an
   exact settlement proof or SQLite disposition.

The first violated invariant is that TTL expiry or clock passage never creates
authority or destroys required epoch evidence
(`plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md:722-728`); the promised
predecessor-inbox preservation is false under a supported public race.

Smallest correction: enumerate `LIST_PARTICIPANTS_SCRIPT` and
`DELETE_PARTICIPANT_SCRIPT` (and any registration/renewal cleanup branch) as
epoch-guard consumers. They must atomically prohibit TTL/delete for a guarded
source, and epoch fencing must `PERSIST` the source inbox before returning.
Add stale `SSCAN` page and authenticated-unregister races spanning the epoch
install, plus independently killable no-TTL/no-delete mutations.

### P1 — Root migration `005` would silently reach non-epoch stores

The candidate says migration `005` is admitted only for a distinct empty
WIRING-B profile and is not an online part-A upgrade
(`plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md:216-221`). It also says WIRING-A
is unchanged, no store is silently upgraded, and rollout is opt-in on a fresh
profile-created store (`:31-33,101-108,1422-1440`).

The declared implementation path is nevertheless the shared root
`gateway/migrations/005_coordination_consumer_runtime_epoch.sql`
(`:1394-1416`). Current application initialization lists and applies every root
`.sql` migration to any SQLite state
(`gateway/src/core/state.js:11-38,60-77`). The existing WIRING-A disposable
profile does the same for every newly created store
(`gateway/src/core/coordination_consumer_runtime_test_profile.js:85-107,199-208`).
Neither loader/profile is included in the candidate's path scope.

Minimal schedule:

1. Implementation adds `005` at the required root path.
2. An existing production SQLite state next calls `initState`, or WIRING-A
   creates its next disposable store.
3. The generic migration enumerator sees and executes `005` before any
   epoch-origin admission decision.
4. The store is silently schema-upgraded; if `005` instead rejects nonempty
   stores, ordinary startup is broken. Both outcomes contradict the declared
   opt-in boundary.

The first violated invariant is the explicit “never silently upgraded” profile
boundary (`plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md:31-33`).

Smallest correction: design a profile-specific migration set or explicit
allowlist that keeps `005` unreachable from production and WIRING-A loaders,
and include the exact loader/profile owners in path scope. Add tests proving
existing, fresh WIRING-A, and ordinary application stores never enumerate or
apply `005`, while only the origin-owning epoch profile can apply it to its
fresh empty store.

## Trial 1 closure ledger

| Immutable Trial 1 finding | Trial 2 adversarial ruling |
|---|---|
| P0 same-generation controller fence | **Closed at design level.** `R=(E,term,controller)` is durable and every named recovery authority compares it; higher-term Redis install rejects delayed lower-term commands (`02-DESIGN-durable-epoch.md:51-70,449-461,597-628`). |
| P1 D2-to-D3 succession | **Closed at design level.** The expired-controller SQLite CAS advances term, changes identity, inserts the superseded controller as a source, and withholds the permit through exact Redis confirmation (`:597-628`). |
| P1 recipient/rehome contradiction | **Closed at design level.** Transfer/rehome is absent; each original source is drained in place with unchanged recipient and consume identity (`:982-1027`). |
| P1 proof retention | **Closed at design level.** Generation/term/controller-bound proof is non-expiring, conflict is closed, and runtime GC is prohibited (`:474-509,925-958`). |
| P1 release legality/restart | **Not closed as an end-to-end protocol.** The phase is representable and restart is monotonic, but release can strand unread work (finding 3). |
| P1 store/Redis binding | **Closed under the explicit theorem boundary.** Server allocation, immutable authority/namespace/ordinal binding, collision rejection, and copied-origin rejection are specified; a perfectly indistinguishable live clone is honestly excluded (`:355-419,160-177`). The migration rollout remains independently defective (finding 5). |
| P1 ordinary managed-client bypass | **Partially closed.** Ordinary receive/reclaim/fence/ACK and blocking receive gain script-level guards, but public sender and lifecycle cleanup remain unfenced (findings 2 and 4). |
| P2 callbacks/replay | **Closed at design level.** The retry registry is fixed/pure and replay rejects before authorization or repository work (`:840-855`). |
| P2 unread versus PEL | **Closed at design level.** PEL and unread have separate nonblocking commands, exact shapes/counts, pending ownership, finalization counts, and crash behavior (`:1046-1096`). |

Because release and public managed-operation closure remain incomplete, the
required condition that every Trial 1 finding be closed is not met.

## Required adversarial attack matrix

| Required attack | Independent result |
|---|---|
| R1/R2/R3 at every recovery SQLite/Redis boundary | **Pass at design level after a durable epoch exists.** The CAS/install/readback order, lost-term-install reply, D2/D3/D4 succession, and delayed lower-term rejection are explicit (`02-DESIGN-durable-epoch.md:455-461,597-628,1137-1169`). Bootstrap has no first durable reservation (finding 1). |
| Exact active/recovery shapes and activation races | **Private/store path passes.** Claims encode active versus recovery authority separately (`:306-348,742-794`). SQLite may reach `A` before Redis, lost activation reply is read back, and no runtime permit issues early (`:1098-1131`). Public sender and release admission are exceptions (findings 2 and 3). |
| Lower-generation and lower-term takeover | **Pass at design level.** The current installed controller may atomically take lower-generation active claims and current-generation lower-term recovery claims, while direct-active/recovery domains remain separate (`:790-794`). Proof, lease, ACK, completion, and transport commands are assigned exact `E/R/A` predicates (`:708-788,908-958`). |
| Drain-in-place identity | **Pass at design level.** No transfer schema/key/command exists; source recipient, envelope, delivery ID, and `consumeKey` remain unchanged, matching current service/consumer guards (`:982-1027`). |
| PEL versus unread | **Pass at design level.** Separate bounded `XAUTOCLAIM` and nonblocking `XREADGROUP ... >` branches validate cursors, exact entries, `XPENDING`, `XACK`, `XDEL`, and crash-from-unread-to-PEL (`:1046-1096`). |
| Proof retention/conflict/delete/GC | **Pass at design level.** Proofs have no TTL, exact replay is idempotent, conflict is unknown state, and deletion/GC requires a separately reviewed watermark protocol (`:474-509,925-958`). |
| Release/restart and active-to-release race | **Fail.** State shapes and monotonic generation are legal, but unread/concurrent work can be released without a future source (finding 3). |
| Redis/store allocation, collision, copy, and lower snapshot | **Pass within the explicit no-cloning premise.** Forced ordinal collision/counter rollback and wrong authority/namespace/capability are closed; copied distinguishable origins reject; a perfect dual-live clone is explicitly outside the theorem (`:355-419,1183-1203`). |
| Public receive/reclaim/ACK and blocking receive | **Pass at design level.** Each existing receive/reclaim/fence/ACK script is assigned an atomic guard before blocking/read/mutation, including both sides of blocking receive (`:857-904`). |
| Public SEND and activation/send race | **Recipient side passes; sender side fails.** Recovering recipient remains closed until exact Redis `A`, including lost reply (`:1098-1131`). A recovering/releasing sender is not checked (finding 2), and release admits a recipient race (finding 3). |
| Public lifecycle reachability | **Fail.** Discovery/unregister can apply finite inbox TTL after fencing (finding 4). |
| Callback, retry, replay, handler, observation, vault | **Pass at stated support boundary.** Pure fixed retry and pre-work replay rejection are explicit; generic handler/non-no-op observation/external unfenced effect profiles remain unsupported (`:796-855`). Same-main vault/repository fencing is planned, not built. |
| External premises and production boundary | **Explicit and honestly bounded.** Six premises identify SQLite/Redis atomicity, destination fencing, origin binding, no cloning/rollback, and raw-access exclusion (`:160-181`). The disposable profile can test distinguishable origin/collision cases; a perfectly cloned writable pair is explicitly outside the theorem, not claimed safe. |
| Executable decomposition and mutation owners | **Incomplete.** The five named sub-slice owners cover most epoch predicates (`:1208-1392`), but no owner/path accounts for bootstrap's legal reservation, sender guard, lifecycle cleanup scripts, release empty-source disposition, or shared migration enumeration (findings 1–5). |
| Rollout/rollback | **Fail before rollout.** Offline/no-clone rollback is bounded, but shared migration discovery contradicts the claimed opt-in fresh-store rollout (finding 5). |
| Current-source citations | **Cross-checked.** The candidate's cited identity, service, queue, migration, repository, ACK, runtime, lineage, provision, vault, and Redis-lane surfaces were compared with the current request tree; the findings above cite the first conflicting production boundaries. |

## Verification performed

- Read the shared-root `AGENTS.md` and
  `.claude/orchestration-profile.md`, `plan/README.md`,
  `plan/PROJECT_V5/G/README.md`, the full G/0/02 sheet, the full 1,560-line
  candidate, Trial 2 handoff, immutable Trial 1 KO, D01, WIRING-A design and
  ratification, and every production/schema/migration source needed for the
  schedules above.
- Authenticated the exact request/candidate/parent/tree and exact one-file
  candidate scope with `git rev-parse`, `git cat-file`, and `git diff-tree`.
- Inspected current consumer/retry/replay, repository and ACK operations,
  reconciler, owner/schema, runtime/provision/lineage, vault, managed client,
  service send/receive/ACK/discovery/unregister, queue send/receive/ACK/recovery/
  lifecycle scripts, migration discovery, and Redis lifecycle lanes.
- Attempted the two focused presence-script tests. Node failed during module
  loading with `ERR_MODULE_NOT_FOUND` for package `redis`; therefore no test was
  executed or credited. Static source and the existing directed assertions
  independently establish the `PEXPIRE` behavior cited in finding 4.
- No epoch implementation or live epoch integration test exists in this
  design-only candidate, so none is represented as passing evidence.

## Required disposition

Keep `V5-G-0-02-D01` open and WIRING-B `PLANNED`. A Trial 3 design needs only
the five corrections above; it should preserve the Trial 2 controller-term,
drain-identity, proof-retention, PEL/unread, callback/replay, and origin-binding
work that survived this review.
