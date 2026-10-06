# Project V5 D/0/07d Design Trial 4 — review request

## Review identity

- Review id: `D_0_7D_DESIGN-4`.
- Requested reviewer: a fresh, independent Codex session using `gpt-5.6-sol`,
  reasoning `max`, service tier `priority`.
- The review must use a new orchestration trace, reviewer session, and worktree. It
  must not reuse the author session or any Trial 1–3 reviewer session.
- Independence is necessarily procedural and same-vendor: both author and requested
  reviewer are Codex sessions. No cross-vendor independence is claimed.
- Request artifact:
  `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-4_to_review.md`.
- Required verdict artifact:
  `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-4_result.md`.
- Current state: `pending`; this author-owned request contains no verdict.

A message, candidate record, test result, or this request is not approval. Product
or test implementation remains forbidden unless that fresh reviewer returns `OK`
for the exact candidate below. The author did not self-review and must not create
the verdict.

## Frozen candidate identity

| Identity | Value |
|---|---|
| Candidate commit | `4bfbaba3dfc94e5dd67b7ed9049d9e3bd639d2c6` |
| Candidate tree | `64eb374dd9859f3579816b8ca39860e4d544d096` |
| Sole parent | `99935c53473a996b0b2650fe7435658930271c5a` |
| Parent tree | `43447c274150aba289080ae1148405ecdf008a11` |
| Parent state | immutable Design Trial 3 `reviewed_KO` |
| Candidate subject | `docs(plan): bind D/0/07d reviewer custody (V5 D/0/07d Design Trial 4)` |
| Branch | `plan/V5-D-0-07d-rebaseline` |
| Declared product/test baseline | `d0bf521799b16f7d3300163ce40bd7dfca49864d` |
| Declared baseline tree | `0c577aef5bd864c51bf60086b9b3cb5daa254000` |

The complete Trial 4 candidate pathset is exactly:

```text
plan/PROJECT_V5/D/0/07.md
plan/PROJECT_V5/D/0/07d.md
```

| Path | Candidate blob | Parent-to-candidate numstat |
|---|---|---:|
| `plan/PROJECT_V5/D/0/07.md` | `3c6ea56cc6048b661d46d870e01053d95fa7950c` | 25 insertions, 19 deletions |
| `plan/PROJECT_V5/D/0/07d.md` | `36453b91ed9ef7c0a9a9e201b1f36a2a0378d476` | 604 insertions, 125 deletions |

No source, test, fixture, policy, package, dependency, lockfile, workflow, CI,
review artifact, status registry, or unrelated plan path is in the candidate.
The aggregate candidate delta is 629 insertions and 144 deletions across those two
documents only.

## Frozen request-commit contract

The handoff commit must be a single-parent direct child of the candidate above.

| Request property | Required value |
|---|---|
| Direct parent | `4bfbaba3dfc94e5dd67b7ed9049d9e3bd639d2c6` |
| Parent tree | `64eb374dd9859f3579816b8ca39860e4d544d096` |
| Subject | `docs(review): request D/0/07d build-ready review (V5 D/0/07d Design Trial 4)` |
| Exact pathset | this new request plus `plan/PROJECT_V5/reviews/README.md` |
| Index delta | append exactly one separate pending Design Trial 4 row after Trial 3 |
| Result path at commit | absent |

The request cannot embed its own commit or tree without self-reference. The
reviewer must resolve the branch tip, freeze the request commit/tree in the
result, verify the single parent, subject, exact two-path request delta, and prove
that the candidate blobs remain the values above. The review-index blob before
this request is `b300b4495522724bb341acc2b2028c173f9d299d`.

## Immutable prior trail and governing KO

| Artifact | Blob at the candidate |
|---|---|
| `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-1_to_review.md` | `e622764d2c8c6082d60d6d983a18f858a02ba51c` |
| `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-1_result.md` | `d2782b9a76ea9686d1c23aff7434cea91fcb581c` |
| `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-2_to_review.md` | `c29dce81a1e2e6ce94e29f26cb3121b7c148d39a` |
| `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-2_result.md` | `7a9286d1726aaf5c5008aa284b2aa5fc7d19dd92` |
| `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-3_to_review.md` | `60e59cf0a4ce912b14d5c527571afe0c15b92da2` |
| `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-3_result.md` | `867616cedffc1bb3bebfc6fba194c680a105c36a` |

