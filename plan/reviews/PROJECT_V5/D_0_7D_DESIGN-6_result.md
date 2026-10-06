# Project V5 D/0/07d Design Trial 6 — independent review result

## Formal disposition

| Property | Adjudicated value |
|---|---|
| Review id | `D_0_7D_DESIGN-6` |
| Formal verdict | `reviewed_KO` |
| Candidate commit | `1366abcc556f048d205ef6874f07d4856b4bed06` |
| Candidate tree | `ba3689f1c91def1e8115c6b3cf83e9f3a4829666` |
| Request commit reviewed | `b70d001530fcd28aea83f719a63a5de1c96c8856` |
| Independent reviewer | fresh Codex `gpt-5.6-sol`, reasoning `max`, service tier `priority` |
| Recovery task | `ts-ecb857a2-6e67-4dfb-af65-2f88016dc434` |
| Recovery trace | `tr-v5-d007d-t6-final-recove-878ec43d-2f43-49d7-a59d-cbb354e40a25` |

Candidate `1366abcc556f048d205ef6874f07d4856b4bed06` is formally
**`reviewed_KO`** for Design Trial 6. Three of the six immutable Trial 5
corrections are only `PARTIALLY_MET`, and five P0 plus six P1 findings remain
unresolved. The conjunctive `reviewed_OK` rule therefore cannot be satisfied.

## Independence, recovery custody, and authority

This is a procedural, same-vendor independent review; no cross-vendor
independence is claimed. Candidate authors, author-owned tasks and evidence,
the request, messages, and candidate-authored aggregates have no verdict
authority.

The prior independent reviewer completed the bounded M7 synthesis before the
unexpected global tmux-server loss at `2026-08-04T14:13+02:00`. That synthesis
used task `ts-9cff04c7-a337-4824-94e0-23257268163f` and trace
`tr-52f3b0ed-fe98-414e-8e98-fcd6c9206be6`. After the loss, this fresh Sol/max
reviewer authenticated the complete evidence chain and issued this formal
verdict under the recovery task and trace above. The tmux loss grants no
authority and supplies no evidence.

The recovery wrapper is authenticated artifact
`art-95c71d9e-de6e-484a-9e50-b029ff23e9f0`. The original M8 specification is
artifact `art-e6c28c73-a234-4acb-a12e-777f59742ac0`, 89 lines / 4,616 bytes,
SHA-256 `a6a60e25f85e3c3ad2d8a8852f3b2510b3ebc5fb4f1d5bb8ad25700fd25773af`.

## Exact evidence provenance

The evidence root is
`/home/carase/git/personal/agents-orchestrator/workspace`. M1-M6 were preserved
as independently authenticated cross-checkpoints by M7 and were re-bound by
exact on-disk identity before this result was written. M7 itself was read in
full and authenticated before adjudication.

| Checkpoint | Evidence file | Lines / bytes | SHA-256 | Recorded artifact |
|---|---|---:|---|---|
| M1 | `.d007d-design-t6-review-m1.md` | 376 / 21,788 | `aeba6fea0bbec1664260dd4b7205e1b51c5b70c61a9295575719ad2eb352cea1` | `art-018c19ba-d479-4e35-acc8-28b4fbd1f6e2` |
| M2 | `.d007d-design-t6-review-m2.md` | 516 / 26,586 | `ca3363fedb6f3067207db7415ba5982a800c140c820402e26213423a8330d910` | `art-67d67b26-23ff-4a3c-8107-cf345b58d053` |
| M3 | `.d007d-design-t6-review-m3.md` | 471 / 22,605 | `795598371f2284d75b137f7fcb8c8d48c465755896c42c6e8dc9fe00a7b1526f` | `art-29f1b236-e17e-4176-89bc-1d60da7f20e2` |
| M4 | `.d007d-design-t6-review-m4.md` | 393 / 20,800 | `ca0655c43e3a72be6bcfaf7ff71a38e43647218980e0198c6897f37700fc8d6c` | `art-7fa36296-f809-4e6c-9eeb-1262112b1dcb` |
| M5 | `.d007d-design-t6-review-m5.md` | 369 / 23,353 | `ec26b4fe999a3296d1b921d0fc45dc60b5ad7151a4f99e2bd2bc896502adca36` | `art-e2d8342e-7cf8-43c8-8cea-6abc77a94bf3` |
| M6 | `.d007d-design-t6-review-m6.md` | 319 / 18,701 | `4e6dec7fd494f317c564fa9f9f3a3b760ec673cd3055f8be5ef8542cd4df1b83` | `art-413904a0-73fa-4ca3-89d0-d0156d8fee49` |
| M7 | `.d007d-design-t6-review-m7-synthesis.md` | 217 / 19,498 | `1f3f3a8f6ac829d4bde75a18b982222d8f2b2d473f1cb5cfdd92671c884d10bb` | `art-d4d0b9b3-de37-4412-9a50-ea23df9f1798` |

