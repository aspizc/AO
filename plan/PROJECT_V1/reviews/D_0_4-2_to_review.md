# Review request: PROJECT_V1 D/0/4 attempt 2

## Scope

- Fixed crash-recovery harness after attempt 1 KO.
- Recorded attempt 1 reviewer notes in
  `plan/PROJECT_V1/reviews/D_0_4-1_reviewed_KO.md`.
- Kept ADR/docs honest about clean worker stop/restart versus abrupt
  mid-activity process death.

## Fixes Since Attempt 1

- The test no longer calls `handle.result()` before sending the approval signal,
  avoiding Temporal auto time-skipping of the 24h approval timer.
- The pre-approval assertion now checks `push_intent == 0` inside
  `env.auto_time_skipping_disabled()`.
- The stop point is now gated on `checkpoint_implement` starting, which can only
  happen after the workflow has consumed the implementation activity result and
  scheduled the checkpoint.

## Verification

- `PYTHONPATH=orchestrator-langgraph/src .venv/bin/pytest orchestrator-langgraph/tests/test_temporal_crash_recovery.py orchestrator-langgraph/tests/test_temporal_activities.py orchestrator-langgraph/tests/test_implement_test_review_push_workflow.py orchestrator-langgraph/tests/test_temporal_worker.py`
  - Result: `23 passed, 1 skipped`.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`
  - Result after attempt 2 fixes: `All checks passed`.
- Live opt-in harness remains unproven in this sandbox because the Temporal test
  environment did not finish starting in the earlier opt-in run.

## Reviewer Instructions

Return `Verdict: OK` or `Verdict: KO`. If KO, list required fixes.
