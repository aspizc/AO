# Review Submission - Project V5 D/0/07b (Trial 1)

## Requested reviewer

Please assign an independent reviewer that did not implement this trial. Review
the frozen commits below against `plan/PROJECT_V5/D/0/07b.md` and the shared
`plan/PROJECT_V5/D/0/07.md` contract. This request makes no self-verdict,
integration, promotion, release, `07c`, `07d`, or splice claim.

## Candidate lineage

Integrated and reviewed-OK `D/0/07a` baseline:

```text
0649c457439b692ff6504ef85fba41459e39c6db
docs(v5): mark D/0/07a reviewed-OK/integrated; 07b unblocked
```

RED:

```text
4e6cc20ee1ee73a63de9ba2e1d34720c334e0923
tree 5cf589e28f8844aae05893d86c3f6bf741028ae4
parent 0649c457439b692ff6504ef85fba41459e39c6db
test(process-supervisor): specify PTY identity writes (V5 D/0/07b)
```

GREEN:

```text
68e3a68716d79f2184a896ebf69deb1ddb8cf648
tree d9c97bf0610a0dfdcafc90fc43b2bba3bb60a36f
parent 4e6cc20ee1ee73a63de9ba2e1d34720c334e0923
feat(process-supervisor): verify PTY session writes (V5 D/0/07b)
```

## Positive RED after integrated 07a

The test-only RED commit was run before either production file changed:

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_pty.test.js \
  tests/gateway/process_supervisor_darwin.test.js
```

The required named transaction failed at the missing real-helper boundary:

```text
not ok 4 - authorized session port writes one carriage-return frame to the exact foreground PTY
error: process supervision request is invalid
code: PROCESS_INVALID_REQUEST
```

`createProcessSupervisorSessionPortFactory` still required the 07a injected
`sessionPortOps` fake, so no helper fd, PTY, identity check, or terminal write
could occur. Independent RED guards also failed because 07a had no
`verified_pty_write`, Darwin session identity reader, literal-exec probe, or
post-dispatch control hooks.

Complete RED summary:

```text
tests 13
pass 3
fail 10
cancelled 0
skipped 0
todo 0
duration_ms 366.511687
```

## What was done

- Connected the reviewed 07a `ASP1` seam to private inherited fd 4/5 pipes
  only when the real session-port factory is used. The ordinary supervisor and
  injected 07a test seam retain their existing four-stream topology.
- Added helper/reaper-owned PTY allocation, exact 120x40 setup, raw byte
  transport, controlling-terminal acquisition, and fd 0/1/2 duplication.
  The literal provider remains the direct
  `os.execve(launch["argv"][0], launch["argv"], launch["env"])` target.
- Added exact Linux `/proc` and Darwin libproc/sysctl readers for PID/start,
  PGID/SID, executable, NUL-delimited argv, and cwd. The retained slave
  supplies device/inode/rdev and winsize evidence; `tcgetpgrp` uses the paired
  broker-owned PTY master because Linux returns `ENOTTY` when the reaper,
  which is intentionally in another session, issues `TIOCGPGRP` on the slave.
  Both endpoints name the same kernel PTY and the result is compared to the
  fresh provider PGID.
- Added helper, lease, terminal-nonce, terminal, process, session-leader, and
  foreground checks before the first kernel write, after `EINTR`, after
  `EAGAIN`, after every positive short write, and once after the final positive
  write before a response is fixed.
- Added the verified-write disposition machine: zero-byte precheck failures
  keep their exact error; any failure after a positive write is
  `SESSION_PORT_WRITE_ABORTED`; no prompt is retried as a new operation.
- Added parent dispatch-start/complete markers and pending-cancel state.
  Before dispatch, cancel can settle locally with zero request bytes. After
  dispatch, only authenticated helper `CANCELLED` proves zero PTY bytes;
  response/helper loss is `WRITE_ABORTED`; a validated `WRITE_OK` can still
  win at `R`.
- Added provider-free helper readiness metadata and a fake presentation sink
  that drains and discards terminal output. No tmux, relay, snapshot
  canonicalizer, adapter/service splice, dependency, or public surface was
  added.

## Acceptance-criterion closure

| Criterion | Closure and evidence |
|---|---|
| Named real-helper transaction | Host test claims the real default factory, receives `{sequence:1,acceptedBytes:6}`, and the provider records exact `status\r`. |
| PTY lifecycle and literal exec | The provider records `pid === pgid === sid === tcgetpgrp(0)`, exact 120x40 dimensions, and identical `st_dev/st_ino/st_rdev` for fd 0/1/2. Actual host argv is `[configuredPython, fixture, "--literal", "$(touch /tmp/never)"]`; the direct-exec construction probe separately requires the sheet's exact `["/fixture/session-port-agent","--literal","$(touch /tmp/never)"]` vector. |
| Linux and Darwin live identity | The host path validates exact Linux executable, NUL argv, cwd, start token, PGID/SID, PTY identity/dimensions, helper generations, lease/tag, and foreground. The configured Darwin probe requires `PROC_PIDTBSDINFO`, `proc_pidpath`, `KERN_PROCARGS2`, and `PROC_PIDVNODEPATHINFO` with the exact NUL vector. |
| Fresh checks before all writes | Scripted write traces require `check -> write` for the first attempt and another `check` before every `EINTR`, `EAGAIN`, and short-write retry. Removing a check changes the trace. |
| Zero-byte pre-write rejects | Identity, foreground, terminal binding, known close, explicit cancel, and zero-byte kernel-close cases assert zero accepted bytes and exact numeric error ids `0x0007`, `0x0008`, `0x0009`, `0x000a`, `0x0005`, and `0x000a`. |
| Partial/full uncertainty | Zero-, two-, and seven-byte terminal-write models followed by response loss all return only `SESSION_PORT_WRITE_ABORTED`, perform one exchange, revoke, and reject the next call without retry. A process/helper loss before `F` follows the same no-response path. |
| Cancel/loss settlement | An authenticated in-sequence cancel proof after `D` returns only `SESSION_PORT_CANCELLED`; losing that proof returns only `WRITE_ABORTED`; an already valid `WRITE_OK` wins once and later operations are revoked. |
| Prompt/FIFO/stale behavior | The unchanged 07a codec suite passes all 26 strict Unicode, CR, bounds, FIFO, sequence, tag, receiver, malformed-frame, error-shape, and stale-capability cases. |
| Revocation and cleanup | PTY and utility are retired before the helper terminal event; the Node channel is retired before ordinary completion settlement. The host test awaits both utility and supervisor identity disappearance. A post-gate process scan found no helper or fixture process. |
| Provider-byte isolation | The host fixture emits `fixture-terminal-secret` on the PTY and receives `status\r`; captured lifecycle transcript, helper stdout, and helper stderr contain neither. Prompt bytes exist only in fd 4, helper operation memory, and the PTY. Readiness contains only fixed metadata/digests/identities. |
| Existing behavior and non-scope | Exact supervisor/live gate passes 38/38. No tmux operation, relay/socket, snapshot implementation, service/catalog/adapter splice, dependency, manifest, lockfile, schema, migration, or policy path changed. |

## Verification

### Required focused gate — HOST

The real PTY/fd fixture was run outside the Codex sandbox:

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_pty.test.js \
  tests/gateway/process_supervisor_darwin.test.js
```

