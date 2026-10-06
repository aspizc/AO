# Independent Review — Project V5 G/0/01 Trial 1

## Verdict

**KO** for technical candidate
`bc8d740856574dedaa3c79539a195308483c86fb`.

One reproducible **P1** remains in the shutdown boundary. The healthy path,
admission bounds, no-replay behavior, ownership chain, Redis 7 lane, and MCP
signal cleanup pass, but a delayed or ignored transport destroy can outlive the
declared close deadline, reopen an already closed lane, or return a successful
command result after the queue reports `closed`. This violates the sheet's
bounded cancellation and no-leak acceptance criterion and the explicit Trial 1
review focus.

This verdict does not amend the implementation, integrate or promote the
candidate, or change the sheet's current state.

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
- Required parent:
  `672b5975b051f0139b4f60a4754f0dbb1f5614de`
- Technical commit:
  `bc8d740856574dedaa3c79539a195308483c86fb`
- Technical tree:
  `42d1c9fffdc030200bf205c70ab2fa6ff368b682`
- Request-only commit:
  `91bb7572da91ced86666fa276b3c468289af4cbe`
- Request-only tree:
  `536c3898db3a02a5e9db5e67f2a511109458e16b`

The technical commit is the direct child of the required parent. The
request-only commit is the direct child of the technical commit and changes
only `plan/reviews/PROJECT_V5/G_0_1-1_review.md`. The technical range contains
one commit and 37 paths, with 1,462 insertions and 129 deletions.

## Blocking finding

### P1 — Close is not a cancellation or ownership fence when destroy is delayed or ignored

Affected implementation:

- `gateway/src/core/redis_client_lifecycle.js:120-136` waits for active work
  only until the deadline, invokes client invalidation, marks the lane closed,
  and resolves `close()`.
- `gateway/src/core/redis_client_lifecycle.js:151-159` returns an operation's
  eventual result without a post-close epoch or cancellation check.
- `gateway/src/core/redis_client_lifecycle.js:213-235` detects a late connect
  after close and asks to destroy that client again.
- `gateway/src/core/redis_client_lifecycle.js:240-263` records a client in
  `#destroyedClients` before calling `destroy()`, so the late-connect destroy
  is suppressed even if the first destroy happened before the connection
  opened.

An independent temporary fake-client harness reproduced three manifestations:

1. A blocking `sendCommand()` stayed pending while `destroy()` ignored
   cancellation. `close()` returned after 10 ms, rejected the queued receive,
   but the active receive remained pending and the lane reported
   `{ state: "closed", active: 1, queued: 0 }`.
2. A delayed `connect()` completed after close. The first destroy ran while
   the connection was still pending; after the connect gate was released, the
   client became open again. The late-connect path could not destroy it
   because the WeakSet already marked it destroyed. The observed state was
   `{ isOpen: true, destroyCalls: 1, listenerCount: 0 }`.
3. A dispatched `GET` ignored destroy and resolved after the deadline. Its
   caller received the successful participant object even though both the
   queue and command lane already reported `closed`.

The same harness first established the intended healthy behavior, so the
failure is not an admission-test artifact:

```json
{
  "commandBounds": {
    "admitted": 320,
    "rejectedAt": 321,
    "factoryCalls": 1,
    "connectCalls": 1
  },
  "blockingBoundsAndSeparation": {
    "admitted": 33,
    "rejectedAt": 34,
    "kinds": ["blocking", "command"]
  },
  "noReplayThenReconnect": {
    "failedDispatches": 1,
    "factories": 2,
    "replacementConnects": 1
  },
  "pathologicalDestroy": {
    "activeOutcome": "still-pending",
    "lifecycleAtBound": {
      "state": "closed",
      "active": 1,
      "queued": 0,
      "capacity": 1,
      "queueLimit": 1
    }
  },
  "lateConnectReopensAfterClose": {
    "afterLateConnect": {
      "isOpen": true,
      "destroyCalls": 1,
      "listenerCount": 0
    }
  },
  "lateCommandCanSucceedAfterClose": {
    "result": {"participantId": "pt-late-success"},
    "queueState": "closed",
    "commandState": "closed"
  }
}
```

Impact:

- orderly MCP shutdown can report completion while an active caller or client
  is still retained;
- a late connection can leave a live Redis socket without its error listener,
  preventing process exit or surfacing an unhandled error; and
- a semantic command can become visible as successful after the shutdown
  deadline, contradicting the documented cancellation boundary.

This is P1 because G/0/01 is itself a P1 runtime-resilience sheet and its
acceptance criterion explicitly requires shutdown to drain or cancel within a
bound and leave no handles.

Required correction:

1. Give every admitted operation a lane-owned shutdown/epoch cancellation
   fence so the caller settles unavailable at the close deadline even if the
   transport promise does not settle; late results must be consumed but never
   returned as success.
