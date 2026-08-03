# Review Submission - Task PROJECT_V1/A/0/2 (Trial 1)

## What was done

- Added `DelegateReviewState` for the minimal graph state contract.
- Added async `delegate_node` that calls `agent.delegate` as Codex coder.
- Added async `review_node` that calls `agent.delegate` as Claude reviewer.
- Added `START -> delegate -> review -> END` LangGraph construction.
- Added `FixtureGatewayClient` and JSON fixture responses for dry-run tests.
- Added tests for final reviewed status, trace propagation, and Gateway call order.
- Updated `CHANGELOG.md`.

## Why

- PROJECT_V1/A/0/2 needs the first deterministic LangGraph proof that nodes can
  call Gateway tools through an injected client without changing the Gateway.

## Decisions Taken

- Did not add or rename a Gateway `agent.review` tool. The current Gateway
  contract has no `agent.review`; existing review flows use `agent.delegate`
  with `role="reviewer"` plus `artifact.put(review_notes)`. The graph preserves
  that contract and exposes the second step as `review_node`.
- Kept policy logic out of the graph; Gateway tool calls remain the policy
  boundary.
- Kept dry-run deterministic through fixture responses rather than a real MCP
  subprocess.

## Verification

- `.venv/bin/pytest orchestrator-langgraph/tests/test_delegate_review_graph.py` - initially failed before implementation, then passed, 3 tests.
- `.venv/bin/pytest orchestrator-langgraph/tests` - passed, 9 tests, 1 skipped.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Commit

- `3910a99` - `feat(v1): add delegate-review LangGraph (PROJECT_V1 A/0/2)`
