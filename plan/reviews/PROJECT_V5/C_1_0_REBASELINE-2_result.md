# Project V5 C/1/00 Rebaseline Trial 2 — independent review result

Review id: `C_1_0_REBASELINE-2`

Verdict: `reviewed_OK`

Finding counts: **P0 0 / P1 0 / P2 0**.

This review is limited to the five findings reported in
`C_1_0_REBASELINE-1` and to the operator-confirmed Option-B cancellation
boundary. It does not review or authorize D-owned process actuation, the joint
C/D splice, integration, promotion, or release.

## Candidate identity and lineage

- Review-request HEAD:
  `12c852d1a3e90dac6181ad09c0e77e8debf11c45`.
- Request tree: `787f2c25e3b6ffddb617ecc2cf4eb60082852e63`.
- Technical GREEN:
  `bfa99a638d0fafe973f6c170d7147ab041dff3a4`.
- Technical tree: `cfe46d60f3e93de2fa04ecacaa7c4c3f17047139`.
- Cancellation RED:
  `d4df8c63dc50838e2c26a988401a7246305d130a`, tree
  `490a1c66175644e7eee6ec7c1291e1f8cdf2eda1`.
- RED refinement:
  `f23ee6ca5c32cd86400f3ffe66b342dd09fd7f0c`, tree
  `1d46d63fac7221c9088af6335708c0d63ec509cd`.
- Initial Trial 2 RED:
  `a0ec46d36089f9a43b988c0d4fbde19fbc141f5f`, tree
  `76b6df25253561862a8107b5669b7fc8f71f7722`.
- Accepted correction base:
  `970563b0080afd47cc866a65eafcb8a761ff828d`, tree
  `3a6342560d3ba37be1e0b2c697195d3ed72b0ad0`.

The parent chain is exact:

```text
970563b -> a0ec46d -> f23ee6c -> d4df8c6 -> bfa99a6 -> 12c852d
```

## Exact path sets

The initial RED adds exactly these five test-support paths:

- `tests/gateway/lifecycle_rebaseline_core_reducer.test.js`
- `tests/gateway/lifecycle_rebaseline_core_repository.test.js`
- `tests/gateway/lifecycle_rebaseline_core_service.test.js`
- `tests/gateway/lifecycle_rebaseline_postgres_fake.js`
- `tests/gateway/lifecycle_rebaseline_postgres_statement.test.js`

The RED refinement changes only
`tests/gateway/lifecycle_rebaseline_core_repository.test.js`. The
cancellation RED changes only
`tests/gateway/orchestration_service.test.js`. Therefore the complete Trial 2
test path set is exactly six paths.

The technical GREEN changes exactly these nine production paths:

- `gateway/migrations/002_lifecycle.sql`
- `gateway/migrations/postgres/002_lifecycle.sql`
- `gateway/src/core/lifecycle.js`
- `gateway/src/core/repositories/lifecycle_repo.js`
- `gateway/src/core/repositories/orchestration_repo.js`
- `gateway/src/core/repositories/session_repo.js`
- `gateway/src/core/repositories/task_repo.js`
- `gateway/src/services/lifecycle_service.js`
- `gateway/src/services/orchestration_service.js`

The test diff from cancellation RED to technical GREEN is empty. The request
commit adds only
`plan/reviews/PROJECT_V5/C_1_0_REBASELINE-2_to_review.md`. No adapter,
catalog, composition-root, process/runtime, provider, policy, workflow/CI,
shared-index, or `message.*` path enters the technical range.

## Trial 1 finding closure

### 1. PostgreSQL lifecycle DML remains top-level

`persistPostgres()` now sends both update and reservation data-modifying CTEs
through the unchanged adapter's `run()` method. For a `WITH` statement that
method materializes the parameters and sends the statement directly to the
executor; it does not use the row-returning `get()`/`all()` path and therefore
does not wrap the CTE in a derived table.

The subsequent read is a separate lookup of durable transition evidence.
Success, exact retry, digest conflict, and zero-row CAS failure are determined
from that durable evidence rather than the adapter's synthetic `changes`
value. The dedicated fake rejects the former nested shape and accepts only
the top-level lifecycle CTE boundary.

