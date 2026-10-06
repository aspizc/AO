# Independent Production Design Review Result — Project V5 G/0/02 WIRING-B Design Trial 5

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 1 |

Trial 5 closes the immutable Trial 4 `P2-NEW-01` result-shape finding. The
guard-absent `ensureInboxGroup` branch now preserves the BUILT
`{status:"created"}` and `{status:"exists"}` results, defines the ordinary
lost-reply replay, and leaves the guarded no-create/no-false-empty branch
unchanged. All four Trial 3 P1 closures, all three Trial 3 P2 closures, and all
twelve required survivor properties remain intact at design level.

One new P2 nevertheless forces the KO. The design requires new
`gateway/src/**/*.js` modules and new `tests/gateway/**/*.test.js` files, but
its explicitly limited implementation path scope omits `ci/suites.json` and
its verification gate omits the required inventory refresh. The repository CI
contract hashes the exact matched path sets for required suites
`lint.gateway` and `test.gateway`; either named file addition makes those
digests stale, and `bash scripts/ci.sh` rejects the manifest before it can
claim a passing full gate. A candidate therefore cannot both obey §11's path
scope and pass §14. This is a static, loud gate defect, not evidence that any
planned epoch behavior is implemented or unsafe at runtime.

This verdict reviews only the authenticated design candidate. It does not
authorize or claim implementation, test execution, migration, integration,
promotion, production support, rollout, or release.

## Candidate, request, scope, and reviewer identity

### Authenticated candidate object

- Review id: `PROJECT_V5/G_0_2_WIRING_B_DESIGN-5`
- Candidate commit:
  `6c3e3726cfc3f3fde1c30650ba608cfc145f3691`
- Candidate tree:
  `a658d5102d3eaa90b693be69333693e3bd2b07b2`
- Sole parent:
  `9a15a5cab7b529df3c767c2abbc290bf687f881e`
- Subject:
  `docs(coordination): correct durable epoch design (V5 G/0/02 WIRING-B Trial 5)`
- Candidate Git blob:
  `aa9bae6dd2c979fb702aeb435cac1d075dacab6e`
- Committed design SHA-256:
  `48d2418183ba1e70a4901b058f7fe762bc0d5ce231dd62c3d01a4f7718be6487`

Independent Git-object inspection resolved the candidate as a commit with the
tree and sole parent above. Its exact parent-to-candidate scope is:

```text
M plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md
13	12	plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md
```

No second candidate path exists. The SHA-256 was recomputed from the committed
blob, and the reviewed design was read from that object. The candidate range
passed `git diff --check`; it contains 38 balanced Markdown fence markers and
no stale ordinary `ready` result statement.

The parent is the canonical Trial 4 result object:

- Trial 4 result:
  `9a15a5cab7b529df3c767c2abbc290bf687f881e`
- Trial 4 result tree:
  `a7bfd8faf2add2f00c1e370c23585d79494c1207`
- Trial 4 result sole parent:
  `6fb718eae593983c909c434b2349bdfeae9eb54a`
- Trial 4 result blob:
  `3985e7b09382f17b88e9d94c7eec3eb8eb1fc9d2`
- Trial 4 result SHA-256:
  `0430cefda1b406e34c87f045a939c10c9cb5bef1f31e96f12dd8e7036cc11389`

The operator-identified source review commit
`1d81635dc23c2dcfb1dc83038ebff11ec64e3204` independently resolves to the same
tree, sole parent, subject, result blob, and result-file SHA-256. Trial 5 is
correctly based on the canonical branch object, not on that alternate commit
name.

### Authenticated request object

- Request/pre-verdict HEAD:
  `f40de952e051fbc31052987be89eeb60118dd9d1`
- Request tree:
  `e802b352cfdb6582845fae9e2bb203a0e05bae1a`
- Sole parent:
  `6c3e3726cfc3f3fde1c30650ba608cfc145f3691`
- Subject:
  `docs(review): request V5 G/0/02 WIRING-B design Trial 5 review`
- Request Git blob:
  `8ef95dbb1b9464c19cd17e7778bd13210aefcb0b`
- Committed request SHA-256:
  `74a6eee784eb17ee4c751d40cb15a0398fa16ce805ab8494a5b7f18b5187e45b`

Its exact parent-to-request scope is:

```text
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-5_to_review.md
327	0	plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-5_to_review.md
```

