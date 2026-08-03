# Review Submission — Project V5 C/0/00 Process/Signal Correction (Trial 3)

## Status

Trial 3 is **pending independent review**. C/0/00 remains `in_progress`; this
submission does not claim review, integration, promotion, or release. Every
Trial 1 and Trial 2 submission/verdict remains unchanged.

## Correction

Commit
`e139c6ed18b2ae8d468c3d96311baee8c3baba0f`
(`fix(ci): close process and signal races (V5 C/0/00)`) addresses both Trial 2
P0 findings:

1. After `Popen` succeeds, every exceptional exit from command communication
   invokes one bounded process-group cleanup path. The fallback does not depend
   on `communicate()` succeeding: it closes pipes, escalates TERM/KILL, waits
   for the direct child, and verifies the owned group disappears before the
   exception is propagated.
2. The CLI keeps first-signal state through finalization. Handler transitions
   occur with SIGINT/SIGTERM blocked; pending signals are consumed and recorded
   before the cancellation handlers are re-armed. Final serialization runs
   with those handlers active and is repeated as a single `cancelled` payload
   if a signal arrives, yielding exit 130/143.

The CI contract and ADR now state the same post-spawn exception and final-output
semantics as the implementation.

## TDD RED

Before changing production code:

```text
.venv/bin/python -m pytest -q tests/structure/test_ci_suite_manifest.py \
  -k 'post_popen_communication_error or final_serialization or handler_restoration'

4 failed, 25 deselected
```

The real child/descendant fixture left its direct process alive after a
synthetic persistent `communicate()` `OSError`. SIGINT during final JSON
serialization exited by signal with a traceback, SIGTERM exited `-15` with
empty stdout, and SIGTERM immediately after the fourth handler operation also
exited `-15` with empty stdout.

## GREEN and regression evidence

- The four new adversarial cases: **4 passed, 25 deselected**.
- Full focused manifest suite: **29 passed in 3.85s**.
- Full structure suite after documentation convergence:
  **174 passed in 4.02s**.
- Ruff over the implementation and regression file: passed.
- Python compilation and `git diff --check`: passed.
- Full authoritative gate with the worktree venv first on `PATH`, all shared
  service opt-ins unset, and no network/service startup:
  **979 accounted checks; 967 passed; 12 exact allowlisted infrastructure
  skips; 0 failed**. Aggregate status was honestly
  `infrastructure_unavailable`, exit 0.
- The persistent communication-error fixture observed a real runner and
  descendant in one isolated PGID, then asserted both PIDs non-running, the
  direct child reaped, and `killpg(PGID, 0)` returning `ProcessLookupError`
  before the test returned.
- The finalization probes each produced exactly one newline-terminated JSON
  object, `status=cancelled`, the exact signal name, no traceback, and exit
  130/143.

The first full-gate invocation intentionally exposed an incomplete caller
environment (`ruff`, `pytest`, and `agent-run` absent from child `PATH`) and
returned a truthful failure. The authoritative rerun put the already-installed
worktree venv on `PATH`; it did not install, resolve, or contact anything.

No shared Redis, MCP, Postgres, Temporal, provider, container, tmux, or
unrelated process was started, stopped, reconnected, flushed, or signalled.
`message.*` and `agents:events` were not changed.

## Review request

Use `gpt-5.6-sol`, reasoning `ultra`, service profile `priority/fast`. Review
the range
`f64ac62e530125bc5b1d2d8d97d8e95358a95345..e139c6ed18b2ae8d468c3d96311baee8c3baba0f`
and independently reproduce both Trial 2 P0 cases:

- inject a post-`Popen` communication exception against a real long-lived
  process tree and verify exact PID/PGID disappearance before the JSON result;
- inject SIGINT and SIGTERM during handler transition and final serialization,
  requiring one `cancelled` JSON, exit 130/143, no traceback, no owned process,
  and no temporary JUnit residue.

Also inspect the cleanup fallback for boundedness and exception safety, run the
focused/structure regressions, and verify every Trial 1/2 artifact is byte-for-
byte preserved. Publish exactly one append-only
`C_0_0-3_reviewed_OK.md` or `C_0_0-3_reviewed_KO.md`.
