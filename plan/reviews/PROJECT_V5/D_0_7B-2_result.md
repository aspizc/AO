# Independent Review Result — Project V5 D/0/07b Trial 2

## Verdict

**reviewed_OK**

All three Trial 1 P1 findings are closed. The fresh foreground-group
comparison is now protected by a real-helper mutation test that gates the
terminal write; transport loss is mapped from the recorded complete-dispatch
boundary; and the authoritative terminal identity process calls
`tcgetpgrp` on its retained slave descriptor.

The exact focused host gate passes 16/16, the ordinary supervisor/live
regressions pass 38/38, and the inherited 07a codec regression passes 26/26.
The three independently reproduced closing mutants all turn the relevant
tests red.

This verdict is limited to the three D/0/07b Trial 2 closures. It makes no
integration, promotion, release, D/0/07c, D/0/07d, or splice claim.

## Severity table

| Severity | Count | Findings |
|---|---:|---|
| P0 | 0 | None. |
| P1 | 0 | None. |
| P2 | 0 | None. |

## Reviewed lineage and scope

The reviewed branch was `review/V5-D-0-07b-2` at request commit
`66001e75bd2e7fd0d0505be2119e8ed1b8a2301f`. The submitted lineage and tree
identifiers match the review request:

```text
91083b42e4e95cf0627b7b2bc55895f34ea2ed1c
tree 9002a8a18c2898d0321367958c441e5a8eea318a
parent 7929ed82bb6af83417c079672d38c94e81d111d4

778639675533cbdc7efeec9efdb756ca99e318b9
tree f00e35b41196da21e80a041a38f4a06423ce7d3d
parent 91083b42e4e95cf0627b7b2bc55895f34ea2ed1c
```

The technical delta from Trial 1 changes only:

```text
gateway/src/adapters/process_supervisor.js
gateway/src/adapters/process_supervisor_helper.py
tests/gateway/process_supervisor_session_port_codec.test.js
tests/gateway/process_supervisor_session_port_fixture.py
tests/gateway/process_supervisor_session_port_pty.test.js
```

The request commit adds only
`plan/reviews/PROJECT_V5/D_0_7B-2_to_review.md`. No dependency, manifest,
schema, migration, service, catalog, tmux, or relay path changed. The
pre-existing untracked `gateway/node_modules` symlink remained untouched.

## Per-finding adjudication

### P1-1 — fresh foreground comparison is load-bearing: PASS

The real helper obtains fresh terminal evidence through
`_request_pty_identity`, compares the terminal identity and dimensions, and
then rejects when:

```python
fresh_terminal["foregroundPgid"] != fresh_utility["pgid"]
```

The new Linux host fixture activates the real helper, moves the PTY foreground
group to a different direct provider child, attempts `status`, requires only
`SESSION_PORT_NOT_FOREGROUND`, waits for cleanup, and asserts the child's
recorded PTY input is empty.

In an isolated disposable copy I deleted only the comparison above and ran
the named test on the host:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='real helper rejects a fresh foreground-group change with zero PTY bytes' \
  tests/gateway/process_supervisor_session_port_pty.test.js
```

The mutant was red:

```text
tests 1
pass 0
fail 1
cancelled 0
skipped 0
todo 0
duration_ms 300.960257
error: Missing expected rejection.
```

I then temporarily changed only the disposable test expectation to require
the mutant's successful write and exact foreground-child byte record. That
probe passed 1/1 and observed the exact hexadecimal bytes for `status\r`
(`7374617475730d`). Thus the killed mutant reaches the WRITE and is not merely
a guard on whether a foreground field was read.

### P1-2 — pre-`D` and post-`D` transport loss are distinct: PASS

The production helper channel calls `onDispatched()` only after its complete
request-stream write callback and any required drain. The operation stores
that marker, and `operationTransportFailure` now maps:

- before complete dispatch: exactly
  `SESSION_PORT_TERMINAL_CLOSED` in lifecycle phase;
- after complete dispatch for a write: exactly
  `SESSION_PORT_WRITE_ABORTED` in write phase.

This matches the parent's mutually exclusive table: a not-yet-completely
dispatched request is before `D`, while unattributed helper/control/response
loss in `[D,R)` is write-aborted regardless of whether the modeled terminal
count is zero, partial, or full.

In an isolated disposable copy I bypassed only the dispatch-aware mapper by
replacing `operationTransportFailure(operation)` with
`operationFailure(operation)`. I ran the pre- and post-`D` tests together on
the host:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='request-stream loss before complete dispatch|response loss after complete dispatch' \
  tests/gateway/process_supervisor_session_port_pty.test.js
```

