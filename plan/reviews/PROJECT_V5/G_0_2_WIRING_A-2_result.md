# Independent Review Result — Project V5 G/0/02 WIRING-A (Trial 2)

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 2 |
| P2 | 0 |

The Trial 2 candidate closes both Trial 1 findings in the exact directed cases
added by the candidate:

- two ordinary handles opened on one unchanged SQLite pathname elect exactly
  one owner, release it, and permit the rejected runtime to replace it; and
- an active blocking Redis receive carries one abort signal through the real
  managed client, service, queue, command, and dedicated connection, after
  which `stop()` waits for the underlying operation to reject and clean up.

Those directed closures are narrower than the required contracts. The
canonical identity is derived by statting the current pathname spelling rather
than identifying the store to which the handle is already open. Two handles
to one durable store can consequently receive different identities and both
start. Separately, cancellation is installed only after a Redis lane entry
becomes active, and the service's participant lookup receives no signal. A
queued blocking receive and a receive pending in participant lookup therefore
remain unresolved after their runtime signal is aborted.

The widened queue/client/lifecycle/service changes do not re-expose a managed
client, lane, raw callback executor, factory, URL/options, recovery facet, or
recovery acquirer. The part-A scope boundary, PostgreSQL deferral, caller-owned
SQLite handles, and advertised directed gates are preserved. The two red
SQLite suites are inherited unchanged from the Trial 1 baseline and are not
findings against this candidate.

This is a result-only verdict. It does not integrate, promote, release, or
claim completion of WIRING, crash recovery, durable convergence, Redis live
recovery, health/inventory, or the complete `G/0/02` sheet.

## Reviewed identity and range

- Review branch: `review/V5-G-0-02-wiring-a-2`
- Reviewed HEAD:
  `caa2687624338cd3287fdb5fc73416a999443dc2`
- Trial 1 result / correction base:
  `b07c77fbf4c7cc10c4093c8c7874733247b5b291`
- RED: `7de44d7fbb5b77582e097e956191f31513b55fc0`
- GREEN: `885e825c49199f07d010abd14e19f8954bbc77c8`
- Trial 1 SQLite comparison baseline:
  `8acfa33f672c8350e5f9d95a75c8b2443de4ea75`

The base-to-HEAD path set was exactly:

```text
gateway/src/coordination_client.js
gateway/src/core/coordination_consumer_runtime.js
gateway/src/core/coordination_queue.js
gateway/src/core/redis_client_lifecycle.js
gateway/src/core/repositories/sqlite_coordination_consumer_repo.js
gateway/src/core/sqlite_store_identity.js
gateway/src/services/coordination_service.js
plan/reviews/PROJECT_V5/G_0_2_WIRING_A-2_to_review.md
tests/gateway/coordination_consumer_runtime.test.js
```

Range size:

```text
9 files changed, 700 insertions, 53 deletions
```

The RED commit changed only the runtime suite, the GREEN commit changed only
the seven production files, and the handoff commit added only the review
submission. Before this result was written, `git status --short --branch`
showed only the disclosed pre-existing untracked `gateway/node_modules`.

## P1 findings

### P1 — pathname stat is not a canonical identity for an already-open SQLite store

`sqliteStoreIdentity` caches per handle, but its first value for a durable
database comes from:

```text
fs.statSync(database.name, { bigint: true })
```

at `gateway/src/core/sqlite_store_identity.js:8-23`. The runtime then uses that
value as its process-local owner-map key
(`gateway/src/core/coordination_consumer_runtime.js:18,143-160,233-241,
349-350`). This identifies whatever the pathname names when identity is first
requested, not necessarily the durable store to which the handle is already
open.

I reproduced the ordinary required case without the candidate fixture. Two
real `better-sqlite3` handles opened on one file, each with a real SQLite
repository plus the already-integrated ACK facets, returned:

```json
{
  "identitiesEqual": true,
  "starts": [
    "fulfilled",
    "rejected:COORDINATION_CONSUMER_RUNTIME_STORE_OWNED"
  ],
  "rejectionCodes": [
    "COORDINATION_CONSUMER_RUNTIME_STORE_OWNED"
  ],
  "replacement": {
    "status": "started",
    "generation": 1,
    "scopeId": "scope-a",
    "participantId": "pt-probe"
  },
  "callerHandlesUsable": [42, 42]
}
```

I then checked whether the identity still described the open store when a
pathname changed between opening the handle and binding the repository:

1. Open handle A on `retarget-a.sqlite` and create the only `marker` row,
   value `7`.
2. Rename that file to `retarget-b.sqlite`.
3. Open handle B on `retarget-b.sqlite`; both handles read the same marker.
4. Create a different SQLite file at the old `retarget-a.sqlite` pathname.
5. Construct the two repositories and runtimes, causing identity derivation.

The readback was:

```json
{
  "sameDurableStoreEvidence": {
    "firstMarker": 7,
    "secondMarker": 7,
    "durableFileInode": "17670763"
  },
  "identityPathReadback": {
    "firstHandleNameNowPointsToInode": "17670766",
    "secondHandleNamePointsToInode": "17670763"
  },
  "identitiesEqual": false,
  "starts": ["fulfilled", "fulfilled"]
}
```

Both handles were already open to the original durable store, but the first
identity described the replacement file at its stale pathname. The repository
binding comparison also accepted each runtime because the repository and
runtime recomputed the same wrong per-handle value. Exactly-one ownership was
therefore bypassed.

Two additional ordinary pathname assertions confirm that the helper operates
on a spelling, not the opened store:

```json
{
  "paddedValidFilename": {
    "bothHandlesReadSameFile": true,
    "identity": {
      "status": "threw",
      "code": "ENOENT"
    }
  },
  "relativeHandleAfterCwdChange": {
    "status": "threw",
    "code": "ENOENT"
  }
}
```

`better-sqlite3` trims a padded filename before opening but retains the
original name projection; similarly, a relative name is later resolved
against the process's current directory. Both are usable SQLite handles, yet
the identity helper cannot identify them after those spelling differences.

Required correction:

- identify the store actually held by the open handle, not a later lookup of
  `database.name`, or use a store-backed owner lease keyed by scope;
- keep the repository/store verification tied to that same authoritative
  store identity; and
- add a RED covering an already-open handle whose pathname no longer resolves
  to its store, proving that two handles to one durable store cannot both
  start.

### P1 — cancellation does not settle queued or pre-read managed receives

The active blocking path works. My independent real-stack assertion used the
exported managed client, real service, real Redis queue/lifecycle, a pending
blocking command, and a real runtime. It returned:

```json
{
  "stop": {
    "status": "fulfilled",
    "value": {
      "status": "stopped",
      "generation": 1
    }
  },
  "signalCounts": {
    "managed": 1,
    "queue": 1,
    "command": 1
  },
  "sameSignal": true,
  "aborted": true,
  "abortListenersAfterStop": 0,
  "underlying": {
    "pending": 0,
    "settlements": 1,
    "destroyCalls": 1,
    "errorListeners": 0
  },
  "managedState": "ready"
}
```

The managed-client link at `gateway/src/coordination_client.js:756-781`, the
service-to-read link at
`gateway/src/services/coordination_service.js:1265-1291`, the queue links at
`gateway/src/core/coordination_queue.js:3015-3023,3057-3062,3160-3196`, and
the active-operation abort listener at
`gateway/src/core/redis_client_lifecycle.js:208-234` are therefore observed.
The operation was settled rather than raced away from.

The lane's backpressure path does not install that listener. When capacity is
full, it stores `signal` in `#pending`
(`gateway/src/core/redis_client_lifecycle.js:111-130`) and does nothing with
it until `#drain` starts the entry
(`gateway/src/core/redis_client_lifecycle.js:237-255`). I submitted two
blocking reads to the single-capacity lane, aborted only the queued second
read, and observed:

