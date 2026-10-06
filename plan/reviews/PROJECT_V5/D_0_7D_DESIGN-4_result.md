# Project V5 D/0/07d Design Trial 4 — independent review result

## Verdict

**reviewed_KO**

Trial 4 closes the former non-root tmpfs defect and substantially improves the intended
candidate/reviewer boundary. The embedded USTAR parser is byte-exact, executable, and rejects
the independent adversarial archive matrix. The frozen design is nevertheless not build-ready:

1. the exact `systemd-run`/`bwrap` launch has no pre-release primitive with which the parent can
   bind the cgroup before candidate execution, and its build-test mount reopens a pathname rather
   than binding the already-held output inode;
2. the D7C2 evidence protocol, reviewer-owned attack driver, and custody-parent program are not
   specified sufficiently to implement or independently adjudicate without inventing authority
   schemas and state transitions; and
3. the exact two-Docker-invocation protocol has no enforceable daemon-container identity,
   resource limits, timeout termination, or residue-reconciliation operation.

Implementation **must not begin from this exact candidate**. `D_0_1_SPLICE` remains blocked.
This result grants no checkpoint implementation, integration, promotion, tag, push, release,
support, publication, or cleanup-policy authority.

## Reviewer, governance, and independence

- Reviewer: fresh Codex `gpt-5.6-sol` session, reasoning effort `max`, service tier `priority`.
- Trace: `tr-tr-v5-d007d-design-t4-so-7ae269c8-b4be-4eeb-8f6d-02db9314a8c3`.
- Task: `ts-54db6b9b-522d-442b-bfba-6a5af565f425`.
- Supplied brief artifact: `art-2d3127de-ec66-42f4-93b8-6237600d1176`.
- Canonical `agent.spawn` returned generic `TOOL_ERROR` and created no tmux. This result is the
  documented supervised fallback for the same trace/task. No tmux/session teardown was run.
- This session did not author the candidate/request, implement code/tests/fixtures, change a
  prior artifact, or delegate review work. Independence is procedural and same-vendor; no
  cross-vendor review is claimed.
- `AGENTS.md`, `.claude/orchestration-profile.md`, `plan/README.md`, `D/0/07`, `D/0/07d`, all
  Design Trials 1–4 request/result artifacts that exist, the 376-line Trial 4 request, current
  supervisor/session-port/PTY/relay sources and fixtures, CI manifests/contracts/gate, and the
  pinned tmux inputs/recipe were inspected. Trial 3 KO was treated as a requirement, not averaged
  with the new design.

## Authenticated custody and scope

### Trial 4 candidate and request

- Candidate commit: `4bfbaba3dfc94e5dd67b7ed9049d9e3bd639d2c6`.
- Candidate tree: `64eb374dd9859f3579816b8ca39860e4d544d096`.
- Sole parent: Trial 3 KO `99935c53473a996b0b2650fe7435658930271c5a`.
- Subject: `docs(plan): bind D/0/07d reviewer custody (V5 D/0/07d Design Trial 4)`.
- Candidate pathset and numstat:
  - `plan/PROJECT_V5/D/0/07.md`: blob
    `3c6ea56cc6048b661d46d870e01053d95fa7950c`, `+25/-19`;
  - `plan/PROJECT_V5/D/0/07d.md`: blob
    `36453b91ed9ef7c0a9a9e201b1f36a2a0378d476`, `+604/-125`.
- Request commit: `c8b26c24b685fa6ff4576b2bc744f31474ca55a1`.
- Request tree: `84db063a158b21fefdfceb2229568ee1fe7f2f96`.
- Sole parent: the candidate above.
- Subject: `docs(review): request D/0/07d build-ready review (V5 D/0/07d Design Trial 4)`.
- Request delta: add the 376-line request at blob
  `f2175d1bfdabb60dc8cafc5d8c2de7018ab4298c` and append only its pending index row. The request
  index blob is `3993e4489d35fcc23bc5bff2296af5f5ce32de31`; the pre-request index blob is
  `b300b4495522724bb341acc2b2028c173f9d299d`.
