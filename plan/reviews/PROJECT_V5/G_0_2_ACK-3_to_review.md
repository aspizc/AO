# Review Submission — Project V5 G/0/02 ACK Core (Trial 3)

## Review requested

A fresh, independent, evidence-based review is requested for the frozen
Trial 3 technical range ending at
`69baf8301724df203b58e7d16decc6dd4e7a1b87`.

Use a fresh **GPT-5.6 Sol** reviewer with **ultra** reasoning on the
**Priority/Fast** service tier. The reviewer must inspect and test the frozen
range independently rather than inherit the implementer's conclusions.

This is a request-only artifact. It contains no automatic verdict, result,
merge, integration, promotion, release, production-readiness, durable-store,
or full-`G/0/02` completion claim.

## Trial 2 KO closure

Trial 3 starts from the Trial 2 KO result commit
`11f3d4a0e285ca72cd3865faae8d935c9b39502a` and directs RED gates at the two
remaining P1 findings plus the settlement-family amendment.

### An ordinary queue no longer grants Redis recovery execution authority

- `RedisCoordinationQueue` instance state is stored in the module-private
  `redisCoordinationQueueStates` `WeakMap`.
- A queue instance has no own data field for `redisUrl`, `clientFactory`,
  command or blocking lanes, a Redis client, or a callback-style executor.
- Command and blocking lane state is reachable only from module-private
  closures. Public `describe()` and `lifecycle()` methods return closed,
  frozen projections rather than the underlying lanes.
- The public queue methods remain fixed operations. A caller cannot supply an
  arbitrary callback or raw Redis command through a managed-client lane.
- The two recovery builders and two decoders remain pure protocol functions.
  They grant no transport, client, repository, or execution capability.

The relevant authority boundary is operational, not lexical: possessing a
pure command value is not equivalent to possessing a Redis client that can
execute it.

### Claim tokens are domain-separated by settlement family

- The repository defines fixed `direct` and `reconciliation` claim families.
- The claim family participates in the claim-token hash and in the private
  claimed-intent state.
- Fixed producer facets choose the family; callers cannot pass a family or
  proof string through the public operation.
- Direct commit and direct defer require a direct claim. Tombstone/orphan
  commit, reconciliation defer/renew, and recovery-required settlement
  require a reconciliation claim.
- A same-owner, same-token cross-family attempt is rejected before any state,
  epoch, proof, reason, due-time, or token mutation.

This prevents a direct consumer claim from settling tombstone/orphan proof
and prevents a reconciliation claim from settling direct ACK proof.

### Only exact, leased, unambiguous presence can defer orphan recovery

- The orphan-finalization Lua command lexes the raw presence JSON before
  trusting `cjson.decode`.
- Every JSON object visited recursively gets an independent decoded-key
  `seen_keys` set. Escaped aliases such as a literal key and its `\uXXXX`
  spelling therefore cannot collapse into a last-wins object unnoticed.
- The root object has its own independent decoded-key set. Duplicate values
  are rejected for every canonical top-level field, not only
  `capabilities` or `metadata`.
- Recursive scanning descends through arrays and objects, including objects
  nested inside `metadata`.
- Raw `capabilities` must be an array token and raw `metadata` must be an
  object token; decoded empty tables cannot erase that distinction.
- The presence key must have a numeric `PTTL` strictly greater than zero.
  Persistent, expired, and non-positive leases are corrupt/unknown state,
  not evidence of a live old participant.
- Deterministic ambiguity returns the transport-unknown reply, which the
  reconciler settles once as
  `TRANSPORT_STATE_UNKNOWN`/`recovery_required`. A complete canonical
  positively leased presence remains the only live-presence defer case.

## TDD evidence

### RED 1 — Trial 3 authority and leased-presence gates

- Commit:
  `dd9719d72f917539c45b61e3c5dcbee90b082dd6`
- Subject:
  `test(consumer): bind ACK trial 3 authority RED`
- Tree:
  `7f2667d245220cf8c329da8f3b29a92e115cf490`
- Direct parent:
  `11f3d4a0e285ca72cd3865faae8d935c9b39502a`
- Changed paths:
  - `tests/gateway/coordination_ack_reconciliation.test.js`
  - `tests/gateway/coordination_queue_ack.test.js`
- Diff:
  **501 insertions / 0 deletions**.

