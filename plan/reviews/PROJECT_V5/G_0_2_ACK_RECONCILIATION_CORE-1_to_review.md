# Review Submission — Project V5 G/0/02 ACK_RECONCILIATION_CORE (Trial 1)

## Review requested

Independent, evidence-based review is requested for the frozen Trial 1
technical range ending at
`b95d492fe36ed3e00ca7bf73eae23a82ed8ae0bb`.

This is a request-only artifact. It contains no automatic verdict, result,
integration, promotion, release, production-readiness, or full-`G/0/02`
completion claim.

## Implemented core contract

### Private ACK intent and single settlement authority

- `prepareAck` materializes a private, body-free ACK intent before transport
  ACK.
- The in-memory conformance repository exposes a nested
  `ackReconciliation` port for bounded listing, claim, renewal, commit, defer,
  terminal `recovery_required`, and bounded summary.
- Claim generation is monotonic and token-fenced. A replacement claim rejects
  every stale renewal, commit, defer, and recovery transition.
- Only `DIRECT_ACK`, `ACK_TOMBSTONE`, and `ORPHAN_ACK` may complete an intent.
  Completion marks the observed delivery ACKed and the receipt completed in
  the same synchronous in-memory transition.
- `TRANSPORT_STATE_UNKNOWN` leaves the receipt effect-committed and its
  delivery acknowledging; it does not invent completion.
- The old public `commitAck` repository operation was removed. The ACK intent
  commit is the single in-core settlement authority.

The repository remains explicitly non-durable and non-atomic with the
business effect. This trial establishes only the conformance contract and
does not claim a production store.

### Bounded reconciler

- One call examines at most one configured page, with a hard maximum of 100,
  and returns only bounded counters plus the next cursor.
- Each due intent is token-claimed before transport inspection.
- An exact recipient tombstone closes with `ACK_TOMBSTONE`.
- If no tombstone exists, the reconciler renews its claim before invoking the
  atomic orphan finalizer.
- A live old presence defers; an exact orphan finalization closes with
  `ORPHAN_ACK`; corrupt, missing, or ambiguous transport state becomes
  `TRANSPORT_STATE_UNKNOWN`/`recovery_required`.
- Transport failures defer with closed reason codes.
- The post-finalizer fault seam proves that a process loss after finalization
  converges through the tombstone on a later claim.
- Dependency claim/renewal DTOs are exact and frozen internally. Public
  summaries are exact and deeply frozen. Hostile extra fields are rejected
  through a static safe error.

### Queue-internal recovery authority

- Tombstone inspection and orphan finalization are available only through the
  queue's frozen internal reconciliation port; the queue exposes no direct
  public methods for either operation.
- Recovery identity is exact and bound to consume key, scope, sender, old
  recipient, message, and delivery. Extra bodies, lease tokens, claim tokens,
  new-recipient rebinding, and consume-key mismatches are rejected before
  Redis.
- Orphan finalization issues one `EVAL`. It checks the old recipient's
  tombstone first, defers while the old presence exists, validates the exact
  PEL row and stored envelope, then performs `XACK`, `XDEL`, and the
  recipient-scoped tombstone in the same script.
- The internal operations return no body and emit no `agents:events` or
  legacy `message.*` event.

No service, wire, tool, MCP, catalog, health, or lifecycle surface was added.

## TDD evidence

### RED 1 — missing recovery contract

- Commit:
  `080117b3080bb660db65c4032b7b3c95ae80567c`
- Subject:
  `test(consumer): define durable ACK reconciliation (RED)`
- Tree:
  `e2dc1611afac5d29cbb0f1c09c12531371d46f84`
- Direct parent:
  `e2bf927628803c48f38698221a1ff54a8b4d8c58`
- Changed paths:
  - `tests/gateway/coordination_ack_reconciliation.test.js`
  - `tests/gateway/coordination_consumer.test.js`
  - `tests/gateway/coordination_queue_ack.test.js`

