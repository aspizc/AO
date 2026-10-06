# Project V5 D/0/07d Checkpoint 1 — Trial 1 review request

## Requested reviewer

Assign a fresh independent reviewer that did not implement this checkpoint.
Review the exact candidate against
[`D/0/07d`](../../PROJECT_V5/D/0/07d.md) and the independently accepted
[`D_0_7D_DESIGN-8_result.md`](D_0_7D_DESIGN-8_result.md).

This request is evidence, not a self-verdict. Trial 1 is **pending**. The
reviewer-owned path `D_0_7D_CHECKPOINT_1-1_result.md` does not exist in this
submission. Checkpoint 1 is not final `D_0_7D`, does not complete the sheet,
and makes no integration, promotion, release, or support claim.

## Frozen identity and ancestry

```text
implementation base  6d6133b62b4823336564f77b47f97b846f9a972e
base tree            e2a97eed16f6db828f735d8d6a01c1dccc36a4d1
RED commit           896535ad0bd7eb4ab7156796e934ea3667c6aed7
RED tree             f24cc704c3e7df27b37323332ccf946dd9f74864
initial GREEN        63b582bec1965545918a963fca0fc9719754f18d
initial GREEN tree   e96138be0b32420fa591393d3c9a4ac912b0e37f
final candidate      e27d8a7f89cfdb870ffd4b4c7a78d72eee3bc398
candidate tree       9cd04f26375e88abca00a98d373956b7f40e9a4f
candidate parent     63b582bec1965545918a963fca0fc9719754f18d
request parent       e27d8a7f89cfdb870ffd4b4c7a78d72eee3bc398
```

The exact candidate pathset is the sheet's complete, unconditional
Checkpoint 1 pathset:

```text
ci/suites.json
tests/gateway/process_supervisor_session_port.test.js
tests/gateway/process_supervisor_session_port_fixture.py
tests/gateway/process_supervisor_session_port_pty.test.js
tests/gateway/process_supervisor_session_port_relay.test.js
tests/gateway/process_supervisor_session_port_fixture_owner.js
tests/gateway/run_process_supervisor_session_port_real_host.sh
```

No product adapter, policy, dependency, lockfile, suite contract, CI script,
or workflow changed. In `ci/suites.json`, only
`test.gateway.inventorySha256` changed from the 126-path
`sha256:f6bf19a001a01341c9dad63ab55f21bfd7b68571565b061f42b4a0e097f3922e`
to the required 127-path
`sha256:1dd0cc26a0f8c165e4ff536641acf470b7b6c7ad17342450027cdaa9fff2431d`.
The lint digest remains
`sha256:854bc480c875e835c81de3b1a0f7e0865f01304c7f570a2a6ec56b69db2e7cd4`.

## Implemented correction

- A long-lived test-only fixture owner uses bounded four-byte-length JSON
  frames on private inherited pipes, retains no-follow dirfds and exact
  device/inode/uid/mode observations, directly spawns tmux, and binds its
  original child with pidfd plus two identity reads.
- Teardown signals only that held pidfd. It does not re-resolve numeric
  identities, call tmux `kill-session`/`kill-server`, or delete paths. PTY and
  relay fixtures now use this owner, and replacement entries survive.
- The JS coordinator emits the canonical three-member USTAR input, validates
  unframed binary output and its one terminal status record, speaks D7C2, and
  supplies the isolated wrapper's Checkpoint 1 unit/stream modes.
- The executable wrapper provides the fixed serial unit and stream entry
  points used by the focused harness.

## Causal TDD RED at `896535a`

All three RED groups failed by their intended assertions, with zero skips and
zero cancellations. They had no real signal, deletion, tmux, provider, shared
path, or Docker-daemon effect.

