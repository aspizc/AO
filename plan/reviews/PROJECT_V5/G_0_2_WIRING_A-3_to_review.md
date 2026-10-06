# Review Submission — Project V5 G/0/02 WIRING-A (Trial 3)

## Scope and boundary

- This correction closes only the two Trial 2 P1 findings in
  `G_0_2_WIRING_A-2_result.md`: authoritative identity for an already-open
  SQLite store and cancellation of queued or pre-read managed receives.
- It preserves the part-A boundary. There is no crash-recovery,
  durable-convergence, Redis-live-recovery, health, inventory, or complete
  `G/0/02` claim.
- It consumes only the existing consumer facets and the eight-operation
  repository port frozen by `coordination_ack_reconciler.js:220-232`.
- It does not inspect or depend on migration `003`, an ACK-outbox table,
  sibling-lane columns, or any sibling adapter schema.

## Per-finding closure map

| Trial 2 P1 | Correction | Directed proof |
|---|---|---|
| Pathname stat does not identify the store held by an already-open SQLite handle | `sqlite_store_identity.js` no longer reads or stats `database.name`. For a durable `better-sqlite3` handle, it holds a read-only `PRAGMA schema_version` iterator, observes the SQLite lock belonging to that open connection through `/proc/self/fdinfo`, and uses `fstat` on the already-open main database descriptor. Rollback-journal locking resolves directly; WAL locking resolves the changed `-shm` lock back to the main descriptor already carrying SQLite's shared lock. The resulting `device:inode` identity is cached per handle. An absent or ambiguous descriptor fails closed. The existing repository binding and runtime ownership map consume that same authoritative identity, so repository/store verification and store-plus-scope ownership cannot diverge. | `already-open handles retain one owner after their SQLite pathname is retargeted` reproduces the reviewer's sequence: open A, write marker `7`, rename A to B, open B, place a different database at A, then construct repositories and runtimes. Both open handles still read marker `7`; concurrent starts produce exactly one fulfillment and one closed `COORDINATION_CONSUMER_RUNTIME_STORE_OWNED` rejection. After the owner stops, the rejected runtime starts and stops cleanly, and both caller-owned handles read `42`. The original ordinary two-handle and different-store binding cases remain green. |
| Queued and participant-lookup managed receives do not settle on cancellation | `RedisClientLane` installs a once-only abort listener as part of enqueue. Abort synchronously finds and removes that exact bounded entry, clears its listener and retained callbacks, and rejects it. A signal already aborted at enqueue is checked after listener registration. Drain and close clear the queued listener before starting or rejecting an entry. Separately, the managed receive signal now crosses `readParticipant`, `queue.getParticipant`, the Redis command's `abortSignal`, and the command lane. An active pending lookup is settled by invalidating its managed connection, while a queued blocking read is removed without disturbing the unrelated active blocker. | `stop removes and settles a real managed receive queued behind unrelated blocking work` uses the exported real managed client and real service/Redis queue. `stop()` fulfills while the unrelated blocker remains active and pending, with zero queued entries, zero listeners on the managed signal, and zero blocker-client destroys before teardown. `stop aborts and settles a real managed receive pending in participant lookup` holds the real queue's `GET`; the identical signal reaches the command and lane, `stop()` fulfills, the underlying pending set reaches zero, and the managed connection is destroyed once. Three additional cases prove pre-aborted rejection and listener cleanup on drain and close. |

## Preserved accepted rulings

- Construction remains inert and no stdio proxy auto-starts the runtime.
- The runtime reuses, but never starts, stops, closes, or exposes, the supplied
  managed client.
- No managed Redis client, raw client, lane, callback executor, client
  factory, Redis URL/options object, recovery facet, or recovery acquirer was
  added to any reachable public surface.
- The real PostgreSQL adapter remains synchronously rejected under the I/0/05
  deferral.
- Injected SQLite handles remain caller-owned and usable after runtime stop.
  The identity probe is read-only; it does not open, migrate, configure,
  write to, begin an application transaction on, or close the handle.
- Recovery acquisition remains one-shot and private.
- No service status, health, inventory, MCP, migration, or outbox composition
  was added.

## TDD failing-then-passing evidence

| Phase | Commit | Command and observed result |
|---|---|---|
| RED | `563e48e9462555ea82c83dbd98cb2dec43c702c9` | `node --test --test-concurrency=1 tests/gateway/coordination_consumer_runtime.test.js` returned exit 1: 13 pass, 6 fail, 0 cancelled, 0 skipped. The retargeted handles produced two starts; both real-managed-client stop assertions timed out; the pre-aborted entry timed out; and the drain/close cases observed zero queued listeners instead of one. |
| GREEN | `fbcd3264e263fb4cfc68daf4a0c1f1e523b24115` | The same command returned exit 0: 19 pass, 0 fail, 0 cancelled, 0 skipped. |

The RED commit changes tests only. The GREEN commit changes production source
only.

## Per-guard surviving-mutant table

Every mutant was applied independently to committed GREEN
`fbcd3264e263fb4cfc68daf4a0c1f1e523b24115` in:

```text
/tmp/g002-wiring-trial3-mutants.Rk1Uth
```

The pristine disposable copy passed 19/19 with:

```text
node --test --test-reporter=spec \
  --experimental-test-isolation=none --test-concurrency=1 \
  tests/gateway/coordination_consumer_runtime.test.js
```

Before each mutation, the affected source was restored from the pristine
copy. Each mutated source passed `node --check`. Every mutant returned exit
1; no mutant survived or exceeded the process deadline.

