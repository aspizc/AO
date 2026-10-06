# Project V5 C/1/00 Rebaseline Trial 1 — independent review result

Review id: `C_1_0_REBASELINE-1`

Verdict: `reviewed_KO`

Finding counts: **P0 0 / P1 3 / P2 2**.

This review was performed independently with the requested GPT-5.6 Sol,
reasoning ultra, Priority/Fast configuration. It is limited to the Option-B
reducer and server-owned-transition scope. It does not authorize a historical
Trial 16, does not evaluate or modify D-owned runtime mechanics, and does not
integrate or promote this candidate. The static call order at the existing
service/lifecycle seam was inspected only to assess C-owned writer routing and
integration regression.

## Candidate reviewed

- Branch: `feat/V5-C-1-00-rebaseline-1-clean`.
- Clean review-request HEAD:
  `5ac6815e3188cd0a7dda770baa158f16038f6e91`.
- Request tree: `bc6363c8597b4fca71f10717817f6a71d73eaea1`.
- Technical commit:
  `0c73994b73b86b9fed74b2fe38c82fc375bf545e`.
- Technical tree: `5b480d27a20e556330db8aeea67c45aa3f764923`.
- Test-support commit:
  `301260f2e14be9db0281ec47435ba997cff9bb61`.
- RED lineage:
  `c762d717031d7e26f23fdc3e842dfd6f0b23d146` ->
  `099eb4178aae60db0e86c080094e8d6ec6f01f42` ->
  `17c601a99a2d950c8e7adcf44b12b7711fc26eec`.
- Rebaseline base:
  `98421b66ccc2ce3b68a2cdc13a79128100f16144`.
- Integration ref inspected for binding decisions and migration coexistence:
  `integration/V5-functional-wave-2@7f328b4985b48f495cdf3415bb8742568fb42ecc`.

The declared parentage and trees are exact. The test-only lineage changes the
five declared test paths. The technical commit changes exactly the nine
declared production paths. The request commit adds only
`C_1_0_REBASELINE-1_to_review.md`. The blob for
`gateway/src/core/postgres_db.js` is unchanged across test support, technical,
and request commits:
`fb4562fea5d44a09286d14d4d723f575b8542bc0`.

Historical Trial 15 implementation
`599262455ab689a7242e60627f837eb6589c405d` is not an ancestor. Historical
Trial 15 result commit `dafce555b2e8aead1ef6ebdb579623aa16a92368`
is not rewritten into the new lineage, and its result-file blob is preserved
exactly as `3e0b354a23d5e31c9281abf7cd1f4de62a490301`.
The Trial 1–15 artifacts and the explicit Trial 16 denial remain present and
unchanged.

## P1 findings

### P1-1 — Real PostgreSQL cannot execute either lifecycle persistence CTE, while the fake accepts a different shape

`gateway/src/core/repositories/lifecycle_repo.js:275-315` builds
data-modifying CTEs whose first CTE is an `UPDATE` or `INSERT`, and
`persistPostgres` sends both through `prepare(...).get()` at lines 317-360.
The unchanged production adapter routes `get()` through `all()` and
`#queryRows()` (`gateway/src/core/postgres_db.js:32-37,54-58`), and
`jsonRowsQuery()` wraps the supplied SQL as a derived table at lines 82-85.
The effective shape is:

```sql
SELECT COALESCE(json_agg(row_to_json(_q)), '[]'::json)
FROM (
  WITH lifecycle_changed AS (
    UPDATE ... RETURNING 1
  )
  SELECT ...
) AS _q
```

PostgreSQL requires a `WITH` containing a data-modifying statement to be
attached to the top-level statement. This nested form is rejected before the
promised atomic state/evidence operation can run. It affects ordinary entity
updates and session reservation alike.

The fake does not validate this production shape. It first strips the JSON
derived-table wrapper in
`tests/gateway/fake_postgres_executor.js:173-175`, then recognizes the now
top-level lifecycle CTE at lines 25-26 and emulates it at lines 76-114.
Consequently both fake-PostgreSQL green tests are false confidence for the
actual adapter boundary.

An offline materialization probe captured the exact nested SQL above. No live
PostgreSQL was contacted. This blocks the submitted PostgreSQL parity and
single-statement-atomicity claim.

Required correction: execute the data-modifying CTE through a production
adapter path that leaves it top-level, and make the fake exercise the same
materialized SQL boundary instead of unwrapping away the invalid nesting.

### P1-2 — The active session creation path bypasses the reducer and now acquires contradictory C lifecycle semantics

