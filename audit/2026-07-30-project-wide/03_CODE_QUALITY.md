# Code quality audit

## Verdict

**Grade: C−.** The codebase has strong validation, explicit contracts and
substantial tests, but correctness-critical product paths still bypass the
new safe cores. Complexity is concentrated in a small number of very large
modules without active fitness or mutation gates.

## Repository map

| Area | Responsibility | Quality assessment |
|---|---|---|
| `gateway/src/tools` | MCP schemas/handlers and request projection | Strong closed catalog; some service errors collapse to generic errors |
| `gateway/src/services` | Orchestration, agents, approvals and coordination | Clear intent, but legacy lifecycle and global/process-local behavior remain |
| `gateway/src/core` | Policy, artifacts, RequestContext, lifecycle and queues | Strong validation; several oversized modules and caller-controlled metadata |
| `gateway/src/adapters` | Providers, tmux, process supervision and stores | Safe supervisor is strong; active adapters remain legacy and blocking |
| `cli/` | Local operator commands | Small and testable, but functionally narrow |
| `orchestrator-langgraph/` | LangGraph and Temporal flows | Clean separation in places; contract/authority integration remains incomplete |
| `scripts/`, `ci/` | Gate, candidate and operational utilities | Powerful but unusually large and complex |

## Positive engineering changes

- Unknown public actions now fail closed.
- Zod/AJV schemas are cross-checked for Unicode, numbers and closed roots.
- RequestContext binds principal, target, repository and lineage server-side.
- Lifecycle reducer and CAS repository encode monotonic terminal behavior.
- The process supervisor uses literal argv, `shell:false`, process identity,
  authenticated session-port messages, bounded output and descendant cleanup.
- Redis coordination uses persistent clients, Lua fencing, bounded queues and
  atomic ACK/outbox behavior.
- Candidate verification checks locks, suite inventory, SBOM, advisories and
  exact Git identity.

## Correctness findings

### CODE-C01 — Safe core is not on the active route

**Critical, partial.** Codex and Claude direct execution still uses
`spawnSync`; provider spawn/ask uses shell-facing tmux commands. The safe
supervisor can be correct in isolation while the product remains unsafe.

This is the central code-quality problem: duplicated old/new execution paths.
The answer is not another abstraction. Complete the existing splice, migrate
all callers and delete or fence the legacy path.

### CODE-C02 — Artifact authority remains caller-controlled

**Critical, open.** `gateway/src/core/artifact_store.js:41-60` accepts
`kind`, `classification` and producer metadata from the caller. Sanitization
is selected after that classification decision. F/0/00 must make the server
derive metadata from the action, policy, request context and source channel.

### CODE-H01 — Public lifecycle contract has dead ends

**High, open.** Cancel always throws an internal lifecycle requirement, while
complete does not enforce child terminality. The catalog, service and error
projection therefore disagree.

### CODE-H02 — RequestContext cannot recover

**High, new.** Connection-local Maps correctly prevent spoofing but cannot
reconstruct legitimate ownership after reconnect/restart. The fixed 24-hour
expiry is not configurable through `loadConfig`. The correction needs an
explicit durable session/reconnect design, not a bypass.

### CODE-H03 — Session and operation persistence order is unsafe

**High, open.** Active agent flows can launch before the durable session record
is established. A crash between effect and persistence creates an orphan that
inventory cannot explain. D/0/01, C/1/00 and I/0/00 must converge on
reserve-before-effect plus idempotent reconciliation.

### CODE-H04 — Error semantics hide actionable states

**High, open.** `LIFECYCLE_OUTCOME_REQUIRED` is not projected as an allowed
public error, so cancel becomes `TOOL_ERROR`. Generic safe errors are valuable
for secrets, but domain states used for recovery must remain typed.

### CODE-H05 — Workflow consumers accept weak result envelopes

**High, open.** Legacy LangGraph checks `passed/status` and ignores the real
`exitCode`; reviewer results can advance without a fail-closed verdict.
Temporal improves part of the parsing but still lacks effect-bound approval
identity. Owners are I/0/02 and F/0/03.

## Complexity and maintainability

The Gateway JavaScript source is about 28,071 lines. Current hotspots include:

| File/module | Approximate lines | Risk |
|---|---:|---|
| `coordination_queue.js` | 3,294 | Wire protocol, Lua, retries and client lifecycle in one unit |
| coordination consumer SQLite repository | 2,954 | State transitions, persistence and recovery coupled |
| `process_supervisor.js` | 2,606 | Cross-platform process protocol and lifecycle |
| process supervisor helper | 2,379 | Reaping, process identity and control socket |
| coordination consumer runtime | 1,492 | Ownership, polling and recovery orchestration |
| coordination service | 1,392 | Validation, policy and transport semantics |
| `request_context.js` | 943 | Authority, capability, lineage and result observation |
| `release_candidate.py` | 4,424 | Candidate, dependency and release validation |
| `ci_gate.py` | 2,871 | Suite execution, process cleanup and evidence aggregation |

Size alone is not a defect, but these modules are failure domains. ESLint adds
little beyond unused-variable checks, and C/0/03 coverage/mutation/fitness
acceptance is still planned. The hotspot inventory in C/0/03 should be updated
to include the current list rather than only its original coordination files.

## Dependencies and supply chain

`npm audit --omit=dev` reports two moderate findings through
`@hono/node-server@1.19.15`, introduced by the MCP SDK. A fix is available.
The observed stdio Gateway does not serve static Windows paths, so direct
reachability appears low; this is a contextual Medium rather than a product
Critical.

Strengths include npm/Python locks, SBOM generation, advisory snapshots,
license checks and candidate-bound verification. CI actions still use mutable
major tags, which should be pinned when release hardening reaches I/0/04.

## Developer experience

Positive:

- one canonical suite manifest;
- explicit accepted skip inventory;
- TDD/review evidence per sheet;
- exact candidate and tree reporting;
- good fixture depth for coordination and process supervision.

Negative:

- active product behavior differs from the safe modules developers see;
- package metadata still describes the Gateway as V4;
- execution/package paths depend on a checkout;
- documentation structure tests often assert text presence rather than
  executable behavior;
- large plan/review history makes current truth harder to locate.

## Improvement plan

1. Complete the execution splice and remove duplicate legacy routing.
2. Add the two official smokes and the full-gate cleanup race to C/0/03
   fitness functions.
3. Make artifact metadata and operation identity server-owned.
4. Finish one lifecycle path; delete compatibility branches only after
   migration evidence.
5. Decompose hotspots along protocol/state/effect boundaries while tests are
   green; do not create generic frameworks.
6. Add risk-weighted coverage and mutation thresholds for authority,
   lifecycle, approval, artifact and process cleanup code.
7. Package the Gateway/worker so tests and production use the same entry point.

