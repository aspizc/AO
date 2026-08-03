# Review J_0_1-1 — OK

**Task:** `plan/J/0/01.md`
**Trial:** 1
**Branch:** `feature/J-0-1-task-assignment-service`
**Commit:** `673ada8` — `feat(gateway): add task assignment service (J/0/1)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
`assignTask` landed with **dual policy evaluation** (caller `task.assign` + target work action) before any persistence, trace validation up front, agent auto-selection, and `POLICY_DECIDED` audit on both scopes (even on deny — ADR-003). TM-01/TM-02 protections confirmed live. 5 service tests + 157 total gateway tests pass. Task J/0/1 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/services/task_service.js`, `tests/gateway/task_service.test.js` (5 tests).
- [x] Tests requeridos — orchestrator assigns restricted-coder→gemini, non-orchestrator denied, agent auto-select, invalid target role denied. All green.
- [x] Criterios de aceptacion — every item satisfied (live probes below).
- [x] Errores comunes evitados — **target is evaluated too** (not just caller); `traceId` validated before any policy/persist (`assertTraceExists`); persistence happens **only after both decisions allow** (no orphan tasks on deny).
- [x] Definition of done — commit on `feature/J-0-1-task-assignment-service`; CHANGELOG line for J/0/1 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK · policy-before-action (ADR-003): OK.

## Findings
All-green. Live verification on the working tree at `673ada8`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 157 # pass 157 # fail 0`; `==> All checks passed.` exit 0.
- **TM-02 probe** (assign `claude-code` as `restricted-coder` on `cvision`) → `POLICY_DENIED` ✅ (caller `task.assign` check denies because claude can't assume restricted-coder).
- **Auto-selection probe** (target role `restricted-coder`, no agent given) → `gemini-cli` selected ✅.
- **Audit trail probe** for a trace with one denied + one valid assignment → `ORCHESTRATION_CREATED, POLICY_DECIDED, POLICY_DECIDED, POLICY_DECIDED, TASK_CREATED`:
  - the **denied** TM-02 attempt still wrote a `POLICY_DECIDED` before throwing (ADR-003: audit the decision regardless of outcome) ✅
  - the valid assignment wrote caller `POLICY_DECIDED` + target `POLICY_DECIDED` + `TASK_CREATED` ✅
- `assertTraceExists` throws `ORCHESTRATION_NOT_FOUND` **before** any audit, so invalid scopes don't pollute the audit log.
- Target accepts `allow` and `allow_with_sanitization` (the latter is a valid work decision); all other decisions throw `PolicyDeniedError`.
- `git show --stat 673ada8` → exactly the 2 prescribed files plus the CHANGELOG entry.

### Decision review (non-blocking, agreed)
- **`targetAgent` resolved before the caller check.** Correct: the policy engine's `task.assign` rule needs `targetAgent` + `targetRole` to validate the delegation; evaluating before resolution would spuriously deny valid auto-selection. Coder flagged this.
- **`POLICY_DECIDED` emitted as audit events, not persisted `policy_decisions` rows.** Matches this task's spec and my J/0/0 forward-note (ADR-003 → audit event). The durable `policy_decision_repo` remains available if a later task asks for persisted decision records. Acceptable.

## Stage J status
- [x] J/0/0 Orchestration service
- [x] J/0/1 Task assignment service — **closed by this task**
- [ ] J/0/2 pending (MCP tool wiring for orchestration/task)

## Next step
OK → coder advances to **J/0/2** (`plan/J/0/02.md`) — wiring these services as MCP tools in `gateway/src/tools/` and registering them in `getToolRegistry`. New branch `feature/J-0-2-*` cut from `develop`. When wired, the T/0/1 system prompt's `orchestration.*` / `task.assign` tool names should be cross-checked against the registered tool names.

> Operator: `C_0_4-1_to_check_by_human.md` still open (orchestrator-sanitization field, relevant before Stage M).
