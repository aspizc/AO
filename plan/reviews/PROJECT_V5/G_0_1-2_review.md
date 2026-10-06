# V5 G/0/01 — Trial 2 independent review request

Status: **Trial 2 correction committed; independent verdict pending**.

No verdict is asserted by the implementation author. Please review the
complete technical correction and record an independent `OK` or `KO` without
rewriting this append-only request.

Requested reviewer execution label:
**«GPT-5.6 Sol, razonamiento ultra, servicio Priority/Fast solicitado»**.

## Identity

- Sheet: `G/0/01`
- Review id: `G_0_1`
- Branch: `feat/V5-G-0-01-redis-lifecycle`
- Trial 1 KO/request head:
  `47a0e21ccad44a43cd7fd9389943da1f10f5fc03`
- Trial 2 technical commit:
  `f1efbf6c1957e482ec67e60fb89f996d74f41d5a`
- Trial 2 technical tree:
  `ad0ce3673fa65adfd436eeaf461ceae9c44f54ad`
- Correction range:
  `47a0e21ccad44a43cd7fd9389943da1f10f5fc03..f1efbf6c1957e482ec67e60fb89f996d74f41d5a`
- Original required base:
  `672b5975b051f0139b4f60a4754f0dbb1f5614de`
- Trial 1 technical commit:
  `bc8d740856574dedaa3c79539a195308483c86fb`

Trial 1 request and KO result remain unchanged. Do not integrate, promote, or
mark G/0/01 complete unless an independent verdict is `OK`.

## Trial 1 KO addressed

Trial 1 proved that transport destruction alone was not a cancellation
boundary. An ignored blocking destroy left the caller and logical active count
pending; a delayed connect could reopen after close because a pre-connect
WeakSet entry suppressed later cleanup; and a delayed `GET` could return
success after the queue had reported closed.

Trial 2 adds a lane-owned shutdown epoch:

- every queued or active admission records the current epoch;
- close rejects and releases queued admissions immediately;
- active calls may drain only until the configured deadline;
- the deadline callback itself advances the epoch, marks the lane closed,
  releases all logical active admissions, and rejects their callers with
  `COORDINATION_UNAVAILABLE`;
- eventual transport fulfillment or rejection remains observed but cannot
  settle the already-fenced caller or change lifecycle counts;
- client cleanup records pre-open and open-state attempts separately, so a
  destroy attempted during connect cannot suppress the required destroy after
  that connect becomes open; and
- listener/client references are detached without changing the existing
  ownership chain or retry contract.

The correction preserves the exact command bound of 64 active plus 256 queued
operations, the blocking bound of 1 active plus 32 queued receives, separate
command/blocking clients, concurrent-connect coalescing, no replay of a
dispatched operation, next-operation reconnect, service/registry/MCP
ownership, and idempotent double close.

## TDD evidence

### RED

The three independent-review repros were committed to the focused test file
before production changed. Against the Trial 1 KO head:

```text
10 tests; 7 passed; 3 failed
```

Each new case failed for the expected reason:

```text
Expected: rejected with COORDINATION_UNAVAILABLE
Actual: timeout
```

The three RED cases were:

1. an `XREADGROUP` transport promise that ignored destroy and rejected late;
2. a connect gate that completed after close; and
3. a dispatched `GET` that resolved successfully after the close deadline.

### GREEN

After adding the epoch/cancellation fence and state-aware cleanup:

```text
tests/gateway/coordination_queue_lifecycle.test.js
10 passed; 0 failed

focused config/factory/queue/lifecycle/process/registry/bootstrap group
60 passed; 0 failed

10 repeated lifecycle-file executions
10/10 executions passed
```

The pathological blocking caller now settles unavailable within the bound,
the closed lane reports `active: 0` and `queued: 0`, and its late rejection
produces no `unhandledRejection`. The delayed connect receives a second
open-state destroy and finishes with `isOpen: false` and no listener. The late
`GET` caller stays unavailable after the transport result resolves, with one
dispatch and no replay.

