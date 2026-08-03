# Review T_0_2-1 — OK

**Task:** `plan/T/0/02.md`
**Trial:** 1
**Branch:** `feature/T-0-2-operator-guide`
**Commit:** `6b03734` — `docs: add operator guide (T/0/2)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Client-agnostic operator guide landed at `docs/operator-guide.md`: clone → install → validate → CI → MCP stdio launch → prompt → dry-run → approvals → troubleshooting → out-of-scope. No operator-absolute paths; Cursor/Antigravity named only as out-of-scope. 292 gateway / 39 structure / 29 CLI tests pass. **This task closes Stage T.**

## Checks
- [x] Archivos a crear / modificar — `docs/operator-guide.md`, `tests/structure/test_operator_guide.py` (4 tests).
- [x] Tests requeridos — guide exists, mentions `policy validate`, references generic MCP config, marks IDEs out of scope. All green.
- [x] Criterios de aceptacion — operator can reach a dry-run by following it; Cursor/Antigravity only as out-of-scope; no absolute paths.
- [x] Errores comunes evitados — not an IDE tutorial; placeholders (`<this repo>`, `<traceId>`, `<allowed path>`) instead of operator paths; stdout-corruption troubleshooting included.
- [x] Definition of done — commit on `feature/T-0-2-operator-guide`; CHANGELOG line for T/0/2 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK · `agents-gateway` server name used.

## Findings
All-green. Live verifications on the working tree at `6b03734`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → 292 gateway / 39 structure / 29 CLI; `==> All checks passed.` exit 0.
- `grep -nE "/home/|/Users/" docs/operator-guide.md` → no matches ✅ (placeholders only).
- Cursor/Antigravity appear only at line 4 (host-agnostic disclaimer) and line 133 (out-of-scope list) — never as setup instructions ✅.
- The guide links `client-config/mcp.json.example` (T/0/0) and `prompts/orchestrator_system_prompt.md` (T/0/1) rather than documenting a specific host — consistent with the project's IDE-out-of-scope stance.
- Nice detail: the §7 dry-run example shows `agent.spawn { ..., taskId: <returned> }` — i.e. it documents passing a **real `taskId`** from `task.assign`, which is exactly the usage pattern that sidesteps the O/0/2 `taskId: null` session-persistence gap. The happy-path docs are self-consistent.
- `git show --stat 6b03734` → exactly the guide + the structure test + CHANGELOG.

## Stage T status — CLOSED
- [x] T/0/0 Generic MCP client config
- [x] T/0/1 Orchestrator system prompt
- [x] T/0/2 Operator guide — **closed by this task**

Config + prompt + operator guide are complete; a fresh operator has a documented path from clone to dry-run without reading Gateway internals.

## Next step
OK → per `plan/README.md` MVP order, the final block is **U** (E2E + MVP close). Coder advances to **U/0/0** (`plan/U/0/00.md`). New branch `feature/U-0-0-*` cut from `develop`.

> **Operator — the U stage is the MVP gate and leans directly on the open human-checks:** `U/0/4` (bypass regression) consumes the `N_0_2` visibility matrix; the E2E flow exercises the `O_0_2` AgentService + `taskId` semantics. Resolving `C_0_4`, `N_0_2`, and the `O_0_2`/`taskId` decision before/early in U will avoid rework. 6 human-check files are in `plan/reviews/`.
