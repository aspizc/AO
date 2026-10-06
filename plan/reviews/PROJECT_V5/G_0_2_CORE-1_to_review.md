# Review Submission — Project V5 G/0/02 CORE (Trial 1)

## Review requested

Independent, evidence-based review is requested for the frozen technical range
ending at `49b56cda178073e940a563e79ae1076bd7cb562d`.

This is a request only. It does not contain or imply an automatic verdict,
integration, promotion, or full-sheet completion claim.

## What was implemented

- A standalone abortable coordination consumer runner over an injected,
  already-authenticated receive/ACK transport.
- A canonical fixed-size consume key derived only from protocol, scope, sender,
  recipient, and message ID; it never includes body or delivery ID.
- A receipt state machine with monotonically replaced claim tokens, stale-claim
  recovery, handler-attempt accounting, committed effect/quarantine outcomes,
  per-delivery ACK tracking, and separately token-fenced replay claims.
- An explicit idempotent business-handler contract keyed by `consumeKey`.
- Deterministic exponential retry with injected clock/sleep, an exact delay
  cap, a finite handler-attempt cap, one attempt for permanent failures, and
  explicit startup ceilings for every loop/lease/delay control.
- Body-safe poison handling through an injected quarantine vault that returns
  an opaque locator. Quarantine metadata commits before transport ACK.
- Fail-closed vault exhaustion: the receipt becomes `quarantine_blocked`, the
  delivery remains pending, status becomes `degraded`, and the runner returns
  without another receive or a poison reclaim loop.
- Exact replay domain logic gated by an injected server authorizer whose
  decision must bind command ID, quarantine ID, consume key, decision ID, and
  principal ID. Distinct authorized command IDs converge on one committed
  handler effect. Replay context is revalidated after authorization and before
  body load or handler execution.
- A recursively frozen, fixed-shape status DTO containing only state,
  in-flight, a safe error code, and eight saturating counters.
- A task-owned ADR that freezes the standalone contract and its dependency
  limits.

## Security and failure-order decisions

### Exact effect and ACK order

```text
receive
  -> claim with ownerId + claimToken
  -> durable/idempotent handler by consumeKey
  -> commit effect receipt OR quarantine receipt
  -> transport ACK
  -> record ACK completion
```

- A stale owner cannot mutate a receipt after the claim token changes, even if
  a restarted process reuses the same owner ID.
- Replay claims use an independent monotonically replaced token, so a stale
  same-owner replay cannot commit or record failure after reclaim.
- A crash after the effect but before the receipt can re-enter the handler only
  with the same consume key; the handler contract must return its prior durable
  commit.
- A crash or transport error after receipt commit replays only ACK.
- ACK is never called for an uncommitted effect, uncommitted quarantine,
  blocked vault, handler that aborts before returning a committed result, or
  busy claim.
- Once the handler returns a valid `committed` result, the result is
  authoritative: receipt commit and ACK finish even if abort was concurrently
  signaled. This closes rather than reopens the effect/receipt crash window.
- `ackedCount: 0` is valid only for the unchanged service contract's exact
  tombstone retry after an earlier ACK; an unknown delivery throws.
- Fault seams cover `afterClaim`, `beforeEffect`, `afterEffect`,
  `afterReceipt`, `beforeAck`, and `afterAck`.

### Body and authority boundary

- The body reaches only the business handler and injected vault.
- Receipt metadata, results, public errors, audit, metrics, status, consume
  keys, and replay authorization projections exclude the body and raw errors.
- Hostile/structured locator returns are rejected; only one bounded safe
  locator field is accepted and retained in repository-private quarantine
  state, not public receipt or replay-authorizer projections.
- Receipt metadata is a closed, bounded scalar schema. Nested, unknown,
  body-bearing, or wrong-typed fields fail before storage.
- Public dependency error codes are closed to the consumer namespace and
  known coordination/network codes; arbitrary values such as `TOKEN_*`
  collapse to a fixed operation fallback.
- Expected scope and recipient are configured server-side and checked before
  the handler. Trace/correlation identifiers must be bounded safe identifiers.
- Message body claims, participant capabilities, and caller-supplied
  `authorized` fields cannot grant replay.
- The body is loaded only after the exact server decision is validated.
- Busy claims use abort-aware idle delay rather than immediately polling
  receive again, and the default sleep removes abort listeners on every
  resolution/rejection.

## Durability boundary and dependency-gated work

