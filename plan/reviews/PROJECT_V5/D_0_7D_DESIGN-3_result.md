# Project V5 D/0/07d Design Trial 3 — independent review result

## Verdict

**reviewed_KO**

Trial 3 materially improves the plan: it authenticates a detached candidate before
addressing repository executables, removes the legacy pathname/bind-mount recipe from
the execution path, freezes a concrete stream protocol, and preserves serial checkpoint
reviews. It is still not build-ready. Two P1 defects leave checkpoint 1 unable to produce
the promised authoritative evidence:

1. the purported reviewer trust root gives candidate code the same Unix owner and direct
   write authority over the materialization, prerequisites, evidence descriptor/path, and
   output path; and
2. the exact Docker argv runs as reviewer UID/GID while mounting `/build` and `/tmp` as
   root-owned mode `0700` tmpfs roots, so its first `/build` write cannot execute.

Implementation **must not begin** from this verdict. `D_0_1_SPLICE` remains blocked. This
result authorizes no checkpoint implementation, integration, promotion, tag, push,
release, support, publication, public splice, or cleanup-policy change.

## Reviewer and independence

- Reviewer: fresh Codex `gpt-5.6-sol` review session, reasoning effort `max`, service
  tier `priority`.
- Orchestration trace:
  `tr-tr-v5-d007d-design-t3-so-41d17dae-7031-4194-a92e-03064dc6183a`.
- Reviewer task: `ts-9ab42e8c-52dd-43cd-af7a-366c8413751c`.
- The canonical Gateway trace/task assignment succeeded, but three `agent.spawn` calls
  returned generic `TOOL_ERROR` before creating a session because the connected Gateway
  was rooted in another worktree. This review used the documented fresh direct supervised
  tmux fallback recorded by the orchestrator.
- This session did not author the candidate or request, did not receive the author's
  conversation, did not implement product/test code, and did not delegate or spawn a
  sub-agent.
- Independence is procedural and same-vendor: fresh trace, session, branch, and worktree
  with no author context. No cross-vendor independence is claimed.
- After the request commit, the author pane displayed an unexpected
  `gpt-5.6-luna`/`low` banner and was interrupted. Independently authenticated Git objects
  show no later commit or tracked change. This is a non-candidate process limitation only.

## Authenticated identities and scope

### Immutable Trial 2 KO parent

- Commit: `2c4612c5cf6875615bfe529e96c0781aeb25abea`.
- Tree: `41a0efc3276553ce9fc971758ccda34c0417cca1`.
- Sole parent: Trial 2 request `4075736d8eafa022e844559279d31a0162af516d`.
- Subject: `review(v5): reject D/0/07d Design Trial 2 build-ready plan`.
- Preserved review blobs:
  - Trial 1 request: `e622764d2c8c6082d60d6d983a18f858a02ba51c`;
  - Trial 1 result: `d2782b9a76ea9686d1c23aff7434cea91fcb581c`;
  - Trial 2 request: `c29dce81a1e2e6ce94e29f26cb3121b7c148d39a`;
  - Trial 2 result: `7a9286d1726aaf5c5008aa284b2aa5fc7d19dd92`.

### Trial 3 candidate

- Commit: `e3e16cb7d22c85e06d5a8f8312ed889054ceb251`.
- Tree: `9aed9d38761ab01df241ce682c871940b9fe5a19`.
- Sole parent: the immutable Trial 2 KO above.
- Subject:
  `docs(plan): bind D/0/07d verifier and stream build (V5 D/0/07d Design Trial 3)`.
- Exact candidate pathset and numstat:
  - `plan/PROJECT_V5/D/0/07.md` — blob
    `1544d5a70a80c402fd91de4480496585ed59e5bc`, `+25/-6`;
  - `plan/PROJECT_V5/D/0/07d.md` — blob
    `63f4d648400d7ec23a4c81738003bac09c28ddc5`, `+561/-151`.

### Trial 3 request

- Commit: `218ac0afa60f8df2e71b398ffb43ed8b8b996151`.
- Tree: `74a998ff576655d063cb6c7eb00a038e1d916ba7`.
- Sole parent: the Trial 3 candidate above.
- Subject:
  `docs(review): request D/0/07d build-ready review (V5 D/0/07d Design Trial 3)`.
- Exact request delta: add
  `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-3_to_review.md` at `+331/-0` and
  add one pending row to `plan/PROJECT_V5/reviews/README.md` at `+1/-0`.
- The result path was absent before this review. The candidate plan blobs and all four
  prior-trail blobs at the request tree equal the frozen values above.
- Candidate and request ranges pass `git diff --check`. No candidate source, test, CI,
  policy, dependency, lockfile, or workflow path changed.

### Current source and immutable build inputs