No second request path exists. The request SHA-256 was recomputed from its
committed blob, its range passed `git diff --check`, current pre-review `HEAD`
was the request object, and its sole parent was the authenticated candidate.

The append-only lineage was also rechecked. The actual Trial 2 request
`27c49bc357bdfb9cbb3e12c980b38ca1338cb896` and candidate
`629480e3410fb7e593cdb4c3934caf329bf8e97b` resolve as Git commits; the two
erroneous SHAs preserved in the immutable Trial 3 request resolve to no commit.
Every Design Trial 1–5 request and every available Trial 1–4 result was read
completely; no earlier artifact was edited.

### Reviewer independence and process variance

- Review branch: `review/V5-G-0-02-wiring-b-design-5`
- Review date: `2026-07-30`
- Reviewer: fresh operator-appointed Codex fallback session
- Candidate authorship: none; this session did not author the candidate or any
  earlier trial artifact
- Delegation: none; the operator prohibited subagents, and none was spawned
- Independence basis: fresh-session and independent Git-object/source
  derivation, not an author closure table or prior verdict reuse

The process variance is disclosed exactly. Claude was quota-paused, Gateway
`agent_spawn` failed with `TOOL_ERROR`, and the operator appointed this fresh
Codex fallback. No Gateway trace, task, session, artifact, or intervention ID
is available or invented. Cross-vendor review evidence is unavailable, and
this route is not claimed as orchestration-profile compliance. The verdict's
independence is therefore fresh-session/object-based, not cross-vendor.

The operator's direct review instruction also required the one Trial 5 review
index row despite the request artifact's narrower write statement. That
operator instruction is the authority for the index append; candidate,
request, prior immutable trial artifacts, plan sheets, migrations, code,
tests, policies, and product files remain unchanged.

## Evidence boundary: BUILT versus PLANNED

| Classification | Independently verified evidence |
|---|---|
| **BUILT** | `RedisCoordinationQueue.ensureInboxGroup` sends raw `XGROUP CREATE <inbox> coordination-v1 0 MKSTREAM`, maps `OK` to `{status:"created"}`, maps only `BUSYGROUP` to `{status:"exists"}`, and rejects unexpected replies (`gateway/src/core/coordination_queue.js:2587-2593,3256-3277`). |
| **BUILT** | The queue contract test `deepEqual`-asserts both exact result objects and also pins the current raw `XGROUP` command vector (`tests/gateway/coordination_queue_contract.test.js:222-279`). Repository-wide caller search found only that method and the four direct test calls at lines 229, 248, 262, and 276; no production caller exists. |
| **BUILT** | Public heartbeat, discovery, unregister, send, receive, and ACK perform participant/recipient pre-reads in the generic service; the managed client has exactly four lease-loss/rejoin codes. These are compatibility inputs, not Trial 5 corrections (`gateway/src/services/coordination_service.js:1031-1360`; `gateway/src/coordination_client.js:25-30,773-808`). |
| **BUILT** | The generic runtime accepts `consumerFault` and `reconciliationFault` and awaits `inspect().lifecycle.beforeRelease`; the consumer preserves recipient-bound consume identity and rejects context mismatch (`gateway/src/core/coordination_consumer_runtime.js:188-202,246-273`; `gateway/src/core/coordination_consumer.js:209-235,1003-1013`). |
| **BUILT** | Both SQLite loaders enumerate root migration files non-recursively. The five root migration SHA-256 values recompute exactly to the design literals: `260eb666...`, `257cab63...`, `d1be59ac...`, `fb12640b...`, and `38ba4d8e...`. Root `005` and `gateway/migrations/profiles/` do not exist (`gateway/src/core/state.js:11-38`; `gateway/src/core/coordination_consumer_runtime_test_profile.js:33-39,85-108`). |
| **BUILT** | `ci/suites.json` makes `lint.gateway` and `test.gateway` required suites over `gateway/src/**/*.js` and `tests/gateway/**/*.test.js`; `scripts/ci_gate.py` validates each exact matched-path digest and rejects a stale `inventorySha256` before a passing gate (`ci/suites.json:108-166`; `scripts/ci_gate.py:173-175,193-216,702-715`). |
| **PLANNED** | `sqlite_migration_sets.js`, the profile-directory migration `005`, the epoch profile, epoch owner/recovery modules, all guards/permits/facets/scripts/ledgers, every named epoch test, and every semantic mutant are absent. The design itself classifies them as PLANNED (`02-DESIGN-durable-epoch.md:29-40,2263-2296`). |
| **PLANNED / unsupported** | Automatic crash recovery, production origin/effect profiles, health/inventory integration, online upgrade, promotion, rollout, and release remain unsupported (`02-DESIGN-durable-epoch.md:29-44,2304-2353`). |

