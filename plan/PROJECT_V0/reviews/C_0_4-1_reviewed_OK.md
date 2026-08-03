# Review C_0_4-1 — OK

**Task:** `plan/C/0/04.md`
**Trial:** 1
**Branch:** `feature/C-0-4-sanitization-policy`
**Commit:** `9b03543` — `feat(policy): add sanitization rules (C/0/4)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Sanitization layer landed: restricted raw artifacts to a sanitized-capable role → `allow_with_sanitization`; to orchestrator → `deny`. The C/0/2 deferred case (`reviewer + raw_diff`) is now resolved for the restricted classification. 79 gateway tests pass. Task C/0/4 is closed. Two design notes below for the operator/architect (non-blocking).

## Checks
- [x] Archivos a crear / modificar — `gateway/src/core/policy_engine.js` (+`evaluateSanitization` + `roleHasRawRestrictedAccess`), `tests/gateway/policy_sanitization.test.js` (4 tests).
- [x] Tests requeridos — restricted raw_diff→reviewer = `allow_with_sanitization`; non-raw kind = `allow`; restricted raw_diff→orchestrator = `deny`; internal raw = not `allow_with_sanitization`. All green.
- [x] Criterios de aceptacion — every item satisfied (live probe below).
- [x] Errores comunes evitados — `allow_with_sanitization` is its own decision (not aliased to allow); orchestrator raw case is denied at this layer; `restricted` is the sanitization frontier (internal raw bypasses sanitization per spec).
- [x] Definition of done — commit on `feature/C-0-4-sanitization-policy`; CHANGELOG line for C/0/4 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK · `evaluate` remains pure.

## Findings
All-green. Live verifications on the working tree at `9b03543`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 79 # pass 79 # fail 0` + structure (18) + CLI (8); `==> All checks passed.` exit 0.
- Decision matrix probe:
  - `reviewer` / raw_diff / **restricted** → `allow_with_sanitization` (`sanitization.required`) ✅
  - `orchestrator` / raw_diff / restricted → `deny` (`sanitization.orchestrator_raw`) ✅
  - `reviewer` / raw_diff / **internal** → `allow` (sanitization layer skips internal) — per spec.
  - `gemini-cli` / `restricted-coder` / raw_diff / restricted → `allow` (role has raw access; `roleHasRawRestrictedAccess` short-circuits) ✅
- `git show --stat 9b03543` → exactly the 2 prescribed files plus the CHANGELOG entry.

### C/0/2 deferred case — status
The case flagged in the C/0/2 review (`reviewer + artifact.get + raw_diff`) is now **resolved for `restricted`**: it returns `allow_with_sanitization` instead of plain `allow`. For `internal` classification it still returns `allow`, which is **consistent with this task's explicit guidance** ("Olvidar que la frontera es `restricted`: artefactos `internal` no requieren sanitizacion"). So C/0/4 honours its own spec; the broader "should a reviewer ever receive a raw artifact at all" question is a **visibility-matrix concern for Stage N**, not policy-engine scope. Tracking note carried forward to N/0/x.

## Design notes for operator/architect (non-blocking)

1. **Hardcoded `role === "orchestrator"` in `evaluateSanitization`.** The spec's own example code (`if denyActions.includes("artifact.get.raw_restricted") → deny`) is internally inconsistent: **both** `reviewer` and `orchestrator` carry `artifact.get.raw_restricted` in `denyActions` *and* `artifact.get.sanitized` in `allowActions`, so no registry field currently distinguishes "may consume sanitized raw" (reviewer) from "may not even consume sanitized raw" (orchestrator). The coder resolved the contradiction by special-casing the literal role name `"orchestrator"`. This produces the spec's intended outcomes and all tests pass, **but** it bakes a role name into the engine, which sits in mild tension with the "policy is data-driven" principle (ADR-002 area). Suggested future cleanup (not required for C/0/4): add an explicit role field such as `"canConsumeSanitizedRaw": false` to `policies/roles.json` for orchestrator, and have `evaluateSanitization` branch on that field instead of the name. Flagging for the operator to decide whether to open a small follow-up task.

2. **`internal` raw artifacts flow through as plain `allow`** for any role without raw access. This is per spec, but means the only sanitization frontier is `restricted`. If V4 later wants `internal` raw also sanitized for some roles, this layer's `if (ctx.artifactClassification !== "restricted") return null;` (line 133) is where it would change.

Neither note blocks C/0/4 — both are correct against the current spec and acceptance criteria.

## Stage C status
- [x] C/0/0 Policy model
- [x] C/0/1 Classification boundary
- [x] C/0/2 Role and orchestrator rules
- [x] C/0/3 Approval rules
- [x] C/0/4 Sanitization rules — **closed by this task**
- [ ] C/0/5 Policy explain — pending (last task of Stage C)

## Next step
OK → coder advances to **C/0/5** (`plan/C/0/05.md`) — the policy `explain()` task, last of Stage C. New branch `feature/C-0-5-*` cut from `develop`.
