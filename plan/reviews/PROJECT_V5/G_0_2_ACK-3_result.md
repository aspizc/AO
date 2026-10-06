# Independent Review Result — Project V5 G/0/02 ACK Core (Trial 3)

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 4 |
| P2 | 0 |

Trial 3 closes the Trial 2 claim-family confusion and improves canonical
presence validation, but it does not close the submitted queue-authority and
settlement-integrity boundary. An ordinary queue can still expose a live
`RedisClientLane` through the exported lane prototype and then execute an
arbitrary raw Redis callback. The ACK scripts also accept non-expiring
tombstone proof, run an attacker-sized JSON lexer without a byte/work bound,
and destructively settle stored envelopes after a duplicate-blind
`cjson.decode`.

The technical candidate must not be integrated. Its RED, request, and this
result remain useful append-only evidence for Trial 4.

## Independent-review identity

- Branch: `feat/V5-G-0-02-ack-core`
- Trial 2 KO base:
  `11f3d4a0e285ca72cd3865faae8d935c9b39502a`
- RED 1:
  `dd9719d72f917539c45b61e3c5dcbee90b082dd6`
- RED 2:
  `179ec3bb97c5bfc9fd38fcf05b98c1e783676c8e`
- RED 2 tests-only refinement:
  `72665771d09a77c41b55ee5a8ab4e8fec334ad95`
- Technical candidate:
  `69baf8301724df203b58e7d16decc6dd4e7a1b87`
- Technical tree:
  `c06ccca852a8d8bc748d728bb29832d791f0184d`
- Request-only reviewed HEAD:
  `a3d20199d1f235ab5e3f02dc0f95e8fd5d0783b6`
- Request tree:
  `cbf29a0ae040065f0fe1c3af0fdbee38512b52c9`

Parentage is exact and linear:

```text
11f3d4a0e285ca72cd3865faae8d935c9b39502a
  -> dd9719d72f917539c45b61e3c5dcbee90b082dd6
  -> 179ec3bb97c5bfc9fd38fcf05b98c1e783676c8e
  -> 72665771d09a77c41b55ee5a8ab4e8fec334ad95
  -> 69baf8301724df203b58e7d16decc6dd4e7a1b87
  -> a3d20199d1f235ab5e3f02dc0f95e8fd5d0783b6
```

The source-only technical commit changes exactly:

```text
gateway/src/core/coordination_consumer.js                         +1 /  -1
gateway/src/core/coordination_queue.js                          +369 / -80
gateway/src/core/repositories/coordination_consumer_repo.js      +58 / -17
```

This result reviews ACK reconciliation, managed-client authority, tombstone
proof, raw JSON validation, and destructive stream settlement. It does not
review or claim durable migration `003`, Redis wiring, promotion, release, or
the complete G/0/02 exit gate. No live/shared Redis, MCP, KYA, provider, tmux,
or network service was modified or restarted.

## P1 findings

### P1 — `lifecycle()` can expose a live lane that executes arbitrary Redis callbacks

The candidate moves queue state into a private `WeakMap`, but
`RedisCoordinationQueue.lifecycle()` still dispatches the public virtual
method `snapshot()` on both live lane objects
(`gateway/src/core/coordination_queue.js:2656-2662`). `RedisClientLane` is an
exported class, and both `snapshot()` and `execute(operation)` are public
methods (`gateway/src/core/redis_client_lifecycle.js:35,80-90`).

An ordinary queue holder can therefore:

1. replace `RedisClientLane.prototype.snapshot` with a wrapper that captures
   its `this`;
2. call the otherwise read-only `queue.lifecycle()`;
3. restore the prototype; and
4. call `capturedLane.execute(rawClient => rawClient.sendCommand(...))`.

The independent in-memory reproduction used a fake client and no Redis:

```json
{
  "frozen": true,
  "result": "RAW_OK",
  "commands": [["ECHO", "review-authority"]]
}
```

Freezing the returned projection does not revoke the captured lane. Once
captured, the lane also exposes its configured client factory/options and its
general callback executor. The route does not traverse the queue's private
`WeakMap` or a function's private closure.

Required Trial 4 correction:

- queue lifecycle projections must be produced without invoking an
  attacker-replaceable method on a privileged lane;
- ordinary queue possession must expose neither a lane, factory, URL/options,
  raw client, nor arbitrary callback executor through prototype replacement,
  return-value substitution, property traversal, or lifecycle hooks; and
- a RED test must execute a raw sentinel command through the current route
  before the production correction.

### P1 — ACK tombstones are trusted without a positive TTL

