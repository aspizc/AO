# Independent Production Design Review Result — Project V5 G/0/02 WIRING-B Design Trial 4

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 1 |

Trial 4 closes all four P1 and all three P2 findings of the immutable Trial 3
result at design level, and every Trial 2/3 survivor property remains intact.
The public-authority dispatch is now preflight-free with one consistent
lexicographic classifier and closed rejoin mapping, the empty release branch
retains a permanent, uniquely reacquirable completion identity across the
SQLite/Redis boundary, exported group creation is guard-aware and can no longer
manufacture false-empty transport, the frozen migration sets name both distinct
root `002` files with digests that match the authenticated baseline
byte-for-byte, the three actual runtime callback seams have closed rejection
REDs and independent mutants, the Trial 2 lineage is corrected forward without
editing the immutable Trial 3 request, and the process variance is disclosed
without any profile-compliance claim.

One new P2 forces the KO. Design §5.1.3 mandates that the exported
`ensureInboxGroup` ordinary (guard-absent) branch return `{status:"ready"}`
while stating this "preserve[s] the ordinary idempotent ... behavior" and that
the existing queue contract tests "continue to accept only `ready`". The
authenticated BUILT method returns `{status:"created"}` or `{status:"exists"}`,
the BUILT contract tests `deepEqual`-assert exactly those two shapes, and the
repository's required `test.gateway` CI suite runs that test file inside the
design's own mandatory §14 gate. A coder implementing only the design therefore
cannot pass the design's own verification gate, and the design's
compatibility claim about that BUILT surface is false as written. The guarded
no-create/no-false-empty property itself — the substance of Trial 3 P1-03 —
is unaffected. Because this trail is append-only and an OK would freeze the
contradictory text as the binding implementation contract, the correction must
go to Design Trial 5; it is a narrow, sentence-level fix.

This verdict reviews only the authenticated design candidate. It does not
authorize or claim implementation, test execution, migration, integration,
promotion, production support, rollout, or release.

## Candidate, request, scope, and reviewer identity

### Authenticated candidate object

- Review id: `PROJECT_V5/G_0_2_WIRING_B_DESIGN-4`
- Candidate commit:
  `ef50b29713928e39f1698ed83c483e361b9b7f5c`
- Candidate tree:
  `695673c75f837ee53315f75e03229540a93e35a9`
- Sole parent:
  `77d4aa7662ec5dfbdc731b7f27e660659496a074`
- Subject:
  `docs(coordination): correct durable epoch design (V5 G/0/02 WIRING-B Trial 4)`
- Candidate Git blob:
  `03ab2338af9308212759e55790c2ea82ceb664fb`
- Committed design SHA-256:
  `8502e64470e2088979fdc1c396050e2687cc2977653493172b80f3231d8c3043`

Independent Git-object inspection resolved the candidate as a commit with the
tree and sole parent above. Its exact parent-to-candidate scope is:

```text
M plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md
698	167	plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md
```

No second candidate path exists in that diff. The SHA-256 was recomputed from
the blob read out of the candidate object, not trusted from the request, and
the design content reviewed below was extracted from that Git object. The
candidate range passed `git diff --check`. The design has balanced Markdown
code fences (38 fence markers) and its seven directed correction-ledger rows
name distinct owners.

### Authenticated request object

- Request/pre-verdict HEAD:
  `6fb718eae593983c909c434b2349bdfeae9eb54a`
- Request tree:
  `b614834165482fe95affbe13775953412c52df3f`
- Sole parent:
  `ef50b29713928e39f1698ed83c483e361b9b7f5c`

Its exact parent-to-request scope is:

```text
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-4_to_review.md
484	0	plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-4_to_review.md
```

The immutable prior trail was authenticated: the Trial 3 request remains at
`19c40db11e764092a0b2dfd54f5a686120c78838` with unchanged blob
`1f0dbfc6525dea7e10b7efa7f3ff03b6a9fdc96f` and SHA-256
`bb6441c89a7c0e96a04227e79c6ca42def89a01780b4bfafbf08a8842d77236b`; the Trial 3
result commit `77d4aa7662ec5dfbdc731b7f27e660659496a074` (tree
`0adb8f83bb9fbb1ca4cfe436097148a34bc293de`) carries the result blob
`3ab6aaa7ef45f544c04d8c2ed7c9932a6a6f973f` with SHA-256
`18b941cb6231189e6c61a859d1726519cc9d285398fa80e4c74fbeed86f11a07`. All six
prior trail artifacts (Trial 1/2/3 requests and results) were read.

