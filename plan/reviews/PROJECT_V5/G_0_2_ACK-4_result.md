# Independent Review Result — Project V5 G/0/02 ACK Core (Trial 4)

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 4 |
| P2 | 0 |

The frozen source contains the intended Trial 4 authority, tombstone, bounded
parser, and stored-envelope corrections. The exact lint gate is also resolved
and green, all four historical RED families reproduce, the final candidate's
directed inventories pass, and the required injected-fake inventory passes
203/203.

The candidate nevertheless does not close the Trial 3 findings under the
review contract. Its new Redis-script cases do not execute the Lua or bind
their hostile raw fixtures to Redis-script execution; fake handlers infer the
desired reply from source fragments and then manufacture the modeled effects.
The lifecycle RED covers only `snapshot()`, not the other two virtual methods
that the production correction replaces. Four independent disposable
mutations therefore retain green lint and green relevant tests while removing
the protected behavior.

This is a result-only KO. It authorizes no integration, promotion, release, or
complete-`G/0/02` claim.

## Independent-review identity

- Review branch: `review/V5-G-0-02-ack-4`
- Trial 3 result/base:
  `2c8a5380ea38356364fe90668a166470e0b506eb`
- RED 1:
  `1449c72d544d7797afdc944459fac020df900b36`
- RED assertion amendment:
  `dc90375f02bfc7ff413ff68cc93d809fe509cff4`
- Source-only GREEN:
  `3b20dd62e7dbfd682801179d8f97cd3f7baba256`
- Final tests-only assertion-order correction:
  `c53f9c40fe3790a4ac501f8a0a8903a6b47d560f`
- Request-only reviewed HEAD:
  `ecd2c8a4f564c1aec6cf3784e2a86aa576767d21`
- Request tree:
  `371954e58c3c9bcd5255263b41452b010b2b8bf4`

Parentage is exact and linear:

```text
2c8a5380ea38356364fe90668a166470e0b506eb
  -> 1449c72d544d7797afdc944459fac020df900b36
  -> dc90375f02bfc7ff413ff68cc93d809fe509cff4
  -> 3b20dd62e7dbfd682801179d8f97cd3f7baba256
  -> c53f9c40fe3790a4ac501f8a0a8903a6b47d560f
  -> ecd2c8a4f564c1aec6cf3784e2a86aa576767d21
```

The advertised trees match:

| Commit | Tree |
|---|---|
| `1449c72` | `02de171008373ad0e01b51924324fce8298330fa` |
| `dc90375` | `8dd30c617a79b2e74b0a6eff9fd073e7f6afef0f` |
| `3b20dd6` | `a61500a061da30f02fbf4a836101cba185304116` |
| `c53f9c4` | `c1da37b21bc3361e5b9dbffe0c8974135590b279` |

The frozen technical range is exactly four commits, three files, 1,149
insertions, and 271 deletions:

```text
336  268  gateway/src/core/coordination_queue.js
39   0    gateway/src/core/redis_client_lifecycle.js
774  3    tests/gateway/coordination_queue_ack.test.js
```

Per-commit pathsets and statistics also match the request:

- `1449c72`: only the ACK test, `771/+`, `3/-`;
- `dc90375`: only the ACK test, `5/+`, `2/-`;
- `3b20dd6`: only the two source files, `375/+`, `268/-`; and
- `c53f9c4`: only the ACK test, `7/+`, `7/-`.

The source and test blob identities match:

| Path / revision | Blob |
|---|---|
| GREEN `coordination_queue.js` | `a1c5054849595b0637deb59be0cdbdff49aafa19` |
| GREEN `redis_client_lifecycle.js` | `6e5ceaa971dc5c89577bb3c5b7f3e33108f97dd4` |
| Pre-GREEN amended ACK test | `4b987ef088bfbadcf5dc62bb2e2695b24a1f84d2` |
| Final ACK test | `f4b240fce0d9184114173a7b0ed842f963478c23` |

The request commit changes only
`plan/reviews/PROJECT_V5/G_0_2_ACK-4_to_review.md` (`542/+`, `0/-`). Before
this result was created, the only worktree item outside HEAD was the disclosed
untracked `gateway/node_modules` symlink.