- Declared product/test baseline:
  `d0bf521799b16f7d3300163ce40bd7dfca49864d`, tree
  `0c577aef5bd864c51bf60086b9b3cb5daa254000`.
- Current source blobs include `process_supervisor.js`
  `b0100b6c626207e6cc66bdc46e410efa48dc4655` and helper
  `e24376fce8b6b2919ca9ad1ba348a094dad4e413`.
- Frozen build blobs recompute as:
  - recipe `dca11355e5acef80ffaccef564e1e216c1866dca`;
  - manifest `0c0f0c758a385d0a3ba727071213215d00c45f9e`;
  - patch `c2ca3c3875ab9ac2345adbc2b1f989950ce22038`;
  - extension `1c3282ae68e51e45aaecd13882f1f0eb4387648b`.

## Severity

| Severity | Count | Ruling |
|---|---:|---|
| P0 | 0 | No product authority, public contract, or deletion policy was changed. |
| P1 | 2 | Candidate evidence remains circular; the exact non-root Docker build is not executable. |
| P2 | 0 | The additional archive-parser discrepancy is evidence for P1-1, not a separate advisory finding. |

## Findings

### P1-1 — same-UID candidate code still controls the alleged reviewer trust root

The launcher now orders clone and blob authentication before candidate execution, which
closes the former ambient-worktree selection error. It does not establish an authority
boundary. The launcher checks only mode bits and then runs the candidate as the same UID
that owns every object:

- it accepts mode-bit-only “read-only” object database, toolchain, and dependency roots
  (`plan/PROJECT_V5/D/0/07d.md:307-315`);
- it changes the candidate clone to `a-w` but keeps the same owner
  (`plan/PROJECT_V5/D/0/07d.md:326-351`);
- it opens a regular evidence file for append and gives candidate code fd 3
  (`plan/PROJECT_V5/D/0/07d.md:353-355,375-395`);
- it gives candidate code writable fd 4 and then closes that descriptor before validating
  the pathname the candidate can rename or replace (`plan/PROJECT_V5/D/0/07d.md:398-420`);
  and
- after candidate execution it checks Git state and selected blobs by pathname, then writes
  `DONE` to the same inherited evidence fd (`plan/PROJECT_V5/D/0/07d.md:428-442`).

The prose claims candidate code cannot overwrite launcher records and that timeout,
identity drift, and residue suppress `DONE` (`plan/PROJECT_V5/D/0/07d.md:472-492`), but
the frozen launcher has no separate UID/user namespace, kernel read-only mount, parent-only
evidence channel, outer timeout, child-domain containment, or held-inode validation that
could enforce those claims.

Three reviewer-owned `/tmp` probes reproduced the failure under the actual UID `1000`:

```text
mode-before=444:1000 writable-before=no
mode-after=444:1000 content-after=candidate-mutated
evidence-after=CANDIDATE_FORGED_V1|D007D_LAUNCHER_DONE_V1|
output-original-inode=446918 output-path-inode=446919
```

The mode probe used `chmod u+w` as the unchanged owner, modified the file, and restored
mode `0444`; a final clean/mode check cannot see the mutation. The evidence probe inherited
the launcher's append fd and executed `: > /proc/self/fd/3`, removing the provenance record
before the parent appended `DONE`. The output probe renamed the still-open fd-4 inode and
installed a replacement at the pathname later checked by the launcher. A candidate child can
also retain these descriptors or restore repository bytes before the final pathname checks.

The exact container parser further demonstrates why candidate-side checking is not an
independent trust root. Appending a byte after a three-member USTAR archive produced:

```text
tar-trailing-probe list-exit=0 extract-exit=0
names=tmux-3.6a.tar.gz,tmux-3.6a-agents.1.patch,cmd-agents-capture.c,
```

That is the behavior of the exact `tar -tf`/`tar -xf` checks frozen at
`plan/PROJECT_V5/D/0/07d.md:583-591`, despite the normative rejection of bytes after the
second zero block at `:542-546`. The proposed coordinator tests and injected recorder may
detect this, but both are candidate-sourced and write through the candidate-accessible
evidence channel. This is corroborating circularity, not a separate finding.

Trial 2 P1-1 is therefore **not closed**. A Trial 4 correction must make the reviewer
authority mechanically inaccessible to candidate code before execution. At minimum it must:

1. run candidate code under a distinct, constrained identity/namespace with candidate,
   object database, toolchain, dependencies, source, and Docker client exposed through
   kernel-enforced read-only mounts rather than owner-changeable mode bits;
2. keep durable evidence in a parent-only descriptor/path and accept only bounded records
   over a pipe or socket, validating and durably syncing the held inode after candidate exit;
