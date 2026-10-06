# Review Submission — Project V5 G/0/02 CORE (Trial 3)

## Review requested

Independent, evidence-based review is requested for the frozen Trial 3
technical range ending at
`6fccc83f036eadb97474394ea82bac155722f677`.

This request addresses only the single Trial 2 P1 finding. It is a request
only: it contains no automatic verdict, result, integration, promotion,
release, or full-`G/0/02` completion claim.

## Trial 3 correction

### Receipt-lifetime one-shot recovery IDs

- The initial receipt claim now fixes
  `maxConsumedRecoveryIdsPerReceipt`. The core default is four and the closed
  core/repository contract rejects zero or values above eight.
- The in-memory conformance repository retains every consumed recovery ID in a
  receipt-private array. Its maximum length is fixed when the receipt is
  created; a later replacement configured with a larger value cannot expand
  it.
- `claimBlockedQuarantine` checks receipt-lifetime membership and capacity
  before the active-lease branch. A duplicate concurrent call with the winning
  ID is therefore `blocked`, not a second claim or an ambiguous fresh-ID
  `busy`.
- For an eligible fresh ID, history append and monotonically replaced
  `claimToken` creation occur in the same synchronous in-memory CAS
  transition. A conforming durable adapter must make membership, capacity,
  append, and token replacement one durable atomic transition.
- `blockQuarantine` preserves the consumed history. Failed recoveries A, then
  B, therefore leave both A and B permanently denied for the lifetime of the
  receipt; fresh C remains valid while capacity exists.
- Once the fixed capacity is exhausted, every fresh recovery ID fails closed
  as `blocked`. No ID is evicted and there is no unbounded set or list.

### Denied-path behavior

- A denied duplicate or capacity-exhausted recovery returns the existing
  paused result and degraded status.
- It does not enter the business handler or quarantine store, does not ACK,
  and causes the runner to return after its one receive rather than reclaim or
  hot-loop the poison delivery.
- Stale A/B claim tokens still cannot commit quarantine or return the receipt
  to blocked after fresh C has claimed it.
- An explicitly authorized fresh recovery below the cap still resumes only
  quarantine storage, receipt commit, and ACK without handler re-entry.

## Preserved Trial 1 and Trial 2 contracts

- Receipt effect/quarantine commit still precedes transport ACK.
- Exact tombstone retry still accepts `ackedCount: 0` only for the bound
  delivery; unknown and cross-inbox deliveries still fail.
- A committed handler result still completes its receipt and ACK despite a
  concurrent abort.
- Processing, replay, and blocked-quarantine recovery mutations remain
  token-fenced, including reused owner IDs.
- Ordinary calls, the original incarnation, and a replacement without an
  explicit recovery ID remain paused after vault exhaustion.
- Replay authorization, post-decision context validation, body-free
  projections, private locator handling, and one-effect convergence are
  unchanged.
- The module-private error brand, closed public error namespaces, static safe
  messages, and dependency-forgery rejection are unchanged.
- Synchronous observation throws, rejected promises, and hostile thenables
  remain non-authoritative and cannot create an unhandled rejection.
- Handler/vault attempt caps, delay/lease/poll ceilings, busy delay, abort
  cleanup, fixed status shape, closed metadata, and the explicit in-memory
  non-durability descriptor remain unchanged.

## TDD evidence

### RED

Commit:

- `d01d1b253b3745b79ebc4eec7694628bcc4f2465` —
  `test(consumer): reproduce G/0/02 trial 3 recovery reuse (RED)`
- Tree: `f55fa34d434ddc7dc1c8911ba6497e89f6cead9d`
- Direct parent:
  `a85233a8f8b5dc614bad709f1115d6e6b8e43e02`

