# H/0/0 trial 1 to review

## Implemented

- Added `gateway/src/adapters/tmux_client.js` as a generic tmux adapter helper.
- Added command builders that return argument arrays:
  - `buildNewSessionCmd`
  - `buildSendKeysCmd`
  - `buildCapturePaneCmd`
  - `buildKillSessionCmd`
- Added execution wrappers:
  - `isTmuxAvailable`
  - `tmuxSync`
  - `tmuxAsync`
- Added `tests/gateway/tmux_client.test.js` covering command construction, default capture size, and tmux session create/kill integration.
- Updated `CHANGELOG.md`.

## Why

Stage H needs a generic tmux base client that future adapters can reuse without depending on any specific agent implementation. The command builders return arrays to avoid shell string construction and keep callers away from shell interpolation.

## Decisions

- The port keeps this layer intentionally low-level: it provides command builders and `spawn`/`spawnSync` wrappers, not higher-level session lifecycle abstractions. Later H tasks can compose these helpers.
- The integration test skips dynamically when `tmux -V` works but the environment cannot create tmux sessions. In this sandbox, session creation fails with `Operation not permitted`, so builder coverage still runs and the integration path is exercised only where tmux can actually start sessions.
- No references to agent-specific names were added to the tmux client.

## Verification

- Red: `node --test tests/gateway/tmux_client.test.js` failed before `gateway/src/adapters/tmux_client.js` existed.
- Green: `node --test tests/gateway/tmux_client.test.js`
- Green: `rg -n "gemini" gateway/src/adapters/tmux_client.js tests/gateway/tmux_client.test.js` found no references.
- Green: `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- `0748416 feat(adapters): add generic tmux client (H/0/0)`
