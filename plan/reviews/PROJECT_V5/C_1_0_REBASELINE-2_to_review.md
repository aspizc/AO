# Review Submission — Project V5 C/1/00 Rebaseline (Trial 2)

Review id: `C_1_0_REBASELINE-2`

## Requested verdict

Independent review of the corrected `C_1_0_REBASELINE_CORE` candidate only.
This request is not a result, integration, promotion, release, or authorization
for the joint C/D runtime splice.

## Authority and scope

The operator selected Option B for the C/1/00 rebaseline: keep lifecycle state
and evidence in C, and keep process actuation/cancellation in D/0/01. The
durable original decision and confirmation remain:

- `cm-2587a28b-77cd-4c37-92a8-756af10c68b1`;
- `cm-e179fd1e-47db-435a-b9c9-c5a9faaf9eea`; and
- coordination trace
  `tr-v5-b313e58f-fef9-4dd4-8134-26e25ad0f5de`.

During Trial 2, the operator reconfirmed the pure-rebaseline interpretation.
Authority release
`cm-2f337d03-3df9-4424-b97d-a95d4602d34e` requires the temporary caller-facing
cancel boundary to fail with `LIFECYCLE_OUTCOME_REQUIRED`, preserve active
state, and emit no cancellation audit/transition. The reducer may retain a
server-owned cancellation action for the later D splice, but this CORE
candidate makes no process-termination claim.

Historical `C_1_0` Trials 1–15 and the denied Trial 16 remain immutable.
`C_1_0_REBASELINE-1` remains reviewed KO at
`d8ec6808fce1f07e9f64720bbe48939da0ca44dc`. Its technical candidate
`0c73994b73b86b9fed74b2fe38c82fc375bf545e` was used only as correction
evidence and is not an ancestor of this candidate.

## Candidate identity

- Branch: `feat/V5-C-1-00-rebaseline-core-2`
- Accepted Wave 2 correction base:
  `970563b0080afd47cc866a65eafcb8a761ff828d`
- Initial Trial 2 RED:
  `a0ec46d36089f9a43b988c0d4fbde19fbc141f5f`
- RED refinement:
  `f23ee6ca5c32cd86400f3ffe66b342dd09fd7f0c`
- Cancellation-contract RED:
  `d4df8c63dc50838e2c26a988401a7246305d130a`
- Technical GREEN:
  `bfa99a638d0fafe973f6c170d7147ab041dff3a4`
- Technical tree:
  `cfe46d60f3e93de2fa04ecacaa7c4c3f17047139`

Parentage is exact:

```text
970563b -> a0ec46d -> f23ee6c -> d4df8c6 -> bfa99a6
```

## Trial 1 findings addressed

### Top-level PostgreSQL lifecycle DML

The repository now executes session creation and lifecycle updates through
the adapter's `run()` contract. The data-modifying CTE remains the top-level
statement. The dedicated fake rejects a statement materialized through the
adapter's row-returning `get()` wrapper and accepts the top-level `run()`
shape. Durable transition evidence, not an invented adapter row count,
determines success, exact retry, and CAS failure.

### Legacy-only sessions and canonical parent binding

The SQLite and PostgreSQL lifecycle columns are nullable for pre-splice direct
session inserts. A direct legacy insert therefore remains outside the
canonical lifecycle instead of silently acquiring `starting`, version zero,
or transition evidence. `SESSION_RESERVE` is the only canonical creation
action. Every later canonical session command rechecks the durable task and
trace parent.

The existing legacy status writers retain bounded compatibility behavior.
Their generated legacy idempotency keys are not claimed as a public exact-retry
contract. Removing that temporary path and routing the real launch adapter
remain part of the joint `C_1_0_REBASELINE_SPLICE` / `D_0_1_SPLICE`.

### Stable application-port request identity

The action-specific lifecycle service requires a caller-stable
`idempotencyKey`, rejects caller-supplied effective state, and returns the
original transition after a simulated lost response. Public catalog and
composition-root wiring remain integrator-owned and explicitly pending the
joint splice.

### One bounded version domain

The reducer exports and enforces `MAX_LIFECYCLE_VERSION` at
`Number.MAX_SAFE_INTEGER`, rejects overflow before arithmetic can stop being
monotonic, and applies the same non-negative bound to current state.
SQLite checks and PostgreSQL `BIGINT` checks encode the same range and allowed
states. The PostgreSQL fake enforces the same maximum.

### Concurrent exact reservation reconciliation

After any persistence conflict, the repository rechecks durable idempotency
evidence. An exact concurrent `SESSION_RESERVE` winner converges to the
original result; a different command with the same target/key remains a
static fail-closed conflict.

## Cancellation correction

The accepted deferred-cancellation contract is now explicit at the existing
service boundary:

- an unknown trace remains `ORCHESTRATION_NOT_FOUND`;
- an existing trace rejects with `LIFECYCLE_OUTCOME_REQUIRED`;
- its status remains `active`;
- no `ORCHESTRATION_CANCELLED` audit or lifecycle transition is written; and
- ordinary completion behavior remains unchanged.

The dedicated CORE lifecycle service exposes no caller-facing cancellation
method. No D-owned process cancellation, signal, FIFO, reaper, provider,
shell/argv, PGID, or runtime path was added.

## TDD lineage

