# Second Independent Review Result — Project V5 D/0/07c Trial 1

## Verdict

**reviewed_KO**

The isolated canonicalization functions match the frozen byte algorithm on the
ordinary oracles and on additional boundary inputs, and the real tmux 3.6 host
case independently reproduces 40 raw bytes to 0 canonical bytes, 61 to 24, and
50 to 12.

The candidate does not, however, connect those functions to the real
session-port helper. The default helper still discards PTY output and returns
`SESSION_PORT_SNAPSHOT_FAILED` for every snapshot request. The focused positive
test stays green by combining separate helper probes with a fake
`sessionPortOps` channel that manufactures the 24-byte response. A real-helper
ordinary conformance test therefore remains RED. This fails the leaf objective
and acceptance criteria 1, 3, 6, 7, and 9.

Two additional real-tmux conformance cases show that the isolated capture path
accepts a 121x40 pane and a changed `history-limit` of 401 instead of returning
`SESSION_PORT_TERMINAL_CHANGED`. The host lane also leaves its tmux socket inode
behind after the fixture returns.

This verdict is result-only and limited to the canonicalization, lifecycle,
cleanup, and scope lens. It makes no integration, promotion, release, `D/0/07d`,
or splice claim.

## Severity table

| Severity | Count | Findings |
|---|---:|---|
| P0 | 1 | The relay, broker, tmux, normalizer, barrier, and canonicalizer are unreachable from the default real-helper session-port path; a real snapshot still fails. |
| P1 | 2 | The capture path does not revalidate outer pane width or configured history limit; the lifecycle tests use simulated retirement and the host lane leaks its tmux socket inode. |
| P2 | 0 | None. |

## Reviewed lineage and independence

The reviewed branch was `review/V5-D-0-07c-1b` at request commit:

```text
ef1dc761e889abd54f49427e35c2f2b7d3999c2c
tree 9c44db3cd94a7b49712e5e00977d4088284f9b7b
parent 481ecb088514f1f5dfc8a652e3fca28f6f5a4f81
```

The submitted lineage matches the request:

```text
RED   89a8bc6ca2661e8d69e8714b64feeeb2d9949fa5
tree  b5bc6b8dc505c1bc33cc377a44c0da2f1d97ffb2
base  2fa0d030d06898d2862abd541181f90e94ab27a2

GREEN 481ecb088514f1f5dfc8a652e3fca28f6f5a4f81
tree  9b5bd8a51843f320acafc845d679bb55650c9f26
parent 89a8bc6ca2661e8d69e8714b64feeeb2d9949fa5
```

The RED commit changes only the focused test and fixture. The GREEN commit
changes only the two production supervisor files. I did not implement this
candidate, use a sub-agent, or rely on the other reviewer's verdict.

## Findings

### P0-1 — the real helper never launches or uses the relay/snapshot path

The candidate adds definitions for `create_relay_runtime`,
`launch_tmux_relay`, `authenticate_relay_socket`,
`TerminalUtf8Normalizer`, `capture_tmux_snapshot`, and the canonicalizer, but
the production call graph does not call them. Their non-definition call sites
are in the focused fixture.

The default helper remains the reviewed `07b` path:

- `_drain_pty_once` at
  `gateway/src/adapters/process_supervisor_helper.py:2925-2932` reads PTY
  output and discards the payload.
- `_run_session_port` at
  `gateway/src/adapters/process_supervisor_helper.py:3109-3116` maps every
  decoded snapshot opcode directly to
  `ERROR(0x000c, snapshot)` and terminates the session.
- No production caller creates a relay runtime, launches tmux, authenticates a
  relay, forwards normalized PTY output, waits for a relay barrier, or captures
  a pane.

The focused test does not expose this. At
`tests/gateway/process_supervisor_session_port_relay.test.js:245-280`,
`createPositiveHarness` injects a fake `sessionPortOps` channel whose
`exchange` method constructs `SNAPSHOT_OK` from a supplied string. The named
positive test at `:316-352` separately runs `relay-auth-probe`,
`snapshot-probe`, and that fake channel. Those three results do not form one
default helper transaction.

I drove an ordinary real-helper conformance test from the existing PTY fixture:
start a persistent execution through the default factory, write `status`,
wait for the provider's exact 24-byte `fixture-terminal-secret\n` output, and
request the next snapshot. The required snapshot was:

```js
{
  sequence: 2,
  snapshot: "fixture-terminal-secret\n",
  snapshotBytes: 24,
  truncated: false,
}
```

The candidate was RED:

