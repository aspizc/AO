# U/0/1 Trial 1 - To Review

## Implemented

- Added `docs/mvp-acceptance-checklist.md`.
- Represented all 27 acceptance criteria from V4 section 30.
- Added evidence references for every criterion.
- Left every status unchecked so a reviewer remains the authority for marking completion.
- Added `tests/structure/test_acceptance_checklist.py`.
- Updated `CHANGELOG.md`.

## Why

U/0/1 turns the V4 acceptance section into a traceable MVP contract. Each row maps a criterion to tests, documents, or manual-review evidence.

## Decisions

- Used the real V4 section 30 list instead of the shorter example table in the task file.
- Kept statuses as `[ ]` even when evidence exists because the task states that a reviewer, not the implementer, must verify completion.
- Mapped the IDE-specific V4 criterion to the current host-agnostic MCP config and operator guide because the operative plan explicitly keeps Cursor and Antigravity out of scope.
- Referenced open human-check files where they materially affect acceptance interpretation.

## TDD Evidence

- First added `tests/structure/test_acceptance_checklist.py`.
- Initial failure: all tests failed because `docs/mvp-acceptance-checklist.md` did not exist.
- Added the checklist until the focused test passed.

## Verification

- `PATH="$PWD/.venv/bin:$PATH" pytest tests/structure/test_acceptance_checklist.py`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `c1886d0 docs: add MVP acceptance checklist (U/0/1)`