The immutable Trial 3 candidate is
`e3e16cb7d22c85e06d5a8f8312ed889054ceb251`, tree
`9aed9d38761ab01df241ce682c871940b9fe5a19`, with sole parent
`2c4612c5cf6875615bfe529e96c0781aeb25abea` and subject
`docs(plan): bind D/0/07d verifier and stream build (V5 D/0/07d Design Trial 3)`.
Its request is `218ac0afa60f8df2e71b398ffb43ed8b8b996151`, tree
`74a998ff576655d063cb6c7eb00a038e1d916ba7`, with the Trial 3 candidate as sole
parent and subject
`docs(review): request D/0/07d build-ready review (V5 D/0/07d Design Trial 3)`.

The Trial 4 parent is the Trial 3 KO commit, with that Trial 3 request as sole
parent and subject
`review(v5): reject D/0/07d Design Trial 3 build-ready plan`, and exact delta:
one review-index row changed from pending to KO plus the 312-line Trial 3 result.
The Trial 3 result file has SHA-256
`e0495e1a598ec23b99c874ec6efafbc5073ec3a2c6b39a830e73422259a47668`.
Trials 1–3 remain immutable KO evidence; Trial 4 does not rewrite them.

The fresh reviewer must authenticate the Trial 3 result independently and treat
its following two P1 findings as the complete Trial 4 correction target:

1. candidate code shared the reviewer UID and could chmod/restore prerequisites,
   truncate or forge inherited evidence fd 3, rename/replace the fd-4 output
   pathname, retain children/fds, evade pathname-only final checks, and rely on a
   candidate-controlled archive parser; and
2. the exact Docker command selected a non-root user but mounted `/build` and
   `/tmp` as root-owned mode-0700 tmpfs roots without `uid=`/`gid=`, so the first
   build write could not execute.

## Trial 4 correction P1-1 — reviewer/candidate custody boundary

The candidate replaces the rejected same-owner mode-bit boundary with a
reviewer-owned parent and a kernel-enforced candidate domain. The reviewer must
decide whether the exact sheet is executable and whether every claimed authority
stays outside candidate reach.

### Frozen trust and execution boundary

- The reviewer parent, its authenticated hermetic toolchain, the host kernel,
  user-systemd/cgroup support, and the explicitly authenticated prerequisites are
  trusted. Candidate code, candidate records, archive bytes, tests, fixtures, and
  coordination messages are untrusted.
- Candidate, read-only object database, toolchain root, dependency root, and
  external source are exposed as separate kernel-read-only bwrap mounts. Candidate
  writable state is limited to private size-bounded `/work`, `/home`, and `/tmp`
  tmpfs roots totaling exactly 1 GiB.
- The exact parent entry uses `systemd-run --user --wait --pipe --collect` with
  `KillMode=control-group`, a 900-second runtime bound, `TasksMax=128`,
  `MemoryMax=2G`, and the frozen CPU/address/file/descriptor limits. The nested
  bwrap domain has new user, mount, PID, network, IPC, UTS, and cgroup namespaces,
  private `/proc`/`/dev`, `--die-with-parent`, a new session, dropped
  capabilities, no credentials/network, and no reviewer path.
- Candidate stdin is `/dev/null`; stdout is the bounded `D7C2` channel and stderr
  is a separately bounded diagnostic pipe. Immediately before candidate exec,
  `close_range(3, UINT_MAX, CLOSE_RANGE_UNSHARE)` closes every other descriptor.
  No evidence/output descriptor, pathname, directory, basename, Docker client,
  Docker socket, user bus, or host repository path enters argv, env, mounts, or
  `/proc/self/fd`.
- The parent enables and verifies `PR_SET_CHILD_SUBREAPER`, holds a pidfd for the
  direct child, binds the exact transient cgroup, applies monotonic TERM/KILL
  deadlines, closes pipes, reaps descendants, requires two empty cgroup scans,
  and proves zero unit/process/fd/container residue before any done record.
- The parent exclusively creates evidence and output under distinct reviewer-only
  dirfds with no-follow/close-on-exec flags, retains their fds and dirfds, syncs
  the held objects and directories, and validates from those fds. It never trusts
  a replaceable pathname after candidate execution.

### Bounded record and archive authority

Candidate stdout is the exact `D7C2` multiplex: a 12-byte header (`D7C2`, version,
type, reserved bytes, big-endian length), 64-KiB JSON frame cap, 4-MiB aggregate
JSON cap, 256-frame cap, 256-MiB archive cap, exact phase ordering, closed JSON
schemas, duplicate-key rejection, and exact EOF. Types are lifecycle/TAP JSON,
fixture-ledger JSON, diagnostic bytes, and one raw USTAR frame in archive phase.
Framing, count, order, timeout, EOF, or schema failure is parent-owned and
suppresses `D007D_REVIEW_DONE_V2`.

