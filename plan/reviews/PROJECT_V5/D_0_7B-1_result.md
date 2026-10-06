# Independent Review Result — Project V5 D/0/07b Trial 1

## Verdict

**reviewed_KO**

The sealed candidate reproduces the required RED and its ordinary GREEN gate
passes. The real Linux helper owns a 120x40 PTY, launches the literal argv by
direct `execve`, writes the exact `status\r` frame, keeps provider bytes off the
captured lifecycle boundaries, and cleans up the utility and helper.

The result is nevertheless KO. The gate does not protect the complete
foreground equation: deleting the real helper's fresh foreground-group
comparison leaves the exact host gate green at 13/13. The implementation also
records the complete request-dispatch boundary but never uses it when mapping
transport loss, collapsing the parent's distinct pre-`D` and post-`D`
dispositions. Finally, the authoritative foreground read is taken from the PTY
master even though the binding contract requires `tcgetpgrp(retainedSlaveFd)`.

This verdict is limited to D/0/07b Trial 1. It makes no integration, promotion,
release, D/0/07c, D/0/07d, or splice claim.

## Severity table

| Severity | Count | Findings |
|---|---:|---|
| P0 | 0 | None. |
| P1 | 3 | The complete pre-write foreground equation has a surviving mutant; pre-/post-dispatch loss intervals are collapsed; the foreground reader does not use the contractually required retained slave fd. |
| P2 | 0 | None. |

## Blocking findings

### P1-1 — Removing the real foreground check does not turn the gate red

The load-bearing helper check is at
`gateway/src/adapters/process_supervisor_helper.py:1898-1903`. In an isolated
copy of GREEN `68e3a68`, I removed only:

```python
or fresh_terminal["foregroundPgid"] != fresh_utility["pgid"]
```

I then ran the exact focused command on the host. It still passed:

```text
tests 13
pass 13
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 589.495358
```

The test named `verified writes recheck the complete authority before first
retry and short writes` does not exercise the real helper equation. Its
`foreground` case injects the string `not_foreground` through a scripted
`verify()` callback
(`tests/gateway/process_supervisor_session_port_fixture.py:118-149`).
The real-helper happy path only observes the already-correct foreground group.
Consequently, the suite remains green when the production foreground
comparison is absent and an unauthorized group would be allowed to receive
prompt bytes.

For comparison, a broader isolated mutant that skipped the generic recheck
after the first positive write did turn the focused test red, 0/1. The suite
therefore protects the callback loop, but not the required complete authority
equation implemented inside that callback.

Required correction: add a mutation-sensitive real-helper or faithful
construction-time fixture that changes the terminal foreground group before a
write/retry, proves zero PTY bytes, and returns only
`SESSION_PORT_NOT_FOREGROUND`. Removing the actual comparison above must make
that test fail.

### P1-2 — A loss before complete request dispatch is always reported as post-`D` abort

`createHelperSessionPortChannel.exchange` calls `onDispatched()` only after the
request stream write callback and drain complete
(`gateway/src/adapters/process_supervisor.js:1424-1444`). The operation stores
that fact in `operation.dispatched`
(`gateway/src/adapters/process_supervisor.js:1753-1759`), but no result path
reads it. Every exchange exception is mapped unconditionally through
`operationFailure`, so every write becomes
`SESSION_PORT_WRITE_ABORTED`
(`gateway/src/adapters/process_supervisor.js:1764-1776`).

That contradicts the binding parent: an incomplete/not-yet-dispatched request
whose channel closes before `D` has zero terminal access and maps to
`SESSION_PORT_TERMINAL_CLOSED`; only a completely dispatched write that loses
its authenticated response maps to `SESSION_PORT_WRITE_ABORTED`. The unused
marker also means the implementation has no executable distinction for this
required interval.

The submitted response-loss test does not cover the boundary. Its
`acceptedBytes` values `0`, `2`, and `7` are labels only; each branch executes
the same injected exchange rejection without dispatching a real request or
forcing the stated PTY byte count
(`tests/gateway/process_supervisor_session_port_pty.test.js:537-575`).

Required correction: settle from the actual complete-dispatch marker, add
pre-`D` request-stream failure coverage with the exact terminal-closed result,
and retain post-`D` zero/partial/full response-loss coverage with the one exact
write-aborted result and no retry.

### P1-3 — Foreground evidence is read from the master, not the retained slave

The parent authoritative-reader table and D/0/07b acceptance contract require:

```text
tcgetpgrp(retainedSlaveFd)
```

The helper instead calls:

```python
_read_pty_identity(
    pty.slave_fd,
    foreground_fd=pty.master_fd,
)
```

