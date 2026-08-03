# Project V5 — Coordination plane

Status: **active — A/0/00, urgent B/0 contract corrections, C/0/00
credible CI, and C/0/01 canonical MCP contract delivered; remaining B–I
roadmap in progress**.

## Objective

Deliver a production-ready versioned coordination plane through which
independent orchestrators,
agents, and sessions can:

- register an ephemeral identity backed by a renewable lease;
- discover active participants and their capabilities;
- send addressed messages;
- receive, recover, and acknowledge messages with at-least-once delivery; and
- use the same contract either through `agents-gateway` MCP tools or directly
  from trusted local code;
- prove readiness and a shared canonical scope before registration; and
- integrate coordination with honest lifecycle, evidence, review, recovery,
  operator, and release flows.

The existing `agents:events` Redis Stream remains an audit/observability mirror.
Coordination uses a separate namespace and does not change the semantics of the
legacy trace-scoped `message.*` tools.

## Architecture

```text
MCP client -----------------------> coordination.* tools
                                         |
trusted direct client -----------> coordination service
                                         |
                                         v
                             Redis coordination:v1
                             - leased participants
                             - participant inbox streams
                             - metadata event stream
```

Redis is the authority for ephemeral presence and inbox delivery. It is never an
authorization boundary for agent actions: messages are untrusted input and any
operation that changes repositories, approvals, artifacts, or sessions still
goes through the Gateway policy surface.

## Scope and invariants

- The coordination namespace is configurable and defaults to
  `agents:coord:v1`.
- Participant leases expire automatically; discovery never returns expired
  entries.
- Lease tokens are returned only at registration and stored as digests.
- Every participant has a separate Redis Stream inbox and consumer group.
- Delivery is at least once. Receivers acknowledge stream entry IDs explicitly
  and may reclaim deliveries abandoned by another consumer.
- The shared metadata event stream never contains message bodies or lease
  tokens.
- Coordination bodies may be `unrestricted` or `internal`; `restricted` and
  secret-bearing bodies are rejected by the MCP/service path.
- The protocol preserves the existing KYA coordination vocabulary:
  `JOIN`, `CHANGE_REQUEST`, `IMPACT_NOTICE`, `RESPONSE`, and semantic `ACK`.
  Registration is the durable replacement for a broadcast `JOIN`; the other
  types are addressed messages linked with correlation/reply identifiers.
- Participant ownership is informational, not transferable: a message may ask
  another owner to act, but the owner still performs the change in its own
  branch/worktree and review flow.
- Direct Redis access is a trusted-local integration surface. Redis ACL/TLS and
  network isolation are required outside a single-user local environment.
- Redis being disabled or unavailable is explicit; the Gateway continues to
  serve unrelated MCP tools.

## Delivery and roadmap

[`A/0/00`](A/0/00.md) is the delivered coordination-bus foundation and keeps
its historical final review. The active roadmap is materialized as stages B–I;
it corrects the operator contract and then closes the functional, authority,
review, operability, product, and durability gaps found by the independent
audits. Project V4 rebaseline specifications are integrated into `develop`,
but their prose is provenance only: behavior stays planned until implementation,
tests, and independent review prove it.

| Plan artifact | Purpose |
|---|---|
| [Epics and gates](EPICS.md) | Outcomes, DAG, integration gates, and non-negotiable invariants |
| [Executable sheet registry](SHEETS.md) | Cross-epic dependencies, path ownership, verification, and acceptance mapping |
| [Materialized epics and sheets](SHEETS.md) | Navigable A foundation plus every active B–I epic and sheet |
| [A/0/00 umbrella](A/0/00.md) | Public contract, whole-slice acceptance, commit range, and `A_0_0` review |
| [Plan review](PLAN_REVIEW.md) | Initial KO findings, corrections, and independent OK verdict |
| [Review trail](reviews/README.md) | Per-sheet submissions and visible OK/KO results |
| [YOLO handoff](HANDOFF_YOLO.md) | Inherited state and safety constraints at the start of implementation |
| [Audit/V4 coverage matrix](COVERAGE_MATRIX.md) | Four-source reconciliation, implementation state, and one owner per finding |
| [V4 absorption ledger](V4_ABSORPTION.md) | Implement-once mapping and evidence required before V4 closure |

## Visible plan tree

Every active epic and sheet is a real file under this directory:

```text
plan/PROJECT_V5/
├── A/0/00/{E0,E1,E2,E3,E4}/    delivered foundation, 25 sheets
├── B/0/{00..05}.md             coordination contract/profile
├── C/
│   ├── 0/{00..02}.md           CI, contract, candidate
│   └── 1/{00..03}.md           lifecycle
├── D/0/{00..06}.md             authority, execution, control plane, budgets
├── E/0/{00..04}.md             operator recovery, approvals, readiness
├── F/0/{00..04}.md             evidence and review
├── G/0/{00..04}.md             Redis/coordination operations
├── H/0/{00..05}.md             product flow and portable proof
├── I/0/{00..08}.md             data, worker/stack, V1 cutover, release
└── reviews/                    append-only submissions and OK/KO verdicts
```

The linked [sheet registry](SHEETS.md#active-registry) is the authoritative
index for status and dependencies.

## Delivered A/0/00 summary

| Epic | Outcome |
|---|---|
| E0 | Contract and plan |
| E1 | Domain service |
| E2 | Redis transport |
| E3 | Direct/MCP surfaces and audit |
| E4 | Operability, CI, commit, and independent review |

## Active stage summary

| Stage | Outcome |
|---|---|
| [B](B/README.md) | Correct coordination contract and orchestrator profile |
| [C](C/README.md) | Canonical public contract and honest lifecycle |
| [D](D/README.md) | Principal, repository binding, and safe execution |
| [E](E/README.md) | Operator inventory and approval control |
| [F](F/README.md) | Evidence-bound artifacts and independent review |
| [G](G/README.md) | Coordination and infrastructure operability |
| [H](H/README.md) | Generic hero flow and productization |
| [I](I/README.md) | Durable state, governance, and release |

Implementation order and gates are authoritative in
[`EPICS.md`](EPICS.md). A sheet is complete only with red-green-refactor
evidence, a scoped commit, and an independent review result.
