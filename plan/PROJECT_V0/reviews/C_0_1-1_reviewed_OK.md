# Review C_0_1-1 — OK

**Task:** `plan/C/0/01.md`
**Trial:** 1
**Branch:** `feature/C-0-1-classification-policy`
**Commit:** `f6f2cd4` — `feat(policy): add classification boundary evaluation (C/0/1)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Classification-layer policy engine landed: `evaluate(ctx, registries)` is pure, default-denies, and closes TM-02/TM-03 at the data-classification boundary. 7 tests green; full CI: 62 gateway / 18 structure / 8 CLI. Coder also fixed a CI-correctness bug in `gateway/package.json` (see Decision review). Task C/0/1 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/core/policy_engine.js`, `tests/gateway/policy_classification.test.js` (7 tests), plus a one-line fix to `gateway/package.json` (removing test-script fallback that masked failures).
- [x] Tests requeridos — claude/codex denied on `cvision`, gemini allowed on `cvision`, unknown repo denied, excluded path denied, plus the bonus `unknown_agent_is_denied` (fail-closed) and `evaluate_is_deterministic_for_same_input`. All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — `evaluate` is pure (no I/O imports, verified by grep); does not assume `ctx.repo` (`if (ctx.repo)` gate at line 16); does not over-allow (every check short-circuits with `deny`); reasons are informative and `ruleId`-tagged.
- [x] Definition of done — commit on `feature/C-0-1-classification-policy`; CHANGELOG line for C/0/1 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `f6f2cd4`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 62 # pass 62 # fail 0` + structure (18) + CLI (8); `==> All checks passed.` exit 0. Total gateway is now 55 + 7 = 62.
- `grep -E 'from "node:(fs|net|http|...)"' gateway/src/core/policy_engine.js` → no matches ✅ pure module.
- `evaluate(...)` shape: returns `{ decision, reason, ruleId }` consistently for both allow and deny paths.
- The 5 deny `ruleId` values are explicit and stable: `agent.unknown`, `repo.unknown`, `classification.agent_not_allowed`, `classification.repo_not_allowed`, `classification.excluded_path`. C/0/5 explain-fn will be able to surface these as-is.
- `git show --stat f6f2cd4` → exactly the 2 prescribed files plus the package.json fix and CHANGELOG entry.

### Decision review (non-blocking, agreed — actually a quiet bug fix)
- **`gateway/package.json` test-script fix:** old script was
  ```
  node --test tests/**/*.test.js ../tests/gateway/**/*.test.js || node --test
  ```
  The `|| node --test` fallback would silently run `node --test` (which auto-discovers tests under the cwd `gateway/`) whenever the primary invocation failed. Result: failures in repo-root `tests/gateway/*` could be masked because the fallback succeeded on the smaller `gateway/tests/` set. Coder removed the fallback:
  ```
  node --test tests/**/*.test.js ../tests/gateway/**/*.test.js
  ```
  Failures now propagate. This is a real CI-correctness improvement — welcome and arguably should have been spotted in B/0/0 when the path glob was first widened. Documenting here so future reviewers see the rationale.
- `excluded_path` test uses a hand-built fake `registries` object (only `getAgent`/`getRepo` shapes matter for this code path). That's clean: doesn't require seeding `excludedPaths` into the real `repositories.json`. Welcome.
- `evaluate_is_deterministic_for_same_input` test is a nice addition — locks the "function is pure" acceptance criterion directly.

## Stage C status
- [x] C/0/0 Policy model
- [x] C/0/1 Classification boundary — **closed by this task**
- [ ] C/0/2..C/0/5 pending

## Next step
OK → coder advances to **C/0/2** (`plan/C/0/02.md`). New branch `feature/C-0-2-*` cut from `develop`.
