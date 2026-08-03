# Review Submission - Task Z/0/2 (Trial 1)

## What was done
- Added `client-config/profiles/planner-assisted/mcp.json`.
- Added `client-config/profiles/planner-assisted/.env.example`.
- Added `client-config/profiles/planner-assisted/README.md`.
- Linked the profile from `client-config/README.md`.
- Added `tests/structure/test_planner_assisted_profile.py`.
- Updated `CHANGELOG.md`.

## Why
- Z/0/2 needs a host-agnostic MCP profile for running the assisted planning loop with Claude planner and Claude apply-coder over this repository.

## Decisions Taken
- Kept `AGENTS_DRY_RUN=1` as the safe default.
- Used base `./policies` rather than the MVP2 profile because this loop does not use Codex.
- Excluded Codex env vars from the profile.
- Required `AGENTS_REPO_ROOTS` to be replaced with the absolute path to this `agents-orchestrator` checkout.

## Verification
- `.venv/bin/pytest tests/structure/test_planner_assisted_profile.py tests/structure/test_generic_mcp_config.py` - passed, 9 tests.
- `node -e "JSON.parse(require('fs').readFileSync('client-config/profiles/planner-assisted/mcp.json','utf8')); console.log('json ok')"` - passed.
- `grep -q agents-orchestrator policies/repositories.json && echo "repo registrado"` - passed.
- `.venv/bin/pytest tests/structure` - passed, 90 tests.

## Commit
- `2b8b402` - `docs(config): add planner assisted MCP profile (Z/0/2)`
