# C/1/00 Trial 3 — review request

Trial 3 is **pending independent review**. C/1/00 remains
`in_progress; Trials 1-2 KO; Trial 3 review pending`; this submission does
not claim an `OK`, integration, promotion, or release.

## Candidate identity

- Sheet: `V5 C/1/00 — Single lifecycle reducer and server-owned transitions`.
- Branch: `feat/V5-C-1-00-lifecycle`.
- Original implementation base:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071`.
- Trial 1 technical commit:
  `8c5d1f51df5aa71d93699e01c2b437605699e95f`.
- Trial 1 request commit:
  `adb460cc878c5767588b5f9b77102fffe10d4c87`.
- Trial 1 independent `KO`:
  `e7ae6438942cb642714f1faa5a742383d7acf636`.
- Trial 2 technical commit:
  `6bea492069d5cb4a49e6b3880eb53ceefad4c6e9`.
- Trial 2 request commit:
  `93c264c932db7395af198989c5c95042ca471a7b`.
- Trial 2 independent `KO` / Trial 3 correction base:
  `5d95324b3639da759417bfee6289b754fa42a566`.
- Trial 3 technical commit:
  `855af0a8c331e1109662ffd631bba2196a39d397`.
- Trial 3 technical tree:
  `72d5292d716578ef64e93961a116e81f714fe9ca`.
- Trial 3 base tree:
  `8bad75c60343f2d42a6c8cfde9c0ca4a8d0d2d01`.
- Original base tree:
  `2ead6bb8d02bc019c994190b2485fb654851b6af`.
- Trial 3 correction range:
  `5d95324b3639da759417bfee6289b754fa42a566..855af0a8c331e1109662ffd631bba2196a39d397`.
- Cumulative technical range:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071..855af0a8c331e1109662ffd631bba2196a39d397`.

Review the exact Trial 3 technical commit above together with the cumulative
candidate. This append-only request is a separate evidence commit and is not
part of the technical tree under review.

## Trial 2 KO correction

Trial 2's independent review closed both Trial 1 blockers and identified one
remaining defect: `launchAgent` bounded delegate startup with
`agentTimeoutMs`, but directly awaited persistent spawn startup. A pending
spawn promise could therefore leave its already durable session and task
reservations indefinitely in `starting`.

The minimal Trial 3 correction applies the existing `withTimeout` boundary to
both launch modes, using the mode-specific audit label. The established
failure path is otherwise unchanged:

- the launch reservation remains durable before the adapter is invoked;
- a spawn handshake timeout is caught as one launch failure;
- the existing single `settleAgentLaunch` call atomically applies
  `session: starting -> error` and `task: starting -> pending`;
- that settlement records exactly one `launch_failed` evidence row for each
  entity;
- the service emits one `ERROR` audit carrying
  `agent.spawn timed out after <agentTimeoutMs>ms`;
- no `SESSION_STARTED` or `SESSION_CLOSED` event describes an invalid launch;
  and
- an exact retry returns `LIFECYCLE_LAUNCH_FAILED` without invoking the
  adapter or settling/auditing again.

The regression covers an adapter promise that resolves late and one that
rejects late. Both outcomes are ignored after the timeout settlement; neither
can cause a second state transition, duplicate evidence, or an unhandled
promise rejection.

## Startup timeout versus persistent lifetime

`agentTimeoutMs` bounds only the asynchronous launch handshake through the
adapter's valid spawn result. A separate characterization test launches
successfully, waits for three configured timeout periods, confirms both
entities remain `running`, and proves the service can still view the session.
No timer automatically closes, errors, or otherwise expires the running
session.

Trial 3 does not add process supervision, a reasoning deadline, automatic
session-lifetime enforcement, or any D/0/01 behavior.

## TDD evidence

The RED command was:

```bash
node --test tests/gateway/lifecycle_service_ordering.test.js
```

Before the production correction, the command exited 1 with **10 total,
9 passed, and 1 failed**. After five configured timeout periods, the pending
spawn call was still unresolved instead of rejecting with `TIMEOUT`. The
successful-spawn lifetime characterization already passed, proving that the
required bound was a startup-handshake concern rather than an automatic
running-session deadline.

