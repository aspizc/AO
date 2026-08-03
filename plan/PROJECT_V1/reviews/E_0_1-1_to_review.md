# Review request: PROJECT_V1 E/0/1

## Scope

- Added dependency-free OTel-inspired helpers in
  `orchestrator-langgraph/src/orchestrator_langgraph/telemetry.py`.
- Instrumented Temporal activity Gateway calls in
  `orchestrator-langgraph/src/orchestrator_langgraph/activities.py`.
- Added deterministic in-memory workflow/activity span recording to the pure
  `implement-test-review-push` runner in
  `orchestrator-langgraph/src/orchestrator_langgraph/workflows.py`.
- Added trace-id propagation in `GatewayClient` only for tools with compatible
  `traceId` arguments.
- Added docs in `orchestrator-langgraph/README.md`.
- Added focused tests in `test_gateway_client.py`,
  `test_temporal_activities.py`, and
  `test_implement_test_review_push_workflow.py`.
- Updated `CHANGELOG.md`.

## Implementation Notes

- The Codex delegate timed out (`exitCode=-1`) but left usable partial changes.
  The orchestrator inspected the diff, fixed a duplicated approval checkpoint
  append, and ran verification.
- Workflow telemetry is injected into the pure runner and defaults to a no-op
  tracer. Real-time exporters are created from env only in non-workflow activity
  code.
- No prompts, artifact content, stdout/stderr payloads, secrets, or tokens are
  included in span attributes.

## Verification

- `PYTHONPATH=orchestrator-langgraph/src .venv/bin/pytest orchestrator-langgraph/tests/test_gateway_client.py orchestrator-langgraph/tests/test_temporal_activities.py orchestrator-langgraph/tests/test_implement_test_review_push_workflow.py`
  - Result: `23 passed, 1 skipped`.
- `PYTHONPATH=orchestrator-langgraph/src .venv/bin/pytest orchestrator-langgraph/tests`
  - Result: manually terminated after hanging in `test_hybrid_e2e_smoke`; this
    is not part of the official CI gate.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`
  - Result: `All checks passed`.

## Reviewer Instructions

Return `Verdict: OK` or `Verdict: KO`. If KO, list required fixes.
