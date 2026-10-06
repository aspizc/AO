# Project V5 — Epics and delivery gates

Status: **active — delivered A foundation, reviewed/promoted C/0/00–02 and
G/0/00 increments, additional reviewed and integrated functional Wave 2
increments, and the remaining B–I roadmap. D/0/07c Trial 4 remains historical
reviewed/integrated evidence. Trial 5 was independently KO at `9aafa77`, Trial
6 was independently KO at `43687af`, and the Trial 7 fail-closed correction
`d79fd00` was independently reviewed OK at `7caf94b` and integrated at
`c66b05f`. Exactly C/1/00, D/0/01, G/0/02, and H/0/01 remain in progress;
D/0/07d is the next planned, unimplemented leaf**.

The coordination foundation was delivered through
[`A/0/00`](A/0/00.md), whose historical review remains closed. The active
Project V5 roadmap continues through materialized stages B–I and keeps each
increment independently testable and reviewable in
[`SHEETS.md`](SHEETS.md).

This structure preserves the inherited worktree and handoff. A sheet is not
allowed to redefine the public contract in isolation: changes that affect the
wire format, security boundary, or delivery guarantees must update the
contract sheet, tests, ADR, and runbook together.

## Active roadmap

| Stage | Outcome | Dependency |
|---|---|---|
| [B](B/README.md) | Correct coordination contract and orchestrator profile | delivered A |
| [C](C/README.md) | Canonical contract, credible CI/candidate/fitness gates, mandatory hotspot decomposition, and honest lifecycle | B/0/00–01 |
| [D](D/README.md) | Server-owned authority, exact provider execution, authenticated persistent session control, non-inheritable control plane, and global budgets | C/0 plus early H/0/00 selection source for D/0/01; complete [D/0/07a](D/0/07a.md) → [07b](D/0/07b.md), then independently reviewed/integrated [07c](D/0/07c.md) → [07d](D/0/07d.md) before the final splice |
| [E](E/README.md) | Recoverable operator inventory, readiness, effect-bound approvals, and scoped YOLO grants | C/1; D/0/01, D/0/03, D/0/05–06 for health; D before mutation |
| [F](F/README.md) | Provenance-bound artifacts and independent review gate | D |
| [G](G/README.md) | Required Redis lane, runner, retention, and scope admission | B; D for admission |
| [H](H/README.md) | Canonical provider/profile source, generic one-command hero flow, doctor, outcomes, and protected portable real run | H/0/00 after C/0/01; remaining H after C–G |
| [I](I/README.md) | Durable operations, live stores/V1, MCP/ITRP cutovers, data integrity/governance, and exact release identity | D–H as applicable |

Stage G has delivered the required Redis 7 race lane in G/0/00. Trial 1 was
independently reviewed OK at `5058a59`, integrated at `77cb418`, and promoted
through `develop@c10bcf3` and `main@7039a0b`. G/0/01 preserves two independent
KO trials and closes Trial 3 with independent OK at `3cef36c`; it is integrated
in Wave 2 with promotion pending. G/0/02 CORE Trial 4 and STORE Trial 4 are
independently reviewed OK and integrated. ACK Trial 5 is reviewed OK and
integrated at `ef38763`. OUTBOX Trial 3, including migration `003`, is reviewed
OK and integrated at `cc1c10e`. WIRING-A Trial 6 is reviewed OK and integrated
at `b52b661`. WIRING-B crash/reclaim behavior, health, inventory, and the
full-sheet gate remain open. Migration `003` is integrated, not an open item;
G/0/03–04 retain their declared state.

