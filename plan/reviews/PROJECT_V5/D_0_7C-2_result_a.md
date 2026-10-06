# Independent Review Result — Project V5 D/0/07c Trial 2, Reviewer A

## Verdict

**reviewed_KO**

The candidate closes Trial 1's production-path P0: the default factory, real
helper, real PTY, authenticated relay, real tmux pane, barrier, capture, and
canonicalizer now return the expected sequence-2 24-byte snapshot. Breaking
capture in a disposable copy changes that result to an empty snapshot, and
breaking PTY-to-relay forwarding does the same. There is no manufactured
fallback on that default path and no residual unconditional
`SESSION_PORT_SNAPSHOT_FAILED` branch for an otherwise valid snapshot.

The candidate also closes the specifically listed post-`ACCEPT` input and
snapshot gaps. A live same-socket CWD change revokes with zero operator bytes,
the other claimed identity cases do likewise, and independent mutations kill
each of the queue-offer, pre-barrier, and post-barrier rereads.

The result is nevertheless KO for two findings. The exact first positive test
required by the sheet is still the Trial 1 manufactured `sessionPortOps`
composition and remains green when the real output-forwarding chain is broken.
More importantly, the unlisted route hunt found that ordinary provider
PTY-to-relay output forwarding performs no accepted-binding reread. After a
real post-`ACCEPT` CWD change on the same socket, it forwarded all 25 provider
bytes and did not revoke.

This verdict is limited to reviewer A's real-helper and post-`ACCEPT` identity
assignment. It makes no integration, promotion, release, `D/0/07d`, or splice
claim.

## Severity table

| Severity | Count | Findings |
|---|---:|---|
| P0 | 1 | The sheet's exact first named positive transaction still injects a manufactured `sessionPortOps` response and remains green when the real forwarding chain is severed. |
| P1 | 1 | Provider-bearing PTY output is forwarded to a post-`ACCEPT` relay whose live CWD changed, without a fresh binding check or revocation. |
| P2 | 0 | None in reviewer A's assigned scope. |

## Reviewed lineage

The reviewed branch was `review/V5-D-0-07c-2a` at:

```text
2dd8bd2f071640ff2bb64ba6336a4d6aa4803891
tree b26278f616b3065ab2fa13cd169cee6de0a4de94
parent aa659bda838acd3afd99637111c005429c6f518e
docs(review): request D_0_7C trial 2 review (V5 D/0/07c Trial 2)
```

The independently checked technical lineage was:

```text
RED   412328fe2fc699c44ca16b3218fc54cda7d00588
tree  275d4b13776861350d8707dad520ca44f3509d73
base  82fd5ff379dde98f3e077e081d5929cad845d066

GREEN aa659bda838acd3afd99637111c005429c6f518e
tree  25bc1c7b49d820e0d045ea3b0899529ae92adc12
parent 412328fe2fc699c44ca16b3218fc54cda7d00588
```

## Findings

### P0-1 — the exact required first positive remains manufactured

The new default-real-helper test is genuine, but the sheet's first named
positive test at
`tests/gateway/process_supervisor_session_port_relay.test.js:365-414` still
uses `createPositiveHarness`. That harness injects `sessionPortOps` at
`:294-329`; its `exchange` method constructs `SNAPSHOT_OK` directly from the
supplied string at `:319-323`.

The string itself comes from the separate synthetic `snapshot-probe`. Its
runner returns preconstructed metadata and capture rows at
`tests/gateway/process_supervisor_session_port_fixture.py:1589-1653`. The
positive test then passes that synthetic result into the manufactured channel
at `process_supervisor_session_port_relay.test.js:393-403`. This is the same
three-piece proof structure that allowed Trial 1 to pass while the real helper
always failed.

I severed only production PTY-to-relay output forwarding in the disposable
copy `/tmp/d7c2a-review.C131j7`:

```text
authenticates the exact relay instance and returns the canonical 24-byte pane snapshot
tests 1, pass 1, fail 0

default real helper returns the rendered 24-byte snapshot through the authenticated relay
tests 1, pass 0, fail 1
actual snapshot "", snapshotBytes 0
```

Thus the new default-path oracle prevents the whole focused gate from becoming
falsely green, but the exact first positive required by `D/0/07c` is still a
fake and does not establish the transaction named by the test.

Required correction: make that exact named positive drive the default
real-helper transaction without supplied `sessionPortOps`, manufactured
`SNAPSHOT_OK`, or pre-baked capture bytes. Synthetic codec/canonicalizer tests
may remain separate and honestly named.

### P1-1 — provider output forwarding is an unbound post-ACCEPT operation

`_forward_pty_to_relay` at
`gateway/src/adapters/process_supervisor_helper.py:3385-3414` reads provider
PTY bytes, normalizes them, and sends `RELAY_DATA_OUTPUT` on the accepted
socket. It receives no authoritative readers and calls neither
`revalidate_accepted_relay_binding` nor the enclosing `verify`.

