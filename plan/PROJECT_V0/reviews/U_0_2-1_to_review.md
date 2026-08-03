# U/0/2 Trial 1 - To Review

## Implemented

- Rewrote top-level `README.md` for post-MVP onboarding.
- Added `docs/adr/ADR-004-mvp-scope.md`.
- Added `tests/structure/test_mvp_docs.py`.
- Updated `CHANGELOG.md`.

## Why

U/0/2 closes the MVP documentation gap: a new operator needs a concise README, and reviewers need an ADR that distinguishes MVP scope from deferred work.

## Decisions

- Documented the actual MVP scope implemented in this repository: Gemini and Claude adapters, generic MCP config, dry-run E2E, policy/audit/state/artifact/approval/session/orchestration/task flows.
- Kept Codex adapter promotion and message store deferred because the current MVP order marks Codex optional and message store consumer-dependent.
- Kept IDE-specific configs out of scope, matching the global project convention and operator guide.
- Linked ADR-002 from README to reinforce that the orchestrator is a role, not a process.

## TDD Evidence

- First added `tests/structure/test_mvp_docs.py`.
- Initial failure: missing `docs/adr/ADR-004-mvp-scope.md` and README missing final-doc links/wording.
- Updated README and ADR until the focused test passed.

## Verification

- `PATH="$PWD/.venv/bin:$PATH" pytest tests/structure/test_mvp_docs.py`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `61ef933 docs: close MVP scope docs (U/0/2)`
