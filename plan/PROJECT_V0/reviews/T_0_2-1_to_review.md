# T/0/2 Trial 1 - To Review

## Implemented

- Added `docs/operator-guide.md`.
- Covered prerequisites, installation, policy validation, CI, MCP stdio launch, orchestrator prompt loading, first dry-run, approvals, troubleshooting, and out-of-scope items.
- Kept the guide host-agnostic and explicitly avoided IDE-specific setup.
- Added `tests/structure/test_operator_guide.py`.
- Updated `CHANGELOG.md`.

## Why

U/0/0 depends on T/0/2, and operators need a client-agnostic path from a fresh clone to a local dry-run without reading Gateway internals.

## Decisions

- Used placeholders such as `<this repo>`, `<traceId>`, and `<allowed repo path>` instead of operator-local absolute paths.
- Mentioned Cursor and Antigravity only in the out-of-scope framing, as required by the task.
- Linked the generic MCP config and orchestrator system prompt rather than documenting any specific MCP host.
- Included stdout corruption in troubleshooting because stdout must remain reserved for MCP.

## TDD Evidence

- First added `tests/structure/test_operator_guide.py`.
- Initial failure: all four tests failed because `docs/operator-guide.md` did not exist.
- Added the guide until the focused test passed.

## Verification

- `PATH="$PWD/.venv/bin:$PATH" pytest tests/structure/test_operator_guide.py`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `6b03734 docs: add operator guide (T/0/2)`
