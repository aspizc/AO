# Review Submission — Project V5 G/0/02 ACK Core (Trial 4)

## Review requested

A fresh, independent, evidence-based review is requested for the frozen Trial
4 candidate ending at
`c53f9c40fe3790a4ac501f8a0a8903a6b47d560f`.

This request is blocked at two explicit lane-contract gates described below.
It is not a verdict and makes no automatic merge, integration, promotion,
release, production-readiness, durable-store, or complete-`G/0/02` claim.
The reviewer must decide whether the candidate is technically acceptable and
must not convert the disclosed gate failures into passing evidence.

## Trial 3 KO closure

Trial 4 starts from the Trial 3 KO/result commit
`2c8a5380ea38356364fe90668a166470e0b506eb` and addresses all four P1
findings in `G_0_2_ACK-3_result.md`.

### Queue lifecycle no longer dispatches replaceable lane methods

- `redis_client_lifecycle.js` stores snapshot, execute, and close authorities
  in a module-private `WeakMap`.
- The exported authority functions are immutable ESM bindings and require the
  otherwise unreachable lane instance.
- Queue lifecycle, operation, and close paths use those authorities instead of
  virtual `snapshot()`, `execute()`, or `close()` dispatch.
- Replacing `RedisClientLane.prototype.snapshot` and calling
  `queue.lifecycle()` therefore captures no lane and executes no raw command.
- Queue instances still have no own lane, factory, URL/options, client, or
  arbitrary callback-executor field.

The public `RedisClientLane` compatibility methods remain available to direct
lane owners, but ordinary queue possession does not expose a managed lane to
those methods.

### Every tombstone proof requires exact value and positive TTL

- Direct ACK accepts an existing tombstone only when `GET == "1"` and numeric
  `PTTL > 0`.
- The inspection script returns `ack_tombstone` only under the same condition.
- Orphan finalization returns its tombstone proof only under the same
  condition.
- Missing remains a legitimate absence. Zero, expired (`-2`), persistent
  (`-1`), wrong-type, and wrong-value states fail closed before `XACK`,
  `XDEL`, tombstone creation, or proof commit.

### Raw JSON work is byte-, string-, depth-, and work-bounded

One JavaScript constant, `BOUNDED_CANONICAL_JSON_LUA`, supplies the identical
Lua parser contract to direct ACK and orphan finalization:

- maximum raw bytes: `262144`;
- maximum shared parser work: `196608`;
- maximum JSON string scan: `131072`;
- maximum recursive depth: `64`;
- one recursive decoded-key set per object;
- one shared work counter across whitespace, strings, numbers, arrays, objects,
  and recursive descent; and
- one parse per raw value, returning root container kinds with the decoded
  value.

The parser rejects over-ceiling input before descent. It replaces the two
full top-level presence rescans and performs the final `cjson.decode` only
after bounded recursive duplicate rejection.

### Stored envelopes are canonical before either destructive settlement

- Direct ACK assigns `envelope_raw`, calls `parse_canonical_json`, validates
  the decoded envelope, and only then can reach tombstone writes, `XACK`, or
  `XDEL`.
- Orphan finalization follows the same order before its `XACK`, `XDEL`, and
  tombstone.
- Tests cover all twelve canonical envelope fields with escaped decoded-key
  aliases, plus a duplicate reached through a nested body object and array.
- Ambiguous input produces no modeled Redis destructive effect and no
  `commitTombstone` or `commitOrphan`.

## Preserved Trial 3 behavior

The source-only Trial 4 commit changes only:

- `gateway/src/core/coordination_queue.js`; and
- `gateway/src/core/redis_client_lifecycle.js`.

It does not change Trial 3's claim-family separation, fixed proof producers,
repository claim fencing, positive presence `PTTL` requirement, recursive
presence duplicate rejection, or the accepted `catch (_error)` lint
correction.

## TDD evidence

### RED 1 — four Trial 4 finding families

- Commit:
  `1449c72d544d7797afdc944459fac020df900b36`
- Subject:
  `test(queue): bind ACK trial 4 integrity RED (V5 G/0/02 Trial 4)`
- Tree:
  `02de171008373ad0e01b51924324fce8298330fa`
- Direct parent:
  `2c8a5380ea38356364fe90668a166470e0b506eb`
- Changed path:
  `tests/gateway/coordination_queue_ack.test.js`
- Diff:
  **771 insertions / 3 deletions**.

The RED tree was run before production changes.

Raw lifecycle capture:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='lifecycle projection cannot capture' \
  tests/gateway/coordination_queue_ack.test.js
