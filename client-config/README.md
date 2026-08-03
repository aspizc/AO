# Generic MCP client config

This directory contains a minimal, host-agnostic MCP configuration example for
connecting an MCP-capable client to the `agents-gateway` server.

The same stdio server exposes the eight V5 `coordination.*` tools, including
read-only `coordination.status`. Listing tools is network-lazy; coordination calls return `COORDINATION_UNAVAILABLE`
until a Redis URL is configured, while unrelated tools continue to work.

## Profiles

- `profiles/codex-coder-claude-reviewer/`: MVP2.0 real-mode profile for a
  generic MCP host using Codex as coder and Claude as reviewer.
- `profiles/planner-assisted/`: Stage Z planning profile for a generic MCP host
  using Claude as planner and apply coder over `plan/**`.

## Server entry shape

| Field | Description |
|---|---|
| `transport` | `"stdio"`. The Gateway speaks JSON-RPC over stdin/stdout. |
| `command` | Binary to invoke. Use `"node"` from the [supported runtime contract](../docs/node-runtime.md). |
| `args` | Array of arguments. Must include the path to `gateway/src/mcp_server.js`. |
| `env` | Map of environment variables. See "Required env vars" below. |

## Required env vars

| Var | Required | Default | Notes |
|---|---|---|---|
| `AGENTS_WORKSPACE` | recommended | `<repo>/workspace` | Root for runtime artifacts, audit, and state. |
| `AGENTS_POLICIES_DIR` | recommended | `<repo>/policies` | Registries directory. |
| `AGENTS_STATE_DB` | optional | `<workspace>/state/state.db` | SQLite state database path. |
| `AGENTS_AUDIT_LOG` | optional | `<workspace>/audit/events.jsonl` | Audit JSONL path. |
| `AGENTS_COORDINATION_REDIS_URL` | optional | `AGENTS_REDIS_URL` or disabled | Dedicated Redis URL for the V5 coordination plane. |
| `AGENTS_COORDINATION_PREFIX` | optional | `agents:coord:v1` | Dedicated coordination namespace; must not overlap `agents:events`. |
| `AGENTS_COORDINATION_SCOPE_ID` | optional | `agents-orchestrator` | Canonical coordination scope accepted by this Gateway instance. |
| `AGENTS_TMUX_PREFIX` | optional | `ag-` | tmux session prefix. |
| `AGENTS_REPO_ROOTS` | required for spawn | empty | Colon-separated cwd allowlist. |
| `AGENTS_APPROVAL_MAX_WAIT_MS` | optional | `60000` | Server-side cap on `approval.wait`. |
| `AGENTS_AGENT_TIMEOUT_MS` | optional | `600000` | Server-side cap for agent `delegate` and `ask`. |
| `AGENTS_DRY_RUN` | optional | `0` | Set `1` for dry-run mode. |

See [`../docs/coordination-bus.md`](../docs/coordination-bus.md) for the full
coordination configuration, lease lifecycle, delivery semantics, and secure
Redis deployment requirements.

## Out of scope: IDE/host specifics

Configuring Cursor, Antigravity IDE, or any specific MCP host is out of scope
for this project. The example above is intentionally minimal and
host-agnostic. Adapting it to your client's syntax, such as an IDE config file,
a CLI config directory, or a custom harness, is the operator's responsibility.

The project commits to:

- Keeping `agents-gateway` as the server name.
- Keeping `transport: stdio` and the environment variable contract.
- Maintaining a host-agnostic smoke checklist.
