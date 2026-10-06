# Review Submission — Project V5 G/0/02 STORE (Trial 4)

## Review requested

Independent, evidence-based review is requested for the frozen Trial 4
technical range ending at
`f95ce85be10942625c4ba238607ef58beba87787`.

This is request-only evidence. It contains no automatic verdict, integration,
promotion, release, Redis/service wiring, health projection, or full-`G/0/02`
completion claim.

## Trial 3 finding addressed

Trial 4 is limited to P1-1 in `G_0_2_STORE-3_result.md`.

Trial 3 revoked emitted error identities after each call, but selected the
current authority through mutable module-global `STORE_OPERATION_SCOPES` and
`VAULT_OPERATION_SCOPES` arrays. Validation, decoder, control-error, and
read/write code discovered authority through `current*OperationScope()`
instead of receiving it from the operation that owned it.

Trial 4 removes both arrays and every ambient lookup, publication, and removal
operation. Each `safely()` invocation now:

1. allocates its own control, validation, and, for the repository, operation
   identity sets;
2. creates one frozen capability whose methods close over only those sets;
3. passes that capability explicitly to its action;
4. threads it through validation, decoding, control-error, and database-zone
   calls; and
5. clears every local set in `finally` on success or throw.

The capability is not stored at module or adapter-instance scope, is not
attached to an error, and is not passed as a database value or argument. No
symbol, observable property, exported class, or semantic code acts as an
authority mark.

The fixed `*_FAILED` errors are constructed fresh without registration.
Only identities created through the current lexical capability can cross the
same synchronous operation unchanged. Foreign exceptions during decoding are
not reclassified as corruption; only current-operation validation identities
receive that phase conversion.

## TDD evidence

### RED4

- Commit:
  `7244ea1151c84d9914b682617d7fab945a9b7292`
- Subject:
  `test(consumer): reject ambient SQLite error authority`
- Tree:
  `4ffae31c2c7ad21a18cf8d306dc9bcfc42778bfc`
- Direct parent:
  `d7b679606adce41f706c105ad5a71cea0d0e8ce1`
- Changed path:
  `tests/gateway/coordination_consumer_sqlite_repo.test.js`

The two directed SQLite files produced:

- **107 tests / 105 passed / exactly 2 expected failures / 0 skipped**;
- all **103** Trial 3 focal tests remained green; and
- both new two-instance behavioral guards were already green.

The two failures were the repository and vault structural guards. Each
reported all three ambient forms in the Trial 3 implementation:

- module or instance mutable authority collection;
- ambient `current*Scope` lookup; and
- mutable scope-stack publication/removal.

The structural guard is source-bounded to the two submitted adapters. It
rejects error-authority `WeakSet` use, module/instance authority collections,
ambient current-scope functions, and scope/registry stack mutation.

This guard is intentionally defense in depth, not standalone architectural
proof. Its regular expressions depend partly on naming and indentation, so a
renamed or reformatted ambient registry could evade it. That is a known P2
test-strength limitation. The reviewer must directly inspect declarations and
the full capability call graph, then corroborate that inspection with the
cross-instance and reentrancy behavior below.

The two behavioral additions use distinct adapter instances. For both
repository and vault they:

- capture a legitimate previous control error on the inner instance;
- synchronously enter the inner instance from an outer dependency callback;
- capture a nested validation error;
- throw the previous error from that callback;
- require the outer instance to return a fresh fixed failure;
- inject the nested object through a later inner dependency call and require
  another fresh fixed failure; and
- verify legitimate control errors and control-result values after cleanup.

The RED4 commit changed tests only.

### GREEN4

- Commit:
  `f95ce85be10942625c4ba238607ef58beba87787`
- Subject:
  `fix(consumer): make SQLite error provenance lexical`
- Tree:
  `5a7f7b4ed5dea728fc5e1f9b2d979fe3da7caed9`
- Direct parent:
  `7244ea1151c84d9914b682617d7fab945a9b7292`
- Changed paths:
  - `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js`
  - `gateway/src/core/sqlite_quarantine_store.js`

The exact RED4 test blob was unchanged at GREEN4:

```text
RED4   d3da0bd25a3f855a14d16ed66c28e19104e161eb
GREEN4 d3da0bd25a3f855a14d16ed66c28e19104e161eb
```