2. Make late-connect cleanup state-aware. A destroy attempted before connect
   completion must not suppress the required destroy after a client actually
   opens.
3. Add deterministic regressions for an ignored blocking destroy, a connect
   that completes after close, and a command that resolves after the close
   deadline. Assert bounded caller settlement, zero active/queued work, closed
   clients, detached listeners, and no live handles.

## Confirmed behavior

- The command lane admits exactly 64 active plus 256 queued operations by
  default and rejects operation 321 without growing the queue.
- The blocking lane admits exactly one active plus 32 queued receives and
  rejects receive 34.
- Concurrent lazy connect is coalesced. Command and blocking lanes use separate
  owned clients, so a blocked receive does not starve command health.
- A transport failure after dispatch is attempted exactly once. The failed
  operation is not replayed, and a later 64-call wave shares one replacement
  connect.
- Healthy close rejects queued work, cancels a normal node-redis blocking read,
  detaches listeners, destroys each owned client once, and is idempotent.
- Independent direct factories and registries own separate clients; there is
  no process-global Redis singleton.
- With a normal transport, fresh MCP processes cleanly close on stdin end,
  `SIGINT`, and `SIGTERM`. Their exit codes were respectively 0, 130, and 143;
  each returned Redis client count to its pre-process baseline and left zero
  keys under its isolated prefix.
- Digest/scope fences, safe `COORDINATION_UNAVAILABLE` mapping, direct/MCP
  ownership, status/scope behavior, and public tool projections remain green
  in the focused, full Gateway, and live Redis suites.
- The technical range does not modify
  `gateway/src/services/coordination_service.js`,
  `gateway/src/tools/coordination.js`, `gateway/src/tools/catalog.js`,
  schemas, the legacy audit implementation, or
  `gateway/src/tools/message.js`.
- `gateway/src/tools/message.js` is byte-identical across the required parent,
  technical commit, and request commit:
  `6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
  No production `message.*` or `agents:events` behavior changed.
- Plan, ADR, runbook, status, and scope changes otherwise describe the
  implemented-but-not-reviewed state without claiming integration, promotion,
  release, or closure of G/0/02–04.

## Independent verification

| Check | Result |
|---|---|
| Focused config/factory/queue/lifecycle/process/registry/bootstrap group | 57 passed; 0 failed; 0 skipped |
| Independent admission/drop/pathological-shutdown harness | Healthy bounds/drop checks passed; the P1 states above reproduced twice |
| `npm --prefix gateway test` | 744 tests; 725 passed; 19 expected service-gated skips; 0 failed |
| Repository-venv `python -m pytest -q tests/structure` | 290 passed |
| `npm --prefix gateway run lint` with lock-matched dependencies | exit 0 |
| `python scripts/ci_gate.py --repo-root . --refresh-inventory` | passed; no manifest diff |
| `python scripts/ci_gate.py --repo-root . --validate-only` | `status: passed`; zero errors |
| `git diff --check` on parent-to-technical and technical-to-request | passed |
| Redacted gitleaks scan of parent-to-technical | 1 commit scanned; no leaks |
| Redacted gitleaks scan of technical-to-request | 1 commit scanned; no leaks |
| New lifecycle live test on isolated Redis 7.2.15 | 1 passed; 0 skipped; 0 failed |
| Complete required `tests/gateway/*_live.test.js` lane | 10 passed; 0 skipped; 0 failed |
| Healthy MCP stdin/SIGINT/SIGTERM process harness | exits 0/130/143; client count returned to baseline; zero prefix keys |
| Legacy `message.js` SHA-256 and unchanged contract paths | exact expected hash; no diff |

The 19 full-Gateway skips are the pre-existing service-gated cases in the
ordinary non-live invocation. The isolated required Redis lane had no skips.

## Safety and cleanup

- Live verification used only container
  `g001-review-91bb7572-01`, Redis 7.2.15, database 15, a dynamically assigned
  loopback port, and test-generated isolated prefixes.
- Before removal, that database reported zero keys, the
  `agents:test:v5:*` scan reported zero keys, and only the inspection client
  remained connected.
- The reviewer container was stopped and removed. The temporary dependency
  symlink, fake-client harnesses, MCP workspaces, and all isolated MCP
  processes were removed.
- The existing shared `kya-coord-redis` container remained running on
  `127.0.0.1:6379`; it was not contacted, restarted, stopped, flushed, or
  reconfigured. No shared MCP process was contacted or restarted.
- No `FLUSHDB`, external network, non-ephemeral/live shared database,
  delegated agent, shared/operator tmux session, push, amend, integration,
  promotion, or release operation was used. The required full Gateway suite
  created and immediately removed its own uniquely named `agtest-*` tmux test
  session through the test's `finally` cleanup.

Trial 1 is independently **KO**. A correction trial is required before
G/0/01 can receive an OK review.