- The result path was absent at the request tree. Both candidate/request ranges pass
  `git diff --check`.

### Trial 3 and prior immutable evidence

- Trial 3 KO tree is `43447c274150aba289080ae1148405ecdf008a11`; its sole parent is request
  `218ac0afa60f8df2e71b398ffb43ed8b8b996151` (tree
  `74a998ff576655d063cb6c7eb00a038e1d916ba7`), whose parent is candidate
  `e3e16cb7d22c85e06d5a8f8312ed889054ceb251` (tree
  `9aed9d38761ab01df241ce682c871940b9fe5a19`).
- Prior artifact blobs at the Trial 4 request are: Trial 1 request
  `e622764d2c8c6082d60d6d983a18f858a02ba51c`, Trial 1 result
  `d2782b9a76ea9686d1c23aff7434cea91fcb581c`, Trial 2 request
  `c29dce81a1e2e6ce94e29f26cb3121b7c148d39a`, Trial 2 result
  `7a9286d1726aaf5c5008aa284b2aa5fc7d19dd92`, Trial 3 request
  `60e59cf0a4ce912b14d5c527571afe0c15b92da2`, and Trial 3 result
  `867616cedffc1bb3bebfc6fba194c680a105c36a`.
- The Trial 3 result file SHA-256 is
  `e0495e1a598ec23b99c874ec6efafbc5073ec3a2c6b39a830e73422259a47668`.

### Unchanged product, tests, CI, and vendor inputs

- Product/test baseline: `d0bf521799b16f7d3300163ce40bd7dfca49864d`, tree
  `0c577aef5bd864c51bf60086b9b3cb5daa254000`.
- A baseline-to-candidate protected-path diff over `gateway`, `tests`, `ci`, `scripts`,
  `.github`, `policies`, packages, locks, and vendor inputs is empty.
- Critical blobs remain: supervisor `b0100b6c626207e6cc66bdc46e410efa48dc4655`, helper
  `e24376fce8b6b2919ca9ad1ba348a094dad4e413`, suites manifest
  `55e628ac58ad10d00e057660739bdf146f8d5ca7`, suites contract
  `7dc1d29de072d344ab0933879a7492a953bcf78e`, and CI gate
  `1270850d2624ef203a09ed7245df5a595f79585f`.
- Frozen tmux blobs remain: recipe `dca11355e5acef80ffaccef564e1e216c1866dca`, manifest
  `0c0f0c758a385d0a3ba727071213215d00c45f9e`, patch
  `c2ca3c3875ab9ac2345adbc2b1f989950ce22038`, and extension
  `1c3282ae68e51e45aaecd13882f1f0eb4387648b`.
- The manifest pins source SHA-256
  `b6d8d9c76585db8ef5fa00d4931902fa4b8cbe8166f528f44fc403961a3f3759`, patch
  SHA-256 `2526659ccfb17d3cc2a07171687379322e5a2caa79414e86ea4b6682aa98b2b3`,
  extension SHA-256 `4d80a8610651a1dd304b9b0e9b45d6832e115d9827d5166f26b4f9dbcdec27e2`,
  and image `node@sha256:0625f79a0c9f5005e31dba1761260b9f66ea8a3293e5f645eb4550a4c7dcdbb9`.

## Severity

| Severity | Count | Ruling |
|---|---:|---|
| P0 | 0 | No built product, public contract, release state, or deletion authority changed. |
| P1 | 3 | Launch custody, independent evidence authority, and Docker containment/residue are not executable as frozen. |
| P2 | 0 | Parser, inventory, and exploratory-test observations are recorded below, not promoted to advisory findings. |

## Trial 3 closure adjudication

