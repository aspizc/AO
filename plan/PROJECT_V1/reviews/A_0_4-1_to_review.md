# Review Submission - Task PROJECT_V1/A/0/4 (Trial 1)

## What was done

- Added `docs/adr/ADR-V1-01-langgraph-gateway-client.md`.
- Added structural tests in `tests/structure/test_v1_stage_a.py`.
- Updated `plan/PROJECT_V1/A/README.md` to mark Stage A closed.
- Updated `CHANGELOG.md`.

## Why

- PROJECT_V1/A/0/4 formalizes the Stage A design decision that LangGraph is a
  Gateway client and the MCP contract remains immutable.

## Decisions Taken

- ADR sections use the task-required headings: `Contexto`, `Decision`,
  `Consecuencias`, and `Estado`.
- `test_no_gateway_modification_in_stage_a` inspects real Stage A implementation
  commits whose subjects include `PROJECT_V1 A/0/`, excluding review-only
  commits, and asserts none changed `gateway/` or `tests/gateway/`.
- The README table now tracks `Estado` rather than branch names because Stage A
  is closed.

## Verification

- `.venv/bin/pytest tests/structure/test_v1_stage_a.py` - initially failed before ADR creation, then passed, 3 tests.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Commit

- `f306254` - `docs(v1): close Stage A with LangGraph Gateway ADR (PROJECT_V1 A/0/4)`
