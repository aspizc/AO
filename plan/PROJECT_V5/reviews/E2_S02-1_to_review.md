# Review Submission — V5 E2/S02 (Trial 1)

## What was done

- Added one Redis 7 Lua operation spanning sender presence, recipient presence,
  recipient inbox, sender/message dedupe, and coordination metadata events.
- Validated both digest/scope fences and recipient existence before mutation.
- Scoped dedupe by sender plus message ID and stored exactly
  `{envelope,deliveryId}` with PX.
- Compared all semantic envelope fields, including optional presence, while
  intentionally excluding only `createdAt`.
- Renewed equal retries and returned the original envelope/delivery; changed
  retries conflict before capacity and do not renew.
- Enforced exact `XLEN` backpressure and appended without `MAXLEN`.
- Compensated an unexpected dedupe `SET` failure with `XDEL`.
- Made metadata append best effort after authoritative send state so an
  observability Stream at its maximum ID cannot turn a committed delivery into
  a reported failure.
- Added strict JS input/result validation, canonical uint64 Stream IDs, safe
  dependency errors, and metadata allowlist assertions.

## TDD evidence

- RED: all eight send groups initially failed because `putMessage` was absent.
- GREEN: full Redis adapter set through send — 39 passed and one opt-in test
  skipped.
- Isolated Redis 7.2 live test — 1/1 passed: original delivery, exact dedupe
  value/TTL, timestamp-only retry, conflict, capacity, no body/digest event
  leak, and successful authoritative delivery with events Stream at maximum ID.
- Exact-prefix cleanup ran and the isolated container was stopped.
- syntax and scoped diff checks passed.

## Review request

Review only E2/S02. Inspect KEYS/ARGV and response shapes, dual fences, key
types, exhaustive semantic equality, corrupt dedupe handling, sender-scoped
idempotency and TTL renewal, capacity ordering, no blind trim, late-write
compensation, best-effort metadata safety/secrecy, and E1 service compatibility.
