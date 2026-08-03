# Review Submission - Task PROJECT_V3/B/0/1 (Trial 1)

## What was done
- Documented the existing Gateway tool error contract in `docs/gateway-error-contract.md`, based on `tool_helpers.js`, `mcp_server.js`, `gateway_client.py`, and existing Gateway tests.
- Added `orchestrator_langgraph._contracts` with shared `raise_on_tool_error` and `require_state` helpers.
- Replaced the duplicated LangGraph `_raise_on_tool_error` and `_require` helpers with imports from `_contracts`.
- Fixed cross-module helper imports in `hybrid_smoke.py` and `implement_test_review_push.py`.
- Added `orchestrator-langgraph/tests/test_contracts.py` covering `error`, `code`, `tool_error`, `isError`, OK payloads, redaction/truncation, and required state handling.
- Updated `CHANGELOG.md` under `## Unreleased` with `Closes V3 B/0/1`.

## Why
- Previous helpers detected different subsets of Gateway error fields, so a decoded payload with `code` could fail visibly in one flow and pass silently in another.
- A single Python contract keeps all LangGraph flows aligned with the real Gateway envelope/body behavior without changing `gateway/src`.

## Decisions Taken
- The Python helper treats any truthy `error`, `code`, `tool_error`, or `isError` field as a tool error.
- Error messages include the tool name and a redacted/truncated payload. Prompt, content, stdout/stderr, token, secret, password, and authorization-like fields are redacted before formatting.
- `require_state` preserves the shared behavior of rejecting missing or empty values and returns the value as a string.
- No existing tests depended on a field being ignored; the broader `code` detection is the intended bug fix.

## Verification
- `.venv/bin/pytest orchestrator-langgraph/tests/test_contracts.py` - passed, 11 tests.
- `.venv/bin/pytest orchestrator-langgraph/tests` - passed, 81 passed and 3 skipped.
- `rg -n "def _raise_on_tool_error|def _require" orchestrator-langgraph/src` - no duplicate local helper definitions found.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - initially hung in the sandbox during the final LangGraph suite after earlier stages had passed; rerun outside the sandbox per task instruction and passed with `==> All checks passed.`

## Commit
- `fd32987` - `feat(v3): share LangGraph Gateway tool contracts (PROJECT_V3 B/0/1)`
