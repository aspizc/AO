# Independent Review Result — Project V5 G/0/02 CORE (Trial 4)

## Verdict

**OK** for technical candidate
`62ebedfeb58887d80422746815e4c378c435fde5`.

Trial 4 closes Trial 3 P1-1. A rejected blocked-quarantine recovery claim now
derives and validates every contract-relevant replacement value before the
receipt's private recovery history, claim epoch, lease, or timestamp can
change. Two independent expiry-overflow requests left the receipt unchanged;
the same A and B recovery IDs then obtained exactly `claim-2` and `claim-3`,
and a fresh C was denied only after those two successful claims legitimately
consumed the fixed capacity.

No P0 or P1 finding remains in the reviewed range. This verdict accepts only
the frozen standalone in-memory core candidate. It does not integrate or
promote the candidate, mark the full `G/0/02` sheet complete, or claim a
durable repository, business-effect atomicity, body vault, Redis
crash/reclaim lane, service/lifecycle wiring, health/inventory composition, or
release readiness.

## Reviewer profile

- Requested model profile: **GPT-5.6 Sol**
- Requested reasoning profile: **ultra**
- Requested service profile: **Priority/Fast**
- Review date: **2026-07-26**

The review was performed independently without delegation or agents. The
isolated worktree exposes no external attestation of model, reasoning, or
service-tier telemetry, so the profile above records the requested
configuration.

## Frozen identity and scope

- Branch: `feat/V5-G-0-02-consumer`
- Trial 3 result-only KO / exact Trial 4 base:
  `f7f7386d10b21d6c6aa7bc85fee4ee9fced035c8`
- Base tree: `2339c6ef2b55ac546c8dba1d26d049b69af5d832`
- Trial 4 RED commit:
  `4d6f0de5c4bb0e2264c55b295f9b65964340b91a`
- RED tree: `9464910f248ad4ab8e4d4e333ac6fe49e1035c87`
- Trial 4 technical commit:
  `62ebedfeb58887d80422746815e4c378c435fde5`
- Technical tree: `98929c20e08d9ce8d144dd64887952cbdda24873`
- Trial 4 request-only commit / review HEAD:
  `1a9d8ad93c114d4fbe4d7b1fa890371cf7b50887`
- Request tree: `53d3cec46bd4947238ae37624a15a35ffaa4fe33`
- Exact technical range:
  `f7f7386d10b21d6c6aa7bc85fee4ee9fced035c8..62ebedfeb58887d80422746815e4c378c435fde5`
- Review worktree:
  `/tmp/agents-orchestrator-v5-g002.MsiMXe/worktree`

Parentage is exact and linear: RED is the direct child of the Trial 3 result,
the technical commit is the direct child of RED, and the request is the
direct child of the technical commit. The technical range contains exactly
two commits, two files, 101 insertions, and 7 deletions:

```text
gateway/src/core/repositories/coordination_consumer_repo.js  12 + / 7 -
tests/gateway/coordination_consumer.test.js                  89 + / 0 -
```

The RED commit changes only the dedicated consumer test. The technical commit
changes only the in-memory repository. The request commit adds only
`plan/reviews/PROJECT_V5/G_0_2_CORE-4_to_review.md`. There is no ADR, runner,
service, queue, Redis, MCP/tool, manifest, lock, workflow, migration, plan
sheet, adapter, provider, health, inventory, or shared wiring change.

The worktree was clean at intake and remained clean through all read-only
verification.

## Findings

| Severity | Result |
|---|---|
| P0 | None. |
| P1 | None. |

## Trial 3 finding disposition

### Rejected blocked recovery is now an all-or-nothing transition

`safeExpiry()` rejects an unsafe `now + leaseMs` without returning a value
(`gateway/src/core/repositories/coordination_consumer_repo.js:65-70`).
`claimBlockedQuarantine()` validates its complete input before it obtains or
changes receipt state (`:365-378`), then performs membership, fixed-capacity,
and active-lease decisions without mutation (`:379-401`).

On the winning path, the implementation now:

1. derives the safe expiry at `:403`;
2. derives and validates the next positive safe epoch at `:404-408`;
3. constructs the token and complete replacement lease at `:409-410`; and
4. only then appends history, replaces epoch and lease, and updates time at
   `:412-415`.

There is no catch or translation in this repository operation. An expiry or
epoch derivation error rejects the caller before the first mutation. The token
is deterministically constructed from the validated safe epoch, and the lease
contains only the already-validated owner, token, and expiry. The method never
assigns the receipt-fixed capacity.

The directed regression at
`tests/gateway/coordination_consumer.test.js:824-910` is decisive across both
public and private state:

- after each distinct A/B overflow, `getReceipt()` is deeply equal to the
  original blocked receipt, covering lease, timestamp, state, deliveries, and
  every public field;
- valid A receiving `claim-2` proves neither rejection advanced the private
  epoch;
- valid A and B both winning proves neither rejected ID consumed private
  membership or reduced the fixed capacity;
