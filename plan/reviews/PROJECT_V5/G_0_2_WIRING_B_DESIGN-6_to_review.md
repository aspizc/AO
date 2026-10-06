# Review Submission — Project V5 G/0/02 WIRING-B design correction (Trial 6)

## Request state and requested verdict

Request state: **unreviewed**.

This is the immutable review request for WIRING-B Design Trial 6. It records
no verdict and is not evidence that the candidate is correct. A fresh,
independent reviewer who did not author the candidate must authenticate and
adversarially review it, then return exactly one of:

- `reviewed_OK` only if Trial 5 P2-NEW-02 is closed without weakening any
  accepted Trial 1–5 closure or survivor; or
- `reviewed_KO` with prioritized, reproducible findings if the governed CI
  inventory scope, command order, topology-contract boundary, existing
  command-assertion ownership, any prior closure, or any survivor is
  contradictory or weakened.

The reviewer must write a separate immutable result at
`plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-6_result.md`. That result does
not exist as part of this request. This request makes no self-verdict and must
remain unchanged whether the independent result is OK or KO.

## Exact candidate identity, parentage, and scope

- Review ID: `PROJECT_V5/G_0_2_WIRING_B_DESIGN-6`
- Stage/task: Project V5 `G/0/02`, WIRING-B, design
- Trial: 6
- Candidate commit:
  `31e61f6ba90484b3a3383dcf6e04b513ec9c1d89`
- Candidate tree:
  `24120817f5a33a4bbb989f2f42dbe2e2e3832fc0`
- Candidate sole parent:
  `35e9d25bab6913cd63f29ac4c66b827175e50e47`
- Candidate subject:
  `docs(coordination): correct durable epoch design (V5 G/0/02 WIRING-B Trial 6)`
- Candidate path:
  `plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md`
- Candidate Git blob:
  `fc10f135f3736decefe227e63a4215b1b264c782`
- Candidate path SHA-256:
  `f49073d2e534ce891f4a5e6baec99c57a3044a57271089f8cc5531e556e19459`
- Parent-to-candidate scope: exactly one modified path, the candidate design
  above
- Parent-to-candidate numstat: exactly `18` insertions and `5` deletions

The candidate's direct parent is the immutable Trial 5 KO:

- Trial 5 result commit:
  `35e9d25bab6913cd63f29ac4c66b827175e50e47`
- Trial 5 result tree:
  `6063e771ec2d7c911c3c71ab08b20eb9780e37c1`
- Trial 5 result sole parent:
  `f40de952e051fbc31052987be89eeb60118dd9d1`
- Trial 5 result subject:
  `review(v5): reject durable epoch design (V5 G/0/02 WIRING-B Trial 5)`
- Trial 5 result Git blob:
  `9db235c68ecba0de3ed0517e2ff819b92aac1865`
- Trial 5 result file SHA-256:
  `02ae3649adc4a10272ba0279c2efc58ac3c95ab8b615a8a7cfc29660d865d85f`
- Trial 5 result scope: exactly the added 444-line Trial 5 result and one
  appended Trial 5 review-index row

The preceding Trial 5 request and candidate are:

- Trial 5 request:
  `f40de952e051fbc31052987be89eeb60118dd9d1`
- Trial 5 request tree:
  `e802b352cfdb6582845fae9e2bb203a0e05bae1a`
- Trial 5 request sole parent:
  `6c3e3726cfc3f3fde1c30650ba608cfc145f3691`
- Trial 5 request Git blob:
  `8ef95dbb1b9464c19cd17e7778bd13210aefcb0b`
- Trial 5 request file SHA-256:
  `74a6eee784eb17ee4c751d40cb15a0398fa16ce805ab8494a5b7f18b5187e45b`
- Trial 5 design candidate:
  `6c3e3726cfc3f3fde1c30650ba608cfc145f3691`
- Trial 5 candidate tree:
  `a658d5102d3eaa90b693be69333693e3bd2b07b2`
- Trial 5 candidate design blob:
  `aa9bae6dd2c979fb702aeb435cac1d075dacab6e`
- Trial 5 candidate design SHA-256:
  `48d2418183ba1e70a4901b058f7fe762bc0d5ce231dd62c3d01a4f7718be6487`

The handoff commit which adds this request must have the Trial 6 candidate as
its sole parent and must change exactly these two paths:

```text
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-6_to_review.md
M plan/PROJECT_V5/reviews/README.md
```

The index mutation is exactly one appended pending Trial 6 row. The request
cannot contain its own future commit/tree/blob identity without a
self-reference; the reviewer must derive those objects from the committed
handoff, require its sole parent to equal the candidate above, recompute the
request and index blob SHA-256 values, and reject any additional path or index
mutation.