at initial spawn validation, activation, and every fresh write check
(`gateway/src/adapters/process_supervisor_helper.py:1544-1549`,
`:1807-1810`, and `:1889-1892`). `_read_pty_identity` fstats and reads winsize
from the slave but explicitly sends `tcgetpgrp` to the supplied master
(`:1209-1234`).

The review request explains that Linux returns `ENOTTY` when this reaper reads
the slave from another session. That explains the implementation choice but
does not amend the reviewed, binding plan. Equivalence of the paired master is
not the frozen authoritative source, and the code does not independently bind
the foreground-read fd's identity to the retained slave evidence.

Required correction: either implement the reviewed retained-slave authority
source through a topology that can read it, or obtain an independently
reviewed plan correction before resubmitting. The reviewer cannot silently
replace an exact normative source.

## Per-criterion adjudication

| Criterion | Result | Independent adjudication |
|---|---|---|
| Positive RED after reviewed 07a | PASS | At RED `4e6cc20`, the exact focused host command produced 13 tests: 3 pass, 10 fail. The named real-helper transaction failed with `PROCESS_INVALID_REQUEST`, matching the submission. |
| Real helper PTY topology and literal exec | PASS | GREEN host evidence proves `pid === pgid === sid === foregroundPgid`, 120x40, identical fd 0/1/2 terminal identity, exact argv including the literal `$(touch /tmp/never)`, and direct `execve` with no shell. |
| Linux/Darwin identity and foreground authority | KO | Linux exact argv/executable/cwd and PTY evidence run successfully. Darwin libproc/sysctl implementations are real rather than stubs and the configured seam passes, but no Darwin host was available. The foreground source differs from the binding retained-slave rule (P1-3). |
| Fresh complete check before first/retry/short write | KO | The generic `check -> write` loop is covered and a skipped-recheck mutant is killed, but deletion of the production foreground comparison survives the exact 13/13 gate (P1-1). |
| Zero-byte pre-write exact errors | PARTIAL | Scripted identity, foreground, terminal, close, cancel, and zero-byte kernel-close cases return the claimed ids with zero accepted bytes. The actual helper foreground rejection is not mutation-sensitive or exercised under a changed foreground group. |
| Partial/full write without authenticated success | PARTIAL | Static control flow maps response loss to write-aborted and avoids API retry; however, the submitted `0/2/7` test does not force those PTY counts, and the pre-`D` loss case is incorrectly folded into the same result (P1-2). |
| Cancel/loss/close ordering and single settlement | KO | Authenticated post-dispatch cancellation and later-WRITE_OK cases pass, but the complete `D` marker is unused and the binding pre-/post-dispatch loss intervals are not preserved (P1-2). |
| Prompt bounds, Unicode, CR, FIFO, revocation, stale authority | PASS | The inherited codec suite passes 26/26 with no skips. |
| Provider-byte boundary and scope | PASS | The real fixture's prompt and `fixture-terminal-secret` are absent from captured transcript/stdout/stderr. No tmux, relay, dependency, manifest, service/catalog splice, or public surface change landed. |
| One-shot/supervisor regression and cleanup | PASS | Supervisor/live regressions pass 38/38. The host fixture awaited utility and supervisor disappearance; the post-gate process scan found no fixture/helper process. |

## Reproduced evidence

### RED — isolated tree, host

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_pty.test.js \
  tests/gateway/process_supervisor_darwin.test.js
```

At `4e6cc20ee1ee73a63de9ba2e1d34720c334e0923`:

```text
tests 13
pass 3
fail 10
cancelled 0
skipped 0
todo 0
duration_ms 448.168886
```

### GREEN focused gate — sealed candidate, host

At technical GREEN `68e3a68716d79f2184a896ebf69deb1ddb8cf648`:

```text
tests 13
pass 13
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 555.429107
```

### Required supervisor regressions — review worktree

```text
tests 38
pass 38
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 7092.727412
```

### Inherited 07a codec regression — review worktree

```text
tests 26
pass 26
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 938.333146
```

`git diff --check` exited 0 with no output. The exact helper/fixture process
scan exited 1 with no matches. The review worktree began with only the declared
untracked `gateway/node_modules` symlink; no candidate file was changed.

## What was and was not verified

Verified: frozen lineage and path scope; RED and GREEN focused commands;
Linux real-helper PTY lifecycle; literal argv; exact successful prompt bytes;
helper/utility cleanup; scripted write-error ids; inherited codec behavior;
ordinary supervisor/live regressions; whitespace; process leaks; static
Darwin reader implementation; no-shell/no-tmux/non-scope; and two isolated
mutation probes.

Not verified: execution on a Darwin host; a real changed-foreground rejection;
real helper response loss after controlled zero/partial/full PTY writes; every
ranked physical-event race from the parent table; tmux/relay/snapshot behavior
owned by 07c; the 07d composition; live providers; integration; promotion; or
release. Per the brief, `bash scripts/ci.sh` was not run.
