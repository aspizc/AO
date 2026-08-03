# Review Submission - Task PROJECT_V1/A/0/3 (Trial 1)

## What was done

- Added an LLM-path audit fixture for the delegate-review flow.
- Added `test_audit_parity.py` with `normalize_audit_event`.
- Added `AuditRecordingGatewayClient` test double to capture Gateway-like audit
  events from the LangGraph dry-run path.
- Added parity test comparing normalized LLM-path and LangGraph-path events.
- Added trace presence test for all generated events.
- Updated `CHANGELOG.md`.

## Why

- PROJECT_V1/A/0/3 requires a reproducible test proving downstream audit parity
  for the `delegate -> review` path without requiring a real Gateway process.

## Decisions Taken

- Kept audit generation out of production LangGraph code. The recording client
  lives only in tests and represents Gateway-written audit around tool calls.
- Normalized away timestamps, generated IDs, `session_id`, and `task_id`.
- Compared only the stable downstream contract requested by the task:
  `event_type`, `tool_name`, `actor_role`, and trace presence.

## Verification

- `.venv/bin/pytest orchestrator-langgraph/tests/test_audit_parity.py` - passed, 2 tests.
- `.venv/bin/pytest orchestrator-langgraph/tests` - passed, 11 tests, 1 skipped.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Commit

- `acd124c` - `test(v1): add audit parity test (PROJECT_V1 A/0/3)`
