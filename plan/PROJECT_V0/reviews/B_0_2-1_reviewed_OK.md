# Review B_0_2-1 — OK

**Task:** `plan/B/0/02.md`
**Trial:** 1
**Branch:** `feature/B-0-2-roles-registry`
**Commit:** `90b53c4` — `feat(registry): add roles.json with 8 V4 roles and orchestrator boundaries (B/0/2)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Roles registry landed with all 8 V4 roles and the prescribed orchestrator boundaries (no `code.write`, no `*.raw_restricted`, no `approval.respond`). 6/6 registry tests pass; full CI green (19 gateway / 18 structure / 5 CLI). Task B/0/2 is closed.

## Checks
- [x] Archivos a crear / modificar — `policies/roles.json` (8 roles), `tests/gateway/registry_roles.test.js` (6 tests).
- [x] Tests requeridos — B-T2.1 … B-T2.6 all present and green via `./scripts/ci.sh`.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — `orchestrator.denyActions` includes all 4 critical denies (TM-01 boundary); no role's `allowActions` includes `approval.respond`; `restricted-coder` is a role only (not present in `agent-capabilities.json`); every role has both `allowActions` and `denyActions`.
- [x] Definition of done — commit on `feature/B-0-2-roles-registry`; CHANGELOG line for B/0/2 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `90b53c4`:

- `python3 -m json.tool policies/roles.json > /dev/null` → valid JSON.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → 19 gateway / 18 structure / 5 CLI; `==> All checks passed.` exit 0.
- `git show --stat 90b53c4` → exactly the 2 prescribed files plus the CHANGELOG entry.
- Orchestrator deny list (line 23-28 of `roles.json`) verified to contain all 4 required entries: `code.write`, `code.read.raw_restricted`, `artifact.get.raw_restricted`, `approval.respond`.
- `restricted-coder` is in `roles.json` but not in `agent-capabilities.json.agents` — the cross-registry test in B-T2.6 locks this invariant.

### Decision review (non-blocking)
- Same cwd-independent path resolution (`fileURLToPath(import.meta.url)`) as B/0/0 and B/0/1. Consistent. Welcome.
- Coder's `What was done` mentions "added a manual verification" for `approval.respond` not in any `allowActions` — that's not encoded as an automated test here but the spec only asks to lock it for `orchestrator`. Acceptable for B/0/2; a broader assertion can land later if Stage C policy needs it.

## Stage B status
- [x] B/0/0 Agent capabilities
- [x] B/0/1 Repository classification
- [x] B/0/2 Roles — **closed by this task**
- [ ] B/0/3..B/0/5 still pending

## Next step
OK → coder advances to **B/0/3** (`plan/B/0/03.md`). New branch `feature/B-0-3-*` cut from `develop`.
