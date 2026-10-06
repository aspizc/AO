# Independent Production Design Review Result — Project V5 G/0/02 WIRING-B Design Trial 3

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 4 |
| P2 | 3 |

Trial 3 closes the durable bootstrap-reservation finding and the fenced-inbox
lifecycle-retention finding. Its controller succession, drain-in-place
identity, permanent guards/proofs, separate PEL/unread recovery, origin binding,
and ordered activation are materially stronger and remain design-level
survivors.

The design is still not executable as one closed protocol. The current public
service can decide before the promised atomic SEND result exists, the empty
release branch loses the only derivable release authority between its SQLite
and Redis commits, the exported ordinary queue can recreate a missing guarded
stream/group as apparently empty, and all three frozen SQLite sets omit a real
current root migration. These are design findings grounded in existing
contracts, not findings from an attempted implementation.

This verdict reviews only the authenticated design candidate. It does not
authorize or claim implementation, test completion, migration, integration,
promotion, production support, rollout, or release.

## Candidate, request, scope, and reviewer identity

### Authenticated candidate object

- Review id: `PROJECT_V5/G_0_2_WIRING_B_DESIGN-3`
- Candidate commit:
  `4529fa6305661161a5da27eb68dc613c47087b6c`
- Candidate tree:
  `740b233d5d012efc5c27b011807d3ff80917bc27`
- Sole parent:
  `e31bc714166e3b814d1c417ba4ddf1358cd3abd8`
- Subject:
  `docs(coordination): correct durable epoch design (V5 G/0/02 WIRING-B Trial 3)`
- Candidate Git blob:
  `83dd27345bea5e53a7e4bf83774eb6981dab8cc1`
- Committed design SHA-256:
  `ac358660ebf72556f2fd408218ad176f427b965c15d1c8c78d7e2018a6b4ce8a`

Independent Git-object inspection resolved the candidate as a commit with the
tree and sole parent above. Its exact parent-to-candidate scope is:

```text
M plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md
543 135 plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md
```

No second candidate path exists in that diff. The SHA-256 was recomputed from
the blob read from the candidate object, rather than trusted from the request.
The candidate range passed `git diff --check`.

### Authenticated request object

- Request/pre-verdict HEAD:
  `19c40db11e764092a0b2dfd54f5a686120c78838`
- Request tree:
  `b64cdd65f1c580b0ae388d5c5f166937769ebf62`
- Sole parent:
  `4529fa6305661161a5da27eb68dc613c47087b6c`
- Request Git blob:
  `1f0dbfc6525dea7e10b7efa7f3ff03b6a9fdc96f`
- Request file SHA-256:
  `bb6441c89a7c0e96a04227e79c6ca42def89a01780b4bfafbf08a8842d77236b`

Its exact parent-to-request scope is:

```text
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-3_to_review.md
339 0 plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-3_to_review.md
```

The request range also passed `git diff --check`. The request's two invalid
Trial 2 object references are adjudicated separately as P2-02; they do not alter
the successfully authenticated Trial 3 candidate/request ancestry.

### Reviewer independence and orchestration adjudication

- Review branch: `review/V5-G-0-02-wiring-b-design-3`
- Review date: `2026-07-30`
- Reviewer: fresh operator-appointed Codex production-design review session
- Candidate authorship: none
- Sub-reviewers/delegation: none

The reviewer independently read the candidate object, both earlier design
trials and requests/results, the governing project/stage/sheet documents, and
the current production files named by the design. No author verdict was reused.

The Trial 3 request discloses direct operator-supervised `tmux` because
Gateway/KYA was unusable and says the Claude lane was unavailable or failing
(`G_0_2_WIRING_B_DESIGN-3_to_review.md:75-87`). That disclosure does not match
the standing repository exception as written:

- official review sessions are created through the Gateway;
- direct root-created `tmux` is limited to throwaway diagnostics or a lane
  outside `AGENTS_REPO_ROOTS`, with retroactive trace/task/artifact registration;
  and
- the KYA profile is for driving the KYA repository, not this repository's
  self-work.

Those rules are at the repository-parent
`.claude/orchestration-profile.md:20-33,43-58`. This worktree is inside the
configured repository root, and the handoff supplies no Gateway trace, task,
session, artifact, or intervention identifiers. The claimed Gateway failure and
Claude unavailability/failure therefore remain unauthenticated execution-path
disclosures, not profile-compliance evidence (P2-03).