C/0/02 is reviewed, integrated, and promoted. D/0/00 preserves its earlier KO
trials and closes the complete server-owned execution tuple with Trial 4
independent OK at `7244852`; it is integrated into functional Wave 2 at
`b711b92`, with combined review and `develop`/`main` promotion still pending.
C/1/00 remains in progress after the human-authorized post-Trial-15 scope
rebaseline; its fifteen KO trials remain evidence and Trial 16 is denied.
Process-boundary ownership moved to D/0/01. C rebaseline CORE Trial 2 is
independently OK at `4faec5e` and integrated at `37bc85c`. The D standalone
core closes after Trial 4 independent OK at `8198698` and Wave 2 integration
`a7c09b0`. `D_0_1_SPLICE` Trial 1 then exposed the absent persistent control
boundary and was independently `blocked_confirmed`; the operator ratified
Option 1. [D/0/07a](D/0/07a.md) Trial 3 is reviewed OK and integrated at
`aaf4817`, and [D/0/07b](D/0/07b.md) Trial 2 is reviewed OK and integrated at
`d65e9f4`. [D/0/07c](D/0/07c.md) has all five design amendments ratified at
`ac92d51`. Trial 3 was independently reviewed KO at `1d8c952`.
Its implementation and request are `d7873eb` and `c38762a`.
Trial 4 technical GREEN is `5ffdf51`.
The append-only candidate `cf3b172` was independently reviewed OK at
`5739ea1` and integrated at `10f5b03`; that Trial 4 state remains historical.
Trial 5 technical commit `8c77c92` was independently reviewed KO at `9aafa77`.
Trial 6 technical commit `4f072a7` was independently reviewed KO at `43687af`.
Trial 7 fail-closed bootstrap-ownership correction `d79fd00` was independently
reviewed OK at `7caf94b` and integrated at `c66b05f`. D/0/07c is complete but
not promoted or released. [D/0/07d](D/0/07d.md) remains planned and
unimplemented; its D/0/07c dependency is satisfied.
[D/0/07](D/0/07.md) remains the non-executable shared contract/index, and the
splice remains blocked until a later reviewed `D_0_7D` composition gate.

H/0/00 closes its canonical selection source after Trial 5 independent OK at
`89c3899` and Wave 2 integration `d732441`. H/0/01 SAMPLE preserves four KO
trials, closes Trial 5 with independent OK at `c4aec92`, and is integrated at
`744291f`. DOCTOR Trials 1–12 remain KO evidence; Trial 13 is independently
reviewed OK and integrated at `616a4de` under the operator-ratified narrowed
retirement criterion. The unavoidable pure-Python dunder reflection residual
is recorded as [`V5-H-0-01-D01`](DEFERRED.md) and owned by D/0/02. H/0/01
remains in progress: PROBES, portability, the real empty-cache integration
proof, and the final exit gate remain open. I/0/04 remains planned and owns
the denied-egress native source build, fixed toolchain/header evidence, and
real SQLite smoke; an npm prebuild download is not lock-covered evidence.

```text
A delivered -> B contract -> C runtime/candidate/lifecycle reducer
G/0/01 reviewed ---------> C/0/03 hotspot/fitness -> D/0/04 real-mode gate
          C/0/01 -> H/0/00 provider selection ------------------------+
          D/0/00 -> D/0/01 CORE -> 07a -> 07b -> 07c -> 07d ----------+
          C/1/00 reducer scope rebaseline -----------------------------+
                                                                     |
                                                                     v
                                         D/0/01 SPLICE: exact argv/lifecycle
                                  |
                                  v
                 D authority/runtime/control-plane/budgets
                    |             |              |
                    +-> E operator/readiness     +-> F evidence
                    +-> E/0/05 scoped YOLO grants -> H/0/05 proof
B contract + D admission ------------------------> G coordination ops
E/0/04 health/observability ----------------------> G/0/03 metrics
C + D + E + F + G --------------------------------> H hero/portable proof
D + E + F + I data foundations -> I/0/09 integrity -> I/0/04 release
C/0/01 + D/0/00 + I/0/03 + I/0/06 shim ----------> I/0/08 MCP cutover
C candidate + D + F + G + H ----------------------> I data/live V1/ITRP/release
```

Security-critical D/0/00–06 and D/0/07a–d executable leaves are hard
prerequisites for any new
real-agent, YOLO, cross-principal, or child-recursive execution. Read-only
status, CI, candidate, contract, lifecycle guards, and safe sample UX may land
first because they do not expand execution authority.

