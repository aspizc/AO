# Review B_0_0-1 — OK

**Task:** `plan/B/0/00.md`
**Trial:** 1
**Branch:** `feature/B-0-0-agent-capabilities-registry`
**Commit:** `f5341e8` — `feat(registry): add agent-capabilities.json with V4 boundaries (B/0/0)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Agent capabilities registry landed with the right V4 boundaries: only `gemini-cli` holds `restricted`, `orchestrator` role enabled for `gemini-cli` and `claude-code`, `codex` disabled until P/0/0, `protectedBranches` includes `main`/`master`/`release/*`. 5/5 registry tests pass and `./scripts/ci.sh` is green end-to-end (8 gateway tests now). Task B/0/0 is closed.

## Checks
- [x] Archivos a crear / modificar — `policies/agent-capabilities.json`, `tests/gateway/registry_agent_capabilities.test.js`, and one out-of-scope-but-justified edit to `gateway/package.json` (see "Decision review" below).
- [x] Tests requeridos — B-T0.1 … B-T0.5 all present and green via `npm --prefix gateway test` / `./scripts/ci.sh`.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — `restricted` is NOT in `claude-code` or `codex`; no absolute paths/secrets/API keys; `orchestrator` role kept for both human-facing CLIs (TM-02 reinforcement).
- [x] Definition of done — commit on `feature/B-0-0-agent-capabilities-registry`; CHANGELOG line for B/0/0 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `f5341e8`:

- `python3 -m json.tool policies/agent-capabilities.json > /dev/null` → valid JSON.
- `grep -E "/home/|/Users/|secret|api_?key|token" policies/agent-capabilities.json` → no matches (no leaked operator paths, no secrets).
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → 8 gateway tests pass (3 scaffold + 5 new registry), structure + CLI also green. `==> All checks passed.` exit 0.
- `git show --stat f5341e8` → exactly the 2 prescribed files + the package.json tweak + CHANGELOG entry.

### Decision review (non-blocking, agreed)
- The coder modified `gateway/package.json`'s `test` script to also glob `../tests/gateway/**/*.test.js`. The spec's "Archivos a crear / modificar" doesn't list this file, but the spec's verification line **does** say `npm --prefix gateway test` must pick up the new test (which lives at repo-root `tests/gateway/`, not `gateway/tests/`). The original A/0/2 scaffold's glob was `tests/**/*.test.js` resolved relative to `gateway/`, which would not have found `tests/gateway/registry_*.test.js`. The fix is necessary and minimal. Welcome.
- Using `fileURLToPath(import.meta.url)` to resolve the registry path instead of `process.cwd()` is the correct call: the test now works whether invoked from `gateway/` or from repo root. Stricter than the spec's example.

## Stage B status
- [x] B/0/0 Agent capabilities — **closed by this task**.
- [ ] B/0/1..B/0/5 still pending.

## Next step
OK → coder advances to **B/0/1** (next file in `plan/B/0/`). Read `plan/B/README.md` for stage flow and `plan/B/0/01.md` for the task. New branch will follow `feature/B-0-1-*` cut from `develop`.