The operator explicitly appointed this fresh Codex reviewer. That higher-level
appointment is sufficient to perform this independent review, but it does not
retroactively prove the supported Claude cross-vendor route
(`.claude/orchestration-profile.md:78-86`) or lower the review standard.

## Evidence boundary: BUILT versus PLANNED

| Classification | Independent evidence |
|---|---|
| **BUILT** | Generic state startup enumerates and applies every root SQLite `.sql` migration (`gateway/src/core/state.js:11-38,60-77`). |
| **BUILT** | The WIRING-A disposable profile independently enumerates and applies every root SQLite `.sql` migration (`gateway/src/core/coordination_consumer_runtime_test_profile.js:33-39,85-108,199-208`). |
| **BUILT** | Root migration `002_lifecycle.sql` alters three live tables and creates `lifecycle_transitions` (`gateway/migrations/002_lifecycle.sql:1-86`). |
| **BUILT** | Public service methods pre-read participant presence and authenticate before the queue call; `send` also pre-reads the recipient (`gateway/src/services/coordination_service.js:1031-1058,1075-1090,1132-1158,1177-1228,1269-1302,1331-1353`). |
| **BUILT** | The managed client treats `COORDINATION_AUTH_FAILED`, `COORDINATION_LEASE_EXPIRED`, `COORDINATION_LEASE_CHANGED`, and `COORDINATION_LEASE_NOT_FOUND` as lease loss and begins rejoin (`gateway/src/coordination_client.js:19-30,773-808`). |
| **BUILT** | The exported Redis queue exposes unguarded `ensureInboxGroup`, which issues `XGROUP CREATE ... MKSTREAM`; current contract tests require that behavior (`gateway/src/core/coordination_queue.js:3256-3276,3292-3294`; `tests/gateway/coordination_queue_contract.test.js:222-279`). |
| **BUILT** | The current runtime accepts `consumerFault`, `reconciliationFault`, and provision lifecycle callbacks; `lifecycle.beforeRelease` is awaited before exact owner release (`gateway/src/core/coordination_consumer_runtime.js:188-202,246-285,409-424`). |
| **PLANNED** | `sqlite_migration_sets.js`, the profile-directory migration `005`, the epoch profile, all epoch guards/permits/transitions, and the directed epoch suites do not exist at the reviewed request object. |
| **PLANNED / unsupported** | The candidate itself keeps generic handlers, production origins/effects, health/inventory, online upgrade, promotion, and release unsupported (`02-DESIGN-durable-epoch.md:1001-1027,1801-1846,1912-1913`). |

## Trial 2 P1 closure rulings

| Trial 2 finding | Trial 3 ruling | Result |
|---|---|---|
| P1-1 — no durable generation-1 bootstrap reservation | The owner plus legal `initializing` row commits before any generation-scoped Redis/credential/permit authority; B1/B2/B3 succession is derivable | **PASS** |
| P1-2 — public SEND checks only the recipient | The Lua subcontract checks both endpoints, but the real public service cannot reliably reach or map that result; the design also contradicts itself for lower coordinates | **FAIL — P1-01** |
| P1-3 — release can strand unread work | The Redis fence and empty/nonempty decision are specified, but the empty branch is not crash-resumable and an ordinary queue bypass can manufacture apparent emptiness | **FAIL — P1-02/P1-03** |
| P1-4 — lifecycle cleanup can TTL/delete a fenced inbox | Guard consumption, stale-page/authenticated-unregister ordering, and `PERSIST`-before-cleanup close the retention mutation | **PASS** |
| P1-5 — profile migration leaks through root scanning | Profile-directory `005` is isolated, but the proposed frozen baselines omit current root migration `002_lifecycle` | **FAIL — P1-04** |

### Trial 2 P1-1 — PASS: bootstrap authority is durably reserved

The legal pre-state is a fresh, profile-created and bound origin with no
scope owner/companion, epoch, participant, ACK, source, proof, or vault state
(`02-DESIGN-durable-epoch.md:623-630`). One `BEGIN IMMEDIATE` transaction is the
authority linearization point: it atomically commits the existing legal
`owned,generation=1` row and
`initializing(1,term=1,B1,installing,deadline)` before returning the opaque
reservation (`:632-646`). No B1 guard, presence, credential, or permit exists
before that commit.

