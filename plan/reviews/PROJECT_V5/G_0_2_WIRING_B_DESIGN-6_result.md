# Independent Production Design Review Result — Project V5 G/0/02 WIRING-B Design Trial 6

## Verdict

**reviewed_OK**

Candidate findings:

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 0 |

Non-candidate request-process defects:

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 1 |

Trial 6 closes the immutable Trial 5 `P2-NEW-02` design/gate
contradiction. The eventual implementation scope now permits only the
governed `ci/suites.json` inventory digest refresh after the matched file set
is final; the verification tail is exactly refresh, validate, then full CI;
the non-refreshable topology contract remains unchanged; and the existing
queue contract test is explicitly responsible for changing the raw command
assertion while retaining the exact ordinary `created` and `exists` result
assertions.

All four Trial 3 P1 closures, all three Trial 3 P2 closures, the Trial 4
`P2-NEW-01` closure, and all twelve survivor properties are independently
ruled intact. The candidate changes only status/boundary text, implementation
path scope, and the verification tail. It does not weaken the durable epoch
protocol.

`P2-PROCESS-01` is a real but non-candidate handoff defect: the request's final
paragraph forbids the index mutation that the repository's Rule 13, the
already-created pending row, and the operator's higher-authority instruction
require. The immutable request is not rewritten. This result replaces only
that pending verdict cell, so the resolved request-process contradiction
neither changes the candidate finding counts nor blocks its design verdict.

This is design acceptance only. It does not authorize or claim implementation,
migration, test or mutant completion, integration, promotion, rollout,
production support, or release.

## Candidate and request authentication

### Candidate object

- Review ID: `PROJECT_V5/G_0_2_WIRING_B_DESIGN-6`
- Candidate commit:
  `31e61f6ba90484b3a3383dcf6e04b513ec9c1d89`
- Candidate tree:
  `24120817f5a33a4bbb989f2f42dbe2e2e3832fc0`
- Sole parent:
  `35e9d25bab6913cd63f29ac4c66b827175e50e47`
- Subject:
  `docs(coordination): correct durable epoch design (V5 G/0/02 WIRING-B Trial 6)`
- Candidate path:
  `plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md`
- Candidate Git blob:
  `fc10f135f3736decefe227e63a4215b1b264c782`
- Recomputed committed design SHA-256:
  `f49073d2e534ce891f4a5e6baec99c57a3044a57271089f8cc5531e556e19459`

Independent Git-object inspection resolved the commit, tree, sole parent,
subject, blob, and SHA-256 above. The exact parent-to-candidate scope is:

```text
M plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md
18	5	plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md
```

No second candidate path exists. The direct parent is the immutable Trial 5
KO result. The candidate range passes `git diff --check`, and the reviewed
2,513-line design was read from the committed candidate object rather than
trusted from a mutable author summary.

The actual diff has three narrow hunks:

1. the status advances Trial 5 to Trial 6 and names only `P2-NEW-02`;
2. section 11 adds the existing queue test, inventory-only
   `ci/suites.json`, and the unchanged topology-contract boundary; and
3. section 14 adds the consecutive refresh and validate commands immediately
   before the existing full gate.

No protocol, state-machine, migration-set, release, callback, result-shape,
RED/mutant, survivor, or production-support text is otherwise changed.

### Request object and pending index row

- Request/pre-verdict commit:
  `b841db9290a713ac92440e2a8970831040af3dca`
- Request tree:
  `8ad6abfec79da7b994e702a0e2c49ccbbc6a02bf`
- Sole parent:
  `31e61f6ba90484b3a3383dcf6e04b513ec9c1d89`
- Subject:
  `docs(review): request V5 G/0/02 WIRING-B design Trial 6 review`
- Request Git blob:
  `3e0a41524a93cbe6625d02edba7d7e112c31a6e0`
- Recomputed request SHA-256:
  `38f61ac31fe21f32dd69887267a09b2e1b09e44ed5e6b96f49f76b878b6f3a55`
- Committed post-request index blob:
  `1a80fb5e66db4704d536336e24c9c03d6f98429c`
- Recomputed post-request index SHA-256:
  `ad0fc547e70a5f56ee62c34ba9db6c19c4e565801d9fe8cc6a4116f61a39e1e0`
- Pre-request index blob:
  `baadfe18a2c87955c531ad45348adf4bbbeed36b`
- Recomputed pre-request index SHA-256:
  `07b69e217f52cfc0f0a69848b50c6f2173b11178530050f7c213a7c5c70e4078`

The request commit's sole parent is exactly the candidate. Its exact
parent-to-request scope is:

