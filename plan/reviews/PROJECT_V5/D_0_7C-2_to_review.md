# Review Submission - Project V5 D/0/07c (Trial 2)

## Requested reviewer

Please assign an independent reviewer that did not implement this trial. Review
the candidate against `plan/PROJECT_V5/D/0/07c.md`, the frozen parent contract
`plan/PROJECT_V5/D/0/07.md`, and both Trial 1 verdicts:

- `plan/reviews/PROJECT_V5/D_0_7C-1_result.md`
- `plan/reviews/PROJECT_V5/D_0_7C-1_result_second.md`

This is an evidence submission, not a self-verdict. It makes no integration,
promotion, release, full-host-composition, `D/0/07d`, or public-splice claim.

## Candidate lineage

Trial 1 reviewer verdicts:

```text
631ba62ec6031f4f95624e1022f2b97b51dd5640
review(v5): record D_0_7C trial 1 result

82fd5ff379dde98f3e077e081d5929cad845d066
review(v5): record D_0_7C trial 1 second-reviewer result
```

Trial 2 RED:

```text
412328fe2fc699c44ca16b3218fc54cda7d00588
tree 275d4b13776861350d8707dad520ca44f3509d73
parent 82fd5ff379dde98f3e077e081d5929cad845d066
test(session-port): reproduce relay integration review gaps (V5 D/0/07c Trial 2)
```

Trial 2 GREEN:

```text
aa659bda838acd3afd99637111c005429c6f518e
tree 25bc1c7b49d820e0d045ea3b0899529ae92adc12
parent 412328fe2fc699c44ca16b3218fc54cda7d00588
feat(session-port): wire authenticated relay snapshots (V5 D/0/07c Trial 2)
```

The RED commit changes only the three test paths. The GREEN commit changes only
the two production paths.

## Trial 1 finding closure map

| Source | Finding | Candidate correction | Direct evidence |
|---|---|---|---|
| Second reviewer P0 | The default real-helper path discarded PTY output and manufactured no real snapshot. | The private launch record now carries the safe tmux target plus configured runtime executable/argv. The default helper creates the runtime, launches and authenticates the relay, freezes its binding, forwards normalized PTY output, barriers the relay, captures the real pane, canonicalizes it, and emits the ASP1 snapshot response. | `default real helper returns the rendered 24-byte snapshot through the authenticated relay` uses the real factory/helper/provider and supplies no `sessionPortOps`. It returns exact sequence 2 and `"fixture-terminal-secret\n"` at 24 bytes. |
| First reviewer P1 | Post-`ACCEPT` operations were authenticated-then-unbound. | `AcceptedRelayBinding` carries the exact accepted socket, kernel peer tuple, process PID/start/executable/argv/cwd/pgid/sid, tmux server/session/pane/PID/dimensions, target, and retirement callback. Input revalidates before queue offer. Snapshot revalidates before the barrier and again before capture. Unavailable or mismatched evidence revokes and raises terminal-changed. | Same-socket changed-cwd, changed/unavailable peer, unavailable process, changed/unavailable tmux identity, changed/unavailable history, queue rebinding, and already-revoked cases all return terminal-changed with zero queued bytes. Frozen tmux replacement is rejected both before and after the barrier with zero capture calls. |
| Second reviewer P1 | Width 121 and `history-limit` 401 were accepted. | Capture reads current tmux identity and current configured history limit, then validates exact 120x40/400 before the barrier/capture transaction. Bound capture also compares the whole current identity to the frozen identity. | Real tmux 3.6 cases observe `121\t40` and `401`; each returns `SESSION_PORT_TERMINAL_CHANGED` with `snapshot: null`. |
| First reviewer P2 / second reviewer P1 | Host socket inode leaked and reject cleanup was simulated. | Retirement now closes/revokes the accepted socket, kills the exact pane/session, removes relay socket/key/runtime, retires the port lifecycle, and removes only an exact owned, same-user, serverless tmux socket inode. Wrong path, wrong inode kind, or live server is preserved and rejected. | A real relay authenticates, retains the same socket, undergoes an actual pane-width change, rejects before queueing, and reports all process/target/runtime/socket inventories empty. Both real-helper success and real-helper terminal-change lanes report empty relay and tmux inode inventories. |