Both production callers reach it after `ACCEPT` without a preceding binding
reread:

- the ordinary PTY-ready loop at
  `gateway/src/adapters/process_supervisor_helper.py:3690-3699`;
- the pre-snapshot drain at
  `gateway/src/adapters/process_supervisor_helper.py:3760-3770`.

I added one ordinary assertion only to the disposable existing relay
suite/fixture. It created an accepted binding over one retained socket, changed
the live process CWD with `os.chdir`, wrote provider bytes to the PTY-side
pipe, and exercised `_forward_pty_to_relay`. The expected disposition was
terminal-changed, zero forwarded bytes, and revocation. The candidate instead
produced:

```text
changedField: cwd
sameSocket: true
disposition: FORWARDED
forwardedHex: 756e6c69737465642d70726f76696465722d7365637265740a
revoked: false
```

That is the complete 25-byte provider-bearing value
`unlisted-provider-secret\n`. The disposable named test was RED 0/1.

The same live CWD mutation is detected by the input path, so this is not a
reader limitation: it is a missing revalidation call on output forwarding.
It permits provider terminal bytes to reach an identity-changed relay before a
later input or snapshot happens to revoke it.

Required correction: bind provider-output forwarding to fresh peer,
process, tmux, and history evidence before sending bytes to the relay, revoke
on unavailable or changed evidence, and add a mutation-sensitive same-socket
post-`ACCEPT` output case that requires zero forwarded provider bytes.

## P0 real-helper adjudication

### Default call path

The genuine path starts with
`createProcessSupervisorSessionPortFactory({processOps, platform: "linux"})`
and supplies no `sessionPortOps`
(`tests/gateway/process_supervisor_session_port_relay.test.js:417-508`).

The production chain I traced and exercised is:

1. `createProcessSupervisorSessionPortFactory` selects the helper-backed
   sideband when no seam is supplied
   (`gateway/src/adapters/process_supervisor.js:2489-2570`).
2. The launch record carries the exact target and configured runtime, and the
   configured helper is spawned with `shell:false`
   (`process_supervisor.js:2036-2076`).
3. The helper allocates the PTY, gives fd 0/1/2 to the provider, and retains
   direct literal `execve` (`process_supervisor_helper.py:1241-1248`,
   `:1474-1510`, `:3935-3977`).
4. `_open_session_relay` creates the private runtime, launches only the
   configured-runtime relay through direct tmux argv, authenticates it, builds
   `AcceptedRelayBinding`, and revalidates before readiness
   (`process_supervisor_helper.py:3265-3374`).
5. Provider stdout is read from the real PTY, normalized, framed, and sent to
   the accepted relay, whose stdout is the real pane
   (`process_supervisor_helper.py:2740-2812`, `:3385-3414`).
6. Snapshot opcode `0x02` drains readable PTY output, runs the bound barrier
   and fresh identity checks, performs real metadata and `capture-pane`,
   canonicalizes the bytes, and encodes `SNAPSHOT_OK`
   (`process_supervisor_helper.py:3191-3247`, `:3760-3813`).

The source string at fixture line 95 is provider stdout, not a snapshot
constant injected into the port response. It must traverse the PTY, relay,
pane, capture, and canonicalizer before the default test can observe it.

### Break-the-chain evidence

The unmodified named default-path case passed 1/1 with:

```text
{
  sequence: 2,
  snapshot: "fixture-terminal-secret\n",
  snapshotBytes: 24,
  truncated: false
}
```

Two independent disposable breaks proved the result has no fallback:

| Break | Result of default-real-helper named test |
|---|---|
| `capture_tmux_snapshot` returns `CanonicalSnapshot(b"", False)` | RED 0/1; actual sequence 2, empty snapshot, 0 bytes |
| `_forward_pty_to_relay` discards normalized provider output | RED 0/1; actual sequence 2, empty snapshot, 0 bytes |

The first break also syntax-checked. Both mutations were made only under
`/tmp/d7c2a-review.C131j7` and the helper was restored byte-for-byte afterward.

The helper no longer contains Trial 1's unconditional snapshot failure. The
only runtime `0x000c` response in the snapshot branch is the fail-closed
mapping for caught snapshot validation/decoder failures at
`process_supervisor_helper.py:3804-3811`; a valid request reaches
real bound capture and returns `0x82`/`0x83`.

## Post-ACCEPT identity reproductions

### Exact Trial 1 live-CWD case

I added one assertion only to the disposable existing relay suite/fixture. It
froze the actual process identity, retained the same accepted socket, changed
the process CWD with `os.chdir`, and called the candidate's bound input path
with the real process and peer readers. It passed 1/1:

```text
accepted: true
changedField: cwd
sameSocket: true
disposition: SESSION_PORT_TERMINAL_CHANGED
queuedOperatorHex: ""
revoked: true
```

This independently confirms zero queued operator bytes for the exact live
case, rather than only comparing a test-provided dictionary.

