# Review Submission — Project V5 E/0/04 Plan (Trial 2)

## What was done

- Preserved the Trial 1 submission and KO append-only and corrected the six
  blocking findings in the final E/0/04 plan.
- Replaced the illustrative open-ended projection with a fully closed,
  bounded `agents.gateway.health.v1` schema for observation, eleven fixed
  components, recovery states/landmarks, reason arrays, and watchdog/daemon
  sequence ownership and reset.
- Defined a total reducer with exact predicates, mutually exclusive liveness
  cases, deterministic precedence, fail-closed stale-observer behavior, and
  one unambiguous `recovery-required` aggregate for schema incompatibility.
- Froze manager-attested bootstrap and rotation: fixed version/audience,
  manager-issued role capabilities, independently sourced pidfd/process
  identity, restrictive ownership/modes, directional signatures/sequences,
  one-use challenges, replay rejection, and daemon/watchdog restart behavior.
- Added complete defaults, ranges, cross-constraints, sample windows,
  freshness, probe deadlines, event-loop/control/admission hysteresis,
  multi-dimension saturation reduction, and measurable capacity/latency
  budgets for five independent reserved control queues.
- Made the watchdog's `CLOCK_BOOTTIME` the recovery clock authority, defined
  every failure boundary and exact TTD/TTR/outage formula, fixed good-sample
  cadence, cleared incomparable landmarks across host reboot, and bounded the
  crash-safe journal and explicit gap behavior.
- Expanded E/0/04 to dispose of all A-08 acceptance: maintained OTLP export,
  bounded at-least-once batches, durable journal and Redis-source cursors,
  replacement of the one-shot `$` reader without mutating `agents:events`,
  flow-linked RED/USE, backend integration assets, SLOs, alerts, and dashboard.
- Reconciled the binding DAG and consumers. G/0/03, H/0/04, I/0/05, and I/0/07
  now have real E/0/04 dependency paths and narrowly typed source/live-lane
  responsibilities; EPICS, SHEETS, coverage, and Stage E index agree.

## Why

Trial 1 left enough open schema, trust, threshold, clock, observability, and
dependency choices for incompatible implementations to claim conformance. It
also represented A-08 as covered while omitting the backend/cursor/SLO/alert
loop found by the source audit. Trial 2 makes those decisions executable and
reviewable without marking any runtime implementation complete.

## Decisions taken

- `watchdogSnapshotSeq` is a watchdog publication sequence and advances on
  each scheduled atomic snapshot; `daemonTransitionSeq` advances only on a
  semantic daemon health transition. Each resets only with its own boot ID.
- A trusted probe overlays freshness. With a valid manager manifest but no
  current watchdog snapshot, it returns one safe blocked/unknown-liveness
  projection whose only reason is `HEALTH_OBSERVER_STALE`; it never reuses
  cached daemon health as current truth.
- State-store schema incompatibility prevents readiness and has
  `recovery-required` impact. External observer/process failures mask stale
  daemon reasons as blocked but do not erase durable episode evidence.
- The manager, not either observed process, assigns boot identity, transfers
  role-specific capabilities and the pidfd, and rotates all role material on
  either generation change. Same-UID `host-unconfined` residual risk remains
  explicit.
- Admission uses an atomic D/0/06 multi-scope/multi-dimension aggregate and
  integer basis points. Hard saturation is immediate; pressure/clear and
  saturation exit use fixed consecutive-sample hysteresis.
- TTD is detection minus the reason-specific failure boundary; TTR is ready
  confirmation minus detection; outage is ready confirmation minus failure
  boundary. All operands must share one kernel clock boot. Host reboot keeps
  the episode/display chronology but nulls every monotonic landmark/duration.
- A configured exporter failure degrades but does not block base readiness.
  Redis remains optional, the durable Redis reader is read-only, and no MCP
  health surface, public Gateway listener, `agents:events` wire change, or
  `message.*` change is authorized.

## Verification

- Trial 2 pre-edit contractual probe — expected RED in all six groups:
  closed schema/reducer, manager bootstrap, deterministic thresholds/control
  lane, monotonic formulas, A-08 operational loop, and consumer DAG.
- Post-edit contractual probe — GREEN in all six groups.
- `/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q
  tests/structure` — 222 passed in 12.96 seconds.
- Local-link resolver over the nine changed planning documents — 78 local
  links checked, all resolved.
- Markdown table-shape check for E/0/04 and the coverage matrix — passed.
- Exact changed-path allowlist — nine required plan/index/consumer documents
  only; both Trial 1 artifacts remained byte-unchanged.
- `git diff --check` — passed.
- No runtime service, network, MCP, Redis, shared daemon, tmux session, agent
  spawn, token, or credential was used, restarted, or changed.

## Commit

- `369f591` — `docs(v5): correct Gateway health plan (E/0/04 trial 2)`

## Independent review request

Use **GPT-5.6 Sol**, reasoning **ultra**, and **Fast/Priority** execution if
available, and record the actual reviewer profile. Re-review the correction
commit and final plan independently against the preserved Trial 1 KO. Verify:

1. every schema object/field is closed and bounded, component/recovery
   invariants are complete, sequence ownership/reset is deterministic, and the
   reducer is total without a blocked/recovery-required contradiction;
2. bootstrap trust originates in the service manager, process identity is
   independent of daemon assertions, capabilities have exact
   delivery/rotation/replay semantics, and ownership/modes keep children out;
3. every behavior-affecting interval, deadline, range, window, statistic,
   freshness rule, hysteresis transition, saturation rule, and reserved
   control-lane capacity/latency budget has one testable interpretation;
4. recovery landmarks and TTD/TTR/outage formulas use one watchdog-controlled
   monotonic epoch, restart behavior is exact, host reboot cannot produce an
   invented duration, and journal/cursor storage is bounded;
5. A-08 now has a complete real exporter/backend/durable-cursor/RED-USE/SLO/
   alert/dashboard disposition, including the inherited `$` reader, without
   mutating `agents:events` or making Redis a base-readiness dependency; and
6. G/0/03, H/0/04, I/0/05, and I/0/07 genuinely consume the contract and the
   sheet fields, epic DAG, registry, coverage matrix, and Stage E index agree.

Publish either `E_0_4-plan-2_reviewed_OK.md` or
`E_0_4-plan-2_reviewed_KO.md`. Preserve every prior trial artifact and report
only reproducible blockers. This submission is planning review only; it is
not runtime implementation, integration, promotion, merge, or release
evidence.
