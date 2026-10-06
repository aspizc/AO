# Independent Review Result — Project V5 G/0/02 ACK Core (Trial 5)

## Verdict

**reviewed_OK**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 0 |

Trial 5 closes all four Trial 4 evidence findings. The replacement tests
execute the shipped ACK Lua against disposable Redis 8.8.0 instances, observe
real Redis and repository effects, and turn red when each protected predicate
is removed. The missing lifecycle `execute()` and `close()` prototype attacks
are also present and mutation-sensitive.

This result approves only the reviewed Trial 5 evidence correction. It makes
no integration, promotion, release, production-readiness, durable-store, or
complete-`G/0/02` claim.

## Reviewed identity and range

- Review branch: `review/V5-G-0-02-ack-5`
- Request-only reviewed HEAD:
  `58a6a29ca45182587f5d5ae56f23eb0ab97a2e1f`
- Tests/harness commit:
  `960bca9af68f01906bcd9758f8b4b7810105fdd7`
- Operator-ratification base:
  `4cf4b5e11c070498c72ff9a86035f68f26a863ec`
- Technical candidate tree:
  `e9be7bfb1929dd7be372b4f7948eae2bbc4c0ce4`

I independently reproduced the advertised technical pathset:

```text
M tests/gateway/coordination_queue_ack.test.js
A tests/gateway/coordination_queue_ack_ephemeral_redis.test.js
A tests/gateway/helpers/ephemeral_redis.js
```

The candidate blobs match the request:

| Path | Blob |
|---|---|
| `tests/gateway/coordination_queue_ack.test.js` | `cb19b6ae0390d4e8c2d144ee6d1959627a224f91` |
| `tests/gateway/coordination_queue_ack_ephemeral_redis.test.js` | `cb0e72cd482ed6388f6b244693a0cf612ca5d259` |
| `tests/gateway/helpers/ephemeral_redis.js` | `9e3dbc35613dd50e1c801021e3ba4a0227eba4ce` |
| `gateway/src/core/coordination_queue.js` | `a1c5054849595b0637deb59be0cdbdff49aafa19` |
| `gateway/src/core/redis_client_lifecycle.js` | `6e5ceaa971dc5c89577bb3c5b7f3e33108f97dd4` |

Thus Trial 5 changes tests and their disposable-Redis helper only. The
accepted Trial 4 production source is unchanged.

## Independent baseline and isolation run

The requested binary resolved as:

```text
Redis server v=8.8.0 sha=46690297:0 malloc=jemalloc-5.3.0 bits=64
```

I ran the exact required suite:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_queue_ack_ephemeral_redis.test.js