## Trial 4 P2-NEW-01 correction ruling

**PASS — closed at design level.**

### Ordinary result contract

The candidate now states the same two results as the authenticated BUILT
method and tests:

1. absent guard plus missing group, Redis `OK`:
   `{status:"created"}`;
2. absent guard plus existing group, Redis `BUSYGROUP`:
   `{status:"exists"}`;
3. creation commits but its reply is lost, and the retry linearizes before
   guard installation: the group now exists, so the retry returns
   `{status:"exists"}`;
4. an `exists` reply is lost and the retry remains guard-absent:
   `{status:"exists"}` again; and
5. the caller crashes after either ordinary result and before installation:
   the ordinary stream/group remains for the reservation-gated installer to
   validate and `PERSIST` before it installs the guard.

These rules are explicit at
`02-DESIGN-durable-epoch.md:1550-1593` and in the crash matrix at
`:1863-1864`. The three-command race also remains closed: if epoch
installation linearizes after the first ordinary ensure but before its retry,
that retry follows the guarded branch and returns closed `epoch_owned` or
transport unknown, never `created`/`exists` and never a mutation. Thus
`created -> exists` is the pre-install replay result; guard-first replay is
guarded convergence. No result can recreate a guarded missing source.

The existing result assertions at
`coordination_queue_contract.test.js:228-231,247-250` distinguish the intended
ordinary contract from a `ready` mutant or a BUSYGROUP mapping other than
`exists`.

### Guarded no-create and test ownership

The guarded branch is unchanged from the Trial 4 parent. The Lua command
inspects the guard before `TYPE`, `XINFO`, or creation; a canonical lower/equal
guard may only `PERSIST` an existing inbox and returns `epoch_owned`; malformed,
missing-epoch, higher/incomparable, wrong-type, or ambiguous state creates
nothing. No guarded branch may execute `XGROUP`, `MKSTREAM`, `XADD`, delete,
TTL, or replacement. Private bootstrap/controller installation, receive, ACK,
recovery, and release do not call the exported ordinary method
(`02-DESIGN-durable-epoch.md:1557-1579`).

The named
`epoch_ensure_inbox_group_never_creates_behind_guard` RED exercises both
ensure/install orders with missing and existing transport, and the independent
`EPOCH-TRANSPORT/GROUP-GUARD` mutant restores the forbidden guard bypass/raw
`MKSTREAM` behavior (`:2034-2039,2122-2124,2227-2228`). Together, the BUILT
ordinary result assertions and the PLANNED guarded RED/mutant distinguish the
two independent protocol obligations.

The current contract test additionally pins the raw `XGROUP` command at
lines 232-239. A compliant implementation intentionally changes that command
record to the guard-plus-inbox Lua invocation while retaining the two result
assertions. Section 11's non-exhaustive “focused gateway tests, including”
scope can contain that surgical test update, and the final `test.gateway` lane
will execute it. This command-record update is therefore not a second finding,
but an implementation handoff must not mistake “preserve the results” for
“preserve the raw command bytes.”

## Trial 3 finding closure rulings

| Immutable Trial 3 finding | Trial 5 ruling |
|---|---|
| P1-01 — public service preflights bypassed atomic SEND authority | **PASS — closed and unchanged** |
| P1-02 — empty release lost resumable authority after SQLite `released` | **PASS — closed and unchanged** |
| P1-03 — exported group creation could manufacture false empty transport | **PASS — closed and unchanged** |
| P1-04 — frozen migration sets omitted root `002_lifecycle.sql` | **PASS — closed and unchanged** |
| P2-01 — actual runtime callback seams were unowned | **PASS — closed and unchanged** |
| P2-02 — Trial 3 request recorded nonexistent Trial 2 objects | **PASS — corrected forward; immutable error preserved** |
| P2-03 — process variance was presented as possible profile evidence | **PASS — bounded; no profile evidence claimed** |

### P1-01 — public authority remains one atomic classifier