### Additional binding cases

The current suite's bound-relay fixture was also run directly. Every listed
case retained the same socket, returned
`SESSION_PORT_TERMINAL_CHANGED`, revoked, and reported
`queuedOperatorHex: ""`:

| Case | Result |
|---|---|
| peer tuple changed | PASS |
| peer evidence unavailable | PASS |
| process evidence unavailable | PASS |
| tmux identity changed | PASS |
| tmux evidence unavailable | PASS |
| history changed to 401 | PASS |
| history evidence unavailable | PASS |
| broker queue rebound to another binding | PASS |
| binding already revoked | PASS |

The already-revoked direct case also reported `readerCalls: []`. Frozen tmux
replacement before the barrier produced zero barrier and capture calls.
Replacement immediately after the barrier produced one barrier call and zero
capture calls. Both revoked with terminal-changed.

## Revalidation mutation results

Each mutation started from the candidate helper in the disposable copy, the
mutant syntax remained valid, and a named test was required to redden:

| Removed or changed point | Named oracle | Red result |
|---|---|---|
| queue-offer `revalidate_accepted_relay_binding` | `revalidates the accepted socket and live relay identity before broker input` | KILLED: changed-CWD case became `ACCEPTED`, queued exact hex `6f70657261746f722d7265766965770d` (16 bytes), and did not revoke |
| revalidation before barrier | `revalidates frozen tmux server session and pane identity before barrier and capture` | KILLED: barrier ran once instead of zero times |
| revalidation after barrier/before capture | same named oracle | KILLED: case became `ACCEPTED`, made four capture-runner calls, and did not revoke |

These failures demonstrate three fresh reads at the three claimed operation
points. The second tmux reader deliberately returns the frozen identity on
its first call and a replacement on its second, so the post-barrier comparison
is not a cached value compared with itself.

## Unlisted route hunted

I examined second snapshots, barrier-time operator input, error/retirement
edges, and ordinary provider-output forwarding. Second snapshots re-enter the
same bound capture function, and barrier-time operator input reaches
`offer_bound_relay_input`, so both use fresh evidence.

Ordinary provider-output forwarding was the uncovered route. The failing
same-socket live-CWD conformance result is P1-1 above: 25 provider bytes were
delivered and the binding remained active. Teardown's best-effort
`RELAY_DATA_CLOSE` also does not revalidate, but I did not count that
provider-free close frame as a second finding.

## Gate outputs

Environment:

```text
Node v22.22.1
Python 3.14.4
tmux 3.6
```

Trial 2 RED replay at `412328f`, targeted to the two assigned corrections:

```text
tests 2
pass 0
fail 2

default real helper: SESSION_PORT_SNAPSHOT_FAILED
identity binding: create_accepted_relay_binding absent
```

Focused candidate gate:

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_relay.test.js

tests 38
pass 38
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 1422.909884
```

Inherited PTY/Darwin gate:

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_pty.test.js \
  tests/gateway/process_supervisor_darwin.test.js

tests 16
pass 16
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 944.795843
```

Targeted candidate reruns:

```text
live same-socket CWD input assertion:       tests 1, pass 1, fail 0
post-ACCEPT binding matrix:                 tests 1, pass 1, fail 0
pre/post-barrier frozen-tmux checks:        tests 1, pass 1, fail 0
unlisted provider-output assertion:         tests 1, pass 0, fail 1
```

Whitespace:

```text
git diff --check
exit 0, no output

git diff --check 82fd5ff..aa659bd
exit 0, no output
```

Before this verdict, `git status --short --branch` showed only the pre-existing
untracked `gateway/node_modules` entry.

## What I did and did not verify

I verified:

- exact candidate/RED/GREEN lineage;
- the default factory with no supplied `sessionPortOps`;
- the real helper, PTY, direct provider, authenticated relay, pane, barrier,
  capture, canonicalizer, response, and exact 24-byte result;
- two independent breaks of the real byte chain and the absence of a fallback;
- the remaining manufactured channel and pre-baked capture on the exact first
  named positive test;
- absence of a residual unconditional real-snapshot failure;
- an actual same-process live CWD change after accepted binding on the same
  socket, with zero operator bytes and revocation;
- changed/unavailable peer, unavailable process, changed/unavailable tmux,
  changed/unavailable history, queue rebinding, and already-revoked cases;
- fresh queue-offer, pre-barrier, and post-barrier rereads through three
  independently killed mutations;
- the unlisted provider-output forwarding route and its exact 25-byte leak;
- the focused relay and inherited PTY/Darwin gates and candidate-range
  whitespace.

I did not independently adjudicate drift, retirement/cleanup, regression
breadth, or changed-path scope; those were explicitly the other reviewer's
assignment. I did not run a Darwin host, full CI, live Codex/Claude provider,
network operation, public adapter splice, `D/0/07d`, integration, promotion,
or release. I changed no repository source, test, plan sheet, policy, or the
other reviewer's result file.
