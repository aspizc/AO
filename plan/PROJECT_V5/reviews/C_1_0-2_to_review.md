# C/1/00 Trial 2 — review request

Trial 2 is **pending independent review**. C/1/00 remains
`in_progress; Trial 1 KO; Trial 2 review pending`; this submission does not
claim an `OK`, integration, promotion, or release.

## Candidate identity

- Sheet: `V5 C/1/00 — Single lifecycle reducer and server-owned transitions`.
- Branch: `feat/V5-C-1-00-lifecycle`.
- Original implementation base:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071`.
- Trial 1 technical commit:
  `8c5d1f51df5aa71d93699e01c2b437605699e95f`.
- Trial 1 request commit:
  `adb460cc878c5767588b5f9b77102fffe10d4c87`.
- Trial 1 independent `KO` / Trial 2 correction base:
  `e7ae6438942cb642714f1faa5a742383d7acf636`.
- Trial 2 technical commit:
  `6bea492069d5cb4a49e6b3880eb53ceefad4c6e9`.
- Trial 2 technical tree:
  `8f2bfe0865d175e6b62d3d09a5a483a43110c225`.
- Trial 2 base tree:
  `cc7cc5e6a0413d1630e988a17c6875780e1b4502`.
- Original base tree:
  `2ead6bb8d02bc019c994190b2485fb654851b6af`.
- Trial 2 correction range:
  `e7ae6438942cb642714f1faa5a742383d7acf636..6bea492069d5cb4a49e6b3880eb53ceefad4c6e9`.
- Cumulative technical range:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071..6bea492069d5cb4a49e6b3880eb53ceefad4c6e9`.

Review the exact Trial 2 technical commit above together with the cumulative
candidate. This append-only request is a separate evidence commit and is not
part of the technical tree under review.

## Trial 1 KO corrections

### Invalid resolved launch results

- The service now validates the resolved adapter result before choosing an
  outcome. Delegate requires string `stdout`/`stderr` plus a safe-integer
  `exitCode`; spawn requires a nonempty, at-most-128-character `tmuxTarget`
  plus a nonempty `attachCommand`.
- Adapter rejection, timeout, invalid resolution, and nonzero delegate exit
  converge on one settlement call. The service does not recursively attempt a
  second settlement if storage itself rejects that call.
- Invalid results settle the existing reservation atomically to
  `session=error, version=1` and `task=pending, version=2`. The same settlement
  command records exactly one `launch_failed` transition per entity.
- Exact retries observe the durable `error` session and return
  `LIFECYCLE_LAUNCH_FAILED` without invoking the adapter again, adding
  evidence, or duplicating the service error audit.
- The invalid-result audit contains only the fixed contract-failure message.
  Focused mocks produce no misleading `SESSION_STARTED` or `SESSION_CLOSED`
  event for a launch that never became valid.

### PostgreSQL safe-integer width

- PostgreSQL declares every orchestration/task/session lifecycle `version`,
  command `from_version`/`to_version`, and transition-evidence
  `from_version`/`to_version` as `BIGINT`.
- All matching PL/pgSQL transition, reservation, and settlement parameters
  and the generic transition local version are also `BIGINT`.
- The evidence identity remains
  `BIGINT GENERATED ALWAYS AS IDENTITY`; the migration contract rejects any
  regression to a 32-bit version declaration.
- The fake PostgreSQL executor now checks lifecycle entity, command, evidence,
  and generated transition integers with JavaScript-safe semantics rather
  than silently accepting an unmodelled numeric width.
- Matched SQLite and fake-PostgreSQL contract tests seed
  `Number.MAX_SAFE_INTEGER - 1`, perform a reducer-owned transition, and
  verify the entity, command result, and evidence retain
  `Number.MAX_SAFE_INTEGER` exactly. SQLite's 64-bit `INTEGER` contract is
  unchanged.

The reducer, public schemas, optimistic CAS, idempotency fingerprints,
terminal monotonicity, and atomic bundle commands are unchanged.

## TDD evidence

The invalid-result RED command was:

```bash
node --test tests/gateway/lifecycle_service_ordering.test.js
```

Result before production changes: exit 1, **8 total, 7 passed, 1 failed**.
`delegate() => undefined` produced the raw
`TypeError: Cannot read properties of undefined (reading 'exitCode')` instead
of the expected durable `LIFECYCLE_LAUNCH_FAILED`.

The PostgreSQL-width RED command was:

```bash
node --test \
  tests/gateway/postgres_state.test.js \
  tests/gateway/lifecycle_postgres_contract.test.js \
  tests/gateway/lifecycle_repository.test.js
```

Result before production changes: exit 1, **34 total, 24 passed, 9 exact
live-PostgreSQL skips, 1 failed**. Both max-safe runtime parity probes already
passed, but static migration inspection found the 32-bit entity, command,
evidence, parameter, and local declarations.

After the minimum corrections:

- invalid-result service suite: **8/8 passed**;
- PostgreSQL/SQLite boundary bundle: **34 total, 25 passed, 9 exact
  live-PostgreSQL skips, 0 failed**;
- Gateway ESLint: passed.

The expanded lifecycle/schema/migration/service/tool command was:

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

Result: **118 total, 109 passed, 9 exact live-PostgreSQL skips, 0 failed**.

## Authoritative verification

A disposable Python 3.13 environment was synchronized exclusively from the
locked offline cache with hash checking, and the final tree was verified
twice with live integration variables removed:

```bash
env -u AGENTS_DB_URL \
  -u AGENTS_TEST_DB_URL \
  -u AGENTS_PG_INTEGRATION \
  -u AGENTS_TEST_DB \
  -u AGENTS_REDIS_URL \
  -u AGENTS_TEMPORAL_ADDRESS \
  UV_OFFLINE=1 \
  npm_config_offline=true \
  PATH="/tmp/agents-orchestrator-v5-c100.bz4ftg/venv-trial2/bin:$PATH" \
  bash scripts/ci.sh
```

Final result: exit 0, **1,125 tests accounted for, 1,113 passed, 12 exact
allowlisted infrastructure skips, 0 failed**. Required structure (222),
Gateway (761), E2E (24), CLI (29), LangGraph (84), lint, lock, local MCP
smoke, and policy lanes all passed. The aggregate status is
`infrastructure_unavailable` only for nine opt-in live-PostgreSQL cases and
three existing opt-in Gateway/Temporal cases.

Both the Trial 2 correction range and cumulative technical range passed:

```bash
git diff --check \
  e7ae6438942cb642714f1faa5a742383d7acf636..6bea492069d5cb4a49e6b3880eb53ceefad4c6e9
git diff --binary --no-ext-diff \
  e7ae6438942cb642714f1faa5a742383d7acf636..6bea492069d5cb4a49e6b3880eb53ceefad4c6e9 |
  gitleaks detect --pipe --redact --no-banner
git diff --check \
  11d5245ef312dd02ad7cd59d66ab0b9cce181071..6bea492069d5cb4a49e6b3880eb53ceefad4c6e9
git diff --binary --no-ext-diff \
  11d5245ef312dd02ad7cd59d66ab0b9cce181071..6bea492069d5cb4a49e6b3880eb53ceefad4c6e9 |
  gitleaks detect --pipe --redact --no-banner
```

Gitleaks reported no leaks for either range.

## Compatibility and isolation

- The Trial 2 correction changes only lifecycle service/result handling,
  PostgreSQL lifecycle type declarations, fake/backend contract tests, and
  C/1/00 status evidence.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
  No `message.*` schema, handler, or persistence path changed.
- `gateway/src/core/audit.js`, coordination transport, and the
  `agents:events` contract are unchanged. The full byte-baseline and audit
  isolation suites passed.
- No dependency manifest, policy file, credential, secret, shared Redis,
  shared PostgreSQL, external MCP process, network service, or real agent
  provider was used. The authoritative gate used only disposable local
  SQLite and local stdio MCP test processes; live integrations stayed
  disabled or explicitly skipped.

## Requested independent review

Please return `OK` or `KO` against the exact technical candidate and verify,
in particular:

1. every rejected, timed-out, undefined, malformed, or invalid delegate/spawn
   result reaches exactly one atomic failed settlement and cannot remain
   orphaned in `starting`;
2. exact failure retries neither relaunch nor duplicate evidence/audit, while
   successful and nonzero delegate outcomes retain their prior semantics;
3. PostgreSQL has no remaining 32-bit lifecycle version declaration and its
   functions, evidence, fake contract, and SQLite parity operate through the
   JavaScript safe-integer boundary;
4. CAS/idempotency, terminal monotonicity, cross-scope denial, and one-shot
   task/session separation remain intact; and
5. `message.*`, `agents:events`, policy, dependencies, and shared-service
   exclusions remain unchanged.