The sealed epoch facet still removes service-side participant and recipient
authority preflights for epoch dispatch, performs sender classification before
recipient classification, derives scope inside the command, and rejects before
dedupe lookup/renewal, inbox/event mutation, or append. Lower/equal non-active
results map to managed-operation/target-not-found without lease-loss rejoin;
higher/incomparable/corrupt state maps to internal error. Heartbeat, discovery,
unregister, receive, and ACK retain the same command-local rule
(`02-DESIGN-durable-epoch.md:1378-1534,1856-1862,2036`).

### P1-02 — released state retains exact resumable authority

The permanent release-completion ledger, canonical completion identity,
`redis_pending|confirmed|recovery_required` state, sealed
`DurableEpochReleaseCompletionPermit`, exact Redis readback, one confirmation
CAS, and confirmed-only restart remain intact. The crash matrix still covers
death before Redis completion, lost Redis reply, death before SQLite
confirmation, concurrent identical resumers, contradictory state, and
confirmation loss (`02-DESIGN-durable-epoch.md:502-547,1000-1141,1875-1878,
2037,2132-2135`).

### P1-03 — guarded missing transport cannot become false empty

The exact no-create proof is the guarded ruling above. Installation-first on a
missing inbox/group leaves transport unknown; ensure-first leaves ordinary
transport that installation validates and persists. The release path never
infers empty from absence or from an exported provisioning call.

### P1-04 — literal migration sets include both root `002` files

The design freezes five ordered root `(id,path,sha256)` entries with distinct
`002_coordination_consumer` and `002_lifecycle` ids, and only the separately
named epoch set appends profile-directory `005`. All five literal root digests
match the authenticated files byte-for-byte. Generic/WIRING-A fresh,
existing, and reopened stores cannot enumerate or apply `005`; outside-set,
duplicate, traversal, digest, cross-profile, and missing-entry states reject
before owner/Redis work (`02-DESIGN-durable-epoch.md:324-404,2039`).

### P2-01 — the actual callback seams remain owned and closed

The epoch profile still rejects caller-owned `consumerFault`,
`reconciliationFault`, `lifecycle`, `beforeRelease`, accessors, symbols, and
non-plain input before migration/store/Redis/provision work; trusted
composition supplies module-private fault no-ops, and durable release never
reads or invokes `beforeRelease`. The three named REDs, three independent
`CB-*` mutants, and external child-process barriers remain unchanged
(`02-DESIGN-durable-epoch.md:1325-1366,1938,2040`).

### P2-02 — lineage remains corrected forward

The candidate repeats only the actual Trial 2 request and candidate commits,
leaves the erroneous Trial 3 request byte-for-byte immutable, and changes only
the current design path. The `TRIAL4-HANDOFF/TRIAL2-LINEAGE` check and owner
remain present (`02-DESIGN-durable-epoch.md:79,2041,2434-2437`).

### P2-03 — process variance remains evidence-bounded

The design retains the exact Trial 4 rule that direct supervised variance is
not Gateway/profile/Claude/cross-vendor evidence
(`02-DESIGN-durable-epoch.md:80,2042,2438-2441`). This result separately
discloses the actual Trial 5 fallback route above without upgrading it into
profile compliance.

## Additional finding

### P2-NEW-02 — §11 excludes the CI inventory owner required to pass §14

Section 11 says expected implementation paths “are limited to” its list. That
list requires, among other absent files:

- new `gateway/src/core/sqlite_migration_sets.js`;
- new `gateway/src/core/coordination_consumer_runtime_epoch_test_profile.js`;
- additional new epoch owner/recovery modules under `gateway/src/core/`; and
- new named `tests/gateway/coordination_consumer_epoch_*.test.js` suites.

It does not include `ci/suites.json`
(`02-DESIGN-durable-epoch.md:2263-2296`). Section 14 then requires the eventual
candidate to run `bash scripts/ci.sh`, but contains no inventory refresh or
validation command (`:2445-2492`).

The BUILT CI contract makes this combination impossible:

1. `lint.gateway` inventories `gateway/src/**/*.js`, and `test.gateway`
   inventories `tests/gateway/**/*.test.js`
   (`ci/suites.json:108-166`).
2. `inventory_digest` is SHA-256 over the sorted exact matched path set;
   manifest validation recomputes it and rejects any stale value
   (`scripts/ci_gate.py:173-175,193-216,702-715`).
3. `scripts/ci.sh` executes that gate, so manifest validation precedes a
   passing suite claim (`scripts/ci.sh:7`; `scripts/ci_gate.py:2812-2829`).
