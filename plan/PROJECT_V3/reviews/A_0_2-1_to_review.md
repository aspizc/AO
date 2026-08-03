# Review Submission - Task PROJECT_V3/A/0/2 (Trial 1)

## What was done
- Added ruff dev dependencies and conservative `py311` lint configuration for `cli` and `orchestrator-langgraph`.
- Added Gateway eslint flat config, `npm --prefix gateway run lint`, and updated `gateway/package-lock.json`.
- Added the `Lint (ruff + eslint)` section to `scripts/ci.sh`.
- Added structure coverage asserting `ci.sh` runs both lint commands.
- Applied ruff mechanical fixes only: import ordering, blank-line cleanup, and an explicit `__all__` for the existing `FixtureGatewayClient` re-export.
- Updated `CHANGELOG.md` with `Closes V3 A/0/2`.

## Why
- Closes audit finding M0.2/O2 by making Python and Gateway JavaScript lint failures part of the local CI gate before the remaining V3 work.

## Decisions Taken
- Ruff selects `E`, `F`, `I`, and `W`, but ignores `E501` in both Python configs. Existing line-length findings were widespread and would cause formatter-like churn outside this task.
- ESLint is scoped to `gateway/src`, `gateway/tests`, and `gateway/scripts`. Attempting to lint root-level `../tests` from `gateway/eslint.config.js` was rejected by ESLint 10 flat-config base-path handling, so the stable initial gate keeps the required Gateway minimum.
- No inline eslint disables were added.

## Verification
- `source .venv/bin/activate && pytest tests/structure/test_ci_script.py` - passed, 4 tests.
- `source .venv/bin/activate && ruff check cli orchestrator-langgraph` - passed.
- `npm --prefix gateway run lint` - passed.
- Manual violation check: temporarily added `import os` to `cli/src/agents_cli/__init__.py`; `source .venv/bin/activate && ./scripts/ci.sh` failed in the `Lint` section with ruff `F401`; the change was reverted.
- Manual violation check: temporarily added unused `lintViolation` in `gateway/src/config.js`; `npm --prefix gateway run lint` failed with eslint `no-unused-vars`; the change was reverted.
- `source .venv/bin/activate && ./scripts/ci.sh` - passed outside the sandbox after `pytest orchestrator-langgraph/tests` hung in the sandbox; no network or installation was used during this verification.

## Commit
- `2892ebe` - chore(v3): add lint gate (PROJECT_V3 A/0/2)
