# Review Submission - Task W/0/1 (Trial 1)

## What was done
- Implemented `CodexAdapter.spawn` for supervised tmux sessions.
- Added Codex interactive launch line with policy-resolved model, reasoning effort, sandbox, and cwd.
- Implemented `ask`, `view`, and `kill` for Codex sessions using shared tmux helpers.
- Added dry-run support and lifecycle/input audit for supervised Codex flows.
- Added tests for attach info, launch line, disabled behavior, restricted denial before tmux, cwd guard, and ask/view/kill dry-run flow.
- Updated Codex adapter docs and CHANGELOG.

## Why
- MVP2.0 needs Codex as the supervised coder session, attachable through tmux and controlled via Gateway agent tools.
- W/0/0 made headless real; W/0/1 completes the supervised lifecycle.

## Decisions Taken
- `spawn` launches interactive `codex`, not `codex exec`.
- Real tmux/Codex execution remains operator validation; CI covers dry-run and preflight/guard behavior.
- `spawn` returns `launchCommand` for dry-run/test observability, matching the Claude model-selection pattern.

## Verification
- `node --test tests/gateway/codex_supervised.test.js` - passed.
- `node --test tests/gateway/codex_supervised.test.js tests/gateway/codex_adapter.test.js tests/gateway/tool_agent_model.test.js` - passed.
- `npm --prefix gateway test` - passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Commit
- `b40adfe` - `feat(codex): add supervised tmux lifecycle (W/0/1)`