The parent writes the archive frame to a held scratch fd and validates every byte
with the frozen independent Python parser between
`D007D_USTAR_PARSER_V2_BEGIN/END`. Its LF-terminated code is 2,752 bytes, compiles,
and has SHA-256
`77e20732a688b6db779002cc6728a6dc8d604e2112f505a15d7046657e09ef4a`.
It reconstructs each canonical POSIX USTAR header byte-for-byte, checks the exact
three ordered names and held-input sizes/hashes, payload zero padding, exactly two
zero end blocks, and immediate EOF. `tar` is not an authority parser.

Docker stdout goes directly to a parent-held output inode. The parent verifies its
regular-file identity, mode/owner/link count, size/hash, ELF Linux-amd64 form,
version, and extension from the held fd, then runs only
`execveat(output_fd, "", ["tmux", "-V"], EMPTY_ENV, AT_EMPTY_PATH)` under a
pidfd-bound wait. A reviewer seam replaces the pathname while that fd remains
open; the held inode must remain the only accepted authority.

After candidate EOF, domain disposal, and zero residue, the parent re-reads and
rehashes every held candidate/prerequisite fd, re-proves candidate commit/tree,
clean status, and critical blobs, validates canonical evidence with `pread`,
`fdatasync`s it, and only then appends and revalidates the done record. A
restore-before-final-check attempt must fail even if path bytes appear restored.

### Mandatory authority attacks

Checkpoint 1 freezes one nine-test reviewer-owned custody RED against the rejected
Trial 3 fixture and the same nine-test GREEN against the Trial 4 domain:

| Attack | Required Trial 4 oracle |
|---|---|
| same-owner chmod/write/restore against every read-only input | each write fails `EROFS`; held bytes/hashes remain exact |
| inherited evidence-fd truncation/forgery and path discovery | candidate has no descriptor/path; forged or malformed `D7C2` fails |
| output rename/replacement while its fd is open | pathname inode may change only through the parent seam; held-inode validation remains bound to the original |
| retained child and retained stdout/stderr fd | missing EOF triggers whole-domain kill, two empty scans, zero residue, no done record |
| TERM-resistant descendant at the outer deadline | bounded TERM then KILL completes; no survivor or done record |
| candidate/prerequisite mutation restored before final check | kernel write fails and both held-fd and Git/path reauthentication remain exact |
| malformed/trailing/duplicate/reordered/checksum/size/padding USTAR | independent parser rejects before any Docker invocation |
| mount/argv/env/fd enumeration, evidence/output discovery, and writes to all read-only inputs | only declared mounts are visible, discovery is empty, every write fails |
| Docker socket/client access, `ps`, arbitrary `run`, or option injection | candidate reaches no client/socket/helper; recorder sees only fixed parent probe/build operations |

The historical fixture is exactly `9/0/9/0/0`; the V2 domain is exactly
`9/9/0/0/0`. The sheet quarantines the old V1 launcher under “Rejected Trial 3
launcher (historical attack fixture; never executable)”; it is retained only to
reproduce the RED and grants no current authority.

Trial 3 P1-1 is closed only if the reviewer can derive all claimed isolation,
custody, timeout, framing, reauthentication, and zero-residue oracles from the
exact plan without candidate self-attestation or an implementation-time choice.

## Trial 4 correction P1-2 — exact non-root tmpfs ownership

Only the reviewer parent may invoke Docker. It performs exactly two fixed
`shell:false` operations in order: one ownership-denial probe and one build. The
candidate cannot see a Docker binary, socket, config, helper, endpoint, or argv
element.

The build freezes the selected effective UID/GID as canonical non-zero decimal
integers and uses the same pair in all three positions:

```text
--user <selected-uid>:<selected-gid>
--tmpfs /build:rw,exec,nosuid,nodev,uid=<selected-uid>,gid=<selected-gid>,mode=0700,size=536870912
--tmpfs /tmp:rw,exec,nosuid,nodev,uid=<selected-uid>,gid=<selected-gid>,mode=0700,size=67108864
```

Omitted, wrong, reordered, zero, signed, whitespace-bearing, leading-zero, or
mismatched `uid=`, `gid=`, or `mode=0700` values fail before Docker. The fixed
argv also contains the authenticated Docker binary, `run --rm`, candidate/nonce
label, `--pull never`, `--network none`, `--platform linux/amd64`, read-only root,
all capabilities dropped, `no-new-privileges`, no bind/volume/mount source, the
pinned image
`node@sha256:0625f79a0c9f5005e31dba1761260b9f66ea8a3293e5f645eb4550a4c7dcdbb9`,
and exact source/patch/extension hashes. The parent environment is empty except
for the frozen locale/timezone, parent-private empty HOME/DOCKER_CONFIG, and
`DOCKER_HOST=unix:///var/run/docker.sock`; another endpoint makes this lane
infrastructure-unavailable rather than broadening the contract.

