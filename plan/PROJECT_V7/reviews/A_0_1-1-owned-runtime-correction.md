# V7 A/0/01 — Owned test runtime correction checkpoint

Date: 2026-10-07. Coder: `/root/implement_v7_a01`.
Trace: `tr-v7-a01-f75e045d-8572-4862-a0ee-3ac0e575b7ca`.
Advanced base: `b667728910fcf3d459ed4877e279bba6e663ee42`.
Branch: `feat/V7-A-0-01-shared-capacity`.
Append-only implementation correction; no independent verdict or acceptance.
The prior request, checkpoints, outputs and archives remain unchanged.

## Failure and attribution

Root's full gate failed: **2578 passed, 1 failed, 9 skipped**, aggregate status
`failed`. LangGraph's pytest subprocess printed **142 passed, 3 skipped**,
but its owned process runner correctly rejected a leftover process. Those
pytest counts did not constitute a successful suite or gate. Original output
is `/tmp/ao-v7-a01-gate.log`, retained unchanged by the coder.
Its SHA-256 is
`0425d06b5e5025d17187ebe6f38c4253f5d46363983089966f5985512a320573`.

Reproduced using the existing `scripts/ci_gate.py::_run_suite`, selecting only
`orchestrator-langgraph/tests/test_wave_budget.py` from the real LangGraph
suite. Pytest printed **61 passed**, but the runner returned `failed` with
`command left processes in its owned process group`, exit 1. This is the
distinguishing RED for the runtime lifecycle correction; it executes actual
process/barrier admission and crash tests, then observes cleanup externally.

A second reproduction added a read-only `/proc` monitor to the calling
diagnostic process. It followed only that process's descendant tree through
the gate's process-record reader, without changing the gate or signaling PIDs.
It observed `multiprocessing.resource_tracker` identity PID 319659, start time
11892801, first parented by pytest PID 319466 and then adopted by CI supervisor
PID 319459 after pytest exited. Its command was the stdlib resource tracker
entry point. This identifies the helper created by the new spawn-context tests;
the worker exit/join assertions themselves were passing.

Read the installed Python 3.11 `ResourceTracker.ensure_running` and `_stop`
implementation. Default tracker startup deliberately permits the helper to
outlive its creator. `_stop` closes its owned pipe and waits for its own child;
it performs no numeric PID signaling or arbitrary process discovery.

## Surgical correction

Only `orchestrator-langgraph/tests/test_wave_budget.py` changed: import `gc`
and add one module-scoped autouse fixture. It snapshots the tracker before
this module's tests, verifies no multiprocessing workers remain at teardown,
collects the retired synchronization resources, then closes/reaps the stdlib
tracker only if no tracker was inherited at module entry. An existing tracker
belongs to its original caller and is left with that owner. The active-worker
assertion prevents tracker cleanup from disguising a leaked worker.

Spawn contexts, actual child processes, barriers, crash exit observations,
the live surviving-effect observation and all resource-vector assertions are
retained. No timeout, skip, subprocess assertion or gate predicate was weakened.
The correction uses a private stdlib cleanup method in test code, checked
against the installed Python 3.11 implementation; production exposes none of
this helper lifecycle.

No budget/error/CLI implementation, schema, CI runner, suite manifest, root
CLI registration/test, documentation, README, CHANGELOG, policies, prior
handoff, or archived output was edited. The root-owned changes present on
the advanced base were preserved. No commit, provider, sub-agent or full gate
was run by the coder.

## Verification after correction

- Focused capacity module through `_run_suite`: **61 passed, 0 failed,
  0 skipped**, runner status `passed`, errors empty, exit 0.
- Complete existing `test.langgraph` lane through `_run_suite`: **142 passed,
  0 failed, 3 skipped**, errors empty, no process leak. Its honest status is
  `infrastructure_unavailable` for the three declared integration skips:
  `test_real_gateway_smoke`, `test_real_gateway_dry_run_smoke`, and the
  opt-in Temporal restart integration test. These are unchanged declared
  infrastructure skips, not completed live integration claims.
- Scoped Ruff on `test_wave_budget.py`: **PASS**, exit 0.
- `git diff --check` on the staged candidate plus this unstaged lifecycle
  correction: **PASS**, exit 0. Root still owns final staging and candidate
  binding. Only the test file differs from the coder's frozen implementation.

The full gate remains pending root's solo rerun; its earlier failure is
preserved, not replaced by these focused results. The final root-registered
CLI test and its prior focused results were not rerun or rewritten here.

## Reproduction command

Run from the A/0/01 worktree with its existing symlinked venv. This calls the
real owned suite runner, not bare pytest. Set the focused include/allowedSkips
pair for the module-only reproduction; omit that pair for the complete
LangGraph lane. The local interpreter is explicit because system python3
does not contain the repository's pytest dependencies.

```python
import importlib.util
import json
import os
import sys
from pathlib import Path

repo = Path.cwd()
spec = importlib.util.spec_from_file_location("owned_gate", repo / "scripts/ci_gate.py")
gate = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = gate
spec.loader.exec_module(gate)
suite = next(item for item in json.loads((repo / "ci/suites.json").read_text())["suites"]
             if item["id"] == "test.langgraph")
suite = dict(suite, argv=[sys.executable, "-m", "pytest", "-q", "-rs"])
# Module-only reproduction:
# suite = dict(suite, include=["orchestrator-langgraph/tests/test_wave_budget.py"], allowedSkips=[])
result = gate._run_suite(suite, repo, os.environ.copy())
print(json.dumps(result, sort_keys=True))
```

## Immutable raw evidence

Each `.txt.gz` is a lossless archive of the named original `/tmp` log; gzip
round trips were verified. These archives avoid pytest-generated text trailing
spaces without rewriting the output. The earlier evidence note continues to
govern the first handoff's raw-text copies. Raw SHA-256 values are recorded
in the following table.

| Archive | Meaning | Uncompressed SHA-256 |
|---|---|---|
| `A_0_1-1-owned-red.txt.gz` | Actual owned-runner RED before the fix | `c2aeb0f8ba0a80c06c93a6ecbf2d660d30a152d35d53fd1c1bd1070bdd4c199e` |
| `A_0_1-1-owned-diagnosis.txt.gz` | Repeated RED with observed tracker ancestry | `93af327728e8800c1964467f7998c9198e45e6e3055562a7acf09d3458958a00` |
| `A_0_1-1-owned-green-budget.txt.gz` | Focused owned-runner GREEN | `89e552dac8d789ee470acbaab27cbb57ff2a6e7e022a7eba2259e3a1aa43f2fb` |
| `A_0_1-1-owned-green-langgraph.txt.gz` | Complete LangGraph owned-runner result and declared skips | `a23fe4ac90c164ea3a78a9bb2eccd155fd5c71a2aaf82f417ffce120457f9034` |

Root should stage the updated test file and this additive evidence, run the
solo full gate, then bind the settled candidate for the fresh independent
reviewer. This checkpoint supplies no independent verdict or integration
authority.
