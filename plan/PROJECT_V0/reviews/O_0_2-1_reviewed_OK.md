# Review O_0_2-1 — OK

**Task:** `plan/O/0/02.md`
**Trial:** 1
**Branch:** `feature/O-0-2-claude-policy-enforcement`
**Commit:** `113b674` — `test(adapters): enforce claude restricted policy (O/0/2)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Integration test proves `claude-code` cannot spawn on a restricted repo (`cvision`) — denied with `POLICY_DENIED` **before any `SESSION_STARTED`** — via a new minimal `AgentService` (policy-first dispatch). Dry-run delegate on `sample-apps` allowed. 292 total gateway tests pass. **This task closes Stage O.** The AgentService is a forward-dependency stand-in flagged to the human for Stage K.

## Checks
- [x] Archivos a crear / modificar — `tests/gateway/claude_policy.test.js`, `gateway/src/services/agent_service.js` (new — Stage K stand-in).
- [x] Tests requeridos — claude spawn on cvision denied before tmux (no SESSION_STARTED), dry-run delegate on sample-apps allowed. All green.
- [x] Criterios de aceptacion — every item satisfied (live probe below).
- [x] Errores comunes evitados — the **deny** case is the headline test (not just allow); the test exercises policy, not tmux (no skip-if-tmux-missing).
- [x] Definition of done — commit on `feature/O-0-2-claude-policy-enforcement`; CHANGELOG line for O/0/2 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK · policy-before-action (the AgentService checks policy before adapter dispatch).

## Findings
All-green. Live verifications on the working tree at `113b674`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 292 # pass 292 # fail 0`; `==> All checks passed.` exit 0.
- **O/0/2 acceptance probe** (through `AgentService`):
  - `svc.spawn({ agent: "claude-code", repo: "cvision", ... })` → `POLICY_DENIED` ✅; audit for the trace has **no `SESSION_STARTED`** ✅ (denied before tmux).
  - `svc.delegate({ agent: "claude-code", repo: "sample-apps", ... })` dry-run → allowed ✅.
- `AgentService` checks policy (`assertAllowed`) **before** `adapters.get(agent)` and before adapter execution — defense in depth on top of the adapter's own preflight (policy is evaluated at both layers; for a deny the service short-circuits first).
- `git show --stat 113b674` → the policy test + the new AgentService + CHANGELOG.

## Operator decision required — `O_0_2-1_to_check_by_human.md` (AgentService stand-in)

This task introduces a **whole new service** (`agent_service.js`) ahead of its owning Stage K, because O/0/2's spec exercises the adapter "through AgentService". This is larger than the earlier one-file stand-ins, so it warrants a real decision. Two points for the operator:

1. **Accept as Stage K base, or refactor?** The coder asks whether Stage K should adopt this AgentService as-is or replace it. My assessment: the implementation is sound and minimal (policy-first dispatch, `PolicyDeniedError`, delegate/spawn/ask/view/kill, service-error audit) and is a reasonable K base — but Stage K should review it as *its own* deliverable rather than inheriting it unexamined.

2. **`taskId: null` session-persistence gap (concrete).** `sessions.task_id` is `NOT NULL` (F/0/0 schema), but O/0/2's example passes `taskId: null`. The coder chose to **skip session persistence when `taskId` is absent**. Consequence: `spawn(..., taskId: null)` returns a `sessionId` but persists **no** session row — so a subsequent `ask`/`view`/`kill` by that `sessionId` will throw `unknown session`. For O/0/2's tests this is invisible (they only test deny + dry-run delegate), but **Stage K must resolve it**: either (a) require a valid `taskId` for every session-producing op, or (b) relax the `sessions.task_id` constraint (migration) to allow task-less sessions. Until then, supervised `spawn → ask/view/kill` only works end-to-end when a real `taskId` is supplied. Flagging so Stage K closes the loop and U/0/x E2E doesn't trip on it.

Neither point blocks O/0/2 — its acceptance criteria (Claude denied on restricted, allowed on unrestricted, no SESSION_STARTED on deny) are fully met.

## Stage O status — CLOSED
- [x] O/0/0 Claude CLI research
- [x] O/0/1 Claude adapter implementation
- [x] O/0/2 Claude policy enforcement — **closed by this task**

Claude adapter is operational on non-restricted repos and provably blocked on restricted ones.

## Progress snapshot
Closed: A(7)+B(6)+C(6)+D(4)+E(3)+F(4)+G/0/0+T/0/0+T/0/1+J(3)+L(3)+M(4)+N(3)+H(4)+I(3)+Q(5)+R(3)+O(3) = **64 tasks** (one M/0/3 KO→OK). Gateway 292 / structure 35 / CLI 29, all green.

## Next step
OK → per `plan/README.md` MVP order, the final block is **U** (E2E + MVP close). Coder advances to **U/0/0** (`plan/U/0/00.md`) unless the operator re-prioritises. New branch `feature/U-0-0-*` cut from `develop`.

> **Operator — please prioritise the open human-check items before U/0/4:** `C_0_4` + `N_0_2` (sanitized-raw policy vocabulary) and the `O_0_2` AgentService/`taskId` decision all feed the U-stage E2E + bypass-regression. The G/J/R "ahead-of-dependency" confirmations are low-risk. 6 human-check files now exist in `plan/reviews/`.