The subsequent private Redis command consumes that reservation and atomically
creates the recovering epoch, guard, private presence/registry, canonical
stream/group, and persistent inbox. A lost reply is resolved only by exact
readback; credentials and the recovery permit remain withheld until the second
SQLite confirmation and Redis agreement (`:645-662`). The sole resumes at each
crash boundary are enumerated at `:677-689` and repeated in the crash matrix at
`:1409-1414`.

The apparent lower-term tension is resolved by separating a historical
transport install from current authority:

1. B2/B3 succession first advances the durable `initializing` controller term
   and records every superseded ID as an open source.
2. A delayed B1/B2 command may put only its **previously durable-reserved**
   lower tuple into absent/lower Redis.
3. It receives no credential or permit because current SQLite already names a
   higher term.
4. The newest controller advances Redis; once Redis is equal/higher, every
   lower command rejects.

Thus the lower tuple is a recoverable transport floor, not resurrected
authority (`:664-675`). Redis allocation/binding work necessarily predates the
scope reservation, but it is not a generation/controller write and yields no
B1 identity or epoch authority. The design's REDs cover pre-reservation writes,
lost replies, B1/B2/B3 orders, and delayed lower commands
(`:1578-1587`); `EPOCH-CORE` and `EPOCH-WIRING` own the corresponding mutations
(`:1698-1703,1750-1756`). An unreserved generation-1 command has the closed
internal `BOOTSTRAP_RESERVATION_REQUIRED` result (`:1462-1464`); there is no
public epoch DTO.

### Trial 2 P1-2 — FAIL (P1-01): the atomic SEND result is not the public linearization result

The candidate's Lua-level order is otherwise explicit: sender guard, recipient
guard, dedupe lookup/renewal, `XLEN`, `XADD`, dedupe `SET`, then event append.
Every endpoint reject precedes all dedupe TTL/value, stream, and event mutation
(`02-DESIGN-durable-epoch.md:1086-1109`). It also assigns sender-first
dual-failure and service/client mappings (`:1111-1127`) and directed endpoint
matrix/mutation owners (`:1633-1641,1727-1731,1754-1756`).

That atomic result is not reachable under a required current schedule:

1. Exact epoch install/release removes the guarded sender's ordinary presence
   while retaining its non-expiring guard.
2. A retained managed-client `send` reaches the current service.
3. The service reads the sender before `putMessage`; absence returns
   `COORDINATION_AUTH_FAILED` without invoking the Lua command
   (`gateway/src/services/coordination_service.js:1177-1188`).
4. The managed client classifies that code as lease loss and begins rejoin
   (`gateway/src/coordination_client.js:25-30,799-807`).

The specified result was instead
`COORDINATION_EPOCH_MANAGED_OPERATION_REQUIRED`, with no lease-loss
classification and no rejoin. When both endpoints are non-active, the same
preflight prevents the promised sender-first queue status. When only the
recipient presence is absent, the service returns target-not-found before the
recipient guard/epoch can classify malformed or contradictory transport state
(`coordination_service.js:1188-1196`). The analogous presence preflights also
make the candidate's exact guarded renew/discover/unregister/receive/ACK public
statuses unreachable, although those early exits do not themselves mutate a
guarded inbox.

The design acknowledges that service checks are not evidence
(`02-DESIGN-durable-epoch.md:1433`) and lists surgical service/client paths
(`:1768-1782`), but gives no end-to-end input/authority contract that reaches
Lua after these preflights while preserving authentication. A named RED does
not supply the missing public linearization.

There is also an internal closed-result contradiction. Section 5.1.1 classifies
**lower or higher generation/term** for either endpoint as
`transport_state_unknown` (`:1098-1102`), while the failure table classifies a
lower-generation/term sender as `epoch_sender_not_active` (`:1482-1484`).
Those results map to different public errors and different client behavior.
The exact public status therefore cannot be derived even if the Lua command is
reached.

### Trial 2 P1-3 — FAIL (P1-02): the empty release branch loses resumable authority

