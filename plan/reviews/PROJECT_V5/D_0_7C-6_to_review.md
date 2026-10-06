# Review Submission — Project V5 D/0/07c (Trial 6)

## Requested reviewer

Assign a fresh independent reviewer that did not implement this correction.
Review the Trial 6 technical commit and status-history commit against
[`plan/PROJECT_V5/D/0/07c.md`](../../PROJECT_V5/D/0/07c.md), the frozen
Decision 4C ownership rules in
[`plan/PROJECT_V5/D/0/07.md`](../../PROJECT_V5/D/0/07.md), and the independent
Trial 5 KO in [`D_0_7C-5_result.md`](D_0_7C-5_result.md).

This submission is evidence, not a self-verdict. Trial 6 is **pending**. The
reviewer-owned result path is `D_0_7C-6_result.md`; it does not exist in this
submission.

## Why Trial 6 reopened the correction

Trial 4 remains independently reviewed OK at `5739ea1` and integrated at
`10f5b03`. Trial 5 technical commit `8c77c92746d348410b807e319d4f52b8fec9bf98`
was independently reviewed KO at
`9aafa77a2f54db2e06711699286f8a2041cf3cc6` for three confirmed gaps:

1. a launch timeout/caller/supervisor failure before release could leave the
   exact forked PTY authority adopted and unreaped while cleanup reported
   clean;
2. owned tmux harness cleanup was not exception-safe and could bypass exact
   server shutdown and wait; and
3. the harnesses did not bind live tmux `#{pid}` to the foreground `tmux -D`
   direct child.

Trial 6 closes only those findings. It adds no public DTO/API/catalog/splice,
policy, namespace-deletion authority, or release behavior.

## What was done

### Bootstrap authority custody

- `_utility_child` retains ownership of the exact authority child from fork
  until it receives release byte `b"1"`. Publishing the private identity
  record does not transfer responsibility.
- The identity-pipe write result is checked. Publication failure, EOF or a
  non-`b"1"` release, and any pre-transfer exception close authority-control
  descriptors, validate the recorded composite identity when available,
  perform exact TERM with bounded grace and exact KILL fallback, and
  `waitpid` only the recorded direct child.
- A mismatched recorded `startToken` is an internal cleanup failure, not
  authority to wait or signal a recycled identity. Internal pre-release
  cleanup failure remains distinct from the original public cancellation or
  timeout result.
- Parent-side pre-release abort closes the release writer first, closes
  retained PTY/request descriptors, gives the exact utility leader a bounded
  cooperative-cleanup window, and only then permits the existing
  composite-identity-validated fallback. The late identity pipe remains
  available long enough to recover a complete late record.
- The pre-transfer child-owned path applies on Linux and Darwin. The reviewed
  Linux-only post-transfer adopted-child ordering remains unchanged, and
  transferred generations avoid a second reap.
- A generation that may have forked an authority no longer treats an absent
  authority identity as proof of clean cleanup. No `waitpid(-1)`, descendant
  scan, name lookup, fresh PID lookup, broad kill, or shell was added.

### Exact tmux harness ownership

- Each affected Python and Node harness registers cleanup immediately after
  spawning its isolated foreground server.
- Immediately after socket readiness, live
  `tmux -S <socket> display-message -p "#{pid}"` must equal the spawned
  `tmux -D` child PID. The harness retains the server's composite process
  identity and requires that exact identity absent after teardown.
- Nested cleanup preserves the original pane/startup/assertion failure while
  still attempting exact `kill-server`, a bounded direct-child wait, exact
  TERM/KILL fallback, and isolated-workspace cleanup. Node exit waits are
  bounded; Python waits the exact server even when `kill-server` fails.

The retained-runtime, sibling-survival, namespace-preservation, and zero
post-`V` product unlink/rmdir rules are unchanged.

## TDD evidence

Every command below was passed as argv to
`scripts.ci_gate._execute_command`. The real tmux gates used:

```text
D007C_TEST_TMUX_PATH=/tmp/d007c-runtime.fT5Wl8/bin
D007C_TMUX_SOCKET_NAME=d007c-control-probe
D007C_RUN_REAL_TMUX_PROBE=1
tmux 3.6a-agents.1
Node v22.22.1
Python 3.13.13
```

### RED before product code

```text
node --test --test-concurrency=1 \
  --test-name-pattern='^interrupted pre-release bootstrap reaps the exact unpublished PTY authority$' \
  tests/gateway/process_supervisor_session_port_pty.test.js
```

The real-helper Linux-subreaper probe delayed only the utility's own identity
publication by about 200 ms, used real PTY/control pipes and
`/bin/sleep 3600`, set `terminationGraceMs` to 10 ms, and used an approximately
50 ms deadline. Before the correction, `_execute_command` returned
`completed`, rc 1: the public reason was `timed_out`, but `directChildren`
still contained the exact authority PID. The fixture `finally` retired only
the exact child created by this isolated RED, so the outer gate remained
contained.