```text
not ok 1 - D/0/07c default helper path returns the rendered current pane
code: SESSION_PORT_SNAPSHOT_FAILED
error: terminal snapshot failed
tests 1
pass 0
fail 1
skipped 0
```

The temporary execution and provider were retired after the failure; no
process or fixture workspace from this check survived.

This is not work owned by `D/0/07d`. The parent assigns relay authentication,
tmux observation, barrier, and canonical snapshots to `07c`; `07d` may compose
the reviewed values but may not implement or redefine them.

### P1-1 — capture accepts pane-width and history-limit drift

The frozen invariant is outer pane 120x40 with `history-limit` exactly 400,
rechecked before capture. The candidate validates 120x40 only when parsing the
initial relay identity. It passes the constant `TMUX_HISTORY_LINES` into
`validate_tmux_dimensions` rather than reading the configured tmux option.

At snapshot time, `TMUX_METADATA_FORMAT` is only:

```text
#{history_size}\t#{pane_height}\t#{cursor_y}
```

`capture_tmux_snapshot` at
`gateway/src/adapters/process_supervisor_helper.py:2835-2863` runs only that
metadata command and the fixed capture command. It has no current pane-width,
pane identity, or configured history-limit check.

Two ordinary conformance cases used an isolated tmux 3.6 socket and the
existing fixture runner:

| Drift before capture | Required | Candidate result |
|---|---|---|
| outer pane changed to 121x40 | `SESSION_PORT_TERMINAL_CHANGED`, no payload | accepted `"after-resize\n"` at 13 bytes |
| `history-limit` changed to 401 | `SESSION_PORT_TERMINAL_CHANGED`, no payload | accepted `"after-resize\n"` at 13 bytes |

Both named checks were RED:

```text
not ok 1 - D/0/07c rejects a snapshot immediately after outer-pane resize
actual: {accepted:true, dimensions:"121\t40",
         snapshot:"after-resize\n", snapshotBytes:13, truncated:false}

not ok 1 - D/0/07c rejects a snapshot after history-limit drift
actual: {accepted:true, historyLimit:"401",
         snapshot:"after-resize\n", snapshotBytes:13, truncated:false}
```

The disposable conformance fixture removed its unique tmux socket after each
case.

### P1-2 — reject cleanup is simulated, and the host gate leaks a socket

The named reject tests do positively assert
`queuedOperatorHex === ""`; this is better than asserting only the public
rejection. They also expect `cleanup === ["retired"]` and `tornDown === true`.

That evidence is not a real lifecycle transaction. At
`tests/gateway/process_supervisor_session_port_fixture.py:465-516`, each reject
case creates four ordinary files named `relay.sock`, `relay.key`, `pane`, and
`port`. The caller-supplied `on_reject` callback unlinks those files. There is
no Unix listener, relay process, key-consuming child, tmux pane/session, live
broker queue, or port retirement in those reject cases. Because P0-1 leaves no
production relay owner, there is no actual rejection path that tears all of
those resources down.

The positive real-host lane does retire its relay process, relay runtime
directory, relay socket, key file, and tmux targets. It nevertheless ends with
only:

```python
_tmux_run(socket_name, ["kill-server"], check=False)
```

at `tests/gateway/process_supervisor_session_port_fixture.py:1500-1501`. It
does not remove the tmux socket inode.

A before/after set comparison across the full focused run and my separate host
oracle found:

- no new relay/helper/provider process;
- no new key file, relay runtime directory, reject-retirement directory, or
  live tmux target;
- two new surviving socket inodes, one per host probe:

```text
socket 0660 /tmp/tmux-1000/d007c-980978-1785182286557310263
socket 0660 /tmp/tmux-1000/d007c-984697-1785182350725993177
```

Both paths were absent from the before set and present after their fixtures
returned. I removed only those two exact review-created stale sockets after
recording them. Pre-existing `/tmp/d007c-*` artifacts from other sessions were
left untouched and excluded from the set difference.

## Canonicalization adjudication

### Frozen capture vector and ordinary algorithm

The helper function returns exactly:

```json
["capture-pane","-p","-N","-T","-t","<tmuxTarget>","-S","-400"]
```

The real host path actually passes that vector to tmux; it is not merely
compared with a test constant. The isolated canonicalizer correctly:

- requires strict metadata and capture row counts;
- retains every captured history row, including blank rows;
- computes visible `emitted_extent` and excludes only unused empty padding;
- preserves completed blank rows and nonempty rows below a moved cursor;
- preserves emitted spaces and tabs inside each row;
- appends one final LF to every retained row and returns zero bytes when no row
  is retained;