```

- **0 passed / 1 failed / 0 skipped**.
- Actual observation:

```json
{
  "laneCaptured": true,
  "rawResult": "RAW_OK",
  "commands": [["ECHO", "trial-4-raw-authority"]]
}
```

Complete tombstone matrix:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='tombstone proof paths|complete tombstone PTTL matrix' \
  tests/gateway/coordination_queue_ack.test.js
```

- **12 passed / 13 failed / 0 skipped**.
- Zero, expired, and persistent tombstones failed in direct ACK, inspection,
  and orphan finalization.
- Direct ACK returned `ackedCount: 0` and modeled `SET_PX`.
- Inspection/finalization produced a proof commit instead of
  `recovery_required`.
- Missing, positive, wrong-type, and wrong-value cases behaved as the matrix
  expected.

Bounded raw JSON:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='share one bounded canonical|raw JSON byte' \
  tests/gateway/coordination_queue_ack.test.js
```

- **1 passed / 6 failed / 0 skipped**.
- The shared bounded contract was absent.
- Exact-byte-boundary, over-ceiling, wide-flat, and long-string presence
  values deferred instead of failing closed.
- The pre-existing depth guard closed the excessive-depth leaf.

Stored-envelope duplicates:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='duplicate stored-envelope fields' \
  tests/gateway/coordination_queue_ack.test.js
```

- **0 passed / 14 failed / 0 skipped**.
- All twelve escaped top-level aliases, the nested body/array ambiguity, and
  their parent failed.
- The initial assertion order exposed direct ACK first:
  `ackedCount: 1` with modeled `XACK`, `XDEL`, and `SET_PX`.

The combined initial Trial 4 RED command reported:

- **13 passed / 34 failed / 0 skipped**.

Trial 3's preserved directed command remained green on the tests-only tree:

- **20 passed / 0 failed / 0 skipped**.

### RED assertion-scope amendment

- Commit:
  `dc90375f02bfc7ff413ff68cc93d809fe509cff4`
- Subject:
  `test(queue): scope ACK JSON work assertion (V5 G/0/02 Trial 4)`
- Tree:
  `8dd30c617a79b2e74b0a6eff9fd073e7f6afef0f`
- Direct parent:
  `1449c72d544d7797afdc944459fac020df900b36`
- Changed path:
  `tests/gateway/coordination_queue_ack.test.js`
- Diff:
  **5 insertions / 2 deletions**.

The original global ordering used the first `skip_json_value(` occurrence,
which is necessarily the function definition before the parser's byte check.
The amendment scopes ordering to `parse_canonical_json` and requires its
specific `local index = skip_json_value(` call. The bounded RED remained:

- **1 passed / 6 failed / 0 skipped**.

### Technical GREEN

- Commit:
  `3b20dd62e7dbfd682801179d8f97cd3f7baba256`
- Subject:
  `fix(queue): close ACK trial 4 integrity gaps (V5 G/0/02 Trial 4)`
- Tree:
  `a61500a061da30f02fbf4a836101cba185304116`
- Direct parent:
  `dc90375f02bfc7ff413ff68cc93d809fe509cff4`
- Changed paths:
  - `gateway/src/core/coordination_queue.js`
  - `gateway/src/core/redis_client_lifecycle.js`
- Diff:
  **375 insertions / 268 deletions**.

The technical commit changes no test, review, consumer, repository, plan,
policy, composition-root, catalog, or session-writer file.

Source blobs:

- `gateway/src/core/coordination_queue.js`:
  `a1c5054849595b0637deb59be0cdbdff49aafa19`
- `gateway/src/core/redis_client_lifecycle.js`:
  `6e5ceaa971dc5c89577bb3c5b7f3e33108f97dd4`

The approved pre-GREEN test blob is:

- `tests/gateway/coordination_queue_ack.test.js`:
  `4b987ef088bfbadcf5dc62bb2e2695b24a1f84d2`

### Post-GREEN duplicate-path execution correction

- Commit:
  `c53f9c40fe3790a4ac501f8a0a8903a6b47d560f`
- Subject:
  `test(queue): execute both envelope settlement REDs (V5 G/0/02 Trial 4)`
- Tree:
  `c1da37b21bc3361e5b9dbffe0c8974135590b279`
- Direct parent:
  `3b20dd62e7dbfd682801179d8f97cd3f7baba256`
- Changed path:
  `tests/gateway/coordination_queue_ack.test.js`
- Diff:
  **7 insertions / 7 deletions**.
- Final test blob:
  `f4b240fce0d9184114173a7b0ed842f963478c23`.

Before writing this request, the implementer found that each duplicate leaf's
direct-ACK assertion stopped the RED leaf before its authored orphan branch
executed. The correction collects both outcomes before one assertion.