| Deleted or bypassed guard/link | Pass/fail | First directed failure or readback | Survivors |
|---|---:|---|---:|
| Authoritative open-handle identity, replaced with `stat(database.name)` | 18/1 | `already-open handles retain one owner after their SQLite pathname is retargeted`: two starts instead of one | 0 |
| Post-registration rejection of an already-aborted queued entry | 18/1 | `a pre-aborted queued Redis operation is rejected without retaining a slot`: settlement timed out | 0 |
| Atomic queued-entry membership/removal check on abort | 17/2 | `stop removes and settles a real managed receive queued behind unrelated blocking work`: stop timed out | 0 |
| Abort-listener registration at enqueue | 16/3 | `stop removes and settles a real managed receive queued behind unrelated blocking work`: stop timed out | 0 |
| Close-path queued-listener cleanup | 18/1 | `closing a Redis lane removes every queued abort listener`: one listener remained | 0 |
| Drain-path queued-listener cleanup | 18/1 | `a queued Redis abort listener is replaced, not retained, when the entry drains`: two listeners instead of one | 0 |
| Common queued-entry listener removal | 16/3 | `a pre-aborted queued Redis operation is rejected without retaining a slot`: one listener remained | 0 |
| Participant `GET` command `abortSignal` | 18/1 | `stop aborts and settles a real managed receive pending in participant lookup`: raw command signal was `undefined` | 0 |
| Participant lookup's managed-lane signal | 18/1 | `stop aborts and settles a real managed receive pending in participant lookup`: stop timed out | 0 |
| Service-to-participant-lookup signal | 17/2 | Queued proof observed an undefined participant signal; pre-read proof timed out | 0 |

Mutation summary:
`baseline=19/0 compiled=10 killed=10 survived=0 process_timed_out=0 cancelled=0`.

## Ownership and cancellation readback

| Probe | Observed value |
|---|---|
| Retargeted handle A marker | `7` |
| Renamed-path handle B marker | `7` |
| Concurrent starts on those two handles and one scope | one fulfilled, one closed `COORDINATION_CONSUMER_RUNTIME_STORE_OWNED` rejection |
| Replacement after owner stop | fulfilled at generation 1 |
| Caller-owned handles after stop | both returned `42` |
| Two ordinary WAL handles | identical `sqlite-store-v2:device:inode` identity |
| Managed receive queued behind unrelated blocker | blocking lane `active=1`, `queued=0` after runtime stop |
| Unrelated blocker before teardown | pending operations `1`; client destroys `0`; promise still pending |
| Managed queued receive after stop | settled; abort listeners `0` |
| Participant lookup command | `GET`; command signal was the managed receive signal |
| Pending participant lookup after stop | pending operations `0`; managed client destroys `1` |
| Runtime stop in both cancellation cases | fulfilled at generation 1 without manual work release |
| Caller-owned managed-client state after runtime stop | `ready` |

The unrelated blocker is released only during test teardown after all
stop-settlement and non-interference assertions. The participant lookup is
not raced away from: invalidating the managed connection rejects the
underlying pending command, and runtime stop awaits that rejection through
the queue, service, managed client, and consumer.

## Verification

- `node --test --test-concurrency=1 tests/gateway/coordination_consumer_runtime.test.js`
  — exit 0; 19 pass, 0 fail, 0 cancelled, 0 skipped.
- `node --test --test-concurrency=1 tests/gateway/coordination_consumer.test.js`
  — exit 0; 41 pass, 0 fail, 0 cancelled, 0 skipped.
- `node --test --test-concurrency=1 tests/gateway/coordination_ack_reconciliation.test.js`
  — exit 0; 19 pass, 0 fail, 0 cancelled, 0 skipped.
- `node --test --experimental-test-isolation=none --test-concurrency=1 tests/gateway/coordination_client.test.js tests/gateway/coordination_service_receive.test.js tests/gateway/coordination_queue_receive.test.js tests/gateway/coordination_queue_lifecycle.test.js`
  — exit 0; 51 pass, 0 fail, 0 cancelled, 0 skipped.
- `npm --prefix gateway run lint -- --no-cache` — exit 0.
- `git diff --check` — exit 0.
- `bash scripts/ci.sh` was not run, as required.

The two inherited sibling-lane SQLite results remain unchanged:

- `coordination_consumer_sqlite_repo`: exit 1; 99 pass / 1 fail at
  `memory[operation] is not a function`.
- `coordination_consumer_sqlite_integration`: exit 1; 0 pass / 7 fail at
  `repository.directAck.claim must be a function`.

They match the Trial 2 review baseline and are not attributed to WIRING-A.

## Commits

- `563e48e9462555ea82c83dbd98cb2dec43c702c9` —
  `test(coordination): expose trial 3 wiring gaps (V5 G/0/02 WIRING-A Trial 3)`
- `fbcd3264e263fb4cfc68daf4a0c1f1e523b24115` —
  `fix(coordination): close trial 3 wiring gaps (V5 G/0/02 WIRING-A Trial 3)`

## Changed-path allowlist

- `tests/gateway/coordination_consumer_runtime.test.js`
- `gateway/src/core/sqlite_store_identity.js`
- `gateway/src/core/redis_client_lifecycle.js`
- `gateway/src/core/coordination_queue.js`
- `gateway/src/services/coordination_service.js`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_A-3_to_review.md`

No SQL, schema, migration, repository operation, ACK-port shape, sibling
adapter, runtime auto-start surface, health surface, or inventory surface was
changed.

## Review status

Waiting for independent review. No coder-owned verdict is asserted.
