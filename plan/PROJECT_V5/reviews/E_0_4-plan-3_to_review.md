# Review Submission — Project V5 E/0/04 Plan (Trial 3)

## Reviewed correction

- Required base, including the Trial 2 KO:
  `e0e6f91e12e60b20b45b26516a59dacc02f512fa`.
- Candidate plan commit:
  `dc84b01238dc3fa50dedc5dc19196b73e5c3bbae`.
- Exact candidate range: `e0e6f91..dc84b01`.
- Primary artifact: `plan/PROJECT_V5/E/0/04.md`.
- Trial 1 and Trial 2 submissions and verdicts remain append-only and
  unchanged.

This is a planning correction only. E/0/04 remains `planned`; no runtime
implementation, integration, promotion, merge, or release is claimed.

## Trial 2 blockers closed

1. **Wire and liveness totality.** The plan now has an exhaustive,
   top-down external-liveness table with exact state, value, monotonic `since`
   landmark, and live-probe exit for observer failure, pre-grace boot,
   manager-attested identity mismatch, stopped/dead process,
   heartbeat-missing at the exact grace boundary, stalled heartbeat, and
   current heartbeat. It freezes the manager-attested `daemonIdentity` tuple
   and digest, independently observed watchdog comparison, all required
   heartbeat/ping/ACK fields and bounds, RFC 8785 signed bytes, directional
   sequences, ACK binding, invalid-frame effects, and deterministic golden
   vectors. A validly signed frame with the wrong digest is a protocol
   rejection; only the independently observed tuple mismatch activates rank
   2.
2. **Saturation and bounded control queues.** Rank 24 now follows the
   server-owned `saturationLatched` state. A hard-limit sample closes
   immediately; with the default three-sample clear hysteresis, false samples
   one and two remain closed/blocked with rank 24 and sample three clears
   before projection. Stale, missing, pending, invalid, or true samples cannot
   accidentally clear a set latch. The five independent queue classes have
   exactly ten named capacity/freshness settings, defaults, inclusive bounds,
   entry limits, fixed workers/arenas, explicit full/expired/oversize
   outcomes, and a maximum logical memory bound of 2,213,120 bytes with no
   growth, borrowing, overflow, reload, or general-queue fallback.
3. **A-08 metric/export/SLO contract.** The plan freezes
   `schemas/observability/agents-gateway-metrics-v1.yaml` as the
   machine-readable registry, with 43 exact names, kinds, UCUM units, labels,
   closed label/category enums, histogram buckets, and gauge/counter/
   histogram event semantics. Every alert is derivable without concrete
   scope or other forbidden labels; lease churn is explicitly global. OTLP
   full ACK, partial success, retryable/operator-blocked transport,
   permanent record rejection, invalid response, recursive split, singleton
   durable loss marker, cursor fsync, and data-loss accounting are exact.
   Recording rules use one expected sample every 10 seconds, count missing
   observer/exporter/backend/rule results as bad, define every population and
   denominator, and require minimum drill evidence. Enabled idle sources emit
   a fixed liveness point so freshness is measurable without inventing a
   source record or cursor advance.

## Documentary TDD and verification

Before editing, the Trial 3 contractual probe reproduced all three Trial 2
blocker groups:

```text
FAIL wire and liveness totality: all 5 missing
FAIL latched saturation and bounded queues: all 4 missing
FAIL metric registry and OTLP/SLO semantics: all 5 missing
RED confirmed: 3/3 Trial 2 blocker groups fail
```

After the correction, the identical marker groups passed:

```text
PASS wire and liveness totality: 5/5 contract markers present
PASS latched saturation and bounded queues: 4/4 contract markers present
PASS metric registry and OTLP/SLO semantics: 5/5 contract markers present
GREEN confirmed: 3/3 Trial 2 blocker groups pass
```

Additional evidence:

- semantic contract check — 28 ordered unique reasons, 43 unique instruments,
  20 declared label dimensions, and five unique queue classes/settings;
- Markdown table-shape check — passed;
- local Markdown-link resolver for E/0/04 — 0 links, 0 missing;
- exact changed-path allowlist for the technical commit — only
  `plan/PROJECT_V5/E/0/04.md`;
- `git diff --check e0e6f91..dc84b01` — passed; and
- `/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q
  tests/structure` — **222 passed in 13.26 seconds**.

No network, MCP, Redis, PostgreSQL, live Gateway/watchdog, shared daemon,
tmux session, agent spawn, token, credential, or external service was
contacted, started, stopped, or mutated. The Redis reader remains optional,
starts from `0-0` rather than `$`, and does not create a group, acknowledge,
trim, publish, or perform control mutation. `coordination.status`,
`agents:events`, and `message.*` remain unchanged, and the watchdog remains
health-only with no control-store or Redis mutation.

## Independent review request

Use **GPT-5.6 Sol**, reasoning **ultra**, with **Fast/Priority** execution if
available, and record the actual reviewer profile. Review the exact candidate
range independently against
`plan/PROJECT_V5/reviews/E_0_4-plan-2_reviewed_KO.md`. In particular, prove or
reject:

1. that every valid and invalid external liveness input has exactly one
   state/value/`since`/probe-exit result, manager identity cannot be
   self-asserted, and the closed canonical heartbeat/ping/ACK schemas and
   golden vectors admit only one wire implementation;
2. that rank 24 remains active for every retained saturation sample, clears
   on exactly the configured valid sample, never permits closed admission
   with an empty blocking/recovery reason, and all five queues have one
   enforceable configuration and total byte bound; and
3. that the 43-instrument registry completely determines names, types, units,
   labels, buckets, event counting, alert inputs, OTLP partial/permanent ACK
   behavior, cursor/data-loss effects, and SLO denominators under missing
   telemetry.

Also verify that the correction introduces no second writer, Redis control
mutation, `$` stream start, public/MCP health surface, forbidden metric label,
change to `agents:events` or `message.*`, or runtime-complete claim.

Publish exactly one new verdict artifact:
`E_0_4-plan-3_reviewed_OK.md` or `E_0_4-plan-3_reviewed_KO.md`. Do not
auto-approve, integrate, promote, merge, or modify the candidate while
reviewing.
