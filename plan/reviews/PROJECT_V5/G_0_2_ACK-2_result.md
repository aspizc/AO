# Independent Review Result — Project V5 G/0/02 ACK Reconciliation Core (Trial 2)

## Verdict

`reviewed_KO`

- P0 findings: **0**
- P1 findings: **2**
- P2 findings: **0**

Trial 2 correctly closes the DTO time-of-check/time-of-use defect, due-time
claim CAS, stale-list convergence, fixed proof-operation shape, typed
tombstone result, and pure build/decode export requirements. It does not close
the operational authority or canonical-presence gates:

1. an ordinary `RedisCoordinationQueue` holder can submit either pure recovery
   command through the queue's publicly reachable managed Redis lane; and
2. deterministic noncanonical presence state can still be classified as a
   live old participant and deferred repeatedly.

This verdict is limited to the frozen standalone ACK-reconciliation core. It
does not integrate or promote the candidate, mark `G/0/02` complete, or make
any durable-store, production Redis, wiring, health, inventory, release, or
full-sheet claim.

## Reviewer profile

- Requested model: **GPT-5.6 Sol**
- Requested reasoning: **ultra**
- Requested service profile: **Priority/Fast**
- Review date: **2026-07-27**

The isolated worktree exposes no independent model/service telemetry, so the
profile above records the requested configuration rather than an external
attestation. The review was performed without delegation or subagents.

## Frozen identity and reviewed scope

- Branch: `feat/V5-G-0-02-ack-core`
- Trial 1 KO / Trial 2 base:
  `075c1edcbadbf09ca72e57ee047d50a99e181597`
- Base tree:
  `6036ccfc057c8459e78fcaf1e0551b092b45aa06`
- Trial 2 RED 1:
  `8aad8ac4a604ed84056f38702cab1638bc34c725`
- RED 1 tree:
  `106207da34e4059c23de26ffef2712b7c304cd58`
- Trial 2 RED 2:
  `de3f8e4e86c73029502421a190c662677944fd33`
- RED 2 tree:
  `b2e62e59dd6b977f5392b4152087d5a60eb10055`
- Trial 2 RED 3:
  `bc2576434b86fecec3d31703026db3421d0f08a0`
- RED 3 tree:
  `8d9762b2c02fcb7776642efeb311b1f9d2dd30c2`
- Technical candidate:
  `c68d1d654803caa7f1d12c6b2955379cdaaf726c`
- Technical tree:
  `5c284b18c43410155036ca1989dfe6fe08784bd0`
- Request-only review HEAD:
  `80ddcbec52b560d75f2c63060c9ae32639f0a730`
- Request tree:
  `8523d4126cb9943e5b74e90b5c282b4b2b7f456c`
- Exact technical range:
  `075c1edcbadbf09ca72e57ee047d50a99e181597..c68d1d654803caa7f1d12c6b2955379cdaaf726c`
- Review worktree:
  `/tmp/agents-orchestrator-v5-g002-ack-core.wrwx7a/worktree`

Parentage is exact and linear:

```text
075c1edcbadbf09ca72e57ee047d50a99e181597
  -> 8aad8ac4a604ed84056f38702cab1638bc34c725
  -> de3f8e4e86c73029502421a190c662677944fd33
  -> bc2576434b86fecec3d31703026db3421d0f08a0
  -> c68d1d654803caa7f1d12c6b2955379cdaaf726c
  -> 80ddcbec52b560d75f2c63060c9ae32639f0a730
```

The four-commit technical range is exactly **6 files / 1715 insertions / 273
deletions**:

```text
gateway/src/core/coordination_ack_reconciler.js
gateway/src/core/coordination_consumer.js
gateway/src/core/coordination_queue.js
gateway/src/core/repositories/coordination_consumer_repo.js
tests/gateway/coordination_ack_reconciliation.test.js
tests/gateway/coordination_queue_ack.test.js
```

RED 1 and RED 2 change only the two declared tests. RED 3 changes only the ACK
queue test. The technical candidate changes only the four declared source
modules. The request commit adds only
`plan/reviews/PROJECT_V5/G_0_2_ACK-2_to_review.md`.

## Findings

### P1-1 — An ordinary queue holder can execute the recovery protocol through the public managed-client lane

The candidate removes the named recovery factory and the named queue recovery
methods, but `RedisCoordinationQueue` still publishes the operational Redis
capability as ordinary own properties:

- `this.clientFactory` is assigned at
  `gateway/src/core/coordination_queue.js:2318`;
