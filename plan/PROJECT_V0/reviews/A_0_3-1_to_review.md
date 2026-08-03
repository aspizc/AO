# Review Submission - Task A/0/3 (Trial 1)

## What was done
- Added `cli/pyproject.toml` for the `agents-cli` Python package with Typer, Rich, jsonschema, pytest dev dependency, Hatchling build backend, and `agent-run` console script.
- Added `cli/src/agents_cli/main.py` with a Typer root app, global `--version`, `policy` and `audit` sub-apps, and stub commands for `policy validate`, `policy check`, `audit show`, and `approve`.
- Added `tests/cli/test_cli_scaffold.py` covering help output, version output, stub exit code 2, and future-task references in stub output.
- Updated `CHANGELOG.md` with the A/0/3 entry.

## Why
- The operator needs a standalone Python CLI foundation for later registry, policy, audit, and approval tasks without coupling that interface to the Node gateway.
- The scaffold keeps later CLI behavior testable while intentionally avoiding real business logic in this task.

## Decisions Taken
- Used the task's Hatchling packaging layout exactly and installed it in editable mode in `.venv` for verification.
- Kept `_version()` backed by package metadata with a local fallback so `--version` works both after installation and during direct local imports.
- Added assertions for future-task references in stub outputs because the acceptance criteria require every stub to identify the task that will implement it.
- Did not implement any real policy, audit, or approval logic because those are explicitly deferred to later tasks.

## Verification
- Initial Red: `.venv/bin/pytest tests/cli` failed with `ModuleNotFoundError: No module named 'agents_cli.main'` before `main.py` was added.
- `.venv/bin/pytest tests/cli` - passed, 5 tests.
- `.venv/bin/agent-run --help` - passed and listed `policy`, `audit`, and `approve`.
- `.venv/bin/agent-run --version` - passed and printed `0.1.0`.
- `.venv/bin/agent-run policy validate` - exited with code 2 and printed `(B/0/5)`.
- `.venv/bin/agent-run audit show` - exited with code 2 and printed `(D/0/3)`.
- `.venv/bin/agent-run approve` - exited with code 2 and printed `(Q/0/3)`.
- `python3 --version` - reported `Python 3.14.4`, satisfying Python >= 3.11.

## Commit
- `d466891` - `feat(cli): typer scaffold for agent-run with stub subcommands (A/0/3)`