The candidate correctly moves the Redis SEND fence before the source decision,
requires exact `XLEN == 0` plus empty PEL, opens Dn and reserves `g+1`
atomically for known nonempty work, and faults ambiguity/exhaustion rather than
releasing (`02-DESIGN-durable-epoch.md:801-840`). The sender-before/after-fence
ordering and stable witness are also explicit (`:842-863`).

The empty branch nevertheless has this closed crash schedule:

1. The release permit resolves exact active authority `A`
   (`02-DESIGN-durable-epoch.md:842-845`).
2. Step 5 consumes the empty witness and commits SQLite
   owner/companion `released(g)` (`:821-825`).
3. By the schema, `released` clears every participant/controller identity and
   permits only monotonic restart reservation (`:326-345`).
4. The process crashes before step 6 changes Redis
   `releasing(g,term,Dn) -> released(g)`.
5. The process-local release permit is gone. It cannot be reconstructed from
   exact `A` because SQLite no longer contains `A`, and restart is expressly
   ineligible until Redis is already confirmed released (`:832-866`).

The crash table asserts that “exact confirmation advances Redis only”
(`:1447`) but names no durable transition identity, witness, sealed-adapter
reacquisition rule, or legal `released` mutation that authorizes it. This is
not merely a lost-reply ambiguity: Redis may still be definitively
`releasing`, yet no sole legal actor can derive the step-6 mutation. By
contrast, activation explicitly defines sealed-adapter witness reacquisition
after its SQLite-first commit (`:1395-1401`); release does not.

Known nonempty, ambiguous, lost-witness, and exhausted branches are derivable,
but this empty-branch crash can strand the scope permanently. P1-03 below also
shows that the release predicate itself can be made falsely empty through an
existing public queue method.

### Trial 2 P1-4 — PASS: guarded lifecycle cleanup cannot restore finite retention

The four lifecycle Lua families consume caller/target guards before their
mutation branches. Every present guard first `PERSIST`s its inbox; guarded
register/renew/delete rejects without presence, registry, TTL, delete, or event
mutation, while list omits a non-active target and never expires/deletes its
inbox (`02-DESIGN-durable-epoch.md:1129-1140`).

For a stale `SSCAN` page or authenticated unregister, the lifecycle Lua
command and epoch fence provide the total order. If cleanup wins, the later
fence `PERSIST`s; if the fence wins, the cleanup script observes the guard,
`PERSIST`s, and cannot reach `PEXPIRE`/delete (`:1141-1158,1436`). The epoch
guard itself is never deleted or TTLed (`:583-597`), and no transfer/rehome
surface is introduced (`:1251-1258`).

The service can still return a different early public result when presence has
already been removed, as recorded under P1-01, but that path performs no
destructive queue mutation. The direct Trial 2 retention finding is therefore
closed. REDs and independently killable mutations cover register/renew/list/
delete, stale page, authenticated unregister, `PTTL == -1`, and
`PERSIST`-before-cleanup (`:1642-1645,1730-1733`).

### Trial 2 P1-5 — FAIL (P1-04): the frozen sets omit a real current migration

Moving `005` to a profile directory and replacing unbounded root discovery with
closed sets is the correct isolation shape. The actual declared sets are not
the current database baseline. Each contains:

```text
001_initial
002_coordination_consumer
003_coordination_ack_outbox
004_coordination_consumer_runtime_owner
```

and the epoch set adds only profile-directory `005`
(`02-DESIGN-durable-epoch.md:249-289`). The repository also has the root
`gateway/migrations/002_lifecycle.sql`. Both current loaders enumerate it, and
it supplies lifecycle columns plus the `lifecycle_transitions` table used by
the application (`gateway/src/core/state.js:14-38`;
`gateway/src/core/coordination_consumer_runtime_test_profile.js:85-108`;
`gateway/migrations/002_lifecycle.sql:1-86`).

The exact consequences are:

- a fresh generic database under the proposed set silently lacks the current
  lifecycle schema;
- a fresh WIRING-A database lacks the same schema;
- an existing or reopened generic/WIRING-A database has applied
  `002_lifecycle`, which the candidate requires to reject as an applied
  migration outside the selected set; and
- the epoch set inherits the same missing baseline before applying `005`.

Thus the promised fresh/existing/reopened and cross-profile behavior
(`02-DESIGN-durable-epoch.md:284-290,1588-1591`) rejects valid current stores or
creates incomplete new ones. The migration RED and mutation owner are present
(`:1740-1741,1752`), but their literal expected set is wrong, so Trial 2 P1-5
remains open.

