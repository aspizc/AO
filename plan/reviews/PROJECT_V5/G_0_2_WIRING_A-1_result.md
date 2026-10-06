# Independent Review Result — Project V5 G/0/02 WIRING-A (Trial 1)

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 2 |
| P2 | 0 |

The candidate preserves the required part-A scope boundary, does not expose
the managed Redis client or recovery facet, rejects the real PostgreSQL
adapter, leaves injected SQLite handles caller-owned, and passes all advertised
directed gates. Six independently rerun guard mutations also turn the runtime
suite red.

It is nevertheless not acceptable as the single-owner, abortable production
runtime. Store ownership is tied to one JavaScript database-object identity,
so two handles for the same SQLite file and scope can both start. Separately,
the runtime passes cancellation in a third argument that the real managed
coordination client does not accept or propagate, so stop cannot abort a
pending receive.

This is a result-only verdict. It makes no integration, promotion, release,
crash-recovery, Redis-live-recovery, health, inventory, or complete-`G/0/02`
claim.

## Reviewed identity and range

- Review branch: `review/V5-G-0-02-wiring-a-1`
- Reviewed HEAD: `d05ee2ae7a37b5453a91fa78f4d6cfc0458a67a1`
- Integration base: `13fada7`
- RED: `4882c9e84acbd6fd37223fcada7d624b3c7f2d35`
- GREEN: `bb613f9b7969c1acd222b08522344ea6087438af`

The base-to-HEAD path set was exactly:

```text
gateway/src/coordination.js
gateway/src/core/coordination_consumer_runtime.js
plan/reviews/PROJECT_V5/G_0_2_WIRING_A-1_to_review.md
tests/gateway/coordination_consumer_runtime.test.js
```

Before this result was written, `git status --short --branch` showed only the
disclosed pre-existing untracked `gateway/node_modules`; source, tests, the
sheet, and the index were otherwise unchanged.

## P1 findings

### P1 — separate handles for one SQLite store bypass single ownership

`storeOwners` is a module-local `WeakMap` keyed by the injected database
object (`gateway/src/core/coordination_consumer_runtime.js:14,139-154`), and
`start()` claims only that object plus the scope
(`gateway/src/core/coordination_consumer_runtime.js:326-339`). Object identity
does not identify the underlying durable store.

I opened two distinct `better-sqlite3` handles to the same disposable file,
bound a SQLite consumer repository to each handle, supplied the already-frozen
abstract ACK port without migration `003`, and concurrently started both
runtimes in `scope-a`. The independent probe returned:

```json
{
  "sameSqliteFile": "/tmp/g2wa1-shared-store-OWqlr3/consumer.sqlite",
  "handlesAreDistinct": true,
  "starts": ["fulfilled", "fulfilled"],
  "handlesUsableAfterStop": [42, 42]
}
```

Thus two runners can target one store/scope in the same process. This defeats
the sheet's exactly-one-runner requirement and can place the same durable
receipt/inbox work under two supervisors.

The narrower races do work when callers reuse the identical database object:

```json
{
  "sameDatabaseSameScope": [
    "started",
    "COORDINATION_CONSUMER_RUNTIME_STORE_OWNED"
  ],
  "sameRuntimeStartDuringStop":
    "COORDINATION_CONSUMER_RUNTIME_ALREADY_RUNNING",
  "doubleStopSamePromise": true,
  "stopThenStartGeneration": 2,
  "sameRepositoryDifferentDatabaseAnchors": ["fulfilled", "fulfilled"]
}
```

Required correction:

- identify ownership by a canonical store identity that is guaranteed to be
  shared by every handle for the same durable store, or acquire a store-backed
  owner lease keyed by canonical store plus scope;
- verify that the repository and ownership identity refer to the same store;
  and
- add a RED that opens two handles to one SQLite file, starts them
  concurrently in one scope, observes one closed
  `COORDINATION_CONSUMER_RUNTIME_STORE_OWNED` rejection, then proves clean
  release and replacement after stop.

### P1 — runtime cancellation is discarded by the real managed client

The runtime calls:

```text
coordinationClient.invoke("receive", input, { signal })
coordinationClient.invoke("ack", input, { signal })
```

at `gateway/src/core/coordination_consumer_runtime.js:352-365`. The production
managed client has the two-argument signature
`invoke(operation, input = {})` and calls the coordination service with only
one input object (`gateway/src/coordination_client.js:756-777`). The service
then calls `queue.readInbox(...)` without a signal
(`gateway/src/services/coordination_service.js:1265-1287`), including the
blocking Redis path at `gateway/src/core/coordination_queue.js:3161-3175`.

I used the exported real `createOrchestratorCoordinationClient`, placed a
pending `receive` behind it, configured the runtime's `blockMs` to `30000`,
and called `runtime.stop()`. The stop did not settle until I manually released
the receive:

```json
{
  "managedInvokeAcceptedRuntimeThirdArgument": false,
  "coordinationReceiveArgumentCount": 1,
  "signalReachedCoordinationReceive": false,
  "stopSettledWhileReceivePending": false,
  "configuredBlockMs": 30000,
  "stopAfterReceiveReleased": {"state":"stopped","generation":1}
}
```

The candidate test's fake `invoke(operation, input, options)` accepts and
honors an API that the real managed client does not implement. Its clean-stop
result therefore does not establish the production lifecycle claim.

Required correction:

- define and implement a real abortable managed-operation contract through
  the managed client, service, queue, and blocking Redis operation, or provide
  an equivalently bounded cancellation/fencing mechanism that settles the
  underlying operation rather than merely abandoning it;
- keep the raw Redis client and callback executor unreachable while doing so;
  and
- add a RED using the exported real managed client with a pending receive,
  proving cancellation reaches the operation and `stop()` settles without
  manually resolving the receive.

## Per-area adjudication

| Area | Ruling | Independent evidence |
|---|---|---|
| One runner per store/scope | **KO / P1** | Identical object races close correctly, but two handles for one SQLite file both start. |
| Concurrent start, start-during-stop, double stop, restart | OK within one object identity | One start plus one closed rejection; start during stop rejected; double stop returned the same promise; restart reached generation 2. |
| No per-stdio-proxy auto-start | OK | The only production references are the factory definition and its direct re-export. There is no runtime reference in MCP, tools, or services. |
| Shared coordination-service ownership | OK | Runtime calls only managed-client `getStatus`/`invoke`; it never calls service/client `start`, `stop`, `close`, or queue close. |
| Managed-client reuse and no second client | OK for authority; lifecycle KO separately | Runtime imports no Redis factory. The real-queue probe created its one supplied client for `PING`; no second client/factory path was found. |
| Managed Redis/raw dispatch reachability | OK | Exact sentinel client, factory, and URL were unreachable; prototype substitution did not intercept execute, snapshot, or close. |
| Recovery facet injected once and unreachable | OK | Two runtime cycles acquired once; facet, acquirer, and managed client were absent from the reachable graph; runtime exposes only `getStatus`, `start`, and `stop`. |
| Repository boundary | OK | Only the eight frozen reconciliation-port operations were read; no schema/table/migration token occurs in the runtime. |
| Injected-store ownership | OK | Both real SQLite handles remained usable after stop and returned `42`; runtime did not open, migrate, configure, or close them. |
| PostgreSQL fail-closed | OK | A real `PostgresDatabase` was synchronously rejected with the I/0/05 deferral error; its executor was called zero times. |
| Abortable lifecycle | **KO / P1** | Cooperative fakes clean up, but the real managed-client boundary discards cancellation and leaves stop pending behind receive. |
| Crash/outbox/health scope | OK | No positive crash/durable/live-recovery claim, outbox schema dependency, migration `003`, health/inventory composition, or `coordination.status` expansion was found. |
| Three-line `coordination.js` edit | OK | It is a minimal trusted-local factory re-export; it neither starts a runtime nor exports the recovery facet. |

## Managed-client and recovery reachability hunt

I created an ordinary Redis queue with exact sentinel values, forced one
managed connection through `PING`, and traversed own data properties, accessor
functions, and non-generic prototypes from the queue, service, queue module,
and public coordination module. I also replaced all three public
`RedisClientLane` prototype methods before exercising operation, lifecycle,
and close.

The readback was:

```json
{
  "factoryCalls": 1,
  "rawCommandKinds": ["PING"],
  "rawAuthorityReachable": {
    "rawClient": false,
    "rawClientFactory": false,
    "redisUrl": false
  },
  "forbiddenPaths": [],
  "prototypeHijacksInvoked": {
    "execute": 0,
    "snapshot": 0,
    "close": 0,
    "deliveredRaw": false
  },
  "queueOwnKeys": [],
  "queueModuleExecutorExports": []
}
```

The queue module still exports the four accepted bounded command
builder/decoder helpers:

```text
buildCoordinationAckTombstoneInspectionCommand
buildCoordinationOrphanAckFinalizationCommand
decodeCoordinationAckTombstoneInspectionReply
decodeCoordinationOrphanAckFinalizationReply
```

They do not provide a lane, client, raw dispatch, or callback executor, and the
candidate does not add or re-export them.

Starting and stopping the runtime twice produced:

```json
{
  "acquisitions": 1,
  "facetReachable": false,
  "acquirerReachable": false,
  "managedClientReachable": false,
  "runtimeOwnKeys": ["getStatus", "start", "stop"],
  "runtimeFrozen": true,
  "runtimeRecoveryExports": [],
  "publicRecoveryExports": [],
  "uniqueAckPortReads": [
    "claim",
    "commitOrphan",
    "commitTombstone",
    "defer",
    "getAckReconciliationSummary",
    "list",
    "markAckRecoveryRequired",
    "renew"
  ],
  "unexpectedAckPortRead": false
}
```

