# Review D_0_0-1 — OK

**Task:** `plan/D/0/00.md`
**Trial:** 1
**Branch:** `feature/D-0-0-audit-jsonl-writer`
**Commit:** `0d80274` — `feat(audit): add jsonl writer (D/0/0)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Append-only JSONL audit writer landed at `gateway/src/core/audit.js`. Each event is enriched with a UUID-v4 `eventId` and ISO-8601 UTC `timestamp` that callers **cannot** forge. 8 audit tests + 110 total gateway tests pass. Task D/0/0 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/core/audit.js`, `tests/gateway/audit_writer.test.js` (8 tests).
- [x] Tests requeridos — append creates file, valid JSONL line, append-only (no mutation), requires type, plus bonuses (requires-configure, parent-dir creation, config default path, UUID/timestamp regex shape). All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — uses `appendFileSync` (not `writeFileSync`); rejects events without `type`; `eventId` is `crypto.randomUUID()` (UUID v4, not guessable); `mkdirSync({recursive:true})` prevents first-run crash.
- [x] Definition of done — commit on `feature/D-0-0-audit-jsonl-writer`; CHANGELOG line for D/0/0 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK · pure-ish module (only fs/crypto, expected for an audit writer).

## Findings
All-green. Live verifications on the working tree at `0d80274`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 110 # pass 110 # fail 0` + structure (18) + CLI (8); `==> All checks passed.` exit 0.
- Forge-protection probe: `append({ type: "X", eventId: "FORGED", timestamp: "FORGED" })` →
  - `eventId` → `2a32610c-...` (writer-generated, **not** "FORGED") ✅
  - `timestamp` → `2026-05-23T18:32:17.348Z` (writer-generated, **not** "FORGED") ✅
- `eventId` regex-validated as UUID v4; `timestamp` regex-validated as `YYYY-MM-DDThh:mm:ss.sssZ`.
- `config_default_audit_log_points_to_workspace_events_jsonl` confirms the A/0/2 config wiring: default `auditLog` resolves to `<workspace>/audit/events.jsonl`.
- `git show --stat 0d80274` → exactly the 2 prescribed files plus the CHANGELOG entry.

### Decision review (non-blocking — actually a security improvement over the spec sample)
- **Spread order:** the spec sample built the enriched event as `{ eventId, timestamp, ...event }` (event last), which lets a caller **override** the writer-generated `eventId`/`timestamp` by passing those keys. The coder inverted it to `{ ...event, eventId, timestamp }` so writer metadata always wins. This is strictly better for audit integrity / TM-09 forensics — a child or caller cannot forge an event id or backdate a timestamp. Explicitly documented in the `Decisions` section. **Endorsed.**
- **Synchronous `appendFileSync`:** consistent with the rest of the synchronous core; acceptable for an append-only audit writer where per-event durability matters more than throughput. The spec itself notes "fsync no requerido por evento" — the sync append is a reasonable middle ground.
- Added `Array.isArray(event)` guard so an array doesn't sneak past the `typeof === "object"` check. Good defensive touch.

## Stage D status
- [x] D/0/0 Audit JSONL writer — **closed by this task**
- [ ] D/0/1..D/0/3 pending

## Next step
OK → coder advances to **D/0/1** (`plan/D/0/01.md`). New branch `feature/D-0-1-*` cut from `develop`.
