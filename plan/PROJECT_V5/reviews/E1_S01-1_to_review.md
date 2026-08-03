# Review Submission — V5 E1/S01 (Trial 1)

## What was done

- Implemented generated-only `pt-<uuid>` registration with a bounded
  eight-attempt collision loop.
- Generated one high-entropy lease token and persisted only its SHA-256 digest.
- Derived all three lease timestamps from one injected clock reading.
- Returned the flat public participant, plaintext token, and an explicitly
  allowlisted queue description.
- Normalized queue and dependency failures to stable errors without forwarding
  sensitive messages.
- Emitted a metadata-only audit event only after successful persistence.

## Verification

- RED: five focused cases failed with `COORDINATION_NOT_IMPLEMENTED`.
- GREEN:
  `node --test tests/gateway/coordination_service_foundation.test.js tests/gateway/coordination_service_register.test.js`
  — 11 tests passed.

## Contract decisions frozen here

- Callers cannot supply `participantId`.
- The response is flat and includes `queue`.
- Collision exhaustion after eight attempts returns
  `COORDINATION_ID_COLLISION`.
- Unexpected queue states return `COORDINATION_INTERNAL_ERROR`.

## Review request

Review only E1/S01 against the reviewed plan and frozen public/wire contracts.
Pay special attention to token/digest separation, aliasing, response shape,
queue descriptor projection, collision termination, error secrecy, clock/TTL
behavior, and audit timing/content. Do not treat the stale runbook's nested
response or caller-supplied ID as authoritative; those contradictions are
queued for E4 reconciliation.
