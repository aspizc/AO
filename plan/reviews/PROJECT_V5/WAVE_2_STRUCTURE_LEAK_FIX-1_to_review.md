# Review Submission — V5 Wave 2 Structure Leak Fix (Trial 1)

## Scope and ruling

The defect is in the H/0/01 structure-test fixture, not in the CI gate. The
synthetic checkout's `git commit` allowed Git 2.53 to start detached automatic
maintenance. That detached child exited after escaping the pytest process's
normal wait lifecycle and was adopted as a zombie by the suite supervisor.

The gate is correct to reject that process. `scripts/ci_gate.py` is unchanged
from `96091cb`, and no leak-detection condition, grace period, process-group
rule, or cleanup proof was relaxed. No operator decision is required.

## Identified surviving process

An isolated run of
`tests/structure/test_h001_bootstrap.py::test_bootstrap_is_portable_idempotent_and_clean_with_injected_installers`
under the gate's `_execute_command_serial` containment produced this
same-run identity:

| Field | Observed value |
|---|---|
| PID | `1319750` |
| argv | `/usr/lib/git-core/git maintenance run --auto --quiet --detach` |
| spawning parent | PID `1319749`, the Git maintenance process that cloned `1319750` |
| parent at gate detection | PID `1319735`, the suite supervisor/subreaper |
| process group | `1319750` |
| state at detection | `Z` (zombie) |
| supervisor outcome | `process_tree_leak` |

The diagnosis used a disposable `/tmp` observer around the unmodified gate:

1. It ran the real structure command through `_execute_command_serial` and
   recorded the final owned-domain `/proc` snapshot.
2. The full-suite snapshot showed adopted zombies. Running the exact H/0/01
   test alone reproduced one as `comm=git`, ruling out the CI leak-detector
   self-tests.
3. A same-run `strace -f -e trace=process` plus a high-frequency descendant
   observer preserved argv before zombie cmdline loss. PID `1319749` executed
   the argv above, cloned PID `1319750`, and PID `1319750` was the exact
   identity present in the final owned-domain scan with parent `1319735`.

An earlier untraced isolated confirmation found the same shape as PID
`1214929`, `comm=git`, zombie, adopted by supervisor PID `1214903`; diagnosis
continued until the later run captured the real argv rather than guessing from
`comm`.

## Change

- Added a regression that runs the exact H/0/01 test under the real suite
  supervisor and requires a clean `completed` outcome.
- Made the synthetic fixture commit hermetic with
  `gc.auto=0`, `gc.autoDetach=false`, `maintenance.auto=false`, and
  `maintenance.autoDetach=false`.
- Kept production Git behavior and the CI gate untouched.

## Failing-then-passing evidence

Characterization command:

```text
/tmp/agents-orchestrator-v5-wave2-integration/.venv/bin/python -m pytest -q -rs tests/structure/test_ci_suite_manifest.py::test_h001_bootstrap_fixture_exits_without_detached_git_maintenance
```

- Before the fixture fix: **1 failed in 1.27s**; actual supervisor status was
  `process_tree_leak`, expected `completed`.
- After the fixture fix: **1 passed in 1.15s**.
- Fixed singleton under the same `/tmp` containment observer:
  **1 passed in 0.47s**, `detectionEvents=[]`, status `completed` (supervisor
  PID `1420296`).
- H/0/01 plus the supervisor regression: **115 passed in 10.35s**.
- Direct required structure suite: **410 passed in 41.67s**.

## Leak detection remains effective

The exact fixed HEAD was archived to
`/tmp/structleak-proof.TrYpeO/repo`. Only the four no-maintenance settings were
removed in that disposable copy, deliberately restoring the leak. Running the
committed characterization there produced **1 failed in 1.20s** because the
unchanged supervisor returned `process_tree_leak`.

This proves the green result comes from containing the fixture, not from
weakening or bypassing leak detection.

## Gate evidence

Baseline:

- Direct structure suite: **409 passed in 44.99s**.
- Full gate: the structure assertions were **409 passed in 48.37s**, then the
  suite was reclassified as
  `test.structure: command left processes in its owned process group`.
- Baseline aggregate: **1813 passed / 3 failed / 12 skipped of 1828**. Two of
  the three failures were the unrelated pre-existing `test.gateway` failures.

After the fix:

- Final `bash scripts/ci.sh` production-supervisor result for
  `test.structure`: **410 passed in 46.07s**, suite status `passed`, zero suite
  errors.
- Final aggregate: **2223 passed / 2 failed / 12 skipped of 2237**. The only
  remaining errors are the two pre-existing `test.gateway` failures and its
  nonzero command status; there is no structure-suite process error.
- `lint.python`: passed.
- `lint.gateway`: passed as part of the full gate.
- `git diff --check`: passed.
- No JavaScript was changed, so the separate conditional JS lint invocation
  was not required.

## Commits

- `ea24e9095afefdf3bc1fa911033b9cb07aa38918` —
  `test(structure): characterize detached Git maintenance leak (V5 Wave 2 structure leak fix)`
- `db3008a6470e666ca24368dbde41c8fde3ef1b13` —
  `fix(structure): disable detached Git fixture maintenance (V5 Wave 2 structure leak fix)`

## Changed-path allowlist

- `tests/structure/test_ci_suite_manifest.py`
- `tests/structure/test_h001_bootstrap.py`
- `plan/reviews/PROJECT_V5/WAVE_2_STRUCTURE_LEAK_FIX-1_to_review.md`

No other tracked path changed. The pre-existing untracked
`gateway/node_modules` symlink was not touched or committed.