`H/0/00` was intentionally pulled ahead of D/0/01 and is now the reviewed
single source/resolver for the exact provider/model/reasoningEffort/serviceTier matrix,
while D/0/01 exclusively owns no-shell argv, all sync/async process
supervision, FIFO/runtime/PGID cleanup, and effective-value audit parity.
H/0/00 no longer depends on F/0/03, avoiding a D→F→H→D cycle; later H flow and
review consumers still wait for their declared F gates.

The operator's post-C/1/00 Trial 15 decision explicitly denied Trial 16 and
selected the process-ownership transfer. `C_1_0_REBASELINE` now owns only the
pure lifecycle reducer, repository, migrations, monotonic/idempotent
server-owned commands, and service routing. `D_0_1_CORE` was built from
reviewed D/0/00 without waiting for C or H and did not cherry-pick Trial 15.
Its Trial 4 result is independently OK. C reducer rebaseline CORE Trial 2 is
also independently OK and integrated. The D core, C reducer, and H profile
prerequisites are satisfied, but the independently confirmed persistent-control
gap inserts one acyclic prerequisite:

```text
integrated D_0_1_CORE
  -> reviewed D/0/07a
  -> reviewed D/0/07b
  -> reviewed D/0/07c
  -> reviewed D/0/07d
  -> D_0_1_SPLICE
```

The splice remains blocked before GREEN until the four leaves are implemented
and independently reviewed, with `D_0_7D` the sole composition gate. The
[`D/0/07`](D/0/07.md) parent is a non-counted index/shared contract. This split
removes the prior dependency cycle without weakening any process or lifecycle
acceptance gate.

| D/0/07 executable leaf | Outcome | Direct dependency | Exit consumer |
|---|---|---|---|
| [D/0/07a](D/0/07a.md) | capability issuer/state, authenticated codec, binding tag | integrated D core | `D/0/07b` |
| [D/0/07b](D/0/07b.md) | PTY lifecycle, live identity, verified writes | reviewed `07a` | `D/0/07c` |
| [D/0/07c](D/0/07c.md) | authenticated relay/socket, tmux observation, canonical snapshots | reviewed `07a–b` | `D/0/07d` |
| [D/0/07d](D/0/07d.md) | composition and isolated real-host race/acceptance gate | reviewed `07a–c` | `D_0_1_SPLICE` |

Within Stage E, `E/0/04` starts only after D/0/01, D/0/03, D/0/05, D/0/06,
and E/0/00 have supplied the async supervisor, writer/reconciliation,
single-daemon health identity, aggregate admission state, and local operator
transport. Its watchdog is health-only and externally supervised; it is not a
second Gateway or control-store writer. `E/0/04` then supplies canonical
health, recovery, and bounded observability contracts to G/0/03, H/0/04,
I/0/05, and I/0/07. Those four sheets have explicit dependency edges and only
add allowlisted metric sources or live-lane evidence.

`E/0/05` starts only after server-owned context, isolation, non-recursion,
global budgets, exact signed decisions, and the operator CLI are available. It
owns reusable scoped autonomy; `E/0/02` remains the one-shot decision owner and
explicitly excludes broad grants. `I/0/09` consumes the canonical data,
approval, artifact, operation, PostgreSQL, and observability foundations and
must close before `I/0/04` can make a governed release claim.

`I/0/06` owns the pending-history worker transport shim. `I/0/08` consumes that
shim plus C/0/01, D/0/00, I/0/03, and the full-stack/review gates to introduce
MCP 0.2 behind a flag, migrate every consumer, fail closed on mixed versions,
atomically retire public 0.1, and roll server, clients, and DB back to one
compatible tree. Complete C/0/01 remains a contract source, never a retroactive
implementation owner.

