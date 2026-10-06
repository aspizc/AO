# Review Submission — Project V5 D/0/07c (Trial 7)

## Requested reviewer

Assign a fresh independent reviewer that did not implement this correction.
Review the Trial 7 technical and status commits against
[`plan/PROJECT_V5/D/0/07c.md`](../../PROJECT_V5/D/0/07c.md), the frozen
Decision 4C ownership rules in
[`plan/PROJECT_V5/D/0/07.md`](../../PROJECT_V5/D/0/07.md), and the independent
Trial 6 KO in [`D_0_7C-6_result.md`](D_0_7C-6_result.md).

This submission is evidence, not a self-verdict. Trial 7 is **pending**. The
reviewer-owned result path is `D_0_7C-7_result.md`; it does not exist in this
submission.

## Why Trial 7 reopened the correction

Trial 4 remains independently reviewed OK at `5739ea1` and integrated at
`10f5b03`. Trial 5 technical commit `8c77c92746d348410b807e319d4f52b8fec9bf98`
was independently reviewed KO at
`9aafa77a2f54db2e06711699286f8a2041cf3cc6`. Trial 6 technical commit
`4f072a724619d7508f3c58902b534e72fcf97c53` was independently reviewed KO at
`43687afabbf0db3faee997afd2364aaaf4336cd6` for one P1 and one directly
coupled P2:

1. parent pre-release wait mapped ECHILD/lost wait ownership to the same value
   as a running timeout, then replaced a missing or mismatched sealed identity
   with a later `process_identity(pid)` result and could authorize group
   TERM/KILL; and
2. the fixed 0.75-second parent window could overlap child-owned cleanup,
   whose complete maximum algorithm is 2,000 ms grace plus two seconds of
   exact reap.

The reviewer classified mutable tmux socket teardown as P3 harness hardening.
Trial 7 does not redesign it.

## What was done

### Explicit fail-closed wait ownership

- `_wait_pre_release_utility` now returns an explicit internal tri-state:
  `reaped(status)`, `running`, or `ownership_lost`.
- `ChildProcessError`/ECHILD returns `ownership_lost`; it is never treated as a
  running child or as authority to inspect or signal a later PID.
- Parent pre-release abort performs no `process_identity(pid)` lookup after
  waiting and never substitutes a fresh identity for missing, partial, or
  mismatched sealed evidence.
- Parent pre-release abort no longer calls
  `_bounded_session_port_utility_cleanup`. That helper remains unchanged and
  reachable only from the already-reviewed post-transfer paths.
- Only a reaped normal exit 126 proves child-owned cleanup complete and
  preserves the original cancellation/timeout reason. Exit 124, another exit
  code, a signal, `ownership_lost`, or bounded expiry is unclean and maps the
  public result to `supervisor_lost`.

### Complete bounded child-cleanup budget

- The parent deadline is monotonic and equals
  `terminationGraceMs / 1000 + 2.0 + 0.25` seconds.
- The shared two-second constant is also the child authority's exact final
  reap budget. With the validated maximum `terminationGraceMs=2000`, the
  parent bound is 4.25 seconds.
- The maximum-grace test delays the utility leader's clean exit 126 until
  logical monotonic time 4.0 seconds, proving the parent does not take
  ownership or settle early.
- The expiry test keeps the exact leader running through the 4.25-second
  deadline and proves finite `supervisor_lost` settlement with zero parent
  signal/group fallback.

### Descriptor and observer ownership

- Abort closes the release writer first, then the retained PTY/authority
  descriptors and exec-error control descriptor.
- A post-arm `ChildObserver` is closed by abort before the parent calls
  `waitpid`; on Darwin this closes the kqueue first.
- Abort retains only the private identity-pipe reader while collecting bounded
  late evidence and waiting for the exact utility leader.
- The abort path owns observer close exactly once. The successful release path
  continues returning the observer to the unchanged post-transfer owner.

No public DTO/API/catalog/splice, dependency, lock, policy, namespace-deletion
authority, or release behavior changed.

## TDD evidence

Every command below was passed as argv to
`scripts.ci_gate._execute_command`. TAP output alone was not treated as an
outcome. The real tmux lanes used:

```text
D007C_TEST_TMUX_PATH=/tmp/d007c-runtime.fT5Wl8/bin
D007C_TMUX_SOCKET_NAME=d007c-control-probe
D007C_RUN_REAL_TMUX_PROBE=1
tmux 3.6a-agents.1
Node v22.22.1
Python 3.13.13
```

### RED before product code

The exact inner argv was:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='^(lost pre-release wait ownership closes the observer and never signals a fresh identity|maximum pre-release grace completes child-owned cleanup before bounded parent settlement|expired pre-release cleanup fails closed without parent group fallback)$' \
  tests/gateway/process_supervisor_session_port_pty.test.js
