# Review Submission - Project V5 D/0/07c (Trial 3)

## Requested reviewer

Please assign a fresh independent reviewer that did not implement this trial.
The reviewer must use a new orchestration trace and session and must review the
complete candidate rather than only the final correction commit.

Review the candidate against:

- `plan/PROJECT_V5/D/0/07c.md`;
- the frozen parent contract `plan/PROJECT_V5/D/0/07.md`;
- the independently approved post-`ACCEPT` design at
  `95185e0175e7b0619628488c3024ba2d1615418c`;
- the operator ratification at
  `ac92d51afc329449e31be7bfa91b77b255ae8fa4`;
- both Trial 1 verdicts:
  `D_0_7C-1_result.md` and `D_0_7C-1_result_second.md`; and
- both Trial 2 verdicts:
  `D_0_7C-2_result_a.md` and `D_0_7C-2_result_b.md`.

This request is an evidence submission, not a self-verdict. Trial 3 remains
**unreviewed**. It makes no integration, promotion, release, support,
`D/0/07d`, public splice, or default-runtime deployment claim.

## Authorization boundary

The implementation is bound by the design at:

```text
95185e0175e7b0619628488c3024ba2d1615418c
tree 7f2a27697fc9cf06062bce23253a8913ce1e983c
parent f056236ea3f9cb48f7bb0ff448e07fcf04f587db
design(v5): classify same-holder relay and tmux-binding drift for D/0/07c
```

Design Trial 9 received two zero-finding independent verdicts:

```text
reviewer A e230faf
reviewer B 83252f6
```

The operator then ratified all five amendments:

```text
ac92d51afc329449e31be7bfa91b77b255ae8fa4
tree 974963e12fb39b74826fc55449584fb3b3d81ba5
parent 0db688bda8b5a85599ef61c94cb54dd0302d205d
docs(review): record D/0/07c five-amendment ratification (V5 D/0/07c)
```

| Decision | Ratified option |
|---|---|
| Relay transfer authority | 1B - retained socket/read-range |
| Atomic capture and owned tmux retirement | 2A - custom shared-server tmux |
| Process/tree retirement | 3B - bounded process preservation |
| Owned namespace retirement | 4C - namespace preservation |
| PTY source/write authority | 5B - read-time retained PTY |

The implementation does not claim stronger authority than those amendments.
In particular:

- a capture does not establish the producer, production time, foreground job,
  or binding state of bytes admitted under Decision 5;
- the accepted socket object and retained PTY/tmux connection, not later
  pathname or PID resolution, carry workload or cleanup authority;
- escaped processes and targets whose lifetime anchor is lost may be
  `PRESERVED`; and
- under Decision 4C, the relay socket pathname and runtime directory normally
  remain after an accepted generation unless an external owner removes them.

## Complete Trial 3 technical lineage

### Initial RED

```text
f84825a51c565586071e142c76767039438a1330
tree 6b894154e75a0d94854eb5bc467f64184d832d2a
parent ac92d51afc329449e31be7bfa91b77b255ae8fa4
test(session-port): bind accepted generation effects (V5 D/0/07c Trial 3)
```

This commit added the first six ratification-focused generation, retained
socket, retained PTY, atomic capture, namespace-preservation, and bounded
process-cleanup oracles.

### Partial GREEN

```text
0941b2db9ccad5b18a9e1e4375677937cb3c1333
tree ccf2ecbbefc8937836e5943d57a366c0d2d9dd99
parent f84825a51c565586071e142c76767039438a1330
feat(session-port): enforce retained tmux and bounded cleanup
```

This was deliberately not accepted as the final candidate. Subsequent
authentication showed that the first RED set did not force all production,
packaging, dual-host, and live retained-channel obligations.

### Additive RED repairs

```text
357de4583531519eabd959969b3cee94e7799e04
tree b5253a7bc4c90014f144998c3d8016ea1d79f80a
parent 0941b2db9ccad5b18a9e1e4375677937cb3c1333
test(session-port): add production authority gate RED

017c49daeee23b701b43e564c7737eb031af6fbe
tree fb163658fa7b700f9904e8b3ba1e706853cf2029
parent 357de4583531519eabd959969b3cee94e7799e04
test(session-port): split authority gate RED evidence

8f848b3f9ee8a72a6b4872f0fe64b445bd10ba98
tree 0cb8e279ccf0e32522275d4adc1d01647800f822
parent 017c49daeee23b701b43e564c7737eb031af6fbe
test(session-port): restore isolated retained-channel probe
```

