# Independent Review Result — Project V5 G/0/02 CORE (Trial 3)

## Review identity and verdict

Verdict: KO

- P0 findings: **0**
- P1 findings: **1**
- Reviewer: **GPT-5.6 Sol, ultra reasoning**
- The frozen candidate was reviewed independently from source and evidence,
  without delegation or agents.
- No code, tests, ADR, plan sheet, or review request was modified. This result
  file is the only review mutation.

## Frozen identity and scope

The worktree was clean at intake. The verified linear chain and trees are:

```text
a85233a8f8b5dc614bad709f1115d6e6b8e43e02  Trial 2 KO base
  tree 48b80cb4e46e98c5be9877b1c15324d098884475
  -> d01d1b253b3745b79ebc4eec7694628bcc4f2465  RED
     tree f55fa34d434ddc7dc1c8911ba6497e89f6cead9d
     -> 6fccc83f036eadb97474394ea82bac155722f677  technical
        tree 7222821dd081a9fdbc2b92aa8eceeb58eea20dc1
        -> 256856d9c4dd30bc912da68d920262aca387bdbc  request only
           tree 87a02513b68619bc1f3f34600daa71ecc374bb9c
```

- Trial 3 technical range:
  `a85233a8f8b5dc614bad709f1115d6e6b8e43e02..6fccc83f036eadb97474394ea82bac155722f677`
- Range identity: **2 commits / 4 files / 283 insertions / 65 deletions**
- The RED commit changes only
  `tests/gateway/coordination_consumer.test.js`.
- The technical commit changes only the ADR, consumer core, and in-memory
  repository.
- The four technical-range paths are exactly:
  - `docs/adr/ADR-V5-G-0-02-coordination-consumer-core.md`
  - `gateway/src/core/coordination_consumer.js`
  - `gateway/src/core/repositories/coordination_consumer_repo.js`
  - `tests/gateway/coordination_consumer.test.js`
- The request commit has direct parent `6fccc83` and adds only
  `plan/reviews/PROJECT_V5/G_0_2_CORE-3_to_review.md`.

## P1 finding

### P1-1 — A rejected recovery claim mutates history before token replacement

The Trial 3 contract requires membership, capacity, history append, and claim
token replacement to form one atomic transition
(`docs/adr/ADR-V5-G-0-02-coordination-consumer-core.md:85-92`,
`docs/adr/ADR-V5-G-0-02-coordination-consumer-core.md:264-269`). The request
also claims one synchronous in-memory CAS transition
(`plan/reviews/PROJECT_V5/G_0_2_CORE-3_to_review.md:28-31`).

The repository validates the derived lease expiry with `safeExpiry()`, which
throws when `now + leaseMs` exceeds the safe-integer range
(`gateway/src/core/repositories/coordination_consumer_repo.js:65-69`).
However, `claimBlockedQuarantine()` increments `claimEpoch` and appends the
recovery ID before evaluating `safeExpiry()` for the replacement lease
(`gateway/src/core/repositories/coordination_consumer_repo.js:403-409`).
JavaScript evaluates the lease object before assigning it, so an expiry error
leaves the prior lease in place while permanently retaining the appended ID
and incremented epoch. No claim token is returned.

A focused read-only reproduction created one blocked receipt with capacity two,
then submitted two otherwise valid fresh recovery IDs whose derived expiries
overflowed:

```text
node --input-type=module - <<'NODE'
import {
  createInMemoryCoordinationConsumerRepository,
} from "./gateway/src/core/repositories/coordination_consumer_repo.js";

const repository = createInMemoryCoordinationConsumerRepository();
const consumeKey = `coord-consume-v1-${"b".repeat(64)}`;
const metadata = {
  protocolVersion: 1,
  scopeId: "scope-1",
  messageId: "message-1",
  fromParticipantId: "sender-1",
  toParticipantId: "recipient-1",
  messageType: "IMPACT_NOTICE",
  classification: "internal",
  createdAt: "2026-07-26T00:00:00.000Z",
};
const initial = await repository.claim({
  consumeKey,
  deliveryId: "1-0",
  recovered: false,
  metadata,
  ownerId: "owner-1",
  now: 0,
  leaseMs: 1,
  maxConsumedRecoveryIdsPerReceipt: 2,
});
await repository.blockQuarantine({
  consumeKey,
  ownerId: "owner-1",
  claimToken: initial.claimToken,
  reasonCode: "HANDLER_TERMINAL",
  now: 1,
});

const rejected = [];
for (const recoveryId of ["recovery-A", "recovery-B"]) {
  try {
    await repository.claimBlockedQuarantine({
      consumeKey,
      ownerId: "owner-overflow",
      recoveryId,
      now: Number.MAX_SAFE_INTEGER,
      leaseMs: 1,
    });
  } catch (error) {
    rejected.push({ recoveryId, message: error.message });
  }
}
const replayA = await repository.claimBlockedQuarantine({
  consumeKey,
  ownerId: "owner-valid",
  recoveryId: "recovery-A",
  now: 2,
  leaseMs: 1,
});
const freshC = await repository.claimBlockedQuarantine({
  consumeKey,
  ownerId: "owner-valid",
  recoveryId: "recovery-C",
  now: 2,
  leaseMs: 1,
});
console.log(JSON.stringify({
  rejected,
  replayA: replayA.status,
  freshC: freshC.status,
}, null, 2));
NODE
```