### Final GREEN matrix

The exact inner argv were:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='^interrupted pre-release bootstrap reaps the exact unpublished PTY authority$' \
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
| Pre-release regression | `completed`, rc 0 | 1 / 1 / 0 / 0 |
| tmux cleanup fault/PID binding | `completed`, rc 0 | 4 / 4 / 0 / 0 |
| Three named real-relay cases | `completed`, rc 0 | 3 / 3 / 0 / 0 |
| Full relay regression | `completed`, rc 0 | 62 / 62 / 0 / 0 |
| Trial 4 focused pair | `completed`, rc 0 | 2 / 2 / 0 / 0 |
| PTY plus Darwin | `completed`, rc 0 | 18 / 18 / 0 / 0 |
| Whitespace | `completed`, rc 0 | n/a |

These are overlapping focused and regression gates; their test counts must not
be summed as unique coverage. One earlier non-final matrix attempt exposed an
incomplete fixture fake (`poll` was absent). That test-only defect was fixed,
and the complete matrix above was rerun from the final technical tree. GREEN
is based only on the final rerun and on `completed`, not merely TAP rc 0.

## Mutation strength

All mutations ran in a disposable copy through
`scripts.ci_gate._execute_command`, then the copy was restored and compared to
the source technical tree.

| Mutation | Required failure |
|---|---|
| Remove child-owned exact `waitpid` | The focused pre-release regression returned `completed`, rc 1 |
| Transfer authority ownership at identity publication instead of receipt of `b"1"` | The focused pre-release regression returned `completed`, rc 1 |
| Perform broad/group cleanup before closing the release writer | The focused pre-release regression returned `completed`, rc 1 |
| Ignore identity-publication failure | `identity publication failure retains and reaps the exact PTY authority` returned `completed`, rc 1 |
| Alter the retained authority `startToken` | The focused composite-identity mutation gate returned `completed`, rc 1 |
| Remove foreground tmux `-D` | The live server-PID binding mutation failed and ci_gate reported `process_tree_leak`; containment retired the mutation subtree |

The four technical files in the restored disposable copy matched the source
tree byte-for-byte by SHA-256, and no Trial 6 mutation process or tmux session
survived.

## Commits and exact pathsets

Baseline and Trial 5 KO:

```text
9aafa77a2f54db2e06711699286f8a2041cf3cc6
tree a39a63715949dee6c011d469967507b28ffc6236
```

Technical GREEN:

```text
commit 4f072a724619d7508f3c58902b534e72fcf97c53
tree   959c54bd94453e367144044f409ece6308e07a11
parent 9aafa77a2f54db2e06711699286f8a2041cf3cc6
```

Technical pathset:

```text
gateway/src/adapters/process_supervisor_helper.py
tests/gateway/process_supervisor_session_port_fixture.py
tests/gateway/process_supervisor_session_port_pty.test.js
tests/gateway/process_supervisor_session_port_relay.test.js
```

Status history:

```text
commit 0b0757df919c4288b4f0fcca0b61aed6fdef1eba
tree   20da771df56389c90e87a027552c2e05de85400f
parent 4f072a724619d7508f3c58902b534e72fcf97c53
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

## Limitations and canonical state

- The real unpublished-authority regression requires Linux subreaper support.
  Darwin retains deterministic pre-transfer cleanup coverage and the existing
  platform regression suite; no Darwin adopted-child claim was added.
- The real tmux gates use an isolated local tmux runtime and no provider,
  network, Redis, PostgreSQL, or shared MCP service.
- Full repository CI was intentionally not run; the orchestrator owns that
  gate only after independent OK and integration.
- Current Project V5 counts remain
  `38 complete + 5 in progress + 39 planned = 82`.
- D/0/07c is implemented/technically GREEN for Trial 6 and pending independent
  review. It is not reviewed or integrated for Trial 6. D/0/07d remains
  planned, unimplemented, and blocked.
- Nothing here is promoted, released, tagged, pushed, supported, or published.

## Review focus

1. Confirm only receipt of release byte `b"1"` transfers authority custody,
   and every earlier failure exactly validates, signals, and waits the recorded
   direct child without broad discovery or double reap.
2. Confirm parent abort ordering closes release first and gives child-owned
   cleanup its bounded cooperative window before any validated fallback.
3. Confirm altered or incomplete composite identity cannot authorize cleanup
   or be reported clean.
4. Confirm every tmux startup/assertion/pane/kill-server failure still waits
   the exact retained server identity, and live `#{pid}` is bound to the
   foreground `-D` direct child.
5. Reproduce the wrapper outcomes, including `completed` and zero skips, and
   inspect `process_tree_leak` as the intended `-D` mutation failure.

## Non-claims

This request makes no verdict, status closure, D/0/07d implementation,
integration, promotion, main/develop movement, tag, push, release, support,
publication, public-contract, or policy claim.
