# Review V_0_2-1 — OK

**Task:** plan/V/0/02.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** 405ea34 — feat(claude): pass selected model to adapter (V/0/2)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
The Claude adapter now honors the policy-resolved `model`: headless `delegate`
adds `--model <id>` before the prompt and supervised `spawn` launches the tmux
session with `--model`, both omitting the flag when no model is given. No
hardcoded default (registry/policy owns it). All acceptance criteria met; suite
green **and now stable**. Verdict: **OK**. Closes Stage V.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/adapters/claude_adapter.js` (`buildClaudeArgs`/`buildClaudeLaunch` add `--model` conditionally; dry-run reports `model=`; `spawn` returns `launchCommand`), `tests/gateway/claude_adapter.test.js`, `docs/adapters/claude-code.md`, `claude_policy.test.js` (now expects registry default propagated), CHANGELOG.
- [x] Tests requeridos (ran: `node --test tests/gateway/claude_adapter.test.js` → 10/10; **full suite ×5 → 334/334 every run**; `./scripts/ci.sh` → all checks passed). Required cases present: real passes `--model`, omits when absent, spawn launch line includes model, dry-run reports model.
- [x] Criterios de aceptacion — `delegate` real → `claude --model <id>` when model present; `spawn` tmux launch includes `--model`; no `--model` when null (compat); effective default `claude-opus-4-7` comes from the registry (not hardcoded); fake-binary tests green.
- [x] Errores comunes evitados — no hardcoded model in the adapter; no `--model` when null; supervised branch covered (not only headless); fake binary used, never real `claude`.
- [x] Definition of done — commit on branch, conventional message references V/0/2, CHANGELOG line, adapter docs updated. Closes Stage V. PR draft deferred (project no-push pattern).
- [x] Global invariants — English; no push; no `orchestrator/` dir; no restricted paths.

## Findings
Clean and complete. `buildClaudeArgs`/`buildClaudeLaunch` keep the flag construction in one place for both paths, and `launchCommand` gives the supervised path test observability.

**Flaky #66 — RESOLVED.** Commit `42d1cac` (`fix(artifacts): stabilize sanitized artifact ordering`) applies exactly the root-cause fix flagged in the V/0/0 verdict: `ORDER BY created_at, artifact_id` → `created_at, rowid` in `artifact_repo.js` (same timestamp-collision + random-UUID-tiebreaker class as the S/0/1 message bug). The previously flaky `put raw restricted creates sanitized artifact` (#66) now passes **5/5** full-suite runs (was ~2/10). The CI gate is reliable again. Nice cleanup beyond V/0/2's scope.

Process note: `plan/W/` working-tree edits remain the coder's uncommitted WIP — left untouched.

## Next step
- OK → Stage V complete (model selection plumbed end-to-end + Claude honors it). Coder advances; per the MVP2.0 roadmap, Stage W (real Codex) is next.