The unchanged SQLite integration test blob is
`296f8f5524c3e315aa36b9e26f62f92134b234f4`.

The directed SQLite command passed **107 / 107**.

## Explicit churn review

The adapter-only GREEN4 diff from RED4 is:

```text
                                              added  removed
sqlite_coordination_consumer_repo.js             424      281
sqlite_quarantine_store.js                         76       72
total                                              500      353
```

The same `git diff --ignore-all-space --numstat` comparison is:

```text
                                              added  removed
sqlite_coordination_consumer_repo.js             424      281
sqlite_quarantine_store.js                         75       71
total                                              499      352
```

Only two changed lines are whitespace-sensitive. The volume is therefore not
a bulk reindent or formatter rewrite. It comes from explicit capability
threading through these concrete groups:

1. repository and vault error/validation factories;
2. nine decoder/invariant helpers:
   `storedMetadata`, `validateLease`, `validateEffect`,
   `validateQuarantine`, `validateDeliveries`, `validateRecoveryHistory`,
   `validateReplay`, `validateBundle`, and vault `decodeRow`;
3. repository projection/ownership/change helpers and both adapters'
   `read`/`write` zones; and
4. all 16 public operations: 14 repository operations and two vault
   operations.

The call-site edits make the authority owner visible at every phase boundary.
Removing that parameter flow would require another ambient lookup or would
hide the same flow behind an instance-persistent facade. No follow-up
compaction commit was made.

The independent reviewer is explicitly asked to inspect the large diff for
any formatting anomaly, unnecessary duplication, missed helper, or accidental
semantic change. This explanation is evidence for review, not an approval of
the churn.

## Directed verification

Store, vault, differential-port, reopen, contention, real-consumer,
safe-expiry, corruption, error-boundary, identity-reuse, structural, and
two-instance reentrancy tests:

```text
NODE_PATH=/home/carase/git/personal/agents-orchestrator/gateway/node_modules \
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer_sqlite_repo.test.js \
  tests/gateway/coordination_consumer_sqlite_integration.test.js
```

- **107 passed / 0 failed / 0 skipped**.

Focused nesting, reentrancy, callback-throw, and two-instance isolation:

```text
NODE_PATH=/home/carase/git/personal/agents-orchestrator/gateway/node_modules \
node --test --test-concurrency=1 \
  --test-name-pattern='synchronous .* reentrancy|two .* instances' \
  tests/gateway/coordination_consumer_sqlite_repo.test.js
```

- **4 passed / 0 failed / 0 skipped**.

Accepted consumer plus unchanged queue/service receive and ACK contracts:

```text
node --experimental-loader '<temporary lock-matched bare-package resolver>' \
  --test --test-concurrency=1 \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_queue_receive.test.js \
  tests/gateway/coordination_queue_ack.test.js \
  tests/gateway/coordination_service_receive.test.js \
  tests/gateway/coordination_service_ack.test.js
```

- **77 passed / 0 failed / 0 skipped**.
- The resolver used only a pre-existing lock-identical dependency tree and was
  removed immediately after use.
- No Redis instance or service was started or consulted.

Lock-identical ESLint covered both adapters and both directed test files:

- ESLint **10.8.0**;
- candidate/provider `gateway/package-lock.json` SHA-256:
  `71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`;
- candidate/provider `gateway/eslint.config.js` SHA-256:
  `31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`;
- result: **passed with 0 errors and 0 warnings**.

Applying the unchanged migration twice to one in-memory SQLite database
produced:

```json
{
  "coordinationTables": 6,
  "migrationRows": 1,
  "appliedAtUnchanged": true,
  "schemaUnchanged": true,
  "foreignKeyViolations": 0,
  "integrity": "ok"
}
```

Exact structure selection:

```text
PYTHONDONTWRITEBYTECODE=1 pytest -p no:cacheprovider \
  tests/structure/test_project_layout.py \
  tests/structure/test_v5_coordination_docs.py
```

- **11 passed / 0 failed**;
- Python **3.14.4**, pytest **9.0.3**; and
- bytecode and pytest cache writes were disabled.

Additional checks:

