# Review Submission - PROJECT_V1 D/0/04 (Trial 3)

Trial 3 is pending independent review. This submission proves an implemented
candidate only; it does not claim independent approval, integration,
promotion, or release.

## Orchestration identity

- Gateway trace: `tr-tr-v1-d004-t3-ec9c8cd4-3a49-4bb2-945f-ef261cc9a4ea`.
- Gateway coder task: `ts-ae919278-c375-41d4-82ee-e8e6aa9c92f2`.
- Role: independently assigned Codex coder; no subagents were used.

## Candidate identity

| State | Commit | Tree | Parent | Exact path set |
|---|---|---|---|---|
| Base | `77bd9e26e505850e07491d4adda1a57cc3af3d69` | `821cd3a826f62fa52a97ff2f21561747963053a5` | N/A | N/A |
| TDD RED | Base-state RED at `77bd9e26e505850e07491d4adda1a57cc3af3d69` | `821cd3a826f62fa52a97ff2f21561747963053a5` | N/A; no inert RED commit was created | Existing `orchestrator-langgraph/tests/test_temporal_crash_recovery.py` |
| TDD GREEN | `4b1f90677da5d232a66ec2459de94096e1ce9d4d` | `e97b78a55e7178016521982f2fd6b89f345423a1` | Base | `orchestrator-langgraph/tests/test_temporal_crash_recovery.py` |
| Review request | This file's immutable commit | This file's immutable commit tree | TDD GREEN | `plan/PROJECT_V1/reviews/D_0_4-3_to_review.md` |

The request commit and tree are self-referential identities: embedding their
literal hashes in this file would change the file, tree, and commit. Resolve
the exact immutable values with:

```bash
git log -1 --format='%H %T' -- \
  plan/PROJECT_V1/reviews/D_0_4-3_to_review.md
```

The resolved request commit must have GREEN as its parent and this review file
as its sole changed path. The exact technical range under review is
`77bd9e26e505850e07491d4adda1a57cc3af3d69..4b1f90677da5d232a66ec2459de94096e1ce9d4d`.

GREEN commit subject:

`test(temporal): make restart replay deterministic (PROJECT_V1 D/0/04 Trial 3)`

## Defect and TDD RED evidence

The pre-existing opt-in acceptance test was the load-bearing RED. No duplicate
test and no RED commit were manufactured. On the untouched required base, the
exact command was:

```bash
PATH=/home/carase/git/personal/agents-orchestrator/.venv/bin:$PATH \
AGENTS_TEMPORAL_INTEGRATION=1 \
PYTHONPATH=orchestrator-langgraph/src \
/usr/bin/time -p pytest \
  orchestrator-langgraph/tests/test_temporal_crash_recovery.py -q
```

Result: exit 1; `1 failed in 10.74s`; `real 11.81`, `user 1.46`,
`sys 0.22`. The failure was `TimeoutError` at the second-worker await
`asyncio.wait_for(harness.approval_requested.wait(), timeout=10)`. The inner
event wait was cancelled when that exact ten-second deadline expired.

Runtime introspection used the same root virtualenv and reported:

- Python `3.14.4`;
- installed `temporalio` `1.27.2` (the committed lock currently names
  `1.30.0`; no dependency or lockfile was changed in this test-only trial);
- `Worker(..., max_cached_workflows: int = 1000, ...)`; and
- `sticky_queue_schedule_to_start_timeout: timedelta = 10 seconds`.

The installed `Worker` documentation says that a nonzero workflow cache uses
sticky task queues and that a task left on a sticky queue moves to the normal
queue only after the sticky schedule-to-start timeout. The base test's
ten-second harness wait therefore raced the installed ten-second sticky
fallback after the first worker exited.

## GREEN correction and replay rationale

Both workflow Worker instances now set `max_cached_workflows=0`. This disables
sticky task queues in the replay-focused harness, so the replacement worker
must rebuild workflow state from committed Temporal history instead of using
an in-memory cache owned by the departed worker.

