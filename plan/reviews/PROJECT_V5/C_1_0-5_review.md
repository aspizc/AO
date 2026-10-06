# C/1/00 Trial 5 — review request

Trial 5 is **pending independent review**. C/1/00 remains
`in_progress; Trials 1-4 KO; Trial 5 review pending`. This submission does not
claim an `OK`, integration, promotion, release, or full-CI result.

## Candidate identity

- Sheet: `V5 C/1/00 — Single lifecycle reducer and server-owned transitions`.
- Branch: `feat/V5-C-1-00-lifecycle`.
- Original technical base:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071`.
- Trial 4 technical commit:
  `059fa62ad4e3f782e6185db72b8f0a4d29eb10ce`.
- Trial 4 request commit:
  `639a2836c2f9fa2e7cd7d423dcb806656a047523`.
- Trial 4 independent `KO` / Trial 5 correction base:
  `cebf438192a1f1d063c301ef3da5794605a4ea7c`.
- Trial 5 technical commit:
  `7cdf8cd7556ce8e03b1cdc4a7e23f9adf106587a`.
- Trial 5 technical tree:
  `dfef347d880270363acbbf287d01808d78e0f45b`.
- Trial 5 base tree:
  `a82d73646803664a3dadfb30566bcfaddf61908e`.
- Original base tree:
  `2ead6bb8d02bc019c994190b2485fb654851b6af`.
- Trial 5 correction range:
  `cebf438192a1f1d063c301ef3da5794605a4ea7c..7cdf8cd7556ce8e03b1cdc4a7e23f9adf106587a`.
- Cumulative technical range:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071..7cdf8cd7556ce8e03b1cdc4a7e23f9adf106587a`.

The Trial 5 candidate is the direct child of the Trial 4 independent verdict.
The correction contains 11 files, 221 insertions, and 36 deletions. The
cumulative technical range contains 57 files, 6,153 insertions, and 299
deletions. This append-only request is a separate evidence file and is not
part of the technical tree under review.

## Trial 4 KO correction

Trial 4 correctly established one absolute startup deadline before adapter
invocation and bounded all three synchronous `tmux` primitives. Its concrete
adapters still published `SESSION_STARTED` before returning to the service's
deadline decision. Synchronous work in that gap could leave a false start
event followed by a server-owned timeout settlement.

Trial 5 gives the server one authoritative completion boundary:

- Codex, Claude, and Gemini no longer publish supervised start state from
  their `spawn()` methods. They return launch metadata to the lifecycle
  service.
- After the adapter promise resolves, the service checks the original
  absolute deadline again. This closes the event-loop ordering case in which
  an expired timer and a resolved promise become runnable together.
- Only a launch that passes the final deadline and result checks is settled
  atomically as succeeded.
- Only after that successful settlement does the service publish the existing
  supervised `SESSION_STARTED` event with the accepted `tmuxTarget`.
- A delayed audit publisher therefore runs after authoritative success, when
  the service can no longer reject that launch for its startup deadline.

No audit schema or `agents:events` field changed. Headless delegate lifecycle
and supervised input/kill events remain in their existing adapter paths.

## Required lifecycle outcome

The regression uses the real Codex, Claude, and Gemini adapter classes, an
injected in-process `tmux` client that succeeds for availability,
`new-session`, and `send-keys`, and an asynchronous post-`tmux`,
pre-service-return delay three times the configured deadline. It starts no
process or service.

For every concrete adapter, the result is:

- the first call returns the exact
  `TIMEOUT: agent.spawn timed out after 10ms`;
- session `starting -> error`, version 1;
- task `starting -> pending`, version 2;
- exactly one `launch_failed` evidence row per entity and only the reserve
  plus failure evidence rows;
- exactly one service `ERROR` audit;
- zero `SESSION_STARTED` or `SESSION_CLOSED` events;
- exact retry returns `LIFECYCLE_LAUNCH_FAILED`;
- the retry does not invoke the adapter or any `tmux` primitive again; and
- all three expected in-process `tmux` calls occurred before the delayed
  return.

The successful service characterization separately proves that the durable
session and task are already `running` and exactly one supervised
`SESSION_STARTED` event contains the accepted agent, role, mode, and
`tmuxTarget`.

