# Review Submission — Project V5 C/1/00 Rebaseline (Trial 1)

Review id: `C_1_0_REBASELINE-1`

## Human-authorized decision

This submission implements Option B, accepted by the operator with the exact
response “Acepto tu recomendacion B”.

- Trial 16 of the historical `C_1_0` series remains denied.
- The complete Trial 1–15 KO chain remains immutable.
- This is the new `C_1_0_REBASELINE` series, not a continuation or disguise of
  Trial 16.
- The durable decision is message
  `cm-2587a28b-77cd-4c37-92a8-756af10c68b1` in trace
  `tr-v5-b313e58f-fef9-4dd4-8134-26e25ad0f5de`, confirmed by
  `cm-e179fd1e-47db-435a-b9c9-c5a9faaf9eea`.
- No implementation from historical Trial 15 was cherry-picked.
- Process supervision, FIFO guardian/reaper behavior, runtime selection,
  shell/argv construction, PGID or descendant cleanup, process cancellation,
  and process budgets remain exclusively owned by `D/0/01`.

## What was done

- Added one pure reducer for orchestration, task, and session lifecycle
  transitions.
- Added issued, versioned server commands so raw objects and caller-supplied
  effective state have no transition authority.
- Added SQLite and PostgreSQL `002_lifecycle` migrations with canonical state,
  optimistic versions, idempotency keys, and append-only transition evidence.
- Added an optimistic lifecycle repository:
  - SQLite state and evidence writes are one transaction.
  - PostgreSQL state and evidence writes are one CTE statement.
  - Exact retries return the original result.
  - Conflicting retries, stale versions, cross-target commands, invalid order,
    and terminal reopen attempts fail closed.
- Added an action-specific lifecycle service with server-generated defaults.
- Routed the current orchestration, session, and task status writers through
  the reducer/repository boundary.
- Deferred caller-facing orchestration cancellation with
  `LIFECYCLE_OUTCOME_REQUIRED`. The reducer retains
  `ORCHESTRATION_CANCEL` and `TASK_CANCEL` only as pure server-owned state
  transitions for a later confirmed D splice; neither is evidence that a
  process terminated.

## Boundary decisions

- `gateway/src/core/postgres_db.js` is unchanged.
- No adapter, composition root, shared catalog, CI/workflow, runtime, process,
  or migration `003` path changed.
- New lifecycle service, repository, evidence, and SQLite/PostgreSQL session
  reservation paths contain no `tmuxTarget` or `tmux_target` read or write.
- `session_repo.createSession` retains its pre-existing legacy
  `tmux_target` write as accepted passive backward compatibility. Those two
  lines predate this range at `5036a662`; no added line changes their meaning,
  and the lifecycle reservation paths omit the column.
- The dedicated lifecycle service exposes no cancel method. Caller-facing
  cancellation cannot persist a terminal state before the later D-owned
  confirmation splice.

## TDD lineage

| Role | Commit | Parent | Tree | Evidence |
|---|---|---|---|---|
| Initial RED | `c762d717031d7e26f23fdc3e842dfd6f0b23d146` | `98421b66ccc2ce3b68a2cdc13a79128100f16144` | `79948712201bd187348afa1490f90e3ced8d4110` | Three lifecycle files: 0 pass / 3 fail because lifecycle production modules are absent. |
| RED2 | `099eb4178aae60db0e86c080094e8d6ec6f01f42` | `c762d717031d7e26f23fdc3e842dfd6f0b23d146` | `da72c72763987b82dd9ed2ccd00b0f7a3e237c23` | Adds static-error, rollback, fake-PostgreSQL, legacy-writer, cancellation-deferral, and no-runtime-field coverage. |
| RED2 narrowing | `17c601a99a2d950c8e7adcf44b12b7711fc26eec` | `099eb4178aae60db0e86c080094e8d6ec6f01f42` | `d7ef9c6a9680c06a780ca0290ed1dee84496b9ac` | Keeps legacy session coverage on its status writer rather than claiming the old runtime creation path as a new lifecycle API. |
| Test support | `301260f2e14be9db0281ec47435ba997cff9bb61` | `17c601a99a2d950c8e7adcf44b12b7711fc26eec` | `67893a427f4f65d13e9ea02e1269f94e8766ad18` | One path only: fake PostgreSQL supports lifecycle defaults and atomic lifecycle CTEs. Detached pre-GREEN replay reports 9 tests: 5 pass / 4 expected production failures, exit 1. |
| Technical GREEN | `0c73994b73b86b9fed74b2fe38c82fc375bf545e` | `301260f2e14be9db0281ec47435ba997cff9bb61` | `5b480d27a20e556330db8aeea67c45aa3f764923` | Exactly nine production paths; no test, plan, documentation, adapter, shared-composition, or PostgreSQL adapter path. |

