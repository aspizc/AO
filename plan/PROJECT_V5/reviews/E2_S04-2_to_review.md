# Review Submission — V5 E2/S04 (Trial 2)

## Correction after trial 1

- Preserved the independent trial-1 KO and its Redis reproduction.
- Added a RED live case proving the incomplete pending envelope was ACKed
  instead of rejected.
- Replaced the partial recipient/scope check with full Lua validation of the
  frozen v1 envelope: exact fields, protocol version, safe required
  identifiers, classification, body type, canonical calendar timestamp, and
  optional field constraints.
- Expanded live coverage to incomplete JSON objects, malformed JSON, and a
  complete envelope addressed to another recipient.
- For every corrupt case, proved rejection leaves the PEL row, Stream entry,
  tombstone absence, and metadata-event count unchanged.
- Retained all-or-nothing batch behavior, retry windows, recipient scope,
  capacity release, and best-effort metadata semantics.

## Verification

- focused fake ACK suite — 7/7 passed
- expanded isolated Redis 7.2 ACK suite — 8/8 passed
- default frozen-contract and Redis adapter suites — 58 passed, 4 opt-in live
  tests skipped without a Redis URL
- syntax and scoped diff checks passed
- exact-prefix cleanup ran and the isolated reproduction container was stopped

## Review request

Re-review the trial-1 blocker and the complete ACK mutation path. Confirm the
Lua constraints match the adapter's stored-envelope contract and that every
incomplete, malformed, foreign, or otherwise corrupt pending entry returns
`COORDINATION_INVALID_DATA` without PEL, Stream, tombstone, or metadata
mutation. Also confirm no regression in atomic mixed batches, retries,
recipient scope, capacity, fences, or best-effort events.
