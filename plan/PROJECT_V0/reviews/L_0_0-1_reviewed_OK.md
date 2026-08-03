# Review L_0_0-1 — OK

**Task:** `plan/L/0/00.md`
**Trial:** 1
**Branch:** `feature/L-0-0-filesystem-artifact-store`
**Commit:** `e3368e3` — `feat(artifacts): add filesystem artifact store (L/0/0)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Filesystem artifact store landed: `put/get/list` with on-disk content, SQLite metadata, `ARTIFACT_CREATED` audit, and **robust path-traversal protection** (TM-03). Adversarial `traceId` payloads confirmed unable to escape the store root, while original `traceId`/`kind` are preserved in DB + audit. 5 store tests + 171 total gateway tests pass. Task L/0/0 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/core/artifact_store.js`, `tests/gateway/artifact_store.test.js` (5 tests).
- [x] Tests requeridos — put writes file under trace dir, put creates DB row + audit, get reads content, list by trace; plus the **path-escape regression**. All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — `content` returned as Buffer with JSDoc note; `sanitizedFrom` link persisted; **paths cannot escape `_root`** (`safePathSegment` neutralizes `..`, `/`, and leading dots).
- [x] Definition of done — commit on `feature/L-0-0-filesystem-artifact-store`; CHANGELOG line for L/0/0 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `e3368e3`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 171 # pass 171 # fail 0`; `==> All checks passed.` exit 0.
- **TM-03 path-traversal probe** (adversarial `traceId` values) — every payload stays inside the store root **and** the original `traceId` is preserved in the DB row:
  - `"../../etc"` → inside root ✅, db traceId preserved ✅
  - `"tr-x/../../../tmp"` → inside root ✅, db traceId preserved ✅
  - `".."` → inside root ✅, db traceId preserved ✅
- `safePathSegment` logic: replaces `[^a-zA-Z0-9._-]+` with `_`, then strips leading dots (`^\.+ → _`), caps at 120 chars. So `../outside` → `__outside` (no traversal); `/` separators are collapsed. The physical path is sanitized while the **logical** `traceId`/`kind` are stored verbatim in SQLite and audit → discovery/correlation (`list`, audit by trace) still uses the real values.
- `put creates database row and audit event` confirms the `sanitizedFrom` FK link (`review_notes` artifact → original `raw_diff`) — the lineage M/0/2 will need for sanitized retrieval.
- `get` returns `content` as a Buffer (binary-safe), documented in the module JSDoc.
- `git show --stat e3368e3` → exactly the 2 prescribed files plus the CHANGELOG entry.

### Decision review (non-blocking)
- Sanitizing only the **physical path segment** while persisting the original `traceId`/`kind` is the right design: it closes TM-03 without breaking trace correlation (a child can't smuggle a `..` into the filesystem, but the orchestrator's `list({traceId})` still finds artifacts by the real trace). Coder flagged this. Endorsed.
- `configureArtifactStore` now `path.resolve`s the root — good, makes the containment check absolute-anchored.

## Stage L status
- [x] L/0/0 Filesystem artifact store — **closed by this task**
- [ ] L/0/1, L/0/2 pending

## Next step
OK → coder advances to **L/0/1** (`plan/L/0/01.md`) — likely the artifact MCP tools (`artifact.put/get/list`) and/or cross-trace access denial (TM-09). New branch `feature/L-0-1-*` cut from `develop`.

> Operator: `C_0_4-1_to_check_by_human.md` and `G_0_0-1_to_check_by_human.md` remain open for your decision.