### Reviewer independence and orchestration adjudication

- Review branch: `review/V5-G-0-02-wiring-b-design-4`
- Review date: `2026-07-30`
- Reviewer: fresh operator-appointed Claude Code session on model
  `claude-fable-5` — the repository profile's assigned reviewer pairing
  (`.claude/orchestration-profile.md:78-86`) — running in the operator-created
  gitignored review worktree `workspace/clones/wt-g002-wb-design-review-t4`
- Candidate authorship: none; this session did not author any trial of the
  design or any prior review artifact
- Sub-reviewers/delegation: none; no author closure table, static check, or
  self-review was reused

The review route actually used is disclosed exactly: the operator provisioned
this dedicated worktree and a review brief, and this session derived the
verdict independently from the Git objects and current production sources. No
Gateway trace, task, session, artifact, or intervention identifier exists for
this review and none is claimed or invented. Unlike Trials 1–3, which used a
disclosed Codex fallback, this review runs on the profile-supported reviewer
agent/model; that fact is stated as identity disclosure, not as retroactive
Gateway-orchestration evidence.

## Evidence boundary: BUILT versus PLANNED

| Classification | Independent evidence |
|---|---|
| **BUILT** | Public service `send` pre-reads sender (absent → `COORDINATION_AUTH_FAILED`) and recipient (absent/expired → target-not-found) before `putMessage`; heartbeat/discover/unregister/receive/ACK pre-read and authenticate presence the same way (`gateway/src/services/coordination_service.js:1031-1063,1075-1094,1132-1159,1177-1234,1269-1306,1331-1360`). |
| **BUILT** | The managed client's lease-loss set is exactly `COORDINATION_AUTH_FAILED`, `COORDINATION_LEASE_EXPIRED`, `COORDINATION_LEASE_CHANGED`, `COORDINATION_LEASE_NOT_FOUND`, and any such error begins rejoin (`gateway/src/coordination_client.js:25-30,799-808`). |
| **BUILT** | `DELETE_PARTICIPANT_SCRIPT` and `LIST_PARTICIPANTS_SCRIPT` apply `PEXPIRE` to orphan inboxes; `SEND_MESSAGE_SCRIPT` reads sender presence, sender fence, recipient presence, recipient fence, dedupe, equal-retry `PEXPIRE`, `XLEN`, then `XADD` (`gateway/src/core/coordination_queue.js:498-588,591-850`). |
| **BUILT** | Exported `ensureInboxGroup` issues raw `XGROUP CREATE ... 0 MKSTREAM` and returns `{status:"created"}` or `{status:"exists"}`; its only callers are the queue contract tests, which `deepEqual`-assert those exact shapes (`gateway/src/core/coordination_queue.js:3256-3277`; `tests/gateway/coordination_queue_contract.test.js:222-280`). |
| **BUILT** | The runtime accepts `consumerFault`/`reconciliationFault` options, wires `reconciliationFault` into the reconciler, and awaits `inspect().lifecycle.beforeRelease` before exact owner release (`gateway/src/core/coordination_consumer_runtime.js:188-202,246-261,270-273`). |
| **BUILT** | Both loaders enumerate every root `.sql` non-recursively and derive ids by stripping `.sql`; a `profiles/` subdirectory is genuinely outside their enumeration (`gateway/src/core/state.js:11-38,60-77`; `gateway/src/core/coordination_consumer_runtime_test_profile.js:33-39,85-108`). |
| **BUILT** | The five root migrations exist and their SHA-256 digests equal the design's literal values byte-for-byte: `001_initial`, `002_coordination_consumer`, `002_lifecycle`, `003_coordination_ack_outbox`, `004_coordination_consumer_runtime_owner` (recomputed with `sha256sum` against `02-DESIGN-durable-epoch.md:336-352`). Root `005_coordination_consumer_runtime_epoch.sql` does not exist; `gateway/migrations/profiles/` does not exist. |
| **BUILT** | Drain-identity constraints hold in current code: `coordinationConsumeKey` binds `toParticipantId` (`gateway/src/core/coordination_consumer.js:209-235`), consumer context quarantines recipient mismatch (`:1003-1013`), and the service rejects a delivery whose envelope recipient is not the caller (`gateway/src/services/coordination_service.js:804-825`). |
| **BUILT** | The required CI gate runs `tests/gateway/**/*.test.js` (excluding only `*_live.test.js`) in required suite `test.gateway` (`ci/suites.json:9,150-164`; `scripts/ci.sh` → `scripts/ci_gate.py`). |
| **PLANNED** | `sqlite_migration_sets.js`, profile-directory migration `005`, the epoch profile, every guard/permit/witness/ledger/facet/script, and all directed epoch suites do not exist at the candidate object. The candidate itself labels them PLANNED (`02-DESIGN-durable-epoch.md:30-41`). |
| **PLANNED / unsupported** | Generic handlers, non-no-op observation, caller retry classifiers, replay, production origin/effect profiles, health/inventory, online upgrade, promotion, and release remain unsupported (`02-DESIGN-durable-epoch.md:1286-1291,1303-1324,2346-2352`). |

