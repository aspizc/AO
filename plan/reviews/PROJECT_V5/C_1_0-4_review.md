# C/1/00 Trial 4 — review request

Trial 4 is **pending independent review**. C/1/00 remains
`in_progress; Trials 1-3 KO; Trial 4 review pending`. This submission does not
claim an `OK`, integration, promotion, release, or full-CI result.

## Candidate identity

- Sheet: `V5 C/1/00 — Single lifecycle reducer and server-owned transitions`.
- Branch: `feat/V5-C-1-00-lifecycle`.
- Original technical base:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071`.
- Trial 3 technical commit:
  `855af0a8c331e1109662ffd631bba2196a39d397`.
- Trial 3 request commit:
  `6a3b1397088090f9dfff02a1be955206b75f06dd`.
- Trial 3 independent `KO` / Trial 4 correction base:
  `5c3dddcacdb899112e48333e4d8e49bae2603467`.
- Trial 4 technical commit:
  `059fa62ad4e3f782e6185db72b8f0a4d29eb10ce`.
- Trial 4 technical tree:
  `9271ab8838ed76ec1b12b473e158a3160cd10c7c`.
- Trial 4 base tree:
  `0923bbbe64adcc6443527fa065dcc9fb47f6ab4f`.
- Original base tree:
  `2ead6bb8d02bc019c994190b2485fb654851b6af`.
- Trial 4 correction range:
  `5c3dddcacdb899112e48333e4d8e49bae2603467..059fa62ad4e3f782e6185db72b8f0a4d29eb10ce`.
- Cumulative technical range:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071..059fa62ad4e3f782e6185db72b8f0a4d29eb10ce`.

Review the exact Trial 4 technical commit above together with the cumulative
candidate. This append-only request is a separate evidence commit and is not
part of the technical tree under review.

## Trial 3 KO correction

Trial 3 correctly bounded a promise that remained pending after `spawn()`
returned. Its JavaScript timer was still created after invoking the adapter,
while all three concrete supervised adapters performed synchronous
`spawnSync`-backed `tmux` work before returning their promise. A configured
20-millisecond timeout could therefore block for about 103 milliseconds and
settle the launch as `running`.

Trial 4 makes the complete persistent startup handshake share one absolute
deadline:

- `launchAgent` calculates the deadline immediately before invoking the
  adapter and passes both that deadline and the configured `agentTimeoutMs`;
- Codex, Claude, and Gemini pass the same deadline to `tmux -V`,
  `new-session`, and `send-keys`;
- each underlying `spawnSync` call receives only the remaining milliseconds,
  never a fresh full timeout;
- a native `ETIMEDOUT`, a thrown `ETIMEDOUT`, or successful primitive return
  after the deadline becomes the established
  `TIMEOUT: agent.spawn timed out after <agentTimeoutMs>ms`;
- after synchronous work returns, the service gives the promise guard only
  the remaining deadline budget while retaining the configured duration in
  the public error message; and
- the pre-existing promise timeout remains in place for genuinely
  asynchronous adapters and late resolve/reject behavior.

The adapter does not publish its own duplicate timeout audit. The lifecycle
service owns the single failure audit and existing atomic settlement.
Non-timeout adapter errors retain their prior adapter audit behavior.

## Required lifecycle outcome

The synchronous boundary tests cover Codex, Claude, and Gemini without
starting a real process. An injected `spawnSync` boundary makes availability
and `new-session` succeed, returns `ETIMEDOUT` from `send-keys`, and records
the options received by every primitive.

For every concrete adapter, the result is:

- each of the three synchronous calls receives a positive timeout no larger
  than `agentTimeoutMs`;
- session `starting -> error`, version 1;
- task `starting -> pending`, version 2;
- exactly one `launch_failed` evidence row per entity and only the reserve
  plus failure evidence rows;
- exactly one `ERROR` audit with the configured `agent.spawn` timeout;
- no `SESSION_STARTED` or `SESSION_CLOSED` event;
- exact retry returns `LIFECYCLE_LAUNCH_FAILED`; and
- the retry neither invokes the adapter again nor adds evidence or audit.

## Startup deadline versus persistent lifetime

The absolute deadline exists only for startup. A valid adapter result ends the
promise guard and settles the persistent session and task to `running`.
The retained Trial 3 characterization waits for three configured timeout
periods, views the session successfully, and observes no later error or close
event.

Trial 4 adds no running-session timer, reasoning deadline, process supervisor,
automatic close, or D/0/01 behavior.

## TDD evidence

The smallest RED command was:

```bash
node --test \
  --test-name-pattern="spawn deadline reaches synchronous pre-promise launch work" \
  tests/gateway/lifecycle_service_ordering.test.js
```

Before production changes, the single test failed after approximately
112 milliseconds with `Missing expected rejection`: a 20-millisecond
configuration blocked for five configured timeout periods and returned a
valid launch. The complete file was **12 total, 10 passed, 2 failed**; its
second failure showed that the concrete `tmux` boundary exposed no injectable,
deadline-aware synchronous client.

After the minimum correction:

```bash
node --test tests/gateway/lifecycle_service_ordering.test.js
```

Result: **12/12 passed**. This includes the synchronous pre-promise timeout,
all three concrete supervised adapters, the pending-promise and late
resolve/reject cases, invalid resolved results, exact retries, and the
successful running-session lifetime characterization.

## Safe expanded verification

With live integration variables removed, the explicit safe bundle was:

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

Result: **155 total, 146 passed, nine exact live-PostgreSQL skips, and zero
failed**.

Additional gates:

- Gateway ESLint: passed.
- Structure suite: **222 passed, zero failed**.
- `git diff --check`: passed for both the Trial 4 and cumulative technical
  ranges.
- Redacted `gitleaks detect --pipe`: no leaks in either range.

The author lane did not run `scripts/ci.sh`, the complete Gateway suite,
`tmux_client` execution, an MCP server/smoke, or Redis tests. The integration
owner explicitly retained the full-CI gate so this lane would not start
`tmux`, MCP, or Redis processes. No full-CI claim is made by this request.

## Compatibility and isolation

- Trial 1's invalid-result compensation, Trial 2's PostgreSQL `BIGINT`
  correction, and Trial 3's asynchronous timeout and late-result handling
  remain covered and green.
- The synchronous tests use an injected in-process function; they create no
  agent, `tmux` session, MCP server, Redis client, live PostgreSQL connection,
  network request, or real provider call.
- During an earlier intermediate bundle, the inherited
  `tmux_client.test.js` was included accidentally. Its existing test created
  and removed one temporary `tmux` session in its own `finally` block. The
  incident was reported immediately, left no test session behind, and that
  file was explicitly excluded from every subsequent/final bundle.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
  No `message.*` schema, handler, or persistence path changed.
- `gateway/src/core/audit.js`, coordination transport, and the
  `agents:events` contract are unchanged. No dependency manifest or policy
  file changed.

## Requested independent review

Please return `OK` or `KO` against the exact technical candidate and verify,
in particular:

1. the absolute deadline exists before concrete adapter invocation and every
   supervised synchronous `tmux` primitive receives only its remaining
   budget;
2. synchronous timeout cannot settle a persistent launch as `running` or
   leave its lifecycle reservation in `starting`;
3. timeout produces one atomic failed settlement, one evidence row per
   entity, one service error audit, no misleading session lifecycle event,
   and no relaunch on exact retry;
4. pending asynchronous adapters and late resolve/reject results retain the
   Trial 3 behavior;
5. a valid spawn ends startup deadline responsibility and installs no
   persistent lifetime or reasoning deadline;
6. invalid-result compensation, PostgreSQL safe-integer width, reducer/CAS
   ownership, idempotency, monotonic terminals, and cross-scope denial remain
   intact; and
7. `message.*`, `agents:events`, dependencies, policy, Redis, MCP, supervisor,
   and D/0/01 scope remain unchanged.

---

# Independent Review — V5 C/1/00 Trial 4

## Verdict

**KO**

**GPT-5.6 Sol, razonamiento ultra, servicio Priority/Fast solicitado**.

Trial 4 closes the concrete `tmux`-primitive gap identified in Trial 3:
the service creates an absolute deadline before invoking the adapter, and
Codex, Claude, and Gemini give the remaining budget to availability,
`new-session`, and `send-keys`. The candidate still permits a timeout to
publish `SESSION_STARTED` before the server rejects that same launch and
settles it as failed. That contradicts the submitted no-misleading-event
requirement.

## Candidate reviewed

