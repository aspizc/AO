# Independent Review — Project V5 C/0/00 Trial 7

## Verdict

**KO** for technical candidate
`3c6921af94af8aef1eb1638e2c380893beac083b`.

The fresh per-suite supervisor closes the two Trial 6 ownership blockers for
the runner domain: a caller-owned child remains outside the helper, and the
pidfd/stat-opaque root cleanup is confined to the helper's exact children.
However, the embedding parent does not own the helper through every
post-`Popen` exit. A non-cooperating helper can survive a pre-`RUN` failure,
and a syntactically valid cleanup-proof frame is decoded before the helper has
exited and been reaped. Both paths can leave the helper alive; the earliest
pidfd-setup path can additionally escape as `TimeoutExpired` and publish an
`internal_error` JSON despite unresolved cleanup.

## Reviewer

- Model: GPT-5.6 Sol
- Reasoning effort: ultra
- Profile: Fast/Priority
- Review base:
  `31fe285a4929c48fc1ba7389fa7285eba5ee7206`
- Technical candidate:
  `3c6921af94af8aef1eb1638e2c380893beac083b`
- Submission:
  `d38046672beb84a36aefb964defdd98864aee293`
- Review request:
  [`C_0_0-7_to_review.md`](C_0_0-7_to_review.md), preserved unchanged

This was an independent local/offline review. The task, Trial 6 KO, review
request, technical diff, and submission diff were read completely. Coder
conclusions were not used as review evidence.

## Blocking findings

### P0 — Pre-`RUN` helper failures can leave the helper alive and can publish JSON

After the helper is spawned, failure to open its pidfd delegates cleanup to
`_shutdown_prelaunch_helper()` (`scripts/ci_gate.py:1858-1862`). That helper
closes the channel and performs `wait`, `terminate`, then one more `wait`
(`scripts/ci_gate.py:1790-1805`). It has no `SIGKILL` escalation and does not
normalize the second `subprocess.TimeoutExpired` to `ProcessCleanupError`.
Because `helper_pidfd` was never acquired, the outer `finally` has no further
cleanup authority (`scripts/ci_gate.py:1959-1982`).

An independent in-memory fault probe replaced only the fresh helper with an
exact direct child which ignored `SIGTERM`, forced helper `pidfd_open` to fail,
and shortened the existing bounded waits. It observed:

```text
{'exception': 'TimeoutExpired', 'is_cleanup_error': False, 'helper_alive': True}
```

The probe killed and reaped that exact test child afterward. This exception
does not enter the cleanup-uncertainty branch at
`scripts/ci_gate.py:2738-2753`; it reaches the generic exception branch at
`scripts/ci_gate.py:2764-2769`, which constructs a public `internal_error`
record while the helper is still alive. That violates both the owned-process
cleanup and no-JSON-on-cleanup-uncertainty contracts.

The more general parent `finally` is also incomplete. Before `RUN`,
`run_may_have_started` is false, so it only waits for cooperative EOF exit.
If that wait expires, it raises `ProcessCleanupError` at
`scripts/ci_gate.py:1969-1979` without TERM/KILL escalation. The raise also
skips the pidfd close at `scripts/ci_gate.py:1981-1982`. A second independent
probe raised from the parent immediately after `READY` while the exact helper
ignored EOF and TERM; it observed:

```text
{'exception': 'ProcessCleanupError',
 'message': 'suite supervisor cleanup did not converge',
 'helper_alive_after_failure': True}
```

The existing regression at
`tests/structure/test_ci_suite_manifest.py:1020-1052` proves only the
cooperative helper which sees EOF, restores, and exits. It does not exercise
the bounded failure path.

Required correction: route every path after helper `Popen` through one total
helper-shutdown primitive. Close both protocol endpoints, use the helper pidfd
for TERM/KILL and `waitid(P_PIDFD)` whenever acquired, and otherwise use only
the exact unreaped direct `Popen` child for bounded TERM/KILL/wait. Always reap
the helper and close the pidfd in a nested `finally`; cleanup failure must
remain `ProcessCleanupError` and must never reach JSON serialization. Add
regressions for persistent helper-pidfd failure and a pre-`RUN` helper which
does not cooperate with EOF or TERM, asserting no runner, no survivor, no
unreaped child/fd, and no stdout.

### P0 — A cleanup-proof frame is decoded before helper exit/reap, and a post-frame hang survives

The parent marks a terminal frame received and immediately calls
`_decode_command_outcome()` at `scripts/ci_gate.py:1891-1940`. Only afterward
does it wait for and reap the helper at `scripts/ci_gate.py:1941-1948`.
Therefore the cleanup booleans are accepted before the process that asserts
them has crossed its exit/reap boundary.

