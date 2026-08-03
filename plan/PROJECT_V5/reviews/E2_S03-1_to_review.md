# Review Submission — V5 E2/S03 (Trial 1)

## Scope

- Added `RedisCoordinationQueue.readInbox` over one fresh RESP2 client per
  operation.
- Added atomic digest-and-scope fences around `XAUTOCLAIM` and nonblocking
  `XREADGROUP`.
- Added explicit pre/post fence scripts around raw blocking `XREADGROUP`;
  post-check failure returns no data and leaves the claimed entry pending.
- Followed every nonterminal reclaim cursor, including empty pages, until the
  requested count or `0-0`.
- Added strict Redis 7 RESP2 decoding for stream keys, delivery IDs, envelope
  fields, deleted pending IDs, bounds, duplicates, cursor progress, and
  cross-inbox/scope data.
- Kept `NOGROUP` fail-closed without consumer-group repair and did not ACK,
  delete, trim, audit, or touch `agents:events`.

## TDD and verification

- RED: 9/9 initial focused tests failed because `readInbox` did not exist.
- GREEN: expanded focused fake suite — 12/12 passed.
- Default frozen-contract and Redis adapter suites — 51 passed, 3 opt-in live
  tests skipped without a Redis URL.
- Isolated `redis:7.2-alpine` receive suite — 13/13 passed, including real
  reclaim, blocking replacement race with pending preservation, and deleted
  pending-ID rejection.
- Exact-prefix cleanup ran and the isolated container was stopped.
- Syntax and scoped diff checks passed.

## Review request

Review the implementation, focused tests, E0 wire contract, E1/S05 service
port, and E2/S03 sheet. Look especially for data disclosure after a fence
change, cursor starvation, malformed RESP acceptance, accidental `BLOCK 0`,
implicit group repair, or any path that returns a partial batch after Redis
has changed pending state. Return `Verdict: OK` or `Verdict: KO`; list only
blocking findings for a KO.
