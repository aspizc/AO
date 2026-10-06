# Independent Review Result — Project V5 D/0/07c Trial 1

## Verdict

**reviewed_KO**

The required RED is reproduced, the focused GREEN gate passes 27/27 with no
skip, the inherited PTY/Darwin gate passes 16/16 with no skip, and a fresh
isolated tmux 3.6 run reproduces the exact 40/61/50 raw-byte captures and
0/24/12 canonical results.

The result is nevertheless KO. The accepted relay is reduced to one boolean
after `ACCEPT`; subsequent input decoding and snapshot capture do not carry or
revalidate the frozen kernel/process/tmux identity. In an independent
real-Unix-socket conformance case, the accepted relay changed cwd before its
next input frame. The implementation observed the changed live identity but
still accepted frame type `0x02`, kept `revoke === false`, and queued the exact
operator bytes. That is the authenticated-then-unbound class the brief
required this review to exclude.

The isolated host fixture also leaves its uniquely owned tmux socket inode
after `kill-server`. The server and targets are gone, and I removed only my
three exact serverless socket paths, but the submitted gate does not itself
prove an empty before/after socket inventory.

This verdict is limited to D/0/07c Trial 1. It makes no integration,
promotion, release, D/0/07d, or splice claim.

## Severity table

| Severity | Count | Findings |
|---|---:|---|
| P0 | 0 | None. |
| P1 | 1 | Post-`ACCEPT` relay operations are not bound to the frozen live relay/tmux identity, so input from an identity that changed after acceptance reaches the broker queue. |
| P2 | 1 | The real-host fixture kills its private tmux server but leaves that server's socket inode and does not assert its removal. |

## Reviewed lineage

The reviewed branch was `review/V5-D-0-07c-1` at request commit:

```text
ef1dc761e889abd54f49427e35c2f2b7d3999c2c
tree 9c44db3cd94a7b49712e5e00977d4088284f9b7b
parent 481ecb088514f1f5dfc8a652e3fca28f6f5a4f81
```

The independently checked RED/GREEN lineage is:

```text
89a8bc6ca2661e8d69e8714b64feeeb2d9949fa5
tree b5bc6b8dc505c1bc33cc377a44c0da2f1d97ffb2
parent 2fa0d030d06898d2862abd541181f90e94ab27a2

481ecb088514f1f5dfc8a652e3fca28f6f5a4f81
tree 9b5bd8a51843f320acafc845d679bb55650c9f26
parent 89a8bc6ca2661e8d69e8714b64feeeb2d9949fa5
```

## Blocking findings

### P1-1 — An identity change after acceptance does not revoke before input

`authenticate_relay_socket` reads the relay process identity once before
acceptance
(`gateway/src/adapters/process_supervisor_helper.py:2351-2368`) and then sends
`ACCEPT` (`:2370-2373`). After that point:

- `RelayBrokerInputQueue.bind` stores only `result.accepted`; `offer` checks
  only that boolean (`:2008-2024`);
- `receive_relay_data_frame` accepts only a socket and validates framing, not
  the frozen peer/process/tmux identity (`:2502-2519`);
- the relay loop polls fd 0 after acceptance without a new binding check
  (`:2553-2594`);
- `capture_tmux_snapshot` accepts only a target, barrier, and runner; it does
  not receive or compare the frozen server/session/pane/relay identity
  (`:2835-2859`).

The submitted changed-identity test does not reach this interval. Its fixture
injects a changed `live_identity` into `validate_relay_candidate` before
acceptance
(`tests/gateway/process_supervisor_session_port_fixture.py:465-506`,
`:557-573`).

I ran five independent plain assertions over real Unix sockets and real Linux
`SO_PEERCRED`. Each child held the relay key. The assertions used the
candidate helper and the existing fixture's ASR1 frame/proof construction.

| Conformance case | Observed disposition | Queued operator bytes |
|---|---|---:|
| Same user, different kernel peer PID | reject `0x0004`, `SESSION_PORT_UNAUTHORIZED`, revoke | 0 |
| Exact peer PID, wrong proof | reject `0x0006`, `SESSION_PORT_UNAUTHORIZED`, revoke | 0 |
| Replayed challenge | reject `0x0007`, `SESSION_PORT_UNAUTHORIZED`, revoke | 0 |
| Duplicate connection state | reject `0x0007`, `SESSION_PORT_UNAUTHORIZED`, revoke | 0 |
| Accepted relay changes cwd before next input | still accepted; frame type `0x02`; `liveChanged === true`; `revoke === false` | 16 |

The exact incorrectly queued bytes were:

```text
6f70657261746f722d7265766965770d
operator-review\r
```

All five child processes exited 0 and all five private socket/key/runtime
directories were removed. The failing case was not a teardown artifact: the
candidate returned the input frame normally, and the queue accepted it.

Required correction:

1. Make post-handshake relay operations carry the exact accepted socket,
   kernel peer tuple, pane PID/start/executable/argv/cwd/pgid/sid, and tmux
   server/session/pane identity.
2. Immediately before an input frame can enter the broker queue, and before
   each barrier/capture can apply to an operation, re-read the authoritative
   live relay and tmux identities. Unavailable evidence must hard-reject.