The exported in-memory repository advertises exactly:

```json
{
  "durable": false,
  "atomicWithBusinessEffect": false,
  "bodyStorage": false,
  "purpose": "deterministic-conformance-only"
}
```

It is deterministic conformance evidence, not a production store. Honest
completion of the full `G/0/02` sheet still requires:

- a durable repository adapter and migration preserving claim-token CAS,
  outcome transitions, and replay uniqueness;
- a handler/store composition that atomically commits the effect and receipt,
  or durably returns the prior effect by consume key after a crash;
- a real durable body vault adapter;
- direct service/lifecycle composition;
- Redis crash/reclaim integration;
- and health/inventory wiring consuming the bounded DTO.

Those dependencies require shared or explicitly excluded paths. This core
freezes their ports and does not simulate them. It makes no production
durability, cross-process atomicity, live Redis, health wiring, or full
`G/0/02` acceptance claim.

## TDD evidence

### RED 1

Commit:

- `9940b2a848c84036190b06d9787db604f05f39cd` —
  `test(consumer): define G/0/02 core contract (RED)`

Command:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer.test.js
```

Expected result:

- failed before production existed with `ERR_MODULE_NOT_FOUND` for
  `gateway/src/core/coordination_consumer.js`;
- no production path was present in the commit.

### RED 2 — precheck race expansion

Commit:

- `ff29519b1da60083cc27146280430825568a1610` —
  `test(consumer): fence G/0/02 failure races (RED)`

The test-only expansion fixed claim epochs, outcome-before-ACK, ACK failure,
additional crash seams, exact capped backoff, permanent failure, real runner
pause, hostile leak canaries, multi-command replay convergence, receive/sleep
abort, deep status freezing, and explicit in-memory non-durability. The same
directed command remained red with the same missing-core error before GREEN.

### GREEN

Initial technical commit:

- `0a0253119681215b691b37a8fd006d2d17d6f0dc` —
  `feat(consumer): add bounded coordination processing core (G/0/02 CORE)`

Directed consumer command:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer.test.js
```

Result:

- **24 passed / 0 failed / 0 skipped**.

The cases cover canonical body-free keys; transient and permanent
classification; exact delay cap; attempt cap; duplicate deliveries; stale
same-owner fencing; crash seams; ACK error and tombstone-style retry; malformed
envelopes; scope/recipient/trace mismatch; shutdown; receive/retry abort;
vault exhaustion and actual runner pause; hostile body/locator/error canaries;
server-authorized exact replay; distinct replay command convergence; and
bounded recursively frozen status.

### RED 3 — independent precheck closure

Commit:

- `90b0fcc6d92b8ce7696a2a0eee9f69cbe3ef0b5e` —
  `test(consumer): close G/0/02 precheck gaps (RED)`

The test-only amendment produced **25 passed / 8 failed**. Its eight expected
failures exposed:

- same-owner stale replay commit/failure without a replay claim token;
- hot receive after a busy processing claim;
- a locator crossing public receipt and replay-authorization projections;
- receipt metadata accepting an open/unbounded shape;
- arbitrary dependency error codes crossing the public boundary;
- missing startup ceilings for attempts, delays, leases, and polling;
- accumulated abort listeners in the default sleep; and
- missing replay context revalidation before body load/handler execution.

The amendment also pinned two reviewed positive contracts that already passed:
an exact `ackedCount: 0` tombstone retry after a successful ACK, and completion
of receipt/ACK after the handler has already returned `committed` despite a
concurrent abort.

### GREEN correction

Technical correction commit:

- `49b56cda178073e940a563e79ae1076bd7cb562d` —
  `fix(consumer): close G/0/02 precheck races`

The correction added replay claim-token CAS, busy-claim delay, closed metadata
and error-code projections, private locator handling, explicit operational
caps, abort-listener cleanup, and post-authorization replay context
revalidation. The final directed consumer command passed:

- **33 passed / 0 failed / 0 skipped**.

## Directed regression verification

Explicit consumer plus unchanged direct-service receive/ACK contracts:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_service_receive.test.js \
  tests/gateway/coordination_service_ack.test.js
```

- **50 passed / 0 failed / 0 skipped**.

Directed ESLint:

```text
/tmp/agents-orchestrator-v5-wave2-integration/gateway/node_modules/.bin/eslint \
  --config \
  /tmp/agents-orchestrator-v5-wave2-integration/gateway/eslint.config.js \
  gateway/src/core/coordination_consumer.js \
  gateway/src/core/repositories/coordination_consumer_repo.js \
  tests/gateway/coordination_consumer.test.js