## Trial 3 finding closure rulings

| Trial 3 finding | Trial 4 ruling |
|---|---|
| P1-01 — public preflights bypassed the atomic SEND authority | **PASS — closed** |
| P1-02 — empty release lost resumable authority after SQLite `released` | **PASS — closed** |
| P1-03 — exported group creation could manufacture false empty transport | **PASS — closed** (a separate new P2 exists on the same section's ordinary-branch contract) |
| P1-04 — frozen migration sets omitted root `002_lifecycle.sql` | **PASS — closed** |
| P2-01 — actual fault and release callback seams were unowned | **PASS — closed** |
| P2-02 — Trial 3 request recorded nonexistent Trial 2 objects | **PASS — corrected forward** |
| P2-03 — process variance was not profile-compliance evidence | **PASS — correctly bounded** |

### P1-01 — PASS: the atomic classifier is the public linearization point

The sealed `EpochPublicAuthorityFacet` is installed by trusted composition in
`createCoordinationService`; its presence selects epoch dispatch, which
performs only DTO validation, token hashing, bounded clock/UUID generation,
and non-authoritative draft construction, and never calls `getParticipant`,
`readParticipant`, `authenticateParticipant`, or a recipient lookup
(`02-DESIGN-durable-epoch.md:1379-1398`); §3.9 invariant 12 makes this an
executable predicate (`:1186-1189`). The single `SEND_MESSAGE_SCRIPT`
invocation owns the exact ten-step order — sender classification, recipient
classification, scope derivation, canonical envelope construction, dedupe
lookup, equal-retry `PEXPIRE` after semantic equality, `XLEN`, `XADD`, dedupe
`SET`, event append — and every result before the dedupe read leaves dedupe
value/TTL, inbox, event stream, and audit unchanged (`:1425-1446`).

Sender classification is unconditionally complete before the recipient is
read, so the sender-first dual-failure result is reachable through the public
service even after guard installation removed ordinary presence
(`:1470-1473`), which is exactly the schedule that defeated Trial 3 (current
preflight at `gateway/src/services/coordination_service.js:1180-1188` returns
`COORDINATION_AUTH_FAILED` and triggers client rejoin at
`gateway/src/coordination_client.js:799-808`). The closed mapping matrix is
exact and matches the required table: ordinary missing/bad digest →
`COORDINATION_AUTH_FAILED` → rejoin; ordinary expiry →
`COORDINATION_LEASE_EXPIRED` → rejoin; guarded lower/equal-non-active sender →
`COORDINATION_EPOCH_MANAGED_OPERATION_REQUIRED` → no rejoin; guarded
lower/equal-non-active recipient → `COORDINATION_TARGET_NOT_FOUND` → no
rejoin; higher/incomparable/corrupt → `COORDINATION_INTERNAL_ERROR` → no
rejoin; exact-active/ordinary → existing created/duplicate/conflict/full
(`:1475-1485`). Trial 3's internal contradiction is resolved: lower
coordinates are `epoch_sender_not_active`/`epoch_recipient_not_active` in both
§5.1.1 and the failure model, and only higher/incomparable/malformed states
are `transport_state_unknown` (`:1448-1468,1913-1920`). The epoch facet emits
neither `COORDINATION_LEASE_CHANGED` nor `COORDINATION_LEASE_NOT_FOUND`
(`:1400-1406,1513-1515,1916`), so no guarded result can masquerade as lease
loss and re-arm a rejoin.

Heartbeat, discover, unregister, receive, and ACK use the same
validate/hash-then-facet rule with per-operation Lua authentication, including
per-batch and final empty-batch caller checks for discovery and the
blocking-receive before/after-script race whose PEL side effect is recovered
by the separate PEL branch (`:1493-1534`); crash rows pin the no-preflight
property at every boundary (`:1856-1858`). Directed REDs
`epoch_public_send_reaches_lua_after_guarded_presence_removal_sender_first`
and `epoch_public_authority_coordinate_and_rejoin_matrix`, plus the distinct
`EPOCH-WIRING/PUBLIC-AUTHORITY-DISPATCH` mutant, kill the seam independently
(`:2035,2108-2116`).

### P1-02 — PASS: release completion is durable, unique, and solely reacquirable

The permanent `coordination_consumer_runtime_release_completions` ledger has
exact three-state checks (`redis_pending`/`confirmed`/`recovery_required`),
immutable identity columns, `PRIMARY KEY(scope_id, generation)`, and
`UNIQUE(completion_id)` (`02-DESIGN-durable-epoch.md:503-526`).
`completion_id` is the SHA-256 of one canonical length-delimited tuple binding
Redis authority/namespace/binding ordinal, scope, generation, retained
recovery term, source participant, exact inbox key, and consumer group
(`:528-537`) — precisely the identity the Trial 3 correction contract
demanded. The empty-branch `BEGIN IMMEDIATE` transaction inserts that row as
`redis_pending` in the same commit as owner/companion `released(g)`, only
after the Redis release fence, the exact post-fence `XLEN == 0` plus empty
`XPENDING` witness, and every durable close predicate (`:1000-1006`).

Epoch admission runs the completion resolver after
migration-set/store-origin/Redis-binding authentication and before bootstrap,
takeover, restart, registration, or runtime construction (`:1077-1091`). The
`DurableEpochReleaseCompletionPermit` is the declared sole exception to
process-local non-reacquisition: it is reacquired only from the permanent row
after revalidating the sealed SQLite origin, immutable Redis binding,
`released(g)` pair, and Redis `releasing|released` tuple, and grants only the
idempotent completion plus its confirmation (`:310-319,1013-1021`). The Redis
completion command accepts exactly two branches — exact `releasing(...,NULL)`
transitions atomically, exact `released(...,completion_id)` replays — and
every other tuple rejects (`:1022-1028`).

All required attack schedules are closed with named durable facts and sole
resumes: crash before the Redis command, Redis commit with lost reply,
witness/readback loss, crash before SQLite `confirmed`, confirmation commit
with lost reply (exact readback, no write, fixed `confirmed_at`), and
concurrent resumers converging on the same command identity through Redis
idempotence plus the single `redis_pending -> confirmed` CAS
(`:1068-1076,1093-1101,1874-1878`). Contradictory observations (different
completion ID, coordinate, group, wrong type, positive `XLEN`/PEL, missing
anchor) become monotonic `recovery_required`, while connection
failure/timeout/unknown results retain `redis_pending` and replay the same
identity (`:1103-1116`). Restart is ineligible in `redis_pending` and
`recovery_required` even though the companion says `released`, and eligible
only from `confirmed` plus exact Redis `released(g,completion_id)`
(`:1132-1141`); §3.9 invariant 9 encodes the same rule (`:1176-1181`). RED
`epoch_release_resumes_sqlite_released_before_redis_completion` and mutant
`EPOCH-CORE/RELEASE-COMPLETION` own the seam (`:2036,2131-2134`).

### P1-03 — PASS: a guard atomically forbids creation, so false empty is unreachable

`ENSURE_INBOX_GROUP_SCRIPT` inspects the participant guard inside Lua before
`TYPE`, `XINFO`, or any creation; a canonical lower/equal guard yields
`epoch_owned` with `PERSIST` only when the inbox exists and performs no
`XGROUP`, `MKSTREAM`, `XADD`, delete, or TTL mutation whether the stream/group
exists or is missing; wrong-type, malformed, missing-epoch,
higher/incomparable, or ambiguous state is transport unknown and creates
nothing (`02-DESIGN-durable-epoch.md:1558-1569`). A missing guarded
inbox/group therefore remains transport unknown to receive, recovery, and
release and "can never be reconstructed as an empty source" (`:1584-1586`),
directly closing Trial 3's false-empty schedule. Both race orders are total:
ordinary ensure first → later reservation-gated installation validates and
`PERSIST`s; installation first → ensure sees the guard and cannot create
(`:1580-1584`); lost `ready` and lost `epoch_owned`/unknown replies and the
crash between ordinary `ready` and installation are enumerated
(`:1588-1592,1862-1863`).

The design's reachability claim was independently verified: at the
authenticated baseline the only callers of the exported method are the queue
contract tests (`gateway/src/core/coordination_queue.js:3256`;
`tests/gateway/coordination_queue_contract.test.js:229,248,262,276`), and
private bootstrap/controller installation, receive/ACK, and release never call
it (`:1577-1579`). §3.9 invariants 10 and 13 bind the property
(`:1182-1183,1190-1192`), and the distinct `EPOCH-TRANSPORT/GROUP-GUARD`
mutant with RED `epoch_ensure_inbox_group_never_creates_behind_guard` is
independently killable from the lifecycle-script owner (`:1586-1588,2037`).

The Trial 3 finding — silent normalization of unknown guarded transport into
an empty release witness — is closed. The new P2 below concerns the same
section's ordinary-branch result contract, not the guarded property.

### P1-04 — PASS: the frozen sets are the authenticated current baseline

`ROOT_BASELINE_SQLITE` freezes five ordered `(id,path,sha256)` entries —
`001_initial`, `002_coordination_consumer`, `002_lifecycle`,
`003_coordination_ack_outbox`, `004_coordination_consumer_runtime_owner` —
and this review recomputed all five digests from the working tree at the
request object: every one matches the design's literal value exactly
(`02-DESIGN-durable-epoch.md:336-352`). The ids equal what the current loaders
write into `schema_migrations` (basename minus `.sql`,
`gateway/src/core/state.js:26`), so existing/reopened stores satisfy the
"every applied id in the selected set" rule without adoption or rejection of
valid stores — the exact defect of Trial 3 is gone. The two root `002` files
are separate entries that never collapse by basename or numeric version
(`:330-335`), generic and WIRING-A sets are exact frozen copies, and only the
epoch profile appends profile-directory `005` whose literal digest is
explicitly deferred to the reviewed implementation bytes (`:356-374`).

No environment value, caller option, directory scan, glob, basename grouping,
numeric grouping, or discovered filename can alter a set; duplicate ids/paths,
digest mismatch, traversal/symlink, missing files, and any applied
outside-set row are `MIGRATION_PROFILE_MISMATCH` before owner/Redis work
(`:369-393,1938`). Fresh/existing/reopened generic and WIRING-A behavior,
epoch first-open empty-origin proof, sealed profile persistence, same-origin
reopen equality, cross-profile rejection, and the forbidden root `005` path
are all explicit (`:386-406,2297-2301`), and the §14 gate mechanically checks
root-`005` absence (`:2489`). The RED covers exact ids/paths/digests/order,
store lifecycles, `005` isolation, and injected outside-set rows without
collapsing, with the distinct `EPOCH-CORE/MIGRATION-PATH-SET` mutant
(`:2038,2055-2061`).

### P2-01 — PASS: the three actual seams are rejected before any effect

The epoch profile constructor validates an exact allowlist using own-property
descriptors without invoking getters; an accessor, symbol, non-plain
prototype, or own `consumerFault`, `reconciliationFault`, `lifecycle`, or
`beforeRelease` property rejects with `EFFECT_PROFILE_UNSUPPORTED` before
migration selection, store opening, participant registration, Redis access, or
provision construction (`02-DESIGN-durable-epoch.md:1332-1338,1937`). Trusted
composition installs two frozen module-private no-ops into the generic
runtime's fault positions (`:1339-1343`), matching the real seams verified at
`gateway/src/core/coordination_consumer_runtime.js:197-198,256`. Epoch release
never reads or awaits `inspect().lifecycle.beforeRelease` — the ordered stop
plus the durable §3.6 machine is the complete before-release behavior, and a
post-construction encounter is `EFFECT_PROFILE_UNSUPPORTED`, not a hook call
(`:982-987,1344-1349`), closing the seam observed at
`coordination_consumer_runtime.js:270-273`. Crash REDs use an external
child-process supervisor observing committed SQLite/Redis witnesses; no
callback or getter signals a boundary (`:1353-1357,1880`). The three named
REDs and the three independent mutants `EPOCH-WIRING/CB-CONSUMER`,
`CB-RECONCILIATION`, and `CB-BEFORE-RELEASE` are each restated in the
correction ledger (`:1359-1366,2039`).

### P2-02 — PASS: the lineage is corrected forward, the erroneous request preserved

This review authenticated with `git cat-file` that the actual Trial 2 request
`27c49bc357bdfb9cbb3e12c980b38ca1338cb896` and candidate
`629480e3410fb7e593cdb4c3934caf329bf8e97b` are commits, that the two SHAs
recorded by the erroneous Trial 3 request
(`27c49bc93167e346347c700360786e5e85a8d4cd`,
`629366c7746fd13cdc11cb29737121e16a401edc`) resolve to no Git object, and that
the Trial 3 request remains byte-for-byte at its authenticated blob and
SHA-256. The candidate's one-path scope proves no prior artifact was edited.
The design records only the correct objects — in the Trial 4 correction
record, the §10 ledger row with owner `TRIAL4-HANDOFF/TRIAL2-LINEAGE`, and the
§13 checklist — and never repeats either erroneous SHA
(`02-DESIGN-durable-epoch.md:80,2040,2433-2436`; grep over the full candidate
text found no occurrence of either bad value).

### P2-03 — PASS: variance is disclosed without an evidence claim

The Trial 4 correction record, the §10 row with owner
`TRIAL4-HANDOFF/PROCESS-VARIANCE`, and the §13 checklist item describe direct
supervised `tmux` strictly as an operator-authorized process variance caused
by unavailable/failing Gateway/KYA and Claude lanes, and explicitly claim no
profile compliance, Gateway trace/task/session/artifact, Claude execution, or
cross-vendor evidence (`02-DESIGN-durable-epoch.md:81,2041,2437-2440`). The
request's "Process variance and reviewer independence" section carries the
same non-claims and requires this fresh independent review, which was
performed as disclosed above. Nothing in the candidate or request converts the
variance into orchestration evidence, which is what Trial 3 required.

## Additional findings

### P2-NEW-01 — §5.1.3's ordinary-branch contract contradicts the BUILT method and its required tests

The design mandates that the guard-absent branch of the exported
`ensureInboxGroup` "preserve the ordinary idempotent
`XGROUP CREATE <inbox> <group> 0 MKSTREAM` behavior and return
`{status:"ready"}`" (`02-DESIGN-durable-epoch.md:1560-1562`) and asserts that
the current queue contract tests — its only callers — "continue to accept
only `ready`" (`:1574-1575`).

Both claims are false at the authenticated baseline:

- the BUILT method returns `{status:"created"}` on creation and
  `{status:"exists"}` on `BUSYGROUP`
  (`gateway/src/core/coordination_queue.js:3256-3277`); returning
  `{status:"ready"}` replaces that exported result contract rather than
  preserving it; and
- the BUILT directed tests `deepEqual`-assert exactly `{status:"created"}` and
  `{status:"exists"}`
  (`tests/gateway/coordination_queue_contract.test.js:228-231,247-250`); they
  reject `ready` today and can only "accept only `ready`" if they are
  rewritten, which the design nowhere says (its §11 focused-test list does not
  name this file, `:2286-2293`).

Reproducible consequence: implement §5.1.3 exactly as written, then run the
design's own mandatory verification gate (`bash scripts/ci.sh`,
`02-DESIGN-durable-epoch.md:2491`). The required suite `test.gateway` includes
`tests/gateway/**/*.test.js` and excludes only `*_live.test.js`
(`ci/suites.json:9,150-164`), so `coordination_queue_contract.test.js` runs
and its two assertions fail against `{status:"ready"}`. A coder who reads only
the design is steered into a candidate that cannot pass the design's own gate,
and the design's compatibility statement about a BUILT surface is false — the
"declared, not observed" defect class this review was directed to judge.

