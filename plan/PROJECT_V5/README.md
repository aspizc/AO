# Project V5 — Coordination plane

For AO publication, executable capabilities, and current gate evidence, see
[project status](../../docs/project-status.md). The source SHAs, trial history,
and planning counts below belong to the imported V5 ledger. Publication of
AO main does not promote or release the open V5 work.

Status: **active — A/0/00, the reviewed B/0 corrections, C/0/00–02, and
G/0/00 are delivered. The functional Wave 2 tree also contains independently
reviewed and integrated G/0/01, D/0/00, H/0/00, the D/0/01 standalone core,
the H/0/01 SAMPLE and DOCTOR Trial 13 slices, G/0/02 CORE, STORE, ACK, OUTBOX,
and WIRING-A, D/0/07a–c, and the C/1/00 rebaseline CORE. D/0/07c Trial 3 was
independently reviewed KO at `1d8c952`; Trial 4 remains historical
reviewed/integrated evidence. Trial 5 technical commit `8c77c92` was
independently reviewed KO at `9aafa77`, and Trial 6 technical commit
`4f072a7` was independently reviewed KO at `43687af`. Trial 7 fail-closed
bootstrap-ownership correction `d79fd00` was independently reviewed OK at
`7caf94b` and integrated at `c66b05f`. D/0/07c is complete but not promoted
or released. D/0/07d is the next planned, unimplemented leaf, and the
remaining B–I roadmap stays open. Nothing in this tree claims D/0/07d,
splice, pilot, promotion, tag, release, support, or publication completion**.

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
but their prose is provenance only. Project V5 owns the implementation; no
duplicate V4 implementation is scheduled. The absorption ledger records one
V4 sheet as absorbed and keeps multi-owner sheets partial until every V5 owner
is complete.

The reconciled tree has **82 executable sheets**: 25 delivered A sheets and
57 active B–I leaves
(`6 + 8 + 11 + 6 + 5 + 5 + 6 + 10 = 57`). Current evidence supports
`39 complete + 4 in progress + 39 planned = 82`, leaving
`4 + 39 = 43` open. The in-progress set is exactly `C/1/00`, `D/0/01`,
`G/0/02`, and `H/0/01`. The shared `D/0/07` parent is an index and
is not double-counted. Those open V5 owners absorb the 71 nonterminal V4 sheets; they
do not authorize duplicate V4 implementation branches.

The operator's post-Trial-15 decision denied C/1/00 Trial 16. The next C review
series is explicitly `C_1_0_REBASELINE` and covers only the lifecycle reducer,
repository, migrations, commands, and service routing. All synchronous and
asynchronous supervision, FIFO guardian/reaper behavior, configured Python
runtime, no-shell argv, PGID/descendant cleanup, cancellation, and process
budgets belong to D/0/01. `D_0_1_CORE` is reviewed and integrated;
rebaseline Trial 1 is independently KO at `d8ec680`, with only its review
artifacts integrated. Trial 2 CORE starts fresh from the accepted Wave 2
baseline, closes the five reviewed repository/adapter corrections with
independent OK at `4faec5e`, and is integrated at `37bc85c`.
`C_1_0_REBASELINE_SPLICE` and `D_0_1_SPLICE` then jointly own the live
reserve-before-launch, trace/evidence, public idempotency, and legacy-writer
cutover. H/0/00, the D core, and the C rebaseline core are all OK.
`D_0_1_SPLICE` Trial 1 nevertheless exposed an absent persistent session-control
port and was independently `blocked_confirmed`. The operator ratified Option 1.
[`D/0/07a`](D/0/07a.md) Trial 3 is reviewed OK and integrated at `aaf4817`,
and [`D/0/07b`](D/0/07b.md) Trial 2 is reviewed OK and integrated at
`d65e9f4`. For [`D/0/07c`](D/0/07c.md), all five design amendments are ratified
at `ac92d51`. Trial 3 was independently reviewed KO at `1d8c952`.
Its implementation and request are `d7873eb` and `c38762a`.
Trial 4 technical GREEN is `5ffdf51`.
The append-only candidate `cf3b172` was independently reviewed OK at
`5739ea1` and integrated at `10f5b03`; that Trial 4 state remains historical.
Trial 5 technical commit `8c77c92` was independently reviewed KO at `9aafa77`.
Trial 6 technical commit `4f072a7` was independently reviewed KO at `43687af`.
Trial 7 fail-closed bootstrap-ownership correction `d79fd00` was independently
reviewed OK at `7caf94b` and integrated at `c66b05f`. D/0/07c is complete but
not promoted or released. [`D/0/07d`](D/0/07d.md) remains planned and
unimplemented; its D/0/07c dependency is satisfied. The shared
[`D/0/07`](D/0/07.md) file is the normative index; only a later reviewed
`D_0_7D` composition gate can unblock the splice.