```text
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-6_to_review.md
M plan/PROJECT_V5/reviews/README.md

376	0	plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-6_to_review.md
1	0	plan/PROJECT_V5/reviews/README.md
```

The index diff is exactly one appended Trial 6 row, and its verdict cell is
exactly `pending`. There is no other request or index mutation. The request
range passes `git diff --check`.

Every immutable Trial 1–5 request/result pair and the Trial 6 request was read
completely. No Trial 6 result existed before this review, and no earlier
artifact is edited by this verdict.

### Reviewer independence and process variance

- Review branch: `review/V5-G-0-02-wiring-b-design-6`
- Review date: `2026-07-30`
- Reviewer: fresh operator-appointed Codex reviewer
- Candidate authorship: none; this session did not author the candidate,
  request, or prior trail
- Delegation: none; no subagent was created or used
- Independence basis: independent Git-object, source, caller, test, manifest,
  digest, and documentation derivation

The route deviation is disclosed without equivalence claims. Canonical
agents-gateway `agent_spawn` returned generic `TOOL_ERROR` for review trace
`tr-g2wbd6r-55ca1849-6969-4af0-b955-469ff1782b9d`, task
`ts-88ada67f-3434-4513-a1e7-c8c2e2230c1a`, and exception artifact
`art-d64ea344-0287-4acf-a823-8c6f356da5d1`. Claude was quota-paused, so the
operator used a supervised direct-tmux fallback.

Those identifiers authenticate only the operator-reported failed canonical
attempt and exception artifact. This result makes no claim of a successful
Gateway-spawned reviewer session, orchestration-profile compliance, Claude
execution or review, or cross-vendor equivalence. Its independence claim is
limited to a fresh non-author reviewer and the re-derived repository evidence
recorded here.

The Trial 5 trace/task/artifact correction at request lines 286–302 remains
request-only prospective provenance. A Git search at the request commit finds
those identifiers in the Trial 6 request, not in the candidate design. It is
not candidate content, a design finding, or evidence expanding Trial 6.

## Four narrow Trial 6 corrections

| Correction | Ruling | Independently derived evidence |
|---|---|---|
| 1. `ci/suites.json` only for the final inventory refresh | **PASS** | Design lines 2299–2301 permit only `inventorySha256` after the new matched source/test set is final. `discover_files` computes the include/exclude path set and `inventory_digest` hashes the sorted paths (`scripts/ci_gate.py:173-175,193-216`). Manifest validation rejects a stale digest (`:702-715`), and `refresh_inventory` assigns only `suite["inventorySha256"]` (`:2437-2447`). |
| 2. Consecutive refresh, validate, full-CI order | **PASS** | Design lines 2503–2505 are exactly `--refresh-inventory`, `--validate-only`, then `bash scripts/ci.sh`, with no intervening command, after the governed file set is final. The first command writes only after contract/manifest validation succeeds; the second consumes the written manifest; `scripts/ci.sh` invokes the full gate. |
| 3. `ci/suites-contract.json` unchanged | **PASS** | The design requires it unchanged at lines 2305–2306 because topology does not change. The executable comparison removes only `inventorySha256` and exact-compares every other suite field and key (`scripts/ci_gate.py:504-522`). The refresh loads the contract but writes only the runtime manifest (`:2800-2818`). `docs/ci-contract.md:69-76,86-96` states the same non-refreshable boundary. |
| 4. Existing queue test owns the raw-command assertion | **PASS** | The BUILT method sends raw `XGROUP CREATE ... 0 MKSTREAM`, maps only `BUSYGROUP` to `{status:"exists"}`, and maps `OK` to `{status:"created"}` (`coordination_queue.js:3256-3276`). The existing contract test asserts those exact two objects and the raw command vector (`coordination_queue_contract.test.js:222-250`). Design lines 2288–2296 assign only the raw-command assertion change to that test while retaining both result assertions. |

### Executable CI-contract adjudication

`ci/suites.json` makes `lint.gateway` a required suite whose matched files
include `gateway/src/**/*.js`, and makes `test.gateway` a required suite whose
matched files include `tests/gateway/**/*.test.js` subject to its live-test
exclusion (`ci/suites.json:108-166`). The planned new source and non-live test
paths therefore change governed inventories. Updating bytes in the already
matched existing queue test does not itself change the matched path set.

`scripts/ci_gate.py` derives each digest solely from the sorted matched path
names, not file contents. Its contract comparison deliberately excludes only
the digest field, so refresh cannot authorize a suite addition/removal,
reorder, reclassification, command, include/exclude pattern, minimum, skip,
readiness, or timeout change. Any such future implementation diff would be
outside this design and would fail the topology contract.