```

With only the new tests/fixture present, `_execute_command` returned
`completed`, rc 1: 3 tests, 0 pass, 3 fail, 0 skip. Each test observed the old
ambiguous `None` result instead of the required tri-state. Direct probe
evidence additionally recorded:

| Case | Old implementation evidence |
|---|---|
| ECHILD | observer was open at `waitpid`; one fresh utility lookup; one group-cleanup call using the self-consistent unrelated leader; `clean=true`; public `timed_out` |
| Maximum grace | parent stopped at logical 0.75 seconds; one fresh lookup and one group-cleanup call; `clean=true` before child-owned cleanup could finish |
| Bounded expiry | parent stopped at logical 0.75 seconds; one fresh lookup and one group-cleanup call; `clean=true` instead of fail-closed settlement |

The ECHILD fixture made the post-wait lookup return a different,
self-consistent session leader with the same PID/PGID/SID and a different
start token. It drove the real `_spawn_utility` caller mapping and recorded
the internal abort boolean plus its returned public reason.

### Final GREEN matrix

The exact inner argv were:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='^(lost pre-release wait ownership closes the observer and never signals a fresh identity|maximum pre-release grace completes child-owned cleanup before bounded parent settlement|expired pre-release cleanup fails closed without parent group fallback|interrupted pre-release bootstrap reaps the exact unpublished PTY authority|identity publication failure retains and reaps the exact PTY authority)$' \
  tests/gateway/process_supervisor_session_port_pty.test.js

node --test --test-concurrency=1 \
  --test-name-pattern='^(owned tmux cleanup waits the exact server after kill-server failure|owned tmux pane-wait failure still shuts down and waits the exact server|owned tmux startup assertion still shuts down and waits the exact server|Python owned tmux cleanup preserves pane and kill failures after bounded wait)$' \
  tests/gateway/process_supervisor_session_port_relay.test.js

node --test --test-concurrency=1 \
  --test-name-pattern='^(authenticates the exact relay instance and returns the canonical 24-byte pane snapshot|default real helper returns the rendered 24-byte snapshot through the authenticated relay|default real helper retires the bound port after real tmux identity drift)$' \
  tests/gateway/process_supervisor_session_port_relay.test.js

node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_relay.test.js

node --test --test-concurrency=1 \
  --test-name-pattern='^(preserves the authenticated pre-F write rejection before generation cleanup|keeps post-dispatch fd 5 loss mapped to write aborted)$' \
  tests/gateway/process_supervisor_session_port_relay.test.js

node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_pty.test.js \
  tests/gateway/process_supervisor_darwin.test.js

git diff --check
```

Final outcomes:

| Gate | ci_gate outcome | Tests / pass / fail / skip |
|---|---|---:|
| New plus preserved pre-release cases | `completed`, rc 0 | 5 / 5 / 0 / 0 |
| Trial 6 tmux cleanup fault/PID binding | `completed`, rc 0 | 4 / 4 / 0 / 0 |
| Three named real-relay cases | `completed`, rc 0 | 3 / 3 / 0 / 0 |
| Full relay regression | `completed`, rc 0 | 62 / 62 / 0 / 0 |
| Trial 4 focused pair | `completed`, rc 0 | 2 / 2 / 0 / 0 |
| PTY plus Darwin | `completed`, rc 0 | 21 / 21 / 0 / 0 |
| Whitespace | `completed`, rc 0 | n/a |

These are overlapping focused and regression gates; their counts must not be
summed as unique coverage. Full repository CI was intentionally not run; the
orchestrator owns it after independent OK and integration.

## Mutation strength

All mutations ran separately in one disposable exact copy through
`scripts.ci_gate._execute_command`. Each relevant focused command returned
`completed`, rc 1:

| Mutation | Focused failure |
|---|---|
| Collapse ECHILD back into `running` | lost-ownership test observed `running`, not `ownership_lost` |
| Restore fresh `process_identity(pid)` substitution | lost-ownership test observed one post-wait fresh lookup |
| Restore pre-release group fallback | expiry test observed the forbidden group-cleanup call |
| Move `observer.close()` after `waitpid` | lost-ownership test observed the observer open at wait |
| Restore the fixed 0.75-second parent budget | maximum-grace test observed `running`, not the clean exit 126 at logical 4.0 seconds |
| Omit the child two-second reap budget | maximum-grace test expired before logical 4.0 seconds |
| Turn the bounded wait into an unbounded wait | expiry fixture's 4.5-second logical safety trip failed the test promptly |

After restoration, the three new focused tests returned `completed`, rc 0
with 3/3/0/0. The restored disposable files matched the technical source
byte-for-byte:

```text
313fde77761db817fb0a58df9e11273053a60d24fa4aefb9bc0c446f4573a29c  gateway/src/adapters/process_supervisor_helper.py
bdfbdd3b5c8783484a99e2267bca074cae9dbb28e31fce169f40caf62873e3f7  tests/gateway/process_supervisor_session_port_fixture.py
379b1fe2fa0fb6e257a3f9cb5f0912ed71bba15078c0694da523916d26792537  tests/gateway/process_supervisor_session_port_pty.test.js
```

