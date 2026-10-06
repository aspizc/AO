# Project V5 D/0/07d Design Trial 5 — review request

## Review identity and authority

- Review id: D_0_7D_DESIGN-5.
- Requested reviewer: a fresh, independent Codex session using gpt-5.6-sol,
  reasoning max, service tier priority.
- The review must use a new orchestration trace, reviewer session, and worktree.
  It must not reuse this author session or any Design Trial 1–4 reviewer session.
- Independence is procedural and same-vendor. No cross-vendor independence is
  claimed.
- Request artifact:
  plan/reviews/PROJECT_V5/D_0_7D_DESIGN-5_to_review.md.
- Required verdict artifact:
  plan/reviews/PROJECT_V5/D_0_7D_DESIGN-5_result.md.
- Current state: pending. This author-owned request contains no verdict.

A message, coordination artifact, candidate record, test result, or this request
is not approval. The author did not self-review and must not create the verdict.
Product/test implementation remains forbidden unless the fresh reviewer returns
OK for the exact candidate below.

## Frozen candidate identity

| Identity | Value |
|---|---|
| Candidate commit | 5894ebea50df8b7e65236247e10fb1c53713d282 |
| Candidate tree | e41cae0a200adc63b97663b24bce3c7fbb2126f0 |
| Sole parent | 2d9470baa63e27a08f3fe8b5e8bb0f4e176a3eab |
| Parent tree | e48c504278fd822843fe1907c562abb54d76dc33 |
| Parent state | immutable Design Trial 4 reviewed_KO |
| Candidate subject | docs(plan): close D/0/07d custody gaps (V5 D/0/07d Design Trial 5) |
| Branch | plan/V5-D-0-07d-rebaseline |
| Author | carase <historical-email-redacted> |
| Committer | carase <historical-email-redacted> |
| Declared product/test baseline | d0bf521799b16f7d3300163ce40bd7dfca49864d |
| Declared baseline tree | 0c577aef5bd864c51bf60086b9b3cb5daa254000 |

The complete Trial 5 candidate pathset is exactly:

~~~text
plan/PROJECT_V5/D/0/07.md
plan/PROJECT_V5/D/0/07d.md
~~~

| Path | Candidate blob | Parent-to-candidate numstat |
|---|---|---:|
| plan/PROJECT_V5/D/0/07.md | 543a0c81b4d681aaf3e4b33e9aa1a95a22b36714 | 22 insertions, 14 deletions |
| plan/PROJECT_V5/D/0/07d.md | 5bf8264dcb39d32fd1855b27f5c513f7c9d02c4f | 1,483 insertions, 62 deletions |

The aggregate candidate delta is 1,505 insertions and 76 deletions across
those two plan documents only. The larger sheet delta is the byte-frozen
reviewer oracle/self-test and exact executable state-machine material required
by the Trial 4 KO; it adds no product behavior or implementation path.

No source, test, fixture, policy, package, dependency, lockfile, workflow, CI,
review artifact, status registry, or unrelated plan path is in the candidate.
A protected-path diff from the declared product/test baseline across gateway,
tests, ci, scripts, .github, policies, packages, locks, and vendor inputs is
empty.

## Frozen request-commit contract

The handoff commit must be a single-parent direct child of the candidate.

| Request property | Required value |
|---|---|
| Direct parent | 5894ebea50df8b7e65236247e10fb1c53713d282 |
| Parent tree | e41cae0a200adc63b97663b24bce3c7fbb2126f0 |
| Subject | docs(review): request D/0/07d build-ready review (V5 D/0/07d Design Trial 5) |
| Exact pathset | this new request plus plan/PROJECT_V5/reviews/README.md |
| Index delta | append exactly one pending Design Trial 5 row after Trial 4 |
| Result path at commit | absent |

The request cannot embed its own commit/tree without self-reference. The
reviewer must resolve the branch tip, freeze the request commit/tree and Git
author/committer in the result, verify the direct parent/subject/two-path
delta, and prove the candidate blobs above remain unchanged. The review-index
blob before this request is cc04cbbbfa131d4ec056ee331a3d0b87dd386181.

## Immutable prior trail and governing KO