```text
tests 13
pass 13
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 526.151322
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
duration_ms 6934.488023
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
duration_ms 759.880525
```

### Whitespace and leak checks

```text
git diff --check
```

Result: exit `0`, no output.

```text
ps -ef | rg 'process_supervisor_session_port_fixture|process_supervisor_helper.py' | rg -v 'rg '
```

Result: exit `1`, no matches. The host test also awaited the exact utility and
supervisor identities becoming unreadable; because the PTY descriptors are
owned only by those processes and their retired Node sideband, no PTY owner
remained.

The full `bash scripts/ci.sh` was intentionally not run, as required by the
leaf brief.

## Changed-path allowlist

Technical candidate from `0649c45` through `68e3a68`:

```text
M gateway/src/adapters/process_supervisor.js                  +457 / -15
M gateway/src/adapters/process_supervisor_helper.py           +876 / -11
M tests/gateway/process_supervisor_darwin.test.js               +43 /  -0
A tests/gateway/process_supervisor_session_port_fixture.py     +245 /  -0
A tests/gateway/process_supervisor_session_port_pty.test.js    +620 /  -0
```

This review request is the only additional path. The pre-existing untracked
`gateway/node_modules` integration symlink remains unstaged. No unrelated
user change was staged or committed.

## Commit

- `4e6cc20ee1ee73a63de9ba2e1d34720c334e0923` -
  `test(process-supervisor): specify PTY identity writes (V5 D/0/07b)`
- `68e3a68716d79f2184a896ebf69deb1ddb8cf648` -
  `feat(process-supervisor): verify PTY session writes (V5 D/0/07b)`

## Stop condition

Independent review should adjudicate only `D/0/07b`. No self-review or
downstream authorization is asserted.