Trial 1 finding P1-1 is closed.

### 2. Legacy sessions stay outside the canonical lifecycle

Both migrations leave the session lifecycle state/version pair nullable and
without a default. A direct pre-splice session insert therefore retains its
legacy status and has no lifecycle transition evidence. The compatibility
writer detects that null pair and updates only the legacy fields; it does not
promote the row into the canonical lifecycle.

`SESSION_RESERVE` is the only canonical session creation action. For every
session command, including later transitions, the repository reloads the
durable task and verifies its trace before loading/reducing the session. The
reducer additionally matches the command against the stored session task and
trace, while a legacy-only row is rejected from canonical transition.

Trial 1 finding P1-2 is closed within the pure-rebaseline boundary. Routing
the real launch writer remains deliberately deferred to the joint C/D splice
and is not claimed here.

### 3. The application port has stable request identity

The action-specific lifecycle service requires a non-empty caller-provided
`idempotencyKey`, rejects caller-supplied effective state, and does not
generate a replacement identity. A repeated request after a simulated lost
response recovers the original durable transition, including the original
occurrence time; session reservation converges through the same port.

Trial 1 finding P1-3 is closed at the reviewed application-port boundary.
Catalog and composition-root publication remain integrator-owned and are
explicitly not claimed by this CORE candidate.

### 4. One bounded lifecycle version domain is enforced

The reducer exports `MAX_LIFECYCLE_VERSION` as
`Number.MAX_SAFE_INTEGER`, admits only non-negative safe integers, and rejects
an increment at the maximum before arithmetic. SQLite checks, PostgreSQL
`BIGINT` checks, transition-evidence checks, allowed-state checks, and the
PostgreSQL fake all use the same upper bound and non-negative domain.

Trial 1 finding P2-1 is closed.

### 5. Concurrent exact reservation reconciles the winner

After any persistence exception, the repository rechecks durable evidence
using the original key and digest. An exact concurrent `SESSION_RESERVE`
winner therefore returns its original state and transition as an idempotent
result. A reservation collision without matching durable evidence remains a
static fail-closed repository conflict, and reuse of an existing key with a
different digest remains an idempotency conflict.

Trial 1 finding P2-2 is closed.

## Option-B cancellation contract

The existing orchestration service first checks trace existence:

- an unknown trace throws `ORCHESTRATION_NOT_FOUND`;
- an existing trace throws the static `LIFECYCLE_OUTCOME_REQUIRED`;
- no status writer or audit append is reached;
- the existing orchestration therefore remains `active`; and
- no cancellation audit or lifecycle transition is created.

Ordinary completion still persists `completed` and emits its completion audit.
The dedicated CORE lifecycle service exposes no caller-facing cancellation
method. The reducer's server-owned cancellation action is state-only and makes
no process-termination claim. No D-owned process/runtime path is present in
the technical path set.

The operator-confirmed cancellation contract B is satisfied.

## Verification evidence

All reviewer execution was local and offline, with PostgreSQL opt-ins and
database URLs unset. A temporary dependency link used for the local replay was
removed immediately afterward; its `better-sqlite3` version matched the
candidate lock at `11.10.0`.

- Focused reducer, repository, application-port, PostgreSQL statement, and
  orchestration cancellation suite: **29 pass / 0 fail / 0 skip**.
- Submission-recorded adjacent suite: **73 reported / 64 pass / 9 declared
  live-PostgreSQL skips / 0 fail**.
- `git diff --check d4df8c6..bfa99a6`: pass.
- Technical test diff: empty.
- Parent, tree, and exact path-set checks: pass.
- Worktree before this result file: clean.

No live PostgreSQL, network, provider, Redis, MCP, tmux, process/runtime, or
real-agent lane was exercised.

## Final verdict

`reviewed_OK`

All five Trial 1 findings are closed for the corrected CORE candidate, and the
temporary Option-B caller-facing cancellation boundary fails statically
without changing lifecycle state or cancellation evidence. This verdict does
not integrate or promote the candidate and does not authorize the later D
process-cancellation splice.
