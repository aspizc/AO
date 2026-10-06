# Independent Review Result — Project V5 G/0/02 CORE (Trial 2)

## Review identity and verdict

- Verdict: **KO**
- P0 findings: **0**
- P1 findings: **1**
- Reviewer: **GPT-5.6 Sol, ultra reasoning**
- The review was performed independently from the frozen candidate, from
  source, without delegation or agents.
- No code, test, ADR, plan sheet, or existing review request was modified. The
  only authorized mutation is this result file.

## Frozen identity and scope

The candidate was clean at intake. The exact linear chain and trees are:

```text
f68edf0e2146254f5a70b765a73bc68c974e5473  base
  -> 66bdf7adccd36bf8196bff30ef845b5cf3f9efe3  RED
     tree 4d387d16620761d90b7c6da3fcdce6bb38c60eda
  -> b2892b4818677e3f3d02d134a2caa686c99252da  technical
     tree 329456df832c572b5d51a3fdf5b8aabb9fbad053
  -> c499f50fb128673f0e6bec2733424c62a6f1452f  request only
     tree 7f616b9c57bbd552962184e255e964f377113c4c
```

- Trial 2 technical range:
  `f68edf0e2146254f5a70b765a73bc68c974e5473..b2892b4818677e3f3d02d134a2caa686c99252da`
- Range identity: **2 commits / 4 files / 554 insertions / 42 deletions**
- The RED commit changes only
  `tests/gateway/coordination_consumer.test.js`.
- The technical commit changes only the ADR, consumer core, and in-memory
  repository.
- The four technical-range paths are exactly:
  - `docs/adr/ADR-V5-G-0-02-coordination-consumer-core.md`
  - `gateway/src/core/coordination_consumer.js`
  - `gateway/src/core/repositories/coordination_consumer_repo.js`
  - `tests/gateway/coordination_consumer.test.js`
- The request commit has direct parent `b2892b4` and adds only
  `plan/reviews/PROJECT_V5/G_0_2_CORE-2_to_review.md`.

## P1 finding

### P1-1 — A consumed recovery ID becomes reusable after another recovery ID

The Trial 2 contract requires each `quarantineRecoveryId` to be accepted at
most once for a receipt
(`docs/adr/ADR-V5-G-0-02-coordination-consumer-core.md:77-82`) and explicitly
says that reusing it cannot trigger another store attempt
(`docs/adr/ADR-V5-G-0-02-coordination-consumer-core.md:183-190`). The request
makes the same one-shot and persisted claim
(`plan/reviews/PROJECT_V5/G_0_2_CORE-2_to_review.md:21-32`).

The repository does not retain a receipt-wide history or monotonic
authorization generation. It stores one scalar `blockedRecoveryId`
(`gateway/src/core/repositories/coordination_consumer_repo.js:268-288`).
`claimBlockedQuarantine()` denies only when the submitted ID equals that
single current value, then overwrites it with every different accepted ID
(`gateway/src/core/repositories/coordination_consumer_repo.js:373-385`).
`blockQuarantine()` returns a failed recovery to `quarantine_blocked` but does
not preserve older consumed IDs
(`gateway/src/core/repositories/coordination_consumer_repo.js:474-503`).

A focused reproduction used one repository and one blocked receipt:

```json
{
  "firstA": {
    "recoveryId": "recovery-A",
    "status": "claimed",
    "claimToken": "claim-2"
  },
  "firstB": {
    "recoveryId": "recovery-B",
    "status": "claimed",
    "claimToken": "claim-3"
  },
  "replayedA": {
    "recoveryId": "recovery-A",
    "status": "claimed",
    "claimToken": "claim-4"
  }
}
```

Both A and B were returned to `quarantine_blocked` as failed recoveries before
the next claim. After B overwrote the scalar, replaying the already-consumed A
received a fresh fenced claim. The consumer treats that `claimed` result as
authority to enter `quarantineStore.put`, quarantine commit, and ACK
(`gateway/src/core/coordination_consumer.js:842-884`). Alternating two known
IDs can therefore authorize an unbounded number of vault attempts. Claim-token
replacement still prevents an old in-flight mutation, but it does not provide
the promised one-shot authorization.