| Group | tests/pass/fail/skip/cancel | Causal observation |
|---|---:|---|
| Teardown identity | `2/0/2/0/0` | The old injected path recorded one `kill-session`, one `kill-server`, and one recursive remove instead of zero; a final-entry replacement survived only because injected operations suppressed the recorded remove. |
| Stream protocol | `2/0/2/0/0` | The legacy builder was invoked once with two pathnames and three mounts, emitted no canonical archive members/raw output, and accepted prefixed, trailed, reordered, or four-member mutants. |
| Candidate custody mirror | `9/0/9/0/0` | Each historical same-UID/injected attack reached its forbidden effect; these were causal assertions, not import, syntax, timeout, signal, skip, or cancellation failures. |

The nine mirrored names cover prerequisite chmod/restore, hidden evidence
descriptors and paths, output-path replacement, retained child/fd cleanup,
TERM resistance at the outer deadline, final-byte revalidation, malformed or
noncanonical USTAR, mount/prerequisite writes, and Docker client/socket or
arbitrary-operation reachability.

## Process-leak RED and final fix

The first post-implementation canonical `scripts/ci.sh` attempt was not
GREEN. Although its `test.gateway` TAP contained `1598` tests, `1589` passes,
zero assertion failures, and nine PostgreSQL skips, the real suite supervisor
rejected it because the command left processes in its owned process group.
A minimal reproduction through `scripts.ci_gate._execute_command` returned
`process_tree_leak`.

The retained identity showed the sibling pane's `/bin/sleep` process still in
`/proc` as state `Z` after the direct tmux child had been reaped. Without a
nested subreaper, that descendant was reparented to the authoritative outer
suite supervisor, so the candidate had leaked custody even though the process
had exited.

Commit `e27d8a7` corrects that defect by enabling
`PR_SET_CHILD_SUBREAPER` in the fixture owner before spawn and performing
bounded `waitpid` collection of the exact adopted descendant after pidfd-based
termination of the direct tmux child. The older Python host cleanup was also
narrowed from tmux mutation, numeric identity lookup, and path deletion to the
original pidfd/subreaper ownership proof. Tests now require the sibling
identity to be absent and its PID to appear in the exact reaped set. The same
minimal real-supervisor reproduction then returned `completed`, rc `0`.

## Accredited GREEN evidence for `e27d8a7`

| Verification | Recorded outcome |
|---|---|
| Focused dedicated/PTY/relay run through the real suite supervisor | `91/91/0/0/0`; supervisor `completed`, rc `0` |
| Final canonical `scripts/ci.sh` | exit `0`; `2590` tests, `2578` pass, `0` fail, `12` skips |
| Canonical skip accounting | nine PostgreSQL, two Gateway integration, one Temporal |
| Redis integration | `22/22` passed |

The focused real-tmux lane ran with all three required selectors:

```text
D007C_TEST_TMUX_PATH=/tmp/ao-tmux-runtime.SbqhtS/bin
D007C_RUN_REAL_TMUX_PROBE=1
D007C_TMUX_SOCKET_NAME=d007c-control-probe
```

The 13 teardown/stream/custody tests are included in the passing focused
manifest and still exercise the implemented owner/coordinator logic; their
GREEN is not a constant expectation flip.

## Failed attempts that are not accredited

1. During the first canonical attempt, Gateway lint could not bootstrap
   because `gateway/node_modules` was absent. That lint failure is not a
   source failure and is not credited as verification. The contemporaneous
   apparently passing Gateway TAP is also not credited because the strict
   supervisor detected the process-tree leak described above.
2. After the leak fix, a dependency-free `test.gateway` attempt produced
   `699` tests, `625` passes, and `74` failures because
   `better-sqlite3`, `redis`, and `zod` could not be imported. Its supervisor
   status was `completed`, which corroborates leak removal only; the failed
   test run is not GREEN and is not counted in the accredited totals.

The final canonical gate above supersedes these attempts; neither failed run
is being relabeled as a pass.

## Exact candidate blobs