## TDD RED evidence

The initial Trial 2 focused RED, before the production correction, had:

```text
tests 33
pass 26
fail 7
skipped 0
duration_ms 942.762492
```

The seven failures were the real-helper snapshot, absent accepted-binding API,
width 121 accepted, history 401 accepted, and two real socket-inode cleanup
failures. The ordinary real-helper failure was:

```text
default real helper returns the rendered 24-byte snapshot through the authenticated relay
SESSION_PORT_SNAPSHOT_FAILED
terminal snapshot failed
```

After all mutation-sensitive guard cases were added to the test-only commit,
the exact committed tests were replayed against untouched production commit
`82fd5ff` in `/tmp/d007c-t2-red-final.ejYIjV`:

```text
tests 38
pass 15
fail 23
skipped 0
duration_ms 1320.374707
```

That replay retained the same `SESSION_PORT_SNAPSHOT_FAILED` default-helper
failure. It additionally showed unsafe relay launch fields accepted and the
accepted-binding, bound-barrier, and owned-socket APIs absent. Every fixture
probe had its own 0700 `TMUX_TMPDIR`; the disposable RED replay could not
address the default host socket or an `ag-*` tmux session.

## Default real-helper end-to-end evidence

The positive conformance case creates the ordinary factory with only:

```js
createProcessSupervisorSessionPortFactory({
  processOps,
  platform: "linux",
});
```

It does not inject `sessionPortOps` or any manufactured snapshot channel. The
configured runtime launches the provider directly through the reviewed helper
path and launches only the relay through tmux. After the real port writes
`status`, the provider emits the pane bytes and the next real snapshot is:

```js
{
  sequence: 2,
  snapshot: "fixture-terminal-secret\n",
  snapshotBytes: 24,
  truncated: false,
}
```

The targeted real-helper command passed:

```text
tests 1
pass 1
fail 0
skipped 0
duration_ms 407.488565
```

The test uses target `d007c-real-helper-<pid>` and a private tmux root inside
its fixture workspace. After cancellation it asserts:

```text
provider/helper children = 1 expected supervisor child
relay runtime inventory   = unchanged/empty
tmux non-directory files  = []
utility identity          = absent
supervisor identity       = absent
```

The companion default-helper rejection case resizes that same isolated real
pane to 121x40, requires `SESSION_PORT_TERMINAL_CHANGED`, waits for utility and
supervisor exit, and again requires empty relay-runtime and tmux-inode
inventories. This is the leaf conformance transaction requested by the
verdicts, not the broader `D/0/07d` composition/race gate.

## Post-ACCEPT identity revalidation evidence

The frozen binding is retained as one object through the queue, barrier, and
capture paths. The deterministic post-`ACCEPT` probe produced:

| Mutation while retaining the accepted socket | Disposition | Queue | Revoked |
|---|---|---:|---:|
| relay `cwd` changed | `SESSION_PORT_TERMINAL_CHANGED` | 0 bytes | yes |
| kernel peer tuple changed | `SESSION_PORT_TERMINAL_CHANGED` | 0 bytes | yes |
| kernel peer evidence unavailable | `SESSION_PORT_TERMINAL_CHANGED` | 0 bytes | yes |
| process evidence unavailable | `SESSION_PORT_TERMINAL_CHANGED` | 0 bytes | yes |
| tmux identity changed | `SESSION_PORT_TERMINAL_CHANGED` | 0 bytes | yes |
| tmux evidence unavailable | `SESSION_PORT_TERMINAL_CHANGED` | 0 bytes | yes |
| history changed to 401 | `SESSION_PORT_TERMINAL_CHANGED` | 0 bytes | yes |
| history evidence unavailable | `SESSION_PORT_TERMINAL_CHANGED` | 0 bytes | yes |
| broker queue rebound to another binding | `SESSION_PORT_TERMINAL_CHANGED` | 0 bytes | yes |
| binding already revoked | `SESSION_PORT_TERMINAL_CHANGED` | 0 bytes | yes |

