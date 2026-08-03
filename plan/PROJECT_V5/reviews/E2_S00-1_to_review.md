# Review Submission — V5 E2/S00 (Trial 1)

## What was done

- Replaced the inherited queue draft's duplicate key model with the frozen
  `coordination_contract.js` prefix, key builders, and consumer group.
- Added strict percent-encoded presence/inbox/dedupe/ACK key coverage.
- Kept construction and description side-effect free.
- Added one fresh, explicitly RESP2 Redis client per operation with bounded
  connect timeout, no reconnect loop, and best-effort ownership cleanup.
- Added strict JSON-object decoding for stored presence.
- Mapped dependency failures to a safe coordination error without reflecting
  endpoint, credential, or dependency details.
- Added consumer-group creation with `0` + `MKSTREAM`; only an exact
  `BUSYGROUP` condition is treated as an existing group.
- Added strict constructor and RESP-result validation.

## TDD evidence

- RED: wrong group, unencoded keys, missing RESP2, permissive numeric options,
  and absent group handling produced 4 then 2 failures.
- GREEN: adapter foundation plus frozen wire contract — 19 tests passed.
- syntax and scoped diff checks passed.

## Review request

Review only E2/S00. Check frozen-contract reuse, key non-aliasing, lazy client
lifecycle, RESP2 assumptions, cleanup/error secrecy, strict decoders,
constructor bounds, and BUSYGROUP-only suppression. Atomic presence behavior
is intentionally reserved for E2/S01.
