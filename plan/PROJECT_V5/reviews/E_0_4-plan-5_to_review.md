# Review Submission — Project V5 E/0/04 Plan (Trial 5)

## Reviewed correction

- Required base, including the Trial 4 KO:
  `23b4952e299bc578ca2418165484af14a0adbb40`.
- Candidate plan commit:
  `a01d3c5494854abc455a37e1f6555c71c01fe6c5`.
- Exact candidate range: `23b4952..a01d3c5`.
- Primary artifact: `plan/PROJECT_V5/E/0/04.md`.
- Every Trial 1–4 submission and verdict remains append-only and unchanged.

This is a minimal planning correction. E/0/04 remains `planned`; no runtime
implementation, integration, promotion, merge, or release is claimed.

## Trial 4 blocker closed

The manager now allocates one durable, strictly increasing
`instanceMetricGeneration` before it writes any new instance manifest. A
create-once protected allocation record and stable OFD lock serialize
allocations; atomic replace plus directory fsync makes a post-allocation crash
burn rather than reuse a generation. Missing/corrupt/lock-unavailable state
and safe-integer overflow fail closed. Restart, deletion, host reboot,
same-second creation, and wall-clock rollback cannot reset the allocator.

The generation is an OTLP resource attribute, never a Prometheus label or new
producer instrument. The Collector derives two fixed backend generation
companion families with the existing low-cardinality labels. Wall-tick
snapshots retain their generation value, and the delta reducer compares
generation before start timestamp or counter value.

The required golden chronology is now unambiguous:

```text
prior:   start=S, instanceMetricGeneration=41, oldValue=1
current: start=S, instanceMetricGeneration=42, newValue=1
```

The current tick is reset-invalid, emits no delta, records input-valid zero,
makes the export-freshness SLO numerator zero, and fires
`GatewayMetricDataLoss`. It cannot compute `1 - 1 = 0`. One later unchanged
generation-42 tick establishes the valid zero-delta baseline and resolves
under the already-frozen alert rule.

## Documentary TDD and verification

Before editing, the focused Trial 5 probe reproduced the collision:

```text
same-second replacement old=1/new=1 result=0
FAIL collision-free instance reset discriminator: 7/7 contract markers missing
RED confirmed: allowed replacement hides the new loss as delta 0
```

After the correction, the identical chronology and marker set passed:

```text
same-second replacement old=1/new=1 result='invalid'
PASS collision-free instance reset discriminator
GREEN confirmed: same-second replacement cannot enter delta subtraction
```

Additional evidence:

- semantic contract check — 28 ordered unique reasons, 43 unique producer
  instruments, exactly five queue classes and ten queue settings, and exactly
  five zero-event loss series;
- allocator checks — stable lock file, create-once state, exact checksum,
  atomic allocate-before-manifest ordering, crash burn, overflow/corruption
  failure, two generation companions, no generation/instance label, and
  generation-first reducer branch — passed;
- required pre-existing sections remained byte-identical to the base:
  liveness/reasons 7,464 bytes, settings/saturation/queues 9,461 bytes, wire
  6,980 bytes, and the 43-row registry 5,721 bytes;
- Markdown table-shape check — passed;
- local Markdown-link resolver for E/0/04 — 0 links, 0 missing;
- exact technical changed-path allowlist — only
  `plan/PROJECT_V5/E/0/04.md`;
- `git diff --check 23b4952..a01d3c5` — passed; and
- `/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q
  -p no:cacheprovider tests/structure` — **222 passed in 12.52 seconds**.

No runtime, network, MCP, Redis, PostgreSQL, live Gateway/watchdog, shared
daemon, tmux session, agent spawn, token, credential, or external service was
contacted, started, stopped, or mutated. Redis remains optional/read-only and
starts at `0-0`, while `coordination.status`, `agents:events`, and `message.*`
remain unchanged.

## Independent review request

Use **GPT-5.6 Sol**, reasoning **ultra**, with **Fast/Priority** execution if
available, and record the actual reviewer profile. Review the exact candidate
range independently against
`plan/PROJECT_V5/reviews/E_0_4-plan-4_reviewed_KO.md`. Prove or reject:

1. that every successful new-instance allocation consumes one unique,
   durable, safe-integer generation before manifest creation, including
   concurrent, crash, same-second, and wall-clock-rollback cases;
2. that missing, corrupt, lock-unavailable, or exhausted allocator state
   cannot guess, reset, or reuse a generation;
3. that generation reaches normalization as a backend companion value without
   becoming a producer instrument or metric label; and
4. that the exact `oldValue=1`/`newValue=1`, equal-start, unequal-generation
   golden is invalid/SLO-bad/alert-firing and can never enter subtraction.

Also verify that the 28 reasons, 43 producer instruments, five zero-event
series, five queues/ten settings, wire/liveness/saturation contracts,
low-cardinality boundary, and `planned` runtime status remain intact.

Publish exactly one new verdict artifact:
`E_0_4-plan-5_reviewed_OK.md` or `E_0_4-plan-5_reviewed_KO.md`. Do not
auto-approve, integrate, promote, merge, or modify the candidate while
reviewing.
