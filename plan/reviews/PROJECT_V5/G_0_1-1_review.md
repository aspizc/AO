# V5 G/0/01 — Trial 1 independent review request

Status: **implementation committed; independent verdict pending**.

No verdict is asserted by the implementation author. Please review the
technical commit and record an independent `OK` or `KO` without rewriting this
append-only request.

Requested reviewer execution label:
**«GPT-5.6 Sol, razonamiento ultra, servicio Priority/Fast solicitado»**.

## Identity

- Sheet: `G/0/01`
- Review id: `G_0_1`
- Branch: `feat/V5-G-0-01-redis-lifecycle`
- Required base:
  `672b5975b051f0139b4f60a4754f0dbb1f5614de`
- Technical commit:
  `bc8d740856574dedaa3c79539a195308483c86fb`
- Technical tree:
  `42d1c9fffdc030200bf205c70ab2fa6ff368b682`
- Review range:
  `672b5975b051f0139b4f60a4754f0dbb1f5614de..bc8d740856574dedaa3c79539a195308483c86fb`

## Outcome

- Replaces one Redis connection per operation with one persistent, lazy,
  service-owned command lane and one dedicated blocking lane.
- Coalesces concurrent connects and reconnect waves without replaying the
  operation whose transport failed.
- Bounds the command lane at 64 active plus 256 queued operations by default
  and the serialized blocking lane at 1 active plus 32 queued operations.
- Disables both the node-redis offline queue and automatic reconnect so
  application-level admission, reconnect, and no-retry semantics remain
  explicit.
- Adds safe lifecycle counters and idempotent bounded close behavior.
- Propagates ownership through the direct coordination service, tool registry,
  and MCP process shutdown on stdin end, `SIGINT`, or `SIGTERM`.
- Reconciles the Redis ADR, architecture, operator/product documentation,
  historical per-operation wording, V5 sheet, and indexes with the implemented
  lifecycle.
- Keeps `agents:events`, the legacy `message.*` implementation, and all public
  coordination tool projections unchanged.
- Keeps G/0/01 `in_progress`; review, integration, and promotion remain pending.

## TDD evidence

### RED

The first six lifecycle scenarios all failed against the base:

```text
6 tests; 0 passed; 6 failed
```

The failures demonstrated that the base had no lifecycle state, close
operation, persistent factory ownership, bounded lanes, or dedicated blocking
connection. Separate ownership tests failed because neither the direct service
nor the tool registry exposed an owned close path. The process test failed
because the termination primitive did not exist. Four configuration tests
failed because the lifecycle bounds were neither parsed nor forwarded.

### GREEN

The focused lifecycle, queue contract, config, factory ownership, registry,
process termination, and MCP bootstrap group finishes with:

```text
57 tests; 57 passed; 0 failed
```

The live lifecycle test proves one command connection is reused across
commands, a separate client owns the blocking read, bounded shutdown cancels
that read, and both owned clients are destroyed exactly once.

## Verification

| Check | Result |
|---|---|
| focused config/factory/queue/lifecycle/ownership/process/registry/bootstrap group | `57 passed`, `0 failed` |
| `npm --prefix gateway test` | `744 tests`; `725 passed`, `19 skipped`, `0 failed` |
| `npm --prefix gateway run lint` | exit `0` |
| `python -m pytest -q tests/structure` | `290 passed` |
| new lifecycle live test on isolated Redis | `1 passed`, `0 skipped`, `0 failed` |
| complete coordination live lane on isolated Redis | `10 passed`, `0 skipped`, `0 failed` |
| `python scripts/ci_gate.py --repo-root . --refresh-inventory` | passed |
| `python scripts/ci_gate.py --repo-root . --validate-only` | `status: passed`, exit `0` |
| `git diff --check` | exit `0` |
| `gitleaks protect --staged --redact --no-banner` | no leaks found |
| `sha256sum gateway/src/tools/message.js` | `6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac` |

The 19 full-Gateway skips are service-gated baseline tests because that
non-live invocation intentionally had no shared service URL. The separately
isolated Redis invocations had zero skips.

## Exact technical paths

```text
CHANGELOG.md
README.md
ci/suites.json
docs/adr/ADR-V5-01-redis-coordination-plane.md
docs/architecture.md
docs/coordination-bus.md
docs/operator-guide.md
gateway/README.md
gateway/src/config.js
gateway/src/coordination.js
gateway/src/core/coordination_queue.js
gateway/src/core/process_lifecycle.js
gateway/src/core/redis_client_lifecycle.js
gateway/src/mcp_server.js
gateway/src/tools/index.js
plan/PROJECT_V5/A/0/00/E2/S00.md
plan/PROJECT_V5/EPICS.md
plan/PROJECT_V5/G/0/01.md
plan/PROJECT_V5/G/README.md
plan/PROJECT_V5/README.md
plan/PROJECT_V5/SHEETS.md
plan/README.md
tests/gateway/config_paths.test.js
tests/gateway/coordination_factory.test.js
tests/gateway/coordination_factory_lifecycle.test.js
tests/gateway/coordination_multi_client_race_live.test.js
tests/gateway/coordination_queue_ack_live.test.js
tests/gateway/coordination_queue_contract.test.js
tests/gateway/coordination_queue_lifecycle.test.js
tests/gateway/coordination_queue_lifecycle_live.test.js
tests/gateway/coordination_queue_presence_live.test.js
tests/gateway/coordination_queue_receive_live.test.js
tests/gateway/coordination_queue_send_live.test.js
tests/gateway/coordination_two_instance_live.test.js
tests/gateway/mcp_bootstrap.test.js
tests/gateway/process_lifecycle.test.js
tests/gateway/tool_coordination_registry.test.js
```

## Safety and cleanup

- Live verification used separately named, disposable Redis containers bound
  only to loopback and UUID-prefixed test keys.
- All implementation containers were stopped and removed after verification.
- The temporary dependency symlink was removed before staging.
- No shared Redis/MCP process was contacted, flushed, restarted, stopped, or
  reconfigured.
- No `.mcp.json`, credential, token, lease token, or secret-bearing payload is
  included.
- The legacy `message.*` source remains byte-identical to the required base,
  and the `agents:events` contract remains unchanged.
- The authoritative aggregate CI was intentionally not run concurrently with
  the orchestrator's other CI lane; the complete Gateway, structure, lint,
  inventory, live Redis, diff, and secret checks above are the scoped evidence.

## Requested review focus

1. Verify that a transport failure never replays the dispatched semantic
   operation, while the next operation performs at most one coalesced reconnect.
2. Stress both admission bounds and confirm a blocked receive cannot starve
   command health traffic.
3. Confirm close is idempotent, rejects queued work, drains up to the configured
   deadline, destroys owned clients, and removes error/signal/stdin listeners.
4. Confirm the ownership chain closes exactly once from MCP process to registry,
   direct service, queue, and both Redis lanes.
5. Check behavior when connect, command dispatch, error observation, and close
   race, including a pathological transport that delays or ignores destroy.
6. Confirm configuration defaults, public tool/error compatibility,
   documentation, ADR, and still-pending plan state match the implementation.
7. Confirm no shared-service mutation, secret persistence, `agents:events`
   change, or legacy `message.*` change entered the technical range.

---

## Independent verdict — Trial 1

**Pending.**
