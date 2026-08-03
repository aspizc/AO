# Review Submission - Task A/0/5 (Trial 1)

## What was done
- Added executable `scripts/ci.sh` with `set -euo pipefail`.
- The CI script runs structure tests, gateway tests, and CLI tests in order.
- The CI script fails with a clear message if `pytest` is not available, and installs gateway dependencies only if `gateway/node_modules` is missing.
- Added `tests/structure/test_ci_script.py` covering script existence, content references to gateway/CLI/structure tests, and executable bit.
- Added README `Local Checks` instructions for creating the venv, installing `cli[dev]`, and running `./scripts/ci.sh`.
- Updated `CHANGELOG.md` with the A/0/5 entry.

## Why
- The repo needs one local gate command that future tasks and operators can run to confirm the scaffold is green.
- The script consolidates the manual verification commands from A/0/0 through A/0/4 without requiring real Gemini, Claude, or Codex CLIs.

## Decisions Taken
- Did not add optional GitHub Actions in this trial because the task marks it optional and the current requirement is local CI.
- Kept the task-provided behavior that runs `npm --prefix gateway install` only when `gateway/node_modules` is absent.
- Documented venv setup in README because the script intentionally requires `pytest` on PATH and should not guess how the operator manages Python environments.

## Verification
- Initial Red: `.venv/bin/pytest tests/structure -k ci_script` failed with 3 failures because `scripts/ci.sh` did not exist and was not executable.
- `.venv/bin/pytest tests/structure -k ci_script` - passed, 3 tests.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed with `==> All checks passed.`
- `stat -c '%a %n' scripts/ci.sh` - reported `775 scripts/ci.sh`, confirming executable mode.
- `rg -n "pytest|gateway|tests/cli|tests/structure|All checks passed|Local Checks" README.md scripts/ci.sh tests/structure/test_ci_script.py` - confirmed required terms are documented.

## Commit
- `7a58d38` - `feat(ci): local ci script and structure tests pass green (A/0/5)`
