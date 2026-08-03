# Review Verdict — V5 E3/S00 (Trial 2)

Verdict: **KO**

## Blocking finding

The injected/custom queue guard is enforced only by `register`.
`safeQueueDescription()` is not reached by the other six service operations.
Consequently, an injected queue that advertises `agents:events` and already
contains a valid participant can execute `heartbeat` and reach
`putParticipant`, where that queue may publish coordination metadata to the
reserved legacy Stream.

This was reproduced without Redis by injecting such a queue with one valid
presence record: `heartbeat` returned successfully and the queue recorded one
participant write. The same queue-contract boundary is absent from discovery,
unregistration, send, receive, and ACK, so the correction does not yet ensure
that every supported direct/custom path fails closed before queue access or
mutation.

## Required correction

- Enforce the safe queue description for every service operation before its
  first queue method can run, while retaining the existing prevalidation that
  rejects `coordinationPrefix: "agents"` before `queueFactory`.
- Add a regression with an unsafe, prepopulated injected queue proving that
  `heartbeat` fails with `COORDINATION_INTERNAL_ERROR` and performs zero
  writes. Cover the common boundary so the remaining operations cannot bypass
  it.
- Preserve the shared adapter rejection, exact seven methods, canonical error
  identity, lazy/injected construction, configuration snapshotting, and the ten
  inherited service scenarios.

## Verification

- Focused contract/factory/inherited service suites: 26/26 passed.
- All coordination suites: 127 passed, six opt-in live Redis tests skipped.
- Independent unsafe injected-queue probe: unexpected heartbeat success,
  `writes=1`.
- No Redis or shared MCP process was used.