The materialized inventory is **82 executable sheets**: 25 delivered A sheets
and 57 active B–I leaves
(`6 + 8 + 11 + 6 + 5 + 5 + 6 + 10 = 57`). Current evidence supports
`39 complete + 4 in progress + 39 planned = 82`; the
`4 + 39 = 43` open V5 sheets close overlapping V4 acceptance through
absorption. The in-progress set is exactly `C/1/00`, `D/0/01`, `G/0/02`, and
`H/0/01`. The D/0/07 parent index is not double-counted, and the split is not
accompanied by 71 duplicate V4 implementations.

## Historical A/0/00 delivery model

- Branch: `feature/V5-A-0-0-coordination-bus`.
- Umbrella task/review id: `A/0/00` / `A_0_0`.
- Every implementation sheet follows red-green-refactor and records its
  verification before its commit.
- Commits reference both the umbrella task and the sheet, for example:
  `feat(coordination): add leased participant service (V5 A/0/00 E1/S01)`.
- The final review submission covers the complete ordered commit range and the
  final tree, not an intermediate sheet in isolation.
- No push, merge, tag, release, or cleanup is authorized by this plan or by a
  coordination message.

## Epics

| Epic | Outcome | Sheets | Exit gate |
|---|---|---|---|
| [E0 — Contract and plan](A/0/00/E0/README.md) | One coherent v1 contract, schema, configuration, Redis wire model, and executable acceptance matrix. | E0/S00–S02 | G0 |
| [E1 — Domain service](A/0/00/E1/README.md) | Redis-independent service semantics for leases, discovery, addressed messages, recovery, ACK, validation, and safe errors. | E1/S00–S06 | G1 |
| [E2 — Redis transport](A/0/00/E2/README.md) | Pending-safe, sender-scoped, metadata-only Redis implementation proven by two independent service instances. | E2/S00–S05 | G2 |
| [E3 — Access surfaces](A/0/00/E3/README.md) | One importable factory and the seven `coordination.*` MCP tools, with JSONL-only audit and cross-surface parity. | E3/S00–S04 | G3 |
| [E4 — Operability and closure](A/0/00/E4/README.md) | Reconciled documentation, complete verification, scoped commits, and independent OK review. | E4/S00–S03 | G4/G5 |

Total: **five epics and twenty-five executable sheets**.

## Dependency graph

```text
E0/S00 plan
   |
   v
E0/S01 public contract -----> E0/S02 wire decision
   |                              |
   v                              v
E1/S00 foundation              E2/S00 codec
   |                              |
   +--> E1/S01 register            +--> E2/S01 presence
          |                         |       |
          +--> E1/S02 lifecycle ---+       +--> E2/S02 send
          +--> E1/S03 discover             +--> E2/S03 receive
          +--> E1/S04 send ----------------+       |
          +--> E1/S05 receive -------------+       +--> E2/S04 ack
          +--> E1/S06 ack -------------------------+
                                                   |
                                                   v
                                                E2/S05 live
                                                   |
E1 complete + E2/S00 --> E3/S00 factory --> E3/S01 tools --> E3/S02 registry
                                                                  |
                                                                  v
                                                             E3/S03 audit
                                                                  |
E2/S05 ------------------------------------------------------> E3/S04 parity
                                                                  |
                                                                  v
                                                        E4/S00 -> S01 -> S02 -> S03
```

E1 and E2 may be implemented in parallel only after E0 is frozen. E3 cannot
claim parity until both converge. E4 documentation may be drafted earlier, but
its gate uses the final tested wire behavior.

## Gates

### G0 — Plan and contract frozen

- Epics, sheets, DAG, acceptance matrix, and ownership are reviewed.
- Public schemas and configuration names match service tests.
- ADR and runbook name the same Redis keys, consumer group, response shapes,
  and limitations selected for implementation.
- The authenticated participant digest and scope are explicit Redis mutation/
  read fences, including pre/post handling for blocking receive.
- Dedupe and ACK idempotency windows are configured and documented; no
  permanent-idempotency claim survives G0.
- No unresolved decision can change the wire contract or trust boundary.

### G1 — Domain semantics

- Unit tests prove lease authentication, expiry, discovery, scope isolation,
  message validation, idempotency/conflict, recovery, and transport ACK.
