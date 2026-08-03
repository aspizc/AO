# Review Submission - Task B/0/4 (Trial 1)

## What was done
- Added a Stage B hybrid smoke runner that records selector decisions with `artifact.put`.
- Added a LangGraph smoke path for `implement-test-review-push` that exercises Gateway tools and approvals.
- Added a default LLM smoke path that records the selector decision without running the graph.
- Added `ADR-V1-02 - Hybrid Orchestrator Selector`.
- Added structure coverage for ADR-V1-02 and updated `CHANGELOG.md`.

## Why
- PROJECT_V1 B/0/4 closes Stage B by proving the selector can choose LangGraph or LLM while preserving the Gateway MCP boundary.
- The stage must validate approvals from the graph without depending on a nonexistent `git push` MCP tool.

## Decisions Taken
- The hybrid smoke records `orchestrator_selection` as an internal artifact before routing.
- `llm` remains the default selection and does not run a LangGraph graph.
- The LangGraph smoke uses the existing `implement-test-review-push` graph and fixture Gateway calls, including `approval.request` and `approval.wait`.
- ADR-V1-02 states that the selector is outside the Gateway and both callers use the same MCP tools.

## Verification
- `.venv/bin/pytest orchestrator-langgraph/tests/test_hybrid_e2e_smoke.py` - passed, 2 tests.
- `.venv/bin/pytest tests/structure/test_v1_stage_b_plan.py` - passed, 4 tests.
- `.venv/bin/pytest orchestrator-langgraph/tests` - passed, 32 passed and 2 skipped.
- `.venv/bin/pytest tests/structure` - passed, 100 tests.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Commit
- `60f39be` - `feat(v1): add hybrid smoke and ADR (PROJECT_V1 B/0/4)`

## Notes
- PR draft creation is not included because this workflow does not push branches unless the human explicitly asks.