No Trial 7 mutation process or tmux server survived. The exact disposable
copy was moved to the user trash after the environment rejected direct
recursive deletion. Pre-existing reviewer-noted tmux PIDs 1019690/1020609
and existing orchestration sessions were left untouched.

## Commits, trees, and exact pathsets

Trial 6 independent KO baseline:

```text
commit 43687afabbf0db3faee997afd2364aaaf4336cd6
tree   3dc3fad3ac4b5edf4ebdd50c45510776fc27103f
parent 15d898697862013fa941e24a0a210fac20e34933
```

The reviewed Trial 6 technical commit remains:

```text
commit 4f072a724619d7508f3c58902b534e72fcf97c53
tree   959c54bd94453e367144044f409ece6308e07a11
parent 9aafa77a2f54db2e06711699286f8a2041cf3cc6
```

Trial 7 technical GREEN:

```text
commit d79fd00ea3b5dca03625b2ff2911803c6bf2d741
tree   bb1294fabc043fc7f8edb511bfef768a5e5f5cfa
parent 43687afabbf0db3faee997afd2364aaaf4336cd6
```

Technical pathset:

```text
gateway/src/adapters/process_supervisor_helper.py
tests/gateway/process_supervisor_session_port_fixture.py
tests/gateway/process_supervisor_session_port_pty.test.js
```

Trial 7 status history:

```text
commit 30557062a06c714fe20da0a566a1351cef7912ca
tree   e8e6c051ae246f83e76273453bac0bcebfda5360
parent d79fd00ea3b5dca03625b2ff2911803c6bf2d741
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

The reviewable pre-request candidate is
`30557062a06c714fe20da0a566a1351cef7912ca`, tree
`e8e6c051ae246f83e76273453bac0bcebfda5360`. The append-only request/index
commit necessarily follows that candidate and does not alter technical or
status files.

## Security properties for independent review

1. Before receipt of release byte `b"1"`, the utility remains the sole owner
   of PTY-authority cleanup; parent abort only closes its retained handles and
   waits for the exact utility leader.
2. ECHILD is terminal `ownership_lost`, returns unclean, and causes zero later
   PID lookup, PID/PGID signal, or group cleanup.
3. Missing, partial, or mismatched sealed identity evidence never authorizes
   parent cleanup. No later PID lookup can manufacture authority.
4. Parent abort closes release, PTY/control descriptors, and any post-arm
   observer before consuming wait ownership; the identity pipe is the only
   retained evidence channel during the bounded exact wait.
5. The maximum parent wait is finite and derived from the complete child
   algorithm; only normal exit 126 preserves the original public reason.
6. No `waitpid(-1)`, descendant/name discovery, negative-PID signal, shell,
   public `ptyAuthority`, policy edit, or unrelated-process cleanup was added.
7. After release byte `b"1"`, the independently reviewed post-transfer
   behavior is unchanged.

## Limitations and canonical state

- The new authority tests use deterministic fork/wait seams to force ECHILD,
  a mismatched self-consistent later identity, exact observer ordering, and
  logical monotonic maximum/expiry boundaries. They do not cycle the live PID
  namespace or wait four wall-clock seconds.
- The preserved interrupted-bootstrap regression uses the real Linux
  subreaper/helper/PTY path. Darwin retains its deterministic kqueue ordering
  seam and full platform regression suite; no live Darwin host claim is made.
- The real tmux gates use an isolated local runtime and no provider, network,
  Redis, PostgreSQL, or shared MCP service.
- Current Project V5 counts remain
  `38 complete + 5 in progress + 39 planned = 82`.
- D/0/07c is implemented/technically GREEN for Trial 7 and pending independent
  review. It is not reviewed or integrated for Trial 7. D/0/07d remains
  planned, unimplemented, and blocked.
- Nothing here is promoted, released, tagged, pushed, supported, or published.

## Review focus

1. Confirm ECHILD cannot flow into a running/timeout cleanup branch and that
   no missing or mismatched identity is replaced by a later PID lookup.
2. Confirm pre-release parent abort has no PID/PGID signal or group-cleanup
   path and only normal exit 126 can preserve the original reason.
3. Confirm the monotonic deadline includes maximum termination grace, the
   child's exact two-second authority reap, and only fixed bounded scheduling
   slack.
4. Confirm observer close precedes every parent `waitpid`, including Darwin
   kqueue closure, and has exactly one owner on success and abort paths.
5. Reproduce the wrapper outcomes and mutation failures while leaving the
   reviewed post-transfer behavior unchanged.

## Non-claims

This request makes no verdict, status closure, D/0/07d implementation,
integration, promotion, main/develop movement, tag, push, release, support,
publication, public-contract, or policy claim.
