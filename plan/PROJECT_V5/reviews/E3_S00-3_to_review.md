# Review Submission — V5 E3/S00 (Trial 3)

## Prior KOs preserved

- Trial 1 found the `coordinationPrefix: "agents"` alias of `agents:events`.
- Trial 2 found that only `register` inspected an injected queue description,
  allowing the other operations to bypass the reserved-stream guard.

## Correction

- Promoted the safe queue-description check into the common availability
  precondition called first by all seven service operations.
- Kept `register`'s public queue result while removing its redundant second
  description read.
- Added a table-driven regression over register, heartbeat, discover,
  unregister, send, receive, and ACK with a prepopulated unsafe injected queue.
  Every call now returns `COORDINATION_INTERNAL_ERROR` before any queue method,
  including participant reads and heartbeat writes.
- Retained the trial-2 defenses in the shared key contract and the direct
  factory's pre-queue-construction validation.

## Verification

- Factory plus all service suites: 69/69 passed.
- All coordination suites: 128 passed, six expected opt-in live Redis tests
  skipped, zero failed.
- Syntax and repository diff checks passed.
- No Redis or shared MCP process was used.

## Review request

Re-review the complete E3/S00 scope and both prior corrections. Confirm that
the reserved legacy Stream cannot be selected by the shared adapter, direct
configuration, a custom queue factory, or any of the seven operations over an
injected queue, and that rejection precedes queue access/mutation. Also verify
the original factory, error identity, injection, snapshot, laziness, and
inherited service requirements. Return `Verdict: OK` or `Verdict: KO`; list
only blocking findings for a KO.
