# Antigravity adapter

This document captures the Antigravity CLI (`agy`) integration contract used by
`gateway/src/adapters/antigravity_adapter.js`.

## Binary

- Default: `agy` (configurable via `AGENTS_ANTIGRAVITY_BIN` or `AGENTS_AGY_BIN`).
- Tested version: `Antigravity CLI (agy)`.

## Headless mode

Antigravity CLI supports non-interactive output with `--print`.

Preferred adapter command shape for `delegate`:

```bash
agy --print --output-format json \
  --model <model> --effort <level> "<prompt>"
```

Notes:

- `--output-format` is set to `json` for headless operations.
- CLI permissions remain enabled by default. Set `AGENTS_ANTIGRAVITY_AUTO=1`
  only when the operator explicitly wants `--dangerously-skip-permissions`
  for headless and supervised launches. This does not bypass Gateway policy.
- `--model <id>` is set from the policy-resolved Gateway model. The registry
  default is `gemini-3.8-flash-high`.
- `--effort <level>` is set from the policy-resolved reasoning effort (low, medium, or high).
- Every Antigravity model accepts the same thinking levels: `low`, `medium`
  and `high`, defaulting to `high`. The level is also baked into each model
  slug, so `--effort` refines the variant the slug already selects.
- Allowed canonical models:
  - `gemini-3.8-flash-high`, `gemini-3.8-flash-medium`, `gemini-3.8-flash-low`
  - `gemini-3.7-flash-high`, `gemini-3.7-flash-medium`, `gemini-3.7-flash-low`
  - `gemini-3.6-flash-high`, `gemini-3.6-flash-medium`, `gemini-3.6-flash-low`
  - `gemini-3.5-flash-high`, `gemini-3.5-flash-medium`, `gemini-3.5-flash-low`
  - `gemini-3.1-pro-high`, `gemini-3.1-pro-low`
- Aliases are provided to resolve more generic model names to their high-effort equivalents before launch:
  - `gemini-3.8-flash` -> `gemini-3.8-flash-high`
  - `gemini-3.7-flash` -> `gemini-3.7-flash-high`
  - `gemini-3.6-flash` -> `gemini-3.6-flash-high`
  - `gemini-3.5-flash` -> `gemini-3.5-flash-high`
  - `gemini-3.1-pro` -> `gemini-3.1-pro-high`

## Supervised tmux mode

Supervised mode launches the interactive `agy` CLI inside a managed tmux pane:

- Build a unique tmux target with `buildTmuxTarget`.
- Start a tmux session through `TmuxClient` / `tmux_client.js` helpers.
- Launch `agy` inside the supervised session with resolved parameters.
- Preferred supervised command launch line:
  ```bash
  agy --model <model> --effort <level>
  ```
- With the default permission mode, inspect and answer approval prompts in
  the supervised pane; record manual interventions through
  `session.intervention_note`. A pending prompt is not a completed action.
- Send follow-up prompts through `tmux send-keys`.
- Capture the pane for `view` / `ask` snapshots.
- Audit `SESSION_STARTED`, `SESSION_INPUT`, `SESSION_CLOSED`, and adapter errors consistently.

## Dry-run fallback

When `AGENTS_DRY_RUN=1` or `config.dryRun` is enabled, the adapter returns deterministic mock results and audits `SESSION_STARTED` / `SESSION_CLOSED`. Network access, tmux, and the real `agy` binary are not required in dry-run mode.

## Default operation checklist

1. Use the base `policies/` registry unless a task explicitly needs a custom profile.
2. Set `AGENTS_ANTIGRAVITY_BIN` or `AGENTS_AGY_BIN` if `agy` is not on your `PATH`.
3. Run the Antigravity adapter tests via `npm test` inside the gateway folder.
4. Validate supervised tmux mode on the operator machine before deploying real workflows.
