# Review V_0_0-1 — OK

**Task:** plan/V/0/00.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** fb5c2c1 — feat(policy): add agent model registry rules (V/0/0)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
Model vocabulary added to the agent-capabilities registry (per-agent `models` +
`defaultModel`, Codex `reasoningEfforts`/default) with a deterministic policy
layer that resolves the default and denies disallowed models/efforts before any
adapter call. V/0/0's own tests are green and `agent-run policy validate` passes.
Verdict: **OK** — with one prominent flag about a pre-existing flaky test that is
unrelated to this task (below).

## Checks
- [x] Archivos a crear / modificar — `policies/agent-capabilities.json` (version→2, `models`/`defaultModel` for all three, Codex `reasoningEfforts`+`defaultReasoningEffort`), `schemas/agent-capabilities.schema.json` (optional new fields + fixtures), `gateway/src/core/policy_engine.js` (`resolveModel`/`resolveReasoningEffort`/`evaluateModel`), `policy_types.js`, `registry.js` (cross-field validation), `tests/gateway/policy_model.test.js`, CHANGELOG.
- [x] Tests requeridos — `tests/gateway/policy_model.test.js` present with all 6 required cases (default/allowed/disallowed model, codex default-effort=medium, disallowed effort, no-models-block compat). Ran: that file's cases pass **deterministically**; `agent-run policy validate` → OK. (See Findings re: full-suite flakiness.)
- [x] Criterios de aceptacion — registry declares models/default + Codex effort; policy resolves default and denies disallowed with clear reason + ruleId `agent.model.allowed` / `agent.reasoning_effort.allowed`; allow decision carries resolved `model`/`reasoningEffort` (accumulated in the pipeline); validation runs as a layer **before** role/approval, i.e. before any spawn (ADR-003).
- [x] Errores comunes evitados — `model` stays optional (agents without a `models` block keep validating; Gemini/Claude unaffected); models read from registry, not hardcoded; registry `version` bumped; validation is pre-spawn.
- [x] Definition of done — commit on branch, conventional message references V/0/0, CHANGELOG line present. V/0/0 tests green. PR draft deferred (project no-push pattern).
- [x] Global invariants — English; no push; no `orchestrator/` dir; no restricted paths; model list is local/versioned (no remote catalog lookups).

## Findings
V/0/0 is correct and well-scoped. `resolveModel`/`resolveReasoningEffort` fall through cleanly for agents without the block (compat), deny with actionable reasons, and the resolved values ride along on the allow decision for the caller to pass to the adapter (V/0/1 plumbing). MVP2.0 base is in place.

**Flag (pre-existing, NOT introduced by V/0/0 — does not block this task):**
The full gateway suite has a flaky test: **`put raw restricted creates sanitized artifact`** (#66), failing ~2/10 runs (passed 4/4, then 2/3 failed, ~2/10 over repeats). It lives in the **artifact-sanitization** area (Stage M/N), which `fb5c2c1` does not touch — the coder also disclosed it as "unrelated intermittent." This is the same class of non-determinism as the earlier S/0/1 issue: likely cross-file contamination of the process-global state/audit singletons.

Recommendation: open a dedicated task/trial to stabilize that sanitization test (deterministic ordering / per-test isolation), since it undermines the reliability of `./scripts/ci.sh` as the MVP gate. It should not be fixed inside V/0/0 (out of scope).

Process note: the `plan/W/` working-tree edits (Stage W now repurposed toward real Codex per the V README) remain the coder's uncommitted WIP — left untouched per operator decision.

## Next step
- OK → coder advances to V/0/1 (propagate `model` through tools/service). Separately, please schedule a fix for the flaky sanitization test #66.
