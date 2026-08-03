# Review Verdict — V5 E2/S02 (Trial 1)

Verdict: **KO**

## Blocking finding

Lua does not fully validate a stored dedupe envelope before mutating its
window. With a structurally valid dedupe whose `createdAt` is not ISO:

- `PEXPIRE` renewed the TTL from approximately 5 seconds to 60 seconds
- one metadata event was appended
- JavaScript then rejected the duplicate as `COORDINATION_INVALID_DATA`

This repeats the late-validation/early-mutation failure class found in E2/S01.

An optional property explicitly present with `undefined` is also accepted by
the adapter, removed by `JSON.stringify`, and can make a Lua-successful retry
fail only after renewal when JavaScript compares property presence.

## Required correction

- reject or canonically normalize explicit `undefined` optional properties
- fully validate stored dedupe timestamps before `PEXPIRE` or metadata append
- prove corrupt dedupe causes no TTL or event mutation
- prove equal retry renewal, conflict without renewal, and post-window
  redelivery in the live Redis test

The best-effort metadata `pcall` after a valid authoritative send is accepted;
an events Stream at its maximum ID must not turn a committed send into failure.
