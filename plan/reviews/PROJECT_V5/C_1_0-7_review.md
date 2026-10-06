# C/1/00 Trial 7 — review request

Trial 7 is **pending independent review**. C/1/00 remains
`in_progress; Trials 1-6 KO; Trial 7 review pending`. This submission does not
claim an `OK`, integration, promotion, release, or full-CI result.

## Candidate identity

- Sheet: `V5 C/1/00 — Single lifecycle reducer and server-owned transitions`.
- Branch: `feat/V5-C-1-00-lifecycle`.
- Original technical base:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071`.
- Trial 6 technical commit:
  `6d4d81b1fa2d4c61505f3f564c73788620c49646`.
- Trial 6 request commit:
  `15fea0861aee94e8b38e34e2c593138740975dc2`.
- Trial 6 independent `KO` / Trial 7 correction base:
  `a6f6393a5324cb5544f8fc2d75af808d161d63d0`.
- Trial 7 technical commit:
  `f8e5b2b098670749808c42b1e66a2f33078300ed`.
- Trial 7 technical tree:
  `a52a251bcc6754d52c80bcef6a2b47f5cbbd82c9`.
- Trial 7 base tree:
  `2d15d1e4f7119ec869c8b7a7768fb9221ebdc898`.
- Original base tree:
  `2ead6bb8d02bc019c994190b2485fb654851b6af`.
- Trial 7 correction range:
  `a6f6393a5324cb5544f8fc2d75af808d161d63d0..f8e5b2b098670749808c42b1e66a2f33078300ed`.
- Cumulative technical range:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071..f8e5b2b098670749808c42b1e66a2f33078300ed`.

The Trial 7 candidate is the direct child of the authoritative Trial 6
independent verdict. The correction contains nine files, 539 insertions, and
32 deletions. The cumulative technical range contains 64 files, 7,856
insertions, and 445 deletions. This append-only request is a separate evidence
file and is not part of the technical tree under review.

## Trial 6 KO correction: concrete headless process deadline

Trial 6 correctly moved delegate lifecycle publication behind the service's
final acceptance decision, but all three concrete delegates still entered
their synchronous process primitive before the JavaScript promise timeout
could run. Trial 7 carries the already-created absolute deadline through that
last synchronous boundary:

- Codex, Claude, and Gemini delegate signatures now consume
  `launchDeadlineAt` and `launchTimeoutMs`, which the lifecycle service already
  supplies before adapter invocation.
- A shared `spawnSyncWithDeadline` boundary calculates the remaining absolute
  budget immediately before the child launch.
- An expired deadline fails before invoking the process primitive. A positive
  fractional remainder is floored to one millisecond, a longer remainder is
  capped by the configured launch timeout, and an in-budget remainder is
  passed unchanged.
- The same deadline is rechecked after `spawnSync` returns, preventing an
  apparently successful result from being accepted at or after expiry.
- Both thrown and returned native `ETIMEDOUT` forms normalize to the existing
  `TIMEOUT` code and exact
  `agent.delegate timed out after <agentTimeoutMs>ms` message.
- Direct adapter calls without a service deadline retain the previous
  `adapterTimeoutMs` or 600-second fallback.
- Lifecycle `TIMEOUT` errors are not double-audited by the adapter; the
  existing service failure boundary records the one durable service error.
  Other adapter policy and process errors retain their prior audit behavior.

No lifecycle event ownership, settlement transition, reducer command, or kill
idempotency path changed in this correction.

## Deterministic TDD evidence

The shared concrete-adapter RED command was:

```bash
node --test --test-concurrency=1 \
  --test-name-pattern='concrete delegates bound synchronous headless process primitives' \
  tests/gateway/lifecycle_service_ordering.test.js
```

Before production changes, the first Codex case failed:

```text
codex exceeded the 20ms launch bound: 129.5ms
1 failed
```

The test uses each real Codex, Claude, and Gemini adapter class with
`dryRun=false`, but replaces the provider binary with a disposable local shell
executable that ignores provider arguments and executes `sleep 0.12`.
`agentTimeoutMs` is 20 milliseconds and the independent adapter timeout is
500 milliseconds only as a test safety cap. No real agent or provider is
invoked.

A separate helper contract was also written before the shared implementation.
Its initial run failed with `ERR_MODULE_NOT_FOUND` for
`gateway/src/adapters/sync_process.js`. It pins:

- pre-launch expiry without invoking the child boundary;
- one-millisecond fractional floor;
- propagation of a partially consumed remaining budget;
- configured timeout clamping;
- direct-call fallback compatibility;
- thrown and returned `ETIMEDOUT` normalization; and
- post-call deadline expiry.

After the minimum shared boundary and adapter threading, the focused GREEN
commands were:

```bash
node --test --test-concurrency=1 \
  tests/gateway/sync_process_deadline.test.js

node --test --test-concurrency=1 \
  --test-name-pattern='(concrete delegates bound synchronous headless|accepted concrete headless)' \
  tests/gateway/lifecycle_service_ordering.test.js
```

Results: **5/5 helper contracts passed** and **2/2 shared concrete-adapter
paths passed**. The complete lifecycle ordering file then passed **18/18**.

## Three-provider deadline and settlement outcome

For each of Codex, Claude, and Gemini, the sleeping synthetic process case
asserts an elapsed duration below 100 milliseconds, strictly below the
approximately 120-millisecond child duration that reproduced the KO. Every
case also proves:

- the exact configured `TIMEOUT` is returned;
- the adapter/process path is invoked once;
- the session settles once to `error`, version one;
- the task returns to `pending`, version two;
- session and task each retain exactly two evidence rows, with exactly one
  `launch_failed` row;
