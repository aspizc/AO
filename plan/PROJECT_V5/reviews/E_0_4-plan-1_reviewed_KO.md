# Independent Review — Project V5 E/0/04 Plan (Trial 1)

Verdict: **KO**

Reviewer profile: model **GPT-5.6 Sol**, reasoning **ultra**, execution profile
**Fast/Priority**.

## Reviewed scope

- Candidate plan commit:
  `b9aae83a1d470c5455b2e4228db37e47a0099ed1`.
- Review submission:
  `41a619db8dac71f45555e608499d23b7a705d38b`.
- Primary artifact: `plan/PROJECT_V5/E/0/04.md`.
- Contract context: `D/0/01`, `D/0/03`, `D/0/05`, `D/0/06`, `E/0/00`,
  `I/0/05`, the binding V5 indexes, and architecture finding A-08.

This is a plan verdict only. No runtime implementation, integration,
promotion, or release is credited.

## Blocking findings

1. **The document calls the V1 projection frozen without specifying a
   machine-deterministic schema or reducer.**

   The example leaves `components` empty and shows only
   `recovery.state=none` (`E/0/04.md:27-59`), while the next paragraph claims
   that every object is closed and every string, array, count, duration, and
   component entry is bounded (`E/0/04.md:62-68`). It never freezes the
   component keys/value shape, active recovery shape, exact identifier and
   collection bounds, or complete enums for `live.state`, `overallState`,
   `executionAdmission`, and recovery state. It also does not say whether
   `transitionSeq` belongs to the daemon projection or the watchdog's
   externally reconciled snapshot, or how its strict increase is scoped across
   daemon and watchdog restarts.

   The active-reason predicates are likewise incomplete. The total-order table
   introduces `PROCESS_STOPPED` and `HEARTBEAT_MISSING` without defining their
   exact boundary against `PROCESS_DEAD`, first-heartbeat grace, and
   `EVENT_LOOP_STALLED` (`E/0/04.md:72-82,216-224`). It labels
   `HEALTH_OBSERVER_STALE` as `blocked/unknown`, although the documented
   aggregate states contain no `unknown` state (`E/0/04.md:98-101,216-219`).
   The state-store component row says incompatibility “blocks”, while the
   reason table classifies `STATE_STORE_SCHEMA_INCOMPATIBLE` as
   `recovery-required`, without explicitly resolving whether “blocks” refers
   only to readiness or to the aggregate (`E/0/04.md:109-120,225-231`).

   These choices affect validation, state transitions, probe exits, and golden
   tests. Trial 2 must provide a normative closed schema and a complete
   predicate/transition table, including the owner and reset scope of every
   sequence. A prose promise that the later production schema will be bounded
   is not a frozen planning contract.

2. **The external watchdog has no frozen independent trust bootstrap.**

   The plan says the service manager starts the watchdog and that the channel
   is bound to instance, boot, process-start identity, audience, and a
   health-only boot capability (`E/0/04.md:140-163`). It does not identify who
   creates the capability, how it is delivered separately to the expected
   daemon and watchdog, how the watchdog obtains the expected process-start
   identity independently of a daemon frame, or how capability/identity
   rotation works when either process restarts.

   A frame contains the daemon-asserted identity digest and opaque IDs
   (`E/0/04.md:140-145`). Without a selected trust bootstrap, both an insecure
   first-frame/self-assertion implementation and a service-manager-attested
   implementation fit the prose. The wrong-token, PID-reuse, replay, and
   wrong-boot tests cannot distinguish those designs because the authoritative
   expected identity is undefined. The accepted D/0/05 same-UID
   `host-unconfined` limitation does not remove the need to authenticate the
   expected service process for confined and workspace-YOLO guarantees.

   Trial 2 must freeze the capability issuer and one-use/rotation lifecycle,
   the independent source of expected process identity, restart ordering, and
   which side owns the final snapshot sequence. The watchdog can remain
   health-only and store-blind while those trust semantics are explicit.

