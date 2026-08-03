# Review E_0_1-1 — OK

**Task:** `plan/E/0/01.md`
**Trial:** 1
**Branch:** `feature/E-0-1-agent-run-policy-check`
**Commit:** `b1a1316` — `feat(cli): add policy check command (E/0/1)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
`agent-run policy check` is real: full ad-hoc context flags, delegates to a Node helper that calls `explain()`, human + `--json` output, exit 0 only for `allow`. 5 CLI tests + full CI (123 gateway / 20 structure / 20 CLI) green. Canonical decision matrix verified live. Task E/0/1 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/scripts/policy-check.mjs`, `cli/src/agents_cli/main.py` (real `policy check`), `tests/cli/test_policy_check.py` (5 tests), scaffold test updated.
- [x] Tests requeridos — canonical raw-restricted deny, task.assign allow, protected-push require_approval; plus bonus reviewer-sanitization and human-output-shape. All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — delegates to Node `explain()` (policy logic single-sourced); all 9 flags wired; `ruleId` + `reason` always present; exit 0 only for `allow`.
- [x] Definition of done — commit on `feature/E-0-1-agent-run-policy-check`; CHANGELOG line for E/0/1 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `b1a1316`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → 123 gateway / 20 structure / 20 CLI; `==> All checks passed.` exit 0.
- Live decision matrix (`agent-run policy check ...`):
  - orchestrator + raw_diff + restricted → `DENY ruleId=sanitization.orchestrator_raw` exit `1` ✅
  - gemini-cli + restricted-coder + cvision + code.write → `ALLOW ruleId=ok` exit `0` ✅
  - gemini-cli + coder + cvision + git.push + main → `REQUIRE_APPROVAL ruleId=approval.git_push_protected` exit `1` ✅
- `--json` mode emits the full `explain()` payload (`decision`, `reason`, `ruleId`, `layers`, `context`).
- Human output format `<DECISION> ruleId=<id>  reason=<reason>` confirmed by `test_human_output_includes_decision_rule_and_reason`.
- `policy-check.mjs` resolves `policiesDir` from `AGENTS_POLICIES_DIR` or `<repo>/policies` via `import.meta.url` — cwd-independent, consistent with the other gateway scripts.
- `git show --stat b1a1316` → exactly the prescribed files plus the CHANGELOG entry.

### Decision review (non-blocking)
- `allow_with_sanitization` exits non-zero — coder flagged this; it's faithful to the acceptance criterion "Exit code 0 solo si `allow`". A reviewer-sanitization probe returns `allow_with_sanitization` with exit 1, locked by `test_reviewer_raw_restricted_requires_sanitization_and_nonzero_exit`. Correct interpretation.
- Helper uses `explain()` (not `evaluate()`), so `--json` carries the full layer trace — strictly more useful for human auditing than the minimal decision. Welcome.

## Stage E status
- [x] E/0/0 `policy validate` stable contract
- [x] E/0/1 `policy check` ad-hoc — **closed by this task**
- [ ] E/0/2 pending (last task of Stage E)

## Next step
OK → coder advances to **E/0/2** (`plan/E/0/02.md`), the last task of Stage E. New branch `feature/E-0-2-*` cut from `develop`.