Severity P2, not P1: the guarded branch — the actual Trial 3 P1-03 substance —
is exact and closed under every reading; the affected ordinary result shape
has zero production callers (verified); no authority, ordering, crash-resume,
or release-safety property depends on it; and the failure is loud at first
gate run rather than silent at runtime. Trial 5 needs only a sentence-level
correction with two acceptable shapes: keep `created`/`exists` as the
guard-absent results (truly preserving the BUILT contract), or explicitly own
the result-shape change, name the exact contract-test updates in path scope,
and delete the false "preserve"/"continue to accept" claims. No new mutation
owner is required beyond `EPOCH-TRANSPORT/GROUP-GUARD` if the first shape is
chosen.

## Survivor ledger

| Required survivor | Ruling | Evidence |
|---|---|---|
| Legal durable bootstrap B1/B2/B3 | **Intact** | The `initializing(1,term,Bn,installing)` owner/companion pair commits before any generation-scoped Redis write; credentials/permits are withheld until exact install plus readback plus SQLite confirmation; B1/B2/B3 succession advances the durable term first and delayed lower-term commands install only historically reserved tuples without permits (`02-DESIGN-durable-epoch.md:798-866,1832-1837,1895-1896,2045-2054`). |
| Durable controller succession | **Intact** | The expired-controller CAS inserts the superseded controller as an `open` source, increments the term, and installs the successor before any permit; R1 resumed at every boundary fails the exact SQLite/Redis predicates and changes no state (`:932-964,1841-1844,1882-1888`). |
| Drain-in-place source identity | **Intact** | No transfer schema/key/command exists and discovery of one fails admission; the recovery consumer sets `expectedRecipientId = source_participant_id`, preserving `toParticipantId`, `consumeKey`, and receipt identity against the verified current consumer/service guards (`:1670-1697,1712-1716`; `coordination_consumer.js:209-235,1003-1013`; `coordination_service.js:804-825`). |
| Permanent guards and settlement proofs | **Intact** | Guards have no TTL and are never deleted, including after `released`; proofs are non-expiring with exact idempotent replay and no runtime GC; the new `releaseCompletionId` field has exact nullability and changes no retention rule (`:726-794`). |
| Lifecycle `PERSIST` race ownership | **Intact** | Every script observing a guard `PERSIST`s before returning and may never TTL/delete/replace a guarded inbox; stale `SSCAN` pages and authenticated unregisters have two total legal linearizations with no decision gap (`:769-774,1523-1534,1861`). |
| Separate unread and PEL recovery | **Intact** | Distinct bounded commands with exact reply shapes, cursor/count checks, `XPENDING` ownership, `XACK`/`XDEL` counts, unread-to-PEL crash behavior, deleted-ID unknowns, and no fallthrough; independent REDs and mutations (`:1741-1790,1845-1846,2092-2094`). |
| Store/Redis origin binding | **Intact** | Server-allocated ordinals, collision hard-failure, immutable binding tuple, foreign-origin rejection, and the explicit non-cloning premise remain unchanged (`:597-661,252-267,1908-1911`). |
| Exact A/R claims and effect fencing | **Intact** | Every repository/vault/ACK/proof/effect commit executes the exact generation/term/participant-or-controller predicate in its own transaction; claims record complete authority shapes; destination compare-and-commit with registered witnesses remains required (`:1209-1263,1270-1291`). |
| Activation order and permit withholding | **Intact** | Read-only inbox witness, SQLite exact `A` first, Redis activation second, permit minted only after both agree; lost-reply reacquires only the same witness (`:1792-1826,1852-1855`). |
| Release fence and empty-or-open source | **Intact and strengthened** | Redis sender/recipient admission closes before the source witness; `source_empty` requires exact `XLEN == 0` plus empty `XPENDING` plus every durable predicate; nonempty work atomically opens Dn and reserves `g+1`; ambiguity faults; the completion ledger adds durable resume without weakening the fence (`:978-1066,1859-1873,1926-1930`). |
| Callback/observation/replay support boundary | **Intact** | Generic handlers, non-no-op observation, caller retry classifiers, and replay remain unsupported with unchanged rejection points; §4.5 closes the three actual seams without broadening production support (`:1286-1324,1326-1366`). |
| Body-free closed diagnostics | **Intact** | Public errors carry no token, body, record, coordinate, or raw reply; unknown state maps to internal error and never to success or lease-loss rejoin; the Trial 3 lower-coordinate mapping contradiction is resolved (`:1487-1491,1913-1925,1943-1944`). |