M7 records authenticated prompt artifact
`art-5165acad-bf26-48af-88a4-1496046392f8`. An artifact id is provenance, not
verdict authority; the decision below is bound to the authenticated bytes.

## Request and candidate custody

| Item | Independently authenticated value |
|---|---|
| Review branch | `review/V5-D-0-07d-design-t6-sol` |
| Request commit / tree | `b70d001530fcd28aea83f719a63a5de1c96c8856` / `b9c18800b66bdd5569975debe86105f218b9252f` |
| Request sole parent | `1366abcc556f048d205ef6874f07d4856b4bed06` |
| Request author / committer | `carase <historical-email-redacted>` / `carase <historical-email-redacted>` |
| Request subject | `docs(review): request D/0/07d executable custody review (V5 D/0/07d Design Trial 6)` |
| Request delta | exactly `M plan/PROJECT_V5/reviews/README.md` and `A plan/reviews/PROJECT_V5/D_0_7D_DESIGN-6_to_review.md` |
| Request file | blob `f502b47a68962f70dd53d77a750856594c54db80`; 304 lines / 20,161 bytes; SHA-256 `4b1a3d78bd4f106f90fb66863123542b5886327175953198d97b0767f0edc1d2` |
| Index custody | pre-request blob `d3cd779625ab07207a292f73dc9346ad227c5d2a`; request blob `732b6d08cd720dd73269c822502c6a54a8d46160` |
| Candidate commit / tree | `1366abcc556f048d205ef6874f07d4856b4bed06` / `ba3689f1c91def1e8115c6b3cf83e9f3a4829666` |
| Candidate sole parent | `9bdeae4585206a2d9089646280699f1b256e478b` |
| Candidate author / committer | `carase <historical-email-redacted>` / `carase <historical-email-redacted>` |
| Candidate subject | `docs(plan): synchronize D/0/07d Trial 6 custody (V5 D/0/07d Design Trial 6)` |
| Candidate plan blobs | `07.md` = `87a9bb76549fe93db30815ac5aee7231c4bf008d`; `07d.md` = `705e7b41a230a7311b010f9ca705d0e4891eb8de` |

The worktree and index were clean at request HEAD, the Trial 6 result was
absent both at that commit and in the worktree, and the unique Trial 6 index
row was pending before this result. This matches the frozen request contract
at `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-6_to_review.md:25-91`.

## Six immutable Trial 5 corrections

Severity on a `MET` row is an evidence-boundary note, not an unresolved
correction. P0 and P1 rows block approval.

| # | Immutable correction | State | Severity | Independent rationale | Required correction or boundary |
|---:|---|---|---|---|---|
| 1 | Exact reached-contract paths/blobs | `MET` | P2 | M1 resolved exactly three unique Git blobs matching spec, oracle, and candidate OIDs 3/3; all stale forms were absent; the proof was deletion-sensitive (`.d007d-design-t6-review-m1.md:251-294`, `:328-349`). | No further correction for this row. This proves frozen design identities, not implementation, integration, or live-host behavior. |
| 2 | One executable custody/reconciliation parent and production reachability | `PARTIALLY_MET` | P0 | M2 establishes one frozen executable, public `run -> run_parent`, one production `RealParentExecutor -> ParentCore`, and the same `ParentCore` in direct proof (`.d007d-design-t6-review-m2.md:209-231`). Its selftest relation does not execute the production launch relations (`:442-486`); production replaces required socketpairs with pipes and omits the complete identity chain (`:490-499`). M3 directly finds actual reconciliation `3/7/8/10` while reporting `3/6/8/10`, an unused 100-second slice, missing scan separation, and potentially repeated cleanup (`.d007d-design-t6-review-m3.md:8-31`). | The sole executable production parent must implement the frozen launch identity, channel custody, exact Docker operation/reconciliation transcript, evidence custody, and bounded cleanup. Same-file ownership plus self-reported deterministic output is insufficient. |
| 3 | Canonical public frame handling | `MET` | P2 | M4 finds one public `frames_public`, one `validate_frames`, a shared archive/test validator, and archive-only validation/sealing (`.d007d-design-t6-review-m4.md:8-21`). Six isolated mutants distinguish dispatch, validator, sink, phase, schema, and decision cardinality; the real-fd archive path also passed (`:264-300`). | No further correction for this row. The bounded fd/frame/archive proof is not a complete parent or live-host proof. |
| 4 | One executable 700-inside-900 deadline composition | `PARTIALLY_MET` | P0 | M5 proves one build receives 700 seconds, shares the sole start time, is clamped by outer time, and contains no 840 (`.d007d-design-t6-review-m5.md:251-260`). But proof and execution dictionaries are disconnected; reconciliation 100 and finalization 40 are unread; other phases consume the clock; raw read/finalization/removal/cleanup can overrun 900; cleanup may run twice; and surviving mutants expose the missing bindings (`:261-298`). | Enforce the executable `10/60/700/100/40` vector under one non-resettable 900-second deadline across every wait, finalization, cleanup, and pre-executor operation. |
| 5 | One EOF/transition contract, including both-channel mutation sensitivity | `PARTIALLY_MET` | P1 | M6 confirms the accepted sequence, no observation-only transition, the accepted path, five wrong orders, and an early single-channel rejection (`.d007d-design-t6-review-m6.md:60-107`). But deleting only the both-channel predicate leaves the complete public selftest byte-identically green; only the reviewer-owned separating probe catches it (`:175-189`). | Candidate-owned executable evidence must fail independently when either D7C2 or diagnostic EOF is missing after `SHIM_WAIT_ACCEPTED`. |
| 6 | An actual retained writer and its production-threat-model relation | `MET` | P2 | M6 shows moving holder release before the 250 ms poll kills the delayed-writer test and proves an actual retained writer (`.d007d-design-t6-review-m6.md:175-184`). It statically relates two production stream writers to both-EOF/client/exit gating and fail-closed timeout/cleanup, while explicitly recording that the fork proof and production path are call-graph-disconnected and use different pipes (`:191-252`). | No further correction for retained-writer existence. Production reachability is static and the live 900-second lane is unrun; row 4 owns the deadline defect. |

