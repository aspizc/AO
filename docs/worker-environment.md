# Gateway worker environment

The `agents-gateway` sets these variables on every child launched through
`agent.delegate` or `agent.spawn` by the five executable providers: Codex,
Claude Code, antigravity, pi and opencode. `gemini-cli` remains registry-only
and is refused before launching a child.

| Variable | Value |
|---|---|
| `AGENTS_WORKER_ROLE` | The child's resolved role, such as `reviewer`. Its presence marks a Gateway worker. |
| `AGENTS_WORKER_TRACE_ID` | The child's orchestration trace id. |
| `AGENTS_WORKER_TASK_ID` | The bound task id, or an empty string when no task is bound. Always set. |

Values come from the server-owned execution binding, or the adapter's own
role, trace and task arguments, never from prompt text. Newline and NUL values
are rejected with the existing invalid-selection error. Explicit values
replace inherited `AGENTS_WORKER_*` markers, including stale task ids.
`AGENTS_TRACE_ID` remains the Gateway's own label and is never reused for the
child's trace. Other inherited Gateway configuration is not stripped.

The marker is **informational, never authority**. Any process can forge it.
A plugin may use it only to suppress orchestrator behaviour, never to unlock
permissions, approve work, or grant review, repository or session authority.
Absence means "not launched by this Gateway", not "orchestrator".

For example, an orchestrator-only plugin hook may stop inside a worker:

```sh
if [ -n "$AGENTS_WORKER_ROLE" ]; then
  exit 0
fi
```

Headless delegates receive the markers in their explicit child environment.
pi and opencode retain their existing `OLLAMA_BASE_URL` / `OLLAMA_HOST`
forwarding alongside the markers.

Supervised spawns pass each marker as a separate `-e KEY=VALUE` argument to
`tmux new-session` (tmux 3.0 or later), without shell interpolation. This
sets the session environment even when the tmux server has a stale environment.
The CLI `launchCommand` does not contain the markers. Spawn results include
`newSessionArgv`, the frozen string array passed to tmux, in both dry-run and
live mode. The service verifies its command, session target, and exactly one
matching environment pair for each server-owned marker before returning it.
Supervised pi/opencode forwarding of `OLLAMA_*` is outside this contract.
