# E/0/2 Trial 1 - To Review

## Summary

Implemented shared CLI output helpers for consistent human and JSON output across operator commands.

## What changed

- Added `cli/src/agents_cli/output.py`.
- Refactored `policy validate`, `policy check`, and `audit show` to use shared helpers.
- Added Rich table output for:
  - `policy validate`
  - `audit show`
- Kept policy decision human output centralized via `render_decision`.
- Centralized stderr failures through `fail`.
- Added `tests/cli/test_cli_output.py`.
- Updated `CHANGELOG.md`.

## Decisions

- `policy validate --json`, `policy check --json`, and `audit show --json` all emit JSON through the same `emit` helper.
- Human `audit show` now renders a Rich table. Empty audit output remains `(no events)` to preserve the existing operator-friendly behavior.
- Non-allow policy decisions remain stdout decisions, not stderr errors; actual command/environment failures go through stderr.

## Verification

- `PATH="$PWD/.venv/bin:$PATH" pytest tests/cli`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `d153a1a feat(cli): add shared rich output helpers (E/0/2)`
