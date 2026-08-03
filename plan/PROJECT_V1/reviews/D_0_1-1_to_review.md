# Review Submission - Task D/0/1 (Trial 1)

## What was done
- Added `orchestrator_langgraph.activities` with `delegate_activity`, `review_activity`, and `push_activity` wrappers.
- Added input/output dataclass contracts for each activity.
- Added deterministic `activity_id` generation from `trace_id`, `node_name`, and `attempt_number`.
- Added local retry memoization keyed by `(tool, activity_id)` to avoid duplicate Gateway calls in the same worker process.
- Routed all MCP effects through the existing `GatewayClient`.
- Registered the three activity wrappers in the Temporal worker alongside the healthcheck activity.
- Documented the current Gateway schema limitation: there is no explicit idempotency-key field yet, so activities do not send unsupported `metadata` or `context` arguments.
- Updated `CHANGELOG.md`.

## Why
- PROJECT_V1 Stage D needs MCP effects isolated behind Temporal activities before wrapping the full `implement-test-review-push` workflow.

## Delegated Coder Run
- Trace: `tr-2251501e-9fc4-4956-a1ef-1d5bebda3004`.
- Task: `ts-b79c72cf-3ffb-4836-bb87-a880d6a5b1f8`.
- Session: `ss-b424613e-1647-44ba-a402-f9a83ba41a7d`.
- Artifact: `art-887c056b-941f-4977-b4e6-599a67d10293`.

## Decisions Taken
- Preserved current Gateway MCP tool schemas instead of sending unsupported `metadata` or `context` fields.
- Kept idempotency local to the activity runner for this task; durable cross-worker idempotency remains a later Gateway capability.
- Included the Gateway tool name in the cache key to prevent cross-activity result collisions.
- Kept failures visible by letting `GatewayClient` exceptions propagate and by treating body-level `error`/`code` results as failures.

## Verification
- `PYTHONPATH=orchestrator-langgraph/src .venv/bin/pytest orchestrator-langgraph/tests/test_temporal_activities.py orchestrator-langgraph/tests/test_temporal_worker.py` - passed, 15 tests after the reviewer-recommended cache-key hardening.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed after the final hardening.

## Notes
- The coder's delegated environment lacked pytest, so repo-local verification was performed by the orchestrator.
- Reviewer returned OK before the cache-key hardening and recommended including the tool name in the key; that recommendation was applied and verified.
