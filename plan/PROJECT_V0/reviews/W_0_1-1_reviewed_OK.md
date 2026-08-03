# Review W_0_1-1 — OK

**Task:** plan/W/0/01.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** b40adfe — feat(codex): add supervised tmux lifecycle (W/0/1)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
Codex supervised lifecycle (`spawn`/`ask`/`view`/`kill`) implemented over the
shared tmux helpers, mirroring the Claude/Gemini adapters: `spawn` launches the
**interactive** `codex` (not `codex exec`) with the policy-resolved
model/effort/sandbox/cwd, and all guards run before any tmux call. All
acceptance criteria met; full CI green and stable. Verdict: **OK**.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/adapters/codex_adapter.js` (`spawn`/`ask`/`view`/`kill` + `buildCodexLaunch`), `tests/gateway/codex_supervised.test.js`, `docs/adapters/codex.md`, CHANGELOG.
- [x] Tests requeridos (ran: `node --test tests/gateway/codex_supervised.test.js` → 6/6; `./scripts/ci.sh` → all green, 346 gateway / 16 E2E / smoke OK, stable). Required cases present: spawn dry-run attach command, launch line includes model/effort/sandbox/cwd, disabled denied, restricted denied before tmux, cwd guard before tmux, ask/view/kill dry-run flow.
- [x] Criterios de aceptacion — `spawn` creates the tmux session with interactive `codex` + `-m`/`-c model_reasoning_effort`/`-s workspace-write`/`-C`; `ask`/`view`/`kill` operate on the session; `restricted` denied before tmux and Codex stays disabled by default; dry-run covered, real path operator-validatable.
- [x] Errores comunes evitados — uses interactive `codex` in spawn (not `codex exec`); restricted/disabled/cwd preflight all precede session creation; model/effort/sandbox in the launch line; intervention detection stays best-effort.
- [x] Definition of done — commit on branch, conventional message references W/0/1, CHANGELOG line, codex docs updated. PR draft deferred (project no-push pattern).
- [x] Global invariants — English; no push; no `orchestrator/` dir; no restricted paths; guards before tmux; supervised audit (`SESSION_STARTED`/`SESSION_INPUT`/`SESSION_CLOSED`).

## Findings
Clean mirror of the Claude/Gemini supervised pattern. Guard order verified: `checkEnabled()` → `preflight` (agent.spawn, incl. model/effort → restricted/disallowed denied) → `assertSafeCwd` → tmux `new-session`/`send-keys`. `launchCommand` is returned for dry-run/test observability and `attachCommand` for the operator.

Note (non-blocking, same as W/0/0): real tmux + `codex` execution is not exercised in CI (fake/dry-run only). The interactive `codex` launch argv still needs **operator validation** against the installed codex CLI before enabling Codex (W/0/2).

`plan/W/` specs retain the coder's uncommitted working-tree edits — reviewed against the working-tree spec; left untouched.

## Next step
- OK → coder advances to W/0/2 (enable Codex). Operator: validate the real interactive `codex` launch + tmux session before flipping `enabled: true`.
