# V5 G/0/01 — Trial 3 independent review request

Status: **Trial 3 correction committed; independent verdict pending**.

No verdict is asserted by the implementation author. Please review the
complete technical correction and record an independent `OK` or `KO` without
rewriting this append-only request.

Requested reviewer execution label:
**«GPT-5.6 Sol, razonamiento ultra, servicio Priority/Fast solicitado»**.

## Identity

- Sheet: `G/0/01`
- Review id: `G_0_1`
- Branch: `feat/V5-G-0-01-redis-lifecycle`
- Trial 2 KO/result-only parent:
  `e072ebbade50625ac6b5a3c52dcfe60038f81705`
- Trial 3 technical commit:
  `b877e85e4ed97a178c5ae4fedfb8b2a4ef60e59b`
- Trial 3 technical tree:
  `6b56473681e819c92b0c0bba0b690203e43ff213`
- Correction range:
  `e072ebbade50625ac6b5a3c52dcfe60038f81705..b877e85e4ed97a178c5ae4fedfb8b2a4ef60e59b`
- Original required base:
  `672b5975b051f0139b4f60a4754f0dbb1f5614de`
- Trial 1 technical commit:
  `bc8d740856574dedaa3c79539a195308483c86fb`
- Trial 2 technical commit:
  `f1efbf6c1957e482ec67e60fb89f996d74f41d5a`

All Trial 1–2 requests and KO results remain unchanged. Do not integrate,
promote, or mark G/0/01 complete unless an independent verdict is `OK`.

## Trial 2 KO addressed

Trial 2 correctly fenced shutdown outcomes but treated node-redis `isOpen` as
proof that its handshake had completed. Locked `@redis/client` 6.1.0 sets
`isOpen=true` while `isReady=false` and `connect()` is still pending. A second
operation could therefore dispatch early, fail, and invalidate the shared
connect wave. The same `isOpen` inference categorized a destroy during that
handshake as post-connect and suppressed the required destroy after a late
successful handshake.

Trial 3 makes connection state lane-owned:

- an existing `connectPromise` is checked before any reusable-client path;
- the lane returns a client only from its own `ready` state, which is set after
  the awaited handshake succeeds;
- `isOpen` is never production evidence of a completed handshake;
- each connection has an explicit generation and phase (`connecting` or
  `ready`);
- destroy attempts are deduplicated within generation and phase, so a
  connecting-phase attempt cannot suppress a later ready-phase attempt;
- invalidation keeps the in-flight promise authoritative until its closure
  settles and performs late-generation cleanup; and
- the shutdown epoch still prevents any late connect/result/error from
  reopening the lane or settling a cancelled caller.

The correction preserves the exact command bound of 64 active plus 256 queued
operations, the blocking bound of 1 active plus 32 queued receives, separate
command/blocking clients, no replay of dispatched operations, one reconnect
for a later operation, immediate unavailable settlement at the shutdown
deadline, zero unhandled late outcomes, service/registry/MCP ownership, and
idempotent double close.

## TDD evidence

### RED

The two Redis-shaped fakes and the lock-matched real-client loopback test were
added before production changed. Against the Trial 2 KO head:

```text
13 tests; 10 passed; 3 failed
```

The failures were exact:

1. the second Redis-like caller rejected `COORDINATION_UNAVAILABLE` instead of
   remaining pending behind the first handshake;
2. close produced one destroy instead of the required connecting-phase plus
   post-handshake attempts; and
3. locked `@redis/client` 6.1.0 against a stalled loopback RESP handshake also
   rejected its second caller before the handshake completed.

The first fake observed `isOpen=true`, `isReady=false`, one connect call, and a
premature command. The late-handshake fake remained open/ready because the
first destroy suppressed the second.

### GREEN

After replacing readiness inference with the lane-owned connection record:

```text
tests/gateway/coordination_queue_lifecycle.test.js
13 passed; 0 failed

focused config/factory/queue/lifecycle/process/registry/bootstrap group
63 passed; 0 failed

10 repeated lifecycle-file executions
10/10 executions passed
```

Both fake callers remain pending with zero dispatched commands and one connect
until the gate resolves, then both succeed. Close during the handshake settles
the caller unavailable, reports zero active/queued work, performs exactly two
phase-specific destroys when the first is ignored, leaves
`isOpen=false`/`isReady=false`, removes the listener, and emits no unhandled
rejection. The real-client test uses only a temporary loopback TCP listener
that accepts and stalls RESP; it contacts no Redis service.

## Verification

| Check | Result |
|---|---|
| focused ownership/lifecycle group | `63 passed`, `0 failed`, `0 skipped` |
| lifecycle fault/handshake file, final run | `13 passed`, `0 failed`, `0 skipped` |
| lifecycle file stress | 10 consecutive executions passed |
| `npm --prefix gateway test` | `750 tests`; `731 passed`, `19 skipped`, `0 failed` |
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
that invocation intentionally had no shared service URL. The separately
isolated required Redis lane had zero skips.

## Exact correction paths

```text
CHANGELOG.md
docs/adr/ADR-V5-01-redis-coordination-plane.md
docs/architecture.md
docs/coordination-bus.md
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

- The real-client RED/GREEN test owns a temporary loopback listener and closes
  every accepted socket and the listener in `finally`.
- Live verification used one separately named disposable Redis 7.2 container,
  a dynamic loopback-only port, database 15, and test-owned prefixes.
- MCP process checks used fresh temporary workspaces and that isolated Redis
  only. They opened a real command client through `coordination.status`.
- Every implementation container, temporary listener/socket, MCP workspace,
  Gateway test workspace, and dependency symlink was removed.
- No shared Redis/MCP process was contacted, flushed, restarted, stopped, or
  reconfigured.
- No `.mcp.json`, credential, token, lease token, or secret-bearing payload is
  included.
- `gateway/src/tools/message.js` remains byte-identical. No `agents:events`,
  audit, catalog, coordination-tool, or service-fence contract path changed in
  the correction range.

## Requested independent probes

1. Reproduce `isOpen=true`/`isReady=false` with locked node-redis and verify a
   second operation waits on one connect, dispatching zero commands.
2. Resolve the handshake and verify every coalesced caller then uses the same
   ready client, without extra connect or replay.
3. Close while the handshake is pending, ignore the connecting-phase destroy,
   then complete the handshake and verify a distinct ready-phase destroy leaves
   the client closed and not ready.
4. Confirm the caller settles unavailable at the deadline, lifecycle reports
   closed/zero active/zero queued, listeners detach, and late outcomes produce
   no unhandled rejection or lane revival.
5. Re-run all three Trial 1 pathological shutdown cases and confirm their
   epoch/cancellation behavior remains intact.
6. Recheck exact 64+256 and 1+32 admission bounds, client separation,
   dispatched-operation no-replay, later-operation reconnect, direct/registry/
   process ownership, and double close.
7. Confirm the ADR, runbooks, sheet/index state, safe error projection, and
   unchanged `message.*`/`agents:events` contracts match the technical range.

---

## Independent verdict — Trial 3

**Pending.**