The existing service calls the adapter before it persists a session:
`gateway/src/services/agent_service.js:523-553` for delegate and
`gateway/src/services/agent_service.js:609-635` for spawn. The subsequent
helper writes `status: "running"` plus the legacy `tmuxTarget` field at lines
210-222. `sessionRepo.createSession` remains a direct insert outside the
lifecycle repository and transition evidence
(`gateway/src/core/repositories/session_repo.js:16-25`).

That legacy write pre-existed this range and may remain passive compatibility,
but this candidate gives it new C semantics. The migration supplies
`lifecycle_state = 'starting'` and version zero
(`gateway/migrations/002_lifecycle.sql:25-30`), while `canonicalRow` now makes
that column authoritative over the inserted legacy status
(`gateway/src/core/repositories/session_repo.js:71-77`). An offline database
probe of the same insert shape produced:

```text
raw status=running
lifecycle_state=starting
lifecycle_version=0
canonical status=starting
transition evidence rows=0
```

Thus the current application can report a canonical `starting` reservation
that was neither reduced nor evidenced and was created only after the
execution call. This contradicts the one-reducer/current-writer routing
boundary and makes the old runtime column path more than passive
compatibility. The new dedicated reservation path itself correctly omits
`tmuxTarget`/`tmux_target`; the defect is the active legacy path acquiring its
new canonical meaning.

The fake masks this divergence too:
`tests/gateway/fake_postgres_executor.js:67-74` derives the omitted lifecycle
state from the inserted legacy status, so it reports `running`, whereas both
real migrations define a fixed `starting` default.

The same bypass also leaves cross-trace session rows admissible. The migration
adds no `(task_id, trace_id)` integrity constraint, and
`assertSessionParent()` is called only for `SESSION_RESERVE`
(`gateway/src/core/repositories/lifecycle_repo.js:149-162,425-428`), not for
later transitions of an existing row. A no-runtime offline probe inserted a
session for `task-1` with `trace-other` while the task belonged to
`trace-parent`; `markSessionRunning` accepted it and persisted
`trace-other`, version one. That violates the requested task/session/trace
binding.

Required correction must respect ownership: do not move D-owned execution into
C, but ensure the legacy creation path stays semantically passive until the
reviewed D splice, and ensure no canonical lifecycle row/transition can bypass
the reducer or disagree with its parent task trace.

### P1-3 — End-to-end callers cannot make an exact retry

The repository implements idempotency only when the same key reaches it, but
the active orchestration/task/session compatibility writers generate a fresh
UUID on every invocation:

- `gateway/src/core/repositories/orchestration_repo.js:48-76`;
- `gateway/src/core/repositories/task_repo.js:44-68`;
- `gateway/src/core/repositories/session_repo.js:44-68`.

The public orchestration tools bind those existing service methods directly
(`gateway/src/tools/orchestration.js:15-19`). Their strict `TraceSchema`
accepts only `traceId`
(`gateway/src/tools/catalog.js:119,240-252`), so a caller cannot supply a
stable idempotency key. The action-specific `createLifecycleService` does
accept one, but no production module imports or wires that service; it is used
only by focused tests.

A no-runtime lost-response probe committed `orchestration.pause` and then
repeated the identical public request. The persisted state remained `paused`
with one evidence row, but the retry returned:

```text
LIFECYCLE_INVALID_TRANSITION: invalid lifecycle transition
```

The stored key had the generated
`legacy-orchestration-<fresh UUID>` form. Complete and terminal paths similarly
cannot return the original result after a lost response. Therefore the
submission's exact-retry guarantee is not available at the actual caller
boundary.

Required correction: wire the reviewed action-specific service into the real
callers and expose or derive a stable request identity through the strict
public contract, with a lost-response RED proving that the second call returns
the original result.

## P2 findings

### P2-1 — Version domains are unsafe and differ between SQLite, JavaScript, and PostgreSQL

Command and stored-state validation accepts any non-negative
`Number.isInteger` value
(`gateway/src/core/lifecycle.js:197-199,282-290`), then increments with plain
JavaScript addition at line 373. At `9,007,199,254,740,992`, the reducer
accepts the value but returns the same version, so the optimistic token is no
longer monotonic.

Before that JavaScript boundary, PostgreSQL already diverges: all three entity
versions and transition versions are 32-bit `INTEGER`
(`gateway/migrations/postgres/002_lifecycle.sql:1-4,17-20,31-34,45-62`).
The reducer accepts `2,147,483,647` and produces `2,147,483,648`; SQLite can
persist that next value, while PostgreSQL cannot. PostgreSQL also lacks the
non-negative entity-version and allowed-lifecycle-state checks present in the
SQLite migration. The fake models neither PostgreSQL integer width nor those
constraints.

