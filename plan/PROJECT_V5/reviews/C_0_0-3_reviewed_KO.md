# Independent Review — Project V5 C/0/00 Process/Signal Correction (Trial 3)

## Verdict

**KO** for correction commit
`e139c6ed18b2ae8d468c3d96311baee8c3baba0f`.

## Reviewer

- Model: `gpt-5.6-sol`
- Reasoning effort: `ultra`
- Service profile: `priority/fast`
- Reviewed range:
  `f64ac62e530125bc5b1d2d8d97d8e95358a95345..e139c6ed18b2ae8d468c3d96311baee8c3baba0f`
- Review submission:
  [`C_0_0-3_to_review.md`](C_0_0-3_to_review.md), inspected at
  `0740291`

This was an independent local/offline review. No network, Redis, Postgres,
Temporal, provider, shared MCP, container, tmux, or other shared service was
used. Reviewer-owned fixture process groups were killed by exact PGID and
their direct children were waited for before the probes ended.

## Reproducible blocking findings

### 1. P0 — Failures inside the post-`Popen` fallback can still return a result with an owned process alive

The correction does clean the ordinary injected `communicate()` `OSError`
covered by its new regression. It does not make the cleanup path itself
exception-safe.

`_terminate_process_group()` suppresses exceptions from group signalling but
calls `_process_group_exists()` outside any protection
(`scripts/ci_gate.py:821-839`). The same unprotected group probe controls the
final bounded loop (`scripts/ci_gate.py:874-888`). If it raises, cleanup exits
before the direct child is killed or waited for. `_run_suite()` then converts
that cleanup `OSError` into a normal failed result
(`scripts/ci_gate.py:1007-1024`).

An independent probe used a real new-session child which ignored `SIGTERM`,
made its first `communicate()` persistently raise, and made the cleanup's group
existence probe raise. `_run_suite()` had already returned when the child was
inspected:

```json
{
  "child_alive_when_result_returned": true,
  "child_pgid": 2888192,
  "child_pid": 2888192,
  "popen_returncode_when_result_returned": null,
  "result_errors": [
    "check.cleanup-failure: cannot execute '/tmp/agents-orchestrator-v5-c000-complete.4sEInK/worktree/.venv/bin/python': synthetic cleanup process-group probe failure"
  ],
  "result_status": "failed"
}
```

A second probe made only the cleanup's process-group signalling fail
persistently. A real runner and descendant ignored `SIGTERM` and shared the
runner's isolated PGID. The bounded fallback killed and reaped the direct
runner, but swallowed the signalling failure, exhausted its final deadline,
and returned while the descendant was still running:

```json
{
  "descendant_alive_when_result_returned": true,
  "direct_returncode_when_result_returned": -9,
  "elapsed_seconds": 4.541,
  "result_status": "failed",
  "runner_alive_when_result_returned": false,
  "single_owned_pgid": true
}
```

The reviewer then sent `SIGKILL` to only each recorded PGID, waited for the
direct child, and confirmed every recorded PID was non-running. The gate must
not swallow cleanup failures and emit a result while its owned group still
exists.

### 2. P0 — Initial handler installation and actual final emission remain signal races

The new tests inject signals during `json.dumps()` and the restoration calls,
but they do not inject into initial handler installation or the actual
`sys.stdout.write()`/`flush()` boundary.

Initial installation is unmasked and occurs before `main()`'s guarded `try`
(`scripts/ci_gate.py:1281-1289`). A deterministic wrapper delivered a signal
immediately after the first real `signal.signal()` call:

- `SIGINT` raised `GateCancelled` outside the guarded block, returned exit 1,
  emitted no stdout JSON, and printed a traceback.
- `SIGTERM` still had its default handler, terminated the process by signal
  (shell status 143), and emitted no stdout JSON.

For final output, cancellation is sampled for the last time at
`scripts/ci_gate.py:1335-1341`; payload write, newline write, and flush happen
afterward at `scripts/ci_gate.py:1342-1344`. Because
`CancellationState.handle()` only records and returns while `finalizing`
(`scripts/ci_gate.py:104-110`), a signal in those operations cannot alter the
already selected payload or status.

