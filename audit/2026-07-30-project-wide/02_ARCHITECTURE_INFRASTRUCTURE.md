# Architecture and infrastructure audit

## Verdict

**Grade: D+ overall; C for local/dry-run architecture; F as a real-agent trust
boundary.** The repository contains several strong target-state components,
but the runtime composition still follows the legacy topology.

## As-built topology

```text
Host MCP ───────────────┐
Child .mcp.json ────────┼─ stdio → full Gateway per connection/process
LangGraph client ───────┤                │
Temporal activity ──────┘                ├─ RequestContext + in-memory lineage
                                         ├─ tools → services → core/repos
                                         ├─ active provider route:
                                         │    spawnSync / tmux send-keys
                                         ├─ safe async supervisor:
                                         │    integrated but not composed
                                         └─ SQLite/Postgres + artifact FS
                                              + JSONL audit + Redis
```

The Gateway process owns request authority, approval wakeups, database
singletons and audit sinks. Every additional Gateway is therefore another
control plane, not a stateless proxy.

## Target-state components already present

| Component | Strength | Composition gap |
|---|---|---|
| RequestContext | Server-side capabilities, actor/target/repo binding and owned lineage | Process/connection-local; fixed fallback principal and 24-hour expiry |
| Lifecycle core | Pure reducer, CAS, terminal/idempotency semantics | Legacy sessions and public services are not fully routed through it |
| Process supervisor | `shell:false`, literal argv, process identity, session port, reaper and backpressure | Provider adapters do not import/use it |
| Redis coordination | Persistent command/blocking lanes, fencing, ACK/outbox and bounded close | Product consumer ownership, health and recovery incomplete |
| Candidate/release verifier | Exact subject/tree, locks, SBOM, SCA and suite contract | Final release identity and repeatably green gate absent |

## Architectural findings

### ARC-01 — Replicated control plane

**Critical, open.** `.mcp.json:3-16` configures a real Gateway with inherited
workspace access. `gateway/src/mcp_server.js:205-258` composes the complete
store and tool registry per process. The Python Gateway client inherits the
environment and launches another Gateway
(`orchestrator-langgraph/src/orchestrator_langgraph/gateway_client.py:45-82`),
while each Temporal activity creates a fresh client
(`activities.py:295-335`).

Read-only runtime metadata confirmed 60 live Gateways and multiwriter access to
the same databases. The owner chain is D/0/02 → D/0/03 → D/0/05.

### ARC-02 — Safe execution exists beside, not under, the product

**Critical, partial.** `gateway/src/tools/index.js:29-39` instantiates the
legacy provider adapters. Codex and Claude still use `spawnSync`, and Gemini's
direct mode uses `--yolo`. Spawn/ask paths build command strings and send them
through tmux.

The async supervisor uses literal argv and `shell:false`
(`gateway/src/adapters/process_supervisor.js:1965-2070`), but it has no
production import path. Complete D/0/07c → D/0/07d → D/0/01 before crediting
the supervisor as product behavior.

### ARC-03 — Authority is safe within one connection, not durable

**High, new.** Request lineage is stored in Maps associated with the
connection (`request_context.js:145-180,404-436,803-874`). A new Gateway does
not rehydrate ownership from durable state, and the context expires after 24
hours (`:303-319,917-943`).

This is not theoretical: both official smokes and the per-activity Temporal
topology cross that boundary. Durable authority must not be implemented by
trusting caller-supplied IDs; it needs a server-owned reconnect/session
protocol.

### ARC-04 — No single ownership or atomic recovery unit

**High, open.** SQLite is a process singleton without a workspace owner lock
(`gateway/src/state.js:7,60-89`). Artifacts commit file, database and audit as
separate effects. JSONL and Redis audit are separate best-effort sinks, and
PostgreSQL shells out once per statement.

The system cannot atomically answer whether a crash committed the operation,
the artifact, the audit event and the external message. D/0/03 and I/0/00–03
own the recovery model.

### ARC-05 — Lifecycle semantics are split

**High, partial.** The reducer and lifecycle repository are strong, but the
active service creates sessions after execution and legacy sessions can avoid
the reducer. `orchestration.complete` lacks a terminal preflight.

The C/1/00–03 vertical must be composed with D/0/01, not delivered as a
parallel state machine.

### ARC-06 — Higher-level workflows do not own effect identity

**High, open.** Temporal gives durable control flow but not yet durable
Gateway effect identity. Activity-level clients and process-local caches can
repeat or lose authority. LangGraph retains legacy envelope assumptions.

I/0/00, I/0/02 and I/0/06 should establish one authenticated internal channel,
idempotent operation IDs and server-bound task identity.

### ARC-07 — Coordination runtime is only partly operated

**Medium, partial.** Redis client lifecycle and atomic semantics are mature.
The consumer runtime exists, but current provisioning is a disposable local
test profile. Crash/reclaim, health, inventory and production ownership remain
open in G/0/02–04 and E/0/04.

### ARC-08 — Deployment unit is the checkout

**Medium, open.** Compose provides PostgreSQL and Redis only. There is no full
Gateway/worker image, service unit, IaC or supported install bundle. Python
wheels do not include the Node Gateway, and some paths remain cwd-relative.

H/0/01 and I/0/04/06/07 own portability and a complete deployment proof.

## Failure domains

| Failure | Current blast radius |
|---|---|
| Gateway crash | Loses connection authority and process-local approval wakeups |
| Child recursion | Creates another full writer/control registry |
| Host process pressure | Affects all agents and Gateways sharing one UID/workspace |
| Partial artifact/audit failure | Leaves cross-store ambiguity |
| Redis consumer crash | Can leave ownership/reclaim states requiring internal recovery |
| Temporal worker restart | Replays control flow without a fully durable Gateway effect identity |
| Checkout/path change | Can break worker/Gateway discovery and package execution |

## Architectural strategy

The target should be one privileged, supervised Gateway owner per workspace:

```text
operator / worker / MCP clients
          │ authenticated durable channel
          ▼
single Gateway manager + workspace lease
          ├─ server-owned request/effect identity
          ├─ lifecycle + transactional outbox
          ├─ approval/review capability consumption
          ├─ mediated artifact/output projection
          └─ isolated provider runners
                    └─ no inherited control MCP
```

The external health watchdog should remain metadata-only and must not become a
second writer. Redis is optional for base readiness but required for the
coordination service profile.

## Ordered architecture tasks

1. Finish D/0/07c–d and route all adapters through D/0/01.
2. Implement D/0/02 process/filesystem/environment isolation and mediated
   output.
3. Establish D/0/03 workspace ownership and crash reconciliation.
4. Add D/0/06 global admission, then D/0/05 non-inheritable control.
5. Complete C/1 lifecycle composition and D/0/04 adversarial acceptance.
6. Bind E/F approvals, artifacts and reviews to exact effects.
7. Add I/0/00–03 durable operations/outbox/restore and a persistent worker
   channel.
8. Prove the complete topology in I/0/07 before I/0/04 release.