`357de45` first bound the test suite to the production path and packaging
contracts. `017c49d` split that combined gate into five separately observable
tests so an early assertion could not mask later defects. `8f848b3` added the
opt-in real custom-tmux retained-channel probe.

### Final GREEN

```text
d7873eba1a9405fec92875020854ed67f16a03b1
tree 1db04ff47b71b1f6d04ecf453a53b96dc0e83dba
parent 8f848b3f9ee8a72a6b4872f0fe64b445bd10ba98
feat(session-port): close retained tmux runtime gaps (V5 D/0/07c Trial 3)
```

The candidate for review is the complete technical range
`ac92d51..d7873eb`, not only `8f848b3..d7873eb`.

## Process deviations requiring reviewer adjudication

The normal `agents-gateway`/KYA path was not a usable execution route for this
run, so the orchestrator drove an isolated Codex worktree directly. Claude was
unavailable/failing during this work. Consequently:

- no Claude review verdict exists;
- no coder-owned output is represented as independent review;
- this request does not satisfy the independent-review gate by itself; and
- a fresh independent reviewer must adjudicate the complete candidate before
  any integration claim.

The following intermediate Trial 3 subjects also omit the repository's full
`(V5 D/0/07c Trial 3)` suffix:

```text
0941b2d feat(session-port): enforce retained tmux and bounded cleanup
357de45 test(session-port): add production authority gate RED
017c49d test(session-port): split authority gate RED evidence
8f848b3 test(session-port): restore isolated retained-channel probe
```

They are immutable technical lineage and were not rewritten. The final
`d7873eb` subject is conforming. The reviewer must explicitly adjudicate this
history deviation; this submission does not waive it.

## TDD RED evidence

### Initial contract RED and partial-GREEN deficiency

`f84825a` introduced the six intended contract oracles before the main
implementation. The partial GREEN at `0941b2d` implemented those seams, but
the original tests were too fixture-heavy to prove all required production
and deployment behavior. That deficiency was treated as a test defect, not as
permission to accept the partial GREEN.

The additive RED commits corrected the evidence chain instead of rewriting the
earlier commits.

### Split five-gate replay against the partial implementation

The exact five tests at `017c49d`, replayed against the partial implementation,
produced:

```text
tests 5
pass 3
fail 2
skipped 0
duration_ms 243.974459
```

The two failures were:

1. the vendored patch contained whitespace that violated the clean-patch
   oracle; and
2. the Darwin offline builder did not exist.

The passing three tests proved only that the partial implementation already
emitted the configured production authority events, rejected replacement
clients in its fixture seam, and named the custom version/protocol. They did
not erase the two failures.

### Strengthened retained-channel replay

After `8f848b3` added exact control-mode and live-runtime requirements, the
same replay against the uncorrected implementation produced:

```text
tests 5
pass 2
fail 3
skipped 0
duration_ms 228.746009
```

The failures were:

1. patch whitespace;
2. use of `-CC` rather than the required retained `-C` control client; and
3. the absent Darwin offline build contract.

The opt-in live test independently produced:

```text
tests 1
pass 0
fail 1
skipped 0
duration_ms 205.003504

TerminalChangedError: tmux control connection closed
```

This is the product-binding RED that required the final correction.

## Convergence failures and corrections

The following failures occurred while converging on the final live lifecycle.
They are disclosed as failed intermediate evidence, not presented as passing
results.

| Observed failure | Correction in the final candidate |
|---|---|
| The patch was not cleanly formatted and its build contract was not strict enough. | Regenerated a five-file, nine-hunk unified patch; builders apply it with `--fuzz=0`, validate both source hashes, preserve generated parser inputs, and require the exact runtime version. |
| The package described Linux only and had no native Darwin builder. | Added an executable offline Darwin builder for `darwin/amd64` and `darwin/arm64`, using the same source, patch, extension, no-network, and no-package-manager contract. |
| `tmux -CC` closed the control connection in the real probe. | The retained transport now uses exactly `tmux ... -C new-session`. |
| A constrained probe environment omitted a command needed by the pane workload. | The live harness uses an explicit safe environment containing the required system command path while the runtime executable remains exact. |
| Destroying the only pane/session could detach the control client before the cleanup response arrived. | The retained client sets `refresh-client -f no-detach-on-destroy` before cleanup. |
| A temporary session-only cleanup avoided detachment but did not prove exact pane ownership if the pane moved. | Cleanup now issues exact `kill-pane -t <accepted pane>` first and exact `kill-session -t <accepted session>` second, on the same retained connection. |
| The first live proof did not move the owned pane, so a target-name cleanup could falsely pass. | The final live oracle moves the accepted pane into an unrelated sibling session before cleanup and requires the pane and original session retired while the sibling and shared server survive. |
| An early rejection path revoked and cleaned the generation before its authenticated fd-5 error could be delivered. | Rejection defers `V`, writes the authenticated private response as workload while `G` is active, flushes pending revocation only after that write, then waits for parent-channel retirement. |
| The retained-capture drift path initially surfaced generic snapshot failure. | Retained tmux unavailability or field drift is now classified as `SESSION_PORT_TERMINAL_CHANGED` while preserving zero accepted snapshot state. |
| Existing leak-free fixture expectations contradicted ratified Decision 4C. | Accepted-generation assertions now require relay socket and runtime-directory preservation, key retirement, and unchanged shared tmux socket; test-harness removal happens only after those assertions as an external cleanup action. |
| Failed live attempts left private test processes and socket entries. | The exact owned stale set was enumerated before cleanup; 15 private processes were killed and 9 exact private socket entries were unlinked. No default socket, unrelated server/session, or `ag-*` target was touched. |

