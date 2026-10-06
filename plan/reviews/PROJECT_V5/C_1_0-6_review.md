# C/1/00 Trial 6 — review request

Trial 6 is **pending independent review**. C/1/00 remains
`in_progress; Trials 1-5 KO; Trial 6 review pending`. This submission does not
claim an `OK`, integration, promotion, release, or full-CI result.

## Candidate identity

- Sheet: `V5 C/1/00 — Single lifecycle reducer and server-owned transitions`.
- Branch: `feat/V5-C-1-00-lifecycle`.
- Original technical base:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071`.
- Trial 5 technical commit:
  `7cdf8cd7556ce8e03b1cdc4a7e23f9adf106587a`.
- Trial 5 request commit:
  `a95dfda6a82d970da1b87972d0c9aaabbba69c26`.
- Trial 5 independent `KO` / Trial 6 correction base:
  `7a998287df22fdcb179f2b31d19c7e72241f3bc5`.
- Trial 6 technical commit:
  `6d4d81b1fa2d4c61505f3f564c73788620c49646`.
- Trial 6 technical tree:
  `358d22e2f5df6d4f4b05862d649e597505d00f50`.
- Trial 6 base tree:
  `55dddceda846c512ad7539589704c8d62a204e0e`.
- Original base tree:
  `2ead6bb8d02bc019c994190b2485fb654851b6af`.
- Trial 6 correction range:
  `7a998287df22fdcb179f2b31d19c7e72241f3bc5..6d4d81b1fa2d4c61505f3f564c73788620c49646`.
- Cumulative technical range:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071..6d4d81b1fa2d4c61505f3f564c73788620c49646`.

The Trial 6 candidate is the direct child of the Trial 5 independent verdict.
The correction contains 14 files, 444 insertions, and 134 deletions. The
cumulative technical range contains 61 files, 6,982 insertions, and 421
deletions. This append-only request is a separate evidence file and is not
part of the technical tree under review.

## Trial 5 KO correction: delegate acceptance

Trial 5 correctly made supervised start publication service-owned, but the
three concrete delegates still published their complete lifecycle before the
service's final deadline decision. Trial 6 applies the same authority boundary
to one-shot work:

- Codex, Claude, and Gemini adapters return their headless result without
  publishing `SESSION_STARTED` or `SESSION_CLOSED`.
- The service retains the absolute post-resolution deadline check, validates
  the result, and atomically settles session plus task.
- Only an accepted zero-exit settlement publishes the existing headless
  `SESSION_STARTED`, followed by `SESSION_CLOSED` with the accepted exit code.
- Timeout, rejection, invalid result, and nonzero exit settle failure without
  either lifecycle event.
- Exact accepted and failed retries reuse the durable outcome without another
  adapter call or lifecycle pair.

The event types, headless mode, agent/role identity, exit-code semantics, and
ordering are unchanged; no event schema changed, and publication ownership
moves behind the server decision.

## Trial 5 KO correction: concurrent exact kill

Trial 5 allowed two exact concurrent kills to pass the durable replay check
before either adapter result reached the repository. Trial 6 adds one
service-owned first-wins boundary:

- `createAgentService` owns an in-flight kill map keyed by idempotency key.
- After scope, fingerprint, expected-version, and reducer validation, the
  service creates the operation promise and installs its claim synchronously.
- The adapter side effect is deferred to the promise microtask, so the claim
  is visible before that side effect can begin.
- A concurrent exact request verifies the fingerprint and awaits the winner's
  same promise, returning the shared outcome as a replay.
- A concurrent changed-payload use of the key fails
  `LIFECYCLE_IDEMPOTENCY_CONFLICT`.
- The winner persists the existing reducer/repository transition only after
  adapter success. Only a non-replayed accepted transition publishes the
  server-owned supervised `SESSION_CLOSED`.
- The claim is removed after resolution or rejection. Durable replay remains
  authoritative after an accepted transition.

Codex, Claude, and Gemini kill methods now return their process result without
publishing close state. Adapter failure behavior is unchanged, and no terminal
transition is recorded before the side effect succeeds.

## Deterministic TDD evidence

The delegate RED command was:

```bash
node --test \
  --test-name-pattern='concrete delegates publish no lifecycle events when the startup deadline expires' \
  tests/gateway/lifecycle_service_ordering.test.js
```

Before production changes, the first Codex iteration reached the expected
timeout and durable `session=error` / `task=pending` settlement, but failed
because the lifecycle sequence was
`SESSION_STARTED, SESSION_CLOSED` instead of empty.

The concurrent-kill RED command was:

```bash
node --test \
  --test-name-pattern='concurrent exact kills invoke each concrete adapter and close lifecycle only once' \
  tests/gateway/lifecycle_service_ordering.test.js
```

