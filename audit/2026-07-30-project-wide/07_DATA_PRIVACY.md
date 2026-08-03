# Data and privacy audit

## Verdict

**Grade: D+.** Individual stores have useful integrity controls, but the
product lacks a complete data lifecycle, durable lineage, cross-store recovery
and privacy governance. This report does not make a legal or regulatory
determination.

## Data landscape

| Store/channel | Data | Current controls | Main gap |
|---|---|---|---|
| SQLite | Orchestrations, tasks, sessions, artifacts, messages, policy decisions, approvals | WAL, FKs in parts, migrations | Legacy tables lack complete referential integrity and single ownership |
| Artifact filesystem | Prompt/output/diff/test bytes | Trace directories, policy checks, sanitization path | Classification/provenance caller-controlled; no lifecycle |
| JSONL audit | Control and execution events | Append behavior, safe projections | No tamper evidence, retention or atomic relation to state |
| Redis coordination | Presence, inbox, dedupe, ACK tombstones, metadata events | TTLs, fencing, capacity and scope checks | Metadata stream retention, admission and product recovery |
| Coordination SQLite | Receipts, deliveries, quarantine vault, ACK outbox, owner generation | Strong constraints and outbox slices | Raw quarantined bodies and lifecycle/erase integration |
| PostgreSQL | Partial alternate state repository | Live contract tests exist | Driver/migration parity and production integration incomplete |
| Temporal | Workflow inputs, prompts, results, checkpoints/history | Durable replay model | Duplicated sensitive payloads, retention and authoritative effect identity |
| Provider egress | Prompts/context/output to external CLIs/services | Role/policy intent | No classification-bound destination/subprocessor registry |

## Data flow

```text
operator/client input
   → Gateway request context
      → SQLite/PostgreSQL state
      → artifact bytes on filesystem
      → JSONL + optional Redis audit projection
      → Redis coordination messages/quarantine
      → provider CLI/service
      → LangGraph/Temporal result and history
```

One logical run can therefore be represented in six or more independently
retained systems.

## Findings

### DATA-01 — No cross-store retention/export/erase

**High, open.** There is no enforceable schedule or operation covering SQL,
artifact bytes, JSONL, Redis streams/quarantine, Temporal histories and
backups. I/0/04 explicitly owns retention, export and erase only after the
other durable-store work is complete.

### DATA-02 — Prompt/output duplication is uncontrolled

**High, open.** Temporal passes prompts/results through activity inputs and
checkpoints (`workflows.py:173-230,234-263`), while the same material may
exist in artifacts, provider logs and audit context. Minimization and retention
must be designed per purpose, not per storage technology.

### DATA-03 — Classification and provenance are not authoritative

**High, partial.** RequestContext improves producer identity, but artifact
kind/classification remains caller-controlled
(`artifact_store.js:41-79`). The sanitizer is a narrow regex transform
(`gateway/src/core/sanitizer.js:15-31`), not a complete declassification
proof. Owner: F/0/00.

### DATA-04 — Plaintext and filesystem modes are not a complete control

**High contextual, open.** State, artifacts and audit are local plaintext, and
file/directory modes depend partly on process umask
(`state.js:70-76`, `artifact_store.js:12-15,31-34,85-89`,
`audit.js:44-80`). For a single-user local pilot this may be an accepted
deployment assumption, but it must be explicit and verified. I/0/04 owns the
release posture.

### DATA-05 — Multiwriter and partial commits

**High, partial.** Coordination ACK outbox/owner fencing are strong, but the
Gateway, approval wakeups, artifacts and audit do not share one owner/outbox.
Owners: D/0/03 and I/0/00–01.

### DATA-06 — Authority cannot rehydrate durable data access

**Medium/High, new.** Trace/task/session data outlives RequestContext lineage.
After reconnect, restart or 24-hour expiry, legitimate access fails closed.
A durable authenticated session must recover access without trusting caller
IDs. Owners span C/1/01, D/0/03, E/0/00 and I/0/02.

### DATA-07 — Governance catalog is absent

**Medium, open.** There is no complete catalog of data class, owner, purpose,
source, destination, retention, deletion mechanism, integrity SLI and
subprocessor. I/0/09 defines this work.

### DATA-08 — Redis lifecycle is partial

**Medium, partial.** Leases, dedupe and tombstones have TTL/capacity controls.
The metadata event stream does not have automatic retention, and quarantine/
consumer recovery is not integrated with global erase/retention. Owners:
G/0/03 and I/0/04.

### DATA-09 — Referential and semantic lineage gaps

**Medium, open.** Several legacy tables lack full trace FKs. Approval update
semantics replace payload details with a note; message reply parent is not a
durable column. Owner: I/0/09.

### DATA-10 — PostgreSQL migration parity

**Medium, open.** SQLite applies migration plus marker transactionally;
PostgreSQL executes them separately. Coordination tables are not at full
backend parity. Owner: I/0/05.

### DATA-11 — Data quality SLIs do not exist

**Medium, open.** There are no published measures for orphan rate, retention
overdue records, erase/export completion, backup age, restore success,
cross-store parity or provenance completeness. Owner: I/0/09.

## Privacy and access strengths

- RequestContext now binds MCP principal/repository/lineage server-side within
  a connection.
- Raw restricted artifacts have deny/sanitized-share tests.
- Coordination does not expose lease material in public/audit projections.
- Redis scope/lease checks and ACK recipient fences are strong.
- JSONL remains authoritative when Redis audit projection fails.
- No personal data or store contents were read during this audit.

## Required governance decisions

These require explicit operator/product decisions and must not be guessed:

- which data classes may leave the host for each provider;
- default retention by class and environment;
- whether local at-rest encryption is required for the supported pilot;
- controller/processor/subprocessor roles where applicable;
- legal basis, data-subject workflow and incident obligations where
  applicable;
- acceptable recovery-point and recovery-time objectives.

## Remediation plan

1. Make artifact classification/provenance server-owned in F/0/00.
2. Establish one writer and operation/outbox identity in D/0/03 and I/0/00.
3. Stage/commit artifacts atomically in I/0/01.
4. Define Temporal payload minimization and durable authority in I/0/02.
5. Prove backup/restore and PostgreSQL parity in I/0/03/05/07.
6. Publish the I/0/09 data catalog, lineage graph, integrity SLIs and
   destination policy.
7. Implement and test retention/export/erase across every store in I/0/04.

## Data release bar

A release must demonstrate, for one exact trace, that the system can:

- enumerate every durable copy and external destination;
- explain server-owned classification and provenance;
- restore a consistent state from backup;
- export and erase according to the declared contract;
- prove completion or surface every failed/unsupported store explicitly.

