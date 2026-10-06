# Review Submission - Project V5 D/0/07b (Trial 2)

## Requested reviewer

Please assign an independent reviewer that did not implement this trial. Review
only the three P1 corrections below against
`plan/reviews/PROJECT_V5/D_0_7B-1_result.md`,
`plan/PROJECT_V5/D/0/07b.md`, and the shared
`plan/PROJECT_V5/D/0/07.md` contract. This request makes no self-verdict,
integration, promotion, release, `07c`, `07d`, or splice claim.

## Candidate lineage

Trial 1 independent KO:

```text
7929ed82bb6af83417c079672d38c94e81d111d4
review(v5): record D_0_7B trial 1 result
```

Trial 2 RED extension:

```text
91083b42e4e95cf0627b7b2bc55895f34ea2ed1c
tree 9002a8a18c2898d0321367958c441e5a8eea318a
parent 7929ed82bb6af83417c079672d38c94e81d111d4
test(process-supervisor): guard three PTY review findings (V5 D/0/07b Trial 2)
```

Trial 2 GREEN:

```text
778639675533cbdc7efeec9efdb756ca99e318b9
tree f00e35b41196da21e80a041a38f4a06423ce7d3d
parent 91083b42e4e95cf0627b7b2bc55895f34ea2ed1c
fix(process-supervisor): close three PTY review findings (V5 D/0/07b Trial 2)
```

## Trial 2 RED

At the test-only RED commit, the exact focused host gate had two ordinary
failures: the retained-slave construction probe could not call the missing
dependency seam, and the pre-`D` loss test received
`SESSION_PORT_WRITE_ABORTED` instead of `SESSION_PORT_TERMINAL_CLOSED`.

```text
tests 16
pass 14
fail 2
cancelled 0
skipped 0
todo 0
duration_ms 832.889341
```

P1-1 is a surviving-mutant coverage finding rather than missing runtime
behavior. Its new real-helper test passed on the unmutated Trial 1 code, then
failed 0/1 with `Missing expected rejection` when only the production
foreground comparison was deleted.

## Per-finding closure map

### P1-1 - the foreground check is load-bearing

The new host test is named:

> `real helper rejects a fresh foreground-group change with zero PTY bytes`

It activates the real helper first, then instructs the direct provider fixture
to create a different process group and make that group the PTY foreground
group. The foreground process records every byte readable from fd 0 and drains
again on `SIGHUP`/`SIGTERM`. The operation returns only
`SESSION_PORT_NOT_FOREGROUND`, cleanup completes, and the final byte record is
empty.

Mutation proof on the final topology: delete only
`fresh_terminal["foregroundPgid"] != fresh_utility["pgid"]` from the helper's
fresh pre-write equation.

```text
tests 1
pass 0
fail 1
error: Missing expected rejection.
duration_ms 314.860053
```

The mutant writes and returns success, so the named test is now directly
load-bearing on the reviewed comparison rather than on a scripted
`not_foreground` callback.

### P1-2 - pre-`D` and post-`D` transport loss are distinct

`performSessionPortOperation` now maps an exchange exception through the
operation's recorded complete-dispatch marker. Before `operation.dispatched`,
transport loss returns exactly `SESSION_PORT_TERMINAL_CLOSED` in lifecycle
phase. At or after that marker, a write still returns exactly
`SESSION_PORT_WRITE_ABORTED` in write phase. Both paths revoke once and never
retry.

The named orderings are:

- `request-stream loss before complete dispatch returns terminal closed once`
- `response loss after complete dispatch is write aborted once for zero partial or full writes`

The inherited fake sideband now explicitly marks its already-complete in-memory
dispatch, so the 07a codec tests model the same boundary instead of depending
on an implicit transport assumption.

Mutation proof: bypass the dispatch-aware mapper and restore the unconditional
`operationFailure(operation)` call.

```text
tests 5
pass 4
fail 1
expected: SESSION_PORT_TERMINAL_CLOSED
actual: SESSION_PORT_WRITE_ABORTED
duration_ms 136.288301
```