- Race fakes prove stale credentials cannot heartbeat/unregister a replacement,
  send across a replaced sender/recipient, receive its messages, or ACK its
  inbox.
- Direct callers receive the same structured error codes that MCP callers will
  receive.
- Public values and audit callbacks never expose lease tokens, token digests,
  or message bodies.

### G2 — Redis durability

- Redis 7 standalone/one-shard is the documented v1 deployment target.
- Inbox retention cannot trim an unacknowledged delivery.
- Dedupe is scoped by sender and retains the original delivery result.
- Dedupe equality is guaranteed for the configured window and renews that
  window on an equal retry.
- Reclaim handles cursors and deleted-entry anomalies fail closed.
- ACK is recipient-inbox scoped, frees only validated pending entries, and
  retains bounded tombstones so exact retries are idempotent while unknown
  delivery IDs still fail closed.
- An opt-in live test proves register, discover, send, receive, reclaim, and
  ACK across two independent service instances.

### G3 — Surface parity

- The direct factory and A/0/00's original seven MCP tools share one service
  implementation; B/0/01 extends both surfaces with read-only status.
- Disabled/unreachable Redis returns `COORDINATION_UNAVAILABLE` without
  affecting unrelated tools.
- MCP-to-direct and direct-to-MCP exchange tests pass without persisting
  tokens in fixtures, temp request files, logs, or audit.
- Coordination domain events and generic coordination `MCP_TOOL_CALL` audit
  are allowlisted JSONL-only and do not publish to the legacy `agents:events`
  stream; the legacy publisher path remains unchanged for existing tools.

### G4 — Release confidence

- ADR, runbook, architecture, threat model, runtime configuration, and
  changelog describe the tested implementation.
- `ci/suites.json` is the executable suite source and
  `ci/suites-contract.json` is its non-refreshable topology/policy baseline;
  the gate rejects removed or narrowed required/optional lanes, stale/zero
  discovery, zero tests, duplicate TAP/skip accounting, and unapproved skips.
- Every suite has a finite timeout and an owned process group with bounded
  timeout/SIGINT/SIGTERM cleanup; malformed output still yields one JSON.
- Targeted, full Gateway, E2E, smoke, policy validation, CLI, and `ci.sh`
  checks pass.
- `npm audit` is inspected and recorded without a broad automatic fix.
- `git diff --check` and a secret scan over the Project V5 diff pass.

### G5 — Independent review

- Only Project V5 files and the operator-authorized V5 documentation/README
  hunks are staged; the user's pre-existing root `README.md` hunk and `audit/`
  work remain untouched.
- `plan/PROJECT_V5/reviews/A_0_0-<trial>_to_review.md` identifies every commit
  and verification command.
- An independent reviewer returns explicit `OK` or `KO`.
- Every `KO` is corrected with TDD in the next numbered trial, up to trial 15.

## Non-negotiable invariants

- The MCP server remains `agents-gateway`; V5 adds no privileged standalone
  orchestrator component inside the Gateway.
- Gateway health belongs to the single D/0/05 daemon and is exposed only over
  the authenticated local operator transport and a bounded health-only
  watchdog/probe. There is no public or MCP health surface.
- Coordination is additive. `message.*` and `agents:events` keep their current
  contracts and behavior.
- Redis is optional for base Gateway readiness. Coordination Redis health
  remains exclusively owned by the existing `coordination.status` contract;
  Gateway health neither republishes nor mutates it.
- Lease tokens, token digests, Redis credentials, message access tokens, and
  raw message bodies never enter plans, audit, telemetry, review artifacts, or
  command output.
- Coordination bodies are untrusted input and never grant repository,
  approval, merge, review, cleanup, or workflow authority.
- Each orchestrator remains the exclusive owner of its sheets, branches,
  sessions, and worktrees.
- Direct Redis writers are trusted-local and bypass service validation; Redis
  ACL/TLS/network isolation are deployment requirements, not application
  authorization.
- `policies/` changes require a separate, evidenced need. They are not part of
  the coordination-plane contract.