The final test blob was copied exactly into a temporary detached worktree at
the pre-GREEN commit
`dc90375f02bfc7ff413ff68cc93d809fe509cff4`. Its isolated replay reported:

- **0 passed / 14 failed / 0 skipped**;
- direct ACK returned `ackedCount: 1` and modeled `XACK`, `XDEL`, `SET_PX`;
- orphan finalization returned `committed: 1`, modeled `XACK`, `XDEL`,
  `SET_PX`, and called `commitOrphan`; and
- the expected result was invalid direct ACK plus
  `recovery_required`, no proof commit, and no destructive effect.

The temporary dependency link and detached worktree were removed.

This replay supplies genuine behavioral RED evidence for both paths, but the
assertion-order correction is after GREEN in branch history. That ordering
deviation is an explicit blocker and must not be silently treated as strict
RED-before-GREEN lineage.

## Frozen candidate identity

- Trial 3 result/base:
  `2c8a5380ea38356364fe90668a166470e0b506eb`
- Base tree:
  `9dc50094610f7b58f1f3c76ddfddeb418c376261`
- RED 1:
  `1449c72d544d7797afdc944459fac020df900b36`
- RED assertion amendment:
  `dc90375f02bfc7ff413ff68cc93d809fe509cff4`
- Source-only GREEN:
  `3b20dd62e7dbfd682801179d8f97cd3f7baba256`
- Final tests-only execution correction:
  `c53f9c40fe3790a4ac501f8a0a8903a6b47d560f`
- Final candidate tree:
  `c1da37b21bc3361e5b9dbffe0c8974135590b279`
- Technical range:
  `2c8a5380ea38356364fe90668a166470e0b506eb..c53f9c40fe3790a4ac501f8a0a8903a6b47d560f`
- Range identity:
  **4 commits / 3 files / 1149 insertions / 271 deletions**
- Branch:
  `feat/V5-G-0-02-ack-4`
- Worktree:
  `/tmp/agents-orchestrator-v5-g002-ack4.Sl2Omk/worktree`

Parentage is exact and linear:

```text
2c8a5380ea38356364fe90668a166470e0b506eb
  -> 1449c72d544d7797afdc944459fac020df900b36
  -> dc90375f02bfc7ff413ff68cc93d809fe509cff4
  -> 3b20dd62e7dbfd682801179d8f97cd3f7baba256
  -> c53f9c40fe3790a4ac501f8a0a8903a6b47d560f
```

The final range changes exactly:

- `gateway/src/core/coordination_queue.js`
- `gateway/src/core/redis_client_lifecycle.js`
- `tests/gateway/coordination_queue_ack.test.js`

This request file is outside the frozen candidate range and must be committed
alone.

## Directed verification on the final candidate

Trial 4 correction inventory:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='lifecycle projection|tombstone proof paths|complete tombstone PTTL matrix|share one bounded canonical|raw JSON byte|duplicate stored-envelope' \
  tests/gateway/coordination_queue_ack.test.js
```

- **47 passed / 0 failed / 0 skipped**.

Preserved presence parser inventory:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='orphan finalizer parses exact JSON container tokens|duplicate JSON object keys' \
  tests/gateway/coordination_queue_ack.test.js
```

- **16 passed / 0 failed / 0 skipped**.

Preserved Trial 3 directed inventory:

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

- **104 passed / 0 failed / 0 skipped**.

Focal reconciliation, consumer, and ACK queue:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_queue_ack.test.js
```

- **145 passed / 0 failed / 0 skipped**.

Expanded injected-fake queue/consumer inventory:

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

- **203 passed / 0 failed / 0 skipped**.
- These tests use injected fake clients or the existing bounded loopback RESP
  handshake test. They do not execute the Lua in a live Redis server.

Additional checks:

- `node --check` passed for both changed source files and the changed test
  file.
- `git diff --check
  2c8a5380ea38356364fe90668a166470e0b506eb..c53f9c40fe3790a4ac501f8a0a8903a6b47d560f`
  passed.
- Runtime: Node **22.22.1**.
- The temporary worktree-local dependency symlink was removed.

The queue module's final export surface remains:

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

It exports no lane, lifecycle authority, client acquisition, raw callback
executor, repository acquisition, or recovery runtime.

## Blocked lint gate and open questions

The exact required command was run:

```text
npm --prefix gateway run lint -- --no-cache
```

It exited **2** before linting source. The mandated local link target,
`/home/carase/git/personal/agents-orchestrator/gateway/node_modules`, has no
`.bin/eslint`, `eslint`, `@eslint/js`, or `globals`. npm therefore selected the
system ESLint path, whose CommonJS loader failed on the first ESM `import` in
`gateway/eslint.config.js`:

```text
SyntaxError: Cannot use import statement outside a module
```

The mandated target's current `gateway/package-lock.json` SHA-256 is
`824886ba7012c266370088117d435d0ef89000c57e845bc23d72d06c8d835088`,
which differs from this candidate.

As a non-substitute diagnostic, the existing Wave 2 tool provider was used
read-only:

```text
/tmp/agents-orchestrator-v5-wave2-integration/gateway/node_modules/.bin/eslint \
  --config /tmp/agents-orchestrator-v5-wave2-integration/gateway/eslint.config.js \
  src tests scripts --no-cache