- Branch: `feat/V5-C-1-00-lifecycle`.
- Original technical base:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071`.
- Trial 3 independent `KO` / Trial 4 correction base:
  `5c3dddcacdb899112e48333e4d8e49bae2603467`.
- Trial 4 technical commit:
  `059fa62ad4e3f782e6185db72b8f0a4d29eb10ce`.
- Trial 4 technical tree:
  `9271ab8838ed76ec1b12b473e158a3160cd10c7c`.
- Trial 4 request commit:
  `639a2836c2f9fa2e7cd7d423dcb806656a047523`.
- Trial 4 request tree:
  `1c268dcf3e2b873f9e442a0973efdb45cda1b5e1`.
- The candidate is the direct child of the Trial 3 verdict, and the request
  is the direct child of the candidate.
- The Trial 4 correction contains 10 files, 494 insertions, and 52 deletions.
  The cumulative technical range contains 53 files, 5,565 insertions, and
  269 deletions. Request-versus-candidate adds only this append-only review
  file.

## Blocking finding

### `SESSION_STARTED` can precede a server-owned timeout settlement

The service computes the deadline before invoking the adapter, but it checks
the post-adapter remainder only after `adapter[mode](...)` returns
(`gateway/src/services/agent_service.js:293`–`324`). Each concrete adapter
instead writes `SESSION_STARTED` after its `tmux` calls and before returning
to that service check:

- Codex: `gateway/src/adapters/codex_adapter.js:313`–`340`;
- Claude: `gateway/src/adapters/claude_adapter.js:226`–`246`; and
- Gemini: `gateway/src/adapters/gemini_adapter.js:149`–`175`.

`tmux_client` correctly checks the deadline after each primitive
(`gateway/src/adapters/tmux_client.js:36`–`70`), but synchronous work between
the final check and the service's remainder check can consume the last
budget. `auditAppend` itself performs synchronous JSONL publication and may
invoke the configured best-effort publisher before returning. Once that work
crosses the deadline, the service reports `TIMEOUT` and settles failure even
though the adapter has already persisted and published `SESSION_STARTED`.

A deterministic independent probe used:

- `agentTimeoutMs=10`;
- the real Codex, Claude, and Gemini adapter classes;
- an injected in-process `tmux` boundary returning success for all three
  primitives; and
- an in-memory audit publisher that delayed only `SESSION_STARTED` by 30 ms.

No process, `tmux` session, Redis client, or network service was started. All
three adapters produced the same result:

```text
first call                  TIMEOUT
exact retry                 LIFECYCLE_LAUNCH_FAILED
session/task                error / pending
tmux primitive calls        3 total; no retry calls
launch_failed evidence      1 session + 1 task
audit event order           AGENT_MODEL_RESOLVED, SESSION_STARTED, ERROR
```

Thus settlement, evidence cardinality, the single service error audit, and
exact retry are correct, but the lifecycle event is false: the authoritative
state is failed while `SESSION_STARTED` says the supervised session started.

A second probe without the artificial audit delay ran 500 Codex launches
with a valid 1 ms configured timeout and the same process-free `tmux`
boundary. It observed 464 accepted launches, 30 timeouts before a start
event, and **6 timeouts after `SESSION_STARTED`**. The defect is therefore a
real boundary race, not only the deterministic publisher construction.

Required correction:

- establish one authoritative completion boundary: a start event must not be
  persisted or published while the service can still reject the same launch
  for its startup deadline;
- cover Codex, Claude, and Gemini with a deterministic post-`tmux`,
  pre-service-return delay and prove a timed-out launch has zero
  `SESSION_STARTED`/`SESSION_CLOSED` events; and
- preserve the current one-time atomic failure settlement, one evidence row
  per entity, one service error audit, exact retry, and late-promise handling.

The correction must not add a running-session lifetime/reasoning timeout,
change the `agents:events` contract, or absorb D/0/01 supervision scope.

## Verified corrections and invariants

- The absolute deadline is created before adapter invocation.
- Codex, Claude, and Gemini use that same deadline for `tmux -V`,
  `new-session`, and `send-keys`; each primitive receives a positive
  remaining timeout no larger than `agentTimeoutMs`.
- Returned and thrown native `ETIMEDOUT` values normalize to the established
  `TIMEOUT` error before the adapter's normal start-event path.
- Primitive timeout and pending-promise timeout settle once to
  `session=error` and `task=pending`, record one `launch_failed` row per
  entity, emit one service `ERROR`, and do not relaunch on exact retry.
- Late asynchronous resolution/rejection remains inert, and a valid accepted
  launch installs no session-lifetime or reasoning deadline.
- Trial 1 invalid-result compensation, Trial 2 PostgreSQL `BIGINT`
  compatibility, reducer ownership, optimistic CAS, idempotency, terminal
  monotonicity, atomic bundles, and cross-scope denial remain green.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
  Message schemas/envelopes passed their compatibility tests.
- The cumulative technical diff does not change `gateway/src/core/audit.js`,
  policies, dependency manifests, coordination transport, the
  `agents:events` contract, or `plan/PROJECT_V5/D/0/01.md`.

## Independent verification

- Safe lifecycle/schema/migration/service/adapter bundle:
  **155 total, 146 passed, 9 exact live-PostgreSQL skips, 0 failed**.
- Safe message/catalog/audit compatibility bundle:
  **45 passed, 0 skipped, 0 failed**.
- Structure suite with locked `pytest==9.0.3` and `PyYAML==6.0.3`:
  **222 passed, 0 failed**. The first collection attempt used only pytest and
  stopped before tests with three missing-`yaml` import errors; the locked
  offline rerun supplied that declared dependency and passed.
- Gateway ESLint: passed.
- `git diff --check`: passed for the Trial 4 correction and cumulative
  technical ranges.
- Redacted `gitleaks detect --pipe`: passed for both ranges, with no leaks.
- Independent three-adapter delayed-audit probe: exposed the blocking false
  `SESSION_STARTED` sequence above.
- Independent 500-launch tight-deadline probe: exposed 6 additional false
  start events.

No real agent, `tmux`, MCP server, Redis service/client, live PostgreSQL,
network service, or provider was used. Full CI and live/integration gates were
not run and remain the integration owner's responsibility.

## Trial disposition

Trial 4 is **KO**. Preserve the bounded synchronous primitives and every
previously validated correction, then make the start event consistent with
the server-owned deadline and atomic lifecycle settlement in a new
append-only trial. This verdict does not integrate, promote, release, modify
the technical candidate, or expand D/0/01.