## Additional findings

### P1-03 — `ensureInboxGroup` can normalize unknown guarded transport into false empty

The release proof treats missing/malformed/wrong-type stream or group state as
`transport_state_unknown` and allows `source_empty` only for exact
`XLEN == 0` plus empty PEL (`02-DESIGN-durable-epoch.md:814-831`). The current
exported ordinary queue still exposes:

```text
XGROUP CREATE <participant inbox> coordination-v1 0 MKSTREAM
```

with no participant guard or epoch check
(`gateway/src/core/coordination_queue.js:3256-3276,3292-3294`). Existing
contract tests require the method and its `created`/`exists` results
(`tests/gateway/coordination_queue_contract.test.js:222-279`).

Reproducible schedule:

1. SQLite and the participant guard are exact `releasing(g,term,Dn)`, but the
   guarded source stream/group is missing. Release must fault unknown.
2. Code holding the exported ordinary queue calls `ensureInboxGroup(Dn)`.
3. `MKSTREAM` creates a canonical, empty stream and group without consulting
   the non-expiring guard.
4. The release-source command now observes exact zero `XLEN` and zero PEL and
   can issue the empty witness.
5. If durable predicates are otherwise closed, SQLite/Redis release falsely
   succeeds instead of preserving the original unknown transport result.

This is not excluded as a raw-Redis attacker: the design expressly puts queue
object reachability inside its capability and RED boundary
(`02-DESIGN-durable-epoch.md:213-239,1669-1671`). The lifecycle list covers four
script families but not `ensureInboxGroup`; no RED, semantic guard, or mutation
owner names stream/group creation after an epoch guard exists. It defeats the
release ambiguity invariant without deleting the guard itself.

### P2-01 — current lifecycle/fault callbacks are outside the declared callback RED boundary

The design explicitly rejects arbitrary handlers, non-no-op audit/metrics,
caller retry classifiers, and replay/`authorizeReplay`
(`02-DESIGN-durable-epoch.md:1001-1060`). That preserves those named Trial 2
survivors.

The current runtime also accepts `consumerFault`, `reconciliationFault`, and a
provisioned `lifecycle.beforeRelease`; the last is awaited before exact owner
release (`gateway/src/core/coordination_consumer_runtime.js:188-202,246-285,409-424`).
None is named in the candidate's callback rejection contract, RED list, or
mutation-owner matrix. A paused `beforeRelease` callback can resume after lease
expiry and controller/generation succession while still performing whatever
caller effect it encapsulates. Fault callbacks have the same unclassified
effect surface.

The generic “callbacks remain unsupported” boundary points in the safe
direction, but the implementation decomposition does not say whether these
actual accepted inputs are rejected, replaced, or fenced, and no realistic
one-line mutant is assigned. Because WIRING-B remains an unsupported test
profile and the named business/audit/retry/replay boundaries are otherwise
closed, this is P2 test/decomposition incompleteness rather than a production
implementation claim.

### P2-02 — the immutable request names two nonexistent Trial 2 objects

The Trial 3 request records Trial 2 request
`27c49bc93167e346347c700360786e5e85a8d4cd` and Trial 2 candidate
`629366c7746fd13cdc11cb29737121e16a401edc`
(`G_0_2_WIRING_B_DESIGN-3_to_review.md:40-49`). Neither resolves as a Git
object.

The immutable Trial 2 result and repository ancestry resolve the actual objects
as:

- request `27c49bc357bdfb9cbb3e12c980b38ca1338cb896`; and
- candidate `629480e3410fb7e593cdb4c3934caf329bf8e97b`.

The direct Trial 3 parent and the Trial 3 candidate/request authentication are
correct, so this is a review-trail precision defect rather than a candidate
authentication failure.

### P2-03 — the tmux/Gateway/KYA/Claude exception is disclosed but not evidenced

As adjudicated under reviewer identity, this in-root worktree does not satisfy
the profile's standing “cwd outside `AGENTS_REPO_ROOTS`” direct-tmux exception,
KYA is not the self-work profile, and no retroactive Gateway identities are in
the handoff. The Claude unavailable/failing statement is not accompanied by a
Gateway/policy/session failure result. The operator-appointed fresh Codex
review is independently valid for this task, but the preceding orchestration
route cannot be counted as authenticated profile-compliant evidence.