| Artifact | Blob at the candidate |
|---|---|
| plan/reviews/PROJECT_V5/D_0_7D_DESIGN-1_to_review.md | e622764d2c8c6082d60d6d983a18f858a02ba51c |
| plan/reviews/PROJECT_V5/D_0_7D_DESIGN-1_result.md | d2782b9a76ea9686d1c23aff7434cea91fcb581c |
| plan/reviews/PROJECT_V5/D_0_7D_DESIGN-2_to_review.md | c29dce81a1e2e6ce94e29f26cb3121b7c148d39a |
| plan/reviews/PROJECT_V5/D_0_7D_DESIGN-2_result.md | 7a9286d1726aaf5c5008aa284b2aa5fc7d19dd92 |
| plan/reviews/PROJECT_V5/D_0_7D_DESIGN-3_to_review.md | 60e59cf0a4ce912b14d5c527571afe0c15b92da2 |
| plan/reviews/PROJECT_V5/D_0_7D_DESIGN-3_result.md | 867616cedffc1bb3bebfc6fba194c680a105c36a |
| plan/reviews/PROJECT_V5/D_0_7D_DESIGN-4_to_review.md | f2175d1bfdabb60dc8cafc5d8c2de7018ab4298c |
| plan/reviews/PROJECT_V5/D_0_7D_DESIGN-4_result.md | 6823eae7b67d2166f00eabc17d42bcc00868fe53 |

The governing KO is:

- commit 2d9470baa63e27a08f3fe8b5e8bb0f4e176a3eab;
- tree e48c504278fd822843fe1907c562abb54d76dc33;
- sole parent c8b26c24b685fa6ff4576b2bc744f31474ca55a1;
- subject review(v5): reject D/0/07d Design Trial 4 build-ready plan;
- exact delta: add the 346-line Trial 4 result and change only its review-index
  row from pending to KO; and
- Trial 4 result file SHA-256
  0e78ebd43267a761f7ffce4319531b573b879cd953d9efdf0afbd00096264465.

The author authenticated this KO before work and advanced from its request only
with:

~~~text
git merge --ff-only 2d9470baa63e27a08f3fe8b5e8bb0f4e176a3eab
~~~

The reviewer must read all 346 lines and adjudicate exactly its three open P1
findings. Trial 4's non-root tmpfs finding is already closed and must not be
reopened without contradictory executable evidence.

## Trial 5 correction target

Trial 5 changes exactly three mechanisms:

1. executable launch custody and held-inode binding;
2. closed-schema independent evidence authority; and
3. daemon-owned Docker identity, containment, deadline, and residue.

It preserves the accepted product semantics, cancellation/race requirements,
21/21 USTAR rejection, stream-only archive, seven-path checkpoint-1 scope,
serial checkpoint reviews, planned status, and blocked splice.

## P1-1 — executable launch custody

The reviewer must decide whether the following is implementable without choosing
an unstated launch or cleanup mechanism:

- REVIEW_ROOT is exactly a reviewer-owned no-follow runtime subtree under
  /run/user/<uid>/ao-d7/<nonce>. The three authority artifacts are extracted
  LF-exact from the independently approved 07d blob, never a candidate checkout.
- The exact systemd-run block is 602 bytes, SHA-256
  0c2161937b37aff5aa193c142d9efb96aa71551485fbfe7dadab1bbf58427d42.
  It uses --wait and --remain-after-exit, forbids --pipe/--collect, nulls unit
  stdio, and executes the frozen unit-shim mode.
- The exact bwrap block is 1,160 bytes, SHA-256
  f8ed2e5ff1b0b04c4a22e3424f98b0bfec15e72b811e87d0d302c9e0b3a68c9c.
  It includes --block-fd 3, uses --ro-bind-fd 4 for the already-held output,
  mounts the fd-seal artifact through --ro-bind-fd 5, and never reopens an
  output pathname.
- The fd-seal shim is 740 bytes, SHA-256
  136130354a4f9df53a1601397a8e27ba057d2260d5b547039b11a23db97b3e47.
  It is the exact Linux/amd64 process that resets stdin, executes
  close_range(3, UINT_MAX, CLOSE_RANGE_UNSHARE), and execs the candidate.
- The byte-frozen oracle contains the exact unit shim. It receives one ordered
  SCM_RIGHTS vector, normalizes archive fds to {0,1,2,3,5} and test fds to
  {0,1,2,3,4,5}, and close-ranges every other fd before bwrap exec.
