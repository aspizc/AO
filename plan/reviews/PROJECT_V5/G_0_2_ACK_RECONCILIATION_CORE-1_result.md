# Independent Review Result — Project V5 G/0/02 ACK_RECONCILIATION_CORE (Trial 1)

## Review identity and verdict

Verdict: **KO**

- P0 findings: **0**
- P1 findings: **4**
- P2 findings: **1 unresolved**
- Requested reviewer profile: **GPT-5.6 Sol, ultra reasoning,
  Priority/Fast**
- Review date: **2026-07-27**

The model, reasoning, and service profile above records the requested review
configuration. The worktree provides no independent telemetry with which to
attest those runtime settings, so this result makes no telemetry claim. The
reviewer did not spawn or delegate to any additional agents.

## Frozen identity and scope

- Branch: `feat/V5-G-0-02-ack-core`
- Exact base:
  `e2bf927628803c48f38698221a1ff54a8b4d8c58`
- Base tree:
  `596561505bfde7efd82f99fb62b5d9047f9863e9`
- RED 1:
  `080117b3080bb660db65c4032b7b3c95ae80567c`
- RED 1 tree:
  `e2dc1611afac5d29cbb0f1c09c12531371d46f84`
- RED 2:
  `5e49926d3c577518f7e3d4bb4cf0e5dcbadc4b68`
- RED 2 tree:
  `cfe2d99ec3ae2fd90fc7fb4e48753fa41874634a`
- Technical candidate:
  `b95d492fe36ed3e00ca7bf73eae23a82ed8ae0bb`
- Technical tree:
  `f83be5672e061ccb2d28eff10566e84bc4ee4d7f`
- Request-only HEAD:
  `76e63cfeff90011b36b955f67eb6504023a6b25c`
- Request tree:
  `081438f36366b918f37f5cc3cb7023bedbe13d6f`
- Exact technical range:
  `e2bf927628803c48f38698221a1ff54a8b4d8c58..b95d492fe36ed3e00ca7bf73eae23a82ed8ae0bb`
- Review worktree:
  `/tmp/agents-orchestrator-v5-g002-ack-core.wrwx7a/worktree`

Parentage is exact and linear: RED 1 is the direct child of the base, RED 2
is the direct child of RED 1, the technical candidate is the direct child of
RED 2, and the request is the direct child of the technical candidate. The
technical range is exactly **3 commits / 7 files / 2583 insertions /
13 deletions**:

```text
gateway/src/core/coordination_ack_reconciler.js
gateway/src/core/coordination_consumer.js
gateway/src/core/coordination_queue.js
gateway/src/core/repositories/coordination_consumer_repo.js
tests/gateway/coordination_ack_reconciliation.test.js
tests/gateway/coordination_consumer.test.js
tests/gateway/coordination_queue_ack.test.js
```

This result reviews only that frozen, standalone ACK-reconciliation core. It
does not integrate or promote it, mark `G/0/02` complete, or claim a durable
store, business-effect atomicity, production Redis wiring, service/lifecycle
composition, health/inventory completion, or release readiness.

## Findings

### P1-1 — Dependency DTO normalization validates one value and consumes another

The normalizers repeatedly read caller-controlled properties instead of
snapshotting one value before validation. `normalizeClaim()` reads
`source.status` to validate it, reads it again to select an exact field set,
and reads `claim.status` again to select semantics
(`gateway/src/core/coordination_ack_reconciler.js:270-305`).
`normalizeStatus()` validates `result.status` and then rereads it for its
return value (`:330-335`). `normalizeSummary()` validates every counter and
proof property, then rereads all of them while constructing the allegedly
validated frozen projection (`:338-374`).

An enumerable accessor can therefore switch between two allowed statuses
after validation, or return a non-integer only when the summary is copied.
The focused in-memory reviewer probe observed:

```json
{
  "normalizerTOCTOU": {
    "statusReads": 2,
    "committedProof": "ORPHAN_ACK",
    "summaryReads": 2,
    "copiedPending": "UNVALIDATED"
  }
}
```

