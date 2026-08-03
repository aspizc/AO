# Review Submission — V5 E2/S02 (Trial 2)

## Correction after trial 1

- Preserved the trial-1 KO and its Redis reproduction.
- Rejected optional envelope properties explicitly present with `undefined`;
  wire serialization and later property-presence comparison can no longer
  diverge.
- Aligned JS and Lua on canonical
  `YYYY-MM-DDTHH:mm:ss.sssZ` timestamps, including calendar/leap-year checks
  inside Lua before any dedupe mutation.
- Added the reviewer's corrupt-dedupe live case and proved neither TTL nor
  metadata-event count changes before `COORDINATION_INVALID_DATA`.
- Strengthened the live window evidence: equal retry renews a shortened TTL,
  conflict preserves it, deletion/expiry of the dedupe key allows a new
  delivery ID, and capacity remains exact.
- Retained successful authoritative send when best-effort metadata cannot
  append at the maximum Stream ID.

## Verification

- frozen contract, foundation, presence, and send fake suites — 39/39 passed
- default opt-in suite — one intentional skip without a Redis URL
- isolated Redis 7.2 expanded send test — 1/1 passed
- exact-prefix cleanup ran and the isolated container was stopped
- syntax and scoped diff checks passed

## Review request

Re-review both trial-1 findings and the strengthened window tests. Confirm no
dedupe TTL/event mutation precedes complete stored-envelope validation,
explicit undefined cannot reach Redis, canonical timestamp validation agrees
between JS and Lua, and renewal/conflict/redelivery/capacity/metadata behavior
remains correct.
