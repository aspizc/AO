# Review M_0_1-1 — OK

**Task:** `plan/M/0/01.md`
**Trial:** 1
**Branch:** `feature/M-0-1-sanitizer-core`
**Commit:** `4c2343b` — `feat(sanitization): add sanitizer core (M/0/1)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Deterministic sanitizer engine landed: loads M/0/0 rules, applies them in array order, returns `{ sanitized, appliedRuleIds }`, leaves non-applicable kinds untouched. 5 sanitizer tests + 189 total gateway tests pass. Task M/0/1 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/core/sanitizer.js`, `tests/gateway/sanitizer.test.js` (5 tests).
- [x] Tests requeridos — redacts secret, redacts absolute path, deterministic, non-applicable kind unchanged; plus applied-rule-order. All green.
- [x] Criterios de aceptacion — deterministic (same input → same output), non-applicable rules leave content unchanged, `appliedRuleIds` in rule order.
- [x] Errores comunes evitados — rules applied in JSON array order (not Map iteration); a **fresh `RegExp` per rule per call** (no `lastIndex` leak); `appliesTo` checked as array.
- [x] Definition of done — commit on `feature/M-0-1-sanitizer-core`; CHANGELOG line for M/0/1 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verification on the working tree at `4c2343b`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 189 # pass 189 # fail 0`; `==> All checks passed.` exit 0.
- `sanitizer returns applied rule IDs in rule order` asserts `["secret.token","absolute.path","uuid"]` for a multi-match input — order matches the registry array.
- `sanitizer is deterministic` confirms identical output for repeated calls.
- `sanitizer leaves non-applicable kinds unchanged` (`kind: "doc"`) → content unchanged, `appliedRuleIds: []`.
- `git show --stat 4c2343b` → exactly the 2 prescribed files plus the CHANGELOG entry.

### Decision review (non-blocking — a real improvement over the spec sample)
- The spec sample detected application with `re.test(out)` then re-`replace`d. The coder instead compares `next !== sanitized` after the replace and skips the separate `test` entirely. This **eliminates the global-regex `lastIndex` state hazard** that the spec's own "Errores comunes" warned about, and is simpler (one replace per rule). Each rule still gets a fresh `RegExp`. Endorsed.

## Stage M status
- [x] M/0/0 Sanitization rules registry
- [x] M/0/1 Sanitizer core — **closed by this task**
- [ ] M/0/2 (wire `allow_with_sanitization` → sanitized artifact), M/0/3 (fail-closed TM-06) pending

## Next step
OK → coder advances to **M/0/2** (`plan/M/0/02.md`) — wiring the sanitizer into the `artifact.get` `allow_with_sanitization` path (the fallback L/0/2 currently stubs as deny), producing/serving a sanitized artifact. New branch `feature/M-0-2-*` cut from `develop`.

> Operator — `C_0_4-1_to_check_by_human.md` is **now directly load-bearing**: M/0/2 implements the sanitized fallback for `allow_with_sanitization`, where the orchestrator-vs-reviewer distinction (currently a hardcoded role name in `evaluateSanitization`) decides who gets a sanitized artifact vs a hard deny. Please resolve before/with M/0/2.
