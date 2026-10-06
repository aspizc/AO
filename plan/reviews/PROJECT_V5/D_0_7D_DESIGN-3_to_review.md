# Project V5 D/0/07d Design Trial 3 — review request

## Review identity

- Review id: `D_0_7D_DESIGN-3`.
- Requested reviewer: a fresh, independent Codex session using `gpt-5.6-sol`,
  reasoning `max`, service tier `priority`.
- Request artifact:
  `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-3_to_review.md`.
- Required verdict artifact:
  `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-3_result.md`.
- Current state: `pending`; this author-owned request contains no verdict.

The reviewer must not reuse either earlier design reviewer or this plan-author
session. A message, launcher record, checkpoint result, or this request is not
approval. Implementation remains forbidden unless a fresh reviewer returns `OK`
for the exact candidate below. The author did not delegate or self-review.

## Frozen candidate identity

| Identity | Value |
|---|---|
| Candidate commit | `e3e16cb7d22c85e06d5a8f8312ed889054ceb251` |
| Candidate tree | `9aed9d38761ab01df241ce682c871940b9fe5a19` |
| Sole parent | `2c4612c5cf6875615bfe529e96c0781aeb25abea` |
| Parent tree | `41a0efc3276553ce9fc971758ccda34c0417cca1` |
| Parent state | immutable Design Trial 2 `reviewed_KO` |
| Candidate subject | `docs(plan): bind D/0/07d verifier and stream build (V5 D/0/07d Design Trial 3)` |
| Branch | `plan/V5-D-0-07d-rebaseline` |
| Declared product/test baseline | `d0bf521799b16f7d3300163ce40bd7dfca49864d` |
| Declared baseline tree | `0c577aef5bd864c51bf60086b9b3cb5daa254000` |

The parent is authenticated as the Trial 2 KO commit with sole parent
`4075736d8eafa022e844559279d31a0162af516d`, subject
`review(v5): reject D/0/07d Design Trial 2 build-ready plan`, and exact two-path
delta: modify `plan/PROJECT_V5/reviews/README.md` by one insertion and one
deletion, and add
`plan/reviews/PROJECT_V5/D_0_7D_DESIGN-2_result.md` with 299 insertions.

The complete Trial 3 candidate pathset is exactly:

```text
plan/PROJECT_V5/D/0/07.md
plan/PROJECT_V5/D/0/07d.md
```

| Path | Candidate blob | Parent-to-candidate numstat |
|---|---|---:|
| `plan/PROJECT_V5/D/0/07.md` | `1544d5a70a80c402fd91de4480496585ed59e5bc` | 25 insertions, 6 deletions |
| `plan/PROJECT_V5/D/0/07d.md` | `63f4d648400d7ec23a4c81738003bac09c28ddc5` | 561 insertions, 151 deletions |

No source, test, fixture, policy, package, dependency, lockfile, workflow, CI,
review artifact, status registry, or unrelated plan path is in the candidate.

## Frozen request-commit contract

The handoff commit must be a single-parent direct child of the candidate above.

| Request property | Required value |
|---|---|
| Direct parent | `e3e16cb7d22c85e06d5a8f8312ed889054ceb251` |
| Parent tree | `9aed9d38761ab01df241ce682c871940b9fe5a19` |
| Subject | `docs(review): request D/0/07d build-ready review (V5 D/0/07d Design Trial 3)` |
| Exact pathset | this new request plus `plan/PROJECT_V5/reviews/README.md` |
| Index delta | append exactly one separate pending Design Trial 3 row after Trial 2 |
| Result path at commit | absent |

The request cannot embed its own commit/tree without self-reference. The reviewer
must resolve the branch tip, freeze the request commit/tree in the result, verify
the single parent, subject, and exact two-path request delta, and prove that the
candidate blobs at the request tree remain the values above. The review index blob
before this request is
`b9fab98eab2df950406788101b16e9eb0ed6321d`.

## Immutable prior trail

| Artifact | Blob at the candidate |
|---|---|
| `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-1_to_review.md` | `e622764d2c8c6082d60d6d983a18f858a02ba51c` |
| `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-1_result.md` | `d2782b9a76ea9686d1c23aff7434cea91fcb581c` |
| `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-2_to_review.md` | `c29dce81a1e2e6ce94e29f26cb3121b7c148d39a` |
| `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-2_result.md` | `7a9286d1726aaf5c5008aa284b2aa5fc7d19dd92` |

Trial 1 and Trial 2 remain immutable KO evidence. Trial 3 corrects the two
substantive Trial 2 P1 findings; it does not rewrite either verdict.

## P1-1 correction — independently anchored candidate verifier

