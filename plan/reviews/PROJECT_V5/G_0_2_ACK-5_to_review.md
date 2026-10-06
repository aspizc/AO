# Review Submission — Project V5 G/0/02 ACK Core (Trial 5)

## Review requested

A fresh, independent, evidence-based review is requested for the frozen Trial
5 implementation candidate ending at
`960bca9af68f01906bcd9758f8b4b7810105fdd7`.

Trial 5 is a tests-only correction to the Trial 4 evidence. It replaces the
synthetic Redis/Lua proof families rejected in
`G_0_2_ACK-4_result.md` with execution against disposable Redis 8.8.0
servers. It does not change the accepted Trial 4 production implementation.

This request is not a verdict and makes no automatic merge, integration,
promotion, release, production-readiness, durable-store, or complete
`G/0/02` claim.

## Trial 4 KO closure

### Per-test disposable Redis harness

`tests/gateway/helpers/ephemeral_redis.js` starts the operator-ratified binary:

```text
/home/carase/miniconda3/bin/redis-server
```

The observed version is:

```text
Redis server v=8.8.0 sha=46690297:0 malloc=jemalloc-5.3.0 bits=64
```

Each leaf test receives a new private server with:

- a `mkdtemp` directory under `/tmp/ack-redis-*`;
- one Unix socket at `<temp-directory>/r.sock`;
- `--port 0`;
- `--save ""`;
- `--appendonly no`; and
- `--daemonize no`.

The harness creates actual clients from the lock-identical gateway `redis`
package, tracks every client, closes or destroys them during cleanup, sends
`SIGTERM` to the child, falls back to `SIGKILL` only if required, waits for
exit, and removes the temporary directory. It never connects to TCP port
6379 or any shared Redis instance.

### Production scripts and actual Redis state

`tests/gateway/coordination_queue_ack_ephemeral_redis.test.js` imports the
production queue, command builders, reply decoders, reconciler, coordination
keys, and consumer keys. There is no copied Lua implementation in the test
or helper.

The fixtures create real streams, consumer groups, delivered pending entries,
presence values, and tombstones. Assertions read back:

- `XRANGE` stream rows;
- `XPENDING` summary and pending-entry details;
- tombstone `TYPE`, `GET`, and `PTTL`;
- coordination event-stream length; and
- reconciler repository calls to `commitTombstone` and `commitOrphan`.

The real suite has **46 tests** and no conditional baseline skip.

### Lifecycle prototype attacks execute behavior

The lifecycle family now replaces each public prototype method and executes
the affected production operation:

- `snapshot` replacement followed by lifecycle projection;
- `execute` replacement followed by command-lane queue work;
- `execute` replacement followed by blocking-lane receive work; and
- `close` replacement followed by queue close for both lanes.

It asserts that replacement methods receive no lane, capture no raw command,
and cannot return an injected raw result. The command path still returns the
real client result.

### Complete tombstone matrix through all three paths

Direct ACK, tombstone inspection, and orphan finalization each run:

- missing;
- positive;
- zero;
- expired;
- persistent;
- wrong type; and
- wrong value.

For a tombstone key that exists, only exact string value `1` with numeric
`PTTL > 0` is accepted as proof. Zero, persistent, wrong-type, and wrong-value
states fail closed with the stream, PEL, event stream, and proof commits
unchanged.

Redis physically removes an expired key and reports it as missing. Trial 5
does not claim that an already expired key remains distinguishable from
missing inside Lua:

- inspection reports absence and the reconciler requires recovery when there
  is no matching pending delivery;
- direct ACK may atomically settle the exact pending delivery and create a
  fresh positive tombstone; and
- orphan finalization may atomically settle the exact old PEL entry and
  create a fresh positive tombstone before `commitOrphan`.

The `PTTL == 0` boundary is observed deterministically by queuing `PTTL` and
the actual production `EVAL` in one Redis `MULTI`/`EXEC`. This avoids replacing
Redis semantics with a fabricated reply.

### Parser boundaries execute in Redis

The orphan finalizer runs the production parser against:

- an accepted value of exactly **262144 bytes**;
- a rejected value one byte over the ceiling;
- an 18000-property wide flat object that exhausts shared work;
- a string token over **131072 bytes**; and
- an object nested beyond the depth ceiling.

The exact-boundary specimen splits escaped padding across two strings so
neither string independently violates the string ceiling.

### Hostile envelopes execute through both settlement paths

