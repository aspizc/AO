# Review Submission - Task U/0/5 (Trial 1)

## What was done
- Added `tests/structure/test_operational_usability_gate.py` to lock the operational usability evidence into structure tests.
- Updated README with the supported practical dry-run flow:
  `human-facing orchestrator -> Gateway MCP -> coder child + reviewer child`.
- Updated the MVP acceptance checklist so criteria 7, 12, and 15-17 reference the real MCP two-agent E2E and `tool_agent` coverage.
- Marked Codex as optional/post-MVP evidence covered by P/0/3, not a requirement for the Gemini + Claude restricted path.
- Updated CHANGELOG. Closes U/0/5.

## Why
- The MVP should not be considered operationally usable only because in-process services pass. The contract now explicitly requires the real MCP stdio two-agent flow and smoke coverage.

## Decisions Taken
- Did not change `scripts/ci.sh`: it already runs all `tests/e2e/**/*.test.js`, which now includes `mcp_two_agent_workflow.test.js`, and it already runs `scripts/smoke_mcp.mjs`.
- Added a structure test instead of checking checklist items `[x]`; the checklist remains reviewer-authoritative.

## Verification
- `.venv/bin/pytest tests/structure/test_operational_usability_gate.py tests/structure/test_acceptance_checklist.py tests/structure/test_regression_gate.py` - passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - all checks passed.

## Commit
- `55eb792` - `docs: add operational usability gate (U/0/5)`

