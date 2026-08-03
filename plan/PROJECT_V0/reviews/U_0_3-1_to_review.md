# U/0/3 Trial 1 - To Review

## Implemented

- Added `scripts/smoke_mcp.mjs`.
- Added `tests/structure/test_regression_gate.py`.
- Updated `scripts/ci.sh` to run:
  - structure tests
  - gateway tests
  - E2E tests
  - MCP stdio smoke
  - `agent-run policy validate`
  - CLI tests
- Documented the optional MCP smoke in `docs/operator-guide.md`.
- Updated `CHANGELOG.md`.

## Why

U/0/3 formalizes the green MVP gate before the final bypass regression suite. It ensures the project-level CI now includes the E2E flow, a host-agnostic MCP stdio smoke, and registry validation.

## Decisions

- Did not add ruff or mypy because they are not declared in `cli/pyproject.toml`; adding undeclared tools would make the gate non-reproducible with current project dependencies.
- Implemented the smoke using file redirection and `spawnSync("bash", ["-lc", ...])`, matching the existing `mcp_bootstrap.test.js` pattern. Direct pipe-based spawning hit local `EPERM` stream fd restrictions.
- Smoke checks the actual current registry tools: `orchestration.create`, `task.assign`, `artifact.share`, and `approval.request`.
- Left `docs/mvp-acceptance-checklist.md` statuses unchanged. U/0/4 still needs to add bypass regression evidence, and the checklist says a reviewer must verify before marking items checked.

## TDD Evidence

- First added `tests/structure/test_regression_gate.py`.
- Initial failures: missing `scripts/smoke_mcp.mjs` and missing CI references to policy validate / smoke.
- Added smoke script and CI wiring until focused tests passed.

## Verification

- `node scripts/smoke_mcp.mjs`
- `PATH="$PWD/.venv/bin:$PATH" pytest tests/structure/test_regression_gate.py`
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

All passed. CI output included `MCP smoke OK` and successful `agent-run policy validate`.

## Commit

- `7a5368d test: add MVP regression gate smoke (U/0/3)`