Required correction: define one safe version domain, enforce it in command and
stored-state admission and both migrations, and make the fake reject values
that the real PostgreSQL schema rejects.

### P2-2 — Concurrent exact session reservation returns a generic conflict instead of the winner

`applyLifecycleCommand` checks existing idempotency evidence before loading
state (`gateway/src/core/repositories/lifecycle_repo.js:418-429`). Two exact
`SESSION_RESERVE` calls can both pass that check before either insert commits.
The loser then receives a session primary-key/unique violation from
`createSessionSqlite` or the PostgreSQL create CTE
(lines 232-249 and 296-315).

The catch path rechecks the idempotency winner only for an already-coded
`LIFECYCLE_VERSION_CONFLICT` at lines 452-457. A database uniqueness error
instead becomes the generic `LIFECYCLE_REPOSITORY_CONFLICT` at lines 460-463,
even when the exact winning transition is now durable.

A deterministic offline race-window probe injected the exact winning session
and matching transition after the initial lookup but before persistence. The
reviewed call returned:

```text
code=LIFECYCLE_REPOSITORY_CONFLICT
winnerEvidenceExists=true
```

Required correction: reconcile the durable idempotency winner after creation
conflicts as well as CAS conflicts, while retaining a static fail-closed error
for genuinely different key reuse.

## Verified behavior

- Raw objects cannot invoke the reducer: issued commands are branded in a
  module-private `WeakSet`, frozen, and caller-supplied state fields are
  rejected.
- The reducer's ordinary transition table, target equality checks, optimistic
  comparison, and terminal-state denial work for covered values.
- SQLite updates and transition evidence are bundled in one transaction and
  rollback together on evidence conflict.
- Exact sequential repository retries return the original transition;
  changed fingerprints fail with a static idempotency error.
- The new lifecycle session reservation SQL and service do not read or write
  `tmuxTarget` or `tmux_target`.
- The dedicated lifecycle service exposes no cancellation method, and
  caller-facing orchestration cancellation defers with
  `LIFECYCLE_OUTCOME_REQUIRED` without persisting a terminal state.
- The existing orchestration, task, and session status writers call the
  reducer boundary, subject to P1-2 and P1-3.
- No added technical line or path enters D-owned process, runtime, FIFO,
  guardian/reaper, Python, shell/argv, PGID, budget, adapter, Redis, MCP, CI,
  catalog, or shared-index scope.
- In-memory integration-order replay applied
  `001_initial`, `002_coordination_consumer`, then `002_lifecycle`; both the
  coordination tables and lifecycle columns were present. The duplicate
  numeric prefix is lexically deterministic and the migration IDs coexist.

## Verification evidence

All executable checks were local and offline with PostgreSQL opt-ins and
`AGENTS_DB_URL` unset. No runtime/tmux test, live PostgreSQL, network, Redis,
MCP, KYA, provider, or external service was used.

- Detached replay at
  `301260f2e14be9db0281ec47435ba997cff9bb61`: exit 1, **9 reported / 5 pass /
  4 expected production failures**. The worktree was restored to the review
  branch immediately afterward.
- Focused reducer/repository/service/orchestration/task/migration/state suite:
  **49 pass / 0 fail / 0 skip**.
- SQLite legacy status-writer contract pattern: **1 pass / 0 fail**.
- Fake-PostgreSQL legacy status-writer contract pattern:
  **1 pass / 0 fail**.
- `npm --prefix gateway run lint`: pass.
- `node --check` for the seven changed production JavaScript files and fake
  PostgreSQL executor: pass.
- `git diff --check` for technical and request ranges: pass.
- Static path, forbidden-token, request-only, technical-only, unchanged
  `postgres_db.js`, historical-result preservation, and integration migration
  order checks: pass.
- Independent probes reproduced all five findings without modifying candidate
  source, tests, plans, or the review request.

A temporary lock-matched `gateway/node_modules` symlink was used for the
offline tests and removed. The review result is the only intended worktree
change.

## Final verdict

`reviewed_KO`

The ordinary SQLite reducer path is substantially centralized, but real
PostgreSQL persistence is not executable through the unchanged adapter, the
active legacy session path bypasses and contradicts canonical lifecycle
semantics, and exact retry is unavailable to real callers. The two additional
version/race defects leave backend parity and concurrent idempotency
incomplete. This result preserves the Option-B boundary and does not authorize
Trial 16, integration, promotion, release, or any D-owned process splice.
