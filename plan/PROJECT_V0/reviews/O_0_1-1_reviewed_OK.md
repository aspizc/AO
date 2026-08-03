# Review O_0_1-1 — OK

**Task:** `plan/O/0/01.md`
**Trial:** 1
**Branch:** `feature/O-0-1-claude-adapter`
**Commit:** `7b3de4a` — `feat(adapters): add claude adapter (O/0/1)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
`ClaudeAdapter` landed mirroring the Gemini adapter: `delegate/spawn/ask/view/kill`, policy preflight + `assertSafeCwd` double-gating, dry-run for all methods, real headless via the O/0/0-verified `claude --print ...` command (array args, no shell), and full audit lifecycle. Interface-identical to Gemini. 290 total gateway tests pass. Task O/0/1 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/adapters/claude_adapter.js`, `tests/gateway/claude_adapter.test.js`.
- [x] Tests requeridos — dry-run delegate (rejects if not allow), dry-run spawn/ask/view/kill cycle. All green.
- [x] Criterios de aceptacion — adapter passes dry-run tests; interface matches Gemini (`delegate/spawn/ask/view/kill`); no policy bypass (preflight on delegate/spawn/ask).
- [x] Errores comunes evitados — headless uses the **verified** `claude --print --output-format json --permission-mode dontAsk --no-session-persistence` (not an invented flag); `spawnSync` with array (no shell); tmux target keyed by `agent: "claude-code"` (won't collide with Gemini's).
- [x] Definition of done — commit on `feature/O-0-1-claude-adapter`; CHANGELOG line for O/0/1 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK · `claude-code` agent id matches `agent-capabilities.json`.

## Findings
All-green. Live verifications on the working tree at `7b3de4a`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 290 # pass 290 # fail 0`; `==> All checks passed.` exit 0.
- Adapter probe:
  - `delegate` dry-run → `{ dryRun: true, exitCode: 0 }` ✅
  - `spawn` → `tmuxTarget` contains `claude-code`, `attachCommand` starts with `tmux attach` ✅
  - policy deny (registries deny `agent.delegate`) → `delegate` throws `policy denied: role coder denies...`, **no `SESSION_STARTED`**, `ERROR` audited ✅ (double-gating works)
- Structure mirrors `gemini_adapter.js`: same `preflight` → `assertSafeCwd` → audit → spawn ordering; same prompt-200-char audit truncation; same `assertTmuxOk` guards; same dry-run branches.
- **Real headless mode implemented** (not deferred): the coder correctly resolved the spec's "TODO until O/0/0 confirms a flag" — O/0/0 *did* confirm `claude --print`, so implementing real headless with the documented flags is the right call, not a deviation.
- `git show --stat 7b3de4a` → exactly the 2 prescribed files plus the CHANGELOG entry.

### Decision review (non-blocking)
- Adapter not auto-registered in a registry — consistent with the Gemini adapter (neither is auto-registered yet; `createAdapterRegistry` is generic). The coder noted the AgentService/tool wiring (Stage K) will `register("claude-code", new ClaudeAdapter(...))` at the construction point. Correct — no speculative wiring.
- `claude-code` has **no `restricted` classification** (B/0/0). The adapter doesn't special-case this — it relies on the policy engine to deny restricted repos to claude-code (verified across C/0/1 + the deny probe). Defense-in-depth via `assertSafeCwd` + preflight holds regardless.

## Stage O status
- [x] O/0/0 Claude CLI research
- [x] O/0/1 Claude adapter implementation — **closed by this task**
- [ ] O/0/2 pending (last task of Stage O)

## Next step
OK → coder advances to **O/0/2** (`plan/O/0/02.md`), the last task of Stage O. New branch `feature/O-0-2-*` cut from `develop`.
