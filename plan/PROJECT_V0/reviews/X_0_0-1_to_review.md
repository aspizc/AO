# Review Submission - Task X/0/0 (Trial 1)

## What was done
- Added `client-config/profiles/codex-coder-claude-reviewer/mcp.json` for the MVP2.0 real two-agent Gateway profile.
- Added `.env.example` documenting required runtime variables, absolute `AGENTS_REPO_ROOTS`, and dry-run rehearsal.
- Added profile README with agents, expected models, policy profile, and operator notes.
- Linked the profile from `client-config/README.md`.
- Added structure tests for JSON validity, real mode, MVP2 policy directory, placeholder repo path, env docs, and profile docs.
- Updated CHANGELOG.

## Why
- Operators need a host-agnostic MCP profile to launch a terminal host against the Gateway with Codex coder and Claude reviewer.
- The profile must use the MVP2 policies directory so Codex is enabled only for non-restricted repositories.

## Decisions Taken
- Kept the profile host-agnostic and avoided IDE-specific keys.
- Used a placeholder `REPLACE_WITH_ABSOLUTE_WORK_REPO_PATH` instead of hardcoding a local path.
- Kept model defaults in policies rather than env variables.

## Verification
- `.venv/bin/pytest tests/structure/test_mvp2_mcp_profile.py tests/structure/test_generic_mcp_config.py` - passed.
- `node -e "JSON.parse(require('fs').readFileSync('client-config/profiles/codex-coder-claude-reviewer/mcp.json','utf8')); console.log('json ok')"` - passed.
- `test -f policies/profiles/mvp2/agent-capabilities.json && echo profile ok` - passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Commit
- `4dcd966` - `feat(config): add MVP2 two-agent MCP profile (X/0/0)`