- `git diff --check` passed for the exact technical range;
- production contains no `WeakSet`, `WeakMap`, `current*Scope`,
  `*_OPERATION_SCOPES`, `push`, `pop`, `splice`, symbol/property marker, or
  exported-class identity check;
- all 10 Trial 3 later-operation replay cases remain green;
- the exact RED4 and GREEN4 repository test blobs match; and
- no task-owned temporary resolver or SQLite test directory remains.

## Synchronous dependency boundary

The accepted adapter remains the synchronous `better-sqlite3` implementation:
transactions invoke their callbacks and return their values synchronously.
Under that contract, `safely()` clears its local identity sets in `finally`
before the public `async` method returns or adopts any value.

No capability is returned by the submitted call graph. A nonconforming
database that retains a transaction callback or invokes it asynchronously is
not exercised or claimed here. The independent reviewer is explicitly asked
to confirm:

- no submitted success, throw, nesting, or reentrancy path lets the capability
  escape or survive the invocation;
- an unexpected Promise/thenable return cannot retain useful authority after
  `finally`; and
- whether retained/asynchronous callbacks or thenables belong to the accepted
  SQLite dependency contract. If they do, that must be treated as an open
  finding rather than inferred safe from this request.

## Frozen identity and scope

- Exact Trial 4 base:
  `d7b679606adce41f706c105ad5a71cea0d0e8ce1`
- Base tree:
  `08599f1da7074fc9d472426ec94bbea8fc3bf50d`
- RED4:
  `7244ea1151c84d9914b682617d7fab945a9b7292`
- Technical commit:
  `f95ce85be10942625c4ba238607ef58beba87787`
- Trial 4 technical range:
  `d7b679606adce41f706c105ad5a71cea0d0e8ce1..f95ce85be10942625c4ba238607ef58beba87787`
- Range identity:
  **2 commits / 3 files / 753 insertions / 353 deletions**
- Branch:
  `feat/V5-G-0-02-store`
- Worktree:
  `/tmp/agents-orchestrator-v5-g002-store.8d906A/worktree`

The technical range changes exactly:

- `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js`
- `gateway/src/core/sqlite_quarantine_store.js`
- `tests/gateway/coordination_consumer_sqlite_repo.test.js`

The migration, ADR, SQLite integration test, accepted core, in-memory
repository, `state.js`, packages, locks, configuration, catalog, services,
Redis, MCP, health, workflows, and shared plan sheets are unchanged.

No aggregate npm test, full CI, install, network, live Redis, MCP, KYA,
provider, tmux, agent, subagent, service, lifecycle, integration, promotion,
release, or shared-plan mutation was run or performed.

## Remaining limitations

This remains the SQLite store/vault slice:

- `atomicWithBusinessEffect` remains `false`;
- handlers remain responsible for durable `consumeKey` idempotency;
- the adapters are not wired into configuration, services, lifecycle, Redis,
  or health/inventory;
- PostgreSQL parity remains deferred to Project V5 `I/0/05`;
- retention, quotas, and reaping remain outside this slice; and
- the full `G/0/02` exit gate remains open.

## Review focus

- Confirm authority is born, passed, checked, and destroyed within exactly one
  lexical invocation.
- Confirm no module-level or instance-level mutable error-authority registry,
  collection, ambient lookup, property, symbol, class, or code remains.
- Treat the structural regex as a bounded regression only; directly inspect
  the declarations and call graph because naming or indentation can evade it.
- Confirm all 16 operations and every decoder/database phase receive the
  correct capability explicitly, with no missed call site.
- Confirm nested calls across two instances cannot contaminate one another.
- Confirm `finally` cleanup occurs for success, validation, control,
  corruption, callback throw, and foreign dependency throw.
- Confirm current-call input validation, winning safe-expiry, `NOT_FOUND`,
  `NOT_OWNED`, `CONFLICT`, `CORRUPT`, and control-result contracts remain
  exact.
- Confirm every later or foreign dependency error becomes a fresh fixed
  failure without retained identity or context.
- Inspect the adapter diff and `--ignore-all-space` evidence for unnecessary
  churn or formatting anomalies.
- Evaluate the synchronous dependency boundary and unexpected
  Promise/thenable behavior explicitly.
- Confirm Trial 4 does not broaden the accepted SQLite-only claims.

Independent review is requested. No automatic review or integration follows
from this file.
