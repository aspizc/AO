# Review T_0_0-1 — OK

**Task:** `plan/T/0/00.md`
**Trial:** 1
**Branch:** `feature/T-0-0-generic-mcp-client-config`
**Commit:** `8d63ca9` — `docs(config): add generic MCP client example (T/0/0)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Generic, host-agnostic MCP client config example + README landed. `mcp.json.example` is valid JSON, uses `agents-gateway` / `transport: stdio` / the gateway entrypoint, has no IDE-specific keys and no secrets. README documents the shape, the env-var contract, and explicitly marks IDE/host specifics out of scope. 5 structure tests + full CI green. Task T/0/0 is closed.

## Checks
- [x] Archivos a crear / modificar — `client-config/mcp.json.example`, `client-config/README.md`, `tests/structure/test_generic_mcp_config.py` (5 tests).
- [x] Tests requeridos — valid JSON, gateway entrypoint in args, stdio transport, no secrets, no IDE-specific keys. All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — no IDE-specific keys in the example (Cursor/Antigravity appear only in the README's "out of scope" paragraph, as the spec template does); no secrets; `agents-gateway` server name preserved.
- [x] Definition of done — commit on `feature/T-0-0-generic-mcp-client-config`; CHANGELOG line for T/0/0 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK · MCP server name `agents-gateway`: OK · Cursor/Antigravity explicitly out of scope: OK.

## Findings
All-green. Live verifications on the working tree at `8d63ca9`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → 124 gateway / 26 structure / 25 CLI; `==> All checks passed.` exit 0.
- `python3 -m json.tool client-config/mcp.json.example` → valid JSON.
- `grep -iE "cursor|antigravity|\.mdc" client-config/mcp.json.example` → no matches (example is host-agnostic).
- The example sets `AGENTS_DRY_RUN: "1"` by default — sensible: first-run operator smoke tests stay non-destructive (no real subprocess spawn). Coder flagged this decision.
- README's env-var table matches the D/0/2 contract (all 8 vars), and the "Out of scope: IDE/host specifics" section names Cursor/Antigravity only to exclude them.
- `git show --stat 8d63ca9` → exactly the prescribed files plus the CHANGELOG entry.

### Dependency note (non-blocking)
T/0/0 lists `G/0/3` as its dependency and its text says "Confirmar `client-config/mcp.json.example` (creado en G/0/3)". Since G/0/1–G/0/3 are not done yet (the coder is following the MVP order `G + T/0/0 + T/0/1` which front-loads G/0/0 then T), the coder **created** `mcp.json.example` fresh in T/0/0 rather than confirming a pre-existing G/0/3 file. This is the right call given the ordering — the file is complete and correct. When G/0/3 is eventually implemented, it should treat this file as already-present (confirm/extend, not recreate). Flagging so G/0/3 doesn't duplicate it.

## Stage T status
- [x] T/0/0 Generic MCP client config — **closed by this task**
- [ ] T/0/1 (system prompt), T/0/2 pending

## Next step
OK → per MVP order (`G + T/0/0 + T/0/1`), coder advances to **T/0/1** (`plan/T/0/01.md`) — the orchestrator system prompt. New branch `feature/T-0-1-*` cut from `develop`.

> Operator: still awaiting decisions on `G_0_0-1_to_check_by_human.md` (G-before-F ordering) and `C_0_4-1_to_check_by_human.md` (orchestrator-sanitization field).
