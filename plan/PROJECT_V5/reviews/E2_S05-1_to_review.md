# Review Submission — V5 E2/S05 (Trial 1)

## Scope

- Added one opt-in Redis 7 acceptance test with two independent
  `CoordinationService` instances, two independent Redis queue objects, and
  separate tracked client factories over one UUID-scoped namespace.
- Proved two-way registration/discovery/message exchange, cross-instance equal
  retry and conflict handling, addressed receive, cross-inbox ACK rejection,
  exact ACK retry, bounded backpressure, and capacity reuse.
- Proved abandoned work is reclaimed across service instances without sleeps
  by aging the isolated PEL deterministically.
- Injected a legitimate replacement registration between old-lease service
  authentication and the ACK Lua operation; the stale call returned
  `COORDINATION_LEASE_CHANGED`, preserved the pending row, and the replacement
  reclaimed and acknowledged it.
- Inspected coordination events and every isolated Redis key to prove no
  plaintext lease token was persisted and no message body/digest entered the
  metadata stream.
- Verified every tracked operation client was destroyed and exact-prefix
  cleanup used no `FLUSHDB`.

## Verification

- explicit no-URL execution — one intentional skip
- isolated `redis:7.2-alpine` two-instance flow — 1/1 passed
- all focused V5 service, contract, adapter, and acceptance suites — 109
  passed, 6 opt-in live tests skipped without a Redis URL
- syntax and scoped diff checks passed
- exact-prefix cleanup ran and the isolated container was stopped

## Review request

Review whether the test genuinely uses independent instances and proves the
E2/G2 exit gate rather than merely rechecking one object. Check the
replacement timing, reclaim aging, PEL/tombstone/capacity assertions, token
and metadata inspection, client lifecycle accounting, Redis-major gate, and
cleanup scope. Return `Verdict: OK` or `Verdict: KO`; list only blocking
findings for a KO.
