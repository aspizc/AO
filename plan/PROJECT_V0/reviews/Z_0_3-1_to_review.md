# Review Submission - Task Z/0/3 (Trial 1)

## What was done
- Added `docs/planning-loop-runbook.md` covering draft/apply/review/escalate/converge, human approval gates, `git diff plan/`, artifacts, audit, and troubleshooting.
- Added executable `scripts/smoke_planning.mjs`, dry-run by default.
- The smoke exercises MCP stdio with planner delegate, plan artifact with `OPEN DECISIONS`, apply-coder delegate, planner review delegate, review notes artifact, and orchestration completion.
- Linked the runbook from `README.md` and `docs/operator-guide.md`.
- Added `tests/structure/test_planning_runbook_smoke.py`.
- Updated `CHANGELOG.md`.

## Why
- Z/0/3 completes Stage Z by giving operators a reproducible planning-loop runbook and a safe smoke that validates the loop primitives without requiring real Claude execution by default.

## Decisions Taken
- Kept `AGENTS_DRY_RUN=1` as the default; real mode requires `AGENTS_DRY_RUN=0` and Claude CLI availability.
- Used base `./policies` and `agents-orchestrator` as the repo under test.
- Kept the smoke artifact-mediated; it validates the loop primitives without editing real plan files.

## Verification
- `.venv/bin/pytest tests/structure/test_planning_runbook_smoke.py tests/structure/test_operator_guide.py tests/structure/test_repo_metadata.py` - passed, 11 tests.
- `node scripts/smoke_planning.mjs` - passed in dry-run mode and printed roles/model/artifacts/audit/result.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed; structure 93 passed, gateway node tests 60 passed, e2e 4 passed, MCP smoke OK, policy validate OK, CLI pytest 29 passed.

## Commit
- `bcc3cad` - `docs(runbook): add planning loop smoke and guide (Z/0/3)`