| Trial 3 finding | Trial 4 ruling |
|---|---|
| P1-1 — same-UID candidate controlled reviewer materialization/evidence/output and could retain children/fds | **Not closed.** Kernel read-only mounts and parent-held evidence/output are the correct direction, but the frozen launch cannot establish the claimed pre-release cgroup identity, binds the test output by pathname, and leaves the reviewer authority implementation/protocol to checkpoint-time invention. |
| P1-2 — non-root Docker user could not write root-owned mode-`0700` tmpfs roots | **Closed.** Both exact tmpfs strings now bind `uid=1000,gid=1000,mode=0700`; a live first-write/exec probe passed for `1000:1000`, and the exact alternate identity `65534:65534` was denied. This closure does not cure the separate Docker deadline/residue finding below. |

## Findings

### P1-1 — the exact launch cannot provide the claimed pre-release and held-inode custody

The plan freezes a direct service command from `systemd-run` to `bwrap` to the candidate wrapper
(`plan/PROJECT_V5/D/0/07d.md:360-390`). It then requires the reviewer parent, “immediately after
unit start,” to resolve and retain the exact `ControlGroup` and abort on any mismatch **before
candidate release** (`:434-437`). No release primitive exists in the frozen argv.

Local systemd 259 documentation establishes that a transient service has the service manager,
not the `systemd-run` client, as its parent; the client returns after the command has begun, and
`Type=exec` strengthens this only to successful command execution. `--pipe` waits and passes its
original standard descriptors as-is. Therefore the reviewer can pidfd-bind its direct
`systemd-run` child, but candidate `bwrap` may already execute before the reviewer learns the
cgroup. `PR_SET_CHILD_SUBREAPER` (`:327-331`) does not adopt service-manager children.

The locally installed bwrap 0.11.1 exposes the missing deterministic mechanisms:
`--block-fd FD` blocks the sandbox before command execution, and `--ro-bind-fd FD DEST` binds an
open object. Neither is present in the exact argv. This matters independently at
`:393-397`: the test phase supplies `HOST_HELD_OUTPUT` through `--ro-bind` resolved from a host
pathname while claiming the held inode is authoritative. The required pathname-replacement seam
at `:457-458` can therefore make the parent validate/execute the original fd while bwrap opens a
replacement pathname, or it must rely on an unstated timing choice. The exact insertion must bind
the held fd, not reopen its pathname, and must freeze when release occurs.

Two related lifecycle claims also remain contradictory:

- `--collect` aggressively unloads successful and failed units (`:361`), while the post-exit
  protocol requires unit queries, cgroup reads, `reset-failed`, and a later absent-unit check
  (`:439-448`). Local `systemd.unit(5)` states that unloaded-unit execution results are lost.
- `close_range(3, UINT_MAX, CLOSE_RANGE_UNSHARE)` is required immediately before candidate-wrapper
  exec (`:291-297`), but the exact process chain contains no shim at that boundary. Calling it
  before `systemd-run`, between systemd and bwrap, or in a new wrapper are materially different
  implementations; none is frozen.

The design must add an exact parent-controlled block/release protocol, bind the output by fd,
identify which process executes `close_range`, and reconcile collection with the required
post-exit proofs. A checkpoint reviewer cannot choose these mechanics on the author's behalf.

### P1-2 — D7C2 and the reviewer-owned authority implementation are not closed contracts

D7C2 freezes a 12-byte envelope and global count/byte caps (`:415-425`), but not the records the
parent must accept:

- type `2` is only called a “canonical UTF-8 fixture ledger”; no keys, value types, bounds,
  canonical JSON serialization, multiplicity, or relationship to a test mode is defined;
- type `3` is called both a bounded UTF-8 diagnostic and one of the JSON-frame types, without an
  exact payload schema, per-type cap, count, or canonical projection;
- type `1` is described later as containing `tests`, execution-order `names`, a names hash, and a
  TAP hash (`:1218-1224`), but the exact key names for both hashes, allowed name grammar/length,
  array bound, required-key set, encoding, and test-count/name-count relationship are absent; and
