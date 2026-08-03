# Independent Review — Project V5 E/0/04 Plan (Trial 2)

Verdict: **KO**

Reviewer profile: model **GPT-5.6 Sol**, reasoning **ultra**, execution profile
**Fast/Priority**.

## Reviewed scope

- Required base:
  `55221a581ba53a34c85d073ec7d99157b6f1991d`.
- Candidate plan commit:
  `369f5919596f114003d9731559e8527d709d225e`.
- Review-request commit, inspected as evidence only:
  `7bace80fd2ff37da0879ab928bf763162e627abf`.
- Exact candidate range: `55221a5..369f591`.
- Primary artifact: `plan/PROJECT_V5/E/0/04.md`.
- Preserved Trial 1 KO and all nine changed planning/index/consumer documents.

This is a plan verdict only. No runtime implementation, integration,
promotion, merge, or release is credited.

## Blocking findings

1. **The health projection and authenticated frame protocol are still not
   total enough to produce one wire result.**

   The reducer says that one of identity mismatch, stopped, dead,
   missing-heartbeat, or stalled is selected and that liveness becomes “dead
   or stalled as specified below” (`E/0/04.md:217-221`). The following
   transition prose specifies `unknown` only before first-heartbeat grace,
   `stalled` only after an accepted heartbeat expires, and `dead` for pidfd
   exit or planned stop (`E/0/04.md:235-240`). It never assigns
   `live.state`, `live.value`, or the two required `since` values for
   `PROCESS_IDENTITY_MISMATCH` or for `HEARTBEAT_MISSING` at/after grace.

   A concrete unresolved input is:

   ```text
   observation=current
   desiredState=running
   expected pidfd identity=alive and matching
   accepted heartbeat count=0
   now=attestedStartMonotonicMs + initialHeartbeatGraceMs
   every unrelated prerequisite=current/ok
   ```

   Rank 5 is active by the exact `>=` predicate
   (`E/0/04.md:251-258`), but both `live=unknown` with null `since` fields and
   `live=stalled` with non-null transition fields remain compatible with the
   prose. Those choices change the serialized schema and the live-probe exit.
   The same missing mapping exists for rank 2.

   The manager is now the authoritative issuer and independently supplies a
   pidfd/process digest, which is a real correction. However, the heartbeat,
   ping, and ACK formats are only described as containing unspecified “closed
   metadata-only fields” plus audience, boot IDs, sequence, and signature
   (`E/0/04.md:434-441`). There is no exact field table, canonical byte
   encoding/signature input, or daemon identity field. Yet receivers must
   reject a wrong `identity`, and rank 2 compares PID/start token/executable
   identity with the manager-attested identity
   (`E/0/04.md:254,434-441`). One conforming implementation can include and
   sign the manager digest in every heartbeat; another can rely only on the
   socket/key binding. Both fit the text but produce incompatible frames and
   different identity-mismatch tests.

   Trial 3 must add a total liveness transition/output table for every
   external reason, including exact `since` landmarks, and exact closed
   heartbeat/ping/ACK schemas with bounds, canonical signed bytes, and the
   relationship between manager-attested identity and the frame. Golden
   vectors must distinguish the alternatives above.

2. **Admission hysteresis leaves a reachable closed-admission state with no
   active blocking reason, and the reserved queues are not bounded.**

   Rank 24 is active only when the *current* aggregate has
   `hardLimitReached=true` (`E/0/04.md:276`). Saturation nevertheless exits
   only after `admissionHysteresisSamples` consecutive false samples
   (`E/0/04.md:364-371`). With the default of three, this reachable sequence is
   unresolved:

   ```text
   prior reducer state=saturated / executionAdmission=closed
   current sample 1 of 3: hardLimitReached=false
   maxUtilizationBasisPoints=0
   all other components/reasons=current and ok
   ```

   The saturation latch has not exited, so admission must remain closed.
   Rank 24 is false by its exact predicate, pressure is false, and no other
   reason is active. The aggregate reducer therefore reaches `healthy` with an
   empty reason set while readiness remains false solely because admission is
   not open (`E/0/04.md:225-233`). Keeping rank 24 active would instead violate
   its stated exact predicate. This is not a total reducer or a deterministic
   hysteresis oracle.

   The control-lane contract also says each queue has “exactly eight” waiting
   slots, then permits configuration to raise the capacity
   (`E/0/04.md:376-383`). No control-queue key, default, maximum, total memory
   bound, or cross-constraint exists in the settings table, whose unknown keys
   must be rejected (`E/0/04.md:294-331`). Consequently V1 is either fixed at
   eight and cannot honor the raise clause, or accepts an unbounded,
   unspecified setting. The claimed bounded queue/memory behavior and its
   configuration tests cannot both be implemented.

   Trial 3 must define rank 24 against the latched saturation state (including
   every entry/exit sample) or define another blocking state/reason, then give
   one expected projection for the sequence above. It must either freeze all
   five queues at eight or add named integer settings with exact defaults,
   maxima, total byte/accounting bounds, and overload behavior.

