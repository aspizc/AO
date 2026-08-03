# PROJECT V5 — Independent Audit Suite

Model: gpt-5.6-sol  
Reasoning: ultra  
Execution profile: fast/priority  
Snapshot: `develop` @ `d521afb12a6520b95f1a9fb172911b16ab77a1ff`  
Date: 2026-07-25

## Independence and method

Seven specialist agents audited the same clean snapshot independently. Each agent
used the dedicated audit skill for its discipline and was explicitly prohibited
from reading:

- pre-existing content under `audit/**`;
- prior project audit or review artifacts;
- the reports produced by the other agents in this suite.

This index was written only after all seven reports were complete. It is a
cross-report navigation and prioritization aid; it does not replace or modify
the independent findings.

No agent used the network, inspected real personal data, executed a live exploit,
ran a migration, or started, stopped, or contacted the shared MCP, Redis,
Postgres, or Temporal services.

## Report index

| Discipline | Grade / verdict | Primary conclusion | Report |
|---|---|---|---|
| Product | **D** | The technical dry-run works, but identity, approval, provenance, and lifecycle do not yet deliver the trust promise. | [01_PRODUCT.md](01_PRODUCT.md) |
| Architecture & infrastructure | **C** for local single-operator; **D** as a shared service | The local-first modular direction is sound, but blocking execution, non-atomic effects, incomplete async operations, and missing production controls prevent shared operation. | [02_ARCHITECTURE.md](02_ARCHITECTURE.md) |
| Code & repository | **D** | V5 coordination has strong defensive implementation, but the enforcement boundary does not bind authority to a server-owned identity, action, or trace. | [03_CODE.md](03_CODE.md) |
| UX & interaction | **D** | There is no GUI; the terminal/MCP experience is undermined by non-actionable approvals, ghost tools, misleading completion state, and inconsistent error signaling. | [04_UX.md](04_UX.md) |
| Security | **F in real-agent mode** | Three exploitable Critical paths break the declared trust boundaries: caller-asserted authority/resources, an unconfined subprocess/raw-output channel, and shell interpretation through tmux. | [05_SECURITY.md](05_SECURITY.md) |
| Testing & release confidence | **D — not safe to ship as the full V5/MVP2 promise** | The declared Node 20 CI cannot run the current Node test command, while Redis/Lua and real-agent seams remain opt-in. | [06_TESTING.md](06_TESTING.md) |
| Data, privacy & governance | **D** | No real leak or Critical was confirmed, but retention, erasure, minimization, access control, at-rest protection, and processor governance are not demonstrable end to end. | [07_DATA_PRIVACY.md](07_DATA_PRIVACY.md) |

The seven reports contain 4,086 lines of evidence, findings, strategy, and
milestone plans.

## Cross-audit decision

The snapshot should remain **local, single-operator, and non-shared** until the
security Criticals and the CI blocker are closed. A green local run on Node 22
does not currently prove the GitHub Node 20 gate, Redis 7 semantics, concurrent
delivery behavior, or the real Codex/Claude/tmux boundary.

The reports do not recommend replacing the local-first modular monolith with
microservices, Kubernetes, or multi-region infrastructure. They consistently
recommend making the existing Gateway boundary real and testable.

## Integrated priority order

### P0 — Restore a trustworthy security and release boundary

1. Establish the principal, role, trace, task, repo, and capabilities on the
   server side; bind canonical `repo` to canonical `cwd`; reject omitted or
   mismatched security context.
2. Replace shell-framed tmux control and synchronous child execution with an
   asynchronous, cancellable supervisor. Verify the foreground process and
   eliminate command construction from unquoted caller-controlled values.
3. Remove raw child `stdout`/`stderr` as a cross-role data channel. Route results
   through classified, provenance-bound artifacts with explicit declassification.
4. Make approvals immutable, operator-authenticated, action-specific, and
   single-use; consume the grant at the protected effect.
5. Align the CI Node runtime with the runner contract, verify the actual runner,
   and prevent a merge when the Gateway suite does not execute.

### P1 — Prove V5 coordination and workflow integrity

1. Add a required disposable Redis 7 lane with zero silent skips, concurrent
   send/receive/ACK/reclaim races, retry budgets, poison handling, and DLQ
   behavior.
2. Bind artifacts and review verdicts to repo, commit/tree digest, task,
   producer session, and reviewed bytes.
3. Enforce lifecycle invariants: an orchestration cannot become `completed`
   while tasks or required reviews/approvals remain pending.
4. Generate runtime schemas, tool descriptions, prompts, and documentation from
   one executable contract; remove ghost tool names and fail-open unknown
   policy actions.
5. Introduce durable operation keys and recoverable units of work/outbox
   behavior across SQL, filesystem, audit, Redis, and Temporal.

### P2 — Make the product operable and govern its data

1. Add operator inventory and recovery surfaces for traces, sessions, tasks,
   pending approvals, retries, and coordination lag.
2. Define owners, purposes, classifications, retention, deletion, backup
   treatment, and processor/residency expectations for every dataset.
3. Minimize persisted prompts and outputs, remove full result blobs from
   checkpoints, sanitize before persistence, and test end-to-end erasure.
4. Add SLOs, metrics, alerts, runbooks, restore drills, quotas, and cost budgets
   appropriate to the local/shared deployment boundary.

## Important evidence limitations

- Security findings are static end-to-end attack paths; no payload was executed.
  Their prerequisites are stated in the security report.
- Testing observed 893 passing and 19 skipped cases on the available Node 22 and
  Python environment. This is diagnostic evidence, not a reproduction of the
  declared Node 20 GitHub job.
- Redis, Postgres, Temporal, and real provider CLIs were not contacted during
  these audits.
- UX evaluates the real terminal/MCP surface. WCAG 2.2 AA and EAA cannot be
  claimed or rejected formally because the project has no GUI or DOM.
- The data/privacy report is a technical assessment, not legal advice or a
  compliance certification.

## Recommended reading order

1. [05_SECURITY.md](05_SECURITY.md)
2. [06_TESTING.md](06_TESTING.md)
3. [03_CODE.md](03_CODE.md)
4. [02_ARCHITECTURE.md](02_ARCHITECTURE.md)
5. [01_PRODUCT.md](01_PRODUCT.md)
6. [04_UX.md](04_UX.md)
7. [07_DATA_PRIVACY.md](07_DATA_PRIVACY.md)
