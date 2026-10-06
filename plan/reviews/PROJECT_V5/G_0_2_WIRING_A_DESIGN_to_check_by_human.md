# Human decision — WIRING-A stale owner disposition

## Decision required

Please choose the availability contract that WIRING-A may implement after the
store-identity design receives independent approval.

The store-backed owner row can establish single-owner safety without deriving
a store identity. It cannot safely infer that a crashed or paused prior
process is gone. This is an operational/product tradeoff, not an SQL detail.

## Facts that both options must preserve

- A PID absence, elapsed timeout, heartbeat loss, expired participant lease,
  or failed probe cannot exclude a paused old process.
- An unfenced old process could resume receive, handler, durable repository,
  ACK, or reconciliation effects after a replacement starts.
- A random token, PID, TTL, or manual `DELETE` does not fence those effects.
- A copied or restored active owner row must remain blocking.
- The accepted Trial 3 cancellation work and the sibling ACK repository port
  remain frozen and out of this decision.

## Option 1 — safety-first part A

Ratify the revised design's non-expiring owner state:

- a hard crash or active-row restore can make the scope unavailable
  indefinitely;
- part A exposes no clear, delete, reset, PID, TTL, probe, or takeover API;
- automatic restart and crash recovery remain explicitly unsupported;
- any future offline maintenance transition requires enforced global
  quiescence: fence all processes, prevent restart and store/participant
  access, obtain exclusive offline control, preserve/advance the generation,
  then reprovision; and
- implementation may begin only after independent design approval and this
  ratification.

Cost: bounded implementation and a strong single-owner theorem, but potentially
indefinite outage after a crash, active-row backup, or restore.

## Option 2 — recoverable ownership before implementation

Keep the store-ownership implementation frozen and authorize a larger design
with one durable epoch fenced through:

- transport receive;
- handler and business effects;
- consumer and ACK repository transitions;
- reconciliation;
- transport ACK/finalization; and
- every other effect an old process could resume.

Only after all effect paths reject an obsolete epoch may automatic or
operator-assisted takeover be considered.

Cost: substantially larger cross-component scope, new durable contracts and
failure modes, re-review of accepted boundaries, and delayed WIRING-A
implementation; benefit: a defensible restart/reclamation path.

## Unsafe non-options

Do not authorize:

- TTL-only, PID-only, heartbeat-only, lease-only, or probe-only reclamation;
- random-token freshness as proof of process death;
- deletion based on elapsed time or a failed health check;
- a part-A operator clear endpoint; or
- direct manual deletion of the row.

These can admit a replacement while a paused prior process remains capable of
effects.

## Recommendation

Choose option 1 for the current part-A scope. It is the only bounded option
that preserves the single-owner requirement while making no crash-recovery
claim. The availability cost is material and therefore needs explicit
ratification rather than an implicit design assumption.

## Exact question

Do you ratify option 1 — including indefinite post-crash unavailability and no
part-A cleanup or restart claim — or require option 2's end-to-end epoch-fenced
recovery design before store-ownership implementation may begin?

Until this is answered, store-identity implementation remains frozen.

## Operator decision — RATIFIED, Option 1

Status: **RATIFIED — Option 1** (operator, 2026-07-27, relayed by the root
orchestrator).

The operator ratifies the non-expiring store-backed owner state for WIRING part
A, including indefinite post-crash unavailability and no part-A cleanup,
takeover, or restart claim. Option 2's end-to-end epoch-fenced recovery design
is **not** required before store-ownership implementation may begin.

Reasons recorded with the decision:

- The sheet already separates these concerns. `G_0_2_WIRING` part A owns the
  single-owner runtime, managed-client reuse and service lifecycle; **crash and
  reclaim belong to part B** (`G/0/02.md:61-63`), and part A was forbidden from
  claiming crash recovery from its first brief. Option 2 would pull a durable
  cross-component contract into a slice that explicitly excluded it.
- That contract would require re-reviewing boundaries already independently
  accepted and integrated, including ACK reconciliation and the durable ACK
  outbox that landed after three trials.
- The accepted risk is a **loud** failure: an unavailable scope is visible.
  What Option 2 prevents is silent corruption by a paused prior process
  resuming effects, and Option 1 does not introduce that — it prevents it by
  refusing takeover.
- Option 1 forecloses nothing. Option 2 remains available later if availability
  becomes a requirement.

### Two conditions attached to this ratification

Both are required before WIRING-A store ownership can be considered complete;
neither blocks the independent design review now in flight.

1. **Operator-facing documentation of the limitation.** The constraint must be
   stated where an operator will actually read it, not only inside the design
   document: a crashed runtime, or a restored backup captured while owned,
   blocks that scope until an offline maintenance transition under enforced
   global quiescence. No text anywhere may state or imply that part A supports
   automatic restart or crash recovery. Documentation that overstates the
   guarantee is the same defect class this project has been correcting all
   along, relocated into prose.
2. **A registered deferral for the epoch fencing.** Add an entry to
   `plan/PROJECT_V5/DEFERRED.md` naming the durable epoch fenced through
   receive, handler effects, consumer and ACK repository transitions,
   reconciliation and transport finalization, owned by the crash/reclaim slice
   (WIRING part B), with its closure criterion. "Part B" must not be the place
   where this is quietly forgotten; a future wave must not be able to assume
   automatic restart works.

Implementation may begin only after the store-identity design receives an
independent `reviewed_OK`. That review is a separate gate and is in flight.

## Completeness correction after Design Trial 2 review

Status: **ADDENDUM — the recorded Option 1 ratification stands unless the
operator separately revisits it.** This section does not rewrite, narrow, or
weaken the decision above. It completes the availability basis on which that
decision was made.

The non-expiring owner protocol can block a scope permanently in every one of
these cases:

- a runtime crashes while its row is active;
- a backup or copy captured while the row is active is later provisioned;
- the claim transaction commits, but later committed-witness or returned-result
  validation fails, so no runtime starts and the active row remains;
- runtime initialization fails after claim, and the exact-generation
  compensating release fails or its commit result is uncertain;
- orderly stop settles runtime work, but the exact-generation release fails or
  its commit result is uncertain; and
- a released row reaches the maximum exact generation and can never advance.

The last four cases do not require a process crash. They are nevertheless
permanent closed states in part A: there is no delete, clear, reset, takeover,
or retry protocol that may infer them safe to reclaim.

A restored snapshot whose row says `released` is also not safe to introduce
online. It can roll the persistent generation backward and make an old
generation reusable. Therefore every restore, copy, or store move for the same
managed-client lineage—including a seemingly clean released-state
snapshot—requires a separately reviewed offline maintenance transition under
enforced global quiescence, with the generation preserved and advanced before
access is restored. Part A implements no such transition.

The earlier statement that the accepted sibling ACK repository port remains
frozen applies to Option 1 and the current part-A implementation boundary:
part A consumes only the already accepted port and does not inspect or depend
on its schema. If Option 2 is later authorized, end-to-end epoch fencing may
require a separately scoped, designed, and independently reviewed extension
or change to ACK repository transitions and other accepted contracts. Option
2 cannot promise those contracts remain unchanged before that design exists.

The attached conditions are recorded on the operator-facing coordination bus
runbook and WIRING sheet, and the part-B durable-epoch obligation remains
registered in `plan/PROJECT_V5/DEFERRED.md` with these additional permanent
block and released-snapshot hazards.
