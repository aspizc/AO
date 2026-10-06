# Independent Review Result — Project V5 G/0/02 WIRING-A (Trial 3)

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 1 |
| P2 | 0 |

The cancellation correction closes the Trial 2 finding. A queued receive
settles without disturbing the unrelated blocking read, participant lookup is
cancellable, an already-aborted queued signal is handled, and listener and
pending-work cleanup completes on drain, rejection, close, and runtime stop.

The store-identity correction does not close the other Trial 2 finding. In an
ordinary concurrent read workload, handles that were all open to the target
store resolved sometimes to the target identity and sometimes to the exact
identity of an unrelated store. Across three independent 400-handle runs, 303
target handles received the unrelated identity. There were no resolution
errors in those runs. The reported concurrency claim is therefore
**confirmed**, independently and without adopting the prior session's
measurement.

This is the third KO in the same store-identity class. Under the review brief,
WIRING-A now returns to design-first rather than proceeding to a fourth
implementation trial.

This is a result-only verdict. It does not integrate, promote, release, or
claim completion of WIRING, crash recovery, durable convergence, Redis live
recovery, health/inventory, or the complete `G/0/02` sheet.

## Reviewed identity and range

- Review branch: `review/V5-G-0-02-wiring-a-3`
- Reviewed HEAD:
  `0f577e694caedd06bbfc2cf96db0486fa7ac6839`
- Trial 2 result / correction base:
  `9264e5e6d52f8366e88945344e9c8be5cd1ff732`
- RED:
  `563e48e9462555ea82c83dbd98cb2dec43c702c9`
- GREEN:
  `fbcd3264e263fb4cfc68daf4a0c1f1e523b24115`
- Reviewed tree:
  `47995140c19aadfb559cd0bb04366fa6686b0bb0`

The correction range changed exactly:

```text
gateway/src/core/coordination_queue.js
gateway/src/core/redis_client_lifecycle.js
gateway/src/core/sqlite_store_identity.js
gateway/src/services/coordination_service.js
plan/reviews/PROJECT_V5/G_0_2_WIRING_A-3_to_review.md
tests/gateway/coordination_consumer_runtime.test.js
```

The RED commit changed only the runtime suite. The GREEN commit changed only
the four production files. The handoff commit added only the review
submission. Before this result was written, `git status --short --branch`
showed only the disclosed pre-existing untracked `gateway/node_modules`.

## P1 finding

### P1 — concurrent activity on an unrelated store can determine the target identity

`openedSqliteFileIdentity` observes process-wide lock changes around a
read-only query (`gateway/src/core/sqlite_store_identity.js:68-87`).
`durableIdentityForLockChange` first accepts a unique rollback-journal identity
from any changed connection and returns it before relating WAL activity back
to the target store (`gateway/src/core/sqlite_store_identity.js:46-65`).

That ordering does not prove that the chosen identity belongs to the handle
passed to `sqliteStoreIdentity`. When the target uses WAL and an unrelated
rollback-journal connection begins ordinary read activity during resolution,
the unrelated store is the unique directly resolved candidate and wins.

I added an ordinary robustness test only in a disposable copy of the existing
runtime suite. Its setup was:

1. Create a WAL target store containing marker value `7`.
2. Create an unrelated rollback-journal store containing marker value `9`.
3. Resolve one reference identity for each store.
4. Run an unsynchronized worker that repeatedly performs an ordinary
   `SELECT` iterator on the unrelated store.
5. In the main test, open 400 fresh handles to the target store, confirm each
   reads marker `7`, resolve its identity, and compare that value with the two
   references.

The test did not read or assert kernel bookkeeping. It asserted only the
opened data and the resulting identity values.

| Run | Target identity returned | Unrelated identity returned | Resolution errors |
|---|---:|---:|---:|
| 1 | 300 | 100 | 0 |
| 2 | 298 | 102 | 0 |
| 3 | 299 | 101 | 0 |
| **Total** | **897** | **303** | **0** |

Every wrong value was byte-for-byte equal to that run's independently
resolved unrelated-store identity. The first run, for example, recorded:

```json
{
  "targetReference": "sqlite-store-v2:49:17910901",
  "unrelatedIdentity": "sqlite-store-v2:49:17910907",
  "observed": {
    "sqlite-store-v2:49:17910907": 100,
    "sqlite-store-v2:49:17910901": 300
  },
  "errors": []
}
```

A simpler check with one unrelated read held continuously across both target
resolutions passed: the two target handles agreed and differed from the
unrelated identity. That narrower result does not refute the claim; ordinary
concurrent acquisition and release reproduced it deterministically in all
three widened runs.

The runtime keys its owner map by this value
(`gateway/src/core/coordination_consumer_runtime.js:18,143-160,233-241,
349-350`). Therefore handles to one target store can occupy different owner
keys, while a target can also collide with an unrelated store. Repository
binding recomputes and caches the same per-handle result, so it does not
detect the misbinding.

Required design correction:

- derive identity from authority unambiguously bound to the supplied open
  handle, or replace process-local identity inference with a store-backed
  owner claim;
