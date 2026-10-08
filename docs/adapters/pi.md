# pi adapter

`pi` is the pi coding agent (`@earendil-works/pi-coding-agent`; the older
`@mariozechner/pi-coding-agent` name is deprecated and still ships the same `pi`
binary). The adapter drives it headlessly with `--print` and supervised in tmux.

Verified against `pi 0.73.1`.

## Command shape

Headless (`agent.delegate`):

```bash
pi --model <provider/id> --thinking <level> --print --mode json "<prompt>"
```

Supervised (`agent.spawn`) launches the interactive TUI, so the same line
without `--print`:

```bash
pi --model <provider/id> --thinking <level>
```

Notes:

- `--model` takes `provider/id`, which is exactly the model id the registry
  resolves — the provider is never a separate flag.
- `--thinking` is the reasoning dimension and accepts
  `off | minimal | low | medium | high | xhigh`. That enum *is* the agent's
  `reasoningEfforts` in the registry, so `max` and `ultra` are denied by policy
  rather than failing inside the CLI.
- `--mode json` gives a parseable event stream; `--mode text` is the default and
  is what a human reads in the pane.
- `AGENTS_PI_BIN` overrides the binary.

## Models

| model id | where it runs | needs |
|---|---|---|
| `ollama/qwen3.8:27b` (default) | local, through Ollama | a running Ollama |
| `ollama/qwen3-coder:30b` | local, through Ollama | a running Ollama |
| `moonshotai/kimi-k3` | Moonshot API | `MOONSHOT_API_KEY` |

Aliases: `qwen`, `qwen-coder`, `kimi`, `kimi-k3`.

**Kimi K3 is registered but unusable until a key exists.** The adapter checks the
provider's credential *before* launching and throws `MODEL_CREDENTIAL_MISSING`
naming `MOONSHOT_API_KEY`, so a missing key reads as one refusal instead of a
provider-shaped error from deep inside the CLI.

## Local models

pi discovers custom providers from `~/.pi/agent/models.json`. The Ollama
provider this adapter expects is:

```json
{
  "providers": {
    "ollama": {
      "name": "Ollama (local)",
      "baseUrl": "http://127.0.0.1:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        {
          "id": "qwen3.8:27b",
          "reasoning": true,
          "contextWindow": 262144,
          "maxTokens": 32768,
          "compat": { "thinkingFormat": "qwen" }
        },
        { "id": "qwen3-coder:30b", "contextWindow": 262144, "maxTokens": 32768 }
      ]
    }
  }
}
```

A reference copy lives in `client-config/local-models/pi-models.json`. Confirm pi
sees them with `pi --list-models | grep ollama`.

Choose the Ollama context length and concurrency for the model and available
memory. The optional [local-model examples](../../client-config/local-models/README.md)
show configuration; verify capacity on the machine that runs the provider.

The adapter also exports `OLLAMA_BASE_URL`/`OLLAMA_HOST` to the child process,
taken from `AGENTS_OLLAMA_BASE_URL` and defaulting to
`http://127.0.0.1:11434/v1`, so a non-default endpoint needs no config edit.

## Role-derived CLI permissions

Both launches derive boolean `writeAccess` from the target agent, role and
repository policy: only `code.write` = `allow` grants it. Non-writers receive
`--tools read,grep,find,ls`; writers keep the existing tools. The allowlist
excludes `bash`, but it is a tool restriction, not an OS sandbox. Results and
`SESSION_STARTED` record `writeAccess`.