## P1 findings

### P1 — operation and close authority regressions are not covered by the lifecycle RED

The production correction is present. A module-private `WeakMap` holds frozen
closures over the private lane methods
(`gateway/src/core/redis_client_lifecycle.js:35,80-84,379-396`), and queue
lifecycle, close, and operation paths use the exported immutable ESM bindings
(`gateway/src/core/coordination_queue.js:2724-2740,3266-3275`). Static review
found no remaining queue dispatch through `RedisClientLane.prototype`.

The behavioral RED, however, replaces only
`RedisClientLane.prototype.snapshot` and calls `queue.lifecycle()`
(`tests/gateway/coordination_queue_ack.test.js:1473-1527`). It never replaces
`execute()` while exercising command and blocking operations, and it never
replaces `close()` while closing both lanes.

In an exact disposable copy of `c53f9c4`, I:

- changed `executeRedisClientLane(lane, operation)` back to
  `lane.execute(operation)`;
- changed both `closeRedisClientLane(...)` calls back to `.close()`; and
- removed the now-unused imports.

That mutation restores the attacker-replaceable dispatch that the source
correction is intended to prevent. The exact lint gate exited 0, and the exact
203-test injected-fake inventory still passed 203/203. Thus two of the three
authority predicates can be deleted without a test turning red.

Required next-trial correction:

- add behavioral prototype-replacement tests for command execution, blocking
  execution, and both close lanes;
- make each test capture and exercise a raw sentinel authority when run
  against its pre-correction base; and
- prove the final candidate captures no lane and invokes no replaced method.

### P1 — tombstone matrix outcomes are synthesized by the fake rather than executed

The source contains the intended exact-value and positive-TTL guards:

- direct ACK:
  `gateway/src/core/coordination_queue.js:1246-1254`;
- inspection:
  `gateway/src/core/coordination_queue.js:1362-1370`; and
- orphan finalization:
  `gateway/src/core/coordination_queue.js:1689-1699`.

The fixtures themselves distinguish the boundary states minimally. The test
oracle does not execute those states, though. `tombstoneAccepted()` decides
from the JavaScript fixture and from a source-fragment search
(`tests/gateway/coordination_queue_ack.test.js:872-878`), while each fake
handler returns the success or failure reply that the reconciler is then
expected to decode (`:1643-1701`, `:1703-1747`, `:1749-1798`).

In an exact disposable candidate copy, I changed all three wrong-value
outcomes:

- direct ACK allowed a non-`"1"` string to fall through toward pending
  settlement;
- inspection returned tombstone success for a non-`"1"` value; and
- orphan finalization allowed a non-`"1"` value to fall through toward
  destructive settlement.

The exact lint gate exited 0 and the exact 47-test Trial 4 inventory still
passed 47/47, including every advertised wrong-value matrix leaf. The tests
therefore do not prove exact-value rejection, absence of `XACK`/`XDEL`/`SET`,
or absence of a repository proof commit.

Required next-trial correction:

- execute each missing/positive/zero/expired/persistent/wrong-type/wrong-value
  state through the actual Lua in an isolated disposable Redis (or an
  equivalently faithful Lua/Redis execution harness);
- bind each state to the real tombstone key used by the command; and
- observe the actual Redis effects and repository settlement, not effects
  selected by the test oracle.

### P1 — raw JSON fixtures never reach the bounded parser

The source statically contains one shared contract with a byte ceiling, shared
work counter, string ceiling, depth ceiling, per-object decoded-key set,
root-kind recording, and final decode
(`gateway/src/core/coordination_queue.js:144-435`). The orphan presence path
uses its result before returning live-presence status (`:1706-1726`).

The boundary specimens are constructed carefully, including a one-byte
exact/over-ceiling difference. They are not bound to script execution.
`assertRawPresenceWorkFailsClosed()` parses `rawPresence` in JavaScript and
then discards it; its fake handler returns corrupt-state solely when the
generated script contains the expected contract slice
(`tests/gateway/coordination_queue_ack.test.js:2082-2115`). None of the
specimens at `:2144-2202` is supplied to Redis or interpreted by the Lua
parser.