Command:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_queue_ack.test.js
```

Expected RED result:

- **46 passed / 8 failed / 0 skipped** across 54 tests.
- One failure was the missing reconciler module, two exposed the missing
  nested repository ACK-reconciliation authority, and five exposed the
  missing private queue inspection/finalization port and identity contract.

### RED 2 — closed dependency DTOs

- Commit:
  `5e49926d3c577518f7e3d4bb4cf0e5dcbadc4b68`
- Subject:
  `test(consumer): close ACK reconciliation DTOs (RED)`
- Tree:
  `cfe2d99ec3ae2fd90fc7fb4e48753fa41874634a`
- Direct parent:
  `080117b3080bb660db65c4032b7b3c95ae80567c`
- Changed path:
  `tests/gateway/coordination_ack_reconciliation.test.js`

The hardening RED was run against the then-current pre-GREEN source worktree
before any source was staged:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_reconciliation.test.js
```

Expected RED result:

- **4 passed / 4 failed / 0 skipped**.
- The four failures were the accepted hostile extra field on a busy claim,
  the accepted hostile extra field on a claimed result, the accepted hostile
  renewal field, and the mutable summary DTO.

### GREEN

- Commit:
  `b95d492fe36ed3e00ca7bf73eae23a82ed8ae0bb`
- Subject:
  `feat(consumer): add ACK reconciliation core`
- Tree:
  `f83be5672e061ccb2d28eff10566e84bc4ee4d7f`
- Direct parent:
  `5e49926d3c577518f7e3d4bb4cf0e5dcbadc4b68`
- Changed paths:
  - `gateway/src/core/coordination_ack_reconciler.js`
  - `gateway/src/core/coordination_consumer.js`
  - `gateway/src/core/coordination_queue.js`
  - `gateway/src/core/repositories/coordination_consumer_repo.js`

The final focal command passed:

- **61 passed / 0 failed / 0 skipped**.

The latest RED and GREEN test blobs are byte-identical:

- `tests/gateway/coordination_ack_reconciliation.test.js`:
  `a871ed3c308914e8de44cd145aea3f0e1289779e`
- `tests/gateway/coordination_consumer.test.js`:
  `c1cbab03b458a0f7a04cfa666dc7182c1c64d9d9`
- `tests/gateway/coordination_queue_ack.test.js`:
  `6dd558724dfe9b5a50e1f7375716cbe5c075eddc`

## Directed verification

Final focal verification:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_queue_ack.test.js
```

- **61 passed / 0 failed / 0 skipped**.

Expanded injected-fake consumer/queue verification:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_queue_ack.test.js \
  tests/gateway/coordination_queue_contract.test.js \
  tests/gateway/coordination_queue_presence.test.js \
  tests/gateway/coordination_queue_receive.test.js \
  tests/gateway/coordination_queue_send.test.js
```

- **106 passed / 0 failed / 0 skipped**.
- These final tests use injected in-memory/fake clients. They do not prove
  behavior against a live Redis server.

Lock-matched ESLint:

```text
/tmp/agents-orchestrator-v5-wave2-integration/gateway/node_modules/.bin/eslint \
  --config gateway/eslint.config.js \
  gateway/src/core/coordination_ack_reconciler.js \
  gateway/src/core/coordination_consumer.js \
  gateway/src/core/coordination_queue.js \
  gateway/src/core/repositories/coordination_consumer_repo.js \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_queue_ack.test.js
```

- passed with ESLint **10.8.0**;
- candidate and tool-provider `gateway/package-lock.json` SHA-256:
  `71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`;
- candidate and tool-provider ESLint configuration SHA-256:
  `31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`.

Additional checks:

- `node --check` passed for all four changed source modules.
- `git diff --check
  e2bf927628803c48f38698221a1ff54a8b4d8c58..b95d492fe36ed3e00ca7bf73eae23a82ed8ae0bb`
  passed.
- Runtime: Node **22.22.1**.