The mutant was red:

```text
tests 5
pass 4
fail 1
cancelled 0
skipped 0
todo 0
duration_ms 123.111114
expected: SESSION_PORT_TERMINAL_CLOSED
actual:   SESSION_PORT_WRITE_ABORTED
```

All three post-`D` zero/partial/full models remained green and returned only
`SESSION_PORT_WRITE_ABORTED`; only the pre-`D` disposition regressed. Both
paths revoke once, reject a later write as revoked, and perform no API retry.

### P1-3 — retained slave fd is the authority source: PASS

The utility establishes the controlling PTY and then forks a private identity
authority in the provider's session before literal provider `execve`. That
process retains the slave fd and private CLOEXEC request/response pipes while
closing fd 0/1/2, the PTY master, lifecycle channels, and provider channels.
Every initial, activation, and fresh-write terminal check requests a new
fixed-size identity record.

Inside the authority process, `_read_pty_identity(retained_slave_fd)` sends
the same retained slave descriptor to `fstat`, `TIOCGWINSZ`, and
`tcgetpgrp`. Production construction passes `pty.slave_fd`; no
`foreground_fd` override remains.

In an isolated disposable copy I changed only the authority fork argument
from `pty.slave_fd` to `pty.master_fd` and ran the named test on the host:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='foreground identity reader calls tcgetpgrp on the retained slave fd never the master' \
  tests/gateway/process_supervisor_session_port_pty.test.js
```

The mutant was red:

```text
tests 1
pass 0
fail 1
cancelled 0
skipped 0
todo 0
duration_ms 144.341961
expected: true
actual:   false
```

The unmodified construction probe records the exact call trace
`fstat:92`, `ioctl:92`, `tcgetpgrp:92`, and the full focused host gate also
exercises the real same-session authority topology.

## Gate evidence

All Node commands below ran on the host. This matters for the real Linux PTY
fixtures, which require real file descriptors; none ran in the filesystem
sandbox.

### Exact focused sheet gate — host

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
duration_ms 759.91178
```

This includes the real 120×40 PTY happy path, exact literal argv/direct
`execve`, exact `status\r` frame, changed-foreground zero-byte rejection,
retained-slave reader, first/retry/short-write checks, dispatch intervals,
post-dispatch cancel proof, and the configured Darwin reader seam.

### Exact supervisor/live regression gate — host

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor.test.js \
  tests/gateway/process_supervisor_live.test.js
```

```text
tests 38
pass 38
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 7098.864355
```

### Inherited 07a codec regression — host

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_codec.test.js
```

```text
tests 26
pass 26
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 774.051418
```

Both `git diff --check` and
`git diff --check 7929ed8..7786396` exited 0 with no output. Post-gate host
scans for `process_supervisor_session_port_fixture.py` and
`process_supervisor_helper.py` both exited 1 with no matches.

## What was and was not verified

Verified: exact lineage and changed-path scope; all three Trial 1 P1 closures;
three independently recreated closing mutants; actual write-through behavior
of the P1-1 mutant; the pre-`D`/post-`D` result distinction; real Linux
helper-owned PTY lifecycle and cleanup; retained-slave authority topology;
120×40 identity; literal argv/direct `execve`; exact `status\r`; provider
bytes absent from captured lifecycle/transcript/stdout/stderr boundaries;
first/retry/short-write checks; inherited issuer/codec/authority behavior;
one-shot and existing supervisor/live regressions; no tmux/relay/dependency or
out-of-scope production change; whitespace; and no leaked fixture/helper
process.

Not verified: execution on a Darwin host (the configured seam ran); real
helper response loss after independently forced zero/partial/full PTY byte
counts (the existing post-`D` cases are scripted interval models); every
ranked physical-event race in the parent; Trial 2's submitted test-only RED
commit as a separate checkout; D/0/07c or D/0/07d behavior; live providers;
integration; promotion; or release. `AGENTS.md` was absent from both the
worktree and `HEAD`, so no repository-local instructions could be read from
that requested path. Per the brief, `bash scripts/ci.sh` was not run.