The detached `301260f` replay was independently reproduced by the coder and
coordinator. Its four expected failures are three absent lifecycle modules and
the unchanged pre-GREEN caller cancellation behavior.

## Exact path allowlist

Test-only lineage:

- `tests/gateway/fake_postgres_executor.js`
- `tests/gateway/lifecycle_reducer.test.js`
- `tests/gateway/lifecycle_repository.test.js`
- `tests/gateway/lifecycle_service.test.js`
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

## Verification

All commands were run with live PostgreSQL opt-ins unset. No broad test
command, network service, Redis/MCP/KYA operation, or runtime/tmux test was
used.

### Detached pre-GREEN replay

Run from a detached, clean worktree at `301260f`, with lock-matched
`gateway/node_modules` available:

```bash
env -u AGENTS_PG_INTEGRATION -u AGENTS_TEST_DB -u AGENTS_TEST_DB_URL \
  node --test --test-concurrency=1 \
  tests/gateway/lifecycle_reducer.test.js \
  tests/gateway/lifecycle_repository.test.js \
  tests/gateway/lifecycle_service.test.js \
  tests/gateway/orchestration_service.test.js
```

Result: exit 1; 9 reported, 5 pass, 4 expected production failures.

### Focused and legacy GREEN

```bash
env -u AGENTS_PG_INTEGRATION -u AGENTS_TEST_DB -u AGENTS_TEST_DB_URL \
  node --test --test-concurrency=1 \
  tests/gateway/lifecycle_reducer.test.js \
  tests/gateway/lifecycle_repository.test.js \
  tests/gateway/lifecycle_service.test.js \
  tests/gateway/orchestration_service.test.js \
  tests/gateway/task_service.test.js \
  tests/gateway/sqlite_migrations.test.js \
  tests/gateway/state_init.test.js
```

Result: 49 pass / 0 fail / 0 skip.

```bash
env -u AGENTS_PG_INTEGRATION -u AGENTS_TEST_DB -u AGENTS_TEST_DB_URL \
  node --test --test-concurrency=1 \
  --test-name-pattern='sqlite repository contract: status updates report one changed row' \
  tests/gateway/domain_repositories.test.js
```

Result: 1 pass / 0 fail / 0 skip.

```bash
env -u AGENTS_PG_INTEGRATION -u AGENTS_TEST_DB -u AGENTS_TEST_DB_URL \
  node --test --test-concurrency=1 \
  --test-name-pattern='fake postgres repository contract: status updates report one changed row' \
  tests/gateway/postgres_state.test.js
```

Result: 1 pass / 0 fail / 0 skip.

### Static gates

```bash
npm --prefix gateway run lint
```

Result: pass.

```bash
for task_file in \
  gateway/src/core/lifecycle.js \
  gateway/src/core/repositories/lifecycle_repo.js \
  gateway/src/core/repositories/orchestration_repo.js \
  gateway/src/core/repositories/session_repo.js \
  gateway/src/core/repositories/task_repo.js \
  gateway/src/services/lifecycle_service.js \
  gateway/src/services/orchestration_service.js \
  tests/gateway/fake_postgres_executor.js
do
  node --check "$task_file" || exit 1
done
```

Result: pass.

```bash
git diff --check 301260f..0c73994
test "$(git diff --name-only 301260f..0c73994 | wc -l)" -eq 9
! git diff --name-only 301260f..0c73994 |
  rg '^(tests/|plan/|docs/|gateway/src/adapters/|gateway/src/core/postgres_db\.js$|\.github/)'
! git diff --unified=0 301260f..0c73994 |
  rg --pcre2 -i '^\+(?!\+\+\+).*(tmux|sync_process|\bprocess\b|fifo|guardian|reaper|python|\bshell\b|argv|pgid|\bbudget\b|redis|\bmcp\b|agents:events|message\.)'
```

Result: pass; the technical commit has exactly the declared nine paths and no
forbidden added line.

## Commit

- `0c73994b73b86b9fed74b2fe38c82fc375bf545e` —
  `feat(lifecycle): centralize server-owned transitions (C/1/00 rebaseline)`

## Requested review

Please review only `C_1_0_REBASELINE-1` against the Option-B reducer and
server-owned-transition scope. Do not treat this request as a result,
integration, promotion, release, or authorization for the D-owned process
splice.