```text
154b2c5b71715e077884a60200baf3e41b239d99  ci/suites.json
d0f146ea1494f47e5924c9c083e304bfb2aaab8b  tests/gateway/process_supervisor_session_port.test.js
b055a47b4440a5032c6fd67800ba18b993b3d6a7  tests/gateway/process_supervisor_session_port_fixture.py
19c4682bbc3834624de7e43828d89c04c1c6b441  tests/gateway/process_supervisor_session_port_pty.test.js
e0336b8407bdab54e92d0bd19ffed8785e02b00b  tests/gateway/process_supervisor_session_port_relay.test.js
d47e1651a760bfa45f0694b3d239876f8269e70b  tests/gateway/process_supervisor_session_port_fixture_owner.js
755cb3a93f44664f0acd3f4843d9069756fd2a0f  tests/gateway/run_process_supervisor_session_port_real_host.sh
0c0f0c758a385d0a3ba727071213215d00c45f9e  gateway/vendor/tmux-agents/manifest.json
c2ca3c3875ab9ac2345adbc2b1f989950ce22038  gateway/vendor/tmux-agents/tmux-3.6a-agents.1.patch
1c3282ae68e51e45aaecd13882f1f0eb4387648b  gateway/vendor/tmux-agents/cmd-agents-capture.c
dca11355e5acef80ffaccef564e1e216c1866dca  gateway/vendor/tmux-agents/build-offline.sh
1270850d2624ef203a09ed7245df5a595f79585f  scripts/ci_gate.py
f7b80a398690c1458de217fb14f6a83925a9bbaf  scripts/ci.sh
```

The independently accepted Trial 8 design anchors the V4 custody spec at
`1cb01a4287cb61c81adfb106e8ea058d2b217a7ef8972f6c311d2bbef1e969de`,
the BWRAP argv at
`87b9dfbe5730fcac337879d00767f22a06aaa35e2b388a53030e988262f92c01`,
the fd-seal shim at
`136130354a4f9df53a1601397a8e27ba057d2260d5b547039b11a23db97b3e47`,
and the V4 oracle at
`c24b6b31bc976daae905ed6ad37d3f140cee67afef83b4fc18f0b5b1ca20d116`.
Those anchors identify the independent evidence the reviewer must extract;
they are not claims that the authority run occurred here.

## Explicitly not executed

No privileged, independently held reviewer-custody mode was executed for
this handoff. In particular, there is no authority run of the nine attacks in
the real V4 user/mount/PID/cgroup domain, no independently materialized
`AUTHORITY_PARENT run` unit sequence, no bootstrap-substitution proof, and no
Docker integration GREEN with the exact probe-then-build 20-operation
transcript. The candidate's passing nine-test mirror and canonical CI run are
corroboration only and do not substitute for those authority gates.

These omissions are **not GREEN** and are not skips. The sheet treats absent
Docker, user-manager/cgroup, bwrap, source archive, image, tmpfs, or other
authority prerequisites as hard failures. The independent reviewer must run
the required custody/Docker modes with reviewer-owned artifacts or issue a KO;
this request supplies no privileged evidence from coder custody.

## Required independent review

The reviewer must, at minimum:

1. authenticate all commits, trees, sole-parent ancestry, pathset, blobs, and
   the single inventory-digest change;
2. reproduce the three causal RED groups from `896535a` and the corrected
   focused/canonical behavior from `e27d8a7` under the real suite supervisor;
3. inspect pidfd binding, nested-subreaper ownership, exact wait/reap
   authorization, replacement preservation, USTAR framing, and the absence of
   tmux mutation or path deletion on every outer teardown branch;
4. independently extract and authenticate the Trial 8 V4 custody artifacts,
   then execute the mandatory authority attacks, bootstrap proof, and Docker
   integration transcript rather than trusting candidate-owned tests; and
5. write the immutable `D_0_7D_CHECKPOINT_1-1_result.md` verdict and update
   the index only from the independent reviewer session.

Until that result exists and records OK for this exact candidate, Checkpoint 2
must not begin.
