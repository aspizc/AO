# Independent Review — Project V5 E/0/04 Plan (Trial 5)

Verdict: **OK**

Reviewer profile: model **GPT-5.6 Sol**, reasoning **ultra**, execution
**Fast/Priority**.

## Reviewed scope

- Required base, including the Trial 4 KO:
  `23b4952e299bc578ca2418165484af14a0adbb40`.
- Technical candidate:
  `a01d3c5494854abc455a37e1f6555c71c01fe6c5`.
- Review-request commit, inspected as evidence only:
  `a8487c2e09f49e295c29635825b7548849d7581d`.
- Exact technical range: `23b4952..a01d3c5`.
- Exact complete range: `23b4952..a8487c2`.
- Primary artifact: `plan/PROJECT_V5/E/0/04.md`.
- Complete intake: the TDD implementation skill, Project V5 and Stage E
  READMEs, every Trial 1–4 request and KO verdict, and the Trial 5 request.

This is a plan-contract verdict only. It credits no runtime implementation,
integration, promotion, merge, release, or production evidence.

## Trial 4 blocker closure

1. **The reset discriminator is collision-free for every successfully created
   instance.**

   Installation provisions a manager-owned allocation record and a stable lock
   in protected service-manager state outside replaceable per-instance state.
   The lock is never renamed, replaced, or deleted; provisioning is
   create-once/no-follow and cannot recreate either allocator file when manager
   state exists (`E/0/04.md:936-947`). Before assigning a new `instanceId`, the
   manager takes the exclusive OFD lock, validates owner, mode, schema,
   checksum, and the safe-integer bound, increments exactly once, atomically
   replaces and rereads the record, and releases the lock only after the
   write/fdatasync/rename/fsync-directory sequence
   (`E/0/04.md:948-953`).

   The allocation record is closed to exactly schema version,
   `lastAllocatedGeneration`, and checksum. Its checksum input and lower-case
   SHA-256 representation are exact, and the accepted pre-increment range
   `0..9_007_199_254_740_990` leaves one valid final safe-integer allocation
   before exhaustion (`E/0/04.md:942-952`). Concurrent managers therefore
   serialize on one stable inode and cannot successfully consume the same
   generation.

2. **Durability and failure ordering prevent reset, guess, or reuse.**

   The manager may create the instance manifest only after the increment is
   durable, and writes the allocated value as
   `instanceMetricGeneration=lastAllocatedGeneration`. A crash after allocation
   burns the number. Restart, instance deletion, configuration change, host
   reboot, wall-clock rollback, and same-second creation cannot decrement or
   reuse it (`E/0/04.md:953-957`). Missing, unreadable, corrupt,
   lock-unavailable, or exhausted state fails closed before manifest creation
   or Gateway start and yields missing/bad observability input rather than a
   guessed generation (`E/0/04.md:957-960`).

   The instance manifest and five-row crash-safe ledger persist the generation
   with the epoch before any adapter may consume a record. Values, epoch, and
   generation survive every named same-instance restart and source
   disable/re-enable cycle. Only a new `instanceId` allocates a strictly greater
   generation and initializes a new resource and five zeros
   (`E/0/04.md:962-982`).

3. **Normalization carries the discriminator without adding cardinality.**

   `agents.gateway.metric_generation` is a fixed OTLP resource attribute.
   Neither it nor `service.instance.id` may become a Prometheus metric label
   (`E/0/04.md:993-1001`). The Collector derives exactly two start-timestamp
   companions and two generation companions. Each companion retains only
   `schema_version`, `source`, and `data_loss_reason`; the generation is the
   safe-integer metric value, not a label. All four are backend mapping state,
   not producer instruments (`E/0/04.md:1049-1068`).

   The snapshot group normalizes one
   counter/start-timestamp/instance-generation triplet, requires a common safe
   positive generation across the complete source population, and records that
   generation at the exact wall tick (`E/0/04.md:1070-1087`). Missing,
   stale, conflicting, or unexpected input remains invalid rather than being
   coerced to zero.