The exact RED tree was replayed in a detached worktree with:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='ordinary queue graph|ordinary queue constrained|orphan finalizer parses|presence shape and lease corruption|ACK claim families' \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_queue_ack.test.js
```

Observed RED result:

- **0 passed / 5 failed / 0 skipped**;
- an ordinary queue graph reached the caller factory, URL, both lanes, and
  client authority and executed four recovery `EVAL` commands;
- queue lifecycle projections were not closed/frozen;
- corrupt presence shape or lease deferred instead of terminating;
- the finalizer lacked the raw JSON/container and positive-`PTTL` guards; and
- cross-family settlement committed and mutated repository state.

The detached worktree and temporary dependency link were removed.

### RED 2 — decoded duplicate-key corruption

- Commit in the frozen main lineage:
  `179ec3bb97c5bfc9fd38fcf05b98c1e783676c8e`
- Subject:
  `test(queue): reject recursive duplicate presence keys (RED)`
- Tree:
  `b0ccbe912de5419461414aa18244c3a39ef483e0`
- Direct parent:
  `dd9719d72f917539c45b61e3c5dcbee90b082dd6`
- Changed path:
  - `tests/gateway/coordination_queue_ack.test.js`
- Diff:
  **320 insertions / 3 deletions**.

RED 2 covers escaped duplicate decoded keys for all eleven canonical
top-level fields:

```text
protocolVersion
participantId
participantType
scopeId
displayName
capabilities
metadata
registeredAt
lastHeartbeatAt
leaseExpiresAt
leaseTokenHash
```

It also covers a duplicate directly inside `metadata` and a deeper duplicate
reached through a metadata object and array. The test-side raw JSON oracle
tracks decoded keys independently for every object and proves that ordinary
`JSON.parse` collapses the hostile source into an otherwise canonical value.

The authored scratch commit
`ffa7b8d9bcc1624ae56194c2b10db1f53ecf9bbf` has the same direct parent, tree,
subject, and file content as frozen-lineage commit `179ec3b`. Its exact
detached replay reported:

- **0 passed / 15 failed / 0 skipped**;
- eleven top-level leaf cases and two nested metadata leaf cases all produced
  `status=reconciled`, `deferred=1`, and `recoveryRequired=0` instead of the
  required terminal result; and
- the two parent test nodes failed because their leaf cases failed.

### RED 2 assertion-scope amendment

- Commit in the frozen main lineage:
  `72665771d09a77c41b55ee5a8ab4e8fec334ad95`
- Subject:
  `test(queue): scope recursive duplicate assertions (RED)`
- Tree:
  `532dcb6119aa94539d57fc1dff4a7baf9669563b`
- Direct parent:
  `179ec3bb97c5bfc9fd38fcf05b98c1e783676c8e`
- Changed path:
  - `tests/gateway/coordination_queue_ack.test.js`
- Diff:
  **36 insertions / 3 deletions**.

Before production source was edited for RED 2, the implementer found a formal
impossibility in the structural assertion: its global order required the
top-level scanner to appear before the first `seen_keys`, while its recursive
slice required that same first `seen_keys` inside the earlier recursive
scanner.

Work stopped before a source workaround was attempted. The test-only
amendment:

- keeps global ordering for scanner definitions and later use;
- verifies decoded-key tracking and recursive descent within the
  `skip_json_value` slice; and
- independently verifies decoded-key tracking and value descent within the
  top-level scanner slice.

The authored scratch amendment
`debd6c67781c0188f451a87653cb36bbe4078f39` has the same tree and test content
as frozen-lineage commit `7266577`. Its exact detached replay reported:

- duplicate-key pattern: **0 passed / 15 failed** with thirteen concrete
  deferred outcomes;
- duplicate-key pattern plus the structural parser parent:
  **0 passed / 16 failed**; and
- isolated structural parent: **0 passed / 1 failed** because the baseline
  finalizer had no JSON lexer.

This amendment is disclosed separately because it corrects the RED
assertion's realizability; it is not production GREEN and does not relax the
duplicate-key objective.

### Technical GREEN

- Commit:
  `69baf8301724df203b58e7d16decc6dd4e7a1b87`
- Subject:
  `fix(consumer): close ACK trial 3 authority gaps`
- Tree:
  `c06ccca852a8d8bc748d728bb29832d791f0184d`
- Direct parent:
  `72665771d09a77c41b55ee5a8ab4e8fec334ad95`
- Changed paths:
  - `gateway/src/core/coordination_consumer.js`
  - `gateway/src/core/coordination_queue.js`
  - `gateway/src/core/repositories/coordination_consumer_repo.js`
- Diff:
  **428 insertions / 98 deletions**.

The technical commit changes no test or review file. The approved RED
amendment and technical GREEN test blobs are byte-identical:

- `tests/gateway/coordination_ack_reconciliation.test.js`:
  `929108cf700c8734e798d3ccffe240519841b160`
- `tests/gateway/coordination_queue_ack.test.js`:
  `dbadc462c187abd6e6a3b6cf06f0208724f4690a`

Final changed source blobs are:

- `gateway/src/core/coordination_consumer.js`:
  `3c4f4d3e0e1a41a532666e5b410b40fd42af65b8`
- `gateway/src/core/coordination_queue.js`:
  `3fc47542fc52679aaf9962d8fc140e942321db8a`
- `gateway/src/core/repositories/coordination_consumer_repo.js`:
  `47e3b48a6a28100dd43dbb979a4a3d1ef0295f12`

### Static-lint hygiene included in GREEN

The first full Gateway lint was independently reproduced as RED because the
pre-existing ACK branch had an unused `catch (error)` binding in
`coordination_consumer.js`. The same baseline defect existed in the
integration checkout.

With explicit gate authorization, Trial 3 changes only that identifier to
`catch (_error)`. It changes no control flow, error classification, retry,
state, or settlement behavior. This one-line hygiene change is intentionally
reported separately from the queue and repository security behavior, even
though it is part of the source-only technical commit.

## Directed verification

Recursive/raw-presence structural and behavioral checks:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='orphan finalizer parses exact JSON container tokens|duplicate JSON object keys' \
  tests/gateway/coordination_queue_ack.test.js
```