The candidate moves candidate materialization and authentication ahead of every
source/build, validator, test, TAP parser, and evidence operation. It freezes the
exact `D007D_REVIEW_LAUNCHER_V1` Bash algorithm between named markers in
`D/0/07d`. Mechanical LF-preserving extraction has digest
`sha256:789b74670a9313120ce4e1e1f29ee44b25476cce4d086103e4e51c43b7a01263`;
the reviewer must recompute it rather than trust this value.

The launcher is outside every implementation candidate. For each run the
independent reviewer extracts it from the exact independently approved Design
Trial 3 commit, records its path/hash/owner/mode, and supplies only the frozen
ten-position argv under an empty allowlisted environment. It:

1. disables ambient Git configuration and prompts; rejects dangerous local Git
   configuration, object alternates, writable object/toolchain/dependency trees,
   non-absolute or pre-existing outputs, and unsupported modes;
2. authenticates the explicit 40-hex commit/tree in a reviewer-created read-only
   bare object database, creates a `git clone --no-hardlinks --no-checkout`
   materialization on reviewer tmpfs, removes origin, checks out detached HEAD,
   proves exact SHA/tree/clean status, verifies the critical candidate blobs, and
   makes the materialization read-only;
3. exclusively creates the reviewer-owned evidence file, opens fd 3 in append
   mode, verifies its regular-file owner/mode/link count, and writes the
   provenance/input/blob preamble before candidate code starts;
4. executes the candidate wrapper by its absolute materialized path. Unit modes
   run the frozen absolute candidate test argv; stream mode directly executes the
   absolute materialized coordinator with the absolute toolchain runtime;
   focused/full-CI modes use only absolute materialized validator/test/CI paths;
5. opens the raw binary destination and build-stderr file itself before candidate
   execution, performs independent framing/type/mode/owner/hash/ELF Linux-amd64/
   version/extension checks, repeats binary and candidate identity after
   execution, appends the sole done record, and syncs the evidence file; and
6. fails nonzero without a done record on child failure, signal, timeout, parse
   error, identity drift, prerequisite failure, or residue.

The candidate never approves or hash-authorizes that launcher and cannot claim
its own provenance. Each checkpoint request records exact RED and GREEN candidate
blobs for the wrapper, coordinator, manifest, patch, extension, frozen recipe,
validator, CI script, and every executed test/fixture.

The deterministic bootstrap RED poisons only a disposable ambient worktree's
wrapper/coordinator with exit-97 canaries. The exact launcher still exits zero,
leaves the sentinel absent, and records candidate-sourced probe/blob evidence; a
reviewer-only launcher mutant that uses `$PWD` exits 97 and creates the sentinel.
The same unmutated bootstrap is mandatory for unit, Docker-integration, focused,
and full-CI fresh instances. No ambient command can count as checkpoint evidence.

## P1-2 correction — exact stream-native Docker build

The candidate stops claiming that
`gateway/vendor/tmux-agents/build-offline.sh` is invoked. That file remains
unchanged, outside every implementation pathset, and fixed at blob
`dca11355e5acef80ffaccef564e1e216c1866dca`; it is source evidence for pinned
semantics only. The unchanged manifest/patch/extension blobs are respectively
`0c0f0c758a385d0a3ba727071213215d00c45f9e`,
`c2ca3c3875ab9ac2345adbc2b1f989950ce22038`, and
`1c3282ae68e51e45aaecd13882f1f0eb4387648b`.

Checkpoint 1 retains exactly seven candidate paths and no conditional pathset.
If those paths cannot express the solution, implementation stops for plan review;
the pathname builder may not be edited or added.

The authenticated wrapper directly executes the authenticated coordinator. The
coordinator opens the external source archive no-follow, binds its hash to the
held descriptor, consumes manifest/patch/extension bytes only from the same
materialization, and creates one deterministic POSIX USTAR stream with exactly
these ordered regular members and no trailing bytes:

```text
tmux-3.6a.tar.gz
tmux-3.6a-agents.1.patch
cmd-agents-capture.c
```

Headers freeze names, mode `0444`, uid/gid zero, empty owner names, mtime zero,
regular type, size/checksum/padding, and exactly two zero end blocks. The exact
single Docker `run` argv is frozen in the sheet: pinned Linux/amd64 image,
`--pull never`, `--network none`, read-only root, dropped capabilities,
`no-new-privileges`, current uid/gid, two container-private tmpfs mounts, one
candidate-and-nonce label, and no `-v`, `--volume`, `--mount`, bind source,
Docker-socket pass-through, or host source/output path.

