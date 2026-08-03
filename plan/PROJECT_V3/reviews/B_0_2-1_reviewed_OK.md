# Review Verdict - Task PROJECT_V3/B/0/2 (Trial 1)

## Summary

B/0/2 delivers the role/action characterization matrix
(`tests/gateway/policy_role_matrix.test.js`) over the real `policies/`
registries and ADR-008 documenting the owner-selected Branch A (documented
deny-list, zero behavior change). The human gate was respected: phase 1
stopped at the matrix, the owner decision (Branch A, 2026-06-11) is recorded
in `plan/PROJECT_V3/reviews/B_0_2-1_to_check_by_human.md`, and only then was
the ADR written. The diff contains zero changes under `gateway/src/` and
`policies/`, as Branch A requires. All verifications re-run by the reviewer
are green.

## Findings

### Spec compliance (blocking criteria) — all met

- **Hand-written expected matrix (not auto-accepting):** the expected matrix
  is embedded as literal `action:decision:ruleId` strings per role
  (`policy_role_matrix.test.js:53-326`), not derived from `evaluate()`
  output. Reviewer mutation test: temporarily adding `agent.spawn` to the
  `tester` deny-list in `policies/roles.json` made the test fail
  (`fail 1`); restoring the file returned it to green. The matrix would
  catch a behavior change.
- **Real registries used:** the test loads `policies/` via
  `loadRegistries()` and calls the real `evaluate()` — correct for this task
  (unlike A/0/1's synthetic fixtures, per the spec's "errores comunes").
- **Action universe coverage is enforced:** the first test asserts the
  hand-written `EXPECTED_ACTIONS` equals the dynamically computed union of
  `roles.json` actions + `evaluate()` call-site actions + the synthetic
  action, and that every role row covers every action. A new action in the
  code or registry breaks the test loudly (B2-T1).
- **`v3.unknown.action` default fixed by test:** dedicated third test
  asserts `allow`/`ok` for every real role (B2-T2), documenting the
  default-allow that ADR-008 accepts.
- **Branch A — zero production changes:** `git diff --stat develop...HEAD`
  shows only `CHANGELOG.md`, `docs/adr/ADR-008-role-action-semantics.md`,
  the two review artifacts, and the test file. Nothing under `gateway/src/`
  or `policies/`. Gateway MCP contract untouched.
- **ADR-008 format and content:** Date/Status/Context/Decision/Consequences;
  owner decision (Branch A) stated; summarized matrix via the notable
  characterization cells; explicit 5-step checklist for new tools/actions
  (consequences); Branch B recorded as rejected with motive (compatibility
  risk and registry migration effort before v0.1.0, reevaluable after).
- **Owner decision registered (B2-T4):** `B_0_2-1_to_check_by_human.md`
  contains the full matrix, both branches with tradeoffs, and the Owner
  Decision section (Branch A, 2026-06-11, decided via orchestrator).
- **Roles without compatible agent fail noisily:** `selectAgentForRole`
  asserts instead of skipping, as the spec requires.
- **CHANGELOG:** `Closes V3 B/0/2` line added under `## Unreleased`.
- **Commits:** `5913633`, `0d55cd5`, `97f5fdc` follow the V3 convention and
  separate phase 1 (matrix), phase 2 (decision + ADR), and the handoff.

### Minor, non-blocking observations

- The handoff reports `npm --prefix gateway test` as "67 tests"; the
  reviewer run reports 438 tests (434 pass, 4 skipped). Likely a difference
  in node:test counting granularity (top-level tests vs subtests) or suite
  growth; the suite is green either way.
- `actionsFromEvaluateCallSites()` uses a broad fallback regex
  (`/\|\|\s*["']([^"']+)["']/`) that could over-capture non-action strings
  in future service code. Any over-capture fails the coverage assertion
  loudly and forces a manual matrix update, so it errs on the safe side.
- "PR draft contra develop" (Definition of done) is not materialized, which
  is consistent with the project rule of never pushing from the task; the
  PR is an owner action after the verdict.

## Verification

Re-run by the reviewer on this branch (`feature/V3-B-0-2-role-semantics-adr`):

- `node tests/gateway/policy_role_matrix.test.js` — 3 tests pass, 0 fail.
- Mutation check: deny added to `tester` in `policies/roles.json` →
  `fail 1` ("role action matrix freezes current gateway decisions");
  restored → green. Working tree clean afterwards.
- `npm --prefix gateway test` — 438 tests, 434 pass, 4 skipped, 0 fail.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` — all checks passed
  (ruff/eslint, structure tests, Gateway tests, E2E, MCP smoke, policy
  validation, 29 CLI tests, 81 orchestrator-langgraph tests with 3 skips).

## Verdict

**OK.** All B/0/2 acceptance criteria are met: the characterization matrix
freezes current behavior and demonstrably fails on change, the owner
decision (Branch A) is registered through the human gate, ADR-008 documents
the semantics and the new-tool checklist, production code and registries are
untouched, and the full CI is green.
