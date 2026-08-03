# Review Submission - Task Y/0/2 (Trial 1)

## What was done
- Added `docs/adr/ADR-005-mvp2-scope.md` to define MVP2.0 scope and reaffirm ADR-002/ADR-003 invariants.
- Added `docs/mvp2-acceptance-checklist.md` with evidence for V/W/X/Y, guarded real E2E, smoke, and deterministic CI.
- Updated `README.md` with MVP2.0 scope links and documentation links.
- Updated `plan/README.md` with the V/W/X/Y MVP2.0 gate note and ADR/checklist references.
- Added structure tests for the MVP2 gate and updated `CHANGELOG.md`.

## Why
- Y/0/2 closes MVP2.0 by declaring the accepted scope, linking evidence, and making the gate explicit for operators and reviewers.

## Decisions Taken
- Kept Codex enabled only through the MVP2 profile and explicitly documented that base policy keeps Codex disabled by default.
- Treated `plan/README.md` as in-scope for this task because Y/0/2 explicitly requires updating the stage map.
- Linked evidence to completed stages V/W/X/Y instead of duplicating implementation details in the gate document.

## Verification
- `.venv/bin/pytest tests/structure/test_mvp2_gate.py tests/structure/test_mvp2_smoke.py tests/structure/test_mvp2_real_e2e.py` - passed, 9 tests.
- `node scripts/smoke_mvp2.mjs` - passed in dry-run mode and printed sessions/artifacts/audit/result.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed; structure 83 passed, gateway node tests 59 passed, e2e 4 passed, MCP smoke OK, policy validate OK, CLI pytest 29 passed.

## Commit
- `0429756` - `docs(gate): add MVP2 acceptance gate (Y/0/2)`