Independent `SIGINT` and `SIGTERM` probes injected each signal in the first
real stdout write and, separately, in `flush()`. All four returned:

```text
exit=0
stdout objects=1
stdout status=passed
expected status=cancelled
expected exit=130 (SIGINT) or 143 (SIGTERM)
```

The same `SIGTERM` emission probe was repeated after a real synthetic pytest
suite. It returned one `passed` JSON and exit 0. It left no
`agents-ci-junit-*` residue, but it still violated cancellation semantics.

There is also a persistent handler side effect: `_prepare_final_output()`
re-arms the two `CancellationState.handle` methods
(`scripts/ci_gate.py:1233-1244`), and `main()` never restores the caller's
handlers before returning. Both emission probes observed
`CancellationState(signal_number=<signal>, finalizing=True)` installed after
`main()` returned. A later signal in an embedding process would therefore be
silently consumed by state belonging to an already completed invocation.

## Independent verification

- `env -u AGENTS_REDIS_URL -u AGENTS_COORDINATION_REDIS_URL -u
  AGENTS_TEST_REDIS_URL -u AGENTS_E2E_REAL .venv/bin/python -m pytest -q
  tests/structure/test_ci_suite_manifest.py` — **29 passed in 3.87s**.
- The same isolated environment with `tests/structure` — **174 passed in
  4.03s**.
- `.venv/bin/ruff check scripts/ci_gate.py
  tests/structure/test_ci_suite_manifest.py` — passed.
- `.venv/bin/python -m py_compile scripts/ci_gate.py` — passed.
- `python3 scripts/ci_gate.py --validate-only` — exit 0, one `passed` JSON.
- `git diff --check f64ac62..e139c6e` — passed.
- Both cleanup-failure probes were bounded; all exact reviewer-owned PIDs and
  PGIDs were absent after reviewer cleanup.
- Trial 1/2 artifacts are byte-identical to their creation commits:
  `C_0_0-1_to_review.md` `8fdbe459...`,
  `C_0_0-1_reviewed_KO.md` `abb39e49...`,
  `C_0_0-2_to_review.md` `cfe9d989...`, and
  `C_0_0-2_reviewed_KO.md` `7cc5823f...`.
- The reviewed diff contains no `message.*` or `agents:events` change.

The full gate was not repeated. The requested focused and structure suites,
static checks, and deterministic process/signal probes were sufficient to
reproduce two P0 contract violations without touching service-backed lanes.

## Documentation review

`docs/ci-contract.md` and
`docs/adr/ADR-007-remote-ci-safety-net.md` consistently describe the intended
post-spawn and final-output guarantees. Those claims are not true of the
reviewed implementation because cleanup can return with a live group, initial
handler installation is unprotected, actual emission misses cancellation, and
handlers are not restored.

## Required correction for Trial 4

- Make every cleanup operation exception-safe after successful `Popen`.
  Cleanup failures must not bypass direct-child waiting or be swallowed while
  the owned group still exists. Add real process-tree regressions which inject
  failures in group existence checks, group signalling, communication, and
  waiting, and assert exact PID/PGID disappearance before any result returns.
- Protect initial SIGINT/SIGTERM handler installation as well as restoration.
  Add deterministic tests for each signal after every installation/transition
  point.
- Make the actual final emission boundary signal-safe. Inject both signals in
  payload write and flush, require exactly one `cancelled` JSON and exit
  130/143 without traceback, and repeat with a pytest runner while asserting
  no owned process or temporary JUnit residue.
- Restore the caller's original handlers before `main()` returns without
  reopening a pre-emission termination window. Add an in-process regression
  that proves handler identity is unchanged after every exit path.
- Keep the CI contract and ADR aligned with behavior proven by those tests.

Preserve every Trial 1–3 submission and KO artifact unchanged. Submit the
correction as Trial 4.
