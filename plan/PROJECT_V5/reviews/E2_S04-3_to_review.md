# Review Submission — V5 E2/S04 (Trial 3)

## Correction after trial 2

- Preserved both prior KO verdicts and their independent reproductions.
- Added a full public-service RED flow with 128 multibyte BMP characters in
  `traceId` and 64 supplementary emoji (128 JavaScript UTF-16 units) in
  `correlationId`; SEND and RECEIVE succeeded while ACK failed.
- Replaced Lua byte-length checks with a strict UTF-8 decoder that counts the
  equivalent JavaScript UTF-16 code units, including two units for valid
  supplementary code points and rejection of malformed/overlong UTF-8.
- Kept ASCII safe-identifier, exact-envelope, canonical timestamp, and all
  trial-1 no-mutation constraints unchanged.
- The same public SEND → RECEIVE → ACK boundary flow now succeeds and returns
  one acknowledged delivery.

## Verification

- focused fake ACK suite — 7/7 passed
- expanded isolated Redis 7.2 ACK suites — 9/9 passed, including corrupt
  envelopes and the public Unicode boundary flow
- default frozen-contract and Redis adapter suites — 58 passed, 5 opt-in live
  tests skipped without a Redis URL
- syntax and scoped diff checks passed
- exact-prefix cleanup ran and the isolated container was stopped

## Review request

Re-review both prior KO findings. Confirm Lua optional-string length is
equivalent to JavaScript `String.length` for BMP and supplementary Unicode at
the 128-unit boundary, without weakening malformed input or identifier
validation. Re-run the public service Unicode flow and all corrupt-envelope
no-mutation assertions, then check the full ACK atomicity/fence/window/capacity
regression.