## Verification

| Check | Result |
|---|---|
| focused ownership/lifecycle group | `60 passed`, `0 failed`, `0 skipped` |
| lifecycle fault file, final run | `10 passed`, `0 failed`, `0 skipped` |
| lifecycle fault file stress | 10 consecutive executions passed |
| `npm --prefix gateway test` | `747 tests`; `728 passed`, `19 skipped`, `0 failed` |
| repository-venv `python -m pytest -q tests/structure` | `290 passed` |
| `npm --prefix gateway run lint` | exit `0` |
| `python scripts/ci_gate.py --repo-root . --validate-only` | `status: passed`, exit `0` |
| complete Redis 7 live lane on isolated database 15 | `10 passed`, `0 skipped`, `0 failed` |
| isolated MCP processes after `coordination.status` | stdin/SIGINT/SIGTERM exited `0`/`130`/`143`; stop log present |
| isolated MCP Redis database and test prefix after shutdown | zero keys |
| `git diff --check` | exit `0` |
| `gitleaks protect --staged --redact --no-banner` | no leaks found |
| `sha256sum gateway/src/tools/message.js` | `6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac` |

The 19 ordinary Gateway skips are pre-existing service-gated cases because
that non-live invocation intentionally had no shared service URL. The
separately isolated required Redis lane had zero skips. One preliminary
structure invocation selected a system Python without pytest; the locked
repository venv was then used for both complete green runs above.

## Exact correction paths

```text
CHANGELOG.md
docs/adr/ADR-V5-01-redis-coordination-plane.md
docs/architecture.md
docs/coordination-bus.md
docs/operator-guide.md
gateway/README.md
gateway/src/core/redis_client_lifecycle.js
plan/PROJECT_V5/EPICS.md
plan/PROJECT_V5/G/0/01.md
plan/PROJECT_V5/G/README.md
plan/PROJECT_V5/README.md
plan/PROJECT_V5/SHEETS.md
plan/README.md
tests/gateway/coordination_queue_lifecycle.test.js
```

## Safety and cleanup

- Redis verification used separately named disposable Redis 7.2 containers,
  dynamic loopback-only ports, database 15, and test-owned prefixes.
- MCP process checks used fresh temporary workspaces and the isolated Redis
  only. They opened a real command client through `coordination.status`.
- Every implementation container was stopped and removed; every temporary MCP
  workspace and the dependency symlink was removed.
- No shared Redis/MCP process was contacted, flushed, restarted, stopped, or
  reconfigured.
- No `.mcp.json`, credential, token, lease token, or secret-bearing payload is
  included.
- `gateway/src/tools/message.js` remains byte-identical and no
  `agents:events`, catalog, coordination-tool, service-fence, or audit contract
  path changed in the correction range.

## Requested independent probes

1. Reproduce the three Trial 1 pathological transports, including a late
   rejection, a late fulfillment, and connect completion after close.
2. Confirm close returns within its bound and every queued/active caller is
   logically settled, with lifecycle `closed`, `active: 0`, and `queued: 0`.
3. Attach an `unhandledRejection` observer and verify all late transport
   outcomes are consumed without reviving a caller or lane.
4. Verify pre-connect cleanup does not suppress one required post-connect
   destroy, while healthy clients still close exactly once and detach
   listeners.
5. Recheck exact 64+256 and 1+32 admission bounds, command/blocking separation,
   connect coalescing, no dispatched-operation replay, and one replacement
   connect for the next operation.
6. Recheck direct factory, tool-registry, stdin, `SIGINT`, and `SIGTERM`
   ownership, including double close and no remaining client/listener/handle.
7. Confirm the ADR, runbooks, sheet/index state, safe error projection, and
   unchanged `message.*`/`agents:events` contracts match the technical range.

---

## Independent verdict — Trial 2

**Pending.**
