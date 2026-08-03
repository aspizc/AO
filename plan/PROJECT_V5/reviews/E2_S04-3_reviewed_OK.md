# Review Verdict — V5 E2/S04 (Trial 3)

Verdict: **OK**

## Prior KO resolution

- The trial-1 corrupt-envelope blocker remains fixed. Independent Redis 7.2
  reproduction confirmed that incomplete, malformed, and foreign pending
  envelopes each return `COORDINATION_INVALID_DATA` with exactly one PEL row,
  one Stream row, no tombstone, and an unchanged metadata-event count.
- The trial-2 Unicode blocker is fixed. The Lua decoder validates UTF-8 and
  counts JavaScript-equivalent UTF-16 units: one for BMP code points and two
  for supplementary code points.
- Independent boundary execution ACKed 128-unit BMP and supplementary values.
  Both 129-unit variants failed closed with their PEL and Stream rows
  preserved, no tombstone, and no metadata mutation.
- A public service flow with both a 128-unit multibyte `traceId` and a
  128-unit supplementary `correlationId` completed SEND → RECEIVE → ACK with
  `ackedCount: 1`.

## Contract and regression evidence

- Every requested ID is validated before the first tombstone or Stream
  mutation.
- Recipient digest/scope fencing, canonical uint64 IDs, strict pending rows,
  exact inbox envelopes, missing groups, and recipient-scoped tombstones fail
  closed.
- Mixed unknown batches do not renew tombstones or partially ACK valid rows.
- Exact retries renew the bounded tombstone and report zero newly ACKed.
- Valid pending rows use exact `XACK` + `XDEL`, free inbox capacity, and emit
  body-free best-effort metadata.
- Replacement, cross-inbox, expiry, corrupt tombstone, maximum metadata Stream
  ID, and capacity cases remain covered and passed.
- The UTF-8 decoder rejects invalid continuation bytes, overlong encodings,
  surrogate code points, and values above Unicode's maximum.

## Verification

- Default frozen-contract and Redis adapter suite: 58 passed, 5 opt-in live
  tests skipped.
- Isolated Redis 7.2 live suite: 5/5 passed.
- Independent UTF-16 boundary reproduction: four expected outcomes passed.
- Independent corrupt-envelope state reproduction: three expected
  no-mutation outcomes passed.
- `node --check gateway/src/core/coordination_queue.js` — passed.
- Scoped `git diff --check` — passed.
- The reviewer-owned Redis container was stopped and removed; shared
  Redis/MCP was not used.