The frozen container program redirects diagnostics to stderr, reads only that
USTAR stdin, checks the exact three names, validates all three manifest hashes,
applies the frozen patch/extension/configure/make/parser/version recipe, emits one
final size/hash status record to stderr, and writes exactly the installed binary
bytes and EOF to stdout. The launcher captures stdout through its already-open
regular file on transient tmpfs. Missing/duplicate/non-final status, prefix,
delimiter, second payload, suffix/trailing bytes, size/hash mismatch, wrong file
identity, wrong ELF/platform/version/extension, or residue fails closed.

Checkpoint 1 now owns:

- a non-Docker canonical-stream unit RED/GREEN with exact `2/0/2/0/0` then
  `2/2/0/0/0` test/pass/fail/skip/cancel totals and mutation coverage for every
  header/member/framing/status/ELF field;
- the existing teardown unit RED/GREEN with the same exact totals;
- a Docker integration RED that selects an injected legacy-builder sentinel,
  records one attempted legacy selection and three forbidden mounts, contacts no
  daemon, exits 78, and has no build/done record; and
- a Docker GREEN that records one exact mount-free invocation, zero legacy
  selection, three stdin members/hashes, raw ELF stdout, one final status, verified
  binary, and launcher done record with exit zero.

The Docker GREEN has a 900-second wall timeout. Missing Linux/amd64, exact source,
Docker daemon/client/image, tmpfs, user manager/cgroup, bwrap, toolchain, or Node
dependencies is a hard failure, not a skip. Candidate-and-nonce container/unit
labels, sockets, processes, and host-staging canaries must have zero residue.
Focused and full-CI runs repeat the same bootstrap/build in separate fresh
instances.

## Trial 2 closures preserved

- Checkpoint 1 alone owns the exact `test.gateway.inventorySha256` transition
  from 123 paths / `sha256:132a5af375807e8d272ddf01516939a7834e33ca9d6dce61a22401b2af3a44f5`
  to 124 paths / `sha256:cc4b83a31abc1f1305f963d4fee40278fcf335c02f90dbd52210c1bd06d07bad`.
  No other suite, contract, CI, package, dependency, lock, or workflow value may
  change.
- Fixture-owner and outer real-host teardown retain zero path-deletion authority
  on every branch. The final-observation replacement RED, evidence-only dirfds,
  exact pidfd child signal, replacement survival, evidence-before-fd-close, and
  namespace-disposal-only reclamation remain binding. Frozen product cleanup may
  still retire an exactly sealed port-owned pane/session through its retained
  connection.
- Checkpoints 1, 2, and 3 remain strictly serial implementation/review units.
  Each next checkpoint starts only from the exact prior candidate authenticated
  by a fresh independent OK; no parallel preparation is allowed. Intermediate
  checkpoint OKs are not final `D_0_7D` and do not unblock `D_0_1_SPLICE`.
- Checkpoint 3 retains the source-grounded
  `returns SESSION_PORT_CANCELLED when snapshot cancel wins after B and before R`
  RED, the exact successful current result, error oracle, and the frozen write/
  snapshot settlement ordering. The three mandatory ordering cases and zero/
  partial/full-write-before-response rules remain exact.
- Project status remains `39 complete + 4 in progress + 39 planned = 82`, with
  43 open and exactly `C/1/00`, `D/0/01`, `G/0/02`, and `H/0/01` in progress.
- Provider-free errors/data boundaries, literal helper `os.execve`, absent public
  splice, no shell/`send-keys`, Linux isolation, empty-environment/no-network/
  no-credential rules, path/policy boundaries, and no hosted/support/release claim
  remain unchanged.
- Only a separate final fresh `D_0_7D` OK after all three checkpoint OKs may let
  `D_0_1_SPLICE` consume the gate.

## Trial 2 trace/session metadata discrepancy

This is a non-candidate prior-evidence metadata defect and is separate from the
two substantive Trial 2 P1 findings above.

The immutable Trial 2 result blob names, exactly, trace
`tr-d007d-design-t2-sol-a4d59b6e-052e-4c74-9dd1-2e0aa995eeb5` at line 23.
The actual Gateway route that owned reviewer session
`ag-tr-tr-v5-d007d-design-t2-codex-reviewer` was instead
`tr-tr-v5-d007d-design-t2-so-8645b290-39d6-420e-a964-b71092517bc5`; its recorded
artifact id is `art-112baa6e-955c-489e-9d89-7fa7206fc32d`.

That route/session/artifact mapping is repeated in the operator-authoritative
Trial 3 instruction and in continuation checkpoint
`.continuation-checkpoint-2026-08-03-v7.md` line 29 (observed file SHA-256
`18429706e8a8ed3dbaee5ef46e396e8dd2389432d560bf2fbf7dbb26ef05e584`).
Fresh post-closure Gateway lookups were also attempted: orchestration view returned
`null`, agent view returned `NOT_FOUND`, and artifact get returned `NOT_FOUND`.
Therefore the historical live route is no longer reproducible from retained
Gateway state; this limit is explicit and no stronger live-authentication claim is
made. Trial 2 is not amended.