## Deduplicated F01-F11 finding register

Each finding appears once. The evidence references identify the authenticated
checkpoint bytes; impact and required correction are kept distinct from the
candidate's reported aggregates.

| ID | Severity | Evidence | Finding and impact | Required correction |
|---|---|---|---|---|
| F01 | P1 | M2 `:490-499` | Production uses two `pipe2(O_CLOEXEC)` pairs instead of two Unix stream `socketpair` pairs, contradicting the frozen channel-custody contract. | Use the required two Unix stream socketpair pairs in the sole production parent and bind the mechanism with direct, deletion-sensitive evidence. |
| F02 | P0 | M2 `:490-499` | The pre-`UNIT_BOUND` MainPID, reviewer uid/gid, pidfd, executable, argv, start-token, cgroup, and direct-systemd-child authentication chain is absent; authority can be reached without required identity proof. | Implement and fail-closed verify the complete chain before `UNIT_BOUND`, with evidence that distinguishes removal of each conjunct. |
| F03 | P1 | M3 `:8-31`; M5 `:300-335` | `ALREADY_EXITED` performs seven Docker operations but reports the accepted six-token tuple, so the recorder validates a self-report inconsistent with actual calls. | Bind the transcript to observed calls and make any count/order/argv mismatch fail. |
| F04 | P0 | M3 `:8-31`; M5 `:251-298` | The 100-second reconciliation slice is unused, scans have zero rather than 250 ms separation, and cleanup can retry; deadline composition is neither consumed nor bounded. | Enforce the reconciliation slice, required scan separation, and single bounded cleanup under the shared outer clock. |
| F05 | P1 | M5 `:300-335` | Docker argv uses top-level aliases, formatted inspect, and run-label-only filtering instead of exact `container wait/kill/rm`, `inspect --type container`, and run+role scans; target selection differs from contract. | Emit and directly verify the exact accepted Docker argv and both-label selection on every reconciliation path. |
| F06 | P0 | M5 `:300-335` | Cidfile adoption uses pathname `open(...).strip()` without held-dirfd `openat`, `O_NOFOLLOW`, metadata/shape checks, or label/name authentication, leaving a substitution ambiguity at an authority boundary. | Use held-dirfd, no-follow, metadata/shape validation, and label/name authentication before inspect-by-name adoption. |
| F07 | P0 | M5 `:300-335` | Normal production Docker work is one captured `subprocess.run` per role rather than the claimed ten recorded operations, and build stdout is memory-captured instead of streamed to the held output inode; the claimed custody transaction is not implemented. | Execute and observe the required operation sequence and stream output directly to the held inode, with evidence bound to emitted bytes and calls. |
| F08 | P1 | M5 `:300-335` | Docker inherits the generic environment instead of private `HOME`, empty `DOCKER_CONFIG`, and exact `DOCKER_HOST`; service child custody uses `subprocess.run` rather than per-client pidfd lifecycle. | Supply the exact private environment and implement direct per-client pidfd lifecycle custody. |
| F09 | P0 | M5 `:251-298` | `RealParentExecutor.finalize` receives 40 seconds but never reads it, so archive/evidence work can exceed the hard outer deadline. | Consume and enforce the finalization budget against the same non-resettable outer clock, including all evidence and cleanup work. |
| F10 | P1 | M2 `:442-499`; M3 `:8-36` | Contracts and attacks bypass `ParentCore`, while outer runtime cleanup sits in `run_parent.finally`; same-file placement does not establish one executable state owner and public aggregates do not traverse production. | Route production, contracts, attacks, and cleanup through the same executable custody state machine and prove that production route directly. |
| F11 | P1 | M6 `:175-189` | Removing only the missing-diagnostic-EOF predicate leaves the complete public selftest exit-zero and byte-identically green, so an essential two-channel guard lacks candidate-owned mutation sensitivity. | Add a public separating case that fails when either required EOF predicate is removed while order remains otherwise valid. |