4. The repository's CI contract explicitly requires an intentional governed
   file addition to refresh and review the inventory-only
   `ci/suites.json` diff (`docs/ci-contract.md:78-96`).

The contradiction is reproducible without creating a planned file. Applying
the BUILT digest function to the current inventories produced:

```text
lint.gateway current/manifest:
sha256:24c63e60bf4151126f2071f3516aabd165fd8479d85aeb9574780cd215dbd2bf
plus only gateway/src/core/sqlite_migration_sets.js:
sha256:b1a9921e7035f268221987c6a5f70aa0dd77b73b190d1418a934bb00df1651c7

test.gateway current/manifest:
sha256:8915ef6a6d9c4c78df71341fcbf2354f255b02aedbfd1454d3d5badc60895d6e
plus only tests/gateway/coordination_consumer_epoch_group_guard.test.js:
sha256:06190ea6794d6e9968160702d0156f53ce3d3b5d8dca3b7887f35fcd0382c5a6
```

Each single design-required path is sufficient to stale its required suite;
the complete implementation adds many such paths. Leaving the manifest
unchanged fails §14. Updating it violates §11. No implementation choice can
satisfy both statements.

Severity is P2, not P1: the defect is a deterministic, pre-execution CI
manifest failure; it is loud, does not weaken an epoch authority or release
safety property, and has a narrow design correction. Design Trial 6 must:

1. add `ci/suites.json` to the allowed implementation path scope strictly for
   reviewed inventory-only changes;
2. add
   `python3 scripts/ci_gate.py --repo-root . --refresh-inventory` after the
   governed file set is final, followed by
   `python3 scripts/ci_gate.py --repo-root . --validate-only`, before the full
   `bash scripts/ci.sh` gate; and
3. keep `ci/suites-contract.json` unchanged because suite IDs, topology,
   commands, patterns, skip allowances, and timeouts are not changing.

For build-ready precision, that correction should also name
`tests/gateway/coordination_queue_contract.test.js` as the existing test whose
raw-command assertion changes to the guard-aware Lua invocation while its
`created`/`exists` assertions remain.

## Survivor ledger

| Required survivor | Trial 5 ruling | Independent evidence |
|---|---|---|
| Legal durable bootstrap B1/B2/B3 | **Intact** | `initializing(1,term,Bn,installing)` commits before every generation-1 Redis write; credentials and permits remain withheld through exact install/readback/SQLite confirmation; succession advances the durable term before delayed lower-term commands (`02-DESIGN-durable-epoch.md:798-866,1834-1840,2046-2055`). |
| Durable controller succession | **Intact** | The expired-controller CAS increments the term, records the superseded controller as an open source, installs the successor, and exposes no permit until exact SQLite/Redis agreement; resumed lower-term work has no mutation authority (`:867-964,1841-1844,2067-2071`). |
| Drain-in-place source identity | **Intact** | No transfer table/key/command, alias, or recipient rewrite exists; recovery consumes the original source inbox and preserves `toParticipantId`, `consumeKey`, receipt, replay, and service/consumer validation (`:1670-1698,1700-1790,2085-2088`). |
| Permanent guards and settlement proofs | **Intact** | Guards and generation-scoped proofs have no TTL or runtime GC and are never deleted; exact proof replay is idempotent (`:725-794,2096-2099,2216-2230`). |
| Lifecycle `PERSIST` race ownership | **Intact** | Register/renew/list/delete and epoch install/fence/release consume the guard, `PERSIST` an existing guarded inbox, and never TTL/delete it; stale scan and unregister races have two atomic orders (`:1493-1540,1862,2118-2121`). |
| Separate unread and PEL recovery | **Intact** | Bounded `XAUTOCLAIM` and nonblocking `XREADGROUP ... >` branches retain separate reply/count/claim rules, deleted-ID unknown handling, and unread-to-PEL crash convergence (`:1741-1790,1845-1847,2092-2095`). |
| Store/Redis origin binding | **Intact** | Server-allocated binding ordinals, immutable authority/namespace binding, collision and copied/changed-plane rejection, and the explicit non-cloning premise remain unchanged (`:394-417,597-661,2139-2145`). |
| Exact A/R claims and effect fencing | **Intact** | Repository, vault, ACK, proof, drain, observation, and business-effect commits recheck exact generation, retained term, and active/controller identity at their own commit point; no status projection substitutes for the authoritative witness (`:1204-1304,2063-2066`). |
| Activation order and permit withholding | **Intact** | Source witness precedes SQLite exact `A`, Redis activation follows, and no active permit/consumer is exposed until both authorities agree; lost replies reacquire only the same witness (`:1792-1826,1852-1855`). |
| Release fence and empty-or-open source | **Intact** | Redis closes SEND admission before the stable source witness; release requires exact zero `XLEN`, empty PEL, and durable close predicates, else atomically opens Dn/reserves recovery or faults ambiguity. The permanent completion row preserves crash resume and confirmed-only restart (`:978-1141,1859-1878,2125-2135`). |
| Callback/observation/replay support boundary | **Intact** | Generic handlers, non-no-op observation, caller retry classifiers, replay, and authorization remain unsupported; the three real runtime seams are rejected rather than represented as epoch-safe callbacks (`:1280-1366,1935-1938`). |
| Body-free closed diagnostics | **Intact** | Public failures reveal no token, body, record, coordinate, capability, or raw Redis reply; unknown never maps to success or lease-loss rejoin (`:1480-1491,1913-1944`). |

