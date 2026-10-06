# Review Submission - PROJECT_V1 C/0/01 (Trial 2)

Trial 2 is pending independent review. This submission proves an implemented
candidate only; it does not claim independent approval, integration,
promotion, or release.

## Candidate identity

| State | Commit | Tree | Parent | Exact path set |
|---|---|---|---|---|
| Base | `540a51c94cca77428920f13c1c610f2c7be50dc4` | `4f40a23b918f1e679acedf6893d1d625039e876e` | N/A | N/A |
| TDD RED | `3544fb4d29de21bc3054c698751570a6bf268c85` | `ea2506c774cfa8f67010a703d9e61bf07725b592` | Base | `tests/gateway/postgres_state.test.js` |
| TDD GREEN | `e9416c232feeee0eeddc20deda1050180e744804` | `c782e9a5d330445f10e01fbb8db1f5c6532bf881` | TDD RED | `gateway/src/core/postgres_db.js` |
| Review request | This file's immutable commit | This file's immutable commit tree | TDD GREEN | `plan/PROJECT_V1/reviews/C_0_1-2_to_review.md` |

The request commit and tree are self-referential identities: embedding their
literal hashes in this file would change the file, tree, and commit. Resolve
the exact immutable values at any later branch position with:

```bash
git log -1 --format='%H %T' -- \
  plan/PROJECT_V1/reviews/C_0_1-2_to_review.md
```

The resolved request commit must have GREEN as its parent and this review file
as its sole changed path. The exact technical range under review is
`540a51c94cca77428920f13c1c610f2c7be50dc4..e9416c232feeee0eeddc20deda1050180e744804`;
the request evidence commit is intentionally outside the technical tree.

Commit subjects:

- RED: `test(postgres): expose nested DML CTE regression (PROJECT_V1 C/0/01)`.
- GREEN: `fix(postgres): keep DML change CTEs top-level (PROJECT_V1 C/0/01)`.

## Defect and minimal correction

`PostgresStatement.run()` already materialized raw `UPDATE` and `DELETE`
statements into a valid top-level change-count query:

```sql
WITH changed AS (<DML> RETURNING 1)
SELECT COUNT(*)::int AS changes FROM changed
```

It then passed that query through the read-row JSON wrapper, causing the
production executor to receive a data-modifying CTE inside `FROM (...)`.
PostgreSQL rejects that grammar because a data-modifying `WITH` must be at the
top level.

GREEN sends the existing change-count query directly to the executor. It
converts either the injected fake's row-array result or the default psql
executor's scalar text result into the existing better-sqlite3-shaped
`{ changes: number }` return. No fake was changed or taught to normalize the
invalid nested SQL.

## TDD RED evidence

The two new adapter-boundary tests are:

- `postgres UPDATE run returns one change with a top-level data-modifying CTE`
- `postgres DELETE run returns zero changes with a top-level data-modifying CTE`

They use an injected executor, so RED is independent of `psql`. Each executor
captures the exact materialized production SQL, rejects
`FROM (WITH changed AS (UPDATE|DELETE ...))`, requires the complete expected
top-level statement, and returns psql-shaped scalar text only after those SQL
assertions pass. UPDATE covers positional materialization and one change;
DELETE covers named materialization and zero changes.

Command at RED `3544fb4d29de21bc3054c698751570a6bf268c85`:

```bash
node --test --test-concurrency=1 tests/gateway/postgres_state.test.js
```

Result: exit 1; 19 tests accounted for, 8 passed, 2 failed, 9 opt-in live
PostgreSQL tests skipped. Both named tests failed for the intended assertion:
`Postgres rejects a data-modifying CTE nested in a derived table`. Their
captured executor inputs began with the JSON aggregate wrapper and contained,
respectively:

```text
FROM (WITH changed AS (UPDATE tasks ... RETURNING 1) SELECT COUNT(*)::int AS changes FROM changed) AS _q
FROM (WITH changed AS (DELETE FROM tasks ... RETURNING 1) SELECT COUNT(*)::int AS changes FROM changed) AS _q
```

This proves the regression at the real adapter boundary rather than testing a
fixture or relying on the permissive fake executor.

## GREEN verification

New-test file first:

```bash
node --test --test-concurrency=1 tests/gateway/postgres_state.test.js
```

Result: exit 0; 19 tests accounted for, 10 passed, 0 failed, and 9 opt-in live
PostgreSQL tests skipped.

Required focused command:

```bash
node --test --test-concurrency=1 \
  tests/gateway/postgres_state.test.js \
  tests/gateway/lifecycle_rebaseline_postgres_statement.test.js \
  tests/gateway/domain_repositories.test.js
```

Result: exit 0; 31 tests accounted for, 22 passed, 0 failed, and 9 opt-in live
PostgreSQL tests skipped. This includes both lifecycle statement tests, the
fake Postgres repository contract, and the SQLite domain repository contract.

Lint:

```bash
npm --prefix gateway run lint -- --no-cache
```

The first post-GREEN attempt exited 2 because the then-broken orchestrator
dependency symlink lacked local ESLint and resolved `/usr/bin/eslint` 6.4.0,
which could not load the ESM config. The orchestrator then replaced only that
untracked dependency setup with an exact worktree-local install and rebuilt
`better-sqlite3`; no tracked file or lock changed. The exact command was rerun
after that checkpoint and exited 0 with local ESLint 10.8.0.

Whitespace and path checks:

```bash
git diff --check
git diff --check \
  540a51c94cca77428920f13c1c610f2c7be50dc4..e9416c232feeee0eeddc20deda1050180e744804
git diff --name-only \
  540a51c94cca77428920f13c1c610f2c7be50dc4..e9416c232feeee0eeddc20deda1050180e744804
git ls-files --stage -- gateway/node_modules
```

Both diff checks exited 0. The technical range contains only
`tests/gateway/postgres_state.test.js` and
`gateway/src/core/postgres_db.js`. The dependency query returned no tracked or
staged `gateway/node_modules` path.

## Live-lane status

Live PostgreSQL was **not run** and no live-green claim is made. A host check
reported `psql: unavailable`. The nine live cases remained explicit opt-in
skips in both focused runs. The orchestrator will run the live PostgreSQL lane
separately; its result is required before making a live-parity claim.

## Scope and non-scope

In scope:

- exact executor-boundary SQL assertions for raw UPDATE and DELETE;
- zero/one change-count conversion from psql-shaped scalar output; and
- the raw UPDATE/DELETE branch of `PostgresStatement.run()`.

Explicitly unchanged:

- INSERT execution and its existing `{ changes }` compatibility behavior;
- ordinary SELECT/get/all JSON row aggregation;
- named and positional literal materialization logic;
- lifecycle data-modifying `WITH` execution and its fake contract;
- fake executors, repositories, migrations, schemas, MCP contracts, policies,
  manifests, lockfiles, CHANGELOG, and prior review files.

## Requested independent review

Please review the GREEN technical tree independently and return a separate OK
or KO verdict. In particular:

1. verify RED fails on the exact derived-table nesting and not missing `psql`;
2. verify the production executor now receives UPDATE and DELETE change-count
   CTEs beginning with top-level `WITH changed AS`;
3. verify both array-shaped injected results and scalar psql results preserve
   `{ changes: number }`, including zero and one;
4. verify INSERT, SELECT/get/all, named/positional literals, fake repository
   contracts, and lifecycle `WITH` behavior remain unchanged;
5. rerun the required focused test, lint, and diff checks; and
6. treat offline green as insufficient evidence for live PostgreSQL parity and
   consume the orchestrator's separate live-lane result before any such claim.

The coder has not created a verdict and does not self-review this candidate.