```json
{
  "beforeAbort": {
    "state": "ready",
    "active": 1,
    "queued": 1,
    "capacity": 1,
    "queueLimit": 32
  },
  "secondAfterOwnAbort": {
    "status": "timeout"
  },
  "afterOwnAbort": {
    "state": "ready",
    "active": 1,
    "queued": 1,
    "capacity": 1,
    "queueLimit": 32
  },
  "secondListenersWhileQueued": 0
}
```

Only after aborting the unrelated first read did the queued call leave the
queue and reject. Thus an aborted managed receive can retain its operation,
promise, and queue slot indefinitely behind another blocking receive.

The service also awaits participant lookup before the newly cancellable
`readInbox` call. `readParticipant` invokes only
`queue.getParticipant(participantId)` at
`gateway/src/services/coordination_service.js:827-834`; the signal accepted by
`receive` is not supplied there. With that lookup pending, runtime stop
returned:

```json
{
  "getParticipantArgumentCount": 1,
  "receiveSignalAborted": true,
  "readInboxCountBeforeManualRelease": 0,
  "beforeManualRelease": {
    "status": "timeout"
  },
  "afterManualRelease": {
    "status": "fulfilled",
    "value": {
      "status": "stopped",
      "generation": 1
    }
  },
  "readInboxSignalAfterRelease": {
    "reached": 1,
    "aborted": true
  }
}
```

The pending managed receive settled only after the participant lookup was
manually released. This is the same abandoned-operation class as Trial 1,
now at two unguarded points surrounding the directed active-blocking case.

Required correction:

- register cancellation when a lane entry is enqueued, atomically remove and
  reject an aborted queued entry, and clean up its listener on every drain,
  close, and rejection path;
- propagate or equivalently bound cancellation through the participant lookup
  as part of the managed `receive` operation; and
- add real-managed-client REDs for a receive queued behind another blocker and
  a receive pending before `readInbox`, proving `stop()` settles without
  releasing unrelated work manually.

## Per-area adjudication

| Area | Ruling | Independent evidence |
|---|---|---|
| Two ordinary handles, one file/scope | OK in the directed case | One fulfilled start, one closed `COORDINATION_CONSUMER_RUNTIME_STORE_OWNED`, clean owner stop, replacement start, both handles usable. |
| Canonical store identity | **KO / P1** | Two handles already open to one renamed durable file received different path-stat identities and both started. Padded and moved-CWD handle spellings also failed identity derivation. |
| Repository/store comparison | Incomplete with the identity P1 | A repository bound to a plainly different file is rejected, but matching wrong path-stat values do not prove the handle and repository identify the open store. |
| Active blocking receive cancellation | OK | The same aborted signal reached client, service, queue, and Redis command; the underlying operation settled; pending/listener counts reached zero; one dedicated connection was destroyed. |
| End-to-end managed receive cancellation | **KO / P1** | An aborted queued blocker stayed queued and unresolved; a receive pending in participant lookup held `stop()` until manual release. |
| Managed-client/service ownership | OK | Runtime stop left the caller-owned managed client `ready`; runtime did not start, stop, close, or replace it. |
| No per-stdio-proxy auto-start | OK | Production references remain only the factory definition and explicit re-export. No MCP/tool/service construction starts a runtime. |
| Managed Redis/raw authority reachability | OK | Fresh graph traversal and prototype substitution found no client, factory, URL/options, lane, or raw callback executor. |
| Recovery facet/acquirer reachability | OK | One acquisition across two runtime cycles; facet and acquirer were absent from the reachable graph. |
| Reconciliation port boundary | OK | Exactly the eight frozen operations were observed; no schema or concrete outbox operation was read. |
| Caller-owned SQLite handles | OK | Real handles remained usable after stop and returned `42`. |
| PostgreSQL deferral | OK | A real `PostgresDatabase` was synchronously rejected with the I/0/05 message; its executor was called zero times. |
| Crash/outbox/health scope | OK | No migration `003`, outbox schema, crash/live-recovery claim, health/inventory composition, or `coordination.status` expansion entered the production delta. |