3. **The A-08 exporter/backend loop still lacks a closed metric and
   acknowledgement contract.**

   The section titled “Closed RED/USE metric contract” gives only descriptive
   families and an `agents_gateway_` prefix
   (`E/0/04.md:616-633`). It does not freeze instrument names, instrument
   types, units, histogram boundaries, per-instrument label sets, or the
   supposedly fixed error-category enum. G/0/03, H/0/04, and I/0/05 are
   required to register allowlisted sources against that contract
   (`E/0/04.md:635-640`; `G/0/03.md:21-23`; `H/0/04.md:21-23`;
   `I/0/05.md:25-27`), but there is no machine-decidable registry against
   which their “unregistered metric/label” tests, Prometheus rules, or
   dashboard queries can be written.

   There is also an internal label/alert contradiction. The allowed labels are
   limited to `flow`, schema version, component, aggregate state, fixed error
   category, and reason code (`E/0/04.md:635-640`), while the required alert is
   lease-expiration churn “above ten per scope”
   (`E/0/04.md:674-681`). No scope label or alternate fixed per-scope
   instrument is defined, and concrete scope identifiers are intentionally
   excluded from the projection. The required alert therefore cannot be
   evaluated from the declared series.

   Cursor acknowledgement is likewise ambiguous for a real OTLP backend. The
   cursor advances after a “successful OTLP `Export` response”
   (`E/0/04.md:584-593`), but OTLP can return a transport-success response with
   partial rejection. Advancing loses rejected points; treating any partial
   response as failure retries them. Both implement the prose, but only one
   preserves the stated at-least-once contract. The availability SLI also uses
   “expected samples” without defining its cadence or how missing exporter/
   observer samples enter the denominator (`E/0/04.md:663-672`), so an export
   outage can either reduce availability or disappear from the calculation.

   Trial 3 must freeze a machine-readable instrument registry (exact names,
   kinds, units/buckets, labels, and closed enums), make every alert derivable
   from allowed series without high-cardinality IDs, define full/partial OTLP
   acknowledgement and permanent-rejection cursor behavior, and define SLI
   sampling/missing-data semantics plus exact recording-rule inputs. The
   disposable Collector/Prometheus/dashboard assets can then test one contract
   rather than choose it during implementation.

## Trial 1 blockers that are materially closed

- Recovery timing now has watchdog-owned `CLOCK_BOOTTIME` landmarks, exact
  TTD/TTR/outage formulas, distinct good-sample ticks, same-boot restart
  continuity, and host-reboot-incomparable null durations
  (`E/0/04.md:496-549`).
- The watchdog journal has explicit record/segment/retention limits and an
  observable forced-gap path (`E/0/04.md:551-575`).
- The manager now issues role-separated capabilities, independently attests
  process identity, rotates daemon/watchdog generations, and keeps the
  watchdog health-only and store-blind (`E/0/04.md:395-475`). Finding 1 is
  limited to the still-open authenticated frame/wire result.
- G/0/03, H/0/04, I/0/05, and I/0/07 all have direct E/0/04 dependency edges
  and concrete source/live-lane responsibilities. The Stage E index, EPICS,
  SHEETS narrative, and A-08 coverage row name the same four consumers.

## Verified compatibility and scope properties

- The candidate changes exactly nine planning/index/consumer Markdown files.
  It adds no production code and keeps E/0/04 and every consumer `planned`.
- `7bace80` adds only
  `plan/PROJECT_V5/reviews/E_0_4-plan-2_to_review.md`; it is evidence, not part
  of the candidate.
- Both Trial 1 review artifacts are byte-unchanged across the candidate range.
- The watchdog has no control-store, audit-store, repository, approval, Redis,
  or mutation capability; no second Gateway/control writer is introduced.
- The Redis source starts at `0-0`, never `$`, and explicitly does not create a
  group, acknowledge, trim, publish, or otherwise mutate `agents:events`.
- Redis remains optional for base readiness. `coordination.status`,
  `agents:events`, and `message.*` are explicitly unchanged.
- No MCP health tool, public Gateway health listener, runtime-complete claim,
  integration, merge, or promotion claim was introduced.

## Independent verification

- Complete manual inspection of the preserved Trial 1 KO, Trial 2 submission,
  and exact `git diff 55221a5..369f591`.
- `/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q
  tests/structure` — **222 passed in 13.40 seconds**.
- Local Markdown-link resolution across all nine changed documents —
  **78 links checked, 0 missing**.
- `git diff --check 55221a5..369f591` and
  `git diff --check 369f591..7bace80` — passed.
- Changed-path, request-only-commit, prior-trial-preservation, A-08 one-owner,
  and four-consumer dependency assertions — passed.
- Static reason-table check — **28 rows, 28 unique ranks, 28 unique codes**.

No network, MCP, Redis, PostgreSQL, live Gateway/watchdog, shared daemon,
tmux session, credential, or external service was contacted, started,
stopped, or mutated.