3. keep output custody in a parent-only directory/descriptor and hash/type/execute the held
   inode rather than a replaceable pathname;
4. put an outer reviewer-owned timeout, process-domain cleanup, descriptor closure, and
   residue check around every candidate invocation before emitting `DONE`; and
5. either independently validate the claimed canonical USTAR framing or narrow the runtime
   claim to what the frozen parser actually enforces.

### P1-2 — the frozen non-root Docker argv cannot write either mode-0700 tmpfs

The exact Docker argv combines:

```text
--user <reviewer-uid>:<reviewer-gid>
--tmpfs /build:rw,exec,nosuid,nodev,mode=0700,...
--tmpfs /tmp:rw,exec,nosuid,nodev,mode=0700,...
```

without `uid=` or `gid=` mount options
(`plan/PROJECT_V5/D/0/07d.md:555-568`). The exact container program immediately runs
`mkdir -p /build/input /build/source` and writes `/build/input.tar`
(`plan/PROJECT_V5/D/0/07d.md:578-584`). The authenticated reviewer UID/GID in this
environment are `1000:1000`.

Linux tmpfs mode, uid, and gid are properties of the initial root directory; the kernel's
documented `mode=700` example is accessible only by root when no uid/gid override is supplied.
Docker likewise exposes `uid` and `gid` as the options that select tmpfs ownership. The
current pinned recipe avoids this exact failure by pairing the same non-root `--user` with
mode `1777` for `/build` and `/tmp`
(`gateway/vendor/tmux-agents/build-offline.sh:35-45`). Trial 3 changed those roots to
`0700` without assigning them to the selected non-root user. The frozen trace therefore
fails at its first `/build` operation with permission denied; it cannot reach USTAR parsing,
hash validation, configure, build, or binary streaming.

Authoritative references used for this deterministic mount ruling:

- Linux kernel tmpfs documentation:
  <https://www.kernel.org/doc/html/latest/filesystems/tmpfs.html>
- Docker tmpfs option documentation:
  <https://docs.docker.com/engine/storage/tmpfs/>

Trial 2 P1-2 is therefore **not closed**. Trial 3 correctly removes every host bind mount
and no longer invokes the legacy pathname recipe, but its replacement exact command is not
executable. Trial 4 must freeze a writable and still-private mount contract, for example by
adding exact `uid=<reviewer-uid>,gid=<reviewer-gid>` options to both tmpfs mounts (subject to
an exact integration RED/GREEN), or by specifying another minimal ownership setup that is
compatible with the frozen non-root user. The corrected argv and its recorder oracle must be
normative rather than left to implementation choice.

## Trial 2 closure adjudication

| Trial 2 finding | Trial 3 ruling |
|---|---|
| P1-1 — verifier/evidence bootstrap was not candidate-bound | **Not closed.** Candidate materialization now precedes candidate execution and ambient substitution is addressed, but the same owning UID can rewrite and restore the materialization/prerequisites, truncate or replace evidence, replace output pathnames, and leave children/descriptors behind. Ordering alone is not custody. |
| P1-2 — pathname/bind builder could not implement the stream-only protocol | **Not closed.** The legacy script is now correctly non-executable and the no-mount stream protocol is concrete, but the frozen replacement cannot write its root-owned `0700` tmpfs as the selected non-root UID. |

The Trial 2 result's historical trace-id mismatch remains a separately disclosed prior-
evidence metadata limitation, not a candidate finding. The operator could retrieve artifact
`art-112baa6e-955c-489e-9d89-7fa7206fc32d` as `codex/orchestrator`; the author could not,
and cross-trace sharing was denied. This reviewer did not claim live author authentication of
that closed route and source-grounded both technical findings independently.

## Independently verified non-findings

- Mechanical enumeration returned 82 executable V5 sheets: 39 complete, 4 in progress,
  39 planned, and 43 open. The four in-progress sheets are `C/1/00`, `D/0/01`,
  `G/0/02`, and `H/0/01`.
- The canonical gate discovery algorithm returned current `test.gateway` inventory 123 and
  `sha256:132a5af375807e8d272ddf01516939a7834e33ca9d6dce61a22401b2af3a44f5`.
  Adding only the planned dedicated test returned 124 and
  `sha256:cc4b83a31abc1f1305f963d4fee40278fcf335c02f90dbd52210c1bd06d07bad`.
- All 12 relative Markdown-link occurrences in the two candidate documents resolve.
- The mechanically extracted launcher is syntactically valid and hashes to the declared
  `789b74670a9313120ce4e1e1f29ee44b25476cce4d086103e4e51c43b7a01263`.
  The mechanically extracted `CONTAINER_PROGRAM_V1` passes `sh -n`.