Command:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer.test.js
```

Expected RED result:

- **35 passed / 5 failed / 0 skipped**.
- The failures showed the missing bounded contract property, rejection of the
  new valid core config, A becoming `claimed` after failed A → B → A, a
  concurrent duplicate returning `busy` instead of `blocked`, and fresh C
  becoming `claimed` after a two-entry receipt limit.
- The RED commit changes only
  `tests/gateway/coordination_consumer.test.js`.

### GREEN

Technical correction commit:

- `6fccc83f036eadb97474394ea82bac155722f677` —
  `fix(consumer): retain bounded recovery history`
- Tree: `7222821dd081a9fdbc2b92aa8eceeb58eea20dc1`

The same directed command passed:

- **40 passed / 0 failed / 0 skipped**.

The Trial 3 cases prove:

- failed A → B → A and B reuse denial, while fresh C can claim;
- stale A/B tokens cannot commit or block after C claims;
- one winner and one denied result for concurrent duplicate IDs;
- a receipt-fixed two-entry limit that a later eight-entry config cannot
  enlarge; and
- capacity denial with exactly one receive and zero handler, quarantine-store,
  ACK, or receive-loop activity.

## Directed regression verification

Explicit consumer plus unchanged direct-service receive/ACK contracts:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_service_receive.test.js \
  tests/gateway/coordination_service_ack.test.js
```

- **57 passed / 0 failed / 0 skipped**.

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

- **11 passed** with Python **3.13.13**.

Diff and leak checks:

- `git diff --check
  a85233a8f8b5dc614bad709f1115d6e6b8e43e02..6fccc83f036eadb97474394ea82bac155722f677`
  — passed.
- `gitleaks detect --redact --no-banner
  --log-opts=a85233a8f8b5dc614bad709f1115d6e6b8e43e02..6fccc83f036eadb97474394ea82bac155722f677`
  — scanned both Trial 3 commits; no leaks found.

Runtime identity:

- Node **22.22.1**.

## Frozen identity and scope

- Exact Trial 3 base:
  `a85233a8f8b5dc614bad709f1115d6e6b8e43e02`
- Base tree:
  `48b80cb4e46e98c5be9877b1c15324d098884475`
- RED commit:
  `d01d1b253b3745b79ebc4eec7694628bcc4f2465`
- RED tree:
  `f55fa34d434ddc7dc1c8911ba6497e89f6cead9d`
- Technical commit:
  `6fccc83f036eadb97474394ea82bac155722f677`
- Technical tree:
  `7222821dd081a9fdbc2b92aa8eceeb58eea20dc1`
- Trial 3 technical range:
  `a85233a8f8b5dc614bad709f1115d6e6b8e43e02..6fccc83f036eadb97474394ea82bac155722f677`
- Range identity:
  **2 commits / 4 files / 283 insertions / 65 deletions**
- Branch:
  `feat/V5-G-0-02-consumer`
- Worktree:
  `/tmp/agents-orchestrator-v5-g002.MsiMXe/worktree`

The Trial 3 technical range changes exactly:

- `docs/adr/ADR-V5-G-0-02-coordination-consumer-core.md`
- `gateway/src/core/coordination_consumer.js`
- `gateway/src/core/repositories/coordination_consumer_repo.js`
- `tests/gateway/coordination_consumer.test.js`

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
health/inventory composition described by the ADR. Trial 3 does not claim
those dependencies or any full-sheet acceptance criterion.

## Review focus

- Reproduce failed A → B → A, then confirm A and B remain denied while fresh C
  claims and stale A/B tokens can neither commit nor block.
- Race the same recovery ID and confirm one claim plus one receipt-history
  denial, with no second token.
- Exhaust a receipt fixed at two IDs, retry through a consumer configured for
  eight, and confirm one receive with no handler, store, ACK, or loop.
- Confirm the history and its IDs remain private and bounded, and that no
  return to `quarantine_blocked` clears them.
- Confirm an authorized fresh recovery below the cap and all unchanged Trial 1
  and Trial 2 contracts remain green.
- Confirm this is a standalone correction with no Redis, service/health,
  full-sheet, integration, promotion, or release claim.

Independent review is requested. No automatic review or integration follows
from this file.
