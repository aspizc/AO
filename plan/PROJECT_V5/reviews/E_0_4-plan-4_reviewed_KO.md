# Independent Review — Project V5 E/0/04 Plan (Trial 4)

Verdict: **KO**

Reviewer profile: model **GPT-5.6 Sol**, reasoning **ultra**, execution
**Fast/Priority**.

## Reviewed scope

- Required base:
  `d8de8404401cfbcb0b0af59dc51951629faceef9`.
- Technical candidate:
  `e4826925c623631b0f8a35390e579af5deaf19a7`.
- Review-request commit, inspected as evidence only:
  `a8c83fc86494df3c33eca8e77db4ab31982c49ae`.
- Exact technical range: `d8de840..e482692`.
- Exact complete range: `d8de840..a8c83fc`.
- Primary artifact: `plan/PROJECT_V5/E/0/04.md`.

This is a plan verdict only. No runtime implementation, integration,
promotion, merge, or release is credited.

## Blocking finding

1. **The new-instance reset discriminator can collide, so an allowed reset can
   be interpreted as a valid zero delta and hide a loss event.**

   A new `instanceId` sets `instanceMetricEpochUnixNano` by flooring wall time
   to one-second precision (`E/0/04.md:936-941`). The plan nevertheless calls
   every new instance a new resource/time series while explicitly forbidding
   `service.instance.id` as a Prometheus metric label
   (`E/0/04.md:953-970`). The generated start companions retain only
   `schema_version`, `source`, and `data_loss_reason`, and expose that same
   integer-second epoch (`E/0/04.md:1018-1027`). The adjacent-tick reducer can
   therefore distinguish instances only when their floored start values
   differ or their counters decrease (`E/0/04.md:1041-1061`).

   The plan permits two replacement `instanceId` values to be created in the
   same Unix second; it defines no uniqueness, minimum separation, persisted
   monotonic allocation, or collision failure. A concrete valid chronology is:

   ```text
   Unix second S:
     old instance created at S+0.1, full-ACKed value=1 at S+0.4
     new instance created at S+0.9, first full ACK arrives after wall tick T

   wall tick T:
     normalized prior = old instance, value=1, start=floor(S)

   wall tick T+10:
     normalized current = new instance, value=1, start=floor(S)
     (the new instance recorded one loss event before this ACK)
   ```

   The points have different timestamps, so the tie-conflict rule does not
   reject them. Both populations are complete, both start companions have the
   same permitted value, and `service.instance.id` is unavailable to the
   rule. The stated algorithm takes its normal branch and computes
   `1 - 1 = 0`; consequently the export-freshness SLO sample is good and
   `GatewayMetricDataLoss` does not fire, despite the reset and the new loss
   event (`E/0/04.md:1092-1111`). Other old/new values can similarly undercount
   the delta or classify the reset by accidental counter ordering.

   Trial 5 must make the reset discriminator collision-free across every new
   `instanceId`, including same-second creation and wall-clock rollback, or
   carry an equivalent closed identity/generation through normalization. It
   must define fail-closed behavior when that allocator/state is unavailable
   and add a golden adjacent-tick case proving that two same-second instances
   cannot enter the normal subtraction branch.

## Trial 3 blockers otherwise closed

- The counter table is a closed population of exactly five
  instrument/source/reason rows, initialized before consumption and exported
  at zero rather than synthesized by a rule (`E/0/04.md:918-945`).
- Values and start state persist across every named same-instance restart and
  disable/re-enable cycle; a missing/corrupt existing ledger fails, and only a
  new instance resets the five rows (`E/0/04.md:947-954`).
- First-ACK zero, partial/missing/inconsistent population, and non-zero
  bootstrap outcomes are explicit (`E/0/04.md:956-962`).
- Wall alignment, the bounded current selection, exact `T-10 s` prior,
  absent-prior bootstrap, start change, decrease, invalid input, per-source
  aggregation, the half-open 8,640-tick window, and alert fire/resolve
  durations are otherwise deterministic (`E/0/04.md:1029-1113`).

## Preserved contracts and scope

- The reason table remains 28 ordered unique ranks/codes
  (`E/0/04.md:268-306`), and the producer registry remains 43 unique
  instruments (`E/0/04.md:870-916`).
- The external liveness table, canonical heartbeat/ping/ACK wire protocol,
  saturation latch, 10 queue settings, and exactly five bounded control queues
  are byte-identical to the required base
  (`E/0/04.md:236-259`, `E/0/04.md:396-426`,
  `E/0/04.md:431-466`, `E/0/04.md:529-612`).
- The technical commit changes only `plan/PROJECT_V5/E/0/04.md`; the request
  commit adds only `E_0_4-plan-4_to_review.md`. All six Trial 1–3
  request/verdict artifacts are byte-identical.
- E/0/04 and its four direct consumers remain `planned`. The candidate adds
  no runtime code, MCP surface, public listener, Redis mutation, `$` stream
  start, second writer, or change to `coordination.status`, `agents:events`,
  or `message.*` (`E/0/04.md:5-8`, `E/0/04.md:1200-1213`).

## Independent verification

- Complete manual inspection of the TDD implementation skill, Project V5 and
  Stage E intake documents, both Trial 2/3 KO verdicts, the Trial 4 request,
  and the exact complete range `d8de840..a8c83fc`.
- `/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q
  -p no:cacheprovider tests/structure` — **222 passed in 12.83 seconds**.
- Semantic probes — **28** ordered unique reasons, **43** unique producer
  instruments, exactly **five** zero-event series, exactly **five** queue
  classes and **ten** queue settings; liveness, reason, wire, saturation,
  queue, and registry sections preserved byte-for-byte.
- Adjacent-delta probes — zero bootstrap `0`; non-zero without prior, epoch
  change, decrease, and missing/stale input invalid; monotonic increment `1`;
  following stable tick `0`; 10-second adjacency, no lookback fallback,
  8,640-tick window, and zero-second fire/retention markers present.
- Candidate, request, and complete-range `git diff --check` — passed.
- Exact ancestry, changed-path allowlists, prior-artifact preservation,
  planned-status assertions, and absent-preexisting-verdict check — passed.
- Local Markdown link resolution over both changed documents — **0 links, 0
  missing**.

No network, MCP, Redis, PostgreSQL, live Gateway/watchdog, shared daemon,
tmux session, credential, or external service was contacted, started,
stopped, or mutated.
