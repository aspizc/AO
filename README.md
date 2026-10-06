# AO — Agents Orchestrator

[![CI](https://github.com/aspizc/AO/actions/workflows/ci.yml/badge.svg)](https://github.com/aspizc/AO/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

AO is an open-source, local-first MCP Gateway (`agents-gateway`) that mediates
safe collaboration between LLM coding agents over stdio and offers an optional
Redis coordination plane for independently running orchestrators.

Created and maintained by **Carlos Asensio Pizarro**.

## Project status

AO is under active development. `main` contains reviewed integrations; there
is no tagged release as of 2026-10-06. Package version `0.1.0` is development
metadata, not a published release.

The latest verified implementation is [`ea18f4e`](https://github.com/aspizc/AO/commit/ea18f4e01e76bfe2cd087ae8ffb06ea3975202e3):
**2,625 passed, 0 failed, 12 declared integration skips**. The full local gate
exited zero with `infrastructure_unavailable`, because PostgreSQL,
Gateway/Temporal integration, and optional live providers were unavailable.
See [current capabilities and evidence](docs/project-status.md) for the exact
candidate, verification limits, and remaining work.

Important: there is no privileged standalone orchestrator inside the Gateway.
A human-facing LLM can take the orchestrator role, and optional peer clients
may run independently; the Gateway remains the enforcement boundary for
policy-governed actions. See
[ADR-002](docs/adr/ADR-002-no-orchestrator-component.md).

## Quickstart

Prerequisites: a Node.js version from the [runtime contract](docs/node-runtime.md),
Python 3.11, and `uv` on `PATH`. CI pins uv `0.11.21`; lock regeneration
requires that exact version. The complete repository gate requires Linux
(including WSL2), Docker for the documented tmux build, a compatible
[pinned tmux runtime](docs/tmux-runtime.md), and disposable Redis 7.

```bash
git clone https://github.com/aspizc/AO.git
cd AO
uv venv --python 3.11 .venv
source .venv/bin/activate
uv pip sync --require-hashes requirements.lock
uv pip install --no-deps --no-build-isolation -e cli -e orchestrator-langgraph --offline
npm --prefix gateway ci
agent-run policy validate
node scripts/smoke_mcp.mjs
node --test tests/e2e/mcp_two_agent_workflow.test.js
```

The smoke and two-agent tests use dry-run adapters. They exercise the MCP
surface without calling a real provider. For supervised execution, install and
authenticate the selected CLI and prepare the compatible tmux runtime first.
The [operator guide](docs/operator-guide.md) covers repository registration,
MCP host setup, dry-run calls, and troubleshooting.

Configure the host to launch `node ./gateway/src/mcp_server.js` from this
checkout with MCP server name `agents-gateway`. Start with `AGENTS_DRY_RUN=1`.
Set `AGENTS_REQUEST_PRINCIPAL_AGENT=codex` for a Codex host; the default is
`claude-code`. This identifies the host, independently of the coder/reviewer
agents it launches. Use the [generic client configuration](client-config/README.md).

The legacy `node scripts/smoke_mvp2.mjs` currently fails at `task.assign`
with `REQUEST_CONTEXT_DENIED` because it creates a new Gateway connection
for each call. Use the persistent-connection test above for the dry-run flow;
see [known limits](docs/project-status.md#known-operator-limits).

## Agents and models

The canonical [provider profile](gateway/contracts/orchestrator-profile-v1.json)
and `policies/agent-capabilities.json` govern availability and selection.

| Agent | Default selection | Execution |
|---|---|---|
| Codex | `gpt-5.6-sol`, effort `max`, tier `priority` | Headless and supervised |
| Claude Code | `claude-fable-5`, effort `max` | Headless and supervised |
| Antigravity CLI | `gemini-3.8-flash-high`, effort `high` | Headless and supervised; permission bypass is opt-in |
| pi | `ollama/qwen3.8:27b`, effort `medium` | Optional CLI; explicit provider setup |
| OpenCode | `ollama/qwen3.8:27b` | Optional CLI; explicit provider setup |
| Gemini CLI | `gemini-2.5-pro` | Registry-only in the current executable profile |

Explicit alternatives include `gpt-6.1-sol` (`gpt-6.1`, default effort `xhigh`),
`gpt-6-astra` (`astra`), `claude-sonnet-5-5` (`sonnet-5.5`), and
`claude-opus-5-5` (`opus-5.5`). These entries do not change AO's defaults or
prove live provider availability. See the [Codex](docs/adapters/codex.md),
[Claude](docs/adapters/claude-code.md), [Antigravity](docs/adapters/antigravity.md),
[pi](docs/adapters/pi.md), and [OpenCode](docs/adapters/opencode.md) guides.

## Architecture Summary

```text
human-facing orchestrator -> Gateway MCP -> coder child + reviewer child
                                 |
                      policy / state / audit / artifacts
                                 |
                 optional Redis coordination for independent peers
```

The Gateway exposes [33 versioned tools](docs/mcp-tool-catalog.md) over stdio:
25 core tools and eight `coordination.*` tools. It applies deterministic
registry policy, server-owned request/task/repository bindings, asynchronous
approvals, sanitization, and audited agent sessions. Logs go to stderr.
SQLite is the default durable state store.

The practical two-agent flow uses Codex as coder and Claude as reviewer.
The historical P/0/3 activation path is superseded by Stage W and the
[MVP2.0 runbook](docs/mvp2-orchestrator-runbook.md). `writer` and `editor`
roles also support prose and documentation workflows.

The coordination tools are `coordination.status`, `coordination.register`,
`coordination.heartbeat`, `coordination.discover`, `coordination.unregister`,
`coordination.send`, `coordination.receive`, and `coordination.ack`. The
three message-tool contracts under `message.*` remain unchanged.

Optional coordination provides leased presence, discovery, addressed inboxes,
reclaim, and transport ACK over Redis 7 standalone. MCP clients and trusted
local Node clients share the same service. With no configured Redis URL,
coordination returns `COORDINATION_UNAVAILABLE`; unrelated Gateway tools remain
available. Messages cannot grant repository, review, merge, or approval authority.
Read the [architecture](docs/architecture.md) and
[coordination runbook](docs/coordination-bus.md).

For iterative work, assign tasks before `agent.spawn`, reuse sessions through
`agent.ask`/`agent.view`, store artifacts, obtain an independent review, and
close sessions with `agent.kill` before `orchestration.complete`. Review,
integration, publication, promotion, and release are separate states. The
[planning runbook](docs/planning-loop-runbook.md) and
[installable skills](skills/README.md) describe the workflow.

## Verification and scope

After preparing tmux and an isolated disposable Redis endpoint, run the
[operator guide's CI procedure](docs/operator-guide.md#4-run-local-ci):

```bash
AGENTS_TEST_REDIS_URL=redis://127.0.0.1:6380/0 ./scripts/ci.sh
```

The [CI contract](docs/ci-contract.md) defines locks, supply-chain verification,
lint, structure, Gateway, E2E, CLI, LangGraph, and live Redis lanes. Missing
required Redis fails the gate. Declared external-service skips remain visible;
exit zero alone does not establish an all-infrastructure pass.

`agent-run doctor --json` provides read-only local diagnostics. Coordination
and runtime-authority probes still have explicit unavailable boundaries; see
[Doctor's implementation and limits](docs/doctor.md).

MVP2.0 scope is recorded in [ADR-005](docs/adr/ADR-005-mvp2-scope.md) and the
[acceptance checklist](docs/mvp2-acceptance-checklist.md). V5 extends that
foundation; [plan/](plan/README.md) retains the imported planning and review
history. Planned sheets are not delivered capabilities.

PostgreSQL, Temporal, real provider execution, and the optional
[LangGraph client](orchestrator-langgraph/README.md) have distinct integration
requirements and verification limits. Multi-user authentication, cloud hosting,
Redis Cluster/Sentinel, and IDE-specific configuration are outside the current
verified path. No standalone privileged orchestrator binary is provided.

Dependency installation consumes the checked-in locks. For an intentional
Python dependency update, use `./scripts/requirements_lock.sh` followed by
`./scripts/requirements_lock.sh --check`; use `--upgrade` only when upgrading
versions is the intended change. See the [release contract](docs/release-candidate.md)
for candidate evidence and supply-chain verification.

## Runtime Environment

| Variable | Default | Description |
|---|---|---|
| `AGENTS_WORKSPACE` | `<repo>/workspace` | Root for artifacts, audit, and state. |
| `AGENTS_POLICIES_DIR` | `<repo>/policies` | Registries directory. |
| `AGENTS_STATE_DB` | `<workspace>/state/state.db` | SQLite state database path. |
| `AGENTS_AUDIT_LOG` | `<workspace>/audit/events.jsonl` | Audit JSONL path. |
| `AGENTS_REDIS_URL` | empty | Optional Redis URL for the legacy audit publisher and the coordination fallback; disabled when empty. |
| `AGENTS_REDIS_STREAM` | `agents:events` | V1 experimental Redis Streams audit/event stream name. |
| `AGENTS_ARTIFACT_STORE` | `<workspace>/artifacts` | Artifact store root. |
| `AGENTS_COORDINATION_REDIS_URL` | `AGENTS_REDIS_URL` or disabled | Redis URL used only by the V5 coordination plane. |
| `AGENTS_COORDINATION_PREFIX` | `agents:coord:v1` | Dedicated coordination key prefix; must not overlap `agents:events`. |
| `AGENTS_COORDINATION_SCOPE_ID` | `agents-orchestrator` | Canonical coordination scope for this Gateway instance. |
| `AGENTS_COORDINATION_LEASE_DEFAULT_MS` | `900000` | Default participant lease; must not exceed the configured maximum. |
| `AGENTS_COORDINATION_LEASE_MAX_MS` | `259200000` | Maximum accepted participant lease and v1 ceiling (72 hours). |
| `AGENTS_COORDINATION_INBOX_MAX_LEN` | `10000` | Per-participant inbox capacity bound. |
| `AGENTS_COORDINATION_MAX_BLOCK_MS` | `30000` | Maximum server-side blocking receive duration. |
| `AGENTS_COORDINATION_COMMAND_CONCURRENCY` | `64` | Maximum admitted in-flight operations on the persistent command client. |
| `AGENTS_COORDINATION_COMMAND_QUEUE_MAX` | `256` | Maximum queued command operations before explicit backpressure. |
| `AGENTS_COORDINATION_BLOCKING_QUEUE_MAX` | `32` | Maximum queued blocking receives behind the dedicated blocking client. |
| `AGENTS_COORDINATION_SHUTDOWN_TIMEOUT_MS` | `2000` | Maximum graceful drain before owned Redis clients are cancelled. |
| `AGENTS_COORDINATION_MESSAGE_MAX_BYTES` | `65536` | Maximum UTF-8 message body size and v1 upper bound. |
| `AGENTS_COORDINATION_DEDUPE_TTL_MS` | `86400000` | Equal-send idempotency window. |
| `AGENTS_COORDINATION_ACK_TOMBSTONE_TTL_MS` | `86400000` | Exact ACK retry window. |
| `AGENTS_COORDINATION_ORPHAN_INBOX_TTL_MS` | `86400000` | Retention applied when stale inbox cleanup is scheduled. |
| `AGENTS_TMUX_PREFIX` | `ag-` | tmux session prefix. |
| `AGENTS_REPO_ROOTS` | empty | Colon-separated cwd allowlist. |
| `AGENTS_REQUEST_PRINCIPAL_AGENT` | `claude-code` | Agent identity of the MCP host, set at Gateway launch (for example `codex`). Caller arguments must match it. |
| `AGENTS_REQUEST_CONTEXT_TTL_MS` | `86400000` | Positive integer lifetime of the connection request context in milliseconds; expired contexts deny protected actions. |
| `AGENTS_APPROVAL_MAX_WAIT_MS` | `60000` | Server-side cap on `approval.wait`. |
| `AGENTS_AUTOAPPROVE` | empty | Comma-separated approval scopes to auto-grant; default off and bounded by ADR-006. |
| `AGENTS_AGENT_TIMEOUT_MS` | `600000` | Server-side cap for agent `delegate` and `ask`. |
| `AGENTS_MESSAGE_ACCESS_SECRET` | empty | Direct message access secret; when empty the Gateway loads or creates the file-backed secret. |
| `AGENTS_MESSAGE_ACCESS_SECRET_FILE` | `<workspace>/secrets/message-access.key` | File-backed message access secret path used when `AGENTS_MESSAGE_ACCESS_SECRET` is empty. |
| `AGENTS_DRY_RUN` | `0` | If `1`, adapters do not spawn real subprocesses. |
| `AGENTS_CODEX_BIN` | `codex` | Codex CLI binary for real Codex adapter execution. |
| `AGENTS_CODEX_SANDBOX` | `workspace-write` | Sandbox passed to `codex exec`. |
| `AGENTS_ANTIGRAVITY_BIN` | `agy` | Antigravity CLI binary. |
| `AGENTS_AGY_BIN` | `agy` | Shorthand alias for `AGENTS_ANTIGRAVITY_BIN`. |
| `AGENTS_ANTIGRAVITY_AUTO` | `0` | Explicit opt-in to Antigravity permission bypass. |
| `AGENTS_OTEL_ENABLED` | `false` | V1 experimental telemetry flag; set truthy to enable OTel-inspired export. |
| `AGENTS_OTEL_EXPORTER` | `stderr` | V1 experimental telemetry exporter. |
| `AGENTS_OTEL_SERVICE_NAME` | `agents-gateway` | V1 experimental telemetry service name. |

The optional pi and OpenCode adapters additionally read `AGENTS_PI_BIN`,
`AGENTS_OPENCODE_BIN`, `AGENTS_OPENCODE_AUTO`, and `AGENTS_OLLAMA_BASE_URL`.
Their setup and defaults are documented in the
[pi](docs/adapters/pi.md) and [OpenCode](docs/adapters/opencode.md) guides.

## Documentation

- [docs/project-status.md](docs/project-status.md) — current implementation, verification, and release status.

- [skills/README.md](skills/README.md) — project-local audit, Gateway
  orchestration, and cross-process coordination skills for Codex and Claude.
- [docs/operator-guide.md](docs/operator-guide.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/coordination-bus.md](docs/coordination-bus.md)
- [docs/kya-implementation-runbook.md](docs/kya-implementation-runbook.md)
- [docs/mvp2-orchestrator-runbook.md](docs/mvp2-orchestrator-runbook.md)
- [docs/planning-loop-runbook.md](docs/planning-loop-runbook.md)
- [docs/mvp2-acceptance-checklist.md](docs/mvp2-acceptance-checklist.md)
- [docs/threat-model.md](docs/threat-model.md)
- [docs/mvp-acceptance-checklist.md](docs/mvp-acceptance-checklist.md)
- [docs/operator-cli-contract.md](docs/operator-cli-contract.md)
- [docs/adr/ADR-005-mvp2-scope.md](docs/adr/ADR-005-mvp2-scope.md)
- [docs/adr/ADR-006-bounded-autoapprove.md](docs/adr/ADR-006-bounded-autoapprove.md)
- [docs/adr/ADR-V5-01-redis-coordination-plane.md](docs/adr/ADR-V5-01-redis-coordination-plane.md)
- [docs/adapters/claude-code.md](docs/adapters/claude-code.md)
- [docs/adapters/codex.md](docs/adapters/codex.md)
- [docs/adapters/antigravity.md](docs/adapters/antigravity.md)
- [docs/adapters/pi.md](docs/adapters/pi.md)
- [docs/adapters/opencode.md](docs/adapters/opencode.md)
- [client-config/local-models/README.md](client-config/local-models/README.md)
- [docs/doctor.md](docs/doctor.md) — implemented diagnostic core and its current limits
- [docs/release-candidate.md](docs/release-candidate.md)
- [docs/adr/](docs/adr/)
- [client-config/mcp.json.example](client-config/mcp.json.example)
- [plan/](plan/README.md) — project index; the V5 coordination delivery tree
  is [plan/PROJECT_V5/](plan/PROJECT_V5/README.md)
- [plan_proyecto_v4.md](plan_proyecto_v4.md)

## License

Copyright (c) 2026 Carlos Asensio Pizarro.

AO is open-source software released under the [MIT License](LICENSE).

## Contributing

Issues and pull requests are welcome. Prepare the documented Redis and tmux
prerequisites, then run the local quality gate:

```bash
AGENTS_TEST_REDIS_URL=redis://127.0.0.1:6380/0 ./scripts/ci.sh
```