Fourteen raw hostile envelopes are inserted into the actual stream and PEL:

- one literal top-level duplicate;
- escaped decoded-key aliases for all twelve canonical envelope fields; and
- duplicates reached through a nested body object and array.

Every specimen executes both direct ACK and orphan finalization before the
leaf asserts. Both paths leave the stream, PEL, tombstone, and event stream
unchanged, and the reconciler makes no proof commit.

## TDD and mutation evidence

The initial new test imported the not-yet-created disposable Redis helper and
failed RED with `ERR_MODULE_NOT_FOUND`:

- **0 passed / 1 failed / 0 skipped**.

After adding the harness and behavior tests, the unmodified production
implementation passed all **46 / 46** real-Redis tests.

Because Trial 5 corrects inadequate evidence around already-implemented
production behavior, targeted counterfactual mutations were then applied only
at test runtime. They were never written to the workspace or committed.
Production command builders first supplied the real Lua; the harness then
made one surgical mutation to that generated script before sending it to the
real Redis server.

### Lifecycle mutation kills

Lifecycle source mutations ran in a disposable isolated copy:

| Removed protection | Passed | Failed | Observed break |
| --- | ---: | ---: | --- |
| private snapshot authority | 3 | 2 | replacement captured the lane, executed `ECHO`, and returned `RAW_OK` |
| private execute authority | 2 | 3 | command and blocking replacement methods captured calls |
| private close authority | 3 | 2 | command and blocking replacement close methods ran |

The isolated copy was removed after the runs.

### Lua mutation kills

Each command below used the normal Node test runner with a
`--test-name-pattern=MUTANT:<name>` selector. The selector activates only the
named surgical mutation and the relevant real-Redis family.

| Mutation | Passed | Failed | Load-bearing observation |
| --- | ---: | ---: | --- |
| `tombstone-value` | 19 | 6 | wrong values became proof in direct, inspection, and orphan paths |
| `tombstone-ttl` | 16 | 9 | zero and persistent tombstones became proof in all three paths |
| `json-bytes` | 5 | 2 | the over-byte specimen was accepted |
| `json-work` | 5 | 2 | the wide-flat specimen was accepted |
| `json-string` | 5 | 2 | the overlong string was accepted |
| `json-depth` | 5 | 2 | the over-deep specimen was accepted |
| `json-duplicate` | 1 | 15 | every hostile envelope reached unsafe settlement |

The duplicate-guard mutation executed both settlement branches before
asserting. Direct ACK returned `ackedCount: 1`, removed the stream/PEL entry,
created the tombstone, and appended an event. Orphan finalization returned a
reconciled result, called `commitOrphan`, removed the stream/PEL entry, and
created the tombstone.

There were **zero surviving targeted mutations**.

## Frozen implementation candidate

- Trial 5 base/operator-ratification commit:
  `4cf4b5e11c070498c72ff9a86035f68f26a863ec`
- Tests/harness commit:
  `960bca9af68f01906bcd9758f8b4b7810105fdd7`
- Candidate tree:
  `e9be7bfb1929dd7be372b4f7948eae2bbc4c0ce4`
- Branch:
  `feat/V5-G-0-02-ack-4`
- Range:
  `4cf4b5e11c070498c72ff9a86035f68f26a863ec..960bca9af68f01906bcd9758f8b4b7810105fdd7`
- Range identity:
  **1 commit / 3 files / 1457 insertions / 582 deletions**

The range changes exactly:

- `tests/gateway/coordination_queue_ack.test.js`
- `tests/gateway/coordination_queue_ack_ephemeral_redis.test.js`
- `tests/gateway/helpers/ephemeral_redis.js`

Candidate blobs:

- `tests/gateway/coordination_queue_ack.test.js`:
  `cb19b6ae0390d4e8c2d144ee6d1959627a224f91`
- `tests/gateway/coordination_queue_ack_ephemeral_redis.test.js`:
  `cb0e72cd482ed6388f6b244693a0cf612ca5d259`
- `tests/gateway/helpers/ephemeral_redis.js`:
  `9e3dbc35613dd50e1c801021e3ba4a0227eba4ce`

The accepted production blobs are unchanged:

- `gateway/src/core/coordination_queue.js`:
  `a1c5054849595b0637deb59be0cdbdff49aafa19`
- `gateway/src/core/redis_client_lifecycle.js`:
  `6e5ceaa971dc5c89577bb3c5b7f3e33108f97dd4`

This request file is outside the frozen implementation range and must be
committed alone.