3. On any mismatch, return the parent-defined terminal-change disposition,
   close/revoke the relay, tear down the owned socket/key/runtime/pane/port,
   and prove that zero bytes from that frame entered the queue.
4. Add a post-`ACCEPT` mutation-sensitive case that changes at least one live
   identity field while retaining the same socket, then requires revocation
   and an empty broker queue. Add the corresponding frozen tmux
   server/session/pane replacement case before capture.

This mechanism belongs to 07c. D/0/07d may wire a reviewed bound relay, but
its sheet explicitly may not introduce a new identity or handshake rule.

### P2-1 — The host fixture leaves its private tmux socket inode

The host fixture's `finally` block runs only:

```python
_tmux_run(socket_name, ["kill-server"], check=False)
```

at
`tests/gateway/process_supervisor_session_port_fixture.py:1500-1501`.

After the successful direct host probe, exact socket
`d007c-594930-1785179401308986637` had no server or target process, but
`/tmp/tmux-1000/d007c-594930-1785179401308986637` still existed as a mode
`0660` socket inode. The exact focused gate likewise left
`d007c-656834-1785180797308155960`. I confirmed each reported `no server
running`, then unlinked only those exact review-owned paths. A prior failed
review-owned host attempt similarly left
`d007c-591644-1785179372164360456`; it was also confirmed serverless and
removed. All three exact paths are now absent.

Required correction: make the isolated host fixture remove and assert absence
of only its own exact socket path after killing its server, and assert an empty
exact target/process/socket/key/runtime inventory. It must never inspect or
alter the default tmux server or any `ag-*` session.

## Nine acceptance criteria

| # | Result | Independent adjudication |
|---:|---|---|
| 1 | PASS | In an isolated archive of RED `89a8bc6`, the exact first positive test failed 0/1 because `derive_relay_key` did not exist. On this candidate the full focused gate passes 27/27. |
| 2 | **KO** | Linux and deterministic Darwin peer sources, nonce derivation, frames, comparison, timeout disposition, and pre-accept rejects conform. The frozen live identity is not carried into later relay operations, and the post-accept changed-cwd case remains accepted (P1-1). |
| 3 | **KO** | The real positive relay proves fd 0 is not readable before `ACCEPT`, and all four independently rejected cases queue zero bytes. A changed identity after acceptance should be a reject/revoke path, but 16 bytes instead entered the queue (P1-1). |
| 4 | PASS | The real-socket wrong-kernel-PID case returned reject `0x0004`; the right-PID/wrong-proof case returned `0x0006`. Both revoked with zero queued operator bytes. |
| 5 | PASS | Provider launch remains literal direct helper `execve`. The 07c helper/JS path contains no shell or `send-keys`; tmux command construction uses argument arrays and launches only the configured-runtime relay as the pane command. |
| 6 | PASS for byte contract | The barrier/metadata/capture order, exact capture argv, 120×40 and 400-line checks, canonical row selection, padding exclusion, final LF, zero/24-byte results, cap, scalar-boundary truncation, and real row-end spaces match the parent. The separate source-binding failure is P1-1. |
| 7 | PASS | Split UTF-8 normalization and invalid-sequence replacement pass; real tmux renders ANSI to `ABC\n` with no escape byte; metadata/capture/UTF-8/NUL/resize failures return no partial snapshot. |
| 8 | PASS | The positive result preserves `sessionId === tmuxTarget === "ag-red-port-codex-coder"` and literal `tmux attach -t ag-red-port-codex-coder`. No attach method, public endpoint, or execution path was added. |
| 9 | **KO** | Post-accept relay identity change does not revoke (P1-1). The host fixture also requires manual removal of its serverless owned tmux socket inode (P2-1). No process, target, relay socket/key, or runtime directory from my checks remains. |

## Reproduced host tmux evidence

The direct host probe used:

```text
tmux 3.6
Node v22.22.1
/usr/bin/python3.14
Python 3.14.4
socket d007c-594930-1785179401308986637
targets d007c-host-594930-0 through d007c-host-594930-3
```

It did not query or modify the default tmux server and created no `ag-*`
target. Each capture used:

```json
["capture-pane","-p","-N","-T","-t","<d007c-host-594930 target>","-S","-400"]
```

| Case | Metadata | Raw capture | Canonical result |
|---|---|---:|---:|
| Untouched | `0\t40\t0\n` | 40 bytes | 0 bytes, `""` |
| Exact three rows | `0\t40\t3\n` | 61 bytes | 24 bytes, `"ready\nstatus\nack:status\n"` |
| Two rendered row-end spaces | `0\t40\t2\n` | 50 bytes | 12 bytes, `"edge  \nnext\n"` |
| ANSI rendering | `0\t40\t1\n` | 43 bytes | 4 bytes, `"ABC\n"` |

For the row-end-space case, the real pane PID and live kernel-identity PID
were both `594961`, ASR1 authentication returned accepted, and the barrier
completed before capture.

