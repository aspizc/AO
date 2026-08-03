# Review E_0_0-1 — OK

**Task:** `plan/E/0/00.md`
**Trial:** 1
**Branch:** `feature/E-0-0-agent-run-policy-validate`
**Commit:** `332189c` — `test(cli): freeze policy validate contract (E/0/0)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
`agent-run policy validate` is frozen as a stable operator contract: exit-code tests, a JSON success-shape test, a documented contract (`docs/operator-cli-contract.md`), a structure test that locks the doc, and a README link. Full CI green (123 gateway / 20 structure / 15 CLI). Task E/0/0 is closed.

## Checks
- [x] Archivos a crear / modificar — `tests/cli/test_policy_validate_contract.py` (3 tests), `tests/structure/test_operator_cli_contract.py` (2 tests), `docs/operator-cli-contract.md`, `README.md` (link).
- [x] Tests requeridos — `test_valid_registries_exit_zero`, `test_invalid_registries_exit_nonzero` + bonus `test_policy_validate_json_contract_success_shape`. All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — exit codes pinned (0/1/2); JSON shape asserted; doc enumerates the full contract; CI exercises the command via `scripts/ci.sh`.
- [x] Definition of done — commit on `feature/E-0-0-agent-run-policy-validate`; CHANGELOG line for E/0/0 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `332189c`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → 123 gateway / 20 structure / 15 CLI; `==> All checks passed.` exit 0.
- `docs/operator-cli-contract.md` enumerates default policies dir, exit codes 0/1/2 (incl. the environmental exit-2 case), `--policies-dir`/`--json` flags, and both human + JSON output shapes.
- `test_operator_cli_contract_document_exists` + `test_policy_validate_contract_is_documented` lock the doc so the public contract can't silently vanish.
- `test_policy_validate_json_contract_success_shape` asserts `ok===true` and `counts` has `{agents, repositories, roles}` — pins the machine-readable shape, not just exit codes.
- `grep -n "operator-cli-contract" README.md` → line 71 (linked under Documentation).
- `git show --stat 332189c` → exactly the prescribed files plus the CHANGELOG entry.

### Decision review (non-blocking)
- The added JSON-shape contract test and the structure test that locks the doc are both stricter than the spec's two-test minimum, and both directly serve the "stable contract / cannot break without an ADR" intent. Welcome.

## Stage E status
- [x] E/0/0 `policy validate` stable contract — **closed by this task**
- [ ] E/0/1, E/0/2 pending

## Next step
OK → coder advances to **E/0/1** (`plan/E/0/01.md`) — likely the real `policy check` ad-hoc command (the stub currently points at E/0/1). New branch `feature/E-0-1-*` cut from `develop`.