## Trial 2 survivor ledger

| Required survivor | Ruling | Evidence |
|---|---|---|
| Durable controller term and exact crash/lost-reply succession | **Intact** | Term/controller/deadline is committed in SQLite before successor Redis authority; lower-term commands cannot acquire permits (`02-DESIGN-durable-epoch.md:714-787,1409-1421`). |
| Drain-in-place participant/source identity | **Intact** | Original stream, `toParticipantId`, `consumeKey`, receipt, and service/consumer recipient checks remain unchanged; no mapping/rehome exists (`:1229-1269`). |
| Non-expiring participant guards and permanent settlement proofs | **Intact as specified** | Guards and proofs have no TTL/delete path and exact replay equality is required (`:556-617`). P1-03 is a separate unguarded stream/group-normalization bypass. |
| Separate unread and PEL branches | **Intact** | Distinct commands, claims, counts, reply validation, and crash paths remain defined (`:1276-1367,1608-1628`). |
| Callback, observation, and replay boundary | **Not fully intact** | Handler/audit/metrics/retry/replay are closed, but current lifecycle/fault callbacks lack an explicit rejection RED/mutation owner (P2-01). |
| Store/Redis origin binding and capability reachability | **Intact under the stated premise** | Store and Redis authority/namespace/binding ordinal are immutable and capability-held; perfectly cloned live origins remain explicitly outside the theorem (`:161-207,430-494`). |
| Exact A/R claims, proof equality, effect fencing, and activation order | **Partially intact** | Repository/Redis A/R checks, destination compare-and-commit, and SQLite-A-before-Redis-A activation with permit withholding are explicit (`:897-1027,1369-1403`). The release-authority and callback gaps prevent an unqualified survivor ruling. |
| Closed failure mappings, body-free diagnostics, fail-closed ambiguity | **Not intact** | SEND has contradictory lower-coordinate mappings and public preflight results; `ensureInboxGroup` can erase missing-stream ambiguity (P1-01/P1-03). |

Controller succession, drain identity, proof permanence, origin binding, and
activation ordering therefore survive, but **not every Trial 2 survivor remains
intact**.

## Feasibility, RED, and mutation-owner ruling

The five-slice decomposition (`EPOCH-CORE`, `EPOCH-STORE`,
`EPOCH-TRANSPORT`, `EPOCH-IDENTITY`, `EPOCH-WIRING`) and the surgical current
path inventory are generally implementable
(`02-DESIGN-durable-epoch.md:1504-1572,1762-1799`). The directed test inventory
is also materially stronger than Trial 2.

Prose inventory does not close four executable gaps:

- `EPOCH-WIRING` names public status mapping but does not own the authentication
  input/ordering required to reach the atomic SEND result;
- no slice owns a reacquirable release-completion authority after SQLite is
  already `released`;
- public-queue reachability is named, but `ensureInboxGroup` has no guard RED or
  killable mutation; and
- the migration RED encodes an incomplete current baseline.

P2-01 similarly lacks a RED/mutation owner for three accepted current callback
seams. Consequently the planned test and mutation matrix cannot distinguish all
of the schedules in this result from plausible implementations that satisfy
the candidate's prose-level checklist.

## Evidence limits and canonical state

The review used static Git-object, design, trail, schema, loader, service,
client, queue, runtime, repository, consumer, ACK, and current-test evidence.
It did not read `gateway/node_modules`.

The planned epoch migration, migration-set module, epoch profile, and named
epoch suites are absent. No nonexistent planned suite was run or cited. No
implementation suite, full CI gate, live Redis experiment, migration
application, process crash trial, integration gate, rollout, promotion, or
release command was run. Candidate/request `git diff --check` results
authenticate document shape only; they are not protocol execution evidence.

Canonical state after this result is:

| State | Ruling |
|---|---|
| Design authored | Yes, at the authenticated candidate object |
| Design reviewed | Yes, Trial 3 rejected by this independent result |
| Implementation | Not started or authorized by this result |
| Integration | Not performed or implied |
| Promotion/release | Not performed or implied |

The unrelated untracked `gateway/node_modules` residue was left unmodified and
must remain outside the review commit.
