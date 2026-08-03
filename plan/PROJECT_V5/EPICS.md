# Project V5 — Epics and delivery gates

Status: **active — delivered A foundation plus B–I functional roadmap**.

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
| [C](C/README.md) | Canonical contract, credible CI/candidate gate, and honest lifecycle | B/0/00–01 |
| [D](D/README.md) | Server-owned authority, non-inheritable control plane, safe execution, and global budgets | C/0 |
| [E](E/README.md) | Recoverable operator inventory, readiness, and effect-bound approvals | C/1; D/0/01, D/0/03, D/0/05–06 for health; D before mutation |
| [F](F/README.md) | Provenance-bound artifacts and independent review gate | D |
| [G](G/README.md) | Required Redis lane, runner, retention, and scope admission | B; D for admission |
| [H](H/README.md) | Generic one-command hero flow, doctor, outcomes, and protected portable real run | C–G |
| [I](I/README.md) | Durable operations, live stores/V1, governance, and exact release identity | D–H as applicable |

```text
A delivered -> B contract -> C runtime/candidate/lifecycle
                                  |
                                  v
                 D authority/runtime/control-plane/budgets
                    |             |              |
                    +-> E operator/readiness     +-> F evidence
B contract + D admission -----------------------> G coordination ops
E/0/04 health/observability --------------------> G/0/03 metrics
C + D + E + F + G ------------------------------> H hero/portable proof
C candidate + D + F + G + H --------------------> I data/live V1/release
```

Security-critical D/0/00–06 sheets are hard prerequisites for any new
real-agent, YOLO, cross-principal, or child-recursive execution. Read-only
status, CI, candidate, contract, lifecycle guards, and safe sample UX may land
first because they do not expand execution authority.

Within Stage E, `E/0/04` starts only after D/0/01, D/0/03, D/0/05, D/0/06,
and E/0/00 have supplied the async supervisor, writer/reconciliation,
single-daemon health identity, aggregate admission state, and local operator
transport. Its watchdog is health-only and externally supervised; it is not a
second Gateway or control-store writer. `E/0/04` then supplies canonical
health, recovery, and bounded observability contracts to G/0/03, H/0/04,
I/0/05, and I/0/07. Those four sheets have explicit dependency edges and only
add allowlisted metric sources or live-lane evidence.

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