The reviewer must inspect the design from the candidate Git object rather
than trust a mutable working-tree copy. Any mismatch in candidate commit,
tree, parent, subject, path scope, numstat, blob, or SHA-256, or in the
committed request parent/scope, is an authentication failure.

## Append-only prior trail

The prior trail is immutable:

- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-1_to_review.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-1_result.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-2_to_review.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-2_result.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-3_to_review.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-3_result.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-4_to_review.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-4_result.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-5_to_review.md`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-5_result.md`

All ten artifacts were read completely before authoring. Trial 6 does not
edit, reinterpret, or replace any prior request or result.

## Trial 5 KO and the narrow Trial 6 boundary

The authenticated Trial 5 result is `reviewed_KO` with P0 `0`, P1 `0`, and
P2 `1`. It explicitly closes Trial 4 P2-NEW-01, keeps all four Trial 3 P1
closures, all three Trial 3 P2 closures, and all twelve survivor properties
intact, and raises only P2-NEW-02.

P2-NEW-02 is a deterministic design/gate contradiction: the planned
implementation adds files matched by the required `lint.gateway` and
`test.gateway` inventories, but §11 excluded `ci/suites.json` and §14 lacked
the governed refresh/validation sequence. An eventual implementation could
therefore neither obey the path scope nor pass the full gate.

Trial 6 changes only the design statements needed to close that P2. It does
not alter the durable state machine, authority, release, migration-set,
callback, result-shape, RED/mutant ownership, survivor, BUILT/PLANNED, or
unsupported-production boundaries.

## Four Trial 6 corrections and mandatory review

### 1. Governed inventory-only implementation scope

Section 11 now explicitly permits `ci/suites.json` strictly for the
inventory-only `inventorySha256` refresh required after the final new matched
source/test file set is known. No other field in that file may change.

The reviewer must verify that this is the only newly allowed CI path and that
it authorizes no suite addition/removal, reclassification, reorder, command,
pattern, minimum, skip, readiness, or timeout change. A diff which refreshes
an unexplained deletion or changes topology is outside the design.

### 2. Exact refresh, validation, and full-gate order

Section 14 now requires this exact tail after the governed source/test file
set is final:

```text
python3 scripts/ci_gate.py --repo-root . --refresh-inventory
python3 scripts/ci_gate.py --repo-root . --validate-only
bash scripts/ci.sh
```

The reviewer must confirm the three commands are consecutive and ordered,
that refresh happens only after the governed file set is final, that
validation consumes the refreshed manifest before suite execution, and that
the existing full gate remains the final command. No full-gate result is
claimed by this design-only request.

### 3. Non-refreshable topology contract remains unchanged

The design now states that `ci/suites-contract.json` remains unchanged because
suite IDs, topology, commands, patterns, skip allowances, and timeouts do not
change. The reviewer must compare this with the executable contract in
`scripts/ci_gate.py` and `docs/ci-contract.md`: refresh may write inventory
digests only in `ci/suites.json` and cannot self-authorize a topology change.

### 4. Existing raw-command assertion owner is explicit

Section 11 now names
`tests/gateway/coordination_queue_contract.test.js` as the existing test whose
raw `XGROUP CREATE ... MKSTREAM` command assertion changes to the guard-aware
Lua invocation. Its exact `{status:"created"}` and `{status:"exists"}`
assertions remain.

The reviewer must independently distinguish:

- the retained BUILT ordinary result-shape assertions;
- the surgical raw-command assertion update required by the planned Lua
  dispatch; and
- the separate planned
  `epoch_ensure_inbox_group_never_creates_behind_guard` RED and
  `EPOCH-TRANSPORT/GROUP-GUARD` mutant.

The existing test path is already governed by `test.gateway`, so changing its
bytes alone does not change the matched path inventory. The new planned source
and test paths do, which is why the inventory-only manifest refresh remains
required.

## Preserved closure ledger

The following are inherited independent Trial 5 rulings. Trial 6 claims no
new ruling over them; the reviewer must mark each intact or regressed:

| Immutable finding | Accepted closure that must remain intact |
|---|---|
| Trial 3 P1-01 — public service preflights bypassed atomic SEND authority | The sealed epoch dispatch reaches one sender-first, command-local classifier with closed result/rejoin mapping |
| Trial 3 P1-02 — empty release lost resumable authority after SQLite `released` | The permanent completion identity, sealed completion adapter, idempotent Redis completion, confirmation CAS, and confirmed-only restart remain |
| Trial 3 P1-03 — exported group creation could manufacture false empty transport | Guard inspection remains atomic before creation; guarded missing transport cannot be normalized to empty |
| Trial 3 P1-04 — frozen migration sets omitted root `002_lifecycle.sql` | Literal ordered five-path baseline includes both root `002` files; only the epoch set adds profile `005` |
| Trial 3 P2-01 — actual runtime callback seams were unowned | Caller fault/lifecycle seams reject before admission; module-private no-ops and callback-free child-process barriers remain |
| Trial 3 P2-02 — Trial 3 request recorded nonexistent Trial 2 objects | The actual Trial 2 request/candidate remain corrected forward; the erroneous Trial 3 request stays immutable |
| Trial 3 P2-03 — process variance was possible profile evidence | Direct fallback remains a disclosed variance only, never profile/Gateway/Claude/cross-vendor equivalence |
| Trial 4 P2-NEW-01 — ordinary group result-shape contradiction | Guard-absent results remain exactly `created`/`exists`, with deterministic lost-reply replay and unchanged guarded no-create behavior |

The candidate diff touches none of the protocol text underlying those
closures except the top status sentence, which records their preservation.
Any substantive weakening is a Trial 6 KO even if all four direct corrections
are present.

## Preserved survivor ledger

The following twelve Trial 5 survivors must each receive an explicit
intact/regressed ruling:

| Required survivor | Mandatory regression boundary |
|---|---|
| Legal durable bootstrap B1/B2/B3 | No generation-1 Redis write before the atomic durable owner/companion reservation; no credential/permit before exact two-authority confirmation |
| Durable controller succession | Exact term/controller CAS, predecessor source insertion, installed confirmation, and zero stale R1 mutation after R2/R3 |
| Drain-in-place source identity | Original inbox, `toParticipantId`, `consumeKey`, receipt/replay identity, and recipient checks remain; no transfer/rehome/alias |
| Permanent guards and settlement proofs | No TTL, delete, rehome, or runtime GC; exact proof replay only |
| Lifecycle `PERSIST` race ownership | Guarded register/renew/list/delete/install/fence/release paths preserve the inbox and never restore expiry/delete |
| Separate unread and PEL recovery | Independent bounded commands, cursor/count/reply checks, deleted-ID unknowns, and no branch fallthrough |
| Store/Redis origin binding | Server allocation, immutable authority/namespace/ordinal, collision/copy/rollback rejection, and explicit non-cloning premise |
| Exact A/R claims and effect fencing | Every repository, vault, ACK, proof, drain, observation, and destination commit checks its exact authority coordinate |
| Activation order and permit withholding | SQLite exact `A` precedes Redis activation; no active permit/consumer exists before exact agreement/readback |
| Release fence and empty-or-open source | SEND closes first; exact `XLEN == 0`, empty PEL, and durable predicates release, otherwise source-open/recovery or fault |
| Callback/observation/replay support boundary | Generic handlers, non-no-op observation, caller retry classifiers, replay, and authorization remain unsupported |
| Body-free closed diagnostics | No token, body, record, coordinate, capability, or raw Redis reply leaks; unknown never becomes success or lease-loss rejoin |

P2-NEW-02 concerns only governed file-inventory bookkeeping. It cannot be used
to reopen, simplify, or claim implementation evidence for any survivor.

## Design-only and canonical status boundary

| State | Canonical state for this request |
|---|---|
| Trial 5 design review | Rejected by the immutable KO at `35e9d25...`; P2-NEW-02 is its sole open finding |
| Trial 6 design authored | Yes, at the exact candidate object above |
| Trial 6 design reviewed | No; this request is pending and makes no verdict |
| Epoch implementation | Not started or authorized by this request |
| `ci/suites.json` runtime manifest | Unchanged by this design candidate; only a future reviewed implementation may refresh inventory-only digests |
| `ci/suites-contract.json` | Unchanged and required to remain unchanged for this correction |
| Migration `005` / fixed migration-set code | Planned; not created or applied |
| WIRING-B automatic crash recovery | Planned; not claimed |
| WIRING-A | BUILT test-profile input, unchanged and non-expiring |
| `V5-G-0-02-D01` | Remains open; this design request does not close the implementation deferral |
| Integration / promotion / rollout / release | Not performed or implied |
| Production origin/effect profile | Unsupported |
| Health/inventory composition | Out of scope and still gated on `E/0/00`, `E/0/04`, and `G/0/03` |

The candidate contains no source, test, CI manifest, suite contract, policy,
migration, product, runtime, prior-trail, integration, promotion, or release
change.

## Process variance and prospective provenance correction

### Trial 6 route actually used

Canonical agents-gateway `agent_spawn` failed with generic `TOOL_ERROR` for:

- trace:
  `tr-g2wbd6-a0ef7651-4386-492e-9e4f-df1718cc1bcb`;
- task:
  `ts-8f239f91-33ea-454a-bc4e-7b76cddfb245`; and
