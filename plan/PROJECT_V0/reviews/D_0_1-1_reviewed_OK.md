# Review D_0_1-1 — OK

**Task:** `plan/D/0/01.md`
**Trial:** 1
**Branch:** `feature/D-0-1-audit-reader`
**Commit:** `e536495` — `feat(audit): add reader filters (D/0/1)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Streaming `query({ traceId, type, limit })` added to the audit module. Filters work, `limit` returns the most-recent matching events in chronological order, corrupt lines are surfaced (not silenced), missing file → `[]`. 6 reader tests + 116 total gateway tests pass. Task D/0/1 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/core/audit.js` (+`query`, +`appendLimited`), `tests/gateway/audit_reader.test.js` (6 tests).
- [x] Tests requeridos — query by traceId, by type, limit, corrupt-visible; plus bonuses (combined filters, missing-file → []). All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — uses `fs.createReadStream` + `readline` (no whole-file load); corrupt lines marked `{ _corrupt: true, raw }`, not dropped; chronological order preserved (limit returns the last N).
- [x] Definition of done — commit on `feature/D-0-1-audit-reader`; CHANGELOG line for D/0/1 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `e536495`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 116 # pass 116 # fail 0` + structure (18) + CLI (8); `==> All checks passed.` exit 0.
- `query_limit_returns_most_recent_matching_events_in_chronological_order` asserts `[3,4]` for `limit:2` over 5 events — confirms tail semantics + chronological order.
- `corrupt_line_is_visible_not_silent` confirms a `{not json}` line yields a `_corrupt` marker alongside the valid event.
- `query_missing_file_returns_empty_list` confirms graceful empty-list on an unwritten audit path.
- `git show --stat e536495` → exactly the 2 prescribed files plus the CHANGELOG entry.

### Decision review (non-blocking — memory-efficiency improvement over the spec sample)
- The spec sample pushed **all** matching rows to `out` and then `out.slice(out.length - limit)` at the end — meaning a query over a 100k-line file holds all matches in memory before slicing. The coder instead uses `appendLimited(out, event, limit)` which keeps a **bounded sliding window** (`out.shift()` once it exceeds `limit`), so peak memory is `O(limit)` not `O(matches)`. This is a direct, faithful implementation of the task's "❌ Cargar todo el fichero en memoria" warning — stronger than the sample. Endorsed.
- `crlfDelay: Infinity` added to the readline interface — correct hardening so a `\r\n`-terminated audit file (e.g. produced on a Windows mount) isn't mis-split. Welcome.
- Corrupt lines also count toward `limit` in the window. Consistent with the spec sample's behaviour (it pushed corrupt lines into `out` before slicing too). Acceptable — a corrupt line is still a line in the stream.
- `normalizedLimit` clamps non-integers and negatives to a safe value; `limit === 0` returns nothing. Reasonable defensive defaults.

## Stage D status
- [x] D/0/0 Audit JSONL writer
- [x] D/0/1 Audit reader and filters — **closed by this task**
- [ ] D/0/2, D/0/3 pending

## Next step
OK → coder advances to **D/0/2** (`plan/D/0/02.md`). New branch `feature/D-0-2-*` cut from `develop`.