The frozen container program between `D007D_CONTAINER_PROGRAM_V2_BEGIN/END` is
2,908 LF-terminated bytes, passes `sh -n`, and has SHA-256
`fe8ab5b912eaf4ca6eda2a7ae408f965f390e3e80cb918f5b083b5ec717501d0`.
It proves effective UID/GID plus root ownership/mode, records exact mount options,
performs the first write and exec in both roots, independently checks the accepted
three-member archive and input hashes, applies the frozen patch/extension/configure/
make/parser/version recipe, and sends raw binary bytes only to parent-held stdout.

The prior fixed probe selects UID/GID 65534, or 65533 if either conflicts, while
leaving both tmpfs roots owned by the selected build identity. Its access and
mkdir attempts in `/build` and `/tmp` must be denied. The recorder accepts exactly
one probe argv then one build argv; it rejects any candidate call or arbitrary
daemon operation. Trial 3 P1-2 is closed only if first-write/exec success, exact
mount ownership/options, other-identity denial, mutation rejection, and full build
are all normative and executable.

## Preserved contracts outside the two corrections

- Checkpoint 1 retains exactly seven candidate paths: `ci/suites.json`, the
  process-supervisor session-port test, Python fixture, PTY test, relay test, new
  fixture owner, and new isolated real-host wrapper. There is no conditional
  pathset; another path requires plan review.
- Checkpoint 1 alone changes `test.gateway.inventorySha256` from exact 123-path
  `sha256:132a5af375807e8d272ddf01516939a7834e33ca9d6dce61a22401b2af3a44f5`
  to exact 124-path
  `sha256:cc4b83a31abc1f1305f963d4fee40278fcf335c02f90dbd52210c1bd06d07bad`.
  No other suite, suite-contract, CI, workflow, package, dependency, or lock value
  changes.
- The design remains stream-only: no host staging or bind mount, and the unchanged
  `gateway/vendor/tmux-agents/build-offline.sh` is source evidence only and never
  executed or edited.
- Checkpoints 1, 2, and 3 remain strict serial implementation/review units. A next
  checkpoint begins only from the exact prior candidate plus a fresh independent
  `OK`; no checkpoint verdict is final `D_0_7D`.
- Checkpoint 3 preserves the source-grounded
  `returns SESSION_PORT_CANCELLED when snapshot cancel wins after B and before R`
  RED, exact error/result oracle, PTY/relay behavior, and all three ordering cases.
- Fixture-owner and outer real-host teardown retain zero path-deletion authority.
  Same-name replacements, shared tmux server/socket, and sibling sessions survive;
  only namespace disposal may reclaim private tmpfs after durable preservation
  evidence and retained-fd closure. No product janitor or deletion policy is added.
- Project status remains exactly `39 complete + 4 in progress + 39 planned = 82`,
  43 open, with only `C/1/00`, `D/0/01`, `G/0/02`, and `H/0/01` in progress.
  `D/0/07d` remains planned.
- Provider-free lifecycle data/errors, literal helper `os.execve`, absent public
  splice, no shell/`send-keys`, Linux-only authoritative isolation, empty
  environment, no credentials/network, and all release/support/non-claims remain.
- `D_0_1_SPLICE` remains blocked. Only a separate final fresh `D_0_7D` OK after
  all three checkpoint OKs may allow it to consume this gate.

## Source grounding to reauthenticate

The declared baseline and candidate are byte-identical across product, test,
vendor, and CI source paths. Relevant frozen blobs at the candidate include:

| Path | Blob |
|---|---|
| `gateway/src/adapters/process_supervisor.js` | `b0100b6c626207e6cc66bdc46e410efa48dc4655` |
| `gateway/vendor/tmux-agents/build-offline.sh` | `dca11355e5acef80ffaccef564e1e216c1866dca` |
| `gateway/vendor/tmux-agents/manifest.json` | `0c0f0c758a385d0a3ba727071213215d00c45f9e` |
| `gateway/vendor/tmux-agents/tmux-3.6a-agents.1.patch` | `c2ca3c3875ab9ac2345adbc2b1f989950ce22038` |
| `gateway/vendor/tmux-agents/cmd-agents-capture.c` | `1c3282ae68e51e45aaecd13882f1f0eb4387648b` |
| `scripts/ci_gate.py` | `1270850d2624ef203a09ed7245df5a595f79585f` |

