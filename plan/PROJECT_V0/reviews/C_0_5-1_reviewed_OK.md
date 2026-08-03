# Review C_0_5-1 — OK

**Task:** `plan/C/0/05.md`
**Trial:** 1
**Branch:** `feature/C-0-5-policy-explain-tests`
**Commit:** `ebd4351` — `feat(policy): add explain traces and table tests (C/0/5)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
`explain()` added with per-layer trace; `evaluate()` refactored onto a shared `runPipeline`. 20-row canonical table test all green; `docs/policy-examples.md` mirrors the table. 103 gateway tests pass. **This task closes Stage C — the policy engine is complete and transparent.**

## Checks
- [x] Archivos a crear / modificar — `gateway/src/core/policy_engine.js` (+`runPipeline`, +`explain`), `tests/gateway/policy_explain.test.js` (3 tests), `tests/gateway/policy_table.test.js` (20 cases), `docs/policy-examples.md`.
- [x] Tests requeridos — ≥ 20 table rows (exactly 20, all green); `explain` returns `layers[]`; `evaluate`/`explain` pure; docs reflect the table.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — trace stops at first non-allow (verified by `explain_stops_trace_after_first_non_allow_decision`); `evaluate` and `explain` share one pipeline so they can't drift; no I/O.
- [x] Definition of done — commit on `feature/C-0-5-policy-explain-tests`; CHANGELOG line for C/0/5 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `ebd4351`:

- `grep -cE '^\s+\[' tests/gateway/policy_table.test.js` → `20` table rows ✅ (meets the ≥ 20 requirement).
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 103 # pass 103 # fail 0` + structure (18) + CLI (8); `==> All checks passed.` exit 0.
- `explain(...)` returns `{ decision, reason, ruleId, layers, context }`; `layers` is the full `{ name, result }` trace (richer than the spec's `{name, decision}` minimum — preserves each layer's full result object, decision included). The explain test asserts the layer-name order `["classification","role","approval","sanitization"]` and the short-circuit behaviour.
- `docs/policy-examples.md` table has all 20 rows matching the test cases exactly (caller / role / repo / action / extra / decision), with a note to keep doc + test in sync on registry changes.
- `runPipeline` is the single source of truth — `evaluate` returns `.final`, `explain` returns final + trace. The `evaluate_returns_the_same_final_decision_as_explain` test locks they never diverge.
- `git show --stat ebd4351` → exactly the prescribed files plus CHANGELOG.

### C/0/4 human-review flag (acknowledged, not my decision)
The coder wrote `plan/reviews/C_0_4-1_to_check_by_human.md` raising the exact `role === "orchestrator"` hardcode concern I flagged in the C/0/4 review, with a suggested `canConsumeSanitizedRaw` registry field as future cleanup. This is correctly routed to the human operator; I am not deciding it. It does not affect C/0/5 (the table test's orchestrator-raw row passes against current behaviour).

## Stage C status — CLOSED
- [x] C/0/0 Policy model
- [x] C/0/1 Classification boundary
- [x] C/0/2 Role and orchestrator rules
- [x] C/0/3 Approval rules
- [x] C/0/4 Sanitization rules
- [x] C/0/5 Policy explain + table tests — **closed by this task**

The deterministic policy engine is complete: classification → role → approval → sanitization, with a transparent `explain()` and a 20-case regression table. Threat coverage exercised: TM-01 (orchestrator denials), TM-02/TM-03 (classification boundary), approval gates, and the sanitization contract.

## Next step
OK → per `plan/README.md` MVP ordering, after A+B+C the next priority block is **D** (Audit log + runtime config), then **E** (CLI). Coder advances to **D/0/0** (`plan/D/0/00.md`) unless the operator re-prioritises. New branch `feature/D-0-0-*` cut from `develop`.

> Reminder for the human operator: `plan/reviews/C_0_4-1_to_check_by_human.md` is awaiting your decision on the orchestrator-sanitization design (data-driven role field vs. current name check). Non-blocking, but worth resolving before Stage M (sanitizer implementation) builds on this layer.