The first minimal attempt changed only that configuration. Its first focused
run passed (`1 passed in 0.86s`), but the first repetition then failed at the
same approval await (`1 failed in 10.46s`). That result was not called green.
A later diagnostic failure with sticky execution already disabled captured
this history suffix:

```text
activity_task_completed
workflow_task_scheduled
workflow_task_started
workflow_task_timed_out
workflow_task_scheduled
workflow_task_started
```

This proved a second handoff race: after the implementation checkpoint
activity completed, the departing combined worker could poll the next normal
workflow task before shutdown and abandon that started task until its own
ten-second timeout.

The final harness therefore separates activity polling from the two workflow
Workers and adds an explicit checkpoint-completion handshake:

1. The activity-only harness Worker remains available to execute activities.
2. The first non-sticky workflow Worker consumes the implementation result,
   commits the workflow task that schedules `checkpoint_implement`, and exits
   cleanly after that checkpoint activity starts.
3. The checkpoint activity remains in flight until the first workflow Worker
   has fully stopped and the replacement non-sticky workflow Worker has
   started.
4. Releasing the checkpoint completion schedules the continuation for the
   replacement, which can proceed only by replaying the durable history.

This is test-harness synchronization, not a timeout, retry, skip, xfail, or
swallowed exception. The activity-only Worker carries no workflow cache. The
test still proves the intended history replay and TV-03 contract because:

- `checkpoint_implement` can start only after the workflow consumed the
  implementation activity result and committed the command scheduling that
  checkpoint;
- the replacement workflow Worker has sticky caching disabled;
- the existing assertion still requires implementation to run exactly once;
- the existing assertion still requires push to be absent before approval;
- only the explicit `approval_response` signal with `status: granted` unlocks
  the workflow; and
- the existing assertion still requires push to run exactly once afterward.

## Verification

### Live focused GREEN

The live test alone on the final harness passed:

```bash
PATH=/home/carase/git/personal/agents-orchestrator/.venv/bin:$PATH \
AGENTS_TEMPORAL_INTEGRATION=1 \
PYTHONPATH=orchestrator-langgraph/src \
pytest orchestrator-langgraph/tests/test_temporal_crash_recovery.py -q
```

Final exact-tree result: exit 0; `1 passed in 0.89s`; zero skips.

### Consecutive fresh live stability

Twenty separate pytest processes ran the same live command. Each test process
created its own `WorkflowEnvironment`, UUID task queue, and UUID workflow ID.
Every iteration executed the opt-in test; none skipped:

| Iteration | Result | Elapsed |
|---:|---|---:|
| 01 | 1 passed, 0 skipped | 0.86s |
| 02 | 1 passed, 0 skipped | 0.82s |
| 03 | 1 passed, 0 skipped | 0.83s |
| 04 | 1 passed, 0 skipped | 0.82s |
| 05 | 1 passed, 0 skipped | 0.88s |
| 06 | 1 passed, 0 skipped | 0.89s |
| 07 | 1 passed, 0 skipped | 0.84s |
| 08 | 1 passed, 0 skipped | 0.82s |
| 09 | 1 passed, 0 skipped | 0.82s |
| 10 | 1 passed, 0 skipped | 0.86s |
| 11 | 1 passed, 0 skipped | 0.84s |
| 12 | 1 passed, 0 skipped | 0.84s |
| 13 | 1 passed, 0 skipped | 0.81s |
| 14 | 1 passed, 0 skipped | 0.85s |
| 15 | 1 passed, 0 skipped | 0.87s |
| 16 | 1 passed, 0 skipped | 0.86s |
| 17 | 1 passed, 0 skipped | 0.87s |
| 18 | 1 passed, 0 skipped | 0.83s |
| 19 | 1 passed, 0 skipped | 0.93s |
| 20 | 1 passed, 0 skipped | 0.99s |

Aggregate: 20 passed, 0 failed, 0 skipped.

