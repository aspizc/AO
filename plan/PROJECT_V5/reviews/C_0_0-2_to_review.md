# Review Submission — Project V5 C/0/00 Suite/Lock Correction (Trial 2)

## Status

Trial 2 is **pending independent review**. This submission does not mark
C/0/00 complete, reviewed, promoted, or released. Trial 1's submission and KO
remain unchanged.

## What was done

- Added a finite validated `timeoutSeconds` to every suite and a 45-minute
  workflow backstop.
- Replaced blocking `subprocess.run` with byte-capturing `Popen` execution from
  JSON `argv`, `shell=False`, and `start_new_session=True`.
- Added bounded whole-process-group TERM/KILL escalation and direct-child
  reaping for suite timeout, SIGINT, and SIGTERM. Cancellation emits the one
  final JSON with explicit `cancelled` state and signal-derived exit code.
- Added `ci/suites-contract.json`, which `--refresh-inventory` never writes.
  It fixes ordered required/optional IDs and every suite field other than
  `inventorySha256`, including classification, runner, argv, include/exclude,
  minimum, timeout, allowed skips, and readiness.
- Made Node TAP require exactly one coherent `tests`, `pass`, `fail`, and
  `skipped` summary and reject duplicate observed skip IDs.
- Made suites with observed allowlisted infrastructure skips and the aggregate
  report `infrastructure_unavailable`, not `passed`; this explicitly
  allowlisted state retains exit zero.
- Captured child output as bytes, decoded UTF-8 explicitly, rendered invalid
  bytes safely, and preserved decode errors through TAP/JUnit assessment so
  malformed output always becomes a failure in the single JSON report.
- Added real process-tree, signal, refresh-mutation, TAP, skip-status, and
  malformed-output regressions. The process fixtures assert their isolated
  process group and leave no live runner or descendant.

## Why

Trial 1's independent KO proved that a suite could hang forever or orphan its
tree, inventory refresh could bless removed/narrowed lanes, TAP accounting
could overwrite duplicated summaries or accept repeated skip identities,
allowlisted unavailable coverage could be called passed, and invalid UTF-8
could replace the JSON contract with a traceback.

## Decisions taken

- The executable manifest and non-refreshable topology contract are separate.
  Inventory refresh changes only `ci/suites.json` `inventorySha256`; an
  intentional topology or policy change must edit both files visibly.
- Suite timeouts are positive integers no greater than 3600 seconds. The
  committed values range from 120 to 1800 seconds.
- Timeout returns `timed_out`/exit 1. SIGINT and SIGTERM return
  `cancelled`/130 and `cancelled`/143 respectively. `failed` remains exit 1,
  invalid manifest/contract remains exit 2, and explicitly allowlisted
  `infrastructure_unavailable` remains exit 0.
- `passed` is reserved for suites and aggregates with no unavailable
  infrastructure.
- Invalid child bytes are escaped for diagnostic stderr and separately
  recorded as a machine error; a valid TAP summary cannot overwrite that
  error.

## TDD RED evidence

- `env -u AGENTS_REDIS_URL -u AGENTS_COORDINATION_REDIS_URL -u
  AGENTS_TEST_REDIS_URL .venv/bin/python -m pytest -q
  tests/structure/test_ci_suite_manifest.py -k
  'repository_manifest_has_finite_timeouts or suite_timeout_terminates or
  gate_signal_emits or refresh_cannot_self_authorize or
  node_tap_rejects_duplicate or test_result_rejects_duplicate_observed or
  allowlisted_required_skip_has_honest or non_utf8_child_output'` —
  **10 failed, 8 deselected**. The failures reproduced missing timeouts,
  unbounded/orphaning execution, empty stdout on SIGINT/SIGTERM, self-approved
  required/optional deletion and include narrowing, duplicate TAP summaries
  and skips, false `passed`, and the invalid-byte traceback/empty stdout.
- `env -u AGENTS_REDIS_URL -u AGENTS_COORDINATION_REDIS_URL -u
  AGENTS_TEST_REDIS_URL .venv/bin/python -m pytest -q
  tests/structure/test_ci_suite_manifest.py -k
  'refresh_cannot_self_authorize_skip_or_readiness_policy'` —
  **2 failed, 18 deselected** because skip/readiness changes were rejected only
  by the not-yet-populated timeout field, not by an immutable suite contract.
- `env -u AGENTS_REDIS_URL -u AGENTS_COORDINATION_REDIS_URL -u
  AGENTS_TEST_REDIS_URL .venv/bin/python -m pytest -q
  tests/structure/test_ci_suite_manifest.py::test_valid_tap_cannot_overwrite_a_non_utf8_output_failure` —
  **1 failed** because a valid TAP assessment overwrote the decode error and
  returned exit zero.

Each RED was observed before its corresponding implementation correction.

## GREEN and regression verification

- The adversarial focused selection above — **12 passed, 8 deselected** after
  the five initial corrections.
- `.venv/bin/python -m pytest -q
  tests/structure/test_ci_suite_manifest.py` — **25 passed** after the
  additional timeout-bound and valid-TAP/invalid-byte regressions.
- `.venv/bin/python -m pytest -q tests/structure` — **170 passed**.
- `.venv/bin/ruff check scripts/ci_gate.py
  tests/structure/test_ci_suite_manifest.py` — passed.
- `python3 scripts/ci_gate.py --validate-only` — exit 0, exactly one JSON,
  status `passed`.
- `./scripts/requirements_lock.sh --check-inputs` — current.
- `./scripts/requirements_lock.sh --check --offline` — current without
  network.
- `npm --prefix gateway ci --offline` — 196 packages installed from the lock;
  audit reported zero vulnerabilities.
- Detached clean worktree at
  `6a5aea0f8494ab8f4c9f2dae88e706a9729d949e`: Python 3.11 venv, hash-required
  offline sync, offline no-deps/no-build-isolation editable install, and
  `npm ci --offline` all passed.
- Full clean gate at that exact commit with `AGENTS_REDIS_URL`,
  `AGENTS_COORDINATION_REDIS_URL`, and `AGENTS_TEST_REDIS_URL` unset — exit 0,
  aggregate `infrastructure_unavailable`, **975 accounted checks: 963 passed,
  12 exact allowlisted infrastructure skips, 0 failed**. Required Gateway and
  LangGraph suites also reported `infrastructure_unavailable`; no unavailable
  suite or aggregate reported `passed`.
- Process scan after the adversarial and full runs — no live fixture runner or
  descendant.
- `git diff --check` — passed.

No network, shared Redis, Postgres, Temporal, real provider, shared MCP, tmux,
or container service was used. The full gate started only its disposable local
stdio Gateway smoke process.

## Commit

- `6a5aea0f8494ab8f4c9f2dae88e706a9729d949e` —
  `fix(ci): harden suite gate cancellation and accounting (V5 C/0/00)`

## Review request

Review the correction commit and this submission against every Trial 1
blocker. In particular, repeat timeout and both signal probes, attempt to
delete either class of suite, narrow discovery/minimum/argv, alter the
skip/readiness policy and refresh, duplicate TAP summaries/skip IDs, emit
valid TAP plus invalid bytes, and verify status/exit behavior for allowlisted
infrastructure. Publish exactly one append-only
`C_0_0-2_reviewed_OK.md` or `C_0_0-2_reviewed_KO.md`; preserve both Trial 1
artifacts unchanged.
