# Review Submission — Project V5 G/0/02 WIRING-B design (Trial 1)

## Requested verdict

Review the design in:

`plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md`

Return `reviewed_OK` only if the design is executable, closes the durable
epoch deferral without an unfenced effect path, and preserves the accepted
WIRING-A and ACK boundaries. Otherwise return `reviewed_KO` with P0/P1/P2
findings and exact evidence.

## Candidate identity

- Base integration: `4236b765fbf18fa519fb4692fea551f9485fe506`
- Review id: `G_0_2_WIRING_B_DESIGN`
- Trial: 1
- Design candidate commit:
  `ab2a0f57375485d61033dbf61dea4e48d5c04e99`
- Design candidate tree:
  `909ddc61141f13487cedbb8e09e83d8950a38699`
- Design path:
  `plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md`
- Handoff path:
  `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-1_to_review.md`

This is a design-only candidate. No source, test, migration, policy, runtime,
review result, integration, promotion, or release is included.

## Existing evidence consumed

The design treats these as built inputs rather than planned claims:

- `G/0/02` consumer CORE Trial 4;
- STORE Trial 4;
- ACK reconciliation Trial 5;
- durable ACK outbox Trial 3;
- WIRING-A Trial 6;
- the WIRING-A store-identity design and operator Option 1 ratification; and
- the registered `V5-G-0-02-D01` deferral.

The implementation anchors inspected for this design include:

- `coordination_consumer.js`;
- `coordination_ack_reconciler.js`;
- `coordination_consumer_runtime.js`;
- `coordination_consumer_lineage.js`;
- `coordination_consumer_runtime_provision.js`;
- `coordination_consumer_repo.js`;
- `sqlite_coordination_consumer_repo.js`;
- `sqlite_coordination_consumer_owner.js`;
- `sqlite_quarantine_store.js`;
- `coordination_queue.js`;
- `coordination_service.js`;
- `coordination_client.js`; and
- migrations `002`–`004`.

## Central design decision

The candidate rejects TTL-only takeover. It defines:

1. a SQLite `FENCING` commit which blocks the old epoch's durable effects;
2. a monotonic non-expiring Redis epoch installation which blocks the old
   epoch's transport effects;
3. a SQLite `RECOVERING` phase with no normal receive/handler work;
4. bounded ACK and identity-transfer recovery; and
5. `ACTIVE` only after all predecessor work has a closed disposition.

It also rejects the current arbitrary handler for WIRING-B because the
accepted SQLite repository contract is not atomic with business effects. A
destination-side epoch compare-and-commit port is mandatory.

## Required reviewer attacks

Please attempt to produce a schedule in which an old process can still:

- commit a handler/business effect;
- mutate a receipt, replay, quarantine, ACK intent, or transfer;
- receive or reclaim a Redis delivery;
- `XACK`/`XDEL` or create a tombstone;
- inspect/finalize ACK recovery;
- rehome an old-participant delivery; or
- settle success after a higher generation is active.

Also challenge:

- crash at every SQLite/Redis boundary;
- Redis success with lost reply;
- clock disagreement;
- two contenders resuming one pending generation;
- old participant still live, expired, or corrupt;
- an old stream entry with no receipt;
- effect committed without an ACK intent;
- active and released snapshot rollback;
- Redis epoch-key loss;
- same scope across distinct stores/planes;
- public queue/service/tool/MCP reachability;
- the same-main restriction for the first effect/vault profile; and
- whether any acceptance statement accidentally claims production support.

## Non-negotiable preserved boundaries

- WIRING-A remains non-expiring and unchanged.
- Store assignment stays immutable across managed-client incarnations.
- A generation never wraps, resets, or moves backward.
- The accepted direct-ACK and reconciliation claim families remain separate.
- Queue recovery operations remain private.
- Public coordination DTOs gain no epoch authority.
- Production origin and business-effect profiles remain unsupported.
- Health/inventory remain out of scope.
- No policy file may be changed.

## Author checks before submission

- Both requested files exist.
- Markdown links and named source paths resolve.
- `git diff --check` passes.
- Only the two disclosed design/review paths are staged for the design commit.

No implementation gate or full CI result is represented by this handoff.