4. **The same-second `1 -> 1` chronology cannot enter subtraction.**

   The adjacent-tick reducer compares generation before start timestamp and
   counter value. Unequal generations are invalid, while subtraction is the
   final branch only after generation, start, and monotonic-value checks all
   pass (`E/0/04.md:1088-1117`). The required golden fixes equal start `S`,
   prior generation/value `41/1`, and current generation/value `42/1`. It
   produces no delta, records source input validity zero, makes the
   export-freshness SLO numerator zero, and fires `GatewayMetricDataLoss`.
   The text explicitly forbids both the subtraction branch and a reported
   delta zero (`E/0/04.md:1119-1133`). A later stable generation-42 tick is
   the first valid zero-delta comparison and resolves under the existing rule.

The concrete Trial 4 counterexample is therefore closed for same-second
replacement and wall-clock rollback without exposing an instance or generation
label.

## Prior KO closure and non-regression

- **Trial 1:** the closed projection/reducer and 28-rank reason model remain
  intact (`E/0/04.md:26-306`); manager-attested watchdog bootstrap remains
  health-only (`E/0/04.md:468-647`); settings, recovery timing, bounded
  evidence, complete A-08 ownership, and the four-consumer DAG remain present.
- **Trial 2:** the exhaustive liveness output table, exact canonical
  heartbeat/ping/ACK wire schema, saturation latch, and bounded control lanes
  remain unchanged. Independent section hashes against the required base
  proved exact byte identity: liveness/reasons **7,464 bytes**
  (`ae6e4e23af2c7b40`), settings/saturation/queues **9,461 bytes**
  (`728d74a222e43df4`), and wire **6,980 bytes**
  (`5d449ed459ef54f5`).
- **Trial 3:** the producer registry remains byte-identical at **5,721 bytes**
  (`01659fd68feb653a`), with **43 unique instruments**. The exact five-row
  zero-event population is still initialized and exported as real cumulative
  zero points rather than synthesized by a recording rule
  (`E/0/04.md:870-982`). Wall alignment, exact prior tick, invalid/reset
  treatment, per-source aggregation, and alert resolution remain intact.
- **Trial 4:** the only previously open collision is closed by the durable
  generation allocator, backend companions, generation-aware normalization,
  and required golden above.

Independent semantic inspection also reproduced **28 ordered unique reason
codes**, **42 unique settings**, exactly **five control classes and ten queue
settings**, the exact **2,213,120-byte** control-lane bound, exactly **five
zero-event loss series**, and **43 unique producer instruments**. No companion
or recording series was counted as a producer instrument.

E/0/04 still has five declared prerequisites and four direct consumers.
G/0/03, H/0/04, I/0/05, and I/0/07 remain `planned`, retain their direct
E/0/04 dependencies, and do not redefine its exporter or health contract.
EPICS, SHEETS, the coverage matrix, and the Stage E index agree on those gates
and on A-08 ownership. E/0/04 itself remains `planned`.

The technical commit changes only `plan/PROJECT_V5/E/0/04.md`; the request
commit adds only `E_0_4-plan-5_to_review.md`. All eight Trial 1–4 request and
verdict artifacts are byte-identical to the required base. The candidate adds
no runtime code, second writer, public/MCP health surface, Redis mutation,
`$` stream start, or change to `coordination.status`, `agents:events`, or
`message.*`.

## Independent verification

- `/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q
  -p no:cacheprovider tests/structure` — **222 passed in 12.75 seconds**.
- Independent semantic probe — allocator ownership/lock/checksum/bounds,
  atomic allocate-before-manifest ordering, crash burn, fail-closed cases,
  generation companions, generation-first delta branch, and the exact
  `41/1 -> 42/1` invalid chronology all passed.
- Contract parity probe — **28** ordered unique reasons, **43** unique producer
  instruments, **five** zero-event series, **five** queues, **ten** queue
  settings, and the exact queue byte bound passed.
- Base/candidate section comparison — liveness/reasons,
  settings/saturation/queues, wire, and producer registry were byte-identical
  with the hashes recorded above.
- Markdown validation across the contract, indexes/gates, four consumers, and
  request — **38 table blocks** had stable shape; **98 local links resolved, 0
  missing**.
- Exact ancestry, technical/request changed-path allowlists, all eight
  prior-artifact preservation checks, and planned-status/dependency assertions
  passed.
- `git diff --check 23b4952..a01d3c5`,
  `git diff --check a01d3c5..a8487c2`, and
  `git diff --check 23b4952..a8487c2` — passed.

No network, MCP, Redis, PostgreSQL, live Gateway/watchdog, shared daemon, tmux
session, credential, or external service was contacted, started, stopped, or
mutated.

There are no blocking plan-contract findings in Trial 5.