tests 46
pass 46
fail 0
skipped 0
exit 0
```

Before the run, `pgrep -a redis-server` returned no process and there were no
`/tmp/ack-redis-*` directories. The same checks after the baseline and again
after all mutation runs returned no process or directory. The disposable
lifecycle mutation copy was also removed.

Static inspection agrees with the observed isolation:

- every real-Redis leaf calls `withEphemeralRedis()`;
- each call creates a new `/tmp/ack-redis-*` directory and `r.sock`;
- the child is started with `--port 0`, persistence disabled, and its private
  Unix socket;
- all clients are destroyed, the child is terminated and awaited, and the
  directory is recursively removed in `finally`; and
- neither the helper nor the real-Redis suite contains a `6379`,
  `127.0.0.1`, or shared-service connection.

The real-Redis test imports the production queue, command builders, reply
decoders, reconciler, and key builders. It contains no copied Lua, fake
client, or oracle-selected Redis reply. Direct ACK receives
`ACK_INBOX_SCRIPT` through `createRedisCoordinationQueue`; inspection and
orphan finalization receive the scripts returned by the two production
command builders.

## Per-family adjudication

### Lifecycle and operation authority — closed

The corrected suite attacks all three public prototype routes. I first ran
the focused final-candidate family:

```text
tests 5
pass 5
fail 0
skipped 0
exit 0
```

I then made three independent source mutations in a disposable `/tmp` copy,
restoring prototype dispatch one route at a time:

| Disposable mutation | Pass | Fail | Exit | Observed violation |
|---|---:|---:|---:|---|
| `snapshotRedisClientLane(...)` to `.snapshot()` | 3 | 2 | 1 | lane captured, `ECHO` executed, raw result `RAW_OK` returned |
| `executeRedisClientLane(...)` to `.execute()` | 2 | 3 | 1 | both command and blocking replacement methods captured their lanes |
| both `closeRedisClientLane(...)` calls to `.close()` | 3 | 2 | 1 | replacement close ran for both `command` and `blocking` lanes |

The final source retains its module-private `WeakMap` authorities and private
snapshot/execute/close closures. No lifecycle mutant survived.

### Exact tombstone value and positive TTL — closed

The 21 matrix leaves execute missing, positive, zero, expired, persistent,
wrong-type, and wrong-value states through each of direct ACK, inspection,
and orphan finalization. The tests use real keys and observe `XRANGE`,
`XPENDING` details and summary, tombstone `TYPE`/`GET`/`PTTL`, event-stream
length, and `commitTombstone`/`commitOrphan` calls. The deterministic zero
boundary queues `PTTL` and the shipped `EVAL` in one Redis transaction.

My runtime command-copy mutations produced:

| Removed predicate | Pass | Fail | Exit | Real observed break |
|---|---:|---:|---:|---|
| exact value in all three scripts | 19 | 6 | 1 | wrong value succeeded in direct ACK and reconciled in inspection and orphan paths |
| numeric `PTTL > 0` in all three scripts | 16 | 9 | 1 | zero and persistent states became accepted proof in all three paths |

The baseline accepts only exact string value `1` with positive TTL as an
existing tombstone. Expired keys follow Redis's real missing-key semantics,
as disclosed by the request. No tombstone mutant survived.

### Bounded canonical JSON parser — closed

The orphan finalizer receives real presence values of exactly 262144 bytes,
one byte over, an 18000-property work-exhaustion object, a string token over
131072 bytes, and excessive nesting. The exact-byte specimen passed; all four
over-limit specimens failed closed without stream, PEL, tombstone, event, or
proof-commit settlement.

I independently neutralized each shipped Lua guard in turn:

| Removed/neutralized predicate | Pass | Fail | Exit | Leaf that turned red |
|---|---:|---:|---:|---|
| JSON byte ceiling | 5 | 2 | 1 | over byte ceiling |
| shared work ceiling | 5 | 2 | 1 | wide flat work exhaustion |
| string-token ceiling | 5 | 2 | 1 | long string token |
| depth ceiling | 5 | 2 | 1 | excessive depth |

In each case the affected real-Redis result changed from
`recovery_required` to reconciled. No bounded-parser mutant survived.

### Stored-envelope duplicate rejection — closed

The 14 hostile raw envelopes are inserted into the real stream and PEL:
one literal alias, escaped decoded aliases for all twelve canonical fields,
and nested object/array aliases. Each leaf executes both direct ACK and orphan
finalization and observes unchanged stream, PEL, tombstone, and event state
with no repository proof commit.

Neutralizing the per-object decoded-key rejection produced:

```text
tests 16
pass 1
fail 15
skipped 0
exit 1
```

All 14 hostile leaves failed plus their parent. Real direct ACK returned
`ackedCount: 1`, removed the stream/PEL row, created a tombstone, and appended
an event. Real orphan finalization reconciled, called `commitOrphan`, removed
the stream/PEL row, and created a tombstone. This is the real destructive
counterfactual missing from Trial 4. No duplicate-key mutant survived.

## Coverage honesty and preserved source

The four Trial 4 synthetic families and their source-fragment oracles are
absent from the final ACK test rather than skipped. Searches found no
`test.skip`, skip option, copied `redis.call` Lua, fake client, or old family
name in the real-Redis suite. The remaining supplementary test statically
checks the shared emitted parser contract; it does not replace the new
behavioral proof.

The lifecycle family now executes command-lane `ping()`, blocking-lane
`readInbox()`, queue `close()`, and lifecycle projection while each
corresponding prototype method is replaced. This covers the `execute()` and
`close()` cases named by the Trial 4 KO, not only `snapshot()`.

Static source review and the unchanged production blob identities confirm
that the Trial 4 corrections remain present: private lane authority, exact
tombstone value and positive-TTL guards, shared byte/work/string/depth
limits, per-object decoded duplicate-key rejection, and the preserved
fail-closed catch behavior.

## Gate result

The existing `gateway/node_modules` symlink resolves to the disclosed
integration provider. Candidate and provider package-lock hashes are both
`71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`;
their ESLint-config hashes are both
`31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`.

I ran the exact required gate:

```text
npm --prefix gateway run lint -- --no-cache

> agents-gateway@0.1.0 lint
> eslint --config eslint.config.js src tests scripts --no-cache

exit 0
```

`git diff --check` for the technical range also exited 0.

## Verification limits

I did not run the full `bash scripts/ci.sh`, the submitted combined 91-test
inventory, or the expanded injected-fake inventory. I did run the contract's
exact 46-test real-Redis suite, the focused five-test lifecycle baseline,
all ten independent lifecycle/Lua mutation runs described above, and the
exact lint gate.

I did not test Redis failover, crash/reclaim, partitions, external transport,
SQLite/PostgreSQL persistence, migration `003`, production recovery wiring,
service health, MCP/catalog integration, integration-branch compatibility,
promotion, release, or later `G/0/02` work. No shared Redis service, database,
network provider, MCP server, or tmux session was used or changed. Nothing
was pushed, integrated, promoted, or released.

## Review closure

Trial 5 replaces declared evidence with observed real-Lua effects and kills
every targeted counterfactual. The four Trial 4 P1 findings are independently
closed for this frozen candidate, so the result is `reviewed_OK`.