```

- passed with the repository's lock-matched ESLint **10.8.0** binary;
- no npm command or dependency installation was run.

Explicit structure checks:

```text
python -m pytest -q \
  tests/structure/test_project_layout.py \
  tests/structure/test_v5_coordination_docs.py
```

- **11 passed** with Python **3.13.13**, pytest **9.0.3**.

Diff and leak checks:

- `git diff --check
  d441097c81a3264a717faae43e318c3e525070d0..49b56cda178073e940a563e79ae1076bd7cb562d`
  — passed.
- `gitleaks detect --redact --no-banner
  --log-opts=d441097c81a3264a717faae43e318c3e525070d0..49b56cda178073e940a563e79ae1076bd7cb562d`
  scanned all five commits — no leaks found.
- Leak canaries additionally assert that bodies, hostile locators, and raw
  exception text do not enter result/status/audit/metrics/public errors.

Runtime identity:

- Node **22.22.1**.

## Frozen identity and scope

- Exact base:
  `d441097c81a3264a717faae43e318c3e525070d0`
- Base tree:
  `2009cebac66539ee7850d78bacabe83d085db18e`
- RED 1:
  `9940b2a848c84036190b06d9787db604f05f39cd`
- RED 2:
  `ff29519b1da60083cc27146280430825568a1610`
- Initial technical commit:
  `0a0253119681215b691b37a8fd006d2d17d6f0dc`
- RED 3:
  `90b0fcc6d92b8ce7696a2a0eee9f69cbe3ef0b5e`
- Final technical commit:
  `49b56cda178073e940a563e79ae1076bd7cb562d`
- Technical tree:
  `880455aa665a5eac293147a561e727db6ea41594`
- Technical range:
  `d441097c81a3264a717faae43e318c3e525070d0..49b56cda178073e940a563e79ae1076bd7cb562d`
- Range identity:
  **5 commits / 4 files / 3,461 insertions / 0 deletions**
- Branch:
  `feat/V5-G-0-02-consumer`
- Worktree:
  `/tmp/agents-orchestrator-v5-g002.MsiMXe/worktree`

The technical range changes exactly:

- `gateway/src/core/coordination_consumer.js`
- `gateway/src/core/repositories/coordination_consumer_repo.js`
- `tests/gateway/coordination_consumer.test.js`
- `docs/adr/ADR-V5-G-0-02-coordination-consumer-core.md`

It does not change `coordination_queue.js`, any `coordination_service*` file,
Redis lifecycle/client code, MCP/tools/catalog/config/health code, migrations,
shared repositories, adapters/providers, manifests, workflows, locks, indexes,
README/plan sheets, `agents:events`, or legacy `message.*`.

No Redis, MCP, tmux, network, provider, live-agent, aggregate npm test,
`scripts/ci.sh`, integration, promotion, or release command was run. The final
inventory found no consumer-test process and no task-owned temporary path.

## Review focus

- Verify that claim tokens prevent a stale incarnation from committing or
  reaching ACK after reclaim, and that replay claim tokens similarly fence
  same-owner stale replay commit/failure.
- Verify every effect/quarantine path commits its receipt outcome before ACK,
  and that ACK failure/redelivery never re-enters the handler.
- Verify the reviewed abort split: abort before a committed handler result
  releases without ACK, while a result already returned as `committed`
  completes receipt and ACK.
- Verify zero ACK is accepted only as the direct service's exact tombstone
  retry and not as success for an unknown delivery.
- Verify vault exhaustion pauses the actual run loop without ACK or another
  receive, and that a busy receipt delays rather than hot-polling receive.
- Verify bodies/raw errors cannot reach receipt/result/status/audit/metrics,
  including hostile locator, closed metadata, and public-error paths.
- Verify replay authority binds the exact server decision and distinct
  authorized command IDs still converge on one business effect; confirm
  context is revalidated and the opaque locator is absent from authorization.
- Verify explicit operational ceilings and abort-listener cleanup keep all
  retry/polling behavior bounded.
- Verify the in-memory descriptor and ADR make the missing production
  durability/atomicity explicit.
- Confirm the submission remains a standalone core and does not claim service,
  Redis, health, or full-sheet completion.

Independent review is requested. No automatic review or integration follows
from this file.