- The trusted unit shim creates and guards the release pipe. The candidate
  cannot execute while bwrap blocks on fd 3. Only after the parent authenticates
  systemd-run, unit MainPID/SO_PEERCRED/argv/start token, held ControlGroup,
  bwrap pidfd/executable/full argv/parent/start token/cgroup, and durable
  BWRAP_BOUND evidence may the parent send the exact RELEASE object. The shim
  alone writes R and acknowledges RELEASED.
- bwrap 0.11.1 ignores the return from its one-byte block-fd read. Parent/control
  EOF therefore pidfd-kills and waits for bwrap before the guarded writer closes;
  EOF is never release. Unit-shim death is covered by already-active
  --die-with-parent.
- The state machine freezes success/failure ordering, the 900-second production
  deadline, TERM/KILL, two cgroup scans, terminal unit projection,
  stop/reset/unload/absence, held-fd lifetime, descendant EOF, and exact
  non-recursive reviewer-runtime cleanup.
- D007D_REVIEW_DONE_V3 is appended only to the unlinked held evidence inode
  after unit/container/runtime residue and held identities revalidate; the
  artifact receipt, fd closure, and two REVIEW_ROOT-absence scans complete DONE.

The reviewer should compare this directly to Trial 4 P1-1: there is now an exact
pre-release primitive, exact output-fd mount, exact two-shim close-range
boundary, queryable post-exit unit lifecycle, pidfd/cgroup identity, and bounded
cleanup.

## P1-2 — closed-schema independent evidence authority

The reviewer must authenticate these exact artifacts from the candidate blob:

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| D007D_CUSTODY_SPEC_V3 | 2,966 | 949f7cf28566c567d5e8874697ed6356b7311bc175f9e16cd74ec79d980a5749 |
| D007D_CUSTODY_ORACLE_V3 | 29,713 | 46a02317ee5c43f1e0696eba348f7e72629eb6dca8b414061041719b0e1d05ed |
| D007D_FD_SEAL_V3 | 740 | 136130354a4f9df53a1601397a8e27ba057d2260d5b547039b11a23db97b3e47 |
| D007D_USTAR_PARSER_V2 | 2,752 | 77e20732a688b6db779002cc6728a6dc8d604e2112f505a15d7046657e09ef4a |
| D007D_CONTAINER_PROGRAM_V2 | 2,908 | fe8ab5b912eaf4ca6eda2a7ae408f965f390e3e80cb918f5b083b5ec717501d0 |

The D7C2/3 contract now freezes:

- the exact 12-byte header, version/type/reserved/u32be length;
- canonical JSON serialization, duplicate-key/nonfinite rejection, required and
  forbidden keys, exact types, integer-vs-boolean handling, UTF-8/ASCII/name
  grammar, scalar/array/frame/byte/count bounds, and hashes;
- exact type-1 test summary, type-2 fixture ledger, type-3 TAP chunk, and type-4
  raw USTAR payload schemas and mode relationships;
- archive order [4, EOF] and test order [3 x 1..64, 1, 2, EOF];
- exact multiplicity, sequence, retained-writer, truncation, trailing-frame,
  diagnostic-cap, and actual-kernel-EOF handling;
- exact expectation-ledger schema and request-owned hash;
- an exact TAP-13 accepted subset bound to expected ordered names/totals; and
- a candidate-independent self-test generated and decided by the frozen oracle.

Exact self-test argv [PYTHON, AUTHORITY_ORACLE, selftest] emits one 4,095-byte
canonical line with SHA-256
3e6e85ec067c18e83cdf0237efcf357a0be8dd95a6ce8554ce561aa3b7601f1a:
two canonical streams are ACCEPTED and all 76 named single mutants are REJECTED.
Any changed count/name/decision/hash, exception, timeout, or unexecuted mutant is
failure.

The independent attack driver is the same frozen oracle, not the future
candidate-owned Node test. Its argv and every child argv are closed in the
sheet. It runs these nine ids in order:

~~~text
chmod_restore
evidence_forgery
output_replacement
retained_fd_child
term_resistant
restore_before_final
ustar_mutation
mount_discovery_write
docker_escape
~~~

The ordered totals are tests/pass/fail/skipped/cancelled. Historical is exactly
9/0/9/0/0 with VULNERABLE, done=true, exit=0, residue=0. V3 is exactly
9/9/0/0/0 with REJECTED, done=false, exit=0, residue=0. The driver caps each
process at 120 seconds and its stderr at 65,536 bytes. Candidate output cannot
select an artifact, expectation, accepted digest, attack id, or result.

