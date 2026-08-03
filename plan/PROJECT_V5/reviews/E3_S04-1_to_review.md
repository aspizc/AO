# Review Submission — V5 E3/S04 (Trial 1)

## Scope

- Added an in-memory coordination queue harness with participant fences,
  addressed inboxes, idempotent send, receive/reclaim, ACK tombstones, and
  inspectable state.
- Exercised the real `createCoordination` factory, all seven real coordination
  tools, and the real MCP call handler without Redis, files, network, or a
  shared MCP process.
- Compared deterministic public transcripts across direct and MCP access.
- Proved both surfaces exchange and ACK deliveries through one service state in
  both directions.
- Compared direct and MCP error codes for all seven operations with
  Zod-valid, domain-rejected inputs.

## TDD evidence

- RED: the parity test initially failed because its in-memory queue contract did
  not yet exist.
- GREEN: all three parity scenarios passed.
- Expanded coordination matrix passed 149 tests, with six expected opt-in live
  Redis skips and zero failures.
- Independent pre-review rerun of parity, tool, and audit coverage passed
  10/10; syntax and repository diff checks passed.
- No live Redis, shared MCP process, or network service was contacted.

## Security and compatibility evidence

- Registration responses are normalized before cross-surface comparison so
  assertion failures cannot print lease tokens.
- Queue snapshots contain token digests but no plaintext token field or value.
- Domain and generic-call audit snapshots contain no body, metadata, plaintext
  token, or token digest.
- All coordination MCP calls leave the legacy audit writer empty.
- This sheet changes tests only; production direct/MCP, `message.*`, and
  `agents:events` behavior is unchanged.

## Review request

Review whether the harness exercises the real public surfaces rather than
parallel implementations; whether all seven success shapes and error codes are
covered; whether shared-state exchange is genuinely bidirectional across
surfaces; and whether tokens are protected from persistence and assertion
output. Return `Verdict: OK` or `Verdict: KO`; list only blocking findings for
a KO.
