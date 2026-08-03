# D/0/3 Trial 1 - To Review

## Summary

Implemented `agent-run audit show` backed by the Node audit reader.

## What changed

- Added `gateway/scripts/query-audit.mjs`.
- Replaced the CLI `audit show` stub with a real command.
- Added support for:
  - `--trace-id`
  - `--type`
  - `--limit`
  - `--json`
- Added human-readable output for normal events.
- Added `!CORRUPT` display for corrupt audit line markers.
- Updated scaffold CLI test to expect the command to be wired.
- Added `tests/cli/test_audit_show.py`.
- Updated `CHANGELOG.md`.

## Decisions

- The Python CLI shells out to Node for audit querying, matching the existing `policy validate` subprocess pattern and keeping audit parsing in the gateway core.
- The command inherits the caller environment so `AGENTS_WORKSPACE` and `AGENTS_AUDIT_LOG` work consistently with `loadConfig`.

## Verification

- `PATH="$PWD/.venv/bin:$PATH" pytest tests/cli/test_audit_show.py tests/cli/test_cli_scaffold.py`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `c7f9fcf feat(cli): add audit show command (D/0/3)`
