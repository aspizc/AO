# Review Submission — Project V5 G/0/02 WIRING-A (Trial 2)

## Scope and boundary

- This correction closes only the two Trial 1 P1 findings in
  `G_0_2_WIRING_A-1_result.md`: canonical single ownership and real managed
  receive cancellation.
- It preserves the part-A boundary. There is no crash-recovery,
  durable-convergence, Redis-live-recovery, health, inventory, or complete
  `G/0/02` claim.
- It consumes only the existing consumer facets and the eight-operation
  repository port frozen by `coordination_ack_reconciler.js:220-232`.
- It does not inspect or depend on migration `003`, an ACK-outbox table,
  sibling-lane columns, or any sibling adapter schema.

## Per-finding closure map

| Trial 1 P1 | Correction | Directed proof |
|---|---|---|
| Two handles for one SQLite file can both own one scope | `sqlite_store_identity.js` derives one cached `device:inode` identity for every handle to the same file. The SQLite repository factory binds its adapter to that identity before freezing it; the binding survives trusted wrapper composition. Runtime construction rejects a repository bound to another store, and ownership is keyed by canonical store plus scope rather than database-object identity. Empty ownership entries are removed after both supervised loops settle. | `two handles for one SQLite file share one owner and release it for replacement` opens two distinct handles, concurrently starts both, observes exactly one `COORDINATION_CONSUMER_RUNTIME_STORE_OWNED`, stops the winner, starts the rejected runtime as replacement, then reads `42` through both caller-owned handles. `repository binding rejects a different SQLite store before ownership` proves the repository/store check. |
| Runtime cancellation is discarded by the real managed client | `invoke(operation, input, { signal })` now forwards the signal to the real service. `receive(input, { signal })` passes it to `readInbox`; the queue supplies it both to node-redis as `abortSignal` and to the private blocking lane. The lane abort listener destroys only the dedicated single-concurrency blocking connection and awaits the resulting command rejection; it does not race away from or abandon the underlying operation. | `the real managed client aborts and settles its blocking Redis receive` uses the exported `createOrchestratorCoordinationClient`, the real service and queue, and a pending blocking Redis command. `stop()` fulfills without manual receive resolution; all three captured signals are identical and aborted, the underlying pending set is empty, the listener count is zero, the blocking client is destroyed once, and the caller-owned managed client remains `ready`. |

## Preserved Trial 1 rulings

- Construction remains inert and no stdio proxy auto-starts the runtime.
- The runtime still reuses, but never starts, stops, closes, or exposes, the
  supplied managed client.
- The raw Redis client, client factory, callback executor, recovery facet, and
  recovery acquirer remain unreachable from ordinary runtime/service surfaces.
- The real PostgreSQL adapter remains synchronously rejected under the I/0/05
  deferral.
- Injected SQLite handles remain caller-owned and usable after runtime stop.
- Recovery acquisition remains one-shot and private.
- No service status, health, inventory, MCP, migration, or outbox composition
  was added.

## TDD failing-then-passing evidence

| Phase | Commit | Command and observed result |
|---|---|---|
| RED | `7de44d7fbb5b77582e097e956191f31513b55fc0` | In the clean disposable tree `/tmp/g002-wiring-red-sealed.3yY5Os`, `node --test --test-concurrency=1 tests/gateway/coordination_consumer_runtime.test.js` returned exit 1: 10 pass, 3 fail, 0 cancelled, 0 skipped. The two-handle test observed two starts instead of one; the mismatched repository/store test reported a missing exception; and the real-client stop test timed out behind the pending receive. |
| GREEN | `885e825c49199f07d010abd14e19f8954bbc77c8` | The same command returned exit 0: 13 pass, 0 fail, 0 cancelled, 0 skipped. |

The RED commit changes tests only. The GREEN commit changes production source
only.

## Per-guard surviving-mutant table

Every mutant was applied independently in
`/tmp/g002-wiring-mutants.HWwsvD`. The pristine copy passed 13/13 with:

```text
node --test --experimental-test-isolation=none --test-concurrency=1 \
  tests/gateway/coordination_consumer_runtime.test.js
```

Each mutated source file passed `node --check` before its test run. All 12
mutants returned exit 1; no mutant survived, timed out, or was cancelled.