- archive order is “type `3` diagnostics then exactly one type `4`,” but test/unit modes merely
  “may emit types `1..3`” (`:427-430`). Exact multiplicity and order among types `1`, `2`, and `3`
  are not stated, despite invalid mode-specific order being fatal.

The nine named custody attacks and exact RED `9/0/9/0/0` / GREEN `9/9/0/0/0` totals are present
(`:1149-1178`; eight separators mechanically confirm nine names). They still point their fixed
inner argv at the candidate-owned future
`tests/gateway/process_supervisor_session_port.test.js`. The plan says a separate reviewer-owned
driver supplies independent oracles, but checkpoint 1's exhaustive seven-path candidate pathset
contains no such driver (`:1093-1105`), and no embedded bytes/path/hash define it. Likewise the
custody parent itself is only a behavioral description: a checkpoint reviewer is instructed to
review a “proposed custody implementation,” copy it outside the tree, and choose its accepted
digest (`:259-267`). Its source provenance, exact implementation artifact, and complete state
machine are not part of this design review.

Consequently candidate TAP/records cannot be distinguished mechanically from a forged success
without reviewer-authored code and schemas that do not yet exist. Parser bytes alone do not close
the broader evidence authority. Freeze the full D7C2 schemas/order/EOF rules and an immutable,
independently sourced custody/attack-driver artifact or a fully mechanical recipe before asking a
reviewer to authorize implementation.

### P1-3 — Docker timeout, resource, identity, and zero-residue claims are not enforceable

The exact build argv (`:940-958`) correctly includes `--rm`, `--user`, two private tmpfs roots,
read-only root, dropped capabilities, `no-new-privileges`, no network, and the digest-pinned image.
It contains none of `--name`, `--cidfile`, `--memory`, `--pids-limit`, `--cpus`, `--ulimit`, or
`--stop-timeout`. Mechanical flag extraction returned only `--rm`, `--user`, and two `--tmpfs`
entries from that set.

The outer systemd resource properties govern the candidate bwrap phase, not the Docker daemon
container: the plan expressly ends the archive candidate domain before Docker and starts a fresh
test domain afterward (`:346-351`). Killing a timed-out Docker client does not prove that its
daemon-owned container stopped. Yet the frozen parent permits exactly one ownership probe and one
build invocation (`:927-930,1031-1039`), while the 900-second deadline and zero label residue are
asserted later (`:1197-1205`). There is no allowed `docker ps`/inspect/kill/rm operation, stable
container id/name/cidfile, or direct daemon reconciliation step. A label is a selector only if an
additional daemon operation is defined; `--rm` runs after container exit and cannot establish
deadline cleanup by itself.

The exact recorder expectation of only two invocations conflicts with the claimed post-timeout
and residue proof, and the claimed CPU/memory/tasks/file/fd limits at `:1694-1699` do not cover the
daemon container. Freeze container resource flags, an unambiguous identity, timeout escalation,
and bounded residue inspection/removal operations, including how the recorder counts them.

## Independent parser, archive, and container-program evidence

LF-preserving extraction from the normative fences produced:

| Artifact | Bytes | SHA-256 | Syntax |
|---|---:|---|---|
| `D007D_USTAR_PARSER_V2` | 2752 | `77e20732a688b6db779002cc6728a6dc8d604e2112f505a15d7046657e09ef4a` | Python `compile`, exit 0 |
| `CONTAINER_PROGRAM_V2` | 2908 | `fe8ab5b912eaf4ca6eda2a7ae408f965f390e3e80cb918f5b083b5ec717501d0` | `sh -n /dev/stdin`, exit 0 |

An initial exploratory extraction incorrectly omitted the parser's last LF and returned 2751
bytes with SHA-256
`2febf85802d998d44ed85856dcb7f5b05330909cfa068d6a3751f33eccd5c3b1`. It was rejected and
repeated with LF fidelity; it is not credited as parser evidence.

A reviewer-owned stdlib-only probe constructed the three headers/payloads/zero blocks without
candidate parsing, passed the valid archive, and rejected 21/21 independent mutations:

