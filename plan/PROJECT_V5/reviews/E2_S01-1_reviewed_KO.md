# Review Verdict — V5 E2/S01 (Trial 1)

Verdict: **KO**

## Blocking finding

Presence scripts mutate authoritative state before their final metadata
`XADD`. Redis Lua serializes a script but does not roll back earlier writes
when a later command fails.

The reviewer reproduced this in an isolated Redis 7.2 instance by setting the
events Stream last ID to `18446744073709551615-18446744073709551615`:

- register returned `COORDINATION_UNAVAILABLE` but left presence, SET
  membership, and the inbox group behind
- unregister returned `COORDINATION_UNAVAILABLE` but had already deleted
  presence and membership and applied the orphan TTL

This can lose the only plaintext token for a lease that the caller believes
failed and violates lifecycle atomicity.

## Required correction

- ensure an event-append failure occurs before authoritative presence/registry
  mutation
- prove register and unregister leave authoritative state unchanged when
  `XADD` cannot allocate another Stream ID
- preserve all other passing lifecycle, fencing, TTL, discovery, and secrecy
  behavior
