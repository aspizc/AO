# Review Submission — Project V5 G/0/02 ACK Reconciliation Core (Trial 2)

## Review requested

Independent, evidence-based review is requested for the frozen Trial 2
technical range ending at
`c68d1d654803caa7f1d12c6b2955379cdaaf726c`.

This is a request-only artifact. It contains no automatic verdict, result,
integration, promotion, release, production-readiness, durable-store, or
full-`G/0/02` completion claim.

## Trial 1 KO closure

Trial 2 starts from the Trial 1 KO result commit
`075c1edcbadbf09ca72e57ee047d50a99e181597` and directs a RED gate at every
Trial 1 finding.

### Validated values are consumed exactly once

- Page, intent, claim, renewal, status, and summary inputs are projected from
  own data properties into one-shot snapshots before validation.
- Accessor-backed dependency objects are rejected; a validated field is never
  reread to choose a branch, proof, counter, or public return value.
- Queue-reply decoding applies the same one-shot rule. Decoder failures are
  closed `TypeError` contract failures, not transient transport failures.
- The public reconciliation summary is an exact, deeply frozen projection of
  the validated snapshot.

This addresses Trial 1 P1-1, including the claim/status branch, committed
proof, queue reply, and summary time-of-check/time-of-use cases.

### Claim is a due-time CAS and stale results converge

- The repository repeats reconcilable-state and `dueAt <= now` checks under
  the same claim mutation authority.
- A future deferred intent returns the closed `not_due` status without
  changing state, reason, due time, epoch, or token generation.
- `not_due`, `committed`, and `recovery_required` results from a stale list
  are bounded no-ops in the reconciler.
- Two-reconciler commit races and list/defer races are exercised directly.

This addresses Trial 1 P1-2 without weakening claim-token fencing.

### Recovery protocol is pure and grants no transport authority

- `RedisCoordinationQueue` has no public or private recovery factory, recovery
  port, tombstone-inspection method, or orphan-finalization method.
- The module exports only four pure ACK protocol functions: two builders that
  validate a closed identity and return frozen Redis command values, and two
  decoders that validate replies.
- Those functions perform no I/O and acquire no client, repository, queue, or
  sender capability. A caller can execute a command only if it independently
  holds transport authority.
- The test-local harness owns its injected fake `sendCommand`; production
  exports do not execute the recovery protocol or compose a privileged
  runtime.

This closes the confused-deputy shape in Trial 1 P1-3. Production composition
of an independently held transport capability remains deliberately outside
this in-memory core trial.

### Corrupt state is terminal; genuine outage defers

- Tombstone inspection is typed: absent and exact string `1` are valid;
  wrong-type or any other stored value decodes as corrupt state.
- Orphan finalization recognizes a live old recipient only when every required
  canonical presence field, type, timestamp, hash, dense capability entry,
  and metadata object key is valid. Partial, malformed, and wrong-type state
  returns unknown.
- Deterministic corrupt state reaches
  `TRANSPORT_STATE_UNKNOWN`/`recovery_required`, including on repeated
  reconciliation; it cannot defer forever.
- A genuine injected transport `Error` still defers with the closed
  `TRANSPORT_UNAVAILABLE` reason and a bounded retry time.

This addresses Trial 1 P1-4 while preserving outage backoff.

### Producer-bound settlement authority

- The repository exposes fixed `directAck.commit`,
  `ackReconciliation.commitTombstone`, and
  `ackReconciliation.commitOrphan` operations.
- The consumer receives only the direct-ACK facet; it cannot choose or pass a
  proof string.
- The reconciler receives only the two recovery operations; it cannot assert
  `DIRECT_ACK` or pass a proof through the repository boundary.

This resolves the Trial 1 P2 authority question structurally rather than by
trusting caller-supplied proof values.

## TDD evidence

### Trial 2 RED 1 — reproduce the KO gates

- Commit:
  `8aad8ac4a604ed84056f38702cab1638bc34c725`
- Subject:
  `test(consumer): reproduce ACK reconciliation trial 2 gaps (RED)`
- Tree:
  `106207da34e4059c23de26ffef2712b7c304cd58`
- Direct parent:
  `075c1edcbadbf09ca72e57ee047d50a99e181597`
- Changed paths:
  - `tests/gateway/coordination_ack_reconciliation.test.js`
  - `tests/gateway/coordination_queue_ack.test.js`
- Diff:
  **375 insertions / 0 deletions**.

