# Review Submission — Project V5 G/0/02 WIRING-B design correction (Trial 5)

## Request state and requested verdict

Request state: **unreviewed**.

This is the immutable review request for WIRING-B Design Trial 5. It records
no verdict and is not evidence that the candidate is correct. A fresh,
independent reviewer who did not author the candidate must authenticate and
adversarially review it, then return exactly one of:

- `reviewed_OK` only if Trial 4 P2-NEW-01 is closed without weakening any
  Trial 4 closure or survivor; or
- `reviewed_KO` with prioritized, reproducible findings if the ordinary
  `ensureInboxGroup` result contract, its lost-reply behavior, the guarded
  no-create property, any prior closure, or any survivor is contradictory or
  weakened.

The reviewer must write a separate immutable result at
`plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-5_result.md`. That result does
not exist as part of this request. This request must remain unchanged whether
the verdict is OK or KO.

## Exact candidate identity and lineage

- Review ID: `PROJECT_V5/G_0_2_WIRING_B_DESIGN-5`
- Stage/task: Project V5 `G/0/02`, WIRING-B, design
- Trial: 5
- Candidate commit:
  `6c3e3726cfc3f3fde1c30650ba608cfc145f3691`
- Candidate tree:
  `a658d5102d3eaa90b693be69333693e3bd2b07b2`
- Candidate sole parent:
  `9a15a5cab7b529df3c767c2abbc290bf687f881e`
- Candidate subject:
  `docs(coordination): correct durable epoch design (V5 G/0/02 WIRING-B Trial 5)`
- Candidate path:
  `plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md`
- Candidate Git blob:
  `aa9bae6dd2c979fb702aeb435cac1d075dacab6e`
- Candidate path SHA-256:
  `48d2418183ba1e70a4901b058f7fe762bc0d5ce231dd62c3d01a4f7718be6487`
- Parent-to-candidate scope: exactly one modified path, the candidate design
  above
- Parent-to-candidate numstat: exactly `13` insertions and `12` deletions

The candidate's parent is the canonical Trial 4 result object on this branch:

- Trial 4 result/candidate parent:
  `9a15a5cab7b529df3c767c2abbc290bf687f881e`
- Trial 4 result tree:
  `a7bfd8faf2add2f00c1e370c23585d79494c1207`
- Trial 4 result sole parent:
  `6fb718eae593983c909c434b2349bdfeae9eb54a`
- Trial 4 result subject:
  `review(v5): reject durable epoch design (V5 G/0/02 WIRING-B Trial 4)`
- Trial 4 result Git blob:
  `3985e7b09382f17b88e9d94c7eec3eb8eb1fc9d2`
- Trial 4 result file SHA-256:
  `0430cefda1b406e34c87f045a939c10c9cb5bef1f31e96f12dd8e7036cc11389`

The operator identified that result as cherry-picked from reviewer commit
`1d81635dc23c2dcfb1dc83038ebff11ec64e3204`. Independent object inspection
shows that source commit has the same sole parent, tree, subject, result blob,
and result-file SHA-256 as the canonical branch object above. The Trial 5
candidate is based on `9a15a5c...`, not on the source commit name.

The preceding Trial 4 design and request objects are:

- Trial 4 design candidate:
  `ef50b29713928e39f1698ed83c483e361b9b7f5c`
- Trial 4 candidate tree:
  `695673c75f837ee53315f75e03229540a93e35a9`
- Trial 4 candidate sole parent:
  `77d4aa7662ec5dfbdc731b7f27e660659496a074`
- Trial 4 candidate design blob:
  `03ab2338af9308212759e55790c2ea82ceb664fb`
- Trial 4 candidate design SHA-256:
  `8502e64470e2088979fdc1c396050e2687cc2977653493172b80f3231d8c3043`
- Trial 4 request:
  `6fb718eae593983c909c434b2349bdfeae9eb54a`
- Trial 4 request tree:
  `b614834165482fe95affbe13775953412c52df3f`
- Trial 4 request sole parent:
  `ef50b29713928e39f1698ed83c483e361b9b7f5c`
- Trial 4 request Git blob:
  `a49abc2282c6a23b88cec0b668b474f3ea04c88e`
- Trial 4 request file SHA-256:
  `12b3a3016216b88b280bca2889b74e506de1cb7bf5d5e2d0ba46c9391eaf8f18`

