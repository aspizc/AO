# Independent Review — Project V5 C/0/00 Trial 6

## Verdict

**KO** for technical candidate
`f1e09588607f593fac6db5adc7a89082bdeeba10`.

The pidfd/subreaper correction closes the late-detached-descendant and
post-freeze handoff cases exercised by the existing focused suite, but two P0
ownership and cleanup paths still violate the containment contract. A
post-spawn root-pidfd failure can return without terminating or reaping the
runner, closing its pipes, or restoring the caller's subreaper state.
Separately, the discovery rule can bind, signal, and reap a direct child that
was created by another caller thread rather than by the suite execution.

## Reviewer

- Model: GPT-5.6 Sol
- Reasoning effort: ultra
- Profile: Fast/Priority
- Review base:
  `29bce12f2b5d7d24f1f31b80f22fe1ccb5049f5d`
- Technical candidate:
  `f1e09588607f593fac6db5adc7a89082bdeeba10`
- Submission:
  `61001360643e68945d554497bb5081f013ad608a`
- Review request:
  [`C_0_0-6_to_review.md`](C_0_0-6_to_review.md), preserved unchanged

This was an independent local/offline review. It used only existing repository
tests and documented gates. No new adversarial fixture or test was created.

## Blocking findings

### P0 — A root `pidfd_open` failure after `Popen` bypasses child cleanup and caller-state restoration

The preflight pidfd probe occurs before spawn
(`scripts/ci_gate.py:1088-1098`), but it cannot guarantee that the later root
open will succeed after `Popen`; resource exhaustion or another persistent
runtime error can still occur. `_bind_root_process_handle()` opens the root
pidfd before registering any provisional handle
(`scripts/ci_gate.py:970-986`). Therefore an exception at
`scripts/ci_gate.py:975` leaves `containment.handles` empty even though the
suite runner has already been created with two captured pipes
(`scripts/ci_gate.py:1410-1419`).

The recovery branch at `scripts/ci_gate.py:1431-1441` then calls
`_discover_process_handles()`. Discovery attempts the same pidfd operation
again through `_bind_process_handle()` (`scripts/ci_gate.py:1200-1210`,
`scripts/ci_gate.py:947-955`). If that operation is still failing, the
exception escapes before `_terminate_process_domain()` runs. The outer
`finally` calls `_close_process_containment()` (`scripts/ci_gate.py:1499-1500`),
but that function restores the prior subreaper state only when
`containment.quiescent` is already true; otherwise it merely raises another
`ProcessCleanupError` (`scripts/ci_gate.py:1318-1337`). The only code which
closes the runner's stdout/stderr after a communication failure is inside
`_terminate_process_domain()` (`scripts/ci_gate.py:1365-1375`), which this path
never reaches.

The observable consequence follows directly from the control flow: the
long-lived direct runner remains alive or later becomes an unreaped child, its
captured descriptors are not deterministically closed, the process stays a
subreaper instead of regaining its entry state, and the cooperative lock is
released. Suppressing JSON is necessary but not sufficient containment.

The existing tests do not exercise this path:

- `test_missing_linux_containment_capability_fails_before_spawn` makes the
  self-pidfd preflight fail and asserts that `Popen` is never called
  (`tests/structure/test_ci_suite_manifest.py:977-1016`);
- `test_execute_binds_root_pidfd_immediately_before_child_interaction` assumes
  the root open succeeds
  (`tests/structure/test_ci_suite_manifest.py:816-874`); and
- `test_root_binding_validation_failure_still_reaps_child_and_closes_pidfd`
  injects the failure only after the root pidfd has already been opened and
  registered (`tests/structure/test_ci_suite_manifest.py:1039-1115`).

Required correction: once `Popen` succeeds, every exit must retain safe
authority over that unreaped direct child, terminate and reap it, close both
captured streams, prove the owned domain quiescent, and restore the exact entry
subreaper state before returning or raising. Add an existing-style regression
where the preflight succeeds but root pidfd acquisition fails persistently
after spawn, using a long-lived runner and asserting exact child absence,
closed descriptors, restored state, and no gate JSON.