```text
valid=accepted mutants=21 rejected=21 accepted=[]
```

The rejected set was: bad magic, invalid octal digit, base-256 size, alternate octal terminator,
bad checksum, wrong size, nonzero padding, duplicate member, reordered members, extra member,
PAX, GNU longname, symlink, hardlink, sparse type, third zero block, trailing byte, EOF within a
header, EOF before payload completion, one zero block, and empty archive. This closes the
independent USTAR-parser portion of former P1-1; it does not supply the missing custody program.

## Docker tmpfs P1-2 evidence

Observed runtime: Docker 29.5.2; the pinned image is locally present and `docker image inspect`
returned its exact repo digest and `linux/amd64`. Disposable `--rm` probes used the exact security,
identity, and tmpfs option strings but did not run the build:

```text
selected 1000:1000: /build and /tmp stat 1000:1000:700:directory;
first write, chmod, and exec in each root: exit 0
alternate 65534:65534: read/write/execute checks denied;
mkdir /build/x and /tmp/x: Permission denied; probe exit 0
```

Linux `tmpfs(5)` confirms `uid=`, `gid=`, and `mode=` set initial root ownership/permissions.
Trial 3 P1-2 is therefore closed by executable evidence, not inference.

## Same-UID, fd, process, and held-path probes

A fresh `/tmp` stdlib probe under UID/GID `1000:1000` exited 0 and returned:

```text
same_uid_restore mutated=MUTATED final_hash_equal=True mode=0o444
inherited_fd proc_link=/tmp/d007d-t4-probe-<nonce>/evidence bytes=FORGED
held_output held=ORIGINAL path=REPLACEMENT inode_equal=False
retained_writer eof_before_kill=False killed_rc=-9 eof_after_kill=True
close_range_rc=0 errno=0 closed=[True, True, True]
```

These results validate the threat model and the usefulness of held fds, exact descendant kill,
EOF gating, and `close_range`; they do not prove the plan wires those primitives at the claimed
boundaries. Local bwrap help/man also confirms mount operations occur in argv order, each `--size`
applies only to the next tmpfs, the three sizes sum exactly `1073741824`, bwrap supplies a minimal
PID 1 reaper under `--unshare-pid`, and `--die-with-parent` SIGKILLs its sandbox chain.

## Preserved constraints and source reconciliation

- Checkpoint 1 still has exactly seven paths and no conditional pathset. Only
  `ci/suites.json:test.gateway.inventorySha256` may transition at that checkpoint.
- Gate-native discovery recomputed current `123` /
  `sha256:132a5af375807e8d272ddf01516939a7834e33ca9d6dce61a22401b2af3a44f5` and adding only the
  planned dedicated test recomputed `124` /
  `sha256:cc4b83a31abc1f1305f963d4fee40278fcf335c02f90dbd52210c1bd06d07bad`.
- Mechanical B–I sheet enumeration returned 57 = 14 complete + 4 in progress + 39 planned;
  adding the 25 delivered A sheets returns exactly 82 = 39 complete + 4 in progress + 39
  planned, 43 open. The in-progress set is exactly `C/1/00`, `D/0/01`, `G/0/02`, `H/0/01`.
- `D/0/07d` remains `planned`; checkpoint reviews are serial; no intermediate review is final
  `D_0_7D`; `D_0_1_SPLICE` remains `blocked_confirmed`/blocked before GREEN.
- Stream-only USTAR stdin and raw binary stdout remain normative. There is no host staging/bind
  mount and the legacy `build-offline.sh` is evidence only, never an execution path.
- Current source still returns the ordinary seven-key execution object and a separate issuer
  (`process_supervisor.js:2467-2480,2489-2615`); the helper direct-executes literal argv via
  `os.execve` (`process_supervisor_helper.py:1255-1263`).
