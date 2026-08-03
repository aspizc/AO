# Review Submission - Task C/0/00 (Trial 6)

## Scope

- Review base: `29bce12f2b5d7d24f1f31b80f22fe1ccb5049f5d`
- Technical candidate: `f1e09588607f593fac6db5adc7a89082bdeeba10`
- This trial addresses only the three blockers in
  `C_0_0-5_reviewed_KO.md`.
- C/0/00 remains `in_progress`; this submission does not claim review or
  promotion.

## What was done

- Replaced sampled PGID/PID cleanup authority with a Linux subreaper domain:
  the gate acquires a process-wide non-blocking lock, requires no pre-existing
  direct child, enables `PR_SET_CHILD_SUBREAPER`, and restores the exact entry
  state only after quiescence.
- Opened the root pidfd immediately after `Popen`, before `/proc` or any child
  interaction. Every discovered descendant is bound after pre/post identity
  validation, and TERM/KILL is sent only through pidfds.
- Repeated descendant/adopted-child discovery, pidfd signalling, and
  `waitid(P_PIDFD, ...)` reaping until two consecutive scans prove no new or
  surviving owned process. This includes a TERM-handler-created descendant
  which reparents after `setsid()`.
- Removed every numeric `os.kill`, `os.killpg`, and `Popen.kill` cleanup path.
  PID/PGID values are discovery data only; identity uncertainty is fatal.
- Closed every registered pidfd on success and exceptions. Unsupported pidfd
  or subreaper capability, non-default `SIGCHLD`, overlapping execution,
  pre-existing children, unreadable `/proc`, and failure to reach the fixed
  point propagate `ProcessCleanupError` without a JSON result.
- Closed the post-freeze drain-to-unmask race. After committing the frozen
  payload, SIGINT/SIGTERM dispositions become `SIG_IGN` while blocked; the
  exact caller mask is restored before the exact caller handlers. A signal
  after an individual handler is restored belongs to the caller.
- Updated the CI contract, ADR-007, and active planning status with the Linux,
  serial-ownership, default-`SIGCHLD`, and caller-handoff boundaries.

## TDD evidence

- Initial focused RED: **5 failed, 56 deselected**. The real late detached
  descendant remained alive; pidfd binding/handle APIs were absent; and both
  final-unmask signal cases invoked the restored caller handler after one
  frozen `passed` JSON.
- Root-at-spawn ordering RED: **1 failed, 61 deselected** because no pidfd-open
  boundary existed.
- Hardening RED: **3 failed, 60 deselected** for overlapping executions, a
  pre-existing direct child, and duplicate root pidfds after an unreadable
  first root identity.
- Final focused GREEN:
  `.venv/bin/python -m pytest -q tests/structure/test_ci_suite_manifest.py` -
  **63 passed in 9.18s**.
- Full structure GREEN:
  `.venv/bin/python -m pytest -q tests/structure` -
  **208 passed in 9.21s**.

## Decisions taken

- libc `pidfd_open`, `pidfd_send_signal`, and `prctl` are used through
  `ctypes`; no architecture-specific syscall number is embedded. Linux
  `P_PIDFD = 3` is used for `waitid` because supported Python 3.11 does not
  export that constant.
- The direct child is unreaped when its pidfd is opened, so its PID cannot be
  reused before binding. A provisional registered root handle preserves
  cleanup authority even if the first `/proc` read fails.
- The gate rejects rather than queues a concurrent/reentrant invocation. It
  also rejects any pre-existing direct child, making the documented exclusive
  child ownership enforceable.
- Absence requires two no-new-child scans. A persistent fork storm or any
  unreadable identity is uncertainty, never absence.
- The post-freeze caller handoff deliberately suppresses signals until the
  exact mask has been restored. Delivery after restoration of a caller handler
  is outside the completed gate invocation.

## Verification

- `env ... PATH=<worktree>/.venv/bin:... TMPDIR=<private>
  .venv/bin/python scripts/ci_gate.py` - exit 0, exactly one JSON record,
  aggregate `infrastructure_unavailable`, **1013 tests / 1001 passed /
  12 exact infrastructure skips / 0 failed**.
- `.venv/bin/python scripts/ci_gate.py --validate-only` - exit 0, one
  `passed` JSON record.
- `./scripts/requirements_lock.sh --check --offline` -
  `requirements.lock is current`.
- `npm --prefix gateway ci --offline` - 196 packages installed from the
  offline cache, 0 vulnerabilities.
- `.venv/bin/ruff check scripts/ci_gate.py
  tests/structure/test_ci_suite_manifest.py` - passed.
- `.venv/bin/python -m py_compile scripts/ci_gate.py
  tests/structure/test_ci_suite_manifest.py` with a private
  `PYTHONPYCACHEPREFIX` - passed.
- `git diff --check 29bce12..f1e0958` - passed.
- Scoped secret-signature scan of the candidate diff - no matches.
- Post-gate exact process scan - no late-detached or process-tree fixture
  survived.

All process-spawning verification removed Redis, real-agent, provider,
Postgres, and Temporal opt-ins and used a private `TMPDIR`. No shared service,
network fetch, container, MCP coordination, or manual tmux/agent session was
used.

## Append-only evidence

Trial 1-5 submissions and KO verdicts remain byte-identical:

| Artifact | SHA-256 |
|---|---|
| `C_0_0-1_to_review.md` | `b1ac87ede7403082277e654f66055e5d1913eeafec6a965186e3ecea40284926` |
| `C_0_0-1_reviewed_KO.md` | `ca2d2124b5f502469b916c900b1035e0257b1a6bd72338fb4bd58e0b830ac9e6` |
| `C_0_0-2_to_review.md` | `a3d5163fe3bc09baa1671d302cc99511e7948bfd713b0809ce47ed657ff8afba` |
| `C_0_0-2_reviewed_KO.md` | `695a2773567b659f871a37c3dcb87975e8ccfc2949881d4d0d7e4601e44e9b27` |
| `C_0_0-3_to_review.md` | `783d218955829d3504aa736b0f6982b0bf88489091b4db1ae87ccc78c474c39e` |
| `C_0_0-3_reviewed_KO.md` | `32bbba140a8e3e521bbd9b076ab3d9dd68dfd4f838e3a47d1fd32d069d7ef22d` |
| `C_0_0-4_to_review.md` | `54246ca3b4ce64c8c2fc851f08064ba15c9fde115159d451929e54cbfac8dca3` |
| `C_0_0-4_reviewed_KO.md` | `4e83a8ceccaaffe0b34f04c32d3d610215f321aee003bc72459f23bd6e4ae8f6` |
| `C_0_0-5_to_review.md` | `d36f4e3913175eeffef50a8a8217575e812a3edb6dc8a14d608ed342cd0a5804` |
| `C_0_0-5_reviewed_KO.md` | `eab465b15b56f24bf370c7f09047988e613af6fa96bbdfb2d42f2f0c7f36bf30` |

## Commit

- `f1e09588607f593fac6db5adc7a89082bdeeba10` -
  `fix(ci): contain suite processes with pidfds (V5 C/0/00)`
