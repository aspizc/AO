# Claude Code adapter

This document captures the Claude Code CLI contract used by
`gateway/src/adapters/claude_adapter.js`.

## Binary

- Default: `claude` (configurable via `AGENTS_CLAUDE_BIN`).
- Tested version: `2.1.207 (Claude Code)`.

## Headless mode

Claude Code supports non-interactive output with `-p` / `--print`.

Minimal verified command:

```bash
claude --print "<prompt>"
```

Preferred adapter command shape:

```bash
claude --print --output-format json --permission-mode dontAsk \
  --no-session-persistence --model claude-fable-5 --effort max "<prompt>"
```

Notes:

- `--output-format` supports `text`, `json`, and `stream-json` when used with
  `--print`.
- `--input-format` supports `text` and `stream-json` when used with `--print`.
- `--max-budget-usd <amount>` is available for bounded headless calls.
- `--model <id>` is set from the policy-resolved Gateway model when provided.
  The adapter omits the flag when no model is resolved, preserving direct-adapter
  compatibility.
- `--effort <level>` is set from the policy-resolved reasoning effort. The
  default registry selects `max`; Claude Code requires this session-only level
  on each launch.
- Allowed canonical models are `claude-sonnet-5`, `claude-fable-5-1`,
  `claude-fable-5`, `claude-opus-5`, and `claude-opus-4-8`. The default remains
  `claude-fable-5`; aliases `sonnet`, `fable`, and `opus` resolve to
  `claude-sonnet-5`, `claude-fable-5`, and `claude-opus-5` before launch.
- Do not use `--dangerously-skip-permissions` or
  `--allow-dangerously-skip-permissions` in the adapter.

## Supervised tmux mode

Supervised mode should mirror the Gemini adapter lifecycle:

- Build a tmux target with `buildTmuxTarget`.
- Start a tmux session through `TmuxClient` / `tmux_client.js` helpers.
- Launch `claude` inside the supervised session.
- Include `--model <id>` and `--effort <level>` in the launch line when the
  Gateway passed resolved values.
- Send follow-up prompts through tmux send-keys.
- Capture the pane for `view` / `ask` snapshots.
- Audit `SESSION_STARTED`, `SESSION_INPUT`, `SESSION_CLOSED`, and adapter
  errors consistently with the other adapters.

The CLI also exposes `--tmux`, but that flag is tied to Claude Code worktree
management. The gateway adapter should use the existing gateway-owned tmux
helpers instead.

## Dry-run fallback

When `AGENTS_DRY_RUN=1`, the adapter should return deterministic mock results
and audit `SESSION_STARTED` / `SESSION_CLOSED`. Network access, authentication,
tmux, and the `claude` binary must not be required in dry-run mode.

## Manual verification checklist

- [x] `claude --version` succeeds and the version is recorded above.
- [x] `claude` is on PATH or `AGENTS_CLAUDE_BIN` points to it.
- [ ] `tmux` is available (`tmux -V`).
- [ ] Adapter dry-run tests pass (`O/0/1`).
- [ ] A real supervised smoke test can launch `claude` in a tmux session from
      an unrestricted repository.
