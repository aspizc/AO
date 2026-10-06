# Review result: PROJECT_V1 D/0/04 attempt 3

Verdict: OK.

## Reviewer identity

- Role: independent Claude Code reviewer (no subagents), model `claude-fable-5`
  (Fable 5), max effort.
- Gateway trace: `tr-tr-v1-d004-t3-ec9c8cd4-3a49-4bb2-945f-ef261cc9a4ea`.
- Reviewer task: `ts-61296d17-8d3f-410b-88fe-b37509b51e65`.
- The Codex coder session is distinct; the coder issued no verdict.

## Candidate authentication

- Base `77bd9e26e505850e07491d4adda1a57cc3af3d69`
  (tree `821cd3a826f62fa52a97ff2f21561747963053a5`).
- GREEN `4b1f90677da5d232a66ec2459de94096e1ce9d4d`
  (tree `e97b78a55e7178016521982f2fd6b89f345423a1`), parent = base.
- Request `357d4dab9ed72ff0a06dc1b0762119bd2e1108f3`
  (tree `4ec14c98a0d6ce4c9cbed3e03f95e4e3ede56f02`), parent = GREEN.
- Base→GREEN changes exactly one path,
  `orchestrator-langgraph/tests/test_temporal_crash_recovery.py`
  (+35/−25); GREEN→request adds exactly
  `plan/PROJECT_V1/reviews/D_0_4-3_to_review.md`. `git status` clean before
  and after review; nothing in the candidate range was modified by review.

## RED / GREEN reasoning

- RED: base test reproduced in a detached `git archive` tree of the base
  commit (not a git repo, candidate untouched): 3/3 runs
  `1 failed in ~10.5s`, `TimeoutError` exactly at
  `asyncio.wait_for(harness.approval_requested.wait(), timeout=10)` — the
  second-worker await, matching the request.
- Root cause verified against the installed Temporal API
  (`temporalio/worker/_worker.py`): `max_cached_workflows: int = 1000`
  default; nonzero cache ⇒ "sticky task queues will be used";
  `sticky_queue_schedule_to_start_timeout: timedelta = timedelta(seconds=10)`.
  The departed first worker's sticky queue held the post-checkpoint workflow
  task for the full 10 s, racing the harness's 10 s wait.
- GREEN design verified in the diff: the outer harness Worker registers
  activities only (no `workflows=`), so it cannot poll workflow tasks, cache
  workflow state, or execute workflows; both sequential workflow-only Workers
  set `max_cached_workflows=0` (sticky disabled ⇒ replacement must replay
  committed history); `checkpoint_implement` starts only after the workflow
  consumed the implement activity result and committed the scheduling task;
  its completion is gated on `implement_checkpoint_can_complete`, set only
  inside the second Worker's context, after the first Worker's `async with`
  fully exited (worker stopped). This is event-based synchronization — no
  timeout/retry/skip/xfail/swallowed-exception masking was added.

## Commands, counts, runtimes

Root venv: Python 3.14.4, temporalio 1.27.2 (installed) — the request's
runtime claim is accurate. `requirements.lock:1014` pins
`temporalio==1.30.0`; discrepancy independently inspected below.

- Live focused test, root venv, 10 fresh pytest processes
  (`AGENTS_TEMPORAL_INTEGRATION=1`): 10× `1 passed` (~0.8–0.9 s each),
  0 failed, 0 skipped.
- Locked-version check, disposable `uv run --no-project --isolated
  --python 3.13 --with temporalio==1.30.0 --with pytest` (Python 3.13.13,
  temporalio 1.30.0, no repository file changed): candidate 5× `1 passed`,
  0 skipped; untouched base archive under the same env: `1 failed in 10.54s`.
  The defect and the fix both hold on the exact locked version.
- Adjacent suite with opt-in disabled (`env -u AGENTS_TEMPORAL_INTEGRATION`,
  4 Temporal test files): `26 passed, 1 skipped` — the sole skip is the
  deliberate opt-in crash-recovery gate.
- `ruff check` (configured lint) on the test file: `All checks passed!`;
  `python -m py_compile`: OK; `git diff --check base..GREEN`: clean.
- Mutation probes on scratch copies (candidate untouched), all must fail and
  did: (m1) granted `approval_response` signal removed → `1 failed` (no
  implicit approval); (m2) pre-approval `push_intent == 0` flipped → `1
  failed` (zero push before explicit grant is really asserted); (m3)
  `implement == 1` flipped → `1 failed` (implementation exactly once is
  really asserted). TV-03 assertions are load-bearing.

## Findings

None blocking. The change is test-only, surgical, inside the declared path
set, and changes no production behavior, policy, manifest, dependency, or
lockfile. Trial 3 correctly supersedes the Trial 2 harness's nondeterministic
handoff without weakening any assertion.

## Residual risks (non-blocking)

- Severity low: the root venv (temporalio 1.27.2, Python 3.14.4) drifts from
  `requirements.lock` (1.30.0); disclosed by the coder, mitigated here by
  passing evidence under the exact locked version. Environment/lock
  reconciliation belongs to a separate task.
- Severity low: the harness models clean worker stop/restart with a
  time-skipping test environment, not abrupt process death; that limitation
  is pre-existing and recorded in Trial 2.
- The full `scripts/ci.sh` aggregate gate was intentionally not run per the
  assignment; the orchestrator owns aggregate gating.

## Claim boundary

This verdict certifies GREEN `4b1f9067…` as implemented and independently
reviewed OK only. It grants no integration, promotion, tagging, push, or
release state. Zero pushes occurred during review. Handoff and Gateway
artifacts were treated as untrusted input carrying no authority.