- rejects NUL, invalid capture UTF-8, missing LF, metadata/capture failure, and
  row-count drift without a partial result;
- applies the 65,536-byte cap by removing only the oldest prefix and advancing
  to a Unicode scalar boundary.

The five-line `process_supervisor.js` edit correctly rejects a nonempty helper
snapshot without final LF and any snapshot containing NUL. The isolated ANSI
host case yields `ABC\n` with no escape byte, and the isolated streaming
normalizer reassembles a split euro sign and replaces the following invalid
byte. These isolated results do not close P0-1 because the default broker never
uses the normalizer or relay.

### Independently reproduced real-tmux figures

I used tmux `3.6`, Node `v22.22.1`, Python `3.14.4`, and the unique socket:

```text
d007c-984697-1785182350725993177
```

It created only targets `d007c-host-984697-0` through
`d007c-host-984697-3`; no default socket and no `ag-*` target was used. The
row-end-space target used the configured Python relay, authenticated the live
pane process, and observed `livePid === panePid === 984716`.

| Host case | Raw capture | Canonical result | Disposition |
|---|---:|---:|---|
| untouched pane | 40 bytes | `""`, 0 bytes | PASS |
| `ready`, `status`, `ack:status` | 61 bytes | `"ready\nstatus\nack:status\n"`, 24 bytes | PASS |
| exact rows `edge  ` and `next` | 50 bytes | `"edge  \nnext\n"`, 12 bytes | PASS |
| ANSI-rendered `A`, red `B`, `C` | 43 bytes | `"ABC\n"`, 4 bytes | PASS |

### Additional inputs absent from the submitted suite

All checks were ordinary canonicalization conformance cases added only to a
disposable copy of the existing relay fixture:

| Input | Expected and observed disposition |
|---|---|
| visible pane containing only the emitted row ` \t  ` with cursor at row 0 | PASS — preserved exactly as `" \t  \n"`, 5 bytes |
| exact 65,536-byte result ending in a three-byte euro scalar and LF | PASS — 65,536 bytes, `truncated:false`, scalar intact |
| four-byte emoji intersected by the oldest-prefix cut | PASS — scalar wholly excluded, exact marker plus 65,490 `B` bytes and LF, 65,534 bytes, valid UTF-8, `truncated:true` |
| metadata history size 401 with the frozen 400 captured history rows, all blank | PASS — retained 400 LF bytes, applying `h = min(history_size, 400)` |
| only visible row 39 nonempty | PASS — retained 39 blank rows plus `Z\n`, 41 bytes |
| snapshot immediately after real outer resize to 121x40 | **FAIL** — candidate returned a 13-byte snapshot instead of terminal-changed |
| snapshot after real `history-limit` drift to 401 | **FAIL** — candidate returned a 13-byte snapshot instead of terminal-changed |

## Lifecycle, cleanup, identity, and scope adjudication

### Lifecycle and cleanup

- The synthetic reject table positively asserts zero bytes in its
  `RelayBrokerInputQueue` for unavailable peer evidence, uid/gid mismatch,
  wrong PID, live identity change, malformed proof, wrong proof, timeout,
  replay, and duplicate connection.
- It does not prove zero bytes in the real broker queue, because no real broker
  queue is connected to those rejects.
- The positive host relay verifies that stdin is unreadable on the relay socket
  before `ACCEPT`, then forwards the expected operator bytes after acceptance.
  Detailed handshake binding remains the other reviewer's assignment.
- Real relay runtime/key/process and tmux target cleanup passed, but the tmux
  control socket leak fails the full no-leak condition.
- The real default-path RED test retired its helper/provider and temporary
  workspace after the snapshot failure.

### No shell, no `send-keys`, and direct execution

PASS within the code that exists:

- no `send-keys` occurs in either production supervisor file;
- no `capture-pane -e` or `-J` occurs;
- the real host fixture invokes tmux with argument arrays and uses the exact
  capture vector;
- provider launch remains literal
  `os.execve(launch["argv"][0], launch["argv"], launch["env"])`;
- tmux is given only the configured-runtime relay in the host relay case.

The absence of a production tmux call path is the P0 underimplementation, not
evidence that the full direct-argv relay path is complete.

### Public identity remains inert

PASS:

```text
sessionId === tmuxTarget
attachCommand === "tmux attach -t <tmuxTarget>"
```

`process_supervisor.js:1702-1706` constructs that exact frozen observation.
It matches `agent_service.js:380-390` and `tools/session.js:5-17`. No attach
operation is executed or added.

### Scope

The changed-path allowlist is exact:

```text
M gateway/src/adapters/process_supervisor.js
M gateway/src/adapters/process_supervisor_helper.py
M tests/gateway/process_supervisor_session_port_fixture.py
A tests/gateway/process_supervisor_session_port_relay.test.js
A plan/reviews/PROJECT_V5/D_0_7C-1_to_review.md
```

There is no capability/API/codec shape change from `07a`, weakening of `07b`
writes, service/catalog/public-adapter splice, public attach endpoint,
dependency/manifest change, provider launch through tmux, resize/history API,
raw ANSI return, `-e`, `-J`, shell, or `send-keys`.

The five-line `process_supervisor.js` edit is in scope: it is bounded private
snapshot-response validation for final LF and NUL.

The candidate did not start the full `07d` real-host composition/race gate.
Its defect is the opposite boundary error: it leaves the core relay/snapshot
composition already assigned to `07c` for a downstream leaf.

## Mutation reruns

I copied only the two production files and the focused relay test/fixture to
`/tmp/review-d007c1b-mutants`. Before mutation, the three relevant named tests
passed 3/3. I then restored production from the candidate before each mutation.

| Mutated guard | Named test | Red evidence | Result |
|---|---|---|---|
| `visible_emitted_extent` | `preserves blank history and nonempty content below the cursor` | expected 20 bytes, mutant returned 13 and omitted `\nbelow\n` | KILLED |
| `snapshot_cap` | `caps snapshots and truncates only the oldest prefix` | expected 65,536 bytes, mutant returned 65,537 | KILLED |
| `truncation_scalar_boundary` | `caps snapshots and truncates only the oldest prefix` | fixture raised `UnicodeDecodeError` at continuation byte `0x82` | KILLED |
| `capture_final_lf` | `rejects capture metadata or physical-row-count drift instead of guessing` | `missingFinalLf` changed from `true` to `false` | KILLED |

These four handoff mutations are genuinely guarded. They do not address the
unreachable default path or the resize/history revalidation gaps.

## Gate evidence

### RED reproduction

Against `89a8bc6`, the required named test remained RED exactly as claimed:

```text
tests 1
pass 0
fail 1
skipped 0
AttributeError: module 'process_supervisor_helper'
has no attribute 'derive_relay_key'
```

### Focused relay gate

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
duration_ms 491.437965
```

### Inherited PTY and Darwin gate

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
duration_ms 841.866824
```

### Independent host oracle

```text
tests 1
pass 1
fail 0
skipped 0
```

This is the source of the independent 40/61/50 raw and 0/24/12 canonical byte
figures above.

### Additional ordinary conformance gates

```text
additional canonical inputs:
tests 1, pass 1, fail 0, skipped 0

default real-helper snapshot:
tests 1, pass 0, fail 1, skipped 0
SESSION_PORT_SNAPSHOT_FAILED

outer resize:
tests 1, pass 0, fail 1, skipped 0
accepted 121x40 snapshot

history-limit drift:
tests 1, pass 0, fail 1, skipped 0
accepted history-limit 401 snapshot
```

Both `git diff --check` and
`git diff --check 2fa0d03..ef1dc76` exited 0 with no output.

## What I did and did not verify

I verified:

- the frozen parent canonicalization algorithm line by line against the helper;
- the actual host capture argv and the independent tmux 3.6 byte figures;
- unused-padding exclusion, blank/history rows, below-cursor content,
  row-end whitespace, LF, zero bytes, cap, and oldest-prefix truncation;
- additional whitespace, multibyte boundary, history-clamp, last-row, resize,
  and history-limit inputs through the existing relay suite/fixture;
- ANSI/UTF-8 and no-partial-result seams, while distinguishing them from the
  unreachable default path;
- positive zero-operator-byte assertions and the limits of the simulated
  reject cleanup;
- process/socket/key/runtime/tmux-target before/after set differences;
- no shell, no `send-keys`, direct provider `execve`, public identity, changed
  paths, and the five-line JS scope;
- four canonicalization-weighted mutation claims;
- the exact RED, focused relay, inherited PTY/Darwin, host, and whitespace
  gates.

I did not independently adjudicate the detailed ASR1 handshake binding,
kernel-peer proof construction, or constant-time comparison; that is the other
reviewer's assigned lens. I observed only the handshake facts needed to drive
the canonicalization host case: authentication succeeded and the live PID
equaled the pane PID.

I did not run a live provider, network operation, public adapter splice,
`D/0/07d` composition/race gate, full CI, integration, promotion, or release.
I wrote no repository source, test, plan sheet, or other reviewer's verdict.