- exception artifact:
  `art-d4d40d21-fdf7-4ef9-903e-e0a07b6eb365`.

The operator therefore authorized this supervised direct-tmux fallback.
Claude was quota-paused. These identifiers authenticate the failed canonical
attempt and its exception artifact only: no successful Gateway-spawned
session, repository-profile compliance, Claude execution/review, or
cross-vendor equivalence is claimed.

### Trial 5 record corrected forward only

One immutable process-provenance sentence in the Trial 5 result says no
Gateway trace/task/artifact was available. That sentence is not edited.
The actual Trial 5 fallback provenance was:

- trace:
  `tr-g2wbd5-db37ec07-7cdf-4951-8fce-2741eead086b`;
- task:
  `ts-105e1edb-cb62-4dcf-bf26-161958096ca7`; and
- exception artifact:
  `art-4a302a5e-6a80-47c8-92e9-c10b3268c6f5`.

This prospective correction records the failed Trial 5 fallback route. It is
not a design finding, does not change the Trial 5 verdict, supplies no
successful Gateway session or cross-vendor evidence, and does not expand the
Trial 6 candidate.

A fresh independent Trial 6 reviewer remains mandatory. The reviewer must not
reuse this request's closure tables as a verdict.

## Author checks run

The following author checks authenticate document structure and scope only;
they are not a design verdict or implementation/runtime evidence:

- Read the governing repository instructions, orchestration profile, plan and
  reviewer skills, project/stage/sheet context, all 2,500 lines of the Trial 5
  design, all ten Trial 1–5 request/result artifacts, both CI manifests, all
  2,871 lines of `scripts/ci_gate.py`, `scripts/ci.sh`,
  `docs/ci-contract.md`, and the complete existing queue contract test.
- Authenticated the starting Trial 5 KO at
  `35e9d25bab6913cd63f29ac4c66b827175e50e47`, tree
  `6063e771ec2d7c911c3c71ab08b20eb9780e37c1`, then authenticated the Trial 6
  candidate commit/tree/parent/blob/SHA-256 and exact one-path `18 5` scope
  recorded above.
- Focused literal checks found the Trial 6 status, P2-NEW-02, exact existing
  test path/result assertions, inventory-only `ci/suites.json` scope,
  unchanged `ci/suites-contract.json` rationale, and both exact CI-gate
  commands.
- Structure checks found the expected Status, §11, and §14 headings and 38
  balanced Markdown fence markers. The design contains zero inline Markdown
  link targets; existence checks passed for every newly named existing CI,
  script, and test path.
- The exact verification tail is refresh inventory, validate only, then the
  full gate with no command between them.
- `git diff --check` passed before the candidate commit.
- Candidate path guards found exactly the durable-epoch design path and no
  product, source, test, CI, script, CI-contract documentation, or policy
  change.
- The candidate was staged and committed with an explicit pathspec on
  `feat/V5-G-0-02-wiring-b`.
- Handoff literal/structure/fence/link checks, `git diff --check`, exact
  two-path scope checks, and product/test/CI/policy guards are run before the
  handoff commit.
- The only residual path before and after candidate authoring is the required
  untracked `gateway/node_modules`; it is not staged, modified, or committed.

No focused product test, nonexistent epoch test, inventory refresh,
`--validate-only`, full `bash scripts/ci.sh` gate, live Redis experiment,
migration, integration, rollout, promotion, release, tag, or push was run or
represented. This is the required design-only correction.

## Required independent result contents

The independent Trial 6 result must:

1. authenticate the candidate commit, tree, parent, subject, blob, one-path
   scope, numstat, and committed SHA-256;
2. authenticate the request commit, tree, candidate parent, request/index
   blobs and SHA-256 values, exact two-path scope, and exactly one pending
   index row;
3. state reviewer independence and disclose the route actually used without
   inventing Gateway/profile/Claude/cross-vendor evidence;
4. give an explicit pass/fail ruling for each of the four Trial 6 corrections,
   including the exact refresh/validate/full-gate order and the unchanged
   topology contract;
5. give an explicit intact/regressed ruling for every closure and every
   survivor row above;
6. verify the Trial 5 provenance correction remains request-only provenance,
   not a design finding or candidate expansion;
7. distinguish BUILT inputs from PLANNED epoch work and design review from
   implementation, migration, integration, promotion, rollout, and release;
8. classify every new finding as P0, P1, or P2 with reproducible evidence; and
9. issue exactly one final `reviewed_OK` or `reviewed_KO` verdict.

While producing the result, the reviewer must not amend the candidate design,
this request, any prior request/result, either review index, any plan sheet,
policy, CI manifest/contract, migration, code, or test. Only the new Trial 6
result may be written. A KO correction must use Design Trial 7 rather than
rewrite this request or result.