In an independent bounds-only candidate mutation, I removed:

- `index - start > JSON_MAX_STRING_BYTES`; and
- `depth > JSON_MAX_DEPTH`.

The exact lint gate exited 0 and the exact focused inventory still passed
47/47, including the long-string and excessive-depth leaves. The same
declared-not-observed construction is used for byte and work outcomes.

Required next-trial correction:

- run exact-boundary, over-boundary, work-exhaustion, long-string, and
  excessive-depth raw values through the actual script parser;
- prove which boundary is accepted or rejected from the script reply and
  actual Redis effects; and
- add mutation-sensitive assertions for every byte/work/string/depth
  conjunct.

### P1 — stored-envelope duplicate fixtures are not bound to either settlement script

The source statically creates a fresh `seen_keys` table inside every object,
decodes keys before comparing them, and rejects a repeated decoded key
(`gateway/src/core/coordination_queue.js:270-347`). Direct ACK parses the raw
envelope before the deferred destructive phase (`:1302-1327`), and orphan
finalization parses it before `XACK`, `XDEL`, and tombstone creation
(`:1769-1795`).

The final test verifies each hostile `rawEnvelope` only with JavaScript
`JSON.parse` and the test's own duplicate scanner
(`tests/gateway/coordination_queue_ack.test.js:2395-2406`). Neither fake
client receives that raw envelope. Both handlers return invalid-state merely
when `envelopeGuard(script)` finds expected source fragments
(`:2408-2434`).

In an independent duplicate-only candidate mutation, I retained the
`if seen_keys[key] then` fragment but replaced its `return nil` with a no-op.
The actual Lua would therefore accept duplicate decoded keys. The exact lint
gate exited 0 and the exact focused inventory still passed 47/47, including
all twelve escaped aliases and the nested object/array leaf in both declared
settlement paths.

Required next-trial correction:

- place each hostile raw envelope in the actual stream entry used by direct
  ACK and orphan finalization;
- execute both Lua settlement paths;
- observe invalid-state/recovery-required plus unchanged stream, PEL, and
  tombstone state; and
- prove no `commitTombstone` or `commitOrphan` call follows.

## Trial 3 finding-closure adjudication

| Trial 3 P1 | Source correction | Trial 4 evidence | Closure |
|---|---|---|---|
| Lane capture through virtual lifecycle dispatch | Private authorities are implemented and all three queue call sites are corrected | Only `snapshot()` is behaviorally attacked; virtual `execute()` and `close()` mutations survive lint and 203 tests | **Not closed** |
| Tombstones accepted without positive TTL | Exact `"1"` and numeric `PTTL > 0` are present in all three scripts | TTL source fragments are checked, but the state matrix is synthesized and wrong-value mutations survive lint and 47 tests | **Not closed** |
| Raw JSON lexer lacks byte/token/work limits | Shared byte/work/string/depth contract is present | Raw fixtures never execute the parser; independent string/depth deletions survive lint and 47 tests | **Not closed** |
| Stored envelopes are duplicate-blind | Both paths call the canonical parser before destructive operations | Raw envelopes never reach either script; disabling duplicate rejection survives lint and 47 tests | **Not closed** |

## Open-question resolutions

### 1. Exact npm lint gate — resolved green

I independently verified the ruled canonical provider before running lint.
The candidate and provider hashes are identical:

```text
71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0  gateway/package-lock.json
71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0  /tmp/agents-orchestrator-v5-wave2-integration/gateway/package-lock.json
31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252  gateway/eslint.config.js
31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252  /tmp/agents-orchestrator-v5-wave2-integration/gateway/eslint.config.js
```

Both `gateway/node_modules` and the provider path resolve to:

```text
/tmp/agents-orchestrator-v5-wave2-integration/gateway/node_modules
```

The exact required command was then run in the review worktree:

```text
npm --prefix gateway run lint -- --no-cache

> agents-gateway@0.1.0 lint
> eslint --config eslint.config.js src tests scripts --no-cache

exit 0
```

