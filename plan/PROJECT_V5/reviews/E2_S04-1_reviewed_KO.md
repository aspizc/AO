# Review Verdict — V5 E2/S04 (Trial 1)

Verdict: **KO**

## Blocking finding

The ACK Lua operation deletes corrupt pending entries instead of failing
closed. In
`gateway/src/core/coordination_queue.js:812`, the stored envelope validation
only requires decodable JSON plus matching `toParticipantId` and `scopeId`
through line 820. It does not validate the frozen envelope shape, required
fields, protocol version, classification, timestamp, or optional-field types.

An isolated Redis 7.2 reproduction inserted and made pending this incomplete
envelope:

```json
{"toParticipantId":"pt-recipient","scopeId":"project:v5"}
```

`ackInbox` returned `{status:"acked",ackedCount:1}`, reduced the inbox length
to zero, and wrote tombstone value `1`. This contradicts the submission's
claim that corrupt pending data fails closed and makes a poisoned delivery
irreversibly disappear through the normal ACK port.

The live test at
`tests/gateway/coordination_queue_ack_live.test.js:257` covers a valid third
envelope and a corrupt tombstone, but never a corrupt pending envelope.

## Required correction

- Validate the complete stored v1 envelope before any tombstone, `XACK`, or
  `XDEL` mutation, using the same exact field/type/timestamp constraints as the
  frozen wire contract.
- Add live coverage for incomplete, malformed, and foreign pending envelopes.
- Prove each rejection leaves the PEL entry, Stream row, tombstones, and
  metadata events unchanged.

## Verification

- Adapter suite: 58 passed, 4 opt-in live tests skipped.
- Isolated Redis 7.2 live suite: 4/4 passed.
- Independent corrupt-envelope reproduction: ACKed and deleted the invalid
  pending row, confirming the blocking finding.
- Both reviewer-owned Redis containers were stopped and removed.
- `node --check gateway/src/core/coordination_queue.js` — passed.
- `git diff --check -- gateway/src/core/coordination_queue.js
  tests/gateway/coordination_queue_ack.test.js
  tests/gateway/coordination_queue_ack_live.test.js` — passed.