The added test covers immediate reuse of A, replacement by B, and stale token
fencing, then commits B
(`tests/gateway/coordination_consumer.test.js:691-759`). It never fails B and
tries A again, so the green suite does not exercise receipt-wide one-shot
semantics.

Required correction: persist a receipt-wide one-shot authorization invariant
using a bounded generation/nonce or equivalent CAS design that cannot forget a
consumed recovery merely because another ID was accepted. Add the failed
sequence A → B → replay A and prove that A remains denied; also prove replay B
is denied, a fresh C can claim, and stale/concurrent claim tokens still cannot
commit or block.

## Verified behavior outside the finding

The following correction and regression paths were inspected and remained
sound in the reviewed candidate:

- An ordinary call, the same unconfigured consumer, and an unauthorized
  replacement stay paused after vault exhaustion. They do not ACK, re-enter
  the handler, issue another receive in the same run, or create a hot poison
  loop.
- A fresh explicitly configured replacement can resume the preserved poison
  outcome at vault `put`, commit quarantine, and ACK without handler re-entry.
- Active recovery leases and replaced claim tokens fence concurrent and stale
  commits, including reused owner IDs.
- The exported `CoordinationConsumerError` is not privately branded merely by
  construction; forged consumer-namespace codes and raw messages collapse to
  fixed projections in the directed ACK and replay cases.
- Synchronous observation throws, rejected promises, and the directed hostile
  rejecting thenable remain non-authoritative and produce no observed
  `unhandledRejection`; effect, receipt, ACK, result, and counters remain
  unchanged.
- Effect or quarantine receipt commit still precedes transport ACK. Crash
  seams, redelivery, idempotent consume identity, and abort-after-commit retain
  their Trial 1 ordering.
- The bound ACK contract retains exact delivery projection and accepts
  `ackedCount: 0` only through the unchanged exact tombstone path; unknown and
  cross-inbox IDs fail in the direct service contract.
- Replay remains server-authorized, body-free before authorization, context
  revalidated, locator-private, claim-token fenced, and convergent after a
  committed replay.
- Handler/vault attempts, retry delays, leases, receive/reclaim/busy polling,
  abort cleanup, metadata shape, frozen status, saturating counters, and the
  in-memory non-durability descriptor retain their declared bounds.
- The request honestly limits the candidate to a standalone core and makes no
  Redis integration, service/health wiring, full-sheet completion,
  integration, promotion, or release claim.

## Verification evidence

- `node --test --test-concurrency=1
  tests/gateway/coordination_consumer.test.js`:
  **38 passed, 0 failed, 0 skipped**.
- Directed consumer plus unchanged receive/ACK service tests:
  **55 passed, 0 failed, 0 skipped**.
- Directed ESLint with the request's lock-matched binary and configuration:
  **passed**.
- Explicit structure checks:
  **11 passed**.
- `git diff --check
  f68edf0e2146254f5a70b765a73bc68c974e5473..b2892b4818677e3f3d02d134a2caa686c99252da`:
  **passed**.
- `gitleaks detect --redact --no-banner
  --log-opts=f68edf0e2146254f5a70b765a73bc68c974e5473..b2892b4818677e3f3d02d134a2caa686c99252da`:
  **2 commits scanned, no leaks found**.
- The focused A → B → A repository reproduction shown above created no files
  or services.

No aggregate `npm test`, suite aggregation, `scripts/ci.sh`, full CI, network,
Redis, MCP, KYA, provider, service, tmux, migration, integration, promotion,
release, or agent command was run.

## Final verdict

**KO.** Trial 2 closes the original recovery reachability, ordinary exported
error forgery, and asynchronous observation failures in its directed cases,
and the previous core contracts remain green. However, the recovery
authorization is not one-shot for the lifetime of a receipt: rotating a second
ID makes an already-consumed ID valid again. That P1 must be corrected before
the standalone core can receive an independent OK.