The earlier primary-checkout dependency failure is superseded. The canonical
provider is lock/config-identical and the exact npm gate is green.

### 2. Post-GREEN assertion-order correction — accepted as equivalent RED evidence

The post-GREEN position of `c53f9c4` remains a disclosed ordering deviation;
the detached replay is not relabeled as ordered branch history.

I independently copied the exact final test blob
`f4b240fce0d9184114173a7b0ed842f963478c23` over an archive of the exact
pre-GREEN commit `dc90375`, verified that copied file's Git blob identity, and
ran the exact duplicate-family command. It failed 0/14. Every leaf observed
both:

- direct ACK success with `ackedCount: 1` and modeled
  `XACK`/`XDEL`/`SET_PX`; and
- orphan success with `committed: 1`, modeled
  `XACK`/`XDEL`/`SET_PX`, and `commitOrphan`.

`c53f9c4` changes no fixture, expected value, production path, or predicate.
Its `7/+`, `7/-` diff only moves the already-authored direct assertion so the
already-authored orphan branch executes before the combined assertion. The
original pre-GREEN test family was already red for the documented direct
settlement reason, and the exact final harness is independently red against
the same pre-GREEN source for both paths.

I therefore accept the RED discipline for this narrowly scoped assertion-order
amendment; a new trial is not required solely because `c53f9c4` follows
GREEN. This resolution does not cure the four mutation/evidence findings
above, which independently require a next trial.

## Historical RED reproduction

All historical runs used Node `v22.22.1`, exact archived commit contents, and
the canonical dependency provider. The temporary archives and mutation
directories were removed afterward.

### Lifecycle authority RED at `1449c72`

```text
node --test --test-concurrency=1 \
  --test-name-pattern='lifecycle projection cannot capture' \
  tests/gateway/coordination_queue_ack.test.js

tests 1
pass 0
fail 1
exit 1
```

Observed actual value:

```json
{
  "laneCaptured": true,
  "rawResult": "RAW_OK",
  "commands": [["ECHO", "trial-4-raw-authority"]]
}
```

### Tombstone RED at `1449c72`

```text
node --test --test-concurrency=1 \
  --test-name-pattern='tombstone proof paths|complete tombstone PTTL matrix' \
  tests/gateway/coordination_queue_ack.test.js

tests 25
pass 12
fail 13
exit 1
```

The structural guard failed, and zero/expired/persistent failed in each of
direct ACK, inspection, and orphan finalization for the documented false
success/proof reasons.

### Bounded JSON RED at amended pre-GREEN `dc90375`

```text
node --test --test-concurrency=1 \
  --test-name-pattern='share one bounded canonical|raw JSON byte' \
  tests/gateway/coordination_queue_ack.test.js

tests 7
pass 1
fail 6
exit 1
```

The shared contract was absent; exact-boundary, over-ceiling, wide-flat, and
long-string cases deferred. The pre-existing excessive-depth case passed.

### Stored-envelope RED at `dc90375`

```text
node --test --test-concurrency=1 \
  --test-name-pattern='duplicate stored-envelope fields' \
  tests/gateway/coordination_queue_ack.test.js

tests 14
pass 0
fail 14
exit 1
```

The original assertion order observed direct ACK's `ackedCount: 1` and modeled
`XACK`/`XDEL`/`SET_PX` in all thirteen leaves.

The independently constructed final-blob replay over the same `dc90375`
source produced:

```text
tests 14
pass 0
fail 14
exit 1
```

It additionally observed orphan `committed: 1`, `commitOrphan`, and modeled
`XACK`/`XDEL`/`SET_PX` in every leaf.

## Final-candidate gate outputs

### Trial 4 directed inventory

```text
node --test --test-concurrency=1 \
  --test-name-pattern='lifecycle projection|tombstone proof paths|complete tombstone PTTL matrix|share one bounded canonical|raw JSON byte|duplicate stored-envelope' \
  tests/gateway/coordination_queue_ack.test.js

tests 47
pass 47
fail 0
skipped 0
exit 0
```

