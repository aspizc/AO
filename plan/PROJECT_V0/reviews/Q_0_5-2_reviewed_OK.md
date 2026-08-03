# Review Q_0_5-2 — OK

**Task:** plan/Q/0/05.md
**Trial:** 2
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** 9289f30 — docs(security): document bounded auto-approval controls (Q/0/5) (on top of mechanism commit 706847e)
**Reviewer:** Claude reviewer agent (authoritative — supersedes the parallel verdict for this trial)
**Date:** 2026-05-24

## Summary
Trial-1 KO fully addressed: the operator guide no longer contradicts the shipped
behavior, threat-model TM-12 is added with bypass-suite coverage, and README
documents the opt-in default-off mechanism. The trial-1 mechanism is unchanged
and correct. All acceptance criteria met; CI green. Verdict: **OK**.

## Checks
- [x] Archivos a crear / modificar — all present: `config.js`, `approval_service.js`, `tools/approval.js`, ADR-006 (trial 1) + `docs/operator-guide.md`, `docs/threat-model.md`, `tests/e2e/bypass_regression.test.js`, `README.md` (trial 2).
- [x] Tests requeridos (ran independently: `node --test tests/gateway/autoapprove_mechanism.test.js` → 8/8; `node --test tests/e2e/bypass_regression.test.js` → 15/0; `pytest tests/structure/{test_bypass_traceability,test_threat_model}.py` → 7/7; `./scripts/ci.sh` → all checks passed).
- [x] Criterios de aceptacion — all 7 met: default-off; scope auto-grants with `APPROVAL_AUTO_GRANTED`; `NEVER_AUTO` + `restricted` never auto-granted (now also asserted in the bypass suite); orchestrator can't activate/respond; ADR-006 + tests; operator-guide + README reconciled; threat-model TM-12 with bypass coverage.
- [x] Errores comunes evitados — not default/global; orchestrator can't enable/respond; `NEVER_AUTO`/`restricted` never granted; distinguishable `APPROVAL_AUTO_GRANTED` audit.
- [x] Definition of done — commits on branch, conventional messages reference Q/0/5, CHANGELOG line, docs reconciled. PR draft deferred (project no-push pattern).
- [x] Global invariants — English; no push; approval stays async; human remains authority by default and always for dangerous/restricted; no restricted paths.

## Findings
KO corrections complete and well-executed (independently verified):
1. `docs/operator-guide.md` — the "Automatic approval … human operator remains the authority" out-of-scope line is gone; replaced with operator opt-in `AGENTS_AUTOAPPROVE` guidance that keeps the human authoritative by default and always for `NEVER_AUTO`/restricted.
2. `docs/threat-model.md` TM-12 — full description, attacker capability, primary control, defense-in-depth, and a `Tested by:` line anchored to `Q/0/5`, the unit test, and the bypass test by name.
3. `tests/e2e/bypass_regression.test.js#autoapproval_never_grants_protected_or_restricted_even_if_listed` — asserts protected and restricted approvals stay `pending` and `APPROVAL_AUTO_GRANTED` count is `0` even when those scopes are listed in `AGENTS_AUTOAPPROVE`. Strong, correct assertions; `test_bypass_traceability.py` now sees TM-12 covered.
4. `README.md` — opt-in auto-approval (default off) in scope/architecture, the `AGENTS_AUTOAPPROVE` runtime row, and ADR-006 link.

The mechanism from trial 1 is untouched and remains correctly bounded. Documentation and the security model are now consistent with the code.

Note: a parallel verdict file existed for this trial; per operator decision the Claude reviewer is authoritative, so this verdict supersedes it. My independent verification agrees with the OK outcome.

Process note: `plan/README.md` and `plan/W/` still carry the coder's uncommitted working-tree edits — left untouched per operator decision.

## Next step
- OK → bounded auto-approval mechanism and its security docs are complete; the `plan.apply` (Z/0/4) and `code.apply` (Y/0/3) scopes can build on it.