A call-order probe against the real candidate and real helper recorded:

```text
{'status': 'completed',
 'events': ['decode-proof', 'waitid-helper']}
```

This is not merely cosmetic ordering. Once any terminal frame is received,
`terminal_received` is true, so the parent `finally` suppresses TERM at
`scripts/ci_gate.py:1964-1968`. A private-protocol fault probe sent a fully
valid result and cleanup proof, then kept the exact helper alive. The parent
rejected the command eventually, but left the helper alive:

```text
{'exception': 'ProcessCleanupError',
 'message': 'suite supervisor cleanup did not converge',
 'helper_alive_after_valid_proof': True}
```

The probe killed and reaped the exact test child afterward. The current test
at `tests/structure/test_ci_suite_manifest.py:989-1017` checks only that the
four proof fields have expected values; it neither orders decode after helper
reap nor faults a helper after frame transmission.

Required correction: buffer the terminal frame without accepting its cleanup
proof, require successful helper exit and exact pidfd reap first, validate the
expected helper exit status for that frame type, and only then decode/accept a
result. Receiving any frame must not surrender cleanup authority. If the
helper fails to exit, use bounded pidfd TERM/KILL, reap it, close the pidfd,
reject the frame, and publish no JSON. Add an ordering regression and a valid
result-then-hang regression.

## Reviewed paths that held

- The helper, rather than the embedding process, owns the subreaper domain.
  The caller-child-after-`READY` regression leaves that foreign child alive
  and independently reapable.
- Root pidfd acquisition plus opaque root stat retains a provisional pidfd;
  persistent root-pidfd failure uses numeric authority only for the exact
  unreaped helper child and directly observed adopted helper children.
- Existing root/adopted-child cleanup closes streams and pidfds, reaches the
  fixed point, and restores the helper's entry subreaper state in the exercised
  paths.
- Existing SIGINT/SIGTERM runner cancellation, final-output handoff, arbitrary
  stdout/stderr byte transport, malformed protocol, and fatal/no-public-output
  regressions passed.

These successful paths do not compensate for an owned helper surviving the
parent cleanup boundary.

## Verification

- Private review directory:
  `/var/tmp/agents-c000-t7-review.NFviOi`, removed after verification.
- `env -u AGENTS_REDIS_URL -u AGENTS_COORDINATION_REDIS_URL -u
  AGENTS_TEST_REDIS_URL -u AGENTS_E2E_REAL TMPDIR=<private>
  PYTHONPYCACHEPREFIX=<private> .venv/bin/python -m pytest -q
  tests/structure/test_ci_suite_manifest.py` — **71 passed in 11.11s**.
- The same environment with `.venv/bin/python -m pytest -q
  tests/structure` — **216 passed in 11.35s**.
- The same environment, the worktree venv first on `PATH`, and
  `bash scripts/ci.sh` — exit 0, aggregate
  `infrastructure_unavailable`, **1021 tests / 1009 passed /
  12 exact infrastructure skips / 0 failed**.
- `.venv/bin/python scripts/ci_gate.py --validate-only` — exit 0, exactly one
  `passed` JSON object.
- `.venv/bin/ruff check scripts/ci_gate.py
  tests/structure/test_ci_suite_manifest.py` — passed.
- `.venv/bin/python -m py_compile scripts/ci_gate.py
  tests/structure/test_ci_suite_manifest.py` with private
  `PYTHONPYCACHEPREFIX` — passed.
- `./scripts/requirements_lock.sh --check-inputs` — current.
- `./scripts/requirements_lock.sh --check --offline` — current.
- `git diff --check 31fe285a4929c48fc1ba7389fa7285eba5ee7206..
  3c6921af94af8aef1eb1638e2c380893beac083b` — passed.
- Three non-mutating fault probes reproduced the two blockers as quoted
  above. Each exact child was killed and reaped by the probe cleanup; no probe
  file was added to the repository.

No network fetch, Redis, Postgres, Temporal, provider, shared MCP, container,
or manual tmux/agent session was used. Live-service and real-agent opt-ins
were removed from every process-spawning verification command.

## Commit and append-only verification

The technical commit has the exact review base as its direct parent, and the
submission has the technical commit as its direct parent. The submission adds
only `C_0_0-7_to_review.md`.

All Trial 1–6 submissions and KO verdicts match the SHA-256 values recorded by
the Trial 7 submission. The submission and every prior review artifact were
preserved unchanged. This verdict is the only review change.

Trial 7 must remain `in_progress`. Do not promote C/0/00 from this candidate.
