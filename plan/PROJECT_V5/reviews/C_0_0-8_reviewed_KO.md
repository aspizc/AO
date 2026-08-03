# Independent Review — Project V5 C/0/00 Trial 8

## Verdict

**KO** for technical candidate
`26e8bbd3609e5c40c83bec5c17e2d151491d4caa`.

Trial 8 closes the four concrete Trial 7 failures: helper-pidfd setup failure
now KILLs and reaps a TERM-ignoring exact child, a pre-`RUN` parent failure
does the same through the acquired pidfd, helper reap precedes cleanup-proof
decode, and a valid-result-then-hang helper is KILLed/reaped without JSON.

One cleanup boundary remains incomplete. Failure to close the acquired helper
pidfd escapes as a plain `OSError`, so `main()` serializes an
`invalid_manifest` result. That contradicts the Trial 7 required correction
that every helper cleanup failure remain `ProcessCleanupError` and never reach
JSON, as well as the Trial 8 submission's own cleanup-error claim.

## Reviewer

- Model: GPT-5.6 Sol
- Reasoning effort: ultra
- Profile: Fast/Priority
- Review base:
  `6529ef872d04cb9f6eaaeba1a8646a1d50869feb`
- Technical candidate:
  `26e8bbd3609e5c40c83bec5c17e2d151491d4caa`
- Submission:
  `689f7ad7de61fe2ae1f92e224177b53017ec6232`
- Review request:
  [`C_0_0-8_to_review.md`](C_0_0-8_to_review.md), preserved unchanged

This was an independent local/offline review. The skill instructions, task
artifacts, Trial 7 KO, Trial 8 request, technical diff, and submission diff
were read completely. Coder conclusions were not used as review evidence.

## Blocking finding

### P0 — Helper-pidfd close failure is published as `invalid_manifest` JSON

The acquired helper pidfd is structurally placed in a nested `finally`, but
its close is a raw `os.close(helper_pidfd)` at
`scripts/ci_gate.py:2052-2056`. An `OSError` from that call is not normalized
to `ProcessCleanupError`. It therefore bypasses the no-output cleanup branch at
`scripts/ci_gate.py:2812-2827` and reaches the generic `OSError` handler at
`scripts/ci_gate.py:2835-2837`, which constructs a public
`invalid_manifest` report.

An independent in-memory fault probe used the real supervisor, real helper
pidfd, real helper exit, and real pidfd reap. It wrapped `_pidfd_open()` only
to identify that parent-owned helper pidfd. On its close, the probe performed
the real close and then raised `OSError(EIO)`. Calling the real `main()` path
observed:

```text
{'status': 2,
 'close_failure_injected': True,
 'stdout': '{"counts":{"failed":0,"passed":0,"skipped":0,"tests":0},'
           '"errors":["[Errno 5] synthetic helper pidfd close failure"],'
           '"schemaVersion":1,"status":"invalid_manifest","suites":[]}'}
```

The probe deliberately completed the real close first, and the helper was
already reaped, so it introduced neither a survivor nor a descriptor leak.
This isolates the exception-classification defect: an error reported by the
helper-pidfd cleanup operation becomes a manifest result. If supervisor
shutdown is already raising `ProcessCleanupError`, a second close error in the
nested `finally` can also mask that cleanup exception with the serializable
plain `OSError`.

Required correction: make helper-pidfd close failure cross `_run_suite()` and
`main()` as `ProcessCleanupError`, while retaining the nested close attempt
even when shutdown/reap or the original parent operation raises. Add
regressions for (1) successful helper reap followed by helper-pidfd close
failure and (2) supervisor cleanup failure combined with pidfd-close failure;
both must produce no stdout, and the latter must retain cleanup-failure
classification.

## Trial 7 blocker reproduction

The four required fault cases all pass on this candidate:

- helper-pidfd acquisition failure plus ignored TERM reaches KILL, reaps the
  exact direct `Popen` child, raises `ProcessCleanupError`, and emits no JSON;
- a post-`READY`, pre-`RUN` callback failure plus ignored TERM reaches pidfd
  KILL/reap, closes the helper pidfd, preserves the original callback error,
  and emits no JSON;
- the real helper is waited for and reaped before
  `_decode_command_outcome()` accepts its cleanup proof; and
- a helper that sends a valid result and then ignores TERM is KILLed/reaped,
  its result is never decoded, its pidfd is closed, and no JSON is emitted.

The exact focused selection reported **4 passed in 1.09s**. The candidate's
numeric fallback is confined to the pidfd-acquisition-failure interval and
uses only the unreaped direct `Popen` child; all acquired-helper signalling
uses pidfd authority. No generic `subprocess.TimeoutExpired` escaped the
exercised fallback.

These successful paths do not compensate for a cleanup exception entering the
public manifest-result path.

## Verification

- Private review directory:
  `/var/tmp/agents-c000-t8-independent-review.Eh7ngy`, removed after
  verification.
- With live-service and real-agent opt-ins unset and private
  `TMPDIR`/`PYTHONPYCACHEPREFIX`,
  `.venv/bin/python -m pytest -q
  tests/structure/test_ci_suite_manifest.py` —
  **75 passed in 12.30s**.
- The same environment with `.venv/bin/python -m pytest -q
  tests/structure` — **220 passed in 12.54s**.
- The same environment, the worktree venv first on `PATH`, and
  `bash scripts/ci.sh` — exit 0, aggregate
  `infrastructure_unavailable`, **1025 tests / 1013 passed /
  12 exact infrastructure skips / 0 failed**.
- `git diff --check
  6529ef872d04cb9f6eaaeba1a8646a1d50869feb..
  26e8bbd3609e5c40c83bec5c17e2d151491d4caa` — passed.
- The independent helper-pidfd close fault probe reproduced the blocker quoted
  above. No probe file was added to the repository.

No network fetch, Redis, Postgres, Temporal, provider, shared MCP, container,
or manual tmux/agent session was used. Live-service and real-agent opt-ins
were removed from every process-spawning verification command.

## Commit and append-only verification

The technical commit has the exact review base as its direct parent, and the
submission has the technical commit as its direct parent. The technical diff
changes only `scripts/ci_gate.py` and
`tests/structure/test_ci_suite_manifest.py`; the submission adds only
`C_0_0-8_to_review.md`.

All Trial 1–7 submissions and KO verdicts match the SHA-256 values recorded by
the Trial 8 submission. The submission and every prior review artifact were
preserved unchanged. This verdict is the only review change.

Trial 8 must remain `in_progress`. Do not promote C/0/00 from this candidate.
