# opencode adapter

`opencode` is the opencode CLI (npm `opencode-ai`). The adapter drives it
headlessly with `opencode run` and supervised in tmux.

Verified against `opencode 1.18.20`.

## Command shape

Headless (`agent.delegate`):

```bash
opencode run -m <provider/model> --format json "<prompt>"
```

Supervised (`agent.spawn`) launches the TUI, which takes the same `-m`:

```bash
opencode -m <provider/model>
```

Notes:

- `-m` / `--model` takes `provider/model`, which is exactly the model id the
  registry resolves.
- `--format json` emits raw JSON events instead of the formatted transcript.
- `AGENTS_OPENCODE_BIN` overrides the binary.

## Permissions

opencode asks the operator to approve actions. That prompt is right for a watched
pane and wrong for a headless run, so the bypass is **opt-in**: set
`AGENTS_OPENCODE_AUTO=1` (or `opencodeAuto: true` in the adapter config) to add
`--auto`. It is off by default because `--auto` auto-approves every permission
that is not explicitly denied.

## Reasoning effort

opencode exposes `--variant` for "provider-specific reasoning effort". Because
the accepted values differ per provider and are unverified for these models, the
registry declares **no effort dimension** for this agent: `reasoningEfforts` is
`null`, so passing a `reasoningEffort` is denied by policy. The adapter still
forwards one as `--variant` if a future registry declares it, so enabling it is a
registry edit, not a code change.

## Models

| model id | where it runs | needs |
|---|---|---|
| `ollama/qwen3.8:27b` (default) | local, through Ollama | a running Ollama |
| `ollama/qwen3-coder:30b` | local, through Ollama | a running Ollama |
| `moonshotai/kimi-k3` | Moonshot API | `MOONSHOT_API_KEY` |

Aliases: `qwen`, `qwen-coder`, `kimi`, `kimi-k3`.

**Kimi K3 is registered but unusable until a key exists.** The adapter refuses
before launching with `MODEL_CREDENTIAL_MISSING`, naming `MOONSHOT_API_KEY`.
`moonshotai` is already in opencode's own catalog, so the key is the only
missing piece.

## Local models

opencode does not auto-detect Ollama; it needs the provider declared in
`~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama (local)",
      "options": { "baseURL": "http://127.0.0.1:11434/v1" },
      "models": {
        "qwen3.8:27b": { "name": "Qwen3.8 27B (local)" },
        "qwen3-coder:30b": { "name": "Qwen3 Coder 30B (local)" }
      }
    }
  }
}
```

A reference copy lives in `client-config/local-models/opencode.jsonc`. Confirm
opencode sees them with `opencode models | grep ollama`.

## Role-derived CLI permissions

Both launches derive boolean `writeAccess` from the target agent, role and
repository policy: only `code.write` = `allow` grants it. Non-writers receive
`--agent plan` and never `--auto`, even with `AGENTS_OPENCODE_AUTO=1`. Writers
retain the existing agent and opt-in bypass. The plan agent restricts edits
except its own plan files; an allowed shell tool can still write. This is not
an OS sandbox. Results and `SESSION_STARTED` record `writeAccess`.
