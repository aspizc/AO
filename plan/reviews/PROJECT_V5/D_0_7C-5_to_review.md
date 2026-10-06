# Review Submission — Project V5 D/0/07c (Trial 5)

## Requested reviewer

Assign a fresh independent reviewer that did not implement this correction.
Review the Trial 5 technical commit and the status-reopen commit against
[`plan/PROJECT_V5/D/0/07c.md`](../../PROJECT_V5/D/0/07c.md), the frozen
Decision 4C ownership rules in
[`plan/PROJECT_V5/D/0/07.md`](../../PROJECT_V5/D/0/07.md), and the prior Trial
4 evidence.

This submission is evidence, not a self-verdict. Trial 5 is **pending**. The
reviewer-owned result path is `D_0_7C-5_result.md`; it does not exist in this
submission.

## Why Trial 5 reopened the sheet

Trial 4 remains independently reviewed OK at `5739ea1` and integrated at
`10f5b03`. A later CI process-containment run authenticated a narrower
real-process retirement defect:

- Gateway assertions were 1476 pass, 0 fail, and 9 skip, but the command
  outcome was `process_tree_leak`;
- each of the three real-relay tests below independently returned test rc 0
  with `process_tree_leak`;
- the helper-owned PTY identity authority exited as a zombie after only the
  utility leader was reaped; and
- an intentionally preserved custom tmux server was killed by harness cleanup
  only after the product reaper had exited, leaving an adopted zombie.

The durable authenticated RED is Gateway artifact
`art-dde18c55-778b-4b5d-9883-572ae2d4b504`.

No synthetic process test was added. A mocked `waitpid`, `/proc`, or tmux
fixture would be weaker than the existing CI-gate-supervised real-relay cases,
which jointly exercise real fork/adoption, exact process identity, the custom
tmux protocol, preservation assertions, and final process-tree quiescence.

## What was done

### Exact product ownership

- The utility fork reports the PTY identity authority's exact
  `pid`/`startToken`/`pgid`/`sid` through the existing private identity pipe.
  The reaper validates that identity while it is live and verifies the
  authority inherited the exact utility PGID/SID.
- Session-port cleanup closes the retained PTY/authority descriptors before
  retirement, retires the exact utility leader first, then waits only for the
  recorded authority identity after it becomes an adopted direct child.
- The accepted-generation ledger records the authority target as
  `pty-identity-authority`; successful cleanup requires `RETIRED`.
- Pre-accept bounded cleanup uses the same exact identity. No signal-derived
  identity, pathname authority, broad descendant sweep, janitor, or policy
  change was added.

### Exact harness ownership

- Real Node harnesses start custom `tmux -D` as an exact direct child under an
  isolated `TMUX_TMPDIR`.
- The relay harness creates an unrelated deterministic sibling through a
  separate client, records its exact pane identity, and proves the sibling,
  server, accepted namespace, and permitted survivors remain through all
  Decision 4C assertions.
- Only after those assertions, harness cleanup retires its sibling, verifies
  the exact pane identity vanished, runs exact `kill-server`, awaits the direct
  server child, and removes the isolated namespace.
- Python custom-runtime probes use the same foreground-server rule and wait
  for their recorded pane identities before awaiting the server.
- The foreground-change fixture reaps its own exact forked reader child; this
  fixture-only ownership is not granted to production cleanup.

The `PRESERVED` assertions and post-`V` product namespace rules are unchanged.

## TDD evidence

### RED

Authenticated artifact
`art-dde18c55-778b-4b5d-9883-572ae2d4b504` records the load-bearing RED:
assertions pass while CI containment rejects each command as
`process_tree_leak`.

### GREEN

Each Node argv below was executed through
`scripts.ci_gate._execute_command` with:

```text
D007C_TEST_TMUX_PATH=/tmp/d007c-runtime.fT5Wl8/bin
D007C_TMUX_SOCKET_NAME=d007c-control-probe
D007C_RUN_REAL_TMUX_PROBE=1
```

Results:

- `authenticates the exact relay instance and returns the canonical 24-byte pane snapshot`
  — `completed`, rc 0, 1 test, 1 pass, 0 fail, 0 skip.
- `default real helper returns the rendered 24-byte snapshot through the authenticated relay`
  — `completed`, rc 0, 1 test, 1 pass, 0 fail, 0 skip.
- `default real helper retires the bound port after real tmux identity drift`
  — `completed`, rc 0, 1 test, 1 pass, 0 fail, 0 skip.
- Full `tests/gateway/process_supervisor_session_port_relay.test.js`
  — `completed`, rc 0, 58 tests, 58 pass, 0 fail, 0 skip.
- Trial 4 focused pair
  — `completed`, rc 0, 2 tests, 2 pass, 0 fail, 0 skip.
- `process_supervisor_session_port_pty.test.js` plus
  `process_supervisor_darwin.test.js`
  — `completed`, rc 0, 16 tests, 16 pass, 0 fail, 0 skip.
- `git diff --check` — clean.

The full repository CI was intentionally not run, per the Trial 5 task.

## Commits and pathsets

Baseline:

```text
50b534cc2a8090ae25e27330b9ca08b3bd4a4419
tree d1fbc59ff6f4937bf3e877619f8d8f68b1de60a3
```

Technical GREEN:

```text
8c77c92746d348410b807e319d4f52b8fec9bf98
tree be968ad33388d64c28a0fa6c74dc63f91444f1d1
```

Technical pathset:

```text
gateway/src/adapters/process_supervisor_helper.py
tests/gateway/process_supervisor_session_port_fixture.py
tests/gateway/process_supervisor_session_port_pty.test.js
tests/gateway/process_supervisor_session_port_relay.test.js
```

Status reopen:

```text
f9b12d96aa845cf85852b326c35f8e5b62b14c06
tree 014c5cee8d5c2a9266aec257ca784618c538b38a
```

Status pathset:

```text
plan/README.md
plan/PROJECT_V5/README.md
plan/PROJECT_V5/EPICS.md
plan/PROJECT_V5/SHEETS.md
plan/PROJECT_V5/D/README.md
plan/PROJECT_V5/D/0/07.md
plan/PROJECT_V5/D/0/07c.md
plan/PROJECT_V5/D/0/07d.md
```

The live status is `38 complete + 5 in progress + 39 planned = 82`, with 44
open. D/0/07c is in progress pending this review; D/0/07d remains planned,
unimplemented, and blocked.

## Review focus

1. Confirm the authority identity originates only from the exact component
   fork and is validated before it can authorize `waitpid`.
2. Confirm descriptor closure, utility retirement, adopted-authority reaping,
   ledger finalization, and terminal return preserve their required order.
3. Confirm all tmux and fixture teardown occurs after survivor/namespace
   assertions and grants no product namespace or signal/pathname authority.
4. Reproduce the CI-wrapper outcomes, including `completed` rather than merely
   test rc 0.

## Non-claims

This request makes no verdict, status closure, D/0/07d implementation,
integration, promotion, main/develop movement, tag, push, release, support, or
policy claim.
