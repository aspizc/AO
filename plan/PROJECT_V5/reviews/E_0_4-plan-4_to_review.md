# Review Submission — Project V5 E/0/04 Plan (Trial 4)

## Reviewed correction

- Required base, including the Trial 3 KO:
  `d8de8404401cfbcb0b0af59dc51951629faceef9`.
- Candidate plan commit:
  `e4826925c623631b0f8a35390e579af5deaf19a7`.
- Exact candidate range: `d8de840..e482692`.
- Primary artifact: `plan/PROJECT_V5/E/0/04.md`.
- Every Trial 1–3 submission and verdict remains append-only and unchanged.

This is a planning correction only. E/0/04 remains `planned`; no runtime
implementation, integration, promotion, merge, or release is claimed.

## Trial 3 blockers closed

1. **One zero-event counter policy.** The plan freezes exactly five allowed
   counter/source/reason series: two gap series and three intentional-loss
   series. A protected ledger creates all five at zero before source
   consumption, and every enabled source exports its complete population even
   when no event has occurred. All rows share the exact persisted
   `instanceMetricEpochUnixNano`; values and start timestamps survive every
   same-instance restart and source disable/re-enable. Missing/corrupt state
   fails instead of silently resetting, and only a new `instanceId` creates a
   new epoch and zero population. The first wall tick strictly after a full
   liveness ACK is good for a complete zero population and bad for partial,
   missing, inconsistent, or non-zero first input.
2. **One adjacent-tick loss algorithm.** Rules evaluate at wall-aligned
   10-second ticks. They select current counter/start pairs from the exact
   310-second bounded range, enforce configured freshness, and compare only
   with the normalized snapshot at exactly `T - 10 s`. The contract gives
   explicit branches for a zero bootstrap, absent/non-zero prior, start-epoch
   change, counter decrease, missing/stale/conflicting population, and normal
   monotonic delta. It aggregates only by fixed `schema_version` and `source`.
   Export freshness gets one bad sample for an observed increment and keeps it
   in the half-open 8,640-tick SLO window until `T + 24 h`.
   `GatewayMetricDataLoss` has `for: 0s`, `keep_firing_for: 0s`, fires on a
   positive delta or invalid/missing source input, and resolves on the first
   later complete valid zero-delta tick.

The existing 28-reason reducer, wire protocol, saturation latch, five bounded
queues, 43 producer instruments, OTLP cursor semantics, and all compatibility
boundaries are unchanged.

## Documentary TDD and verification

Before editing, the Trial 4 contractual probe reproduced both Trial 3
blockers:

```text
FAIL zero-event counter population: 5/5 missing
FAIL wall-aligned loss delta and alert: 6/6 missing
RED confirmed: 2/2 Trial 3 blocker groups fail
```

After the correction, the identical marker groups passed:

```text
PASS zero-event counter population: all 5 markers present
PASS wall-aligned loss delta and alert: all 6 markers present
GREEN confirmed: 2/2 Trial 3 blocker groups pass
```

Additional evidence:

- semantic contract check — 28 ordered unique reasons, 43 unique registered
  producer instruments, exactly five zero-event series, and 46 valid raw
  metric references;
- branch assertions for zero/no-prior, non-zero/no-prior, start reset,
  counter decrease, normal delta, missing/stale input, 8,640-tick window, and
  alert fire/resolve semantics — passed;
- Markdown table-shape check — passed;
- local Markdown-link resolver for E/0/04 — 0 links, 0 missing;
- exact changed-path allowlist for the technical commit — only
  `plan/PROJECT_V5/E/0/04.md`;
- `git diff --check d8de840..e482692` — passed; and
- `/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q
  tests/structure` — **222 passed in 12.90 seconds**.

No runtime, network, MCP, Redis, PostgreSQL, live Gateway/watchdog, shared
daemon, tmux session, agent spawn, token, credential, or external service was
contacted, started, stopped, or mutated. The Redis adapter remains optional
and read-only, starts at `0-0` rather than `$`, and does not change
`coordination.status`, `agents:events`, or `message.*`.

## Independent review request

Use **GPT-5.6 Sol**, reasoning **ultra**, with **Fast/Priority** execution if
available, and record the actual reviewer profile. Review the exact candidate
range independently against
`plan/PROJECT_V5/reviews/E_0_4-plan-3_reviewed_KO.md`. Prove or reject:

1. that the five-row table is the only accepted source/reason population,
   zero rows are exported rather than synthesized by rules, start time and
   values have one persistence/reset policy, and the first full-ACK tick has
   one result for both zero and non-zero histories;
2. that the generated start-time companions and rule ordering yield one
   deterministic current/prior pair at each wall tick, with no implicit
   `increase()` window or lookback fallback;
3. that reset, decrease, absent, stale, conflicting, and restored inputs each
   produce the stated SLO sample and alert state; and
4. that aggregation labels, the adjacent 10-second interval, the half-open
   24-hour window, and alert fire/resolve durations admit no 5-minute or
   24-hour alert alternative.

Also verify that Trial 3's closed contracts remain intact and that the
candidate introduces no runtime-complete claim, second writer, Redis control
mutation, `$` stream start, public/MCP health surface, forbidden label, or
change to `agents:events` or `message.*`.

Publish exactly one new verdict artifact:
`E_0_4-plan-4_reviewed_OK.md` or `E_0_4-plan-4_reviewed_KO.md`. Do not
auto-approve, integrate, promote, merge, or modify the candidate while
reviewing.