- exactly one service `ERROR` is published;
- neither `SESSION_STARTED` nor `SESSION_CLOSED` is published; and
- an exact retry returns `LIFECYCLE_LAUNCH_FAILED` without another process
  launch or evidence row.

A second provider-free executable exits zero immediately. All three concrete
adapters retain their accepted path: exit code zero, `session=closed`,
`task=running`, exactly one ordered
`SESSION_STARTED, SESSION_CLOSED` pair, and no relaunch on exact retry.

The retained Trial 6 deterministic stress is also green:

- **60/60 expired delegates**: 20 per provider settle once to
  `session=error` / `task=pending`, publish one service error and zero
  lifecycle events, and do not relaunch or duplicate evidence on exact retry.
- **60/60 accepted delegates**: 20 per provider settle
  `session=closed` / `task=running`, publish exactly one ordered lifecycle
  pair, and add no call or event on exact retry.
- **60/60 concurrent exact-kill pairs**: 20 per provider share one adapter
  call, one durable transition, and one server-owned supervised close event;
  a later exact retry remains side-effect free.

## Safe expanded verification

With live integration variables removed, the lifecycle bundle was:

```bash
env -u AGENTS_DB_URL \
  -u AGENTS_TEST_DB_URL \
  -u AGENTS_PG_INTEGRATION \
  -u AGENTS_TEST_DB \
  -u AGENTS_REDIS_URL \
  -u AGENTS_TEMPORAL_ADDRESS \
  node --test --test-concurrency=1 \
  tests/gateway/agent_errors.test.js \
  tests/gateway/lifecycle_reducer.test.js \
  tests/gateway/lifecycle_repository.test.js \
  tests/gateway/lifecycle_service_ordering.test.js \
  tests/gateway/sync_process_deadline.test.js \
  tests/gateway/lifecycle_postgres_contract.test.js \
  tests/gateway/sqlite_migrations.test.js \
  tests/gateway/postgres_state.test.js \
  tests/gateway/orchestration_service.test.js \
  tests/gateway/task_service.test.js \
  tests/gateway/tool_session_attach_info.test.js \
  tests/gateway/schemas.test.js \
  tests/gateway/codex_adapter.test.js \
  tests/gateway/codex_supervised.test.js \
  tests/gateway/claude_adapter.test.js \
  tests/gateway/gemini_delegate.test.js \
  tests/gateway/gemini_policy_audit.test.js \
  tests/gateway/gemini_supervised.test.js
```

Result: **170 total, 161 passed, nine exact live-PostgreSQL skips, and zero
failed**.

The safe audit/message/catalog compatibility bundle added
`tool_artifact.test.js` to the retained author bundle and passed **52/52**.
Additional gates:

- Gateway ESLint: passed.
- CI suite manifest validation: passed after refreshing only the deterministic
  `lint.gateway` and `test.gateway` inventory hashes for the new source and
  test files; suite definitions are unchanged.
- Structure suite with locked `pytest==9.0.3` and `PyYAML==6.0.3`:
  **222 passed, zero failed**.
- `git diff --check`: passed for the Trial 7 correction and cumulative
  technical ranges.
- Redacted `gitleaks detect --pipe`: no leaks in the Trial 7 correction or
  cumulative technical diff.

The author lane did not run `scripts/ci.sh`, the complete Gateway suite,
`tmux_client` execution, an MCP server/smoke, Redis tests, live database
tests, network services, or real-agent/provider tests. Those integration
gates remain with the integration owner. No full-CI claim is made.

## Compatibility and isolation

- Trial 5's supervised event-acceptance boundary and Trial 6's delegate
  event-acceptance boundary remain service-owned and green.
- Trial 6's synchronous first-wins concurrent-kill claim, changed-fingerprint
  conflict, one-transition behavior, and server-owned close publication are
  unchanged and green.
- Pending and late-resolving/rejecting launches, invalid results, nonzero
  delegates, Trial 2 PostgreSQL `BIGINT` compatibility, reducer/CAS ownership,
  atomic launch bundles, idempotency, terminal monotonicity, cross-scope
  denial, and running-session lifetime separation remain covered.
- `gateway/src/core/audit.js`, policies, dependency manifests, coordination
  transport, the `agents:events` contract, `plan/PROJECT_V5/D/0/00.md`, and
  `plan/PROJECT_V5/D/0/01.md` are unchanged.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`;
  no `message.*` schema, handler, persistence, or public catalog behavior
  changed.
- The only executable provider substitutes were disposable local shell
  scripts. No real agent/provider, `tmux`, MCP, Redis, network service, or live
  database was used.

## Requested independent review

Please return `OK` or `KO` against the exact technical candidate and verify,
in particular:

1. the service-created absolute delegate deadline reaches every concrete
   Codex, Claude, and Gemini synchronous process primitive;
2. each primitive receives only the positive remaining budget, including
   expiry, floor, clamp, and post-call handling;
3. native child timeout results preserve the exact existing lifecycle
   `TIMEOUT` contract;
4. bounded concrete timeouts settle session and task exactly once, publish one
   service error and no lifecycle events, and exact retry cannot relaunch or
   duplicate evidence;
5. accepted concrete headless launches still publish exactly one ordered
   lifecycle pair and exact retry remains side-effect free;
6. Trial 5/6 event ownership and concurrent exact-kill idempotency remain
   intact under their retained three-provider stress;
7. direct adapter timeout compatibility, non-timeout policy/error audit
   behavior, reducer/CAS ownership, safe-integer versions, monotonic
   terminals, scope denial, and running-session lifetime separation remain
   intact; and
8. `message.*`, `agents:events`, dependencies, policy, Redis, MCP, supervisor,
   D/0/00, and D/0/01 scope remain unchanged.

---
