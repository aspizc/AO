# Review Q_0_2-1 — OK

**Task:** `plan/Q/0/02.md`
**Trial:** 1
**Branch:** `feature/Q-0-2-approval-mcp-tools`
**Commit:** `cc7ce14` — `feat(approvals): add approval MCP tools (Q/0/2)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
`approval.request/respond/poll` MCP tools added, delegating to the Q/0/1 service. `request` is non-blocking, `respond.decision` is restricted to `granted|denied`. Registry now lists 14 tools. 265 total gateway tests pass. Task Q/0/2 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/tools/approval.js`, `gateway/src/tools/index.js` (registry), `tests/gateway/tool_approval.test.js`, scaffold/bootstrap/registry test counts updated.
- [x] Tests requeridos — request returns pending (timing < 100ms), respond granted/denied, poll status. All green.
- [x] Criterios de aceptacion — 3 tools listed; `approval.request` doesn't wait; audit `APPROVAL_REQUIRED/GRANTED/DENIED` (via service).
- [x] Errores comunes evitados — `decision` is `z.enum(["granted","denied"])` (no `expired` from the tool); tools reuse the service so the Q/0/0 state guards + Q/0/1 idempotency are preserved.
- [x] Definition of done — commit on `feature/Q-0-2-approval-mcp-tools`; CHANGELOG line for Q/0/2 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `cc7ce14`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 265 # pass 265 # fail 0`; `==> All checks passed.` exit 0.
- Registry now lists 14 tools, including `approval.request`, `approval.respond`, `approval.poll` ✅.
- `approval.respond` schema restricts `decision` to `granted|denied` (Zod enum) — the operator can't push `expired` through the tool.
- Tools delegate to the Q/0/1 service verbatim, so non-blocking `request`, idempotent `respond`, and the underlying Q/0/0 SQL/race guards all carry through.
- The test asserts `approval.request` completes well under the blocking threshold (timing assertion) — guards against accidental blocking.
- `git show --stat cc7ce14` → the tool module + registry + the test + scaffold/bootstrap test updates + CHANGELOG.

### Note on the `approval.respond` MCP path
The MCP `approval.respond` tool itself does not check the caller's role — it relies on the **policy layer** (C/0/2: the `orchestrator` role is denied `approval.respond`) being applied by whatever calls this tool, and on the operator path (`agent-run approve`, Q/0/3) being the intended caller. For the MVP this matches the design (the tool surfaces the capability; policy governs who may invoke it). When Q/0/3 / the gateway tool-dispatch wires per-tool policy enforcement, confirm `approval.respond` is gated to the operator and denied to the `orchestrator` role end-to-end. Non-blocking for Q/0/2.

## Stage Q status
- [x] Q/0/0 Approval state machine
- [x] Q/0/1 Async approval service
- [x] Q/0/2 Approval MCP tools — **closed by this task**
- [ ] Q/0/3 (`agent-run approve` CLI), Q/0/4 (bounded `wait`, TM-11) pending

## Next step
OK → coder advances to **Q/0/3** (`plan/Q/0/03.md`) — the `agent-run approve` operator CLI (the human side of `approval.respond`). New branch `feature/Q-0-3-*` cut from `develop`.
