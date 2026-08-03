# Review M_0_0-1 — OK

**Task:** `plan/M/0/00.md`
**Trial:** 1
**Branch:** `feature/M-0-0-sanitization-rules`
**Commit:** `ad09f13` — `feat(sanitization): add rules registry (M/0/0)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Declarative sanitization rules registry landed with 4 rules (secret/token, absolute home path, UUID, internal file), each carrying `id`/`pattern`/`replacement`/`appliesTo`/`severity`. The spec's invalid `(?i)` inline flag was correctly replaced with explicit character classes; patterns redact correctly (case-insensitive). 5 rule tests + 184 total gateway tests pass. Task M/0/0 is closed.

## Checks
- [x] Archivos a crear / modificar — `policies/sanitization-rules.json` (4 rules), `tests/gateway/sanitization_rules.test.js` (5 tests).
- [x] Tests requeridos — file loads, required fields, no real secrets; plus bonuses (patterns compile, required categories present). All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — no real secrets (dummy test fixtures + `sk-`/`ghp_` regression check); patterns are specific (not `[a-z]+`); every rule has non-empty `appliesTo`.
- [x] Definition of done — commit on `feature/M-0-0-sanitization-rules`; CHANGELOG line for M/0/0 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `ad09f13`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 184 # pass 184 # fail 0`; `==> All checks passed.` exit 0.
- Patterns actually redact (applied as global RegExp):
  - `API_KEY=abcdef1234567890` → `API_KEY=<REDACTED-SECRET>` (uppercase) ✅
  - `token = mysupersecretvalue123` → `token=<REDACTED-SECRET>` (lowercase) ✅ — case-insensitivity preserved despite removing `(?i)`
  - `123e4567-e89b-...` → `<UUID>` ✅
  - `/home/carase/secret/file.txt` → `<HOME>/...` ✅
- `$1` backreference in the secret replacement correctly carries the key name through.
- `git show --stat ad09f13` → exactly the 2 prescribed files plus the CHANGELOG entry.

### Decision review (non-blocking)
- **`(?i)` → explicit char classes** (`[Aa][Pp][Ii]...`). Correct and necessary: JS `RegExp` does not support inline `(?i)`; the spec's literal pattern would have matched the literal text `(?i)`. The coder's fix preserves case-insensitive matching as the verification confirms. Endorsed.
- `severity` field added per the task description (the spec's JSON example omitted it but the prose lists it). Welcome — useful for future rule triage.
- Tests resolve the registry path via `import.meta.url` — cwd-independent, consistent with the rest of the suite.

## Stage M status
- [x] M/0/0 Sanitization rules registry — **closed by this task**
- [ ] M/0/1, M/0/2, M/0/3 pending

## Next step
OK → coder advances to **M/0/1** (`plan/M/0/01.md`) — likely the sanitizer engine that loads these rules and applies them fail-closed (TM-06). New branch `feature/M-0-1-*` cut from `develop`.

> Operator: `C_0_4-1_to_check_by_human.md` (orchestrator-sanitization data-driven field) — Stage M is now underway; **M/0/2 will wire the `allow_with_sanitization` fallback that L/0/2 stubs as deny**, and the orchestrator-vs-reviewer distinction becomes load-bearing. Please resolve before M/0/2.
