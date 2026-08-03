# Review Verdict — V5 E2/S04 (Trial 2)

Verdict: **KO**

## Trial-1 correction

The original corrupt-envelope blocker is corrected. Independent Redis 7.2
execution confirmed that incomplete, malformed, and foreign pending envelopes
all return `COORDINATION_INVALID_DATA` while preserving:

- one matching PEL row;
- one matching Stream row;
- no ACK tombstone; and
- the exact pre-call metadata-event count.

The complete live ACK regression also passes, including mixed-batch atomicity,
replacement fences, recipient scope, retry renewal/expiry, capacity release,
missing groups, and maximum-ID best-effort metadata.

## Blocking finding

The new Lua envelope validator rejects valid multibyte `traceId` and
`correlationId` values that the public service, schema, SEND operation, and
RECEIVE operation accept.

`gateway/src/core/coordination_queue.js:734` uses Lua `string.len`, which counts
UTF-8 bytes, and applies the 128 limit to optional fields at lines 812–818.
The public service validates those fields by JavaScript string length at
`gateway/src/services/coordination_service.js:390`, while the frozen schema
allows 128 characters.

An isolated full-service Redis 7.2 reproduction used a `traceId` containing
100 `é` characters:

- `coordination.send` succeeded;
- `coordination.receive` returned the delivery and its 100-character trace ID;
- `coordination.ack` failed with `COORDINATION_INTERNAL_ERROR`;
- the delivery remained in both the PEL and Stream;
- no tombstone was created; and
- the metadata-event count remained unchanged.

The value is 100 characters but 200 UTF-8 bytes, so the ACK-only byte-count
check makes a valid, already-delivered message impossible to acknowledge
through the supported service. `correlationId` has the same defect.

## Required correction

- Make Lua optional-string length semantics match the public service and frozen
  schema for multibyte input.
- Add a live send → receive → ACK regression for valid multibyte `traceId` and
  `correlationId` values at the supported boundary.
- Retain the trial-1 corrupt-envelope no-mutation assertions and the complete
  ACK regression.

## Verification

- Default frozen-contract and adapter suite: 58 passed, 4 opt-in live tests
  skipped.
- Isolated Redis 7.2 adapter live suite: 4/4 passed.
- Independent adapter and full-service Unicode reproductions both confirmed
  the blocking failure.
- Syntax and scoped diff checks passed.
- Both reviewer-owned Redis containers were stopped and removed; shared
  Redis/MCP was not used.
