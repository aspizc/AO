# Review Submission — Project V5 G/0/02 CORE (Trial 2)

## Review requested

Independent, evidence-based review is requested for the frozen Trial 2
technical range ending at
`b2892b4818677e3f3d02d134a2caa686c99252da`.

This request addresses only the three P1 findings in the replacement Trial 1
result. It is a request only: it contains no automatic verdict, integration,
promotion, release, or full-`G/0/02` completion claim.

## Trial 2 corrections

### Explicit, fenced blocked-quarantine recovery

- `quarantine_blocked` remains fail-closed for an ordinary delivery, the same
  runner, and a replacement consumer without explicit recovery configuration.
  The runner still returns degraded after the finite vault-attempt cap, without
  ACK or another receive.
- A trusted composition may set one bounded, operator-controlled
  `quarantineRecoveryId` on a replacement consumer incarnation.
- The repository exposes an explicit `claimBlockedQuarantine` CAS transition.
  Each recovery ID is accepted at most once for a receipt and returns a newly
  replaced claim token. A different recovery ID can replace it only after its
  lease expires.
- The blocked receipt preserves the already-known poison reason. Recovery
  resumes only quarantine `put`, receipt commit, and ACK; it never re-enters
  the poison handler.
- A failed recovery returns to `quarantine_blocked` without ACK. The same
  recovery ID cannot issue another vault attempt. A later operator attempt
  requires another recovery ID.
- Stale recovery tokens cannot commit quarantine after replacement, including
  when an owner ID is reused.

### Non-forgeable error projection

- Core-created errors are tracked by a module-private `WeakSet` brand.
  Constructing the exported `CoordinationConsumerError` class does not create
  that brand.
- Internal and external public codes use exact closed allowlists. Arbitrary
  `COORDINATION_CONSUMER_*`, `TOKEN_*`, and other dependency codes collapse to
  the operation-specific fallback.
- Every error crossing the public boundary is reconstructed with the fixed
  message `coordination consumer operation failed safely`; raw dependency
  messages are never preserved.
- The same projection is used for direct rejections, runner status, retry
  metadata, and replay failure receipts. Known coordination/network transport
  codes remain compatible with the existing receive/ACK contract.

### Non-authoritative asynchronous observations

- Audit and metric calls still catch synchronous throws.
- Returned promises and hostile thenables are assimilated into a fresh promise
  with an immediately attached rejection handler.
- Observation completion is never awaited, so it cannot delay or alter the
  business effect, receipt, ACK, runner result, or replay result.
- The directed test installs a process-level `unhandledRejection` counter,
  exercises both a rejected promise and a hostile rejecting thenable, flushes
  event-loop turns, and proves zero unhandled rejections with the effect,
  receipt, ACK, result, and counters unchanged.

## Preserved contracts

- Receipt/effect or quarantine commit still precedes transport ACK.
- Exact tombstone retry still accepts `ackedCount: 0` only for the bound
  delivery; unknown and cross-inbox deliveries still fail.
- A committed handler result still completes its receipt and ACK despite a
  concurrent abort.
- Processing, replay, and now blocked-quarantine recovery mutations are token
  fenced.
- Replay authorization, post-decision context validation, body-free
  projections, locator privacy, and non-duplicating effect convergence are
  unchanged.
- Handler/vault attempt caps, delay/lease/poll ceilings, busy delay, abort
  cleanup, fixed status shape, closed metadata, and the explicit in-memory
  non-durability descriptor are unchanged.

## TDD evidence

### RED

Commit:

- `66bdf7adccd36bf8196bff30ef845b5cf3f9efe3` —
  `test(consumer): reproduce G/0/02 trial 2 findings (RED)`

Command:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer.test.js
```

Expected RED result:

- **29 passed / 9 failed / 0 skipped**.
- Failures reproduced the missing recovery config and repository port, forged
  exported-class message/code leakage, forged replay code and body-derived
  message leakage, unhandled asynchronous observation rejection, and the
  formerly open consumer namespace at the fault boundary.
- The existing runner test remained green while proving one receive, no ACK,
  and no automatic poison loop after vault exhaustion.
- The command exited as a controlled failed test run; the process-level
  listener was registered only inside the directed test and has cleanup
  registered with the test context.

### GREEN

Technical correction commit:

- `b2892b4818677e3f3d02d134a2caa686c99252da` —
  `fix(consumer): close G/0/02 trial 2 findings`

The same directed command passed:

- **38 passed / 0 failed / 0 skipped**.

The five Trial 2 cases add:

- repaired-vault recovery through a replacement consumer sharing the same
  repository, plus unauthorized-restart and same-incarnation pause evidence;
- one-shot recovery IDs and stale recovery-token fencing;
- exported-class and consumer-namespace forgery rejection;
- promise/hostile-thenable rejection containment with a process unhandled
  counter; and
- replay-handler code/message/body leak containment.

## Directed regression verification

Explicit consumer plus unchanged direct-service receive/ACK contracts:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_service_receive.test.js \
  tests/gateway/coordination_service_ack.test.js
```