The fresh reviewer must read the current adapter/helper, session-port core,
PTY/relay/session-port tests and fixture, gate/suite contracts, vendor recipe and
inputs, the shared `D/0/07` contract, `D/0/07d`, and the full Trial 1–3 trail. A
plan assertion does not replace source evidence.

## Independent review questions

Return `OK` only if every item is true; otherwise return `KO` with prioritized,
file/line-grounded findings:

- Candidate and request commits, trees, sole-parent chain, subjects, pathsets,
  numstat, blobs, absent result, and all six prior artifacts authenticate.
- Each Trial 3 P1 is adjudicated separately. The result must say whether P1-1 and
  P1-2 are each closed, with an executable evidence chain rather than relying on
  prose intention.
- The exact parent/candidate identity, mount, namespace, fd, bounded-channel,
  subreaper/pidfd/cgroup, timeout, cleanup, held-inode, sync, reauthentication, and
  done-record contracts keep reviewer authority mechanically inaccessible to all
  candidate attacks.
- The independent parser enforces canonical USTAR headers, exact order/hashes,
  zero padding, exactly two end blocks, and immediate EOF before Docker, including
  every malformed/trailing/duplicate/order/checksum/size/padding mutation.
- All nine historical RED attacks execute and all nine V2 GREEN attacks reach the
  specified kernel/parent oracles with exact `9/0/9/0/0` and `9/9/0/0/0` totals,
  zero arbitrary Docker action, zero residue, and no done record on rejection.
- The exact two Docker operations, tmpfs `uid=`/`gid=`/`mode=0700` options,
  non-root first writes/execs, other-identity denial, mutation tests, recorder,
  container program, and full build are internally consistent and build-ready.
- All preserved constraints remain exact: stream-only/no bind/no legacy edit,
  seven checkpoint-1 paths, 123/124 digests, serial reviews, cancellation RED,
  PTY/relay rules, zero-deletion ownership, status arithmetic, planned leaf, and
  blocked splice.
- The candidate claims only planned/pending design state and makes no
  implementation, self-review, integration, promotion, release, hosted-CI,
  support, legal, commercial, security, regulatory, or deletion-policy decision.

The verdict must identify the fresh reviewer model/profile, trace, session, and
worktree; disclose procedural same-vendor independence and no cross-vendor claim;
freeze candidate and request identities; list commands, evidence, and limitations;
adjudicate P1-1 and P1-2 separately; and state explicitly whether implementation
may begin. It must not claim integration, promotion, release, or an unblocked
splice.

The result must state explicitly whether implementation may begin from this exact
design candidate; silence or an implied answer is insufficient.

## Author-side proportional verification and limits

- `git diff --check` passed. Candidate commit/tree/parent/subject, two-path
  pathset, blobs, and numstat above were recomputed from Git.
- `python3 scripts/ci_gate.py --repo-root "$PWD" --validate-only` returned
  `status:"passed"`, zero errors, and zero test/pass/fail/skip counts.
- Both candidate Markdown files have balanced fences; all 12 relative Markdown
  link occurrences resolve.
- Mechanical LF-preserving extraction recomputed the documented parser and
  container-program byte counts and hashes. The parser compiled with Python and
  the container program passed `sh -n`.
- Independent manifest enumeration recomputed current 123 / `132a…a44f5` and
  hypothetical 124 / `cc4b…7bad` inventories. The candidate has zero product,
  test, vendor, or CI delta from the declared baseline.
- The Trial 3 parent/result/request chain, six prior artifact blobs, and Trial 3
  result SHA-256 were authenticated. Trial 3's two P1 findings were used as
  requirements, not silently averaged with the rejected design.

No Docker, tmux, provider, network, Redis, PostgreSQL, destructive cleanup,
product test, checkpoint test, isolated real-host lane, full CI, implementation,
integration, promotion, release, or review verdict was run or claimed by the
author. The future fixture-owner and wrapper files do not yet exist; their behavior
is planned, not built. The authority claim is limited to Linux/amd64 with working
user namespaces, bwrap, user-systemd/cgroups, pidfds, `close_range`, subreaper,
held-fd operations, Docker, the pinned image/source, and authenticated toolchain
and dependencies. Host-kernel, reviewer-account, Docker-daemon/image, and
toolchain compromise are outside the claim and must be disclosed by the reviewer.

The requested independent result does not yet exist. This request stops before
review and grants no implementation authority.
