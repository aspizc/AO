# Review Submission — V5 E2/S01 (Trial 2)

## Correction after trial 1

- Preserved the trial-1 KO and its Redis 7.2 reproduction.
- Added RED ordering assertions for register, heartbeat, and unregister.
- Added an opt-in live Redis adversarial test that saturates the metadata
  Stream at ID `18446744073709551615-18446744073709551615`.
- Reordered each lifecycle script so the metadata `XADD` happens after all
  validation/fencing and group checks but before authoritative presence,
  registry, or orphan-TTL mutation.
- A failed append can no longer activate, renew, delete, or orphan a presence.
  Register may leave only an empty inbox/group created before the failed
  append; it does not create an active authority or consume the caller's
  one-time token.

## Verification

- frozen contract, adapter foundation, presence, and default live suite —
  31 passed and one opt-in test skipped
- isolated Redis 7.2 live adversarial test — 1/1 passed
- live assertions proved failed register left no presence or SET membership
- live assertions proved failed unregister preserved presence, SET membership,
  and the active inbox without an orphan TTL
- the exact-prefix test cleanup ran and the isolated container was stopped
- syntax and scoped diff checks passed

## Review request

Re-review the trial-1 P0 and the resulting command order. Confirm there is no
authoritative mutation before a potentially failing metadata append, the live
test covers both register and unregister, and all previously passing S01 fence,
TTL, secrecy, discovery, and port behavior remains intact.
