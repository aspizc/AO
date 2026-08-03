# Product and functionality audit

## Verdict

**Grade: D+.** The coordination substrate and several control-plane
foundations are real and useful, but the product's advertised end-to-end
journey is broken and the operator cannot reliably recover, cancel or complete
work. Real-agent execution remains unsafe.

The most valuable product decision is to make one narrow flow fully supported
before adding more primitives: create a run, assign work, observe it, approve
or deny, recover after reconnect, cancel safely, and obtain evidence-bound
completion.

## Product map

| Surface | Primary job | Current reality |
|---|---|---|
| MCP Gateway | Programmatic orchestration, agent/session control, artifacts, approvals and coordination | Broad catalog and strong validation; lifecycle and persistent authority incomplete |
| `agent-run` CLI | Local policy/audit/approval operations | Only `approve`, `policy` and `audit`; no run inventory, recovery, queue or doctor entry point |
| Coordination tools | Register/discover/send/receive/ACK between orchestrators | Best-developed end-to-end capability; Redis semantics and races are strong |
| Provider adapters | Delegate, spawn, ask and inspect Codex/Claude/Gemini | Functional but legacy/blocking and not isolated |
| LangGraph/Temporal | Higher-level implement/test/review workflows | Experimental; consumers do not yet share one durable Gateway authority channel |
| Samples, smokes and docs | First success and operator confidence | The two advertised multi-step smokes fail |

## Built versus planned

The canonical V5 registry reports 82 executable sheets:

- 38 complete;
- 5 in progress;
- 39 planned;
- 44 open in total.

The complete work primarily covers coordination, validation, candidate
verification, connection-scoped request authority, lifecycle/process
substrates and profile resolution. It does **not** mean 38 complete user
journeys. Most value-bearing composition lives in the 44 open sheets.

| Functional capability | Status | Evidence |
|---|---|---|
| Coordination registration, leases, discovery, addressed messages, reclaim and ACK | BUILT | A delivered registry; B/0/00–02; G/0/00–01 |
| Canonical MCP schema/error catalog | BUILT | C/0/01 |
| Candidate, SCA, SBOM and status verifier | BUILT | C/0/02 |
| Server-owned request identity within one connection | BUILT | D/0/00; `gateway/src/core/request_context.js` |
| Lifecycle reducer/repository and async supervisor core | PARTIAL | C/1/00 and D/0/01 in progress |
| Recoverable run overview and honest completion | PLANNED | C/1/01–03 |
| Safe provider execution and isolation | PARTIAL / UNSUPPORTED | D/0/01–07 in progress; D/0/02 planned |
| Operator inventory, approval queue and governed YOLO | PLANNED | E/0/00–05 |
| Evidence-bound independent review | PLANNED | F/0/00–04 |
| Shipped sample/doctor | PARTIAL | H/0/01 |
| One-command gated dry-run | PLANNED | H/0/02 |
| Durable Temporal/full-stack release | PLANNED | I/0/00–09 |

## Journey validation

### Coordination journey

The coordination journey is the strongest part of the product. The service
supports leased participants, scoped discovery, addressed delivery, bounded
receive, reclaim, atomic ACK, dedupe, tombstones, fencing and backpressure.
The required Redis lane exercises two independent services and real races.

Remaining product gaps are WIRING-B recovery, health, inventory, retention,
quota and closed-scope admission. Until G/0/02–04 close, the capability is a
strong library/control surface rather than an operated service.

### Advertised MVP2 and planning journeys

Both official commands failed in the audited worktree:

- `node scripts/smoke_mvp2.mjs`;
- `node scripts/smoke_planning.mjs`.

Each helper creates a new Gateway process for every MCP request
(`scripts/smoke_mvp2.mjs:49-91`,
`scripts/smoke_planning.mjs:40-82`). `orchestration.create` therefore records
lineage in one process, while `task.assign` reaches a new RequestContext and
fails with `REQUEST_CONTEXT_DENIED`.

The denial is correct; weakening ownership would create a security regression.
The client must hold one authenticated connection for the complete flow, and
restart recovery must re-establish authority through a server-owned durable
mechanism.

### Cancellation and completion

`orchestration.cancel` is catalogued but always raises
`LIFECYCLE_OUTCOME_REQUIRED`
(`gateway/src/services/orchestration_service.js:83-90`). That code is not in
the public error allowlist, so users see a generic tool error. The current
test preserves the generic behavior instead of the intended product outcome
(`tests/gateway/tool_orchestration_task.test.js:46-73`).

`orchestration.complete` updates the orchestration without proving that child
tasks, sessions or approvals are terminal
(`gateway/src/services/orchestration_service.js:93-95`). These are two sides
of the same product gap: state names exist before the lifecycle journey is
operable.

### Operator recovery

The CLI has no command to list active traces, tasks, sessions, approvals or
coordination ownership. If an opaque ID is lost, recovery depends on direct
store knowledge or external notes. The absence of a queue/overview also makes
timeouts and false completion hard to diagnose.

## Findings

| ID | Severity | Finding | User impact | Owner |
|---|---:|---|---|---|
| PROD-C01 | Critical | The real-agent path is not a trustworthy product boundary | A delegated agent can share control-plane access and raw egress | D/0/01–06 |
| PROD-H01 | High | Both documented hero smokes fail on the exact promoted commit | A new user cannot complete the advertised first flow | D/0/04, H/0/02, I/0/02 |
| PROD-H02 | High | Cancel is exposed but cannot produce a valid lifecycle outcome | Operators cannot safely stop work through the public contract | C/1/01–03, D/0/01 |
| PROD-H03 | High | Completion can be declared without terminal children | Status can overstate actual outcome | C/1/02–03 |
| PROD-H04 | High | No inventory/recovery surface exists | Lost IDs become lost control | E/0/00–04 |
| PROD-H05 | High | Approval and review are not yet bound to the exact effect/change digest | A conversational decision can be mistaken for executable authority | E/0/01–02, F/0/00–04 |
| PROD-M01 | Medium | Coordination is rich but product recovery/health/caps remain incomplete | Operational incidents require internal knowledge | G/0/02–04 |
| PROD-M02 | Medium | Docs/package metadata still describe V4/v0.1 inconsistently with V5 state | Users cannot infer supported scope from the entry points | H/0/01–03, I/0/04 |

## Product strengths

- Coordination semantics solve real multi-orchestrator problems rather than
  merely exposing a queue.
- The public catalog is closed, validated and produces safe error projections.
- RequestContext is a meaningful fail-closed improvement within one
  connection.
- Candidate verification and review trails make a credible release discipline
  possible.
- The plan explicitly distinguishes substrate, splice, proof and release.

## Value-maximizing sequence

1. Fix the persistent connection contract and make the two documented smokes
   executable in CI.
2. Finish the supervisor/session-port splice so there is one provider path.
3. Deliver isolation, single-writer, budgets and non-recursion.
4. Close lifecycle truth and expose an operator overview/approval queue.
5. Bind artifacts, review and approval to immutable effects.
6. Ship H/0/02 as the first supported product flow.
7. Only then enable H/0/05 protected real-agent execution and the I release
   program.

## Acceptance bar

The product is ready for a demonstrable MVP when a fresh operator can, without
direct database access:

1. start the documented command;
2. see the run and every child;
3. respond to an immutable approval;
4. reconnect and recover the same authority;
5. cancel or complete with truthful terminal preconditions;
6. obtain a digest-bound review/result;
7. repeat the flow under the required full gate.