The changed-cwd case records `sameSocket: true`. Direct revalidation of an
already revoked binding records zero peer/process/tmux/history reader calls.

The two frozen-tmux replacement timings produced:

| Replacement timing | Barrier calls | Capture calls | Disposition | Revoked |
|---|---:|---:|---|---:|
| before barrier | 0 | 0 | `SESSION_PORT_TERMINAL_CHANGED` | yes |
| after barrier, immediately before capture | 1 | 0 | `SESSION_PORT_TERMINAL_CHANGED` | yes |

The real host mutation independently authenticated the relay, kept the same
socket, changed actual `paneWidth` to 121, then attempted broker input:

```json
{
  "accepted": true,
  "sameSocket": true,
  "changedField": "paneWidth",
  "observedPaneWidth": 121,
  "disposition": "SESSION_PORT_TERMINAL_CHANGED",
  "brokerQueueHex": "",
  "revoked": true
}
```

## Leak-free retirement evidence

The authenticated real reject transaction reported:

```json
{
  "keyRemoved": true,
  "paneRemoved": true,
  "relayExited": true,
  "relaySocketRemoved": true,
  "runtimeRemoved": true
}
```

Its final inventory was:

```json
{
  "ownedSocketAbsent": true,
  "processes": [],
  "runtimeDirectories": [],
  "targets": []
}
```

The exact owned-socket guard probe also demonstrated:

- wrong socket name/path: rejected and inode preserved;
- regular-file substitution: rejected and file preserved;
- live Unix server: rejected and socket preserved;
- exact same-user serverless socket: removed.

The evidence root `/tmp/d007c-t2-evidence.PK2QWr/tmux` contained no regular
file or socket after the real probes. The host evidence probes never issue
`tmux ls` on a default socket and use only unique `d007c-*` socket names and
targets. Inherited tests whose fixture IDs begin with `ag-*` are pinned to
fresh private `TMUX_TMPDIR` roots and cannot address any host `ag-*` session.

## Surviving-mutant proof

The Trial 2 mutation harness copied the two production files and focused
fixture/suite into fresh disposable directory
`/tmp/d007c-t2-mutants-xI2IFT`. For every mutation it first required the
unmodified targeted test to pass, removed exactly one guard or required
wiring check, syntax-checked the mutant, and required the targeted test to
fail. The result file is `/tmp/d007c-t2-mutants.tsv`.

Final result: **22/22 killed, 0 survivors**. This covers every
`D007C_T2_GUARD` plus the modified inherited broker-queue guard.

| Guard | Targeted oracle | Result |
|---|---|---|
| `default_launch_record` | default real-helper 24-byte snapshot | **KILLED** |
| `relay_launch_fields` | safe configured-runtime launch fields | **KILLED** |
| `relay_launch_disabled_fields` | safe configured-runtime launch fields | **KILLED** |
| `bound_active` | post-`ACCEPT` identity and revoked-binding matrix | **KILLED** |
| `bound_peer` | post-`ACCEPT` identity matrix | **KILLED** |
| `bound_process` | post-`ACCEPT` changed-cwd matrix | **KILLED** |
| `bound_tmux` | post-`ACCEPT` tmux matrix | **KILLED** |
| `bound_history` | post-`ACCEPT` history matrix | **KILLED** |
| `bound_queue_offer` | rebound broker queue remains empty | **KILLED** |
| `barrier_token` | wrong relay flush token rejects and revokes | **KILLED** |
| `owned_socket_path` | exact owned-socket guard probe | **KILLED** |
| `owned_socket_identity` | exact owned-socket guard probe | **KILLED** |
| `owned_socket_serverless` | exact owned-socket guard probe | **KILLED** |
| `capture_preflight` | real width 121 and history 401 | **KILLED** |
| `bound_before_barrier` | tmux replacement before barrier | **KILLED** |
| `bound_before_capture` | tmux replacement after barrier | **KILLED** |
| `default_relay_bound` | binding revalidation before ready | **KILLED** |
| `default_output_forward` | default real-helper 24-byte snapshot | **KILLED** |
| `default_owned_socket_cleanup` | default real-helper cleanup inventory | **KILLED** |
| `default_snapshot_response` | default real-helper 24-byte response | **KILLED** |
| `default_relay_retire` | default real-helper cleanup inventory | **KILLED** |
| modified `operator_queue_accept` | rebound broker queue remains empty | **KILLED** |

