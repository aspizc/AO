# AO — Agents Orchestrator

[![CI](https://github.com/aspizc/AO/actions/workflows/ci.yml/badge.svg)](https://github.com/aspizc/AO/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

AO is an open-source, local-first MCP Gateway (`agents-gateway`) that mediates
safe collaboration between LLM coding agents over stdio and offers an optional
Redis coordination plane for independently running orchestrators.

Created and maintained by **Carlos Asensio Pizarro**.

Current release: v0.1.0, closing MVP2.0 plus PROJECT_V3 hardening.

Important: there is no privileged standalone orchestrator inside the Gateway.
A human-facing LLM can take the orchestrator role, and optional peer clients
may run independently; the Gateway remains the enforcement boundary for
policy-governed actions. See
[ADR-002](docs/adr/ADR-002-no-orchestrator-component.md).

## Quickstart

Clone the repository:

```bash
git clone https://github.com/aspizc/AO.git
cd AO
```

Use a Node.js version accepted by the
[canonical Node runtime contract](docs/node-runtime.md). The Gateway npm
install enforces that contract.

Install local dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
uv pip sync requirements.lock
pip install --no-deps -e "cli[dev]" -e "orchestrator-langgraph"
npm --prefix gateway install
```

`requirements.lock` is generated with `uv pip compile` from the Python
subproject manifests. It locks the transitive Python environment while the
editable installs keep local package code live without re-resolving
dependencies. Regenerate it after dependency changes with the pinned
universal/hash contract:

```bash
./scripts/requirements_lock.sh --upgrade
```

Validate policy registries and run the full local gate:

```bash
agent-run policy validate
AGENTS_TEST_REDIS_URL=redis://127.0.0.1:6380/0 ./scripts/ci.sh
```

`./scripts/ci.sh` runs the required release verifier, structure tests, Gateway
tests, E2E tests, CLI tests, Orchestrator LangGraph tests, and the isolated
Redis 7 live lane. Supply your disposable Redis endpoint through
`AGENTS_TEST_REDIS_URL`; a missing endpoint makes the gate fail. The E2E suite
uses dry-run adapters and does not require real agent CLI execution. See the
[CI contract](docs/ci-contract.md) for the exact required lanes and skip policy.
Session tests also require the [pinned tmux runtime](docs/tmux-runtime.md);
the public CI workflow builds it from verified inputs automatically.

The [canonical MCP tool catalog](docs/mcp-tool-catalog.md) lists the complete
versioned public surface. Runtime schemas, published JSON Schemas, examples,
and safe error allowlists come from the same typed source.

The required release lane is offline and fail-closed: it rebuilds the complete
lock graph across the reviewed Python environment matrix, validates the
lock-derived SBOM/licenses, and verifies 1:1 primary OSV evidence. Candidate
collection pins Git tree/blob bytes and signed independent reviews. See the
[release contract](docs/release-candidate.md) and
[ADR-V5-02](docs/adr/ADR-V5-02-pinned-release-evidence.md).

For a step-by-step operator path from clone to dry-run, read
[docs/operator-guide.md](docs/operator-guide.md).

For the MVP2.0 two-agent operator smoke, run:

```bash
node scripts/smoke_mvp2.mjs
```

It defaults to dry-run. Set `AGENTS_DRY_RUN=0` only when `tmux`, Codex, and
Claude are installed and logged in.

## Architecture Summary

```text
Human-facing LLM host
  role: orchestrator
        |
        | MCP over stdio
        v
agents-gateway
  tools -> services -> policy / audit / state / artifacts
        |
        | adapter calls after policy approval
        v
agent CLIs
  headless dry-run or supervised tmux sessions

MCP or trusted local client
        |
        | coordination.* / direct factory
        v
Redis 7 coordination namespace
  leased presence + addressed inbox streams
```

The Gateway is the enforcement point:

- deterministic policy decisions from versioned registries in `policies/`
- append-only JSONL audit correlated by `traceId`
- SQLite state for orchestrations, tasks, sessions, artifacts, approvals, and
  policy decisions
- filesystem artifact storage with deterministic sanitization
- async approvals with bounded waits
- bounded opt-in auto-approval scopes with audit (`AGENTS_AUTOAPPROVE`, see
  [ADR-006](docs/adr/ADR-006-bounded-autoapprove.md)); default remains human
  approval
- Gemini and Claude adapters with dry-run and supervised paths
- optional Antigravity, pi, and OpenCode adapters with explicit provider setup
- Codex adapter with default headless execution coverage
- session tools for attach info and human tmux intervention notes
- optional V5 leased discovery and at-least-once addressed delivery through a
  dedicated Redis namespace, exposed by eight `coordination.*` tools and the
  same importable service

## Operational Usability

The supported practical dry-run flow is:

```text
human-facing orchestrator -> Gateway MCP -> coder child + reviewer child
```

The supported two-agent pairing uses Codex as coder and Claude as reviewer;
the historical P/0/3 activation path is superseded by Stage W.
This path is covered by `tests/e2e/mcp_two_agent_workflow.test.js` through the
real MCP stdio Gateway surface. The orchestrator assigns a coder task, runs a
child agent through `agent.*`, shares only sanitized artifacts with a reviewer
child, records approval, and completes the orchestration.

Codex is enabled in the base policy registry for coder, planner, reviewer, and
restricted-coder roles. Repository policy still gates each invocation, and
`agents-orchestrator` excludes `policies/` from Codex writes.

The `writer` and `editor` roles support prose workflows: a writer may write
prose in non-restricted repositories and publish documentation artifacts; an
editor reviews sanitized material and publishes review notes. Operators must
register and allowlist their own repositories before using these roles.

## V5 Coordination Plane

V5 lets independent orchestrators, gateways, agents, and supervised sessions
register ephemeral identities, discover active peers, and exchange addressed
messages. MCP clients use:

- `coordination.status`
- `coordination.register`
- `coordination.heartbeat`
- `coordination.discover`
- `coordination.unregister`
- `coordination.send`
- `coordination.receive`
- `coordination.ack`

Trusted local Node clients can import `createCoordination` from
`gateway/src/coordination.js`; both access paths share the same domain service.
Coordination is disabled when no Redis URL is configured, without disabling
unrelated Gateway tools; coordination calls return
`COORDINATION_UNAVAILABLE`.

The plane is additive: it does not change the three message-tool contracts
under `message.*` or publish coordination audit records to `agents:events`.
Messages are untrusted input and cannot grant repository, approval, review,
merge, or session authority. Redis 7 standalone with one shard is the
supported V5 topology; see
[the coordination runbook](docs/coordination-bus.md) for configuration,
delivery semantics, trust boundaries, and rollout.

## Sequential Task Scheduling

For plan-driven implementation, the most reliable pattern is a deterministic
human-facing scheduler that advances one task at a time. Child agents should
execute the current state; they should not decide which plan task comes next.

Use `plan/` and `plan/*/reviews/` as the source of truth:

- choose the next task in plan order that has no `reviewed_OK` verdict
- if the latest trial has `reviewed_KO`, relaunch the coder only for the
  requested corrections
- if a `to_review` file exists without an OK/KO verdict, launch or wait for the
  reviewer instead of starting new implementation work
- after an OK verdict, complete the orchestration and move to the next task
- stop after 15 KO trials for the same task and ask for human intervention

The normal Gateway sequence for each task is:

```text
orchestration.create
task.assign coder
agent.spawn coder
agent.ask coder
agent.view coder periodically
artifact.put raw_diff / implementation_notes
task.assign reviewer
agent.spawn reviewer
agent.ask reviewer
artifact.put review_notes
OK -> orchestration.complete -> next task
KO -> same task, next trial, narrow coder prompt
```

Prefer `agent.spawn` for long implementation or review work so the operator can
inspect the supervised tmux session through `session.attach_info` or
`tmux attach`. Reserve `agent.delegate` for short one-shot tasks where live
observation is not needed.

Keep coder prompts small and bounded: list the allowed files, required tests,
expected review file, and exact deliverable. Use the policy defaults: Codex
`gpt-5.6-sol` at `max` on the `priority` (Fast) tier, and Claude
`claude-fable-5` at `max`. If a coder session shows no output or file changes
after a short interval, inspect it
with `agent.view`, then kill and relaunch with a smaller scope if needed.

## Scope

MVP scope is fixed in [ADR-004](docs/adr/ADR-004-mvp-scope.md).
MVP2.0 scope is fixed in [ADR-005](docs/adr/ADR-005-mvp2-scope.md) and tracked
by [docs/mvp2-acceptance-checklist.md](docs/mvp2-acceptance-checklist.md).

In scope:

- MCP stdio Gateway named `agents-gateway`
- policy, registry, audit, state, artifact, sanitization, approval, session,
  orchestration, and task flows
- Gemini and Claude adapters
- default-enabled Codex adapter documentation
- dry-run restricted-flow E2E coverage
- bounded opt-in auto-approval for explicitly configured scopes
- host-agnostic operator docs and generic MCP config
- optional Redis-backed V5 coordination through MCP and trusted direct access

MVP2.0 scope:

- per-invocation model selection through Gateway tools and adapters
- Codex coder real headless and supervised execution
- Claude reviewer with `claude-fable-5` at effort `max`
- generic MCP host launcher profile, orchestrator prompt, and runbook
- guarded real two-agent E2E and `scripts/smoke_mvp2.mjs`

Out of scope:

- Cursor, Antigravity IDE, and any specific IDE configuration
- cloud deployment, multi-host networking, and multi-user authentication
- a standalone orchestrator binary or `orchestrator/` process
- Redis Cluster/Sentinel coordination topology and Redis as an authorization
  boundary

Experimental (PROJECT_V1, sin gate de produccion):

- Postgres backend: experimental V1 state backend work is tracked in
  [plan/PROJECT_V1/](plan/PROJECT_V1/README.md) and is not the MVP2.0
  default runtime.
- Redis Streams publisher: experimental V1 audit/event publishing exists in
  the tree and can use [docker/docker-compose.yml](docker/docker-compose.yml)
  as Optional local infrastructure.
- `orchestrator-langgraph/`: experimental V1 LangGraph client/workflow code is
  tracked in [plan/PROJECT_V1/](plan/PROJECT_V1/README.md) and is not a
  standalone Gateway replacement.
- OTel: experimental V1 telemetry export is opt-in and not a production gate.

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

Issues and pull requests are welcome. Before submitting a change, run the
local quality gate:

```bash
AGENTS_TEST_REDIS_URL=redis://127.0.0.1:6380/0 ./scripts/ci.sh
```