- `python3 scripts/ci_gate.py --repo-root "$PWD" --validate-only` returned
  `status:"passed"`, zero errors, and `tests/pass/fail/skip = 0/0/0/0`.
- The runtime is Node `v22.22.1`, which satisfies the current
  `^22.13.0 || ^24.0.0` contract (`gateway/package.json:14-16`). Observed tools were
  npm `9.2.0`, Python `3.13.13`, Git `2.53.0`, and Bash `5.3.9`. Docker client,
  `bwrap`, and `systemd-run` are present; `shellcheck` is absent.
- Current source still returns the ordinary seven-key execution DTO and a separate issuer
  (`gateway/src/adapters/process_supervisor.js:2467-2480,2489-2615`), while the helper
  direct-executes literal argv with `os.execve`
  (`gateway/src/adapters/process_supervisor_helper.py:1255-1263`).
- The checkpoint-3 cancel RED remains source-grounded: current settlement accepts a valid
  response in both `ACTIVE` and `REVOKING`, returns the decoded result, and only forces
  revocation in `finally` (`gateway/src/adapters/process_supervisor.js:1734-1845`).
- Existing fixtures distinguish the exact 24-byte `ready\nstatus\nack:status\n`
  characterization from the existing composed sequence-2
  `fixture-terminal-secret\n` result. The plan does not relabel either as the future exact
  checkpoint-2 transaction.
- Checkpoint 1's exact seven paths can express the dedicated test, fixture owner, wrapper,
  PTY/relay teardown migration, and sole inventory refresh without editing the legacy builder.
  Checkpoints 1/2/3 retain serial candidate/review ancestry, explicit RED/GREEN totals, and
  no implementation-before-design-OK permission. These structural improvements do not cure
  the two executable P1 defects.

## Commands, outcomes, totals, and limitations

The review used deterministic Git/source inspection plus reviewer-owned temporary probes. Key
commands and exact outcomes were:

| Command/check | Outcome |
|---|---|
| `git show`, `rev-parse`, `ls-tree`, `diff --name-status`, and `diff --numstat` across Trial 2 → candidate → request | exact branch/commit/tree/parent/subject/blob/pathset identities above |
| `git diff --check` on candidate and request ranges | pass, no output |
| mechanical launcher extraction piped to `sha256sum` and `bash -n` | declared digest, syntax pass |
| mechanical container-program extraction piped to `sh -n` | syntax pass |
| same-owner `0444` materialization mutation probe | fail-closed claim disproved; mutation survived restored mode |
| inherited fd-3 truncation probe | provenance erased; forged record plus launcher `DONE` remained |
| open fd-4 pathname replacement probe | original inode `446918`, checked pathname inode `446919` |
| three-member archive plus one trailing byte under exact `tar -tf`/`tar -xf` operations | both exit `0`; exact three names observed; no stderr |
| exact Docker argv/static tmpfs ownership trace | fails before `/build/input`; P1-2 |
| unprivileged local mount-namespace reproduction with `unshare --map-auto --mount` | unavailable: `Operation not permitted`; no live result inferred |
| `python3 scripts/ci_gate.py --repo-root "$PWD" --validate-only` | pass, 0 tests, 0 errors |
| gate-native current/hypothetical inventory recomputation | 123/current digest and 124/planned digest match |
| mechanical executable-sheet status enumeration | 82 = 39 complete + 4 in progress + 39 planned; 43 open |
| relative-link extraction and target resolution | 12/12 pass |
| source/test/fixture/caller/vendor/CI reconciliation | declared baseline behaviors and blobs confirmed |

No future checkpoint test exists in this tree: the dedicated test, fixture owner, and
real-host wrapper paths are all absent as planned. Accordingly no future RED/GREEN, focused,
Docker-integration, real-host, or full-CI total is credited. No Docker daemon/image, tmux
server, provider, user unit, bwrap sandbox, Redis, PostgreSQL, shared MCP service, hosted CI,
integration, promotion, tag, push, or release was exercised. No live signal, destructive
teardown, or repository cleanup ran. The Docker conclusion is from the frozen argv, current
pinned recipe, and authoritative tmpfs semantics; the failed namespace probe is reported as
unavailable rather than converted to pass evidence.

## Disposition

`reviewed_KO`

Trial 4 must establish a real reviewer/candidate authority boundary for materialization,
prerequisites, evidence, output, timeout, and residue, and must correct the exact non-root
tmpfs ownership contract. It must preserve the now-correct stream-only/no-host-staging design,
canonical inventory refresh, zero-deletion outer harness, serial checkpoints, source-grounded
cancel RED, status arithmetic, prior immutable evidence, and release non-claims.

Implementation may not begin. This is a plan review only; it is neither `D_0_7D` completion
nor integration, promotion, or release, and `D_0_1_SPLICE` remains blocked.
