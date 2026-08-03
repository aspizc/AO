# Review C_0_2-1 — OK

**Task:** `plan/C/0/02.md`
**Trial:** 1
**Branch:** `feature/C-0-2-role-policy`
**Commit:** `27c29f1` — `feat(policy): add role and orchestrator rules (C/0/2)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Role layer landed in `evaluate(...)`: orchestrator denies write + raw-restricted + self-approve, `task.assign` validates caller-orchestrator + target agent/role pair. Engine is now layered (classification → role) with clean composition. 7 role tests + 6 prior classification tests all green; full CI 69 gateway / 18 structure / 8 CLI. Task C/0/2 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/core/policy_engine.js` extended (62→100 lines), `tests/gateway/policy_roles.test.js` (7 tests).
- [x] Tests requeridos — 6 of 6 examples encoded (one example dropped, see "Deferred" below); plus 2 extra fail-mode tests.
- [x] Criterios de aceptacion — every item satisfied:
  - orchestrator denied for `code.write` and `code.read.raw_restricted` ✅ (live tests + probe).
  - orchestrator → `task.assign` for `gemini-cli` as `restricted-coder` → ALLOW ✅.
  - non-orchestrator → `task.assign` → DENY ✅.
  - `task.assign` with invalid target (e.g. `claude-code` as `restricted-coder`) → DENY ✅.
- [x] Errores comunes evitados — orchestrator has more denies, not extra privileges; `task.assign` target is validated (agent exists + agent allows target role); `task.assign` is restricted to `orchestrator` role only.
- [x] Definition of done — commit on `feature/C-0-2-role-policy`; CHANGELOG line for C/0/2 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK · `evaluate` remains pure (no I/O imports).

## Findings
All-green. Live verifications on the working tree at `27c29f1`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 69 # pass 69 # fail 0` + structure (18) + CLI (8); `==> All checks passed.` exit 0.
- Layered composition is clean: `evaluate` builds a `layers` array and short-circuits on any non-ALLOW. C/0/3 (`evaluateApproval`) and C/0/4 (`evaluateSanitization`) will slot in by adding entries to this array — no signature changes needed downstream.
- `actionMatchesDeny` uses prefix matching (`action.startsWith(denied + ".")`), so denying `code.write` also catches `code.write.protected_branch`. Important for the Actions inventory in C/0/0.
- `git show --stat 27c29f1` → exactly the 2 prescribed files plus the CHANGELOG entry.

### Deferred to C/0/4 (operator-visible, not blocking)
The spec's example test `reviewer_cannot_read_raw_diff` was **not** encoded in `policy_roles.test.js`. Reading the spec carefully, the inline comment authorises this:

> *"reviewer.denyActions includes 'artifact.get.raw_restricted', but raw_diff any-classification should already be denied by reviewer.denyActions if you model 'artifact.get.raw_\*' or by C/0/4 sanitization."*

The coder chose the **C/0/4 sanitization route** rather than extending the `roles.json` deny list with `artifact.get.raw_*`. With the current engine state, the missing rule is:

```
agent: claude-code, role: reviewer, repo: sample-apps,
action: artifact.get, artifactKind: raw_diff, artifactClassification: internal
→ decision: allow, ruleId: ok    (live probe confirms)
```

This is acceptable for C/0/2 because:
1. The task's "Criterios de aceptacion" list does **not** mention this case.
2. The spec explicitly offers two paths and the coder picked one.
3. The "Decisions Taken" section flags the choice for downstream review.

**Tracking note for C/0/4 reviewer:** when C/0/4 lands, verify that an artifact-kind-aware rule denies the case above (reviewer cannot read `raw_diff` regardless of classification). The test belongs in the new sanitization layer rather than `policy_roles.test.js`.

### Decision review (non-blocking)
- `allowActions` enforcement is correctly deferred: per V4, `allowActions` is informational + UI; `denyActions` is what gates evaluation. Welcome that the coder explicitly named this choice.
- `agent_cannot_assume_disallowed_role` and `task_assign_requires_target_agent_and_role` bonus tests lock two specific deny paths that otherwise would only be exercised indirectly. Welcome.

## Stage C status
- [x] C/0/0 Policy model
- [x] C/0/1 Classification boundary
- [x] C/0/2 Role and orchestrator rules — **closed by this task**
- [ ] C/0/3 Approval rules — pending
- [ ] C/0/4 Sanitization rules — pending (closes the deferred reviewer/raw_diff case)
- [ ] C/0/5 Policy explain — pending

## Next step
OK → coder advances to **C/0/3** (`plan/C/0/03.md`). New branch `feature/C-0-3-*` cut from `develop`.