The host operation first failed inside the filesystem/network sandbox with
`Operation not permitted`; that was a hard nonzero failure, not a skip. I
reran the same isolated host path with the required local Unix/tmux
permission. A subsequent relative-helper-path invocation also failed hard
with a relay accept timeout; the corrected absolute configured helper path
produced the figures above. No failure was counted as coverage.

## Mutation reruns

I copied only the candidate helper/JS adapter and focused test/fixture into a
fresh disposable directory per mutation. For each guard, the unmodified
targeted test passed, the single guard was disabled, Python syntax remained
valid, and the targeted test failed.

| Guard disabled | Baseline | Mutant | Targeted test |
|---|---|---|---|
| `relay_peer_pid` | PASS | KILLED | `rejects same-user relay with the wrong kernel peer pid` |
| `relay_live_identity` | PASS | KILLED | `rejects relay whose live pane identity changed` |
| `relay_replay` | PASS | KILLED | `rejects replayed relay proof` |
| `relay_duplicate` | PASS | KILLED | `rejects a duplicate relay connection` |
| `proof_digest` | PASS | KILLED | `rejects relay with the wrong nonce proof` |
| `capture_final_lf` | PASS | KILLED | `rejects capture metadata or physical-row-count drift instead of guessing` |
| `visible_emitted_extent` | PASS | KILLED | `preserves blank history and nonempty content below the cursor` |
| `snapshot_cap` | PASS | KILLED | `caps snapshots and truncates only the oldest prefix` |

Result: **8/8 independently selected mutants killed; 0 survivors**. I did not
rerun all 53 mutations claimed by the handoff. P1-1 is a missing post-accept
guard/operation boundary rather than a survivor among these eight existing
guards.

## Scope ruling

The technical candidate from `2fa0d03` through `481ecb0` changes only:

```text
gateway/src/adapters/process_supervisor.js
gateway/src/adapters/process_supervisor_helper.py
tests/gateway/process_supervisor_session_port_fixture.py
tests/gateway/process_supervisor_session_port_relay.test.js
```

The request commit adds only
`plan/reviews/PROJECT_V5/D_0_7C-1_to_review.md`.

The five-line `process_supervisor.js` edit at `:1298-1302` is a minimal,
authorized private response-decoder seam: a nonempty snapshot must end in LF,
and no snapshot may contain NUL. It changes no exported factory, capability,
codec, service, catalog, or public result shape.

The helper additions are within the 07c relay/tmux/canonicalization footprint.
Their absence from the default live `_run_session_port` composition is not
itself a 07c finding: D/0/07d explicitly owns default factory/lifecycle
wiring. P1-1 is different—the operation-binding mechanism that 07d is allowed
to wire does not exist and cannot be invented by 07d without reopening 07c.

No provider launch was moved into tmux. `_direct_execve` still calls:

```python
os.execve(launch["argv"][0], launch["argv"], launch["env"])
```

The new tmux pane command is the configured runtime plus the literal relay
argv. There is no shell fallback, `send-keys`, `capture-pane -e`, `-J`,
resize API, arbitrary history API, raw ANSI return, adapter/service/catalog
splice, public attach endpoint, dependency, manifest, lockfile, schema, or
migration change. The pre-existing `send-keys` builder in
`gateway/src/adapters/tmux_client.js` is unchanged and is not called by this
candidate's port path.

## Gate outputs

### Required RED

At isolated RED `89a8bc6`, targeted to the frozen first test:

```text
tests 1
pass 0
fail 1
cancelled 0
skipped 0
todo 0
error: AttributeError: module 'process_supervisor_helper'
       has no attribute 'derive_relay_key'
```

### Exact focused gate

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_relay.test.js
```

```text
tests 27
pass 27
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 471.725411
```

### Exact inherited PTY/Darwin gate

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_pty.test.js \
  tests/gateway/process_supervisor_darwin.test.js
```

```text
tests 16
pass 16
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 861.316915
```

Both `git diff --check` and
`git diff --check 2fa0d03..ef1dc76` exited 0 with no output.

## What was and was not verified

Verified: exact candidate lineage and changed-path scope; the required
test-only RED; full focused GREEN gate; inherited PTY/Darwin gate; no skips;
real Linux `SO_PEERCRED` positive authentication; independent real-socket
wrong-PID, wrong-proof, replay, duplicate, and post-accept identity-change
cases; zero queue bytes in every conforming reject; eight independently
recreated mutation kills; real isolated tmux 3.6 capture and barrier;
40/61/50 raw-byte and 0/24/12 canonical oracles; ANSI rendering; exact capture
argv; direct provider `execve`; direct tmux relay argv; no port-path shell or
`send-keys`; inert public observation; candidate-range whitespace; and exact
review-owned process/runtime/socket cleanup after manual removal of the
serverless tmux inodes.

Not verified: execution on a Darwin host (the deterministic Darwin seam ran);
all 53 handoff mutations; the D/0/07d default composition and real-host race
matrix; every parent write/cancel/settlement race; live Codex or Claude
providers; network behavior; full `bash scripts/ci.sh` (forbidden by the
brief); integration; promotion; or release.

No candidate source, test, plan sheet, policy, or review index was changed.
The pre-existing untracked `gateway/node_modules` entry was left untouched.
