# Review V_0_1-1 — OK

**Task:** plan/V/0/01.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** 93d6af9 — feat(agent): plumb model selection through tools (V/0/1)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
`model`/`reasoningEffort` are now plumbed end-to-end: optional on the
`agent.delegate`/`agent.spawn` schemas, resolved+validated by the V/0/0 policy
layer in `AgentService`, and only the **resolved** values are passed to the
adapter and audited as `AGENT_MODEL_RESOLVED`. All acceptance criteria met;
V/0/1 tests deterministic and full CI green. Verdict: **OK**.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/tools/agent.js` (optional `model`/`reasoningEffort` on both schemas + updated descriptions), `gateway/src/services/agent_service.js` (resolve via policy, propagate, audit), `gateway/src/adapters/base_adapter.js` (signature doc), `tests/gateway/tool_agent_model.test.js`, `docs/operator-cli-contract.md`, CHANGELOG.
- [x] Tests requeridos (ran: `node --test tests/gateway/tool_agent_model.test.js` **×3 → 6/6 each** (deterministic); `./scripts/ci.sh` → all green, 330 gateway / 16 E2E / smoke OK). All required cases present: default resolution, allowed→adapter, disallowed denied before adapter, spawn propagation, reasoning-effort only when declared.
- [x] Criterios de aceptacion — both tools accept optional `model`/`reasoningEffort`; policy-resolved model reaches the adapter (`agent_service.js` spreads `effectiveModel(decision)`), invalid model denied before `adapters.get`/call; Gemini works without `model` (compat); effective model audited (`AGENT_MODEL_RESOLVED`).
- [x] Errores comunes evitados — validation stays in policy (not duplicated in the tool); only **resolved** values passed to the adapter, never raw caller input; Gemini not broken; effective model audited.
- [x] Definition of done — commit on branch, conventional message references V/0/1, CHANGELOG line, operator-cli-contract documents the `model` field. PR draft deferred (project no-push pattern).
- [x] Global invariants — English; no push; no `orchestrator/` dir; no restricted paths; logs/audit unaffected.

## Findings
Clean end-to-end plumbing. `effectiveModel(decision)` correctly forwards only what policy resolved, and `auditModelResolved` no-ops when neither field is set (so Gemini/no-model paths stay quiet). base_adapter documents the optional fields so unimplementing adapters ignore them safely until V/0/2 (Claude) / W (Codex).

Reminder (not V/0/1's issue): the pre-existing flaky test `put raw restricted creates sanitized artifact` (#66, ~2/10) did not surface this run but is still latent — see the V/0/0 verdict; it still warrants a dedicated stabilization task.

## Next step
- OK → coder advances to V/0/2 (Claude adapter honors `model`, Opus 4.7).