## Final implementation behavior

### One accepted generation

`AcceptedGeneration` owns the live workload lock, sticky revocation, candidate
settlement, and one-way cleanup ledger. The final path binds retained PTY
reads/writes, relay ranges, private readiness/responses, atomic capture, and
cleanup to the same immutable 32-byte generation.

Workload effects require the matching live generation. Revocation closes
workload authority and opens only sealed cleanup targets. No later matching
name or identity can revive the generation.

### Retained custom tmux connection

The helper opens one custom tmux control client at acceptance:

```text
tmux [-L <isolated socket>] -C new-session ...
```

On that same retained connection it:

1. requires reported version `3.6a-agents.1`;
2. requires `agents-capture-v1` in `list-commands`;
3. enables `no-detach-on-destroy`;
4. fixes history limit 400 and manual 120x40 geometry;
5. receives one field-exact `agents-capture-v1` record; and
6. retires the exact owned pane first and accepted session second.

There is no replacement tmux client for capture or owned-object cleanup.

The custom command atomically compares the generation, server PID, session ID,
pane ID, pane PID, width 120, height 40, and history limit 400 and returns the
capture bytes in the same operation. Stock separate metadata and
`capture-pane` calls are not used as authority.

### Moved-pane and shared-server preservation

The opt-in real probe creates a private server label, preserves an unrelated
sibling session, moves the owned pane out of its original session, and then
revokes the generation. It requires:

```text
movedPaneObserved = true
owned pane         = RETIRED
accepted session   = RETIRED
sibling session    = survives
shared server      = survives
```

This is intended to catch cleanup that merely kills a target name, destroys
the whole server, or loses the pane after a move.

### Deferred rejection settlement

An authenticated private rejection response is still a workload effect.
Therefore the final implementation:

1. defers effect-side revocation for a snapshot dispatch;
2. computes either the success response or the exact authenticated error;
3. writes an error response on retained fd 5 while `G` remains workload-open;
4. flushes pending revocation and cleanup only after that write; and
5. waits for retained fd-4/control retirement so the parent can consume the
   response rather than observing an unexplained channel loss.

The reviewer should specifically challenge response-write failure, parent
channel loss, revocation before and after the write linearization point, and
duplicate settlement. The intended result is one authenticated response or
the exact supervisor-loss outcome, never a silently lost rejection followed
by an unrelated public error.

### Honest Decision 4C boundary

For an ordinary accepted generation, product cleanup:

- retires the single-use relay key;
- closes retained descriptors;
- records the relay socket entry as `PRESERVED`;
- records the runtime directory as `PRESERVED`; and
- does not remove the shared tmux socket.

The focused tests first assert that state. Their later workspace cleanup is an
external test-harness action and is not product behavior. This candidate
therefore makes no leak-free accepted-generation claim for the socket pathname
or runtime directory.

## Trial 1 and Trial 2 closure targets

The reviewer must independently re-open every prior finding:

| Prior finding | Trial 3 review target |
|---|---|
| Trial 1 P1: post-`ACCEPT` input/capture used an authenticated-then-unbound identity. | Every workload range must use only its retained accepted authority and live generation; no replacement endpoint may authorize. |
| Trial 1 P2 and second-reviewer P1: test-owned tmux socket cleanup leaked or was simulated. | Distinguish test-harness cleanup from ratified 4C product preservation and prove no unrelated/default server destruction. |
| Trial 1 second-reviewer P0: default real helper did not reach the relay/capture path. | Break the real default helper path and require the exact 24-byte positive transaction to turn RED. |
| Trial 1 second-reviewer P1: width 121 or history 401 was accepted. | The atomic custom record must reject any field mismatch before accepting capture state. |
| Trial 2 reviewer A P0: the exact first named positive remained manufactured. | The exact named positive must exercise the ordinary configured helper rather than a supplied `sessionPortOps` snapshot. |
| Trial 2 reviewer A P1: provider PTY output could be forwarded after same-socket CWD drift. | Adjudicate this against ratified Decisions 1B and 5B: the retained socket/read-range and retained-PTY generation are authority; live CWD is diagnostic, not effect-time authority. Ensure the implementation does not claim the stronger rejected contract. |
| Trial 2 reviewer B P1: outer-pane drift between preflight and capture returned a snapshot. | `agents-capture-v1` must compare all fields and capture within one retained server operation. |
| Trial 2 reviewer B P1: pathname replacement could be unlinked during cleanup. | Product cleanup must perform no post-accept pathname unlink/rmdir under 4C; replacement entries must survive. |

Ratification changes the applicable authority contract for some earlier
findings; it does not erase their evidence. The reviewer must verify that the
candidate conforms to the ratified loss boundary and does not quietly claim
the pre-ratification stronger guarantee.

## Exact final gates

After the coder reported GREEN, the root orchestrator independently reran and
authenticated every final test command, digest, pristine-patch check, and
duplicate Linux build reported below.

### Full relay gate with the live retained-channel probe

The final command used the freshly built custom runtime and an exact isolated
tmux socket label:

```text
D007C_TEST_TMUX_PATH=/tmp/d007c-final-live-bin.Yia6tD \
D007C_TMUX_SOCKET_NAME=d007c-control-probe \
D007C_RUN_REAL_TMUX_PROBE=1 \
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_relay.test.js
```

The orchestrator independently reran and authenticated:

```text
tests 56
pass 56
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 2475.378461
```

The real retained-channel probe ran; it was not skipped.

### Inherited PTY/Darwin gate

```text
D007C_TEST_TMUX_PATH=/tmp/d007c-final-live-bin.Yia6tD \
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_pty.test.js \
  tests/gateway/process_supervisor_darwin.test.js
```

The orchestrator independently reran and authenticated:

```text
tests 16
pass 16
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 1018.809714
```

These tests ran on Linux/x86_64. They exercise the Darwin seams and static
contracts, not a native Darwin host.

### Exact five repaired RED gates

The five tests whose names begin with `gate RED:` were selected exactly. The
orchestrator independently reran and authenticated:

```text
tests 5
pass 5
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 220.573175
```

### Source, patch, extension, image, and binary identity

```text
tmux 3.6a source archive
b6d8d9c76585db8ef5fa00d4931902fa4b8cbe8166f528f44fc403961a3f3759

tmux-3.6a-agents.1.patch
2526659ccfb17d3cc2a07171687379322e5a2caa79414e86ea4b6682aa98b2b3

cmd-agents-capture.c
4d80a8610651a1dd304b9b0e9b45d6832e115d9827d5166f26b4f9dbcdec27e2

offline Linux image
node@sha256:0625f79a0c9f5005e31dba1761260b9f66ea8a3293e5f645eb4550a4c7dcdbb9

fresh Linux binary, build A and build B
d4fa7abcfee5bd7d8688b8ffc2b489cd5faca56411e033625d6a0ba8b5346d21
```

The two fresh build outputs were:

```text
/tmp/d007c-final-linux-a.NtRAyn/tmux-3.6a-agents.1-linux-amd64
/tmp/d007c-final-linux-b.Xsl6KL/tmux-3.6a-agents.1-linux-amd64
```

They were byte-identical (`cmp` exit 0), had the same SHA-256, and both
reported `tmux 3.6a-agents.1`.

A pristine-source dry run applied the patch at strip level 1 with zero offset
and zero fuzz:

```text
5 files
9 hunks
fuzz 0
```

### Static checks

The following exited zero:

- `node --check` for both changed JS suites;
- Python AST parsing for the changed helper and fixture;
- `sh -n` for both offline builders;
- JSON parsing of the manifest;
- `git diff --check`;
- `git diff --check f84825a`;
- exact source/patch/extension digest checks; and
- the duplicate offline Linux build and byte comparison.

## Verification limits

Native Darwin build and execution are **UNVERIFIED**. The Darwin builder,
manifest contract, shell syntax, architecture branches, and inherited Darwin
seams were checked on Linux/x86_64, but neither `darwin/amd64` nor
`darwin/arm64` was built or executed on a Darwin host.