The unchanged LF-exact USTAR parser accepts the canonical three-member archive
and independently rejects exactly 21/21 mutations. The archive is streamed into
one anonymous MFD_ALLOW_SEALING memfd, parsed by pread, write-sealed, rewound,
and supplied directly as Docker stdin. There is no archive pathname, host
staging directory, bind mount, or second serialization.

## P1-3 — executable Docker containment and residue

The reviewer must decide whether every daemon operation and race is now
mechanically determined:

- RUN_ID is one 24-lowerhex parent value. Probe/build names, three exact labels,
  separate held cidfiles, private HOME/config, empty inherited environment, and
  the default local socket are parent-owned and candidate-inaccessible.
- The shared limit block is 384 bytes, SHA-256
  7bdb943f16872a9f83b17f8348d156f6a92c2f69d6eada8baeadc415086a7387.
  It freezes name/cidfile/labels, memory 2 GiB, memory-swap 2 GiB, pids 128,
  one CPU, CPU/file-size/nofile ulimits, stop-timeout 10, and --init.
- The build argv is 1,313 bytes, SHA-256
  a8cf8964ca012f0669073f0b372041b2228a4fa21820463e254b9723489d6295.
- The ownership probe argv is 1,185 bytes, SHA-256
  39b846649a56d1df506460a6ac8bcc494b377c225746311b7ae85883937685b9.
- Both argvs omit --rm, retain exact linux/amd64/no-network/read-only/cap-drop/
  no-new-privileges controls, and contain two uid=1000,gid=1000,mode=0700
  tmpfs roots. Build runs 1000:1000; the exact 65534:65534 probe must have
  zero stdout/stderr and denial of read/write/execute/mkdir on both roots.
- Normal success has exactly ten ordered daemon clients per role, 20 total:
  pre-inspect, exact-label scan, run, identity/config inspect, daemon wait,
  exited inspect, force remove, absent inspect, and two empty scans.
- Client completion is never container completion. The attached run and daemon
  wait must both terminate and agree with inspect state/exit code.
- Failure accepts exactly one ordered reconciliation transcript:
  MISSING 3 calls, ALREADY_EXITED 6, TERM_EXITED 8, or KILL_EXITED 10.
  Missing/no-cid/adoption, already-exited/not-running, no-such-remove, foreign
  labels, name reuse, cid mismatch, and residual IDs have explicit outcomes.
- Each ordinary daemon client has a 10-second deadline. Probe role 60 seconds +
  build role 700 + one reconciliation 100 + final proof reserve 40 equals the
  single 900-second outer budget. The worst reconciliation is 95.25 seconds.
- A role cannot continue after cidfile absence; an exactly labeled name-derived
  ID is adopted only for cleanup. The next role starts only after exact
  RECONCILED success.

The reviewer must retain Trial 4's closed tmpfs ruling: selected 1000:1000 has
first-write/exec authority on both mode-0700 roots and exact 65534:65534 is
denied. The new lifecycle closes the separate client-death/container-residue
defect.

## Preserved invariants and bounded scope

- D/0/07d remains planned and unimplemented.
- D_0_1_SPLICE remains blocked; this request cannot unblock it.
- No review, integration, promotion, tag, push, release, or support claim is
  made.
- Checkpoint 1 remains exactly these seven paths, with no conditional pathset:

~~~text
ci/suites.json
tests/gateway/process_supervisor_session_port.test.js
tests/gateway/process_supervisor_session_port_fixture.py
tests/gateway/process_supervisor_session_port_pty.test.js
tests/gateway/process_supervisor_session_port_relay.test.js
tests/gateway/process_supervisor_session_port_fixture_owner.js
tests/gateway/run_process_supervisor_session_port_real_host.sh
~~~

- Current inventory remains 123 /
  sha256:132a5af375807e8d272ddf01516939a7834e33ca9d6dce61a22401b2af3a44f5.
  Adding only the planned test remains 124 /
  sha256:cc4b83a31abc1f1305f963d4fee40278fcf335c02f90dbd52210c1bd06d07bad.
- Status math remains 39 complete + 4 in progress + 39 planned = 82, with
  43 open.
- The bwrap tmpfs sizes remain exactly 1,073,741,824 bytes.
- The source/patch/extension/image, LF-exact parser/container program, raw
  binary stdout, stream-only USTAR stdin, and no host source/output staging
  remain unchanged.
