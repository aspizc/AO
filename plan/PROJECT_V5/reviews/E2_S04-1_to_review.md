# Review Submission — V5 E2/S04 (Trial 1)

## Scope

- Added `RedisCoordinationQueue.ackInbox` with strict recipient fence, dense
  unique 1–100 canonical uint64 Stream IDs, canonical timestamp, and bounded
  tombstone TTL validation.
- Added one Lua operation that validates every requested ID as pending in the
  recipient group or covered by an exact recipient-scoped tombstone before
  any mutation.
- Pending validation checks strict Redis 7 `XPENDING` data and the matching
  inbox Stream row/envelope; missing groups and corrupt/ghost data fail closed.
- Successful ACK creates or renews every tombstone, then applies exact
  `XACK` + `XDEL` to newly pending IDs and emits a body-free best-effort
  `message.acked` metadata event.
- No ACK path repairs groups, uses `MAXLEN`, or writes `agents:events`.

## TDD and verification

- RED: 7/7 initial focused tests failed because `ackInbox` did not exist.
- GREEN: expanded focused fake suite — 7/7 passed.
- Default frozen-contract and Redis adapter suites — 58 passed, 4 opt-in live
  tests skipped without a Redis URL.
- Isolated `redis:7.2-alpine` ACK suite — 8/8 passed after correcting one
  overbroad test assertion; the implementation did not require that fix.
- Live evidence covers replacement fences, all-or-nothing mixed batches,
  tombstone renewal/expiry/corruption, cross-inbox rejection, exact retry,
  missing groups, metadata max-ID, and capacity reuse.
- Exact-prefix cleanup ran, both isolated containers were stopped, and syntax
  plus scoped diff checks passed.

## Review request

Review the Lua mutation ordering and every validation branch against E0/S02,
E1/S06, E2/S04, the ADR, and the runbook. Look especially for partial ACK or
tombstone renewal on a mixed invalid batch, ghost/unread/cross-inbox
acceptance, fence bypass, unsafe late Redis failures, incorrect tombstone
scope/window, capacity leaks, or metadata disclosure. Return `Verdict: OK` or
`Verdict: KO`; list only blocking findings for a KO.