- valid B receiving `claim-3` proves the normal successful generation order;
  and
- fresh C returning `blocked` proves the original capacity of two was neither
  enlarged nor bypassed.

The independent reproduction observed:

```json
{
  "rejected": [
    {
      "recoveryId": "recovery-A",
      "name": "TypeError",
      "message": "claim expiry exceeds the safe integer range"
    },
    {
      "recoveryId": "recovery-B",
      "name": "TypeError",
      "message": "claim expiry exceeds the safe integer range"
    }
  ],
  "receiptUnchangedAfterEach": true,
  "A": ["claimed", "claim-2"],
  "B": ["claimed", "claim-3"],
  "C": "blocked"
}
```

One initial reviewer-only probe was rejected during setup because its metadata
object retained an own `body` property. That invocation never entered the
focal blocked-recovery path and changed no repository state. The corrected
body-free probe produced the result above.

## Preserved contracts

Source inspection plus the green directed suite confirms that the Trial 4
change did not weaken the previously established behavior:

- A, then B, then A remains one-shot across repeated returns to
  `quarantine_blocked`; a fresh ID can win only while capacity remains
  (`tests/gateway/coordination_consumer.test.js:722-821`).
- Concurrent duplicate recovery requests still produce exactly one winner and
  one blocked result (`:913-942`).
- Capacity is fixed during initial receipt creation, bounded by eight, and
  omitted from public state
  (`gateway/src/core/repositories/coordination_consumer_repo.js:265-306`).
  `blockQuarantine()` does not clear private history (`:503-532`).
- Exhaustion returns the runner degraded after one receive with no handler,
  quarantine-store, ACK, or receive-loop re-entry
  (`tests/gateway/coordination_consumer.test.js:944-1013`).
- Authorized recovery resumes only quarantine storage, receipt commit, and
  ACK; it never re-enters the poison handler (`:644-720`).
- Processing, blocked-recovery, and replay claim tokens continue to fence
  stale and same-owner work (`:782-816`, `:1194-1303`).
- The business effect or quarantine receipt still commits before transport
  ACK. The bound consumer accepts the exact zero-count tombstone response, and
  the unchanged service rejects unknown and cross-inbox IDs
  (`tests/gateway/coordination_consumer.test.js:245-481`;
  `tests/gateway/coordination_service_ack.test.js:277-328`).
- `publicReceipt()` omits claim tokens, claim epochs, recovery history,
  recovery capacity, and quarantine locator
  (`gateway/src/core/repositories/coordination_consumer_repo.js:177-217`).
  Public receipt/status/audit/metric projections remain body-free.
- The repository descriptor remains explicit that this is non-durable,
  non-atomic with a business effect, body-free, in-memory conformance state
  (`gateway/src/core/repositories/coordination_consumer_repo.js:20-26`).
- The unchanged ADR and request accurately retain the durable store,
  business-effect composition, body vault, Redis integration, service/wiring,
  and health/inventory work as dependency-gated scope. No full-sheet,
  integration, promotion, or release claim is made.

## Independent verification

Runtime identity: Node **22.22.1**.

- Dedicated consumer:

  ```text
  node --test --test-concurrency=1 \
    tests/gateway/coordination_consumer.test.js
  ```

  Result: **41 passed / 0 failed / 0 skipped**.

- Exact consumer plus unchanged receive/ACK contracts:

  ```text
  node --test --test-concurrency=1 \
    tests/gateway/coordination_consumer.test.js \
    tests/gateway/coordination_service_receive.test.js \
    tests/gateway/coordination_service_ack.test.js
  ```

  Result: **58 passed / 0 failed / 0 skipped**.

- Lock-matched ESLint **10.8.0** passed over the consumer, in-memory
  repository, and dedicated test. Candidate and provider lock hashes both
  equal
  `71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`;
  ESLint configuration hashes both equal
  `31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`.
- Exact structure selection
  `tests/structure/test_project_layout.py` plus
  `tests/structure/test_v5_coordination_docs.py`:
  **11 passed / 0 failed** with Python **3.13.13** and pytest **9.1.1**.
  Bytecode and pytest cache writes were disabled.
- `git diff --check` passed for both the technical range and the
  technical-to-request range.
- Gitleaks scanned the two technical commits with redaction and found no
  leaks.
- Final read-only index/worktree diff checks were empty before this result was
  created.

No RED execution, aggregate `npm test`, suite aggregation, full CI,
installation, network, Redis, MCP, KYA, provider, service, tmux, migration,
integration, promotion, release, agent, or subagent command was run.

## Final conclusion

**OK.** The rejected blocked-recovery transition is now atomic for all
contract-relevant derived-state failures: no recovery membership, epoch,
lease, timestamp, or capacity change occurs before expiry, next epoch, token,
and lease are valid. The exact two-overflow A/B/C proof and all directed
preservation gates pass. The verdict remains deliberately limited to the
standalone memory-only core.