The exact sequence is semantically correct:

1. once the governed source/test file set is final, refresh recomputes the
   runtime manifest digests and validates them against the topology contract;
2. validate-only reloads and checks the persisted refreshed manifest; and
3. the existing full CI entry point validates and executes the suites.

This closes Trial 5's sole finding without allowing a topology change or
claiming that the absent implementation has passed CI.

### Queue test ownership and result-shape boundary

Repository-wide caller search found no production caller of
`ensureInboxGroup`; the method and its four direct contract-test calls are the
only occurrences. The existing test is therefore the direct owner of the
BUILT command and ordinary result contract. A future compliant implementation
must change its raw command record to the planned guard-aware Lua invocation,
but must continue to distinguish exact `created` and `exists` results.

That surgical assertion update is separate from the planned
`epoch_ensure_inbox_group_never_creates_behind_guard` RED and independent
`EPOCH-TRANSPORT/GROUP-GUARD` mutant. Those planned artifacts prove that a
present guard prevents creation; they do not replace the existing ordinary
result assertions.

## Prior closure rulings

Every required closure is explicitly ruled below. **No closure regressed.**

| Immutable finding | Trial 6 ruling | Re-derived basis |
|---|---|---|
| Trial 3 P1-01 — public service preflights bypassed atomic SEND authority | **INTACT** | The sealed epoch facet still removes public preflight authority from epoch dispatch and defines sender-first command-local classification and closed mappings in section 5.1. The candidate does not touch that text; the generic BUILT preflights remain compatibility inputs, not epoch authority. |
| Trial 3 P1-02 — release lost resumable authority after SQLite `released` | **INTACT** | Sections 2.1 and 3.6 retain the permanent completion identity/ledger, sealed adapter, idempotent Redis completion/readback, exact confirmation CAS, and confirmed-only restart. The release crash rows remain unchanged. |
| Trial 3 P1-03 — exported group creation could manufacture false empty transport | **INTACT** | Section 5.1.3 still inspects the guard atomically before creation, forbids `XGROUP`/`MKSTREAM` behind any guard, preserves an existing inbox with `PERSIST`, and treats guarded missing transport as unknown rather than empty. |
| Trial 3 P1-04 — frozen migration sets omitted root `002_lifecycle.sql` | **INTACT** | Section 2.1 retains the literal ordered five-path baseline with both distinct root `002` files; only the epoch set adds profile `005`. All five committed root migration hashes recompute to the design literals. |
| Trial 3 P2-01 — runtime callback seams were unowned | **INTACT** | Section 4.5 still rejects caller `consumerFault`, `reconciliationFault`, `lifecycle.beforeRelease`, accessors, symbols, and non-plain input before admission; module-private no-ops and callback-free child-process barriers remain. |
| Trial 3 P2-02 — Trial 3 request named nonexistent Trial 2 objects | **INTACT** | Actual Trial 2 request `27c49bc357bdfb9cbb3e12c980b38ca1338cb896` and candidate `629480e3410fb7e593cdb4c3934caf329bf8e97b` both resolve as commits. The erroneous immutable request remains unedited and the correction remains forward-only. |
| Trial 3 P2-03 — process variance could be presented as profile evidence | **INTACT** | This result discloses direct-tmux fallback only as variance and expressly makes no Gateway/profile/Claude/cross-vendor-equivalence claim. Candidate protocol text is unchanged. |
| Trial 4 P2-NEW-01 — ordinary group result-shape contradiction | **INTACT** | Section 5.1.3 retains exact guard-absent `created`/`exists` results, `created -> exists` lost-reply replay, repeated `exists`, and unchanged guard-first no-create convergence. Current code/tests independently confirm the BUILT ordinary result shapes. |

The candidate's three diff hunks do not alter any of these underlying
mechanisms. Its new queue-test sentence makes the already accepted Trial 4
test-ownership consequence explicit; it does not reopen or weaken the
result-shape closure.

## Survivor rulings

Each required survivor is independently ruled below. **No survivor
regressed.**

