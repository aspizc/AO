# T/0/1 Trial 1 - To Review

## Summary

Added the client-agnostic system prompt for the orchestrator role.

## What changed

- Added `prompts/orchestrator_system_prompt.md`.
- Added `tests/structure/test_orchestrator_prompt.py`.
- Covered:
  - role and Gateway identity
  - available tool families
  - standard orchestration flow
  - hard limits
  - raw restricted artifact boundaries
  - async approval semantics
  - `policy.check` decision values
  - absence of IDE-specific terminology
- Updated `CHANGELOG.md`.

## Decisions

- The prompt explicitly says it aligns behavior but is not the security boundary; the Gateway policy engine remains authoritative.
- Approval decisions are assigned to the human operator, while the orchestrator may request, poll, or wait.
- The prompt is focused and omits host-specific setup details, which stay in `client-config/` and later operator docs.

## Verification

- `PATH="$PWD/.venv/bin:$PATH" pytest tests/structure/test_orchestrator_prompt.py`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `96c0536 docs(prompts): add orchestrator system prompt (T/0/1)`