## Canonical identity variant results

The following independent matrix used separate disposable stores for each
case:

| Variant | Same identity where the handles shared a store | Ownership result |
|---|---:|---|
| Same pathname | yes | one start, one `STORE_OWNED`, replacement succeeded |
| Symlink vs target | yes | one start, one `STORE_OWNED`, replacement succeeded |
| Relative vs absolute while the opening CWD remained current | yes | one start, one `STORE_OWNED`, replacement succeeded |
| Hard link vs target | yes | one start, one `STORE_OWNED`, replacement succeeded |
| Reopened handle after close | yes | reopened handle remained usable |
| Two `:memory:` handles | intentionally no | separate in-memory stores; identity stable per handle |
| `?mode=rw` suffix under this adapter | no | adapter treated it as a different literal filename, not an alias |
| Absolute `file:` URI under this adapter | not opened | `better-sqlite3` rejected it before SQLite open because its JS pathname check could not resolve the `file:` directory spelling |
| Already-open store after pathname retarget | **no** | **both runtimes started on the same durable store** |

The URI and query checks therefore did not produce an additional alias on the
installed adapter. The pathname-retarget assertion did produce the prohibited
different identities for one durable store.

## Managed-client and recovery reachability hunt

I constructed an ordinary Redis queue with exact sentinel client, factory,
URL, and options, forced its managed connection through `PING`, constructed a
normal coordination service and runtime, and traversed own data properties,
accessor functions, non-generic prototypes, safe queue projections, and the
public coordination/client/queue/runtime/service module namespaces. I also
replaced the public `RedisClientLane` prototype's `execute`, `snapshot`, and
`close` methods before operation, projection, and close.

Readback:

```json
{
  "connection": {
    "factoryCalls": 1,
    "rawCommands": ["PING"],
    "rawErrorListenersAfterPing": 1,
    "rawErrorListenersAfterClose": 0
  },
  "reachability": {
    "visitedReferences": 87,
    "rawClient": false,
    "rawClientFactory": false,
    "redisUrl": false,
    "factoryOptions": false,
    "managedClient": false,
    "recoveryFacet": false,
    "recoveryAcquirer": false,
    "redisClientLane": false,
    "forbiddenPaths": []
  },
  "prototypeHijacks": {
    "execute": 0,
    "snapshot": 0,
    "close": 0
  },
  "runtime": {
    "ownKeys": ["getStatus", "start", "stop"],
    "frozen": true,
    "recoveryAcquisitions": 1,
    "managedPending": 0,
    "ackPortReads": [
      "claim",
      "commitOrphan",
      "commitTombstone",
      "defer",
      "getAckReconciliationSummary",
      "list",
      "markAckRecoveryRequired",
      "renew"
    ]
  },
  "queueOwnKeys": []
}
```

The only authority-related queue-module exports were the four already accepted
bounded builder/decoder helpers:

```text
buildCoordinationAckTombstoneInspectionCommand
buildCoordinationOrphanAckFinalizationCommand
decodeCoordinationAckTombstoneInspectionReply
decodeCoordinationOrphanAckFinalizationReply
```

They expose no lane, raw client, factory, options, callback executor, or
recovery facet.

The explicit reachability ruling is: **starting with an ordinary queue,
ordinary service/runtime, their safe projections, and public module exports,
no managed Redis client, raw client, client factory, URL/options object, lane,
callback executor, recovery facet, or recovery acquirer was reachable.**

## Blast-radius and sibling-lane ruling

Every touched production file is conceptually necessary for one of the two
Trial 1 findings:

| Path | Necessity ruling |
|---|---|
| `coordination_client.js` | Necessary to make the managed `invoke` contract carry an operation signal. |
| `coordination_service.js` | Necessary to carry receive cancellation into queue work; the implementation stops short of the participant lookup. |
| `coordination_queue.js` | Necessary to carry the signal to node-redis and the private blocking lane. |
| `redis_client_lifecycle.js` | Necessary to settle the blocking operation by invalidating its dedicated connection; its queued-entry path remains incomplete. |
| `coordination_consumer_runtime.js` | Necessary to switch ownership from handle-object identity to a store identity and compare the repository binding. |
| `sqlite_store_identity.js` | Necessary as the shared identity/binding seam, although pathname stat is not sufficient. |
| `sqlite_coordination_consumer_repo.js` | Necessary to bind the concrete repository to the same store identity used by runtime ownership. |

The test expansion contains only the two correction RED families and their
supporting assertions. The handoff is review evidence. I found no unrelated
feature or scope addition in any touched file.

The SQLite repository edit overlaps a sibling-owned path, so I compared it
with `review/V5-G-0-02-outbox-2` from their common base. The overlap produces
one straightforward textual conflict at the import block: WIRING adds
`bindSqliteStoreIdentity`, while OUTBOX adds `crypto`. It does not duplicate or
pre-empt the sibling's SQL, migration `003`, intent state, claim families,
direct-ACK facet, reconciliation facet, cursor, or summary work.

On this branch the repository's string-key surface is unchanged:

```text
beginReplay
blockQuarantine
claim
claimBlockedQuarantine
commitAck
commitEffect
commitQuarantine
commitReplay
failReplay
getQuarantine
getReceipt
prepareAck
recordAttempt
releaseClaim
```

The edit adds one enumerable symbol,
`Symbol(agents-orchestrator.sqlite-store-identity.v1)`, before freezing the
adapter. That symbol is why trusted object-spread wrappers preserve the
binding. The reconciler consumes only the nested eight-operation port and does
not enumerate the root adapter, so the metadata does not alter its contract.
The sibling OUTBOX return object can retain the same wrapper after resolving
the import overlap. The edit changes no SQL, schema, migration, operation
implementation, repository contract descriptor, or data projection.

Accordingly, the sibling-file edit is necessary and semantically compatible,
but the identity value it carries must be corrected before acceptance. This
review makes no integration claim and does not resolve the sibling merge.

## Independent mutation reruns

I archived the reviewed HEAD into
`/tmp/g2wa2-mutants.HVUtTz`, linked the existing dependency installation, and
ran:

```text
node --test --test-reporter=spec \
  --experimental-test-isolation=none --test-concurrency=1 \
  tests/gateway/coordination_consumer_runtime.test.js
```

The pristine disposable copy passed 13/13. Before every mutation I restored
the affected source from the pristine archive and ran `node --check`. Six
independent handoff guards were killed:

| Mutation | Exit | Pass/fail | First directed failure |
|---|---:|---:|---|
| Replace canonical file identity with handle identity | 1 | 12/1 | `two handles for one SQLite file share one owner and release it for replacement` |
| Remove concrete SQLite repository-factory binding | 1 | 12/1 | `repository binding rejects a different SQLite store before ownership` |
| Drop managed-client operation signal | 1 | 12/1 | real managed-client stop result timed out |
| Drop service receive signal | 1 | 12/1 | real managed-client stop result timed out |
| Drop Redis command `abortSignal` | 1 | 12/1 | blocking command signal was `undefined` |
| Drop active blocking-operation abort listener | 1 | 12/1 | real managed-client stop result timed out |

No selected guard survived, timed out at the process limit, or failed syntax
checking. These results establish that the directed suite observes the links
it advertises. They do not cover the path-retarget, queued-entry, or
participant-lookup gaps above.

## Gate outputs

The advertised passing gates reproduced on reviewed HEAD:

