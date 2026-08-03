# Independent Review — Project V5 B/0/02 (Trial 1)

Verdict: **KO**

Reviewer profile: `gpt-5.6-sol`, reasoning `ultra`, service
`priority/fast`.

## Blocking findings

1. **The client accepts a contradictory protocol, participant type, and scope
   as `ready`, so it does not fail closed against the sheet's forbidden scope
   fallback.**

   `start()` checks only the textual readiness state and two integer limits
   (`gateway/src/coordination_client.js:554-575`); it does not validate the
   protocol version or advertised scope. `safeParticipant()` accepts any
   nonempty participant type and scope (`gateway/src/coordination_client.js:178-210`),
   and both initial registration and heartbeat install that projection without
   comparing it with the requested/admitted identity
   (`gateway/src/coordination_client.js:406-410`,
   `gateway/src/coordination_client.js:509-510`,
   `gateway/src/coordination_client.js:591-594`).

   A fake public-contract adapter was configured to advertise
   `protocolVersion: 999` and `scope-a`, then return an `agent` in `scope-b`
   after the client explicitly requested `scope-a`. `await client.start()`
   succeeded with:

   ```json
   {
     "state": "ready",
     "participantType": "agent",
     "scopeId": "scope-b"
   }
   ```

   This contradicts the orchestrator-only profile and the explicit prohibition
   on hidden scope fallback (`plan/PROJECT_V5/B/0/02.md:19-29`). The missing
   focused test must prove that unsupported status versions, status/request
   scope disagreement, non-orchestrator registration, and heartbeat changes to
   participant ID/type/scope fail with
   `COORDINATION_CLIENT_CONTRACT_INVALID` without entering `ready`.

2. **`stop()` is not an abortable boundary and can remain pending forever on
   one unresolved coordination call.**

   Timer work is only epoch-fenced after the awaited call returns
   (`gateway/src/coordination_client.js:493-520`). No abort signal is created or
   passed to the direct operations, while `stop()` awaits unregister and then
   every tracked promise without a bound
   (`gateway/src/coordination_client.js:394-404`,
   `gateway/src/coordination_client.js:649-669`). With a deferred heartbeat,
   firing the scheduled callback and calling `stop()` produced
   `pending`; the heartbeat input contained only
   `participantId,leaseToken,leaseTtlMs` and `stop()` resolved only after the
   reviewer manually resolved the heartbeat. The same unbounded wait applies
   directly to unregister.

   The sheet requires an abortable loop
   (`plan/PROJECT_V5/B/0/02.md:42-45`). This also makes the newly chosen
   single-use recovery contract unsafe: the public guidance says to await the
   terminal `stop()` and construct a new instance
   (`docs/coordination-bus.md:582-597`,
   `gateway/README.md:152-160`), but that recovery can deadlock. The sheet still
   calls the profile reusable (`plan/PROJECT_V5/B/0/02.md:17-24`) and never
   establishes terminal single-use as an acceptance decision. Trial 2 must
   either reconcile that decision explicitly with the sheet and provide a
   bounded/abortable terminal stop, or support a safe restart transition.
   Missing tests must cover deferred status, register, heartbeat, late
   registration cleanup, and unregister while asserting bounded stop,
   cancellation fencing, idempotency, and no post-stop rejoin.

3. **A finite injected clock can make the supposedly safe status surface throw
   a raw native exception permanently.**

   `safeNow()` accepts every finite number
   (`gateway/src/coordination_client.js:167-176`), `schedule()` stores it as an
   absolute timestamp (`gateway/src/coordination_client.js:354-364`), and
   `getStatus()` calls `toISOString()` without validating the JavaScript `Date`
   range (`gateway/src/coordination_client.js:318-342`). With
   `clock: () => Number.MAX_VALUE`, `start()` rejected safely once, but every
   subsequent `getStatus()` threw the raw
   `RangeError: Invalid time value`.

   That violates the safe status/no-raw-error acceptance criterion
   (`plan/PROJECT_V5/B/0/02.md:58-63`) and the public status contract
   (`docs/coordination-bus.md:582-587`). The missing fake-clock test must cover
   finite values outside the representable `Date` range and overflow after
   adding a delay, and must prove that `getStatus()` always returns a frozen
   safe projection or a stable client error, never a native/raw exception.