The canonical promoted lineage contains C/0/02's Trial 4 OK review
`97669790fcce876613a456a7af4fd99c734a519a` through integration
`2111f89a24d88e05fffe1a005a12e888857110a9`, and G/0/00's Trial 1 OK
review `5058a59c45d91fcc84529d0d3c509bd34367bb2a` through integration
`77cb4189d268ba2577716787420704b0d1ac0acf`. Both are ancestors of
`develop@c10bcf328da781dfb3869d3683f30aab327f3728` and
`main@7039a0bf9e08cd1f0e380844791409e75f4fdbdb`; those promoted refs share
tree `6ef917087911959f5ada6b93a1aecf29ff7e6fe2`. G/0/01 Trial 3 is independently
OK at `3cef36cf47e06af90193ed4c540e41f305ae77ff` and is included in the current
functional Wave 2 integration candidate. H/0/00 Trial 5 is independently OK at
`89c389902e9f3cdf28e85eb967e4a2122b1f2d5e` and is integrated at
`d7324412243d4c9a88a4c7511347461be51903ec`. D/0/01 Core Trial 4 is
independently OK at `81986988da8d8e070c69ce936ece68d51e6cad29` and integrated
at `a7c09b0`; C/1/00 CORE Trial 2 is independently OK at `4faec5e` and
integrated at `37bc85c`. The final splice remains blocked before GREEN on the
planned D/0/07d composition gate.

H/0/01 SAMPLE preserves Trials 1–4 as KO evidence, closes Trial 5 at
`c4aec921346642e119a7e65169f6d718e30abdd7`, and is integrated at `744291f`.
DOCTOR Trials 1–12 remain KO evidence; Trial 13 is independently reviewed OK
and integrated at `616a4de` under the operator-ratified narrowed retirement
criterion. The unavoidable pure-Python dunder reflection residual is recorded
as [`V5-H-0-01-D01`](DEFERRED.md) and assigned to D/0/02. H/0/01 remains in
progress. PROBES Trial 4 (`6fecc59`), PORTABILITY Trial 2 (`900007a`), and
EXECUTABLE Trial 1 (`52705a2` implementation, `ed3d944` OK, `a8a39cf`
integration) are recorded in the imported review trail. The full sheet exit
still waits for D/0/02–03; native release evidence remains owned by I/0/04. The PROBES
contract forbids the state-creating general config loader and managed
coordination registration; it uses a pure config projection, one direct
`status({})` snapshot, and D/0/02–03 attestations as the only future source of
real isolation/state-owner PASS. PORTABILITY materializes the locked dependency
graph with install scripts disabled and constrained egress, while I/0/04 owns
the denied-egress, fixed-toolchain native source build and SQLite smoke.

G/0/02 CORE Trial 4 and STORE Trial 4 are independently reviewed OK and
integrated. ACK Trial 5 is reviewed OK and integrated at `ef38763`; OUTBOX
Trial 3, including migration `003`, is reviewed OK and integrated at
`cc1c10e`; and WIRING-A Trial 6 is reviewed OK and integrated at `b52b661`.
WIRING-B crash/reclaim behavior, health, inventory, and the full-sheet exit
gate remain open. Migration `003` is therefore integrated, not an open item.
None of these Wave 2 increments claims promotion yet.

| Plan artifact | Purpose |
|---|---|
| [Epics and gates](EPICS.md) | Outcomes, DAG, integration gates, and non-negotiable invariants |
| [Executable sheet registry](SHEETS.md) | Cross-epic dependencies, path ownership, verification, and acceptance mapping |
| [Materialized epics and sheets](SHEETS.md) | Navigable A foundation plus every active B–I epic and sheet |
| [A/0/00 umbrella](A/0/00.md) | Public contract, whole-slice acceptance, commit range, and `A_0_0` review |
| [Plan review](PLAN_REVIEW.md) | Initial KO findings, corrections, and independent OK verdict |
| [Review trail](reviews/README.md) | Per-sheet submissions and visible OK/KO results |
| [Claude orchestration handoff](HANDOFF_YOLO.md) | Historical Wave 2 snapshot at its named 2026-07-27 pre-handoff baseline; retained for provenance, not current status |
| [Audit/V4 coverage matrix](COVERAGE_MATRIX.md) | Four-source reconciliation, implementation state, and one owner per finding |
| [V4 absorption ledger](V4_ABSORPTION.md) | Implement-once mapping and evidence required before V4 closure |
| [C/1/00 scope rebaseline](C/1/00.md) | Human-authorized reducer-only rebaseline with the Trial 1–15 chain preserved |
| [D/0/01 process transfer](D/0/01.md) | Core/splice split for all sync/async process, FIFO, runtime, argv, cancellation, and cleanup ownership |
| [D/0/07 shared session-port contract](D/0/07.md) | Non-executable topology/API/wire/terminal index for the ratified Option 1 prerequisite |
| [D/0/07a–d executable leaves](D/0/07a.md) | Issuer/codec → PTY/write → relay/snapshot → final composition gate; see [07b](D/0/07b.md), [07c](D/0/07c.md), and [07d](D/0/07d.md) |

## Visible plan tree

Every active epic and sheet is a real file under this directory:

```text
plan/PROJECT_V5/
├── A/0/00/{E0,E1,E2,E3,E4}/    delivered foundation, 25 sheets
├── B/0/{00..05}.md             coordination contract/profile
├── C/
│   ├── 0/{00..03}.md           CI, contract, candidate, fitness
│   └── 1/{00..03}.md           lifecycle (C/1/00 reducer-only rebaseline)
├── D/0/{00..06}.md             authority, transferred process supervision, control/budgets
├── D/0/07.md                   authenticated session-port shared contract/index
├── D/0/07{a,b,c,d}.md          four executable session-port leaves through composition
├── E/0/{00..05}.md             operator recovery, approvals, readiness, grants
├── F/0/{00..04}.md             evidence and review
├── G/0/{00..04}.md             Redis/coordination operations
├── H/0/{00..05}.md             provider/profile source, product flow, portable proof
├── I/0/{00..09}.md             data, worker/stack, MCP/ITRP cutovers, release
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