### Preserved presence inventory

```text
node --test --test-concurrency=1 \
  --test-name-pattern='orphan finalizer parses exact JSON container tokens|duplicate JSON object keys' \
  tests/gateway/coordination_queue_ack.test.js

tests 16
pass 16
fail 0
skipped 0
exit 0
```

### Preserved Trial 3 inventory

```text
node --test --test-concurrency=1 \
  --test-name-pattern='ordinary queue graph|ordinary queue constrained|orphan finalizer parses|presence shape and lease corruption|ACK claim families|duplicate JSON object keys' \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_queue_ack.test.js

tests 20
pass 20
fail 0
skipped 0
exit 0
```

### Required injected-fake inventory

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

tests 203
pass 203
fail 0
skipped 0
exit 0
```

This inventory uses injected fake clients plus the existing bounded loopback
RESP handshake. It does not execute the changed Lua in Redis.

### Syntax and diff hygiene

```text
node --check gateway/src/core/coordination_queue.js
exit 0

node --check gateway/src/core/redis_client_lifecycle.js
exit 0

node --check tests/gateway/coordination_queue_ack.test.js
exit 0

git diff --check \
  2c8a5380ea38356364fe90668a166470e0b506eb..c53f9c40fe3790a4ac501f8a0a8903a6b47d560f
exit 0
```

## Adversarial mutation summary

All mutations were made only in disposable `/tmp` archives of `c53f9c4`.
None changed this review worktree or the frozen range.

| Independent mutation | Lint | Relevant test gate |
|---|---:|---:|
| Restore virtual command/blocking `execute()` and both virtual `close()` dispatches | 0 | 203/203 |
| Make all three non-`"1"` tombstone paths accept/fall through | 0 | 47/47 |
| Remove only the JSON string and depth ceilings | 0 | 47/47 |
| Make only the decoded duplicate-key rejection a no-op | 0 | 47/47 |

These are material surviving mutants. They directly answer the review
contract's “if deleted, would a test turn red?” question in the negative.

## Positive source audit and limits

Static review confirmed:

- queue code currently dispatches no lane `snapshot()`, `execute()`, or
  `close()` prototype method;
- ordinary queue instances retain no own lane, factory, URL/options, client,
  or arbitrary callback-executor field;
- every current tombstone proof path requires exact `"1"` and numeric
  `PTTL > 0`;
- the current parser shares one work state, creates a new decoded-key set per
  object, records root kinds during the same traversal, and performs the final
  whole-value decode only after its scan;
- direct and orphan raw-envelope parsing currently precedes every `XACK`,
  `XDEL`, and tombstone write; and
- the queue module exports exactly:

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

I found no new authenticated-then-written-unbound production identity in the
two changed source files. The material unbound data is in the tests:
`rawPresence` and `rawEnvelope` are validated by test helpers but never
supplied to the generated Lua.

I did not run or claim:

- live Redis or actual Redis Lua/cjson execution;
- crash/reclaim, failover, partition, or external transport behavior;
- migration `003`, SQLite, PostgreSQL, or durable ACK-intent persistence;
- production recovery-client composition, Redis wiring, service lifecycle,
  health, inventory, MCP, tool, or catalog integration;
- aggregate `scripts/ci.sh`, integration-branch compatibility, promotion,
  release, or full-sheet acceptance; or
- completion of STORE, WIRING, live-race, health, or later `G/0/02` work.

No production or test file in the frozen range was modified. No shared
service, database, Redis instance, network provider, MCP server, or tmux
session was used or changed. Nothing was pushed, integrated, promoted, or
released.

## Review closure

Trial 4 preserves useful source corrections, exact historical RED evidence,
and a resolved lint provider. It remains independently KO because the tests
do not execute or mutation-protect the security and settlement predicates
they claim.

The next trial should start from this result, retain the frozen source
corrections, add behaviorally bound REDs for all four findings above, produce
a source-only GREEN only if those REDs expose a real source correction, rerun
the exact lint and no-shared-service Gateway gates, and receive a fresh
independent result before any integration claim.