The fresh reviewer must authenticate the two Git- and source-grounded substantive
KO findings independently, acknowledge this distinct metadata mismatch and lookup
limit, and must not turn the mismatch into a Trial 3 candidate defect or treat it as
evidence that either substantive finding was closed.

## Independent review questions

Return `OK` only if every item is true; otherwise return `KO` with prioritized,
file/line-grounded findings:

- Candidate and request commits, trees, sole-parent chain, subjects, exact
  pathsets/numstat/blobs, absent result, and all four prior artifacts authenticate.
- The launcher is a minimal non-circular reviewer trust root: its exact bytes,
  inputs/environment, safe no-hardlink materialization, detached/tree/clean/blob
  checks, absolute candidate execution, evidence ownership, failure semantics, and
  ambient-substitution RED are executable without candidate self-attestation.
- Materialization/authentication precedes every source/build/test/parser/evidence
  action in every RED, Docker, focused, and full-CI instance.
- The exact three-member USTAR, Docker argv, container program, stderr/stdout
  protocol, launcher capture/checks, unit and Docker RED/GREEN, timeout,
  prerequisites, and residue rules are sufficient without invoking or changing
  `build-offline.sh` or expanding the seven-path checkpoint scope.
- Every Trial 2 closure listed above remains exact, including the inventory
  digests, zero-deletion/replacement rule, three serial reviews, cancel-before-`R`
  ordering, 82/43 arithmetic, isolation/data boundaries, non-claims, and final
  splice block.
- The trace mismatch is classified only as the disclosed historical metadata
  defect; the reviewer distinguishes it from and independently verifies the two
  substantive KO corrections.
- The candidate claims only planned/pending design state and makes no
  implementation, self-review, integration, promotion, release, hosted-CI,
  support, legal, commercial, security, regulatory, or deletion-policy decision.

The verdict must identify the fresh reviewer session/profile, freeze both candidate
and request identities, list commands/evidence and limitations, adjudicate each P1
correction separately, and state explicitly whether implementation may begin. It
must not claim integration, promotion, release, or an unblocked splice.

## Author-side proportional verification

- `git diff --check` passed. The candidate contains exactly the two plan paths and
  the frozen blobs/numstat above.
- All 12 relative Markdown-link occurrences in the two candidate documents resolve;
  none has a fragment requiring an anchor target.
- `python3 scripts/ci_gate.py --repo-root "$PWD" --validate-only` returned
  `status:"passed"`, zero errors, and zero test/pass/fail/skip counts.
- An independent shell enumeration of the manifest globs/exclusion and the exact
  sorted newline-join digest algorithm returned current 123 /
  `132a…a44f5` and hypothetical 124 / `cc4b…7bad`.
- Mechanical enumeration of all 82 executable sheet headers, excluding the
  `D/0/07` index, returned 39 complete, 4 in progress, 39 planned, and 43 open,
  with the exact four in-progress ids above.
- The four prior request/result blobs match their originating commits. The frozen
  source/build/CI paths are byte-identical between the declared baseline and
  candidate; source checks found the composed factory/helper path, one helper
  `os.execve`, the current cancel-before-`R` successful-return path, and the public
  ask/view adapter route.
- The unchanged legacy recipe has exact blob `dca113…`, requires two pathnames, and
  contains three bind mounts plus the frozen image/hash/patch/configure/make/parser/
  version semantics. Candidate manifest/patch/extension and gate-script blobs were
  recomputed.
- The extracted launcher passed `bash -n` and recomputed to exact
  `sha256:789b…1263`. Mechanical plan checks found one Docker `run`, three stdin
  members, zero bind-mount tokens in the frozen argv, seven checkpoint-1 paths,
  zero legacy-builder delta, and zero forbidden implementation/status/support
  claims.

No Docker, tmux, provider, network, Redis, PostgreSQL, destructive cleanup,
product test, checkpoint test, isolated real-host lane, full CI, implementation,
integration, promotion, tag, push, release, or hosted-CI operation was run. Future
checkpoint artifacts, external source/image/toolchain/runtime prerequisites, exact
focused TAP manifest, and real-host cleanup results do not yet exist and are not
inferred.

## Status

`pending` fresh independent Design Trial 3 review. The required result path is
absent at request creation. This request is not a verdict, and implementation
remains forbidden until that result independently returns `OK` for the exact
authenticated candidate.
