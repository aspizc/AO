# Review Q_0_5-1 — KO

**Task:** plan/Q/0/05.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** 706847e — feat(approval): add bounded auto-approval (Q/0/5)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
The auto-approval **mechanism** is correct, safe, and well-tested. But the task's
**mandatory documentation reconciliation (§5b)** and **threat-model TM-12 + bypass
coverage** are missing — 4 required files were not touched, and acceptance
criteria 6 and 7 are unmet. Critically, the operator guide still claims auto-
approval does not exist, directly contradicting the new code. KO on documentation
and security-coverage, not on the mechanism.

## Checks
- [x] Mechanism (config, NEVER_AUTO, restricted exclusion, audit, config injection) — implemented correctly.
- [x] Tests requeridos (unit) — `tests/gateway/autoapprove_mechanism.test.js` 8/8 pass: default-off, scope auto-grant + audit, NEVER_AUTO stays pending even if listed, restricted never auto-granted, wait resolves, tool receives config, orchestrator deny unchanged.
- [x] ADR-006 present.
- [ ] **Criterios de aceptacion — FAIL (6 and 7).**
- [ ] **Archivos requeridos — 4 MISSING** (see below). §5b is marked *obligatorio*.
- [x] Global invariants (mechanism side) — English; no push; orchestrator still cannot activate/respond; restricted excluded.

## Findings
**The mechanism is sound** (`gateway/src/services/approval_service.js`): `isAutoApprovable` requires the scope in `config.autoApproveScopes` AND not in `NEVER_AUTO` (`git.push.protected`, `dependency.change`, `code.write.protected_branch`) AND non-restricted context; default-off; audits `APPROVAL_AUTO_GRANTED`; config injected (no hidden global). Do **not** change this.

**What's missing (all required by the spec, blocking):**
1. **`docs/operator-guide.md` not reconciled.** Line 184 still reads: *"Automatic approval. The human operator remains the authority."* under Out of scope. This now **contradicts the shipped behavior** — the most important fix, because it misrepresents the security model to operators. Spec §5b + acceptance #6.
2. **`docs/threat-model.md` has no TM-12.** The spec requires a TM-12 (Auto-approval abuse / over-broad enablement) entry with controls (`NEVER_AUTO` immutable, operator-only gate, `restricted` excluded, `APPROVAL_AUTO_GRANTED` audit, orchestrator can't respond) and a `Tested by:` line. Acceptance #7.
3. **`tests/e2e/bypass_regression.test.js` has no TM-12 coverage.** The threat-model's `Tested by` discipline requires the bypass suite to cover TM-12. Acceptance #7.
4. **`README.md` does not mention** opt-in auto-approval (default off) in Scope/architecture. Spec §5b + acceptance #6.

## Required corrections (KO)
1. **Reconcile `docs/operator-guide.md`:** replace the "Out of scope: Automatic approval. The human operator remains the authority." line with: opt-in, bounded auto-approval exists (see ADR-006); the human is the authority by default and **always** for `NEVER_AUTO` actions and `restricted` repos; document `AGENTS_AUTOAPPROVE` in the approvals section.
2. **Add TM-12 to `docs/threat-model.md`:** vector = operator over-enables scopes / orchestrator induces repeated approvals; controls = immutable `NEVER_AUTO`, operator-only gate, `restricted` excluded, `APPROVAL_AUTO_GRANTED` audit, orchestrator cannot respond; add a `Tested by:` line pointing at `tests/gateway/autoapprove_mechanism.test.js` and the new bypass entry.
3. **Add a TM-12 case to `tests/e2e/bypass_regression.test.js`** asserting that a `NEVER_AUTO` action and a `restricted` context are not auto-granted even when listed in `AGENTS_AUTOAPPROVE` (the bypass suite is the threat-model's enforcement point).
4. **Mention opt-in auto-approval (default off) in `README.md`** Scope/architecture, linking ADR-006.
5. Re-run `./scripts/ci.sh` (incl. `tests/structure/test_bypass_traceability.py`, which checks every TM id has bypass coverage) and resubmit as `Q_0_5-2_to_review.md`.

## Next step
- KO → keep the mechanism + ADR + unit test as-is; add the four missing pieces (corrections 1–4), confirm CI green, and resubmit as trial 2.