The repository-wide `bash scripts/ci.sh` gate was **not run**. It remains
required as the host/integration seal before integration. The focused evidence
does not substitute for that gate.

No deployment migration, default shared-server rollout, long-duration residue
measurement, or release qualification was performed.

## Cleanup evidence and boundary

During failed live iterations, the exact private ownership set was enumerated.
Cleanup then:

```text
killed exact stale private processes: 15
unlinked exact stale private socket entries: 9
```

Post-cleanup process inspection found no live process from that owned test set.
No default tmux socket, unrelated server/session, or `ag-*` session/server was
inspected for destruction or altered. Other pre-existing `d007c-*` socket
entries outside the enumerated ownership set were not claimed and were not
removed.

The two deterministic build evidence directories and final custom runtime
remain intentionally as review evidence. This external test cleanup must not
be confused with Decision 4C product cleanup, which deliberately preserves the
accepted relay socket pathname and runtime directory.

## Required adversarial review

At minimum, the independent reviewer should:

1. inspect all 11 technical paths in `ac92d51..d7873eb`, including vendored C,
   both builders, manifest, patch, helper, fixture, and both focused suites;
2. replay or independently challenge every Trial 1 and Trial 2 finding;
3. check generation ordering around readiness, retained reads/writes, relay
   ranges, capture, candidate settlement, `V`, and cleanup;
4. attempt to lose, duplicate, or misclassify the deferred authenticated
   rejection response on fd 5;
5. verify that pane-first/session-second cleanup uses only the retained tmux
   connection;
6. move the owned pane and prove sibling session and shared server
   preservation;
7. replace pathname entries and prove 4C preserves them;
8. break the custom command, version, generation, server/session/pane fields,
   dimensions, history limit, or capture record and require zero accepted
   snapshot state;
9. rebuild from pristine pinned source with fuzz 0 and review Linux/Darwin
   portability and reproducibility;
10. distinguish the ratified authority losses from defects or overstated
    guarantees; and
11. adjudicate the direct-orchestration and commit-subject process deviations.

## Scope and changed-path allowlist

The complete ratification-to-candidate technical range
`ac92d51..d7873eb` is exactly 11 paths:

```text
M gateway/src/adapters/process_supervisor_helper.py             +1558 / -175
A gateway/vendor/tmux-agents/README.md                            +54 /   -0
A gateway/vendor/tmux-agents/UPSTREAM-LICENSE                     +18 /   -0
A gateway/vendor/tmux-agents/build-offline-darwin.sh              +48 /   -0
A gateway/vendor/tmux-agents/build-offline.sh                     +71 /   -0
A gateway/vendor/tmux-agents/cmd-agents-capture.c                +206 /   -0
A gateway/vendor/tmux-agents/manifest.json                        +36 /   -0
A gateway/vendor/tmux-agents/tmux-3.6a-agents.1.patch             +38 /   -0
M tests/gateway/process_supervisor_session_port_fixture.py       +931 /   -6
M tests/gateway/process_supervisor_session_port_pty.test.js       +55 /  -15
M tests/gateway/process_supervisor_session_port_relay.test.js    +614 /  -45
```

Total technical range:

```text
11 paths
3629 insertions
241 deletions
```

The final correction alone, `8f848b3..d7873eb`, is exactly 9 paths:

```text
M gateway/src/adapters/process_supervisor_helper.py              +106 / -24
M gateway/vendor/tmux-agents/README.md                             +28 /  -5
A gateway/vendor/tmux-agents/build-offline-darwin.sh               +48 /  -0
M gateway/vendor/tmux-agents/build-offline.sh                       +8 /  -1
M gateway/vendor/tmux-agents/manifest.json                          +7 /  -2
M gateway/vendor/tmux-agents/tmux-3.6a-agents.1.patch               +9 / -61
M tests/gateway/process_supervisor_session_port_fixture.py        +103 /  -6
M tests/gateway/process_supervisor_session_port_pty.test.js        +55 / -15
M tests/gateway/process_supervisor_session_port_relay.test.js     +190 / -44
```

Total final correction:

```text
9 paths
554 insertions
158 deletions
```

This request commit adds only:

```text
A plan/reviews/PROJECT_V5/D_0_7C-3_to_review.md
```

No result file, review index, plan sheet, project/stage README, policy,
changelog, CI manifest, or product path is changed by the request commit.
The pre-existing untracked `gateway/node_modules` integration symlink remains
unstaged.