Observed result:

```json
{
  "rejected": [
    {
      "recoveryId": "recovery-A",
      "message": "claim expiry exceeds the safe integer range"
    },
    {
      "recoveryId": "recovery-B",
      "message": "claim expiry exceeds the safe integer range"
    }
  ],
  "replayA": "blocked",
  "freshC": "blocked"
}
```

Both operations rejected without returning a winner or claim token, yet they
consumed the entire receipt-fixed capacity. A later valid, fresh recovery is
therefore denied before any quarantine-store attempt, receipt commit, or ACK.
This is fail-closed for safety, but it violates the required atomic port
transition and can permanently exhaust the only bounded recovery authority
through failed claims. The normal-input concurrency test
(`tests/gateway/coordination_consumer.test.js:824-853`) does not exercise an
exception while constructing the winning transition.

Required correction: compute and validate the replacement expiry and all other
fallible derived state before mutating the receipt, then apply epoch increment,
history append, lease/token replacement, and timestamp as one transition. Add
a directed rejection test proving that an invalid derived expiry consumes
neither ID, capacity, nor claim generation, and that the same ID can
subsequently win exactly once with a valid expiry.

## Verified behavior outside the finding

The following Trial 3 correction paths and preserved contracts were inspected
and remained sound for their directed cases:

- Failed A, then B, then A leaves both A and B denied; fresh C can claim while
  capacity remains.
- Normal concurrent calls with the same recovery ID produce one `claimed`
  result, one `blocked` result, and exactly one token.
- The capacity is fixed on initial receipt creation, bounded by eight, omitted
  from public receipt state, and cannot be enlarged by a later consumer config.
- `blockQuarantine()` preserves the private history. `publicReceipt()` excludes
  both the list and every recovery ID, and observation/status projections do
  not expose them.
- Capacity denial returns the runner degraded after one receive with no
  handler, quarantine-store, ACK, or receive-loop activity.
- A fresh authorized recovery below capacity resumes only quarantine storage,
  receipt commit, and ACK without handler re-entry.
- Stale processing, replay, and blocked-recovery tokens cannot commit or block
  after a replacement claim.
- Receipt effect/quarantine commit still precedes transport ACK. The bound ACK
  accepts the exact `ackedCount: 0` tombstone retry, while unknown and
  cross-inbox IDs fail in the unchanged direct service.
- Exported-class and namespace forgery collapse to closed safe projections;
  synchronous throws, rejected observations, and hostile thenables remain
  non-authoritative.
- Handler/vault attempts, retry delays, leases, receive/reclaim/busy polling,
  abort cleanup, metadata, status, and counters retain their declared bounds.
- The descriptor remains explicit that the repository is non-durable, is not
  atomic with a business effect, and stores no body.
- The ADR and request honestly limit this candidate to a standalone core.
  They make no Redis adapter, durable store/migration, service/health wiring,
  full-sheet completion, integration, promotion, or release claim.

## Verification evidence

- `node --test --test-concurrency=1
  tests/gateway/coordination_consumer.test.js`:
  **40 passed, 0 failed, 0 skipped**.
- Directed consumer plus unchanged receive/ACK service tests:
  **57 passed, 0 failed, 0 skipped**.
- Directed ESLint passed with lock-matched ESLint **10.8.0**. Candidate and
  tool-provider `gateway/package-lock.json` hashes both equal
  `71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`;
  ESLint configuration hashes both equal
  `31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`.
- Exact structure checks:
  **11 passed** with Python **3.13.13** / pytest **9.1.1**.
- `git diff --check
  a85233a8f8b5dc614bad709f1115d6e6b8e43e02..6fccc83f036eadb97474394ea82bac155722f677`:
  **passed**.
- `git diff --check
  6fccc83f036eadb97474394ea82bac155722f677..256856d9c4dd30bc912da68d920262aca387bdbc`:
  **passed**.
- Runtime identity: Node **22.22.1**.
- The focused reproduction above used only in-memory state and created no
  files or services.

No aggregate `npm test`, suite aggregation, `scripts/ci.sh`, full CI, network,
Redis, MCP, KYA, provider, service, tmux, migration, integration, promotion,
release, or agent command was run.

## Final verdict

**KO.** Trial 3 closes the ordinary A → B → A reuse, exact duplicate race,
fixed-capacity, privacy, and denied-runner paths, and its directed regressions
are green. The submitted in-memory port still does not make history append and
token replacement atomic when lease derivation rejects: failed calls can burn
the complete receipt capacity without producing a claim. That P1 must be
corrected before the standalone core can receive an independent OK.
