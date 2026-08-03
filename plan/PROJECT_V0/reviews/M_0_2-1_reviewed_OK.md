# Review M_0_2-1 — OK

**Task:** `plan/M/0/02.md`
**Trial:** 1
**Branch:** `feature/M-0-2-auto-sanitize-artifacts`
**Commit:** `d5a7704` — `feat(sanitization): auto-generate sanitized artifacts (M/0/2)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
`artifact_store.put` now auto-generates a sanitized companion artifact when a raw restricted artifact is stored: `<kind>_sanitized` / `internal` / `sanitizedFrom → raw`, with a `SANITIZATION_APPLIED` audit event carrying `appliedRuleIds`. No sanitization recursion. 4 new tests + 193 total gateway tests pass. Task M/0/2 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/core/artifact_store.js` (refactored `createArtifact` helper + sanitize hook), `gateway/src/mcp_server.js` (configure sanitizer at boot), `tests/gateway/auto_sanitize_artifacts.test.js` (4 tests), existing artifact tests updated to configure the sanitizer.
- [x] Tests requeridos — raw restricted → sanitized artifact, links to raw + sanitized content, `SANITIZATION_APPLIED` audited, non-raw/non-restricted → no sanitized. All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — **no recursion** (sanitized created via `createArtifact`, not `put`; and `sanitizedFrom !== null` guards re-entry); raw `kind` not mutated (a second artifact is created); sanitized marked `internal` (not `restricted`).
- [x] Definition of done — commit on `feature/M-0-2-auto-sanitize-artifacts`; CHANGELOG line for M/0/2 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `d5a7704`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 193 # pass 193 # fail 0`; `==> All checks passed.` exit 0.
- Live probe (`put` raw_diff/restricted with `api_key=...`):
  - row count = **2** (raw + sanitized) ✅
  - kinds = `raw_diff, raw_diff_sanitized` ✅
  - **no `_sanitized_sanitized`** — recursion guard holds ✅
- `sanitized artifact links to raw and contains sanitized content` confirms `sanitized_from = raw.artifactId` and content `api_key=<REDACTED-SECRET>`.
- `SANITIZATION_APPLIED` audit carries `sourceArtifactId`, `sanitizedArtifactId`, `kind`, `appliedRuleIds: ["secret.token"]`.
- `put` refactored to a shared `createArtifact(overrides)` used for both raw and sanitized rows — clean, no duplicated write/audit logic.
- `git show --stat d5a7704` → the store change + boot wiring + 4 tests + artifact-test updates + CHANGELOG.

### Scope clarification (corrects my own L/0/2 forward-note)
- M/0/2's spec scope is **generation only**: hook the sanitizer at `put` so the sanitized artifact exists ahead of any consumer. The coder correctly **kept `artifact.get` unchanged** (still denies `allow_with_sanitization` content). Serving the sanitized version on an `allow_with_sanitization` decision is a **later wiring step** (N-stage visibility matrix / a subsequent task), not M/0/2. My L/0/2 note slightly overstated that M/0/2 would wire the fallback — the coder's narrower scoping matches `plan/M/0/02.md`. No issue.

### Note on the open human-decision items
- A `J_0_2-1_to_check_by_human.md` has appeared (the `tool_helpers.js`/G-0-1 stand-in I flagged in the J/0/2 review) — left intact for the operator.
- `C_0_4-1_to_check_by_human.md` remains the load-bearing one: the **serving** step (whoever wires `allow_with_sanitization → return sanitized artifact`) will depend on the orchestrator-vs-reviewer distinction. The sanitized artifact now exists; the access decision is still governed by `evaluateSanitization`'s hardcoded `role === "orchestrator"` check.

## Stage M status
- [x] M/0/0 Sanitization rules registry
- [x] M/0/1 Sanitizer core
- [x] M/0/2 Automatic sanitized artifact generation — **closed by this task**
- [ ] M/0/3 pending — fail-closed sanitizer behaviour (TM-06): if sanitization fails/crashes, raw must NOT cross the boundary.

## Next step
OK → coder advances to **M/0/3** (`plan/M/0/03.md`) — fail-closed sanitization (TM-06). New branch `feature/M-0-3-*` cut from `develop`. **Reminder for M/0/3:** if `sanitize` throws or a rule fails, the raw restricted content must not be returned/leaked — the failure path must deny, and ideally the raw `put` should surface the sanitization failure rather than silently storing only the raw row.
