# Independent Review — Project V5 G/0/01 Trial 2

## Verdict

**KO** for technical candidate
`f1efbf6c1957e482ec67e60fb89f996d74f41d5a`.

The shutdown epoch correctly fixes the three exact Trial 1 repros, but one
remaining **P1** in connection-state handling breaks both concurrent lazy
connect and the promised late-connect cleanup. The implementation treats
`client.isOpen` as proof that `connect()` completed. The locked
`@redis/client` 6.1.0 dependency sets `isOpen` to `true` before its handshake
is ready, so this assumption is false for the production client.

This verdict does not amend implementation or request history, integrate or
promote the candidate, or mark G/0/01 complete.

## Reviewer execution request

- Requested model: **GPT-5.6 Sol**
- Requested reasoning effort: **ultra**
- Requested service: **Priority/Fast**

The review environment does not expose independently verifiable evidence of
the effective service tier. This report records the requested configuration
and does not claim that a particular tier was actually applied.

Review date: 2026-07-26.

## Reviewed identity and scope

- Branch: `feat/V5-G-0-01-redis-lifecycle`
- Trial 1 KO parent:
  `47a0e21ccad44a43cd7fd9389943da1f10f5fc03`
- Trial 2 technical commit:
  `f1efbf6c1957e482ec67e60fb89f996d74f41d5a`
- Trial 2 technical tree:
  `ad0ce3673fa65adfd436eeaf461ceae9c44f54ad`
- Trial 2 request-only commit:
  `c564322f60e042a38b17e9baec7fe11a11346b90`
- Trial 2 request-only tree:
  `ca351464560f29648fa2a9b0b91eb329c79adcc6`

The technical commit is the direct child of the Trial 1 KO. The request-only
commit is the direct child of the technical commit and adds only
`plan/reviews/PROJECT_V5/G_0_1-2_review.md`.

## Blocking finding

### P1 — `isOpen` is not a completed-connect fence

Affected implementation:

- `gateway/src/core/redis_client_lifecycle.js:251-259` checks
  `client.isOpen` before the existing `#connectPromise`. A second operation
  can therefore bypass an in-flight connect and receive a client which is open
  but not ready.
- `gateway/src/core/redis_client_lifecycle.js:294-301` performs the intended
  post-connect close check, but delegates cleanup to the same state
  classification below.
- `gateway/src/core/redis_client_lifecycle.js:333-354` records a destroy as
  `afterOpen` solely from `client.isOpen`. A destroy attempted while the
  handshake is still pending can therefore suppress the required destroy
  after `connect()` actually completes.

The production dependency behavior is unambiguous:

```json
{"immediatelyAfterConnect":{"isOpen":true,"isReady":false}}
{"afterDestroy":{"isOpen":false,"isReady":false}}
```

That probe used the lock-matched `@redis/client` 6.1.0 package and an
unreachable loopback port. Its socket implementation sets `isOpen = true`
before awaiting the connection/handshake. With `disableOfflineQueue: true`,
`sendCommand()` rejects while `isReady` is false.

Two independent harnesses reproduced the resulting failures.

#### Real locked-client concurrent-connect repro

A loopback-only TCP listener accepted the socket and intentionally held the
RESP handshake without replying. The first `queue.ping()` remained inside
`connect()`, with the actual node-redis client reporting
`{isOpen: true, isReady: false}`. A second `queue.ping()` should have joined
the existing `#connectPromise`; instead it dispatched immediately and rejected
`COORDINATION_UNAVAILABLE`.

The repro failed identically in three consecutive runs:

```json
{
  "expectedSecondOutcomeBeforeHandshake": "pending",
  "actualSecondOutcomeBeforeHandshake": "rejected"
}
```

This also invalidates the shared in-flight client, so a normal burst during
lazy startup can fail callers instead of coalescing one connection attempt.

#### Redis-like ignored-destroy repro

A deterministic fake mirrored node-redis state transitions by setting
`isOpen=true` when `connect()` started and `isReady=true` only when its gated
handshake completed. It ignored `destroy()` while not ready, as required by
the pathological cleanup focus inherited from Trial 1.

After the close deadline and later handshake completion, all three runs
observed:

```json
{
  "isOpen": true,
  "isReady": true,
  "destroyCalls": 1,
  "listenerCount": 0,
  "lifecycle": {
    "state": "closed",
    "active": 0,
    "queued": 0,
    "capacity": 64,
    "queueLimit": 256
  }
}
```

The lane looks closed and has detached its listener, but the client is open
and ready. The expected second, post-connect destroy never occurs because the
first attempt was already recorded as `afterOpen`.

The committed late-connect regression does not catch this: its fake keeps
`isOpen=false` for the entire pending `connect()`, unlike node-redis. It proves
the new `beforeOpen` branch but not the production client's connecting state.

Impact:

- concurrent operations during a normal lazy connect can fail rather than
  coalescing behind the single connect;
