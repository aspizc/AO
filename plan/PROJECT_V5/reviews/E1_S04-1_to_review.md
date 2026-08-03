# Review Submission — V5 E1/S04 (Trial 1)

## What was done

- Added strict canonical send input and server-derived sender/scope/time fields.
- Enforced `internal|unrestricted`, explicit restricted denial, the existing
  `secret.token` detection semantics, and UTF-8 byte limits.
- Authenticated the sender, rejected missing/expired/cross-scope recipients,
  and passed both digest/scope fences into one queue operation.
- Frozen the queue port as
  `putMessage(envelope,{senderFence,recipientFence,dedupeTtlMs})`.
- Implemented safe mapping for created, duplicate, conflict, both replacement
  races, target disappearance, inbox-full, unavailable, and malformed results.
- Validated duplicate result payloads before returning the original envelope
  and delivery ID.
- Proved sender-scoped bounded idempotency compares every semantic field except
  server `createdAt`, renews equal retries, and allows redelivery after expiry.
- Emitted body/token/digest-free metadata audit events.

## Verification

- RED: all eight send groups failed with
  `COORDINATION_NOT_IMPLEMENTED`.
- GREEN: all service suites through send — 33 tests passed.
- `node --check gateway/src/services/coordination_service.js` — passed.
- scoped `git diff --check` — passed.

## Review request

Review E1/S04 only. Check validation and secret semantics, exact canonical
envelope, UTF-8 boundaries, sender/recipient fences and races, queue statuses,
sender-scoped semantic dedupe/window renewal, malformed duplicate containment,
safe errors, and metadata-only audit.
