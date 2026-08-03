# Review U_0_0-1 — OK

**Task:** `plan/U/0/00.md`
**Trial:** 1
**Branch:** `feature/U-0-0-restricted-flow-e2e`
**Commit:** `beda829` — `test(e2e): add restricted dry-run flow (U/0/0)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
MVP restricted-flow E2E landed: an in-process harness wires the **real** services + dry-run adapters and routes `artifact.get` through the actual policy-gated MCP tool. The full canonical flow (orchestrate → assign restricted → spawn → raw put → orchestrator-denied → reviewer-sanitized → approval → complete) passes, with the secret **provably redacted** and the orchestrator **never** receiving raw. Wired into `./scripts/ci.sh`. 292 gateway / 39 structure / 29 CLI / 1 e2e all green. Task U/0/0 is closed.

## Checks
- [x] Archivos a crear / modificar — `tests/e2e/helpers/gateway_harness.js`, `tests/e2e/mvp_restricted_flow.test.js`, `scripts/ci.sh` (+E2E block).
- [x] Tests requeridos — restricted flow end-to-end. Green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — raw_diff **never** returned to orchestrator (asserted `POLICY_DENIED` + secret-absence); `cleanup()` removes the temp workspace and resets singletons; tests use injected timestamps/dry-run (no real-clock flakiness).
- [x] Definition of done — commit on `feature/U-0-0-restricted-flow-e2e`; CHANGELOG line for U/0/0 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths (uses temp workspace) · no `orchestrator/` component: OK · no real CLIs/network (dry-run).

## Findings
All-green. Live verifications on the working tree at `beda829`:

- `node --test tests/e2e/mvp_restricted_flow.test.js` → `# pass 1 # fail 0`.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → structure 39 / gateway 292 / **E2E 1** / CLI 29; `==> All checks passed.` exit 0. The new `==> E2E tests (node --test)` block runs `node --test tests/e2e/**/*.test.js` (ci.sh lines 24-25).
- **Faithful, not shortcut:** the harness routes `artifacts.get` through the **real `artifact.get` MCP tool handler** (which applies `policy_engine.evaluate`) and `share` through `shareArtifact` — so the E2E exercises the actual policy-gated paths, not the raw store. Gemini + Claude adapters are both registered in a real `createAdapterRegistry`.
- **Core TM-02 invariant proven end-to-end:**
  - `rawForOrchestrator.error === "POLICY_DENIED"` — orchestrator denied direct raw access.
  - `sharedForReviewer.decision === "allow_with_sanitization"`; the reviewer **and** the orchestrator read the sanitized artifact (`classification: "internal"`), and **both assert `!content.includes("AKIAFAKEKEY")`** — the injected secret (`token = 'AKIAFAKEKEY1234'`) is redacted by the `secret.token` rule before any boundary crossing.
- Approval `pending → granted`; session killed; orchestration completed.
- Audit asserts all 10 lifecycle events using the **real** event names (`SANITIZATION_APPLIED`, not the spec's pseudocode `ARTIFACT_SANITIZED`) — the coder verified actual emitted names.
- `git show --stat beda829` → harness + test + ci.sh + CHANGELOG.

### Decision review (non-blocking — all sound)
- **In-process harness** instead of spawning the MCP stdio server. Justified: the services/core APIs are directly importable and this keeps the test deterministic without JSON-RPC framing. (A future U task could add a stdio-level smoke if end-to-end protocol coverage is wanted, but it's not required here.)
- **Real `taskId`** threaded from `task.assign` into `agent.spawn` — sidesteps the O/0/2 `taskId: null` persistence gap, and the `kill({sessionId})` at the end works because the session row was persisted. This is the correct usage pattern and validates that the O/0/2 AgentService works end-to-end **when a taskId is supplied** (the gap only bites with `taskId: null`).
- Adapted the spec's pseudocode API names (`createOrchestration`, `assignTask`, `SANITIZATION_APPLIED`, `requesterRole`) to the implemented ones. Correct — the spec's sample was illustrative.

## Stage U status
- [x] U/0/0 Restricted-flow E2E dry-run — **closed by this task**
- [ ] U/0/1..U/0/4 pending — including **U/0/4 bypass regression** (consumes the N/0/2 visibility matrix) and the MVP close-out.

## Next step
OK → coder advances to **U/0/1** (`plan/U/0/01.md`). New branch `feature/U-0-1-*` cut from `develop`.

> **Operator — the open human-checks are now on the critical path for U/0/4:** `N_0_2` (visibility matrix incl. the `security_reviewer` denial) is the source of truth U/0/4 will lock as bypass-regression; `C_0_4` (orchestrator-sanitization) governs the same boundary this E2E just exercised. Resolving them before U/0/4 avoids re-baselining the regression suite. 6 human-check files await in `plan/reviews/`.