No survivor is weakened by the 13/12 Trial 5 diff. The new P2 concerns the
mechanical CI inventory owner, not a state-machine or authority invariant.

## RED, mutation-owner, slice, migration, and release ruling

The five implementation slices remain separated by their authoritative
witnesses. All seven Trial 4 correction-ledger rows retain distinct REDs and
mutation owners: public authority dispatch, durable release completion,
group-guard creation, literal migration path set, the three callback seams,
lineage, and process variance (`02-DESIGN-durable-epoch.md:1947-2042`). The
larger RED inventory continues to cover bootstrap/controller lost replies,
public sender-first classification, lifecycle races, PEL/unread separation,
release empty/open/unknown branches, completion crash recovery, origin
binding, callback rejection, and closed public reachability (`:2044-2157`).

The mutation-owner table remains internally consistent: the ordinary BUILT
contract assertions kill `ready`/wrong-BUSYGROUP results, while
`EPOCH-TRANSPORT/GROUP-GUARD` independently kills a guard bypass. No group
result test is credited as proof of release safety.

The migration design remains coherent and design-only: the literal five-path
baseline matches current bytes, profile-only `005` remains absent, generic and
WIRING-A loaders cannot discover it, and only the future origin-owning epoch
profile may select the six-path set. Public service ordering, callback
rejection, release crash recovery, and the BUILT/PLANNED boundary remain
unchanged. The sole feasibility defect is that the slice/path decomposition
does not assign the CI inventory mutation needed by every slice that adds a
governed file.

## Evidence limits and canonical state

This was a static, design-only review. Evidence comprised complete reads of
the governing repository instructions and plan skill, project/stage/sheet
context, the entire durable-epoch design, every Design Trial 1–5 request/result
available, the current built queue/service/client/runtime/consumer/loaders,
the queue contract test, migration bytes, CI manifest/gate contract, and
independent Git-object inspection. Hashes, scopes, path inventories, call
sites, and line anchors were recomputed rather than accepted from the request.

No implementation suite, nonexistent epoch suite, full CI gate, live Redis
experiment, SQLite migration application, child-process crash trial,
integration, rollout, promotion, release, tag, push, Gateway execution, or
Claude review was run or represented as evidence. No product code, migration,
test, plan sheet, policy, or candidate/request artifact was modified.
`gateway/node_modules` remained the sole pre-existing untracked path and was
not read, staged, modified, or committed.

Canonical state after this result:

| State | Ruling |
|---|---|
| Trial 5 design authored | Yes, at the authenticated candidate object |
| Trial 5 design reviewed | Yes, rejected by this result (`reviewed_KO`, P0 0 / P1 0 / P2 1) |
| Trial 4 P2-NEW-01 result-shape correction | Closed at design level |
| Trial 3 closures and required survivors | Intact at design level |
| Epoch implementation | Not started or authorized by this result |
| Migration `005` / fixed migration-set code | Planned; not created or applied |
| Integration / promotion / rollout / release | Not performed or implied |
| Production origin/effect profile | Unsupported |

A Design Trial 6 must correct `P2-NEW-02` without rewriting this request,
result, candidate, or any prior trail artifact, and must preserve every closure
and survivor ruling above.