- one premature operation can invalidate the client used by all callers in
  that connect wave;
- a delayed/ignored destroy during the production-shaped connecting state can
  leave a live socket after `close()` reports success; and
- the ADR and runbooks promise post-connect cleanup which this state machine
  does not enforce.

This is P1 because G/0/01 explicitly requires coalesced concurrent connect,
bounded shutdown with no remaining handles, and deterministic late-connect
cleanup.

Required correction:

1. Treat the lane-owned in-flight connect promise as authoritative before
   considering a client reusable. Do not infer readiness from `isOpen`;
   either track successful connect completion in the lane or require the
   appropriate readiness state.
2. Track cleanup attempts by connection phase, not only by `isOpen`, or force
   one cleanup after an awaited connect returns when the lane is closing,
   closed, or no longer owns that client.
3. Add deterministic regressions for the actual
   `isOpen=true/isReady=false` interval:
   - a second operation must wait for the first connect and must not dispatch;
   - a destroy ignored during that interval must not suppress post-connect
     destruction; and
   - both callers and lifecycle/client/listener state must settle cleanly
     without replay or unhandled outcomes.

## Trial 1 corrections confirmed

- An ignored blocking command is logically cancelled at the close deadline.
  Its caller receives `COORDINATION_UNAVAILABLE`, the lane reports zero active
  and queued operations, and a late rejection is consumed.
- A successful `GET` result arriving after the close deadline cannot cross the
  shutdown epoch; it is dispatched once and is not replayed.
- The committed fake-client case where `isOpen` remains false during connect
  receives a second destroy after the gate opens.
- The epoch/set accounting is race-safe for settle-versus-cancel ordering:
  a removed active entry cannot settle its caller twice, queued work is
  rejected on close, and idle waiters are cleared.
- Command and blocking lanes retain separate ownership and bounded queues.
- A failed dispatched operation is not retried; only a later operation creates
  the replacement connection.
- Factory, registry, stdin, signal, and double-close ownership tests remain
  green.
- No correction-range change entered `gateway/src/tools/message.js`,
  `gateway/src/core/audit.js`,
  `gateway/src/services/coordination_service.js`,
  `gateway/src/tools/coordination.js`, or
  `gateway/src/tools/catalog.js`.

## Independent verification

| Check | Result |
|---|---|
| Exact commit/tree/parent and request-only path verification | passed |
| Selected lifecycle/queue/factory/process/registry/bootstrap group | 40 passed; 0 failed; 0 skipped |
| Committed lifecycle fault file stress | 20/20 executions passed; 10 tests per execution |
| Locked node-redis stalled-handshake repro | failed the required behavior 3/3; second operation rejected before handshake |
| Production-shaped Redis-like connect/destroy repro | failed the required behavior 3/3; open client remained after close |
| `npm --prefix gateway test` | 747 tests; 728 passed; 19 expected service-gated skips; 0 failed |
| Repository-venv `python -m pytest -q tests/structure` | 290 passed |
| `npm --prefix gateway run lint` | exit 0 |
| `python scripts/ci_gate.py --repo-root . --validate-only` | `status: passed`; zero errors |
| Complete required live lane on isolated Redis 7.4.9 | 10 passed; 0 skipped; 0 failed |
| Isolated Redis database/prefix after the live lane | zero keys |
| `git diff --check` on technical and request ranges | passed |
| Redacted gitleaks scan of technical range | 1 commit scanned; no leaks |
| Redacted gitleaks scan of request range | 1 commit scanned; no leaks |
| Legacy `message.js` SHA-256 at KO parent and candidate | `6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac` |

The 19 full-Gateway skips are the expected service-gated cases in the ordinary
non-live invocation. The separately isolated Redis lane had no skips.

## Documentation assessment

Status documents correctly keep G/0/01 implemented-but-unreviewed and preserve
the Trial 1 KO. However, the new operational claims that a connection
finishing after close is necessarily destroyed again are not true for the
production-shaped connecting state. They must remain pending and be reconciled
with the Trial 3 implementation.

## Safety and cleanup

- Live verification used only the disposable container
  `g001-review2-c564322-0726`, Redis 7.4.9, database 15, a dynamically assigned
  loopback port, and test-owned prefixes.
- Before removal, database 15 and the test namespace both contained zero keys.
  The reviewer container was then removed.
- The real-client handshake repro used only a temporary loopback TCP listener;
  it contacted no Redis service.
- The existing shared `kya-coord-redis` container remained running on
  `127.0.0.1:6379`; it was not contacted, restarted, stopped, flushed, or
  reconfigured. No shared MCP process was contacted or restarted.
- No `FLUSHDB`, shared stream, external network, delegated agent, tmux session,
  push, amend, integration, promotion, or release operation was used.
- Temporary harnesses, logs, and the lock-matched dependency symlink were
  removed before the result-only commit.

Trial 2 is independently **KO**. A Trial 3 correction is required before
G/0/01 can receive an OK review.