| Required survivor | Trial 6 ruling | Re-derived basis |
|---|---|---|
| Legal durable bootstrap B1/B2/B3 | **INTACT** | Section 3.1 still commits the atomic durable `initializing(1,term,Bn,installing)` owner/companion reservation before any generation-1 Redis write and withholds credentials/permits until exact dual-authority confirmation. |
| Durable controller succession | **INTACT** | Sections 3.3–3.4 retain exact generation/term/controller CAS, predecessor source insertion, installed confirmation, higher-term convergence, and rejection of delayed lower-term mutation. |
| Drain-in-place source identity | **INTACT** | Sections 6.1–6.4 preserve the original inbox, `toParticipantId`, `consumeKey`, receipt/replay identity, and recipient checks; no transfer, rehome, or alias surface is introduced. |
| Permanent guards and settlement proofs | **INTACT** | Section 2.4 retains non-expiring guards/proofs and forbids TTL, delete, rehome, or runtime garbage collection; only exact proof replay can settle. |
| Lifecycle `PERSIST` race ownership | **INTACT** | Sections 2.4 and 5.1 retain mandatory inbox `PERSIST` across guarded register, renew, list, delete, install, fence, and release paths and forbid expiry restoration/deletion. |
| Separate unread and PEL recovery | **INTACT** | Section 6.4 retains independent bounded `XAUTOCLAIM` PEL and nonblocking unread commands, cursor/count/reply validation, deleted-ID unknowns, exact ACK/delete counts, and no branch fallthrough. |
| Store/Redis origin binding | **INTACT** | Section 2.2 retains server allocation, immutable authority/namespace/ordinal binding, exact reopen checks, collision/copy/rollback rejection, and the explicit non-cloning premise. |
| Exact A/R claims and effect fencing | **INTACT** | Sections 4.1–4.2 and 6 retain exact authority-coordinate predicates for repository, vault, ACK, proof, drain, observation, and destination commits; stale authority cannot commit an effect. |
| Activation order and permit withholding | **INTACT** | Section 6.5 retains exact SQLite `A` before Redis activation and withholds active runtime/consumer permits until exact agreement and readback. |
| Release fence and empty-or-open source | **INTACT** | Section 3.6 retains SEND closure first, exact post-fence `XLEN == 0` plus empty PEL and durable predicates, and otherwise atomically opens the source for recovery or faults unknown state. |
| Callback/observation/replay support boundary | **INTACT** | Sections 4.3–4.5 retain body-free durable observation intent while generic handlers, non-no-op observation callbacks, caller retry classifiers, replay, and authorization remain unsupported. |
| Body-free closed diagnostics | **INTACT** | Durable fault/source/completion diagnostics remain body-free; closed public mappings expose no token, body, record, authority coordinate, capability, or raw Redis reply, and unknown never becomes success or lease-loss rejoin. |

These twelve properties live in substantive sections untouched by the
candidate diff. The CI-inventory correction neither implements them nor
creates permission to simplify them in a future implementation.

## BUILT, PLANNED, and canonical status boundaries

| Classification | Independently verified state |
|---|---|
| **BUILT input** | `RedisCoordinationQueue.ensureInboxGroup` and its contract test implement/assert raw ordinary group creation with exact `created`/`exists` results. |
| **BUILT input** | The generic consumer, SQLite repository/vault, ACK outbox/reconciler, runtime/provision/lineage modules, WIRING-A test profile/owner, service, managed client, and root migrations `001`, both `002` files, `003`, and `004` exist. They are compatibility substrate, not WIRING-B epoch completion. |
| **BUILT CI contract** | Runtime and topology manifests, path-inventory digest validation, inventory refresh, validate-only mode, and the full `scripts/ci.sh` entry point exist and were inspected. |
| **PLANNED** | `sqlite_migration_sets.js`, the separate epoch test profile, profile-only migration `005`, epoch owner/recovery/facet/guard/permit modules, all five named epoch test files, and mutation drivers are absent. |
| **PLANNED / unsupported** | Automatic crash/rejoin recovery, production origin/effect profiles, online migration/upgrade, health/inventory composition, integration, promotion, rollout, and release are not implemented or supported by this result. |

The five current root migration SHA-256 values are:

```text
260eb6663adc38eb443cd6763d0b1b5acc31e317f0fbef59373ab055d6c2920d  001_initial.sql
257cab639e9cac9c9be14d197dd9f2fdca9917acca37b13f570b028a7f6200a3  002_coordination_consumer.sql
d1be59ac7968888c30234401ea779137848a08d88ac8638c90dcf40d5fb6037d  002_lifecycle.sql
fb12640b8fd79318f1efbb31a6fb8654d3e396b5c5da0542605be6bc5802366f  003_coordination_ack_outbox.sql
38ba4d8e84dd447a176c2c4f83b96cbb416681cd077d404f4469b4a459cdd6fb  004_coordination_consumer_runtime_owner.sql
```