No survivor is weakened. The new P2 does not touch a survivor property: both
readings of the ordinary-branch shape refuse guarded creation and preserve the
release-ambiguity invariant.

## Feasibility, RED, and mutation-owner ruling

The five-slice decomposition and path scope are implementable and now include
the loader/profile owners, the group-guard script, the callback rejections,
and the completion ledger (`02-DESIGN-durable-epoch.md:1946-2026,2262-2301`).
For each of the seven correction-ledger rows the directed RED fails before
GREEN for the stated reason and the named mutant is independently killable:
restoring a service preflight or lease-loss mapping is caught only by
`PUBLIC-AUTHORITY-DISPATCH`; removing the completion row/adapter or admitting
restart while pending only by `RELEASE-COMPLETION`; skipping the guard key or
restoring raw `MKSTREAM` only by `GROUP-GUARD`; dropping either `002`,
scanning, grouping, or adopting outside-set ids only by `MIGRATION-PATH-SET`;
the three callback restorations only by their three `CB-*` mutants; and the
two handoff checks only by the `TRIAL4-HANDOFF` owners (`:2030-2041`). The
supporting RED inventory and mutation matrix cover every schedule this review
re-derived, including the full release path
(`active -> releasing`, fence, witness, empty/open/ambiguous branch,
completion, confirmed-only restart) and the B1/B2/B3 and R1/R2/R3 process
schedules (`:2043-2260`).