The first mutation pass exposed one genuine survivor:
`bound_active`. The downstream queue guard masked its removal. The RED suite
was strengthened to require zero authoritative-reader calls when a binding is
already revoked; the complete campaign was rerun and then killed 22/22.

## Real-host tmux 3.6 evidence

The real capture proof used tmux `3.6`, configured runtime
`/usr/bin/python3.14`, private root
`/tmp/d007c-t2-evidence.PK2QWr/tmux`, and unique socket:

```text
d007c-1420192-1785188713548430954
```

It created only `d007c-host-1420192-0` through
`d007c-host-1420192-3`. Every capture used:

```json
["capture-pane","-p","-N","-T","-t","<d007c-host target>","-S","-400"]
```

| Host case | Raw capture | Canonical result |
|---|---:|---:|
| untouched | 40 bytes | 0 bytes |
| exact three rows | 61 bytes | 24 bytes |
| two emitted row-end spaces | 50 bytes | 12 bytes |
| ANSI rendering | 43 bytes | 4 bytes |

Exact canonical values remained:

```text
untouched = ""
exact     = "ready\nstatus\nack:status\n"
spaces    = "edge  \nnext\n"
ANSI      = "ABC\n"
```

The authenticated drift/cleanup proof used separate unique socket:

```text
d007c-bound-1447703-1785189426204713595
```

It reported tmux `3.6`, width 121 and history 401 both terminal-changed with
no snapshot, and `ownedSocketAbsent: true`.

## Exact gates

### Focused sheet gate

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_relay.test.js
```

```text
tests 38
pass 38
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 1638.549315
```

### Inherited PTY/Darwin gate

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
duration_ms 954.681407
```

### Syntax and whitespace

- Python compilation of the changed helper and fixture exited `0`.
- `node --check` for the changed JS adapter and both changed JS suites exited
  `0`.
- `git diff --check 82fd5ff..aa659bd` exited `0` with no output.
- The required mutation campaign passed 22/22 with no survivor.

No `scripts/ci.sh` or other full CI gate was run.

## Scope and changed-path allowlist

Technical candidate from `82fd5ff` through `aa659bd`:

```text
M gateway/src/adapters/process_supervisor.js                       +6 /  -1
M gateway/src/adapters/process_supervisor_helper.py              +737 / -25
M tests/gateway/process_supervisor_session_port_fixture.py      +1085 /  -2
M tests/gateway/process_supervisor_session_port_pty.test.js        +10 /  -2
M tests/gateway/process_supervisor_session_port_relay.test.js     +443 / -12
```

This request adds only:

```text
A plan/reviews/PROJECT_V5/D_0_7C-2_to_review.md
```

The implementation preserves the Trial 1 capability/codec and public
observation identity, does not weaken `07b` PTY writes, keeps provider launch
on direct helper `execve`, and adds no adapter/service/catalog splice. Source
and direct-argv assertions found no shell, `send-keys`, `capture-pane -e`, or
`-J`. The production helper remains Python-standard-library only.

The pre-existing untracked `gateway/node_modules` integration symlink remains
unstaged. No `policies/`, changelog, CI gate, project/stage README, frozen
`D/0/07.md`, or `D/0/07c.md` path changed.
