# Independent Review — Project V5 C/0/00 Trial 9

## Verdict

**OK** for technical candidate
`f37fe7f7978d54164465b71a1e6f1f4eae65a1b6`.

The Trial 8 helper-pidfd close blocker is resolved. The parent now attempts
the helper-pidfd close exactly once, converts a reported close `OSError` to
`ProcessCleanupError`, preserves the complete failure chain, and emits no JSON.
Independent instrumentation found no close retry and no wait, signal, or
second close using the descriptor after the failed close attempt.

No blocking finding remains in the submitted correction.

## Reviewer

- Model: GPT-5.6 Sol
- Reasoning effort: ultra
- Profile: Fast/Priority
- Review base:
  `6ac5d8ab598e4788edc8842ba2322ab01b23c098`
- Technical candidate:
  `f37fe7f7978d54164465b71a1e6f1f4eae65a1b6`
- Submission:
  `53f718fd52193183076207122ea6d114d7158f3d`
- Review request:
  [`C_0_0-9_to_review.md`](C_0_0-9_to_review.md), preserved unchanged

This was an independent local/offline review. The TDD skill, plan intake,
task, Trial 8 KO, Trial 9 request, technical diff, and submission diff were
read completely. Coder conclusions were not used as review evidence.

## Close-boundary review

### Single-attempt ownership

`_close_suite_supervisor_pidfd()` at `scripts/ci_gate.py:1890-1897` contains
one `os.close(pidfd)` call and no retry. Its sole helper-pidfd call site is the
nested `finally` at `scripts/ci_gate.py:2062-2066`, after helper shutdown/reap
when that remains necessary. No raw `os.close(helper_pidfd)` call remains.
The other pidfd close paths belong to the supervisor's separate
runner/descendant containment domain and were not changed by this trial.

This is the safe numeric-descriptor rule: once `close(2)` reports an error,
the descriptor's state is uncertain and its number must not be retried because
it may already have been reused.

### Normalized error and causality

The close primitive catches `OSError` and raises
`ProcessCleanupError("cannot close suite supervisor pidfd")` directly from the
close error. Therefore `_run_suite()` and `main()` retain their existing
fail-closed cleanup path instead of constructing a suite failure,
`invalid_manifest`, or `internal_error` JSON record.

When another cleanup error is already active, Python's exception chain retains
all four layers:

```text
top-level ProcessCleanupError
  -> direct cause: close OSError(EIO)
     -> context: primary ProcessCleanupError
        -> context: original parent RuntimeError
```

The close uncertainty correctly remains the top-level cleanup classification
without discarding the primary cleanup or original parent failure.

## Independent fault reproduction

The two candidate regressions passed together: **2 passed in 0.35s**.

A separate in-memory probe used the real helper, pidfd open, helper wait/reap,
and real descriptor close before injecting `OSError(EIO)`. It instrumented all
subsequent helper-pidfd wait, signal, and close operations.

For successful command completion followed by close failure, it observed:

```text
{'scenario': 'success-reaped',
 'exception': 'ProcessCleanupError',
 'cause': 'OSError',
 'close_attempts': 1,
 'uses_after_close': [],
 'helper_returncode': 0,
 'stdout': '',
 'events': ['helper-reaped', 'helper-pidfd-close']}
```

For a primary cleanup failure followed by close failure, it observed:

```text
{'scenario': 'combined',
 'exception': 'ProcessCleanupError',
 'cause': 'OSError',
 'close_attempts': 1,
 'uses_after_close': [],
 'helper_returncode': 0,
 'stdout': '',
 'events': ['helper-reaped',
            'primary-cleanup-error',
            'helper-pidfd-close']}
```

Both helpers were reaped before close, both real descriptor closes were
confirmed by `EBADF` from `fstat`, and neither path produced stdout. The
combined probe additionally verified the exact cause/context chain shown
above. No probe file was added to the repository.

## Verification

- Private review directory:
  `/var/tmp/agents-c000-t9-independent-review.TvpnFg`, removed after
  verification.
- With live-service and real-agent opt-ins unset and private
  `TMPDIR`/`PYTHONPYCACHEPREFIX`,
  `.venv/bin/python -m pytest -q
  tests/structure/test_ci_suite_manifest.py` —
  **77 passed in 12.51s**.
- The same environment with `.venv/bin/python -m pytest -q
  tests/structure` — **222 passed in 12.85s**.
- The same environment, the worktree venv first on `PATH`, and
  `bash scripts/ci.sh` — exit 0, aggregate
  `infrastructure_unavailable`, **1027 tests / 1015 passed /
  12 exact infrastructure skips / 0 failed**.
- `.venv/bin/python scripts/ci_gate.py --validate-only` — exit 0 and exactly
  one `passed` JSON object.
- `./scripts/requirements_lock.sh --check-inputs` — current.
- `./scripts/requirements_lock.sh --check --offline` — current.
- `npm --prefix gateway ci --offline` — 196 packages installed from the
  offline cache, 0 vulnerabilities.
- `.venv/bin/ruff check scripts/ci_gate.py
  tests/structure/test_ci_suite_manifest.py` — passed.
- `.venv/bin/python -m py_compile scripts/ci_gate.py
  tests/structure/test_ci_suite_manifest.py` with private
  `PYTHONPYCACHEPREFIX` — passed.
- `git diff --check
  6ac5d8ab598e4788edc8842ba2322ab01b23c098..
  f37fe7f7978d54164465b71a1e6f1f4eae65a1b6` — passed.
- Scoped added-line secret-signature scan — 0 matches.
- Post-gate exact supervisor scan — 0 survivors.

No network fetch, live Redis, Postgres, Temporal, provider, shared MCP service,
container, or manual tmux/agent session was used. The authoritative gate's
local stdio tests ran offline. Live-service and real-agent opt-ins were
removed from every process-spawning verification command.

## Commit and append-only verification

The technical commit has the exact Trial 8 KO commit as its direct parent, and
the submission has the technical commit as its direct parent. The technical
diff changes only `scripts/ci_gate.py` and
`tests/structure/test_ci_suite_manifest.py`; the submission adds only
`C_0_0-9_to_review.md`.

All Trial 1–8 submissions and KO verdicts match the SHA-256 values recorded by
the Trial 9 submission. The submission and every prior review artifact were
preserved unchanged. This verdict is the only review change.

This OK approves the technical candidate for the next explicit lifecycle
step. It does not itself claim integration, promotion, tagging, or release.
