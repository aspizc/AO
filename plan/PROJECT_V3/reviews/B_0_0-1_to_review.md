# Review Submission - Task PROJECT_V3/B/0/0 (Trial 1)

## What was done
- Added the canonical MIT `LICENSE` with `Copyright (c) 2026 Carlos Asensio Pizarro`.
- Converted `docs/license-decision-needed.md` into a historical decision record.
- Added `## License` to the top-level README.
- Added MIT license metadata to `gateway/package.json`, `cli/pyproject.toml`, and `orchestrator-langgraph/pyproject.toml`.
- Added structure coverage for the repository license.
- Updated `CHANGELOG.md` under `## Unreleased` with `Closes V3 B/0/0`.

## Why
- PROJECT_V3 B/0/0 closes the critical missing-license finding by applying the owner-recorded MIT decision without adding per-file headers.

## Decisions Taken
- Used `license = "MIT"` in both Python `[project]` tables. The current backend accepted this format during the full CI gate.
- Did not add license headers to source files, per task scope.

## Verification
- `.venv/bin/pytest tests/structure/test_repo_metadata.py -q` - failed first because `LICENSE` did not exist, confirming the new test covered the missing behavior.
- `.venv/bin/pytest tests/structure/test_repo_metadata.py -q` - passed, 5 tests.
- `rg -ni "license" tests/structure` - confirmed only the new repository metadata test covers license text.
- `./scripts/ci.sh` - failed before tests because `ruff` was not on PATH without the venv.
- `source .venv/bin/activate && ./scripts/ci.sh` - passed, all checks.

## Commit
- `53504232b747f6a779eb038bd2c7afb56f99a5f5` - docs(v3): add MIT license metadata (PROJECT_V3 B/0/0)
