# C/1/00 Trial 1 — review request

Trial 1 is **pending independent review**. C/1/00 remains
`in_progress; Trial 1 review pending`; this submission does not claim an
`OK`, integration, promotion, or release.

## Candidate identity

- Sheet: `V5 C/1/00 — Single lifecycle reducer and server-owned transitions`.
- Branch: `feat/V5-C-1-00-lifecycle`.
- Exact base commit:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071`.
- Exact technical commit:
  `8c5d1f51df5aa71d93699e01c2b437605699e95f`.
- Technical tree:
  `9b31c37d23c1d42e7fca54e6e6575f208d256c63`.
- Base tree:
  `2ead6bb8d02bc019c994190b2485fb654851b6af`.
- Technical range: `11d5245ef312dd02ad7cd59d66ab0b9cce181071..8c5d1f51df5aa71d93699e01c2b437605699e95f`.

Review the exact technical commit above. This append-only request is a
separate evidence commit and is not part of the technical tree under review.

## Implemented contract

- One pure, frozen lifecycle table owns orchestration, task, and agent-session
  states, initial states, terminal states, commands, and version increments.
- Creation repositories accept only server-owned initial states. Mutable
  status setters and standalone agent-session creation are removed.
- SQLite and PostgreSQL add lifecycle versions, the task `starting` state,
  task/session trace integrity, globally unique idempotency commands, and
  bounded append-only transition evidence.
- Generic transitions use optimistic compare-and-swap. Exact retries return
  the persisted outcome without duplicate evidence; a reused key with changed
  semantics fails closed.
- Agent launch reservation atomically changes the task to `starting` and
  creates the session in `starting` before the adapter is invoked. Settlement
  atomically changes both records, so task/session state cannot partially
  diverge.
- Persistent spawn settles task/session to `running/running`. Successful
  one-shot delegation settles to `running/closed`; session closure does not
  claim task completion. Launch failure settles to `pending/error`.
- The service, rather than the adapter, owns the durable session identifier.
  Launch fingerprints persist only a SHA-256 prompt digest, never prompt
  content.
- Orchestration actions and session kill use the same reducer/repository
  boundary. Task assignment and launch require an active parent
  orchestration; session controls are trace-scoped.
- The task, orchestration-session, and new agent-session schemas publish the
  reducer state sets and non-negative safe lifecycle version.
- Public lifecycle request fields and safe MCP error allowlists are projected
  through the reviewed canonical catalog. The catalog digest is pinned at
  `sha256:2fb2e484e4e473cb3e2d09fed8f18c06d3802f13e378d615bc7b8d7c9a8753ca`.

## TDD evidence

The initial focused RED command was:

```bash
node --test --test-concurrency=1 \
  tests/gateway/lifecycle_reducer.test.js \
  tests/gateway/lifecycle_repository.test.js \
  tests/gateway/lifecycle_service_ordering.test.js \
  tests/gateway/sqlite_migrations.test.js \
  tests/gateway/postgres_state.test.js
```

It exited 1: the reducer and lifecycle repository modules did not exist, the
lifecycle migration contract was absent, and the existing service launched
before a durable reservation. After the native SQLite test dependency was
available, the expanded RED run accounted for 32 tests: 7 passed, 16 failed,
and 9 opt-in PostgreSQL cases skipped.

Additional narrow RED/GREEN iterations proved:

- standalone `sessionRepo.createSession` initially remained reachable, then
  became absent after fixtures moved through atomic reservation/settlement;
- reducer/schema parity and initial version results initially produced four
  failures in a 35-test run, then passed after schema and service corrections;
- a nonzero one-shot delegate result initially returned success, then became
  the same durable `LIFECYCLE_LAUNCH_FAILED` result on first call and retry.

## Verification evidence

Focused lifecycle, schema, migration, repository, service, and tool command:

```bash
node --test --test-concurrency=1 \
  tests/gateway/lifecycle_reducer.test.js \
  tests/gateway/lifecycle_repository.test.js \
  tests/gateway/lifecycle_service_ordering.test.js \
  tests/gateway/lifecycle_postgres_contract.test.js \
  tests/gateway/sqlite_migrations.test.js \
  tests/gateway/postgres_state.test.js \
  tests/gateway/orchestration_service.test.js \
  tests/gateway/task_service.test.js \
  tests/gateway/tool_agent.test.js \
  tests/gateway/tool_session_attach_info.test.js \
  tests/gateway/schemas.test.js
```

Result: **115 total, 106 passed, 9 exact live-PostgreSQL infrastructure
skips, 0 failed**.

The first bare `bash scripts/ci.sh` run correctly failed because the host PATH
did not contain `ruff`, `pytest`, or `agent-run`; its Node lanes still passed
758 Gateway tests and 24 E2E tests. The repository lock was then installed in
a disposable virtual environment using the documented hash-checked commands,
and the authoritative gate was rerun as:

```bash
env PATH="/tmp/agents-orchestrator-v5-c100.bz4ftg/venv/bin:$PATH" \
  bash scripts/ci.sh
```

Final result: exit 0, **1,122 tests accounted for, 1,110 passed, 12 exact
allowlisted infrastructure skips, 0 failed**. Required structure (222),
Gateway (758), E2E (24), CLI (29), LangGraph (84), lint, lock, MCP smoke, and
policy lanes all passed. The aggregate status is
`infrastructure_unavailable` only for the nine opt-in live PostgreSQL cases
and three existing opt-in Gateway/Temporal cases.

Additional checks:

```bash
git diff --check \
  11d5245ef312dd02ad7cd59d66ab0b9cce181071..8c5d1f51df5aa71d93699e01c2b437605699e95f
git diff --binary --no-ext-diff \
  11d5245ef312dd02ad7cd59d66ab0b9cce181071..8c5d1f51df5aa71d93699e01c2b437605699e95f |
  gitleaks detect --pipe --redact --no-banner
```

Both passed; Gitleaks reported no leaks.

## Compatibility and isolation

- `gateway/src/tools/message.js`, every `message.*` schema/handler, and the
  `agents:events` contract are untouched. The byte-baseline message test and
  coordination audit-isolation E2E passed in the authoritative gate.
- No policy file, dependency manifest, credential, secret, shared Redis,
  shared PostgreSQL, shared MCP process, or real agent provider was touched.
- PostgreSQL behavior is covered by the fake backend contract and migration
  inspection. Live PostgreSQL remains an explicit opt-in skip; no shared
  service was contacted.
- The forward migration normalizes legacy session traces to their parent task
  trace and preserves existing rows at version zero. Rollback requires
  restoring the operator's pre-migration database backup; this change does
  not pretend to provide an in-place downgrade migration.

## Requested independent review

Please return `OK` or `KO` against the exact technical commit and verify, in
particular:

1. every persisted lifecycle mutation is reducer-owned and terminal states
   cannot reopen;
2. SQLite and PostgreSQL implement equivalent idempotency, CAS, and atomic
   task/session bundle semantics;
3. `starting` is durable before adapter invocation and exact retries never
   relaunch;
4. one-shot session closure does not silently complete its task;
5. cross-trace/task/session operations fail closed without storing prompt
   content or exposing unsafe errors; and
6. compatibility exclusions for `message.*`, `agents:events`, policy, and
   shared services remain intact.