3. **Reason activation, freshness, and saturation defaults are incomplete, so
   the otherwise total precedence order is not executable.**

   The rank table is a stable 1–28 order, but several codes have no
   deterministic activation rule:

   - `CONTROL_LATENCY_HIGH` has no warning threshold, and there is no control
     ping interval; only the terminal ping timeout is configured
     (`E/0/04.md:175-189,242-244`).
   - `ADMISSION_PRESSURE` and `ADMISSION_SATURATED` have no frozen upstream
     state contract, threshold, or hysteresis despite controlling degraded
     versus blocked/readiness behavior (`E/0/04.md:87-91,118,241-245`).
   - The event-loop warning names `monitorEventLoopDelay` but does not select a
     statistic, sampling window, resolution, or reset rule
     (`E/0/04.md:109-112,179-182`).
   - Dependency probes are promised explicit deadlines, but only the sample
     interval and evidence freshness are configured; no default/validation
     exists for the probe deadline (`E/0/04.md:103-107,183-184`).
   - The combined snapshot interval/freshness row bounds freshness but gives no
     validation range for the snapshot interval
     (`E/0/04.md:185`).

   The plan also promises a reserved health/policy/approval/cancellation lane
   under hard saturation (`E/0/04.md:87-91,297-308`) without freezing its
   minimum capacity, independent queue/executor boundary, or measurable
   latency budget. A health-only ping that bypasses general admission does not
   by itself prove that the operator, policy, approval, and cancellation paths
   remain responsive. The RED list narrows this further to health and operator
   paths (`E/0/04.md:343-344`).

   Trial 2 must freeze every activation threshold/default and the bounded
   control-lane contract, including deterministic boundary and hysteresis
   cases. Injected clocks and snapshots are useful test seams
   (`E/0/04.md:358-363`), but they cannot produce deterministic oracles until
   these predicates exist.

4. **The recovery episode does not define TTD, TTR, or a single comparable
   clock domain.**

   The plan lists last-good heartbeat, first detection, recovery start,
   ready-again, time to detect, time to recover, and outage duration
   (`E/0/04.md:256-280`), but it never defines the subtraction endpoints for
   those three durations. In particular, TTD could start at the last receipt,
   the first missed interval, the stale-threshold crossing, or a known process
   exit; TTR could start at detection or at operator recovery start; and
   ready-again could mean the first good observation or the sample that closes
   the consecutive-good gate.

   The watchdog stamps receipt with its own monotonic clock
   (`E/0/04.md:153-157`), while the daemon projection carries
   `monotonicMs`/`clockBootId` and recovery start may originate in the daemon
   (`E/0/04.md:32-38,273-279`). A common `clockBootId` identifies a host boot;
   it does not by itself state that all values use one OS monotonic epoch or
   make process-relative samples comparable. The plan also does not select
   which observation cadence supplies the three consecutive good samples.

   Trial 2 must define the clock authority for every episode landmark, exact
   duration formulas, stale-threshold accounting, good-sample cadence, and
   cross-daemon/watchdog restart behavior. It must also bound/rotate the
   append-only transition journal (`E/0/04.md:164-166`); otherwise a component
   intended to remain available under resource pressure can consume disk
   without limit.

5. **The plan narrows audit A-08 without assigning the omitted operational
   observability work.**

   A-08 found that there is no metrics backend, dashboard, SLO, alerting, or
   durable metric-consumer cursor, and recommends a real Prometheus/OTel output
   plus flow-linked RED/USE metrics and alerts
   (`audit/PROJECT_V5_INDEPENDENT_2026-07-25_GPT56SOL_ULTRA/02_ARCHITECTURE.md:197-205`).
   The coverage matrix assigns A-08 solely to E/0/04 as “external
   liveness/stall detection and reconciled readiness reasons”
   (`COVERAGE_MATRIX.md:78`).

   E/0/04 freezes a metric-family allowlist but no exporter/scrape contract,
   durable time-series or cursor, availability/latency/error/backlog SLO, or
   alert rule (`E/0/04.md:256-271,365-375`). G/0/03 adds coordination metrics
   and H/0/04 adds an RTO drill, but neither currently owns the missing
   exporter/backend/alert loop. Therefore the source finding is only partially
   covered while the one-owner matrix presents it as fully dispositioned.

   Trial 2 must either expand the accountable acceptance and dependency chain
   to cover the omitted A-08 outcome, or explicitly split/reassign the
   remaining source acceptance without claiming E/0/04 alone covers A-08.

