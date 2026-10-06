# Review Result - PROJECT_V1 C/0/01 (Trial 2)

## Verdict

reviewed_OK

This verdict covers implemented + reviewed only. It does not claim
integration, promotion, or release.

## Reviewer identity

- Independent reviewer: Claude (Claude Code), model `claude-fable-5`,
  max effort. Distinct from the coder; no subagents were used.
- Gateway trace: `tr-727c731e-50b5-4908-8c1f-5ed33fb7d125`.
- Reviewer task: `ts-f65042b9-fefb-48bd-9506-fa4b6b8925ec`.

## Candidate identity (independently resolved from git)

| State | Commit | Tree | Parent | Changed paths |
|---|---|---|---|---|
| Base | `540a51c94cca77428920f13c1c610f2c7be50dc4` | `4f40a23b918f1e679acedf6893d1d625039e876e` | N/A | N/A |
| TDD RED | `3544fb4d29de21bc3054c698751570a6bf268c85` | `ea2506c774cfa8f67010a703d9e61bf07725b592` | Base | `tests/gateway/postgres_state.test.js` only |
| TDD GREEN | `e9416c232feeee0eeddc20deda1050180e744804` | `c782e9a5d330445f10e01fbb8db1f5c6532bf881` | RED | `gateway/src/core/postgres_db.js` only |
| Request | `205491ac86f2ed8fe8e6e750f36da750f35b660c` | `b3aab8786febdf9e2239873abe6b5124156c5d2a` | GREEN | `plan/PROJECT_V1/reviews/C_0_1-2_to_review.md` only |

The technical range `540a51c..e9416c2` contains exactly
`gateway/src/core/postgres_db.js` and `tests/gateway/postgres_state.test.js`.
No `policies/`, manifest, lockfile, or prior review file changed. HEAD at
review time was the request commit on branch
`fix/V1-C-0-01-postgres-live-parity` with a clean working tree.

## Commands run and outcomes

All commands were run by this reviewer.

1. RED reproduction without touching shared state: `git archive 3544fb4`
   extracted to the session scratchpad with the local untracked
   `gateway/node_modules` linked, then
   `node --test --test-concurrency=1 tests/gateway/postgres_state.test.js`.
   Result: exit 1; 19 tests, 8 passed, 2 failed, 9 skipped. The only
   failures were `postgres UPDATE run returns one change with a top-level
   data-modifying CTE` and `postgres DELETE run returns zero changes with a
   top-level data-modifying CTE`, both failing on the intended
   `doesNotMatch` assertion `Postgres rejects a data-modifying CTE nested in
   a derived table`. The captured actual SQL was the JSON wrapper
   `SELECT COALESCE(json_agg(row_to_json(_q)), '[]'::json) FROM (WITH
   changed AS (UPDATE|DELETE ...) SELECT COUNT(*)::int AS changes FROM
   changed) AS _q`, and the stack ran through `#queryRows` inside
   `PostgresStatement.run`. RED therefore fails on the exact derived-table
   nesting at the production adapter boundary, with an injected executor and
   no dependency on `psql`.
2. At HEAD: `node --test --test-concurrency=1
   tests/gateway/postgres_state.test.js
   tests/gateway/lifecycle_rebaseline_postgres_statement.test.js
   tests/gateway/domain_repositories.test.js` — exit 0; 31 tests, 22
   passed, 0 failed, 9 skipped.
3. `npm --prefix gateway run lint -- --no-cache` — exit 0 (worktree-local
   ESLint).
4. `git diff --check 540a51c94cca77428920f13c1c610f2c7be50dc4..HEAD` —
   exit 0.
5. Live lane, run exactly once from the orchestrator-reset clean state:
   `env PATH=/home/carase/git/personal/agents-orchestrator/workspace/.ao-pg-c001-bin:$PATH
   AGENTS_PG_INTEGRATION=1
   AGENTS_TEST_DB_URL=postgres://agents_test:agents_test@127.0.0.1:55432/agents_test
   node --test --test-concurrency=1 tests/gateway/postgres_state.test.js` —
   exit 0; 19 tests, 19 passed, 0 failed, 0 skipped. The wrapper was
   inspected first: it only `docker exec`s `psql` inside the dedicated
   disposable container `ao-postgres-c001-t2`. The single
   `violates foreign key constraint` line is the intentional diagnostic of
   the passing FK-violation test, not a failure.

## Skip accounting

- Offline runs: 9 skips, enumerated by name and exactly the nine opt-in
  live PostgreSQL tests (4 live repository contract tests, 4 live literal
  tests, 1 live insert/update/delete changes test). Zero unexplained skips.