- Checkpoint 1, checkpoint 2, checkpoint 3, and final D_0_7D reviews remain
  serial. No checkpoint verdict is final acceptance.
- Cancellation RED, PTY/relay identity, zero post-final-observation product
  deletion, replacement survival, retained-target accounting, sibling/shared
  tmux survival, and no shell/send-keys path remain mandatory.

## Reached repository and vendor contracts

The candidate did not alter these authenticated inputs:

| Input | Blob/digest |
|---|---|
| gateway/src/process_supervisor.js | b0100b6c626207e6cc66bdc46e410efa48dc4655 |
| gateway/src/process_supervisor_helper.py | e24376fce8b6b2919ca9ad1ba348a094dad4e413 |
| ci/suites.json | 55e628ac58ad10d00e057660739bdf146f8d5ca7 |
| ci/suites-contract.json | 7dc1d29de072d344ab0933879a7492a953bcf78e |
| scripts/ci_gate.py | 1270850d2624ef203a09ed7245df5a595f79585f |
| gateway/vendor/tmux-agents/build-offline.sh | dca11355e5acef80ffaccef564e1e216c1866dca |
| gateway/vendor/tmux-agents/manifest | 0c0f0c758a385d0a3ba727071213215d00c45f9e |
| pinned patch | c2ca3c3875ab9ac2345adbc2b1f989950ce22038 |
| pinned extension | 1c3282ae68e51e45aaecd13882f1f0eb4387648b |

The manifest still pins source SHA-256
b6d8d9c76585db8ef5fa00d4931902fa4b8cbe8166f528f44fc403961a3f3759,
patch SHA-256
2526659ccfb17d3cc2a07171687379322e5a2caa79414e86ea4b6682aa98b2b3,
extension SHA-256
4d80a8610651a1dd304b9b0e9b45d6832e115d9827d5166f26b4f9dbcdec27e2,
and image
node@sha256:0625f79a0c9f5005e31dba1761260b9f66ea8a3293e5f645eb4550a4c7dcdbb9.

Local contracts inspected were systemd 259, bubblewrap 0.11.1, and Docker
client/server 29.5.2. The pinned bwrap v0.11.1 upstream source confirms its
block-fd read return is ignored, which is why V3 guards the writer and never
treats EOF as release.

## Author-side validation evidence

| Check | Final outcome |
|---|---|
| git diff --check before candidate commit | exit 0, no output |
| python3 scripts/ci_gate.py --repo-root "$PWD" --validate-only | passed, errors 0, tests/pass/fail/skip 0/0/0/0 |
| artifact LF extraction, hashes, JSON load, Python compile, sh -n | all ten final artifacts exact; all syntax checks pass |
| D7C2 oracle selftest | accepted 2, rejected 76; exact 4,095-byte transcript/digest above |
| independent USTAR probe | valid accepted; mutants 21; rejected 21; accepted list empty |
| fd-seal executable probe | extra inherited fd absent after close_range; exit 0 |
| systemd/bwrap/Docker argv extraction | no collect/pipe; block-fd 3; output fd 4; fd-seal fd 5; exact users/limits/names/cidfiles |
| Docker transcript/deadline math | normal 20; races 3/6/8/10; 60+700+100+40=900 |
| Markdown fences/relative links | 07: 26, 07d: 78, balanced; links 12, unresolved 0 |
| checkpoint-1 scope | exact seven paths; no conditional path |
| inventory | exact current/hypothetical 123/124 counts and digests |
| other math | bwrap tmpfs 1,073,741,824; status 82/open 43 |
| protected baseline-to-candidate path diff | empty |
| final candidate pathset | exactly two plan files |

## Failed, unavailable, exploratory, and uncredited lanes

Nothing in this section is credited as passing runtime evidence:

- systemctl --user is-system-running exited 1 because this shell has no usable
  DBus/XDG user-manager scope. No transient unit was launched.
- A minimal bwrap namespace probe exited 1 because unprivileged namespace
  creation is denied. No real bwrap/systemd/cgroup lane was run.
- Two author-only unit-shim socket probes, one filesystem AF_UNIX and one
  abstract AF_UNIX, both failed at bind with EPERM under this sandbox. The
  oracle compiles and its pure protocol selftest passes, but the handshake is
  not presented as live-socket evidence.
- Docker image inspect authenticated Docker 29.5.2, the exact repo digest, and
  linux/amd64. No Docker container, probe, source build, or output execution was
  run in Trial 5.
