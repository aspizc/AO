# Review Result — V5 E2/S05 (Trial 1)

Verdict: **OK**

## Scope reviewed

- `plan/PROJECT_V5/reviews/E2_S05-1_to_review.md`
- `plan/PROJECT_V5/A/0/00/E2/S05.md`
- `docs/adr/ADR-V5-01-redis-coordination-plane.md`
- `docs/coordination-bus.md`
- `tests/gateway/coordination_two_instance_live.test.js`
- the current coordination service and Redis adapter paths exercised by the
  acceptance test

## Findings

No blocking findings.

The acceptance test uses two separately constructed `CoordinationService`
objects, two separately constructed Redis queue objects, and independent
tracked client factories over one UUID-scoped namespace. Calls intentionally
cross those service instances while retaining participant credentials, so the
test demonstrates shared Redis interoperability rather than reusing one queue
object.

The replacement race is correctly placed after the stale service has read and
authenticated the old presence and immediately before its ACK Lua evaluation.
The replacement registration changes the digest for the same participant ID;
the stale ACK returns `COORDINATION_LEASE_CHANGED`, creates no tombstone, and
leaves the delivery pending. The replacement then reclaims and acknowledges
that delivery.

The same flow also proves:

- deterministic PEL aging and cross-instance reclaim without timing sleeps;
- recipient-scoped ACK rejection and exact retry behavior;
- sender-scoped equal retry with TTL renewal and conflict without renewal;
- exact inbox capacity rejection, no dedupe residue on rejection, ACK deletion,
  and capacity reuse;
- two-way addressed delivery across the independent services;
- body-free coordination metadata, no plaintext lease token in any isolated
  coordination key, and allowlisted local audit metadata;
- zero open tracked operation clients with every created tracked client
  destroyed; and
- Redis 7 gating plus UUID-prefix `SCAN`/`DEL` cleanup with no `FLUSHDB`.

The test is consistent with the ADR and runbook guarantees relevant to the E2
exit gate.

## Independent verification

- Focused coordination matrix without a Redis URL: **109 passed, 6 expected
  opt-in skips, 0 failed**.
- The same matrix against an independently started `redis:7.2-alpine`
  container: **115 passed, 0 skipped, 0 failed**.
- `node --check tests/gateway/coordination_two_instance_live.test.js`: passed.
- Scoped `git diff --check`: passed.
- The review container was removed after execution; no shared MCP or Redis
  process was used or interrupted.
