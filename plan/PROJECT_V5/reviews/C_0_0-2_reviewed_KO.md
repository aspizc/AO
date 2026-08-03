# Independent Review — Project V5 C/0/00 Suite/Lock Correction (Trial 2)

## Verdict

**KO** for correction commit
`6a5aea0f8494ab8f4c9f2dae88e706a9729d949e`.

## Reviewer

- Model: `gpt-5.6-sol`
- Reasoning effort: `ultra`
- Service profile: `priority/fast`
- Reviewed correction:
  `1b40f33fd3ea69d4aaa918e3fc7da4ebe07bbbfc..6a5aea0f8494ab8f4c9f2dae88e706a9729d949e`
- Review submission:
  [`C_0_0-2_to_review.md`](C_0_0-2_to_review.md), inspected at
  `7be087ac517349f165df0012ed99e1f1e2b724dc`
- Trial 1 submission and KO were preserved unchanged.

This was a local, offline correction review. No network, Redis, Postgres,
Temporal, provider, shared MCP, container, or other service was contacted.
Only reviewer-owned local fixture processes were started, and every PID
observed by the reviewer was terminated and waited for exactly.

## Trial 1 blockers rechecked

The correction closes the five originally reported cases on their covered
paths:

1. The focused suite, including real timeout, SIGINT, and SIGTERM process-tree
   fixtures, passed: `25 passed in 3.18s`. The fixtures observed isolated
   runner/descendant process groups, one JSON report, the documented exit
   codes, and no running fixture PID afterward.
2. An independent refresh matrix mutated required-suite deletion,
   optional-suite deletion, `argv`, include and exclude globs, minimum count,
   timeout, `allowedSkips`, and readiness. Every case returned exit `2`,
   `invalid_manifest`, one stdout JSON line, a suite-contract error, and left
   the candidate manifest byte-for-byte unchanged.
3. The focused parser regressions reject duplicate or absent TAP summary
   fields and duplicate observed skip IDs.
4. A required suite with an exact allowlisted skip reports
   `infrastructure_unavailable` at suite and aggregate level while retaining
   the explicit exit-zero policy; it is not called `passed`.
5. Invalid UTF-8, including valid TAP followed by an invalid byte, remains a
   machine error and produces a single failure JSON on the covered execution
   path.

Missing, corrupt, and non-object suite contracts, plus corrupt manifest JSON,
were also probed independently. Each returned exit `2`,
`invalid_manifest`, exactly one stdout JSON line, and no stderr traceback.

Those corrections are necessary, but the broader process-lifecycle and signal
output contracts still have two reproducible blockers.

## Reproducible blocking findings

### 1. P0 — An execution error after `Popen` leaves the owned child alive

`_execute_command` creates a real isolated process group at
`scripts/ci_gate.py:837-846`, but it cleans that group only for
`TimeoutExpired` and `GateCancelled` at `scripts/ci_gate.py:847-869`.
Any other exception from `communicate()` escapes with no process-group
termination or wait. `_run_suite` catches an `OSError` at
`scripts/ci_gate.py:944-961` and returns a normal `failed` result, but it no
longer has the process handle and cannot perform cleanup.

The reviewer injected an `OSError` from `communicate()` after delegating
`Popen` to the real implementation. The real command was a local Python
process sleeping for 60 seconds in the new session. The result was:

```json
{
  "child_alive_after_error": true,
  "child_pgid": 2772982,
  "child_pid": 2772982,
  "result_errors": [
    "check.error-cleanup: cannot execute '/tmp/agents-orchestrator-v5-c000-complete.4sEInK/worktree/.venv/bin/python': synthetic pipe read failure after Popen"
  ],
  "result_status": "failed"
}
```

Thus the gate can claim a contained suite failure while leaving the process
group running. After recording the result, the reviewer sent `SIGKILL` only to
PGID `2772982` and waited for PID `2772982`; it did not remain alive.

This violates the requested regression property that errors do not leave
children and weakens the same ownership invariant that timeout/cancellation
were meant to establish.

### 2. P0 — A signal during final cleanup/report emission still suppresses JSON

`main()` restores the original SIGINT/SIGTERM handlers in its `finally` block
at `scripts/ci_gate.py:1211-1213`. Only afterward does it serialize and print
the report at `scripts/ci_gate.py:1215`. A signal in that cleanup-to-emission
window therefore uses the original/default action, bypasses
`GateCancelled`, and can terminate the gate without its promised JSON.

A deterministic local probe delegated every handler operation to the real
`signal.signal`, then delivered SIGTERM immediately after the fourth call
restored the final original handler in `finally`. It produced:

```json
{
  "returncode": -15,
  "signal_phase": "finally handler restoration before JSON emission",
  "stderr": "",
  "stdout_bytes": []
}
```

A second probe delayed final JSON serialization and delivered SIGTERM there;
it independently returned `-15` with empty stdout. This contradicts the
documented SIGTERM result of one `cancelled` JSON object and exit `143`.

## Other verification

- `env -u AGENTS_REDIS_URL -u AGENTS_COORDINATION_REDIS_URL -u
  AGENTS_TEST_REDIS_URL -u AGENTS_E2E_REAL .venv/bin/python -m pytest -q
  tests/structure/test_ci_suite_manifest.py` — **25 passed**.
- `.venv/bin/ruff check scripts/ci_gate.py
  tests/structure/test_ci_suite_manifest.py` — passed.
- `.venv/bin/python -m py_compile scripts/ci_gate.py` — passed.
- `python3 scripts/ci_gate.py --validate-only` — exit `0`, one JSON object,
  status `passed`.
- `git diff --check 24362a5..6a5aea0` — passed.
- `git diff --exit-code 1b40f33..HEAD --` against both Trial 1 artifacts —
  passed; the historical submission and KO remain unchanged.

The full CI gate was intentionally not repeated. The focused local suite,
static checks, field-by-field contract attacks, malformed-input probes, and
two blocking lifecycle probes were sufficient for this verdict and avoided
all service-backed lanes.

## Required correction for Trial 3

- Once `Popen` succeeds, make whole-process-group termination and direct-child
  waiting a guaranteed cleanup path for every exception from command
  communication/accounting, not only timeout and `GateCancelled`. Add a
  regression that injects a post-`Popen` communication error against a real
  long-lived child and proves the exact PID/PGID is gone before the JSON is
  returned.
- Keep SIGINT/SIGTERM cancellation semantics protected through final report
  serialization and emission. Add deterministic regressions for a signal
  during cleanup/handler restoration and during final output; each must emit
  exactly one `cancelled` JSON object, return the documented signal-derived
  code, and leave no owned process or temporary JUnit artifact.

Preserve this Trial 2 KO and submit the correction as Trial 3.
