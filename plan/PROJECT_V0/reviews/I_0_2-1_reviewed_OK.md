# Review I_0_2-1 — OK

**Task:** `plan/I/0/02.md`
**Trial:** 1
**Branch:** `feature/I-0-2-gemini-policy-audit`
**Commit:** `e662ec6` — `feat(adapters): add gemini policy preflight (I/0/2)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
In-adapter policy preflight added to `delegate`/`spawn`/`ask`: `policy_engine.evaluate` runs **before** any cwd resolution or spawn (ADR-003), denials throw with `err.policy` and audit an `ERROR` event with **no `SESSION_STARTED`**, and all adapter exceptions are audited + rethrown. Deny path verified live. 246 total gateway tests pass. **This task closes Stage I.**

## Checks
- [x] Archivos a crear / modificar — `gateway/src/adapters/gemini_adapter.js` (+`preflight`, ERROR audit, try/catch on delegate/spawn/ask), `tests/gateway/gemini_policy_audit.test.js`, prior gemini tests updated to inject allow-registries.
- [x] Tests requeridos — deny → no spawn + ERROR, allow → SESSION_STARTED+CLOSED, adapter error → ERROR. All green.
- [x] Criterios de aceptacion — every item satisfied (live verification below).
- [x] Errores comunes evitados — `evaluate` runs **before** `spawnSync` (preflight is the first statement in `delegate`/`spawn`); errors are audited **and** rethrown (not suppressed); `ask` is also preflighted (not omitted "because the service did it") — defense in depth.
- [x] Definition of done — commit on `feature/I-0-2-gemini-policy-audit`; CHANGELOG line for I/0/2 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK · ADR-003 (policy before spawn) now enforced **in the adapter** as well as the service.

## Findings
All-green. Live verifications on the working tree at `e662ec6`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 246 # pass 246 # fail 0`; `==> All checks passed.` exit 0.
- **Policy-deny probe** (registries deny `agent.delegate`): `delegate` throws `"policy denied: role coder denies action agent.delegate"`; audit for the trace has **no `SESSION_STARTED`** and **does** have `ERROR` ✅. The denied operation never reaches `auditSessionStarted`, `assertSafeCwd`, or `spawnSync`.
- Statement order in `delegate`/`spawn`: `preflight(...)` → `assertSafeCwd(...)` → `auditSessionStarted(...)` → spawn. Policy is the first gate; cwd guard second; both throw before any process launch.
- `auditAdapterError` records `where`, `error`, and `policy` (the decision object for denials, `null` for other exceptions) — operator can distinguish a policy deny from a runtime failure.
- `git show --stat e662ec6` → the adapter change + the new policy/audit test + updates to the two prior gemini test files (inject explicit registries) + CHANGELOG.

### Decision review (non-blocking)
- `view`/`kill` are **not** preflighted — correct: they observe or close an existing session, they don't launch a process or send a prompt. The launch/input surface (`delegate`/`spawn`/`ask`) is gated. Coder flagged this reasoning.
- Policy denial uses a plain `Error` with `err.policy` attached rather than a new public error class. Acceptable for now; if downstream needs to branch on policy-deny vs runtime-error, a `PolicyDeniedError` (as used in J/0/1's task service) could be reused later. Non-blocking.

## Stage I status — CLOSED
- [x] I/0/0 Gemini headless delegate
- [x] I/0/1 Gemini supervised tmux sessions
- [x] I/0/2 Gemini policy + audit integration — **closed by this task**

The Gemini adapter MVP is complete: headless delegate + supervised tmux sessions, both **double-gated** (policy preflight in the adapter + cwd guard) and fully audited (`SESSION_STARTED`/`INPUT`/`CLOSED`/`ERROR`). The I/0/0 forward note (in-adapter policy gate) is now closed.

## Progress snapshot
Closed: A(7)+B(6)+C(6)+D(4)+E(3)+F(4)+G/0/0+T/0/0+T/0/1+J(3)+L(3)+M(4)+N(3)+H(4)+I(3) = **53 tasks** (one M/0/3 KO→OK). Gateway 246 / structure 33 / CLI 25, all green.

## Next step
OK → per `plan/README.md` MVP order, after H+I the next blocks are **Q + R** (approvals async + sessions), then **O** (Claude adapter), then **U** (E2E). Coder advances to **Q/0/0** (`plan/Q/0/00.md`) unless the operator re-prioritises. New branch `feature/Q-0-0-*` cut from `develop`.

> Operator: 3 human-check items remain open (`C_0_4`, `N_0_2`, `J_0_2`). The approval workflow (Stage Q) is where the async-first `approval.request`/`approval.wait` invariants (TM-07, TM-11) get implemented — worth keeping the V4 approval semantics handy during Q review.
