# Review G_0_0-1 — OK

**Task:** `plan/G/0/00.md`
**Trial:** 1
**Branch:** `feature/G-0-0-mcp-stdio-bootstrap`
**Commit:** `b948745` — `feat(gateway): add MCP stdio bootstrap (G/0/0)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Gateway is now a real MCP stdio server: initializes config/registries/state/audit, appends `GATEWAY_BOOT`, serves `tools/list` and `tools/call`, logs only to stderr. The smoke test exercises the real JSON-RPC stdin/stdout path and asserts all 4 acceptance criteria. 124 gateway tests pass. Task G/0/0 is closed — with one tracked fix carried to F/0/1 and the coder's human-review flag acknowledged.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/mcp_server.js` (real MCP server), `gateway/src/core/state.js` (new — see human-flag note), `gateway/src/tools/index.js` (signature `getToolRegistry({config, registries})`), `tests/gateway/mcp_bootstrap.test.js`.
- [x] Tests requeridos — smoke test present and green; **stronger** than the spec sample (also asserts `tools/list === []` and the `GATEWAY_BOOT` audit event, not just stdout cleanliness).
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — logs go to **stderr only** (TM-10), verified by `!stdout.includes("gateway connected")`; audit is configured before `auditAppend`; `getToolRegistry` receives `{config, registries}`.
- [x] Definition of done — commit on `feature/G-0-0-mcp-stdio-bootstrap`; CHANGELOG line for G/0/0 present.
- [x] Global invariants — English: OK · stderr discipline: OK · no push: OK · MCP server name `agents-gateway`: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `b948745`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 124 # pass 124 # fail 0`; `==> All checks passed.` exit 0.
- The smoke test drives a real `initialize` → `notifications/initialized` → `tools/list` JSON-RPC sequence via shell stdio redirection and asserts:
  - `tools/list` result `=== []` (parsed from real stdout JSON-RPC frame) ✅
  - stderr contains `"gateway connected"` ✅
  - stdout does **not** contain `"gateway connected"` (TM-10 stdout cleanliness) ✅
  - audit log contains a `GATEWAY_BOOT` event ✅
- `git show --stat b948745` → the prescribed files plus `state.js` and CHANGELOG.

### Coder's `to_check_by_human` — acknowledged, not my call
`plan/reviews/G_0_0-1_to_check_by_human.md` correctly raises the **planning dependency conflict**: G/0/0 lists `F/0/1` as a dependency (for `initState`), but the MVP order in `plan/README.md` runs G before F. The coder added a stand-in `gateway/src/core/state.js` to unblock the bootstrap. This is exactly the right thing to do — flag the ordering question to the human rather than silently inventing scope. I am **not** resolving the ordering; leaving `to_check_by_human.md` intact for the operator. The implementation is correct and unblocked regardless of which way the operator resolves it.

### Tracked fix for F/0/1 (concrete, non-blocking now)
`state.js` line 7 resolves the migrations dir with `path.resolve("gateway", "migrations")`, which is **cwd-relative**, not module-relative. It happens to be harmless today because `gateway/migrations/` holds no `.sql` files yet (so `listMigrations()` is empty and `applyPending` only creates the bookkeeping table). But:
- run via `npm --prefix gateway test` the cwd is `gateway/`, so `path.resolve("gateway","migrations")` → `gateway/gateway/migrations` (does not exist);
- run from repo root it resolves to `gateway/migrations` (correct).

**When F/0/1 lands real migrations, this must switch to a module-relative path** (`fileURLToPath(import.meta.url)` → `../migrations`), matching the pattern every other module in this repo already uses (`registry.js`, `config.js`, the gateway scripts). Otherwise the first real migration silently won't apply under `npm --prefix gateway`. Flagging so F/0/1 closes it.

### Decision review (non-blocking)
- Smoke test switched from the spec's `spawn` + live child pipes to `spawnSync("bash", ...)` with file redirection. Coder's rationale: in this sandbox, live Node child pipes exit before the server processes messages. The redirection approach still drives the real JSON-RPC path and is actually a more deterministic test. Endorsed.
- `process.stdin.resume()` + `await ... stdin "end"` keeps the server alive for a real MCP client with open stdio — correct; without it the process would exit immediately after `connect`.

## Stage G status
- [x] G/0/0 MCP stdio bootstrap — **closed by this task**
- [ ] G/0/1..G/0/3 pending

## Next step
OK → coder advances per MVP order. Per `plan/README.md`, the priority after G/0/0 is **T/0/0 + T/0/1** (generic MCP config + system prompt), then **F + J + L**. When **F/0/1** is implemented, fix the `state.js` migrations-path resolution noted above. New branch cut from `develop`.

> Operator: two items now await your decision —
> 1. `plan/reviews/G_0_0-1_to_check_by_human.md` — G-before-F ordering / where state init belongs.
> 2. `plan/reviews/C_0_4-1_to_check_by_human.md` — orchestrator-sanitization data-driven field (before Stage M).