## Frozen identity and scope

- Exact base:
  `e2bf927628803c48f38698221a1ff54a8b4d8c58`
- Base tree:
  `596561505bfde7efd82f99fb62b5d9047f9863e9`
- RED 1:
  `080117b3080bb660db65c4032b7b3c95ae80567c`
- RED 2:
  `5e49926d3c577518f7e3d4bb4cf0e5dcbadc4b68`
- Technical GREEN:
  `b95d492fe36ed3e00ca7bf73eae23a82ed8ae0bb`
- Technical range:
  `e2bf927628803c48f38698221a1ff54a8b4d8c58..b95d492fe36ed3e00ca7bf73eae23a82ed8ae0bb`
- Range identity:
  **3 commits / 7 files / 2583 insertions / 13 deletions**
- Branch:
  `feat/V5-G-0-02-ack-core`
- Worktree:
  `/tmp/agents-orchestrator-v5-g002-ack-core.wrwx7a/worktree`

The technical range changes exactly:

- `gateway/src/core/coordination_ack_reconciler.js`
- `gateway/src/core/coordination_consumer.js`
- `gateway/src/core/coordination_queue.js`
- `gateway/src/core/repositories/coordination_consumer_repo.js`
- `tests/gateway/coordination_ack_reconciliation.test.js`
- `tests/gateway/coordination_consumer.test.js`
- `tests/gateway/coordination_queue_ack.test.js`

It does not change the SQLite store, migration 003, PostgreSQL, shared state,
services, wire composition, Redis lifecycle/client, MCP/tools,
catalog/config/health, manifests, workflows, locks, indexes, plan sheets,
`agents:events`, or legacy `message.*`.

No live Redis, shared Redis service, external network, MCP, KYA, agent spawn,
tmux, SQLite, migration, PostgreSQL, service/wire, aggregate npm, full CI,
integration, promotion, or release command was run.

One exploratory pre-final unit inventory included
`tests/gateway/coordination_queue_lifecycle.test.js`. An existing test in that
file starts a process-local loopback RESP socket; it passed as part of a
115/115 run before the final DTO hardening. It was excluded from the final
evidence above. No external endpoint or Redis server was contacted. This is
disclosed separately because the task's no-network boundary is strict.

The temporary lock-matched `gateway/node_modules` symlink was used only while
running tests/lint, was never staged, and was removed before the technical
commit and this request.

## Explicit dependency-gated debt

The SQLite ACK-intent store and migration 003 remain blocked until
`G_0_2_STORE` receives an independent OK. The focused live Redis crash,
tombstone, expiry-race, and orphan-finalization lane is also still open and
must run only after that gate in an isolated disposable namespace.

Accordingly this trial claims none of the following:

- durable ACK-intent persistence;
- production/store conformance;
- SQLite migration correctness;
- real Redis Lua execution or crash/reclaim proof;
- service/lifecycle wiring;
- health/inventory composition; or
- full-sheet acceptance.

## Review focus

- Reproduce both RED tranches and confirm the final test blobs were unchanged
  by the GREEN commit.
- Confirm transport ACK precedes only `DIRECT_ACK` commit and that a crash in
  the transport-to-commit window leaves an enumerable intent without replaying
  the business effect.
- Confirm every completion has exactly one closed proof and unknown state
  cannot complete a receipt.
- Confirm claim epoch/token fencing, renewal before orphan finalization,
  bounded cursor behavior, closed defer/recovery codes, and deeply frozen
  summaries.
- Inspect the finalizer for exact old-recipient PEL/envelope binding and one
  atomic `XACK`/`XDEL`/tombstone mutation with no event emission.
- Confirm no body, locator, private lease token, rebinding authority, raw
  dependency error, or hostile extra DTO field crosses the private boundary.
- Confirm the technical range is limited to the seven declared core/test
  paths and does not imply STORE, migration, wiring, or live-Redis completion.

Independent review is requested. No automatic result or integration follows
from this file.