```

- ESLint **10.8.0** exited **0**.
- Candidate and provider `gateway/package-lock.json` SHA-256:
  `71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`.
- Candidate and provider `gateway/eslint.config.js` SHA-256:
  `31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`.

The provider diagnostic is lock/config-identical, but it is not the exact npm
gate and is not presented as one.

Open questions:

1. Must the operator restore the mandated primary-checkout dependency target
   and rerun the exact npm lint gate, or may an independent reviewer accept the
   lock/config-identical provider invocation?
2. Is the exact detached pre-GREEN RED replay of the final duplicate-path test
   blob acceptable, or does strict lineage require a new trial because the
   assertion-order commit follows GREEN?

Until both questions are resolved, this lane is blocked and the candidate must
not be described as fully gated.

## Threat model

The directed threat model covers:

- prototype replacement attempting to capture command or blocking lanes from
  lifecycle, queue operations, or close;
- return-value and property traversal attempting to expose factory, URL,
  options, lane, raw client, or arbitrary callback authority;
- missing, positively leased, zero, expired, persistent, wrong-type, and
  wrong-value ACK tombstones in all three proof paths;
- corrupt/directly written raw JSON at the exact byte boundary, above the byte
  ceiling, with a wide flat object, a long string token, or excessive depth;
- literal and escaped decoded-key duplicates at every stored-envelope field;
- duplicate keys reached through a nested body object and array; and
- ambiguous Redis input reaching direct or orphan destructive settlement.

The trust boundaries remain:

- Redis values are untrusted input;
- pure command builders are values, not transport capabilities;
- ordinary queue possession grants only fixed queue operations;
- a caller that independently owns an unrestricted Redis client or a
  `RedisClientLane` already has authority outside the queue abstraction; and
- repository proof commits remain claim-family fenced.

## Explicit limits and non-claims

This candidate does not add or claim:

- live Redis or actual Redis Lua/cjson execution evidence;
- crash/reclaim, Redis failover, network partition, or external transport
  behavior;
- migration `003`, SQLite, PostgreSQL, durable ACK-intent persistence, or
  business-effect atomicity;
- production recovery-client composition, dependency wiring, service
  startup/shutdown integration, health, inventory, tool, MCP, or catalog
  surfaces;
- aggregate CI, integration-branch compatibility, promotion, release, or
  full-sheet acceptance; or
- completion of later `G/0/02` STORE, wiring, live-race, or service work.

No live/shared Redis, migration, MCP, KYA, provider network, external network,
tmux, SQLite, PostgreSQL, service restart, integration, promotion, or release
command was run.

The branch's `plan/PROJECT_V5/HANDOFF_YOLO.md` does not contain the named
`G/0/02 ACK reconciliation Trial 4` section from the lane brief. The explicit
lane brief, Trial 3 KO corrections, Trial 3 request, task sheet, and
`AGENTS.md` were used as the binding technical contracts. No evidence in this
request is attributed to a missing handoff section.

## Review focus

- Verify exact parentage, trees, pathsets, range statistics, and blobs.
- Reproduce the four RED families and inspect the disclosed post-GREEN
  assertion-order correction without treating its detached replay as ordered
  lineage.
- Confirm queue code never dispatches replaceable lane prototype methods.
- Confirm all three tombstone reads require exact value and numeric
  `PTTL > 0` before proof success.
- Confirm the shared parser contract is byte/work/string/depth bounded, creates
  a fresh decoded-key set for every object, records root kinds in the same
  traversal, and decodes once.
- Confirm direct and orphan stored-envelope parsing precedes all destructive
  operations.
- Re-run the 203-test injected-fake inventory.
- Resolve the exact npm lint gate rather than crediting the provider diagnostic
  silently.
- Confirm the candidate makes no live-Redis, migration, durable-store, wiring,
  integration, or release claim.

Write the independent verdict and evidence to
`plan/reviews/PROJECT_V5/G_0_2_ACK-4_result.md`. Do not modify the frozen
technical range. No automatic integration follows from this request.