The actual Trial 2 objects, whose prospective correction was accepted in
Trial 4, remain:

- Trial 2 design candidate:
  `629480e3410fb7e593cdb4c3934caf329bf8e97b`
- Trial 2 request:
  `27c49bc357bdfb9cbb3e12c980b38ca1338cb896`
- Trial 2 result:
  `e31bc714166e3b814d1c417ba4ddf1358cd3abd8`

The erroneous immutable Trial 3 request is not edited or reinterpreted by
Trial 5. The reviewer must inspect the candidate from its Git object rather
than trust a mutable working-tree copy. Any mismatch in commit, tree, parent,
subject, path scope, numstat, blob, or SHA-256 is an authentication failure
and therefore a KO for this request.

The append-only prior trail is:

- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-1_to_review.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-1_result.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-2_to_review.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-2_result.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-3_to_review.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-3_result.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-4_to_review.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-4_result.md`

All eight artifacts are immutable evidence. A fresh reviewer must read the
full Trial 4 result and request at minimum and use earlier artifacts to test
the claimed survivor/closure preservation rather than reuse this author's
assertions.

## Design-only and evidence boundary

This candidate changes one design document only. It does not claim an
implementation, migration, integration, promotion, rollout, release, tag, or
push.

| State | Canonical state for this request |
|---|---|
| Trial 5 design authored | Yes, at the exact candidate object above |
| Trial 5 design reviewed | No; this request remains unreviewed |
| Epoch implementation | Not implemented or authorized by this request |
| Migration `005` / fixed migration-set code | Planned; not created or applied |
| Integration | Not performed or implied |
| Promotion/rollout/release | Not performed or implied |
| Production origin/effect profile | Unsupported |
| Health/inventory composition | Out of scope and still gated |

The current exported queue method and its contract tests are **BUILT inputs**,
not Trial 5 implementation evidence:

- `gateway/src/core/coordination_queue.js:3256-3277` issues raw
  `XGROUP CREATE ... 0 MKSTREAM`, maps `OK` to `{status:"created"}`, and maps
  `BUSYGROUP` to `{status:"exists"}`; and
- `tests/gateway/coordination_queue_contract.test.js:222-250` deep-equal
  asserts exactly those two result shapes.

The guard-aware Lua replacement, participant guards, epoch profile, fixed
migration-set module, migration `005`, release-completion ledger/adapter,
directed epoch REDs, and semantic mutants remain **PLANNED**. Static document
checks cannot establish Redis/SQLite behavior or crash safety.

## Trial 4 P2-NEW-01 correction and mandatory adversarial review

The immutable Trial 4 result found one P2: Design Trial 4 falsely specified
`{status:"ready"}` for the ordinary guard-absent `ensureInboxGroup` branch and
falsely claimed that the BUILT contract tests accept only `ready`.

Trial 5 makes only these correcting edits:

- `Status and boundary`, lines 5-8, identifies Trial 5, the sole
  P2-NEW-01 correction, and the design-only boundary.
- `§5.1.3 Guard-aware exported group creation`, lines 1559-1562, keeps the
  ordinary `XGROUP CREATE ... MKSTREAM` behavior and maps Redis `OK` exactly
  to `{status:"created"}` and `BUSYGROUP` exactly to
  `{status:"exists"}`.
- `§5.1.3`, lines 1571-1579, says the existing queue contract tests accept
  exactly `created` and `exists`; it does not claim a public result migration
  and does not add a production caller.
- `§5.1.3`, lines 1581-1593, makes replay deterministic: a lost `created`
  reply replays as `exists`, a lost `exists` reply replays as `exists`, and a
  process crash after either ordinary result leaves the ordinary stream/group
  for later reservation-gated validation and `PERSIST`.

The reviewer must independently derive and test these ordinary schedules:

1. no participant guard, missing group, Redis returns `OK`:
   exactly `{status:"created"}`;
2. no participant guard, existing group, Redis returns `BUSYGROUP`:
   exactly `{status:"exists"}`;
3. creation commits and the `created` reply is lost:
   retry encounters `BUSYGROUP` and returns exactly `exists`;
4. an `exists` reply is lost:
   retry returns exactly `exists`; and
5. the caller crashes after either result but before epoch installation:
   later installation validates the existing stream/group and `PERSIST`s the
   inbox before installing the guard.

The reviewer must also prove that the Trial 3 P1-03 substance is byte-for-byte
equivalent in authority and effect:

- the Lua command inspects the guard before `TYPE`, `XINFO`, `XGROUP`, or
  stream/group creation;
- a canonical lower/equal guard may `PERSIST` an existing inbox and returns
  closed low-level `epoch_owned`, but performs no `XGROUP`, `MKSTREAM`,
  `XADD`, delete, TTL, or replacement;
- malformed, missing-epoch, higher/incomparable, wrong-type, or ambiguous
  guarded transport remains invalid-data/transport unknown and creates
  nothing;
- installation-first on a missing stream/group cannot normalize the source to
  empty; private bootstrap, receive, ACK, recovery, and release never call the
  exported ordinary method; and
- the existing distinct mutation owner remains
  `EPOCH-TRANSPORT/GROUP-GUARD`. No new owner is required for preserving the
  BUILT `created`/`exists` shapes.

The existing BUILT ordinary contract assertions must fail if `OK` maps to
`ready` or if `BUSYGROUP` maps to anything other than `exists`; the reviewer
must separately derive that a lost-created replay converges to `exists`. The
existing planned guarded RED and semantic mutant must still fail if any guard
path reaches `XGROUP`/`MKSTREAM` or manufactures false-empty transport.

## Prior finding closure preservation

The following are author closure assertions, not a substitute for independent
review:

| Immutable Trial 3 finding | Trial 4 ruling | Trial 5 preservation claim |
|---|---|---|
| P1-01 — public preflights bypassed atomic SEND authority | Closed | No authority, classifier, mapping, public dispatch, lifecycle, receive, or ACK text changed |
| P1-02 — empty release lost resumable authority after SQLite `released` | Closed | Release-completion schema, sealed adapter, idempotence, restart eligibility, and crash matrix are unchanged |
| P1-03 — exported group creation could manufacture false empty transport | Closed | Guarded no-create/no-false-empty authority and `GROUP-GUARD` owner are unchanged; only the ordinary result shapes now match BUILT behavior |
| P1-04 — frozen migration sets omitted root `002_lifecycle.sql` | Closed | Literal IDs, paths, digests, set isolation, rejection rules, rollout, and RED/mutant are unchanged |
| P2-01 — actual runtime callback seams were unowned | Closed | Rejection of `consumerFault`, `reconciliationFault`, and `lifecycle.beforeRelease`, their REDs, and three independent mutants are unchanged |
| P2-02 — Trial 3 request recorded nonexistent Trial 2 objects | Corrected forward | This request repeats the authenticated Trial 2 candidate and request above and edits no prior artifact |
| P2-03 — process variance was not profile-compliance evidence | Closed | Trial 5 claims no Gateway/KYA/Claude or profile-compliance evidence and still requires a fresh independent reviewer |

The reviewer must recheck the exact Trial 4 anchors and adversarial targets for
all seven rows. Any regression is a Trial 5 KO even if the two ordinary return
shapes are correct.

## Survivor ledger that Trial 5 must not weaken

| Required survivor | Trial 5 preservation claim | Mandatory regression attack |
|---|---|---|
| Legal durable bootstrap B1/B2/B3 | Unchanged | No generation-1 Redis write before the atomic durable owner/companion reservation; lose each reply and advance B1→B2→B3 with delayed lower-term commands |
| Durable controller succession | Unchanged | Pause R1 at every SQLite/Redis boundary, advance to R2/R3, resume R1, and require zero stale mutation |
| Drain-in-place source identity | Unchanged | Preserve the source inbox, recipient, consume key, receipt/replay identity, and validation; no transfer/rehome/alias |
| Permanent guards and settlement proofs | Unchanged | No TTL, delete, rehome, or runtime GC; exact proof replay only |
| Lifecycle `PERSIST` race ownership | Unchanged | Run stale discovery and unregister on both sides of install/fence/release; guarded paths always `PERSIST` and never expire/delete |
| Separate unread and PEL recovery | Unchanged | Keep independent commands, cursors/counts/replies, unread-to-PEL crash handling, deleted-ID unknowns, and no branch fallthrough |
| Store/Redis origin binding | Unchanged | Attack collisions, rollback, changed/copied planes, foreign origin, wrong authority/namespace, and the stated non-cloning boundary |
| Exact A/R claims and effect fencing | Unchanged | Every mutation compares exact generation, retained term, and active/controller identity at its own commit |
| Activation order and permit withholding | Unchanged | SQLite exact `A` precedes Redis activation; lose replies and expose no permit/consumer before exact readback |
| Release fence and empty-or-open source | Unchanged | Close SEND admission first; require exact post-fence `XLEN == 0`, empty PEL, and durable predicates, else atomically open the source/reserve recovery or fault ambiguity |
| Callback/observation/replay support boundary | Unchanged | Generic handlers, non-no-op observation, retry classifiers, and replay remain unsupported; no production boundary widens |
| Body-free closed diagnostics | Unchanged | No token, body, coordinate, raw reply, or capability leaks; unknown never maps to success or lease-loss rejoin |

The candidate's 25-line diff does not modify the schema, authority tables,
bootstrap/release/recovery orders, public failure maps, migration sets,
slice/path scope, RED inventory, mutation-owner table, rollout, or
verification gate. The reviewer must nevertheless compare the candidate
object to its parent and explicitly rule every survivor intact or regressed.

## Process variance and reviewer independence

Trial 4's immutable result records the review route actually used. Trial 5
does not rewrite that history or turn any direct supervised process into
repository-profile compliance.

No Gateway trace, task, session, artifact, or intervention ID; successful KYA
route; Claude execution; cross-vendor review; or retroactive orchestration
evidence is claimed for this authoring or handoff. The static object checks
below are not reviewer evidence.

A fresh independent reviewer is mandatory. The reviewer must not be the
Trial 5 design author, must independently authenticate the candidate and
BUILT method/tests, and must derive the verdict rather than reuse this
request's closure or survivor tables.

## Request-author authentication and static checks

These checks authenticate objects and scope only; they are not a design
verdict and make no implementation/runtime claim:

- `git cat-file -t 6c3e3726cfc3f3fde1c30650ba608cfc145f3691`
  returned `commit`.
- The candidate resolves to tree
  `a658d5102d3eaa90b693be69333693e3bd2b07b2` and sole parent
  `9a15a5cab7b529df3c767c2abbc290bf687f881e`.
- Parent-to-candidate name-status returned only
  `M plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md`.
- Parent-to-candidate numstat returned exactly `13 12` for that path.
- The committed candidate path resolves to Git blob
  `aa9bae6dd2c979fb702aeb435cac1d075dacab6e`.
- SHA-256 read from the candidate object returned
  `48d2418183ba1e70a4901b058f7fe762bc0d5ce231dd62c3d01a4f7718be6487`.
- Candidate `git diff --check` passed.
- The design has 38 balanced Markdown fence markers.
- No stale `status:"ready"`, lost-`ready`, or ordinary-ready compatibility
  statement remains in the candidate.
- Review-request `git diff --check` passed before its explicit-pathspec
  commit.
- Before this request was authored, the only worktree residue was untracked
  `gateway/node_modules`; it was not staged, modified, or committed.

No implementation suite, runtime test, CI gate, live Redis experiment,
migration, integration, rollout, promotion, release, tag, push, Gateway/KYA
command, or Claude review was run or represented by these author checks.

## Required result contents

The independent Trial 5 result must:

1. repeat the authenticated candidate commit, tree, parent, subject, blob,
   one-path scope, numstat, and committed SHA-256;
2. state reviewer independence and disclose the route actually used without
   inventing Gateway/KYA/Claude or profile-compliance evidence;
3. give an explicit pass/fail ruling for P2-NEW-01 against both BUILT result
   shapes, their contract tests, lost replies, crash-before-installation, and
   the unchanged guarded branch;
4. give an explicit intact/regressed ruling for all four Trial 3 P1s, all
   three Trial 3 P2s, and every survivor row above;
5. distinguish BUILT inputs from PLANNED epoch work and design review from
   implementation, migration, integration, promotion, rollout, and release;
6. classify every new finding as P0, P1, or P2 with reproducible evidence;
7. report whether the BUILT ordinary contract assertions plus the planned
   guarded RED and `EPOCH-TRANSPORT/GROUP-GUARD` mutant distinguish the
   intended protocol from `ready`/guard-bypass mutants; and
8. issue exactly one final `reviewed_OK` or `reviewed_KO` verdict.

While producing the result, the reviewer must not amend the candidate design,
this request, any prior request/result, either review index, any plan sheet,
policy, migration, code, or tests. Only the new Trial 5 result may be written.
A KO correction must use Design Trial 6 rather than rewrite this request or
result.