## Directed verification

Real Redis ACK inventory:

```text
node --test --test-concurrency=1 --test-reporter=spec \
  tests/gateway/coordination_queue_ack.test.js \
  tests/gateway/coordination_queue_ack_ephemeral_redis.test.js
```

- **91 passed / 0 failed / 0 skipped**.

The real-Redis file alone contributes **46 passed / 0 failed / 0 skipped**;
the corrected supplementary/static file contributes **45 passed**.

Expanded injected-fake queue/consumer regression inventory:

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

- **163 passed / 0 failed / 0 skipped**.

Exact required lint:

```text
npm --prefix gateway run lint -- --no-cache
```

- exited **0**.

The temporary `gateway/node_modules` symlink used the lock/config-identical
integration provider. Identities:

- candidate/provider `gateway/package-lock.json` SHA-256:
  `71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`;
- candidate/provider `gateway/eslint.config.js` SHA-256:
  `31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`.

The exact npm command therefore used the candidate lint script and a
lock-identical dependency installation. The symlink was removed afterward.

Supplemental lint for the root-level tests/helper also exited **0**:

```text
gateway/node_modules/.bin/eslint \
  --config gateway/eslint.config.js \
  tests/gateway/coordination_queue_ack.test.js \
  tests/gateway/coordination_queue_ack_ephemeral_redis.test.js \
  tests/gateway/helpers/ephemeral_redis.js \
  --no-cache
```

Additional checks:

- `node --check` passed for all three changed JavaScript files.
- `git diff --check` passed.
- Runtime: Node **22.22.1**.
- `ps -C redis-server` found no surviving Redis process.
- `/tmp` contained no `ack-redis-*` or `ack5-lifecycle.*` directory.
- The implementation commit left a clean worktree before this request file.

## Threat model

The executable evidence covers:

- replacement of public lane snapshot, execute, and close methods attempting
  to recover raw Redis authority;
- direct, inspection, and orphan tombstone proof paths across the full
  missing/positive/zero/expired/persistent/wrong-type/wrong-value matrix;
- untrusted raw JSON at exact and over-byte boundaries, with excessive shared
  work, string length, or nesting;
- literal, escaped, and recursively nested duplicate keys in stored
  envelopes;
- invalid input attempting to reach `XACK`, `XDEL`, tombstone creation, event
  append, `commitTombstone`, or `commitOrphan`; and
- harness leakage into shared TCP Redis or surviving processes/directories.

The trust boundaries remain:

- Redis values are untrusted input;
- production command builders, decoders, queue operations, and reconciler are
  the subjects under test;
- ordinary queue possession grants only fixed queue operations; and
- repository proof commits remain claim-family fenced.

## Explicit limits and non-claims

Trial 5 does not add or claim:

- a production-source correction beyond the already accepted Trial 4
  candidate;
- crash/reclaim, failover, network-partition, or external transport evidence;
- migration `003`, SQLite, PostgreSQL, durable ACK-intent persistence, or
  business-effect atomicity;
- production recovery-client composition, service wiring, startup/shutdown,
  health, inventory, tool, MCP, or catalog surfaces;
- aggregate/full CI, integration-branch compatibility, promotion, release, or
  full-sheet acceptance; or
- completion of later `G/0/02` STORE, wiring, live-race, or service work.

No shared Redis, migration, MCP, KYA, provider network, external network,
SQLite, PostgreSQL, service restart, integration, promotion, push, or release
command was run.

## Review focus

- Verify the frozen range, exact three-file pathset, blobs, and absence of
  production-source changes.
- Re-run the 91-test real Redis inventory with Redis 8.8.0.
- Confirm every leaf owns a private Unix-socket Redis process and teardown is
  complete.
- Confirm the tests execute production-generated Lua and inspect actual
  stream, PEL, tombstone, event, and repository-commit outcomes.
- Confirm the expired-key observation is described according to actual Redis
  normalization rather than as a distinguishable `PTTL -2` stored value.
- Reproduce every lifecycle and Lua mutation kill and confirm both duplicate
  settlement paths execute before assertion.
- Re-run the 163-test regression inventory and exact npm lint gate.
- Confirm the candidate makes no durable-store, wiring, integration,
  promotion, release, or full-`G/0/02` claim.

Write the independent verdict and evidence to
`plan/reviews/PROJECT_V5/G_0_2_ACK-5_result.md`. Do not modify the frozen
implementation range. No automatic integration follows from this request.