- **55 passed / 0 failed / 0 skipped**.

Directed ESLint:

```text
/tmp/agents-orchestrator-v5-wave2-integration/gateway/node_modules/.bin/eslint \
  --config \
  /tmp/agents-orchestrator-v5-wave2-integration/gateway/eslint.config.js \
  gateway/src/core/coordination_consumer.js \
  gateway/src/core/repositories/coordination_consumer_repo.js \
  tests/gateway/coordination_consumer.test.js
```

- passed with the repository lock-matched ESLint **10.8.0** binary;
- no npm command or dependency installation was run.

Explicit structure checks:

```text
/tmp/agents-orchestrator-v5-wave2-integration/.venv/bin/python \
  -m pytest -q \
  tests/structure/test_project_layout.py \
  tests/structure/test_v5_coordination_docs.py
```

- **11 passed** with Python **3.13.13** and pytest **9.1.1**.

Diff and leak checks:

- `git diff --check
  f68edf0e2146254f5a70b765a73bc68c974e5473..b2892b4818677e3f3d02d134a2caa686c99252da`
  — passed.
- `gitleaks detect --redact --no-banner
  --log-opts=f68edf0e2146254f5a70b765a73bc68c974e5473..b2892b4818677e3f3d02d134a2caa686c99252da`
  — scanned both Trial 2 commits; no leaks found.

Runtime identity:

- Node **22.22.1**.

## Frozen identity and scope

- Exact Trial 2 base:
  `f68edf0e2146254f5a70b765a73bc68c974e5473`
- Base tree:
  `16d6a3115e9455780401283f21dc9766f05497fd`
- RED commit:
  `66bdf7adccd36bf8196bff30ef845b5cf3f9efe3`
- RED tree:
  `4d387d16620761d90b7c6da3fcdce6bb38c60eda`
- Technical commit:
  `b2892b4818677e3f3d02d134a2caa686c99252da`
- Technical tree:
  `329456df832c572b5d51a3fdf5b8aabb9fbad053`
- Trial 2 technical range:
  `f68edf0e2146254f5a70b765a73bc68c974e5473..b2892b4818677e3f3d02d134a2caa686c99252da`
- Range identity:
  **2 commits / 4 files / 554 insertions / 42 deletions**
- Branch:
  `feat/V5-G-0-02-consumer`
- Worktree:
  `/tmp/agents-orchestrator-v5-g002.MsiMXe/worktree`

The Trial 2 technical range changes exactly:

- `gateway/src/core/coordination_consumer.js`
- `gateway/src/core/repositories/coordination_consumer_repo.js`
- `tests/gateway/coordination_consumer.test.js`
- `docs/adr/ADR-V5-G-0-02-coordination-consumer-core.md`

It does not change the queue, services, Redis lifecycle/client, MCP/tools,
catalog/config/health, migrations, shared repositories, adapters/providers,
manifests, workflows, locks, indexes, plan sheets, `agents:events`, or legacy
`message.*`.

No Redis, network, MCP, KYA, provider, service, tmux, live-agent, aggregate npm
test, suite aggregation, full CI, shared-plan, migration, integration,
promotion, or release command was run.

## Remaining dependency-gated scope

This remains a standalone core. Production still requires the durable
repository/migration, atomic or durably idempotent effect composition, durable
body vault, service/lifecycle wiring, Redis crash/reclaim integration, and
health/inventory composition described by the ADR. Trial 2 does not claim
those dependencies or any full-sheet acceptance criterion.

## Review focus

- Reproduce vault exhaustion with one repository, confirm the same runner and
  an unauthorized restart remain paused, then repair the vault and confirm one
  authorized replacement stores, commits quarantine, and ACKs without handler
  re-entry.
- Replace a blocked recovery claim after lease expiry and confirm the stale
  token cannot commit.
- Throw an exported `CoordinationConsumerError` with a raw canary and forged
  `COORDINATION_CONSUMER_*` code from ACK and replay dependencies; confirm only
  static fallback projections cross result, status, audit, metrics, and
  receipt boundaries.
- Return both rejected promises and hostile thenables from audit/metrics;
  confirm no `unhandledRejection`, termination, wait, or domain-state change.
- Confirm the unchanged ACK tombstone, replay fencing/context, caps, metadata,
  locator, busy delay, abort-after-commit, and non-durability contracts.
- Confirm the submission remains a standalone correction and makes no Redis,
  service/health, full-sheet, integration, promotion, or release claim.

Independent review is requested. No automatic review or integration follows
from this file.
