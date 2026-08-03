# Independent Review — Project V5 E/0/04 Plan (Trial 3)

Verdict: **KO**

Reviewer profile: model **GPT-5.6 Sol**, reasoning **ultra**, execution profile
**Fast/Priority**.

## Reviewed scope

- Required base:
  `e0e6f91e12e60b20b45b26516a59dacc02f512fa`.
- Candidate plan commit:
  `dc84b01238dc3fa50dedc5dc19196b73e5c3bbae`.
- Review-request commit, inspected as evidence only:
  `3911422987682f1912496c30c9c051e2af823e88`.
- Exact candidate range: `e0e6f91..dc84b01`.
- Primary artifact: `plan/PROJECT_V5/E/0/04.md`.
- Preserved Trial 1 and Trial 2 requests/verdicts and the direct-consumer
  dependency context.

This is a plan verdict only. No runtime implementation, integration,
promotion, merge, or release is credited.

## Blocking findings

1. **A healthy zero-loss source has no uniquely specified export-freshness
   result.**

   The registry defines both gap and data-loss instruments as event counters:
   the gap counter records one series increment per explicit gap, and the
   data-loss counter records intentionally skipped source records
   (`E/0/04.md:914-916`). Counters are cumulative and semantic events
   increment them exactly once (`E/0/04.md:918-925`), but the plan never
   requires zero-valued series to be materialized when a source is enabled.
   The export-freshness denominator nevertheless says a missing gap or
   data-loss counter is bad (`E/0/04.md:979`).

   A concrete unresolved input is:

   ```text
   wall-aligned tick = first tick after the first full source-liveness ACK
   manifest source = health_journal, enabled
   source_enabled = 1
   last_ack_age <= export_freshness
   no JOURNAL_GAP or EXPORT_PERMANENT_REJECT has ever occurred
   ```

   An implementation that creates counter series only on their first semantic
   event is consistent with the registry rows, but both counters are absent
   and the healthy tick is bad. An implementation that pre-materializes every
   required source/reason series at zero can make the tick good, but that
   initialization population, label set, start timestamp, and persistence
   rule are not specified. A recording rule that synthesizes zero from
   `agents_gateway_source_enabled` is a third possible implementation and
   contradicts the stated “missing ... counter is bad” rule.

   Trial 4 must freeze one zero-event counter policy and the exact per-source
   series/label population used by the export-freshness rule. A source with a
   successful first liveness ACK and no historical loss must have one
   deterministic tick result.

2. **Counter “increase” has no window or tick-delta definition, so the
   export-freshness SLO and data-loss alert still admit incompatible rules.**

   An export-freshness tick requires “no increase” in the gap/data-loss
   counters, but gives no comparison interval or previous-sample rule
   (`E/0/04.md:979`). `GatewayMetricDataLoss` likewise says only that an
   increase is positive (`E/0/04.md:996`). This is not an executable
   Prometheus condition: unlike the explicitly frozen five-minute lease-churn
   expression (`E/0/04.md:1004`), it supplies no range vector or equivalent
   wall-tick delta.

   For one durable singleton loss marker between consecutive ten-second ticks,
   all of these remain compatible with the prose:

   ```text
   A: compare current counter with the prior wall tick
      -> one bad SLO tick; alert clears on the following unchanged tick
   B: increase(counter[5m]) > 0
      -> every evaluation for the next five minutes remains bad/firing
   C: increase(counter[24h]) > 0
      -> every evaluation for the next 24 hours remains bad/firing
   ```

   These choices produce different recording samples, 24-hour SLO outcomes,
   alert duration, and recovery evidence from the same valid series. A hold of
   zero seconds does not select the range. Trial 4 must define the exact
   wall-aligned delta/range, counter-reset treatment, absent/stale treatment,
   aggregation labels, and alert resolution rule for both counters.

## Trial 2 blockers that are materially closed

- The external-liveness table now gives one state/value/`since`/probe-exit
  result for observer failure, pre-grace boot, independently attested identity
  mismatch, stopped/dead process, the exact missing-heartbeat boundary, stall,
  and current heartbeat. The manager-attested identity tuple/digest, exact
  heartbeat/ping/ACK fields, RFC 8785 signing bytes, role sequences, ACK
  binding, rejection effects, and golden-vector requirements close the wire
  ambiguity.
- Saturation is reducer-owned and latched. The detailed transition rule clears
  before projecting the Nth valid clear sample, and the worked default example
  confirms that samples one and two retain rank 24 while sample three removes
  it (`E/0/04.md:396-413`). That exact rule resolves the shorter rank-table
  phrase “through the last required clear sample”; it does not leave two
  projected results.
- The five control classes have ten named capacity/freshness keys with
  defaults and inclusive bounds, fixed entry maxima, independent workers and
  arenas, explicit full/expired/oversize outcomes, and a recomputable maximum:
  2,179,072 waiting bytes + 34,048 in-flight bytes = 2,213,120 bytes.
- The 43-row registry fixes unique instrument names, kinds, UCUM units, label
  sets/enums, histogram buckets, and event semantics. OTLP full ACK, ambiguous
  partial retry/split, retryable/operator-blocked transport, permanent
  singleton loss marker, cursor ordering, and read-only Redis `0-0` resume
  behavior are deterministic. The remaining KO is limited to the zero-event
  and counter-delta recording/alert contract above.

## Verified compatibility and scope properties

- The technical candidate changes exactly
  `plan/PROJECT_V5/E/0/04.md`; the request commit adds only
  `E_0_4-plan-3_to_review.md`.
- All four earlier Trial 1/2 request and verdict artifacts are byte-identical
  across the reviewed technical/request range.
- E/0/04 and direct consumers G/0/03, H/0/04, I/0/05, and I/0/07 remain
  `planned`, and each consumer retains a direct E/0/04 dependency.
- No second Gateway/control writer, watchdog store/mutation authority, public
  listener, or MCP health tool is introduced.
- The Redis adapter starts at `0-0`, never `$`, and does not create a group,
  acknowledge, trim, publish, or otherwise mutate `agents:events`.
  `coordination.status`, `agents:events`, and `message.*` remain unchanged.

## Independent verification

- Complete manual inspection of the full TDD implementation skill, Project V5
  and Stage E intake documents, every Trial 1/2 request and KO, the Trial 3
  request, and exact `git diff e0e6f91..dc84b01`.
- `/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q
  tests/structure` — **222 passed in 12.75 seconds**.
- Semantic probes — **28** ordered unique reasons; **42** unique settings;
  exactly **five** queue classes and **ten** queue settings; exact
  **2,213,120-byte** queue bound; **43** unique instruments, **20** closed
  label dimensions, and all SLO/alert metric references registered.
- Local Markdown-link resolution over the candidate and Trial 3 request —
  **0 local links, 0 missing**.
- Candidate/request `git diff --check`, exact ancestry, technical/request
  changed-path allowlists, prior-artifact preservation, and absent-preexisting
  Trial 3 verdict checks — passed.

No network, MCP, Redis, PostgreSQL, live Gateway/watchdog, shared daemon,
tmux session, credential, or external service was contacted, started,
stopped, or mutated.