| Deleted or bypassed guard/link | Pass/fail | First directed failure | Survivors |
|---|---:|---|---:|
| Canonical SQLite file identity | 12/1 | `two handles for one SQLite file share one owner and release it for replacement` | 0 |
| Real SQLite repository-factory binding | 12/1 | `repository binding rejects a different SQLite store before ownership` | 0 |
| Repository/store identity comparison | 12/1 | `repository binding rejects a different SQLite store before ownership` | 0 |
| Canonical identity used as the owner-map key | 12/1 | `two handles for one SQLite file share one owner and release it for replacement` | 0 |
| Existing store/scope owner rejection | 11/2 | `one SQLite store and scope has one owner, then stop releases it cleanly` | 0 |
| Canonical store/scope release | 9/4 | `one SQLite store and scope has one owner, then stop releases it cleanly` | 0 |
| Managed-client operation signal forwarding | 12/1 | `the real managed client aborts and settles its blocking Redis receive` | 0 |
| Service receive signal forwarding | 12/1 | `the real managed client aborts and settles its blocking Redis receive` | 0 |
| Redis command `abortSignal` forwarding | 12/1 | `the real managed client aborts and settles its blocking Redis receive` | 0 |
| Blocking-lane signal forwarding | 12/1 | `the real managed client aborts and settles its blocking Redis receive` | 0 |
| Active blocking-operation abort listener | 12/1 | `the real managed client aborts and settles its blocking Redis receive` | 0 |
| Blocking-operation abort-listener cleanup | 12/1 | `the real managed client aborts and settles its blocking Redis receive` | 0 |

Mutation summary:
`baseline=13/0 compiled=12 killed=12 survived=0 timed_out=0 cancelled=0`.

## Lifecycle and ownership readback

| Probe | Observed value |
|---|---|
| Distinct handles for the same SQLite file | `true` |
| Concurrent starts for one file/scope | one fulfilled, one closed `COORDINATION_CONSUMER_RUNTIME_STORE_OWNED` rejection |
| Replacement after owner stop | fulfilled at generation 1 |
| Caller-owned handles after stop | both returned `42` |
| Repository bound to another SQLite file | closed `COORDINATION_CONSUMER_RUNTIME_STORE_MISMATCH` rejection |
| Real managed receive block | `30000ms` |
| Runtime stop while receive pending | fulfilled at generation 1 without manual resolution |
| Signal at managed client, service queue call, and Redis command | same object; `aborted=true` |
| Pending underlying Redis operations after stop | `0` |
| Abort listeners after stop | `0` |
| Dedicated blocking-client destroys | `1` |
| Managed-client state after runtime stop | `ready` |

The cancellation proof holds the underlying command open until destroying the
blocking connection rejects it. Runtime stop awaits that rejection through
the queue, service, managed client, and consumer; it does not merely fence a
detached promise.

## Verification

- `node --test --test-concurrency=1 tests/gateway/coordination_consumer_runtime.test.js`
  — exit 0; 13 pass, 0 fail, 0 cancelled, 0 skipped.
- `node --test --test-concurrency=1 tests/gateway/coordination_consumer.test.js`
  — exit 0; 41 pass, 0 fail, 0 cancelled, 0 skipped.
- `node --test --test-concurrency=1 tests/gateway/coordination_ack_reconciliation.test.js`
  — exit 0; 19 pass, 0 fail, 0 cancelled, 0 skipped.
- `node --test --experimental-test-isolation=none --test-concurrency=1 tests/gateway/coordination_client.test.js tests/gateway/coordination_service_receive.test.js tests/gateway/coordination_queue_receive.test.js tests/gateway/coordination_queue_lifecycle.test.js`
  — exit 0; 51 pass, 0 fail, 0 cancelled, 0 skipped.
- `npm --prefix gateway run lint -- --no-cache` — exit 0.
- `git diff --check` — exit 0.
- `git diff --check b07c77f..885e825` — exit 0.
- `bash scripts/ci.sh` was not run, as required.

## Commits

- `7de44d7fbb5b77582e097e956191f31513b55fc0` —
  `test(coordination): expose wiring-A gaps (V5 G/0/02 WIRING-A Trial 2)`
- `885e825c49199f07d010abd14e19f8954bbc77c8` —
  `fix(coordination): seal wiring-A ownership and stop (V5 G/0/02 WIRING-A Trial 2)`

## Changed-path allowlist

- `tests/gateway/coordination_consumer_runtime.test.js`
- `gateway/src/coordination_client.js`
- `gateway/src/core/coordination_consumer_runtime.js`
- `gateway/src/core/coordination_queue.js`
- `gateway/src/core/redis_client_lifecycle.js`
- `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js`
- `gateway/src/core/sqlite_store_identity.js`
- `gateway/src/services/coordination_service.js`
- `plan/reviews/PROJECT_V5/G_0_2_WIRING_A-2_to_review.md`

The SQLite repository change adds only store-binding metadata. No SQL,
schema, migration, persistence operation, ACK-port shape, or sibling-lane
adapter was changed.

## Review status

Waiting for independent review. No coder-owned verdict is asserted.
