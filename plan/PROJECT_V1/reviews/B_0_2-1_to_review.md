# Review Submission - Task PROJECT_V1/B/0/2 (Trial 1)

## What was done

- Added `orchestrator_langgraph/selector.py`.
- Added canonical flow constants for `implement-test-review-push` and
  `plan-refine`.
- Added env var resolution:
  `AGENTS_ORCHESTRATOR_IMPLEMENT_TEST_REVIEW_PUSH` and
  `AGENTS_ORCHESTRATOR_PLAN_REFINE`.
- Added conservative default selection to `llm`.
- Added visible failures for unknown flows and invalid env values.
- Added `OrchestratorSelection.to_artifact()` for structured JSON-serializable
  audit/artifact payloads outside Gateway internals.
- Added selector tests for default, override, invalid value, unknown flow, and
  JSON serialization.
- Updated `CHANGELOG.md`.

## Why

- PROJECT_V1/B/0/2 needs explicit local routing between LLM and LangGraph flows
  without changing Gateway state or MCP schemas.

## Decisions Taken

- The selector does not call the Gateway and does not mutate Gateway metadata.
- Empty or missing env vars default to `llm`.
- Env values are normalized case-insensitively after stripping whitespace.
- The decision object carries `flow`, `selected`, `source`, and `env_var` so it
  can be stored as an external artifact or audit payload later.

## Verification

- `.venv/bin/pytest orchestrator-langgraph/tests/test_selector.py` - initially failed before implementation, then passed, 5 tests.
- `.venv/bin/pytest orchestrator-langgraph/tests` - passed, 27 tests, 2 skipped.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Commit

- `24d7f40` - `feat(v1): add hybrid orchestrator selector (PROJECT_V1 B/0/2)`
