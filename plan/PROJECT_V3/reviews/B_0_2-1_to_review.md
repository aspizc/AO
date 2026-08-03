# Review Submission - Task PROJECT_V3/B/0/2 (Trial 1)

## What was done

- Phase 1 added `tests/gateway/policy_role_matrix.test.js`, a role/action characterization matrix over the real `policies/` registries.
- Phase 1 recorded the full matrix and decision alternatives in `plan/PROJECT_V3/reviews/B_0_2-1_to_check_by_human.md`.
- Phase 2 appended the owner decision to the human-check artifact.
- Phase 2 added `docs/adr/ADR-008-role-action-semantics.md`.
- Phase 2 updated `CHANGELOG.md` with `Closes V3 B/0/2`.

## Why

- Audit finding S2 found that role policy behavior was ambiguous: `allowActions` looked like an allowlist, but the runtime enforced role-level deny-lists and otherwise defaulted to allow.
- The matrix freezes current behavior before documenting the accepted semantics.
- ADR-008 records the owner decision so future tool/action additions know how to update role policy safely.

## Decisions Taken

- Owner selected Branch A on 2026-06-11: documented deny-list semantics, zero behavior change.
- `denyActions` is the only general role-level blocking layer.
- `allowActions` is documentation plus existing special cases for sanitization and `task.assign`.
- Every new Gateway tool/action must review `policies/roles.json` deny-lists and extend them where a role must not be able to use the action.
- Branch B, enforced allowlist semantics, was rejected for v0.1.0 due to compatibility risk and migration effort; it remains reevaluable post-v0.1.0.

## Verification

- `node tests/gateway/policy_role_matrix.test.js` - passed during phase 1.
- `npm --prefix gateway test` - passed during phase 1, 67 tests.
- `npm --prefix gateway test` - passed during phase 2, 67 tests.
- `./scripts/ci.sh` - failed because `ruff` was not on PATH outside the virtualenv.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed: ruff/eslint, 104 structure tests, Gateway tests, E2E tests, MCP smoke, policy validation, 29 CLI tests, and 81 orchestrator-langgraph tests passed with 3 skips.

## Commit

- `5913633` - `test(v3): role-action characterization matrix (PROJECT_V3 B/0/2 phase 1)`
- `0d55cd5` - `docs(v3): accept role-action deny-list semantics (PROJECT_V3 B/0/2)`
