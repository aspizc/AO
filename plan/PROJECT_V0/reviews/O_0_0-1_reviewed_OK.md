# Review O_0_0-1 — OK

**Task:** `plan/O/0/00.md`
**Trial:** 1
**Branch:** `feature/O-0-0-claude-cli-research`
**Commit:** `7d13269` — `docs(adapters): document claude cli invocation (O/0/0)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Claude CLI invocation research documented at `docs/adapters/claude-code.md`: binary, **really-verified** headless mode (`claude --print`), supervised-tmux mapping onto the gateway helpers, dry-run fallback, and a manual checklist. Flags were confirmed against `claude --help`, not invented. 284 gateway / 35 structure / 29 CLI tests pass. Task O/0/0 is closed.

## Checks
- [x] Archivos a crear / modificar — `docs/adapters/claude-code.md`, `tests/structure/test_claude_adapter_docs.py`.
- [x] Tests requeridos — doc exists, manual checklist with `claude --version`. All green.
- [x] Criterios de aceptacion — doc describes binary/modes/dry-run; manual checklist includes `claude --version`; adapter can proceed (headless **is** confirmed, so no tmux-only fallback needed).
- [x] Errores comunes evitados — no invented flags (the coder ran `claude --help` and recorded only verified flags); version not hardcoded blindly (filled after a real `claude --version` → `2.1.150`).
- [x] Definition of done — commit on `feature/O-0-0-claude-cli-research`; CHANGELOG line for O/0/0 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths committed (see minor note) · no `orchestrator/` component: OK.

## Findings
All-green. Live verification on the working tree at `7d13269`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → 284 gateway / 35 structure / 29 CLI; `==> All checks passed.` exit 0.
- Headless mode **verified real**: `claude --print "<prompt>"` confirmed via `claude --help`; preferred shape `claude --print --output-format json --permission-mode dontAsk --no-session-persistence "<prompt>"` uses only documented flags.
- **Security stance:** explicitly rejects `--dangerously-skip-permissions` / `--allow-dangerously-skip-permissions` for the adapter — correct, the gateway's own policy model is the control, not the CLI's permission bypass.
- Supervised mode maps onto the **gateway-owned** tmux helpers (`tmux_client.js` + `buildTmuxTarget`), explicitly **not** Claude's `--tmux` (which is tied to worktree management) — consistent with the I/0/1 Gemini pattern.
- Dry-run fallback documented (no network/auth/tmux/binary required) — sets the contract O/0/1 will implement.
- `git show --stat 7d13269` → exactly the doc + the structure test + CHANGELOG.

### Minor note (non-blocking)
The doc records the operator-local path `/home/carase/.local/bin/claude` as a research observation. This is **informational in a doc** (the adapter default is `claude` on PATH, configurable via `AGENTS_CLAUDE_BIN` — no hardcoded path in code/config), so it doesn't violate the "no absolute operator paths in registries" rule. If the team prefers docs to stay machine-agnostic, that line could be generalized to "on PATH / `~/.local/bin`", but it's harmless as a research artifact.

## Stage O status
- [x] O/0/0 Claude CLI research — **closed by this task**
- [ ] O/0/1 (Claude adapter implementation), O/0/2 pending

## Next step
OK → coder advances to **O/0/1** (`plan/O/0/01.md`) — the Claude adapter implementation. New branch `feature/O-0-1-*` cut from `develop`. **Reminders for O/0/1:** subclass `BaseAdapter`; mirror the Gemini adapter's **double-gating** (policy preflight + `assertSafeCwd`) and `SESSION_STARTED/INPUT/CLOSED/ERROR` audit; use `spawnSync` with array args (no shell); and remember `claude-code` has **no `restricted` classification** (B/0/0) — a Claude adapter must never operate on a restricted repo (the policy engine already denies it, but the adapter shouldn't assume otherwise).
