# Review request: PROJECT_V1 D/0/4

## Scope

- Added `orchestrator-langgraph/tests/test_temporal_crash_recovery.py`.
- Added `docs/adr/ADR-V1-05-temporal-durable-workflows.md`.
- Updated `docs/v1-temporal-worker.md` with crash-recovery operator notes.
- Updated `CHANGELOG.md`.

## Acceptance Focus

- Crash-recovery harness models worker stop/restart after the first activity.
- Replay reaches the approval gate without rerunning the first implementation
  activity.
- TV-03 remains covered: no push-intent before explicit approval signal.
- ADR formalizes that Temporal wraps workflows while side effects continue
  through MCP Gateway tools and human-gated approval.

## Verification

- `PYTHONPATH=orchestrator-langgraph/src .venv/bin/pytest orchestrator-langgraph/tests/test_temporal_crash_recovery.py orchestrator-langgraph/tests/test_temporal_activities.py orchestrator-langgraph/tests/test_implement_test_review_push_workflow.py orchestrator-langgraph/tests/test_temporal_worker.py`
  - Result: `23 passed, 1 skipped`.
- `AGENTS_TEMPORAL_INTEGRATION=1 PYTHONPATH=orchestrator-langgraph/src .venv/bin/pytest orchestrator-langgraph/tests/test_temporal_crash_recovery.py -q`
  - Result: manually terminated after ~90s with no output; Temporal test
    environment did not finish starting in the sandbox.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`
  - Result: `All checks passed`.

## Reviewer Instructions

Return `Verdict: OK` or `Verdict: KO`. If KO, list required fixes.