Before production changes, the first Codex iteration failed `2 !== 1` because
both exact calls entered the adapter.

After the minimum service/adapter correction, the focused GREEN covered both
REDs and accepted delegate publication:

```bash
node --test \
  --test-name-pattern='concrete delegates publish no lifecycle events when the startup deadline expires|concurrent exact kills invoke each concrete adapter and close lifecycle only once|delegate success closes only the one-shot session and keeps task non-terminal' \
  tests/gateway/lifecycle_service_ordering.test.js
```

Result: **3 passed, zero failed**. The complete lifecycle service file then
passed **16/16**.

## Three-provider stress outcome

Every stress path uses real Codex, Claude, and Gemini adapter classes in
`dryRun`, isolated SQLite state, and only in-process gates:

- **60/60 expired delegates**: 20 per provider returned the exact configured
  `TIMEOUT`, settled once to `session=error` / `task=pending`, recorded one
  failure evidence row per entity and one service error audit, published zero
  start/close events, and did not relaunch on exact retry.
- **60/60 accepted delegates**: 20 per provider settled
  `session=closed` / `task=running`, published exactly
  `SESSION_STARTED, SESSION_CLOSED`, retained exit code zero, and added no
  lifecycle event or adapter call on exact retry.
- **60/60 concurrent exact-kill pairs**: 20 per provider shared one adapter
  call, both fulfilled, exactly one result was marked in-flight replay, one
  durable kill transition was recorded, and the accepted supervised lifecycle
  remained exactly `SESSION_STARTED, SESSION_CLOSED`. A later exact retry also
  reused the durable result without another call or event.

No agent executable, `tmux`, network, Redis, MCP, or provider was invoked.

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

Result: **163 total, 154 passed, nine exact live-PostgreSQL skips, and zero
failed**.

The process-free audit/message/catalog compatibility bundle passed **46/46**.
Additional gates:

- Gateway ESLint: passed.
- Structure suite with locked `pytest==9.0.3` and `PyYAML==6.0.3`:
  **222 passed, zero failed**.
- `git diff --check`: passed.
- Redacted `gitleaks detect --pipe`: no leaks in either the Trial 6 correction
  or cumulative technical diff.

The author lane did not run `scripts/ci.sh`, the complete Gateway suite,
`tmux_client` execution, an MCP server/smoke, Redis tests, or live database
tests. The integration owner retains those gates. No full-CI claim is made.

## Compatibility and isolation

- Trial 5's supervised acceptance boundary and running-session lifetime
  separation remain green.
- Pending and late-resolving/rejecting launches, invalid results, nonzero
  delegates, Trial 2 PostgreSQL `BIGINT` compatibility, reducer/CAS ownership,
  atomic launch bundles, idempotency, terminal monotonicity, and cross-scope
  denial remain covered.
