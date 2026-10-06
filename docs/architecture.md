# Architecture (V5 implementation view)

The Gateway remains the only enforcement component for policy-governed actions.
MCP hosts, external orchestrators, and the optional `orchestrator-langgraph/`
client/worker are peer clients of that boundary; they do not replace it or call
Gateway adapters and state repositories directly.

## Layers

```text
tools/      -> expose MCP tools, validate input, delegate to services/
services/   -> use cases plus the eight-operation coordination service
core/       -> policy, state, audit, sanitizer, coordination contract/Redis queue
adapters/   -> spawn CLI subprocesses and tmux; no MCP awareness
infra/      -> SQLite driver, filesystem helpers, env config
coordination.js -> importable direct factory over the same service and Redis queue
coordination_client.js -> private-credential orchestrator lease lifecycle
```

Forbidden imports and bypasses:

- `adapters/` MUST NOT import from `tools/`.
- `core/policy_engine` MUST NOT call any LLM.
- Where an existing use case is policy-gated, such as spawn/delegation or
  artifact access, its tools may not bypass those checks.
- Coordination tools do not use the spawn/artifact policy engine. They enforce
  their own strict schema, participant lease token, scope, and Redis mutation
  fence in the common coordination service.

## MCP Call Lifecycle

```text
client (any MCP host) --stdin/stdout--> mcp_server.js
                                         |
                                         v
                                  tools/<tool>.js
                                         | Zod validate
                                         v
                              services/<use_case>.js
                                  |- policy.evaluate
                                  |- adapter.<op>      (if needed)
                                  |- state.<repo>.<op>
                                  `- audit.append
                                         |
                                         v
                                response (or MCP error)
```

## V5 Coordination Plane

MCP and direct callers converge before any coordination state is accessed:

```text
MCP host --> coordination.* tools --\
                                     > coordination service --> Redis 7 standalone
Node code --> createCoordination() --/       |                    |
Orchestrator --> managed client -----/       |                    +-- leased presence
                                              |                    +-- addressed inboxes
                                              |                    +-- bounded dedupe/ACK state
                                              |
                                              +-- local JSONL coordination audit
```

The public direct entry point is `createCoordination` from
`gateway/src/coordination.js`. The MCP registry creates one instance and gives
it to all eight tools: `status`, `register`, `heartbeat`, `discover`,
`unregister`, `send`, `receive`, and `ack`. Status is a read-only Redis `PING`
that exposes the canonical scope and safe limits without registering. MCP adds
strict structural Zod validation; direct
calls and Zod-valid MCP calls then share domain validation, public response
shapes, safe `COORDINATION_*` errors, domain-audit projection, and delivery
state.

Each service instance owns two lazy persistent Redis lanes: a multiplexed
command client with bounded in-flight/queued admission and a serialized
blocking client with its own bounded queue. Offline queuing and automatic
transport retry are disabled, so a dropped operation is not replayed; the next
operation performs one coalesced reconnect. An in-flight connect remains the
authority even while node-redis is open but not ready; dispatch begins only
after the lane records a successful handshake. Registry/process shutdown owns
the inverse lifecycle. At its deadline a lane-owned epoch settles every
remaining caller as unavailable, consumes late transport outcomes, and cleans
up each connection generation in both connecting and post-handshake phases
when required. This bounded cancellation uses no global singleton.

`createOrchestratorCoordinationClient` is an optional trusted-local lifecycle
adapter over that same direct service, not another service or MCP surface. It
checks readiness, owns one private registration credential, schedules
jittered heartbeat, and performs bounded single-flight re-registration after a
known lease loss. Its public status is a safe projection. User actions are
limited to discover/send/receive/ack and are never retried; epoch fencing
rejects stale timer, heartbeat, and registration completions during stop or
replacement. Each factory-created instance is single-use, and terminal stop is
bounded independently of an injected service call that may remain pending.

Each Gateway instance accepts one canonical coordination scope, reported by
status and inherited when registration omits `scopeId`. A different explicit
scope fails before Redis mutation. This removes accidental “successful but
invisible” registrations while preserving same-scope discovery and delivery.

The Redis wire uses a dedicated configurable prefix and never aliases
`agents:events`. Coordination metadata events remain in the coordination
Stream, while coordination domain and generic MCP-call audit records are
JSONL-only. Legacy audit and `message.*` retain their existing behavior.

The Redis-specific boundary is exercised by the required `test.redis-live`
lane. Remote CI creates a health-checked disposable Redis 7.2 standalone
service for each Node matrix job; multiple independent clients contend on
send, reclaim, replacement, expiry, and ACK schedules under UUID prefixes.
Missing required infrastructure is distinct from an assertion failure, and
skips, wrong topology, zero tests, or leaked test keys cannot report green.

This is still not a standalone orchestrator. It is an additive Gateway service
and importable factory that lets independently running orchestrators exchange
addressed, at-least-once messages. Redis is authoritative for TTL and atomic
fences; Gateway time supplies public timestamps and prechecks, so production
hosts require bounded clock skew.

## What Does Not Exist

- A privileged standalone orchestrator that replaces the Gateway enforcement
  boundary.
- An unauthenticated or unscoped child-to-child channel. V5 coordination is
  always addressed through a leased participant identity.
- Special policy bypass for the orchestrator role.
- Cursor or Antigravity IDE specific configuration.

## Mapping With gemini-orchestrator (V4 Annex C)

| Source (gemini-orchestrator) | Destination (this repo) | Stage |
|---|---|---|
| `src/tmux-client.js` | `gateway/src/adapters/tmux_client.js` | H/0/0 |
| `src/tools/delegate.js` | `gateway/src/adapters/gemini_adapter.js` delegate path | I/0/0 |
| `src/tools/tmux.js` | Gemini supervised helpers in adapter | I/0/1 |
| pattern `gemini --yolo` | Preserved; compensated with policy and cwd allowlist | I/0/0 |

## Tmux intervention is best-effort

Direct tmux attach and manual typing are legitimate advanced operations, but detection is best-effort. Tmux does not reliably tell the Gateway which bytes came from a human, so the Gateway can only compare pane snapshots around expected agent actions and audit likely manual changes.

When an intervention is deliberate, operators should record it with
`session.intervention_note`. Detection must never block or take control away
from the operator; it only emits audit evidence such as
`HUMAN_TMUX_INTERVENTION`.

## See Also

- [`../plan_proyecto_v4.md`](../plan_proyecto_v4.md)
- [`adr/ADR-001-gateway-only.md`](adr/ADR-001-gateway-only.md)
- [`adr/ADR-002-no-orchestrator-component.md`](adr/ADR-002-no-orchestrator-component.md)
- [`adr/ADR-003-policy-before-spawn.md`](adr/ADR-003-policy-before-spawn.md)
- [`adr/ADR-V5-01-redis-coordination-plane.md`](adr/ADR-V5-01-redis-coordination-plane.md)
- [`coordination-bus.md`](coordination-bus.md)

## Threat Model

See [`threat-model.md`](threat-model.md). Every threat there has a
`Tested by:` reference.