- `this.commandLane` is assigned at `:2343-2356`; and
- `this.blockingLane` is assigned at `:2357-2366`.

`RedisClientLane.execute()` is public
(`gateway/src/core/redis_client_lifecycle.js:90-109`). Its private runner
obtains the lane-owned connection and passes the raw Redis client to the
caller's arbitrary callback (`:181-185`). The queue therefore remains a
confused deputy: possession of the ordinary queue is enough to reach its
configured, managed Redis connection and submit any command.

The reviewer used only an injected fake client. Starting with an ordinary
queue and the candidate's pure tombstone builder, this expression executed
the recovery `EVAL` through the queue-owned lane:

```text
queue.commandLane.execute(
  (managedClient) => managedClient.sendCommand(command)
)
```

Observed bounded output:

```json
{
  "ownKeys": [
    "blockingLane",
    "clientFactory",
    "closePromise",
    "closed",
    "commandLane",
    "connectTimeoutMs",
    "enabled",
    "group",
    "keys",
    "maxInboxLength",
    "onError",
    "orphanInboxTtlMs",
    "redisUrl"
  ],
  "commandLaneExecute": "function",
  "exposedClientFactory": "function",
  "reply": [2],
  "commands": [
    ["EVAL", "1", "agents:coord:v1:acked:pt%3Arecipient:100-0"]
  ]
}
```

No Redis or network connection was opened. The fake proves the capability
path, not merely a matching method name.

This contradicts the accepted design that tombstone inspection and orphan
finalization are never caller authority, and the Trial 2 claim that an
ordinary queue holder cannot acquire an operational recovery capability.
The submitted regression checks only named recovery properties and recovery-
looking names on the queue prototype
(`tests/gateway/coordination_queue_ack.test.js:824-836`). It does not inspect
or exercise own properties that expose the raw client.

Required correction: make client factories/options, URLs, command/blocking
lanes, and raw-client dispatch closure-owned or language-private. Public queue
possession must expose only its constrained queue operations. Add a RED that
starts from only an ordinary queue plus the public module and proves no
reachable own/prototype property can deliver the managed client or execute
either built command.

### P1-2 — Noncanonical or non-leased presence can still be treated as live and deferred

The queue writer's JavaScript contract requires `capabilities` to be an array
and `metadata` to be a plain object
(`gateway/src/core/coordination_queue.js:1549-1555,1598-1607,1673-1684`).
The finalizer's Lua validator does not preserve those type distinctions:

- `valid_capabilities()` accepts any Lua table, counts its entries, and
  accepts zero entries (`:1281-1301`);
- `valid_metadata()` likewise accepts any Lua table whose observed entries
  have string keys (`:1303-1313`).

Lua JSON decoding represents both JSON arrays and JSON objects as tables for
these checks. Consequently, a stored presence with
`"capabilities": {}` passes the array validator, and one with
`"metadata": []` passes the object validator. These values are rejected by
the JavaScript writer and are deterministic wrong-type state, not canonical
presence.

There is a second storage-level hole in the same decision. Registration and
renewal always write presence with a positive `PX` lease
(`gateway/src/core/coordination_queue.js:135-159,161-192`), but orphan
finalization performs only `TYPE` and `GET` on the presence key
(`:1385-1402`). It never verifies a positive `PTTL`. A persistent
canonical-looking presence key can therefore be treated as live forever even
though it cannot have been produced by the leased-presence transition.

For all of these cases, `valid_presence()` returns true and the script returns
code 3 (`:1315-1349,1390-1402`). The decoder maps code 3 to
`old_participant_present` (`:2156-2177`), and the reconciler defers it with
`OLD_PARTICIPANT_PRESENT`
(`gateway/src/core/coordination_ack_reconciler.js:762-774`). Repeated
reconciliation can therefore remain deferred on deterministic corrupt state
instead of reaching `TRANSPORT_STATE_UNKNOWN`/`recovery_required`.

The submitted canonical-presence test asserts only that selected validator
names and field strings occur in the generated script
(`tests/gateway/coordination_queue_ack.test.js:928-963`). It does not exercise
wrong empty-container shapes or a presence without a lease.

Required correction: make the script distinguish the exact JSON container
kinds (or consistently forbid ambiguous empty forms at both writer and
reader), require the storage-level lease invariant such as a positive `PTTL`,
and map every mismatch to transport-state unknown. Add REDs for empty object
capabilities, empty array metadata, persistent presence, and repeated
reconciliation of each case; retain a complete leased canonical presence as
the sole deferral case.

## Correct Trial 2 closures