## TDD evidence

The initial smallest RED command was:

```bash
node --test \
  --test-name-pattern='concrete supervised adapters do not publish lifecycle events after the startup deadline' \
  tests/gateway/lifecycle_service_ordering.test.js
```

Before production changes, Codex reached the expected timeout and durable
failure settlement, but the test failed `true !== false` because the audit
already contained `SESSION_STARTED`.

After moving supervised start publication out of the adapters, the same test
was strengthened so the delay occurs in an asynchronous continuation after
the concrete adapter returns. It failed again with
`Missing expected rejection: codex`: the resolved promise won the event-loop
turn after the deadline. The final post-resolution absolute-deadline check is
the minimum correction for that second RED.

The focused GREEN command was:

```bash
node --test \
  --test-name-pattern='concrete supervised adapters do not publish lifecycle events after the startup deadline|spawn sees a durable starting reservation before adapter launch' \
  tests/gateway/lifecycle_service_ordering.test.js
```

Result: **2 passed, zero failed**. The focused adapter and service files then
passed **37/37**.

## Safe expanded verification

With live integration variables removed, the same explicitly safe Trial 4
bundle plus the Trial 5 regression was run:

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
  tests/gateway/gemini_supervised.test.js
```

Result: **156 total, 147 passed, nine exact live-PostgreSQL skips, and zero
failed**.

Additional gates:

- Gateway ESLint: passed.
- Structure suite with locked `pytest==9.0.3` and `PyYAML==6.0.3`:
  **222 passed, zero failed**.
- `git diff --check`: passed.
- Redacted `gitleaks detect --pipe`: no leaks in either the Trial 5 correction
  or cumulative technical diff.

The author lane did not run `scripts/ci.sh`, the complete Gateway suite,
`tmux_client` execution, an MCP server/smoke, or Redis tests. The integration
owner retains those gates so this lane does not start `tmux`, MCP, or Redis
processes. No full-CI claim is made.

## Compatibility and isolation

- Trial 1 invalid-result compensation, Trial 2 PostgreSQL `BIGINT`
  compatibility, Trial 3 pending-promise and late resolve/reject behavior,
  and Trial 4 bounded synchronous primitives remain covered and green.
- A valid accepted spawn still ends startup deadline responsibility. The
  retained characterization waits for three configured timeout periods and
  observes the session and task still `running`, with no later error or close.
- The regression creates no real agent, `tmux` session, MCP server, Redis
  client, live PostgreSQL connection, network request, or provider call.
- `gateway/src/core/audit.js`, policies, dependencies, coordination transport,
  the `agents:events` contract, and `plan/PROJECT_V5/D/0/01.md` are unchanged.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`;
  no `message.*` schema, handler, or persistence path changed.

## Requested independent review

Please return `OK` or `KO` against the exact technical candidate and verify,
in particular:

1. no concrete supervised adapter can publish lifecycle state while the
   service may still reject that launch for the startup deadline;
2. the post-resolution absolute-deadline check closes the expired-timer versus
   resolved-promise ordering case;
3. a successful atomic settlement precedes the single server-owned
   `SESSION_STARTED` event without changing its external contract;
4. timeout retains one atomic failed settlement, one evidence row per entity,
   one service error audit, zero start/close events, and no relaunch on exact
   retry for Codex, Claude, and Gemini;
5. pending adapters, late resolve/reject results, invalid results, PostgreSQL
   safe-integer versions, reducer/CAS ownership, idempotency, monotonic
   terminals, and cross-scope denial remain intact;
6. valid running sessions receive no lifetime or reasoning timeout; and
7. `message.*`, `agents:events`, dependencies, policy, Redis, MCP, supervisor,
   and D/0/01 scope remain unchanged.

---

# Independent Review — V5 C/1/00 Trial 5

## Verdict

**KO**

This independent review was performed with **GPT-5.6 Sol**, reasoning
**ultra**; **Priority/Fast** service was requested.

Trial 5 closes the supervised-start race identified in Trial 4: Codex,
Claude, and Gemini no longer publish supervised lifecycle state before the
service's final deadline check and successful atomic settlement. The
cumulative candidate still violates the required lifecycle-event boundary in
two paths. All three one-shot delegates can publish both lifecycle events
before the service rejects the launch as timed out, and concurrent exact
`kill` retries publish two close events for one accepted session.

