# Review T_0_1-1 — OK

**Task:** `plan/T/0/01.md`
**Trial:** 1
**Branch:** `feature/T-0-1-orchestrator-system-prompt`
**Commit:** `96c0536` — `docs(prompts): add orchestrator system prompt (T/0/1)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Client-agnostic orchestrator system prompt landed at `prompts/orchestrator_system_prompt.md`: role + Gateway identity, tool families, standard flow, hard limits, async approval semantics, `policy.check` decision vocabulary, and explicit "this is not the security boundary" disclaimer. No IDE-specific terms. 7 structure tests + full CI green. Task T/0/1 is closed.

## Checks
- [x] Archivos a crear / modificar — `prompts/orchestrator_system_prompt.md`, `tests/structure/test_orchestrator_prompt.py` (7 tests).
- [x] Tests requeridos — exists, mentions gateway + task.assign, denies direct code write, denies raw restricted (+sanitized), async approval semantics (request/poll/wait + non-blocking), policy decision values, no IDE terms. All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — no Cursor/Antigravity/IDE terms (grep + test confirm); explicit "you do **not** write code"; prompt stays focused (~79 lines).
- [x] Definition of done — commit on `feature/T-0-1-orchestrator-system-prompt`; CHANGELOG line for T/0/1 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component (this is a prompt doc, not a process): OK · MCP server name `agents-gateway`: OK.

## Findings
All-green. Live verifications on the working tree at `96c0536`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → 124 gateway / 33 structure / 25 CLI; `==> All checks passed.` exit 0.
- `grep -iE "cursor|antigravity|\.mdc" prompts/orchestrator_system_prompt.md` → no matches ✅.
- Prompt content covers all required sections: tool families, standard flow (orchestration.create → task.assign → delegate/spawn → artifact.share → approval → complete), hard limits (no direct code write, no raw restricted reads, no Gateway bypass, no self-approval, no deny-retry), and async approval semantics with the `pending` caveat.
- Explicit disclaimer (lines 8-9): "This prompt aligns your behavior with policy, but it is not the security boundary. The Gateway policy engine remains authoritative." — exactly the right framing (policy is the boundary, prompt is alignment).
- `policy.check` decision vocabulary (`allow`/`deny`/`require_approval`/`allow_with_sanitization`) matches the C/0/0 `Decision` constants verbatim.
- `git show --stat 96c0536` → exactly the prescribed files plus the CHANGELOG entry.

### Dependency note (non-blocking)
T/0/1 lists `J/0/2, K/0/1, Q/0/2` as dependencies — the stages that actually implement the tools the prompt names (`orchestration.*`, `agent.*`, `approval.*`). Those stages aren't built yet (MVP order front-loads `T/0/1` alongside G). That's fine: a system prompt is **forward-looking documentation** describing the intended tool surface; it doesn't require the tools to exist. It effectively becomes a contract J/K/Q must satisfy. When those land, a quick consistency pass should confirm the tool names/semantics in the prompt still match the implemented tools (e.g. `approval.wait(approvalId, timeoutMs)` signature, `artifact.share` sanitization behaviour). Flagging so J/K/Q reviewers cross-check against this prompt.

## Stage T status
- [x] T/0/0 Generic MCP client config
- [x] T/0/1 Orchestrator system prompt — **closed by this task**
- [ ] T/0/2 pending

## Next step
OK → the MVP priority block `G + T/0/0 + T/0/1` is now complete. Per `plan/README.md`, the next block is **F + J + L** (state, orchestration, artifacts). Coder advances to **F/0/0** (`plan/F/0/00.md`) unless the operator re-prioritises. New branch `feature/F-0-0-*` cut from `develop`.

> Reminder for F: when **F/0/1** implements state, fix the cwd-relative migrations path in `gateway/src/core/state.js` (flagged in the G/0/0 review — use a module-relative path via `import.meta.url`).
>
> Operator: still awaiting decisions on `G_0_0-1_to_check_by_human.md` and `C_0_4-1_to_check_by_human.md`.
