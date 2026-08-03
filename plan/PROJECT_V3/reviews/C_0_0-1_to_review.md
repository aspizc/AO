# Review Submission - Task PROJECT_V3/C/0/0 (Trial 1)

## What was done
- Added bounded Python dependency ranges in `orchestrator-langgraph/pyproject.toml` and `cli/pyproject.toml`.
- Added the optional `orchestrator-langgraph[redis]` extra without making Redis a base dependency.
- Generated and committed a root `requirements.lock` with `uv pip compile`.
- Documented reproducible Python installation and lock regeneration in the root Quickstart.
- Updated the lazy Redis import error to mention `pip install "orchestrator-langgraph[redis]"`.
- Added structure coverage for Python dependency bounds, lockfile presence, lockfile content, Quickstart documentation, and the Redis extra message.
- Updated older LangGraph tests that expected unbounded dependency strings.

## Why
- Closes the V3 C/0/0 reproducibility gap: fresh installs should not silently resolve incompatible Python dependency versions, and Redis remains explicit opt-in functionality.

## Decisions Taken
- Lockfile strategy: one root `requirements.lock` generated with `uv pip compile cli/pyproject.toml orchestrator-langgraph/pyproject.toml --all-extras --python-version 3.13 --output-file requirements.lock`.
- `langgraph` bound: `>=1.2.1,<1.2.2`, intentionally narrow to keep the installed green version `1.2.1` and exclude `1.2.4`, which the task notes hangs the suite.
- `mcp` bound: `>=1.27.2,<2`, based on the installed `1.27.2`.
- `temporalio` bound: `>=1.28.0,<2`, based on the installed `1.28.0`.
- CLI upper bounds preserve existing minimums: `typer>=0.12,<1`, `rich>=13.7,<15`, `jsonschema>=4.21,<5`.
- Installed versions recorded before changing bounds:
  - `typer` 0.26.7
  - `rich` 15.0.0
  - `jsonschema` 4.26.0
  - `langgraph` 1.2.1
  - `mcp` 1.27.2
  - `temporalio` 1.28.0
  - `pytest` 9.0.3
  - `ruff` 0.15.16
  - `redis` not installed in the working venv

## Verification
- `.venv/bin/pytest tests/structure/test_python_reproducibility.py` - passed, 3 passed.
- `.venv/bin/pytest orchestrator-langgraph/tests` - passed, 81 passed, 3 skipped.
- `./scripts/ci.sh` - initial direct invocation failed before tests with `ruff: command not found` because `.venv/bin` was not on `PATH`.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed; all checks passed.

## Commit
- `49d3fdb9a1eb212be844950b57c14dea3e6334d7` - chore(v3): pin python dependencies and lock environment (PROJECT_V3 C/0/0)
