# O/0/0 Trial 1 - To Review

## Implemented

- Added `docs/adapters/claude-code.md` documenting Claude Code CLI invocation assumptions.
- Documented the default binary, local observed path, and tested version.
- Confirmed and documented headless mode through `claude --print`.
- Documented the supervised tmux mode expected for the future adapter.
- Documented dry-run fallback requirements.
- Added a manual verification checklist with `claude --version`.
- Added structural tests for the documentation.
- Updated `CHANGELOG.md`.

## Why

O/0/0 exists to remove adapter implementation ambiguity before coding the Claude adapter. The document records which Claude CLI features are verified locally and how the future adapter should map them onto the existing gateway adapter patterns.

## Decisions

- Recorded `2.1.150 (Claude Code)` because `claude --version` succeeds locally.
- Documented `claude --print "<prompt>"` as the minimal verified headless command because `claude --help` explicitly describes `-p` / `--print` for non-interactive output.
- Proposed `claude --print --output-format json --permission-mode dontAsk --no-session-persistence "<prompt>"` as the preferred adapter command shape because those flags are listed in `claude --help` and keep headless calls structured and non-persistent.
- Explicitly rejected `--dangerously-skip-permissions` and `--allow-dangerously-skip-permissions` for the adapter because they bypass CLI permission checks and are unnecessary for this gateway policy model.
- Kept supervised mode on the gateway-owned tmux helpers instead of Claude Code's `--tmux`, because existing adapters own tmux lifecycle through `tmux_client.js` and session naming helpers.

## Verification

- `claude --version`
- `claude --help`
- `PATH="$PWD/.venv/bin:$PATH" pytest tests/structure/test_claude_adapter_docs.py`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

All tests passed.

## Commit

- `7d13269 docs(adapters): document claude cli invocation (O/0/0)`