- The first author USTAR mutation attempt accidentally wrote the checksum byte
  to its existing value and observed only 20/21 rejection. It was invalid
  evidence. The corrected independent mutation changed the byte, reran from
  scratch, and produced the final 21/21 result above.
- The first checkpoint-path extractor counted the code-fence language token
  text as a path. It was rejected; the corrected fence-body parser returned
  exactly seven paths.
- Early artifact extractors assumed no blank line around Markdown fences and
  failed assertions. The final LF-aware marker extractor preserves the last LF
  and produced the authenticated sizes/digests above.
- One combined artifact check intentionally failed after the spec changed
  because its prose digest was stale; the declaration was updated and the
  complete final check passed.
- One argv check incorrectly expected the phase-expanded output-fd tokens
  literally inside the placeholder block. It was rejected and repeated with
  exact PHASE_OUTPUT expansion validation.
- An exploratory rg expression contained shell backticks and attempted an
  irrelevant command named 4; its output was not evidence. Safe literal
  searches were rerun.
- The first upstream raw bwrap URL omitted the v prefix and returned 404; the
  immutable v0.11.1 tag source was then read successfully.
- One Git identity display command left angle brackets unquoted and triggered
  shell redirection failure. The safe quoted format then authenticated the
  candidate identity above.
- Several apply-patch context attempts made no changes before exact context was
  used; they are not verification evidence.
- No product test, future checkpoint RED/GREEN, canonical full CI, real custom
  tmux lane, provider, network, Redis, PostgreSQL, integration, promotion, tag,
  push, release, or cleanup-policy action was run or inferred.

Host kernel, reviewer account, Docker daemon/image, systemd, bwrap, and
authenticated toolchain compromise remain outside the stated local threat
model. Required runtime unavailability must fail a future authoritative lane,
not turn into a skip or design-review pass.

## Required independent review procedure

The fresh reviewer must:

1. authenticate the request commit, direct candidate parent, candidate tree,
   exact two-file candidate delta, exact two-file request delta, Git identities,
   prior trail blobs, and absent result path;
2. read the governing plan, all Trial 1–4 requests/results, all 346 Trial 4
   result lines, and the reached source/CI/vendor contracts;
3. extract every marked artifact from the candidate blob with LF fidelity,
   recompute size/hash, compile/load/shell-parse it, run the exact 2/76 D7C2
   selftest and independent 21/21 USTAR probe;
4. adjudicate P1-1, P1-2, and P1-3 separately against the Trial 4 wording,
   without averaging them or accepting reviewer/implementer invention;
5. verify the closed 1000:1000 tmpfs correction and every preserved invariant;
6. disclose every unavailable, failed, skipped, or exploratory lane and run no
   full CI or product implementation for this plan-only review; and
7. commit one immutable result, update only this pending row to OK or KO, and
   state explicitly whether checkpoint-1 implementation may begin.

The result must not claim integration, promotion, release, or splice unblocking.
An OK authorizes only the separately reviewed checkpoint implementation loop
defined by the plan. A KO leaves implementation forbidden and D_0_1_SPLICE
blocked.

## Questions requiring an explicit verdict

1. Does the guarded release protocol make pre-exec unit/cgroup/bwrap identity,
   held-output fd binding, close-range boundary, EOF, failure, post-exit query,
   and cleanup mechanically executable without reviewer invention?
2. Are every D7C2 type/schema/order/bound/hash/EOF decision, expectation ledger,
   2/76 frame transcript, and nine-attack 9/0/9/0/0 to 9/9/0/0/0 decision
   independently frozen outside candidate authority?
3. Do the exact Docker identities, resources, 20-call normal transcript,
   3/6/8/10-call race transcripts, deadline arithmetic, and two-scan removal
   prove daemon-container containment and zero residue without confusing client
   death with container death?
4. Are the closed tmpfs result, 21/21 USTAR result, seven-path scope,
   inventory/status math, stream/no-staging rule, serial reviews, planned
   status, and blocked splice all preserved?
5. Is the exact candidate reviewed_OK or reviewed_KO, and may checkpoint-1
   implementation begin?

> Public import note (2026-10-06): the source Git evidence contains a corporate
> email address, redacted here as `historical-email-redacted`. Original commit
> identifiers and verdict content are preserved; this is a sanitized imported copy.