The tombstone accessor returned `ack_tombstone` to validation and `absent` to
the branch. The reconciler consequently ran orphan finalization and committed
`ORPHAN_ACK`, not the tombstone proof it had validated. The summary accessor
returned integer `0` to validation and the unvalidated string shown above to
the frozen public result. Exact-key checks do not close accessor or mutation
time-of-check/time-of-use behavior.

Required correction: snapshot each own field exactly once into a data-only
DTO, or reject accessors explicitly, and validate and consume only that
snapshot. Apply the rule consistently to claim, renewal, status, page,
intent, and summary normalization.

### P1-2 — Claim ignores `dueAt`, while stale terminal claims abort reconciliation

Listing filters out future work and includes only due pending/deferred intents
or expired claims
(`gateway/src/core/repositories/coordination_consumer_repo.js:733-777`).
The actual claim transition does not repeat the `dueAt <= now` predicate under
the mutation authority. After its terminal and active-lease checks it claims
the intent unconditionally and increments its epoch
(`:780-830`). A stale list result can therefore defeat a concurrent defer and
its backoff.

The focused in-memory probe deferred an intent until `1000` and then claimed
it at `5`:

```json
{
  "dueAtBypass": {
    "retryAt": 1000,
    "claimNow": 5,
    "status": "claimed",
    "claimEpoch": 2
  }
}
```

There is a second convergence defect in the same list/claim race. The
repository legitimately returns `committed` or `recovery_required` when
another worker terminally settles a previously listed intent
(`:789-799`). A corrected due-time CAS also needs a benign `not_due` result.
The reconciler accepts only `busy` and `claimed`
(`gateway/src/core/coordination_ack_reconciler.js:270-305`) and translates
every other result into `COORDINATION_ACK_RECONCILIATION_FAILED`
(`:508-524`). The reviewer probe observed that exact fatal result for each of
`committed`, `recovery_required`, and `not_due`; none converged as a no-op.

Required correction: enforce reconcilable state and due time atomically in
`claim`, return a closed `not_due` outcome without changing state, epoch, or
token, and make terminal/not-due results benign stale-list no-ops in the
reconciler.

### P1-3 — Any queue holder can mint the supposedly internal recovery facet

The design requires tombstone inspection and orphan finalization to be
queue-internal operations and “never service, tool, MCP, or caller authority”
(`plan/PROJECT_V5/G/0/02.md:103-120`). The exported queue class instead has a
public `createAckReconciliationPort()` method that returns both privileged
operations
(`gateway/src/core/coordination_queue.js:2016-2028,2621-2628`).

The submitted unit test demonstrates the exposure directly: it establishes
only that the operation names are absent from the queue instance, then calls
the public factory on that same instance and successfully performs tombstone
inspection
(`tests/gateway/coordination_queue_ack.test.js:285-305`). The same public
factory is used to perform orphan finalization at `:308-320`. Renaming the
operations behind a publicly callable facet factory does not remove caller
authority.

Required correction: create and inject the recovery facet only inside trusted
runtime composition. A holder of the public queue API must have no method,
property, exported helper, or discoverable capability with which to obtain
or invoke tombstone inspection or orphan finalization.

### P1-4 — Corrupt Redis state can defer forever instead of becoming terminal unknown

Tombstone inspection performs a plain `GET`
(`gateway/src/core/coordination_queue.js:2630-2643`). If the tombstone key has
the wrong Redis type, `GET` raises `WRONGTYPE`; the common client wrapper
converts every non-domain error into `COORDINATION_UNAVAILABLE`
(`:2701-2709`). The reconciler treats every inspection exception as transient
transport unavailability and defers (`gateway/src/core/coordination_ack_reconciler.js:532-547`).
Thus deterministic corrupt state is retried indefinitely instead of reaching
the required `TRANSPORT_STATE_UNKNOWN` terminal.