The two findings above do not negate the following verified corrections:

- Reconciler page, intent, claim, renewal, one-field status, summary, and proof
  summary inputs are copied only from own data descriptors into frozen
  snapshots before validation
  (`gateway/src/core/coordination_ack_reconciler.js:83-158,251-520`).
  Accessors are rejected without choosing a later branch from a reread value.
- Queue recovery replies use an exact dense one-element data-descriptor
  snapshot. Malformed/accessor replies become `TypeError` contract failures,
  while an injected ordinary `Error` remains transport unavailability
  (`gateway/src/core/coordination_queue.js:1557-1596,2156-2200`;
  `gateway/src/core/coordination_ack_reconciler.js:683-709,731-760`).
- Claim repeats terminal-state, reconcilable-state, due-time, and active-lease
  decisions before mutation. `not_due` does not advance epoch or mint a token
  (`gateway/src/core/repositories/coordination_consumer_repo.js:785-846`).
- The reconciler treats stale `not_due`, `committed`, and
  `recovery_required` claim outcomes as bounded no-ops
  (`gateway/src/core/coordination_ack_reconciler.js:652-680`).
- The concrete repository no longer accepts caller-supplied proof strings.
  Direct, tombstone, and orphan commits are fixed wrappers exposed through
  separate frozen facets
  (`gateway/src/core/repositories/coordination_consumer_repo.js:870-913,
  1157-1180`). The consumer sends no proof value
  (`gateway/src/core/coordination_consumer.js:665-782`).
- Tombstone inspection uses a typed `EVAL`: absent, exact string `1`, and
  wrong type/value map separately
  (`gateway/src/core/coordination_queue.js:1046-1060,2181-2200`).
- The final queue module exports exactly the queue error/class/factory, key
  helper, and four pure ACK builder/decoder functions. The builders return
  frozen string arrays and perform no I/O
  (`gateway/src/core/coordination_queue.js:1809-1940,2156-2200`).
- The orphan command binds the old presence key, old inbox, recipient-scoped
  tombstone, consume identity, delivery, sender, message, scope, group, and
  TTL. Its success/tombstone/unknown paths remain convergent and body/token
  free.

## TDD lineage

The declared lineage is structurally valid: all parents and trees match, all
three RED commits are test-only, and the technical GREEN commit is
source-only. RED 3 references
`buildCoordinationAckTombstoneInspectionCommand` while the export is absent
from its source tree; the technical commit introduces it.

The RED 3 and GREEN test blobs are byte-identical:

- `tests/gateway/coordination_ack_reconciliation.test.js`:
  `c7d4aec93918b101c0e3e901ab07e1f5737a2e30`
- `tests/gateway/coordination_queue_ack.test.js`:
  `ec65f024a172aff3e4be9f0b2375eb9c85f80404`

The reviewer did not rewrite or checkout historical source/tests. The
submission's historical RED counts were not treated as current GREEN
evidence. Current source and tests were run together. The lineage remains
procedurally sound, but its authority and canonical-presence RED objectives
are incomplete for P1-1 and P1-2.

## Independent verification

Runtime: Node **22.22.1**.

- Expanded injected-fake reconciliation/consumer/queue suite:

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

  Result: **123 passed / 0 failed / 0 skipped**.

- Lock-matched ESLint **10.8.0** passed over the four changed source modules
  and two changed tests.
- All four changed source modules passed `node --check`.
- `git diff --check
  075c1edcbadbf09ca72e57ee047d50a99e181597..c68d1d654803caa7f1d12c6b2955379cdaaf726c`
  passed.
- Candidate/provider lock SHA-256:
  `71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`.
- Candidate/provider ESLint configuration SHA-256:
  `31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`.
- Dynamic module inspection confirmed the declared eight exports.
- The authority probe used one injected fake client, one queue, and one pure
  builder. It opened no socket or external service.

A temporary lock-matched `gateway/node_modules` symlink was created only for
these offline fake tests, lint, module inspection, and the bounded authority
probe. It was removed before this result was written. No Redis, network,
socket, MCP, KYA, tmux, SQLite, migration 003, PostgreSQL, live service,
aggregate CI, integration, promotion, release, agent, or subagent command was
run.

## Final conclusion

`reviewed_KO`

Trial 2 makes substantial correct progress and its submitted fake suite is
green, but the central capability boundary is still bypassable through the
ordinary queue's public managed-client lane, while noncanonical/non-leased
presence can still produce a repeatable live-presence defer. Both P1 findings
need directed REDs and correction before this core can receive an independent
OK.