- `gateway/src/core/audit.js`, policies, dependency manifests, coordination
  transport, the `agents:events` contract, `plan/PROJECT_V5/D/0/00.md`, and
  `plan/PROJECT_V5/D/0/01.md` are unchanged.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`;
  no `message.*` schema, handler, or persistence path changed.

## Requested independent review

Please return `OK` or `KO` against the exact technical candidate and verify,
in particular:

1. no concrete delegate publishes lifecycle state before the service's final
   deadline, result, exit-code, and atomic-settlement acceptance boundary;
2. an expired delegate produces no start/close event for Codex, Claude, or
   Gemini, while an accepted delegate produces exactly the existing ordered
   pair;
3. the in-flight kill claim is installed before the adapter side effect and
   exact concurrent requests share one promise, one adapter call, and one
   transition;
4. only the accepted non-replayed kill transition publishes the single
   server-owned `SESSION_CLOSED`, while changed-payload reuse fails closed;
5. adapter failure cannot pre-commit a terminal close, and exact durable
   retries add no side effect or lifecycle event;
6. Trial 1–5 corrections, reducer/CAS ownership, evidence cardinality,
   PostgreSQL safe-integer versions, late-result handling, monotonic terminals,
   scope denial, and running-session lifetime separation remain intact; and
7. `message.*`, `agents:events`, dependencies, policy, Redis, MCP, supervisor,
   D/0/00, and D/0/01 scope remain unchanged.

---

# Independent Review — V5 C/1/00 Trial 6

## Verdict

**KO**

Trial 6 closes both Trial 5 blockers. Across Codex, Claude, and Gemini,
expired delegates now publish no lifecycle state, accepted delegates publish
one ordered start/close pair, and concurrent exact kills share one adapter
call, one durable transition, and one server-owned close event. The cumulative
candidate still does not enforce its published delegate timeout at the
concrete process boundary: every headless adapter synchronously waits in
`spawnSync` using an independent 600-second fallback before the service can
apply `agentTimeoutMs`.

**GPT-5.6 Sol with ultra reasoning was used, and Priority/Fast execution was
requested.**

## Blocking finding

### Concrete delegates can block past `agentTimeoutMs` before the timer exists

The service establishes an absolute deadline, but
`Promise.resolve(adapter[mode](...))` evaluates and invokes the adapter
synchronously before `remainingDeadlineMs` and `withTimeout` run
(`gateway/src/services/agent_service.js:333`–`369`). The service passes
`launchDeadlineAt` and `launchTimeoutMs`, but all three concrete delegate
signatures discard them:

- Codex accepts only its pre-existing delegate fields
  (`gateway/src/adapters/codex_adapter.js:168`–`177`) and gives
  `spawnSync` `this.config.adapterTimeoutMs || 600_000`
  (`gateway/src/adapters/codex_adapter.js:218`–`233`);
- Claude does the same
  (`gateway/src/adapters/claude_adapter.js:105`–`119` and
  `gateway/src/adapters/claude_adapter.js:135`–`146`); and
- Gemini does the same
  (`gateway/src/adapters/gemini_adapter.js:72`–`75` and
  `gateway/src/adapters/gemini_adapter.js:86`–`91`).

`loadConfig` publishes `agentTimeoutMs` but no separate
`adapterTimeoutMs` (`gateway/src/config.js:178`–`182`). Consequently, a
configured short agent timeout does not reach the concrete one-shot process
primitive. The post-return deadline check eventually reports `TIMEOUT`, but
it cannot bound elapsed time or move the already durable reservation out of
`starting` while `spawnSync` is blocked.

An independent probe configured `agentTimeoutMs=20`, used each real adapter
class with a local executable that ignores provider arguments, sleeps for
120 ms, and exits zero, and capped the independent adapter timeout at 500 ms
for test safety. It invoked no real agent or provider. Results were:

```text
provider       elapsed   service result   session/task    lifecycle events
Codex          130 ms    TIMEOUT          error/pending   none
Claude         126 ms    TIMEOUT          error/pending   none
Gemini         126 ms    TIMEOUT          error/pending   none
configured      20 ms
```

Thus Trial 6 correctly prevents false start/close publication and ultimately
settles failure, but all three calls exceeded the configured bound by more
than six times. With the production fallback, an unresponsive child can hold
the reservation in `starting` for up to 600 seconds despite a much shorter
configured `agentTimeoutMs`.

Required correction:

- thread the same absolute launch deadline into each concrete delegate process
  primitive and give it only the remaining `agentTimeoutMs` budget, or use an
  interruptible asynchronous child boundary;
- normalize native child timeout results to the existing `TIMEOUT` contract;
  and
- add process-injected RED/GREEN coverage for Codex, Claude, and Gemini that
  proves bounded return, one atomic failed settlement, no lifecycle event,
  and no relaunch/evidence duplication on exact retry.

## Positive evidence

- The exact commit chain is correct:
  `7a998287df22fdcb179f2b31d19c7e72241f3bc5` ->
  `6d4d81b1fa2d4c61505f3f564c73788620c49646` ->
  `15fea0861aee94e8b38e34e2c593138740975dc2`.
- **60/60 expired delegates** emitted neither `SESSION_STARTED` nor
  `SESSION_CLOSED`; **60/60 accepted delegates** emitted exactly one ordered
  pair; and **60/60 concurrent identical kill pairs** made one adapter call,
  one transition, and one close across Codex, Claude, and Gemini.
- An in-flight changed-fingerprint kill returned
  `LIFECYCLE_IDEMPOTENCY_CONFLICT`. Adapter failure left the session running
  with no kill evidence or close event.
- The focused bundle accounted for **163 tests: 154 passed, nine expected
  live-PostgreSQL skips, zero failed**. It covered reducer/CAS ownership,
  exact and conflicting retries, cancellation, async/sync spawn timeouts,
  invalid and late results, monotonic terminals, scope denial, atomic
  bundles, and SQLite/fake-PostgreSQL safe-integer parity.
- Audit/message/catalog compatibility passed **52/52**; structure passed
  **222/222**; Gateway ESLint, all three `git diff --check` ranges, and all
  three redacted Gitleaks scans passed.
- The exact current and original-base `message.*` hash is
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
  The 33-tool catalog/golden projection and legacy `agents:events` semantics
  passed, and their implementations are outside the Trial 6 correction.
- No real agent/provider, `tmux`, MCP server, Redis, network service, or live
  database was used. Full CI and live integration gates were not run.

## Trial disposition

Trial 6 is **KO**. Preserve both corrected Trial 5 event-authority paths and
all retained lifecycle behavior, then bound each concrete headless process
primitive with the existing absolute launch deadline in a new append-only
trial. This verdict does not modify the technical candidate, integrate,
promote, release, or expand D/0/01.
