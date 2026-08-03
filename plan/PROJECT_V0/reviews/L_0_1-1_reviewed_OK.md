# Review L_0_1-1 — OK

**Task:** `plan/L/0/01.md`
**Trial:** 1
**Branch:** `feature/L-0-1-artifact-mcp-tools`
**Commit:** `9c14271` — `feat(artifacts): add artifact MCP tools (L/0/1)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
`artifact.put/get/list` MCP tools landed over the L/0/0 store, wired into the registry and configured at Gateway boot. The internal filesystem `path` is stripped from all responses. 3 tool tests + 175 total gateway tests pass. Task L/0/1 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/tools/artifact.js`, `gateway/src/tools/index.js` (registry), `gateway/src/mcp_server.js` (configure store at boot), `tests/gateway/tool_artifact.test.js` (3 tests), plus registry/bootstrap test updates.
- [x] Tests requeridos — `mcp_artifact_put`, `mcp_artifact_get`, `mcp_artifact_list`. All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — **no policy here** (correctly deferred to L/0/2); **`path` never returned to the client** (`withoutPath` strips it from put/get/list).
- [x] Definition of done — commit on `feature/L-0-1-artifact-mcp-tools`; CHANGELOG line for L/0/1 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `9c14271`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 175 # pass 175 # fail 0`; `==> All checks passed.` exit 0.
- Registry now lists 10 tools: orchestration.* (6), task.assign, **artifact.put / artifact.get / artifact.list**.
- Path-leak probe: `artifact.put` response → `path` field **absent** ✅; `artifact.get` response → `path` **absent** ✅, content roundtrips (`"hello"` in → `"hello"` out).
- `artifact.get` returns `{ error: "NOT_FOUND" }` for a missing id (not a crash).
- `mcp_server.js` line 30 calls `configureArtifactStore({ artifactStoreRoot: config.artifactStoreRoot })` at boot — the store is initialized alongside state/audit, so the tools work against a live Gateway.
- `git show --stat 9c14271` → the tool module + registry + bootstrap wiring + 3 tests + scaffold/bootstrap test updates + CHANGELOG.

### Decision review (non-blocking)
- `artifact.put` accepts UTF-8 string content → Buffer; `artifact.get` returns Buffer → UTF-8 string for the JSON MCP response. Reasonable for text artifacts (the on-disk store remains binary-safe); if binary artifacts ever need to cross MCP, a base64 mode can be added later. Coder flagged the conversion.
- `sanitizedFrom` exposed as an optional `artifact.put` field (lineage passthrough) **without** introducing sanitization policy — keeps L/0/1 scoped to transport while preserving the link M/0/2 will rely on. Good separation.
- `requesterAgent`/`requesterRole` accepted (optional) on `artifact.get` but not yet used — they're the hook L/0/2 will consume for the policy-gated `artifact.get` (cross-trace / raw-restricted checks). Forward-compatible.

## Stage L status
- [x] L/0/0 Filesystem artifact store
- [x] L/0/1 Artifact MCP tools — **closed by this task**
- [ ] L/0/2 pending — **the policy-gated `artifact.get`** (cross-trace denial TM-09, raw-restricted/sanitization contract). This is where `requesterAgent`/`requesterRole` get wired to `policy_engine.evaluate`.

## Next step
OK → coder advances to **L/0/2** (`plan/L/0/02.md`). New branch `feature/L-0-2-*` cut from `develop`. **Reminder for L/0/2:** wire `artifact.get` through `policy_engine.evaluate` (the C/0/4 sanitization layer + cross-trace scoping), and deny cross-trace access (TM-09). This is also where the C/0/4 `to_check_by_human` orchestrator-sanitization decision starts to matter.

> Operator: `C_0_4-1_to_check_by_human.md` becomes directly relevant at L/0/2 / Stage M — worth resolving now.
