# O/0/1 Trial 1 - To Review

## Implemented

- Added `gateway/src/adapters/claude_adapter.js`.
- Implemented the same public adapter interface as Gemini: `delegate`, `spawn`, `ask`, `view`, and `kill`.
- Added policy preflight for `delegate`, `spawn`, and `ask`.
- Added cwd protection through `assertSafeCwd` before headless or supervised work starts.
- Added deterministic dry-run behavior for headless and supervised paths.
- Added real headless invocation using `claude --print --output-format json --permission-mode dontAsk --no-session-persistence <prompt>`.
- Added supervised tmux lifecycle through existing tmux helpers and `buildTmuxTarget`.
- Added audit events for session start, input, close, and adapter errors.
- Added `tests/gateway/claude_adapter.test.js`.
- Updated `CHANGELOG.md`.

## Why

O/0/1 requires a Claude Code adapter with the same operational surface as the Gemini adapter so later agent tooling can use `claude-code` without adapter-specific branches.

## Decisions

- Used `claude-code` as the adapter id, matching `policies/agent-capabilities.json`.
- Supported `AGENTS_CLAUDE_BIN` and `config.claudeBin`, defaulting to `claude`.
- Implemented real headless mode instead of a non-dry-run error because O/0/0 verified `claude --print` locally and documented the supported flags.
- Used `spawnSync` with array arguments and no shell.
- Kept supervised mode under the gateway-owned tmux helpers instead of Claude Code's `--tmux`, matching the O/0/0 research decision and Gemini's lifecycle.
- Did not add a new automatic default adapter registry because the current codebase only exposes a generic `createAdapterRegistry` and does not auto-register Gemini either. The Claude adapter is exposed by its own module, mirroring `gemini_adapter.js`; the later AgentService/tool wiring can register it explicitly where that construction point exists.

## TDD Evidence

- First added `tests/gateway/claude_adapter.test.js`.
- Initial useful failure: `ERR_MODULE_NOT_FOUND` for `gateway/src/adapters/claude_adapter.js`.
- Implemented the adapter until the focused test passed.

## Verification

- `node --test tests/gateway/claude_adapter.test.js`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `7b3de4a feat(adapters): add claude adapter (O/0/1)`