All existing post-`D` zero-, two-, and seven-byte response-loss models remain
green and return only `SESSION_PORT_WRITE_ABORTED`; only the pre-`D` ordering
turns red.

### P1-3 - `tcgetpgrp` uses the retained slave fd

The reaper cannot call `tcgetpgrp` on the slave from its different session on
Linux. The corrected topology therefore forks one private authority process
after the utility has acquired its controlling PTY and before the literal
provider `execve`. That process remains in the provider's session, retains the
slave fd, closes fd 0/1/2 and every lifecycle/provider channel, and returns
only a fixed-size integer identity record over private CLOEXEC pipes.

Every activation and fresh write check requests a new record. Inside the
authority process, `fstat`, `TIOCGWINSZ`, and `tcgetpgrp` all receive the same
`retained_slave_fd`; there is no foreground-fd override and the PTY master is
used only for terminal I/O.

The construction-time probe requires this exact call trace:

```text
fstat:92
ioctl:92
tcgetpgrp:92
```

Mutation proof: change only the authority fork argument from `pty.slave_fd` to
`pty.master_fd`.

```text
tests 1
pass 0
fail 1
expected: true
actual: false
duration_ms 179.394504
```

The structural topology guard turns red before a master-based foreground
source can be accepted.

## Preserved Trial 1 behavior

- The real helper still allocates the 120x40 controlling PTY and the provider
  remains `pid === pgid === sid === foregroundPgid` on the positive path.
- Literal argv still reaches direct
  `os.execve(launch["argv"][0], launch["argv"], launch["env"])` unchanged.
- The successful frame remains exactly `status\r`; provider bytes remain off
  lifecycle JSON, transcript, helper stdout, and helper stderr.
- The inherited 07a issuer, codec, receiver authority, strict prompt rules,
  FIFO sequencing, revocation, and one-shot stream behavior remain intact.
- Utility, PTY authority, reaper, helper, and Node sideband descriptors are
  retired by the existing cleanup path. No helper or fixture process remains
  after the host gate.
- No tmux operation, relay/socket, snapshot implementation, dependency,
  manifest, schema, migration, service/catalog splice, or public surface was
  added.

## Verification

### Exact focused gate - HOST

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
duration_ms 759.440742
```

### Required supervisor regressions

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
duration_ms 7352.197554
```

### Inherited 07a codec regression

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
duration_ms 872.925504
```

### Whitespace and leak checks

Both `git diff --check 7929ed8..7786396` and `git diff --check` exited `0`
with no output.

Both process scans exited `1` with no matches:

```text
pgrep -af process_supervisor_session_port_fixture.py
pgrep -af process_supervisor_helper.py
```

The full `bash scripts/ci.sh` was intentionally not run, as required by the
Trial 2 brief.

## Changed-path allowlist

Technical Trial 2 candidate from `7929ed8` through `7786396`:

```text
M gateway/src/adapters/process_supervisor.js                    +11 /  -1
M gateway/src/adapters/process_supervisor_helper.py             +199 / -25
M tests/gateway/process_supervisor_session_port_codec.test.js     +3 /  -1
M tests/gateway/process_supervisor_session_port_fixture.py       +109 /  -0
M tests/gateway/process_supervisor_session_port_pty.test.js      +131 /  -1
```

This review request is the only additional path. The pre-existing untracked
`gateway/node_modules` integration symlink remains unstaged. No unrelated user
change was staged or committed.

## Commits

- `91083b42e4e95cf0627b7b2bc55895f34ea2ed1c` -
  `test(process-supervisor): guard three PTY review findings (V5 D/0/07b Trial 2)`
- `778639675533cbdc7efeec9efdb756ca99e318b9` -
  `fix(process-supervisor): close three PTY review findings (V5 D/0/07b Trial 2)`

## Stop condition

Independent review should adjudicate only the three Trial 1 P1 findings for
`D/0/07b`. No self-review or downstream authorization is asserted.
