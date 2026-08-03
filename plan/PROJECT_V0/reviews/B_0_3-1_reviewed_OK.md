# Review B_0_3-1 — OK

**Task:** `plan/B/0/03.md`
**Trial:** 1
**Branch:** `feature/B-0-3-json-schemas`
**Commit:** `c066045` — `feat(schemas): add 7 core domain schemas with golden fixtures (B/0/3)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
All 7 domain schemas (OrchestrationSession, Task, Artifact, Message, PolicyDecision, Approval, RegistryMeta) landed with `$id` + `version: 1` + top-level `additionalProperties: false`. 14 fixtures (valid + invalid per schema) + AJV 2020 validator. Live CI: 40 gateway tests pass. Task B/0/3 is closed.

## Checks
- [x] Archivos a crear / modificar — 7 schemas in `schemas/`, 14 fixtures in `tests/fixtures/schemas/`, `tests/gateway/schemas.test.js`, `gateway/package.json` (+ ajv, ajv-formats), `gateway/package-lock.json`.
- [x] Tests requeridos — B-T3.1 (id+version), B-T3.2 (valid passes), B-T3.3 (invalid fails) all present; the test loops over all 7 schemas producing 21 cases. All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — every schema has `$id` and `version`; **every domain object schema has top-level `additionalProperties: false`** (verified for all 7 via Python); domain enums (`decision`, `status`, `kind`, `classification`) are complete and match the spec; no fixture defines undeclared fields.
- [x] Definition of done — commit on `feature/B-0-3-json-schemas`; CHANGELOG line for B/0/3 present.
- [x] Global invariants — English: OK · no push: OK · no absolute paths in fixtures (verified relative-only); registry-meta `paths` uses relative `policies/...` entries: OK.

## Findings
All-green. Live verifications on the working tree at `c066045`:

- `find schemas -maxdepth 1 -name '*.schema.json' | wc -l` → `7` ✅.
- `find tests/fixtures/schemas -maxdepth 1 -type f -name '*.json' | wc -l` → `14` ✅.
- Per-schema check `python3 -c "import json; print(json.load(open(...))['additionalProperties'])"` → **`False` for all 7** ✅.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 40 # pass 40 # fail 0` + structure/CLI green; `==> All checks passed.` exit 0.
- `git show --stat c066045` → 25 files changed: 7 schemas + 14 fixtures + the test + `package.json`/`package-lock.json` (+ ajv + ajv-formats) + CHANGELOG. Matches the spec.
- `registry-meta.schema.json` correctly uses **top-level** `additionalProperties: false` while the nested `paths` object uses `additionalProperties: { type: "string", minLength: 1 }` as a typed map. This is the right JSON-Schema 2020-12 idiom: closed at the boundary, typed map inside. (My first grep showed only the nested line — confirmed the top-level is `false` on line 17.)

### Decision review (non-blocking)
- Test uses `createRequire` anchored at `gateway/package.json` to load `ajv`/`ajv-formats` from `gateway/node_modules` while the test file itself lives at repo-root `tests/gateway/`. Necessary because `npm --prefix gateway test` runs with `gateway` cwd but the test file imports through a node-style resolve that wouldn't otherwise find the deps. Clean solution.
- Coder's "decided" optional fields (`goal`, `parentTaskId`, `sanitizedFrom`, `decidedAt`, `decidedBy`) match the spec's hints in the `task.schema.json` and `approval.schema.json` lines (`createdAt`, `decidedAt?`, `decidedBy?`). Welcome.
- Network approval required to `npm install ajv ajv-formats` — that's prescribed by step 1 of the task and is appropriate for B/0/3 (one-time dep add).

## Stage B status
- [x] B/0/0 Agent capabilities
- [x] B/0/1 Repository classification
- [x] B/0/2 Roles
- [x] B/0/3 Core JSON schemas — **closed by this task**
- [ ] B/0/4, B/0/5 still pending

## Next step
OK → coder advances to **B/0/4** (`plan/B/0/04.md`). New branch `feature/B-0-4-*` cut from `develop`.