The directed pre-GREEN command was:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='validate-then-reread|unvalidated summary|future deferred|stale-list|proof authority|ordinary queue|trusted composition|wrong-type tombstones|complete canonical|accessor-backed queue' \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_queue_ack.test.js
```

Observed RED result:

- **0 passed / 12 failed / 0 skipped** across 12 selected tests.

The initial hidden-runtime test encoded a composition mechanism rather than
the actual authority invariant. It was not edited in place or carried as
GREEN evidence: the next test-only commit objectively corrects that test
design, and RED 3 isolates the final pure-protocol contract.

### Trial 2 RED 2 — preserve the corrected authority objective

- Commit:
  `de3f8e4e86c73029502421a190c662677944fd33`
- Subject:
  `test(consumer): preserve ACK trial 2 authority RED`
- Tree:
  `b2e62e59dd6b977f5392b4152087d5a60eb10055`
- Direct parent:
  `8aad8ac4a604ed84056f38702cab1638bc34c725`
- Changed paths:
  - `tests/gateway/coordination_ack_reconciliation.test.js`
  - `tests/gateway/coordination_queue_ack.test.js`
- Diff:
  **859 insertions / 206 deletions**.

This test-only correction removes the caller-mintable runtime-factory
objective and preserves the actual invariant: an ordinary queue holder and
the public module namespace grant no operational recovery capability. It also
adds exact fixed settlement facets, hostile accessor projections, real
two-reconciler races, deterministic corrupt-state convergence, and complete
canonical-presence cases.

No standalone aggregate RED count is claimed for this semantic correction.
Its isolated missing pure-protocol failure was captured in the subsequent
RED 3 commit before source was committed.

### Trial 2 RED 3 — pure build/decode boundary

- Commit:
  `bc2576434b86fecec3d31703026db3421d0f08a0`
- Subject:
  `test(queue): require pure ACK recovery protocol RED`
- Tree:
  `8d9762b2c02fcb7776642efeb311b1f9d2dd30c2`
- Direct parent:
  `de3f8e4e86c73029502421a190c662677944fd33`
- Changed path:
  - `tests/gateway/coordination_queue_ack.test.js`
- Diff:
  **63 insertions / 56 deletions**.

The exact RED 3 tree was replayed in a detached worktree before the technical
commit:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='ACK recovery build and decode contracts are pure' \
  tests/gateway/coordination_queue_ack.test.js
```

Observed RED result:

- **0 passed / 1 failed / 0 skipped**;
- the contract expected the pure builder export to be a function and observed
  `undefined`.

The detached worktree and its temporary dependency link were removed after
the replay.

### Technical GREEN

- Commit:
  `c68d1d654803caa7f1d12c6b2955379cdaaf726c`
- Subject:
  `fix(consumer): close ACK reconciliation authority gaps`
- Tree:
  `5c284b18c43410155036ca1989dfe6fe08784bd0`
- Direct parent:
  `bc2576434b86fecec3d31703026db3421d0f08a0`
- Changed paths:
  - `gateway/src/core/coordination_ack_reconciler.js`
  - `gateway/src/core/coordination_consumer.js`
  - `gateway/src/core/coordination_queue.js`
  - `gateway/src/core/repositories/coordination_consumer_repo.js`
- Diff:
  **572 insertions / 165 deletions**.

The GREEN commit changes no test or documentation file. The RED 3 and
technical GREEN test blobs are byte-identical:

- `tests/gateway/coordination_ack_reconciliation.test.js`:
  `c7d4aec93918b101c0e3e901ab07e1f5737a2e30`
- `tests/gateway/coordination_queue_ack.test.js`:
  `ec65f024a172aff3e4be9f0b2375eb9c85f80404`

## Directed verification

Reconciliation and ACK queue suite:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_queue_ack.test.js
```

- **37 passed / 0 failed / 0 skipped**.

Focal reconciliation, consumer, and ACK queue suite:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_queue_ack.test.js
```

- **78 passed / 0 failed / 0 skipped**.

Expanded injected-fake consumer/queue suite:

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

- **123 passed / 0 failed / 0 skipped**.
- These tests use injected in-memory/fake clients. They do not prove behavior
  against a live Redis server.

Lock-matched ESLint:

```text
/tmp/agents-orchestrator-v5-wave2-integration/gateway/node_modules/.bin/eslint \
  --config gateway/eslint.config.js \
  gateway/src/core/coordination_ack_reconciler.js \
  gateway/src/core/coordination_consumer.js \
  gateway/src/core/coordination_queue.js \
  gateway/src/core/repositories/coordination_consumer_repo.js \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_queue_ack.test.js
```

- passed with ESLint **10.8.0**;
- candidate and tool-provider `gateway/package-lock.json` SHA-256:
  `71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`;
- candidate and tool-provider ESLint configuration SHA-256:
  `31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`.

Additional checks:

```text
node --check gateway/src/core/coordination_ack_reconciler.js
node --check gateway/src/core/coordination_consumer.js
node --check gateway/src/core/coordination_queue.js
node --check gateway/src/core/repositories/coordination_consumer_repo.js
git diff --check \
  075c1edcbadbf09ca72e57ee047d50a99e181597..c68d1d654803caa7f1d12c6b2955379cdaaf726c
```

- all four source syntax checks passed;
- range whitespace validation passed;
- runtime: Node **22.22.1**.