6. **The declared consumers are not represented consistently in the binding
   dependency graph.**

   E/0/04 declares G/0/03, H/0/04, I/0/05, and I/0/07 as consumers
   (`E/0/04.md:7-8`). `EPICS.md` and the coverage matrix omit I/0/05 while
   claiming E/0/04 supplies G/0/03, H/0/04, and I/0/07
   (`EPICS.md:46-51`; `COVERAGE_MATRIX.md:78`). Of those four sheets, only
   H/0/04 actually names E/0/04 in `Depends on`; G/0/03 depends only on G/0/02,
   I/0/05 only on C/0/00 and I/0/00, and I/0/07 has no direct or transitive
   path through H/0/04 (`G/0/03.md:3-8`; `H/0/04.md:3-8`;
   `I/0/05.md:3-8`; `I/0/07.md:3-8`; `H/0/05.md:3-8`).

   This matters because I/0/05 owns typed PostgreSQL readiness and I/0/07
   requires full-stack health/readiness gates. Under the authoritative
   `Depends on` rows they can currently complete without consuming the
   canonical health contract. Trial 2 must reconcile the consumer list,
   EPICS/matrix narrative, and actual dependency rows, adding only the edges
   that reflect real contract consumption and removing inaccurate claims.

## Verified non-blocking properties

- The prerequisite row correctly includes D/0/01, D/0/03, D/0/05, D/0/06,
  and E/0/00, and keeps implementation status `planned`.
- The high-level liveness split is sound: OS existence is supporting evidence,
  the heartbeat originates on the main loop, a proven exit differs from a
  stale heartbeat, and a fresh heartbeat with a timed-out ping remains live
  but not ready.
- All 28 stated reason ranks and all 28 reason codes are unique. Arrival order
  therefore cannot alter precedence once the active-set predicates are fixed.
- Stale or dead observer evidence fails closed, Redis remains optional for base
  Gateway readiness, and the D/0/05 same-UID `host-unconfined` residual risk is
  carried explicitly.
- The metadata allowlist and leak exclusions are broad, and the plan includes
  injected clocks/identity providers plus isolated process-fault fixtures.
- `coordination.status`, `agents:events`, and `message.*` preservation is
  explicit and covered by compatibility tests. No MCP health tool, public HTTP
  endpoint, or unauthenticated network listener is authorized.
- The candidate changes planning artifacts only, and the submission adds only
  its append-only review request.

## Independent verification

- `/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q
  tests/structure` — **143 passed**.
- The submission's focused structure command for
  `test_v5_coordination_docs.py` and
  `test_v5_coordination_integration_docs.py` — **13 passed**.
- Candidate-state local Markdown-link scan over all five changed planning
  documents — **78 links resolved, 0 missing**.
- `git diff --check b9aae83^..b9aae83`,
  `git diff --check b9aae83..41a619d`, and commit ancestry checks — passed.
- Scope checks confirmed that `b9aae83` changes exactly the five submitted V5
  planning files and `41a619d` adds only
  `E_0_4-plan-1_to_review.md`.
- Static reason-table inspection found 28 rows, 28 unique ranks, and 28 unique
  codes; dependency-row inspection reproduced that only H/0/04 names E/0/04
  among the four declared consumers.

No network, MCP, Redis, live Gateway/watchdog, PostgreSQL, tmux, agent process,
or shared service was contacted, started, stopped, or mutated.