### P0 — The subreaper domain can claim and kill a child not created by the suite execution

The empty-child check is only a point-in-time snapshot
(`scripts/ci_gate.py:1100-1110`). The process-wide lock serializes only callers
which voluntarily enter `_execute_command()` (`scripts/ci_gate.py:1385-1397`);
it does not prevent another thread in the embedding process from calling
`subprocess.Popen` directly after the snapshot.

Nevertheless, `_owned_process_records()` seeds ownership with **every** new
direct child of the gate process whose identity was absent from that snapshot
(`scripts/ci_gate.py:1137-1144`). It does not require ancestry from the bound
suite root. Discovery then opens and registers a pidfd for that unrelated
child (`scripts/ci_gate.py:1167-1211`), and timeout/error cleanup sends TERM or
KILL through every registered handle and reaps it
(`scripts/ci_gate.py:1274-1293`). Stable pidfds prevent PID reuse, but they do
not prove that this execution owns the process they bind.

The impact is destructive: an unrelated child created by the caller during a
suite run can be terminated and reaped as if it were a suite descendant. This
directly contradicts the requirement that containment never claim a process
which the execution did not create.

The concurrency regressions cover only cooperative or pre-snapshot cases:

- `test_second_concurrent_execution_fails_before_its_popen` makes both
  executions use the same `_execute_command` lock
  (`tests/structure/test_ci_suite_manifest.py:876-942`); and
- `test_preexisting_direct_child_fails_before_suite_spawn` creates the other
  child before `_begin_process_containment()` takes its snapshot
  (`tests/structure/test_ci_suite_manifest.py:944-974`).

Neither test covers a caller-owned direct child created after containment
begins. Required correction: make ownership derive from an isolation boundary
that cannot admit arbitrary caller children, such as a dedicated per-command
subreaper supervisor whose only descendants originate at the suite root.
Do not infer ownership merely from "new direct child of the embedding
process." Add a regression with a non-cooperating caller child created after
the baseline and prove that the suite cleanup neither binds, signals, nor
reaps it.

## Existing verification

- `env -u AGENTS_REDIS_URL -u AGENTS_COORDINATION_REDIS_URL -u
  AGENTS_TEST_REDIS_URL -u AGENTS_E2E_REAL TMPDIR=<private>
  PYTHONPYCACHEPREFIX=<private> .venv/bin/python -m pytest -q
  tests/structure/test_ci_suite_manifest.py` — **63 passed in 9.05s**.
- `.venv/bin/python scripts/ci_gate.py --validate-only` — exit 0, exactly one
  `passed` JSON object.
- `.venv/bin/ruff check scripts/ci_gate.py
  tests/structure/test_ci_suite_manifest.py` — passed.
- `.venv/bin/python -m py_compile scripts/ci_gate.py
  tests/structure/test_ci_suite_manifest.py` with
  `PYTHONPYCACHEPREFIX` in the private review `TMPDIR` — passed.
- `./scripts/requirements_lock.sh --check-inputs` — current.
- `./scripts/requirements_lock.sh --check --offline` — current.
- `git diff --check 29bce12f2b5d7d24f1f31b80f22fe1ccb5049f5d..f1e09588607f593fac6db5adc7a89082bdeeba10`
  — passed.
- The technical commit has the exact review base as its direct parent, and the
  submission has the technical commit as its direct parent.

The full structure suite, npm reinstall, and full authoritative gate were not
repeated after the two P0 blockers were established by precise control-flow
inspection. The focused process/signal suite and the lightweight documented
gates above were sufficient to show both uncovered paths without starting a
service-backed lane.

## Append-only verification

Every Trial 1–5 submission and KO verdict matches the SHA-256 recorded by the
Trial 6 submission. The submission itself and all prior review artifacts were
preserved unchanged.

All process-spawning verification removed Redis and real-agent opt-ins and
used the private directory
`/var/tmp/agents-c000-t6-review.3EF0Hb`, which was removed after verification.
No network, Redis, Postgres, Temporal, provider, shared MCP, container, tmux,
or other shared service was used, restarted, or signalled.

Trial 6 must remain `in_progress`. Do not promote C/0/00 from this candidate.