The queue module's exact final export surface was also inspected dynamically:

```text
node --input-type=module -e \
  'import("./gateway/src/core/coordination_queue.js").then((m) => console.log(Object.keys(m).sort().join("\n")))'
```

It contains exactly:

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

It does not export an ACK runtime, client acquisition, repository acquisition,
recovery port, or recovery executor.

## Frozen identity and scope

- Trial 1 KO/result base:
  `075c1edcbadbf09ca72e57ee047d50a99e181597`
- Base tree:
  `6036ccfc057c8459e78fcaf1e0551b092b45aa06`
- Trial 2 RED 1:
  `8aad8ac4a604ed84056f38702cab1638bc34c725`
- Trial 2 RED 2:
  `de3f8e4e86c73029502421a190c662677944fd33`
- Trial 2 RED 3:
  `bc2576434b86fecec3d31703026db3421d0f08a0`
- Technical GREEN:
  `c68d1d654803caa7f1d12c6b2955379cdaaf726c`
- Technical range:
  `075c1edcbadbf09ca72e57ee047d50a99e181597..c68d1d654803caa7f1d12c6b2955379cdaaf726c`
- Range identity:
  **4 commits / 6 files / 1715 insertions / 273 deletions**
- Branch:
  `feat/V5-G-0-02-ack-core`
- Worktree:
  `/tmp/agents-orchestrator-v5-g002-ack-core.wrwx7a/worktree`

Parentage is exact and linear:

```text
075c1edcbadbf09ca72e57ee047d50a99e181597
  -> 8aad8ac4a604ed84056f38702cab1638bc34c725
  -> de3f8e4e86c73029502421a190c662677944fd33
  -> bc2576434b86fecec3d31703026db3421d0f08a0
  -> c68d1d654803caa7f1d12c6b2955379cdaaf726c
```

The technical range changes exactly:

- `gateway/src/core/coordination_ack_reconciler.js`
- `gateway/src/core/coordination_consumer.js`
- `gateway/src/core/coordination_queue.js`
- `gateway/src/core/repositories/coordination_consumer_repo.js`
- `tests/gateway/coordination_ack_reconciliation.test.js`
- `tests/gateway/coordination_queue_ack.test.js`

This request file is intentionally outside that frozen technical range and
will be committed alone after the range is frozen.

## Threat model and explicit limits

The directed threat model covers:

- hostile getters, accessors, mutation, extra fields, and alternate allowed
  values across a validate/use boundary;
- stale-list races with defer, commit, and terminal recovery;
- proof forgery by a producer holding an overly broad repository operation;
- confused-deputy authority minted from an ordinary queue or public module;
- malformed, partial, wrong-type, or repeated deterministic transport state;
  and
- distinguishing a contract violation or corrupt state from a genuine
  transient transport outage.

The candidate remains an in-memory conformance core. It does not add or
claim:

- durable ACK-intent persistence or business-effect atomicity;
- SQLite, migration 003, PostgreSQL, or production-store conformance;
- production Redis client/runtime composition, service/wire/lifecycle
  wiring, health, inventory, tool, MCP, or catalog surfaces;
- real Redis Lua execution, crash/reclaim proof, or external transport
  behavior;
- aggregate npm, full CI, integration, promotion, release, or full-sheet
  acceptance.

No live Redis, shared Redis service, socket, loopback server, external
network, MCP, KYA, agent spawn, tmux, SQLite, migration, PostgreSQL,
service/wire, integration, promotion, or release command was run.

The temporary lock-matched `gateway/node_modules` symlink was used only for
isolated fake-only tests and lint. It was never staged and was removed before
the technical commit. No dependency directory, cache, temporary worktree,
result file, shared plan sheet, or unrelated artifact is included.

## Review focus

- Reproduce the three RED tranches and confirm RED 3 and GREEN test blobs are
  identical.
- Confirm every normalized dependency DTO is projected from own data fields
  once, then validated and consumed without rereading caller-controlled
  properties.
- Confirm claim repeats both state and due-time predicates under its CAS, and
  stale `not_due`, `committed`, and `recovery_required` outcomes are bounded
  no-ops.
- Confirm direct, tombstone, and orphan settlement proofs are structurally
  producer-bound by fixed narrow operations.
- Confirm an ordinary queue/module holder cannot acquire an operational
  recovery capability, and that the four public protocol functions are pure
  builders/decoders with no I/O or client/repository acquisition.
- Inspect both Lua commands and decoders for exact identity binding, typed
  tombstones, complete canonical presence, corrupt-state termination, and no
  body/token/proof authority crossing the boundary.
- Confirm genuine transport unavailability defers while decoder contract
  failures and deterministic corruption do not.
- Confirm the technical range is limited to the six declared core/test paths
  and makes no STORE, migration, wiring, live-Redis, or integration claim.

Independent review is requested. No automatic result or integration follows
from this file.
