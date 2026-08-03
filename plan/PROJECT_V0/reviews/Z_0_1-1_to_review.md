# Review Submission - Task Z/0/1 (Trial 1)

## What was done
- Added `prompts/planner_system_prompt.md` for planner draft/review/escalation behavior.
- Added `prompts/planner_apply_coder_prompt.md` for the plan apply coder with `plan/**` scope and open-decision TODO markers.
- Added `prompts/orchestrator_planning_loop.md` describing the draft/apply/review/escalate/converge flow and human approval gates.
- Added `tests/structure/test_planner_loop_prompts.py`.
- Updated `CHANGELOG.md`.

## Why
- Z/0/1 needs precise role instructions so the assisted planning loop can be run consistently without letting prompts become the security boundary.

## Decisions Taken
- Used the exact section heading `OPEN DECISIONS / QUESTIONS FOR HUMAN` for planner escalation.
- Kept `Gateway policy is the authority` explicit in the planner prompt.
- Made the coder prompt stricter than policy by instruction: only `plan/**`, no `policies/`, `gateway/`, `tests/`, production code, push, or commits without operator approval.

## Verification
- `.venv/bin/pytest tests/structure/test_planner_loop_prompts.py` - passed, 4 tests.
- `PATH="$PWD/.venv/bin:$PATH" agent-run policy validate` - passed.
- `.venv/bin/pytest tests/structure` - passed, 87 tests.

## Commit
- `b0de791` - `docs(prompts): add planning loop prompts (Z/0/1)`