The one gap is the finding above: the §14 gate as written is not passable by
an implementation that follows §5.1.3 literally, so the verification gate and
the BUILT contract-test baseline are in contradiction until Trial 5 corrects
the ordinary-branch statement.

## Evidence limits and canonical state

This review used static evidence only: Git object inspection, the full
candidate text extracted from the candidate blob, all six prior trail
artifacts, both review indexes, the governing working-rules contract and
orchestration profile, and the current production service, client, queue,
runtime, consumer, contract, state-loader, test-profile, migration, CI-gate,
and contract-test sources cited above. All five root migration digests were
recomputed with `sha256sum`. No implementation suite, CI gate, live Redis
experiment, migration application, process crash trial, integration, rollout,
promotion, or release command was run, and none is represented as evidence.
`gateway/node_modules` is the expected untracked worktree symlink; it was not
read, staged, modified, or committed.

Canonical state after this result:

| State | Ruling |
|---|---|
| Trial 4 design authored | Yes, at the authenticated candidate object |
| Trial 4 design reviewed | Yes, rejected by this independent result (`reviewed_KO`, P0 0 / P1 0 / P2 1) |
| Epoch implementation | Not started or authorized by this result |
| Migration `005` / migration-set code | Planned; not created or applied |
| Integration | Not performed or implied |
| Promotion/rollout/release | Not performed or implied |
| Production origin/effect profile | Unsupported |

A Design Trial 5 needs only the P2-NEW-01 correction and must preserve every
closure and survivor ruling above; it must not rewrite this request, this
result, or any prior trail artifact.
