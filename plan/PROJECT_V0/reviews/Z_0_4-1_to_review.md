# Review Submission - Task Z/0/4 (Trial 1)

## What was done
- Added the `plan.apply` approval gate to `prompts/orchestrator_planning_loop.md`.
- Documented autonomous mode for the planning loop: `AGENTS_AUTOAPPROVE=plan.apply`, planner review still required, unresolved open decisions use the planner recommendation with an audit-visible record, and no autonomous push.
- Documented `AGENTS_AUTOAPPROVE` in `client-config/profiles/planner-assisted/.env.example`.
- Added an Autonomous Mode section to `docs/planning-loop-runbook.md`, including audit guidance for `APPROVAL_AUTO_GRANTED`.
- Added `tests/gateway/plan_autoapprove_scope.test.js` covering default pending, auto-grant, and protected push behavior.
- Updated `CHANGELOG.md`.

## Why
- Q/0/5 provides the shared auto-approval mechanism; Z/0/4 defines and documents the concrete `plan.apply` scope for the assisted planning loop.

## Verification
- `npm --prefix gateway test -- ../tests/gateway/plan_autoapprove_scope.test.js` - passed; Gateway suite 63 passed.
- `.venv/bin/pytest tests/structure/test_planner_loop_prompts.py tests/structure/test_planner_assisted_profile.py tests/structure/test_planning_runbook_smoke.py` - passed, 10 tests.
- `node scripts/smoke_planning.mjs` - passed in dry-run mode.
- `AGENTS_AUTOAPPROVE=plan.apply node scripts/smoke_planning.mjs` - passed in dry-run mode.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed; structure 93 passed, gateway node tests 63 passed, e2e 4 passed, MCP smoke OK, policy validate OK, CLI pytest 29 passed.

## Commit
- `ad8d51c` - `docs(planning): add plan apply autonomous scope (Z/0/4)`