### Adjacent Temporal suite with opt-in disabled

```bash
env -u AGENTS_TEMPORAL_INTEGRATION \
  PATH=/home/carase/git/personal/agents-orchestrator/.venv/bin:$PATH \
  PYTHONPATH=orchestrator-langgraph/src \
  pytest \
    orchestrator-langgraph/tests/test_temporal_crash_recovery.py \
    orchestrator-langgraph/tests/test_temporal_activities.py \
    orchestrator-langgraph/tests/test_implement_test_review_push_workflow.py \
    orchestrator-langgraph/tests/test_temporal_worker.py -q
```

Final result: exit 0; `26 passed, 1 skipped in 0.14s`. The sole skip is the
deliberate `AGENTS_TEMPORAL_INTEGRATION=1` crash-recovery case; zero tests were
failed or otherwise skipped.

### Static and repository checks

```bash
PATH=/home/carase/git/personal/agents-orchestrator/.venv/bin:$PATH \
  ruff check orchestrator-langgraph/tests/test_temporal_crash_recovery.py
PATH=/home/carase/git/personal/agents-orchestrator/.venv/bin:$PATH \
  python -m py_compile \
    orchestrator-langgraph/tests/test_temporal_crash_recovery.py
git diff --check \
  77bd9e26e505850e07491d4adda1a57cc3af3d69..4b1f90677da5d232a66ec2459de94096e1ce9d4d
```

All three commands exited 0; Ruff reported `All checks passed!`.

`ruff format --check` was also evaluated and exited 1 because it would wrap
pre-existing long lines in this file. The untouched base blob independently
exits 1 under the same formatter. The repository's Ruff configuration
explicitly ignores E501 and states that existing wrapping churn is deferred to
a formatter-focused task. A temporary mechanical reformat was reversed, so
the candidate preserves those unrelated lines and relies on the configured
Ruff lint gate above. No format-green claim is made.

The full `scripts/ci.sh` gate was intentionally not started; the assignment
reserves aggregate candidate/final-main gates for the orchestrator after
focused evidence is green.

## Scope and non-scope

In scope:

- deterministic handoff between the two workflow Workers in the opt-in
  crash-recovery acceptance harness;
- disabling sticky workflow caching on both replay-focused workflow Workers;
- explicit synchronization that prevents the departing worker from owning the
  post-checkpoint workflow task; and
- preservation of the existing implementation-once and explicit-approval
  assertions.

Explicitly unchanged:

- production workflow and Temporal worker behavior;
- production activity wrappers, Gateway calls, approval semantics, and retry
  policy;
- the Gateway-only side-effect boundary and `NEVER_AUTO` / TV-03 semantics;
- policies, CI manifests, dependencies, lockfiles, unrelated sheets,
  CHANGELOG, ADRs, docs, and all prior immutable review files; and
- integration, promotion, tagging, pushing, or release state.

## Requested adversarial review

Please review the GREEN technical tree independently and return a separate OK
or KO verdict. In particular:

1. reproduce the base-state RED at the declared base and confirm the await site
   and ten-second timing;
2. verify from the installed Temporal API that nonzero caching enables sticky
   queues and that both workflow Workers explicitly disable it;
3. verify the activity-only Worker cannot preserve workflow execution state
   and that checkpoint release occurs only after the first workflow Worker is
   fully stopped and the replacement has started;
4. verify the checkpoint start still proves the implementation result was
   consumed before restart and that implementation remains exactly once;
5. mutate or remove the pre-approval push assertion, granted signal, and final
   push-count assertion to confirm each remains load-bearing for TV-03;
6. rerun at least ten fresh live processes and account for every skip;
7. rerun the adjacent suite, configured Ruff lint, syntax, and diff checks;
8. confirm the technical range changes only the declared test path and the
   request commit changes only this review file; and
9. reject any claim beyond implemented and pending independent review.

The coder has not issued a verdict and has not integrated, promoted, tagged,
pushed, or released this candidate.
