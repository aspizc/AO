# Review Submission — Project V5 G/0/02 WIRING-A store design

## Deliverable

Normative design:

```text
plan/PROJECT_V5/G/0/02-DESIGN-store-identity.md
```

Design commit:

```text
3095a10f4ce259b3f04b0c21d40cb5e40079fbe1
docs(design): propose durable store identity (V5 G/0/02 WIRING-A)
```

This submission responds to the design-first direction in
`G_0_2_WIRING_A-3_result.md` at
`75676bf8ffa6097ad02f14c53f7a228b419b6eea`.

No source, test, migration, or policy file was changed. The independently
accepted Trial 3 cancellation correction is frozen and is not redesigned.

## Decision

The design stops deriving a canonical store identity.

Each migrated SQLite database contains one WIRING-owned owner table with
`scope_id` as its primary key. Before creating consumer or reconciler work, a
runtime inserts a row for its scope through a narrow owner port bound to the
same exact handle as the final consumer repository:

```sql
INSERT INTO coordination_consumer_runtime_owners (
  scope_id,
  owner_token,
  acquired_at
) VALUES (?, ?, ?)
ON CONFLICT(scope_id) DO NOTHING;
```

Only `changes === 1` permits start. `changes === 0` is the closed
`COORDINATION_CONSUMER_RUNTIME_STORE_OWNED` result. Errors and all other
results fail closed.

Graceful stop waits for all owned work to settle, then deletes only
`WHERE scope_id = ? AND owner_token = ?`. The 32-byte random token fences
delayed or stale releases.

The claim is deliberately non-expiring in part A. A crash leaves a safe stale
row and blocks replacement; this design makes no crash-recovery or automatic
restart claim.

## Correctness argument summary

Let `S` be one SQLite transactional serialization domain, `T_S` its owner
table, and `K` a scope.

1. **Locality:** the owner port and final repository are created as one opaque
   binding over one exact handle. A claim through that port can affect only
   `T_S`. No pathname, descriptor, process map, lock delta, or unrelated
   connection value is an input.
2. **Uniqueness:** `scope_id` is the primary key in `T_S`. SQLite serializes
   conflicting writes and permits at most one same-scope insert to report
   `changes === 1`.
3. **Admission:** runtime work is created only after that exact winning result.
   Conflict, ambiguity, busy/error, missing schema, and invalid results create
   no work.
4. **Fenced release:** an owner can delete only its scope plus exact random
   token, and only after its work settles.

Therefore two handles to one supported durable store cannot receive different
ownership keys: no derived key exists, and both contend on one row. One handle
cannot receive an unrelated store’s identity: no identity is selected, and
unrelated-store state cannot enter the target statement or result.

## Requested-content map

| Required design content | Location in normative document |
|---|---|
| Precise same-store, shared-owner, and fail-closed requirement | Sections 1.1–1.3 |
| Why object, pathname, and descriptor/lock designs failed | Section 2 |
| Proposed mechanism and correctness proof | Sections 3 and 4 |
| Ambiguity/failure disposition with no weaker fallback | Section 5 |
| Supported platforms and hard failures elsewhere | Section 6 |
| Repeated many-handle/unrelated-activity verification and per-guard mutations | Section 8 |
| Honest limits and operator decisions | Section 7 |

## Why the third implementation was not authoritative

Trial 3 correctly used `fstat` on a real open descriptor, but selected that
descriptor from process-wide lock changes. The interval around a target query
did not causally bind a changed descriptor to the target connection.

During unrelated rollback-journal reads, the unrelated store could be the
unique direct lock-change candidate and win before the algorithm related WAL
activity to the target. The reviewer observed the unrelated identity for 303
of 1,200 target handles without any resolution error.

The new design has no observation interval and no candidate selection. The
target handle executes a statement against its own database, so unrelated
activity can affect scheduling but cannot substitute another store’s row or
result.

## Failure and portability disposition

- Missing owner table, closed/read-only handle, busy timeout, corruption,
  invalid adapter result, backend mismatch, and opaque-binding mismatch are
  hard failures.
- There is no object/path/descriptor/process-map fallback.
- PostgreSQL remains deferred to I/0/05.
- Production in-memory stores are rejected.
- The SQL mechanism is designed for Linux, macOS, and Windows using
  `better-sqlite3` on a local filesystem with SQLite’s documented locking and
  atomic-commit guarantees.
- Unknown/weaker network filesystems or custom VFS implementations are
  unsupported and must be rejected rather than silently degraded.
- Platform support is claimed only after the platform-specific verification
  passes.

## Required implementation verification

The normative design makes the following load-bearing:

- at least three 400-handle same-store runs with exactly one common-scope
  winner;
- independent-process contention, not only one event loop;
- the reviewer’s WAL-target/rollback-unrelated ordinary concurrent read
  workload in both directions;
- unrelated preclaimed scopes that must not conflict with target-store claims;
- same-path, alias, rename/replacement, repository/owner mismatch, error, and
  release-fencing cases;
- a crash-stale child-process case that must remain blocked;
- unchanged reruns of every closed Trial 3 cancellation case; and
- twelve independent guard mutations covering schema uniqueness, targeted
  conflict behavior, opaque binding, result admission, no fallback, fresh
  tokens, exact release, lifecycle ordering, compensation, no automatic
  takeover, and backend admission.

Every identity/ownership guard must have a named mutation, syntax result,
failing test, and zero survivors.

## Honest limit and escalation disposition

The selected non-expiring claim satisfies the part-A single-owner safety
requirement without an unresolved operator choice. It intentionally sacrifices
automatic liveness after a hard process crash. Backups or copies taken while
owned also preserve the safe block.

Automatic stale-owner reclamation is a separate decision requiring
end-to-end epoch fencing of receive, handler effects, repository transitions,
ACK, and reconciliation. A TTL or PID-only takeover is explicitly prohibited.
Network/custom-VFS support likewise requires separate evidence.

Neither optional expansion blocks this design’s current safety semantics, so
no `G_0_2_WIRING_A_DESIGN_to_check_by_human.md` escalation artifact is
required.

## Scope boundary

- No dependency on migration `003` or the ACK-outbox schema. The future owner
  table is an independent WIRING-owned migration after the sibling migration.
- No crash-recovery, durable-convergence, Redis-live-recovery, health,
  inventory, integration, promotion, or complete-sheet claim.
- No managed client, raw client, lane, factory, URL/options, recovery facet,
  or callback executor is exposed.
- No change to the closed cancellation implementation or tests.

## Changed-path allowlist

```text
plan/PROJECT_V5/G/0/02-DESIGN-store-identity.md
plan/reviews/PROJECT_V5/G_0_2_WIRING_A_DESIGN-1_to_review.md
```

The pre-existing untracked `gateway/node_modules` entry remains untouched.

## Review status

Waiting for independent design review. No coder-owned verdict is asserted.