- The cancellation RED remains real: `performSessionPortOperation` accepts `ACTIVE` or
  `REVOKING`, can return the decoded result, and only forces revocation in `finally`
  (`process_supervisor.js:1734-1845`).
- Existing fixture/PTY/relay evidence distinguishes the exact 24-byte
  `ready\nstatus\nack:status\n` render from `fixture-terminal-secret\n`; the plan does not claim
  the future exact composed transaction is already built.
- Zero product/session-port deletion after the final observation, replacement survival, retained
  PTY/relay identity, no shell/send-keys path, and outer fixture-owner teardown remain plan
  requirements. No candidate path weakens them.

## Commands, exits, exploratory failures, and limitations

| Command/check | Exact outcome |
|---|---|
| `git show`, `rev-parse`, `ls-tree`, `diff --name-status`, `diff --numstat`, `hash-object` over baseline → Trial 3 → candidate → request | object/tree/parent/subject/pathset/blob/numstat identities above; exits 0 |
| `wc -l plan/reviews/PROJECT_V5/D_0_7D_DESIGN-4_to_review.md` | `376`, exit 0 |
| `git diff --check` on candidate and request ranges | no output, exits 0 |
| `python3 scripts/ci_gate.py --repo-root "$PWD" --validate-only` | `status:"passed"`, errors 0, tests/pass/fail/skip `0/0/0/0`, exit 0 |
| balanced-fence and relative-link probe over `D/0/07` and `07d` | fences `26` and `58`, both balanced; links `12`, unresolved `0`, exit 0 |
| gate-native current/hypothetical inventory probe | exact 123/124 counts and digests above, exit 0 |
| first gate-module import probe | exit 1 from Python 3.13 `dataclass` module registration error; corrected by registering the temporary module in `sys.modules`, then exit 0 |
| parser/container LF extraction, digest, compile/`sh -n` | exact table above, all final commands exit 0 |
| independent USTAR probe | valid accepted; 21/21 mutants rejected; exit 0 |
| Docker image inspect and two disposable tmpfs probes | image exact `linux/amd64`; positive and negative probes both exit 0 |
| `systemctl --user is-system-running` | exit 1: no DBus/XDG user scope in this review shell |
| minimal `bwrap --unshare-user ... /bin/true` | exit 1: unprivileged namespace creation denied |
| exploratory current codec + PTY + relay suites | exit 1; tests/pass/fail/skip `106/95/10/1` |

The exploratory suite failure is preserved, not summarized away. Five tests failed with
`SESSION_PORT_REVOKED`; five real-host tests failed because ambient tmux was `3.6` instead of
required `3.6a-agents.1`; one custom-runtime test skipped. Candidate product/test bytes are
identical to baseline, so these failures are limitations of this ambient, non-custody run and are
not Trial 4 implementation evidence. No future dedicated test, fixture owner, wrapper, custody
parent, or reviewer attack driver exists in the tree.

No full build, canonical full CI, checkpoint RED/GREEN, real user-systemd/bwrap isolation lane,
custom tmux real-host lane, provider, network, Redis, PostgreSQL, integration, promotion, tag,
push, or release was run or inferred. Docker was used only for image inspection and disposable
tmpfs identity probes; the full source/hash/configure/build/output pipeline was not run. Host
kernel, reviewer account, Docker daemon/image, and authenticated toolchain compromise remain
outside the design's stated local threat model.

## Disposition

`reviewed_KO`

Trial 3 P1-2 is closed. Trial 3 P1-1 is not closed until the exact custody launch, held-output
mount, D7C2 schemas, reviewer authority program, Docker lifecycle, and residue mechanics are
fully executable without reviewer or implementer invention.

Implementation may **not** begin from candidate
`4bfbaba3dfc94e5dd67b7ed9049d9e3bd639d2c6` / tree
`64eb374dd9859f3579816b8ca39860e4d544d096`. This remains a plan-only KO; it is not
implementation, `D_0_7D` acceptance, integration, promotion, release, or authority to unblock
`D_0_1_SPLICE`.