- **16 passed / 0 failed / 0 skipped**.

Combined Trial 3 directed gate:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='ordinary queue graph|ordinary queue constrained|orphan finalizer parses|presence shape and lease corruption|ACK claim families|duplicate JSON object keys' \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_queue_ack.test.js
```

- **20 passed / 0 failed / 0 skipped**.

Reconciliation and ACK queue:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_queue_ack.test.js
```

- **57 passed / 0 failed / 0 skipped**.

Focal reconciliation, consumer, and ACK queue:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_queue_ack.test.js
```

- **98 passed / 0 failed / 0 skipped**.

Expanded injected-fake queue/consumer suite, including lifecycle:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_queue_ack.test.js \
  tests/gateway/coordination_queue_contract.test.js \
  tests/gateway/coordination_queue_lifecycle.test.js \
  tests/gateway/coordination_queue_presence.test.js \
  tests/gateway/coordination_queue_receive.test.js \
  tests/gateway/coordination_queue_send.test.js
```

- **156 passed / 0 failed / 0 skipped**.
- These tests use injected in-memory/fake clients. They do not prove behavior
  against a live Redis server.

Full Gateway lint:

```text
npm --prefix gateway run lint -- --no-cache
```

- passed with ESLint **10.8.0**;
- candidate and tool-provider `gateway/package-lock.json` SHA-256:
  `71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`;
- candidate and tool-provider `gateway/eslint.config.js` SHA-256:
  `31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`.

Additional checks:

- `node --check` passed for all three changed source files and both approved
  test files;
- `git diff --check` passed for the dirty pre-commit source and for
  `11f3d4a..7266577` before the technical commit;
- runtime: Node **22.22.1**; and
- the temporary lock-matched dependency link was removed.

The queue module's exact final export surface was inspected dynamically:

```text
CoordinationQueueError
RedisCoordinationQueue
buildCoordinationAckTombstoneInspectionCommand
buildCoordinationOrphanAckFinalizationCommand
coordinationKeys
createRedisCoordinationQueue
decodeCoordinationAckTombstoneInspectionReply
decodeCoordinationOrphanAckFinalizationReply
```

It exports no recovery runtime, client acquisition, lane, callback executor,
repository acquisition, or privileged recovery port.

## Frozen identity and scope

- Trial 2 KO/result base:
  `11f3d4a0e285ca72cd3865faae8d935c9b39502a`
- Base tree:
  `fe82f0b36ef194cef2dfaf65789954eba96413a2`
- Trial 3 RED 1:
  `dd9719d72f917539c45b61e3c5dcbee90b082dd6`
- Trial 3 RED 2:
  `179ec3bb97c5bfc9fd38fcf05b98c1e783676c8e`
- Trial 3 RED 2 assertion amendment:
  `72665771d09a77c41b55ee5a8ab4e8fec334ad95`
- Technical GREEN:
  `69baf8301724df203b58e7d16decc6dd4e7a1b87`
- Technical range:
  `11f3d4a0e285ca72cd3865faae8d935c9b39502a..69baf8301724df203b58e7d16decc6dd4e7a1b87`
- Range identity:
  **4 commits / 5 files / 1279 insertions / 98 deletions**
- Branch:
  `feat/V5-G-0-02-ack-core`
- Worktree:
  `/tmp/agents-orchestrator-v5-g002-ack-core.wrwx7a/worktree`

