# Review Submission - Task Y/0/3 (Trial 1)

## What was done
- Added the post-review `code.apply` approval gate to `prompts/orchestrator_mvp2_two_agent.md`.
- Documented autonomous mode for the MVP2 coder+reviewer flow: `AGENTS_AUTOAPPROVE=code.apply`, reviewer still required, reviewer KO stops the flow, no autonomous push.
- Documented `AGENTS_AUTOAPPROVE` in `client-config/profiles/codex-coder-claude-reviewer/.env.example`.
- Added an Autonomous Mode section to `docs/mvp2-orchestrator-runbook.md`, including audit guidance for `APPROVAL_AUTO_GRANTED`.
- Added `tests/gateway/code_autoapprove_scope.test.js` covering default pending, auto-grant, protected push, and restricted context behavior.
- Updated `CHANGELOG.md`.

## Why
- Q/0/5 provides the shared auto-approval mechanism; Y/0/3 defines and documents the concrete `code.apply` scope for the MVP2 coder+reviewer flow.

## Verification
- `npm --prefix gateway test -- ../tests/gateway/code_autoapprove_scope.test.js` - passed; Gateway suite 62 passed.
- `.venv/bin/pytest tests/structure/test_mvp2_orchestrator_prompt.py tests/structure/test_mvp2_runbook.py tests/structure/test_mvp2_mcp_profile.py` - passed, 18 tests.
- `node scripts/smoke_mvp2.mjs` - passed in dry-run mode.
- `AGENTS_AUTOAPPROVE=code.apply node scripts/smoke_mvp2.mjs` - passed in dry-run mode.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed; structure 93 passed, gateway node tests 62 passed, e2e 4 passed, MCP smoke OK, policy validate OK, CLI pytest 29 passed.

## Commit
- `6fe0c60` - `docs(mvp2): add code apply autonomous scope (Y/0/3)`
