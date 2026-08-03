# Review B_0_4-1 — OK

**Task:** `plan/B/0/04.md`
**Trial:** 1
**Branch:** `feature/B-0-4-registry-loader`
**Commit:** `9d34dde` — `feat(core): registry loader with cross-invariants and typed errors (B/0/4)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Registry loader landed at `gateway/src/core/registry.js` with `RegistryError` codes, format + cross-invariant validation, and typed getters. Fail-fast behaviour, unknown-id-null behaviour, and defensive copies all verified live. 49 gateway tests pass; full CI green. Task B/0/4 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/core/registry.js` (186 lines), `tests/gateway/registry_loader.test.js` (9 tests).
- [x] Tests requeridos — B-T4.1..7 covered and exceeded (9 tests instead of 7: spec's set + `unknown_getters_return_null` + `protected_branches_and_raw_are_defensive_copies` for the explicit immutability assertion).
- [x] Criterios de aceptacion — every item satisfied (live probes below).
- [x] Errores comunes evitados — cross-invariant validated (restricted repo with non-restricted agent → throws REGISTRY_INVARIANT); fail-fast, no swallowing into nulls; loader uses `fs.readFileSync` per call, not static `import`; `raw()` and `getProtectedBranches()` return clones (verified via mutation test).
- [x] Definition of done — commit on `feature/B-0-4-registry-loader`; CHANGELOG line for B/0/4 present.
- [x] Global invariants — English: OK · stderr/stdout: not applicable here (pure module) · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `9d34dde`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 49 # pass 49 # fail 0` + structure/CLI green; `==> All checks passed.` exit 0. Total gateway suite is now 9 new + 21 schemas + 16 prior registry + 3 scaffold = 49.
- Behaviour probe via `node -e "import('./src/core/registry.js')..."` (cwd=gateway):
  - `r.getRepo('cvision').classification` → `restricted` ✅.
  - `r.getAgent('nope')` → `null` ✅ (unknown id returns null, no throw).
  - `r.getProtectedBranches()` after mutating the returned array → `["main","master","release/*"]` ✅ defensive copy works.
- `git show --stat 9d34dde` → exactly the 2 prescribed files plus the CHANGELOG entry.
- `RegistryError` codes emitted as required: `REGISTRY_MISSING`, `REGISTRY_INVALID_JSON`, `REGISTRY_INVALID_SHAPE`, `REGISTRY_INVALID_AGENT`, `REGISTRY_INVALID_REPO`, `REGISTRY_MISSING_ROLE`, `REGISTRY_INVARIANT`. Tests use predicate-based `assert.throws` to lock on `err.code`, not message text — robust to wording changes.

### Decision review (non-blocking)
- Coder uses `JSON.parse(JSON.stringify(...))` for `clone()` in `raw()`. Adequate for the JSON-only registry shape (no Date, no Map, no symbol). Welcome.
- Individual getters (`getAgent`, `getRepo`, `getRole`) return the **live** reference, not a clone. Coder flagged this as a decision. Acceptable: the spec's "do not mutate output references" warning is enforced for `raw()` and `getProtectedBranches()`, and policy code in Stage C is expected to treat registry output as read-only. If Stage C later needs immutability everywhere, an `Object.freeze`/deep-freeze can be added then; not required by B/0/4's acceptance criteria.
- Test uses `fileURLToPath(import.meta.url)` to resolve `REPO_ROOT`, consistent with B/0/0, B/0/1, B/0/2 — works whether invoked from gateway/ or repo root.

## Stage B status
- [x] B/0/0 Agent capabilities
- [x] B/0/1 Repository classification
- [x] B/0/2 Roles
- [x] B/0/3 Core JSON schemas
- [x] B/0/4 Registry loader — **closed by this task**
- [ ] B/0/5 still pending

## Next step
OK → coder advances to **B/0/5** (`plan/B/0/05.md`) — the last task of Stage B, likely the `agent-run policy validate` CLI command per earlier references. New branch `feature/B-0-5-*` cut from `develop`.
