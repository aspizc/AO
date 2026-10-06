# Codex adapter

`gateway/src/adapters/codex_adapter.js` provides the Codex adapter for
Gateway-managed work. The `codex` entry in `policies/agent-capabilities.json` is
enabled by default; policy still gates each invocation before any subprocess or
tmux operation.

## Current behavior

- The adapter can be registered in the generic adapter registry as `codex`.
- If a custom operator registry disables Codex, `delegate`, `spawn`, `ask`,
  `view`, and `kill` fail with a clear `ADAPTER_DISABLED` error before any
  subprocess or tmux operation.
- Enabled `delegate` applies policy preflight, validates `cwd` with the shared
  repo root guard, writes session lifecycle audit events, and honors the
  policy-resolved `model`, `reasoningEffort`, and `serviceTier`.
- Real headless mode runs `codex exec` with the configured binary and sandbox.
- Supervised tmux mode launches interactive `codex` with the same resolved
  model, reasoning effort, service tier, sandbox, and cwd.

## Model selection

The public default is `gpt-6.1-sol` (alias `gpt-6.1`) / `max` / `priority`.
An explicit alternative is `gpt-6-astra` (aliases `astra` and `gpt-6`, default
effort `max`). Both declare
`low|medium|high|xhigh|max|ultra` in the Gateway contract. Legacy `sol`, `terra`,
`luna`, and `gpt-5.6` aliases retain their existing versioned targets.

The canonical [provider profile](../../gateway/contracts/orchestrator-profile-v1.json)
and capability registries own the complete catalog. Registration verifies
Gateway selection behavior; it does not prove that a logged-in provider can
serve the selected model. Choose `serviceTier: "default"` explicitly when the
operator wants the non-priority tier.

## Headless mode

The real command shape is:

```bash
codex exec -m gpt-6.1-sol -c model_reasoning_effort="max" \
  -c service_tier="priority" \
  -s workspace-write -C <cwd> "<prompt>"
```

Notes:

- `AGENTS_CODEX_BIN` selects the binary; default is `codex`.
- `AGENTS_CODEX_SANDBOX` selects the sandbox; default is `workspace-write`.
- `-m`, `model_reasoning_effort`, and `service_tier` come from the Gateway
  policy decision. `priority` is the Codex Fast tier.
- `-C` uses the `cwd` after `AGENTS_REPO_ROOTS` allowlist validation.
- CI uses a fake binary; real Codex CLI validation is an operator check.

## Supervised tmux mode

The supervised launch line is:

```bash
codex -m gpt-6.1-sol -c model_reasoning_effort="max" \
  -c service_tier="priority" -s workspace-write -C <cwd>
```

The adapter:

- creates a tmux session with the shared gateway naming convention;
- sends the launch line through `tmux send-keys`;
- supports `ask`, `view`, and `kill` through the shared tmux helpers;
- audits `SESSION_STARTED`, `SESSION_INPUT`, and `SESSION_CLOSED`;
- keeps dry-run deterministic for CI.

## Default operation checklist

1. Use the base `policies/` registry unless a task explicitly needs a custom
   profile.
2. Set `AGENTS_CODEX_BIN` if `codex` is not on `PATH`.
3. Keep `AGENTS_CODEX_SANDBOX=workspace-write` unless a later reviewed task
   changes the sandbox policy.
4. Run the Codex adapter tests with the fake binary coverage.
5. Validate supervised tmux mode on the operator machine before using Codex for
   real workflows.

Codex is allowed for `restricted` repositories when the repository registry also
lists `codex` in `allowedAgents`. The adapter still runs the shared policy
engine before any process or tmux operation.