- never select another connection's store merely because its activity changed
  during the target read;
- fail closed whenever the target binding cannot be proved; and
- retain this unrelated-concurrent-read case as a RED that compares resulting
  identity values.

## Per-finding adjudication

| Area | Ruling | Independent evidence |
|---|---|---|
| Two ordinary handles, one durable store | OK without unrelated activity | The committed runtime suite produced one owner and one closed `COORDINATION_CONSUMER_RUNTIME_STORE_OWNED` rejection, then allowed replacement after stop. |
| Renamed and replaced pathname | OK | Two handles still reading marker `7` resolved to one identity; the replacement at the old path read `9` and resolved to a different identity. |
| Symlink and real path | OK | Both handles resolved to the same resulting identity value. |
| WAL versus rollback journal | OK in isolation | The same durable store resolved to one identity before and after switching from rollback journal to WAL; two WAL path aliases agreed. |
| `:memory:` | OK as clearly distinct | Identity was stable per handle and distinct between two separate in-memory stores. |
| Absent descriptor interface | Acceptable hard failure | Simulated unavailability produced an immediate `ENOENT`; there was no pathname fallback or silent degradation. |
| Ambiguous descriptor selection | **KO / P1** | Under unrelated concurrent reads, 303 of 1,200 target handles resolved to the unrelated identity rather than failing closed. |
| Queued receive cancellation | OK | Runtime stop fulfilled; the managed entry left the queue; its listener count reached zero; the unrelated blocker remained active with one pending operation and zero destroys until teardown. |
| Participant-lookup cancellation | OK | The identical signal reached service, queue, command, and lane; stop fulfilled; the lookup pending set reached zero and its owned connection was destroyed once. |
| Already-aborted enqueue | OK | The operation rejected without retaining a queue slot or abort listener and did not disturb the active blocker. |
| Drain, rejection, and close cleanup | OK | A reviewer-added runtime-suite check observed zero retained abort listeners and zero pending fake-client operations after normal drain, active rejection, and close; lane projections ended with `active=0` and `queued=0`. |
| Caller ownership | OK | Runtime stop left the managed coordination client ready and the caller-owned SQLite handles usable. |
| Reachability | OK | The widened public graph check found no managed/raw client, privileged lane instance, factory, URL/options value, callback executor, recovery facet, or recovery acquirer. |

## Portability ruling

The durable identity mechanism depends on `/proc/self/fdinfo` and
`/proc/self/fd`, which are Linux-specific. There is no portability fallback.
When the descriptor interface was made unavailable in the disposable runtime
test, construction failed immediately with `ENOENT`; it did not silently
degrade to pathname identity. That is acceptable fail-closed behavior for
this part-A result.

The handoff names `/proc/self/fdinfo` explicitly and says an absent or
ambiguous descriptor fails closed. It does not use the literal phrase
"Linux-only", but it discloses both the platform-specific interface and the
hard-failure behavior. I record the platform limit without adding a silent
degrade finding. I did not execute the candidate on a non-Linux host.

## Cancellation lifecycle

The committed 19-test runtime suite and the disposable reviewer check cover:

- an active blocking receive;
- a managed receive queued behind unrelated blocking work;
- a managed receive pending in participant lookup;
- a signal already aborted at enqueue;
- queued-listener replacement when an entry drains;
- queued-listener removal on close;
- normal drained completion;
- active rejection; and
- idempotent runtime stop with timers, managed pending work, and abort
  listeners at zero.

The implementation installs queued cancellation at enqueue
(`gateway/src/core/redis_client_lifecycle.js:111-147`), clears it on close and
drain (`gateway/src/core/redis_client_lifecycle.js:157-169,252-287`), and
propagates the same signal through participant lookup
(`gateway/src/services/coordination_service.js:827-838,1269-1276`;
`gateway/src/core/coordination_queue.js:2830-2842`).

I found no remaining cancellation finding in the reviewed correction.

## Reachability result

I widened the existing runtime-suite graph assertion in the disposable copy
to root:

- an ordinary `RedisCoordinationQueue`;
- its `lifecycle()` and `describe()` projections;
- the ordinary service and runtime;
- the public coordination, queue, runtime, and Redis-lifecycle module
  namespaces; and
- the existing exact sentinel client, factory, URL/options, managed client,
  recovery facet, and recovery acquirer values.

The assertion passed. No exact authority value or privileged lane instance was
reachable, and no forbidden data path named a factory, options object, URL,
command/blocking lane, callback executor, recovery facet, or recovery
acquirer. Recovery acquisition remained one-shot, and the runtime exposed
only `getStatus`, `start`, and `stop`.

## Independent mutation reruns

I archived reviewed HEAD into
`/tmp/g2wa3-independent.rRTlMC/mutants`, linked the existing dependency
installation, and first reproduced the pristine runtime result: 19 pass,
0 fail.

Each claimed guard mutation was applied independently, passed `node --check`,
and was restored before the next mutation. The named existing runtime test
then turned red:

| Deleted or bypassed guard | Targeted result | Directed failure |
|---|---:|---|
| Replace open-handle identity with `stat(database.name)` | exit 1; 0 pass / 1 fail | Retargeted handles produced two owners instead of one. |
| Remove abort-listener registration at enqueue | exit 1; 0 pass / 1 fail | Queued managed receive left runtime stop at timeout. |
| Remove participant command `abortSignal` | exit 1; 0 pass / 1 fail | Participant lookup command received `undefined` instead of the managed signal. |
| Remove service-to-participant-lookup signal | exit 1; 0 pass / 1 fail | Participant-lookup runtime stop timed out. |

Mutation summary: `baseline=19/0 compiled=4 killed=4 survived=0`.
All four mutated production files were byte-restored to the pristine archive
afterward. These guards cover the handoff's directed cases; they do not cover
the newly confirmed cross-store concurrency failure.

## Gate outputs

| Command | Result |
|---|---|
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_runtime.test.js` | exit 0; 19 pass, 0 fail, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer.test.js` | exit 0; 41 pass, 0 fail, 0 skipped |
| `node --test --test-concurrency=1 tests/gateway/coordination_ack_reconciliation.test.js` | exit 0; 19 pass, 0 fail, 0 skipped |
| `node --test --experimental-test-isolation=none --test-concurrency=1 tests/gateway/coordination_client.test.js tests/gateway/coordination_service_receive.test.js tests/gateway/coordination_queue_receive.test.js tests/gateway/coordination_queue_lifecycle.test.js` | exit 0; 51 pass, 0 fail, 0 skipped |
| `npm --prefix gateway run lint -- --no-cache` | exit 0 |
| `git diff --check` | exit 0, no output |
| `git diff --check 9264e5e..fbcd326` | exit 0, no output |
| Disposable ordinary identity variants | exit 0; 4 pass, 0 fail |
| Disposable unrelated concurrent-read identity invariant, three runs | exit 1 each as intended; 100, 102, and 101 wrong target identities |
| Disposable cancellation cleanup check | exit 0; 1 pass, 0 fail |
| Disposable widened reachability check | exit 0; 1 pass, 0 fail |

The two disclosed sibling-lane SQLite results also reproduced:

| Suite | Result | Ruling |
|---|---|---|
| `coordination_consumer_sqlite_repo` | exit 1; 99 pass / 1 fail; `memory[operation] is not a function` | inherited and unchanged |
| `coordination_consumer_sqlite_integration` | exit 1; 0 pass / 7 fail; `repository.directAck.claim must be a function` | inherited and unchanged |

Those known failures are not attributed to WIRING-A. Full
`bash scripts/ci.sh` was not run; the candidate's scoped advertised gates and
the review-directed robustness checks were run instead.

## Scope and sibling-lane ruling

The reviewed STORE integration
`cf8c8ede807b1b73630af35201d30aa5d2a3e3d1` is an ancestor of this candidate.
Trial 3 changes no SQLite repository path, SQL, schema, migration, repository
operation, ACK-port shape, or outbox implementation, so it creates no new
SQLite-repository conflict with that integrated sibling lane.

The production delta adds no runtime auto-start, stdio/MCP construction,
health or inventory projection, migration `003`, crash-recovery mechanism,
durable-convergence claim, or Redis-live-recovery claim. It does not expand
`coordination.status`, and the public coordination/export files are unchanged.
A focused production-diff search for migration `003`, outbox, health,
inventory, `coordination.status`, crash, recovery, and durable claims returned
only the internal `durableIdentityForLockChange` helper name and its call.

There is no crash-recovery, durable-convergence, live-Redis recovery,
health/inventory, full-sheet, integration, promotion, or release claim in this
verdict.

## What I did and did not verify

I verified the exact correction range and commit boundaries; read the Trial 2
KO specification and Trial 3 handoff; inspected every touched production
change; ran the pristine runtime, consumer, reconciliation, receive-stack,
lint, and diff gates; directly compared identity values for ordinary
same-store, symlink, rename/replacement, rollback/WAL, in-memory, unavailable
interface, held unrelated read, and concurrent unrelated read cases; repeated
the concurrency case three times; adjudicated queued, pre-read, pre-aborted,
drain, rejection, close, and stop cancellation; widened and reran the
reachability assertion; reran four claimed mutations; reproduced the two
disclosed inherited SQLite failures; and checked the integrated sibling and
scope boundaries.

I did not run a live Redis server, Redis crash/reclaim, process-crash recovery,
cross-process ownership, migration `003`, ACK-outbox behavior, health or
inventory composition, MCP traffic, aggregate CI, integration, promotion,
release, or any external service. I did not execute on macOS or Windows; I
verified the unavailable-interface behavior in the disposable runtime suite.
Those omissions are outside this result-only part-A correction and do not
prevent adjudication of its two findings.

I changed no source, test, plan sheet, migration, policy, sibling branch, or
external system. All reviewer-added robustness tests and mutations existed
only in disposable copies under `/tmp`.