After the one launch-boundary correction, the same command passed
**10/10 tests**. Both late-resolution and late-rejection cases reached exactly
one failure settlement, one evidence row per entity, one error audit, and the
exact-retry failure contract without relaunch or unhandled rejection.

The expanded lifecycle/schema/migration/service/tool command was:

```bash
node --test --test-concurrency=1 \
  tests/gateway/agent_errors.test.js \
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

Result: **123 total, 114 passed, nine exact live-PostgreSQL skips, and
zero failed**. Gateway ESLint and all **222 structure tests** also passed.

## Authoritative verification

A disposable Python 3.13 environment was synchronized exclusively from the
locked offline cache with hash checking. With the final technical tree and
all live integration variables removed, the authoritative gate was run twice:

```bash
env -u AGENTS_DB_URL \
  -u AGENTS_TEST_DB_URL \
  -u AGENTS_PG_INTEGRATION \
  -u AGENTS_TEST_DB \
  -u AGENTS_REDIS_URL \
  -u AGENTS_TEMPORAL_ADDRESS \
  UV_OFFLINE=1 \
  npm_config_offline=true \
  PATH="/tmp/agents-orchestrator-v5-c100.bz4ftg/venv-trial3/bin:$PATH" \
  bash scripts/ci.sh
```

Each run exited 0 with **1,127 tests accounted for, 1,115 passed, 12 exact
allowlisted infrastructure skips, and zero failures**. Required structure
(222), Gateway (763), E2E (24), CLI (29), LangGraph (84), lint, lock, local
MCP smoke, and policy lanes all passed. The aggregate status is
`infrastructure_unavailable` only for nine opt-in live-PostgreSQL cases and
three existing opt-in Gateway/Temporal cases.

Both the Trial 3 correction range and cumulative technical range passed:

```bash
git diff --check \
  5d95324b3639da759417bfee6289b754fa42a566..855af0a8c331e1109662ffd631bba2196a39d397
git diff --binary --no-ext-diff \
  5d95324b3639da759417bfee6289b754fa42a566..855af0a8c331e1109662ffd631bba2196a39d397 |
  gitleaks detect --pipe --redact --no-banner
git diff --check \
  11d5245ef312dd02ad7cd59d66ab0b9cce181071..855af0a8c331e1109662ffd631bba2196a39d397
git diff --binary --no-ext-diff \
  11d5245ef312dd02ad7cd59d66ab0b9cce181071..855af0a8c331e1109662ffd631bba2196a39d397 |
  gitleaks detect --pipe --redact --no-banner
```

Gitleaks reported no leaks for either range.

## Compatibility and isolation

- Trial 3 changes only the common launch-service timeout boundary, its
  lifecycle ordering tests, and C/1/00 status evidence. No adapter,
  supervisor, process-lifetime, dependency, or policy implementation changed.
- Trial 1's invalid-result compensation and Trial 2's PostgreSQL `BIGINT`
  corrections remain intact and covered by the cumulative suite.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
  No `message.*` schema, handler, or persistence path changed.
- `gateway/src/core/audit.js`, coordination transport, and the
  `agents:events` contract are unchanged. The full byte-baseline and audit
  isolation suites passed.
- No credential, secret, shared Redis, live PostgreSQL, network service,
  external MCP process, or real agent provider was used. Verification used
  disposable local SQLite state and the repository's local stdio MCP test
  processes only.

## Requested independent review

Please return `OK` or `KO` against the exact technical candidate and verify,
in particular:

1. a pending persistent spawn launch is bounded by `agentTimeoutMs` and cannot
   remain durably orphaned in `starting`;
2. the timeout performs exactly one atomic failed settlement, one evidence row
   per entity, and one service error audit without misleading start/close
   events;
3. exact retries return `LIFECYCLE_LAUNCH_FAILED` without relaunch or duplicate
   side effects, including after a late adapter resolution or rejection;
4. a valid spawn result ends the launch timeout's responsibility and installs
   no automatic deadline on the running session;
5. the prior invalid-result and PostgreSQL safe-integer corrections, reducer
   ownership, CAS/idempotency, terminal monotonicity, and cross-scope denial
   remain intact; and
6. `message.*`, `agents:events`, policy, dependencies, shared services, and
   D/0/01 supervisor scope remain unchanged.