They exactly match section 2.1. The shared-root
`gateway/migrations/005_coordination_consumer_runtime_epoch.sql` is absent, as
required.

Canonical status after this result is:

| State | Boundary |
|---|---|
| Trial 5 design | Immutable KO; its sole `P2-NEW-02` is corrected by Trial 6 |
| Trial 6 design | Authored and independently accepted at design level |
| Epoch implementation | Not started or authorized by this result |
| `ci/suites.json` | Unchanged by the design candidate; future implementation may change only governed inventory digests after its file set is final |
| `ci/suites-contract.json` | Unchanged and required to remain unchanged for this topology |
| Migration `005` and fixed migration sets | Planned, absent, and unapplied |
| WIRING-A | BUILT non-expiring test-profile input; unchanged |
| `V5-G-0-02-D01` | Still `DEFERRED`; closure requires implementation, independent review, and integration, not design acceptance alone |
| Production origin/effect profiles | Unsupported |
| Health/inventory composition | Out of scope and gated on `E/0/00`, `E/0/04`, and `G/0/03` |
| Integration / promotion / rollout / release | Not performed or implied |

## P2-PROCESS-01 — contradictory result/index handoff wording

**Severity: P2. Scope: request process, not candidate design. Non-blocking for
the candidate verdict.**

Reproduction:

1. Request lines 351–370 require authentication of the request/index blobs and
   exactly one pending index row, followed by one independent verdict.
2. Request lines 372–375 then forbid changing either review index and say only
   the new result may be written.
3. Repository `AGENTS.md` Rule 13, lines 124–127, requires every immutable
   verdict to be indexed in the project's `reviews/README.md`.
4. The handoff already appended the pending Trial 6 row, so a completed
   verdict necessarily replaces that one cell.
5. The operator explicitly resolves the conflict in favor of Rule 13 and
   authorizes exactly the new result plus that pending-cell replacement.

The defect is P2 because it makes an otherwise deterministic reviewer handoff
internally contradictory and could cause either an unindexed verdict or an
unnecessary stop. It is not P1: the higher-authority repository/operator rule
identifies one exact, bounded, auditable resolution, and no candidate,
immutable request, prior trail, product, test, CI, policy, migration, or other
index row must change.

Under the repository's append-only review convention, findings against the
candidate determine its OK/KO result. This defect belongs to the request
process, is resolved without altering the immutable request, and has no
design/CI-contract effect. Future requests should state explicitly that the
reviewer writes the immutable result and replaces only the matching pending
verdict cell.

## Reproducible checks and residual limitations

Checks completed:

- complete reads of the repository instructions, orchestration profile,
  plan-orchestration and reviewer procedures, plan/project/stage/sheet context,
  the full 2,513-line design, all prior trial requests/results, both CI
  manifests, all 2,871 lines of `scripts/ci_gate.py`, `scripts/ci.sh`,
  `docs/ci-contract.md`, the complete current queue implementation, and the
  complete existing queue contract test;
- Git type/tree/parent/subject/path/blob authentication and independent
  SHA-256 recomputation for candidate and request objects;
- exact candidate one-path/`18 5` and request-plus-one-pending-row scope
  checks;
- `git diff --check` on both authenticated ranges;
- literal/structure/path/fence checks on the committed design;
- repository-wide `ensureInboxGroup` caller/test search;
- include/exclude, digest, refresh-write, topology-comparison, and command-order
  inspection against the executable CI contract;
- SHA-256 recomputation for all five frozen root migrations;
- absence checks for the planned fixed-set module, epoch profile, profile
  migration `005`, forbidden root `005`, and five named epoch tests;
- `python3 scripts/ci_gate.py --repo-root . --validate-only`: passed with no
  manifest/contract error; and
- `node --test --test-concurrency=1
  tests/gateway/coordination_queue_contract.test.js`: one test file passed,
  zero failures.

No full product gate was required or run for this one-path design-only
candidate. No absent epoch test, mutation suite, live Redis experiment,
migration, integration, deployment, promotion, release, tag, or push was run
or represented.

Residual limitations are therefore explicit:

- the accepted design still needs TDD implementation and independent
  implementation/integration review;
- its REDs, semantic mutants, child-process crash schedules, disposable-Redis
  evidence, inventory refresh, validate-only step, and full CI tail remain
  prospective;
- `V5-G-0-02-D01` remains open until the full closure condition is met;
- production origin/effect profiles and health/inventory composition remain
  unsupported/out of scope;
- the immutable request retains `P2-PROCESS-01`; and
- untracked `gateway/node_modules` is residue only and is not staged,
  modified, or committed.