The protocol promises bounded ACK idempotency, but all relevant scripts trust
the literal string `1` without proving that the key still has a positive
lease:

- direct ACK reads the tombstone at
  `coordination_queue.js:942-945`;
- `INSPECT_ACK_TOMBSTONE_SCRIPT` returns `exists` for `GET == "1"` at
  `:1046-1059`; and
- orphan finalization returns tombstoned for `GET == "1"` at
  `:1617-1623`.

None of those paths calls `PTTL` for the tombstone. A persistent key
(`PTTL == -1`) or otherwise non-positive lifetime is therefore accepted as
canonical settlement proof. This can turn a corrupted/directly written key
into permanent ACK authority and silently suppress recovery after the
configured tombstone window.

The presence path correctly requires `PTTL > 0` at `:1630-1635`; tombstones
need the same positive-lifetime discipline.

Required Trial 4 correction:

- every direct, inspect, and reconciliation tombstone read must accept only
  exact value `1` with numeric `PTTL > 0`;
- persistent, expired, non-positive, wrong-type, and wrong-value states must
  fail closed without `XACK`, `XDEL`, repository commit, or false success; and
- tests must distinguish missing, positive, zero/expired, persistent, wrong
  type, and wrong value.

### P1 — the recursive raw JSON lexer has no byte, token, or work bound

Trial 3 caps recursive depth at 64
(`coordination_queue.js:1160-1163`), but the lexer otherwise scans the entire
raw Redis value:

- strings advance byte by byte;
- object and array loops have no member/token counter
  (`:1175-1209`, `:1216-1230`);
- `top_level_json_container_kind` repeats a full traversal for each requested
  field (`:1245-1314`); and
- there is no maximum `string.len(source)` check before either traversal.

Redis Lua scripts execute atomically. A corrupt/directly written presence with
very wide arrays/objects or very long strings can therefore make recovery
perform attacker-sized work while blocking the shared Redis event loop.
Depth-only protection does not bound bytes, tokens, iterations, or the two
complete scans used for `capabilities` and `metadata`.

Required Trial 4 correction:

- reject raw presence above a fixed reviewed byte ceiling before lexing;
- enforce a deterministic token/work budget shared across recursive descent
  and top-level field extraction;
- parse once where practical, rather than rescan the same raw value per
  target; and
- add exact boundary, over-bound, wide-flat, long-string, and depth cases that
  fail without defer or destructive settlement.

### P1 — stored stream envelopes are duplicate-blind before destructive settlement

The new duplicate-key lexer is applied only to presence JSON. Both settlement
paths decode the stored stream envelope directly with `cjson.decode`:

- direct ACK at `coordination_queue.js:993-1001`, followed by tombstone writes
  and `XACK`/`XDEL` at `:1007-1030`; and
- orphan reconciliation at `:1699-1712`, followed by `XACK`, `XDEL`, and a
  tombstone at `:1714-1733`.

Lua `cjson.decode` collapses duplicate object keys. A raw envelope can contain
duplicate spellings of a proof-bearing field, including escaped aliases, and
be validated only after that ambiguity has been erased. The candidate then
irreversibly acknowledges and deletes the stream entry.

The Trial 3 tests cover recursive duplicate keys in presence but contain no
stored-envelope duplicate matrix. The claimed canonical-presence correction
therefore does not establish canonical settlement input.

Required Trial 4 correction:

- apply the same bounded decoded-key duplicate rejection to every stored
  envelope before `cjson.decode`;
- cover every canonical envelope field plus nested body objects/arrays and
  escaped aliases;
- prove ambiguous input performs no `XACK`, `XDEL`, tombstone, repository
  commit, or recovery success; and
- keep the parser byte/work bounded as required by the preceding finding.

## Preserved positive evidence

The candidate's source and test hygiene was checked independently:

```text
npm --prefix gateway run lint -- --no-cache
exit 0
```

The run used the existing cached Wave 2 `node_modules` through a temporary
worktree-local symlink, which was removed immediately afterward. The one-line
`catch (_error)` hygiene correction in the technical commit is therefore a
valid correction and must be preserved in Trial 4; lint is not an additional
finding against this candidate.

The submitted claim-family separation and positive presence `PTTL` check also
remain useful. Trial 4 should retain them and add RED cases for the four
findings above rather than discard the prior work.

## Review closure

This is a result-only KO. It authorizes no technical integration or
promotion. The next correction trial must start from this result, preserve
the frozen RED lineage, add failing tests for every finding above, produce a
source-only GREEN, rerun the focused and full no-live-service Gateway gates,
and receive a new independent result before integration.
