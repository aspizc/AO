# Ollama provider configuration

These examples configure `pi` and `opencode` to use an Ollama endpoint at
`http://127.0.0.1:11434/v1`. The Gateway does not install these files. Review and
merge them with any existing CLI configuration before copying them:

```bash
mkdir -p ~/.pi/agent ~/.config/opencode
cp client-config/local-models/pi-models.json ~/.pi/agent/models.json
cp client-config/local-models/opencode.jsonc ~/.config/opencode/opencode.jsonc
```

Install Ollama and the provider CLI separately, start the model server, and pull
one of the model IDs declared in your Gateway policy and CLI configuration:

```bash
ollama serve
# In another terminal:
ollama pull qwen3.8:27b
# Optional alternative:
ollama pull qwen3-coder:30b
```

Check that the CLI can discover and invoke your selected model:

```bash
pi --list-models
opencode models
```

## Capacity and endpoint configuration

Choose context length and parallelism for the model, available memory, and task.
The example model context windows describe CLI capabilities; they do not allocate
server memory or guarantee that a particular machine can serve that context.
Measure a representative request before increasing concurrent agent sessions.
Ollama settings such as `OLLAMA_CONTEXT_LENGTH` and `OLLAMA_NUM_PARALLEL` belong in
your server configuration.

The Gateway forwards `AGENTS_OLLAMA_BASE_URL` to child processes as
`OLLAMA_BASE_URL` and `OLLAMA_HOST`. Ensure the selected CLI provider configuration
uses the intended endpoint; the example files contain a literal loopback URL.
If using a remote server, update that provider URL and the Gateway environment
consistently. Requests go to the configured endpoint. A remote endpoint sends
prompts and repository context off the local machine.