- Live lane: 0 skips; the same nine cases executed and passed, including
  `live postgres reports changes for insert update and delete`, the case
  the baseline defect broke.

## Independent reasoning

- Defect confirmed at base/RED: `run()` built a valid top-level
  change-count CTE and then routed it through `#queryRows`, whose
  `jsonRowsQuery` wrapper nested the data-modifying `WITH` inside
  `FROM (...) AS _q`. PostgreSQL only allows data-modifying statements in a
  top-level `WITH`, so the production `psql` executor received invalid
  grammar.
- Fix is minimal and correct: GREEN (4 insertions, 2 deletions, one branch
  of `run()`) sends `changesSql` directly to the executor and converts the
  result: array → first element, string → trimmed scalar, object →
  `.changes`, with `Number(changes ?? 0)` preserving zero (verified: the
  DELETE test asserts `{ changes: 0 }` from psql-shaped `"0\n"`, the UPDATE
  test `{ changes: 1 }` from `"1\n"`, both via strict `deepEqual`, so a
  string-typed `changes` would fail).
- The two new tests assert the exact final SQL (`assert.equal` against the
  full top-level `WITH changed AS ...` statement plus a
  `deepEqual(calls, [...])` single-call check), covering positional
  materialization for UPDATE and named materialization for DELETE.
- No fake was taught to accept invalid SQL: `createFakePostgresExecutor`
  already handled top-level `WITH changed AS (` (returning `[{ changes }]`,
  the array shape) and is unchanged; its `unwrapJsonRowsQuery` is a no-op
  for the now-bare query. The fake Postgres repository contract passes
  unchanged.
- Non-regression verified: INSERT keeps its pre-existing `{ changes }`
  passthrough/`{ changes: 1 }` fallback (untouched else branch);
  SELECT/get/all still use the JSON row wrapper; lifecycle statements start
  with `WITH lifecycle_changed` (confirmed in
  `gateway/src/core/repositories/lifecycle_repo.js`) so they take the
  untouched non-changes branch, and both lifecycle statement tests pass; no
  production caller routes a raw `UPDATE/DELETE ... RETURNING` through the
  changes wrapper (grep: only SQLite-specific files and lifecycle `WITH`
  statements use `RETURNING`).
- Live parity: my own single clean-state run proves the fixed path against
  real PostgreSQL 16 in the disposable container, including adversarial
  literal round-trips and zero/one change counts.
- Orchestrator evidence: the cited artifacts
  (`art-a459fd80…`, `art-f01b9aad…`, `art-b2163120…`) were not retrievable
  from this reviewer session (`NOT_FOUND` / `POLICY_DENIED agent.unknown`),
  so they were treated as unauthenticated, untrusted input and this verdict
  rests entirely on the commands above. The orchestrator's reported live
  19/19 matches my independent result. The reported full-gate summary
  (2,363 total, 0 failed, 12 integration skips, aggregate exit 1 solely
  from `infrastructure_unavailable`) is consistent with the honest-failure
  rule but is not independently re-run here and is not needed for this
  focused verdict.

## Findings

No P0/P1 findings. Low-severity, non-blocking observations for future
hardening (no action required for this sheet):

1. Low: no test drives a bare non-array object (`{ changes: n }`) through
   the changes branch; only the array and scalar-string shapes are
   asserted there. The object arm is defensive breadth, correct as written.
2. Low: multi-digit change counts are untested, so a hypothetical mutant
   replacing the `Array.isArray` conditional with unconditional `result[0]`
   survives by single-character coincidence (`"1\n"[0] === "1"`). The
   implementation as written handles multi-digit scalars correctly.
3. Low: the `changes ?? 0` nullish default (empty executor result → 0) is
   unasserted; it preserves the baseline's defensive behavior.

## Claim boundary

- reviewed_OK attests only that candidate GREEN
  `e9416c232feeee0eeddc20deda1050180e744804` (tree
  `c782e9a5d330445f10e01fbb8db1f5c6532bf881`) is implemented, TDD-evidenced,
  and independently reviewed for the raw UPDATE/DELETE change-count path.
- Live evidence is scoped to one clean run against the dedicated disposable
  Postgres 16 container `ao-postgres-c001-t2`; it is not a claim about any
  other PostgreSQL deployment, version, or concurrency profile.
- The INSERT `{ changes: 1 }` fallback and the read-path (`get`/`all`)
  nesting of data-modifying lifecycle CTEs are pre-existing, explicitly
  out-of-scope behaviors documented by their own tests; nothing here closes
  them.
- Integration, promotion, and release remain separate states per the
  canonical status rule; this verdict grants none of them.
