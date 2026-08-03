# Review Submission - Task B/0/5 (Trial 1)

## What was done
- Added executable `gateway/scripts/validate-registries.mjs` that loads registries through the B/0/4 Node loader and emits JSON to stdout.
- Replaced the `agent-run policy validate` stub with a real Typer command that delegates to the Node validator through `subprocess.run`.
- Added `--policies-dir` to validate alternate registry directories and `--json` for machine-readable output.
- Added `tests/cli/test_policy_validate.py` covering success, failure with missing registries, and valid JSON output.
- Updated the previous CLI scaffold test so `policy check` remains the stub assertion while `policy validate` becomes real.
- Documented `agent-run policy validate` and `agent-run policy validate --json` in README.
- Updated `CHANGELOG.md` with the B/0/5 entry.

## Why
- Operators need a terminal command to validate registry edits without starting the Gateway or duplicating validation logic in Python.
- Delegating to the Node loader keeps registry validation truth in one implementation and exposes clear status for humans and automation.

## Decisions Taken
- Kept the Node helper stdout as JSON only, both for success and failure, so the Python CLI can safely parse it and `--json` can re-emit machine-readable output.
- Used Rich only for human-mode status formatting; `--json` uses plain `typer.echo(json.dumps(data))` and emits no extra text.
- Updated `test_cli_scaffold.py` from `policy validate` stub to `policy check` stub because B/0/5 intentionally makes validate real.
- Preserved explicit handling for missing `node` and missing validator script with exit code 2.

## Verification
- Initial Red: `PATH="$PWD/.venv/bin:$PATH" pytest tests/cli/test_policy_validate.py` failed with 3 failures because `policy validate` still exited as stub and did not accept the new options.
- `PATH="$PWD/.venv/bin:$PATH" pytest tests/cli` - passed, 8 tests.
- `PATH="$PWD/.venv/bin:$PATH" agent-run policy validate` - passed and printed `OK` with counts `agents: 3  repos: 4  roles: 8`.
- `PATH="$PWD/.venv/bin:$PATH" agent-run policy validate --json` - passed and emitted valid JSON.
- `PATH="$PWD/.venv/bin:$PATH" agent-run policy validate --json | python3 -m json.tool` - passed.
- `PATH="$PWD/.venv/bin:$PATH" agent-run policy validate --policies-dir /tmp/empty` - exited non-zero and printed `FAIL REGISTRY_MISSING`.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed with `==> All checks passed.`
- `node gateway/scripts/validate-registries.mjs` - passed and emitted JSON to stdout.

## Commit
- `6a478fd` - `feat(cli): real agent-run policy validate via node validator (B/0/5)`