| Role | Commit | Parent | Tree | Evidence |
|---|---|---|---|---|
| Trial 2 RED | `a0ec46d36089f9a43b988c0d4fbde19fbc141f5f` | `970563b0080afd47cc866a65eafcb8a761ff828d` | `76b6df25253561862a8107b5669b7fc8f71f7722` | Five new test-only paths cover all five Trial 1 findings. At the accepted base, the four focused files report 23 tests: 3 pass / 20 fail. |
| RED refinement | `f23ee6ca5c32cd86400f3ffe66b342dd09fd7f0c` | `a0ec46d36089f9a43b988c0d4fbde19fbc141f5f` | `1d46d63fac7221c9088af6335708c0d63ec509cd` | One test path narrows the fake/adapter statement boundary. Replayed over rejected Trial 1 source, 13 pass / 10 fail remain causal across all five findings. |
| Cancellation RED | `d4df8c63dc50838e2c26a988401a7246305d130a` | `f23ee6ca5c32cd86400f3ffe66b342dd09fd7f0c` | `490a1c66175644e7eee6ec7c1291e1f8cdf2eda1` | One baseline test path only; unchanged source gives 5 pass / 1 fail because no exception is raised. Source diff is zero. |
| Technical GREEN | `bfa99a638d0fafe973f6c170d7147ab041dff3a4` | `d4df8c63dc50838e2c26a988401a7246305d130a` | `cfe46d60f3e93de2fa04ecacaa7c4c3f17047139` | Exactly nine production paths; the six test paths are frozen from the RED lineage. |

The eight pre-existing GREEN WIP paths were preserved before the cancellation
RED under recorded whole-file hashes, restored byte-for-byte after the RED
gate, and then committed together with the ninth
`orchestration_service.js` correction. The temporary stash was removed only
after the technical commit was durable and the worktree clean.

## Exact path allowlist

Trial 2 tests:

- `tests/gateway/lifecycle_rebaseline_core_reducer.test.js`
- `tests/gateway/lifecycle_rebaseline_core_repository.test.js`
- `tests/gateway/lifecycle_rebaseline_core_service.test.js`
- `tests/gateway/lifecycle_rebaseline_postgres_fake.js`
- `tests/gateway/lifecycle_rebaseline_postgres_statement.test.js`
- `tests/gateway/orchestration_service.test.js`

Technical GREEN:

- `gateway/migrations/002_lifecycle.sql`
- `gateway/migrations/postgres/002_lifecycle.sql`
- `gateway/src/core/lifecycle.js`
- `gateway/src/core/repositories/lifecycle_repo.js`
- `gateway/src/core/repositories/orchestration_repo.js`
- `gateway/src/core/repositories/session_repo.js`
- `gateway/src/core/repositories/task_repo.js`
- `gateway/src/services/lifecycle_service.js`
- `gateway/src/services/orchestration_service.js`

No adapter, `gateway/src/core/postgres_db.js`, catalog, composition root,
workflow/CI manifest, policy, shared index, process/runtime source, or
`message.*` path changed in the technical commit.

## Verification

All executable checks were local and offline. PostgreSQL opt-ins,
`AGENTS_DB_URL`, and shared-service use were disabled. No Redis, MCP, KYA,
tmux process, provider, network, or real-agent lane ran.

Focused GREEN:

```bash
env -u AGENTS_PG_INTEGRATION -u AGENTS_TEST_DB \
  -u AGENTS_TEST_DB_URL -u AGENTS_DB_URL \
  node --test --test-concurrency=1 \
  tests/gateway/orchestration_service.test.js \
  tests/gateway/lifecycle_rebaseline_postgres_statement.test.js \
  tests/gateway/lifecycle_rebaseline_core_reducer.test.js \
  tests/gateway/lifecycle_rebaseline_core_repository.test.js \
  tests/gateway/lifecycle_rebaseline_core_service.test.js
```

Result: **29 pass / 0 fail / 0 skip**.

Focused plus adjacent legacy/fake contracts:

```bash
env -u AGENTS_PG_INTEGRATION -u AGENTS_TEST_DB \
  -u AGENTS_TEST_DB_URL -u AGENTS_DB_URL \
  node --test --test-concurrency=1 \
  tests/gateway/lifecycle_rebaseline_postgres_statement.test.js \
  tests/gateway/lifecycle_rebaseline_core_reducer.test.js \
  tests/gateway/lifecycle_rebaseline_core_repository.test.js \
  tests/gateway/lifecycle_rebaseline_core_service.test.js \
  tests/gateway/orchestration_service.test.js \
  tests/gateway/task_service.test.js \
  tests/gateway/sqlite_migrations.test.js \
  tests/gateway/state_init.test.js \
  tests/gateway/domain_repositories.test.js \
  tests/gateway/postgres_state.test.js
```

Result: **73 reported / 64 pass / 9 declared live-PostgreSQL skips /
0 fail**.

Static gates:

- selected ESLint over all seven changed JavaScript files: pass;
- `git diff --check d4df8c6..bfa99a6`: pass;
- technical range path count: exactly nine;
- technical test diff: zero;
- worktree after commit: clean.

The combined Wave 2 baseline currently has one unrelated lint error in
`gateway/src/core/coordination_consumer.js` and six stale CI inventory digests.
Those pre-exist this technical range and are owned by the integrator/G ACK
correction; this submission does not claim the aggregate CI gate is green.

## Reviewer checklist

Please independently verify:

1. exact parentage, trees, path allowlists, and frozen RED/GREEN test split;
2. each of the five Trial 1 findings against the real production boundary,
   not only the dedicated fake;
3. nullable legacy rows versus canonical `SESSION_RESERVE`;
4. cross-trace parent revalidation on every canonical session command;
5. maximum/overflow parity in reducer, SQLite, PostgreSQL, and fake;
6. exact concurrent reservation convergence and conflicting reuse denial;
7. deferred cancellation leaves state/audit/evidence unchanged;
8. no current-writer or public exact-retry closure is claimed before the
   joint C/D splice; and
9. no D-owned runtime/process behavior entered this CORE candidate.