### P2 evidence boundaries

- Row 1's exact 3/3 reached-contract proof is deterministic design evidence;
  it does not prove implementation, production reachability, or live-host
  behavior (M1 `:251-349`).
- Row 3's canonical frame/archive seam is bounded local fd/frame/archive
  evidence; it does not repair parent, reconciliation, or deadline custody
  (M4 `:264-348`).
- Row 6 proves an actual retained writer and a static production-threat-model
  relation, not execution of the real parent or a live 900-second lane
  (M6 `:175-252`).

These P2 items preserve the limits of the three `MET` rows. They are not used
to dilute or duplicate F01-F11.

## Passed evidence and evidence limits

- M1's three frozen Git-blob identities are independently deletion-sensitive.
- M2's bounded static ownership graph and selftest/direct-result equality pass,
  but those checks do not execute the systemd, PID/pidfd, executable, argv,
  cgroup, Docker, or channel-custody production relations (M2 `:442-499`).
- M3's green contracts and attacks are deterministic public-mode evidence, not
  evidence for the unexecuted production parent (M3 `:8-36`).
- M4 directly proves the canonical public frame validator/archive route and
  kills six isolated mutants (M4 `:264-300`).
- M5 proves one clamped 700-second build and absence of 840/reset/second-full-
  build behavior, but not executable consumption of `60 + 700 + 100 + 40`
  (M5 `:251-298`).
- M6 proves a real delayed writer and the shared POSIX EOF invariant, while its
  reviewer-owned fork remains distinct from the production route
  (M6 `:175-252`).

Candidate-authored or self-reported counts and hashes are not promoted to
production proof. They are credited only where independent direct or
deletion-sensitive observation binds the underlying behavior. Accordingly,
green aggregates do not close F03, F04, F09, or F11.

## Unavailable lanes and exact non-claims

Gateway artifact recovery is not represented as successful: M4 records the M3
Gateway artifact as unavailable (`.d007d-design-t6-review-m4.md:350-354`), and
M6 records the M5 artifact and then-current trace metadata as unavailable
(`.d007d-design-t6-review-m6.md:288-294`). Exact authenticated checkpoint bytes,
not fresh Gateway retrieval, are the evidence used here.

No complete public `AUTHORITY_PARENT run`, live Docker daemon/container,
user-systemd/cgroup/bwrap parent, live 900-second wait, provider/network lane,
Checkpoint 1, aggregate CI, or live-host operation was run (M6 `:295-310`).
Those lanes are unavailable or deliberately unrun and are not described as
passing. No CI, test, or lint execution is claimed by this formalization step.

## Mechanical decision and lifecycle boundary

| Approval predicate | Trial 6 result |
|---|---|
| All six immutable corrections are `MET` | **No** — rows 2, 4, and 5 are `PARTIALLY_MET`. |
| No unresolved P0/P1 finding remains | **No** — F02/F04/F06/F07/F09 are P0; F01/F03/F05/F08/F10/F11 are P1. |
| `reviewed_OK` is available | **No** — both required conjuncts fail. |
| Formal disposition | **`reviewed_KO`**. |

Trial 6 requires a new author correction and a new independent review trial.
Checkpoint 1 may not begin. `D_0_1_SPLICE` remains blocked. D/0/07d remains
`planned` and unimplemented.

Trial 5 remains its own immutable `reviewed_KO`; this result adjudicates Trial
6 only. This design-review KO makes no implementation, integration, promotion,
support, release, publication, merge, tag, or push claim.

> Public import note (2026-10-06): the source Git evidence contains a corporate
> email address, redacted here as `historical-email-redacted`. Original commit
> identifiers and verdict content are preserved; this is a sanitized imported copy.