The explicit reachability ruling is: **no managed Redis client, client
factory, URL/options object, lane, raw callback executor, recovery facet, or
recovery acquirer is reachable from the ordinary queue/service/tool/runtime
surfaces tested.**

## Lifecycle cleanup readback

With a cooperative abort-aware injected operation, my independent cleanup
probe returned:

```json
{
  "sameStopPromise": true,
  "signalAborted": true,
  "abortListenersAfterStop": 0,
  "trackedTimersAfterStop": 0,
  "pendingManagedOperationsAfterStop": 0,
  "newActiveHandlesAfterStop": 0,
  "newActiveRequestsAfterStop": 0
}
```

This validates the local timer/listener cleanup logic, but it does not cure
the P1: with the real managed-client API, stop remains unresolved while the
receive remains pending, so the production abortability condition is not met.

## PostgreSQL and injected-store probes

The real PostgreSQL adapter probe returned:

```json
{
  "actualPostgresDatabaseRejected": true,
  "executorCalls": 0,
  "codePath": "hard synchronous TypeError"
}
```

The two-handle SQLite probe also queried each caller-owned handle after both
runtimes stopped and obtained `42` from each. Runtime stop therefore did not
close or invalidate either injected handle.

## Independent mutation reruns

I copied the candidate to `/tmp/g2wa1-mutants.N2Whj2`, restored the pristine
runtime before every mutation, checked every mutant with `node --check`, and
ran:

```text
node --test --experimental-test-isolation=none --test-concurrency=1 \
  tests/gateway/coordination_consumer_runtime.test.js
```

The disposable-copy baseline passed 10/10. Six independently selected handoff
guards were killed:

| Mutation | Exit | Pass/fail | First directed failure |
|---|---:|---:|---|
| Delete SQLite admission guard | 1 | 9/1 | `the runtime borrows an exact SQLite database and rejects PostgreSQL` |
| Delete managed-client readiness/scope guard | 1 | 9/1 | `managed client readiness and exact scope fail closed before ownership` |
| Delete exact recovery-facet guard | 1 | 9/1 | `recovery acquisition accepts only an exact own-data facet` |
| Delete same-object store-owner guard | 1 | 9/1 | `one SQLite store and scope has one owner, then stop releases it cleanly` |
| Delete timer cancellation | 1 | 9/1 | `abortable idempotent stop settles in-flight work and leaks nothing` |
| Delete stop-flight reuse | 1 | 8/2 | first failure: `abortable idempotent stop settles in-flight work and leaks nothing` |

No selected guard survived. This mutation result does not cover the two P1
gaps because the current tests model one database object and a non-production
three-argument managed client.

## Scope ruling

Part A stays within its required boundary:

- The only crash text added by the candidate is the handoff's explicit
  statement, `No crash-recovery claim is made`.
- `coordination_consumer_runtime.js` contains no `migration`, `003`, `outbox`,
  table DDL, ACK-intent column, `due_at`, `claim_epoch`, or proof-schema token.
- The runtime reads exactly the eight-operation port frozen by
  `coordination_ack_reconciler.js`; it does not import or inspect a concrete
  durable outbox adapter.
- The service/tool/MCP diff is zero bytes. No health or inventory composition
  is added, and `coordination.status` is unchanged.
- The runtime is not wired into stdio MCP construction. Its only public
  composition change is the explicit factory re-export.

Accordingly, neither P1 is a crash-recovery or sibling-outbox finding. Part B,
live Redis crash/reclaim behavior, durable migration `003`, and health/inventory
remain unclaimed and unverified.

## Gate outputs

All orchestrator-measured baselines reproduced on reviewed HEAD:

| Command | Result |
|---|---|
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_runtime.test.js` | exit 0; 10 pass, 0 fail, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer.test.js` | exit 0; 41 pass, 0 fail, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_ack_reconciliation.test.js` | exit 0; 19 pass, 0 fail, 0 skipped |
| `npm --prefix gateway run lint -- --no-cache` | exit 0 |
| `git diff --check 13fada7..d05ee2a` | exit 0, no output |
| `git diff --check` | exit 0, no output |

Per the review brief, full `bash scripts/ci.sh` was not run.

## What I did and did not verify

I verified the exact candidate range and path set; read the required contract
and existing consumer, reconciler, lifecycle, service, and repository seams;
reproduced the three directed suites, lint, and diff hygiene; ran independent
ownership/race, actual-client cancellation, real SQLite-handle, real
PostgreSQL-adapter, reachability/prototype-substitution, port-boundary, and
active-handle/request cleanup probes; and reran six mutations in a disposable
copy.

I did not run aggregate CI, live Redis crash/reclaim, process-crash recovery,
cross-process ownership, migration `003`, the sibling durable ACK-outbox
adapter, PostgreSQL implementation work, health/inventory composition, MCP
traffic, promotion, release, or integration. I changed no source, test, sheet,
policy, migration, or external service.
