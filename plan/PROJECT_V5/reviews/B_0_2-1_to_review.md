# Review Submission - Task B/0/02 (Trial 1)

## What was done

- Added `createOrchestratorCoordinationClient` with the public lifecycle API
  `start`, `invoke`, `getStatus`, and `stop`.
- Added status-first registration, jittered heartbeat, finite exponential
  heartbeat retry, bounded lease-loss re-registration, and epoch/single-flight
  fencing.
- Restricted managed invocation to `discover`, `send`, `receive`, and `ack`;
  the profile injects its private credentials and never retries an action.
- Added safe state/status projection and best-effort cleanup for current and
  late registrations without exposing registration secrets.
- Reconciled the direct-access documentation, architecture, accepted V5 ADR,
  runbook, and B/0/02 planning state with the implementation.

## Why

- A raw registration expires unless every orchestrator schedules heartbeat
  itself. The managed profile keeps presence alive across normal reasoning
  turns and recovers a known lost lease without silently duplicating a caller
  action.
- Finite retry and terminal stop behavior avoid infinite background work and
  ambiguous recovery.

## Decisions Taken

- The initial state is `stopped`, but a client instance can be started only
  once. Calling `stop` is terminal; recovery after exhaustion uses a new
  instance.
- Heartbeat defaults to 50% of the effective lease with ±10% jitter
  (40–60%); configuration permits at most ±25%.
- `retry.maxAttempts` counts the total attempts in one heartbeat or
  re-registration episode. Backoff doubles from `baseDelayMs` and is capped by
  `maxDelayMs`.
- Only authentication, expiry, and lease-fence errors initiate replacement.
  Other heartbeat errors retry the current identity and end in `degraded`.
- A lease-loss action rejects with its safe code while one background rejoin
  begins. The action is never replayed.
- `getStatus` exposes safe identity/timing fields, state, retry metadata, safe
  code, and recovery guidance; it omits token, metadata, queue, and raw error
  text.

## TDD Evidence

- RED: `node --test tests/gateway/coordination_client.test.js` - failed with
  `ERR_MODULE_NOT_FOUND` for `gateway/src/coordination_client.js`.
- GREEN: `node --test tests/gateway/coordination_client.test.js` - 9 passed,
  0 failed.
- Regression:
  `node --test tests/gateway/coordination_client.test.js tests/gateway/coordination_service_lifecycle.test.js tests/gateway/coordination_surface_parity.test.js tests/gateway/coordination_factory.test.js`
  - 30 passed, 0 failed.

## Verification

- `env -u AGENTS_REDIS_URL -u AGENTS_COORDINATION_REDIS_URL -u AGENTS_TEST_REDIS_URL uv run --offline --no-project --with ruff bash -c 'export PATH="$PATH:/home/carase/git/personal/agents-orchestrator/.venv/bin"; bash scripts/ci.sh'`
  - passed offline: structure 143/143; Gateway 678 total, 663 passed and 15
    declared skips; E2E 25 total, 24 passed and 1 declared skip; CLI 29/29;
    LangGraph 84 total, 81 passed and 3 declared skips; lint, MCP smoke, and
    policy validation passed.
- `git diff --cached --check` - passed before commit.
- High-confidence secret-signature scan over the staged diff - no match.
- Restricted-surface diff check - `message.*`, `agents:events` implementation,
  MCP registry/tools, `policies/`, and the root README were unchanged.
- No real Redis or MCP process was contacted, restarted, or stopped.

## Review Focus

- Validate state transitions and the finite retry counts.
- Validate that concurrent lease-loss paths cannot create more than one
  replacement identity.
- Validate stop/rejoin epoch races and cleanup of a registration that resolves
  after stop.
- Validate that no status or error projection can contain the plaintext lease
  token.
- Validate that action calls are exactly-once from the profile's perspective.

## Commit

- `8628201` - `feat(coordination): add self-renewing orchestrator client (V5 B/0/02)`