Parentage is exact and linear:

```text
11f3d4a0e285ca72cd3865faae8d935c9b39502a
  -> dd9719d72f917539c45b61e3c5dcbee90b082dd6
  -> 179ec3bb97c5bfc9fd38fcf05b98c1e783676c8e
  -> 72665771d09a77c41b55ee5a8ab4e8fec334ad95
  -> 69baf8301724df203b58e7d16decc6dd4e7a1b87
```

The frozen technical range changes exactly:

- `gateway/src/core/coordination_consumer.js`
- `gateway/src/core/coordination_queue.js`
- `gateway/src/core/repositories/coordination_consumer_repo.js`
- `tests/gateway/coordination_ack_reconciliation.test.js`
- `tests/gateway/coordination_queue_ack.test.js`

This request file is intentionally outside that frozen technical range and
must be committed alone.

## Threat model

The directed threat model covers:

- a caller holding an ordinary queue instance and using own-key,
  descriptor, prototype, method, and recursively reachable-data inspection
  to search for a client factory, URL, raw client, lane, or arbitrary
  executor;
- a caller attempting to turn safe lifecycle/description introspection into
  mutable or operational transport authority;
- a producer replaying a valid same-owner claim token across direct and
  reconciliation settlement families;
- raw Redis presence containing duplicate literal or escaped decoded keys
  that `cjson.decode` could otherwise collapse with last-wins semantics;
- duplicate keys inside nested metadata objects and objects reached through
  arrays;
- ambiguous empty-table decoding for array-versus-object fields;
- persistent, expired, or non-positive presence leases;
- deterministic corrupt state versus a genuine transient transport outage;
  and
- stale/repeated reconciliation reaching at most one terminal settlement.

The intended trust boundaries are:

- pure command builders are public data constructors, not transport
  capabilities;
- a caller that independently owns an unrestricted Redis client already has
  authority outside this queue abstraction;
- the module-private `WeakMap` and closures are trusted implementation state;
- Redis values are untrusted input; and
- repository callers are untrusted with respect to settlement family even
  when owner and token strings match.

## Explicit limits and non-claims

This candidate remains an isolated in-memory/fake-client conformance core. It
does not add or claim:

- live Redis or actual Redis Lua/cjson execution evidence;
- crash/reclaim, Redis failover, network partition, or external transport
  behavior;
- migration 003, SQLite, PostgreSQL, durable ACK-intent persistence, or
  business-effect atomicity;
- production recovery-client composition, dependency wiring, service
  startup/shutdown integration, health, inventory, tool, MCP, or catalog
  surfaces;
- integration-branch compatibility, aggregate CI, promotion, release, or
  full-sheet acceptance; or
- completion of later `G/0/02` STORE, wiring, live-race, or service tasks.

No live or shared Redis, socket, loopback server, external network, MCP, KYA,
tmux, SQLite, migration 003, PostgreSQL, service wiring, integration,
promotion, or release command was run.

The JavaScript fake tests inspect the generated Lua and model its closed reply
codes; they do not execute the Lua in Redis. The reviewer should therefore
inspect the Lua parser, key decoding, recursion/depth behavior, `PTTL` order,
and reply convergence directly and treat live Redis semantics as an explicit
unproven boundary.

## Review focus

- Verify exact parentage, trees, pathsets, range statistics, and test/source
  blob identities.
- Reproduce RED 1, RED 2, and the scoped RED 2 amendment from their frozen
  source trees; distinguish the assertion correction from GREEN.
- Confirm an ordinary queue/module holder cannot reach a raw Redis client,
  caller factory, URL, mutable lane, callback executor, or operational
  recovery method.
- Confirm safe queue description/lifecycle projections are exact and frozen
  and do not close over hidden authority.
- Confirm the recursive JSON scanner creates a fresh decoded-key set for
  every object, including root and objects nested through arrays, and rejects
  escaped aliases before decoded presence can cause a defer.
- Confirm container-kind and strictly positive `PTTL` checks occur before the
  live-presence return.
- Confirm claim family is present in token derivation and private claim state,
  every fixed operation requires the correct family, and cross-family
  rejection occurs before mutation.
- Confirm the `coordination_consumer.js` change is only the disclosed unused
  catch-binding rename.
- Re-run the 156-test injected-fake inventory and full Gateway lint while
  keeping live services, credentials, and shared state untouched.
- Confirm the candidate makes no live-Redis, migration, durable-store,
  dependency-wiring, integration, or release claim.

Write the independent verdict and evidence to
`plan/reviews/PROJECT_V5/G_0_2_ACK-3_result.md`. Do not modify the frozen
technical range. No automatic integration follows from this request.
