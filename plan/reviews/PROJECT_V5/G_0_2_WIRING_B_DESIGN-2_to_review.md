# Review Submission — Project V5 G/0/02 WIRING-B design (Trial 2)

## Requested verdict

Review the design in:

`plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md`

Return `reviewed_OK` only if Trial 2 is executable, closes every Trial 1 KO
finding without an unfenced effect path, and preserves the accepted WIRING-A,
ACK, and non-scope boundaries. Otherwise return `reviewed_KO` with explicit
P0/P1/P2 findings, exact schedule evidence, and the smallest required
correction.

## Candidate identity

- Base integration: `4236b765fbf18fa519fb4692fea551f9485fe506`
- Review id: `G_0_2_WIRING_B_DESIGN`
- Trial: 2
- Prior Trial 1 result: `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-1_result.md`
- Design candidate commit:
  `629480e3410fb7e593cdb4c3934caf329bf8e97b`
- Design candidate parent:
  `99f38767804180dab2edd51399f9811c81ab03bd`
- Design candidate tree:
  `f5590d310735dbcf2962971c07f792fcac0c2e66`
- Design path:
  `plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md`
- Handoff path:
  `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-2_to_review.md`

This is a design-only candidate. It contains no implementation, test,
migration, policy, runtime, review result, index update, integration,
promotion, or release claim. Do not treat the candidate as implementation
evidence.

## Existing evidence consumed

The design treats these as built inputs rather than Trial 2 implementation
claims:

- the G/0/02 consumer CORE, STORE, ACK reconciliation, and ACK outbox
  boundaries;
- WIRING-A and its store-identity design plus human ratification;
- the registered `V5-G-0-02-D01` deferral;
- the immutable Trial 1 KO result above; and
- the current production consumer, queue, service, client, repository,
  quarantine, runtime, lineage, and migrations `002`–`004` cited by the
  candidate.

## Trial 2 closure map

Please verify each closure against the design's executable schema, state
invariants, capability reachability rules, crash matrix, failure codes,
decomposition, mutation owners, rollout rules, checklist, and verification
commands—not against summary prose alone.

1. **P0 — durable same-generation controller fence.** The candidate adds a
   durable strictly increasing `recovery_term` and exact recovery-controller
   participant identity. Every recovery permit, lease, SQLite decision or
   mutation, Redis command, ACK/proof, and transport finalization must compare
   the exact coordinate. Attack the full R1/R2 schedule before and after every
   SQLite and Redis boundary, including a delayed lower-term command.
2. **P1 — D2-to-D3 succession.** Verify expired-controller CAS succession for
   every recovery crash, including D2 partial receipt/ACK intents, PEL claims,
   lost replies, already committed settlements, and repeated D2/D3/D4
   succession. Confirm that a higher term takes over lower-generation active
   claims and lower-term recovery claims without waiting on stale deadlines.
3. **P1 — recipient identity and rehome contradiction.** Confirm that rehome
   is absent, original D1/D2/later source inboxes are drained in place under
   private recovery authority, and `toParticipantId`, `consumeKey`, receipt
   identity, replay identity, and service/consumer recipient checks remain
   unchanged. Attack corrupt, partial, and already-settled source state.
4. **P1 — proof retention.** Verify that ACK/finalization convergence uses
   generation-bound, non-expiring proofs, never positive-TTL tombstones, and
   that runtime GC is absent. Any future GC must require separate review,
   durable SQLite confirmation, and a monotonic watermark; otherwise the
   exact terminal `recovery_required` path must be used.
5. **P1 — release and restart legality.** Verify the representable
   `active -> releasing -> released` state, every release crash boundary, and
   the monotonic `released(g) -> fencing(g+1) -> recovering(g+1) -> active(g+1)`
   restart. Confirm restart cannot proceed while SQLite and Redis disagree on
   the released witness.
6. **P1 — injective store/Redis binding.** Attack server allocation, forced
   ordinal collision, counter rollback, wrong authority/namespace, changed
   Redis plane, copied SQLite origin, copied Redis origin, and a deliberately
   duplicated live plane. Verify the immutable SQLite tuple, origin
   capabilities, collision rejection, and the explicit non-cloning external
   premise are sufficient and honestly bounded.
7. **P1 — ordinary managed-client bypass.** Verify that the existing ordinary
   receive/reclaim/fence/ACK scripts reject an epoch-owned participant in
   `fencing`, `recovering`, `active`, `releasing`, and `released`, before any
   read or mutation. Also attack the existing send script: a guarded
   non-active recipient must be rejected before dedupe/append, and the
   recovery-to-active activation/send race must not admit a message into an
   unowned inbox.
8. **P2 — callbacks and replay.** Verify the fixed module-private pure,
   deterministic retry registry rejects supplied/effectful classifiers, and
   replay plus `authorizeReplay` are rejected before callback or repository
   work. Confirm no generic handler, audit, metrics, or unfenced vault path is
   accidentally included.
9. **P2 — unread versus PEL.** Verify separate nonblocking unread and PEL
   branches with exact cursors, entry identity, pending ownership, counts,
   malformed/deleted replies, `XACK`/`XDEL` result checks, and crash/retry
   behavior. Confirm neither branch falls through to the other.

## Required authority and activation attacks

The fresh reviewer must explicitly attack:

- R1/R2/R3 controller succession at every SQLite and Redis recovery boundary,
  including term installation/reply loss and delayed lower-term operations;
- lower-generation active and lower-term recovery claims, receipts, ACK
  intents, proofs, leases, and finalizations;
- D1/D2 drain-in-place with unchanged recipient and consume identity;
- separate unread-stream and PEL recovery, including a crash between unread
  read and receipt claim;
- non-expiring proof replay, conflicting proof data, attempted expiry/delete,
  and GC before durable SQLite confirmation;
- legal `releasing`/`released` transitions and monotonic restart;
- allocation collision plus changed/copied SQLite and Redis origins and the
  explicit non-cloning boundary;
- ordinary public send/receive/ACK and blocking receive bypasses;
- fixed retry classification and replay authorization rejection; and
- the activation ordering in which SQLite reaches exact `A` before Redis, the
  Redis activation reply is lost, and exact `A`/`R` authority shapes are
  compared before any runtime permit is issued.

## Required verdict evidence

The result must classify every finding as P0, P1, or P2 and provide exact
file/line or protocol-state evidence. A passing result must show why each
Trial 1 finding is closed, why all stated external premises are explicit and
testable, and why no lower term/generation or stale process-local capability
can mutate either authority. A failing result must include a minimal
reproduction schedule and identify the first violated invariant.

Do not claim implementation, integration, rollout, production readiness,
promotion, release, or CI completion from this design review. Do not edit the
design, review index, prior result, policies, product code, tests, or
migrations while reviewing, and do not create a result in this handoff task.

## Author validation disclosure

One author validation shell check accidentally interpreted a backticked token
and returned `command-not-found`. It changed no state and no file. The check
was replaced by non-executing searches, after which all final cited-path,
current-path, diff-scope, and `git diff --check` validations passed. The
expected untracked `gateway/node_modules` symlink was preserved.

No implementation or integration test result is represented by this handoff.
