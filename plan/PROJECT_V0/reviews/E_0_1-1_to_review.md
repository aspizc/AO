# E/0/1 Trial 1 - To Review

## Summary

Implemented `agent-run policy check` for ad-hoc policy decisions using the gateway policy engine.

## What changed

- Added `gateway/scripts/policy-check.mjs`.
- Replaced the CLI `policy check` stub with a real command.
- Added flags:
  - `--agent`
  - `--role`
  - `--repo`
  - `--action`
  - `--artifact-kind`
  - `--artifact-classification`
  - `--target-agent`
  - `--target-role`
  - `--target-branch`
  - `--json`
- Human output includes decision, `ruleId`, and reason.
- JSON output returns the full `explain()` payload.
- Exit code is `0` only for `allow`; all other decisions exit non-zero.
- Added `tests/cli/test_policy_check.py`.
- Updated scaffold test and `CHANGELOG.md`.

## Decisions

- The Python CLI delegates to Node via `gateway/scripts/policy-check.mjs`, matching the existing `policy validate` pattern and keeping policy logic single-sourced in the gateway engine.
- `allow_with_sanitization` exits non-zero because the acceptance criteria say exit code `0` only if `allow`.

## Verification

- `PATH="$PWD/.venv/bin:$PATH" pytest tests/cli/test_policy_check.py tests/cli/test_cli_scaffold.py`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

Both passed.

## Commit

- `b1a1316 feat(cli): add policy check command (E/0/1)`
