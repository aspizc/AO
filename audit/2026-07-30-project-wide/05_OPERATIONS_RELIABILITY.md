# Operations and reliability audit

## Verdict

**Grade: D.** The repository has strong low-level reliability primitives and
CI discipline, but lacks a single operated Gateway, workspace ownership,
inventory, recovery, health/SLOs and a deployable full stack. The observed
runtime topology is already beyond a safe local operating envelope.

## Observed live topology

At the read-only sample:

| Measure | 2026-07-26 | 2026-07-30 | Delta |
|---|---:|---:|---:|
| Gateway processes | 36 | 60 | +24 / +67% |
| Aggregate RSS | ~3.16 GiB | ~5.11 GiB | +1.95 GiB / +62% |
| Gateways on one external workspace | 35 | 58 | +23 |

Fifty-eight processes held the same external SQLite database, WAL and SHM.
Two held this repository's equivalents. Parent processes were predominantly
Codex/Claude sessions; some owned four Gateway children.

This is not evidence of data corruption by itself, but it proves that
recursive control-plane and multiwriter risks are active operational
conditions rather than hypothetical architecture findings.

## Reliability findings

### OPS-01 — No single Gateway owner

**Critical, open.** Every stdio connection composes a full writer, state
singleton and tool registry. There is no workspace lease before stores open.
D/0/03 must establish one writer/manager identity and deterministic
reconciliation.

### OPS-02 — Recursive process amplification

**Critical, open and worsened.** Child sessions can discover/start the
Gateway. No admission budget caps the resulting tree. D/0/05 depends on
isolation and single-writer; immediate configuration containment is warranted
before code closure.

### OPS-03 — Safe supervisor is not the active runtime

**Critical, partial.** The supervisor has robust process identity, reaping,
backpressure and bounded close behavior. Active adapters remain blocking or
tmux-driven, so operational cancellation and cleanup cannot rely on it.

### OPS-04 — Full gate exposes a cleanup race

**High, release blocker, new.** Two complete gates failed the same test:
`abrupt supervisor SIGKILL leaves the persistent reaper to clean the exact
utility tree`. The owned process survived the 3.5-second test window under
suite load and disappeared later. The live lane passed 22/22 alone.

This indicates load/order-dependent cleanup timing or ownership, not a
deterministic green guarantee. Diagnose under the exact full-gate process
group and retain the failure as release evidence.

### OPS-05 — Process-local continuity

**High, new.** Request authority and approval wakeups live in the Gateway
process. Restart/reconnect loses lineage, and each Temporal activity opens a
new client. Durable stores cannot be operated if their authority cannot be
rehydrated safely.

### OPS-06 — Cross-store recovery is undefined

**High, open.** SQLite/PostgreSQL, artifact filesystem, JSONL, Redis and
Temporal can commit independently. There is no transactional outbox covering
the full operation, no reconciliation command and no verified restore drill.

### OPS-07 — Operator control plane is incomplete

**High, open.** The CLI cannot list active work, identify owners, show
approvals, inspect health or reconcile orphans. Approval helper processes can
write SQLite/JSONL while omitting a configured Redis mirror.

### OPS-08 — No global capacity model

**High, open.** Per-operation limits exist in components, but no common
admission controller budgets processes, concurrent agents, output bytes,
Redis backlog, disk or provider cost. D/0/06 and G/0/03–04 own the model.

### OPS-09 — Observability is not an operated contract

**Medium/High, open.** Logs correctly use stderr and stdout remains MCP-only.
However, there is no bounded exporter, durable cursor, canonical health
projection, SLO, alerting or dashboard. E/0/04 specifies these but is planned.

### OPS-10 — Deployment depends on a checkout

**Medium, open.** Compose includes databases only. There is no complete image,
service definition, installation bundle or upgrade/rollback procedure for
Gateway plus workers. Portability remains H/0/01 and I/0/04/06/07 work.

## Operational strengths

- SQLite enables WAL and foreign keys.
- Coordination uses persistent Redis command/blocking lanes and bounded close.
- Redis ACK/reclaim/fencing behavior is exercised against Redis 7.
- Process supervisor tests cover literal argv, descendant reaping,
  backpressure, source/sink failure and authenticated control.
- The CI gate owns child process groups and reports skipped infrastructure
  explicitly.
- Candidate verification binds evidence to a commit/tree and dependency locks.
- MCP stdout/stderr separation is tested.

## Supported operating envelope today

The evidence supports local development and dry-run validation with explicit
operator supervision. It does not support:

- a durable multi-user/multi-workspace service;
- treating real agents as hostile tenants;
- unattended long-running workflows across Gateway restarts;
- claims of deterministic cancel/recovery;
- released operation with published SLOs.

## Immediate containment

These are operational mitigations, not completion claims:

1. select one pinned Gateway candidate per workspace;
2. do not expose the control Gateway configuration to child workspaces;
3. avoid launching new real/YOLO sessions until the execution boundary closes;
4. monitor process count, RSS and open state-store owners;
5. preserve current sessions unless the operator explicitly authorizes
   termination;
6. require a clean full gate before any further release/pilot claim.

## Target operating model

| Concern | Required model |
|---|---|
| Ownership | One manager/boot ID and workspace lease |
| Admission | Global process/output/disk/provider-cost budget |
| Execution | Isolated child runner with authenticated control |
| Recovery | Durable operation ID, outbox and deterministic reconciler |
| Health | Metadata-only external watchdog plus closed health projection |
| Observability | Bounded RED/USE metrics, durable cursor, SLOs and alerts |
| Backup | Cross-store manifest and verified restore drill |
| Release | Pinned installable artifact and reversible upgrade |

## Ordered operations plan

1. Diagnose QA-NEW-01 under full-gate load.
2. Complete D/0/01 and establish D/0/02–03/06.
3. Close D/0/05 and verify process-count invariants.
4. Deliver E/0/00 and E/0/04 inventory/health.
5. Complete G/0/02–04 consumer recovery/caps.
6. Implement I/0/00–03 outbox, operation identity and restore.
7. Package one full stack in I/0/06–07.
8. Publish SLO and rollback evidence before I/0/04 release.