The orphan-finalizer script has the parallel partial-presence defect. Its
shared canonical presence decoder requires `participantId`,
`participantType`, `scopeId`, and `leaseTokenHash`
(`gateway/src/core/coordination_queue.js:91-103`). The finalizer does not use
that decoder: after JSON parsing it checks only `participantId` and `scopeId`,
then returns code 3, `old_participant_present`
(`:1284-1299`; decoded at `:1916-1933`). A partial record such as
`{"participantId":"pt:recipient","scopeId":"project:v5"}` is therefore treated
as live and deferred at
`gateway/src/core/coordination_ack_reconciler.js:596-598`, even though it is
corrupt and ambiguous under the queue's own presence contract.

Both paths contradict the explicit rule that corrupt or ambiguous Redis state
fails closed, while only a valid live old presence defers
(`plan/PROJECT_V5/G/0/02.md:114-120`).

Required correction: classify tombstone `WRONGTYPE` as
`transport_state_unknown`, while preserving genuine connectivity failures as
transient unavailability. Validate finalizer presence with the exact canonical
presence schema; malformed or partial presence must return the unknown code,
not the live-presence code.

### P2-1 (unresolved) — Proof values are strings, not producer-bound evidence

`commitAckIntent()` accepts any of the three proof strings from a caller that
holds the current claim token
(`gateway/src/core/repositories/coordination_consumer_repo.js:10-14,43-46,854-884`).
The direct consumer supplies `DIRECT_ACK` after its transport call
(`gateway/src/core/coordination_consumer.js:773-784`), but the repository does
not itself distinguish that producer from a reconciler asserting
`ACK_TOMBSTONE` or `ORPHAN_ACK`.

This review did not establish conclusively whether the final composition will
make the entire claim/commit port a sufficiently narrow trusted capability or
whether producer-specific authority is required. The concern therefore
remains P2/unresolved and is not promoted to a fifth P1. Resolve the authority
model explicitly before durable-store or service wiring; if producers are
not structurally exclusive, add producer-bound commit operations/capabilities
and rejection tests for cross-producer proof assertion.

## Required RED gates

Before another trial, add directed tests that fail on this candidate and prove:

1. toggling claim/status accessors cannot change a branch or committed proof
   after validation, and each property is consumed exactly once;
2. toggling summary/proof accessors cannot place an unvalidated value in the
   frozen public summary;
3. a deferred intent claimed before `dueAt` returns `not_due` and preserves
   state, reason, due time, epoch, and token generation;
4. list/claim races ending in `committed`, `recovery_required`, or `not_due`
   complete as bounded no-ops rather than aborting the page;
5. a holder of the public queue API cannot obtain or invoke either recovery
   operation, while trusted internal composition still can;
6. tombstone `WRONGTYPE` reaches `TRANSPORT_STATE_UNKNOWN`/
   `recovery_required`, whereas a real transport exception still defers;
7. partial, malformed, and wrong-type presence state reaches terminal unknown,
   and only a complete canonical live presence returns
   `old_participant_present`; and
8. repeated corrupt-state reconciliation cannot remain indefinitely deferred.

The P2 proof-producer question needs an explicit authority decision and a RED
only if that decision requires producer-specific capabilities.

## Verification evidence and limits

The reviewer ran one read-only `node --input-type=module` probe using only the
reconciler, the in-memory repository, injected objects, and Node
**22.22.1**. It created no files or services. It reproduced the status/summary
TOCTOU, future-`dueAt` claim, and stale terminal/not-due failures shown above.

Source and submitted test inspection independently establish the public queue
facet and both corrupt-state classifications. No Redis, loopback RESP server,
network, MCP, service, tmux, migration, aggregate test, full CI, integration,
promotion, or release command was run.

The request reports **61/61** focal and **106/106** expanded injected-fake
tests. They were not rerun for this verdict, and their green status does not
exercise or offset the P1 cases above. The request's exploratory **115/115**
inventory used a process-local loopback RESP socket; it is explicitly
excluded and non-authoritative here.

## Final verdict

**KO.** The candidate has a coherent bounded reconciliation shape, but it
does not yet preserve its validated dependency values, honor due-time/backoff
at the claim CAS, converge stale terminal claims, keep Redis recovery authority
internal, or terminate deterministically corrupt Redis state. All four P1
findings and their RED gates must be closed before an independent OK.