| Command | Result |
|---|---|
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_runtime.test.js` | exit 0; 13 pass, 0 fail, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer.test.js` | exit 0; 41 pass, 0 fail, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_ack_reconciliation.test.js` | exit 0; 19 pass, 0 fail, 0 skipped |
| `node --test --experimental-test-isolation=none --test-concurrency=1 tests/gateway/coordination_client.test.js tests/gateway/coordination_service_receive.test.js tests/gateway/coordination_queue_receive.test.js tests/gateway/coordination_queue_lifecycle.test.js` | exit 0; 51 pass, 0 fail, 0 skipped |
| `npm --prefix gateway run lint -- --no-cache` | exit 0 |
| `git diff --check` | exit 0, no output |
| `git diff --check b07c77f..885e825` | exit 0, no output |

### Inherited SQLite reds — baseline comparison

I ran both suites on reviewed HEAD and independently archived and ran the same
commands at `8acfa33`.

| Suite | Reviewed HEAD | Trial 1 baseline `8acfa33` | Ruling |
|---|---|---|---|
| `coordination_consumer_sqlite_repo` | exit 1; 99 pass / 1 fail; `memory[operation] is not a function` | exit 1; 99 pass / 1 fail; same test and error | inherited, unchanged |
| `coordination_consumer_sqlite_integration` | exit 1; 0 pass / 7 fail; `repository.directAck.claim must be a function` | exit 1; 0 pass / 7 fail; same seven tests and error | inherited, unchanged |

The WIRING repository metadata edit did not worsen either suite. These failures
come from the ACK merge widening the in-memory port before the sibling SQLite
outbox implementation and are not attributed to Trial 2.

Per the brief, full `bash scripts/ci.sh` was not run.

## Scope ruling

Part A remains within its declared boundary:

- added production lines contain no migration, `003`, outbox, schema,
  crash-recovery, durable-convergence, Redis-live-recovery, health, inventory,
  MCP, or `coordination.status` composition;
- the only production references to the runtime are its definition and the
  explicit factory re-export from `coordination.js`;
- no stdio proxy, tool, service, or MCP path starts a runtime;
- the runtime reads exactly the eight frozen reconciliation operations and
  does not inspect a concrete outbox adapter;
- the real PostgreSQL adapter remains synchronously rejected before its
  executor can run; and
- runtime stop leaves injected SQLite handles and the managed client owned by
  their callers.

There is no crash-recovery, durable-convergence, live-Redis recovery, health,
inventory, migration `003`, sibling-outbox, full-sheet, integration, or
promotion claim in this verdict.

## What I did and did not verify

I verified the exact correction range and commit boundaries; read the Trial 1
KO specification and Trial 2 handoff; inspected every touched production
file; adjudicated the necessity of every touched path; compared the
sibling-owned SQLite repository work; ran the ordinary two-handle ownership
and replacement case; checked same-path, symlink, relative/absolute, hard-link,
reopen, in-memory, query-suffix, URI, padded-name, moved-CWD, and
pathname-retarget identity variants; ran active, queued, and pre-read
cancellation assertions; confirmed underlying active-operation settlement and
listener/resource cleanup; repeated the managed-client/raw/recovery
reachability and prototype-substitution hunt; reran six mutations; reproduced
all advertised directed gates; compared both inherited SQLite reds against
`8acfa33`; and reran the real PostgreSQL rejection.

I did not run aggregate CI, a live Redis server, Redis crash/reclaim,
process-crash recovery, cross-process ownership, migration `003`, the sibling
outbox's full functional suite, health/inventory composition, MCP traffic,
promotion, release, integration, or any external service. The installed
`better-sqlite3` wrapper rejected the absolute `file:` URI spelling before
SQLite open, so that check records adapter rejection rather than a
same-store URI alias.

I changed no source, test, plan sheet, migration, policy, sibling branch, or
external system.