## Candidate reviewed

- Branch: `feat/V5-C-1-00-lifecycle`.
- Original technical base:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071`.
- Trial 4 independent `KO` / Trial 5 correction base:
  `cebf438192a1f1d063c301ef3da5794605a4ea7c`.
- Trial 5 technical commit:
  `7cdf8cd7556ce8e03b1cdc4a7e23f9adf106587a`.
- Trial 5 technical tree:
  `dfef347d880270363acbbf287d01808d78e0f45b`.
- Trial 5 request commit:
  `a95dfda6a82d970da1b87972d0c9aaabbba69c26`.
- Trial 5 request tree:
  `01676b622ca2677c343db37ce432dcdb72401f4f`.
- The technical commit is the direct child of the Trial 4 verdict, and the
  request is the direct child of the technical commit.
- The Trial 5 correction contains 11 files, 221 insertions, and 36 deletions.
  The cumulative technical range contains 57 files, 6,153 insertions, and
  299 deletions. Request-versus-candidate adds only this append-only review
  file.

## Blocking findings

### 1. Timed-out delegates publish `SESSION_STARTED` and `SESSION_CLOSED`

The final absolute-deadline check in
`gateway/src/services/agent_service.js:336`–`340` applies to both `spawn` and
`delegate`. Trial 5 moved only supervised start publication to the service.
The concrete delegate methods still publish their complete lifecycle before
returning their result:

- Codex publishes `SESSION_STARTED` at
  `gateway/src/adapters/codex_adapter.js:202` and `SESSION_CLOSED` at
  `gateway/src/adapters/codex_adapter.js:247`–`254`;
- Claude publishes them at
  `gateway/src/adapters/claude_adapter.js:143` and
  `gateway/src/adapters/claude_adapter.js:157`–`158` /
  `gateway/src/adapters/claude_adapter.js:182`–`183`; and
- Gemini publishes them at
  `gateway/src/adapters/gemini_adapter.js:97` and
  `gateway/src/adapters/gemini_adapter.js:106`–`107` /
  `gateway/src/adapters/gemini_adapter.js:122`–`123`.

An independent deterministic probe used each real adapter class in `dryRun`
and inserted an in-process delay only after its concrete delegate result and
before the wrapper returned to the service. No agent process, provider, or
network operation was invoked. For every provider, the service correctly
noticed that its 10 ms deadline had expired, returned
`TIMEOUT: agent.delegate timed out after 10ms`, and atomically settled
`session=error` / `task=pending`. The audit sequence was nevertheless:

```text
Codex       AGENT_MODEL_RESOLVED, SESSION_STARTED, SESSION_CLOSED, ERROR
Claude      AGENT_MODEL_RESOLVED, SESSION_STARTED, SESSION_CLOSED, ERROR
Gemini      AGENT_MODEL_RESOLVED, SESSION_STARTED, SESSION_CLOSED, ERROR
```

A 60-run deterministic stress test, 20 iterations per provider, reproduced
the lifecycle leak in **60/60** expired delegates. Exact retry correctly
returned `LIFECYCLE_LAUNCH_FAILED`, kept adapter invocation count at one, and
did not add a second pair, but it cannot retract the false first pair.

Required correction:

- put headless `SESSION_STARTED` / `SESSION_CLOSED` ownership behind the same
  server-owned acceptance boundary as supervised start publication;
- prove an expired delegate deadline yields no start or close event for all
  three concrete adapters; and
- preserve accepted one-shot ordering, nonzero-exit handling, atomic failure
  settlement, evidence/audit cardinality, and exact-retry behavior.

### 2. Concurrent exact `kill` retries publish duplicate close events

`agent_service.kill` checks replay state, then awaits the adapter side effect,
and only afterward persists the idempotent lifecycle transition
(`gateway/src/services/agent_service.js:456`–`479`). Each concrete adapter
publishes `SESSION_CLOSED` before that transition is recorded:

- Codex: `gateway/src/adapters/codex_adapter.js:373`–`389`;
- Claude: `gateway/src/adapters/claude_adapter.js:284`–`291`; and
- Gemini: `gateway/src/adapters/gemini_adapter.js:206`–`220`.

Two simultaneous calls with the same session, trace, and idempotency key can
therefore both pass the replay check and invoke `adapter.kill`. A process-free
independent probe first accepted a supervised session, then issued those two
exact calls concurrently in `dryRun`. For Codex, Claude, and Gemini alike:

```text
kill adapter calls          2
service outcomes            fulfilled, fulfilled
durable session state       closed
lifecycle event sequence    SESSION_STARTED, SESSION_CLOSED, SESSION_CLOSED
```

The repository makes the second transition an exact replay, but only after
the duplicate external side effect and duplicate close event have already
occurred. This violates both exact-retry idempotency and the required
one-start/one-close lifecycle for an accepted session.

Required correction:

- give one server-owned winner the in-flight close/kill command before the
  adapter side effect;
- make concurrent exact retries reuse that outcome without a second adapter
  call; and
- publish exactly one server-owned `SESSION_CLOSED` only for the accepted
  close transition.

## Verified Trial 5 correction and retained invariants

- The service rechecks the original absolute deadline after the adapter
  promise resolves and before accepting supervised launch success.
- Codex, Claude, and Gemini supervised adapters no longer publish lifecycle
  state from `spawn`.
- In a 60-run deterministic supervised stress test, 20 expired
  post-`tmux` returns per provider produced **zero** `SESSION_STARTED` or
  `SESSION_CLOSED` events, one failed durable settlement, and no relaunch on
  exact retry.
- In a separate 60-run sequential accepted-flow characterization, every
  provider produced exactly
  `SESSION_STARTED, SESSION_CLOSED`; sequential exact spawn/kill retries added
  no events. The concurrent retry finding above remains the blocker.
- The successful supervised settlement precedes the normal start event, and
  the retained running-session test confirms that startup timeout does not
  become a lifetime or reasoning timeout.
- Pending and late-resolving/rejecting spawn promises, invalid adapter
  results, Trial 2 PostgreSQL `BIGINT` compatibility, reducer/CAS ownership,
  atomic launch bundles, terminal monotonicity, and cross-scope denial remain
  green in the focused suite.
- The Trial 5 correction does not change `gateway/src/core/audit.js`,
  `gateway/src/tools/message.js`, policy or dependency files, coordination
  transport, Redis/MCP/supervisor implementation, or
  `plan/PROJECT_V5/D/0/01.md`.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.

## Independent verification

- Safe lifecycle/schema/migration/service/adapter bundle:
  **156 total, 147 passed, 9 exact live-PostgreSQL skips, 0 failed**.
- Safe audit/message/catalog compatibility bundle:
  **42 passed, 0 skipped, 0 failed**.
- Structure suite using the locked `pytest==9.0.3` and `PyYAML==6.0.3`:
  **222 passed, 0 failed**. The system interpreter lacked pytest, so that
  initial dependency check stopped before collection; the existing locked
  environment supplied both declared versions for the passing run.
- Gateway ESLint: passed.
- Deterministic three-provider stress:
  **60/60** expired supervised launches with zero lifecycle-event leaks;
  **60/60** expired delegates with leaked start/close pairs; and
  **60/60** sequential accepted launches with exact start/close pairs.
- Concurrent exact-kill probe: all three providers made two adapter calls and
  emitted two close events while both service calls fulfilled.
- `git diff --check`: passed for the Trial 5 correction, cumulative technical
  range, and request-versus-technical range.
- Redacted `gitleaks detect --pipe`: no leaks in the Trial 5 correction,
  cumulative technical range, or request-versus-technical range.

No real agent, `tmux`, MCP server, Redis client/service, live PostgreSQL,
network service, or provider was used. Full CI and live/integration gates were
not run and remain the integration owner's responsibility.

## Trial disposition

Trial 5 is **KO**. Preserve its corrected supervised acceptance boundary and
all previously validated lifecycle behavior, then put delegate start/close
publication and concurrent close idempotency behind server-owned lifecycle
boundaries in a new append-only trial. This verdict does not integrate,
promote, release, modify the technical candidate, or expand D/0/01.
